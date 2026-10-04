# Phase 320.2: the Read Last Lines window removed everywhere (SPEC)

Subject: `feat(machines): remove the Read Last Lines window, because a session on another machine now scrolls back`
First body line: `Phase 320.2: the Read Last Lines window removed everywhere`
Semver: Minor, unreleased. Tier 2 (reasons in §10). Written 2026-10-04 in `/private/tmp/wt-p3202`, a detached worktree at
origin/main `d9f98b54`, read from the tree, nothing committed, staged or stashed.

Charter, in his words: "I want it behavior EXACTLY like a local session... like i don't want this in the app anymore", and
his ruling of 2026-09-30, "Remove it everywhere". The entry is `docs/BACKLOG.md` "## Phase 320.2" (lines 39541 to 39637 at
this head). 320.1 landed as `62f832ae`: a session on another machine scrolls over that machine's control connection on tmux
3.6, 3.6a, 3.6b, 3.7b and 3.7c (`MEASURED`, `src/main/machines/__tests__/p324-stale-acceptance.test.ts:129`), and "Fall back
to today" everywhere else, where only full-screen programs that use the mouse scroll (`build/p3201/SPEC.md`, the two
`§As built` sections of 2026-10-02 and 2026-10-03). Research 57 section 3.1 ruled for this window as the smaller affordance
AGAINST a real remote scrollbar; 320.1 is the scrollbar, so the window's ground is gone.

The binding rule beside it is his standing one: no scenario worse than today, except the one he ruled, being that the window
is gone and that on a tmux 320.1 did not measure, a session on another machine shows only its screen.

---

## 0. What this spec found that the entry's list did not

The entry's file list (`docs/BACKLOG.md:39566-39594`) was read line by line against the tree. Every line of it holds. These
are the pieces it did not name, each found by the scan in §13 and by reading:

| Found | Where | Why it matters |
| --- | --- | --- |
| The whole `sessions.ts` contract family is this channel and nothing else | `src/shared/ipc/machines/sessions.ts` (180 lines, 9 exports, all the window's) | It is deleted, not trimmed (D2), which moves the barrel's family count from nine to eight |
| The machines contract's member list | `src/shared/__tests__/p125-machines-surface.test.ts` (7 members at 125-131, 268-275, 450-456; `'sessions'` at 152) | Red the moment `sessions.ts` goes, until it is edited |
| Two shared-contract prose counts | `src/shared/__tests__/ipc-invoke-closure.test.ts:33,83-85`, `build/assert-import-boundaries.mjs:42-44`, `build/machines-conformance-probe.mts:224-227` | "nine domain files" becomes false |
| Liveness classification | `src/main/machines/liveness.ts:185,208-209` and `src/main/machines/__tests__/p231-liveness.test.ts:105,167-173,322-326` | The entry named `liveness.ts`; its test pins 23 channels, two `feed` channels, and an ablation anchored on the removed line |
| The feed question's comment | `src/main/machines/remote-run.ts:147-148` | Names "the lines of one session" |
| Three sibling files cite the window as the pattern they copied | `src/renderer/scm/RemoteRunsSection.tsx:151`, `src/renderer/scm/p105-runs-shot.ts:6`, `src/renderer/scm/__tests__/p105-remote-runs.test.tsx:13-14`, `src/renderer/machines/runs.ts:27-28`, `src/renderer/machines/branch.ts:27-28` | Each names a file or channel that no longer exists |
| Two lazy-door and probe-loader tests | `src/renderer/app/__tests__/p165-lazy-doors.test.ts:104,198`, `src/renderer/app/__tests__/p127-probe-loader.test.ts:85,96` | `p165` reads `RemoteLinesModal.tsx` and goes red when it is gone |
| The p95 drive's note | `src/renderer/terminal/p95-scroll-drive.ts:68-73` | Says "the read stays in the terminal's context menu" |
| **`probe:p320` starts the app with NO hidden-agents guard** | `build/p320/probe-p320.mjs` (no import of `build/hidden-agents.mjs`) | A `GMUX_PROBES` launch version-probes every agent its detection scan resolves, and the hard rule is that gemini, qwen, agy and grok are never started. The verifier's app run IS `probe:p320`, so the guard goes in first (D9) |
| `probe:p96` photographs the window | `build/probe-p96-remote-surfaces.mjs:434-436` (`Page.captureScreenshot`), called at 668, 683, 731 | Its expected list is updated, and it is NOT run in this phase: no screenshot is the rule (D10) |
| The demo bridge catalogue and the probe directory table | `demo/bridge/API-CATALOG.md:28,554,607-608`, `DEVELOPMENT.md:243` | Name the member and `probe:p100` |
| An Unreleased CHANGELOG item about the window | `CHANGELOG.md:28` ("Read Last Lines no longer says a session kept nothing more…", `b28d0eb4`) | It describes a window no person will ever see, since the window goes before any release (D12) |
| `stripControls` loses its only importer | `src/main/restore/snapshots.ts:650-656` | Phase 100 exported it for one caller; the function stays and the export goes (D4) |
| Two present-tense sentences in the p95 drive (found by the attack, §Attack A1) | `src/renderer/terminal/p95-scroll-drive.ts:61-63` and `:103-106` | "It is a button that opens the last lines panel now": false since 320.1 deleted the button and doubly false once the panel goes. No needle matches them, so only reading finds them |
| A remote session's live menu has no Scrollback row (§Attack A2) | `src/main/sessions/core.ts:3033-3036` (`tmuxIdOf` reads `liveIds`, this Mac's reconcile bindings only) and `src/main/scrollback/service.ts:203-209` | In the running app a session on this Mac's menu carries `Scrollback …` and a remote one does not, so R5's equality must drop that row from both sides or HEAD reads a false finding |
| `probe:p320` runs every remote arm before any arm touches this Mac (§Attack A3) | `build/p320/probe-p320.mjs:43-48` and `:2396-2399` (320.1's D13) | R5's local menu cannot be read inside the remote group; it is read in the "THEN THIS MAC" block and R5 gets two parts |
| The tortie.sh documentation lists the row (§Attack A9) | `/Users/gdc/tortiedotsh/src/data/docs.ts:569` (another repository, read only) | Owed at release, not this commit (§12) |

Confirmed and NOT moved: `HELPER_USER_FLOOR` stays 163 (`build/assert-electron-teardown.mjs:396`; `probe-p100-lines.mjs`
imports no `electron-run.mjs`; measured 163 of 163). `RUNNER_CALLER_FLOOR` stays 51 (`build/assert-hermetic-checks.mjs:279`):
`probe-p100-lines.mjs` is a `tsxCli()` caller, so the count goes from 53 to 52, still above the floor; the commit body names
the file. No `GMUX_*` env name disappears (each name in the deleted files is used in 44 to 232 other files), so
`[env.names]` does not move. `capture-pane` stays on the verb ledger (`src/main/machines/exec-plane.ts:287-295`), read by
the capsule, the remote screen read and `remote-arm.ts`. No application menu, keymap entry, session-row menu or tab menu names
the row (grep of `src/main/menu.ts`, `src/shared/keymap.ts`, `src/renderer/app/session-actions.tsx`, `menu-actions.ts`,
`shell-actions.ts`: nothing). Nothing under `ios/` or `docs/design/` names it.

---

## 1. Decisions, each with where it comes from

- **D1. Delete, do not hide.** Every file that exists only for the window is deleted, with its tests (the entry's mechanism 1,
  and "Remove it everywhere"). Seven window files, the contract family, and the probe: §2.
- **D2. `src/shared/ipc/machines/sessions.ts` is deleted whole.** Its nine exports are the channel's input, result, mode, four
  constants, its channel map and its bridge method; nothing else lives there. An empty family file would be a door to nothing.
  The barrel then composes eight families, and every prose count that says nine is corrected in the same commit (growth
  guardrail: one module, one responsibility; a stale count is a false sentence).
- **D3. The gates are turned around, not deleted** (the entry's mechanism 3). Condition 54 of `conformance:machines` keeps its
  number and becomes the window's ABSENCE (§5.1). Its old 54b, research 57 section 3.1's refusal for the EXEC PLANE, which
  320.1's block cites twice (`build/conformance-machines.mjs:304` and `:10952`), is kept executable by reading it from the
  ledger instead of from a module that is gone. Its old 54f (`capture-pane` is a safe read) stays, because the capsule, the
  remote screen read and the arming read still ride on that row.
- **D4. `stripControls` stays and stops being exported** (`src/main/restore/snapshots.ts:656`). The entry says "the function
  stays"; Phase 100 exported it for its one caller (`snapshots.ts:650`), that caller is gone, and the function is still used
  at `:614`. No test or build script imports it once `remote-lines.ts`, its test and `probe-p100-lines.mjs` are gone (grep).
- **D5. The scan covers every text file under `src/`, tests included, with ONE named exception that must still match.** The
  entry asks for "no … string anywhere under `src/`". A test that pins absence must not spell the needle, so the new tests
  compare menus by equality and name no removed label (§3.2). The one file that must keep the spellings is Phase 320.1's band
  test, `src/renderer/app/__tests__/p95-strip-note.test.tsx`, which writes the three band names 320.1 deleted (`GONE`, line
  82) and the band's words (`BAND_WORDS`, line 87) to prove them absent. It is exempt for that one needle family only, and the
  exception fails when it stops matching, so it cannot rot (the house pattern of `conformance:samefolder` rule 23).
  REVISED BY THE ATTACK (§Attack A5, A6): a file is read unless its extension is a known binary one or its first 8 KB hold
  a NUL byte, so a new text extension cannot hide a spelling; and the basename rule anchors `read-lines` on a word start, so
  a later `thread-lines.ts` is not a finding.
- **D6. Contract change: the baseline is regenerated** (CLAUDE.md obligation 3). Exactly two lines move (§7).
- **D7. A new attack, `ablation:p3202`** (`build/p3202/ablation.mjs`): fifteen arms (thirteen as written, two added and one
  re-aimed by the attack, §Attack A7), each puts ONE piece back and must read red
  on the sub-clause of condition 54 that owns it (the entry's "each shown red by a one-clause ablation that puts one back").
  Modelled on `build/p324/ablation.mjs` (owner tags read from the gate's `  - 54x:` lines, files restored by sha256, a planted
  file unlinked, signal handlers, a foreign-edit guard).
- **D8. The app run is `probe:p320`, with R5 regraded** (the entry names "probe:p320's R5 arm"). The menu is read as MAIN
  built it: over the node inspector, `Menu.prototype.popup` is replaced by a recorder that opens nothing and closes at once, and
  a REAL right-click goes in over DevTools. Why not the Phase 198 knob (`GMUX_SHOT_POPUP_PICK`, `src/main/menu-popup.ts:94`):
  it answers only under `GMUX_SHOT`, and a non-empty `GMUX_SHOT` dispatches the screenshot harness
  (`src/main/harness/index.ts:637-703`), which this round forbids. The inspector route needs no product or harness change and
  works at the parent too, so the parent is measured by the same script. REVISED BY THE ATTACK (§Attack A2 to A4): the
  local menu is read in the "THEN THIS MAC" block, never inside the remote group; the equality drops every `Scrollback …` row
  and every `Read Last Lines` row from both sides before comparing, so the parent fails on exactly its window clauses (five,
  with the bundle read the attack added, A12) and HEAD is not failed by a row main never draws for a remote session; each
  half opens and closes its own main inspector session.
- **D9. `probe:p320` gains the hidden-agents guard** before anything else changes in it (`build/hidden-agents.mjs`, the shape
  `build/p326/probe-p326.mjs:1140,1415-1419,1456` uses): the checkout's own overlay parser is asked first, a scratch
  `<profile>/gmux/config/agents.json` renames the five, and the app's own `agents:list` is read back before any arm. Source:
  the round's hard rule, "Never start gemini, qwen, agy or grok", and the header of `build/hidden-agents.mjs`, which says a
  `GMUX_PROBES` launch is the one the guard still exists for.
- **D10. `probe:p96`'s expected list is updated and the probe is NOT run.** It photographs the window
  (`shoot`, `build/probe-p96-remote-surfaces.mjs:434-436`, called at 668, 683 and 731), and no screenshot is the rule. The menu
  evidence is R5 (§9.2).
- **D11. The handler's absence is read through public Electron API**, not an internal: from main's inspector,
  `ipcMain.handle(channel, …)` throws "Attempted to register a second handler" exactly when a handler exists; when it does not
  throw, the dummy is removed in the same synchronous turn. `machines:listFiles` is the control and must read present, or the
  clause is UNREADABLE and never a pass (§5.3).
- **D12. The Unreleased item about the window goes from CHANGELOG.md** (line 28), and one new item says the window is gone and
  names the tmux limit (§8). Source: CHANGELOG's own rule, "nothing a person will not hit", and the window going before any
  release (his rule "No release until the phone works" holds this batch unreleased). REVISED BY THE ATTACK (§Attack A8): the
  limit clause no longer says a session there "shows only its current screen", which is false for a full-screen program that
  uses the mouse (`b28d0eb4`'s own item, CHANGELOG.md:27, says those scroll on any tmux); it names what a person will hit, a
  plain shell or an agent that prints ordinary lines.
- **D13. Docs outside the two builders' trees go to the integrator**: `CHANGELOG.md`, `docs/audits/contract-baseline.txt` (both
  named by the brief), and `CLAUDE.md`, `DEVELOPMENT.md`, `demo/bridge/API-CATALOG.md` (outside `src/` and `build/`, so neither
  builder may touch them). `docs/BACKLOG.md` is not touched by the phase commit; the follow-up docs commit writes the running
  log line and the CHANGELOG link (CLAUDE.md, "Release notes"). REVISED BY THE ATTACK (§Attack A10): the CLAUDE.md row's
  Touching column gains the files where each piece of the window lived, not "any text file under `src/`", which would have
  turned a path-triggered gate into one every commit runs.
- **D14. Historical prose is left where it is history**, and corrected where it would now be false. A header that lists which
  phase added which channel keeps its list and gains "Phase 320.2 removed Phase 100's"; a present-tense count is corrected and,
  where it was already stale, says so rather than quietly fixing it (the house style). Pre-existing stale counts this phase does
  not touch stay as they are (`src/main/machines/ipc.ts:7`, "Twenty four channels"). Named by the attack so a verifier does
  not report them as this phase's: `src/renderer/app/App.tsx:14` ("The fourteen screenshot drives"),
  `src/main/index.ts:399` ("holds the fourteen probe modules") and `src/renderer/app/__tests__/p127-probe-loader.test.ts:56`
  ("all fourteen probe modules") count Phase 127's move; the registry has held far more than fourteen since (52 imports
  today), so each was stale before this phase and stays as it is. Line 85 of that test is corrected only because its own list
  loses an entry.

---

## 2. Deleted (eight source files, one probe)

| File | Lines | Builder |
| --- | --- | --- |
| `src/renderer/app/RemoteLinesModal.tsx` | 361 | renderer |
| `src/renderer/app/remote-lines.css` | 129 | renderer |
| `src/renderer/machines/read-lines.ts` | 175 | renderer |
| `src/renderer/app/p100-lines-shot.ts` | 254 | renderer |
| `src/renderer/app/__tests__/p100-remote-lines.test.tsx` | 783 | renderer |
| `src/main/machines/remote-lines.ts` | 282 | main |
| `src/main/machines/__tests__/remote-lines.test.ts` | 361 | main |
| `src/shared/ipc/machines/sessions.ts` | 180 | main |
| `build/probe-p100-lines.mjs` | 843 | main |

The seven window files are exactly the files under `src/` whose basename matches `/remote[-_]?lines|read[-_]?lines|p100[-_]?lines/i`
today (`find src`, §13), which is condition 54a's second rule.

---

## 3. The renderer builder (`src/renderer/**` and its tests)

### 3.1 Production edits, by path and line at `d9f98b54`

1. `src/renderer/terminal/terminal-menu.ts`
   - Delete lines 19-21, the `Read Last Lines…` entry in the header's drawn menu. Lines 16-18 stay as they are.
   - Delete lines 42-44, the Phase 100 comment and `import { READ_LAST_LINES_ITEM } from '../machines/read-lines';`.
   - Delete lines 226-247, the Phase 100 block (`if (!onThisMac) { … }`) and the blank line after it, so line 224's `}` is
     followed by one blank line and `items.push('sep');`.
2. `src/renderer/state/sessions-slice.ts`
   - Line 33 `InstalledGmuxApi,` and line 35 `MachineSessionLinesResult,`: delete both from the type import (31-37).
     `InstalledGmuxApi` has no other use once `machinesExtras` goes (its only other site is line 695); `noUnusedLocals` is on.
   - Delete lines 40-42 (the Phase 100 comment and `import { REMOTE_SESSION_LINES_DEFAULT } from '@shared/ipc';`).
   - Line 304: "the way `machinesExtras` below reads its own." becomes "the way `sessionsBridge` below reads its own."
     (`sessionsBridge`, line 764, reads the bridge at call time.) `conformance:manager` reads this file; run it (§10.1).
   - Delete lines 447-489, the interface members `remoteLinesSessionId` to `closeRemoteLines`.
   - Delete lines 691-700, `machinesExtras` and the blank line after it.
   - Delete lines 1772-1859, the implementation and the blank line after `closeRemoteLines`'s `},`, so line 1770's `},` is
     followed by one blank line and `noteTerminalInput(sessionId) {`.
   - `errorText` and `gmuxBridge` stay (10 and 3 other uses).
3. `src/renderer/app/lazy-modals.tsx`: delete lines 86-92 (`RemoteLinesModalLazy` and the blank line after it).
4. `src/renderer/app/modals.ts`: delete line 26. In the header, "Rollup emits the eight sheets and the remote directory picker"
   becomes "Rollup emits these sheets and the remote directory picker", and "it is eight re-exports" becomes "it is seven
   re-exports"; after line 13 add one sentence: "Phase 320.2 took the last lines panel out, with its menu row and its channel."
5. `src/renderer/app/App.tsx`: line 80 "The eight sheets" becomes "The seven sheets"; delete line 90
   (`RemoteLinesModalLazy,`); delete lines 396-400 (the Phase 100 comment and `<RemoteLinesModalLazy />`). Line 24 is Phase
   165's history and stays.
6. `src/renderer/app/probe-registry.ts`: delete lines 101-104 (the Phase 100 comment and both imports from
   `./p100-lines-shot`), lines 262-271 (the `remoteLines?` field and its doc comment), and lines 661-667 (the Phase 100 drive
   block). This is the harness knob.
7. `src/renderer/terminal/p95-scroll-drive.ts:68-71`: "PHASE 320.1 deleted the button itself: a session on another machine
   scrolls like one on this Mac now, and the read stays in the terminal's context menu." becomes "… scrolls like one on this
   Mac now, and Phase 320.2 removed the read it opened, menu row and all." The rest of the comment stays.
8. `src/renderer/scm/RemoteRunsSection.tsx:151`: end the sentence at "by a test at all." (delete ", which is the shape
   ../app/RemoteLinesModal.tsx already uses").
9. `src/renderer/scm/p105-runs-shot.ts:6`: "It follows ../app/p100-lines-shot.ts, which is the nearest working sibling."
   becomes "It follows the shape of Phase 100's drive, which Phase 320.2 removed with the window it opened."
10. `src/renderer/machines/runs.ts:27-28`: "That is the shape `machines:listFiles` and `machines:readSessionLines` already use,"
    becomes "That is the shape `machines:listFiles` already uses,".
11. `src/renderer/machines/branch.ts:27-28`: "the shape `machines:readRuns` and `machines:readSessionLines` already use." becomes
    "the shape `machines:readRuns` and `machines:listFiles` already use."
12. (ADDED BY THE ATTACK, §Attack A1) `src/renderer/terminal/p95-scroll-drive.ts`, two present-tense sentences no needle
    matches:
    - Lines 61-62: "It was a span saying that scrolling back was not available. It is a button that opens the last lines
      panel now." becomes "It was a span saying that scrolling back was not available, and Phase 100 made it a button that
      opened the last lines panel."
    - Lines 103-105: "It is a button that opens the last lines panel now, with class `strip-readback`." becomes "Phase 100
      made it a button that opened the last lines panel, with class `strip-readback`." The rest of both comments stays.

### 3.2 Tests

1. `src/renderer/app/__tests__/p100-remote-lines.test.tsx`: deleted (§2).
2. `src/renderer/terminal/__tests__/terminal-menu.test.ts`: replace lines 242-294 (the Phase 100 `describe`) with a Phase 320.2
   `describe` of two cases that NAME NO REMOVED LABEL (D5). A helper renders a built menu as rows, `'sep'` as `—` and an item as
   its label with ` (off)` when disabled.
   - "a session on another machine has the menu a session on this Mac has, less the two history presets": with a terminal
     registered and the same selection snapshot for both, the remote rows equal the local rows with `Capture Last 250 Lines`
     and `Capture Last 1,000 Lines` removed and `Clear` read as `Clear (off)`, exactly, separators included. Red at the
     parent, where the remote menu carries one more row after `Capture Selection`.
   - "with no terminal mounted, a session on another machine has exactly the menu a session on this Mac has": no terminal
     registered; the two row lists are equal. Red at the parent, where the remote menu carries a separator and one row more.
   - The Phase 96 `describe` (188-240) stays as it is.
3. `src/renderer/app/__tests__/p95-strip-note.test.tsx` (it stays the gate's one exception, D5):
   - Header lines 14-17: "The panel stays, opened from the terminal's menu beside this Mac's capture items
     (build/p3201/SPEC.md D16)." becomes "Phase 320.2 removed the panel and its menu row as well, so nothing on any surface
     opens it (build/p3202/SPEC.md)."
   - Delete line 76 (`const lines = await import('../../machines/read-lines');`).
   - Lines 194-195: rewrite the comment so it names no file that is gone: "A longer name that holds one, like the tooltip
     constant Phase 320 deleted, must not read as the name itself." (The spelling `p100-remote-lines` on line 194 is of
     another needle family and would fail the gate; the exception covers only the menu-row family.)
   - Line 203: `{ ...actions, ...lines }` becomes `{ ...actions }`.
   - Delete lines 207-228, the "What stays" section header and its `describe`.
   - Lines 82, 87, 196-198 keep their spellings; they are what the exception covers.
4. `src/renderer/app/__tests__/machine-vocabulary.test.ts`: delete line 60 (`read-lines.ts`; the on-disk check at 314-330 would
   fail otherwise) and lines 159-165 (the Phase 100 comment and `RemoteLinesModal.tsx`). Lines 166-168 become: "// The session
   menu. Phase 100 drew a sentence about a machine in it and Phase 320.2 removed it; the file stays on this list so a later
   round cannot type one straight into it." Line 169 (`terminal-menu.ts`) stays.
5. `src/renderer/app/__tests__/p165-lazy-doors.test.ts`: line 104, delete `"from './RemoteLinesModal'", ` from App.tsx's
   forbidden list; delete line 198 (the `s.remoteLinesSessionId` pair).
6. `src/renderer/app/__tests__/p127-probe-loader.test.ts`: line 85 "imports none of the fourteen probe modules" becomes
   "thirteen"; delete line 96 (`'./p100-lines-shot',`).
7. `src/renderer/app/__tests__/p284-quiet-surround.test.ts:498`: "(the band's Read last lines button)" becomes "(the band's
   read-back button)". The asserted byte count does not move: the comment is in the test, not in `app.css`.
8. `src/renderer/scm/__tests__/p105-remote-runs.test.tsx:13-14`: "which is the shape ../../app/__tests__/
   p100-remote-lines.test.tsx uses." becomes "which is the shape ../../app/__tests__/p93-attention-row.test.tsx uses." (that
   file exists and calls `renderToStaticMarkup` five times).

### 3.3 The renderer builder's own checks (no Electron)

Under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`, in `/private/tmp/wt-p3202`:
`npm run -s typecheck` (renderer half; the main half may be mid-edit, so a red there that names only main files is the main
builder's), and `npx`-free vitest over the edited files: `./node_modules/.bin/vitest run src/renderer/terminal/__tests__/terminal-menu.test.ts src/renderer/app/__tests__/p95-strip-note.test.tsx src/renderer/app/__tests__/machine-vocabulary.test.ts src/renderer/app/__tests__/p165-lazy-doors.test.ts src/renderer/app/__tests__/p127-probe-loader.test.ts src/renderer/app/__tests__/p284-quiet-surround.test.ts src/renderer/scm/__tests__/p105-remote-runs.test.tsx`.
Then prove the two new menu cases red at the parent: in a `cp -Rc` clone of the worktree (scratch, never the worktree
itself), put back from `git -C /private/tmp/wt-p3202 show d9f98b54:<path>` the parent's
`src/renderer/terminal/terminal-menu.ts` and `src/renderer/machines/read-lines.ts` (and, if the main builder's deletion is
already in the clone, the parent's `src/shared/ipc/machines/sessions.ts` and the parent's `src/shared/ipc/machines.ts` WHOLE,
because `read-lines.ts` imports a value from that family through the barrel), and run the test file there: both new
cases red, named. `openRemoteLines` is only called by the row's `run`, which no case presses, so the slice need not come back.
Report the numbers.

---

## 4. The main builder (`src/main/**`, `src/shared/**`, `src/preload/**`, `build/**`, `package.json`, and their tests)

### 4.1 Production edits, by path and line at `d9f98b54`

1. `src/main/machines/ipc.ts`
   - Line 5: "Phase 98, one more in Phase 99 and one more in Phase 100)." becomes "Phase 98, one more in Phase 99 and one more
     in Phase 100, which Phase 320.2 removed)." Line 7 stays (D14).
   - Delete lines 126-129 (the `---- PHASE 100 ----` markers and the two type names).
   - Delete lines 244-247 (the Phase 100 comment and `import { readSessionLinesOnMachine } from './remote-lines';`).
   - Delete lines 1442-1483 (the whole `---- PHASE 100 ----` registration block and the blank line after it), so line 1440's
     `// ---- END PHASE 99 ----` is followed by one blank line and `// ---- PHASE 105 ----`.
2. `src/main/machines/liveness.ts`
   - Line 151: "Twenty-one channels reach the far side (research 90 section 1)." becomes "Twenty-two channels reach the far
     side: research 90 section 1 counted twenty-one, Phase 233 added two and Phase 320.2 removed one."
   - Lines 157-161: "`feed` is the session list's own family: the lines of one session, and the agent board …" becomes
     "`feed` is the session list's own family: the agent board a machine tab draws, which is a statement about what that
     machine can run and is read once the machine is ready. Phase 100's read of one session's lines was the other member
     until Phase 320.2 removed it."
   - Delete line 185 (`'machines:readSessionLines': 'feed',`). `'machines:agents': 'feed'` is then the map's last line.
   - Delete lines 208-209 (the comment and `'remote-lines.ts': 'feed',`).
3. `src/main/machines/remote-run.ts:147-148`: "the lines of one session, the agent board, and the two passes that walk the
   session rows" becomes "the agent board and the two passes that walk the session rows".
4. `src/main/machines/index.ts:115-122`: replace the Phase 100 paragraph and its bullet with one paragraph: "PHASE 100 ADDED ONE
   MODULE, the read of a session's last lines on a machine, and this file did not re-export it. Phase 320.2 deleted it with
   the window it fed." (No spelling of the file's name: it is a needle, §5.1.)
5. `src/main/restore/snapshots.ts`
   - Lines 650-654: "PHASE 100 EXPORTED IT, one word and nothing else. `../machines/remote-lines.ts` reads … one place that
     holds it." becomes "PHASE 100 EXPORTED IT for its read of a session's last lines on another machine, which Phase 320.2
     deleted, so it is this module's own again. A second copy of this regular expression is still forbidden: there is one
     correct answer to which bytes are text, and one place that holds it."
   - Line 656: `export function stripControls` becomes `function stripControls` (D4). Line 614 is its caller.
6. `src/main/machines/remote-pane-history.ts:62-63`: drop ", and the Read Last Lines panel's value" so the sentence ends
   "gives a big capture." `build/p3201/ablation.mjs` anchors on line 59 and on later lines, never on this comment (read).
7. `src/shared/ipc/machines.ts`
   - Line 2: "Thirty seven invoke channels" becomes "Thirty eight invoke channels". After line 16 add: "PHASE 320.2 REMOVED ONE
     CHANNEL, Phase 100's read of a session's last lines. This line read thirty seven while the map held thirty nine, because
     Phase 233's two commit reads came in without moving it, and it says so rather than quietly fixing it. Both counts now
     say thirty eight."
   - Line 19 "nine domain files" and line 20 "each of the nine" become "eight"; delete line 31 (`sessions.ts …`); after the
     list add "Phase 320.2 deleted a ninth family, `sessions.ts`, with the read it declared."; line 35 "ONE OF THE NINE"
     becomes "ONE OF THE EIGHT"; line 112 "the nine families" becomes "the eight families".
   - Delete lines 99-102 (the `./machines/sessions` type import) and line 121 (`export * from './machines/sessions';`).
   - Line 130 "The thirty seven channels" becomes "The thirty eight channels". Line 145 "Phase 100 added `readSessionLines`
     without a row" becomes "Phase 100 added its read of one session's last lines without a row". After line 175 add: "PHASE
     320.2 REMOVES ONE ROW, Phase 100's read of a session's last lines. The count is thirty eight, and the table below lists
     thirty six of them: Phase 233's `readCommitFiles` and `readCommitFile` were never given rows." (Measured: the table holds
     37 rows today and the map 39; the two missing are exactly those, §13.)
   - Delete line 204 (the table row), `MachinesSessionsInvokeChannelMap &` from line 247 and `MachinesSessionsApi &` from line
     270.
8. `src/preload/machines.ts`
   - Lines 5-10: keep the list, append "; Phase 320.2 removed Phase 100's" before the closing parenthesis, and "thirty nine
     calls" becomes "thirty eight calls" (39 `invoke('machines:…')` today, 38 after; measured).
   - Delete lines 129-135 (the Phase 100 comment and `readSessionLines: (input) => invoke('machines:readSessionLines', input),`).

### 4.2 Main-side tests

1. `src/main/machines/__tests__/remote-lines.test.ts`: deleted (§2).
2. `src/main/machines/__tests__/ipc.test.ts`: delete lines 412-420 (the channel and its comment from the exact list asserted at
   262-263, which is then the absence assertion: `toEqual` of the sorted registered set) and lines 491-525 (the Phase 100
   section and the blank line after it). Add no test that spells the channel (D5).
3. `src/main/machines/__tests__/p231-liveness.test.ts`
   - Delete line 105.
   - Lines 167-173: "3a. Twenty-two channels, and exactly this one is the session's own. Phase 233 moved this from twenty-one
     by the two commit reads, and Phase 320.2 to twenty-two by Phase 100's read." with `toHaveLength(22)` and
     `expect(feedChannels).toEqual(['machines:agents']);`.
   - Lines 322-326, the ablation: name `'the agent board becomes a read verb'`, `from: "'machines:agents': 'feed'"`,
     `to: "'machines:agents': 'link'"`. That text occurs once in `liveness.ts` after §4.1.2 (`'machine-agents.ts': 'feed'` is a
     different string). It reads red on rule 3a, whose feed list becomes empty, and on 3b.
4. `src/shared/__tests__/p125-machines-surface.test.ts`
   - Delete the seven names from the type import (125-131), `'sessions',` from `FAMILIES` (152), the `// sessions.ts, 7` block
     from `MEMBERS` (268-275) and the seven tuple members (450-456).
   - Counts: 112 becomes 105 (header line 20, the comment at 159-160 gains "and 105 since Phase 320.2 removed sessions.ts's
     seven", the test name at 310); "nine" becomes "eight" (lines 4, 13, 15, 24, and the test name at 327 "re-exports all
     eight families"); line 17 "those eighteen" becomes "those sixteen".
   - (ADDED BY THE ATTACK, §Attack A11) One new case in the first `describe`, "holds exactly the eight family files and no
     ninth": `readdirSync(join(IPC, 'machines')).filter((n) => n.endsWith('.ts')).sort()` equals
     `FAMILIES.map((f) => `${f}.ts`).sort()`. Without it this file stays green with `sessions.ts` put back and re-exported,
     because every other case reads only the families `FAMILIES` names. It names no removed spelling (D5), and it is red at
     the parent, where the directory holds `sessions.ts` and `FAMILIES` (after this edit) does not.
5. `src/shared/__tests__/ipc-invoke-closure.test.ts`: line 33 "nine domain" and lines 83-84 "nine domain files", "nine
   interfaces" become "eight"; line 85 "thirty seven keys" becomes "thirty eight keys".

### 4.3 Build and package edits

1. `build/conformance-machines.mjs`: condition 54 turned around (§5.1), lines 210-218 and 4626-4787 and 6324-6346.
2. `build/machines-conformance-probe.mts`
   - Lines 19-24: replace the Phase 100 paragraph with "PHASE 100 ADDED ONE MODULE LOAD, `remote-capsule.ts`, for a read Phase
     320.2 deleted, and the load went with it."
   - Lines 224-227: "nine domain files" and "the barrel plus the nine" become "eight".
   - Delete lines 1236-1241 (the Phase 100 comment and the four `REMOTE_SESSION_*` names from the `@shared/ipc` import) and
     lines 1248-1252 (the `remote-capsule` import, used by nothing else in the probe; measured).
   - Delete lines 3900-3943 (the `phase100` block and the blank line after it).
   - Self-check, which the builder runs and reports: `conformance:machines` stdout before and after differs ONLY in Phase
     100's line (line 220 of 298 today) becoming Phase 320.2's line, and every other line byte for byte (the remote-capsule
     load moves `control-plane.ts`'s first load from line 1250 to 1729; nothing reads module state between them, and the diff
     is what proves it).
3. `build/probe-p100-lines.mjs`: deleted. `package.json:151` (`"probe:p100": …`) deleted. `build/verification-checks.mjs:1316`
   (`adapter('probe:p100', …)`) deleted. `gate:checks` holds both directions of that classification.
4. `package.json`: add `"ablation:p3202": "node build/p3202/ablation.mjs",` after line 133 (`"ablation:p324"`), and
   `build/verification-checks.mjs`: after line 1866 (`pure('ablation:p324'),`) add a two-line comment in that house shape and
   `pure('ablation:p3202'),`.
5. `build/verification-checks.mjs:1071-1076`, the `probe:p320` comment: "no Read last lines control on the band and the panel
   through the store action (R5)" becomes "(R5) no read-back control on the band, and since Phase 320.2 no Read Last Lines row,
   window, bridge member or handler".
6. `build/probe-p96-remote-surfaces.mjs`: line 22 "exactly four cells moved" becomes "exactly three"; lines 747-769: add to the
   comment "PHASE 320.2 took Read Last Lines… out of the session menu, so the list is three again.", remove `'Read Last
   Lines…'` from `wanted`, `moved.length === 4` becomes `=== 3`; line 782's note "exactly four cells moved" becomes "exactly
   three". NOT RUN in this phase (D10).
7. `build/probe-p95-scroll.mjs:773-774`: "(its read stays in the terminal's context menu, where this Mac's capture items sit)"
   becomes "(Phase 320.2 removed the read and its menu row too)".
8. `build/assert-import-boundaries.mjs:42,44`: "holds nine domain files" and "name one of the nine" become "eight".
9. `build/p320/probe-p320.mjs`: §5.3.
10. `build/p3202/ablation.mjs`: new, §5.2.

### 4.4 The main builder's own checks (no Electron)

Under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`, in `/private/tmp/wt-p3202`:

- `npm run -s typecheck` (judge the main, shared, preload and build errors; renderer ones are the renderer builder's).
- `./node_modules/.bin/vitest run src/main/machines/__tests__/ipc.test.ts src/main/machines/__tests__/p231-liveness.test.ts src/shared/__tests__/p125-machines-surface.test.ts src/shared/__tests__/ipc-invoke-closure.test.ts`.
- `node build/conformance-machines.mjs` green, and its stdout diffed against the spec writer's
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3202/spec/machines-before.txt`:
  only Phase 100's line (line 220) becomes Phase 320.2's, compared with the file count masked (`sed -E 's/in [0-9]+ text
  files/in N text files/'`), because the count moves whenever a file is added under `src/`. Any other moved line is a finding
  to explain.
- `node build/p3202/ablation.mjs --self-test`, then the full ablation in a `cp -Rc` clone of the worktree
  (`node <clone>/build/p3202/ablation.mjs`): 15 of 15 red on their owners, the control green, every file back by sha256.
- `node build/p320/probe-p320.mjs --self-test` and `node --check` on every edited `.mjs`.
- `node build/assert-hermetic-checks.mjs` (52 callers against 51, the new script classified), `node build/assert-electron-teardown.mjs`
  (163 of 163), `node build/assert-background-teardown.mjs`, `node build/assert-import-boundaries.mjs`.
- `node build/contract-inventory.mjs --check` is EXPECTED red on exactly §7's two lines until the integrator regenerates the
  baseline; the builder does not regenerate it, and so does not expect `npm run build` green.

---

## 5. The gates and probes that held the window in place, each turned around

| What held it | Where today | How it is turned around |
| --- | --- | --- |
| `conformance:machines` condition 54 (FAILS when `remote-lines.ts` is absent) and Phase 100's printed line | `build/conformance-machines.mjs:4626-4787`, `:6324-6346`; data `build/machines-conformance-probe.mts:3900-3942` | §5.1: the window's absence, six sub-clauses, all reading the tree directly |
| `probe:p100` | `build/probe-p100-lines.mjs`, `package.json:151`, `build/verification-checks.mjs:1316` | Deleted; `gate:checks` loses the classification |
| `probe:p96`'s expected cells | `build/probe-p96-remote-surfaces.mjs:747-769` | Three cells, not four (not run, D10) |
| `probe:p95`'s note | `build/probe-p95-scroll.mjs:773` | Comment corrected |
| `probe:p320`'s R5 arm | `build/p320/probe-p320.mjs:105-109,530-546,1060-1062,1987,2370-2391` | §5.3: the row, the window, the member and the handler read ABSENT, the parent read the same way |
| The vitest pins | `terminal-menu.test.ts:242-294`, `p95-strip-note.test.tsx:208-228`, `ipc.test.ts:412-420,491-524`, `p231-liveness.test.ts`, `p125-machines-surface.test.ts`, `machine-vocabulary.test.ts:60,159-169`, `p165-lazy-doors.test.ts:104,198`, `p127-probe-loader.test.ts:96`, `p100-remote-lines.test.tsx`, `remote-lines.test.ts` | §3.2 and §4.2: equality-based menu cases, the exact channel list, the contract member list, and the deletions |

### 5.1 `conformance:machines` condition 54, turned around

Replace `build/conformance-machines.mjs:4626-4787` (from the `// ----` line above "54. Phase 100" through the closing `}` of
the 54f block) with one block. It reads the tree with the `readdirSync`, `statSync`, `readFileSync`, `join` and `relative` the
file already imports, rooted at `process.cwd()` as the 320.1 block is (`:11049-11061`). It reads RAW text (comments count: a
comment that names a deleted module is a false sentence). Every failure line starts with its sub-clause and a colon, `54a: `
to `54f: `, in the shape Phase 324's `100a:` lines take, because `ablation:p3202` reads the owner from that prefix.

```js
// ---------------------------------------------------------------------------
// 54. Phase 100's read, TURNED AROUND by Phase 320.2: the Read Last Lines
// window is gone, everywhere (his ruling of 2026-09-30, "Remove it everywhere")
// ---------------------------------------------------------------------------
// (header prose: Phase 100 built it because research 57 section 3.1 refused a
//  real remote scrollbar; Phase 320.1 is that scrollbar; this condition held the
//  window in place and now holds its absence; 54b keeps research 57's refusal
//  for the EXEC PLANE executable, read from the ledger, which conditions 101 to
//  112 narrowed for the control connection alone; ablation:p3202 is the attack.)

const P3202_GONE_FILES = [
  'src/main/machines/remote-lines.ts',
  'src/main/machines/__tests__/remote-lines.test.ts',
  'src/renderer/app/RemoteLinesModal.tsx',
  'src/renderer/app/remote-lines.css',
  'src/renderer/machines/read-lines.ts',
  'src/renderer/app/p100-lines-shot.ts',
  'src/renderer/app/__tests__/p100-remote-lines.test.tsx'
];
// REVISED BY THE ATTACK (A6): `read-lines` anchored on a word start, so `thread-lines.ts` is not a finding.
const P3202_GONE_NAME = /remote[-_]?lines|(?:^|[^a-z])read[-_]?lines|p100[-_]?lines/i;
// REVISED BY THE ATTACK (A5): every file is read EXCEPT a known binary one. An allowlist of text
// extensions let a new extension (a `.jsx`, a `.scss`, a fixture with none) hide a spelling. A file whose
// first 8 KB hold a NUL byte is skipped as binary too, and the count of files read is the floor's.
const P3202_BINARY = /\.(?:png|jpe?g|gif|ico|icns|webp|woff2?|ttf|otf|wasm|node|zip|gz|pdf|mp4|mov)$/i;
/** Each family's sub-clause. Raw text, every line of every text file under src/. */
const P3202_NEEDLES = [
  { family: 'channel', clause: '54c', re: /readSessionLines|MachineSessionLines|REMOTE_SESSION_LINES?_/ },
  { family: 'menu-row', clause: '54d', re: /read[ _-]?last[ _-]?lines/i },
  { family: 'window', clause: '54d', re: /remote[ _-]?lines|\bread-lines\b|p100[-_]?lines/i },
  { family: 'words', clause: '54d', re: /\breadLines[A-Z]\w*|\bREAD_LINES_[A-Z]/ }
];
/** Exempt for ONE family each, and each must still match (54e). */
const P3202_EXCEPTIONS = [
  {
    file: 'src/renderer/app/__tests__/p95-strip-note.test.tsx',
    family: 'menu-row',
    why: "Phase 320.1's band test writes the three names it deleted, and the band's words, once, to prove them absent"
  }
];
/** Measured at 2590 text files on the tree this spec read, less the eight deleted files (the attack's own
 *  binary-denylist reader read 2598 before the deletions, 2590 after). */
const P3202_SCAN_FLOOR = 2500;
```

The clauses:

- **54a.** No path in `P3202_GONE_FILES` exists, and no file under `src/` has a basename matching `P3202_GONE_NAME`. Failure:
  "54a: <path> is there. Phase 320.2 removed the Read Last Lines window everywhere, on the operator's ruling of 2026-09-30, and
  a session on another machine scrolls back instead."
- **54b.** No row of `data.ledger` has `verb === 'copy-mode'` (the probe already emits the ledger). Failure: "54b: copy-mode is
  on the remote verb ledger. Research 57 section 3.1 refused a scrollbar over the exec plane, and that refusal stands there:
  research 130 section 4 narrowed it for the CONTROL connection alone (conditions 101 to 112), whose closed table is the only
  road a scroll takes to another machine."
- **54c.** No line of any text file under `src/` matches the `channel` family. Failure lists each hit as `file:line` and the
  first 80 characters: "54c: <file>:<line> spells the channel Phase 320.2 removed (…)".
- **54d.** The same for `menu-row`, `window` and `words`, minus the exceptions' own family in the exception's own file.
  Failure: "54d: <file>:<line> spells the Read Last Lines window, its menu row, its store, its words or its knob (…)".
- **54e.** Three things, in this order. (1) The scanner reads its fixtures right, run in memory before the real scan:
  `'Read Last Lines…'` and `'READ_LAST_LINES_ITEM'` are `menu-row`; `'openRemoteLines(id)'` and `".remote-lines-modal"` are
  `window`; `"invoke('machines:readSessionLines', x)"` is `channel`; `'export const READ_LINES_CUT = 1'` is `words`;
  `'the last lines of stderr'`, `'Capture Last 250 Lines'`, `'thread-lines'`, `'readLines('` and `'the last lines panel'`
  are nothing. The BASENAME rule has its own fixtures (added by the attack, A6): `RemoteLinesModal.tsx`, `read-lines.ts`,
  `ReadLinesPanel.tsx` and `p100-remote-lines.test.tsx` match; `thread-lines.ts`, `spreadlines.ts` and `lines.ts` do not.
  And the reader's own (A5): a name ending `.png` is skipped, a buffer holding a NUL in its first 8 KB is skipped, and a
  `.jsx` and a name with no extension are read. A misread fails
  "54e: the scanner reads <fixture> as <found>, not <wanted>", and 54a, 54c and 54d are then reported as cannot be judged,
  never as passing. (2) At least `P3202_SCAN_FLOOR` text files were read. (3) Every exception's file exists and has at least one
  line matching its family; otherwise "54e: the exception for <file> matches nothing (or the file is not there), so it would
  hide a name nobody reviewed; take it off the list".
- **54f.** The old 54f, its check unchanged (`capture-pane` on the ledger with `kind === 'read'` and `repeat === 'safe'`), its
  sentences reworded: "capture-pane is not on the verb ledger, so the remote screen read, the saved output capsule and the
  arming read have no row to ride on" and "capture-pane reads <kind> with repeat class <repeat>. It is a read and it is safe:
  with -p it prints what is on a screen and writes nothing, and two prints of one screen leave the machine exactly as one
  does."

Header list, lines 210-218: "54 is Phase 100's" becomes "54 is Phase 100's, which Phase 320.2 turned around to hold the
Read Last Lines window's absence". The count "Seventy seven conditions are in force" does not move.

Phase 100's printed line (`:6324-6346`) becomes Phase 320.2's line, printed when 54 is green. It is ONE line of stdout
(wrapped here for reading only), so the builder's before and after diff moves exactly one line (§4.4):

```
the Read Last Lines window is gone: none of its 7 files, and no spelling of its channel, its menu row, its store, its words or its knob in <N> text files under src/ (1 named exception, still matching); copy-mode is on no ledger row, and capture-pane is still a read row with repeat class safe.
```

`<N>` is a count, so it moves whenever a file is added under `src/`; the diff check in §4.4 compares the line with the number
masked.

The probe side (`build/machines-conformance-probe.mts`) loses `phase100` and computes nothing new: the gate reads the tree
itself.

### 5.2 `ablation:p3202` (`build/p3202/ablation.mjs`, new)

Header in the house shape of `build/p324/ablation.mjs:1-56`: what it proves, the safety, "run it in a `cp -Rc` clone while
anybody else is editing". It spawns only `node build/conformance-machines.mjs`, with `spawnSync` (waited, `timeout: 180_000`,
`killSignal: 'SIGKILL'`, `cwd` its own repository root), launches no Electron, starts no tmux, runs no ssh. Mechanics, all from
p324: every target's bytes read once before any write (a planted file is recorded as ABSENT); after every arm the target is
restored and compared by sha256 (a planted file must be absent again); a `finally`, an `exit` handler and SIGINT, SIGTERM and
SIGHUP restore and compare everything; a file that is no longer the bytes read at the start is never written over (exit 2,
named); an arm whose `find` text does not occur exactly once is "not applied" and fails. A control run first must be green.
An arm passes when the gate exits 1 with at least one line starting `<owner>:`; collateral reds are printed, not failed.
`--self-test` proves the failure-line parser on three in-memory gate outputs (an owner line, an owner beside a collateral line,
a PASS output) and starts nothing. Exit 0 when every arm reads red on its owner, 1 with each failing arm named, 2 when it
refuses.

| n | Owner | File | One piece put back |
| --- | --- | --- | --- |
| 1 | 54a | `src/main/machines/remote-lines.ts` | created, content `export {};` |
| 2 | 54a | `src/renderer/machines/ReadLinesPanel.tsx` (RE-AIMED BY THE ATTACK, A7: a name NOT on `P3202_GONE_FILES`, so this arm proves the basename rule; `read-lines.ts` as written proved the list rule a second time) | created, content `export {};` |
| 3 | 54b | `src/main/machines/exec-plane.ts` | find `  {\n    verb: 'capture-pane',\n` (exactly once), replace with `  { verb: 'copy-mode', repeat: 'safe', kind: 'read', reason: 'An ablation plant of Phase 320.2, never shipped.' },\n  {\n    verb: 'capture-pane',\n`. CORRECTED BY THE ATTACK (A7): as written the plant went before the `verb:` line, INSIDE the capture-pane row's braces, which is a syntax error; the probe would fail to load and the gate would exit 1 with no `54b:` line, so the arm read "not red on its owner" |
| 4 | 54c | `src/preload/machines.ts` | appended `export const p3202Plant = 'machines:readSessionLines';` |
| 5 | 54c | `src/main/machines/ipc.ts` | the same line appended |
| 6 | 54c | `src/shared/ipc/machines/rows.ts` | appended `export type MachineSessionLinesResult = never;` |
| 7 | 54d | `src/renderer/terminal/terminal-menu.ts` | appended `export const p3202Plant = 'Read Last Lines…';` |
| 8 | 54d | `src/renderer/state/sessions-slice.ts` | appended `export const p3202Plant = 'openRemoteLines';` |
| 9 | 54d | `src/renderer/app/probe-registry.ts` | appended `// remoteLines?: unknown;` (the harness knob) |
| 10 | 54d | `src/renderer/app/__tests__/p165-lazy-doors.test.ts` | appended `// Read Last Lines` (a test that is NOT an exception) |
| 11 | 54d | `src/renderer/app/__tests__/p95-strip-note.test.tsx` | appended `// remote-lines` (the exception's file, ANOTHER family) |
| 12 | 54e | `src/renderer/app/__tests__/p95-strip-note.test.tsx` | the file removed for the arm (an exception naming a file that is not there) |
| 13 | 54f | `src/main/machines/exec-plane.ts` | in the capture-pane row, `    kind: 'read',` becomes `    kind: 'mutating',` (find: `    verb: 'capture-pane',\n    repeat: 'safe',\n    kind: 'read',`) |
| 14 | 54d | `src/renderer/machines/presentation.ts` | appended `export const READ_LINES_TITLE = 'Last lines';` (ADDED BY THE ATTACK, A7: the `words` family had no arm, so its needle was never shown live) |
| 15 | 54d | `src/renderer/styles/app.css` | appended `.remote-lines-modal { display: block; }` (ADDED BY THE ATTACK, A7: a STYLE, the one kind of piece the window had that no arm put back) |

Arms 1 and 2 plant content with no needle in it, so only 54a can own them. Arms 10 to 12 are what prove the exception narrow:
a different file is not exempt, a different family in the same file is not exempt, and an exception cannot outlive its file.
Arm 14 is the only arm the `words` family owns, and arm 15 the only one in a `.css` file.

### 5.3 `probe:p320`, R5 regraded and the hidden agents guarded (`build/p320/probe-p320.mjs`)

1. **The guard (D9), before any other change.** `import * as hidden from '../hidden-agents.mjs';`. Before the launch, after
   the profile directory is made (line 1371): `const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: 'p320', home,
   userPath: process.env['PATH'] ?? '' });` refusing (exit 2) when `!pre.ok`, then `hidden.writeHiddenAgents(profile, 'p320')`
   (the app's config directory is `<profile>/gmux/config`, `src/main/config/paths.ts:43-46`, which is where this probe already
   writes `machines.json`). After the page load and before the first arm: `hidden.hiddenAgentsScanVerdict(JSON.parse(await
   cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90_000)))`; not ok throws UNREADABLE with its sentence and the run ends at exit 2
   before any arm. `readings.hiddenPrecheck` and `readings.hiddenScan` keep both. Self-test gains p326's four hidden-agent
   fixtures (`build/p326/probe-p326.mjs:951-954`).
2. **The inspector for R5.** Line 1805: `...(on('C1') || on('R5') ? ['--inspect=0'] : [])`; each half of the arm opens
   `cdpForMain(handle, 30_000)` as C1 does (`:2521`) and CLOSES it in its own `finally` (`main?.close()`, as C1 does at
   `:2583`), after restoring `Menu.prototype.popup`, so C1, which runs after R5 by default, finds the inspector free
   (revised by the attack, A4).
3. **Sessions.** Line 1989: `['sh', on('R2') || on('A2') || on('R5')]`. R5 reads the menu on `p320-sh`, the remote plain shell
   R2 scrolls, because the full-screen stand-in on `p320-fs` asked for the mouse and takes a right-click as a report. The band
   is still read on `p320-fs` as today.
4. **R5, in this order, every step inside one `try` whose `finally` restores `Menu.prototype.popup`:**
   - The band: unchanged (`notes` in both orientations; lines 2373-2379).
   - The menu recorder, over main's inspector: replace `Menu.prototype.popup` with a function that pushes the menu's rows and
     calls `options.callback` on `setImmediate`, opening nothing; prove the patch took (`Menu.buildFromTemplate([{ label: 'x'
     }]).popup === patched`), or the menu clause is UNREADABLE. A row is `—` for a separator, else the label, with ` [off]`
     when `enabled === false`; a label starting `Scrollback ` is normalised to `Scrollback …` (its numbers depend on what the
     session printed).
   - The remote menu: `show(ids.sh)`, clear any selection through the page kit's terminal (`window.__p320.term.clearSelection()`,
     after `show` has re-armed the kit), then a REAL right-click over
     DevTools at the terminal's bottom-right cell (`mouseMoved`, `mousePressed` and `mouseReleased` with `button: 'right'`,
     `buttons: 2`, `clickCount: 1`), and wait up to 3 s for one new recorded menu.
   - The application menu: over the inspector, every label under `Menu.getApplicationMenu()`, submenus included, with the
     rows under `Open Recent` left out (they are what this run happened to open, which this phase does not own).
   - The window: `__gmuxShotDrive({ remoteLines: { session: 'p320-sh', waitMs: 30_000 } })` as today, then poll 5 s for
     `.remote-lines-modal`; `opened` is whether it appeared. At HEAD the knob is gone and nothing opens; at the parent it opens,
     and the existing Escape closes it.
   - The bridge member: `typeof window.gmux?.machines?.readSessionLines` from the page.
   - The handler (D11), over the inspector:
     ```js
     (() => {
       const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
       const { ipcMain } = load('electron');
       const has = (channel) => {
         try { ipcMain.handle(channel, () => null); }
         catch (err) { return /second handler/i.test(String(err && err.message)); }
         ipcMain.removeHandler(channel);
         return false;
       };
       return { control: has('machines:listFiles'), removed: has('machines:readSessionLines') };
     })()
     ```
   - The bundle (added by the attack, A12): the entry asks the run to "drive the store's old action name", and the page
     exposes no store handle a probe can call (`window.__gmux*` handles are drives, not the store). So the store's half is read
     as an artifact: the count of `openRemoteLines`, `remote-lines-modal` and `machines:readSessionLines` in the checkout's
     `out/renderer/assets/*.js`, `out/preload/*` and `out/main/*.js` (never `out/` whole: `out/p320/` holds readings that quote
     the parent's menu). A store action whose name is in no shipped chunk cannot be called by anything.
   - `readings.R5 = { notes, menus: { remote, local }, scrollbackRows: { remote, local }, appMenu, opened, bridge, handler, bundle }`.
   - `finish('R5', 'remote')`, and NO grading yet: the grader needs both halves.
   - **THE LOCAL HALF MOVED (revised by the attack, A3).** As written, the local menu was read inside the remote group with
     `createLocal`, which opens this Mac's project; 320.1's second build (`build/p320/probe-p320.mjs:43-48`, D13 of
     `build/p3201/SPEC.md`) runs EVERY remote arm before any arm touches this Mac precisely because R3 after R3L found the
     local project showing and never started its stand-in, and R3 and R2 both run after R5. So the local half is the FIRST
     block under `// ================================================ THEN THIS MAC` (before R3L): `createLocal('p320-r5l')`,
     `show` it, clear its selection the same way, open a fresh main session, install the same recorder inside its own
     `try`/`finally`, the same right-click and wait, restore, close, `finish('R5', 'local')`, and only then grade R5 (item 5).
     `planParts` (`:783`) gives R5 `['remote', 'local']` (a one-line special case beside the TYPING rule; the local half needs
     no flag, because this Mac is always there), so a run whose remote half threw prints `not run` for R5 and never PASS. The
     self-test's planParts fixture (`:1115`) gains R5's two parts.
5. **The grader**, `windowFindings(r)`, replacing `bandFindings` (530-546) and `FALSE_SENTENCE` (329, then unused), run in
   the local half once both menus are read: a band
   control drawn in either orientation (unchanged sentence, minus "and the read is in the terminal menu"); a menu not read
   ("the right-click menu was not read, so nothing about its rows is known"); any row in either menu, or in the application
   menu, matching `/read last lines/i`; THE EQUALITY, over both menus with every row matching `/^Scrollback /` and every row
   matching `/read last lines/i` taken out first (revised by the attack, A2: main reads a session's scrollback facts from this
   Mac's tmux server alone, `src/main/sessions/core.ts:3033-3036`, so a remote session's menu never carries that row while a
   session on this Mac's usually does; and with the window's row left in, the parent failed on the equality as well as on the
   row, a finding the window's own row clause already makes): the remote rows not equal to the local rows less `Capture
   Last 250 Lines` and `Capture Last 1,000 Lines` with `Clear` read `Clear [off]`, separators included and runs of
   separators collapsed to one; `opened === true`; `bridge === 'function'`; `handler.control !== true`
   (UNREADABLE: "main's invoke handlers could not be asked, the control machines:listFiles read <x>, so the channel's absence
   is not proved"); `handler.removed === true`; any `bundle` count above zero. Self-test fixtures replace 1060-1062: a
   HEAD-shaped reading gives `[]`; a HEAD-shaped reading whose LOCAL menu carries `Scrollback …` and whose remote menu does
   not gives `[]` (the live shape); a parent-shaped one (the row in the remote menu, opened, the member a function, the
   handler present, the bundle counts above zero) gives exactly 5, one per window clause and none from the equality; a
   control that reads false gives 1; menus not read give 1.
6. **`--compare`**, a new R5X in `compareBuilds` (902-1012): the local menu rows at HEAD equal the parent's byte for byte
   (`Scrollback …` normalised as item 4 says);
   HEAD's remote rows equal the parent's with exactly the one `Read Last Lines…` row removed; a parent reading with no such row
   is a finding ("the parent was not measured"); `scrollbackRows.remote` is false at both builds (a remote menu that grew the
   row is a change this phase does not make); the application menu labels, `Open Recent`'s rows left out, equal at both
   builds; HEAD's `bundle` counts are all zero and the parent's all above zero (the parent measurement, run).
7. **Words.** Header R5 (105-109) rewritten for 320.2; the expected-at-parent lines (196-199 and 2802) say that at 320.2's
   parent (`d9f98b54`) R5 fails on its five window clauses (the row, the window, the member, the handler and the bundle; the
   attack added the fifth, A12) and on nothing else, and R2 passes;
   `RENDERER_SOURCES` (1262-1269) drops `read-lines.ts` and `RemoteLinesModal.tsx` and adds
   `src/renderer/terminal/terminal-menu.ts`, `src/renderer/state/sessions-slice.ts` and `src/renderer/app/probe-registry.ts`
   (where the row, the store action and the knob lived), and `MAIN_SOURCES` (1270-1282) adds `src/main/machines/ipc.ts`
   (where the handler lived), so a build older than any of them is refused as stale rather than read (added by the attack,
   A12); the header names the guard, the inspector, the local half's place and the bundle read.

---

## 6. The integrator (owns `docs/audits/contract-baseline.txt`, `CHANGELOG.md`, and the three other documents of D13)

1. Regenerate the baseline (§7) and read the diff.
2. `CHANGELOG.md`: delete line 28 (D12); add the §8 item as the LAST item of `### Changed` under `## Unreleased`, with no link
   (the follow-up docs commit adds it).
3. `CLAUDE.md`:
   - The `conformance:machines` row (line 302): at the end of its Touching column add "; and, for condition 54, the files
     the Read Last Lines window lived in, being `src/renderer/terminal/terminal-menu.ts`, `src/renderer/state/sessions-slice.ts`,
     `src/renderer/app/{App.tsx,lazy-modals.tsx,modals.ts,probe-registry.ts,session-actions.tsx}`, `src/preload/machines.ts`,
     `src/shared/ipc/machines.ts` and `src/shared/ipc/machines/**`" (REVISED BY THE ATTACK, A10: "any text file under `src/`"
     would have made this a gate every commit runs; these are every door the window had, being its row, its store, its
     mount, its knob, the session menu beside it, its bridge and its contract); at the end of its last column add "; and
     since Phase 320.2 condition 54 is TURNED AROUND: the Read Last Lines window is absent, being none of its seven files and
     no file named like one, no `machines:readSessionLines`, and none of its names, words, classes or knob in any file under
     `src/` that is not binary (one named exception, Phase 320.1's band test, which must still match), `copy-mode` on no
     ledger row and `capture-pane` still a safe read; `ablation:p3202` is the attack beside it, 15 arms, each red on the
     clause that owns it".
   - The `probe:p320` row (line 359), at the end: "; since Phase 320.2 every launch renames the five hidden agents first
     (`build/hidden-agents.mjs`), and R5 reads the session's right-click menu as main built it (`--inspect`,
     `Menu.prototype.popup` recorded and nothing opened), a remote session's in the remote group and a session on this Mac's
     after it, compared with every `Scrollback …` row left out because main draws that row for a session on this Mac alone,
     plus the window, the bridge member, main's invoke handler and the built bundle, at HEAD and at `P320_CHECKOUT`".
4. `DEVELOPMENT.md`: delete line 243 (the `npm run probe:p100` row).
5. `demo/bridge/API-CATALOG.md`: delete lines 607-608 (`# sessions.ts` and the `machines.readSessionLines` line); line 554
   `## machines (40)` becomes `(39)` and line 28's anchor `#machines-40` becomes `#machines-39` (40 entries counted today).
6. Run §10.1's gates, the duplicate scan, and report.

---

## 7. The contract baseline lines that move

`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, then `git diff -U0 docs/audits/contract-baseline.txt`
must show exactly:

```
-[ipc.invoke.channels] count=248
+[ipc.invoke.channels] count=247
-machines:readSessionLines
```

(line 5 and line 146 today). Nothing else moves: no `GMUX_*` name is lost (§0), no harness smoke mode, no storage key, no
schema line. The commit body names the channel line and says why.

---

## 8. The menus, for the phase brief, and the CHANGELOG item

**Menus.** The right-click menu inside a session on another machine no longer offers "Read Last Lines…". The rest of that
menu does not change: it is a session on this Mac's menu without Capture Last 250 Lines and Capture Last 1,000 Lines, with
Clear shown disabled, as Phase 96 left it. A session on this Mac's menu does not change. The application menus and every
other context menu do not change, and no row is added anywhere.

**CHANGELOG item**, the last item under `## Unreleased` → `### Changed`, one line:

```
- Read Last Lines is no longer in the menu you get by right-clicking a session on another machine, because that session now scrolls back like one on your Mac; on a machine whose tmux Tortie has not measured, a plain shell or an agent that prints ordinary lines there shows only its current screen until that machine's tmux is upgraded
```

REVISED BY THE ATTACK (A8). The item as first written said such a session "shows only its current screen", which is false for
the case `b28d0eb4`'s own Unreleased item promises a person two lines above it (CHANGELOG.md:27: full-screen programs that use
the mouse scroll on any tmux), so the clause now names exactly what a person will hit, in that item's own words ("a machine
whose tmux Tortie has not measured", "a plain shell or an agent that prints ordinary lines"). The measured versions are named
once already, in 320.1's Added item (CHANGELOG.md:17); repeating them is a number that is not the point here.

And line 28's item ("Read Last Lines no longer says a session kept nothing more when the program in it only ever drew one
screen") is deleted; `b28d0eb4` keeps its other item two lines above it, so the commit still appears once.

---

## 9. The proof, run rather than read

### 9.1 What each claim needs

| Claim | Evidence | Where |
| --- | --- | --- |
| The row is gone from a remote session's menu, and only that row moved | The native menu's rows as main built them, at the parent and at HEAD, remote and local | §9.2 R5, R5X |
| No path reaches the window | The window's code absent from HEAD's built renderer, present in the parent's; the store action and the knob opening nothing; the application menu carrying no such label | §9.2, §9.3 |
| The channel is gone | No handler in main (public API, with a control), no bridge member, no string in `out/main` or `out/preload` | §9.2, §9.3 |
| A remote session still scrolls back, its place held | R2 on the same session at both builds, on 3.6a, and at HEAD on 3.7b | §9.2 |
| A session on this Mac's menu is byte for byte the parent's | R5X | §9.2 |
| The gates hold the absence and can fail | `conformance:machines` green, `ablation:p3202` 15 of 15 red on their owners | §10.1 |

### 9.2 The verifier's app run (Tier 2: one run a build, the 3.7b scroll the one extra)

Every command in `/private/tmp/wt-p3202` unless named, under `env -u TERM_SESSION_ID HISTFILE=/dev/null HOME=$V/home
ZDOTDIR=$V/home` where `V=/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3202/verify`
(if a probe refuses for HOME, rerun with his HOME but keep `ZDOTDIR=$V/home`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`;
the probe scrubs the app's own). Never `-L gmux`. Never pkill.

1. **The lock**, per run, in one command line so a failed probe still releases:
   `D=$(zsh /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/lock.sh try p3202) || exit 1; <run>; rc=$?; zsh /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/lock.sh release "$D"; exit $rc`
   (exit 1 means no slot or a phone phase waiting: retry in a NEW command every 60 s for up to 300 minutes). Long runs go in
   the background with the release on the same line.
2. **Build HEAD**: `npm run build`.
3. **Build the parent without touching his checkout**: `mkdir -p $V/parent && git -C /private/tmp/wt-p3202 archive d9f98b54 |
   tar -x -C $V/parent && cp -Rc /private/tmp/wt-p3202/node_modules $V/parent/ && cp -Rc /private/tmp/wt-p3202/build/vendor
   $V/parent/build/ && (cd $V/parent && npm run build)`. (`git archive` reads objects and writes nothing in any repository;
   `electron.vite.config.ts:30-46` stamps `dev` when there is no `.git`, which is fine.)
4. **The parent, 3.6a** (the loopback machine's default tmux, `/opt/homebrew/bin/tmux`, 3.6a measured):
   `P320_CHECKOUT=$V/parent P320_ARMS=R5,R2 P320_OUT_DIR=$V/readings npm run -s probe:p320`.
   Expected: R5 FAILS on exactly its five window clauses (the remote menu carries `Read Last Lines…`, the window opens, the
   member is a function, the handler answers, the built bundle names the action, the class and the channel) and on nothing
   else, the equality included; R2 passes. The run order is R5's remote half, R2, then R5's local half under "THEN THIS MAC".
5. **HEAD, 3.6a**: `P320_ARMS=R5,R2 P320_OUT_DIR=$V/readings npm run -s probe:p320`. Expected: R5 and R2 pass; the hidden-agent
   scan reads ok before any arm.
6. **HEAD, 3.7b** (the vendored build): `P320_ARMS=R2 P320_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux P320_OUT_DIR=$V/readings
   npm run -s probe:p320`. Expected: R2 passes.
7. **Across the builds**: `node build/p320/probe-p320.mjs --compare --head <step 5's readings> --parent <step 4's readings>`.
   Expected: R5X no findings (local rows byte for byte; remote rows the parent's less exactly the one row; application menus
   equal).
8. **The Electron gates**: `npm run smoke:t1`, `npm run smoke`, `npm run smoke:t3`, `npm run package`, each under the lock.
   SAID PLAINLY BY THE ATTACK (A13): `smoke`, `smoke:t1` and `smoke:t3` start Electron as `electron .` inside
   `build/harness-socket.mjs` (package.json), not through `build/electron-run.mjs`, which the round's rule names for every
   Electron. They are the CLAUDE.md battery the entry names, they exit by their own `GMUX_SMOKE` watchdog, `harness-socket.mjs`
   forwards signals to its child and ends its tmux server, and since Phase 335 a `GMUX_SMOKE` launch holds every agent's
   version probe (`build/conformance-harnessprobes.mjs`, inside `npm run build`), so none starts gemini, qwen, agy or grok.
   The verifier runs them under the scratch env above, counts Electron once at the end (step 9) and ends any it started by
   pid; if the orchestrator reads the round's rule as forbidding them, they are reported `not run` with this reason, never
   as passing.
9. **Count once, at the end**: `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`,
   naming which lines are his.

### 9.3 The attack, the verifier's own (it must name what the builders did not do)

- **Every spelling over both built trees**: `grep -rn -E "Read Last Lines|Last lines of|readSessionLines|remoteLines|RemoteLines|remote-lines|readLines[A-Z]|READ_LINES_|P100Lines|p100-lines|MachineSessionLines" out/main out/preload out/renderer`
  at HEAD must print nothing, and the same over `$V/parent/out/{main,preload,renderer}` must print hits (measure the parent).
  Never grep `out/` whole: `out/p320/` holds readings that quote the parent's menu, which is why §9.2 sets `P320_OUT_DIR`.
- **The same over `src/`**: the only lines are `p95-strip-note.test.tsx:82,87,196-198` (the exception) and, for
  `Last lines of`, `src/renderer/context/install/InstallFailure.tsx:28` ("Last lines of stderr", an install failure's prop,
  unrelated; it is why the gate does not use that needle).
- **A hostile call, two ways**: R5's handler read is the builders'; the verifier's own is a renderer call from the preload's
  isolated world if it is reachable (`Runtime.executionContextCreated`, the context whose `auxData.isDefault` is false; if
  `typeof require === 'function'` there, `require('electron').ipcRenderer.invoke('machines:readSessionLines', { sessionId:
  '<p320-sh id>', lines: 0 })` must reject with Electron's no-handler error while `invoke('machines:listFiles', { machineId:
  'nobody', cwd: '/' })` resolves), written as a one-off beside step 5 if the verifier wants it; and, whatever that answers,
  the static fact that HEAD's `out/main/index.js` holds no `machines:readSessionLines` string at all, so no `handle()` can name
  it.
- **A hostile fixture of their own for the gate**: in a `cp -Rc` clone, put back one piece the ablation does not. The attack
  moved the CSS class and `READ_LINES_TITLE` INTO the ablation (arms 15 and 14), so the verifier's own must be another
  shape, for example a file the old text-extension allowlist would have skipped (`src/renderer/app/notes.jsx`, or a fixture
  with no extension, holding `invoke('machines:readSessionLines')`), a spelling with a non-breaking space or a `Read  Last
  Lines` with two spaces, or a JSON fixture under a `__tests__` directory; show 54c or 54d red, or show the gate green and
  name the gap.
- **Every path a person has**: the band (R5's notes), the session's right-click menu (R5), the application menu (R5's walk),
  the keymap and every other menu builder (grep), and the shipped renderer carrying none of the window's code (the grep above):
  a path cannot open what is not in the bundle.

---

## 10. Tier, gates and the no-regression table

**Tier 2.** A rendered surface removed with no new state and one IPC channel removed. It cannot lose a person's work (the read
wrote nothing on either computer), it spawns nothing new and sends nothing anywhere. Budget: the gates, ONE app run a build
that drives every claim, and two independent methods because the contract moves: **measure the parent** (§9.2 steps 4 and 7,
§9.3's grep of both built trees) and **attack** (§9.3).

### 10.1 Gates

Builders: `npm run -s typecheck` and the vitest files they touched. Integrator, no Electron, under a scratch HOME/ZDOTDIR,
`HISTFILE=/dev/null`, no `TERM_SESSION_ID`: `npm run -s typecheck`, `npm run -s build` (which holds `gate:electron` 163 of
floor 163, `gate:background`, `gate:simulator`, `gate:knownhosts`, `gate:checks`, `conformance:ios`, `gate:contract` with the
regenerated baseline), `npm test` (the whole vitest), `npm run -s conformance:machines`, `npm run -s conformance:farattach`,
`npm run -s conformance:remoteclose`, `npm run -s conformance:manager` (sessions-slice.ts is on its path),
`npm run -s ablation:p3202`, `node build/p320/probe-p320.mjs --self-test`, `node build/p3202/ablation.mjs --self-test`, the
duplicate scan (no new 10-line block in production code; the ablation's harness follows p324's house pattern, as 320.1's
integrator recorded for its own). Verifiers, under the lock: `smoke:t1`, `smoke`, `smoke:t3`, `package`, and §9.2.

### 10.2 No scenario worse than today, except the one he ruled

| Scenario | Today (`d9f98b54`) | After | Verdict |
| --- | --- | --- | --- |
| Remote session, measured tmux, scroll back | scrolls, place held (320.1) | the same (R2, both builds) | equal |
| Remote session's right-click menu | the local menu less the two presets, plus Read Last Lines | the local menu less the two presets | ruled ("Remove it everywhere") |
| Remote session on a tmux 320.1 did not measure | only full-screen programs that use the mouse scroll; history readable through the window | full-screen programs that use the mouse still scroll (`b28d0eb4`, untouched); a plain shell or an agent that prints ordinary lines shows only its current screen | ruled, and the CHANGELOG item names it in those words (corrected by the attack, A8) |
| Remote session whose control connection is down while its machine still answers (320.1's fall back, or a reconnect) | history readable through the window | the screen until the connection is back | covered by "the window is gone"; stated here so nobody reads it as a surprise |
| Local session's right-click menu | as today | byte for byte the same (R5X) | equal |
| Capture Last 250 and 1000 Lines for a remote session | withheld (Phase 96) | withheld | equal |
| Saved Output, the capsule, `capture-pane`'s ledger row | as today | as today | equal |

---

## 11. Builders, disjoint files

- **renderer**: every file in §3 (`src/renderer/**` and its tests), and nothing else.
- **main**: every file in §4 and §5 (`src/main/**`, `src/shared/**`, `src/preload/**`, `build/**`, `package.json`, and their
  tests), and nothing else. `build/p3202/SPEC.md` is this file and nobody edits it.
- **integrator**: `docs/audits/contract-baseline.txt`, `CHANGELOG.md`, `CLAUDE.md`, `DEVELOPMENT.md`,
  `demo/bridge/API-CATALOG.md`.

The two builders' files do not overlap. The gate in §5.1 scans renderer files and the ablation in §5.2 edits renderer files
transiently in a clone; neither is a renderer edit that lands. The growth guardrail "src/shared/* is append-only during
parallel builds; integrators reconcile" is met in its purpose rather than its letter, and said so here (§Attack A14): ONE
builder (main) writes `src/shared/**`, the renderer builder only deletes its two imports from the family main deletes, and the
integrator's whole typecheck is the reconcile. Neither concurrent phase's tree (`/private/tmp/wt-p3167`, `/private/tmp/wt-p318`,
both on the local base `c1a5fd38`, which shares `4a363727` with `d9f98b54`) touches a file this phase deletes; they share
only `CHANGELOG.md`, `CLAUDE.md`, `package.json`, `build/verification-checks.mjs` and (318) `build/assert-import-boundaries.mjs`,
which conflict at a rebase as text and never in meaning (read with `git status`, nothing in either tree edited). `npm run typecheck` is red between the two halves (main deletes
the types the renderer still imports, or the reverse); each builder judges only the errors in its own tree, and the integrator
runs it whole.

---

## 12. What is NOT in this phase

- **No new way to read a remote session's past output.** Capture Last 250 and 1000 Lines stay withheld from a session on
  another machine as Phase 96 ruled, and nothing replaces the window. Scrolling back is the way.
- **No change to 320.1's scroll**, its version list, its fall back on an unmeasured tmux, or the owed entry that resets the
  fall back when a connection greets.
- **No change to `capture-pane`'s ledger row**, the remote screen read, the capsule, Saved Output, or `stripControls`'s
  behaviour.
- **No menu row added anywhere**; the application menus do not move.
- **No renumbering**: condition 54 keeps its number, and 101 to 112 keep theirs.
- **No run of `probe:p96`** (it photographs) and no screenshot of any kind.
- **No change to research documents, earlier phases' SPEC files or `docs/BACKLOG.md`** in the phase commit; history stays
  where it is, and the running log line is the follow-up docs commit's.
- **No tidy of stale counts this phase does not touch** (`src/main/machines/ipc.ts:7`, the barrel table's two missing commit
  rows beyond the one sentence that says they are missing).
- **No release.**
- **No edit to tortie.sh** (`/Users/gdc/tortiedotsh`, read only this round). Its documentation's terminal menu table lists
  "Read Last Lines" (`src/data/docs.ts:569`) and its demo bundle under `public/demos/app/` was built from a renderer that
  carries the window. Both are OWED at the release that ships this phase, when the site is next synced; the running log line
  says so (found by the attack, A9).

---

## 13. Measured for this spec (loopback only, no Electron, no tmux server, no ssh)

All in `/private/tmp/wt-p3202` at `d9f98b54`, under a scratch HOME and ZDOTDIR with `HISTFILE=/dev/null` and no
`TERM_SESSION_ID` where a script ran; output kept under `scratchpad/p3202/spec/`.

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/conformance-machines.mjs` | 0 | 6 s, 298 lines; Phase 100's line is line 220 (`machines-before.txt`) |
| `node build/contract-inventory.mjs --check` | 0 | "the inventory matches docs/audits/contract-baseline.txt byte for byte"; `[ipc.invoke.channels] count=248`, `machines:readSessionLines` at line 146 |
| `node build/assert-hermetic-checks.mjs` | 0 | 53 `tsxCli()` callers against a floor of 51 (52 after the deletion) |
| `node build/assert-electron-teardown.mjs` | 0 | 517 files read, 163 reach `electron-run.mjs`, floor 163; `probe-p100-lines.mjs` is not among them |
| `scratchpad/p3202/spec/scan.mjs` (the §5.1 needles over every text file under `src/`, the eight deleted files left out) | 0 | 2590 files read; every hit is a line §3 or §4 edits or deletes, and after those edits the only lines left are `p95-strip-note.test.tsx:82,87,196,197,198` (the exception) |
| `find src -iname '*remote-lines*' -o -iname '*read-lines*' -o -iname '*remotelines*' -o -iname '*readlines*' -o -iname '*p100*lines*'` | 0 | exactly the seven window files of §2 |
| the barrel table against the channel map | 0 | table 37 rows, map 39; missing exactly `readCommitFile` and `readCommitFiles` |
| `grep -c "=> invoke(" src/preload/machines.ts`; channels in `src/main/machines/ipc.ts` | 0 | 39 and 39 (38 after) |
| `find src -type f` by extension | 0 | 2604 files: 2198 ts, 270 tsx, 72 css, 32 txt, 16 svg, 5 json, 4 woff2, 2 png, 2 html, 2 cjs, 1 mjs (2598 text) |
| `/opt/homebrew/bin/tmux -V`, `build/vendor/tmux/bin/tmux -V` | 0 | 3.6a and 3.7b, the two 320.1 measured |

---

## §Attack (the adversary's round, 2026-10-04, then the revision above)

Read from `/private/tmp/wt-p3202` at `d9f98b54`, nothing committed, staged or stashed; no Electron, no tmux server, no ssh,
no model turn. Scratch: `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3202/adversary/`.
Every finding below is closed IN the sections above (each closure is marked "revised" or "added by the attack" there); this
list says what was found, how, and where it was closed.

### How the search differed from the writer's

- **A different scanner.** Not the writer's regexes: `adversary/norm-scan.mjs` lower-cases every line of every non-binary
  file under `src/`, strips spaces, `_ - . … ' " \` /`, and looks for the tokens `readlastlines`, `remotelines`,
  `readsessionlines`, `sessionlines`, `remotesessionline`, `p100lines`, `readlines`, `lastlinesof`, `linespanel`,
  `gmuxp100`, `remotelinesmodal`. That catches `READ_LAST_LINES`, `read last lines`, `remote.lines`, `__gmuxP100Lines` and
  "the last lines panel" alike. 2598 files, 486 hits, exit 0. Every hit is in a file §3 or §4 edits or deletes, except
  seven "last lines of stderr / app.log / a session's active pane" sentences (`InstallFailure.tsx:8,28`,
  `install-copy.ts:207`, `shared/skills.ts:267`, `main/skills/run.ts:43`, `main/pocket/funnel.ts:167`,
  `main/log/diagnostics.ts:30`, `main/tmux/sessions.ts:290`), one `readline's` (`main/quickopen/worker.ts:250`), all
  unrelated, and A1 below.
- **The whole repository, not `src/`.** `git grep -i -E "last[ _-]?lines|readLines|linesOf|remote[ _-]?lines|readSessionLines|SessionLines|p100[-_]?lines|READ_LINES|REMOTE_SESSION_LINE"`
  outside `docs/BACKLOG.md`, `docs/research/` and this file: 71 files. Every `build/` hit outside the spec's list is an
  unrelated `linesOf`/`readLines` helper or `endSessionLines` (`probe-p209-selection.mjs`, `conformance-handback.mjs`,
  `probe-p63-arch.mjs`, `probe-p131-row.mjs`, `probe-p193-known-hosts.mjs`, `probe-p158-onepath.mjs`, `p256/semantic/*`,
  `conformance-semantic.mjs`, `handback-conformance-probe.mts`, `probe-machines.mjs`, `probe-session-focus.mjs`,
  `electron-run.mjs`). Old SPEC files (`build/p320`, `p3201`, `p293`, `p268`, `p331`) are history and stay.
- **Every importer of every deleted export**, by name (`clampSessionLineDepth`, `cutToCeiling`, `countLines`,
  `REMOTE_SESSION_LINES_TIMEOUT_MS`, the four `REMOTE_SESSION_*` constants, `MachineSessionLinesMode`, the two plumbing
  interfaces, `driveRemoteLines`, `RemoteLinesProbeSpec`, `RemoteLinesReading`, `readSessionLinesOnMachine`,
  `stripControls`, `__gmuxP100Lines`): every one is in a file the spec edits or deletes (`countLines` elsewhere is three
  unrelated local functions). Every helper the window USED stays used (`formatScrollbackBytes` 3 other files, `savedWhen`
  3 uses inside `session-restore.ts`, `modalKeyDown` 8, `machineFeedAnswering` 3, `remoteCaptureArgs` 3 production
  callers: the capsule twice and `remote-smoke.ts`), so the deletion orphans nothing.
- **Every gate and test that reads an edited file**, by file name across `src/` and `build/` and across every ablation
  script (`build/**/*ablat*`, 20 files): `assert-probe-containment.mjs` (no marker names the window; its boundary list has
  no row for it), `p293-doors.test.ts`, `p219-clear-selection.test.ts`, `conformance-manager.mjs` (reads `probe-registry.ts`
  for a cleanup verb only), `p306/ablation.mjs` (anchors in `sessions-slice.ts` outside every deleted range),
  `p3201/ablation.mjs` (its four `remote-pane-history.ts` anchors are not the comment §4.1.6 edits), `p326/ablation.mjs`
  (an attach liveness, unrelated), `ablation-p314.mjs` (a `shutdownGmuxCore` comment), `assert-menu-glyphs.mjs` (glyph set,
  not rows), `conformance-harnessprobes.mjs`, `assert-shared-types.mjs`, `machinesContractSource()` (reads the family
  directory, so a deleted family is simply not read). None breaks.
- **Every doc a person reads**: `README.md`, `DESIGN.md`, `docs/DESIGN-SPEC.md` (its S4B menu block never listed the row),
  `docs/ACCEPTANCE.md`, `docs/method/*`, `docs/design/**`, `ios/**`, the Help menu (`src/main/menu.ts:1305-1320`, Keyboard
  Shortcuts and Diagnostics Report only), the keymap, the command palette (reserved, not shipped), the session manager's
  inline kinds (`session-manager-slice.ts:69-78`, no lines kind). Only `DEVELOPMENT.md:243` and
  `demo/bridge/API-CATALOG.md:28,554,607-608` name it, both already in §6. Outside this repository: A9.
- **The contract inventory's sections, re-derived** rather than read: a `cp -Rc` clone with the nine files deleted, the
  barrel's four `sessions` lines removed and the `probe:p100` script dropped, then `node build/contract-inventory.mjs`
  (exit 0) and `diff` against the baseline: exactly `[ipc.invoke.channels] count=248` to `247` and `machines:readSessionLines`
  gone, nothing in `[env.names]`, `[harness.smoke.modes]`, `[localStorage.keys]`, `[sqlite.*]` or `[bundle.refusals]`.
  §7 holds.
- **The GMUX_SHOT spec keys and harness modes**: `remoteLines` is the only drive key (`probe-registry.ts:271`), read by no
  main-side key list; no `GMUX_SMOKE` mode, `remote-smoke.ts` arm or `remote-matrix.ts` arm calls the channel.

### Findings, and how each was closed

- **A1. Two false present-tense sentences the needles cannot see.** `src/renderer/terminal/p95-scroll-drive.ts:61-62` and
  `:103-105`, "It is a button that opens the last lines panel now". No needle family matches "the last lines panel", so the
  gate passes them and only reading finds them. Closed: §3.1 item 12.
- **A2. R5's equality would fail at HEAD.** In the running app a session on this Mac's right-click menu carries a
  `Scrollback …` row and a remote session's does not: `showTerminalMenu` reads `scrollback.session`, main answers from
  `readSessionScrollback`, whose `tmuxIdOf` is `liveIds` (`src/main/sessions/core.ts:3033-3036`), which reconcile fills
  with this Mac's own bindings (`:2237-2253`), so a remote id answers null and the row is never drawn. The spec's equality
  ("remote rows equal local rows less the two presets, Clear off") compared the two live menus with that row in, so HEAD
  would read a finding the phase did not cause; and with the window's row in, the parent failed on the equality as well as
  on the row. Closed: §5.3 item 5 drops every `Scrollback …` and every `Read Last Lines` row from both sides before the
  equality, records `scrollbackRows` per side, and R5X holds the remote side at no row at both builds; a self-test fixture
  is the live shape. The vitest cases in §3.2 are unaffected: `terminalMenuItems` is given the same options for both.
- **A3. R5's local half broke 320.1's run order.** `createLocal` opens this Mac's project; the spec read the local menu
  inside the remote group, after which R3 and R2 run. 320.1's second build moved every remote arm before any arm touches this
  Mac because exactly that left the local project showing and R3's stand-in never started
  (`build/p320/probe-p320.mjs:43-48`, `:2396-2399`). Closed: §5.3 item 4, the local half is the first block of "THEN THIS
  MAC", R5 gets two parts in `planParts`, and the grader runs once both halves are read.
- **A4. A held main inspector.** R5 runs before C1 by default and both use `cdpForMain`; the spec did not close R5's session.
  Closed: §5.3 item 2, each half closes its own in a `finally`, as C1 does at `:2583`.
- **A5. The text-file allowlist could hide a spelling.** `P3202_TEXT` read 13 extensions; a `.jsx`, a `.scss` or a fixture
  with no extension would be skipped and the floor would not notice one file. Closed: §5.1, every file is read unless its
  extension is a known binary one or its first 8 KB hold a NUL (the attack's own reader read 2598 files that way, so the
  floor of 2500 holds), with reader fixtures in 54e.
- **A6. The basename rule matched words it should not.** `read[-_]?lines` with no anchor matches `thread-lines.ts`. Closed:
  §5.1, anchored on a word start, with basename fixtures in 54e (`ReadLinesPanel.tsx` matches, `thread-lines.ts` does not).
- **A7. Three ablation defects.** (a) Arm 3 put the `copy-mode` row before the `verb: 'capture-pane'` line, inside that row's
  braces: a syntax error, so the probe would fail to load, the gate would exit 1 with no `54b:` line and the arm would read
  "not red on its owner" for a reason that is not the clause. Closed: the find text is now `  {\n    verb: 'capture-pane',\n`
  (measured to occur exactly once in `exec-plane.ts`). (b) Arm 2 planted `read-lines.ts`, which is on `P3202_GONE_FILES`,
  so the basename rule had no arm. Closed: arm 2 plants `ReadLinesPanel.tsx`. (c) The `words` family and the window's
  STYLES had no arm. Closed: arms 14 (`READ_LINES_TITLE` in `presentation.ts`) and 15 (`.remote-lines-modal` in `app.css`);
  15 arms in all, and §9.3's verifier fixture moved to a shape the ablation does not plant.
- **A8. The CHANGELOG item said something false.** "A session there shows only its current screen" on an unmeasured tmux;
  `b28d0eb4`'s Unreleased item (CHANGELOG.md:27) promises a person that full-screen programs that use the mouse scroll there.
  Closed: §8's item names a plain shell or an agent that prints ordinary lines, in that item's own words; §10.2's row says
  the same.
- **A9. tortie.sh documents the row.** `/Users/gdc/tortiedotsh/src/data/docs.ts:569` lists "Read Last Lines" in the
  terminal menu table, and its demo bundle (`public/demos/app/assets/main-*.js`) was built from a renderer with the window.
  That repository is read only this round and the site describes released behaviour. Closed: §12 names it as owed at the
  release that ships this phase.
- **A10. The CLAUDE.md trigger was too wide.** "Any text file under `src/`" in the Touching column turns a path-triggered
  gate into one every commit runs, a change to the operating contract nobody asked for. Closed: §6, the files the window
  lived in, which are every door it had.
- **A11. A test that passes with the window back.** `p125-machines-surface.test.ts` reads only the families `FAMILIES`
  names, so `sessions.ts` put back and re-exported leaves it green. Closed: §4.2 item 4, the directory must hold exactly the
  eight. (The other new pins hold: the menu cases and `ipc.test`'s exact list are red with the window back, and every
  renderer-only return is caught by condition 54 now that its trigger names the renderer files, A10.)
- **A12. "Drive the store's old action name" was not driven.** The entry asks for it; the page exposes no store handle a
  probe can call, and the spec read the knob instead, which proves the knob gone and not the action. Closed: §5.3 item 4,
  R5 counts `openRemoteLines`, `remote-lines-modal` and `machines:readSessionLines` in the checkout's built
  `out/{renderer,preload,main}` (zero at HEAD, above zero at the parent, graded by R5X), and the staleness lists gain the
  files the row, store, knob and handler lived in, so a stale build is refused rather than read. The parent now fails on
  FIVE window clauses, and every count in the spec says five.
- **A13. The smoke gates bypass `electron-run.mjs`.** `smoke`, `smoke:t1` and `smoke:t3` run `electron .` inside
  `harness-socket.mjs`, against the round's rule that every Electron goes through `electron-run.mjs`. They are the battery
  the entry and CLAUDE.md name, so the spec keeps them and says so (§9.2 step 8): scratch env, count at the end, end by
  pid, and `not run` with the reason if the orchestrator rules them out. Phase 335's hold means no agent starts under them.
- **A14. The shared-files guardrail.** "src/shared/* is append-only during parallel builds" is met in purpose (one writer,
  the integrator reconciles), said in §11. The two concurrent worktrees touch no file this phase deletes (read with
  `git status`, never edited).

### What the attack checked and found sound

The 7 window files and the probe are exactly what the basename search finds; D2's nine exports are all the channel's;
D4 (`stripControls` used at `:614`, imported by nothing else once the three importers go); D6 (re-derived above); D9 (the
config directory is `<profile>/gmux/config`, and `probe:p320` launches with `GMUX_PROBES`, which Phase 335's hold does NOT
cover, so the guard is needed); D11 (every invoke channel is registered by `ipcMain.handle` through
`src/main/typed-ipc.ts:37`, so a second registration throws exactly when one exists); `HELPER_USER_FLOOR` 163 and
`RUNNER_CALLER_FLOOR` 51 (`probe-p100-lines.mjs` imports `scratch-machine.mjs` and `ts-runner.mjs`, not `electron-run.mjs`;
no known-hosts, background or simulator gate keeps a population floor it would lower); every line range in §3.1, §4.1 and
§4.2 against the tree; the p231 ablation's new find text occurs once in `liveness.ts`; the parent build from `git archive`
(no gate inside `npm run build` runs git). The Capture rows, Saved Output, the capsule, `capture-pane`'s ledger row and
`remoteCaptureArgs` are untouched by any edit, and R5X holds a session on this Mac's menu byte for byte.

### Commands the adversary ran (all exit 0 unless named; scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` where a script ran)

| Command | Numbers |
| --- | --- |
| `git -C /private/tmp/wt-p3202 log --oneline -1; git status --short` | `d9f98b54`; only `build/p3202/` untracked |
| `git grep -n -i -E "<the spellings above>"` outside BACKLOG, research and this file | 71 files, each read (§How) |
| `node adversary/norm-scan.mjs /private/tmp/wt-p3202 src` | 2598 files read, 486 hits, mapped file by file (A1, §How) |
| per-export `git grep -l -w <name>` for 15 deleted exports and 10 used helpers | every importer in an edited or deleted file; every helper still used |
| `cp -Rc` clone, the nine files deleted, the barrel's four lines and `probe:p100` removed, `node build/contract-inventory.mjs`, `diff` against the baseline | inventory exit 0; diff exit 1 with exactly 2 lines (§7 confirmed) |
| `node -e` find-text counts in `exec-plane.ts` and `liveness.ts` | arm 3's corrected find 1, arm 13's find 1, `'machines:agents': 'feed'` 1 |
| `git -C /private/tmp/wt-p3167 status --short`, `git -C /private/tmp/wt-p318 status --short` (read only) | both on `c1a5fd38`; shared files listed in §11 |
| `git merge-base d9f98b54 c1a5fd38` | `4a363727` |
| `git -C /Users/gdc/tortiedotsh grep -n -i "read last lines"` (read only) | `src/data/docs.ts:569` and the demo bundle (A9) |

---

## §As built (the integrator, 2026-10-04)

Worktree `/private/tmp/wt-p3202`, still detached at `d9f98b54`; nothing committed, staged or stashed. The integrator edited
no builder file and launched no Electron, no tmux server, no ssh and no agent. Every command below ran in the worktree under
`env -u TERM_SESSION_ID HISTFILE=/dev/null HOME=$V/home ZDOTDIR=$V/home`, with
`V=/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3202/integrate`, where every log is.

### What landed, against §2 to §8

- **The delta.** `git diff --shortstat d9f98b54`: 52 files, 948 insertions, 4,182 deletions, plus the untracked
  `build/p3202/{SPEC.md,ablation.mjs}`. The 9 deletions are exactly §2's. Nothing outside §3, §4, §5 and §6 moved.
- **The renderer half (§3)** is as written, with three small additions: `modals.ts` also says "rather than seven", because
  this phase leaves seven re-exports (D14); the first new menu case also checks that the local menu really holds
  `Capture Last 250 Lines`, `Capture Last 1,000 Lines` and an enabled `Clear`, so the equality cannot pass on an empty
  menu; and three comments were re-wrapped. The exception's lines are now `p95-strip-note.test.tsx:81,86,195,196,197`.
  They were 82, 87 and 196 to 198 before, and moved up by one when line 76 was deleted.
- **The main half (§4, §5)** is as written, with one wording choice: where a sentence records what Phase 125 did, it reads
  "nine domain files (eight since Phase 320.2)" instead of a bare "eight" (D14: history stays history). This applies in the
  barrel, the p125 header, the closure test and the conformance probe. The present-tense counts say eight.
  `build/p320/probe-p320.mjs --self-test` grew from 102 to 119 fixtures.
- **The integrator's documents (§6).**
  - The contract baseline was regenerated. It moved exactly §7's two lines.
  - CHANGELOG: line 28 is deleted, and §8's item is the last `### Changed` item under `## Unreleased` (now line 22), with no
    link yet. `b28d0eb4` still appears once.
  - CLAUDE.md: the two rows as §6 says. In the `probe:p320` row, "every launch" became "every `probe:p320` launch" and the
    local half is placed "as the first arm after every remote one".
  - DEVELOPMENT.md: the `probe:p100` row is deleted.
  - API-CATALOG: `machines (39)`, anchor `#machines-39`, and the two lines are deleted. One more edit was needed: line 556's
    `src/shared/ipc/machines.ts:263` now reads `:266`, because this phase's barrel edits moved `GmuxMachinesExtras` to line
    266 (read with grep).
- **Not foreseen by §4.4.** `conformance:machines`'s stdout moves TWO lines, not one. Line 220 becomes Phase 320.2's line, as
  planned. Line 56 changes from "75 production files under src/main/machines/ were scanned" to 74, because
  `remote-lines.ts` is gone. Every other line is byte for byte the same.

### Commands and numbers

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, `git diff -U0` | 0 | exactly `count=248` → `count=247` and `-machines:readSessionLines` (old line 146) |
| `npm run -s typecheck` | 0 | boundaries 1,389 files, 7,884 imports, 0 violations; 4,789 runtime edges, 0 cycles; shared-types OK |
| `tsc -b --force` (so stale build info hides nothing), then `typecheck` again | 0, 0 | 18 s, no output |
| `npm run -s build` | 0 | 37 s. gate:electron 163 of floor 163 (517 files); gate:background 3 of 3 inside a finally, 19 of 19 fixtures; gate:simulator 2 of floor 2; gate:knownhosts 547 files; gate:checks 254 scripts classified, 52 `tsxCli()` callers against floor 51, 1,052 test files; conformance:ios PASS, 27 rules; conformance:harnessprobes 6 clauses, 16 ablations; probe containment and preview containment OK; contract-inventory matches byte for byte |
| `npm test` | 0 | 1,050 files passed, 2 skipped (1,052); 18,740 tests passed, 14 skipped; 58 s |
| `npm run -s conformance:machines`, diffed with the file count masked | 0 | 298 lines; the scan read 2,590 text files under src/; diff: line 220 (planned) and line 56 (above) |
| `npm run -s conformance:farattach` | 0 | 11 rules |
| `npm run -s conformance:remoteclose` | 0 | 11 of 11 |
| `npm run -s conformance:manager` | 0 | 61 rules, 2,442 checks |
| `node build/p3202/ablation.mjs --self-test` | 0 | 3 gate outputs, 5 verdicts |
| `cp -Rc` clone, `node <clone>/build/p3202/ablation.mjs`, clone removed | 0 | 103 s; control green (16,151 ms); 15 of 15 arms red on their owner; 13 targets back by sha256 |
| `node build/p320/probe-p320.mjs --self-test` | 0 | 119 fixtures |
| `node build/assert-hermetic-checks.mjs`, `node build/assert-electron-teardown.mjs` | 0, 0 | 52 against 51; 163 of 163 |
| `git grep` of every §5.1 spelling over `src` | 0 | only `p95-strip-note.test.tsx:81,86,195,196,197`, the exception |
| `git grep -i 'last lines panel\|opens the last lines' -- src` | 0 | 3 lines, all past tense and required by §3: `modals.ts:14` (item 4), `p95-scroll-drive.ts:105` (item 12) and `p95-strip-note.test.tsx:8` (history, unchanged). A1's two present-tense sentences are gone, and nothing says "opens the last lines" |
| An independent duplicate scan (`$V/dup.mjs`): 10-line windows of normalised code lines that touch an added line, against 3,011 files under src/ and build/ | 0 | 13 windows, all `build/p3202/ablation.mjs:367-548` against `build/p324/ablation.mjs:489-684` (the restore, signals, runner and report tail; §10.1 accepts this house pattern). None in production code |
| Electron, counted once at the end | — | 27 processes, none of them the integrator's: four each under `p313-probe-16378` and `p316-probe-39433` (the phone phase) and under his own `Application Support` profile |

### Left as they are, said so a reviewer is not surprised

- Two comment lines were not re-wrapped after their words grew: `src/shared/__tests__/ipc-invoke-closure.test.ts` (86
  columns) and `build/machines-conformance-probe.mts` (96 columns). They are cosmetic, and no gate reads line length.
- tortie.sh's `src/data/docs.ts:569` and its demo bundle still list the row. They are owed at release (§12).
- Left for the verifier, under the lock: §9.2 (`probe:p320` at the parent and at HEAD, on 3.7b, and `--compare`), §9.3,
  and `package`. The main session runs `smoke:t1`, `smoke` and `smoke:t3`.
