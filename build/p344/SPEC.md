# Phase 344: a closed tab for a folder on another machine stays closed, whoever started its sessions (SPEC)

Subject: `fix(machines): keep a closed remote tab closed whoever started its sessions`
First body line: `Phase 344: a closed folder is remembered by itself`
Semver: patch, and it rides in 0.111.0 (the unpublished draft of 9 October, `cb36deaf`, tag `v0.111.0`, re-cut by the
main session on his word). Tier 3. Written 2026-10-09 in `/private/tmp/wt-p344` at `e1e17899` (origin/main). Nothing
committed, staged or stashed. Every `file:line` below was re-read at `e1e17899`.

Charter, in his words. 9 October 2026, on his dev build at `af1358a5`: "my mac pro tab on the current dev build tends to
come back after i close it, i thought we long solved this", then "its a remote machine that i added and that tab tends
to come back so lets solve it the correct way" and "i authorize you to connect to it when checking". His standing rules
bind: a phase lands only when a side by side against today shows no scenario worse (a part that regresses is removed);
remote feels identical to local; Tortie never ends a session by itself, and closing a tab ends nothing.

Binding sources: this file; `docs/BACKLOG.md` "## Phase 344" (`:41620-41715`); Phase 306 (`6f194ddb`,
`build/p306/SPEC.md`, GitHub issue 35), whose stated limit this phase closes
(`src/main/machines/remote-rehome.ts:62-67`); Phase 93 (the stamp, migration 016); the migration rule of research 27
section 4.3 as `src/main/manifest/schema.ts:682-803` applies it.

**What the entry got wrong is in §14; the decisions in §3 already carry the corrections.** The two that change the
build: removing a machine deletes none of its records from the manifest, so this phase deletes no folder record either
(D7), and the window does need the record carried on the sessions main lists, or a session created from a tab on the
machine in a folder held this way sits in no tab where the parent drew it (D9, measured in §2.2).

## 0. What changes for a person, in one table

| Today (the parent, `e1e17899`) | After this phase |
| --- | --- |
| A tab closed for a folder on another machine whose sessions this Mac did not start (Tortie on that machine, another Mac, a build before 90.3) comes back on the next pass, and again after every relaunch | It stays closed through every pass and every relaunch, until he opens the folder, goes to one of its sessions, or starts a session in it from this Mac |
| A folder with one session this Mac started and others it did not stays closed only while this Mac's session lives; Remove that session and the tab comes back | It stays closed |
| Go to session on a session in such a folder, when its tab is not drawn, opens the tab and says "Tortie opened … as a tab, because '…' is running there and had no tab" | It opens the tab and says nothing, because the folder had a tab he closed (Phase 93's rule for a folder this Mac recorded) |
| A tab closed on this Mac (local) | Unchanged, byte for byte: a local close writes exactly what it wrote |
| Removing a machine | Unchanged: nothing about its folders is deleted, so a machine added again under the same id keeps the tabs he closed closed (today its recorded folders came back, its other folders came back anyway) |
| A tab closed before this update, for a folder whose sessions this Mac did not start | Comes back ONCE after the update, because the build before recorded nothing for it; closed again, it stays closed |

## 1. The design in one paragraph

The record of a close stops needing a session row. Migration 020 adds one table, `closed_remote_folders`, keyed exactly
as `remote_folder_pins` is (`(machine_id, path)`), and one file owns every read and write of it,
`src/main/manifest/closed-remote-folders.ts`. `markProjectTabClosed` writes the folder's row in the SAME durable
transaction as the stamps, for a folder on another machine only, whether or not any session row matched.
`clearProjectTabClosed` deletes it beside the stamps, so every way back that already clears (the local add, the remote add
that Open on machine, Go to session and the sheet's restore reach, a create there, a failed create's release) clears it
with no new caller. `projectTabClosedFor` answers yes when that row exists OR the stamp holds by Phase 306's two tests,
whose text does not move. The window's memo (`reconcileRemoteTabs`) decides when to re-read main's list from the record
main carries on each session, so `listSessions` carries the folder's record on every session on a machine that has no
stamp of its own; without that, a create from a tab on the machine in a folder held this way is never drawn (§2.2). The
window's code does not change. A close made by an older build is still read from its stamps. Nothing is sent to any
machine, no status moves, nothing ends.

## 2. Measured for this spec (this Mac only: no Electron, no ssh, no tmux, no shell of his)

Every measurement ran the SHIPPING code at `e1e17899` under vitest from the spec writer's scratch
(`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p344/spec/m/`), each file
importing the worktree by absolute path, over scratch manifests under `$TMPDIR`, with `HOME` and `ZDOTDIR` set to a
scratch directory, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset. His `~/.zsh_history` read `736064 1791579183` and
`~/.bash_history` `23166 1790702242` (`stat -f '%z %m'`) before the first command and after the last.

### 2.1 Main (`m1-parent-main.test.ts`, 8 of 8 passed, exit 0)

The closes go through the REAL `GmuxCore.prototype.removeProject` borrowed onto a recorder over a real store, the shape of
`src/main/sessions/__tests__/p93-remove-project.test.ts:80-133`.

| # | What | Reading |
| --- | --- | --- |
| P1 | A folder whose only session has no row, its tab closed, one pass | `markProjectTabClosed` called and stamped 0; no broadcast at the close; `projectTabClosedFor` false; the pass `projectsAdded: 1`: **back** |
| P2 | A mixed folder (one recorded session, one foreign), closed; one pass; the recorded session Removed; one pass | first pass `tabsHeldClosed: 1`; after the Remove `projectsAdded: 1`: **back** (a second class of his report, closed by the same record) |
| P3 | F closed (held by a recorded row); feed rows `{project F, cwd F/sub}`, `{project F/sub, cwd F/sub}`, `{project '', cwd F/other}` | `tabsHeldClosed: 1`, `projectsAdded: 2`, open: `F/other`, `F/sub`. A session whose own project is a subfolder opens that subfolder's own tab; one whose project is F is grouped under F and held with it |
| P4a | The local add (`addProject`) | calls `getProjectByPath, listProjects, upsertProject, clearProjectTabClosed` |
| P4b | The remote add (`addRemoteProjectAdmitted`, which Open on machine, Go to session and the sheet's restore reach) | `getRemoteProject, upsertRemoteProject, clearProjectTabClosed` |
| P4c | A failed create's release; a create there | release: `projectTabClosedFor, upsertRemoteProject, clearProjectTabClosed`; create: `upsertRemoteProject, clearProjectTabClosed` |
| P5 | Removing a machine (its one durable transaction, `markMachinesForgotten`) | tombstoned 1; held before `true`, after `false` (the stamp sits on a discarded row, which the reader skips); `remote_projects` 1 row KEPT, `remote_folder_pins` 1 row KEPT, the stamped row KEPT (discarded) |
| P6 | What the window is handed for a session this Mac recorded in a closed folder | `closedProject {name, path, closedAt}`, and the close pushed the list once. A session with no row is handed none (it never has a stamp) |

The renderer → main chain for the ways back, read: Go to session is `jumpToSession`
(`src/renderer/app/session-focus.ts:176`) → `openTargetProject` (`src/renderer/state/projects-slice.ts:296`) →
`addRemoteProject` (`:282`) → `projects:addRemote` (`src/main/ipc.ts:212`) → `addRemoteProject` →
`addRemoteProjectAdmitted` (`src/main/sessions/core.ts:4017`), whose clear is `:4044`. The sheet's restore is
`src/renderer/session-manager/actions.ts:617` → `openTargetProject`. The local add is `projects:add`
(`src/main/ipc.ts:199`), Clone (`src/main/projects/clone.ts:426`, `:803`) and New Project (`src/main/projects/create.ts:114`)
→ `addProject` (`core.ts:3955`), clears at `:3971`, `:3984`. A create on a machine is `create-local.ts:294`
(`openTabsForRemoteCreate`, clear at `remote-rehome.ts:317`); its failure path is `create-local.ts:250`
(`releaseFoldersAfterFailedRemoteCreate`, clear at `remote-rehome.ts:393`).

### 2.2 The window (`m2-window.test.ts`, the rig of `src/renderer/state/__tests__/p306-remote-tab-memo.test.ts`, 4 of 4, exit 0)

Over the SHIPPING store and `reconcileRemoteTabs` (`src/renderer/state/sessions-slice.ts:571-611`, memo `:568`):

| # | Shape | Reading |
| --- | --- | --- |
| W1 | PARENT. A folder he opened by hand, holding only a foreign session, closed; the parent's next pass re-adds it; then a create in it from another tab on the machine | after the pass the window DRAWS it (the defect); the create lands in a drawn tab. 1 list read |
| W2 | HEAD with the record but NOT carried on the foreign session. Same steps; main holds it; the create opens it in main | held: not drawn (right). After the create: **not drawn**, 1 list read: the session he just made sits in no tab. WORSE than W1 |
| W3 | HEAD with the record carried on the foreign session as `closedProject` | held: not drawn, 1 read at the hold, 0 reads over two idle passes; after the create: **drawn**, 2 reads |
| W4 | PARENT. A folder the re-home opened (the window learned it by asking), closed, re-added, then a create | the re-add is hidden and the create's folder is not drawn either (the parent's own behaviour; W3's mechanism draws it at HEAD) |

So the window code stays; main carries the record (D9). The memo is unchanged because it already keys on "a session in
this folder carries the record of a closed tab" (`sessions-slice.ts:583-599`), which the renderer cannot tell apart from a
stamp and need not.

### 2.3 The migration (`m3-migration.test.ts`, 1 of 1, exit 0)

HEAD simulated as the shipping `MIGRATIONS` plus the draft 020 of D1, sealed `{version 20, minCompatible 13}`, through
the shipping `runMigrations` (`src/main/db/sqlite.ts:410-445`) and `stampSchemaVersion`
(`src/main/db/schema-version.ts:299-325`); the parent is the shipping `ManifestStore` itself.

| # | Step | Reading |
| --- | --- | --- |
| G0 | The parent writes a schema 19 file with a remote close | `user_version 19`, min 13, no table |
| G1 | HEAD opens it | 020 ran (`true`); `user_version 20`, min 13; table present; migration row 1; the parent's stamped row byte for byte |
| G2 | The parent opens it again (and clears a folder the old way) | no refusal; `user_version 19`, min 13; table, its row and the 020 migration row KEPT; the parent reads its own stamp (held `true`) and ignores the table (the folder held only by the row reads `false`: the parent's own defect); the parent's clear leaves the row |
| G3 | HEAD again | nothing pending (`false`); `user_version 20`; the row survived |
| G4 | Had the minimum moved to 20 | the parent is refused at the open: "This copy of Tortie is older than your session list…" |

### 2.4 Cost, and the base gates

- The folder read, `better-sqlite3` in memory: one point read 0.452 µs; a read of the whole table into a map 0.36 µs at 0
  rows, 2.87 at 10, 24.82 at 100, 240.05 at 1,000. D9 asks one point read per session on a machine with no stamp, per
  `listSessions`.
- At the base: `node build/contract-inventory.mjs --check` exit 0, 1.13 s; the five closed-tab test files
  (`p306-held-closed`, `p306-tab-closed-reader`, `p93-remove-project`, `p306-remote-tab-memo`, `p336-folder-pins`) 58 of
  58; `node build/p306/probe-p306.mjs --self-test` PASS, 46 fixtures; `node build/p3201/real-machine.mjs --self-test`
  PASS, 93 fixtures. `df -h /` read 14 GiB free.

## 3. Decisions, each with its source

**D1. The table.** In migration 020's `up`, exactly:

```sql
CREATE TABLE IF NOT EXISTS closed_remote_folders (
  machine_id   TEXT NOT NULL,
  path         TEXT NOT NULL,
  project_name TEXT NOT NULL,
  closed_at    INTEGER NOT NULL,
  PRIMARY KEY (machine_id, path)
);
```

indented as `019-remote-folder-pins` is (`schema.ts:649-658`), because `gate:contract` prints the text sqlite keeps.
Source: the entry's mechanism 1 (its shape, renamed by D3); the key is `remote_folder_pins`'s, so the same path on two
machines is two rows and the stored path is byte for byte (no case fold, no `.normalize()`: rule 23 of
`conformance:samefolder` reads `src/main/manifest`). `project_name` has a reader, D9 (the name the tab had, which
`closedProject.name` carries), so it is `NOT NULL`; the one writer always has it, because the codec drops a tab with an
empty name (`src/main/manifest/codecs.ts:542`). `closed_at` is the close's own instant (`tab.closedAt`), carried as
`closedProject.closedAt`. No `project_id`: nothing reads it.

**D2. Migration `020-closed-remote-folders`, additive.** `MANIFEST_SCHEMA_VERSION` becomes 20 (`schema.ts:680`),
`MANIFEST_MIN_COMPATIBLE_VERSION` stays 13 (`:804`), and the migration gets the comment block 019 has (WHAT IT FIXES, WHY
A TABLE, WHAT IS IN IT, ADDITIVE), and the minimum's history gains this paragraph after the Phase 336 one (`:787-803`),
word for word:

> PHASE 344 LEFT IT AT 13 TOO, and this paragraph is the record of that decision. Migration 020 adds the
> `closed_remote_folders` table. A build at schema 13 to 19 has never heard of that table, so it writes no row into it
> and reads none. There is no row it can write that this build reads wrongly, and no row this build writes that it
> reads wrongly, because it does not read the table at all. What such a build lacks is the record of a close for a
> folder on another machine none of whose sessions has a row on this Mac, and it lacked that record before this
> migration too: it records a close the old way, as a stamp on the session rows, and this build still reads the stamp.
> A file such a build opens and this build then opens again keeps every row: the older build's stamp moves
> `user_version` back to its own number, the migration row for 020 stays, the table stays, and nothing is re-run
> (build/p344/SPEC.md §2.3). A folder the older build opened again in the meantime has its project row back, which the
> re-home finds before it asks for any record, so a row left beside an open tab holds nothing, and the next close
> writes it again. Nothing on the restore path reads the table and no launch depends on it, so the migration is
> additive by the same rule as 015, 017 and 019 and the number does not move.

Source: the entry's mechanism 1; measured G0 to G4.

**D3. Only a folder on another machine is written. A local close writes exactly what it wrote.** Departs from the brief's
default and the entry's "LOCAL_MACHINE_ROW for this Mac". Measured: nothing would ever read a local row. The re-home skips
every session with no machine (`remote-rehome.ts:169-170`), the release runs on the remote branch only
(`create-local.ts:209`, `:250`), and D9 carries the record onto sessions that have a `machine` only. Writing local rows
would be a record with no reader, and leaving them out keeps the entry's first refusal ("No change to local tabs") true at
the byte level, so the local half has nothing to verify. Hence the table's name says `remote`, and so does the migration's
(the entry's own migration name).

**D4. The write.** `markProjectTabClosed` (`src/main/manifest/sessions-repository.ts:845-866`), INSIDE its existing
`durableTransaction`, after the stamp `UPDATE`, whether or not any row matched:

- it writes the folder's row ONLY when the stamp it just wrote is one `projectTabClosedFor` would accept for that folder:
  the tab survives `parseClosedProjectTab` (the codec, `codecs.ts:530-567`), its `path` is the target's path, its
  `machineId` is the target machine, and that machine is not `LOCAL_MACHINE_ROW` (D3). In production `removeProject`
  always passes a tab that agrees (`core.ts:4095-4107`). The test-made disagreements of Phase 306's R2a and R2b therefore
  write no row, and those two tests keep their meaning;
- it is an upsert: `INSERT … ON CONFLICT(machine_id, path) DO UPDATE SET project_name = excluded.project_name,
  closed_at = excluded.closed_at`, so a second close (after an older build re-opened the tab) replaces it;
- the return value stays the number of session rows stamped (`p93-project-tombstone.test.ts:231`, `:282`, `:303` and
  `p306-tab-closed-reader.test.ts:123`, `:133` read it).

**ABLATION:P306'S NEEDLES MUST STILL MATCH EXACTLY ONCE** (`build/p306/ablation.mjs:159-209`). So the agreement test is
spelled in words of its own: `tab.path === target.path && ` and ` && (tab.machineId ?? LOCAL_MACHINE_ROW) === machine` and
`const tab = parseClosedProjectTab(row.project_tombstone);` stay where they are, once, in the reader, and the mark's check
reads the codec's answer into another name, e.g.
`const kept = parseClosedProjectTab(JSON.stringify(tab)); if (machine !== LOCAL_MACHINE_ROW && kept !== undefined &&
kept.path === target.path && kept.machineId === machine) { … }`.
Source: the entry's mechanism 2; Phase 306's conjunction (`sessions-repository.ts:908-920`) applied at the write.

**D5. The clear.** `clearProjectTabClosed` (`sessions-repository.ts:885-897`) deletes the folder's row for the same
`(machine, path)` as well as clearing the stamps, both in ONE ordinary transaction (not durable: Phase 93's reason at
`:876-878` holds for the row too, because a row lost beside a tab that is open again holds nothing while the tab's row
exists, and the next close writes it again). A local target deletes nothing (no local row exists). The return value stays
the number of session rows cleared (`p93-project-tombstone.test.ts:377`, `:383-389`, `:398`;
`p306-tab-closed-reader.test.ts:212`). No new caller: §2.1 P4 measured every way back reaching it. Source: the entry's
mechanism 3.

**D6. The read.** `projectTabClosedFor` (`sessions-repository.ts:930-950`) answers `true` when the folder's row exists in
the one shape (D10), and otherwise exactly as today. The folder test goes BEFORE the stamp `SELECT`; the stamp half's text
does not change, by D4's needle rule. A close made by a build before this one is therefore still held by its stamps.
Source: the entry's mechanism 4.

**D7. Removing a machine deletes no folder record.** Departs from the entry's mechanism 5 ("deletes that machine's folder
rows with its other records"). Measured (§2.1 P5): `removeMachineCompletely` (`src/main/machines/removal.ts:237-272`)
deletes none of a machine's records from the manifest. It tombstones its session rows (kept, discarded, pruned after 90
days), and it leaves `remote_projects` and `remote_folder_pins` exactly as they were. The only `DELETE` of those tables is
`deleteProject` by id (`src/main/manifest/projects-repository.ts:169-174`). A folder's record is the same kind of row: a
fact about a folder he chose, keyed by that machine's id. Kept, it is inert while the machine is gone, because no session
of an unregistered machine is listed, so the re-home never asks about it. If the machine is added again under the same id,
the tabs he closed stay closed and the tabs he left open come back open (their `remote_projects` rows survived too).
Deleting the closed half alone would bring back exactly the tabs he closed, which is the defect. Source: P5; his rule.

**D8. A closed folder holds its exact folder.** The entry's question 6, the default kept. Measured (§2.1 P3): a session
whose own project is a subfolder opens that subfolder's tab at the parent, and one whose project is the closed folder is
grouped under it and held with it whatever its working directory (`remoteProjectPathFor`, `remote-rehome.ts:112-125`). A
subfolder with its own project is a tab he never closed. Holding everything under a closed folder would let one closed
home-folder tab hide every project under that home on the machine. The read is `machine_id = ? AND path = ?`, no prefix.

**D9. Main carries the record on the sessions it lists; the window's code does not change.** In `listSessions`
(`core.ts:3145-3242`), just before `return stampRecordLocations(out);` (`:3241`), every session that has a `machine`, has
no `closedProject` of its own (its stamp, `:3195-3205` for a remote row) and whose `projectPath` (already the folder on
that machine, by `atHomeOnItsMachine`, `:449-453`) has a folder record, carries
`closedProject: { name: record.projectName, path: session.projectPath, closedAt: record.closedAt }`. Its own stamp wins.
A session on this Mac is never touched. The rule is a PURE exported function in `src/main/machines/remote-rehome.ts`,
`withClosedFolderRecords(sessions, closedFolder)`, where `closedFolder(machineId, path)` is the store's read (D11), so it
is tested without a core. Measured: §2.2 W2 against W3. It also makes `Session.closedProject`'s promise true for these
sessions: Go to session no longer tells him a folder "had no tab" when he closed it (`session-focus.ts:126-130`, `:202-205`).
`src/shared/types.ts:312-334` gets one sentence: the record is also carried on a session on another machine whose
folder's tab was closed, whether or not that session existed then. Source: §2.2; Phase 306's window rule
(`sessions-slice.ts:553-567`, "the record is main's own word, carried on every session it lists").

**D10. A planted row reads as no record.** `closedRemoteFolder` answers a record only when `project_name` is a non-empty
string and `closed_at` a finite number (`typeof === 'number'`, because an `INTEGER` column stores a planted `'abc'` as
text). Anything else reads as no record, so the folder fails OPEN, today's behaviour, as the stamp codec does
(`sessions-repository.ts:922-925`). An empty machine id or path reads as no record. Source: `remote-folder-pins.ts:112-130`'s
shape.

**D11. One file owns the table.** `src/main/manifest/closed-remote-folders.ts` (new), the shape of
`src/main/manifest/remote-folder-pins.ts`: its header (what one row is, why a table, the stored path byte for byte, a
planted row reads as none, the durability split of D4 and D5, no prune because a row is one per folder he closed and a
re-open deletes it), the row type, and a class `ClosedRemoteFolders(db)` with exactly three members:

- `closedRemoteFolder(machineId, path): ClosedRemoteFolder | undefined`, the read of D10;
- `recordClosedRemoteFolder(record): void`, the upsert of D4, which opens NO transaction of its own and is called only
  from inside `markProjectTabClosed`'s;
- `forgetClosedRemoteFolder(machineId, path): number`, the delete of D5, called only from inside
  `clearProjectTabClosed`'s transaction.

`SessionsRepository` builds one over its own connection (`sessions-repository.ts:91-92`) and composes it in the three
methods; `ManifestStore` (`src/main/manifest/store.ts`) gains one facade read, `closedRemoteFolder(machineId, path)`,
beside `projectTabClosedFor` (`:512-514`), and one header line under `:27`. `ClosedRemoteFolder` is
`{ readonly machineId: string; readonly path: string; readonly projectName: string; readonly closedAt: number }`. The file
imports only `type Database` from `better-sqlite3`, because `build/contract-inventory.mjs` bundles the store on its own.

**D12. `removeProject` pushes the list after any close of a tab on a machine.** `core.ts:4128` becomes
`if (stampedCount > 0 || closedOnMachine) this.broadcastSessions();`, where `closedOnMachine` is true when a project row
was found and its `machineId ?? 'local'` (`:4094`) is not `'local'`. A close of a folder on a machine changes what
`listSessions` carries for its foreign sessions (D9), and Phase 93's fix round (`:4115-4127`) is why a changed record is pushed at once rather than at the next pass. A local close
with no session still pushes nothing (`p93-remove-project.test.ts:233-241`).

**D13. The existing tests that change, and only these.**

- `src/main/sessions/__tests__/p306-held-closed.test.ts:332-346`, H7 ("the stated limit … comes back") is the limit this
  phase closes. It becomes `H7 a folder with no recorded session stays closed too (Phase 344)`, expecting
  `projectsAdded 0`, `tabsHeldClosed 1` and the row absent. `build/p306/ablation.mjs` names no H7, so no key moves.
- `src/main/manifest/__tests__/p306-tab-closed-reader.test.ts`, R3 (`:149-160`) and R5 (`:170-179`): their claims are about
  the STAMP half, and since this phase a close of `m1:F` also writes F's folder row, which holds F by itself. Each gains,
  after its close and before its first `held(F, 'm1')` that expects `false`, the removal of that row through a raw
  `better-sqlite3` handle on the same file (`DELETE FROM closed_remote_folders`), with a comment saying the row is removed
  so the test reads the stamp half alone. Titles stay EXACTLY as they are (`build/p306/ablation.mjs:113-133` keys on them),
  so A1 and A5 still redden them. R5's first `held(F, 'm1')` that expects `true` comes BEFORE the removal and stays.
- The schema pins, 19 to 20 and 019 to 020: `exit-detail.test.ts:72`, `:191`; `machine-id-migration.test.ts:268`,
  `:269`, `:275-278` (the last migration's name), `:333`, `:386`; `session-history.test.ts:78`, `:84`, `:133`, `:150`;
  `context-snapshot.test.ts:152`; `p93-project-tombstone.test.ts:176`, `:178`; `p903-a-remote-projects.test.ts:97`, `:99`;
  `remote-executions.test.ts:71-74`; all under `src/main/manifest/__tests__/`.
- `src/main/manifest/__tests__/p336-folder-pins.test.ts:128-157`: its first two tests stop pinning the LAST migration.
  They keep `MIGRATIONS[18]?.name === '019-remote-folder-pins'` and the minimum 13, drop the `MANIFEST_SCHEMA_VERSION`
  19, `toHaveLength(19)` and `.at(-1)` pins, and read the post-open `user_version` as `MANIFEST_SCHEMA_VERSION`; their
  titles become `is the nineteenth migration and the minimum stays 13` and `runs over a schema 18 file, lands it on this
  build's version, and a schema 18 build may still open it` (no ablation keys on them). Its schema 18 builder (`:74-97`)
  filters by name, so it builds the same file.
- `src/main/manifest/__tests__/reconstruct.test.ts:470-490`: `'closed_remote_folders'` joins the digested user tables,
  first in the sorted list, with a Phase 344 comment in the shape of the 336 one.

Each of those is named in the commit body. Anything else red is a finding, not a test to edit.

**D14. The menus do not move.** No surface is added, renamed or removed; no native menu row, no setting, no sentence. The
one copy-visible difference is a sentence NOT drawn (D9: Go to session on a session in a folder he closed), which is
Phase 93's rule reaching sessions it did not reach.

**D15. The CHANGELOG.** Phase 306's 0.111.0 Fixed item (`CHANGELOG.md:38`) ends with "A folder whose sessions this Mac did
not start, from Tortie on that machine or on another Mac, still comes back", which this phase makes false, and 0.111.0 is
unpublished. So the item is REWRITTEN in place, not joined by a second item about the same tab, and carries both commits
(§13). Source: CHANGELOG.md's house rules (one item per thing a person can do; each commit once); the brief.

**D16. Tier 3, and the independent methods stated before the work.** Tier 3 because it adds a manifest table and a
migration and changes what main writes on every close and reads on every pass. The verifier must do at least two things
the builders did not, one an attack:
1. **Attack** (§12): the downgrade round trip with REAL builds on one scratch profile, parent then HEAD then parent then
   HEAD, plus planted hostile rows; and the attack on the hold's width (a folder that never had a tab, a subfolder, the same
   path on this Mac, a different machine).
2. **Re-derive independently**: the reachable-state table (§6) from the verifier's own census of every writer and reader of
   `closed_remote_folders`, `sessions.project_tombstone` and `remote_projects`, not from this spec's list.
3. **Measure the parent** (mandatory, he reported it): `probe:p306` at `e1e17899` and at HEAD, `--side-by-side`.
4. **Real data**: his Mac Pro, read only (§8.4), and `P306_FAR=real` on a scratch server there at both builds.

## 4. Main side (builder-main)

1. `src/main/manifest/schema.ts`: migration 020 (D1, D2) appended after `:659`; `MANIFEST_SCHEMA_VERSION = 20` (`:680`);
   the D2 paragraph after `:803`. The module-load check (`:823-832`) then holds.
2. `src/main/manifest/closed-remote-folders.ts` (new): D11, D10.
3. `src/main/manifest/sessions-repository.ts`: the class builds `ClosedRemoteFolders` over `this.db`; `markProjectTabClosed`
   (D4) with its doc gaining "AND THE FOLDER, BY ITSELF (Phase 344)"; `clearProjectTabClosed` (D5) in one transaction;
   `projectTabClosedFor` (D6) with its doc's "TWO TESTS" paragraph becoming "THE FOLDER'S RECORD, OR TWO TESTS"; a
   delegating `closedRemoteFolder(machineId, path)` for the facade. Nothing else in the file moves.
4. `src/main/manifest/store.ts`: the facade read (D11) and the header line.
5. `src/main/machines/remote-rehome.ts`: `withClosedFolderRecords` (D9), pure, exported, no store import beyond the
   existing `import type`; the header's "What it does not do" paragraph (`:52-67`) rewritten: the stated limit is gone, a
   close is recorded for the folder itself, the ways back are unchanged, and a session Tortie on that machine starts in a
   folder he closed here stays listed under that folder's name with the tab shut until he opens it. The doc of
   `openTabsForRemoteCreate` (`:259-291`) says "the record of a close" for "tab-closed stamps". `rehomeRemoteSessions`'
   body does not change: it asks `projectTabClosedFor`, which now reads both halves. No pin function is named in any of
   the three bodies `conformance:machines` condition 118 reads (`build/conformance-machines.mjs:13500-13510`).
6. `src/main/sessions/core.ts`: import `withClosedFolderRecords` beside `rehomeRemoteSessions` (`:246-249`); `listSessions`
   (D9) at `:3241` as `return stampRecordLocations(withClosedFolderRecords(out, (m, p) => this.manifest.closedRemoteFolder(m, p)));`;
   `removeProject` (D12). No other line.
7. `src/shared/types.ts:312-325`: the one sentence of D9, comment only.

Nothing is sent to any machine by any line this phase adds. No status is set. No timer. No log line names a folder or a
machine (the re-home's `held` line, `remote-rehome.ts:249-255`, is unchanged and counts folders).

### 4.1 The spellings `build/p344/ablation.mjs` reads (builder-main writes them so; builder-proof's needles match them)

The two builders work at once, so these lines are fixed here. Each must appear EXACTLY ONCE in its file. A `\|` in this
table is the markdown escape for `|`: the source and the needle spell `||`.

| File | The spelling | Entries |
| --- | --- | --- |
| `closed-remote-folders.ts` | `'SELECT project_name, closed_at FROM closed_remote_folders WHERE machine_id = ? AND path = ?'` | X7 (`machine_id = ? AND ` → `? IS NOT NULL AND `), X9 (`AND path = ?` → `AND ? LIKE path || '%'`, the same two parameters) |
| `closed-remote-folders.ts` | `if (typeof row.project_name !== 'string' \|\| row.project_name.length === 0) return undefined;` and `if (typeof row.closed_at !== 'number' \|\| !Number.isFinite(row.closed_at)) return undefined;` | X8 (both removed) |
| `sessions-repository.ts`, `markProjectTabClosed` | `const kept = parseClosedProjectTab(JSON.stringify(tab));` then `if (machine !== LOCAL_MACHINE_ROW && kept !== undefined && kept.path === target.path && kept.machineId === machine) {` then `this.closedFolders.recordClosedRemoteFolder({`, all inside the `durableTransaction` callback after `changed = info.changes;` | X1 (`this.closedFolders.recordClosedRemoteFolder(` → `void (`), X2 (`kept.path === target.path && kept.machineId === machine` → `true`), X3 (`machine !== LOCAL_MACHINE_ROW && ` → empty), X4 (the block moved after the callback), X16 (`kept !== undefined && ` → `kept !== undefined && changed > 0 && `) |
| `sessions-repository.ts`, `clearProjectTabClosed` | `this.closedFolders.forgetClosedRemoteFolder(machine, target.path);` inside `this.db.transaction(() => { … })()` | X5 (the call → `void 0;`), X15 (`this.db.transaction(` → `durableTransaction(this.db, `, the trailing `()` dropped) |
| `sessions-repository.ts`, `projectTabClosedFor` | `if (this.closedFolders.closedRemoteFolder(machine, target.path) !== undefined) return true;` as the line after `const machine = …` | X6 (removed) |
| `sessions-repository.ts`, `markMachinesForgotten` | its callback's opening, `durableTransaction(this.db, () => {` then `written = 0;` (`:772-773`), unchanged; that pair of lines is the needle, because the first line alone appears six times in the file | X10 (a `DELETE FROM closed_remote_folders WHERE machine_id = ?` for `entries[0]?.tombstone.machineId` planted after `written = 0;`) |
| `remote-rehome.ts`, `withClosedFolderRecords` | `const machineId = session.machine?.id;` then `if (machineId === undefined) return session;` then `if (session.closedProject !== undefined) return session;` | X14 (`session.machine?.id;` → `session.machine?.id ?? 'local';`), X12 (the third line removed) |
| `core.ts`, `listSessions` | `return stampRecordLocations(withClosedFolderRecords(out, (m, p) => this.manifest.closedRemoteFolder(m, p)));` | X11 (→ `return stampRecordLocations(out);`) |
| `core.ts`, `removeProject` | `if (stampedCount > 0 \|\| closedOnMachine) this.broadcastSessions();` | X13 (` \|\| closedOnMachine` removed) |

P3 (§7.2) hands `withClosedFolderRecords` a lookup that answers a record for EVERY machine and path, so X14 reddens it by
giving the session on this Mac a record. K10 (§7.1) reddens under X10 on its one-row half (an empty plan opens no
transaction, `sessions-repository.ts:767-770`).

## 5. The window: confirmed unchanged, and why

- `reconcileRemoteTabs` and `tabsAskedFor` (`sessions-slice.ts:568-611`) are untouched. With D9 a held folder whose
  sessions this Mac did not start is asked about once when the record first reaches the window and once when a way back
  clears it (W3: 1 read, then 0 over idle passes, then 1).
- At the close itself the window still holds the tab while main pushes (Phase 306 §2.5), so D12's push does not touch the
  memo; it brings `closedProject` to the window's copy at once.
- Every way back that is a window action re-reads the list itself: Open on machine and Go to session through
  `addRemoteProject` (`projects-slice.ts:282-294`), the sheet's restore through `openTargetProject`, a create from a tab on
  this Mac (`sessions-slice.ts:1216-1252`). A create from a tab on the machine relies on the memo, which D9 feeds.
- The session manager reads `tabOpen` from the window's project list (`src/renderer/session-manager/projection.ts:319`), so
  a held folder's group reads tab closed and the Closed tab filter finds it with or without D9. Its label prefers
  `closedProject.name` (`src/shared/session-list.ts:145`, `:163-166`), which for a folder on a machine is the folder's own
  name either way (`projectNameForPath`, the only namer of a remote row).

## 6. The reachable-state table (the verifier re-derives this; this is the spec's own reading)

For one folder F on one machine M: **R**, a `remote_projects` row for `(M, F)`; **K**, a `closed_remote_folders` row for
`(M, F)` in the one shape; **S**, the stamp half of `projectTabClosedFor` (Phase 306's two tests).

| Cell | R | K | S | Reached at HEAD by | Held? |
| --- | --- | --- | --- | --- | --- |
| 1 | no | no | no | start; a folder never opened; every stamped row discarded with no K | opened by the first pass that lists a session in F (Phase 90.3) |
| 2 | no | yes | any | `removeProject` (D4); an older build's close after HEAD wrote K and an older build re-opened (K left) | HELD, pass after pass, relaunch after relaunch |
| 3 | no | no | yes | an older build's close; HEAD after a downgrade | HELD (today's rule) |
| 4 | yes | no | no | every add, every create, every release, the re-home from cell 1 | open |
| 5 | yes | yes | any | an older build re-opening F after HEAD closed it (G2); a power loss between the add's upsert and its clear (NORMAL commits, a lost suffix); a crash between the durable close and `deleteProject` | open: the re-home asks nothing about a folder with a row (`remote-rehome.ts:209-211`); D9 carries the record on F's foreign sessions inside an open tab, which the window ignores (`known`, `sessions-slice.ts:595`) and the sheet labels by the open tab's name. The next close rewrites K; the next add clears it |
| 6 | yes | no | yes | Phase 306's cell 4 (the Past restore, a crash) | open, as at the parent |

Transitions at HEAD: 1→4 re-home, add or create; 2→4 and 3→4 add, create or a failed create's release (all clear K and S);
4→2 any close of a remote tab (K written whether or not S); 2→1 never by a pass, a removal (D7) or a session's End or
Remove; 5→2 a close; 5→4 an add or create. The re-home writes no K and clears none. A session Tortie on M starts in a
cell-2 folder stays listed, held, carrying the record (D9), until he opens F.

## 7. The unit proof (builder-proof), each test owning a clause

Titles are the ablation's keys (§7.4): unique, stable, and each file's rig is the existing one named.

### 7.1 `src/main/manifest/__tests__/p344-closed-remote-folders.test.ts` (new; rig `p336-folder-pins.test.ts:1-70`)

| Title | Asserts |
| --- | --- |
| `M1 is the twentieth migration, the version is 20 and the minimum stays 13` | `MIGRATIONS[19].name === '020-closed-remote-folders'`, version 20, min 13 |
| `M2 runs over a schema 19 file, lands it on 20, keeps every row, and a schema 19 build may still open it` | a file built with the first 19 migrations sealed `{19, 13}`, holding a stamped remote row, a remote project and a pin; after `new ManifestStore` the version 20, min `'13'`, the table present, every pre-existing row `toEqual` its before; `assertDatabaseUsableAt(…, {version 19, minCompatible 13})` does not throw |
| `M3 runs once, and a second open runs nothing` | one `020-…` migration row; a second open adds none |
| `M4 a schema 19 build opening it again moves the version back and keeps the table, and this build re-runs nothing` | §2.3 G1 to G3 over the shipping runner: version 20, 19, 20; the row and the migration row survive; no refusal |
| `K1 a close of a folder on a machine with no recorded session holds it` | `markProjectTabClosed({path F, machineId m1}, tab)` returns 0; `projectTabClosedFor` true; `closedRemoteFolder` answers `{projectName, closedAt}` |
| `K2 a second close of the same folder replaces its name and instant` | one row, the second close's values |
| `K3 a local close writes no folder record` | a raw `SELECT COUNT(*)` reads 0 after a local close with and without session rows; a local folder with a stamped row still reads held (today) |
| `K4 a close whose record would not name the folder it closes writes no folder record` | target m1 with a tab naming no machine; a tab naming another path; a tab with `projectId ''`: 0 rows each |
| `K5 the folder record and the stamps are one durable transaction` | (a) the `durable-commits.test.ts:36-79` pragma spy reads the raise-and-lower pair exactly once around a close with no rows; (b) with the table dropped through a raw handle, the close throws and no stamp was written |
| `K6 opening the folder again clears the record and the stamps, and the clear is not durable` | after `clearProjectTabClosed({path F, machineId m1})`: no record, not held, the return value counts stamps only; the spy reads no `synchronous = FULL` |
| `K7 the same path on two machines is two records` | m1:F closed; m2:F and local F not held |
| `K8 a planted row that is not in the one shape reads as no record` | raw rows with `project_name ''`, `closed_at 'abc'`, `closed_at` NULL refused by the schema (the insert throws): the first two read undefined and not held |
| `K9 a closed folder holds its exact folder and no folder under it` | m1:F closed; m1:`F/sub` not held, `F/` not held |
| `K10 a removed machine keeps its folder records` | `markMachinesForgotten` over the machine's one row, and again with an empty plan: the record still answers |
| `K11 a close made by a build before this one is still held by its stamps` | a stamp written by raw `UPDATE … SET project_tombstone`, no folder row: held |

### 7.2 `src/main/sessions/__tests__/p344-held-whoever-started.test.ts` (new; rig `p306-held-closed.test.ts:42-205`)

| Title | Asserts |
| --- | --- |
| `B1 a folder whose only session this Mac holds no row for stays closed, pass after pass` | three passes over a feed-only session: `projectsAdded 0`, `tabsHeldClosed 1`, no row |
| `B2 a mixed folder stays closed after this Mac's own session in it is removed` | §2.1 P2's steps: held after the Remove |
| `B3 a subfolder with its own project opens its own tab, and a session under the closed folder is held with it` | §2.1 P3's feed: F held, `F/sub` and `F/other` opened |
| `B4 a create in a folder held only by its record opens it and clears the record` | `openTabsForRemoteCreate`: row present, no record, not held |
| `B5 a create that threw opens a folder held only by its record and clears it` | `releaseFoldersAfterFailedRemoteCreate` returns `[F]`; no record |
| `B6 a folder that never had a tab still opens, and this Mac's closed folder of the same path holds nothing there` | Phase 90.3's first pass; a local close of F then a feed row on m1 in F opens `m1:F` |
| `B7 a machine removed and added again under the same id keeps the folder closed` | `markMachinesForgotten`, then a pass over feed rows on the same id: held |
| `P1 a session on a machine with no stamp of its own carries its folder's record` | `withClosedFolderRecords` over a feed-shaped session: `closedProject` `{name, path, closedAt}` from the record |
| `P2 a session's own stamp wins over its folder's record` | a session already carrying `closedProject` comes back with it unchanged (same object) |
| `P3 a session on this Mac, and one in a folder with no record, carry nothing` | both returned unchanged |

### 7.3 `src/main/sessions/__tests__/p344-core-closed-folders.test.ts` (new; rig `p93-remove-project.test.ts:26-162`, with `remoteSessions` in `../../machines/remote-sessions` mocked to answer one feed row with no manifest row)

| Title | Asserts |
| --- | --- |
| `C1 closing a tab on a machine with no recorded session records the folder and pushes the list once` | the borrowed `removeProject`: the record answers, `broadcasts === 1` |
| `C2 the list a window reads carries the record on a session this Mac did not start` | after C1's close, the borrowed `listSessions`: the feed row carries `closedProject` naming F |
| `C3 the list keeps a session's own stamp over its folder's record` | a recorded session in F stamped with a different name: its own stamp is what the list carries |
| `C4 opening the folder on that machine again clears the record and the list carries none` | the borrowed `addRemoteProjectAdmitted`: no record; the feed row carries no `closedProject` |
| `C5 opening a folder on this Mac clears nothing on a machine` | the borrowed `addProject` of a local folder with F's path: `m1:F`'s record still answers |

### 7.4 `build/p344/ablation.mjs` (new), `npm run ablation:p344`

The template is `build/p306/ablation.mjs` (its whole header holds): a `cp -Rc` clone under
`/private/tmp/p344-ablation-<pid>-…` with `node_modules` symlinked and `build/vendor` linked never copied; an UNEDITED
control over the five files below green first and again last; each needle matching the shipping source EXACTLY ONCE;
each entry's named owners NEWLY red by title (the delta rule); every edited clone file restored and proved by sha256; the
clone removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; the worktree's bytes asserted unmoved; vitest run as
`process.execPath node_modules/vitest/vitest.mjs run --no-cache --reporter=json --outputFile=…`, synchronously. No
Electron, tmux, ssh, agent or token. `P344_ONLY` runs named entries; `--list` runs nothing.

Files: `p344-closed-remote-folders.test.ts`, `p344-held-whoever-started.test.ts`, `p344-core-closed-folders.test.ts`,
`p306-tab-closed-reader.test.ts`, `p306-held-closed.test.ts`.

| Entry | The one clause broken | Must newly redden |
| --- | --- | --- |
| X1 | D4: the folder write removed from `markProjectTabClosed` | K1, B1, C1 |
| X2 | D4: the agreement dropped (the row written from the target alone) | K4 |
| X3 | D3: the remote-only clause dropped (a local close writes a row) | K3 |
| X4 | D4: the folder write moved after the durable transaction | K5 |
| X5 | D5: the folder delete removed from `clearProjectTabClosed` | K6, C4 |
| X6 | D6: the folder half removed from `projectTabClosedFor` | K1, B1 |
| X7 | D1/D10: the read keyed on the path alone (`machine_id = ?` dropped) | K7 |
| X8 | D10: the shape check removed (any row holds) | K8 |
| X9 | D8: a prefix match (`OR ? LIKE path || '/%'`) | K9, B3 |
| X10 | D7: a `DELETE FROM closed_remote_folders WHERE machine_id = ?` planted in `markMachinesForgotten`'s transaction | K10, B7 |
| X11 | D9: the `withClosedFolderRecords` call removed from `listSessions` | C2 |
| X12 | D9: the record wins over an own stamp | P2, C3 |
| X13 | D12: `removeProject` pushes only when it stamped | C1 |
| X14 | D9: the record carried onto a session on this Mac | P3 |
| X15 | D5: the clear made durable (the stamp `UPDATE` and the delete under `durableTransaction`) | K6 |
| X16 | D4: the folder written only when a session row was stamped (Phase 306's limit in another spelling) | K1, B1, C1 |

### 7.5 What the gates already prove and must still prove

`npm run ablation:p306` (unchanged file) must stay green: its 23 needles still match once (D4's rule), and A1/A5 still
redden R3/R5 after D13's amendment. If a needle moved, builder-proof updates THAT entry in `build/p306/ablation.mjs` and
the commit body says which; nothing else in that file moves.

## 8. `probe:p306`, the app run (builder-probe writes it; only a verifier runs it, under THE LOCK)

### 8.1 The script, its protections, and its refusals

`package.json` (integrator):

```
"probe:p306": "node build/harness-socket.mjs --fresh gmux-p306 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; export SCRATCH_MACHINE_QUIET_SHELL=1; export SCRATCH_MACHINE_SCRATCH_HOME=1; export SCRATCH_MACHINE_NO_OWN_KEYS=1; if [ \"${P306_FAR:-loopback}\" = real ]; then node build/p306/probe-p306.mjs; else node build/with-scratch-machine.mjs -- node build/p306/probe-p306.mjs; fi'",
```

It runs the loopback machine with its quiet shell, a scratch far home and the run's own key alone, because today's script
sets none of them: a far `shell` the probe creates would start his zsh in his home, and the yard would read his
`~/.ssh/*.pub` and ask his agent (`build/scratch-machine.mjs:130-164`). `build/p306/probe-p306.mjs` gains, beside its
refusals (`:155-172`), exit 2 when (loopback) any of `SCRATCH_MACHINE_QUIET_SHELL`, `SCRATCH_MACHINE_SCRATCH_HOME`,
`SCRATCH_MACHINE_NO_OWN_KEYS` is not `1`, the shape of `build/p336/probe-p336.mjs:699-701`; `P306_FAR` not `loopback` or
`real`; and (real) `realMachineFromEnv(process.env, socket, { app: true, scratchAgent })` refusing, the shape of
`probe-p336.mjs:713-723`. Stated, not closed, as in every remote probe since Phase 69 (`build/p337/SPEC.md` §Attack
A18): the ssh the APP spawns takes `~` from the account record and so opens his ssh client configuration; no role reads it.

`MAIN_SOURCES` (`probe-p306.mjs:262-271`) gains `src/main/manifest/closed-remote-folders.ts` and
`src/main/sessions/core.ts`; a source absent from the checkout being launched (the parent has no
`closed-remote-folders.ts`) is skipped, not refused.

### 8.2 The new arms, and the arms that change

Folders: `P.H = <farRoot>/hotel` (new), W1 as arm N makes it today. "Witness" is the existing pass witness
(`probe-p306.mjs:35-58`, `:1404-1430`). "Record" is `closedProject.path` of the named session as `sessions.list()` reads it.
`heldNow()` is the log's held count (`:1458`). "In the strip" and "in main" are the existing readers (`:1303-1305`).

| Arm | Launch | Steps | Graded at the parent `e1e17899` | Graded at HEAD |
| --- | --- | --- | --- | --- |
| B (changed) | 1 | `heldNow()` before; `closeTab(W1)` (W1's only session was made on the far server with an `@gmux-id` this Mac has no row for); witness; `heldNow()` after; w1's record | W1 BACK in main (the defect reproduces; absent is "did not reproduce") | W1 absent from main and the strip; w1's record names W1; the held count rose by one |
| BH | 1, after DS and before G | `openRemote(C)` (a no-op when open); `openRemote(H)` with H EMPTY (a tab he opened by hand); `makeFarSession(H, 'p306-h1')`, waited until main lists it; `closeTab(H)`; witness; read; then the REAL New session sheet from C's tab, Shell, Name `p306-h2`, Directory H (`ctx.uiCreate`, `:1438`); wait 30 s for main and 15 s for the strip | after the witness H is BACK in the strip (the defect, graded); after the create H in main AND the strip | after the witness H absent from main and the strip and h1's record names H; after the create H in main AND the strip within the waits, and h1's record gone. This is D9's guard (§2.2 W1 against W2) |
| BX | 2, after X2 | witness; read W1 | W1 in main (graded) | w1 reads live (else nothing is measured, one finding); W1 absent from main and the strip; w1's record names W1 |
| BO | 2 | `openRemote(W1)`; read; `closeTab(W1)`; witness; read | W1 in main and the strip after the open | after the open: W1 in main and the strip, w1's record gone; after the re-close and the witness: absent again |
| BG | 2 | `runMenuItem(w1, 'Go to session')` from the sheet; read; `closeTab(W1)`; witness | W1 in the strip, w1 active, the tab reads W1's folder name | the same, w1's record gone, and no toast whose text holds "had no tab" (`window.__p293.state().store.toasts`, `src/renderer/app/p293-session-manager-drive.ts:345`, read before and after; never photographed); after the re-close: absent |
| BC | 2 | `openRemote(C)`; the New session sheet from C's tab, Directory W1 | W1 in main (graded); the strip RECORDED (the parent's memo can hide its own re-add, W4) | W1 in main AND the strip; w1's record gone |

`NEEDS` (`:248-260`) gains `BX: ['B']`, `BO: ['B']`, `BG: ['B']`, `BC: ['B']`; BH needs nothing. `ALL_ARMS` (`:244`)
gains `BH, BX, BO, BG, BC` in that order. `HEAD_ONLY` is unchanged. The order of launch 2 is X2, BX, BO, BG, BC.

`readManifest` (`:1046-1074`) reads `SELECT machine_id, path, project_name, closed_at FROM closed_remote_folders;` as
its OWN `/usr/bin/sqlite3` call; `Error: no such table` reads as `closed: null` (the parent). `dbFindings` (`:557-581`)
gains, at HEAD: a `closed_remote_folders` row whose `machine_id` is `local` (D3); a row beside a `remote_projects` row for
the same folder (§6 cell 5, which no driven step reaches); after launch 1 with B chosen, no row for `(p306far, W1)` with
`project_name` W1's folder name. At the parent: a table present is a finding (the profile was not fresh); absent is
recorded.

`SIDE_ROWS` (`:627-667`): row 14 flips its rank (held is 1, comes back 0) and its text reads "A folder whose sessions this
Mac did not start, closed"; new rows `14r` (BX, "the same after a relaunch", held 1), `14o` (BO, "opened on the machine",
opens 1), `14g` (BG, "Go to session on its session", opens with its name 1), `14c` (BC, "a session started in it from a
tab on the machine", in main and the strip 2, in main only 1), `14h` (BH, "a folder he opened by hand, closed, then a
session started in it from a tab on the machine", drawn after the create 1). HEAD below the parent on any row exits 1, as
today.

### 8.3 `P306_FAR=real`, the real row (verifiers only)

`build/p3201/real-machine.mjs` refusal 4 (`:202-203`, header `:25-31`) learns the probe:p306 harness socket: the pattern
becomes `/^gmux-p(?:320|292|336|306)[a-z0-9-]*-\d+$/` and the sentence names `gmux-p306`; `--self-test` gains
`probe:p306's harness socket is accepted` (`gmux-p306-wt-p344-77`) and `a gmux-p306 socket with no pid is refused`
(`gmux-p306`), the shape of `:1020-1023`. Nothing else in that file moves; it stays the only committed file naming
`-L gmux` (count only).

Under `P306_FAR=real` the probe takes the real row the way `build/p320/probe-p320.mjs:1643-1660` does:
`openRealMachine(realFacts, { runDir: harnessDir, say })`, `process.on('exit', () => real?.close())` at once, the profile's
`machines.json` from `machineRow({ id: MACHINE_ID, host, user, farDir })` and `known-machines` from `real.knownHosts`;
every far folder under `${farDir}/far` made with `real.run('mkdir -p …')`; `makeFarSession` and the witness rename through
`real.tmux([...])` on the scratch socket; `endFarServer` becomes `real.close()`, whose census FAILS the run when his
`~/.zsh_history`, `~/.bash_history` or `~/.zshrc` there moved, and whose two counts of his own server must be equal. The
arms run there are `N, B, BH, BX, BO, BG, BC` and the fixture they need (C opened with one shell `c1`, the witness, H, W1);
`P306_ARMS` naming any other arm under the real row exits 2 with that sentence. Both builds run it, one after the other,
each its own harness socket and so its own `/tmp/p3201-<pid>`.

### 8.4 His Mac Pro's own server, read once (a verifier, never a builder; his authorization of 9 October)

From a script in the verifier's own scratch (never committed), through `openRealMachine`'s handle `real.run`, under
`/bin/sh -c`, ONCE:

```
<P3201_REAL_TMUX> -L gmux list-sessions -F '#{?@gmux-id,id,none} #{session_path}' 2>/dev/null | sort | uniq -c
```

It prints, per folder, how many of his sessions carry Tortie's id and how many do not; no session id, name or pane crosses,
nothing is created, ended, attached or written, and the handle's census stats his three dotfiles there before and after.
What it CANNOT say: which of those ids this Mac holds a row for, because that is in his live manifest, which no role reads.
So it establishes the precondition (Tortie sessions in the folders he closes; a Tortie on the Mac Pro shares `-L gmux` there,
`src/main/machines/context.ts:45-51`, so its sessions are listed here with no row) and the probe's B, BX and BH establish
the cause. The verdict reports the counts and names folders only as he would recognise them.

### 8.5 `--self-test` and `--grader-self-test`

`node build/p306/probe-p306.mjs --self-test` (and `--grader-self-test`, an alias added by this phase) gains, for each new
arm, a HEAD-shaped and a parent-shaped fixture that grade clean and a wrong-direction fixture that grades red (B at HEAD
with W1 back; BH at HEAD with H not drawn after the create; BX at HEAD with w1 not live is one finding and nothing else;
BC at the parent with the strip false is no finding), the new `dbFindings` clauses both ways, and the flipped row 14 and
the five new rows of `sideBySide`. Run as `node build/p306/probe-p306.mjs …`, NEVER as
`npm run probe:p306 -- --grader-self-test`, which hands the flag to `build/harness-socket.mjs` and starts the whole run
(Phase 336 did once).

## 9. The no-regression side by side (his rule: a part that regresses is REMOVED and queued)

"Today" is `e1e17899`, measured by `probe:p306` with `P306_PARENT_CHECKOUT`. Rows 1 to 13, 10b and M keep Phase 306's
readings and must read the same.

| # | Scenario | Today | HEAD | Arm |
| --- | --- | --- | --- | --- |
| 14 | A folder whose sessions this Mac did not start, closed | comes back | stays closed | B |
| 14r | The same after a relaunch | back | closed | BX |
| 14o | Then opened on the machine | opens | opens, record cleared | BO |
| 14g | Then Go to session on its session | opens with its name | opens with its name, and no toast saying it had no tab | BG |
| 14c | Then a session started in it from a tab on the machine | in main; the strip as the memo allows | in main and the strip | BC |
| 14h | A folder he opened by hand, holding only such a session, closed, then a session started in it from a tab on the machine | drawn (the defect had drawn it back) | drawn (D9) | BH |
| L | A local tab closed, then Refresh | stays closed | unchanged | LC |
| R | Real row: B, BX, BO, BG, BC, BH on his Mac Pro's scratch server | as 14 to 14h | as 14 to 14h | `P306_FAR=real` |

## 10. Gates, and who runs them

**Builders** run `npm run typecheck` and `npm test` before returning, and launch no Electron. builder-proof's files import
names builder-main adds (`closedRemoteFolder`, `withClosedFolderRecords`, the `ClosedRemoteFolder` type); if builder-main's
half has not landed when you run the gates, say which red lines are only missing names.

**The integrator** launches no Electron and runs, in order:

1. `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, then `git diff --stat` of that file. The
   moved lines are exactly: `user_version=19` → `20`; `[sqlite.migrations] count=19` → `count=20` and the line
   `020-closed-remote-folders`; `[sqlite.schema] objects=12` → `objects=13` and the `-- table closed_remote_folders` block
   (first in the sorted list). Anything else moving is a finding.
2. `npm run typecheck`; `npm run build` (its `gate:contract` now green against the regenerated baseline, and
   `gate:electron`, `gate:background`, `gate:knownhosts` (real-machine.mjs runs ssh), `gate:checks` (`ablation:p344`
   classified), `gate:simulator`, `conformance:ios`, `conformance:harnessprobes`); `npm test`.
3. The path-triggered gates: `conformance:machines` (`src/main/machines/**`: `remote-rehome.ts`), about 45 s.
4. Named by the entry, cheap, not triggered by these paths: `conformance:remoteclose` (it holds session Remove's two
   maps; ~0.6 s) and `conformance:farattach` (~1 s).
5. Not triggered, run because this phase moves what they read: `conformance:manager` (the sheet's group label reads the
   record D9 now carries more often; ~1 s) and `conformance:samefolder` (rule 23's domain gains
   `closed-remote-folders.ts`; 5 to 7 s, it mounts and detaches a scratch case-sensitive APFS image with `hdiutil`, no
   sudo). Rule 23's floor is a minimum and does not move.
6. `npm run ablation:p306` and `npm run ablation:p344`.
7. `node build/p306/probe-p306.mjs --self-test`; `node build/p3201/real-machine.mjs --self-test`.

**The verifier**, holding THE LOCK, with `df -h /` read first (under 8 GB free: wait and report): `smoke:t1` through
`build/electron-run.mjs`; `probe:p306` at the parent and at HEAD, one Electron at a time, then `--side-by-side`; §12's
attack; then (the one real-machine verifier) §8.4 and `P306_FAR=real` at both builds. The parent is built without
touching his `.git`: `git -C /private/tmp/wt-p344 archive e1e17899 | tar -x -C /private/tmp/wt-p344-parent`, then
`cp -Rc` `node_modules` and `build/vendor` from `/private/tmp/wt-p344`, then `npm run build` there. Electrons are
counted once at the end with CLAUDE.md's `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`.
His `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every command that starts a shell, a far session or
the app.

**Not run, and why:** `smoke:remote`, `smoke:machines` (the brief); `smoke:p93remote` (it is `npm run build && …` and
starts `electron .` outside `build/electron-run.mjs`); `npm run package` (`electron-builder` looks up a signing identity
in his login keychain).

## 11. Builders and file ownership (disjoint)

**builder-main** (product): `src/main/manifest/schema.ts`; `src/main/manifest/closed-remote-folders.ts` (new);
`src/main/manifest/sessions-repository.ts`; `src/main/manifest/store.ts`; `src/main/machines/remote-rehome.ts`;
`src/main/sessions/core.ts`; `src/shared/types.ts` (one comment sentence, §4 item 7).

**builder-proof** (unit proof and the attack on it): the three new test files of §7.1 to §7.3;
`build/p344/ablation.mjs` (new); the D13 edits to `p306-held-closed.test.ts`, `p306-tab-closed-reader.test.ts`,
`exit-detail.test.ts`, `machine-id-migration.test.ts`, `session-history.test.ts`, `context-snapshot.test.ts`,
`p93-project-tombstone.test.ts`, `p903-a-remote-projects.test.ts`, `remote-executions.test.ts`, `p336-folder-pins.test.ts`,
`reconstruct.test.ts`; and `build/p306/ablation.mjs` only if a needle moved (§7.5).

**builder-probe** (the app run): `build/p306/probe-p306.mjs` (§8.1 to §8.5); `build/p3201/real-machine.mjs` (refusal 4,
its header lines, two self-test rows).

**The integrator owns the shared files:**

- `package.json`: the `probe:p306` script of §8.1, replacing today's; `"ablation:p344": "node build/p344/ablation.mjs"`
  beside `ablation:p306`.
- `build/verification-checks.mjs`: `pure('ablation:p344', NEEDS.vitest)` beside `pure('ablation:p306')` (`:2397`), with a
  comment in the shape of the one above it; `remote('probe:p306')` (`:1297`) unchanged, its comment gaining the real row.
- `docs/audits/contract-baseline.txt`: regenerated (§10 item 1), the moved lines named in the commit body.
- `CLAUDE.md`: the `probe:p306` row (`:399`): its trigger paths gain `src/main/manifest/closed-remote-folders.ts` and
  `listSessions` and `removeProject` in `src/main/sessions/core.ts`; its cost text gains "arms B, BH, BX, BO, BG and BC hold
  a folder whose sessions this Mac did not start; the loopback machine runs with its quiet shell, a scratch far home and
  the run's own key alone; `P306_FAR=real` runs those arms on a scratch server on the operator's machine through
  `build/p3201/real-machine.mjs`, verifiers only", and "not yet measured" for the minutes until the verifier's numbers
  replace it. No new path-triggered gate row: the unit proof is in `npm test`.
- `CHANGELOG.md`: §13.
- `HELPER_USER_FLOOR` (`build/assert-electron-teardown.mjs`) does NOT move: no new script reaches
  `build/electron-run.mjs` (`build/p344/ablation.mjs` launches none). If `gate:electron` says otherwise, that is a finding.

## 12. The attack (the verifier's, independent of every builder)

1. **The downgrade round trip, real builds, one scratch profile** (§2.3 measured it over the runner; this is the app).
   Over the loopback machine: the PARENT app opens a folder J by hand, makes a far session in it with an id this Mac has
   no row for, opens R with one shell, closes both, quits. HEAD launches: the manifest copy reads `user_version 20`, min 13,
   one `020` row; R held (its stamp); J COMES BACK ONCE (the parent recorded nothing for it; the stated limit of §0 and
   §13); close J at HEAD; witness; J held. The PARENT launches: no refusal; `user_version 19`; J comes back (its own
   defect); R held. HEAD launches: J open (row present, §6 cell 5), its session's group reads tab open under J's name; close
   J; witness; held. Graded: no refusal at any open, the version and minimum at each, the 020 row once, no session row lost,
   no tab held that he opened, no tab opened that HEAD held.
2. **Hostile rows**, planted into a quit HEAD profile's manifest through `/usr/bin/sqlite3` on the profile's file while no
   app holds it (`project_name ''`; `closed_at 'abc'`; a `local` row for a local folder whose tab is closed; a row whose
   path differs from a live folder by a trailing slash; a row for an unregistered machine id): after the next launch and a
   witness, each folder behaves as D10, D3, D8 and §6 say and nothing throws.
3. **The width of the hold**: a folder that never had a tab opens; a subfolder with its own project opens; this Mac's
   closed folder of the same path holds nothing on the machine; a session Tortie on the machine starts (`makeFarSession`)
   in a held folder stays held and is listed under the folder's name, tab closed.

## 13. The CHANGELOG item (0.111.0, `### Fixed`, rewriting Phase 306's item in place)

`CHANGELOG.md:38` becomes:

```
- A project tab you close for a folder on another machine now stays closed, whoever started the sessions in it, where it used to come back by itself, sometimes at once and sometimes the next time Tortie started; its sessions keep running, Manage Sessions still lists them under the folder's name, and Go to session, opening the folder again or starting a session in it brings the tab back while that machine is answering, though not when its path is typed with a trailing slash. A tab you closed before this update can come back once. Reported by [Jake Levirne](https://github.com/jakelevirne) in [#35](https://github.com/gregce/tortie/issues/35) ([`6f194ddb`](https://github.com/gregce/tortie/commit/6f194ddb))
```

The follow-up docs commit appends ``, ([`<hash>`](https://github.com/gregce/tortie/commit/<hash>))`` for this phase's
commit (a commit cannot name its own hash). The count rule before the re-cut ("every `- ` line must match
`tortie/commit/`") passes on 306's link alone, so the follow-up must be checked by eye for the second link.

## 14. What the entry got wrong, or left open

1. **"Removing a machine deletes that machine's folder rows with its other records."** Removal deletes none of its records
   from the manifest (§2.1 P5). D7 keeps the folder rows, and the attack's ablation X10 proves a later round cannot quietly
   add the delete.
2. **"The window only decides WHEN to re-read … A folder main holds closed costs the window one list read and no tab."**
   True of the hold; it left out the way back through a create from a tab on the machine, which the window then never
   draws (§2.2 W2, worse than W1). D9.
3. **The local half.** "Machine ids follow the stamp's rule (LOCAL_MACHINE_ROW for this Mac)" would write rows nothing
   reads. D3.
4. **The gates.** `conformance:remoteclose` and `conformance:farattach` are not triggered by these paths (the first holds
   session Remove's two maps, the second functions this phase does not touch); the triggered one,
   `conformance:machines`, was missing. All three run (§10).
5. **The probe's own safety.** `probe:p306`'s script sets none of the loopback machine's protections; under this phase's
   rules (his shell history, `~/.ssh` never read) it must. §8.1.
6. **The tests pinned to the limit and to schema 19** (D13).
7. **A close the parent made is not recorded**, so such a tab comes back once after the update, which a person will hit:
   one clause in §13.
8. **Phase 306's CHANGELOG item states the limit this phase removes** (D15).
9. **His Mac Pro read** cannot attribute rows to this Mac without reading his manifest, so it shows the precondition, and
   the probe shows the cause (§8.4).

## 15. What is NOT in this phase

- **No change to local tabs**, which nothing re-opens by itself; a local close writes what it wrote (D3).
- **No change to what a tab holds, to any session's status, or to what Remove, End or restore do.** Closing a tab ends
  nothing; a held folder's sessions keep running, stay in the attention list and the sheet, and are reachable.
- **No record of anything on the machine.** The record lives in this Mac's manifest only; another Mac keeps its own, and a
  Tortie on that machine knows nothing of it.
- **No deletion on machine removal** (D7), **no prune**, **no backfill** of closes an older build made (it recorded nothing
  to backfill from).
- **No subfolder rule** (D8): a closed folder holds itself.
- **No trailing-slash repair** (Phase 306's stated limit stays, and the CHANGELOG keeps saying so).
- **No new window, menu, setting or sentence** (D14). The window's code does not change (§5).
- **No release cut by a builder.** The 0.111.0 re-cut is the main session's, on his word.

## 16. For the main session

- His request of 9 October to "clean up anything related to past phases in terms of copies of code" is CLAUDE.md's
  landed-phase cleanup, widened to every landed phase; it is the main session's step after this phase lands, not a
  builder's. At spec time `git -C /Users/gdc/gmux worktree list` (read only) showed his checkout, `/private/tmp/wt-docs`
  and `/private/tmp/wt-p344`, and no `wt-p*-parent` or `p3*` scratch under `/private/tmp`.
- The spec writer's measurement files stay in its scratch (`…/scratchpad/p344/spec/m/`) for the verifier to re-run; they
  import the worktree by absolute path and need `node_modules` linked beside them (`…/spec/node_modules`) and
  `vitest.p344.config.mjs` there.

## §As built (the integrator, 2026-10-09, in `/private/tmp/wt-p344` over `e1e17899`; nothing committed, staged or stashed)

### What landed, by owner

- **builder-main** (§4 items 1 to 7, exactly): migration `020-closed-remote-folders` with the D1 table, indented as 019,
  and 019's comment block; `MANIFEST_SCHEMA_VERSION = 20`, the minimum 13, the D2 paragraph word for word;
  `src/main/manifest/closed-remote-folders.ts` (new, the D11 header, `ClosedRemoteFolder`, `ClosedRemoteFolders` with its
  three members, the D10 read, `import type Database` alone); `sessions-repository.ts` (the member over its own
  connection, the write inside `markProjectTabClosed`'s durable transaction after `changed = info.changes;`, the clear and
  the delete in one ordinary `this.db.transaction(…)()`, the folder test first in `projectTabClosedFor`, the delegating
  `closedRemoteFolder`, both return values unchanged); `store.ts` (the header line, the type re-export, the facade read);
  `remote-rehome.ts` (`withClosedFolderRecords`, pure and exported; "What it does not do" rewritten with the limit gone;
  `openTabsForRemoteCreate`'s doc says "the record of a close"; `rehomeRemoteSessions`' body unchanged); `core.ts` (the
  import, D9's return line, D12's `closedOnMachine` and push); `src/shared/types.ts` (one comment sentence). The forget's
  `WHERE` is written `path = ? AND machine_id = ?` so X7's and X9's needles match the read alone.
- **builder-proof** (§7): the three new test files (M1 to M4 and K1 to K11; B1 to B7 and P1 to P3; C1 to C5),
  `build/p344/ablation.mjs` (X1 to X16 at §4.1's spellings, `P344_ONLY`, `--list`, an edit that changes nothing refused),
  and the D13 edits exactly as listed: H7 flipped and retitled, R3 and R5 removing the folder row through a raw handle
  (R5 reads held `true` before the removal and again after it, so the stamp alone is shown holding and then Remove
  releasing it), the schema pins 19 to 20 (three titles that named the number renamed with it, no script keys on them),
  `p336-folder-pins` retitled and unpinned from the last migration, `reconstruct` digesting `closed_remote_folders` first.
  `build/p306/ablation.mjs` untouched: its 23 needles still match once. Beyond the letter: K3 also closes a target and tab
  both naming `local` (without it X3 cannot fail), K5 has the durable-commit half AND a dropped-table half (only the second
  catches X4), K8 adds an instant that is not finite and an empty machine id and path, K4 adds a tab naming another
  machine, P3 puts a session on the machine beside the local one, C3 plants the different stamp by raw `UPDATE`.
- **builder-probe** (§8): `build/p3201/real-machine.mjs` refusal 4 (pattern, sentence, header, two self-test rows) and
  nothing else; `build/p306/probe-p306.mjs` with §8.1's refusals, §8.2's arms (B flipped; BH in launch 1 between DS and G;
  BX, BO, BG, BC in launch 2 after X2), `readManifest`'s own `closed_remote_folders` read, the `dbFindings` clauses, the
  flipped row 14 and rows 14r, 14o, 14g, 14c, 14h, the real row (`openRealMachine`, `exit` hook at once, `real.close()` in
  the `finally` with its census failing the run), and `--grader-self-test` as an alias. Beyond the letter: far paths on the
  real row resolved there with `pwd -P` (Tortie stores the machine's own resolution; `/tmp` is `/private/tmp` on macOS);
  the loopback far server's ZDOTDIR checked after the prepare, after Open on machine and at the latest after the first
  create, before the probe makes a far session of its own; one-finding stops for BH, BX, BG and BC preconditions; an
  extra pass witness in B before the held count is read; a session carrying its folder's record with no stamp is not a
  bridge disagreement; the launch environment adds ZDOTDIR, `HISTFILE=/dev/null` and unsets `TERM_SESSION_ID`; launch time
  limits 45 and 25 minutes.
- **The integrator** (§11's shared files): `package.json` (`probe:p306` replaced by §8.1's script, byte for byte;
  `ablation:p344` beside `ablation:p306`); `build/verification-checks.mjs` (`pure('ablation:p344', NEEDS.vitest)` with its
  comment; `remote('probe:p306')`'s comment gains the arms, the loopback protections and the real row);
  `docs/audits/contract-baseline.txt` regenerated; `CLAUDE.md`'s `probe:p306` row (trigger paths gain
  `closed-remote-folders.ts`, `listSessions` and `removeProject`; cost "not yet measured since Phase 344" with the old
  numbers kept as the before; the arms, the loopback protections, the real row and the self-test spelling);
  `CHANGELOG.md` line 38 rewritten in place to §13's text with 306's link alone (this phase's link is the follow-up's).

### The one finding, and how it was reconciled

`src/main/sessions/__tests__/saved-output-reach.test.ts:90`, not in D13, went red under D9's fixed spelling: it found the
end of `listSessions` by the text `return stampRecordLocations(out)`, which D9's line no longer contains, so the file
failed to load. All three builders reported it and none edited it. The integrator moved its marker to the call's opening,
`'return stampRecordLocations('`, which occurs once in `core.ts` and ends the slice at the same statement (Phase 152 moved
the same marker for the same reason), with a one-sentence Phase 344 comment beside Phase 152's. No assertion changed.
This is the one test edited outside D13, and the commit body must name it.

### Commands (every one with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset; no Electron)

Load averages 19 to 30 throughout; `df -h /` read 17, 13, 12 and 13 GiB free.

| Command | Exit | Reading |
| --- | --- | --- |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` | 0 | 1.15 s; 12 insertions, 3 deletions, exactly §10 item 1's lines: `user_version=19`→`20`, `[sqlite.migrations] count=19`→`20` and `020-closed-remote-folders`, `[sqlite.schema] objects=12`→`13` and the `-- table closed_remote_folders` block. Nothing else moved |
| `npm run typecheck` | 0 | 5.4 s; import boundaries 0 violations over 1,425 files, 0 runtime cycles |
| `npm run build` | 0 | 44.4 s; `gate:contract` byte for byte; `gate:electron` 172 against a floor of 172 (`HELPER_USER_FLOOR` unmoved); `gate:background` 3 starts, 19 of 19 fixtures; `gate:knownhosts`; `gate:checks` 267 check scripts classified; `gate:simulator`; `gate:docker`; `conformance:ios` 49 rules; `conformance:harnessprobes`; `gate:onlyadd` |
| `npm test` | 0 | 53.2 s; 1,126 files passed, 2 skipped; 20,997 tests passed, 14 skipped |
| `npm run conformance:machines` | 0 | 25.8 s |
| `npm run conformance:remoteclose` | 0 | 0.9 s; 11 of 11 |
| `npm run conformance:farattach` | 0 | 0.2 s; 11 rules |
| `npm run conformance:manager` | 0 | 1.9 s; 64 rules, 2,688 checks |
| `npm run conformance:samefolder` | 0 | 3.5 s; rule 23 over 112 files (floor 100), 0 bare `realpathSync(`, 0 case folds, 0 `.normalize(`; 9 of 9 ablations red; the APFS image detached (`hdiutil info` lists none of its) |
| `npm run conformance:endtree` (not triggered; reads `core.ts` by shape) | 0 | 1.6 s; 16 rules, 84 self-tests |
| `npm run conformance:pocket` (not triggered; reads `core.ts` by shape) | 0 | 5.5 s; 136 rules, 19,642 checks |
| `npm run ablation:p306` | 0 | 39.4 s; 23 of 23 owners newly red, control 44 rows green first and last, clone gone |
| `npm run ablation:p344` | 0 | 40.6 s; 16 of 16 owners newly red, control 56 rows green first and last, clone gone |
| `node build/p306/probe-p306.mjs --self-test` | 0 | 149 fixtures (46 at the base) |
| `node build/p306/probe-p306.mjs --grader-self-test` | 0 | 149 fixtures |
| `node build/p3201/real-machine.mjs --self-test` | 0 | 4.7 s; 95 fixtures (93 at the base) |
| `npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` (alone) | 0 each | 1.5, 0.8, 1.4, 1.8, 3.3 s |
| `npm run package` with `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*` and `APPLE_*` credential variable unset, `ELECTRON_CACHE` and `ELECTRON_BUILDER_CACHE` naming the existing caches so nothing was fetched | 0 | 60.2 s; "skipped macOS application code signing", so no identity was looked up in any keychain; DMG 173,124,654 bytes, ZIP 172,763,374; `out/main/index.js`, which it packs, names `closed_remote_folders` 7 times; `release/` (832 MB) removed after |

Not run, as the brief says: `smoke:t1`, `smoke`, `smoke:t3`, `smoke:remote`, `smoke:machines`, `probe:p306` (a
verifier's, under the lock). §10's "not run: package" was superseded by the integrator's brief; the unsigned shape above
is the documented one (docs/BACKLOG.md, Phase 260) and reads nothing in his keychain.

His history read `~/.zsh_history 736064 1791579183` and `~/.bash_history 23166 1790702242` before the first command and
after every one, and never moved.

### For the verifier

The worktree is built (`out/` at the integrated tree). The parent is NOT built yet; build it as §10 says (`git archive e1e17899`, outside his `.git`). The probe's
script now refuses to run without the three `SCRATCH_MACHINE_*` variables it sets, so run it only as `npm run probe:p306`,
and its self-test only as `node build/p306/probe-p306.mjs --grader-self-test`. The CHANGELOG count rule reads 24 of 24
`- ` lines under 0.111.0 carrying `tortie/commit/`; the follow-up adds this phase's own link to line 38 by hand.
