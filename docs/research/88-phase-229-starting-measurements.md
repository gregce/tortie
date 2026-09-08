# 88. Phase 229, starting measurements

Phase 229 measure step. Written 2026-09-07 against the tree at `88dcfad` (`docs(backlog): the remote
gap in phases`), driven against `gregs-mac-pro.tail2ddfe1.ts.net` under Phase 224's bounds plus the
one its committer added. Nothing here is built. This document says what the charter cites and
whether the tree still says it, what the parent draws, which numbers the phase must move, and where a
rebase will fight.

The two probes that took the readings are `.p229/probe-p229-parent.mjs` (settings block, the attack
shapes through the field, saving turned on, the commit) and `.p229/probe-p229-parent-b.mjs` (the
attack shapes sent straight to main, the Explorer titles and the save toast with saving off). Their
reports are committed beside them as `.p229/report-parent-87152.json` and
`.p229/report-parent-b-90808.json`, and the gate logs are under `.p229/logs/`.

## 1. The answer first

Every citation in the charter resolves, four of them one or two lines off, and one mechanism is
under-specified in a way that turns a gate red. The five things the charter says are wrong were all
read off the DOM or off the far side at the parent and are exactly as research 85 described them: a
text input and no picker at `[data-machines-field="write-root"]`; New file and New folder disabled
with the title `Tortie only reads files on Greg’s Mac Pro.`; a save toast carrying only `Dismiss`;
a Commit button that is pressable with git's identity missing over there, answering in 303 ms with
`Author identity unknown` drawn in a visible `<pre>` on the resting face; and no identity field
anywhere in `machines:readBranch`'s answer.

Two things the builder must know before typing.

**The charter's attack list does not match what main's sheet read can do.** `machines:writeSheet`
is pure text validation and contacts no machine, by its own comment and by measurement. Sent
straight over the bridge it REFUSES a control character (LF, CR, TAB), a relative path, a `..` step,
a trailing slash and a single quote, and it DRAWS THE SHEET for a path that does not exist, a path
that is a file, a path with a symlink component, `/private/tmp` and `/`. The charter says each of
those "must be refused by the SAME sheet read main already does" and in the same breath that "the
confirm gate, the hash and the sheet are not changed". Section 5 says what the verifier can
honestly assert.

**Mechanism 4 turns `conformance:machines` red as written.** Condition 56 fails if `repo-branch`
names a git verb other than `rev-parse` and `for-each-ref`, and pins `ALLOWED_GIT_VERBS` at exactly
eight members. `git config --get` is a ninth verb. It is a pure read of three files that reaches no
server, so it meets the list's own test, but the gate has to be widened in the same commit or the
commit battery fails.

## 2. What the charter cites, and whether the tree still says it

| Charter says | Tree at 88dcfad | Drift |
|---|---|---|
| `MachineRow.tsx:280` onward draws Saving files with a text field and a 250 ms debounced `readSheet` | `SavingFiles` opens at :271, `readSheet` at :280, the 250 ms timer at :309, the `<input type="text">` at :353 | none |
| `RemoteDirPicker.tsx` over `machines:listDir`, used by `CreateSessionModal.tsx`, copy in `dir-picker.ts` | `RemoteDirPicker` (stateful) and `RemoteDirPickerView` (pure), mounted at `CreateSessionModal.tsx:1391` with `initialPath={cwd.trim()}`; `DIR_PICKER_OPEN = 'Browse…'` at `dir-picker.ts:16` | none |
| `describeMachine`'s third line at `confirm.ts:445` | :445 is the `writeRoot` guard, :446 the line `May replace files under this folder on that machine: …` | none |
| `Sidebar.tsx:191` and `:195` disable New file and New folder with `remoteTreeReadOnly` as the title | :191 and :195 are the `canCreateFolder`/`canCreateFile` conditions; the TITLES are at :230 and :244 | two lines: the title is 40 lines below the cited condition |
| the title becomes `remoteEntryWritesOff` from `explorer.ts:170`, and the read-only sentence is deleted from `explorer.ts` since nothing draws it after this | `remoteEntryWritesOff` is at :170; `remoteTreeReadOnly` is at :84 | **one more drawer**: `FilesSection.tsx:158` draws `remoteTreeReadOnly(label)` as the tree menu's disabled last row (`readOnlyNote`). Deleting the function means changing that site too, and the two tests that name it, `p903-b-tree-menu-remote.test.ts` and `p903-c-remote-copy.test.ts` |
| `editor.ts:45` says the toast carries an Open settings button | the sentence is at :46 | one line |
| `tab-io.ts:459` passes only `{ sticky: true }` | :459 exactly; `sticky` is `{ sticky: true } as const` at :454 | none |
| another call site passes an action with exactly that label | `subscriptions.ts:677`: `action: { label: 'Open settings', run: openSettings }`; `openSettings` is a local closure at :651 over `gmux?.openSettings?.()`, not an export | the builder writes the same three lines, there is nothing to import |
| `remoteCommitDisabledReason` at `scm.ts:348` | :348; order is committing, writesConfirmed, connected, conflicted, staged, message | none; `identity` goes after `connected` and before `staged` |
| `RemoteCommitFacts` gains `identity` | `scm.ts:312`; composed at `ScmSection.tsx:788` from `entry` (the `useRemoteChanges` store) and `machineStates` | **the branch answer lives in a different store**: `src/renderer/scm/remote-branch.ts:181` holds `readBranch`'s result, and `RemoteCommitBox` reads none of it today |
| the read that fills the branch section runs a script on that machine on every refresh | script `repo-branch`, text at `remote-scripts.ts:1652`, catalogue entry at :2809; door `readBranchOnMachine` at `remote-branch.ts:280`; channel `machines:readBranch` at `ipc.ts:1540` | none, but see the gate in section 1 |
| the commit script at `remote-scripts.ts:2905` is not changed | :2905 is `id: 'git-commit'` | none |
| git's raw text goes behind a disclosure the way Show details works elsewhere | the `<pre data-scm-commit-said>` at `ScmSection.tsx:906`; the pattern is `CloneRepoModal.tsx:292` (`detailsOpen ? 'Hide details' : 'Show details'`) | none |
| main already composes the identity sentence | `remote-copy.ts:948` `commitIdentityUnset`, matched by `remote-commit.ts:283` `identityUnset` on four phrasings | none |
| Phase 228 lands first | `/private/tmp/wt-p228` is at `6bc73ce`, one commit past this parent, its measure step only | 228 has NOT landed; section 6 |

### The data flow this phase touches, in ten lines

```
Settings window                     main                                 the Mac Pro
MachineRow.SavingFiles ── typed ──▶ machines:writeSheet (pure) ──────────▶ nothing
   [+ RemoteDirPicker] ── listDir ─▶ machines:listDir ──── dir-list ─────▶ ls of one folder
   allow-writes ─────────────────▶ machines:allowWrites → setMachineWriteRoot + recordAgreement
Main window
Sidebar.tsx:230/:244 ◀── machineStates.writeRoot (presentational) ◀── machines:state
tab-io.saveOnMachine ── writeRoot null ──▶ toast(remoteSaveRefused) ; else machines:putFile ─▶ file-put
scm/remote-branch.ts ── machines:readBranch ─▶ remote-branch.ts ── repo-branch ─▶ rev-parse ×2, for-each-ref
scm/remote-changes.ts ── machines:commit ────▶ remote-commit.ts ── git-commit ──▶ git commit (fails: no identity)
ScmSection.RemoteCommitBox ◀── facts from remote-changes + machineStates (branch store NOT read today)
```

## 3. The p224 probes, and which of them the verifier can re-run for the parent reading

| Probe | What it read at 761776a | Re-runnable for 229 |
|---|---|---|
| `probe-p224d.mjs` arm C, `writeControlsDriver` in `driver2.mjs:195` | the Explorer header titles WITH a write root, a real Stage press (255 ms), a real Commit press, `afterCommitBody` carrying `Author identity unknown` on the face, the five refresh buttons | yes, whole. It is the commit half of this phase's parent reading and it confirmed the same body text here |
| `probe-p224d.mjs` launch A | confirming a row and turning saving on through the real controls, `openWrites` → `type` → `allow-writes` | yes; `.p229/probe-p229-parent.mjs` launch C is that arm under this phase's fixture |
| `probe-p224b.mjs` | the disabled New file and New folder titles, on a DISCONNECTED tab | the title reading only; the connected-tab reading with saving off is `.p229/probe-p229-parent-b.mjs` launch B, which p224 never took |
| `probe-p224.mjs` launch B `writes.commit` via the bridge | `machines:commit` answering `failed` with `machineSaid` in 123 ms | yes, for the bridge number; the face number is arm C above |
| `far-fixture.mjs`, `far-final.mjs`, `far-sockets-remove.mjs` | the scratch repository, the closing count, the socket removal | `.p229/far-fixture.mjs` is the same fixture plus one symlink; the closing count's commands are in both p229 probes' `finally` |

Not re-runnable for this phase: `probe-p224c/e/f.mjs` (boot cost, trees side by side, the watcher
comparison) measure Phases 230 to 232's subjects.

One reading the verifier should take that no probe has: the shipped `p104-commit-drive.ts`
(`window.__gmuxP104Commit`, registered on a harness launch) types into the real box and presses the
real button in `seed` mode with no far side at all, which is the cheapest way to photograph the new
`identity: 'missing'` reason and the disclosure without a machine.

## 4. The parent reading, taken 2026-09-07 at 88dcfad against his Mac Pro

Two runs, `/private/tmp/p229-run-87152` and `/private/tmp/p229b-run-90808`, six Electrons in all,
one after another and never at once, each on a scratch profile and the scratch socket
`gmux-p229-<pid>`, all ended by `build/electron-run.mjs`. Every ssh went through
`build/ssh-run.mjs`. His `~/.gitconfig` on that machine was read with `git config --global --get`
and never written: 140 bytes, mtime 8 May 2024, before and after.

### 4.1 Settings, Machines, Saving files (run 1 launch A, run 2 launch A0)

| Reading | Parent |
|---|---|
| the field | `<input type="text" data-machines-field="write-root">`, value empty |
| a picker | none: no `.dirpick`, no `[data-dirpick-action]`, no button whose text is `Browse…`; the block's only buttons are `Let Tortie save files here…` and, once on, `Stop Tortie saving files here` |
| words on the block, saving off, resting | **41** (heading, a 33-word paragraph, a 5-word button) |
| words on the block, saving off, field open | **41** (the paragraph stays; the button becomes the field label) |
| words on the block, saving on | **107** (heading, the folder sentence at 13, `writeHonesty` at 58, `STOP_SAVING_EXPLAIN` at 27, the button) |
| the sheet's third line for the scratch root | `May replace files under this folder on that machine: /Users/gdc/tortie-p229-scratch-87152` |
| the row after allow-writes | `state: confirmed, usable: true, writeRoot: /Users/gdc/tortie-p229-scratch-87152` |

The charter keeps "one sentence naming the folder". 107 is the number it moves.

### 4.2 The attack shapes, sent to `machines:writeSheet` over the bridge (run 2 launch A0)

| Shape | Typed | Main's answer at the parent |
|---|---|---|
| a newline | `<root>\nx` | REFUSED: "contains a control character" |
| a carriage return | `<root>\rx` | REFUSED, same sentence |
| a tab | `<root>\tx` | REFUSED, same sentence |
| relative | `tortie-p229-relative` | REFUSED: "must be a full path starting with /" |
| `..` | `<root>/src/../lib` | REFUSED: "contains a \"..\" step" |
| trailing slash | `<root>/` | REFUSED: "ends with a slash" |
| single quote | `<root>/it's` | REFUSED: "contains a single quote" |
| does not exist | `<root>/does-not-exist-p229` | **SHEET DRAWN**, third line names it |
| is a file | `<root>/README.md` | **SHEET DRAWN** |
| symlink component | `<root>/link-to-src/core` (the fixture's `link-to-src -> src`) | **SHEET DRAWN** |
| outside his home | `/private/tmp` | **SHEET DRAWN** |
| the root | `/` | **SHEET DRAWN** |

Through the real `<input>` (run 1) the newline reads differently: the element strips the line break
before React sees it, so the field showed `…87152x` and the sheet was drawn for THAT path. A verifier
typing a newline into the field is measuring HTML input sanitisation, not main. Send it over the
bridge.

The five drawn rows are not a defect at the parent. The comment on `machines:writeSheet` says it
"starts nothing, opens no connection, sends nothing to any machine and writes nothing at all", and
`writeRootField` at `schema.ts:233` is a string check by design. What they are is a hole in the
charter's proof, and section 5 says how to state it honestly.

### 4.3 The Explorer with saving off, connected (run 2 launch B)

| Reading | Parent |
|---|---|
| machine link | `connected` in the first poll, `writeRoot: null` |
| tree | 9 rows in 101 ms (`docs/`, `lib/`, `link-to-src/`, `src/`, `tests/`, `.gitignore`, `NOTES-untracked.md`, `package.json`, `README.md`) |
| New file | `disabled: true`, title `Tortie only reads files on Greg’s Mac Pro.` |
| New folder | `disabled: true`, same title |
| standing prose on the view | one paragraph, `Read at 22:35. Press Refresh to read it again.` (Phase 228's clock; the band research 85 counted is not drawn on a connected tab with a tree) |

With saving on (run 1 launch D) both read `disabled: false` with titles `New file` and `New folder`,
which confirms research 85's withdrawn reading and is what the picker unlocks.

### 4.4 The save toast (run 2 launch B)

A remote file tab opened from Source control's `core1.ts` row; the editor band read `This file is on
Greg’s Mac Pro. Tortie is showing what it read and cannot save it until you let it save on that
machine.`; Cmd+S dispatched on `window`. The toast arrived in 101 ms:

- text: `Tortie cannot save on Greg’s Mac Pro. Open Settings, then Machines, then Greg’s Mac Pro, and let Tortie save files there. Nothing was written.`
- buttons: `["Dismiss"]`, `.btn-text` action buttons: `[]`

That is the number: zero action buttons. The charter moves it to one, labelled `Open settings`.

### 4.5 The commit with git's identity missing (run 1 launch D)

git on that machine: `git version 2.39.5 (Apple Git-154)`, `user.name` unset (rc 1), `user.email`
unset (rc 1), `user.useConfigOnly` unset. It refuses rather than guesses, as p224 measured:
`fatal: unable to auto-detect email address (got 'gdc@Mac.(none)')`.

| Reading | Parent |
|---|---|
| Source control first Stage button | 102 ms after the rail press |
| Stage `helper1.ts` through the real button | the view changed at 404 ms |
| Commit button, empty box | `disabled: true`, title and caption `Enter a commit message` |
| Commit button, message typed, identity missing | **`disabled: false`**, title `Commit on Greg’s Mac Pro`, no caption |
| the press | answered at **303 ms** |
| main's sentences on the face | `The commit failed on Greg’s Mac Pro.` then `git on Greg’s Mac Pro has no name and no email address set, so it would not make the commit. Set user.name and user.email in git on that machine.` |
| git's own words | a `<pre data-scm-commit-said>`, **visible**, 13 lines, 46 words, not inside any `<details>` and not under any `aria-expanded` control, beginning `Author identity unknown` |
| Commit button afterwards | still `disabled: false` |
| far side reflog before / after | 6 / 6, HEAD `98dba6a` unchanged, `git log` still three commits |
| `machines:readBranch` answer keys | `machineId, machineLabel, cwd, mode, branch, sha, shortSha, upstream, upstreamGone, ahead, behind, trackUnreadable, readAt, elapsedMs`: no identity field |
| words in `<p>` elements on the remote Source control view | 148 (Phase 228's subject, recorded so 229's verifier can read the face after 228 lands) |

The four numbers the phase must move: `disabled: false` → `true` with a reason naming the two
settings, BEFORE the press; `visible: true` on the `<pre>` → behind a disclosure; the reflog stays
6 / 6 with NOTHING sent, which the parent already satisfies only because git refused; and the
branch answer gains an identity.

### 4.6 What was left on the far side, counted at the end of each run

Both runs: the `gmux` server held exactly one session before and after, `gmux-control created
1787879931 attached 1`. Two tmux processes there, both his: the bundled tmux that started the gmux
server 11 days ago (pid 1041) and the `/usr/local/bin/tmux … -C new-session -A -s gmux-control`
client (pid 93072). `ls -d /Users/gdc/tortie-p229-scratch-* /Users/gdc/tortie*` → NONE. The scratch
socket `gmux-p229-87152` and `gmux-p229-90808` each answered `SOCKET-GONE` from the same `finally`
that killed its server, and `/private/tmp/tmux-501` holds `gmux` alone afterwards. His
`authorized_keys` there is 88 bytes with its 18 August mtime and there is no `known_hosts` on that
machine. On this Mac: local `gmux` sessions 13 before and 13 after, both runs; Tortie's record file
113 bytes and `~/.ssh/known_hosts` 2,215 bytes, unmoved; the ssh agent holds no identities. Electrons
counted once at the end with the CLAUDE.md command: every process found belongs to his own
`electron-vite dev` from `/Users/gdc/gmux` (pid 83080, 11 h old) or to Chrome, Slack, Granola and
Screen Studio; nothing from `/private/tmp/wt-p229` or either scratch profile survived.

## 5. The gates at the parent, run rather than read

All to `.p229/logs/`, none piped to `tail`.

| Gate | Result | Log |
|---|---|---|
| `npm run typecheck` | exit 0; no runtime cycles over 1,186 files, shared types OK | `gate-typecheck.log` |
| `npm run build` | exit 0; contract inventory matches the baseline byte for byte | `gate-build.log` |
| `npm run smoke:t1` | exit 0; `6/6 PASS (verify)`, scratch server `gmux-smoke-t1-wt-p229-70326` ended | `gate-smoke-t1.log` |
| `npm run conformance:machines` | exit 0; `PASS. A machine confirmation is bound to the six fields…` | `gate-machines.log` |
| `npm run conformance:remoteclose` | exit 0; 11 tests passed | `gate-remoteclose.log` |
| `npm run gate:knownhosts` | exit 0; 278 files read, 19 reach `ssh-run.mjs`, 36 fixtures behaved | `gate-knownhosts.log` |

### What the verifier can honestly assert for the attack, given 4.2

The picker's `Use this folder` is disabled until a listing answered with `refusal === null`, and
`machines:listDir` answers `missing`, `notdir` and `denied` for the folder it was pointed at, so a
path chosen THROUGH THE PICKER exists and is a folder on that machine at the moment it was chosen.
The typed field stays and the sheet read stays pure, per the charter's own "the sheet is not
changed". So the attack should be stated as: (a) the five refused shapes stay refused over the
bridge, byte for byte the parent's sentences; (b) none of the five drawn shapes can be CHOSEN in the
picker, because the picker cannot land on a file, a missing folder or a path with a newline, and
the verifier proves it by driving the picker at each; and (c) a path typed into the field is exactly
as it is at the parent, and the verifier says so rather than claiming a refusal main does not make.
If the round instead decides that `writeSheet` should ask the machine once (a `dir-list` read,
starting nothing), that is a change to the sheet read and the charter's "not changed" line has to
be amended in the same commit. The measure step recommends (a)–(c). The symlink shape is the one
open question even for the picker: whether `dir-list` follows a link is UNMEASURED here, and the
verifier should drive `link-to-src` in the picker and record what the machine reports.

## 6. The smallest set of files, and where a rebase will fight

### The builder touches

- `src/renderer/settings/MachineRow.tsx` (:353 field; the picker beside it, opening at `initialPath=''` which is the machine's home; choosing fills `draft`) and `src/renderer/settings/machines-copy.ts` (:269 onward: the block keeps `SAVING_TITLE`, the one folder sentence `savingOnLine`, the field label and the two buttons; `savingOffExplain` at :278, `STOP_SAVING_EXPLAIN` at :312 and the resting `writeHonesty` paragraph come off the resting face). `src/renderer/app/remote-dir-picker.css` is imported by the picker already.
- `src/renderer/app/Sidebar.tsx` :230 and :244 (title → `remoteEntryWritesOff`), `src/renderer/tree/FilesSection.tsx` :158 (the menu's disabled row), `src/renderer/machines/explorer.ts` :84 (delete `remoteTreeReadOnly`), and the two tests `src/renderer/tree/__tests__/p903-b-tree-menu-remote.test.ts`, `src/renderer/app/__tests__/p903-c-remote-copy.test.ts`.
- `src/renderer/editor/tab-io.ts` :459 (`{ sticky: true, action: { label: 'Open settings', run: () => void gmux?.openSettings?.() } }`); `src/renderer/machines/editor.ts` :46 stays true once that lands.
- `src/main/machines/remote-scripts.ts` :1652 (`REPO_BRANCH` text: two `git config --get` reads printed into the answer; the comment block above it counts programs and says "five", which becomes seven and must be re-measured, since the gate reads that prose in places) and :2809 (the entry's `reason`); `src/main/machines/remote-branch.ts` (`parseRepoBranchAnswer`, the result); `src/shared/ipc/machines/scm.ts` :526 (`MachineBranchResult` gains identity; the contract inventory lists channel NAMES, `machines:readBranch` at baseline line 135, so no baseline regeneration is needed unless a channel is added, and none is planned); `src/main/machines/__tests__/remote-branch.test.ts`.
- `build/conformance-machines.mjs` :2774 (`ALLOWED_GIT_VERBS` to nine with `config`, `ALLOWED_GIT_VERBS_SORTED` :2786, and condition 56's "names a git verb other than `rev-parse` and `for-each-ref`"). This is the file that goes red first if forgotten.
- `src/renderer/scm/remote-branch.ts` (the store carries identity), `src/renderer/machines/scm.ts` :312 and :348 (`RemoteCommitFacts.identity`, the reason after `connected`, the sentence naming `user.name` and `user.email`), `src/renderer/scm/ScmSection.tsx` :788 (facts read the branch store) and :906 (the `<pre>` behind a `Show details` control), `src/renderer/scm/__tests__/p104-commit-box.test.ts` (the ablation pin).
- `CHANGELOG.md`, `docs/BACKLOG.md` running log.

### Where another phase in flight is likely to touch the same lines

- **Phase 228** (`/private/tmp/wt-p228`, at `6bc73ce`, measure step only, NOT landed although the charter says it lands first): `Sidebar.tsx` (the same header region; 228 leaves the two titles alone by its own entry), `FilesSection.tsx` (the read-at line and the band), `explorer.ts` (`remoteTreeCanWrite` :101, `remoteTreeReadAt` :19, beside 229's deletion at :84), `ScmSection.tsx` `RemoteCommitBox` (228 moves the hooks-and-signing line at :893 onto the Commit BUTTON's `title`, and 229 changes that same button's `title`/disabled reason at :876), `machines/scm.ts` (`remoteCommitStanding` :213 beside 229's :312/:348), and both `p903-*` tests. This is the rebase that will conflict, and the committer should rebase 229 onto 228's tip rather than the reverse.
- **Phase 225** (`/private/tmp/wt-p225` at `9feaf0a`): `src/renderer/editor/tab-io.ts` (the redline's read path) beside 229's :459; `EditorPanel.tsx`, `store.ts`. **Phase 227** is the redline write and its entry names the editor files without paths; expect `tab-io.ts` and `RedlineDocument.tsx` again.
- **Phase 230** (not started): the `remoteAnswering` hook goes into `src/renderer/scm/remote-branch.ts` and `RemoteBranchSection.tsx`, the same store 229 adds identity to; 230 also removes the read-at clock 229's launch B read.
- **Phase 231**: `remote-run.ts`, `machine-state.ts`, none of 229's files.

## 7. What was not measured

No Linux far side. Whether `dir-list` follows a symbolic link (section 5). The picker itself on
this surface, since it does not exist at the parent. The live re-read of the branch answer after a
commit, which is Phase 230's. No agent turn was started on either machine and no token was spent.
