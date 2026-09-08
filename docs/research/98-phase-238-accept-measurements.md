# Research 98 — what an accept costs when the tab closes

Phase 238's MEASURE STEP. It answers one question with numbers and nothing else was built.

**The question the Phase 238 entry asks, and which can stop the phase:** *can accept honestly ship
against a baseline that dies with the tab?*

---

## 0. THE ANSWER

**A. ACCEPT SHIPS AGAINST THE IN-MEMORY BASELINE — but only with two conditions this measurement
found, and the first of them is not in the entry.**

1. **THE ACCEPT MUST PIN ITS OWN TAB, or a person loses an accept on the very next click.** The
   worst case is not the eleventh prose tab the entry expected. Measured in the running app: a
   redline opened the ordinary way, being ONE single click on a row in the Explorer, is the PREVIEW
   tab, and the next single click on any other file **recycles that tab object and destroys the
   baseline with it. One act.** The store already has the fix and it is not durability: `pin`
   (`src/renderer/editor/store.ts:742`) sets `preview: false`, and the preview slot only ever
   recycles a tab that is `preview && !dirty` (`:544`). Driven both ways in the same run: unpinned,
   8 changes → 0 (the accept is gone); pinned, the identical click, 8 changes → 8.
2. **The face must name the accept and its time**, which is mechanism item 2 of the entry already.
   Today the sentence is **byte-identical before and after every loss** and **no toast is raised by
   any of them** — measured, W1 and W3 below. A person cannot tell.

**With the pin in, the number that says a person will rarely lose one: TEN other files opened for
keeps.** That is the ten-tab cap, measured exactly rather than read: the draft left the strip on
pinned open number 10, the eleventh tab.

**Why A rather than B, in one line, and it is research 83 A3.4 confirmed rather than assumed:** an
accept writes **no file** (B.5: the file's md5 is unchanged), so losing one loses the *narrowing*
and nothing on disk, and the cost of the loss is re-accepting, which is seconds. The durable step is
priced in §4, is unchanged by anything here, and stays the operator's to queue.

**What is NOT true, and the face has to say it:** after a quit, a crash or a window reload, every
accept in the window is gone. That is measured too, and it is the residual A does not remove.

---

## 1. `MAX_TABS` and the eviction rule, read out of the real tree

| What | Where |
| --- | --- |
| `const MAX_TABS = 10;` | `src/renderer/editor/store.ts:102` |
| The LRU eviction, `if (tabs.length > MAX_TABS)` | `src/renderer/editor/store.ts:554` |
| The PREVIEW recycle, `tabs.find((t) => t.preview && !t.dirty)` | `src/renderer/editor/store.ts:544` |
| A new tab starts with no baseline, `baseline: NO_BASELINE` | `src/renderer/editor/store.ts:531` |
| `pin`, which is what a double-click does | `src/renderer/editor/store.ts:742` |
| The baseline rule itself | `src/renderer/editor/baseline.ts`, `nextBaseline` at `:85` |
| The sentence on the face | `baselineName` `:161`, `baselineSentence` `:180`, composed at `RedlineDocument.tsx:419` |

The eviction rule in full, and both halves of it matter:

```ts
const slot = keep ? undefined : tabs.find((t) => t.preview && !t.dirty);
if (slot !== undefined) { disposeModels(slot.id); dropViewState(slot.id); tabs = tabs.map(...); }
else {
  tabs.push(tab);
  if (tabs.length > MAX_TABS) {
    const evict = tabs.filter((t) => !t.dirty && t.id !== tab.id && t.id !== s.activeId)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];
    ...
  }
}
```

**Two roads to the same loss, and the first is far shorter than the cap.** The `slot` branch is the
one nobody counts: a preview tab is REPLACED, not evicted, and the cap never enters into it.
`keep` is `req.preview === false` (`:424`), which is what a double-click, ↩, a search hit and an SCM
row send; a plain single click in the Explorer sends `preview: !keep` with `keep = false`
(`src/renderer/tree/FileTree.tsx:510`), so it is a preview open.

**Only DIRTY tabs are protected from eviction.** A redline tab that has been accepted into but not
typed in is clean, so it is an ordinary eviction candidate.

---

## 2. THE APP RUN: how many ordinary acts it takes to lose an accept

`build/probe-p238-accept-lifetime.mjs`, `npm run probe:p238`. One Electron through
`build/electron-run.mjs` on a scratch profile, a scratch HOME and its own tmux socket
(`gmux-p238-*`, ended and unlinked by `build/harness-socket.mjs`; `gmux` and `default` refused by
name). No agent, no token, no keychain, no request, no ssh, no machine. The operator's own `-L gmux`
sessions read **19 before and 19 after**. The "agent" writing from outside is a plain `/bin/sh`
running `cat`. `--self-test` proves the grader on 8 fixtures and launches nothing.

### 2.1 Why an untracked file's baseline stands in for an accept, and it is not an approximation

There is no accept in the tree yet — that is the phase this measures for. Research 83 B.3 says what
an accept **is**: it writes THE BASELINE and never the file, so an accept leaves the tab holding a
baseline string that exists in no file, no commit and no store. **An untracked file's baseline
already has exactly that shape today**: `nextBaseline` seeds it from the first bytes Tortie read and
then never moves it, however far the disk travels. So:

```
1. open draft.txt (untracked)   -> baseline := v1, in memory only, BaselineOrigin 'read'
2. a shell writes v2            -> the redline draws v1 -> v2 as 8 changes
3. do ONE ordinary act
4. bring the file back and count the changes
```

A tab that **survived** still draws 8, because its baseline is still v1. A tab that was destroyed
and remade re-seeds from the bytes on disk, which are now v2, so it draws **zero**. Zero is the
detector, and it fires on precisely the event an accept dies to, because the same field of the same
tab object carries both.

The DIRECTION of the loss differs and the report does not hide it: losing an accept makes marks come
BACK, losing this one makes marks GO. What is measured is identical — whether the tab's `baseline`
survived the act.

### 2.2 The control, which is what makes every "died" a reading rather than a stuck needle

**C1. The same journey with the tab PINNED and the cap not reached** — three other files opened for
keeps, four tabs at the widest, then back to the draft. **8 changes → 8. SURVIVED.** The detector can
say survived in the running app, so the four losses below are losses.

### 2.3 The acts, and the number

| Act | Ordinary acts needed | Reading | Verdict |
| --- | --- | --- | --- |
| **A1. ONE single click on another file in the Explorer** | **1** | 8 changes → 0; the strip went from `[draft.txt (preview)]` to `[filler01.txt (preview)]` — the tab object was replaced | **died** |
| **P2. the SAME single click with the draft tab PINNED** | — | 8 changes → 8; four tabs on the strip, the draft still among them | **survived** |
| **A2. files opened FOR KEEPS past the cap** | **10** | the draft left the strip on pinned open number 10 (the eleventh tab); 8 changes → 0 | **died** |
| **A3. closing the tab and opening the file again** | **1** | 8 changes → 0 | **died** |
| **A4. a window reload** | **1** | 8 changes → 0 | **died** |

The eviction walk, step by step, so the number 10 is counted rather than inferred:

```
filler01 -> 2 tabs, draft on the strip      filler06 -> 7 tabs, draft on the strip
filler02 -> 3 tabs, draft on the strip      filler07 -> 8 tabs, draft on the strip
filler03 -> 4 tabs, draft on the strip      filler08 -> 9 tabs, draft on the strip
filler04 -> 5 tabs, draft on the strip      filler09 -> 10 tabs, draft on the strip
filler05 -> 6 tabs, draft on the strip      filler10 -> 10 tabs, DRAFT GONE
```

### 2.4 What the person sees when it goes, which is the second half of the question

**Nothing.**

- **W1. No toast of any kind was raised by any of the four acts.** `toasts` read empty at every
  reading.
- **W3. The sentence on the face is the same string before and after every loss**, six readings, all
  of them exactly:

  > `Marked since you opened this file, for as long as this tab is open.`

  It is the same before the agent wrote, while eight changes were drawn, and after each of the four
  destructions. It carries no time, so a tab opened this morning and one re-seeded a second ago read
  identically. (Phase 239 item 5 owns that sentence's other three problems; this one is Phase 238's,
  because an accept is what makes the sentence a claim about something a person did.)
- **The redline silently re-fills.** In the accept direction: the change the person said was fine
  comes back, marked, with nothing said. In this run's direction the eight marks vanished. Either
  way the document redraws and the face is unchanged.
- **A2d, one thing that DOES change and is worth having:** the reopened tab came back **in Redline
  mode** (`Redline: on`), because the mode is remembered per path. So a person is looking at the
  redline when it re-fills, rather than being dropped into File view — which makes the silence worse,
  not better.

---

## 3. How many editor tabs he actually holds: NOT RECORDED, and here is the adjacent number that is

**Editor tabs are recorded nowhere.** Read from his live manifest, read only, over a copy of
`manifest.db`, `-wal` and `-shm` (his `-shm` was present, so no read-only open could create one):
the tables are `meta`, `projects`, `sessions`, `migrations`, `restore_attempts`, `remote_projects`,
`remote_executions`. `sessions` has 30 columns and none of them is a file. The renderer persists
`gmux.editorWidth`, `gmux.minimap`, `gmux.markdownMode`, `gmux.diffSideBySide` and `gmux.tabOrder`
(which is PROJECT tabs), and no tab list. **So how many editor tabs he holds at any moment is not
knowable from anything Tortie keeps, and this document does not guess it.**

**What IS recorded is every file he opened**, in `gmux.quickopen.recents`
(`src/renderer/quickopen/recents.ts:40`), capped at `MAX_RECENTS = 50`. Read from a copy of his
Local Storage leveldb, read only. The list was **full at 50**, spanning **2026-09-03 15:28:46 to
2026-09-08 14:33:37**, across **5 repositories**:

| Day | File opens |
| --- | --- |
| 2026-09-03 | **40** (and this is a LOWER BOUND — the 50-entry cap truncates the start of that day) |
| 2026-09-05 | 1 |
| 2026-09-07 | 5 |
| 2026-09-08 | 4 |

- **Most opens in any 5-minute window: 17.** (`16:42:28`–`16:43:30` on 2026-09-03 alone is 13 files
  in 62 seconds, `web/` and `src/runner/` in `specfactory`.)
- **Most opens in any 60-minute window: 18.**

**What that does and does not prove.** The recents list counts OPENS, not tabs, and it cannot say
which were preview and which were for keeps, so it does not settle how often the ten-tab cap is
crossed. What it does settle is that **an afternoon of his opens dozens of files across several
repositories in bursts**, which is the traffic both loss roads sit on: 40 opens in a day against a
cap of 10, and 17 in five minutes against a preview slot of 1.

---

## 4. What a durable baseline would actually cost, priced honestly

### 4.1 The write price, re-derived on THIS tree rather than quoted

Research 83 A3.3 measured `writeDurable` at 9.0 ms median for 126 KB. Re-derived through the same
SHIPPING `src/main/durable/write.ts`, ten runs each, own scratch directory removed in a `finally`
(`build/p238/durable-cost.mts`):

```
ZEN-OF-TORTIE.md (a small doc)     bytes=     7998 min= 8.9ms median= 9.9ms max=30.2ms
CLAUDE.md (this tree p99)          bytes=   136148 min= 9.0ms median= 9.9ms max=10.2ms
docs/BACKLOG.md (this tree max)    bytes=  2910545 min=13.9ms median=16.2ms max=18.8ms
```

**The price stands.** 9.9 ms against the recorded 9.0 for a p99 prose file, and 16.2 against 15.1 for
the largest file in the tree. It is not the obstacle.

### 4.2 What already exists, read rather than assumed

| Piece | State |
| --- | --- |
| The durable write sequence (research 34 §4, steps 1–8) | **exists**, `src/main/durable/write.ts`, 410 lines, one owner |
| The generation ring — `nextGeneration`, `pruneGenerations`, `readVerified` | **exists**, `src/main/durable/generations.ts`, 243 lines |
| `SNAPSHOT_GENERATIONS = 3`, the ring depth next door | **exists**, `src/main/restore/snapshots.ts:139` |
| The key shape `(repo_path, rel_path)` | **precedent exists**, `src/main/symbols/persist.ts:75` and `src/main/arch/db.ts:386` |
| A directory under `<userData>/gmux/` | **precedent exists**, `snapshotsDir()` at `src/main/restore/snapshots.ts:368` |

### 4.3 What does NOT exist, and it is the real cost

1. **The renderer cannot reach `writeDurable` at all.** Every caller today is inside main
   (`manifest/reconstruct.ts`, `manifest/recovery.ts`, `restore/snapshots.ts`). The baseline lives in
   the RENDERER, on the tab. So a durable baseline is a **new domain in main plus a new channel pair
   in the shared contract** — nothing in `src/shared/ipc/` names an editor baseline today (the
   `baseline` in `arch.ts` is `docs/arch/baseline.json`, a different thing). That regenerates
   `docs/audits/contract-baseline.txt` and moves `gate:contract`.
2. **A load-time HEAD comparison, which today's code does not need and a durable baseline cannot do
   without.** Research 83 A4.2 ruling 2 caveat: `ensureWatcher` is in-process and lazy, so *quit,
   `git checkout other-branch`, relaunch* moves HEAD while nothing is watching. That is moot for the
   in-memory baseline, which dies with the process, and becomes live the day it does not.
3. **A prune policy the ring does not give for free.** Snapshots key on a session id and are pruned
   with it. A baseline keyed on `(repo_path, rel_path)` accumulates one entry per prose file ever
   opened, in every repository, for ever, and nothing deletes the repository.
4. **A staleness rule.** An accepted baseline written on Monday and read on Friday against a file
   three commits along is a redline that means nothing; today's baseline cannot be stale because it
   cannot outlive the window.

**None of that is in Phase 238, and none of it should be pulled in under another name.** It is a
phase, its price is measured, and it is the operator's to queue.

---

## 5. What this measurement asks Phase 238 to do

1. **Ship accept against the in-memory baseline.**
2. **The accept pins its tab** — `pin` already exists and the app run proves it turns the one-act
   loss into no loss at all. It is one call in the accept path and it is not durability.
3. **The face names the accept and its time**, per entry item 2 and research 83 A4.2 ruling 1, and
   says the marking lasts as long as the tab is open, because today's sentence is byte-identical
   across a loss and no toast is raised.
4. **Nothing in the surface may read as a backup.** Research 83 A3.4: a person who believes Tortie
   holds their history stops committing, and that is worse than the feature not existing. Accept
   writes no file; the sentence must not imply otherwise.

## 6. What was NOT measured, so a builder does not pretend otherwise

- **A quit and a crash were not driven.** A window reload was, and it is the same mechanism — the
  renderer's module state goes — but a real quit and a real crash were not measured in this run.
- **Two windows on one file** were not driven. Research 83 A9 already records it as unmeasured, and
  B.8a names it as the second way the generation can move under a press.
- **How often HIS redline tabs are preview versus for keeps** is not knowable: the recents list does
  not record the gesture, and no tab list is persisted anywhere.
- **The accept function itself was not written or run.** This is the measure step; the stand-in is
  argued in §2.1 and is a property of the same field of the same object, not of accept's arithmetic.
