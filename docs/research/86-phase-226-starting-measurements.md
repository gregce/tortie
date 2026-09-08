# 86. The write channel, starting measurements (Phase 226, measure step)

Read from the tree at `54a5e96` on 2026-09-07, in the worktree `/private/tmp/wt-p226`. Nothing was
built. Every line number below was read from the file it names, not remembered. The three gate
runs are in `.p226/`, and the temp-name measurement ran in a scratch repository under the session
scratchpad, never in the operator's checkout, which was opened read only for one `check-ignore`.

The charter is the Phase 226 entry in `docs/BACKLOG.md` (line 23002 onward) and research 83
sections E.5, E.7, E.7a, E.7b, A4.2 ruling 3 and C.2. This document exists so the builder does not
re-derive any of the seven things below and so the verifier can attack a written claim rather than
a remembered one.

---

## 1. The three source patterns, line by line

### 1.1 `src/main/credentials/nofollow.ts`, the no-follow pair (137 lines)

Header lines 1 to 46 carry the defect it exists for: a `writeFile` inside a guarded directory
followed a link planted at `<login dir>/auth.json.tortie-pending`, so the write went through the
link, the read-back read through the SAME link and passed, and the commit renamed the link onto
the store. Line 45: **nothing here logs, and no refusal names the bytes it was handed.**

`writeNoFollowSync(path, text, mode = 0o600)`, lines 70 to 94:

| line | what it does |
| --- | --- |
| 75 to 80 | `try { unlinkSync(path) } catch {}`. Removes whatever is at the STAGED name. `unlink` acts on a link and never on its target, so a planted link is removed rather than followed. A missing entry or one this process may not remove both fall through to the create, which is what decides. |
| 81 to 85 | `openSync(path, O_WRONLY \| O_CREAT \| O_EXCL, mode)`. Exclusive create. A symbolic link counts as existing even when its target does not, so a link re-planted between the unlink and the open makes this THROW rather than follow. |
| 86 to 93 | `fchmodSync(fd, mode)` on the DESCRIPTOR so the umask cannot widen it and no second path is resolved; `writeSync(fd, text, null, 'utf8')`; `closeSync(fd)` in a `finally`. |

Returns `void`. Fails by THROWING: `EEXIST` from `openSync` when anything, link included, is at
the staged name after the unlink; any errno from `writeSync`. It is documented (lines 64 to 68) as
being used only for a staged place the domain composes and renames away, which is why removing
whatever is there is right.

`renameNoFollowSync(from, to)`, lines 102 to 107: `if (lstatSync(from).isSymbolicLink()) throw
new Error('the staged place is not a file Tortie wrote')`, then `renameSync(from, to)`. `lstat`
reports on the link and never on what it points at. Returns `void`; fails by throwing, either its
own sentence or the `lstat`/`rename` errno. Note what it does NOT ask: it never `lstat`s `to`. A
link at the TARGET is not refused here, because `rename(2)` replaces the directory entry at `to`
whatever it is, so a link at the target is simply replaced by the file. The charter's "a planted
symlink at the target that must be refused by `lstat`" is therefore a NEW clause the channel adds,
not one this file already carries; see section 1.4.

`readTextNoFollowSync(path)`, lines 123 to 137: `openSync(path, O_RDONLY | (O_NOFOLLOW ?? 0))`,
answers `null` on any failure to open or read, closes in a `finally`. Returns `string | null`,
never throws. `O_NOFOLLOW` refuses only the FINAL component when it is a link.

### 1.2 `src/main/settings/store.ts:657`, the atomic replace

```
657  function writeFile(file: SettingsFile): void {
658    try {
659      const path = settingsPath();                       // <userData>/settings.json
660      mkdirSync(dirname(path), { recursive: true });
661      const tmp = `${path}.tmp`;                          // a FIXED name beside the target
662      writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
663      renameSync(tmp, path); // atomic on the same volume
664    } catch (err) {
665      settingsLog.warn(`could not persist settings: ${(err as Error).message}`);
666    }
669  }
```

Returns `void` and NEVER throws: every failure is swallowed into one warn line (lines 664 to 668)
because "a failed preference write must not break the app; the in-memory value stays live". Three
things a channel lifting it must NOT copy: the fixed `${path}.tmp` name (two writers racing share
one temp file, and `writeFileSync` follows a link planted at it); the swallow (a write to the
person's file must answer a word, not warn); and the location, which is under `userData` where
no `git status` ever looks. What it DOES carry over is the shape: temp beside the target, then
`rename`, so a reader sees the old file or the new one and never a partial one.

### 1.3 `src/main/machines/remote-file.ts:255`, `putFileOnMachine`, the word-shaped answer

Lines 218 to 254 state the order as the design; lines 255 to 351 are the function.

| step | lines | what happens | answer if it stops here |
| --- | --- | --- | --- |
| 1 to 3 | 263 to 265 | `confirmedWriteRoot(machineId)`: row present, confirm gate, confirmed folder | `refused('writesOff', null)` |
| 4 | 268 to 271 | `Buffer.from(contents, 'utf8')`, compared to `REMOTE_FILE_MAX_BYTES` BEFORE anything is encoded or sent | `refused('tooLarge', writeRoot, bytes)` |
| 5 | 274 to 275 | `relativeUnderRoot(writeRoot, path)`, main's own containment | `refused('outsideRoot', writeRoot)` |
| 6 | 278 | `readyRemoteContext` | throws (a connection failure is not one of the words) |
| 7 | 282 to 313 | `runRemoteWrite(ctx, 'file-put', [writeRoot, rel, expect, base64])`. `expect` is the sha256 the caller read, or `REMOTE_FILE_PUT_NEW` | a THROW with a sentence saying the file MAY have been saved, because leg 14 of probe p101 measured the far side finishing after the link dropped |
| 8 | 320 to 350 | `parseFilePutAnswer`; unknown word throws "cannot tell you whether it was saved"; `wrote` answers `wrote` with the far side's sha and bytes; `stale` whose reported sha EQUALS the sha of what was sent answers `wrote` (the write landed and only the answer was lost, so a save is safe to run twice); any other word is `refused(said.word, writeRoot)` | |

`refused()` at lines 210 to 216 is `{ outcome, sha256: null, bytes, writeRoot }`. The result type
is `MachineFilePutResult` at `src/shared/ipc/machines/filesystem.ts:410`, with
`MachineFilePutOutcome` at line 398 being the nine words `wrote | stale | missing | exists |
nomode | nosum | writesOff | outsideRoot | tooLarge`. The far side computes the stale check; the
local path has no equivalent, which is the whole reason for Phase 226.

**The shape to copy is:** every refusal is decided before a byte moves, in a stated order, and
each is a WORD with `sha256: null`; the only throws are for outcomes that are genuinely unknowable.
For a local write nothing is unknowable, so the charter's "never throws to the renderer for any of
the four" is achievable and the local channel should have no throw path for the four refusals at
all. The one thing to add that the remote answer lacks is a `reason` beside `refused`, which the
charter names.

### 1.4 Two protections the charter names that NONE of the three patterns carries as written

- **A link at the TARGET.** `renameNoFollowSync` asks `lstat` of `from` only (1.1). The charter's
  matrix row "a planted symlink at the target that must be refused by `lstat`" needs a fourth
  `lstat`, of the target, before the rename. The reason it matters here and not in the credentials
  domain: there the target is a store Tortie composes; here the target is the person's file, and
  `rename`-over would turn a link the person deliberately keeps (a file shared into a repository by
  link) into a plain file, silently, with the linked-to original untouched. Refusing is the
  truthful answer and it is one `lstat`.
- **The stale-temp sweep.** Neither `store.ts` nor `nofollow.ts` cleans a leftover; `nofollow.ts`
  unlinks its OWN name before every write, which is a sweep of exactly one name and is enough when
  the name is deterministic per target. `src/main/durable/write.ts:344` removes the staged file on
  a failed attempt and leaves crash residue to a prune pass. The charter says "cleaned on the next
  write", which a deterministic name gets for free from the unlink at 1.1 line 76. See section 7.

### 1.5 A fourth pattern the guardrail says to grep for first, and why it is not the one

`src/main/durable/write.ts` (`writeDurable`, `writeDurableBatch`, `sha256Of` at line 137) is the
tree's other stage-then-rename writer. It stages at
`.<basename>.<Date.now() base36>-<4 random bytes hex>.part` (line 262), opens with `'wx'` (line
268), verifies size and hash of the staged copy before the rename (lines 297 to 332), renames (line
336), and flushes the DIRECTORY once per batch. It is the right tool for a snapshot that cannot
be lost and the wrong one here: it follows a link at the target through `rename` the same way, it
has no digest precondition on the EXISTING file, its random name defeats the "cleaned on the next
write" rule (every crash leaves a differently named file), and its directory flush is a cost a
per-keypress rewind does not need. `sha256Of(Buffer)` is worth reusing verbatim rather than a
twentieth `createHash('sha256')`; nineteen files under `src/main` already spell that call.

---

## 2. Every renderer-reachable write under `src/main/fs`, and whether it asks `root()` first

`src/main/fs/ipc.ts` registers fifteen invoke channels through `handle(ipc, ...)` (lines 183 to
285) and `src/main/fs/image-ipc.ts:21` registers one more. `registerFsIpc` is called once, at
`src/main/capabilities.ts:179`, with no deps, so production uses `defaultFileOpsDeps()` (ipc.ts
lines 102 to 110), whose `listProjectRoots` reads `getGmuxCore().listProjects()`.

| channel | handler | touches the disk how | asks `root()` first |
| --- | --- | --- | --- |
| `fs:readDir` | ipc.ts:183 | `readdir` | no (read) |
| `fs:reveal` | ipc.ts:205 | `shell.showItemInFolder` | no (no write) |
| `fs:readFile` | ipc.ts:212 | `readTextCapped`: open, stat, read up to `READ_CAP_BYTES` | no (read) |
| **`fs:writeFile`** | **ipc.ts:229** | **`await writeFile(abs, contents, 'utf8')` at line 238** | **NO. `resolvePath(path)` at line 236 and nothing else.** |
| `fs:createFile` | ipc.ts:253 to file-ops.ts:152 | `mkdir -p` parent, `open(abs, 'wx')` | yes, line 156 |
| `fs:createFolder` | ipc.ts:254 to file-ops.ts:152 | `mkdir` | yes, line 156 |
| `fs:rename` | ipc.ts:255 to file-ops.ts:183 | `rename` | yes, line 184 |
| `fs:duplicate` | ipc.ts:256 to file-ops.ts:229 | `cp` with `force: false, errorOnExist: true` | yes, line 230 |
| `fs:move` | ipc.ts:257 to file-ops.ts:283 | `trashItem` then `rename` | yes, line 284 |
| `fs:trash` | ipc.ts:258 to file-ops.ts:516 | `trashItem` (the ONLY deletion) | yes, line 517 |
| `fs:importPaths` | ipc.ts:265 to file-ops.ts:394 | `trashItem` then `cp` | yes, line 395 (destination); source is deliberately outside |
| `fs:startDrag` | ipc.ts:273 to drag-out.ts | `lstat` only, then `webContents.startDrag` | reads roots, writes nothing |
| `fs:openWithApps` | ipc.ts:283 | reads the LaunchServices list | no write |
| `fs:openWith` | ipc.ts:284 | spawns `/usr/bin/open`; `appendFile` at open-with.ts:589 ONLY under `GMUX_OPEN_WITH_RECORD` (a harness knob, not a renderer input) | no write of a renderer-named path |
| `fs:readImage` | image-ipc.ts:21 | `realpath`, `stat`, read | no (read) |

**Confirmed: `fs:writeFile` calls none of `resolveOpenProjectRoot`, `resolveInsideRoot` or
`root()`.** It follows a symlink (`writeFile` opens with `O_TRUNC`, no `O_NOFOLLOW`), checks no
size, no mtime, no digest. `src/main/harness/quit-doors.ts` drives it as one of the four mutation
doors the quit refusal is measured on, which is the only reason its handler must keep its exact
shape: research 83 A4.2 ruling 3 and the charter both say do not touch it, and this document adds
that the quit-doors harness (`quit-doors.ts:30, 153, 242, 277`) would also have to change if it
did.

`root()` itself is `file-ops.ts:148 to 150`, a one-line wrapper over `resolveOpenProjectRoot`
(`paths.ts:121 to 140`), which `realpath`s the caller's root AND every open project root and
accepts only an exact real-path match, throwing `PROJECT_NOT_FOUND` otherwise. Two things follow
for the new channel. First, `root()` takes a ROOT, not a file path: every file verb sends `{root,
path}` and proves the path with `resolveInsideRoot(realRoot, path)` (`paths.ts:150`), which
refuses `..`, an absolute path outside, an escape through a directory link, and `.git` at any
depth. The charter's "a path outside every open project root (refused, via `root()`)" is
therefore two calls in the existing idiom, `root(input.root)` then `resolveInsideRoot`, OR one
loop over `listProjectRoots()` finding the root the path sits under. The idiom is the former and
every other verb uses it; the builder should take the caller's `root` as an argument the way
every `Fs*Input` does. Second, `root()` THROWS `PROJECT_NOT_FOUND`; the channel must catch that
and answer `refused` with the reason, since the charter says a word and never a throw.

`resolveInsideRoot` at `paths.ts:158` refuses a NUL in the path; the channel inherits that.

---

## 3. What a new invoke channel touches

Read from `ipc-invoke-closure.test.ts`, `contract-inventory.mjs`, `files.ts`, `index.ts` and the
preload. **A channel that "ships unwired" still has to be wired in three places, and only the
fourth, the renderer, is left empty.** `src/shared/__tests__/ipc-invoke-closure.test.ts` asserts
on every `npm test` that the DECLARED set (every `'x:y':` key on every interface the
`GmuxInvokeChannelMap` intersection reaches), the PRELOAD set (every `invoke('x:y'` under
`src/preload/`) and the MAIN set (every `handle([ipc, ]'x:y'` under `src/main/`) are equal, each
name once in preload and once in main, with a floor of 100. A channel declared and not in the
preload fails the hermetic test lane. So:

| # | file | edit |
| --- | --- | --- |
| 1 | `src/shared/ipc/files.ts` | one new `export interface <Name>InvokeChannelMap { 'fs:<name>': { req: [input: ...]; res: ... } }` in a new APPENDED block at the end (the file is seven such blocks, lines 7, 58, 134, 170, 256, 371), plus one `Gmux<Name>Extras` interface with the one method. The request and result SHAPES go in `src/shared/fs-ops.ts` beside `FsCreateInput` and friends, the way Phase 12.9 did, so `files.ts` stays append-only. |
| 2 | `src/shared/ipc/index.ts` | ONE line in `GmuxInvokeChannelMap` (lines 243 to 275, "a future stream adds ONE line here"), ONE line in `InstalledFsApi` (lines 388 to 394), and the two type imports at lines 73 to 86. The invoke-closure test's second assertion fails a map declared and not joined. |
| 3 | `src/preload/files.ts` | one method on the `fs` object (lines 18 to 41), `x: (input) => invoke('fs:<name>', input)`. `InstalledFsApi` is the object's annotation, so `npm run typecheck` fails on this file if the method is missing, which is the Phase 122 proof. |
| 4 | `src/main/fs/ipc.ts` | one `handle(ipc, 'fs:<name>', (_e, input) => guarded.write(input))` beside line 258, thin, with the logic in its own module so the gate can load it under node (section 4). |
| 5 | `src/main/fs/<new module>.ts` | the channel's logic, with `listProjectRoots` INJECTED the way `FileOpsDeps` injects it (file-ops.ts:63 to 72), because the production reader imports `../sessions` lazily and that drags the tmux core in. |
| 6 | `docs/audits/contract-baseline.txt` | regenerated. |
| 7 | `src/renderer/env.d.ts` | nothing: `Window.gmux` is `InstalledGmuxApi` and picks the member up through `InstalledFsApi`. |

**The contract inventory picks it up from the TYPE, not the file.** `collectInvokeChannels()`
(`contract-inventory.mjs:128 to 190`) runs the TypeScript checker over `src/shared/ipc/index.ts`,
finds the `GmuxInvokeChannelMap` alias, and lists `getPropertiesOfType`. The names are sorted and
de-duplicated, and section 1 of the baseline is emitted with a header `[ipc.invoke.channels]
count=N` (line 402).

**So the baseline diff is TWO lines, not one, and the charter's "exactly one line moved" should
be read as one new channel line.** Measured on the last channel that landed, `2f96be2`
(`usage:statusLine`): the diff to `contract-baseline.txt` was `-count=221`, `+count=222`,
`+usage:statusLine`. Phase 226's commit body should say "one channel line added,
`fs:<name>`, and the count line moved from 222 to 223", which is what the gate will print and
what the charter means. Today the baseline holds 222 channels and `npm run gate:contract` is
green at the parent (`.p226/out-gate-contract.txt`).

**Two things that must NOT move the baseline.** Section 4 of the inventory sweeps `src/`, `build/`
and `package.json` for `GMUX_[A-Z0-9_]+` (line 307). The gate's module-swap knob must therefore
NOT be `GMUX_`-prefixed; the credentials gate's `P204_MODULES` is the precedent and it is absent
from the baseline (0 matches). Use `P226_MODULES`. And no new `gmux.*` string literal, no new
`GMUX_SMOKE` mode.

---

## 4. The gate shape, read from `build/verification-checks.mjs` and `build/conformance-credentials.mjs`

### 4.1 Registration

`build/verification-checks.mjs` is a table `CHECKS` of `pure(name)`, `adapter(...)`,
`electron(...)`, `tmux(...)`, `remote(...)` entries (constructors at lines 75 to 105). The static
conformance gates are lines 121 to 159; `conformance:redline` is `pure('conformance:redline')`
at line 130 and `conformance:credentials` at line 143 with a five-line comment above it. The new
entry is `pure('conformance:redline-write')` with a comment in that shape, placed after line 130.
`build/assert-hermetic-checks.mjs` fails the build if `package.json` names a check script this
table does not classify, or the reverse, so the `package.json` script line
(`"conformance:redline-write": "node build/conformance-redline-write.mjs"`, beside line 143) and
the table entry land in the same commit. Both existing gates also assert their own naming as a
rule (`conformance-redline.mjs:512 to 520` rule 10; `conformance-credentials.mjs:2426 to 2440`
rule 11, which additionally asks CLAUDE.md to name the gate). Copy rule 11: package.json,
verification-checks.mjs and CLAUDE.md.

### 4.2 The ablation shape, end to end, from the credentials gate

1. **The gate is a `.mjs` that spawns a `.mts` probe** through the pinned tsx:
   `spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json',
   'build/<probe>.mts'], { encoding, cwd: repoRoot, maxBuffer: 32 MB, env })`
   (`conformance-credentials.mjs:630 to 653`). `tsxCli()` from `build/ts-runner.mjs` resolves
   `tsx/cli` from `node_modules` and refuses with a sentence otherwise; never `npx`. The probe
   prints ONE JSON line last and the gate parses `stdout.trim().split('\n').pop()`. A non-zero
   exit or unparseable output is `{ error }`, and an `error` verdict is a FINDING, never a red
   ablation (lines 2356 to 2364: "a probe that cannot run is not an ablation that went red").
2. **The probe imports the SHIPPING modules by path from an env knob**
   (`credentials-conformance-probe.mts:38 to 60`): `const MODULES = process.env['P204_MODULES']
   ?? 'src/main/credentials'`, then `await import(pathToFileURL(resolve(MODULES, 'keep.ts')).href)
   as typeof import('../src/main/credentials/keep')`. Same probe, two directories.
3. **The probe makes its own scratch directory** (`mkdtempSync` under `tmpdir()`), writes every
   fixture into it, drives the modules, and `rmSync(..., { recursive: true, force: true })` in a
   `finally`. Nothing under the person's home is opened.
4. **The verdict is a list of JSON-stringified readings**, one per named part (`VERDICT_PARTS`,
   lines 663 to 696; `verdict()` 698 to 738). The live run's verdict is computed once.
5. **Each ablation is `{ name, edits: [{ file, from, to }] }`** (lines 1531 onward; the nofollow
   pair is lines 1715 to 1744). `from` is an exact substring of the shipping file; `to` is the
   clause removed, usually `if (false)` or a flag swapped (`O_EXCL` to `O_TRUNC`). Some ablations
   carry two edits on purpose because the domain guards a path twice and one edit alone changes
   nothing a reading can see (lines 1716 to 1719 say so for nofollow).
6. **The copy is a SIBLING directory of the domain under `src/main/`, dot-prefixed**:
   `src/main/.p204-ablation-<pid base36>-<i>/`, every `.ts` of the domain `cpSync`'d in, the edit
   applied with `before.replace(from, to)` after asserting `before.includes(from)` (lines 2299 to
   2351). The depth is exact because the domain's relative imports (`../logins/dirs`) must still
   resolve from the copy (lines 2281 to 2297: two earlier versions copied to the wrong depth and
   "reported twelve of twelve red while proving nothing"). The dot prefix keeps it out of
   `tsconfig.main.json`'s `src/main/**/*.ts` include and out of vitest's globs.
7. **The probe is re-run with the knob pointing at the copy; the verdict must DIFFER** from the
   live one in at least one part, and the gate records WHICH part moved
   (`VERDICT_PARTS.filter((_, at) => got[at] !== was[at])`, line 2365). No movement is a finding:
   "changed nothing this gate checks, so that rule cannot fail". A missing `from` is a finding:
   "found nothing to edit".
8. **The copies are swept in a `finally`** (`sweepAblations()`, lines 2302 to 2308 and 2418 to
   2420), by prefix, whatever happened.
9. **Scanners are proved on fixtures the gate writes itself** (header lines 202 to 205; the
   redline gate does the same at 940 to 998, twelve fixtures, in a `mkdtemp` removed in a
   `finally`).

For Phase 226 the domain is the ONE new module under `src/main/fs/`, and its copy at
`src/main/.p226-ablation-<pid>-<i>/<module>.ts` must import `../fs/paths` and `../errors`
(both node-only: `paths.ts` imports `node:fs/promises`, `node:path`, `@shared/fs-ops` and
`../errors`; `errors.ts` imports only a type from `@shared/types`), so the copy resolves them by
the same `../` the shipping file uses. `@shared/*` resolves through `tsconfig.node.json`'s
`paths`, which is how the credentials probe already reaches `../src/shared/logins`.

**The channel's logic therefore cannot live inside `registerFsIpc` in `ipc.ts`.** That file
imports `electron` at line 23 and the probe runs under node. It has to be a module with injected
deps (the `FileOpsDeps` shape at `file-ops.ts:63`), and `ipc.ts` gets the one thin `handle` line.
That also puts `READ_CAP_BYTES` in the way: it is a module-private `const` at `ipc.ts:57`. Either
it is exported from `ipc.ts` and imported by the new module (which drags `electron` into the
probe), or it moves to a place both can import, `src/main/fs/paths.ts` or `src/shared/fs-ops.ts`,
with `ipc.ts` importing it back so the number stays ONE. The second is the guardrail's answer
("tmux binary resolution lives in exactly one module"; the same rule for a cap). The verifier's
re-derivation should read the cap from wherever it lands and assert `ipc.ts` no longer declares
its own.

### 4.3 The matrix the charter names, mapped to what each arm needs from the scratch directory

| arm | fixture | expected word | the clause whose ablation must go red |
| --- | --- | --- | --- |
| outside every root | a file in a second scratch dir not in `listProjectRoots()` | `refused` | the `root()` call |
| one byte over the cap | a file of `READ_CAP_BYTES + 1` bytes | `refused` | the `size > cap` compare (the probe must WRITE 5 MB + 1 to scratch; ~1 s) |
| digest one byte stale | sha256 of `contents + 'x'` | `stale` | the digest compare |
| latin-1 to U+FFFD | the E.7b 87-byte fixture, `\xe9` inside | `refused` | the `Buffer.from(decoded, 'utf8').equals(raw)` comparison |
| link at the temp name | `symlinkSync(victim, tempName)` then write | `wrote`, victim untouched, temp name is a regular file or gone | the `unlink` + `O_EXCL` pair (two edits, as at credentials 1720) |
| link at the target | `symlinkSync(victim, target)` | `refused`, victim untouched, link still a link | the target `lstat` |
| kill between temp and rename | inject a `fs` seam whose `rename` throws, or a `beforeRename` hook | old bytes intact, temp swept on the next write | the rename-after-write order |
| ordinary | plain file, correct digest | `wrote`, new bytes, no temp left, `sha256` of the new bytes in the answer | (the control arm) |

A "kill" under node is an injected throw, not a signal; the credentials probe's `interrupted` arm
(VERDICT part 4) does exactly that with a seam that stops after each step. The charter's wording
"a kill between the temp write and the rename" is satisfied by a seam that throws at that point,
and the honest sentence in the gate is "a write stopped after the temp is written and before the
rename", because that is what is driven.

---

## 5. `functionBodyOf` and `closeOf` in `build/scan-source.mjs`, for the verifier

`closeOf(code, open)` (lines 216 to 243): given the index of one of `(`, `[`, `{`, returns the
index of its matching closer or `-1`. It tracks quotes (`'`, `"`, `` ` ``) with backslash escapes
so a bracket inside a string is not counted. It does NOT strip comments; callers hand it stripped
text.

`functionBodyOf(code, name)` (lines 458 to 468): finds `\b(?:async\s+)?function\s*\*?\s*<name>\s*\(`,
skips the parameter list through `closeOf` (so a destructured or defaulted parameter cannot be
mistaken for the body), takes the first `{` after it, and returns `{` + `blockAt` + `}` or `null`.
It matches a FUNCTION DECLARATION only: a `const x = async (...) => {}` or an object method
(`async write(input) {`) returns `null`. Two consequences for Phase 226:

- The re-derivation "this is the only renderer-reachable write besides `fs:writeFile` and it asks
  `root()` first, read by matching braces through `functionBodyOf`" needs the channel's entry
  point to be a NAMED FUNCTION DECLARATION, `export async function <verb>(...)`, not a method on
  a returned object the way `createFileOps` returns its verbs (`file-ops.ts:178 to 550`, every
  verb is a method and `functionBodyOf` cannot read one). The builder should write it as a
  declaration, or the verifier's scan is blind by construction and would have to fall back to
  `namedFunctions` (lines 402 to 434), which reads a `const` arrow but still not a method.
- The verifier should hand it text through `stripComments` (lines 53 to 135) first, because the
  header comment of the new module will say "root()" in prose.

The redline gate's rule 9 (`conformance-redline.mjs:237 to 251`, scan at 504 to 510) is a
line-by-line regex, `WRITE_WORDS = /\b(gmuxBridge|writeFile|writeFileSync|acceptChange|
rejectChange|applyChange)\b|['"`]fs:[a-zA-Z]/`, over the six `REDLINE_FILES` (lines 127 to 135),
comment lines skipped. **Any string literal beginning `fs:` in a redline file trips it**, so it
stays green for Phase 226 exactly as long as no file under `src/renderer/editor/` is touched,
which the charter forbids. It is green at the parent with all sixteen rules
(`.p226/out-conformance-redline.txt`).

---

## 6. The three gates at the parent, green

Run at `54a5e96` in the worktree, output written to files and read, not piped to `tail`.

| gate | log | result |
| --- | --- | --- |
| `npm run gate:contract` | `.p226/out-gate-contract.txt` | `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte`, exit 0. 222 channels. |
| `npm run conformance:redline` | `.p226/out-conformance-redline.txt` | rules 1 to 16 printed, `12 fixtures behaved`, `every rule passed`, exit 0. Rule 9 reads "no redline file names a bridge, a write or an accept, so nothing here can change a file". |
| `npm run conformance:credentials` | `.p226/out-conformance-credentials.txt` | `OK: 13 files scanned, 1 write, ... 22 of 22 scanner fixtures behaved; ... 60 of 60 ablations went red`, exit 0. |

Nothing under the person's home was opened by any of the three; the credentials gate says so in
its header and the other two read only the tree.

---

## 7. The temp name, measured

Scratch repository under the session scratchpad, git 2.50.1 (Apple Git-155), one commit holding
`notes.md` and `README.md`. Four candidate names were created beside `notes.md` and asked of git.
The operator's own global excludes file (`~/.config/git/ignore`, read only) holds two patterns,
`**/.claude/settings.local.json` and `**/CLAUDE.local.md`, and nothing that would hide any of
these; `git -C /Users/gdc/gmux check-ignore` on all four shapes answers nothing (exit 1), so his
checkout hides none of them either.

| name shape | `git status --short` | `git add -A` stages it | `git clean -n` names it | `ls` (no `-A`) shows it |
| --- | --- | --- | --- | --- |
| `notes.md.tmp` (store.ts's shape) | `?? notes.md.tmp` | yes | yes | yes |
| `notes.md.tortie-pending` (nofollow's store shape) | `?? notes.md.tortie-pending` | yes | yes | yes |
| `.notes.md.tortie-swap` | `?? .notes.md.tortie-swap` | yes | yes | **no** |
| `.notes.md.<base36 time>-<hex>.part` (durable/write.ts's shape) | `?? .notes.md.313738-deadbeef.part` | yes | yes | **no** |

**Finding: git hides none of them.** `git status` shows an untracked dotfile exactly as it shows
any other, `git add -A` and `git add .` stage every one, and `git stash -u` and `git clean` take
them. There is no name Tortie can choose inside the repository that `git status` will not show
while the file exists. The charter's requirement, "a name `git status` will not tempt anyone to
commit", is therefore met by the file NOT EXISTING when anyone looks, plus a name that reads as
alien if it is ever seen, and not by a name git overlooks. Three things buy that:

1. **Lifetime.** The temp exists for one `write` + one `rename`, and only a crash between them
   leaves it. THIS SENTENCE FIRST SAID "MICROSECONDS" AND THE PHASE 226 VERIFIER MEASURED IT:
   the whole call is 23.6 ms for a file at the cap, and the window from the hash to the rename is
   the time to write the payload, which is why the channel compares the target's inode, size,
   mtime and ctime in front of the rename rather than trusting the width. The next write to the same file unlinks it (nofollow.ts's line 76
   shape) before staging again, which is the charter's "cleaned on the next write".
2. **A DETERMINISTIC name per target**, so "the next write" can find the leftover without a
   directory scan. That rules out durable/write.ts's random suffix, whose leftovers are only
   findable by a prune pass Tortie does not have for the person's repository. Two writers racing
   on one file, which the random suffix exists to keep apart, are here serialised by the digest
   precondition: the second one is `stale` by construction and never reaches the temp.
3. **A dot prefix and a Tortie-owned suffix.** The dot keeps it out of `ls`, out of the Explorer
   if the tree ever hides dotfiles (today it keeps them, `fs/ipc.ts:6`), and out of most editors'
   file pickers; the suffix `tortie-` is the string the credentials domain already uses for its
   staged place (`<store>.tortie-pending`, nofollow.ts line 9), so a person who finds one can grep
   the product for it and a `.gitignore` rule for it is one line, `.*.tortie-swap`, should the
   operator ever want one. It is DIFFERENT from `.tortie-pending` on purpose: that name means "a
   credential store being replaced" in one domain and this one must not be mistaken for it by the
   credentials sweep (`sweepStaged` in `keep.ts`) or by a reader of a log line.

**Recommendation: `<dir>/.<basename>.tortie-swap`**, composed with `join(dirname(abs),
`.${basename(abs)}.tortie-swap`)`. Same directory as the target so `rename` is within one volume
(E.5's rule, and store.ts line 663's comment); deterministic per target; dot-prefixed; suffix
unique in the tree. Two limits stated: a target whose basename is already 250 bytes will fail the
temp create with `ENAMETOOLONG` (the suffix is 12 bytes and the dot 1), which the channel should
answer as `refused` with the errno rather than throw; and a REPOSITORY that hides dotfiles in its
own `.gitignore` (`.*`) hides the leftover from `git status` entirely, which is a help and not a
harm.

**What is NOT recommended and why.** `${path}.tmp` (store.ts) collides with a person's own
`.tmp` convention and `*.tmp` appears in enough global ignore files that a leftover could be
invisible to one person and committed by another; and a system temp directory is refused by E.5
because `rename` is atomic only within a volume, re-confirmed by store.ts's own comment at line
663 and durable/write.ts's at 255 to 256.

---

## 8. Things the builder should know that are in none of the seven questions

- **`ipc-invoke-closure.test.ts` counts `handle(` and `invoke(` by regex over comment-stripped
  source.** A `handle(ipc, 'fs:<name>'` in a doc comment is not counted, but the same string in
  the new module's CODE (say, an error message) would be, and would read as a second
  registration. Keep the channel name out of the module's code; only `ipc.ts` names it.
- **`assertTrustedIpcSender` and the quit refusal are in `handle()` itself** (`typed-ipc.ts:42,
  53`). The channel gets both for free and must not re-implement either.
- **The `truncated` flag is the renderer's, the cap is main's.** E.7a's three places for the
  refusal are the channel (this phase), the view (Phase 227), and the sentence (Phase 227). Only
  the first is here, and the channel reads the file ITSELF rather than trusting a flag the
  renderer sends, because a flag is a claim and a read is a measurement.
- **The U+FFFD comparison is `Buffer.from(raw.toString('utf8'), 'utf8').equals(raw)`**, one pass,
  no detector. It is true for every valid UTF-8 file including one that legitimately contains
  U+FFFD (the round trip preserves it), and false for the E.7b latin-1 fixture (87 bytes in, 93
  out). BOM, CRLF and UTF-16 pass through it unchanged and untouched, which is the stated limit.
- **The kept `sha256Of(Buffer)` at `durable/write.ts:137`** is the one digest helper worth
  importing; it is node-only and already reached from `manifest/` and `restore/`.
- **Rule 9 of `conformance:redline` will be NARROWED by Phase 227**, not by this phase. Adding a
  redline-side allowlist for the new channel name now would be doing Phase 227's work and would
  turn a green rule into one that cannot fail for the wrong reason.
