# 39. Session history: browse and restore removed sessions

**Written 2026-08-14. This document is the specification for Phase 29 in docs/BACKLOG.md.**

**How the facts were gathered.** Every code claim below carries a file and a line. The manifest
numbers come from a copy of the operator manifest, taken at 15:05 and opened read only. The live
tmux server, the running app and the live manifest file were never written to.

## 1. The answer

Remove runs a hard SQL DELETE on the session's manifest row, and everything a restore needs dies
with that row. The schema already reserves a tombstone status named `discarded` for a reversible
remove, and nothing writes it yet (`src/shared/types.ts:53`, `src/main/manifest/store.ts:1897`).
Three designs were written and attacked. Design B wins, with amendments. Remove will keep the row,
mark it `discarded` and stamp a new `removed_at` column. One item in the Session menu, Past
Sessions…, will open a searchable panel of removed sessions with a Restore verb on each row, and
Restore will reuse the Phase 26.3 restore path. Rows older than 90 days will be pruned at manifest
open. There is no shortcut and no badge. Rows removed before this ships stay unrecoverable, on
purpose.

## 2. How a session leaves the manifest today

Five paths touch or delete a row.

| Path | Where | What happens to the row |
|---|---|---|
| End session | The context menu and the x on a live session (`src/renderer/app/session-actions.tsx:224-243`), the menu accelerator (`src/renderer/app/App.tsx:491-496`), the confirm (`src/renderer/state/store.ts:1181-1206`) | Kept. `killSession` captures a scrollback snapshot, kills tmux, then sets status `exited` (`src/main/sessions/core.ts:2391-2444`). Phase 26.3 already restores it. |
| Remove | The context menu and the x on an ended row (`session-actions.tsx:213-243`), the banner buttons (`src/renderer/app/TerminalRegion.tsx:349`, `src/renderer/app/split/SplitSurface.tsx:209`), the confirm (`store.ts:1255-1276`) | Deleted. `sessions:discard` (`src/main/restore/ipc.ts:28-32`) calls `discardSession` (`core.ts:2447-2466`), which calls `deleteSession` (`src/main/manifest/store.ts:1614-1618`). That is `DELETE FROM sessions WHERE id = ?` in a durable transaction. No tombstone. |
| Restart | The context menu (`session-actions.tsx:189-191`), `store.ts:1228-1253`, `src/main/restart/restart.ts:123` | The old row is deleted after the replacement exists, through the same `discardSession` path. |
| Failed create | Spawn threw | Deleted (`core.ts:2242-2243`). The user never saw the session. |
| Close project tab | `projects:remove` (`src/main/ipc.ts:131-145`) | Session rows kept. Only the project row is deleted, and the comment at `core.ts:2565` says sessions keep their history. |

The tombstone this request needs is already half built. `SESSION_STATUSES` includes `'discarded'`
(`src/shared/types.ts:71-79`). Reconcile already refuses to touch or resurrect a `'discarded'` row
(`store.ts:1867-1899`). The comment at `store.ts:1897` says nothing writes it yet, and the comment
at `types.ts:53` reserves it for the reversible remove named in research 33 entry 21. This phase is
the producer that comment waits for.

`discardSession` does three more things at remove time, beyond the row delete:

- it releases the conversation claim (`core.ts:2453`, `src/main/manifest/harvest/watch.ts:161`)
- it deletes every scrollback snapshot generation (`core.ts:2462`)
- it deletes the per-session Claude hook settings file (`core.ts:2463`)

## 3. What a row carries, and what survives removal

The full schema after migrations 001 through 009 (`store.ts:687-914`) is `id, name, tmux_name,
project_path, cwd, agent, agent_session_id, argv, resume_argv, env, status, created_at, last_seen,
exit_code, exit_signal, pane_pid, resume_capture, specstory, restore, agent_version,
agent_contract, resume_provenance, context_snapshot`. There is no ended-at column. `last_seen`
means "last confirmed alive in tmux" and is the closest thing to one.

A restore reads `name`, `agent`, `cwd`, `project_path`, `argv`, `resume_argv`, `agent_session_id`,
`agent_contract` and `specstory`, plus `created_at` for display. Every one of those fields is lost
on removal, because `deleteSession` is a hard DELETE.

What survives outside the manifest:

- The SpecStory capture markdown in the project's `.specstory/history`, when capture was on.
- The agent's own transcript store, e.g. `~/.claude/projects`. Tortie never deletes agent stores,
  so the conversation the deleted `agent_session_id` pointed at usually still exists. Only the
  pointer is lost.
- Ring backup generations that predate the removal, until they rotate out.
- The one-off keepsake file `manifest.pre-schema-7.db`, 73 KB, written at the schema 7 migration.
  It never rotates.
- `restore_attempts` rows for the removed session, until the next manifest open prunes them
  (`store.ts:1793-1799`).

## 4. Scrollback snapshots and SpecStory captures

Scrollback snapshots are deleted at removal, not pruned by age. `deleteSnapshot`
(`src/main/restore/snapshots.ts:700-710`) removes, under the same per-session lock a capture takes:

- every generation
- the capsule index
- the legacy file

Its only product caller is `discardSession`. While a session exists, a per-session ring keeps
`SNAPSHOT_GENERATIONS = 3` (`snapshots.ts:138`, prune at `snapshots.ts:648`, index at
`snapshots.ts:678-692`). There is no orphan sweep. The operator's snapshots directory holds 3
legacy `.txt` stems for sessions that no longer exist in any copy I could read, so a failed delete
leaves the file forever.

SpecStory captures are kept forever. Nothing under `src/main/specstory` or in `discardSession`
deletes anything from `.specstory/history`. `killSession` even queues a final capture sync before
the row goes quiet (`core.ts:2439`).

## 5. The backup ring does not serve this request

- `BACKUP_GENERATIONS = 5`, with a floor of 2 (`src/main/manifest/recovery.ts:325`).
- The cadence, from the `src/main/manifest/ring-schedule.ts` header, takes a generation at launch,
  at quit, at suspend, before a migration and on a manual request. An interval poll every 60 s
  takes at most one generation every 5 minutes, and only when the content changed.
- Reach in practice, measured on the operator machine on the day of writing. The 5 generations
  spanned 14:21 to 15:05, which is 45 minutes. An earlier listing the same afternoon spanned 13:52
  to 15:02, which is 70 minutes. On a busy day a removed row survives in the ring for under about
  an hour.
- No shipped path extracts one row. `restoreFromBackup` has one caller
  (`src/main/manifest/boot.ts:451`), runs only when the manifest is missing or damaged at launch,
  and replaces the whole file. "Rebuild the Session List…" (`reconstruct-operator.ts`) rebuilds
  from snapshot capsules and tmux stamps, not from the ring, and removal deletes the capsule.
- On the operator machine right now the ring holds zero removed rows. Every session id in
  generations 32 to 36 is still in the live manifest. The keepsake is the only file that still
  holds removed rows.

So today a deliberately removed row is not recoverable through any shipped path. Within the ring's
rotation window it is recoverable only by hand, with sqlite3 against a generation file.

## 6. Scale on the operator machine

| Measured | Value |
|---|---|
| Rows in the live manifest | 19, being 18 `idle` and 1 `exited` |
| Projects | 6 |
| Live tmux sessions on the socket at read time | 22, read a few minutes after the copy and not reconciled with the 18 idle rows |
| Rows in the keepsake file | 38 |
| Keepsake ids absent from the live manifest, removed in about 2 days | 25 |

The 25 removed rows break down as 12 claude, 5 shell, 2 codex, 2 cursor, 2 pi, 1 muse and 1
antigravity. Every removed row that was not a shell held both an `agent_session_id` and a
`resume_argv` when the keepsake was written. 24 of the 25 were `restorable` and 1 was `exited`.
The thing the operator wants back existed for all of them. The measured removal rate is 12.5 rows
per day.

## 7. Which agents record a resumable conversation id

All lines cite `src/main/agents/registry.ts`.

| Agent | How the id is captured | Registry line | Id present on the operator's removed rows |
|---|---|---|---|
| claude | Assigned at create with `--session-id` | 410 | Yes |
| cursor | Assigned at create through a `create-chat` side command | 466 | Yes |
| gemini | Assigned at create with `--session-id` | 588 | Yes |
| pi | Assigned at create. Resume requires the original folder | 978 | Yes |
| codex, deepseek, antigravity, muse, qwen | Harvested from the agent's own store seconds after first activity. The harvest can fail and be withdrawn (`store.ts:1598-1600`) | 519, 714, 782, 846, 907 | Yes, on every removed row |
| droid | Nothing captured. A docs-only row, not installed on any audited machine | 638 | No |
| shell | None, by design (`src/main/manifest/agents.ts:450,602`) | n/a | No |
| cursoride, copilotide | None. Capture only, never a tmux pane | 1028, 1059 | No |

The harvest starts in `startIdCapture` (`core.ts:2290-2303`). In the operator manifest every
non-shell row, live and removed alike, has a conversation id.

## 8. The three designs, compressed

### Design A, reopen from the Session menu

Remove writes the tombstone and its confirm dialog is deleted, so removal acts at once. The way
back is one shortcut, Cmd+Shift+T, which reopens the most recently removed session across all
projects with no dialog, plus a Recently Removed submenu in the Session menu holding the 10 newest
rows. Pressing the shortcut again reopens the next most recent. Tombstones prune at 30 days, and
`deleteSession` keeps exactly one caller, the pruner. The strongest property is speed. An
inadvertent removal is undone in about 10 seconds with one keystroke.

### Design B, a Past Sessions panel

Remove writes the tombstone and keeps its confirm, with new copy that names the way back. One item
at the bottom of the Session menu, Past Sessions…, opens a panel shaped like the existing create
modal. The panel lists every discarded row across all projects, newest first, with a search field.
Each row states before the click whether Restore continues the conversation or starts fresh,
computed from the row's own fields. Restore reuses the Phase 26.3 path, and a failed restore
leaves the row in the panel. Restart and failed create keep the hard delete. Rows are kept
forever, and a Delete Forever verb is the only hygiene.

### Design C, a submenu in the create menu

Remove writes the tombstone. The only surface is a Recently Removed submenu inside the ˅ menu
beside ＋ in the SESSIONS header, listing at most the 10 newest discarded rows of the active
project. A click restores at once with no confirm. Pruning keeps the 10 newest rows per project.
The design refuses a blind reopen shortcut and refuses an empty state. It keeps the hard delete
for Restart. It needs one bridge change, because the ui:popupMenu `MenuItemSpec` has no submenu
field today.

## 9. The verdicts

| Design | Verdict | The deciding reason |
|---|---|---|
| A, reopen from the menu | Rejected | Its rule that `deleteSession` keeps one caller tombstones Restart leftovers, which can put two live sessions on one conversation id. And its 10-row list holds under 1 day at the measured rate of 12.5 removals per day, so the intentional half of the request is unserved. |
| C, a submenu in the create menu | Rejected | A per-project cap of 10 rows holds about 5 days, so it cannot answer "what was that session last month". That is half the request. |
| B, a Past Sessions panel | Winner, with amendments | It serves both the browse half and the restore half of the request, and its per-row promise before the click is the only honest resume disclosure of the three. |

The findings from the adversarial round that shaped the amendments.

| Finding | Against | What the winner does |
|---|---|---|
| No design funds a removal timestamp. `last_seen` means "last confirmed alive", so a row that sat ended for 5 days and was then removed by accident sorts below rows removed 3 days earlier. | All three | Migration 010 adds `removed_at`, written at tombstone time, used for both the order and the visible date. |
| A blind shortcut launches an agent process without showing its name first, possibly an agent configured with its safeguards off, and repeated presses launch several processes across several projects. | A | No reopen shortcut. The name is read before the process starts. |
| The hidden reopen order, where each press pops the next row, is state the user cannot see. That is a new concept. | A | Refused along with the shortcut. |
| Keep-forever reaches about 1125 rows in 90 days at the measured rate, and it forces the Delete Forever verb into existence as the only hygiene. A prune is cheaper than a verb. | B | Delete Forever is dropped. Discarded rows older than 90 days are pruned at manifest open. |
| The label "ended Aug 12" computed from `last_seen` is admitted mislabeling. | B | The label reads "removed Aug 12", from `removed_at`. |
| The fresh-start case for the codex family is disclosed after the launch, not before the click. | A and C | B's per-row promise line is kept. |
| A restore verb inside the create menu is found by accident. | C | The home is a named item in the Session menu. |
| The submenu needs a new field on the ui:popupMenu bridge, and the admitted fallback is a flat section capped at 5 names. | C | Not needed. The panel uses no submenu. |

## 10. The winning interaction, stated in full

**Removing.** The Remove verb keeps its confirm. The copy becomes "Remove 'name'? It moves to Past
Sessions and you can restore it from there." Underneath, `discardSession` writes `status =
'discarded'` and stamps `removed_at` instead of running the DELETE. At remove time it still does
the disk hygiene it does today:

- it releases the conversation claim
- it deletes the scrollback snapshot generations
- it deletes the per-session hook settings file

So a later restore returns the conversation, not the screen, and the panel says so in plain words.

**Browsing.** One entry point. A "Past Sessions…" item at the bottom of the existing Session menu.
No badge anywhere. No count anywhere. Discarded rows never appear in the session list. The item
opens a panel shaped like the create-session modal, listing discarded rows from every project,
newest first by `removed_at`, with a search field that filters by name or project.

```
  Past Sessions
  [ Search by name or project                    ]

  fix-auth-refresh       claude    ~/gmux         removed Aug 12
    Continues the conversation                    [ Restore ]
  migrate-postgres       codex     ~/billing      removed Aug 11
    Continues the conversation                    [ Restore ]
  scratch-shell          shell     ~/gmux         removed Aug 10
    Starts fresh                                  [ Restore ]

  Sessions you remove are kept here for 90 days. Restore one to
  pick it back up. Capture files stay in each project's history
  folder.
```

Each row shows the session name, the agent, the working folder and the removal date. Below the
name sits one promise line, computed from the row's own fields. When `agent_session_id` and
`resume_argv` are both present it reads "Continues the conversation". Otherwise it reads "Starts
fresh". Restore is the only verb, so the panel needs no context menu.

**Restoring.** Restore runs the Phase 26.3 restore path. The row leaves `'discarded'` and rejoins
the session list under its own name, and the agent relaunches from the stored absolute
`resume_argv` in the original folder. Failures rise as failures:

- When the working folder no longer exists, restore fails with a plain error naming the folder,
  and the row stays in the panel. A failed restore is not a second loss.
- When the name is taken by a live session, the standard rename prompt appears prefilled. This
  depends on the uniqueness question in §12.
- When the agent's own store no longer holds the conversation, the agent prints its own error
  inside the session. Tortie does not pre-check the agent's store, because Tortie never deletes
  those stores and the label would go stale either way.

**Retention.** At manifest open, discarded rows whose `removed_at` is older than 90 days are hard
deleted through the existing `deleteSession`. At the measured rate of 12.5 removals per day the
panel holds about 1125 rows at the cap, and search keeps that browsable. 90 days covers "what was
that session last month" with margin.

**Refusals, in writing.** These bind the build.

- No reopen shortcut. Restoring starts a process, and the user reads the name first.
- No badge and no count anywhere. Nothing notifies. A removed session never needs the human now.
- No backfill from the backup ring or from the keepsake file. Rows removed before this ships stay
  unrecoverable through any surface.
- No Delete Forever verb. The prune is the only hygiene.
- No transcript viewer in the panel. The capture markdown already lives in the project tree.
- Discarded rows never appear in the session list. They never appear in search or in Context.
  They never signal, so status semantics do not move.
- Restart and failed-create cleanup keep the hard delete they have today.

## 11. The data work the winner requires

| Path | Today | The change |
|---|---|---|
| Remove, `discardSession` (`core.ts:2447`) | Hard DELETE | Writes `status = 'discarded'` and `removed_at`. Still releases the conversation claim. Still deletes the snapshot generations and the hook settings file. |
| Restart (`restart.ts:123`) | Hard DELETE | Unchanged. A tombstoned restart leftover would carry the same name as its live replacement and hazards a second live session on one conversation id. |
| Failed create (`core.ts:2242`) | Hard DELETE | Unchanged. The user never saw the session. |
| Prune | Does not exist | New. At manifest open, hard delete discarded rows with `removed_at` older than 90 days, through the existing `deleteSession`. |
| Reconcile (`store.ts:1867`) | Already refuses discarded rows | Unchanged, already verified. |
| Restore, the Phase 26.3 path | Consumes ended rows that are still listed | Must be verified to accept a row arriving from `'discarded'` and to re-acquire the conversation claim that removal released (`watch.ts:161`). |
| The promise line | Does not exist | A computed predicate, no new column. Both `agent_session_id` and `resume_argv` present gives "Continues the conversation", otherwise "Starts fresh". |
| Migration 010 | Schema ends at 009 | One nullable `removed_at` column. |

The build phase runs the data layer at Tier 3 and the browse surface at Tier 2. The full
verification plan is in the Phase 29 entry in docs/BACKLOG.md.

## 12. What is not true

- Whether the Phase 26.3 restore path accepts a row arriving from `'discarded'` and re-acquires
  the conversation claim that removal released is unverified. No design traced it. It is the one
  code-level unknown that could force rework, so the build phase proves it first.
- Whether session names are unique per project or globally is unverified. The answer decides the
  rename-on-conflict prompt.
- The 90-day retention figure is a chosen number, not a measured one. The measured inputs are 25
  removals in 2 days and a ring that rotates in 45 to 70 minutes. The alternative, a count cap
  near 200 rows, was not tested against real use.
- The 25 rows already removed on the operator machine stay unrecoverable through any surface. All
  three designs agree, and the winner keeps that refusal.
- The 3 orphan snapshot stems show that a failed snapshot delete leaves files forever. The winner
  keeps deleting snapshots at remove, so the orphan path stays reachable. A sweep is a small
  separate hygiene item, not part of this phase.
- Which of the three delete paths produced each of the 25 missing keepsake ids was not
  established.
- The 22 live tmux sessions and the 18 idle manifest rows were read minutes apart, and the
  `@gmux-id` marks on the live sessions were not inspected to reconcile the two counts.
- The resume behavior of droid and gemini is a registry claim, not something this research
  exercised.
