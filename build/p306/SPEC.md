# Phase 306 — a remote project tab you closed comes back by itself

**Base.** `/private/tmp/wt-p306` at `75edbf5e` (origin/main when the worktree was made). Every
`file:line` below was re-read at that commit on 2026-09-30. Where the backlog entry (written at
`0375c8a9`) and the tree disagree, the tree wins, and §3 lists each disagreement.

**Sources that bind this spec.** The Phase 306 entry (`docs/BACKLOG.md`, `## Phase 306 `); Phase
293's `build/p293/SPEC.md:2181` (case P2) and `:2308`; research 54 finding 15, which is why Phase 90.3
opens a tab for a folder on a machine (`src/main/machines/remote-rehome.ts:4-14`). The defect is
GitHub issue 35, "Tortie remote project always comes back", filed by Jake Levirne (`jakelevirne`)
against 0.110.0: "I close the project … But then it comes back. Sometimes immediately. Sometimes only
after I restart." The operator folded it into tonight's queue on 2026-09-30.

**Phase 326 landed beside this one** at `b0ff7ca7` (with docs at `d89d1ad1` and `fe2c1923`). It
touches none of this phase's source files: not `remote-rehome.ts`, not the manifest, not
`create-local.ts`. It shifts `core.ts` line numbers by about +124 below line 905, and it raised
`HELPER_USER_FLOOR` to 158. The committer rebases this phase onto it (§12).

---

## 1. The phase

- **Heading.** `## Phase 306 — a remote project tab you closed comes back by itself`
- **Subject.** `fix(machines): a closed remote tab stays closed`
- **First body line.** `Phase 306: the re-home asks whether a tab was closed`
- **Semver.** Patch. Closing a remote project's tab keeps it closed while its sessions keep
  running. The session manager lists those sessions under the folder's own name with the tab shut.
  Nothing about the sessions moves, and Tortie never ends a session by itself.
- **Menus.** No user-facing surface is added, renamed or removed. No native menu changes, and no
  new sentence, label or copy string.
- **Tier 3.** This phase changes what main writes to the manifest on every completed machine pass,
  for every machine. A gate one clause too wide stops Phase 90.3 from ever opening a tab for a
  folder on a machine. The live remote session would then sit under no tab, or under a tab whose
  Explorer shows a folder on another computer. That is finding 15 of research 54.
- **Independent methods (stated before the work, per CLAUDE.md).** There are three:
  1. **Re-derive independently.** The verifier builds the reachable-state table (§6) from its own
     census of every writer of `remote_projects` and of `sessions.project_tombstone`. It does not
     work from this spec's list.
  2. **Attack.** The verifier brings the tab back by every route a person or a poll has. Then it
     tries to stop a folder that never had a tab from getting one.
  3. **Measure the parent commit.** The verifier runs `probe:p306` at `75edbf5e` and at HEAD. This
     is mandatory, because the defect was reported from outside.

## 2. What the tree says (re-read at `75edbf5e`)

### 2.1 The re-add is main's

`rehomeRemoteSessions` is `src/main/machines/remote-rehome.ts:120-184`.

- **First loop, `:141-164`.** One folder per live remote row, computed by `remoteProjectPathFor`
  (`:77-90`). It runs `store.updateSession(row.id, { projectPath: home })` at `:156` for any row
  whose recorded folder disagrees with the reported one. That is the MOVE.
- **Second loop, `:165-182`.** It asks `store.getRemoteProject(folder.machineId, folder.path) !==
  undefined` at `:166` and upserts at `:170-174` when the answer is no.

It never asks why the row is absent. It runs from `src/main/sessions/core.ts:1161`, inside the
`onRemoteSessionsChanged` subscription at `:1156-1170`, before `scheduleSessionsBroadcast()` at
`:1169`. That subscription fires from `announce()` (`src/main/machines/remote-sessions.ts:764-766`) at
the end of every completed pass (`:2643`). The status list runs every `REMOTE_POLL_FOCUSED_MS` =
5,000 ms while a window is focused and every `REMOTE_POLL_IDLE_MS` = 30,000 ms otherwise
(`remote-sessions.ts:414`, `:421`). It also runs on every `sessions-changed` and `session-renamed`
control event (`src/main/machines/control-plane.ts:613-617`).

### 2.2 Main records the close, durably, and has since Phase 93

`removeProject` is `core.ts:3478-3546`. In order, it:

1. calls `markProjectTabClosed` (`:3511`), with the stamp object at `:3514-3521`. The stamp holds
   `path`, `projectId`, `projectName`, `closedAt`, and `machineId` for a remote tab only;
2. calls `deleteProject` (`:3531`);
3. calls `broadcastSessions()` when anything was stamped (`:3544`).

The stamp's SQL is `src/main/manifest/sessions-repository.ts:844-863`. It is one durable `UPDATE`
over `project_path = ?`, `COALESCE(NULLIF(machine_id, ''), 'local') = ?` and `status <>
'discarded'`.

The only clear is `clearProjectTabClosed` (`:884-895`), with the same WHERE clause plus
`project_tombstone IS NOT NULL`. Its callers are:

- the local add, at `core.ts:3394` and `:3407`;
- the remote add, `addRemoteProjectAdmitted`, at `:3467`, after its upsert at `:3460`.

The re-home never reaches that clear.

The stamp is written ONLY by `markProjectTabClosed`. `insertSession` serialises
`record.projectTombstone` (`sessions-repository.ts:275`), but every caller passes a fresh record:
`writeRemoteRow` at `remote-record.ts:353-438`, the local create at `create-local.ts:611`, and
`reconstruct.ts:989`. So a stamp exists only where a person closed a tab.

The codec is `parseClosedProjectTab` (`src/main/manifest/codecs.ts:530-568`, not exported). It drops
an unreadable stamp WHOLE. `rowToRecord` reads the stamp through it (`:841-842`), and so does the
window's `closedProject` (`core.ts:2710-2720`; local rows at `codecs.ts:949-955`).

### 2.3 The row comes back with a new id

`upsertRemoteProject` (`src/main/manifest/projects-repository.ts:92-117`) inserts `randomUUID()` and
keeps an id only on a `(machine_id, path)` conflict. A deleted row has no conflict, so the tab
returns at the END of the strip (`gmux.tabOrder` remembers ids) and loses its
`activeSessionByProject` entry.

### 2.4 The create's own tab

`createLocalSession`'s remote branch is `src/main/sessions/create-local.ts:205-283`:

1. `remoteCreateFolders` (`:223-230`, rule at `src/main/sessions/launch-plan.ts:545-560`) gives
   `farProjectPath`. That is the remote tab's path, or the Directory typed, or `''` when no folder
   was named.
2. `remoteCreate` (`:232-239`) runs `startMachineFeed` before it returns (`remote-sessions.ts:1781`).
   That pass's `announce()` runs the re-home, so the re-home ALWAYS sees the new session before the
   create's own code below.
3. The create returns `projectRow(row, …)` (`:1820`). Its `projectPath` is the `@gmux-project`
   stamp (= `farProjectPath`) and its `cwd` is the folder the machine reports (`session_path`).
4. `:258-281` upserts `farProjectPath` when it is absolute and clears nothing. When no folder was
   named (`farProjectPath === ''`), the create opens no tab, and only the re-home's pass opens the
   folder the machine chose.

### 2.5 The renderer, and the reporter's two timings

`reconcileRemoteTabs` (`src/renderer/state/sessions-slice.ts:604-632`, called at `:1076` on every
broadcast) re-reads `projects.list()` once for each remote folder that has no tab. It remembers each
folder in the module-scope `tabsAskedFor` (`:601`), which nothing ever clears.

`finishCloseProject` (`src/renderer/state/projects-slice.ts:368-410`) awaits `projects.remove`, then
re-reads the list at `:397`. Main's `removeProject` broadcasts the sessions synchronously inside that
remove (`core.ts:3544`), so the window runs `reconcileRemoteTabs` while its own list still holds the
tab. The folder is therefore NOT remembered at the close.

That explains both timings:

- **"Immediately"** is the first close of a folder in this window run. At the next completed pass,
  main re-adds the row (§2.1), then broadcasts. `reconcileRemoteTabs` finds a remote folder with no
  tab that it has never asked about, re-reads the list, and the tab returns within one pass.
- **"Only after I restart"** is a close of a folder already in `tabsAskedFor`. That is a second
  close in the same run, or a tab the window first learned about through `reconcileRemoteTabs`. Main
  re-adds the row on the next pass and the window never re-reads FOR THAT FOLDER (FIX ROUND: "never" was
  too strong; the window re-reads the WHOLE list whenever any NEW remote folder with no tab appears, so
  the hidden re-add also surfaced at the next new folder). Anything that reads `projects.list()`
  then brings the tab back: a relaunch, a reload, or one of the three sheet doors (§5).

## 3. What the entry got wrong, or left out

1. **Line numbers drifted.** The entry's numbers are from `0375c8a9`.

   | Entry | Now |
   | --- | --- |
   | `core.ts:1086`, `:1091` | `:1156`, `:1161` |
   | `core.ts:408` | `:410` |
   | `core.ts:2645` | `:2715` |
   | `core.ts:3301` | `:3467` |
   | `core.ts:3312` | `:3478` |
   | `core.ts:3345` | `:3511` |
   | `core.ts:3350` | `:3514-3521` |
   | `core.ts:3365` | `:3531` |
   | `core.ts:3231`, `:3294` | `:3397`, `:3460` |
   | `sessions-repository.ts:801`, `:841` | `:844`, `:884` |
   | `remote-rehome.ts:152` | `:156` |
   | `sessions-slice.ts:562`, `:565`, `:1028` | `:601`, `:604`, `:1076` |
   | `session-manager-slice.ts:774` | `:776` |
   | `SessionManagerSheet.tsx:517`, `:384` | `:520`, `:387` |
   | `view.ts:102` | `:113-114` |

   After the rebase over Phase 326, `core.ts` below `:905` moves again.

2. **Mechanism 4 missed two creates.** Without them, the gate as written makes a scenario worse than
   today.
   - **No folder named.** A create from a tab on this Mac, aimed at a machine with no folder named
     (`farProjectPath === ''`), opens no tab and clears nothing (§2.4). The machine puts the session
     in the folder its own tmux chooses, usually the home directory. If the person once closed that
     folder's tab, the entry's gate holds it closed, and the session they just created appears in no
     tab. That is the Phase 94 defect ("sessions … with no folder and no tab"). Today the re-home
     re-opens the folder.
   - **Machine reports another folder.** If the machine reports the session outside the folder it was
     given, the re-home MOVES the row there (`:156`). That folder gets the same treatment.
   - **The fix, §4 M5.** The create opens, and clears the stamp on, every folder it causes a session
     to be placed in: the folder it was given and the folder the re-home's own rule places the new
     session in.
3. **The reader cannot read the stamp's own fields alone.** The entry's reader compares only the
   stamp's own `path` and `machineId`. Then the entry's invariant ("row present and stamp present is
   unreachable") is false. `clearProjectTabClosed` matches `project_path = ?`, so it cannot reach a
   MOVED row whose stamp names the old folder. That orphaned stamp would keep the stamp-only reader
   true after an add or a create had cleared the folder. Reconciled in §4 M1: the reader requires
   BOTH the writers' WHERE clause on the row's own `project_path` and machine AND the stamp's own
   `path` and `machineId`. A moved row can then answer neither for the folder it left nor for the
   folder it entered. The conjunction is also the narrower gate, which is the safe direction for
   finding 15.
4. **"Unreachable by any path a build can take" is too strong.** After this phase no WRITER reaches
   "row present and stamp present". Two routes still carry it in:
   - a manifest a parent build already wrote that way (the entry's own "no re-add is repaired");
   - a crash between `removeProject`'s durable stamp and its non-durable delete.

   Both are stated in §6.
5. **The feed-only limit covers more than 0.34 and 0.35 sessions.** The entry says the limit is
   "every remote session created by 0.34 or 0.35". It is wider: every remote session whose
   manifest row is not on THIS Mac. Only `remoteCreate` writes a remote row (`remote-record.ts:353`,
   one caller at `remote-sessions.ts:1643`). The far socket is the same `activeTmuxSocket()` name,
   `gmux` in production (`src/main/machines/context.ts:384`, `:488`). So these sessions also count:
   - sessions a Tortie running ON that machine started;
   - sessions another Mac's Tortie started.

   They are listed here with `@gmux-id` and no manifest row, so closing their folder writes no stamp
   and the folder still comes back. A person who runs Tortie on two computers can hit this. It goes
   in the CHANGELOG item (§13) and not only in the commit body.
6. **"`probe:p293` gains one arm, no new script" is refuted.** The reporter's second timing is a
   RELAUNCH, and only a second launch on the same profile can measure it. `probe:p293` is one
   `withElectron`. It also starts its machine from `build/scratch-machine.mjs` directly, and this
   run's rule names `build/with-scratch-machine.mjs`. So the app run is a new `probe:p306` (§8),
   shaped like `probe:p320`, and `HELPER_USER_FLOOR` moves: 157 to 158 at this base, and 159 after
   the rebase over Phase 326's 158.
7. **"Today" is `75edbf5e`.** The entry's "Today (`0375c8a9`)" column is this worktree's base.
8. **The entry said this phase lands after Phase 303 and rebases onto it.** 303 landed long ago at
   `7240406b`. The live rebase is onto Phase 326 (§12).
9. **The machine-waking route cannot be driven.** The real wake is `powerMonitor` `resume` to
   `remoteMachinesWoke`, then `pollEveryRemoteMachine` (`remote-sessions.ts:3148-3186`), and no
   probe can emit it. The stand-in
   is a re-prepare (§8, arm W), which runs a completed pass the same way. The real wake is named as
   not driven.
10. **`smoke:p93remote` is not run this phase.** It counts the operator's server with
    `tmux -L gmux list-sessions` (`src/main/harness/p93-remote-clear.ts:142`), and its package script
    starts `electron .` directly. Both are forbidden tonight.

## 4. The mechanism (builder-main)

### M1. One reader, with the writers' WHERE clause and the stamp's own fields

Add `projectTabClosedFor(target: { path: string; machineId?: string }): boolean` to
`SessionsRepository`, directly below `clearProjectTabClosed` (`sessions-repository.ts:895`). The exact
shape:

```ts
projectTabClosedFor(target: { path: string; machineId?: string }): boolean {
  const machine = target.machineId ?? LOCAL_MACHINE_ROW;
  const rows = this.db
    .prepare<[string, string], { project_tombstone: string }>(
      `SELECT project_tombstone FROM sessions
        WHERE project_path = ?
          AND COALESCE(NULLIF(machine_id, ''), '${LOCAL_MACHINE_ROW}') = ?
          AND project_tombstone IS NOT NULL
          AND status <> 'discarded'`
    )
    .all(target.path, machine);
  for (const row of rows) {
    const tab = parseClosedProjectTab(row.project_tombstone);
    if (tab === undefined) continue;
    if (tab.path === target.path && (tab.machineId ?? LOCAL_MACHINE_ROW) === machine) {
      return true;
    }
  }
  return false;
}
```

Each clause, and why it is there:

- **The WHERE clause is `clearProjectTabClosed`'s.** It is the same `project_path`, the same
  `COALESCE(NULLIF(machine_id, ''), 'local')` spelling copied from `markProjectTabClosed`, the same
  `IS NOT NULL` and the same `status <> 'discarded'`. "This folder on this machine" keeps one
  spelling. Because the reader's rows are a subset of what the clear clears, `clearProjectTabClosed(F)`
  provably makes `projectTabClosedFor(F)` false.
- **The stamp's own `path` and `machineId`.** These stop a row moved INTO F that carries G's stamp
  from holding F. They also stop a stamp whose machine disagrees with its row from holding either
  machine.
- **Decoding through `parseClosedProjectTab`, the one codec.** Without it, the gate and the window's
  `closedProject` could disagree on what counts as a stamp. A malformed stamp the codec drops is drawn
  as no closed tab, so it holds nothing. Decoding in JavaScript rather than with SQL `json_extract`
  also means a hand-damaged JSON value cannot throw out of the whole pass. SQLite's `json_extract`
  raises on malformed JSON.
- **Cost.** `project_path` is indexed (`idx_sessions_project`, `src/main/manifest/schema.ts:43-44`).

Supporting edits:

- `codecs.ts:530`: `function parseClosedProjectTab` becomes `export function parseClosedProjectTab`.
  That is one word. Nothing else in that file moves.
- `sessions-repository.ts`'s codec import gains `parseClosedProjectTab`.
- Facade, `src/main/manifest/store.ts`: add the method directly below `clearProjectTabClosed`
  (`:493-495`), with a two-line `PHASE 306.` doc comment, delegating to `this.sessions`.

It is a read. It writes nothing, and nothing is sent to any machine.

### M2. The re-home asks it, in the folder loop, inside the upsert's `try`

`remote-rehome.ts:165-182` becomes:

```ts
for (const folder of folders.values()) {
  if (store.getRemoteProject(folder.machineId, folder.path) !== undefined) {
    continue;
  }
  try {
    // PHASE 306. ...why, in the house voice...
    if (store.projectTabClosedFor({ path: folder.path, machineId: folder.machineId })) {
      tabsHeldClosed += 1;
      continue;
    }
    store.upsertRemoteProject({ … });   // unchanged
    projectsAdded += 1;
  } catch (err) { /* the existing warn sentence, unchanged */ }
}
```

- **Where the skip sits relative to the move.** The skip is in the SECOND loop only. The first loop,
  `:141-164`, including `updateSession` at `:156`, is not touched. Which folder a session belongs to
  is what the sheet groups by, and what `core.ts:410` (`atHomeOnItsMachine`) reads. A held folder's
  moved row must still name the held folder, so the sheet lists it under that folder's own name with
  the tab shut. The decision is per FOLDER: ten sessions in one held folder are one read and one count.
- **Inside the `try`.** A manifest that cannot answer is logged with the existing sentence at `:177-180`,
  and the next folder is still visited. The pass is never aborted. A throwing reader opens nothing
  this pass. The upsert beside it would throw on the same database.
- **`RehomeResult` (`:103-108`)** gains `readonly tabsHeldClosed: number;`, documented as the folders
  left without a tab because a person closed theirs. The early return at `:123` becomes
  `{ rowsMoved: 0, projectsAdded: 0, tabsHeldClosed: 0 }`, and the final return carries the count.

### M3. Counted, and logged only when the count moves (Phase 70's rule)

The precedent is the foreign-count line at `remote-sessions.ts:2632-2642`. Module state in
`remote-rehome.ts`:

```ts
/** PHASE 306. The held count last written, beside the store it was counted against. */
let lastHeld: { readonly store: ManifestStore; readonly held: number } | null = null;
```

At the end of a pass that had a store:

```ts
const before = lastHeld !== null && lastHeld.store === store ? lastHeld.held : 0;
if (tabsHeldClosed !== before) {
  machinesLog.info('folders on machines whose tab a person closed are kept closed', {
    held: tabsHeldClosed
  });
}
lastHeld = { store, held: tabsHeldClosed };
```

- One line every time the count moves, INCLUDING a move to zero. That line means a person re-opened
  the folder or created a session in it, and it is useful when reading a log.
- It names no path and no machine.
- A new store, meaning a new run or a test's fresh store, starts from zero.
- The import is `import type { ManifestStore } from '../manifest/store';`. A type import compiles to
  nothing, which is how `remote-record.ts:76` already does it.

### M4. The module's own docs move with it

The header of `remote-rehome.ts` is what a later round reads first.

- Under "## What it does not do" (`:40-47`), add a paragraph saying all of this:
  - It does not open a tab again for a folder a person closed (Phase 306, issue 35).
  - Closing a tab stamps every recorded session in that folder on that machine (Phase 93).
  - A pass that finds the folder's row absent and such a stamp present leaves the row absent, and
    counts it.
  - The way back is the person's: Go to session, opening the folder on that machine, or a session
    created there. Each of these clears the stamp.
  - A folder none of whose sessions has a record on this Mac carries no stamp and still gets its tab
    back.
- "## The rule, stated once and used three times" (`:25-32`) becomes FOUR, naming M5's
  `openTabsForRemoteCreate` as the fourth user of `remoteProjectPathFor`.

### M5. Every create on a machine clears the stamp for the folders it places a session in

Add this to `remote-rehome.ts` (the module whose job is putting a remote session in the right tab):

```ts
/**
 * PHASE 306. The tabs a create on another machine opens, and the tab-closed
 * stamps it clears: the folder it was given, and the folder the re-home's own
 * rule places the new session in, once each. Returns the folders it opened.
 */
export function openTabsForRemoteCreate(
  manifest: Pick<ManifestStore, 'upsertRemoteProject' | 'clearProjectTabClosed'>,
  machineId: string,
  given: string,
  created: Pick<Session, 'projectPath' | 'cwd'>
): string[]
```

The folders are `[given, remoteProjectPathFor(created.projectPath, created.cwd)]`, filtered to
absolute paths and de-duplicated in that order. For each one, in order:

1. In its own `try`: `upsertRemoteProject({ machineId, path, name: projectNameForPath(path) })`. On
   failure, warn with the create's existing sentence, word for word: "the session started on
   ${machineId} and its folder could not be opened as a tab: …".
2. Then, in its own `try`, UNCONDITIONALLY, `clearProjectTabClosed({ path, machineId })`. On failure,
   warn: "the session started on ${machineId} and the record of a tab closed in its folder could not
   be cleared: …".

The clear runs even when the upsert failed. That keeps the promise the create's comment makes today
(`create-local.ts:274-276`): the next completed list re-homes it. With the stamp gone, the gate no
longer holds the folder.

`create-local.ts:258-281` (the upsert block) is replaced by one call. It stays in the same place:
after the capture notice, before `deps.broadcastSessions();` at `:282`, so the window's re-read sees
the tab.

```ts
openTabsForRemoteCreate(deps.manifest, machineId, farProjectPath, session);
```

The PHASE 90.3 comment above it gains a PHASE 306 paragraph:
- the person's create is the one legitimate re-open;
- why the placed folder is included (the no-folder create, §3 item 2);
- that the re-home already ran inside `remoteCreate`'s `startMachineFeed`, which is why this call
  must open and clear rather than only clear.

`projectNameForPath`'s import at `create-local.ts:91` becomes unused, and `noUnusedLocals` is on in
`tsconfig.main.json:9`, so remove it. The import added is
`import { openTabsForRemoteCreate } from '../machines/remote-rehome';`. That is a leaf import, as
`core.ts:209-212` already does.

Constraints the existing tests put on `create-local.ts`; break none of them:

- `input.machineId` must not be read inside `createLocalSession` above
  `await tmux.installUserPath();`. Use `machineId`. (`p94-remote-create-folder.test.ts:312-332`)
- `remoteCreateFolders({` appears exactly once. (`:302-309`)
- The text `const session = await remoteCreate({` stays.
- The text `deps.broadcastSessions();\n    return session;` stays.
- `EVT_CAPTURE_NOTICE` stays between those two markers.
  (`capture-refusal-wiring.test.ts:37-61`)
- `await tmux.loginShellEnvFor(` stays. (`p276-env-cache.test.ts:567-582`)

**Parity with today.** In every create, HEAD ends with the same rows as `75edbf5e`:

- With no stamp present, today's re-home pass inside `startMachineFeed` already upserted the placed
  folder. HEAD's re-home does the same, and the create's second upsert is an `ON CONFLICT` no-op that
  keeps the id.
- With a stamp present, today's re-home re-added the folder. HEAD's re-home holds it, and the create
  then opens it and clears the stamp.

The only difference is that HEAD leaves no stamp beside an open tab. That stamp was the false record
Phase 93's clear exists to remove.

### M6. Untouched, on purpose

- `remoteProjectPathFor`.
- The first loop's `updateSession`.
- `markProjectTabClosed` and `clearProjectTabClosed`.
- `addRemoteProjectAdmitted`.
- `removeProject`.
- `core.ts`, which needs no edit: it ignores `RehomeResult`, and the line lives in the re-home.
- Everything under `src/renderer/` (§5).
- The schema, the IPC contract, every `gmux.*` key and every `GMUX_*` name.

`docs/audits/contract-baseline.txt` must not move.

### M7. The one existing test the result shape changes

`src/main/sessions/__tests__/p903-a-rehome.test.ts:217` and `:227` assert
`toEqual({ rowsMoved: 0, projectsAdded: 0 })`. Both become
`{ rowsMoved: 0, projectsAdded: 0, tabsHeldClosed: 0 }`. That is builder-main's edit, so that
builder's `npm test` is green on its own files. Nothing else in that file changes.

## 5. The renderer: confirmed unchanged

The entry says nothing changes on the sheet. Confirmed, and widened to the whole renderer, against
every reader of `projects.list()` (`grep -rn "projects\.list()" src/renderer`):

- **`reconcileRemoteTabs` (`sessions-slice.ts:604-632`) stays exactly as it is, `tabsAskedFor`
  included.** With main no longer re-adding a closed tab, its one re-read finds nothing for a held
  folder, so the memo hides nothing. It remains how the window learns of a folder main opened by
  itself: the re-home's first-pass tab, Phase 90.3, still reached for a folder with no stamp.
  Clearing the memo on close would be a second place deciding whether a tab may open, and the entry
  refuses that.
  **FIX ROUND: this bullet was FALSE and is superseded.** The memo hid a tab MAIN opened for a create
  in a held folder made from a tab on the same machine: the first held pass asked once and remembered
  the folder, so the create's open was never asked about, and the new session sat in no tab until a
  reload, a relaunch or an unrelated new folder (both verifiers, row 10 WORSE than the parent). The fix
  round amends this section and §14: `tabsAskedFor` becomes a map from folder to whether a session in it
  carried the closed-tab record when the window last asked, and the window asks again when that answer
  changes. Main still decides whether a tab may open; the window decides only when to re-read main's
  list. See "§As built, the fix round".
- **`finishCloseProject`'s re-read (`projects-slice.ts:397`).** The entry says a pass landing between
  the remove and that read makes the tab "never appear to close". That window is closed by main's
  gate. Nothing to change.
- **The three sheet doors** go through `refreshSessionSheet` (`session-manager-slice.ts:776-801`,
  read at `:796`): Refresh (`SessionManagerSheet.tsx:520`), Try again (`:387`, same `refresh`
  handler), and a restore landing on Managed (`session-manager/actions.ts:694`). Each reads main's
  truth. Nothing to change.
- **The bootstrap read (`src/renderer/state/subscriptions.ts:117`)** is the reload and relaunch route.
  It reads main's truth. Nothing to change.
- **Every way back is already the person's and already clears.**
  - Go to session: `jumpToSession`, `src/renderer/app/session-focus.ts:175-210`, then
    `openTargetProject` at `:199`.
  - The sheet's restore into a closed project: `actions.ts:622`, `openTargetProject`.
  - Open on machine: `addRemoteProject`, `projects-slice.ts:256-268`.

  Each reaches `addRemoteProjectAdmitted`, which clears (`core.ts:3467`), and then re-reads the list.
- **A create from a tab on this Mac** re-reads the list after main's create (`sessions-slice.ts:1262-1263`).
  With M5, main has opened the placed folder before `deps.broadcastSessions()`.
- **The sheet already draws a held folder correctly.**
  - The group label is `closedName`, from the stamp's `projectName` (`projection.ts:337`), falling
    back to the folder's basename.
  - `tabOpen` is false because the window's list has no row.
  - The `Closed tab` filter (`view.ts:113-114`) finds it.
  - Remote rows carry `closedProject` from `core.ts:2710-2720`.

## 6. The reachable-state table (the verifier re-derives this; this is the spec's own reading)

For one folder F on one machine M:

- **R** means a `remote_projects` row for `(M, F)` is present.
- **S** means `projectTabClosedFor({ path: F, machineId: M })` is true.

| Cell | R | S | Reached at `75edbf5e` by | Reached at HEAD by |
| --- | --- | --- | --- | --- |
| 1 | absent | false | start; a close of a folder with no recorded session (`stampedCount` 0); every stamped row in F removed (discarded) | same |
| 2 | absent | true | `removeProject` (the person's close), and then left at most until the next completed pass | `removeProject`, and HELD here by every pass until the person re-opens F or creates a session in it |
| 3 | present | false | `addRemoteProjectAdmitted` (upsert, clear); the re-home from cell 1; the create from cell 1 | same, and also the create from cell 2 (M5 opens and clears) |
| 4 | present | true | the re-home from cell 2 on every pass after a close (THE DEFECT); the create from cell 2 (upsert, no clear); a crash between `removeProject`'s durable stamp and its delete | NO RE-HOME OR CREATE WRITER. Carried in by a manifest a parent build wrote (not repaired, by the entry's ruling), by that crash, and (FIX ROUND, the first verifier's enumeration) by restoring a removed session from the sheet's Past tab: `actions.ts:619-651` opens the tab first, `clearProjectTabClosed` skips the still-discarded row, then `remote-restore.ts:599` un-discards it with its old stamp. Harmless to the hold (a present row is never asked about) and identical at the parent |

Transitions at HEAD:

- 1→3: re-home, add or create.
- 2→3: add or create, both of which clear.
- 3→2: a close with recorded sessions. 3→1: a close without them.
- 2→1: removal of every stamped row.
- 4→2: a close. 4→3: an add or create, which clears.

The re-home writes no clear itself, and it never takes 2→3.

How the move interacts, because the row's `project_path` is in M1's WHERE clause:

- A stamped row moved F→G makes S(F) false when it was F's only stamped row, and leaves S(G) false
  because its stamp names F.
- A row moved INTO F carrying G's stamp leaves S(F) false.

So the stamp the entry calls orphaned holds nothing, and every clear of F falsifies S(F).

## 7. The unit proof (builder-proof), each test named, each owning a clause

The rig for both files is `p903-a-rehome.test.ts:21-98`: `vi.mock('electron')`, a real
`ManifestStore` on a `mkdtempSync` path, `setRemoteManifest(store)`, and `afterEach` closing it. Test
titles are the ablation harness's keys (§7.3), so they must be unique and stable.

### 7.1 `src/main/manifest/__tests__/p306-tab-closed-reader.test.ts` (new)

| Test title | What it asserts | Ablation that must redden it |
| --- | --- | --- |
| `R1 a close answers for its own folder on its own machine` | `markProjectTabClosed({path:F, machineId:'m1'}, tab{machineId:'m1', path:F})` over a row in F on m1, then the reader for `(m1, F)` is true | base |
| `R2a a stamp naming a machine on a row recorded on this Mac answers for neither` | a local row in F, stamped by the test with a deliberately mismatched tab `{machineId:'m1', path:F}`; the reader is false for `(m1, F)` and for local F | A3 |
| `R2b a stamp naming this Mac on a row recorded on a machine answers for neither` | a row on m1 in F stamped with `{path:F}` and no machineId; the reader is false for `(m1, F)` and for local F | A4 |
| `R2c the same path on two machines and on this Mac are three folders` | stamps on m1:F only; the reader is true for m1:F and false for m2:F and local F | A3 or A4 |
| `R3 a row moved out of a folder holds neither folder` | stamp s1 in F, then `updateSession(s1, {projectPath: G})`; the reader is false for F (stamp-only form: true) and false for G | A1 |
| `R4 a row moved into a folder carrying another folder's stamp does not hold it` | s1 stamped in G, then moved to F; the reader for F is false | A2 |
| `R5 a removed session's stamp holds nothing` | stamp, then `markSessionRemoved` (status discarded); the reader is false | A5 |
| `R6 an ended session's stamp still holds` | stamp, then status `exited`; the reader is true (pins that an ended session is still in the closed folder) | none, a semantic pin |
| `R7 a stamp the codec drops whole holds nothing` | a stamp written with `projectId: ''`, which `parseClosedProjectTab` drops; the reader is false, and `getSession(id).projectTombstone` is undefined | A6 |
| `R8 clearing a folder clears what the reader reads` | after `clearProjectTabClosed({path:F, machineId:'m1'})` the reader is false, including when another row moved out of F still carries F's stamp | A1 |
| `R9 the reader writes nothing` | the session rows' bytes are equal before and after 100 reads (compare `listSessions()` JSON) | none |

### 7.2 `src/main/sessions/__tests__/p306-held-closed.test.ts` (new)

Log lines are captured with a hoisted `vi.mock('../../log', async (importOriginal) => …)` that wraps
`getLog('config').info` and passes every other scope through. `remote-rehome.ts` binds
`machinesLog` at import, so the mock must be hoisted.

| Test title | What it asserts | Ablation |
| --- | --- | --- |
| `H1 a folder whose tab a person closed is not opened again, pass after pass` | row s1 in F on macpro, stamped; three passes; `getRemoteProject` undefined after each; `projectsAdded` 0 and `tabsHeldClosed` 1 each pass | A7 |
| `H2 a folder that never had a tab still gets one on the first pass` | no stamp; one pass upserts F | A8 |
| `H2b a folder on this Mac with the same path closed does not hold the machine's folder` | a LOCAL row in F with a local stamp; a feed row on macpro reporting F; one pass upserts macpro:F | A3 or A4 |
| `H3 a held folder's rows are still moved to it` | s1 in F stamped; s2 recorded `/Users/gdc/legacy`, reported F; one pass: `rowsMoved` 1, s2's `projectPath` is F, `projectsAdded` 0, `tabsHeldClosed` 1 | A9 |
| `H4 ten sessions in a held folder are one decision` | ten rows in F, all stamped; `tabsHeldClosed` 1 | A10 |
| `H5 the line is written when the count moves and only then` | passes over held, held, held, then a clear, then a pass: exactly two `info` lines on scope config, with `{held: 1}` then `{held: 0}`; a fresh store starts again from zero | A11 |
| `H6 a machine that stopped answering still reads held` | feed rows with `machine.answering: false`, statuses `unknown` and `restorable`; held | none, a pin |
| `H7 the stated limit: a folder with no recorded session comes back` | feed-only row (no manifest row) in a folder whose tab was closed; one pass upserts it. Pins the limit so a round that changes it must say so | none |
| `C1 a create in a folder whose tab was closed opens it and clears the stamp` | `openTabsForRemoteCreate(store, 'macpro', F, {projectPath:F, cwd:F})` over a stamped F; row present; reader false | A12 |
| `C2 a create with no folder opens and clears the folder the machine put it in` | given `''`, created `{projectPath:'', cwd:H}`, H stamped; H present, reader false; then one re-home pass adds nothing and holds nothing | A13 |
| `C3 a create placed outside its given folder opens both, once each` | given P, created `{projectPath:P, cwd:Y}` with Y not under P; both present, both cleared; returns `[P, Y]` | A13 |
| `C4 an upsert that fails still clears, so the next pass opens the folder` | a manifest whose `upsertRemoteProject` throws and whose `clearProjectTabClosed` delegates to the real store; the clear ran; then a real pass upserts | A14 |
| `C5 a create with no folder and no reported folder opens nothing and clears nothing` | given `''`, created `{projectPath:'', cwd:''}`; returns `[]`; no call | none |

### 7.3 `build/p306/ablation.mjs` (new), `npm run ablation:p306`

The template is `build/p331/ablation.mjs`:

- it NEVER writes into the working tree;
- it makes a `cp -Rc` clone of `src/` and `build/` under `/private/tmp/p306-ablation-<pid>`, with
  `vitest.config.ts`, every tsconfig and `package.json` copied and `node_modules` symlinked;
- it runs vitest with `process.execPath node_modules/vitest/vitest.mjs run --no-cache
  --reporter=json --outputFile=…`, synchronously, over the three files (`p903-a-rehome`,
  `p306-held-closed`, `p306-tab-closed-reader`);
- it runs an UNEDITED control that must be green first;
- each entry must make its OWN named test NEWLY red (the delta rule);
- each edited clone file is restored and proved by sha256 against the worktree before the next
  entry;
- the clone is removed in a `finally` and on SIGINT, SIGTERM and SIGHUP.

It starts no Electron, tmux, ssh or agent. `P306_ONLY` runs named entries.

| Entry | The one clause broken | Must newly redden |
| --- | --- | --- |
| A1 | M1: drop `project_path = ?` from the reader's WHERE (the stamp-only form) | R3, R8 |
| A2 | M1: drop `tab.path === target.path` | R4 |
| A3 | M1: drop the `COALESCE(...) = ?` row-machine clause | R2a |
| A4 | M1: drop the stamp `machineId` comparison | R2b |
| A5 | M1: drop `status <> 'discarded'` | R5 |
| A6 | M1: replace `parseClosedProjectTab` with a bare `JSON.parse` | R7 |
| A7 | M2: remove the `projectTabClosedFor` branch (always upsert) | H1 |
| A8 | M2: hold every absent folder (`if (true)`) | H2 |
| A9 | the hold moved into the first loop, before `updateSession` | H3 |
| A10 | M2: count per session instead of per folder (increment in the first loop) | H4 |
| A11 | M3: log on every pass (drop the moved test) | H5 |
| A12 | M5: drop the clear | C1 |
| A13 | M5: drop the placed folder (given only) | C2, C3 |
| A14 | M5: clear only when the upsert succeeded (clear moved into the upsert's `try`) | C4 |

### 7.4 `node build/p306/probe-p306.mjs --self-test`

The probe's graders are pure and exported, and are proved both ways over recorded fixtures with
nothing launched. That is the shape of `probe-p320.mjs --self-test`.

## 8. `probe:p306`, the app run (builder-proof writes it; only a verifier runs it, under THE LOCK)

**Script.**

```
"probe:p306": "node build/harness-socket.mjs --fresh gmux-p306 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; node build/with-scratch-machine.mjs -- node build/p306/probe-p306.mjs'"
```

There is no `npm run build &&`, for the reason `probe:p320` gives: a run against another checkout
must not rebuild this one.

**Template.** `build/p320/probe-p320.mjs`, for these parts:

- the carriage read at `:493-507`;
- `machines.json` and `known-machines` seeded into the profile at `:549-560`;
- `withElectron` with `GMUX_PROBES=1`, `--use-mock-keychain`, `GMUX_SPECSTORY_NO_CLOUD=1` and
  `SSH_AUTH_SOCK` from the carriage, at `:754-777`;
- `cdpForAppWindow`;
- `endFarServer` by the pid the far server reports through the carriage's binary, at `:726-751`,
  in `finally` and on `exit`.

**Drives.** It uses only drives that exist at `75edbf5e`, so the same file measures the parent:

- `window.__gmuxP95` (`src/renderer/terminal/p95-scroll-drive.ts`): `machineUp`, `openRemote` (the
  person's Open on machine), `kill`.
- `window.__p293` (`src/renderer/app/p293-session-manager-drive.ts`): `open`, `state` (rows with
  `group`, `tabOpen`, and `store.projects`), `createSession`, `closeTab` (the real
  `closeProject`, then confirm, then `finishCloseProject`), `menuItemsFor`, `runMenuItem`,
  `killOutOfBand`.
- `window.gmux.*` for main's own answers: `projects.list()`, `sessions.list()`, `sessions.rename`,
  `sessions.create`, `machines.prepare`.

**No agent starts.** Before EVERY launch, the profile's `gmux/config/agents.json` renames the Gemini,
Qwen, Antigravity, Grok and Droid binaries to names that exist nowhere, and `agents:list` is read back.
A launch where any of them reads installed is refused. Copy `quietAgentsHeld` and the writer from
`build/p332/probe-p332.mjs`. Do not import it: that module runs at import. `build/hidden-agents.mjs`
is Phase 326's and is absent at this base. Every session is a `shell`.

### 8.1 The fixture, on one scratch profile, one scratch HOME, socket `gmux-p306-<pid>`

The local folders are under the run directory. On the loopback machine every far folder is a
directory under that run directory too, because the far side is this Mac.

- **L**: a local project, opened and active, with one local shell `l1`.
- **X**: a local project at path `E`, with a local shell `x1`. Its LOCAL tab is closed, which writes
  a local stamp naming `E`.
- **The machine** `p306far`, from the carriage: `machineUp('p306far')`.
- **A**: opened by `openRemote`, with shell `a1` created in it (`createSession({path: A, machineId})`).
- **C**: opened, with shell `c1`. **D**: opened, with shell `d1`. **P**: opened, with no session.
- **Witness folders `W1`, `W2`, ….** Each is a FEED-ONLY far session made by the probe on the
  loopback machine's own scratch server. The command is a synchronous `spawnSync(farTmux, ['-L',
  socket, '-f', '/dev/null', 'new-session', '-d', '-P', '-F', '#{session_id}', '-s', name, '-c',
  Wi, 'exec sleep 1800'], { env: { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp } })`, followed by
  `set-option -t <$id>` for `@gmux-id` (a fresh uuid), `@gmux-agent shell`, `@gmux-name` and
  `@gmux-project Wi`. Each witness is made only after a Tortie create on the machine has started the
  far server. It has no manifest row, so the re-home opens `p306far:Wi` on the first completed pass
  that sees it, at BOTH builds.
- **The pass witness.** "Wait for a pass" always means this: make a fresh `Wi`, then wait (ceiling
  90 s) until main's `projects.list()` holds `p306far:Wi`. That proves a completed pass ran the
  re-home over every far folder after the step being graded. A grading of "absent" taken without a
  witness is not a reading. The `new-session` itself is a `sessions-changed` event, so the pass is
  prompt.

### 8.2 The arms

Each arm reads main's list and the strip, and where named the sheet, the stamp and the log:

- **Main's list** is `projects.list()` filtered to `p306far`, giving `(path, id)`.
- **The strip** is every `[data-project-id]` box from `getBoundingClientRect()`, mapped to
  `(machine, path)` through `__p293.state().store.projects`. Present means a box with width and
  height above 0.
- **The sheet** is `tr.sm-group[data-manage-group]`: its `th` text (the label) and `data-tab-open`.
- **The stamp** is `sessions.list()`'s `closedProject` on the row.
- **The log** is HEAD's `held` line, read in `handle.text()`.

The no-regression rows are graded at both builds. The attack rows are graded at HEAD; at the parent
they are recorded, because the parent's tab is already back by then.

| Arm | Step | Graded at the parent | Graded at HEAD |
| --- | --- | --- | --- |
| O | after the fixture | A in main's list and in the strip; a1 live; a1's group `tabOpen yes` | same |
| N | W1 made | `p306far:W1` in main's list within one pass (a folder that never had a tab) | same |
| E | a feed-only far session in `E` (the same path as local X, whose local tab is closed) | `p306far:E` in main's list within one pass | same |
| C1 | `closeTab(A, 'p306far')`, then the witness | at once: A gone from the strip, a1 live, a1's `closedProject.path === A`. After the witness: A BACK in main's list with a NEW id (graded); the strip is recorded (racy) | at once: same. After the witness: A ABSENT from main's list and the strip; the log reads `held` 1 |
| C2 | `openRemote(A)` (a no-op focus at the parent, a re-open that clears at HEAD), then `closeTab(A)`, then the witness | A in main's list (the hidden re-add, graded); A absent from the strip (graded) | A absent from both |
| S | open Managed; read a1's group; `Closed tab` filter | recorded | label is A's folder name; `data-tab-open="no"`; `Closed tab` draws a1 |
| F1 | a real click on `.session-sheet button[aria-label="Refresh session list"]`, then the witness | A back in the strip (graded); a1's group `tabOpen yes`; `Closed tab` does not draw a1 | A absent; the group reads `no` under A's name; `Closed tab` draws a1 |
| F3 | `l1` ended out of band, then Restore pressed on its Managed row (door 3) | recorded | A absent |
| F2 | Try again (door 2) | NOT DRIVEN: it needs a failed list read no probe can force. It is the same `refresh` handler as F1 (`SessionManagerSheet.tsx:387` and `:520`), and the verifier may attack it by any means it finds | not driven |
| LC | the local control: Refresh, then read X | X stays closed | same |
| R | `sessions.rename(a1, …)`, then the witness | recorded | A absent |
| W | `machines.prepare('p306far')` (the stand-in for a wake, §3 item 9), then the witness | recorded | A absent |
| K | End a2 from the sheet (FIX ROUND: a2, a second shell in A, so a1 stays LIVE through X2), the way `probe:p293` arm 3 presses it, then the witness | a2 reads ended | a2 reads ended; A absent; a2 listed under A's name, tab closed |
| V | `Page.reload` (a reopened window: an empty `tabsAskedFor`, a fresh bootstrap list), then the witness | A in the strip (graded) | A absent |
| D | `closeTab(D)`, witness, then `createSession({path: D, machineId})` (a create in the closed folder, folder named) | D in main's list and the strip | D present; d1's `closedProject` undefined (the stamp cleared) |
| DS | FIX ROUND. `closeTab(Q)`, witness, then the REAL New session sheet from C's tab on the machine (Shell, Name, Directory Q, Create) | Q in main's list and the strip | Q in main's list and the strip; q1's `closedProject` undefined |
| G | `closeTab(C)`, witness, then `runMenuItem(c1, 'Go to session')` from the sheet | C opens; c1 active; label C's name | same, and c1's `closedProject` undefined |
| M | `sessions.create({name:'p306-m1', projectPath: P, projectMachineId: 'p306far', machineId: 'p306far', cwd: Y, agent: 'shell'})` with Y outside P (the folder whose row is MOVED in the same pass) | `p306far:Y` in main's list; m1's `projectPath === Y` | same |
| MH | FIX ROUND: Open on machine for Y first (the window never draws Y after M's bridge create, at either build), then `closeTab(Y)`, then the witness; a close that did not happen is one finding and nothing else is graded | Y back (recorded) | Y absent; m1 listed under Y's name, tab closed |
| B | the stated limit: `closeTab(W1)`, then the witness | W1 back | W1 BACK (no stamp; the limit, §3 item 5) |
| X2 | LAUNCH 2 (the relaunch) on the same profile: `machineUp`, then the witness. FIX ROUND: a1 must read LIVE at both builds, or the arm measures nothing (what a machine reported gone is not carried into a new run) | A in main's list (graded); the strip recorded (a boot-time race) | A absent from main's list and the strip; a1 (live) listed under A's name, tab closed |

**Two launches per build, one after the other, never both at once**, each through `withElectron`.
The far scratch server outlives launch 1. Its `TMUX_TMPDIR` is the carriage's, and neither the
wrapper's child environment nor `withElectron`'s local teardown names it. It is ended by
`endFarServer` in the probe's `finally` and by `with-scratch-machine.mjs` when the probe exits.

**Outside reads, after each launch.** The scratch manifest (`<profile>/gmux/manifest.db` plus `-wal`
and `-shm`) is copied and read with `/usr/bin/sqlite3 -readonly`, the shape of
`build/p274/probe-p274.mjs:126-155`:

- `SELECT id, project_path, machine_id, status, project_tombstone FROM sessions;`
- `SELECT machine_id, path, id FROM remote_projects;`

The stamp per row and the remote rows are graded against the bridge readings. Never the live
manifest.

**Environment.**

- `GMUX_TMUX_SOCKET` and `GMUX_HARNESS_DIR`, set by the wrapper.
- `GMUX_CONFIG_ROOT`, where the carriage is.
- `P306_PARENT_CHECKOUT`: a BUILT checkout to measure, launched with that checkout as its cwd.
- `P306_OUT_DIR`: default `out/p306`, with `readings.json`.
- `P306_ARMS`: a subset.

**Refusals, exit 2.** It refuses when:

- `GMUX_TMUX_SOCKET` is missing, or the socket is `gmux`, `default`, or not a `gmux-p306` harness
  socket;
- `GMUX_HARNESS_DIR` is missing;
- the carriage is missing, or its `tmuxTmp` is not under `/tmp/`;
- `out/main/index.js` is missing, or any of `remote-rehome.ts`, `sessions-repository.ts`,
  `create-local.ts`, `store.ts` or `codecs.ts` is newer than it, in the checkout being launched;
- any renamed agent reads installed.

**Exit codes.** 0 with no finding, 1 with findings.

**`--side-by-side <parent readings.json> <head readings.json>`** prints the §9 table from the two
files. It exits 1 when any row reads worse at HEAD than at the parent, by that row's own rule. It
starts nothing.

**Safety.** No photograph and no `npm run shot`: every reading is a count, a box, a label or a byte.
It never names `-L gmux` and never uses pkill, killall, pgrep patterns or a negative pid. Every
process it starts itself is a synchronous tmux, sqlite3 or git that has exited before its call
returns.

`HELPER_USER_FLOOR` rises with it (§11).

**Not driven, stated in the probe's header:**

- the real wake;
- a machine that stops answering mid-pass, because `with-scratch-machine.mjs` owns the sshd and this
  file signals nothing it did not start (unit H6 covers it);
- a create with NO folder (§3 item 2), because on the loopback machine the far login directory is
  the operator's own home (`build/scratch-machine.mjs` sets only `TMUX_TMPDIR`), and a session made
  there would start a shell in his home and list it in a tab (unit C2 covers it);
- two different remote machines with the same path, because only one loopback machine is allowed
  tonight (unit R2c covers it; the probe's per-machine row is E: this Mac against the loopback
  machine on one path).

## 9. The no-regression side-by-side (his rule: a part that regresses is REMOVED and queued)

The "Today" column is `75edbf5e`, measured by `probe:p306` with `P306_PARENT_CHECKOUT`. The HEAD
column is what this phase must read. A HEAD reading worse than Today on any row removes the part
responsible from this phase.

| # | Scenario | Today (`75edbf5e`) | HEAD | Arm |
| --- | --- | --- | --- | --- |
| 1 | Open a remote project | tab opens, sessions under it | unchanged | O |
| 2 | Close its tab | tab goes, sessions keep running, stamp written | unchanged | C1 (at once) |
| 3 | Press Refresh in the sheet | tab reappears, new id, end of the strip | tab stays closed | F1 |
| 4 | The sheet lists that session | listed, but the group reads tab-open after Refresh | listed; the group reads tab-closed under the folder's own name, and `Closed tab` finds it | S, F1 |
| 5 | End it from the sheet | ends; the row stays as Ended | unchanged, and the tab stays closed | K |
| 6 | A LOCAL project's tab closed, then Refresh | stays closed | unchanged | LC |
| 7 | A machine folder that never had a tab | tab opens on the first pass | unchanged | N, E |
| 8 | The reporter's "immediately": the first close | back within one pass | stays closed | C1 |
| 9 | The reporter's "only after I restart": a second close, then relaunch or reload | hidden re-add, back after a relaunch or reload | stays closed | C2, X2, V |
| 10 | A create in the closed folder, folder named | tab opens; the stamp stays beside it | tab opens; the stamp cleared | D |
| 10b | FIX ROUND. The same through the New session sheet from a tab on the machine | tab opens; the stamp stays beside it | tab opens; the stamp cleared | DS |
| 11 | A create with no folder that lands in a closed folder | tab opens (by the re-home) | tab opens (by the create, M5) | unit C2 |
| 12 | Go to session on a session whose tab is closed | tab opens with its name | unchanged, and the stamp cleared | G |
| 13 | The same path closed on this Mac, then a session in it on the machine | the machine's folder opens | unchanged | E, unit H2b |
| 14 | A folder whose sessions this Mac did not start, closed | comes back | unchanged (the stated limit) | B |

## 10. Gates, and who runs them

**Builders** run `npm run typecheck` and `npm test` before returning. They launch no Electron.
builder-proof's new files import names builder-main adds (`projectTabClosedFor`,
`tabsHeldClosed`, `openTabsForRemoteCreate`, the exported codec). Code against the exact signatures
in §4. If builder-main's half has not landed when you run the gates, say which red lines are only
missing names. The integrator runs both halves together.

**The integrator** launches no Electron. It runs:

- `npm run typecheck`;
- `npm run build`, which carries `gate:electron` with the floor raise, `gate:background`,
  `gate:checks`, `gate:knownhosts`, `gate:simulator`, `conformance:ios` and `gate:contract`.
  `docs/audits/contract-baseline.txt` must be byte identical;
- `npm test`;
- the path-triggered gates:
  - `conformance:machines`, because `src/main/machines/**` is touched;
  - `conformance:shellenv`, because `create-local.ts` is touched;
- `conformance:remoteclose` and `conformance:manager`, named by the entry;
- `ablation:p293`, named by the entry;
- `ablation:p306`;
- `node build/p306/probe-p306.mjs --self-test`.

**The verifier**, holding THE LOCK, and only after `electron.phone-wait` is empty, runs `smoke:t1`
(through `build/electron-run.mjs`) and then `probe:p306` at the parent and at HEAD, one Electron at a
time. To make the parent build without touching the operator's `.git`:

```
git -C /private/tmp/wt-p306 archive 75edbf5e | tar -x -C /private/tmp/wt-p306-parent
```

Then `cp -Rc` `node_modules` and `build/vendor` from `/private/tmp/wt-p306`, and run `npm run build`
there. `git worktree add` would write worktree metadata into `/Users/gdc/gmux/.git`. After the run
the verifier counts leftovers once, with CLAUDE.md's `ps -Ao …` command.

**Not run this phase, and why:**

- **`smoke:p93remote`**, per §3 item 10.
- **`smoke` and `smoke:t3`.** They start `electron .` from `build/harness-socket.mjs` rather than
  through `build/electron-run.mjs`, which tonight's rule requires for every Electron. They are named
  as not run unless the orchestrator rules that the battery's own launches are within the rule.
  Neither touches a remote path.
- **`npm run package`.** `electron-builder` looks up a signing identity in his login keychain, which
  tonight's rules forbid, and nothing here changes what is packaged.

## 11. Builders and file ownership (disjoint)

**builder-main** (main and manifest):

- `src/main/manifest/codecs.ts`: the one-word export, M1.
- `src/main/manifest/sessions-repository.ts`: M1.
- `src/main/manifest/store.ts`: M1's facade.
- `src/main/machines/remote-rehome.ts`: M2, M3, M4, M5's helper.
- `src/main/sessions/create-local.ts`: M5's call, the comment, the dropped import.
- `src/main/sessions/__tests__/p903-a-rehome.test.ts`: M7's two expectations only.

**builder-proof** (the proof):

- `src/main/manifest/__tests__/p306-tab-closed-reader.test.ts` (new): §7.1.
- `src/main/sessions/__tests__/p306-held-closed.test.ts` (new): §7.2.
- `build/p306/ablation.mjs` (new): §7.3.
- `build/p306/probe-p306.mjs` (new): §8.
- `build/p293/probe-p293.mjs`: ONE sentence in the arm R header paragraph. It now reads "(and main's
  re-home puts back a remote tab a person closed)". Replace it with "(until Phase 306, main's re-home
  put back a remote tab a person closed; `probe:p306` drives that)". Nothing else in that file.

**The shared files are owned by the integrator:**

- `package.json`: add
  `"probe:p306": "node build/harness-socket.mjs --fresh gmux-p306 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; node build/with-scratch-machine.mjs -- node build/p306/probe-p306.mjs'"`
  beside `probe:p320`, and `"ablation:p306": "node build/p306/ablation.mjs"` beside `ablation:p293`.
- `build/verification-checks.mjs`: add `remote('probe:p306')` beside `remote('probe:p320')`
  (`:967`), and `pure('ablation:p306')` beside `pure('ablation:p293')` (`:1868`).
- `build/assert-electron-teardown.mjs`: raise `HELPER_USER_FLOOR` from 157 to 158 (`:357`) and add a
  paragraph after the Phase 323 one (`:345-349`). The paragraph reads: "PHASE 306 RAISED IT FROM 157
  TO 158, for build/p306/probe-p306.mjs (`probe:p306`), a remote tab a person closed held closed,
  measured at the parent and at HEAD over the loopback machine build/with-scratch-machine.mjs starts:
  TWO Electrons one after the other on one scratch profile, because the relaunch is the claim, each
  ended by the helper's `finally`; the far sessions it makes on that machine's scratch server end
  with that server." After the rebase over Phase 326, this reads 158 to 159 (§12).
- `CLAUDE.md`: ONE row in "Probes and app runs", after `probe:p332`:
  `| probe:p306 | src/main/machines/remote-rehome.ts, projectTabClosedFor in src/main/manifest/sessions-repository.ts, the remote tab write create-local.ts calls | not yet measured; TWO Electrons one after the other on one scratch profile (the relaunch is the claim) over the loopback machine build/with-scratch-machine.mjs starts, and witness sessions it makes on that machine's scratch server, ended with it; P306_PARENT_CHECKOUT reads a parent build |`.
  The committer replaces "not yet measured" with the verifier's minutes. No path-triggered row: the
  unit proof is in `npm test`.
- `CHANGELOG.md`: §13's item, appended at the end of `## Unreleased` then `### Fixed`.
- `docs/audits/contract-baseline.txt`: NO change. If `gate:contract` moves it, that is a finding, not
  a regeneration.

## 12. For the committer

- **Rebase onto origin/main.** Phase 326 is `b0ff7ca7`; the docs are `d89d1ad1` and `fe2c1923`. The
  two phases share no source file.
  - `HELPER_USER_FLOOR` becomes 159, and the paragraph says "FROM 158 TO 159".
  - `package.json`, `build/verification-checks.mjs`, `CLAUDE.md` and `CHANGELOG.md` take both phases'
    lines.
  - `core.ts` line numbers in comments are not touched by this phase.
- **First check for local commits.** Run `git -C /Users/gdc/gmux log --oneline origin/main..HEAD` and
  use `merge --ff-only`. Never `reset --keep`.
- **The commit.** Subject `fix(machines): a closed remote tab stays closed`. First body line
  `Phase 306: the re-home asks whether a tab was closed`. No trailers. The body carries:
  - the two timings explained (§2.5);
  - the reader's conjunction and why (§3 item 3);
  - the create widening and why (§3 item 2);
  - the cell table;
  - the side-by-side readings;
  - the stated limits.
- **The follow-up docs commit** adds the running-log line and the CHANGELOG commit link.

## 13. The CHANGELOG item (`### Fixed`, operator's style, no commit link yet)

```
- A project tab you close for a folder on another machine now stays closed, where it used to come back by itself, sometimes at once and sometimes the next time Tortie started; its sessions keep running, Manage Sessions still lists them under the folder's name, and Go to session or opening the folder again brings the tab back. A folder whose sessions this Mac did not start, from Tortie on that machine or on another Mac, still comes back. Reported by [Jake Levirne](https://github.com/jakelevirne) in [#35](https://github.com/gregce/tortie/issues/35)
```

The issue link follows the shape of the `#31` item already under `### Fixed`. The commit link is the
follow-up docs commit's, by CLAUDE.md's release-notes rule.

## 14. What is NOT in this phase

- **No reaper, no TTL, no idle limit, and nothing on project close.** Tortie never ends, suspends or
  kills a session by itself. A closed tab is a tab, not a verb.
- **No change to what a session IS.**
  - No status moves.
  - No `project_path` rule changes: `remoteProjectPathFor` and the move are untouched.
  - No new surface, sentence, label or menu row.
  - Nothing is sent to any machine by any line this phase adds.
- **`reconcileRemoteTabs` and `tabsAskedFor` are not touched** (§5). **FIX ROUND: AMENDED.** The memo is
  re-keyed (folder to closed-tab answer) so a create's open is drawn; it is still not cleared on close,
  and it still decides only when the window re-reads, never whether a tab may open.
- **No re-add is repaired retroactively.** A manifest already holding a re-added remote row with a
  stamp beside it (cell 4) keeps it. Closing that tab once more now sticks, and nothing durable is
  written over anybody's manifest at open.
- **A folder whose sessions have no record on this Mac keeps today's behaviour** (§3 item 5). A
  durable per-folder record of a close, independent of session rows, would need a schema migration and
  a contract change. It is a separate entry if anybody asks for it.
- **The orphaned stamp on a moved row is not made to follow the move.** M1's conjunction makes it
  hold nothing. Making the stamp follow is a separate entry if anybody meets it.
- **A machine that resolves a folder to a different spelling** (Open on machine stores
  `listRemoteDir`'s `path`, `core.ts:3457`) clears the stamp for that spelling only. The far
  `dir-list` script prints the path as given (`src/main/machines/remote-scripts.ts:974-982`).
  **FIX ROUND: it IS met** (the first verifier, arm TS): Open on machine trims whitespace only, so
  `<folder>/` is stored as its own folder, its clear misses the closed folder's stamp, and the person gets
  an empty tab while their sessions stay held until the exact path is opened. The empty duplicate tab is
  pre-existing (the parent draws it too) and the comment at `core.ts:3455-3456` ("A person who typed a
  trailing slash gets the tab the machine named") is false. Stated in the CHANGELOG item; the repair
  (strip one trailing `/` in `addRemoteProjectAdmitted`) is a separate entry, because it changes what
  every remote add stores.
- **No release.**

## §As built (the integrator, 2026-10-01, at `75edbf5e` plus the uncommitted phase)

### Files

| Owner | File | What changed |
| --- | --- | --- |
| builder-main | `src/main/manifest/codecs.ts` | `parseClosedProjectTab` exported, one word |
| builder-main | `src/main/manifest/sessions-repository.ts` | `projectTabClosedFor` below `clearProjectTabClosed`, §4 M1's text exactly; the codec import |
| builder-main | `src/main/manifest/store.ts` | the facade method below `clearProjectTabClosed` |
| builder-main | `src/main/machines/remote-rehome.ts` | M2's hold in the second loop's `try`; `tabsHeldClosed` on `RehomeResult`; M3's `lastHeld` and its one line; M4's two header edits; M5's `openTabsForRemoteCreate` |
| builder-main | `src/main/sessions/create-local.ts` | the upsert block replaced by one call before `deps.broadcastSessions();`; the PHASE 306 paragraph; `projectNameForPath`'s import removed |
| builder-main | `src/main/sessions/__tests__/p903-a-rehome.test.ts` | M7's two `toEqual` lines |
| builder-proof | `src/main/manifest/__tests__/p306-tab-closed-reader.test.ts` (new) | R1 to R9 |
| builder-proof | `src/main/sessions/__tests__/p306-held-closed.test.ts` (new) | H1 to H7, C1 to C5 |
| builder-proof | `build/p306/ablation.mjs` (new) | A1 to A14 |
| builder-proof | `build/p306/probe-p306.mjs` (new) | the 19 arms, `--self-test`, `--side-by-side` |
| builder-proof | `build/p293/probe-p293.mjs` | the arm R phrase only |
| integrator | `package.json` | `probe:p306` after `probe:p320`, `ablation:p306` after `ablation:p293`, §11's text |
| integrator | `build/verification-checks.mjs` | `remote('probe:p306')` after `remote('probe:p320')`, `pure('ablation:p306')` after `pure('ablation:p293')`, each with its comment |
| integrator | `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 157 to 158, and §11's paragraph after Phase 323's |
| integrator | `CLAUDE.md` | the one `probe:p306` row directly after `probe:p332`, "not yet measured" |
| integrator | `CHANGELOG.md` | §13's item, last under `## Unreleased` then `### Fixed` |

`docs/audits/contract-baseline.txt` did not move. Nothing under `src/renderer/` changed.

### Decisions the builders took that this spec did not settle, kept

- The create's two warnings are written under the `sessions` scope from `remote-rehome.ts`
  (`createLog`), so the moved sentence reads in the log exactly as it did. The re-home's own lines
  stay on `config`.
- `openTabsForRemoteCreate` returns a folder whose upsert failed, because its stamp was cleared.
- A reader that throws is said with the re-home's existing sentence ("could not open a tab for a
  folder on …").

### The integrator's own census (by the TypeScript parser, not grep)

`scratchpad/p306/integrator/census.mjs` walks every production file under `src/` (1,379) and lists
each call expression by name. It agrees with §2.2 and §6:

- `remote_projects` is inserted at three sites only: the re-home (`remote-rehome.ts:223`, now
  behind the hold), `openTabsForRemoteCreate` (`:299`, which clears beside it) and
  `addRemoteProjectAdmitted` (`core.ts:3460`, which clears at `:3467`). It is deleted at one,
  `removeProject` (`core.ts:3531`).
- The stamp is written by `markProjectTabClosed` alone (`core.ts:3511`). The other `insertSession`
  callers (`remote-record.ts:438`, `create-local.ts:611`, `reconstruct.ts:989`) pass fresh records.
- It is cleared at four sites: the local add twice (`core.ts:3394`, `:3407`), the remote add
  (`:3467`) and the create (`remote-rehome.ts:311`).
- Every renderer route that asks main to open a remote tab goes through `addRemoteProject`
  (`projects-slice.ts:256`), which re-reads the list: Open on machine, `openTargetProject` (Go to
  session, the sheet's restore), the Home screen's recent row and `openRecentOnMachine`.

### Commands, at the integrated tree

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 2 s; 1,382 files, 0 boundary violations, 0 runtime cycles |
| vitest over p903, p306 ×2, p94, capture-refusal-wiring, p276-env-cache, p125 | 0 | 7 files, 132 tests |
| `npm run -s conformance:machines` | 0 | PASS, 3 s |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s conformance:manager` | 0 | 58 rules, 2,310 checks |
| `npm run -s conformance:shellenv` | 0 | PASS |
| `npm run -s gate:contract` | 0 | the baseline byte for byte |
| `npm run -s gate:checks` | 0 | 244 check scripts classified |
| `npm run -s gate:electron` | 0 | 158 reach the helper, against a floor of 158 |
| `npm run -s gate:background`, `gate:knownhosts`, `gate:simulator` | 0 | PASS |
| `node build/p306/probe-p306.mjs --self-test` | 0 | 40 fixtures |
| `npm run -s ablation:p306` | 0 | 21.8 s; 14 of 14 owners newly red, control green first and last, clone gone |
| `npm run -s ablation:p293` | 0 | 104.4 s; 71 ablations |
| `npm test` | 0 | 1,026 files passed and 1 skipped; 17,851 tests passed and 7 skipped; 52 s |
| `npm run -s build` | 0 | 31 s; carries gate:electron, gate:background, gate:checks, gate:knownhosts, gate:simulator, conformance:ios and gate:contract |

`conformance:samefolder` was not run: no path comparison rule moved (the reader compares the
stamp's own `path` with `===`, the spelling `clearProjectTabClosed` already uses). `smoke`,
`smoke:t3`, `smoke:p93remote` and `npm run package` were not run, for §10's reasons.

### Duplication

A scan for ten or more identical lines finds the new probe repeating `probe-p320.mjs` and
`probe-p293.mjs` (the imports, `cdpForAppWindow`, the launch spec) and the new ablation repeating
`build/p331/ablation.mjs`'s clone and restore. That is the house shape: each probe and each ablation
is self-contained, and §8 names `probe-p320.mjs` as the template and forbids importing
`probe-p332.mjs`. Nothing under `src/main/` repeats ten lines. The two new test files share a
twelve-line row writer, which is a fixture.

### What this spec got wrong, found by integrating

1. **§5's "the memo hides nothing" is false, and a scratch run of the shipping renderer proves it.**
   `scratchpad/p306/integrator/zz-p306-integrator-memo.test.ts` drives the real store's
   `applySessions` over a stubbed bridge. With main holding D, the pass after the close asks once and
   remembers D. When main then opens D (M5), the next broadcast makes no re-read, and D stays out
   of the strip. A create through the store re-reads the list only when it starts from a tab on
   this Mac (`sessions-slice.ts:1257`). So a person in a tab on that machine who presses ⌘T with
   Directory set to the folder they closed gets a session in main's D and no tab in the window
   until a refresh, reload or relaunch. At the parent the tab was already back by the defect. This
   is row 10 of §9, and arm D's strip reading at HEAD is expected to read WORSE.
2. **§2.5's "the window never re-reads" is too strong.** `reconcileRemoteTabs` replaces the WHOLE
   list whenever ANY new remote folder without a tab appears. The parent's hidden re-add therefore
   surfaces at the next new folder, and every pass witness is one. At the parent, arm C2's strip
   reading ("A absent from the strip", graded) is expected to fail on the witness's own re-read.
   That is a parent finding, not a HEAD regression.

### Open concerns for the verifiers

1. **Arm D, the strip, at HEAD (item 1 above).** Measure it at both builds and read row 10. If it
   reads worse, his rule applies. The narrowest repair found so far, prototyped in a scratch clone
   and never in this worktree (`scratchpad/p306/integrator/prototype-memo-key.diff`): remember each
   folder in `tabsAskedFor` TOGETHER WITH whether any session in it still carries `closedProject`.
   A clear (the add, or M5's create) changes the key, so the window asks once more. A held folder
   costs no read after its first. The create's own feed pass, which can broadcast before M5 clears,
   still shows d1 stamped, so it is no new read either. The scratch test went from 0 re-reads and
   D missing to 1 re-read and D drawn, and no renderer state test went red. A key per SESSION instead
   loses that race and was measured failing. Either way it edits `reconcileRemoteTabs`, which §5 and
   §14 refuse, so it needs that refusal amended in the fix round's spec. The other repair is to widen
   the store create's re-read at `sessions-slice.ts:1257` to every create whose session lands in a
   folder with no tab. That one does not reach the bridge create arm D drives.
2. **Arm C2 at the parent (item 2 above).** Expect its graded "absent from the strip" to fail on the
   witness's own re-read. Judge it as a probe expectation, not as evidence for either build.
3. **Go to session, or Open on machine, while the machine is not answering.** Both reach
   `addRemoteProjectAdmitted`, which refuses `notConnected` or a listing refusal before it upserts
   or clears. At HEAD a closed folder on an unreachable machine therefore cannot be re-opened until
   the machine answers, and Go to session draws its sticky refusal. At the parent the defect had
   usually put the tab back already. Not driven by the probe. Judge whether this reads worse.
4. **Path spelling on the loopback machine.** The far side is this Mac, and `/tmp` is a link to
   `/private/tmp`. If tmux reports a session's folder in the other spelling from the one the probe
   created it in, the re-home MOVES the row and opens a second tab at both builds, and the hold is
   then asked about the moved spelling. Read `session_path` against the probe's own paths before
   grading any "absent".
5. **The floor after the rebase.** `HELPER_USER_FLOOR` is 158 here, with 158 reaching the helper.
   Over Phase 326 it is 159, and the paragraph reads "FROM 158 TO 159". Phase 326 touches
   `remote-sessions.ts` (`remoteCreate` gained an in-flight record) and `core.ts`, but it still
   awaits `startMachineFeed` before `remoteCreate` returns, so M5's open-and-clear after it is
   unchanged. This was read in `git show origin/main:…` and was not run.

## §As built, the fix round (the fixer, 2026-10-01, the fix runs once)

Both verifiers answered `needs_work`. They agreed on ONE major: **row 10 read WORSE than the parent**.
A person closes a remote folder's tab, then from another tab on the same machine creates a session
with Directory set to that folder (⌘T, or the bridge call the store makes). Main opens the folder and
clears the stamp (M5), but the window never draws the tab. The first held pass after the close made
`reconcileRemoteTabs` ask about the folder once, find nothing, and remember it in `tabsAskedFor`; when
M5 opened it the window never asked again. The new session sat in no tab, under a group the sheet
labelled "Tab closed", until a reload, a relaunch or an unrelated new folder. At the parent the defect
had already put the tab back. Lens 1 measured it with its own driver (QD, 15 s and 45 s), Lens 2
through the REAL New session sheet (S11b to S11d), and both saw the shipping probe's arm D read
`main true, strip false` with `--side-by-side` exiting 1 on row 10.

### How "a part that regresses is removed" was applied, and why this is a repair

The orchestrator's brief said a part that makes a scenario worse is removed, not repaired. The part
responsible for row 10 is the hold itself (M2): only the hold leaves the folder without a tab at the
moment the window asks. Removing it removes the phase, and issue 35 with it. The operator's own rule,
as written in his memory on 2026-09-19, is that "if one part of a phase regresses a case **and the fix
round cannot repair it**, that part is removed". Both verifiers asked for the same repair: amend §5 and
§14 so the window's memo may change while the decision stays in main. So the fix round repairs
`reconcileRemoteTabs` and does not remove the hold. **This amends a refusal the backlog entry wrote**
("`tabsAskedFor` is not touched … clearing it on close would be a second place deciding whether a tab
may open"). The amendment keeps that refusal's reason: the memo is not cleared on close, and it still
decides only WHEN the window re-reads main's list, never whether a tab may open. The operator should
see this sentence before the phase lands.

### What changed in the fix round

| File | What changed | Why |
| --- | --- | --- |
| `src/renderer/state/sessions-slice.ts` | `tabsAskedFor` (`:616`) is a `Map` from folder to whether a session in it carried `closedProject` when the window last asked. `reconcileRemoteTabs` (`:619-659`) computes that answer per folder and asks again when it changes. | The major (row 10). M5's clear flips every row in the folder (`clearProjectTabClosed` matches `project_path`), so the window asks once more and draws the tab. A map, not a set of pairs, so a second close and a second create in one run are each asked again (ablation A16). |
| `src/renderer/state/__tests__/p306-remote-tab-memo.test.ts` (new) | T1 to T7 over the shipping store and a stubbed bridge | Pins the cost (one read per held folder, none per pass), row 10, the create's own early passes, a second cycle, Phase 90.3's first read, per-folder answers and a failed read |
| `src/main/machines/remote-rehome.ts` | `releaseFoldersAfterFailedRemoteCreate` (`:360` on), and the header names it | Lens 1 minor 6: a create that THROWS after the session started (`CREATE_ANSWER_LOST`, "did not list it back") never reached M5, so at HEAD that session stayed in a held folder while the parent's re-home re-added it. The release opens and clears each folder the create named (the given folder and the Directory sent, by `remoteProjectPathFor`) that is HELD, and only those: a failed create opens no tab for a folder that never had one. It opens rather than only clearing, because a bare clear followed by any broadcast before the next pass would make the window ask before the row existed and never ask again. |
| `src/main/sessions/create-local.ts` | `remoteCreate(…).catch(…)` calls the release with `farProjectPath` and `folders.cwd ?? ''`, then rethrows | The release's one call site. `const session = await remoteCreate({` and every marker the existing source tests read are unchanged |
| `src/main/sessions/__tests__/p306-held-closed.test.ts` | C6 and C7 | C6 drives the release over a real manifest (held folder opened and cleared, the Directory shape, a never-tabbed folder left alone, an empty create asking nothing, a failed open still clearing); C7 reads the call site |
| `build/p306/ablation.mjs` | four test files; A15 to A23 | Every new clause owned: A15 is the build round's own memo shape and reddens T2; A16 the set-of-pairs prototype reddens T4; A17, A18 the answer; A19 to A23 the release |
| `build/p306/probe-p306.mjs` | witness, DB read, arms K, MH, X2, and a new arm DS; self-test 40 to 46 fixtures | Every probe defect both verifiers named (below) |
| `build/p306/SPEC.md` | §2.5, §5, §6 cell 4, §8.2 rows K, D/DS, MH, X2, §9 row 10b, §14, and this section | The corrections |
| `CHANGELOG.md` | the item says the trailing slash limit in one clause | Lens 1 minor 5 |
| `CLAUDE.md` | the `probe:p306` row: the renderer trigger, the measured 1.5 minutes, the rename witness, arm DS | Lens 2 nit |
| `build/verification-checks.mjs` | the two comments | The entry count and what the witness is |

`HELPER_USER_FLOOR` did not move: no new script reaches `build/electron-run.mjs`. The contract
baseline did not move.

### Each problem and what was done

| Verdict | Problem | Disposition |
| --- | --- | --- |
| both, MAJOR | Row 10: a create in a closed folder from a tab on the machine leaves the session in no tab | Repaired in the renderer memo (above). Proved by T2, T3, T4 and A15 (the build round's memo reddens T2). NOT proved in the app: the fixer launches no Electron |
| Lens 1, minor | §6 cell 4 "NO WRITER" is false: the Past restore reaches it (`actions.ts:619-651`, then `remote-restore.ts:599`) | §6 corrected. Harmless and identical at the parent; making the restore clear the stamp is a separate entry if wanted. The commit body's cell table must use the corrected cell |
| both, minor | `sqlite3 -readonly` cannot open the copied WAL database (exit 14), so DB1 and DB2 never read | `readManifest` opens the COPY without `-readonly`. Not `?immutable=1`, which would ignore a `-wal` the copy can carry |
| both, minor | MH never closed Y (the window never draws Y after arm M's bridge create, at either build), and graded three findings anyway | MH opens Y by Open on machine first; a close that did not happen is one finding and nothing else is graded (self-test fixture) |
| Lens 1, minor | A trailing slash in Open on machine is stored as its own folder and misses the stamp | Stated in §14 and the CHANGELOG. Not repaired here: stripping the slash in `addRemoteProjectAdmitted` changes what every remote add stores and is its own entry. The comment at `core.ts:3455-3456` is false and goes with that entry |
| Lens 1, minor | A create that throws after the session started never clears the stamp | Repaired by the release (above), C6, C7, A19 to A23 |
| Lens 1, nit / Lens 2, minor | C2 at the parent fails on the witness's own folder | The pass witness RENAMES one feed-only session and adds no folder (Lens 2's method), so the parent's hidden re-add reads `main true, strip false` as §8.2 grades it. Arm N alone still makes a fresh folder |
| Lens 2, minor | K ended a1, so X2's relaunch had no live session in A and measured nothing | The fixture makes a2 in A; K ends a2; X2 grades a1 LIVE at both builds or names the arm as measuring nothing |
| Lens 2, minor | Arm D is a bridge create, no person's path | D is kept (it is Lens 1's QD shape and the repaired memo serves it), and a new arm DS drives the REAL New session sheet from C's tab with Directory Q, ported from Lens 2's driver; side-by-side row 10b |
| Lens 2, nit | §5 and §2.5 too strong; CLAUDE.md "not yet measured" | Both corrected in place; the row reads 1.5 minutes per build, measured before the fix round |

### Commands, at the fixed tree (no Electron)

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 2 s |
| vitest over p903, p306 x3 (the new memo file included), p94, capture-refusal-wiring, p276-env-cache, p125 | 0 | 8 files, 141 tests |
| `npm run -s conformance:machines` | 0 | PASS, 3 s |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s conformance:manager` | 0 | 58 rules, 2,310 checks |
| `npm run -s conformance:shellenv` | 0 | PASS |
| `npm run -s gate:contract` | 0 | the baseline byte for byte |
| `npm run -s gate:checks` | 0 | 244 check scripts classified, 1,028 test files |
| `npm run -s gate:electron` | 0 | 158 reach the helper, floor 158 |
| `npm run -s gate:background`, `gate:knownhosts`, `gate:simulator` | 0 | PASS |
| `node build/p306/probe-p306.mjs --self-test` | 0 | 46 fixtures |
| `node build/p306/probe-p306.mjs` with no environment | 2 | refuses before anything starts |
| `npm run -s ablation:p306` | 0 | 31.1 s; 23 of 23 owners newly red, control green first and last, clone gone |
| `npm run -s ablation:p293` | 0 | 70.5 s; 71 ablations |
| `npm test` | 0 | 1,027 files passed and 1 skipped; 17,860 tests passed and 7 skipped; 47 s |
| `npm run -s build` | 0 | 29 s, with gate:electron, gate:background, gate:checks, gate:knownhosts, gate:simulator, conformance:ios and gate:contract |

### Not done, and why

- **No app run.** The fixer launches no Electron, as builders and the integrator launch none. The
  probe's new witness, arm DS, and the K, MH, X2 and DB changes are proved only by `--self-test`, a
  syntax check of the page kit and the refusal. The uiCreate steps are Lens 2's driver's, which ran at
  both builds. `smoke:t1` was not run for the same reason.
- **The reverify must run, live, at the parent and at HEAD**: `probe:p306` and its `--side-by-side`
  (rows 10 and 10b must not read worse, C2 at the parent must read the hidden re-add, X2 must hold a1
  live, DB1 and DB2 must read); Lens 1's QD route and Lens 2's S11 route with their own drivers.

### Still true at both builds, and queued rather than done

- A create from a tab on the machine into a folder that NEVER had a tab is not drawn until another
  list read (Lens 2's juliet; the probe's Y after arm M). It is identical at the parent, so it is not
  this phase's regression; the window asks before main's row exists. Lens 2's store-level re-read after
  a remote create would close it, as its own entry.
- The trailing slash spelling (above).
- The Past restore's stamp beside an open tab (cell 4, above).

## §As built, the fix round resumed (the fixer, 2026-10-01 10:50, the fix still runs once)

The workflow was restarted at the fix step. This section is that restarted fixer's account. It does
not replace the section above; it says what this run found, kept and changed, and what it measured.

### What the earlier run left, and the decision for each edit

The brief said the earlier fixer stopped at 02:48 in the middle of its gates. The tree says more:

- Every source, test, probe and ablation edit of the fix round was last written between 02:31 and
  02:48 (`stat`).
- That run, or a resumption of it, re-ran its whole gate list from 09:35 to 09:39 (its logs are in
  `scratchpad/p306/fixer/`), then wrote the section above at 09:40.
- A reverify began at 09:46. It built a parent and wrote its own driver under
  `scratchpad/p306/reverify/`, but its four app logs are empty. It never took the lock. The lock has
  been held by `p3166` since 04:43, and `electron.phone-wait` holds `p3166-verifier-attack`. No
  process of that reverify is running.

Every edit of the earlier run was read against both verdicts and KEPT AS IT IS:

| Edit | Kept, finished or undone | Why |
| --- | --- | --- |
| `tabsAskedFor` re-keyed in `src/renderer/state/sessions-slice.ts` | kept | The major, row 10. The check below re-derives it |
| `src/renderer/state/__tests__/p306-remote-tab-memo.test.ts` (T1 to T7) | kept | Each owns a clause, and A15 to A18 redden them |
| `releaseFoldersAfterFailedRemoteCreate` and its one call in `create-local.ts` | kept | Lens 1 minor 6. It opens only a HELD folder, so a failed create never draws a tab for a folder that never had one. On any failure it can only re-open a folder the person closed and then tried to create in. At the parent that folder was already back, so no scenario reads worse than the parent |
| C6 and C7 in `p306-held-closed.test.ts`; A15 to A23 in `ablation.mjs` | kept | Re-run below, 23 of 23 owners red |
| Probe: the rename witness, DB read without `-readonly`, K on a2, MH opened first, X2 graded on a live a1, arm DS | kept | One per probe defect both verifiers named. Read line by line against both verifiers' drivers. DS's `uiCreate` uses Lens 2's selectors and focuses C with Open on machine, which re-reads the list BEFORE the create, so it cannot hide row 10 |
| SPEC §2.5, §5, §6 cell 4, §8.2, §9 row 10b and §14, plus the section above | kept | Read against the tree |
| CHANGELOG trailing-slash clause; CLAUDE.md row; `verification-checks.mjs` comments | kept | |

**This run's one edit:** three places in `build/p306/probe-p306.mjs` said that "no writer reaches"
cell 4 at HEAD:

- the header paragraph;
- `dbFindings`' doc comment;
- `dbFindings`' finding text.

That is false since the corrected §6, because the Past restore of a removed remote session reaches
cell 4. All three now say that no step THIS PROBE drives reaches it, and that the restore route is not
driven. The grading is unchanged: the self-test still passes 46 fixtures.

### "Removed, not repaired", once more, for the operator

The brief for this run says a part that makes a scenario worse is removed, not repaired. The part
behind row 10 is the hold itself (M2), so removing it would remove issue 35's fix and leave nothing
to land. The operator's own rule, in his memory of 2026-09-19, removes a part only when "the fix
round cannot repair it". Both verifiers prescribed this repair: the memo keyed by the closed-tab
answer (Lens 1), or a re-read after a create (Lens 2). So this run kept the repair.

**The phase therefore amends a refusal the backlog entry wrote: "`tabsAskedFor` is not touched".**
The amendment keeps that refusal's reason:

- the memo is still not cleared on close;
- main alone still decides whether a tab may open;
- the window decides only WHEN it re-reads main's list.

The operator should see this before the phase lands.

### The independent check this run made: main and the window joined, at three builds

Lens 2 warned that a repair to the memo alone was "unproven in the app", because its juliet reading
showed the window missing a never-tabbed folder at BOTH builds. To answer that, this run wrote
`scratchpad/p306/fixer/zz-p306-fixer-e2e.test.ts` and ran it only in `cp -Rc` clones under
`/private/tmp/p306-fixer-e2e-<pid>`. The clones were removed afterwards, and the worktree was never
written.

The test joins the real main side to the real window:

- **Main:** the real `ManifestStore`, `rehomeRemoteSessions` and `openTabsForRemoteCreate`.
- **The window:** the REAL renderer store.
- **The bridge:** `projects.list()` answers what that same manifest holds.
- **The broadcast:** built the way `core.ts`'s `listSessions` builds a remote row. The folder comes
  from `remoteProjectPathFor` over the row's recorded path and cwd, and `closedProject` from the
  row's stamp.

The steps follow main's own order for ⌘T from C's tab with Directory set:

1. the manifest row is written;
2. optionally, an EARLY broadcast lists it before the feed has the session. This is the control
   event's pass; since Phase 326 that pass skips the unstamped `$-id`, and the manifest row is listed
   anyway;
3. the feed pass runs;
4. the create's open runs, then its broadcast;
5. two more passes run.

The three builds are:

- **HEAD:** this tree.
- **"Set memo":** this tree with `sessions-slice.ts` at `75edbf5e`. That is the build round's
  renderer, which the verifiers measured.
- **"Parent":** the `75edbf5e` renderer, a reader that answers false, and the parent's create, which
  upserts only the given folder and clears nothing.

| Build | Early broadcast | D after its close, 2 passes | D after a create in it from C | J (never had a tab) after a create from C |
| --- | --- | --- | --- | --- |
| parent | on | main yes, strip YES (the defect) | strip yes, d1 stamp stays | main yes, strip NO |
| parent | off | main yes, strip yes | strip yes, stamp stays | strip yes |
| Set memo | on | main no, strip no | main yes, **strip NO** (the verifiers' row 10) | strip no |
| Set memo | off | main no, strip no | main yes, **strip NO** | strip yes |
| HEAD | on | main no, strip no (1 read) | main yes, **strip yes**, stamp cleared (2 reads) | strip no |
| HEAD | off | main no, strip no | strip yes, stamp cleared | strip yes |

What the table shows:

- It reproduces both app readings from outside the app: the parent's defect, and the build round's
  row 10.
- It shows that the repair draws D in both orders.
- Juliet is not drawn when the early broadcast comes first, and that is identical at every build.
  The cause is that the window asks before main's row exists, and the answer it remembers (open)
  never changes.
- Row 10 is different. D's answer flips from closed to open only in the create's own call, after its
  upsert (`openTabsForRemoteCreate` upserts, then clears, then the create broadcasts, all in one
  synchronous run). So the one read it causes always finds D.

This is a model, not the app. The reverify must still drive row 10 live.

### What moved on origin/main under this phase (read with `git show`, not run)

- **origin/main is `0699e08d`.**
- **`HELPER_USER_FLOOR` is 159 there**, so this phase's raise becomes 159 to 160 at the rebase, and
  the paragraph says "FROM 159 TO 160". §12's "159" is out of date.
- **Phase 326's `remoteCreate`** (`b0ff7ca7`) wraps the create in a flight with a `finally`, but it
  still awaits `startMachineFeed` before it returns. It also keeps the same two throws after a
  session may exist (`CREATE_ANSWER_LOST`, and "did not list it back"). So M5 and the release are
  unchanged in meaning.
- **origin/main's `core.ts`** still calls the re-home before the broadcast (`:1204`) and still
  stamps `closedProject` from the row (`:2758`).
- **Untouched on origin/main:** `sessions-slice.ts`, `create-local.ts`, `remote-rehome.ts` and the
  manifest files. They should rebase without conflict.

### Commands, at this tree (no Electron; logs in `scratchpad/p306/fixer/r2/`)

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 5 s; 1,382 production files, 0 boundary violations, 0 runtime cycles |
| vitest over p903, p306 ×3, p94, capture-refusal-wiring | 0 | 6 files, 70 tests, 2.8 s |
| `npm run -s conformance:machines` | 0 | PASS, 4 s |
| `npm run -s conformance:remoteclose` | 0 | 11 tests |
| `npm run -s conformance:manager` | 0 | 58 rules, 2,310 checks |
| `npm run -s conformance:shellenv` | 0 | PASS |
| `npm run -s gate:contract` | 0 | the baseline byte for byte |
| `npm run -s gate:checks` | 0 | 244 check scripts classified, 1,028 test files |
| `npm run -s gate:electron` | 0 | 158 reach the helper, floor 158 |
| `npm run -s gate:background`, `gate:knownhosts`, `gate:simulator` | 0 | PASS |
| `node build/p306/probe-p306.mjs --self-test` | 0 | 46 fixtures |
| `node build/p306/probe-p306.mjs` with no harness environment | 2 | "REFUSED. no GMUX_TMUX_SOCKET" |
| `npm run -s ablation:p306` | 0 | 41.3 s; 23 of 23 owners newly red, control green first and last, clone gone |
| `npm run -s ablation:p293` | 0 | 77.9 s; 71 ablations |
| `npm test` | 0 | 1,027 files passed and 1 skipped; 17,860 tests passed and 7 skipped; 51 s |
| `npm run -s build` | 0 | 33 s, carrying gate:electron, gate:background, gate:checks, gate:knownhosts, gate:simulator, conformance:ios and gate:contract; `out/` is newer than every source the probe's stale check reads |
| the duplication scan (`scratchpad/p306/integrator/dupes.mjs`) over `remote-rehome.ts` and the memo test | 0 | no run of ten identical lines |
| `git diff --check` and a trailing-space scan of the new files | 0 | clean |

The machine was loaded while these ran: a load average of 41, from another agent's vitest. Memory
read 34 percent free, so no stop was due.

### For the committer

- **The commit body's cell table uses §6 as corrected.** Cell 4 at HEAD is reached by no re-home and
  no create. It is still reached by:
  - a parent's manifest;
  - the crash between the stamp and the delete;
  - the Past restore of a removed remote session.
- **`HELPER_USER_FLOOR` becomes 159 to 160** at the rebase, not §12's 158 to 159.
- **The CLAUDE.md `probe:p306` row takes the reverify's measured minutes.** The row now has arm DS,
  which the 1.5 minutes predate.
- **Queue three entries, each a full section above the running log, plus a log line each.**
  1. The trailing slash in Open on machine, which is stored as its own folder. The repair is to strip
     one trailing `/` in `addRemoteProjectAdmitted`, and the comment at `core.ts:3455-3456` goes with
     it.
  2. The Past restore leaving a stamp beside an open tab (cell 4).
  3. A create from a tab on a machine into a folder that never had a tab, which is not drawn until
     another list read. This is Lens 2's juliet, identical at every build. Its repair is Lens 2's
     re-read in the store's `createSession` after a remote create whose folder has no tab.

  None of the three is a regression of this phase.

### Not done, and why

- **No app run, and no `smoke:t1`.** The fixer launches no Electron. The lock was also held by
  `p3166` for this whole run, with `electron.phone-wait` occupied.
- **The reverify must run these live, at the parent and at HEAD:**
  - `probe:p306` and its `--side-by-side`. Rows 10 and 10b must read better than or the same as the
    parent. C2 at the parent must read the hidden re-add. X2 must hold a1 live. DB1 and DB2 must
    read.
  - Lens 1's QD route and Lens 2's S11 route, each with its own driver.
