# build/p324 — tmux 3.6 and 3.6b on both version lists

Phase 324, "add to allow list but dont add a weird label" (docs/BACKLOG.md, `## Phase 324`; research 131 whole,
§4.3 the judge's policy, §7 the per-version verdicts, §11 item 1). This is the phase's spec step: the entry
reconciled with the tree at `5866b527` (origin/main), step 0 measured rather than argued, every seam decided with
its reason, and the build split between three builders with disjoint files. Written 2026-09-29.

**What this document is not.** It is not the proof. The numbers in §2 and §13 are the spec step's, read on scratch
sockets with the shipping modules, so the builders start from measurements and not from guesses. The verifiers
re-derive all of it by methods of their own (§10).

---

## 0. The phase in one paragraph

Two rows join `TESTED_REMOTE_TMUX_VERSIONS`, `3.6` (what Ubuntu 26.04 LTS's `3.6a-2ubuntu0.1` prints) and `3.6b`
(Debian 13's trixie-backports), each `measured: { exec: true, control: true }`, each with a PLAIN subject naming the
upstream tarball, its sha256 and the builder, and a note in the 3.7c note's register citing `npm run probe:p324`.
The renderer's drawn copy of the list follows. Nothing in either gate's logic moves by a byte. A new
`conformance:machines` condition 100 pins the thing that makes admitting a 3.6-family server safe, being the
transport's precheck read before every spawn of a far control child through the same program, and holds the rows
to the pin and to his ruling as text. `ablation:p324` proves each clause can fail. `probe:p324` is the measurement
the two notes cite, and it reads no server of his. After this phase a machine on 3.6 or 3.6b is prepared with no
acceptance sheet and gets the live connection; at the parent it gets the sheet and then the timer feed.

---

## 1. Where the entry disagrees with the tree, and the decision at each seam

### 1.1 What moved since the entry was written (entry read at `e371324b`, tree at `5866b527`)

`git diff --stat e371324b..5866b527 -- src` is EMPTY: no source file moved. Only `build/`, `CLAUDE.md` and
`package.json` changed (the 316.x work). Every `src/` citation was re-read at `5866b527`:

| Entry says | The tree at `5866b527` | Decision |
| --- | --- | --- |
| `version.ts:171-237` table, `:172`/`:187` the 3.6a row, `:157-161`, `:163-165` header, `:261-269`, `:271-282`, `:314-316`, `:318-331`, `:339-344`, `:366-373` | all hold | unchanged |
| `control-plane.ts:46-56` header, `:474-493` transport, `:477-483` precheck, `:486` plan, `:503-516` assert, `:514`, `:565-589`, `:581`, `:585` | all hold (`:503-516` is the whole function; research 131's `:503-518` includes two blank and rule lines) | unchanged |
| `control-client.ts:108`, `:282-344` `start()`, `:287`/`:288`/`:289`, `:566-575` `scheduleReconnect` | all hold | unchanged |
| `prepare.ts:260-262`, `:360-385`, `:369`, `:387-414`, `:397`, `:174-202`, `:428` | all hold (the mismatch `if` is `:365`) | unchanged |
| research 131 §4.1's launch sign-in `core.ts:1350` | **`src/main/sessions/core.ts:1373`** | cite `:1373` |
| `machines-copy.ts:639`, `AddMachine.tsx:514-517`, `machines-copy.test.ts:474-485` | hold (the assertion is `:484`) | unchanged |
| `version.test.ts:645`, `:648`, `:655`, `:759` | hold; **`:757`'s title and comment are also false after this phase** (see 1.2 item 6) | both titles move |
| `conformance-machines.mjs:1136-1180` condition 17 | holds | unchanged |
| `machines-conformance-probe.mts:738-748`, `:465-467` | hold | `:738-748` gains `note` (1.2 item 7) |
| `probe-execplane.mjs:668-686` text parse | holds: `indexOf('TESTED_REMOTE_TMUX_VERSIONS')` at `:668`, the `^\s*version: '([^']+)',$` regex at `:680` | the rule stands |
| `docs/BACKLOG.md:34467-34469` ("without the scroll, or not at all") | **now `docs/BACKLOG.md:34713-34715`** (the backlog grew) | cite `:34713-34715` |
| `build/verification-checks.mjs:232-268` kinds, `:250-255` the `tmux` helper | **`NEEDS` at `:206-222`, `SKIP` at `:244-252`, `pure` at `:254`, `tmux` at `:272-277`, `remote` at `:278`** | cite the new lines |
| `HELPER_USER_FLOOR` 153 at `build/assert-electron-teardown.mjs:326` | holds | this phase starts no Electron, so it stays 153 |
| `build/vendor/tmux-probe/` does not exist | still absent in this worktree | Builder C builds into it |
| `docs/audits/contract-baseline.txt` names no tmux version | re-grepped: 0 matches for `3.6a`, `3.7b`, `3.7c` | `gate:contract` must not move |

### 1.2 Where the entry is wrong, or cannot be followed as written

1. **Research 131's scratch evidence is gone.** `find scratchpad/p322 -type f | wc -l` reads **0** on
   2026-09-29: the directory skeleton survives and every file (the 22 builds, `A/harness/drive.mts`,
   `adv/harness/pairs.mts`, every raw result) was removed by macOS's `/private/tmp` cleaner. So:
   - the probe cannot be "research 131's `drive.mts` and `pairs.mts`, moved into the tree". **It is written fresh
     in the tree from research 131 §3.3 and §3.4's descriptions**, driving the SHIPPING modules (step 0, §2);
   - step 0's fallback ("copy `A/harness/drive.mts`") no longer exists, and is not needed (§2);
   - "Research 131's builds, where they still exist in scratch, their sha256 is recorded beside the verifier's
     rebuild": none exist. The entry's table of their sha256 stays the only record. A rebuild will NOT reproduce
     those digests anyway: the binary embeds its build prefix, and the spec step's own build of upstream 3.6 through
     the shipping builder hashes `f0f96c3f…` against research 131's `83f167cf…` (§13). The tarball's sha256 is the
     identity; a binary's is only a label for one build;
   - the 19 crash reports research 131 §10 names are gone too: `~/Library/Logs/DiagnosticReports/tmux-*.ips` counts
     **0** today.
2. **"At the parent, only the gate and Prepare columns differ from HEAD" is false once the live arm drives the
   shipping precheck**, which step 0 says it does. Measured at this head (which IS the parent): for 3.6 and 3.6b,
   the shipping `openControlPlane` returns `false` with the link `polling / runs a version Tortie has not measured`,
   and a `TmuxControlClient` over the shipping `remoteControlTransport` is refused before any spawn with
   `CONTROL_DIALECT_UNMEASURED`. So the probe carries TWO live arms (§6.4): **C**, the shipping transport, which
   differs at the parent by design, and **D**, the same client over a gate-free transport with the same plan,
   which is identical at both builds and shows the wire did not change. The parent rule becomes: exactly the exec
   gate, the control gate, Prepare's version step, G (`openControlPlane`) and C differ, for exactly the two new
   strings; every other cell is identical (§6.7).
3. **The carriage must pass two commands that carry no `-L`.** A stand-in that allowed only strings holding
   `-L p324-` refused the no-server `-V` read and the `PATH` capture (`"$SHELL" -lc 'printf __TORTIE_PATH__…'`),
   and the shipping `ensureRemoteServer` then threw (measured, §13 row 6). The entry's "no `-L` at all apart from a
   `-V` read" count must also admit the PATH capture, which runs no tmux at all. §6.2 fixes the allowlist.
4. **Prepare cannot be driven as `prepareMachine` without a confirm store.** `buildRemoteMachineContext` asks the
   confirm gate first (`context.ts:452`) and Prepare's success path starts the feed and an agent scan. So
   "Prepare's outcome" is composed from the shipping pieces Prepare runs, in Prepare's own order:
   `readRemoteTmuxVersion` (`prepare.ts:174`), `decideRemoteVersionGate(version, TESTED_REMOTE_TMUX_VERSIONS, null)`
   (`:387`), the sheet rule (`sheetFor`, `:341-358`: a sheet exactly when the version is not null), then
   `ensureRemoteServer` (`:418`). All three load and run under the pinned tsx with no Electron (§13 row 7).
   The column is labelled as composed, never as `prepareMachine`.
5. **Condition 100a's "with no `return` between them" is dropped.** A `return` between the precheck and the spawn
   can only prevent a spawn, never allow one without the read. A guard of exactly that shape (stop called while the
   precheck is awaited) is a safety fix a later round may want, research 131 §9 item 9's class. The property kept is
   the one that matters: the precheck is the FIRST statement of `start()`'s `try`, and the class's ONE `spawn(` sits
   at that `try`'s top level after it (§4).
6. **`version.test.ts:757` also becomes false.** Its title reads "holds the three versions the probes measured on
   the exec plane" and its comment says `build/probe-execplane.mjs` "is the evidence for all three". The entry
   named only `:648`. Both move (§3.4).
7. **Condition 100d/100e need each row's note.** `machines-conformance-probe.mts:738-748` hands condition 17 the
   `subject` and only the note's LENGTH. One field, `note: row.note`, is added so condition 100 reads the imported
   value rather than re-parsing a string built with `+` across lines.
8. **Condition 100e is widened to the entry's own text.** Mechanism item 1 says neither field names a
   distribution, "no Linux binary run", "or either 3.6-family defect", and 100e as drafted checked only
   distributions and Linux. The ban list gains the defect words (`SIGKILL`, `5049`, `control_stop`, `crash*`,
   `wedge*`) and `patch*`, and it reads the array block's comments too ("no comment in the table's rows"). Proved
   green on today's three rows (§13 row 9).
9. **The `tmux()` check helper cannot state the probe's truth.** It hard-codes `SKIP.never` and the vendored-tmux
   `NEEDS` (`verification-checks.mjs:272-277`), and `probe:p324` refuses with exit 2 when a build is missing and
   needs four probe-only builds and Homebrew's 3.6a. The helper is widened to `tmux(name, needs = NEEDS.tmux,
   skip = SKIP.never)`, the shape `pure`, `electron` and `remote` already have, so every existing entry is
   byte-identical (§7.2). The entry allowed this ("unless the builder widens the helper in the same commit").
10. **`probe:controldeadline` reads a count of his `-L gmux` sessions** (`build/probe-control-deadline.mjs:271-278` and
    `:1191`, before and after, a read). The entry names that probe because `control-plane.ts` is touched (comments only).
    This is the ONE read of his server in the phase, it is a count and never typed into or ended, and it is run by
    the verifier and nobody else. If the orchestrator rules that count out, the part to drop is the header
    paragraph (§3.3), which is comments only and whose fact condition 100 already carries executably; then the
    probe is not triggered. Nothing else moves.
11. **The workflow's hard rules move the Electron gates off the integrator.** CLAUDE.md says integrators run
    smoke, smoke:t1 and smoke:t3; the hard rules say builders and integrators launch no Electron. So those three run
    in the verifier, under THE LOCK (§9, §10).

### 1.3 His message in this run

The only user voice relayed to this run is "yeah include them and to test 320.1 u can attach to my mac pro to drive
sessions and verify". Read with the running log of 2026-09-29 ("PHASE 320.1 STARTS, and it is in the release"):
**"include them" is read as this phase going into the same release as 320.1**, which changes nothing in the build
(the item still goes under `## Unreleased`; there is no bump or tag in this commit) and adds one coordination
duty (§11). It is not read as reversing "Not now": rows for 3.2a to 3.5a cannot be added by rows alone, because
Prepare fails at row 4 or row 10 on those servers (research 131 §1 item 1), so no reading of it changes this
build. **His Mac Pro is not used by this phase.** The permission is worded "to test 320.1"; this entry says no
real machine and no ssh; and the Mac Pro runs Homebrew's 3.7c (the 3.7c row's subject), which is already on both
lists, so it could measure nothing this phase adds.

---

## 2. Step 0, answered by measurement: the shipping modules drive unchanged under the pinned tsx

**Yes.** Measured 2026-09-29 at `5866b527`, `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.node.json`:

- `control-plane.ts`, `exec-plane.ts`, `context.ts`, `control-client.ts`, `version.ts`, `remote-server.ts`,
  `server-options.ts`, `remote-sessions.ts`, `attach-plan.ts`, `scroll.ts` and `prepare.ts` all import with no
  Electron in **609 ms** (`prepare.ts`'s `import { app } from 'electron'` resolves to nothing under plain node and
  is never touched when `packaged` is passed or the context is built by hand).
- A `RemoteMachineContext` object literal registered with `registerRemoteMachineContext`, with
  `setMachineRemotePath`, whose `sshBin` is a `/bin/sh` stand-in that runs only its LAST argument through
  `/bin/sh -c` (what sshd does with it): the shipping `execOn` boots the server with `remoteBootArgs()`, the
  shipping `TmuxControlClient(remoteControlTransport(id))` runs its precheck through `execOn`, composes its plan
  through `tmuxCommand`, spawns, and greets: **22 ms on Homebrew 3.6a, 19 ms on the vendored 3.7b**; one
  `list-sessions -F REMOTE_LIST_FORMAT` over the live connection byte-equal to the same over exec (65 of 65 bytes
  on both). 12 far strings recorded, 12 carrying `-L p324-`, 0 without.
- The shipping `readRemoteTmuxVersion` and `ensureRemoteServer` over the same stand-in (once widened, 1.2 item 3):
  `born: true`, **12 of 12 rows agree** on 3.7b and on upstream 3.6, 240 ms and 213 ms.
- The shipping `openControlPlane(id)` runs too, which is what makes the G arm (§6.4) the product's own entry point.

So **the probe drives the shipping precheck, plan, client, boot and version read with no copy**, and every far
string is `tmuxCommand`'s or `shellCommand`'s own. The probe's header says so.

---

## 3. The product half (Builder A)

### 3.1 `src/main/tmux/version.ts`

**Two rows, inserted in version order**, so the list and every sentence composed from it read
`3.6, 3.6a, 3.6b, 3.7b and 3.7c`: `3.6` immediately before the 3.6a row (before `:172`), `3.6b` immediately after
it (after `:187`). **The 3.6a, 3.7b and 3.7c rows do not change by one byte.** Each `version: '<v>',` stands alone on
its line (the `probe-execplane.mjs:680` regex). Exact text, 3.6 row:

```ts
  {
    version: '3.6',
    measured: { exec: true, control: true },
    measuredAt: '2026-09-29',
    subject:
      'the upstream tarball at ' +
      'https://github.com/tmux/tmux/releases/download/3.6/tmux-3.6.tar.gz, ' +
      'sha256 136db80cfbfba617a103401f52874e7c64927986b65b1b700350b6058ad69607, ' +
      'built by "node build/build-tmux-version.mjs 3.6" on this Mac with ' +
      '--enable-utf8proc and --disable-jemalloc.',
    note:
      'Built here by "node build/build-tmux-version.mjs 3.6" and reached by ' +
      '"npm run probe:p324" on a scratch server on this same Mac, through ' +
      '/bin/sh in place of the sign in program. All four exec plane shapes ' +
      'answered as this build expects. list-sessions -F answered one row ' +
      'reading $0 on a server holding one session, and no rows with exit 0 on ' +
      "a running server holding none. display-message -p '#{version}' " +
      'answered 3.6 with exit 0. show-options -gv history-limit answered ' +
      '25000, and 12 of 12 server options stuck after the boot and again ' +
      'after the server was ended and reborn. A machine with no server ' +
      'answered "error connecting to <the socket path> (No such file or ' +
      'directory)" with exit 1. The list format answered its ten fields and ' +
      'read back through the parser. Control mode was opened by the shipping ' +
      'client through its own precheck and plan, and its stream matched the ' +
      "3.6a row's copy, driven the same way in the same run, on all eight " +
      'comparable steps, being the greeting, the no output block, the guard ' +
      'shape, the notifications on a create, a kill and a rename, the rename ' +
      'argument order, the window traffic, the exit line, and one list ' +
      'compared byte for byte against the same list over the exec plane.'
  },
```

The 3.6b row is the same with `3.6b` in the version, the URL
(`https://github.com/tmux/tmux/releases/download/3.6b/tmux-3.6b.tar.gz`), the sha256
(`390759d25fdba016887ec982b808927e637070fd7d03a8021f8ef3102b9ae3c7`), both builder commands and "answered 3.6b".

Why each choice:
- **The subject is the first sentence of the 3.7c subject's shape and nothing more** (ruling 1; Phase 83's rule
  that a row names which copy was read, `:144-149`). The URL and sha256 were re-checked by the spec step: both
  tarballs download from those URLs and hash to exactly those values, and each unpacks to `tmux-<v>/`, which the
  builder requires (§13 row 3).
- **The note says only what `probe:p324` measures** (§6), in the order the 3.7c note uses. "25000" and the
  no-server sentence were measured on 3.6 and 3.6b by the spec step (§13 rows 7 and 10); the integrator confirms
  both against the HEAD run and changes a word only if the probe read something else. The list's byte count is left
  out, as the 3.6a note leaves it out, because it depends on the run's scratch path.
- **"its stream matched the 3.6a row's copy"** replaces the dialect probe's "matched a local control child of the
  same version", because here there is no second machine: the honest comparison is to the admitted row's own copy,
  driven by the same harness in the same run (§6.4). That is the entry's own rule: "every cell on the new-string
  rows must equal the 3.6a control's".
- **`measuredAt`** is the date `probe:p324` ran green at HEAD. Builder A writes `'2026-09-29'`; the integrator changes
  it if the green HEAD run is on another day.
- **Neither field names a distribution, "no Linux binary run", a patch, or either 3.6-family defect** (ruling 1).
  Condition 100e holds that as text.

**The header gains one plain sentence**, as its own paragraph after the "WHAT IS NOT HERE" paragraph (after `:169`)
and before `export const`, because two header claims would otherwise be false (every row by `probe-execplane.mjs`
over a scratch sshd, `:157-161`; every row reached over a scratch sign in program on 127.0.0.1, `:163-165`):

```ts
 * The 3.6 and 3.6b rows were measured by `npm run probe:p324` instead, which
 * reaches a scratch server on this same Mac through /bin/sh in place of the
 * sign in program.
```

It must not spell `TESTED_REMOTE_TMUX_VERSIONS`: `probe-execplane.mjs:668` starts its parse at the name's first
occurrence. Nothing else in the file moves: no gate logic, no parser, no comment at `:261-269` or `:314-316`.

### 3.2 `src/renderer/settings/machines-copy.ts:639`

`export const MEASURED_VERSIONS: readonly string[] = ['3.6', '3.6a', '3.6b', '3.7b', '3.7c'];` and nothing else.
`machines-copy.test.ts:474-485` already holds it equal to main's exec list in order. No distribution name goes beside
any version on any surface. This is the one drawn change; it is Tier 1 and the test is its evidence (no photograph:
`npm run shot` is forbidden in this workflow).

### 3.3 `src/main/machines/control-plane.ts:46-56`, comments only

Line 47's "it does three jobs at once" becomes "four jobs", and after job 3 (`:56`) one item is added:

```ts
 *  4. It runs through the same program the control child will run, because
 *     both compose through `tmuxCommand` over `remoteContextFor(machineId)`.
 *     On a server from the 3.6 family, a program older than 3.6 fails this
 *     read and leaves the server alive, where that program's `-C` would end
 *     the server and every session in it (research 131 §3.5). So this read
 *     also stands between a program downgraded in place and the person's
 *     sessions, and `npm run conformance:machines` condition 100 keeps it the
 *     first thing `start()` awaits.
```

No code in the file changes. The claim was re-measured by the spec step with the shipping transport: a 3.5a program
against a 3.6 server and a 3.6b server — the precheck threw, the server's pid was unchanged (10910, 10986), and 0
control children were spawned (§13 row 5). See 1.2 item 10 for what touching this file costs.

### 3.4 Tests

`src/main/tmux/__tests__/version.test.ts`:
- `:645`, `:655`, `:759`: `['3.6', '3.6a', '3.6b', '3.7b', '3.7c']`.
- `:648`'s title becomes "holds the five versions the probes measured on the live connection"; its comment names
  docs/research/52-control-mode-dialect.md for 3.6a and 3.7b, the 3.7c row's note for 3.7c, and `probe:p324` for
  3.6 and 3.6b.
- `:757`'s title becomes "holds the five versions the probes measured on the exec plane"; its comment names
  `build/probe-execplane.mjs` for 3.6a, 3.7b and 3.7c and `probe:p324` for 3.6 and 3.6b.
- One new `describe('the 3.6 family rows (Phase 324)')` with four cases: both gates answer `measured` for `3.6` and
  `3.6b`; both gates answer `unmeasured` for each of `'3.6 '`, `'3.6\r'`, `'3.6c'`, `'3.60'`, `'3.6-rc'`,
  `'next-3.6'`, `'3.6A'`, `'3.5a'`, `'3.4'`, `'3.3a'`, `'3.2a'`, `'3.7'`, `'3.7a'` and `'3.8-rc'`;
  `parseTmuxVersion('tmux 3.6\n')` is `'3.6'` and `parseTmuxVersion('3.6b')` is `'3.6b'`; the 3.6a row's `subject`
  is still `'the copy of tmux already on this Mac'` and its `measuredAt` still `'2026-08-17'`.
  (`parseTmuxVersion` trims, so `'tmux 3.6 \n'` reads `'3.6'`: that is the unchanged parser, and the gate is byte
  exact on what the parser returns. A verifier must not read it as a widening.)

`src/main/machines/__tests__/control-plane.test.ts`, in `describe('opening')`, two cases: with `versionAnswer` set to
`'tmux 3.6\n'`, then `'tmux 3.6b\n'`, `openControlPlane('studio')` returns `true` and
`remoteControlTransport('studio').precheck()` resolves. Both FAIL at the parent; that is part of the parent
measurement.

`machines-store.test.ts:163` and `errors.test.ts:229-232`, `:336-342` pass their own lists and do not change.

---

## 4. The gate half (Builder B): `conformance:machines` condition 100

One block, appended after condition 99 in `build/conformance-machines.mjs`, headed
`// 100. Phase 324. The read before every far control child, and the rows it admits`. Every failure message begins
with its clause id (`100a:` … `100e:`), because `ablation:p324` matches on that. The condition number is written
ONCE, as a constant the messages are composed from, because 320.1 and 327 also append conditions (§11). It uses
`stripComments`, `blockAt` and `functionBodyOf` from `build/scan-source.mjs`, the helpers this file already imports
or sits beside. The spec step prototyped 100a and 100b with those helpers and every clause reads green at
`5866b527` (§13 row 11).

**100a. The precheck is the first thing `start()` awaits** (`src/main/tmux/control-client.ts`, comments stripped,
read by matching braces):
- `class TmuxControlClient`'s body holds `async start(): Promise<void> {`; its body holds a top-level `try {`;
  that `try` block's FIRST statement, whitespace-normalised, is `await this.transport.precheck()`;
- inside that `try` block, in order: `this.transport.precheck()` before `this.transport.plan()` before the ONE
  `spawn(`, and the spawn's first argument is `<the binding assigned from the awaited plan>.file`;
- the class body holds exactly one `spawn(` and exactly one `this.transport.plan(`; the file holds exactly one
  `this.transport.precheck(`;
- `private scheduleReconnect(): void`'s body names `this.start(` and names neither `spawn(` nor `transport.plan(`.

**100b. The precheck is the read, through the same program** (`src/main/machines/control-plane.ts`, stripped):
- `functionBodyOf(code, 'remoteControlTransport')`'s `async precheck(): Promise<void>` body: assigns a binding from
  `remoteContextFor(machineId)`; awaits `execOn(<that binding>, ['display-message', '-p', '#{version}']` exactly
  once, into a binding; calls `assertControlDialectMeasured(machineId, parseTmuxVersion(<that binding>))` after it;
  holds no `try`, no `catch`, no `.catch(`; names neither `execRemoteShell` nor `shellCommand`;
- its `async plan(): Promise<SpawnPlan>` body composes `tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)`;
- `src/main/machines/exec-plane.ts`'s `spawnTmux` body composes `tmuxCommand(ctx, args`, so the read and the child
  name one program, `ctx.remoteTmuxPath`;
- across `src/main/**/*.ts` outside `__tests__`, every `new TmuxControlClient(` or `new tmux.TmuxControlClient(`
  takes no argument (the local default) except exactly one, whose argument is `remoteControlTransport(machineId)`.
  A remote client built over any other transport would have no precheck.

**100c. One composer for the far control child** (`src/main/machines/**/*.ts` outside `__tests__`, stripped):
`CONTROL_ATTACH_ARGS` is an argument to `tmuxCommand(` at exactly one site, inside `remoteControlTransport`'s `plan`,
and appears nowhere else but the import; no file holds the adjacent literals `'-C', 'new-session'` (whitespace
allowed). (`key-material.ts:353` holds a lone `'-C'` for ssh-keygen; adjacency is what separates it.)

**100d. The rows and the measurement are one fact** (the probe's `remoteVersions`, plus
`build/tmux-probe-versions.json` read as JSON):
- rows `3.6` and `3.6b` exist with `exec` and `control` both true;
- every row whose `subject` names `build/build-tmux-version.mjs` names `node build/build-tmux-version.mjs <its
  version>`, the URL `https://github.com/tmux/tmux/releases/download/<v>/tmux-<v>.tar.gz` equal to the pin's
  `versions[<v>].url`, and `sha256 <64 hex>` equal to the pin's `versions[<v>].sha256`;
- at least three such rows are found (3.6, 3.6b, 3.7c), so a reader that stops finding is never a clean tree.

**100e. No weird label, as text** (ruling 1): over every row's `subject` and `note` (the probe's values) AND the raw
text of the array block in `version.ts` from `= [` to `\n];` (comments included), none of
`/\b(ubuntu|debian|fedora|linux|backports?|trixie|resolute|noble|jammy|bookworm|forky|rawhide)\b/i`,
`/\bArch\b/`, `/\b(sigkill|5049|control_stop|crash\w*|wedge\w*|patch\w*)\b/i`. The failure sentence quotes his
ruling, so a later round that wants a label has to argue with it.

**`build/machines-conformance-probe.mts:738-748`**: `remoteList` gains `note: row.note`. Nothing else in the probe
moves; condition 44's `TESTED_REMOTE_TMUX_VERSIONS[0]` read (`:465-467`) now reads `3.6`, which is measured, so it
stays green (the row is first by version order, and measured beats accepted for any measured row).

**The header** gains a paragraph after Phase 270's ("PHASE 324 APPENDED 100 …"), one sentence per clause, and the
closing `PASS.` sentence gains one clause saying the far control child is never spawned before its precheck and
the rows name the pin's own tarball. CLAUDE.md's `conformance:machines` row changes as §7.3 says.

---

## 5. `build/p324/ablation.mjs`, `ablation:p324` (Builder B)

The shape of `ablation:p274`: every target file's bytes read ONCE before any write; one arm at a time; after every
arm the file restored and compared by sha256, and a mismatch stops the run; a `finally` (and SIGINT, SIGTERM) writes
every file back and compares again. **One addition, because three builders share this worktree:** before writing an
arm, the file's current bytes must equal the bytes read at the start, and if they do not, the run stops and restores
nothing over them (a concurrent editor's work is never clobbered). Each arm runs
`node build/conformance-machines.mjs` with `cwd` at the script's own repository root, and must exit 1 with a failure
line beginning with the arm's owner. A red on a different condition alone is "red for the wrong reason" and fails the
arm; collateral reds beside the owner are printed. An unedited CONTROL run must be green first. About 7.5 s per run
(the gate measured 7.46 s at this head), so about two minutes.

| # | Owner | File | Edit |
| --- | --- | --- | --- |
| 1 | 100a | control-client.ts | move `await this.transport.precheck();` from before `const plan =` to just after the `spawn(…)` statement's `});` |
| 2 | 100a | control-client.ts | delete `await this.transport.precheck();` |
| 3 | 100b | control-plane.ts | in the precheck (the `execOn` followed by `assertControlDialectMeasured(machineId, parseTmuxVersion(printed))`), argv `['display-message', '-p', '#{version}']` becomes `['-V']` |
| 4 | 100b | control-plane.ts | the same call becomes `execRemoteShell(ctx, "display-message -p '#{version}'", {` |
| 5 | 100b | control-plane.ts | `assertControlDialectMeasured(machineId, parseTmuxVersion(printed));` becomes `void parseTmuxVersion(printed);` |
| 6 | 100b | control-plane.ts | the precheck's two statements wrapped in `try { … } catch { /* p324 */ }` |
| 7 | 100c | control-plane.ts | append `export function p324SecondPlan(machineId: string): SpawnPlan { return tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS); }` |
| 8 | 100d | version.ts | 3.6b's `measured: { exec: true, control: true },` becomes `control: false` |
| 9 | 100d | version.ts | the 3.6 subject's sha256 ends `…69608` instead of `…69607` |
| 10 | 100e | version.ts | the 3.6 note begins `'Built here for Ubuntu 26.04 by "node build/build-tmux-version.mjs 3.6" and reached by '` |
| 11 | 100a | control-client.ts | `scheduleReconnect`'s `this.start().catch(() => undefined);` becomes `void this.transport.plan().then((p) => spawn(p.file, [...p.argv]));` |
| 12 | 100b | control-plane.ts | the plan's `tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)` becomes `tmuxCommand(machineContext(machineId), CONTROL_ATTACH_ARGS)` (`machineContext` is already imported) |
| 13 | 100b | control-plane.ts | append `export const p324Stray = (): TmuxControlClient => new TmuxControlClient({ machineId: 'p324', precheck: () => Promise.resolve(), plan: () => Promise.resolve({ file: '/usr/bin/true', argv: [] }), env: () => process.env });` |
| 14 | 100e | version.ts | insert `  // measured for Debian's backport` on its own line before the 3.6b row's `{` |
| 15 | 100d | version.ts | the 3.6 subject's URL becomes `…/download/3.6a/tmux-3.6a.tar.gz` |

Arms 1, 2, 3, 5, 6, 8, 9 and 10 are the entry's; 11 to 15 are this spec's, each for a clause no entry arm reached
(the reconnect path, the plan's resolver, a second remote client, a comment in the table, the URL half of 100d).
Every edit keeps the module importable under tsx (tsx strips types and does not typecheck; arm 4's
`execRemoteShell` is unimported, which fails only when the precheck is called, and the gate never calls it), so a
red is the gate's reading and not an import crash. The summary prints each arm, its owner, whether it went red on
the owner, and the sha256 check. Exit 0 only when the control is green, every arm is red on its owner, and every file
came back byte for byte.

**While the builders are still editing, `ablation:p324` runs only in an APFS clone** (`cp -Rc /private/tmp/wt-p324
<scratch>/p324/builder-b/tree`, then `node <clone>/build/p324/ablation.mjs`), because it writes the shipping files.
The integrator runs it in place once every builder has finished.

---

## 6. The measurement (Builder C): `probe:p324`

Two files: `build/p324/probe-p324.mjs` (the orchestrator, plain node, the registered script) and
`build/p324/drive-p324.mts` (the driver, run through `tsxCli()` from `build/ts-runner.mjs`, which imports the
shipping modules by absolute path from `P324_ROOT`). It launches **no Electron and no ssh**, reads **no server of
his**, and never builds or downloads.

### 6.1 Targets, and the refusals

- **New strings:** `3.6` and `3.6b` from `build/vendor/tmux-probe/{3.6,3.6b}/bin/tmux`.
- **Controls:** Homebrew's `/opt/homebrew/Cellar/tmux/3.6a/bin/tmux` (the 3.6a row's own subject, run read-only,
  sha256 `70cbf669…` today), the vendored `build/vendor/tmux/bin/tmux` 3.7b (`d7002f7d…`), and the pinned 3.7c from
  `build/vendor/tmux-probe/3.7c/bin/tmux`.
- **Pair and rollback builds:** `build/vendor/tmux-probe/3.5a/bin/tmux`.
- **`P324_EXTRA=<id>=<abs path>,…`** adds builds to every per-target arm (how a verifier passes the distributions'
  builds). An extra is judged against the 3.6a control.
- Builds always come from THIS checkout's `build/vendor/`, whichever checkout's `src/` is under test.
- **Exit 2 with one sentence, before anything starts**, when: a build is missing or its `-V` is not `tmux <v>`
  (the sentence names `node build/build-tmux-version.mjs <v>`); Homebrew's 3.6a is missing or does not print
  `tmux 3.6a`; the vendored tmux is missing (`npm run vendor:tmux`); the platform is not macOS; node-pty does not
  load; `P324_PARENT_CHECKOUT` lacks `src/` or `node_modules/`; an extra is not an absolute executable path; or a
  socket would be `gmux` or `default` (`refuseRealSockets`, `build/scratch-machine.mjs:69`, which exits 2 itself).

### 6.2 The carriage

- **The far side is a `/bin/sh` script the orchestrator writes into the run directory, named `far-sh`** (never a
  name ending in `ssh`: `gate:knownhosts` resolves program names by value). It is every context's `sshBin`, so the
  shipping `tmuxCommand`, `shellCommand` and `attachPlan` compose exactly as for a real machine and the script runs
  only their LAST argument, through `/bin/sh -c`, the way sshd would.
- **It admits exactly three shapes and records every string it is handed**, admitted or not, to `argv.log`:
  (1) a string holding `-L p324-` and holding neither `-L gmux` nor `-L default`; (2) the no-server read, a quoted
  absolute path ending `/tmux` followed by ` -V` and nothing else; (3) byte for byte
  `"$SHELL" -lc 'printf __TORTIE_PATH__%s__TORTIE_PATH__ "$PATH"'`, which is `remotePathCommand()`. Anything else
  exits 97 and is written `REFUSED <string>`. The spec step's version of this allowlist is in §13 row 7.
- **Sockets** are `p324-<target>-<pid>`, passed through `refuseRealSockets` before anything starts.
- **The driver's environment is built, not inherited:** `HOME=<run>/home`, `SHELL=/bin/sh`,
  `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, the `P324_*` knobs; `TMUX`, `TMUX_PANE`, `TMUX_TMPDIR` and every `GMUX_*`
  name removed, because a probe started from inside a Tortie session inherits all of them and a nested attach
  refuses to run. `execOn` hands `process.env` to every spawn, so this is what the far side sees.
- The shipping module state is per process: one machine id per target and per pair, and `closeEveryControlPlane()`
  in the driver's `finally`.
- The shipping log lines (`[gmux-config] …`) go to stdout, so the driver writes its results to
  `<run>/results.json` and never parses its own stdout.

### 6.3 The per-target arms

For each target, one context, one server:

- **P (Prepare's version step, composed, 1.2 item 4).** `readRemoteTmuxVersion` with no server (answers through the
  `-V` read), then boot; both version reads; both gates computed by the checkout under test; the composed Prepare
  cell: `no sheet, boots` when the exec gate is `measured`, `acceptance sheet offered` when it is `unmeasured` with a
  version, `refused, no sheet` otherwise. Then the shipping `ensureRemoteServer` (born, the `PATH` capture, 12 rows
  set and read back): `n of 12 agree`. Then the server ended by the pid it reported and `ensureRemoteServer` run
  again on the same socket: `n of 12` after the rebirth. The boot runs past the gate at the parent too, the way
  Prepare runs after an acceptance, and the cell says so.
- **E (the exec shapes).** `list-sessions -F '#{session_id}'` on the running server holding none (rows, exit), then
  after one create through the shipping `remoteCreateArgs` (pane argv `['/bin/sh', '-c', 'seq 1 3000; echo
  P324-DRAWN-<target>; exec cat']`, which holds its pane open without a sleeper) the one row `$0`;
  `show-options -gv history-limit`; the no-server sentence and exit on a socket that has no server, and
  `classifyTmuxFailure`'s class for it; `REMOTE_LIST_FORMAT` answering ten fields and round-tripping through
  `parseRemoteListLine`.
- **G (the product's entry point).** The shipping `openControlPlane(id)`: its boolean; `machineLinkFacts(id)`'s link
  and reason; then, when true, `isControlPlaneLive(id)` within `CONTROL_GREETING_DEADLINE_MS`. Closed with
  `closeControlPlane(id)`.
- **C (the shipping transport).** A `TmuxControlClient(remoteControlTransport(id))`: either the refusal's
  `payload.message` and a spawn count of 0, or the eight comparable steps below.
- **D (the dialect, gate-free).** A `TmuxControlClient` over a probe transport whose `precheck` is
  `execOn(ctx, ['display-message', '-p', '#{version}'])` WITHOUT the gate and whose `plan` is
  `tmuxCommand(ctx, CONTROL_ATTACH_ARGS)`: the same eight steps, at both builds.
- **The eight steps (C and D)**, the steps `probe:controldialect` names (`probe-control-dialect.mjs:895-970`):
  (1) the greeting, against `CONTROL_GREETING_DEADLINE_MS`; (2) `refresh-client -f no-output` answered with an empty
  block, then 0 `%output` on the client after typing into `gmux-control` while a raw `-C attach -t gmux-control`
  child the probe owns beside it sees at least 1, so the check can fail; (3) the guard shape, each `%begin`/`%end`
  word and flag; (4) `%sessions-changed` on a second client's create, rename and kill; (5) `%session-renamed` and its
  argument order; (6) window and session-changed traffic, with any notification name the parser has no arm for
  listed; (7) `%exit` when `kill-server` is sent over the connection; (9) one `list-sessions -F REMOTE_LIST_FORMAT`
  over the connection byte-compared with the same over exec. Each step's stream is normalised (epoch seconds, `$`
  `@` `%` ids, command numbers, and the sampled process name in `%unlinked-window-renamed`, research 131 §3.3) and
  compared with the 3.6a control's normalised stream. Typing into `gmux-control` and the second client's verbs go
  through the probe's own binary calls on the scratch socket or through `sendCommand`, never through `execOn`,
  which refuses `send-keys` by design.
- **S (Phase 320.1's six shapes).** Through the shipping `scroll.ts` (`readPaneScroll`, `scrollPaneBy`,
  `scrollPaneTo`, `exitPaneScroll`) with a probe runner over C's client (`args.map(quoteTmuxArg).join(' ')` into
  `sendCommand`), on the 3000-line pane: `+30` reads 30, `scrollPaneTo(1500)` 1500, `-10` 1490, `+2500` clamps,
  exit reads 0; `send-keys -X top-line` and `cancel` with no mode answer "not in a mode"; the parked
  `STATE_FORMAT` answer recorded RAW from the runner, eight fields each a number or empty. `copy_position_limit` is
  expected empty on 3.6, 3.6a and 3.6b and a number on 3.7b and 3.7c (`scroll.ts:119-121`). A 3.6 or 3.6b shape
  that answers differently from 3.6a stops the phase and goes to him: a row has no field that withholds the scroll
  (`docs/BACKLOG.md:34713-34715`). If 320.1 has landed when the integrator rebases, S also drives 320.1's exported
  runner as one more column, and the `scroll.ts` column stays. At the parent C is refused for the new strings, so S
  there runs over D's client and says so.
- **A (the attach).** The shipping `attachPlan({ kind: 'remote', ctx, tmuxName })` spawned as-is in a node-pty the
  probe owns (`far-sh` takes the place of `ssh -t`): drawn when `P324-DRAWN-<target>` arrives within 8 s; detached
  by the probe's own `detach-client -s <exact target>` on the scratch socket, the pty's exit code within 4 s.
  (`detach-client` is not on the exec ledger, so it is never sent through `execOn`; no control byte is typed.)

### 6.4 The pair arms, the rollback and the one ablated cell

- **Pairs that must work:** a 3.6 server under a 3.7b program; a 3.6b server under a 3.7c program. Version read,
  both gates, C (opens at HEAD, refused at the parent), D greets, A draws.
- **Pairs that cross 3.6:** a 3.5a server under a 3.6 program and under a 3.6b program. The version read answers
  `3.5a`, both gates `unmeasured`, C refused with `CONTROL_DIALECT_UNMEASURED`, 0 spawns, at both builds. D is NOT
  run there: it would hang to the 10 s deadline, which research 131 §3.4 measured; the cell says so.
- **The rolled-back program:** a 3.6 server, a 3.6a (Homebrew) server and a 3.6b server, each under a 3.5a program,
  through the shipping transport: the precheck throws, the server's pid is unchanged, 0 control children, at both
  builds. The spec step measured the 3.6 and 3.6b cells already (§13 row 5).
- **The ablated cell, once per run** (on unless `P324_ABLATE_PRECHECK=0`, which prints "not run"): the 3.6 server
  under a 3.5a program over a probe transport whose precheck does nothing and whose plan is the shipping plan. The
  server must END (its pid gone within 2 s). The client is stopped at its first `disconnected`, before a reconnect
  can start a fresh server on that socket (research 131 §9 item 9); the probe then asks the socket through the 3.6
  program and ends any fresh server by the pid it reports, recording it. The count of `tmux-*.ips` files in
  `~/Library/Logs/DiagnosticReports` is listed (names only) before and after and printed; none is read or deleted.
  This is the live half of the proof that 100a and 100b guard something real. It was not run by the spec step,
  because it ends a server and writes a crash report.

### 6.5 The output

`<run>/results.json` (every cell), `<run>/argv.log` (every string `far-sh` was handed), `<run>/control-*.raw` (raw
streams). The matrix is printed as a table: rows are targets, extras and pairs; columns are `-V`, `#{version}`, exec
gate, control gate, Prepare, boot, reborn, E, G, C steps 1-7 and 9, D steps, S, A, rollback. Every cell reads
**measured**, **refused**, **empty**, **hung** (with the deadline that ended it) or **not run** (with the reason).
`P324_KEEP=1` keeps the run directory; otherwise the `finally` removes it after printing. `P324_OUT=<dir>` writes
`results.json` there as well. `node build/p324/probe-p324.mjs --compare <head.json> <parent.json>` prints every cell
that differs and applies §6.7.

### 6.6 The `finally`

The control clients (`stop()`), `closeEveryControlPlane()`, the raw control child, the attach pty, and each server
by the pid it reported, SIGTERM then SIGKILL; each `p324-` socket FILE under `/tmp/tmux-<uid>/` unlinked by exact
name after `lstat` says it is a socket; then one count of `tmux` processes whose command line names `-L p324-`,
printed, which must be 0. Every process the orchestrator starts (the tsx driver) is ended in its own `finally` by pid.

### 6.7 What makes it exit 0

At HEAD:
- 3.6, 3.6b and every extra: both gates `measured`; Prepare `no sheet, boots`; G true and connected; C's eight steps
  equal D's and equal the 3.6a control's; every other cell equal to the 3.6a control's except the two version
  strings.
- The controls: every cell measured; `copy_position_limit` empty on 3.6a, a number on 3.7b and 3.7c.
- The pairs, the crossing pairs, the rollback and the ablated cell as §6.4 says.
- His world: 0 strings `REFUSED` by `far-sh`; 0 naming `-L gmux` or `-L default`; 0 without `-L p324-` other than the
  `-V` reads and the PATH capture; 0 `tmux` processes left on `-L p324-`.

With `P324_PARENT_CHECKOUT` (the parent's expectations): for 3.6 and 3.6b both gates `unmeasured`, Prepare
`acceptance sheet offered`, G false with `polling` / `runs a version Tortie has not measured`, C refused with
`CONTROL_DIALECT_UNMEASURED` (the pair-up rows' C likewise); every other cell as at HEAD.

`--compare` exits 1 unless exactly {exec gate, control gate, Prepare, G, C} differ, for exactly 3.6, 3.6b, the
extras and the two pair-up rows, and nothing differs for any control. The parent checkout is made without touching
git metadata: `git -C /private/tmp/wt-p324 archive <parent> | tar -x -C <scratch>/p324/parent`, then
`cp -Rc /private/tmp/wt-p324/node_modules <scratch>/p324/parent/`. Two invocations, one after the other.

Cost is Builder C's to measure and report (the spec step's pieces suggest well under two minutes a build; the
builds themselves are about 25 s each, §13 row 4).

---

## 7. Registration and the shared files (Builder B owns every shared file)

### 7.1 `package.json`
`"probe:p324": "node build/p324/probe-p324.mjs"` and `"ablation:p324": "node build/p324/ablation.mjs"`.

### 7.2 `build/verification-checks.mjs`
- The helper at `:272-277` becomes `const tmux = (name, needs = NEEDS.tmux, skip = SKIP.never) => ({ name, type:
  'tmux harness', needs, skip })`. Every existing `tmux('…')` entry reads byte for byte what it did.
- `tmux('probe:p324', <needs>, SKIP.refuse)`, where `<needs>` states: the vendored tmux, Homebrew's tmux at
  `/opt/homebrew/Cellar/tmux/3.6a/bin/tmux` run read-only as a scratch server, and the probe-only builds 3.6, 3.6b,
  3.7c and 3.5a made beforehand by `node build/build-tmux-version.mjs <v>` into `build/vendor/tmux-probe/` (which
  needs `pkg-config` and the network once per tarball, sha256-checked); each server on a scratch `-L p324-` socket of
  its own; no ssh, no Electron, and no server of the operator's is read.
- `pure('ablation:p324')`, beside `pure('ablation:p274')`.
- `gate:checks` runs because `package.json`'s check scripts change.

### 7.3 `CLAUDE.md`, two rows and nothing else
- The `conformance:machines` row (`:286`): the trigger column gains `TESTED_REMOTE_TMUX_VERSIONS` in
  `src/main/tmux/version.ts`, `start()` and `scheduleReconnect` in `src/main/tmux/control-client.ts`, and
  `build/tmux-probe-versions.json`; the proves column gains one clause: "and (Phase 324, condition 100) the far
  control child is never spawned before its precheck read, through the same program, and a row built here names the
  pin's own tarball and no distribution; `ablation:p324` is the attack beside it".
- The probe table gains `probe:p324`: triggered by `TESTED_REMOTE_TMUX_VERSIONS`, `build/tmux-probe-versions.json`,
  `remoteControlTransport` in `control-plane.ts`, and `start()` in `control-client.ts`; its cost as Builder C measured
  it; "no Electron and no ssh; every server on a scratch `-L p324-` socket behind a `/bin/sh` stand-in for the sign in
  program; the builds are made first by `node build/build-tmux-version.mjs`; `P324_PARENT_CHECKOUT`, `P324_EXTRA`,
  `P324_KEEP`; one tmux crash report per run from the ablated cell unless `P324_ABLATE_PRECHECK=0`".

### 7.4 `CHANGELOG.md`, under `## Unreleased`, `### Added`, one item

```
- Tortie now prepares a machine whose tmux is 3.6 or 3.6b, which is what Ubuntu 26.04 LTS and Debian 13's backports install, without asking you to accept its version first, and keeps a live connection to it, so its sessions show up and change in Tortie as they happen rather than on a timer; a machine on Ubuntu 22.04 or 24.04, or on Debian 12 or 13 as released, still cannot be prepared
```

One sentence and one limit clause, the style at the top of CHANGELOG.md. No numbers but the two versions, which are
the point. No commit link: the follow-up docs commit adds it. No reporter is credited: this fixes nothing issue 31
reported and whether that machine is one of these rows is unknown (ruling 4). The distributions are named HERE and
nowhere in the product: ruling 1 is about the rows and the surfaces, and a person knows their distribution, not
their tmux. "still cannot be prepared" is the measured truth (Prepare fails at row 4 or row 10 even after an
acceptance, research 131 §1 item 1), where the entry's draft "cannot hold a session" is not quite (research 131 §5:
a create after a failed Prepare is reachable by reading).

### 7.5 Files that must NOT move
`docs/audits/contract-baseline.txt` (no tmux version in it; `gate:contract` must pass unchanged) and
`build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` stays 153; nothing here reaches `build/electron-run.mjs`).
Builder B owns both and touches neither unless a gate proves otherwise, in which case the commit body names the moved
lines.

---

## 8. The builders

Three builders, disjoint files. **Builder B owns every shared file.** `docs/BACKLOG.md` is the main session's. No
builder launches Electron, runs `npm run build`, the whole `npm test`, a smoke or `package`, commits, stages or
stashes. Commands stay under 90 s or are backgrounded into the phase's scratch directory and polled. Every process a
builder starts ends in a `finally`, by pid. Scratch:
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p324/<role>/`.

### 8.1 Builder A, the rows (the product half)
Owns `src/main/tmux/version.ts`, `src/renderer/settings/machines-copy.ts`, `src/main/machines/control-plane.ts`
(comments only), `src/main/tmux/__tests__/version.test.ts`, `src/main/machines/__tests__/control-plane.test.ts`.
Writes §3 exactly. Runs `npx vitest run` over the four touched test files plus `machines-copy.test.ts` (165 pass at
this head in 1.1 s), `npm run typecheck`, and `node build/probe-execplane.mjs`'s parse ONLY as text: a one-line
`node -e` that runs its `readMeasuredVersions` logic over the edited file must print the five versions (the probe
itself is never run: it reads his server). Reports the diff of the 3.6a, 3.7b and 3.7c rows, which must be empty.

### 8.2 Builder B, the gate, the attack and the shared files
Owns `build/conformance-machines.mjs`, `build/machines-conformance-probe.mts`, `build/p324/ablation.mjs`,
`package.json`, `build/verification-checks.mjs`, `CLAUDE.md`, `CHANGELOG.md`, and (untouched unless proved)
`docs/audits/contract-baseline.txt` and `build/assert-electron-teardown.mjs`. Writes §4, §5 and §7 against the names
this document fixes. Runs `node build/conformance-machines.mjs` (green with A's rows in; red before them on 100d
only, which proves 100d reads), `ablation:p324` in an APFS clone (§5), `npm run gate:checks`, `gate:background`,
`gate:knownhosts` and `gate:electron`. CLAUDE.md's probe row takes its cost from Builder C's report.

### 8.3 Builder C, the measurement
Owns `build/tmux-probe-versions.json`, `build/p324/probe-p324.mjs`, `build/p324/drive-p324.mts`.
- The pin gains three rows, `3.6`, `3.6b` and `3.5a`, each with the upstream URL, its sha256 (1.1, §13 row 3),
  `configureArgs: ["--disable-jemalloc"]`, a one-sentence `why`, and a `secondSource` the builder ignores: Fedora
  dist-git's `sources` at `5b3b85bc` for 3.6 and at `dd06b240` for 3.6b, and both Debian `.dsc` files for 3.5a
  (research 131 §3.2). 3.5a's `why` says it is on neither version list and exists for the pair and rollback arms.
- Builds all four with `node build/build-tmux-version.mjs <v>` into this worktree's `build/vendor/tmux-probe/`
  (3.6, 3.6b, 3.5a and 3.7c). `GMUX_TMUX_TARBALL_DIR=<scratch>/p324/spec/offline` holds every tarball already,
  sha256-checked (§13 row 3), so no download is needed; the builder still checks each against the pin.
- Writes §6. Runs `probe:p324` at the parent at once (it needs no other builder), and at HEAD when Builder A's rows
  are in; runs `--compare`. Reports the matrix, the cost of each run, the crash-report count and his-world counts.

---

## 9. The integrator (no Electron)

After every builder reports: rebase onto origin/main's tip and name it as the parent (re-run §11's checks); run
`npm run typecheck`, `npm run build` (every build-time gate, `gate:contract` among them, unchanged), `npm test`,
`npm run package` (no launch), `npm run conformance:machines`, `ablation:p324` IN PLACE, `probe:p324` at HEAD and at
the parent with `P324_KEEP=1` and `--compare`, `gate:checks`, `gate:background`. Confirms `measuredAt` and the note's
two measured values against the HEAD run. Counts tmux processes on `-L p324-` once at the end. Writes nothing to
CHANGELOG beyond §7.4. Leaves smoke, smoke:t1, smoke:t3 and `probe:controldeadline` to the verifier.

---

## 10. Verification, Tier 3 (the entry's four methods, and who runs what)

Two independent lenses, neither a builder. The fix round and its reverify follow the method if either answers
needs_work.

**V1, re-derivation and real data.**
- Its OWN harness, neither `probe:p324` nor the driver, re-derives every matrix cell for upstream 3.6 and 3.6b,
  Ubuntu's and Debian's patched builds and the three controls, at the parent and at HEAD, with its own raw
  control-stream reader.
- Builds Ubuntu 26.04's `3.6a-2ubuntu0.1` (from `tmux_3.6a.orig.tar.gz` and its `.debian.tar.xz`, two patches) and
  Debian's `3.6b-1~bpo13+1` (one patch) from each distribution's own `.dsc`, applied with `patch -p1 -F0 -N`, any
  offset, fuzz or `.rej` failing the build; passes them to `probe:p324` through `P324_EXTRA` as well.
- Reads the version constant out of Ubuntu's `tmux_3.6a-2ubuntu0.1` `.deb` on amd64 and arm64 and Debian's
  `tmux_3.6b-1~bpo13+1` amd64 `.deb` as BYTES (downloaded into scratch, never installed or executed): `3.6` and
  `3.6b`, byte-equal to the rows' `version` fields.
- Re-derives the note's claims from its own run; a claim its run does not support is a finding.

**V2, the attack.**
- (a) The upgrade that crosses 3.6: a 3.5a server under 3.6 and 3.6b programs, and a 3.4 server under 3.6. The read
  answers the old string, both gates refuse, nothing spawns, at HEAD exactly as at the parent.
- (b) A 3.5a program against 3.6, 3.6b AND the admitted 3.6a across every verb shape Tortie sends to a far server:
  the precheck `display-message`; `list-sessions -F REMOTE_LIST_FORMAT`; `show-options`; `capture-pane`; the remote
  attach argv; and `-C` with the precheck removed. Each cell: did the server survive. A cell where 3.6 or 3.6b ends
  and 3.6a survives BLOCKS; a cell where all three end is a finding for its own entry (today's exposure through 3.6a,
  unchanged here).
- (c) Hostile strings against the shipping gates at HEAD: `3.6 `, `3.6\r`, `3.6c`, `3.60`, `3.6-rc`, `next-3.6`,
  `3.6A` each `unmeasured` on both gates; `tmux 3.6\n` parses to `3.6` (3.4's note on the parser's trim applies).
- (d) The pin can fail: `ablation:p324` red on every arm on its owner, the control green, every file back by sha256;
  and (b)'s ablated `-C` ends its server.
- Runs, under THE LOCK (`mkdir …/electron.lock && echo p324 > …/owner`, released on the same command line), the
  Electron gates the integrator may not: `npm run smoke:t1`, `smoke`, `smoke:t3`; Electrons counted once at the end
  with CLAUDE.md's command. Runs `probe:controldeadline` (no lock; 1.2 item 10).

**Both lenses, measure the parent:** every gate outcome and every live arm at the parent and at HEAD.

**His world, listed only:** every argv each harness ran is recorded, and the number naming `-L gmux`, `-L default`,
or no `-L` apart from the `-V` reads and the PATH capture is 0 (the one exception is `probe:controldeadline`'s own
count, which the verifier names); `build/probe-control-dialect.mjs` and `build/probe-execplane.mjs` are not run; at
the end one count of `tmux` processes on `-L p324-` or the verifier's own prefix is 0; the count of new
`tmux-*.ips` files is stated.

**What cannot be proven here, stated in the commit body** (research 131 §8): no Linux kernel, libc, `poll`
backend, jemalloc, utempter or systemd cgroup move was run; no real ssh hop, ControlMaster or network was used; no
Fedora, Arch or Homebrew-on-Linux binary was built or opened; whether a real ssh channel drop can kill a far control
client inside its first 3 ms is unmeasured.

---

## 11. Coordination with Phases 320.1 and 327

- **Condition numbers.** 320.1 appends numbered conditions to the same file and 327 names 100 too. Whoever lands
  second takes the next free number: before the commit, `git show origin/main:build/conformance-machines.mjs | grep
  -n "// --- 100\.\|^// 100\."`, and if 100 is taken, the one constant and the `ablation:p324` owner tags move to the
  next free number, and the commit body says so.
- **`start()` and the transport.** 320.1's gates list `control-client.ts` and it exports a runner from
  `control-plane.ts`. If it lands first and reshapes `start()` or the transport, 100a/100b are re-run on its tree;
  a clause is re-worded only if the property (the precheck first in the `try`, before the one spawn, through the
  same program) still holds, and the ablation arms are re-pointed at the new text.
- **The CHANGELOG list.** 320.1's drafted item says scrolling works "on machines running tmux 3.6a, 3.7b or 3.7c".
  Both phases go in one release (§1.3). If 320.1's item is on main when this phase commits, this commit changes that
  list to "3.6, 3.6a, 3.6b, 3.7b or 3.7c" (this phase is what makes the old list false) and says so in the body; if
  this phase lands first, 320.1's integrator writes the five.
- **The S arm** drives 320.1's exported runner as an extra column if it has landed (§6.3).

---

## 12. What is NOT in this phase

Everything in the entry's "What is NOT in this phase" stands, and in particular:
- **No weird label.** No subject, note, comment in the table's rows, surface or version list names a distribution,
  says "no Linux binary run", names a patch, or names a 3.6-family defect. The 3.6a row is byte-identical; research
  131 §7's and §11's proposed wording is not used. The honest account is the commit body's (built on this Mac with
  Ubuntu's two patches and Debian's one applied, no Linux binary run, what `probe:p324` and the verifiers measured,
  the two defects shared with 3.6a, and the precheck pin and why it is load-bearing), with "issue 31" in words.
- **No 3.2a, 3.3a, 3.4 or 3.5a on either list** (ruling 2, "Not now"). The `3.5a` pin row admits nothing.
- **No pair read**, and no server is ended, restarted or signalled, and nothing says so yet (ruling 3).
- **No 3.7, 3.7a or 3.8-rc.**
- **No change to either gate's logic**: `decideRemoteVersionGate`, `decideRemoteControlGate`, `parseTmuxVersion`,
  `assertControlDialectMeasured` and `openControlPlane` do not move by a byte of code; `version.ts:261-269` and
  `:314-316` stand.
- **No change to the local gate** (`TESTED_TMUX_PAIRS`, `BUNDLED_TMUX_VERSION`, `build/tmux-release.json`).
- **No edit to `build/probe-control-dialect.mjs` or `build/probe-execplane.mjs`**, and neither is run.
- **No change to Prepare's mismatch arm** (`prepare.ts:360-385`); it is its own entry.
- **No Phase 320.1 work**, no scroll shape, no door.
- **No real machine, no ssh, no container, no virtual machine, no Linux binary executed**, and his Mac Pro is not
  used (§1.3). Nothing is installed.
- **No menu, no new surface, no copy change** beyond the version list where it is drawn. The native menus do not
  change.
- **Nothing is posted on issue 31** (ruling 4). **No release**, no bump, no tag.

---

## 13. What the spec step ran, and left behind

Every run on a scratch socket named `p324-spec-*` or `p83-*` (the builder's own), `HOME` a scratch directory,
`SHELL=/bin/sh`, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`. No Electron, no ssh, nothing installed, no file in the
worktree written but this one.

| # | What | Exit | Reading |
| --- | --- | --- | --- |
| 1 | tsx import of the eleven shipping modules (§2) | 0 | 609 ms, no Electron |
| 2 | shipping precheck, plan and client over the stand-in, Homebrew 3.6a and vendored 3.7b | 0, 0 | greeting 22 ms and 19 ms; list 65 of 65 bytes, equal; 12 far strings, 0 without `-L p324-` |
| 3 | `curl` of the 3.6, 3.6b, 3.5a and 3.7c tarballs into `scratchpad/p324/spec/offline/` | 0 ×4 | sha256 `136db80c…`, `390759d2…`, `16216bd0…`, `7c60cae9…`, each equal to the entry and the pin; each unpacks to `tmux-<v>/`; `AC_INIT` reads 3.6, 3.6b, 3.5a |
| 4 | the SHIPPING `build/build-tmux-version.mjs`, unedited, in a scratch replica of `build/` with the three rows added to a scratch pin | 0 ×3 | 3.6 in 26.2 s, 1,387,040 bytes, `#{version}` 3.6, sha256 `f0f96c3f…`; 3.6b in 24.4 s, 1,387,056 bytes, sha256 `21da39f1…`; 3.5a in 25.9 s, 1,319,552 bytes, sha256 `4288a677…`; each server ended by its pid. (Digests are this build directory's; a worktree build will differ.) |
| 5 | shipping `remoteControlTransport` precheck, a 3.5a program against a 3.6 and a 3.6b server | 0, 0 | precheck threw (`UNKNOWN`, "display-message failed"); server pids 10910 and 10986 unchanged; 0 control children |
| 6 | shipping `ensureRemoteServer` with a stand-in that admitted only `-L p324-` | 0 | THREW: the stand-in refused the `-V` read and the PATH capture (1.2 item 3) |
| 7 | the same with the §6.2 allowlist, vendored 3.7b and upstream 3.6 | 0, 0 | `readRemoteTmuxVersion` with no server answered 3.7b and 3.6 through `-V`; `ensureRemoteServer` born, 12 of 12 agree, 240 and 213 ms |
| 8 | at this head (the parent): shipping `openControlPlane`, the shipping transport, and a gate-free transport, on 3.6, 3.6b and 3.6a | 0 ×3 | 3.6 and 3.6b: `openControlPlane` false, `polling / runs a version Tortie has not measured`, the transport refused with `CONTROL_DIALECT_UNMEASURED`, the gate-free client greeted in 21 and 34 ms, list 65 bytes equal; 3.6a: `openControlPlane` true, spawned, gate-free greeting 30 ms |
| 9 | the 100e ban list over today's rows and array block | 0 | 3 rows, 3,667 bytes of block, 0 hits |
| 10 | `list-sessions` on a socket with no server, 3.6, 3.6b, 3.6a | 1 ×3 | "error connecting to <path> (No such file or directory)"; `history-limit`'s row value is `25000` (`server-options.ts:102-105`) |
| 11 | 100a and 100b prototyped with `scan-source.mjs`'s helpers at this head | 0 | first statement `await this.transport.precheck()`; order 13 < 65 < 108; one `spawn(` and one `plan(` in the class; reconnect names `this.start(` only; precheck argv exact, assert on the same binding, no `try`; plan exact; `spawnTmux` composes through `tmuxCommand(ctx, args` |
| 12 | `node build/conformance-machines.mjs` | 0 | PASS, 7.46 s wall |
| 13 | `vitest run` over version, control-plane, control-client and machines-copy tests | 0 | 165 passed, 1.08 s |
| 14 | `find scratchpad/p322 -type f` | 0 | 0 files (1.2 item 1) |
| 15 | `tmux-*.ips` in `~/Library/Logs/DiagnosticReports`, names listed only | 0 | 0 before and 0 after |

Left behind: 0 `tmux` processes on `-L p324-` or `-L p83-`; every socket FILE this step made (`p324-spec-*` and three
`p83-*`) was confirmed to have no server and unlinked by exact name; the scratch replica builds and the offline
tarballs remain under `scratchpad/p324/spec/` for Builder C (the tarballs) and as a reference (the builds are NOT
the probe's builds: the probe uses the worktree's).

---

## §As built (the integrator, 2026-09-29)

Three builders reported done. The integrator rebased, reconciled the seams, re-derived the central promise with a reader
of its own, and ran the battery below. It launched no Electron, ran no ssh, touched no server of his, and committed,
staged and stashed nothing.

### The parent

`origin/main` moved from `5866b527` to **`33edfcd0`** while the builders worked. It is four docs commits, and they touch
`docs/BACKLOG.md` alone (8 lines). The worktree's HEAD was moved there with `git checkout --detach origin/main`, which
carried every uncommitted change, because none of the phase's paths differ between the two commits. **The parent is
`33edfcd0`.** Its `src/` is byte-identical to `5866b527`'s (`diff -rq` against `git archive 33edfcd0 src`), so the
parent checkout Builder C made (`scratchpad/p324/parent`, from `5866b527`) is the parent's `src/` exactly.
`origin/main` still holds no condition 100 (§11).

### What each builder delivered, as built

- **Builder A** wrote §3 exactly. The 3.6a, 3.7b and 3.7c rows are unchanged, and no gate logic moved.
  `control-plane.ts` changed in comments only.
- **Builder B** wrote §4, §5 and §7. It went beyond the spec in four places, and the integrator kept all four:
  - 100e bans the inflected forms too (`backport\w*`, `sigkill\w*`, `(?:un)?patch\w*`).
  - 100a requires `spawn` to be the file's only way to start a process.
  - 100d requires the note's builder command, the pin's own URL, and the 3.6, 3.6b and 3.7c rows to be among those found.
  - 100b reads the precheck's binding rather than a fixed name.
- **Builder C** wrote §6. It fixed seven defects in its own draft, and several of them gave a false PASS.
  - **The one place its driver cannot follow §6.3 literally.** `TmuxControlClient` consumes the greeting and the guards,
    and it exposes neither. So the stream the comparison reads comes from a probe-owned RAW control child, spawned
    with `CONTROL_ATTACH_ARGS` against the same binary on a fresh scratch server. It covers steps 1, 3, 4, 5, 6, 7 and 9.
  - **What C and D record instead:** open or refused, the greeting time, 0 `%output` beside a raw child that saw some,
    and (D) the list over the connection byte-equal to the list over exec.
  - The driver says this in its header, and `results.json` says it under `dialectVia`.

### What the integrator changed, and why

- **`build/conformance-machines.mjs`.**
  - **`sourcesUnder` goes through the shared walker.** Condition 100's own directory walker is replaced by
    `walkScripts` from `build/build-scripts.mjs`, the walker the three teardown gates already share. The CLAUDE.md
    rule is to grep for an existing helper before writing one. It reads the same 633 files under `src/main` as the
    builder's walker did.
  - **The constant's comment** now says the ablation reads it.
- **`build/p324/ablation.mjs`.** The condition number is READ from the gate's `const P324_CONDITION = <n>;` and no longer
  written a second time. Moving the gate's one constant now moves every owner tag.
  - 320.1's lane already uses conditions 100 to 106 (see the open concerns), so one of the two phases WILL renumber.
  - If the gate carries the constant zero times or twice, the ablation exits 2 before writing anything.
- **`build/p324/drive-p324.mts`.** It now measures two claims the rows' notes make and the driver did not read:
  - **The notifications on a kill.** The note says "on a create, a kill and a rename". The driver drained the kill's
    lines unread, and now records them as `onKillKnown`.
  - **"with exit 1" for the no-server read.** `execOn`'s classified error carries no exit status. The SAME composed
    plan (`tmuxCommand`, which is what `execOn` spawns) is now run once more through the stand-in, and its status is
    recorded as `E.noServerExit`.
- **`build/p324/probe-p324.mjs`.**
  - **The kill in the comparison.** `onKillKnown` joins the dialect keys compared with the 3.6a control. The reference's
    own well-formedness check requires `sessions-changed` on the kill, and the `--compare` projection gains
    `dia_onKill`, `E_oneRow` and `E_noServerExit`.
  - **`noteClaims` (new).** Each measured exec and boot sentence of the notes is asked of every new and control row:
    - `-V` equals `#{version}`;
    - born, with 12 of 12, at the boot and at the rebirth;
    - no rows on an empty server, and `["$0"]` holding one;
    - `history-limit` reads `25000`;
    - the no-server sentence, `TMUX_UNREACHABLE`, and exit 1;
    - the list parsed.
  - **`sameAsReference` (new).** §6.7 says every cell of a new-string row equals the 3.6a control's except the version
    strings and the gate columns. Only the dialect was asked before, so a scroll shape or an attach that differed
    from 3.6a would have passed.
  - **The shipping client's own `%output` count** is now asserted at HEAD.
  - **A signal to a pid it no longer owns is removed.** The orchestrator's `finally` sent SIGTERM to the driver's pid
    AFTER `spawnSync` had already reaped it, and by then the number could belong to another of his processes.
    `spawnSync` ends the driver itself on timeout. The unused `spawn` import is dropped.
  - **The header** documents `P324_RUN` and says a PASS means the notes held.
- **`CLAUDE.md`.** The `probe:p324` row's provisional cost is replaced with the integrator's measurement.

The integrator did not edit A's rows, the tests, the CHANGELOG item, the pin, or `verification-checks.mjs`.

### Every command, with exit and numbers

| # | Command | Exit | Reading |
| --- | --- | --- | --- |
| 1 | `git checkout --detach origin/main` | 0 | HEAD `33edfcd0`, 12 modified and 1 untracked path carried |
| 2 | 10-line duplicate scan (own script) over `build/p324/*` and condition 100, within and against `build/` + `src/` | 0 | 0 duplicate windows within, 0 shared with the tree |
| 3 | AST re-derivation (own script, the TypeScript compiler's parser, not `scan-source.mjs`) | 0 | 22 of 22 held (below) |
| 4 | Both gates and Prepare's rule over 24 strings, evaluated through tsx at HEAD and at the parent | 0, 0 | only `3.6` and `3.6b` move (unmeasured to measured on both gates; sheet to none); 22 hostile or older strings identical |
| 5 | `run-head/argv.log`, every far `-C` string matched to the version read before it on its socket | 0 | 19 of 19 through the same program path; the 20th is the ablated cell, which by design has none |
| 6 | `npm run -s typecheck` | 0 | 2.2 s; 0 boundary violations, 0 runtime cycles |
| 7 | `vitest run src/main/tmux src/main/machines src/renderer/settings` | 0 | 129 files passed, 1 skipped; 3,024 tests passed, 7 skipped; 8.8 s |
| 8 | `npm test` (whole suite) | 0 | 1,008 files passed, 1 skipped; 17,348 tests passed, 7 skipped; 52.1 s |
| 9 | `gate:checks`, `gate:background`, `gate:knownhosts`, `gate:electron`, `gate:simulator`, `gate:contract`, before and after the integrator's edits | 0 each | 239 check scripts classified; 485 files read with 3 long-lived starts; 513 files read; 153 of 153 against the floor; baseline byte-equal |
| 10 | `node build/contract-inventory.mjs --check` | 0 | byte-equal; `contract-baseline.txt` not moved |
| 11 | `npm run -s conformance:machines` | 0 | PASS, 3.9 s, condition 100's sentence printed |
| 12 | `npm run -s ablation:p324`, IN PLACE | 0 | control green; 15 of 15 red on their own clause; 3 files back by sha256; 51.8 s |
| 13 | the same in a clone with the gate's constant set to 107 | 0 | 15 of 15 red on `107a` to `107e` |
| 14 | the same with the constant missing, then doubled | 2, 2 | one sentence each; shipping files untouched |
| 15 | `npm run -s build` | 0 | 36.1 s; every build-time gate green |
| 16 | `probe:p324` at HEAD, `P324_KEEP=1` | 0 | PASS, 35.7 s; ablated cell ended its server; crash reports 7 to 8 |
| 17 | `probe:p324` at the parent, `P324_ABLATE_PRECHECK=0` | 0 | PASS, 31.5 s; crash reports 8 to 8 |
| 18 | `--compare` HEAD against parent | 0 | exactly 18 differences, all permitted (below) |
| 19 | the new report checks, each broken on a copy of the results | 0 | 10 `noteClaims` and dialect cases, 7 `sameAsReference` cases, and 2 `--compare` cases, each red when broken and green when not |
| 20 | condition 100 over a merge with 320.1's current `src/` (`git merge-file`, no conflict) | 1 | condition 100 holds; the one red is condition `send-keys`'s ledger, which 320.1's own gate edit owns |
| 21 | `probe:p324` at HEAD with the final orchestrator, ablated cell off | 0 | PASS, 32.1 s; `--compare` against the parent: 0 |
| 22 | leftovers | — | 0 `tmux` on `-L p324-`; 0 `p324-*` socket files; 0 node processes of this lane |

- **The 22 AST checks (row 3).**
  - `start()` has one top-level `try`, whose first statement is `await this.transport.precheck();`, and the three
    statements before the `try` call nothing.
  - In that `try`, the precheck comes before the plan, which comes before the one `spawn`. The `spawn` is handed
    `plan.file` and `[...plan.argv]`.
  - The class spawns once and plans once. The file starts a process at one call, prechecks once, and imports only
    `spawn` from `child_process`.
  - `scheduleReconnect` goes back through `this.start()` and neither spawns nor plans.
  - The precheck is exactly three statements, with no `try` and no `.catch`, `.then` or `.finally`. The plan composes
    `tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)`.
  - `assertControlDialectMeasured` returns only on `measured`.
  - There are 2 constructions of `TmuxControlClient` under `src/main`: the remote one over
    `remoteControlTransport(machineId)` and the local default in `core.ts`.
  - `execOn` reaches the far side through `spawnTmux`, which composes `tmuxCommand(ctx, args, …)`.
- **The notes against the HEAD run.**
  - **`measuredAt '2026-09-29'` is right.** The HEAD run was green on 2026-09-29.
  - **Every measured value in the notes held:** `25000`, the no-server sentence with exit 1, 12 of 12 at the boot and
    after the rebirth, `$0`, `#{version}` equal to the row's version, and the ten-field list parsed.
  - The list was byte-equal over the live connection and over exec (131 of 131 bytes on 3.6).
  - All twelve dialect keys equal the 3.6a control's, the kill included.
  - The scroll shapes and the attach equal 3.6a's: +30 reads 30, 1500, 1490, clamped at 2978, the exit reads 0,
    `copy_position_limit` is empty, and the attach drew with exit 0.
- **The `--compare` differences (row 18).** They are exactly `execGate`, `controlGate`, `prepare`, `G_open`, `G_live`
  and `C_opened`, on 3.6 and on 3.6b. On the two pair-up rows they are `execGate`, `controlGate` and `C_opened`. No
  control row differs, and no crossing pair.

### The costs, measured here

| What | Cost |
| --- | --- |
| `probe:p324` at HEAD | 32 to 36 s |
| `probe:p324` at the parent | 31.5 s |
| `ablation:p324` in place | 52 s |
| `conformance:machines` | 3.9 s. CLAUDE.md's row still says ~2 s. That was stale before this phase, and the row's cost column was left alone. |

### What the integrator could not do

- **No Electron gate.** smoke, smoke:t1 and smoke:t3 are the verifier's, under THE LOCK (1.2 item 11).
- **No `npm run package`,** which is the verifier's or the committer's.
- **No `probe:controldeadline`.** It reads a count of his `-L gmux` sessions and is the verifier's alone (1.2 item 10).
- **No distribution builds.** None were built or opened here; that is V1's work.
- **The parent run had its ablated cell off** (`P324_ABLATE_PRECHECK=0`), to spare a crash report. That cell uses a
  precheck-free probe transport, so it does not depend on the code under test.

### Open concerns for the verifiers

1. **The condition number will collide.**
   - 320.1's lane (`/private/tmp/wt-p3201`) already numbers its conditions 100 to 106 in the same file.
   - Whoever lands second renumbers. For this phase the executable part is ONE constant (`P324_CONDITION`), and the
     ablation follows it.
   - The prose naming "100" sits in seven places:
     - `src/main/machines/control-plane.ts:63` (job 4, §3.3's text);
     - `build/conformance-machines.mjs`'s header paragraph and its block heading;
     - `build/verification-checks.mjs`'s `ablation:p324` comment;
     - `build/machines-conformance-probe.mts`'s `note` comment;
     - `build/p324/ablation.mjs`'s header;
     - CLAUDE.md's `conformance:machines` row.
2. **The CHANGELOG list.** 320.1's drafted item in its lane still says "tmux 3.6a, 3.7b or 3.7c". The phase that lands
   second writes the five (§11).
3. **The note's "its stream matched the 3.6a row's copy".**
   - The stream compared is a probe-owned raw control child: the same binary, `CONTROL_ATTACH_ARGS`, a fresh scratch
     server. It is not the shipping client's own stream, which the client does not expose.
   - The shipping client (C) measured: open, its greeting, and 0 `%output`.
   - The shipping client class over a gate-free transport with the shipping plan (D) measured the list byte-equal to
     exec.
   - V1's own raw reader decides whether the sentence stands as written.
4. **The greeting filter.**
   - The greeting comparison drops `%output`, `%window-renamed`, `%unlinked-window-renamed` and `%unlinked-window-add`
     (`SHELL_VOLATILE`), which are shell-timing lines. The `unparsed` names differ between runs for the same reason.
   - The raw streams are kept in `scratchpad/p324/integrator/run-head/control-*.raw`, so a verifier can check the
     filter hides no protocol difference.
5. **Crash reports.** The ablated cell writes one tmux crash report per run to his `~/Library/Logs/DiagnosticReports`.
   Eight exist now: seven from Builder C and one from the integrator. None was read or deleted.
6. **`far-sh`'s first shape is loose.**
   - It admits any string holding `-L p324-`.
   - Its real-socket refusal matches an unquoted `-L gmux ` or `-L default `, each followed by a space. So a string
     carrying a p324 socket AND a quoted `-L 'gmux'` would be admitted.
   - No composer produces that string, but V2 may attack the stand-in itself.
7. **Cells `--compare` does not see.** It compares targets and pairs only. The rollback and ablated cells are asserted
   per run by `report()`; both builds' rollback cells passed.
8. **Prepare's mismatch arm** (out of scope, §12). A machine with a stale acceptance, for example 3.5a, that now reports
   3.6 is stopped before the gate at HEAD exactly as at the parent. It is neither worse nor better.
9. **The refusal codes.**
   - A crossing pair is refused with `INVALID_INPUT` carrying the `CONTROL_DIALECT_UNMEASURED` sentence.
   - A rolled-back program is refused with `UNKNOWN`, "display-message failed", which is the protective read failing,
     with the server's pid unchanged.
10. **The driver is not type-checked.** `build/p324/drive-p324.mts` is outside every `tsc` project (tsx strips types),
    so only a run proves it.

### Where the entry was wrong, found at integration (beyond §1.2)

- **The entry's C arm cannot be built as written.** It "records … the create, rename and kill notifications" through the
  shipping client, and the client exposes no stream. The driver records them from a raw child instead. The KILL's
  notifications were read by nobody until this integration.
- **"with exit 1" cannot be read through `execOn`,** whose classified error carries no status. It is now measured by
  running the same composed plan once more.
- **The entry assumed condition 100 was free for this phase and Phase 327 alone.** Phase 320.1 has taken 100 to 106 in
  its lane.
- **The entry's `P324_ABLATE_PRECHECK=1` knob is inverted as built.** The ablated cell runs by default, and `=0` skips it
  (§6.4).

---

## §As built, second integration (the integrator, 2026-09-30)

The three builders ran again. Each found its files already holding the 2026-09-29 build and integration, checked them
against this spec, and reported. Builder A and Builder B changed nothing. Builder C fixed two defects in its own
files:
- **`far-sh`'s self-test canary.** It wrote to `/tmp/p324-hostile`, outside scratch, when a hostile row was
  admitted. It now lives in the self-test's own directory, and the self-test has 38 rows.
- **The driver's cleanup.** It now signals a pid only while that pid's command line still names one of the run's
  sockets (`stillOurs`, `signalOurs`).

This integration moved the tree onto main's tip and ran the battery again. It launched no Electron, ran no ssh, read
no server of his, and committed, staged and stashed nothing.

### The parent

**The parent is now `261d98b6`**, origin/main's tip. Eight commits landed since `33edfcd0`: Phases 330 and 331, and
their docs.

**How the tree was moved.** The four files both sides changed were restored to `33edfcd0` from backups in
`scratchpad/p324/integrator/r2/before/`. Then `git checkout --detach origin/main` ran, which carried the other eight
modified files and `build/p324/`. Each of the four was then three-way merged with `git merge-file` (base `33edfcd0`,
this phase's file, main's file).

The four files were `CHANGELOG.md`, `CLAUDE.md`, `package.json` and `build/verification-checks.mjs`. Builder B's
report said six. `build/conformance-machines.mjs` and `build/machines-conformance-probe.mts` are byte-identical
between `33edfcd0` and `261d98b6`.

- **`verification-checks.mjs`** merged clean.
- **The other three** conflicted only because this phase's lines sat beside 330's and 331's. Each kept both sides:
  - main's rewritten iPhone item, then this phase's item;
  - `probe:p324` beside `probe:p331`;
  - the `probe:p324` row, then main's rewritten `test:ios` and `probe:p316` rows and its new `probe:p330` and
    `probe:p331` rows.

**Checks on the move:**
- The phase's added and removed lines are identical before and after the move: 852 lines.
- The eight files that did not conflict, and the four files under `build/p324/`, kept their sha256.
- In what the phase reads, main changed only comments in `src/main/tmux/scroll.ts` (Phase 331) and
  `src/main/machines/tailscale.ts` (Phase 330), and one call in `src/main/machines/remote-record.ts`, which no arm
  drives.
- `HELPER_USER_FLOOR` is **155** at this parent, not the 153 §7.5 names. This phase reaches `build/electron-run.mjs`
  from no script, so it stays at the parent's 155.
- `contract-baseline.txt` moved on main (Phase 330). This phase does not move it.

The parent checkout for the probe was made with `git archive 261d98b6 | tar -x` into
`scratchpad/p324/integrator/r2/parent`, then `cp -Rc node_modules` into it. No git metadata was touched.

### What the integrator changed

- **`CLAUDE.md`, the `probe:p324` row's cost, and nothing else.** The row said each build takes 30 to 50 s. The
  builds measured 22 to 26 s, by the spec step and by Builder C. It now reads "about 30 to 40 s once the four builds
  exist (34 s at HEAD with the ablated cell on and 33 s at the parent with it off, measured on 2026-09-30), and each
  build about 25 s, made once".
- **`measuredAt` stays `'2026-09-29'`.** The HEAD run was green that day, and green again today at the new parent,
  and the note's measured values held in both runs. Changing the date would move a row's text for no new
  measurement.

### The duplicate scan

This was the integrator's own scan: 10-line windows, blanks and comments dropped, over every file under `src/` and
`build/` (2,933 files). It found one pair, and nothing shared with the rest of the tree. The pair is the 3.6 and 3.6b
rows' notes, which §3.1 writes out in full on purpose. They are data, each row states its own measurement, and
`probe-execplane.mjs` and condition 100 read the rows as literal text. Nothing was extracted.

### The re-derivation (the integrator's own reader)

`scratchpad/p324/integrator/r2/rederive.mts`, run through the pinned tsx over the SHIPPING modules of each checkout. It
uses no tmux at all. It is not `probe:p324`, not the driver, and not the previous integration's AST reader.

- **A, the gates.** Both gates, and the exec gate with the same string also accepted, were read over 34 strings.
  - Exactly two strings move from the parent to HEAD, `3.6` and `3.6b`. They go from unmeasured, accepted and
    unmeasured to measured on all three reads, so measured beats accepted.
  - The other 32 are identical, including `3.6 `, `3.6\r`, `3.6c`, `3.60`, `3.6.0`, `3.6-rc`, `next-3.6`, `3.6A`,
    `3.6B`, `v3.6`, `3.5a` down to `3.1c`, `3.7`, `3.7a`, `3.8-rc`, `next-3.8`, the empty string, `3.6,3.6b` and
    `3.6|3.6b`.
  - Both composed sentences read "3.6, 3.6a, 3.6b, 3.7b and 3.7c", against "3.6a, 3.7b and 3.7c" at the parent.
  - The parser is unchanged: `tmux 3.6 \n` reads `3.6` at both builds, because it trims.
- **B, the order.** The shipping `TmuxControlClient` was driven over a recording transport whose precheck answers
  reject, resolve, reject, resolve, resolve across the first start and four reconnects. The plan is a
  `node -e` that appends one line and exits.
  - 3 plans, 3 spawns and 3 resolved prechecks.
  - No plan came after a refused precheck, and no plan came without a resolved precheck just before it.
  - The same result at both builds, 8.0 s each.
- **C, the program.** The shipping `remoteControlTransport`, `TmuxControlClient` and `openControlPlane` were driven over
  a `/bin/sh` stand-in that answers the version read from a file and runs nothing.
  - **The precheck at HEAD** resolved for `3.6`, `3.6b`, `3.6a`, `3.7b` and `3.7c`. It refused `3.5a`, `3.6c` and
    `next-3.6` with the `CONTROL_DIALECT_UNMEASURED` sentence.
  - **The precheck at the parent** also refused `3.6` and `3.6b`.
  - **The child at HEAD.** For `3.6` and `3.6b` the stand-in's log reads the version read first. The one `-C` string
    (`… -L p324-rd-<pid> -f /dev/null -C new-session -A -s gmux-control`) comes after it, and both begin with the
    same program path.
  - **No child otherwise.** For `3.5a`, and for `3.6` and `3.6b` at the parent, no `-C` string was ever handed over.
  - **The entry point.** `openControlPlane` answered true and `connecting` for `3.6` and `3.6b` at HEAD, and false
    and `polling` / `runs a version Tortie has not measured` at the parent. `3.6a` answered true at both builds, and
    `3.5a` false at both.

### Every command, with exit and numbers

| # | Command | Exit | Reading |
| --- | --- | --- | --- |
| 1 | the four files restored from backup, `git checkout --detach origin/main`, `git merge-file` ×4 | 0; merge 0, 1, 1, 1 | HEAD `261d98b6`; three conflicts, each resolved by keeping both sides; 852 changed lines identical across the move |
| 2 | duplicate scan (own script) | 0 | one pair, the two rows' notes (above) |
| 3 | `rederive.mts` at HEAD and at the parent | 0, 0 | 10 s and 13 s; readings above |
| 4 | `npm run -s typecheck` | 0 | 15 s; 0 boundary violations, 0 runtime cycles |
| 5 | `npx vitest run src/main/tmux src/main/machines src/renderer/settings` | 0 | 129 files passed, 1 skipped; 3,031 tests passed, 7 skipped; 9 s |
| 6 | `npm run -s conformance:machines` | 0 | PASS in 2.8 s, condition 100's sentence printed |
| 7 | `gate:checks` | 0 | 240 check scripts classified. The check table goes from 257 to 259 entries: `probe:p324` and `ablation:p324` added, 0 changed, 0 removed, by the integrator's own comparison of the two tables |
| 8 | `gate:background`, `gate:knownhosts`, `gate:electron`, `gate:simulator` | 0 each | 490 files, 3 long-lived starts, 19 of 19 fixtures; 518 files; 155 of 155 against the floor; 2 of 2 |
| 9 | `gate:contract`, `node build/contract-inventory.mjs --check` | 0, 0 | byte-equal |
| 10 | `npm run -s ablation:p324`, IN PLACE | 0 | control green; 15 of 15 red on their own clause; 39 s; the three files back by sha256, and equal to the pre-run backup |
| 11 | `probe:p324` at HEAD, `P324_KEEP=1`, ablated cell on | 0 | PASS, 34.2 s |
| 12 | `probe:p324` at the parent `261d98b6`, ablated cell off | 0 | PASS, 33 s |
| 13 | `--compare` HEAD against the parent | 0 | 38 differences, all permitted (below) |
| 14 | `--far-sh-self-test` | 0 | 38 of 38; `/private/tmp/p324-hostile` absent afterwards |
| 15 | `npm test` | 0 | 1,017 files passed, 1 skipped; 17,519 tests passed, 7 skipped; 41 s |
| 16 | trial merge with 320.1's lane (below), condition renumbered to 108: `conformance-machines.mjs`, then `build/p324/ablation.mjs` | 0, 0 | PASS in 6 s, with both 320.1's and this phase's sentences printed; 15 of 15 arms red on `108a` to `108e`, files back by sha256, 84 s |
| 17 | `npm run -s build` | 0 | 33 s; every build-time gate green |
| 18 | leftovers | — | 0 `tmux` on any `-L p324-` socket; 0 `p324-*` socket files; 0 node processes of this lane; no Electron started |

**Row 11, the HEAD run.**
- For 3.6 and 3.6b: both gates measured, Prepare `no sheet, boots`, and 12 of 12 options agree at the boot and after
  the rebirth.
- History limit reads `25000`. The no-server read gives the sentence, `TMUX_UNREACHABLE` and exit 1. The list parses
  into ten fields.
- G opens and goes live. C opens with one spawn, 0 `%output` on the client, and 8 on the raw child beside it.
  Dialect steps 1 to 7 and 9 equal 3.6a's. D's list equals exec's.
- S reads 30, 1500, 1490, clamps at 2978, exits at 0, with `copy_position_limit` empty. A draws and exits 0.
- The pair-up rows open. The crossing pairs are refused with `INVALID_INPUT` and 0 spawns. In all three rollback
  cells the server stays alive with its pid unchanged and 0 children.
- The ablated cell ended its server with no fresh server left.
- His world, from `argv.log`:
  - 430 far strings, 0 refused, 0 naming another socket or `-S`;
  - 0 without `-L p324-` beyond the `-V` reads and the PATH capture;
  - 20 far control children, all behind a version read through the same program except the one ablated cell.

**Row 13, `--compare`.** The 38 differences are all in the gate, Prepare, G and C columns: 13 on 3.6, 13 on 3.6b,
and 6 on each of the two pair-up rows. No control row, crossing pair or rollback moved. The count is Builder
C's widened projection. The first integration's 18 were read before `G_linkKind`, `G_spawns`, `C_spawns`, `C_code`,
`C_unmeasured`, `C_outClient` and `C_rawSaw` were projected.

**Row 16, the trial merge with 320.1.**
- It was made in an APFS clone of this worktree with its `.git` file removed. No git command ran in the clone.
- 320.1's 53 changed or new files, read-only from `/private/tmp/wt-p3201` at `d8f5c261`, were copied in, and the
  seven files both lanes change were merged with `git merge-file`.
- `control-plane.ts`, `machines-conformance-probe.mts` and `verification-checks.mjs` merge clean.
- `conformance-machines.mjs` conflicts at its header and its foot, because both append a block. It was resolved as
  320.1's block first and this phase's second, with the one constant set to 108.
- `CHANGELOG.md`, `CLAUDE.md` and `package.json` conflict only because the lanes' lines sit side by side.
- The clone was deleted afterwards.

### Open concerns for the verifiers

1. **The condition number will collide, and renumbering is proven.**
   - 320.1's lane now numbers its conditions **100 to 107**, not 100 to 106.
   - If 320.1 lands first, this phase takes 108. Row 16 shows that is one constant, and the ablation follows it.
   - The prose naming "100" still has to be moved by hand in seven places:
     - `src/main/machines/control-plane.ts`'s job 4;
     - the gate's header paragraph and its block heading;
     - `verification-checks.mjs`'s `ablation:p324` comment;
     - `machines-conformance-probe.mts`'s `note` comment;
     - `build/p324/ablation.mjs`'s header;
     - CLAUDE.md's `conformance:machines` row.
2. **320.1's CHANGELOG item** in its lane still says "tmux 3.6a, 3.7b or 3.7c". The phase that lands second writes
   the five (§11).
3. **"its stream matched the 3.6a row's copy", in the two notes,** is measured on a probe-owned raw control child: the
   same binary, `CONTROL_ATTACH_ARGS` and a fresh scratch server. It is not the shipping client's own stream, which
   the client does not expose. This is carried over from the first integration. V1's raw reader decides whether the
   sentence stands.
4. **The greeting filter** (`SHELL_VOLATILE`) drops `%output`, `%window-renamed`, `%unlinked-window-renamed` and
   `%unlinked-window-add`. The raw streams are kept in `scratchpad/p324/integrator/r2/run-head/control-*.raw`.
5. **Crash reports are retired while the probe counts them.**
   - At about 06:46 today macOS moved every `tmux-*.ips` out of `~/Library/Logs/DiagnosticReports` into its
     `Retired/` subdirectory. That is 22 names; none was read.
   - The top level now holds 0. The probe counts the top level only, and only prints the count; nothing asserts it.
   - So a retire during a run makes "before / after" read wrong without failing anything.
   - A verifier counting crash reports should list both directories, names only.
   - Each HEAD run with the ablated cell on still adds one report.
6. **Three `p83-*` socket files from 2026-09-29** remain in `/private/tmp/tmux-501/` (`p83-3.4-77288`,
   `p83-3.6-93528`, `p83-3.6a-48235`).
   - Builder C attributes them to the first round's verifier. They are not this integration's, and they were left
     alone.
   - `build/build-tmux-version.mjs` ends its scratch server by pid but leaves the socket file. That is not this
     phase's file.
7. **Carried over:**
   - `--compare` does not see the rollback and ablated cells; `report()` asserts those per run.
   - Prepare's mismatch arm is out of scope (§12).
   - The two refusal codes differ: `INVALID_INPUT` for a crossing pair, `UNKNOWN` for a rolled-back program.
   - `drive-p324.mts` is outside every `tsc` project. Builder C ran `tsc --strict` on a copy and it exited 0.
8. **Not run here, and left to the verifier:**
   - `smoke`, `smoke:t1` and `smoke:t3`, under THE LOCK;
   - `probe:controldeadline`, which is the one read of a count of his sessions;
   - `npm run package`, which signs through his keychain.

### Where the entry or this spec was wrong, found in this round

- **§7.5 and the task say `HELPER_USER_FLOOR` is 153.** It is 155 at the parent this phase now sits on.
- **Builder B's "six shared files moved on main"** is four between `33edfcd0` and `261d98b6`.
- **§6.2 gives the wrong reason for stripping `TMUX` and `GMUX_*`.** It says a nested attach refuses to run. Builder C
  measured that it does not: tmux's nesting check looks for the client's terminal among that server's own panes. The
  stripping is held by the probe's own check on the driver's environment names.
- **§3.1's reason for the header rule is half right** (Builder A). `probe-execplane.mjs`'s parse takes the first `[`
  after the name, which is the type annotation's `[]` on `:175`, and reads the right block only because it stops at
  `\n];`. The rule is stricter than it needs to be, and it is followed.
- **CLAUDE.md's build cost** was written as 30 to 50 s. It is about 25 s, and it is corrected above.

---

## §As built, the fix round (the fixer, 2026-09-30)

Both lenses answered needs_work. This round ran ONCE, as the method requires. It launched no Electron and ran no
ssh. It read no server of his, and it committed, staged and stashed nothing. Every mutation ran in an APFS clone
under `scratchpad/p324/fixer/` with its `.git` removed, and each clone was deleted afterwards.

### What each finding became

| Lens | Severity | Finding | What this round did |
| --- | --- | --- | --- |
| 1 | major | 100b did not forbid an early return or state held across calls. A three-line "read once" flag passed the gate and probe:p324, and live it ended a 3.6 server | **Fixed** in the gate, the attack and the probe (below) |
| 1 | major | A stale acceptance of an older version, meeting a server now on 3.6 or 3.6b, reads "Tortie has not measured the program this machine runs", which is false at HEAD | **Not repaired and not removed. It goes to him** (below) |
| 1 | minor | Nothing pinned the parser under the byte-exact gates | **Fixed**: a parser-through test |
| 1 | minor | 100e missed `3.6a-2ubuntu0.1` and `~bpo13` | **Fixed**: names asked anywhere in a word, suffixes banned, two arms |
| 1 | minor | The CHANGELOG item did not say an upgraded-in-place machine stays refused until its old tmux restarts | **Fixed**: one limit clause |
| 1 | nit | The surface half of ruling 1 rested on review | **Fixed**: 100e reads the one draw site and its label, two arms |
| 2 | major | The in-app side-by-side was not made (no lock) | **Not this round's to do.** A fixer launches no Electron. This is the reverifier's app run, and it is ready in `scratchpad/p324/verifier-app/` |
| 2 | minor | The task named the parent as `5866b527`, and `/private/tmp/wt-p324-parent` is a stale non-git directory | **Recorded** (below) |
| 2 | minor | §10 V1's clean-apply rule would fail on macOS's `.orig` backup | **Amended** (below) |
| 2 | minor | The first-session race (Phase 326) now reaches 3.6 and 3.6b machines | **Not measurable without an Electron.** Phase 326's own evidence is cited (below), and the measurement is the reverifier's |

### 1. The read before every far control child, made whole (Lens 1 major 1)

**`build/conformance-machines.mjs`, condition 100.**
- **100b now reads the precheck's whole body, statement by statement.** A new helper, `statementsOf`, splits a block at a
  `;` that stands outside strings and outside every bracket, and makes whitespace canonical. The precheck must be
  exactly three statements, in this order:
  1. a binding from `remoteContextFor(machineId)`;
  2. that binding's `execOn(…, ['display-message', '-p', '#{version}'], {<no call>})`, awaited into a binding;
  3. `assertControlDialectMeasured(machineId, parseTmuxVersion(<that binding>))`.

  Nothing else may stand before, between or after them. A statement that runs on into the next one, because it holds
  a block or has no semicolon, matches none of the three.
- **100b also requires `remoteControlTransport`'s body to be one statement**, a `return` of one object literal, so the
  transport has no closure a flag could live in.
- **100a now pins the constructor.** It must take exactly `private readonly transport: ControlTransport =
  localControlTransport()`, and the file must never assign `this.transport`. A wrapper made in the constructor would
  have passed every other clause and skipped the read on every reconnect. That is the sibling of the verifier's hole
  on the client's side.
- The header paragraph and the success sentence say all this.
- `closeOf` is not imported. The literal's end is found with `blockAt`, which the file already imports, so the import
  line 320.1 may also touch does not move.

**`build/p324/ablation.mjs`.** Arms may now carry `edits` (several finds in order, each exactly once) and `expect` (a
piece of the sentence the owning clause must print). An arm red on the right clause but not on that sentence fails as
"wrong sentence". Ten arms were added, 16 to 25:

| # | Owner | The break | At the gate as the builders left it | Now |
| --- | --- | --- | --- | --- |
| 16 | 100b | a per-transport "read once" flag (the verifier's A1c, byte for byte) | GREEN | red, the precheck sentence |
| 17 | 100b | a per-generation module cache, cleared in `resetControlPlanesForTests` (A1b) | GREEN | red |
| 18 | 100b | a `return` between the read and the refusal (A3) | GREEN | red |
| 19 | 100b | the refusal thrown in a detached `.then` (A2) | GREEN | red |
| 20 | 100e | the 3.6 subject names `3.6a-2ubuntu0.1` (A8) | GREEN | red, `says "ubuntu"` |
| 21 | 100e | the 3.6b note names `3.6b-1~bpo13+1` (A9) | GREEN | red, `says "~bpo1"` |
| 22 | 100a | the constructor wraps the transport in a read-once precheck | GREEN | red, the constructor sentence |
| 23 | 100b | the transport holds state of its own (the body clause alone) | GREEN | red, the body sentence |
| 24 | 100e | a distribution label beside the drawn list (A11) | GREEN | red, the draw-site sentence |
| 25 | 100e | the label above the list names a distribution | GREEN | red, the label |

The "GREEN" column was measured, not assumed. The gate the builders left, taken from the attack verifier's untouched
clone (`verifier-attack/clone/build/conformance-machines.mjs`, sha256 `f9a1d54c…`), was put into a scratch clone and
arms 16 to 25 were run against it. `expect` was also proved able to fail: arm 23 given the precheck sentence to expect
answered "wrong sentence", exit 1.

**`build/p324/drive-p324.mts` and `probe-p324.mjs`: the downgrade arm (`runDowngrade`).** This arm drives the path the
precheck exists for, which no arm drove before.
- **Setup.** The program is a symlink in the run directory, `<run>/dg-<tag>/bin/tmux`. The server is booted through
  it, a held session is made, and the live connection is opened through the product's own `openControlPlane`.
- **The downgrade.** The symlink is re-pointed at 3.5a by an atomic rename. `gmux-control` is then detached by the
  probe's own `detach-client`, sent through the server's program on the scratch socket and never through `execOn`.
  This makes the shipping client's reconnect run.
- **What the judge requires**, on 3.6, 3.6b and the 3.6a control at HEAD, and on 3.6a alone at the parent (where 3.6
  and 3.6b never open, which it also asserts):
  - at least one version read after the downgrade;
  - 0 far control children after it, and 0 control children alive;
  - the server alive with its pid unchanged, and the held session present;
  - no fresh server on the socket;
  - the link not reading `connected`.
- **`--compare`** projects the rows. The 3.6a row must be identical at both builds, and a row whose server string this
  phase added must move `opened`.
- `hisWorld` needs no change. The same program path before and after is what lets its per-socket read ledger see an
  unguarded child.

**The live proof, measured.**

| Tree | probe:p324 | Downgrade cells (3.6, 3.6b, 3.6a) |
| --- | --- | --- |
| HEAD | PASS, exit 0, 44.7 s wall | 2 reads, 0 children, server alive with its pid, session present, link `quiet` |
| parent `261d98b6` (integrator's archive, ablated cell off) | PASS, exit 0, 34.8 s | 3.6 and 3.6b not opened (`polling / runs a version Tortie has not measured`); 3.6a as at HEAD |
| A1c mutation (clone) | **FAIL, exit 1** (it passed before this round) | 0 reads, 2 children through 3.5a, server GONE, pid CHANGED, session GONE, a FRESH server, link `connected` |
| A1b mutation (clone) | **FAIL, exit 1** (22 problems) | the same readings |

`--compare` of HEAD against the parent passes with 58 differences: the integrator's 38, plus 10 on each of the 3.6
and 3.6b downgrade rows, and none on 3.6a. Three altered copies of the results were each refused with exit 1:
- 3.6a's downgrade moved;
- 3.6's `opened` did not move;
- HEAD ran no downgrade row.

### 2. The parser (Lens 1 minor 3)

`src/main/tmux/__tests__/version.test.ts` gains "admits nothing near them through the parser the product runs first".
It holds 15 strings a far tmux could print, each of which must not parse to `3.6` or `3.6b` and must not reach either
gate as measured:

`3.6c`, `3.60`, `3.6.0`, `3.6-rc`, `tmux 3.6-rc`, `3.6 foo`, `3.6b foo`, `3.6b+deb`, `3.6b-1~bpo13+1`,
`3.6a-2ubuntu0.1`, `3.6b.1`, `3.6bb`, `3.6A`, `next-3.6`, `v3.6`.

`'3.6 '` and `'3.6\r'` are left out on purpose. The unchanged parser trims them to `3.6`, exactly as `'3.6a '` reads
`3.6a` at the parent. With the verifier's A4 parser (keep a leading version-shaped token) applied in a clone, this
test failed on `"3.6-rc" parsed as "3.6"`, and it was the only test to fail. The strings sit in a test, never in a
row, a subject, a note or a surface.

### 3. No weird label, both halves (Lens 1 minor 4 and the nit)

**100e's ban list:**
- Distribution names are asked anywhere in a word, with no `\b`. No ordinary word a row uses contains one, and the
  rows and the table's text are green.
- A new line bans `~bpo\d`, `\bbpo\d`, `+deb\d`, `.deb`, `.fc\d` and `.el\d`.
- `\bArch\b` and the defect words keep their boundaries.

**100e now also reads the one surface.**
- In `AddMachine.tsx`, the `data-measured-versions="1"` span must draw exactly `{MEASURED_VERSIONS.join(', ')}`. It is
  read from the RAW text, because the comment stripper takes a JSX closing tag's `/` for a regex.
- `MEASURED_VERSIONS` is named twice in that file: its import and the one draw.
- `machines-copy.ts`'s `MEASURED_VERSIONS` and `PREPARE_SUPPORTED_LABEL` are held to the ban list.
- A NEW surface that names versions is still review's to catch, and the comment says so.

### 4. The CHANGELOG item (Lens 1 minor 5, and the limit half of Lens 1 major 2)

The item is now two sentences, which the style at the top of CHANGELOG.md allows:

> Tortie now prepares a machine whose tmux is 3.6 or 3.6b, which is what Ubuntu 26.04 LTS and Debian 13's backports
> install, without asking you to accept its version first, and keeps a live connection to it, so its sessions show up
> and change in Tortie as they happen rather than on a timer. A machine upgraded in place still reads as its older
> version until the tmux already running there is restarted, one where you had accepted an older version asks you to
> accept once more, and a machine on Ubuntu 22.04 or 24.04, or on Debian 12 or 13 as released, still cannot be
> prepared

Each clause is true at HEAD and was measured by Lens 1:
- **The in-place clause:** cells C3, a 3.5a server under a 3.6b program and a 3.4 server under 3.6, are refused and
  offered the old version's sheet at both builds.
- **The acceptance clause:** a stored 3.5a meeting 3.6 or 3.6b gets the sheet once, and accepting gives the live
  connection.

Tortie ending nothing is ruling 3's "Only say so", and a release note saying so is the "say so".

### 5. What goes to him: the stale acceptance's words (Lens 1 major 2)

The mismatch arm in `prepare.ts` (`:360-385`) is asked BEFORE the gate. It draws `version-unmeasured`'s headline and
`MACHINE_VERSION_ACCEPT_OFFER`. For a machine with a stored acceptance of an older version whose server now reports 3.6
or 3.6b, both sentences are false at HEAD and true at the parent. After one Accept, the outcome at HEAD is better
(live) than at the parent (timer).

**The repair is one clause**, "a measured reported version skips the mismatch arm", which is `version.ts`'s own rule
2. It sits in a file this spec names as NOT to change (§12, "No change to Prepare's mismatch arm … it is its own
entry"). The workflow's hard rule forbids editing a file the spec does not assign.

**Removing the regressing part is removing the phase.** The only thing that makes that scenario reach the false words
is 3.6 and 3.6b being measured, and those two rows are the phase.

The same false headline already exists at the parent for a stale acceptance meeting 3.6a, 3.7b or 3.7c (Lens 1's own
reading, both builds). So the class is today's, and this phase moves two more versions into it.

**His choice:**
- (a) allow the one-clause repair in `prepare.ts`, with a unit test for an accepted 3.5a reporting 3.6 or 3.6b and a
  sibling for 3.6a, 3.7b and 3.7c;
- (b) land as is, with the CHANGELOG's acceptance clause (already written) and a queued entry for the words;
- (c) hold the phase.

This round did (b)'s half that lies inside its files, and nothing else.

### 6. The parent, the patch rule and the race (Lens 2's minors)

**The parent.**
- The parent for `src/` is `261d98b6`.
- `origin/main` is now `ca9cc099`, one docs commit that touches `docs/BACKLOG.md` alone (6 lines, the running log).
- `/private/tmp/wt-p324-parent` is round 1's `git archive` of `5866b527`, not a worktree, so `git worktree add` there
  exits 128. A verifier makes a fresh path, as Lens 2 did with `/private/tmp/wt-p324-parent-va`.

**The patch rule.** §10 V1's "any offset, fuzz or `.rej` failing the build" stands. A `.orig` file is NOT a failure on
macOS, because Apple's `patch` (2.0-12u11-Apple) writes `compat.h.orig` even on a clean apply. A clean apply is judged
by `patch`'s own output (no `offset`, `fuzz`, `FAILED` or `Reversed`) and by the absence of `.rej` files. Research
131 §3.1's ".orig failed the build" is read the same way.

**The first-session race.** It is Phase 326's, and it is a defect of the live connection's path that predates this
phase. Phase 326's entry (`docs/BACKLOG.md:35418`) counts 16 refused first attaches in 35 Phase 320 app runs, at the
parent and at the build under test, on LIVE 3.6a and 3.7b machines.

So after this phase a 3.6 or 3.6b machine has exactly the exposure a 3.6a machine has today. The commit body should
say that in those words. Whether the parent shows it on a live 3.6a row in the same position is the reverifier's app
run to measure: `verifier-app/app-probe.mjs` puts the 3.6a control fifth at both builds.

### Every command this round ran, with exit and numbers

| # | Command | Exit | Reading |
| --- | --- | --- | --- |
| 1 | `node build/conformance-machines.mjs`, after each gate edit | 0 | PASS, condition 100's sentence printed |
| 2 | `ablation:p324` in a clone, 23 arms | 0 | 23 of 23 red on their owner, 3 files back by sha256, 66 s |
| 3 | arms 16 to 23 against the builders' gate, in a clone | 1 | 8 of 8 GREEN, which proves each new clause is what catches them |
| 4 | arm 23 with the wrong `expect`, in a clone | 1 | "wrong sentence" |
| 5 | `ablation:p324` in a clone, 25 arms | 0 | 25 of 25, 5 files back by sha256 |
| 6 | arms 24 and 25 against the builders' gate, in a clone | 1 | 2 of 2 GREEN |
| 7 | `vitest run version.test.ts`, then the same over the A4 parser in a clone | 0, 1 | 55 of 55; then 1 failed, the new test alone |
| 8 | `probe:p324` at HEAD, `P324_KEEP=1`, ablated cell on | 0 | PASS, 44.7 s wall, 454 far strings, 0 refused, 23 far control children, 0 unguarded outside the ablated cell, crash reports 18 to 19 |
| 9 | `probe:p324` at the parent `261d98b6`, ablated cell off | 0 | PASS, 34.8 s |
| 10 | `--compare` HEAD against the parent | 0 | 58 differences, all permitted |
| 11 | `--compare` over three altered copies | 1, 1, 1 | each refused on its own clause |
| 12 | `--judge` of both kept runs, with the final orchestrator | 0, 0 | PASS, PASS |
| 13 | `conformance:machines` over the A1c and A1b clones | 1, 1 | red on 100b's statement clause (and A1c on the body clause too) |
| 14 | `probe:p324` over the A1c and A1b clones, ablated cell off | 1, 1 | 22 problems each; 3 servers ended per run (6 crash reports, 19 to 25) |
| 15 | condition 100 over a trial merge with 320.1's lane (`d8f5c261`, 33 `src/` files, `control-plane.ts` by `git merge-file`, exit 0) | 1 | 0 condition 100 failures, its sentence printed; the one red is the `send-keys` ledger 320.1's own gate edit owns, as the integrator found |
| 16 | `npm run -s typecheck` | 0 | 5.4 s; 0 boundary violations, 0 runtime cycles |
| 17 | `vitest run src/main/tmux src/main/machines src/renderer/settings` | 0 | 129 files passed, 1 skipped; 3,032 tests passed, 7 skipped |
| 18 | `npm run -s conformance:machines` | 0 | PASS, 2.7 s |
| 19 | `gate:checks`, `gate:background`, `gate:knownhosts`, `gate:electron`, `gate:simulator`, `gate:contract`, `contract-inventory --check` | 0 each | 240 check scripts classified; 490 files, 3 long-lived starts, 19 of 19 fixtures; 518 files; 155 reach the helper; baseline byte-equal |
| 20 | `--far-sh-self-test` | 0 | 38 of 38; `/private/tmp/p324-hostile` absent |
| 21 | `npm run -s ablation:p324` IN PLACE | 0 | 25 of 25, 66.5 s; the five files equal their pre-run sha256 |
| 22 | `npm test` | 0 | 1,017 files passed, 1 skipped; 17,520 tests passed, 7 skipped; 41 s |
| 23 | `npm run -s build` | 0 | 28.5 s; every build-time gate green; the contract inventory byte-equal |
| 24 | `tsc --noEmit --strict` over a copy of `drive-p324.mts` | 0 | no error |
| 25 | the 10-line duplicate scan (own script) over `build/p324/*` and the gate | 0 | 2 windows, both pre-existing at `conformance-machines.mjs:3316`/`:3376`; none from this round |
| 26 | leftovers | — | 0 `tmux` on any `-L p324-` socket; 0 `p324-*` socket files; 0 processes of this lane; 7 new `tmux-*.ips` (names only, none read or deleted: 1 from the HEAD ablated cell, 6 from the two mutated-tree runs) |

### What moved, file by file

- `build/conformance-machines.mjs`:
  - 100a gains the constructor pin;
  - 100b gains `statementsOf`, the three-statement body and the one-statement transport;
  - 100e gains the unbounded names, the suffix line and the surface half;
  - the header paragraph and the success sentence are updated.
- `build/p324/ablation.mjs`:
  - `edits` and `expect`;
  - arms 16 to 25;
  - the header's counts.
- `build/p324/drive-p324.mts`: `runDowngrade`, and `symlinkSync` and `renameSync` imported.
- `build/p324/probe-p324.mjs`:
  - `projectDowngrade`;
  - the downgrade block in `--compare`, the matrix and the judge;
  - the header paragraph and the PASS sentence.
- `src/main/tmux/__tests__/version.test.ts`: one case.
- `src/main/machines/control-plane.ts`: job 4's comment only. No code moved.
- `CHANGELOG.md`: the item, as quoted in section 4.
- `CLAUDE.md`, the two rows:
  - `conformance:machines` gains three triggers (the constructor, the two copy constants, the draw line) and the
    proves clause;
  - `probe:p324`'s cost becomes 35 to 45 s, and the row names the downgrade arm.
- `build/p324/SPEC.md`: this section.
- **Not moved:**
  - `version.ts`'s rows (the 3.6a, 3.7b and 3.7c rows are byte-identical to the parent's);
  - `machines-copy.ts`, `AddMachine.tsx` and `prepare.ts`;
  - the pin, `package.json` and `verification-checks.mjs`;
  - the contract baseline;
  - `HELPER_USER_FLOOR` (155; nothing here reaches `build/electron-run.mjs`).

### Where the spec was wrong, found in this round

- **§1.2 item 5's reasoning holds for `start()` and not for the precheck's body.** A `return` inside the precheck
  body makes the precheck resolve without the refusal, so the spawn follows. Dropping "no return" there is what the
  per-transport flag walked through.
- **§12 excludes the one file whose words this phase makes false** (section 5).
- **§6's probe never reconnected a client**, so it could not see a hole that lives only on the reconnect.
- **§4's 100e list read `\bubuntu\b`**, which a package version walks past.

---

## §As built, the ruled round (the fixer, 2026-09-30)

His ruling, in the running log of 2026-09-30: **"Build 326 first, then fix and land 324"**. Phase 326 landed at
`b0ff7ca7`, and the main session moved this worktree onto `d89d1ad1` with it. This round ran ONCE. It launched no
Electron, ran no ssh, read no server of his, and committed, staged and stashed nothing. His four answers of
2026-09-23 still bind: plain subjects with no label, older Linux "Not now", an in-place upgrade "Only say so", and
"No" to asking anyone else.

### What each open problem became

| Severity | Problem | What this round did |
| --- | --- | --- |
| major | Prepare's mismatch arm, `prepare.ts:360-385`, called a measured 3.6b unmeasured beside a list naming it, and offered a sheet accepting it | **Fixed**, his option (a): the arm is asked only of the gate's `unmeasured` answer |
| major | `describeMachine`'s acceptance line and the row's accepted block drew "which Tortie has not measured: 3.6" and "Withdraw this version" after the upgrade | **Fixed**: neither is drawn for a version Tortie has measured, and nothing is dropped |
| major (326's) | the first-attach race on 3.6 and 3.6b | **Not measurable by a fixer.** It needs an Electron. The reverifier's commands are below |
| minor | 100e let a release or a vendor through | **Fixed by widening the list**, with three ablation arms |
| nit | 100a let `this.transport.<x> =` through | **Fixed**, with one ablation arm |
| nit | the probe counted a rotated top-level directory | **Fixed**: the count is by mtime, over `DiagnosticReports` and `Retired/` |

### 1. The words, decided

**Is an acceptance of a version that is now measured hidden or dropped? It is hidden, and it stays in the record.**
The reasons, read from the code:
- **Dropping it would withdraw the confirmation.** `acceptedTmuxVersion` is an appended field of the confirm hash
  (`canonicalMachineText`). Clearing it moves the hash, so the row reads `changed` and is refused until the person
  confirms again.
- **Re-recording a new agreement is not an option either.** It would write an agreement nobody read, which this
  codebase refuses everywhere, from `machines:acceptVersion` to the Phase 101 write root.
- **Rule 2 already decides it.** `decideRemoteVersionGate`'s rule 2 says "a version that later earns a measurement
  stops being carried by a person's acceptance". Neither gate reads an acceptance of a measured version, so drawing
  one claims something false and offers to withdraw something inert.
- **Keeping it in the record keeps a downgrade covered.** A Tortie that has not measured that version, such as the
  parent build, still finds it accepted.

**The predicate is asked of the gate, never copied.** It is `decideRemoteVersionGate(accepted).kind !== 'measured'`.
- `describeMachine` (in `confirm.ts`) and `prepareMachine` (in `prepare.ts`) each call it.
- The renderer may not import main, so it asks `MEASURED_VERSIONS`. That is the drawn copy of main's exec list, and
  `machines-copy.test.ts` already holds it equal in order.

**What the mismatch arm says now** (`prepare.ts`).
- The gate is computed first. The arm fires only when the gate answers `unmeasured` AND the stored acceptance is of
  a version Tortie has not measured. Both are then true:
  - "Tortie has not measured the program this machine runs";
  - "Wait for a Tortie release that has measured …".
- **A stale 3.5a acceptance on a machine now on 3.6, 3.6a, 3.6b, 3.7b or 3.7c** is prepared as any measured machine
  is. It gets no sheet and no honesty line, and the success sentence names the version it reports.
- **A stale 3.5a acceptance on a machine now on 3.4** still gets the mismatch arm, byte for byte as before.
- **An acceptance of 3.6, recorded by an older build, on a machine that now reports 3.5a** gets the plain unmeasured
  refusal and its sheet. That is what any measured machine gets. It does not get a sentence about an acceptance that
  the row no longer draws.

**Two sentences that the fix itself made false, corrected:**
- **`MACHINE_VERSION_ACCEPT_OFFER`'s last sentence**, in `errors.ts`.
  - It said "If the program on it is updated, Tortie asks you again". After the fix, an update to a measured version
    asks nothing.
  - It now reads "If the program on it is updated to another version Tortie has not measured, Tortie asks you again."
  - The pinned refusal `machine.version-accept-mismatch` is a different constant and did not move.
- **`ACCEPTED_VERSION_NONE`**, in `machines-copy.ts`, the sentence above an accept sheet.
  - It said "You have not accepted a version for this machine". That was false on the mismatch arm at both builds,
    and on the downgrade case above.
  - It now reads "You have not accepted this version for this machine." That is true wherever a sheet is drawn,
    because a sheet is only ever drawn for a version that is not the accepted one.

**The CHANGELOG item.** Its clause "one where you had accepted an older version asks you to accept once more" is
false after the fix, and it is removed. The first sentence now says "without asking you to accept its version first,
even where you had accepted an older one". The in-place clause and the "still cannot be prepared" clause stand.

**What is deliberately still drawn: an acceptance of a version Tortie has NOT measured.** For example, a 3.5a
acceptance on a machine that now runs 3.6b.
- The row still shows "Version you accepted: 3.5a", its line and "Withdraw this version".
- Each is true.
- That acceptance is still what admits the machine if 3.5a answers again. An older server left running after an
  upgrade in place reports 3.5a, which is the CHANGELOG's own limit.
- The row's lines are a pure function of its fields and cannot know what the machine runs right now.
- Hiding the block on a transient reading would make the agreement appear and disappear between visits.

**No new label and no explanatory text.** No sentence was added to any surface. One sentence was narrowed to be
true, and one word changed. A measured acceptance is simply not drawn.

**Stated limits:**
- **A row whose other details moved after an acceptance of 3.6 or 3.6b was confirmed.** Under "You confirmed:" it
  still quotes the line the person read then, because that list is the record of what they read. "It now says:" does
  not repeat it.
- **A confirmation given later over such a row** does not name the inert acceptance, while the hash still covers
  it. It decides nothing at this build.
- **`confirm.ts`'s header claim "It has no import that could [spawn]" is no longer true, and the header now says
  so.** The module imports the one pure gate function from `../tmux/version`, and that module also holds this Mac's
  own version read, which runs a program. The alternative was a second copy of the measured list in a file whose
  whole job is that nothing drifts.

### 2. The gate, the attack and the probe

**100e: widened rather than restated narrowly.** His ruling is about what a person reads, and a person learns as much
from "26.04 LTS" or "Canonical" as from "Ubuntu". The CHANGELOG item names "Ubuntu 26.04 LTS" on purpose, so those
words are in the tree and in the next writer's head. Four lines were added:
- a release in a distribution's shape (`\b\d{2}\.\d{2}\b`, `LTS`);
- the vendors (RHEL, CentOS, openSUSE, SUSE, NixOS, Red Hat, Canonical, Alpine, Rocky, Alma, Amazon, Gentoo, Manjaro,
  Raspbian, Pop!_OS);
- the remaining code names (bullseye, buster, focal, oracular, plucky, questing, sid, sles);
- the verb `ships` (and `ship`, `shipped`). `shipping` is not banned, because both notes use it of Tortie's own
  client.

The list was proved two ways:
- **It catches the labels.** All four of the reverifier's labels are caught, and so are six more shapes.
- **It raises no false alarm.** No control string trips it: today's five rows, the table's text, the two drawn copies,
  `the shipping client`, the sha256s and the dates.

**100a.** The old clause forbade only assigning `this.transport`. It now also forbids each of these in
`control-client.ts`:
- a write through any member chain of `this.transport`, plain or compound;
- `++` or `--` on such a member;
- a `delete` of one;
- `Object` or `Reflect` `assign`, `defineProperty`, `defineProperties`, `set`, `setPrototypeOf` or `deleteProperty`
  on it.

**`ablation:p324`: arms 26 to 29, each with an `expect` sentence.**

| # | Owner | The break | At the gate the fix round left | Now |
| --- | --- | --- | --- | --- |
| 26 | 100a | `this.transport.precheck = () => Promise.resolve();` in `start()` before its `try` | GREEN | red, `assigns this.transport or one of its members` |
| 27 | 100e | `// the 26.04 LTS build` as a comment in the table | GREEN | red, `says "26.04"` |
| 28 | 100e | the 3.6b subject says `the copy RHEL 10 carries` | GREEN | red, `says "RHEL"` |
| 29 | 100e | the 3.6b note says `as a distribution ships it`, naming none | GREEN | red, `says "ships"` |

The "GREEN" column was measured. The previous gate went into a clone, and the 29-arm attack exited 1 with exactly
these four arms green.

**The probe's crash reports** (`drive-p324.mts` `tmuxIpsSince`, `probe-p324.mjs`).
- **What it counts.** Reports named `tmux-*.ips` whose mtime is at or after the run's own start, in `DiagnosticReports`
  and in `Retired/`.
- **Why a window.** A move into `Retired/` keeps the mtime, so a report is still counted after macOS retires it.
- **Names and mtimes only.** No report is opened, read or deleted.
- **The ablated cell** records the reports written since the cell's own start.
- **The evidence.** The top level now holds 26 tmux reports, at the rotation ceiling the nit described, and
  `Retired/` holds 22. So the old before-and-after count of the top level could have read 26 and 26 across a run that
  wrote one.

### 3. Phase 326 underneath

**What moved since the previous parent, `261d98b6`.** Twenty-two commits. In the files this phase reads, only two
moved:
- **`build/scan-source.mjs`.** 326 exported `statementEnd`, and `statementFrom` now goes through one `statementStop`.
  Condition 100 calls `functionBodyOf`, which reaches `statementFrom`.
- **`src/main/machines/remote-sessions.ts`.** The driver imports its list format and parser.

**How each was reconciled:**
- **Condition 100 needed no change.** It is green, and the attack is 29 of 29 on its owners.
- **`statementsOf` was not rewritten onto `statementEnd`.** It splits a whole block into canonical statements rather
  than finding one statement's end. The 10-line duplicate scan finds no shared window between it and `statementStop`.
- **The scan does find 3 shared windows** between `braceDepth` (gate `:10160`) and `closeOf` (`scan-source.mjs:224`),
  the quote-skipping skeleton. Both predate this round.
- **The probe's matrix did not move.** `probe:p324` at HEAD and at the new parent `d89d1ad1` both PASS. `--compare`
  finds **58** differences, the same count the fix round measured against `261d98b6`, and every one is permitted.
- **The previous fix round's evidence still holds** on the new base: the far-sh self-test and the 324 tests.

`origin/main` is now `fe2c1923`, one more docs commit, which adds 2 lines to `docs/BACKLOG.md` and nothing else.

**The first-attach race is the reverifier's to prove**, under THE LOCK and on this tree, built:
```
P326_FAR_TMUX=/private/tmp/wt-p324/build/vendor/tmux-probe/3.6/bin/tmux  P326_ARMS=A,B npm run -s probe:p326
P326_FAR_TMUX=/private/tmp/wt-p324/build/vendor/tmux-probe/3.6b/bin/tmux P326_ARMS=A,B npm run -s probe:p326
```
Those two runs plus the reverify's own four first creates per machine are the proof. A 3.6 or 3.6b machine is now
prepared and live through this phase, so it reaches the attach path 326 fixed.

### Every command, with exit and numbers

| # | Command | Exit | Reading |
| --- | --- | --- | --- |
| 1 | `vitest run` the new `p324-stale-acceptance.test.ts` and `prepare.test.ts` | 0 | 37 of 37 |
| 2 | the same new tests and `machines-section.test.tsx`, in a clone with `prepare.ts`, `confirm.ts` and `MachineRow.tsx` at `d89d1ad1` | 1 | 13 failed, every one on the clause it owns: 8 in the new file (the five stale-acceptance cases, the list-wide case, the measured acceptance meeting 3.5a, and the hidden line) and the 5 measured-version cases in the section file. The unchanged arms (3.5a meeting 3.4, an accepted 3.5a, no acceptance), 3.6 accepted and reported, and every unmeasured line and block passed at both |
| 3 | `vitest run` renderer settings, `confirm`, `errors`, `ipc` | 0 | 5 files, 277 tests |
| 4 | `node build/conformance-machines.mjs`, after the product fix and again after each gate edit | 0, 0 | PASS, about 3 s |
| 5 | the widened list over the reverifier's four labels, six more and seven controls (own script) | 0 | 10 of 10 caught, 0 of 7 controls hit |
| 6 | `ablation:p324` in a clone of this tree | 0 | 29 of 29 red on their owner, 5 files back by sha256, 81.6 s |
| 7 | `ablation:p324` in a clone with the fix round's gate | 1 | arms 1 to 25 red, arms 26 to 29 GREEN, 4 findings |
| 8 | `npm run -s typecheck` | 0 | 0 boundary violations, 0 runtime cycles, about 8 s |
| 9 | `tsc --noEmit --strict` over a copy of `drive-p324.mts`, as an ES module | 0 | no error |
| 10 | `probe:p324 --far-sh-self-test` | 0 | 38 of 38; `/private/tmp/p324-hostile` absent |
| 11 | `probe:p324` at HEAD, `P324_KEEP=1`, ablated cell on | 0 | PASS, 44.8 s; 454 far strings, 0 refused, 23 far control children, 0 unguarded outside the ablated cell; both downgrade cells: 2 reads, 0 children, server alive with its pid; crash reports written during the run: 1, `tmux-2026-09-30-234348.ips` |
| 12 | the same window re-derived by `stat` over both directories (own shell loop, names only) | 0 | 1 new report, the same name |
| 13 | `probe:p324` at the parent `d89d1ad1` (`git archive` and `cp -Rc node_modules`), ablated cell off | 0 | PASS, 39.4 s; 0 crash reports |
| 14 | `--compare` HEAD against the parent | 0 | 58 differences, all permitted |
| 15 | `vitest run src/main/tmux src/main/machines src/renderer/settings src/main/sessions` | 0 | 167 files passed and 1 skipped; 3,702 tests passed and 7 skipped; 8.9 s |
| 16 | `conformance:farattach`, `conformance:remoteclose` | 0, 0 | 11 rules in 57 ms; 11 tests |
| 17 | `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:simulator` | 0 each | baseline byte-equal; 246 check scripts classified; 158 reach the helper against a floor of 158; 505 files and 4 long-lived starts, 19 of 19 fixtures; 533 files; 2 against a floor of 2 |
| 18 | `npm run -s ablation:p324`, IN PLACE | 0 | 29 of 29, 80.3 s; the five files equal their pre-run sha256 |
| 19 | `npm run -s build` | 0 | 31.4 s; every build-time gate green; the contract inventory byte-equal |
| 20 | `npm test` | 1 | 1,027 files passed and 1 skipped; 17,970 tests passed and 7 skipped; ONE failure, `src/main/symbols/__tests__/store.test.ts`'s 100k-symbol timing budget (153.8 ms against 130.3), in a domain this phase does not touch; alone it passes 15 of 15 |
| 21 | the 10-line duplicate scan (own script) over the new test, the ablation, the gate and the probe | 0 | 0 windows from this round |
| 22 | leftovers | — | 0 `tmux` on any `-L p324-` socket; 0 `p324-*` socket files; no Electron started by this round |

### What moved, file by file

- **`src/main/machines/prepare.ts`**:
  - the gate is computed before the mismatch arm;
  - the arm is asked only of `unmeasured`, and only for an acceptance the gate has not measured;
  - step 4 of the header says so.
- **`src/main/machines/confirm.ts`**:
  - `describeMachine` draws the acceptance line only while the gate has not measured that version;
  - it imports `decideRemoteVersionGate`, and the header says what that costs.
- **`src/main/machines/errors.ts`**: `MACHINE_VERSION_ACCEPT_OFFER`'s last sentence.
- **`src/renderer/settings/MachineRow.tsx`**: `acceptanceStands`, and the accepted block drawn only when it is true.
- **`src/renderer/settings/machines-copy.ts`**: `ACCEPTED_VERSION_NONE`, "a version" becomes "this version".
- **Tests:**
  - `src/main/machines/__tests__/p324-stale-acceptance.test.ts` (new, 15 tests, driving `prepareMachine` itself);
  - `prepare.test.ts` (one order test re-pointed);
  - `machines-section.test.tsx` (6 tests).
- **`CHANGELOG.md`**: the item's false clause.
- **`build/conformance-machines.mjs`**: 100a's write clause, 100e's four new lines, and the header and failure
  sentences.
- **`build/p324/ablation.mjs`**: arms 26 to 29, and the header's counts.
- **`build/p324/drive-p324.mts`** and **`build/p324/probe-p324.mjs`**: `tmuxIpsSince`, the cell's window and the
  printed line.
- **`CLAUDE.md`**: the `conformance:machines` row's proves clause, and the `probe:p324` row's crash-report clause.
- **Not moved:**
  - `version.ts` (no row and no gate logic);
  - `control-client.ts` and `control-plane.ts`;
  - the pin, `package.json` and `verification-checks.mjs`;
  - the contract baseline;
  - `HELPER_USER_FLOOR` (158).

### What this round could not do, and why

- **The live proof of the race on 3.6 and 3.6b** (`probe:p326` arms A and B, and the reverify's 4 first creates per
  machine). It needs an Electron, and a fixer launches none.
- **The in-app side-by-side of the stale-acceptance rows at the parent and at HEAD.** It is an app run, and it is the
  reverifier's.
- **smoke, smoke:t1, smoke:t3 and `npm run package`.** These are the verifier's or the committer's, as before.
