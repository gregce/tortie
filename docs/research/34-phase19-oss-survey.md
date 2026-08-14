# 34. Phase 19 and 20 OSS survey. Adopt, vendor, or build

**Written 2026-08-12.** Six parallel surveys produced the drafts behind this document. One
adversarial pass re-ran the load-bearing claims and overturned three of them. Where a draft and the
adversary disagree, the adversary's measurement stands and the original claim is recorded next to
it.

**Runtime measured against.** Electron 43.3.0, which is Node 24.x and libuv 1.52.1, read from
`process.versions.uv` inside the app's own Electron binary. The volume is APFS on an internal NVMe
disk. The system Node used for cross-checks is v22.23.1 with libuv 1.51.0. The system `sqlite3` is
Apple's 3.43.2. The `better-sqlite3` in the tree links SQLite 3.53.4.

**Baseline.** Claims about the tree were checked against `bfa67d7` (Phase 18) and re-checked against
the working tree today, which is now at `4f3701c` with a concurrent session's edits in flight. The
one place the two differ is Need 3, and it is called out there.

**Safety.** `/Users/gdc/gmux` was read-only throughout. Nothing was installed into the repo, no file
under `src` was written, no commit was made, and there was no contact with the operator's running
Tortie or their live tmux sessions. All experiments ran in a scratchpad with its own `package.json`.
All SQLite work ran against a read-only copy of the manifest.

---

## 1. The table

One row per need. This is the section a builder reads before writing any code.

| # | Need | Verdict | What is used | Runtime deps added | Reason in one line |
|---|---|---|---|---|---|
| 1 | Durable file writes | **BUILD**, about 70 lines | `node:fs/promises` and `node:crypto` | 0 | Every maintained package stops at `fsync(file)` then `rename`, and none of them flushes the containing directory. |
| 2 | SQLite integrity and backup | **ALREADY HAVE IT** for the primitives, **BUILD** the policy, **ADOPT** one OS tool | `VACUUM INTO` and `DbVerification` in `migrate/userdata.ts`, plus `/usr/bin/sqlite3 .recover` | 0 | The engine ships the checks and the copy, and no npm generational-backup library for SQLite exists. |
| 3 | Electron process and power safety | **ADOPT** three Electron built-ins, **BUILD** about 40 lines of policy. The single-instance lock is now **ALREADY HAVE IT**. | `app.requestSingleInstanceLock()`, `powerMonitor`, `crashReporter` | 0 | Chromium's `ProcessSingleton` is already compiled into the binary Tortie ships, and every npm alternative is either dead or solves a different problem. |
| 4 | Testing crash safety | **BUILD** on the existing smoke-spawn harness | `child_process.spawn` plus the `GMUX_SMOKE` pattern already in the tree | 0 | Playwright's `_electron.launch` hangs against Electron 43.3.0 and works against 35.7.5 on the same machine, so the fault-injection channel both drafts specified does not exist today. |
| 5 | Multi-stage restore status | **BUILD**, two discriminated unions and one migration | TypeScript unions, plus the manifest's existing `immediateTransaction` | 0 | The defect is that a caller was allowed to drop two fields, and no runtime library fixes a typing defect. |
| 6 | Terminal session state | **ALREADY HAVE IT** for layout validation, **BUILD** the rest on Need 1's primitive | tmux's own checksummed `#{window_layout}` string | 0 | tmux validates its own layout string in eight lines of ISC C that predate this product, and every other tool in this space is a C or Rust program with no library surface. |

**Net dependency change across Phases 19 and 20 is zero.** That is a result, not a target. Section 7
records the three places where a package was actively wanted and the search came back empty, so that
the zero reads as a finding rather than as a preference.

**VENDOR is the right verdict for none of the six.** Vendoring earns its place for a substantial
maintained algorithm that cannot practically be re-derived, which is why this project already
vendors VS Code's git parsers and `fuzzyScorer`. It does not earn its place for an eight-line
temp-name helper. One draft proposed vendoring `write-file-atomic`'s temp-name derivation. That
derivation is a timestamp plus `crypto.randomBytes(4).toString('hex')`, and copying it in with
attribution costs more to read than to write. Rejected.

### 1.1 Three claims that were overturned

These are listed immediately after the table because two of them change what Phase 19 builds.

**Overturned 1. Playwright cannot drive Electron 43 today, so the Need 4 ADOPT falls.** Two drafts
recommended Playwright's `_electron` for the crash harness, and one described it as proven end to
end. It was measured three times against a minimal Electron app.

| Playwright | Electron | Result |
|---|---|---|
| `playwright-core@1.62.1`, stable | 43.3.0, the copy in `node_modules` | `electron.launch: Timeout 20000ms exceeded` |
| `playwright-core@1.63.0-alpha-2026-08-12` | 43.3.0 | `Timeout 60000ms exceeded` |
| `playwright-core@1.63.0-alpha-2026-08-12` | **35.7.5** | **Works.** `evaluate {"pid":77708,"type":"browser","ver":"35.7.5"} pidsMatch=true` |

The third row is the attribution. It is the same machine, the same Playwright build, the same victim
app, and the same script. Only the Electron binary differs. The call log shows Playwright attaching
to both websockets and then never completing.

```
- <launched> pid=92975
- [pid=92975][err] Debugger listening on ws://127.0.0.1:57924/...
- <ws connected> ws://127.0.0.1:57924/...
- [pid=92975][err] DevTools listening on ws://127.0.0.1:57926/devtools/browser/...
- <ws connected> ws://127.0.0.1:57926/devtools/browser/...
          nothing further, for sixty seconds
```

The main-process bootstrap that would give you `app.evaluate()` never lands. `app.evaluate()` is the
fault-injection channel both designs are built on, so the design does not exist yet. This is a
recurring class of breakage rather than a one-off. `electron/electron#47419`, opened 2025-06-09 and
titled "Electron 36.x causes playwright error with electron.launch()", was closed by moving to
Electron 37. Playwright's Electron support tracks specific majors and lags them. Tortie is pinned to
`^43.3.0`, and `npm i` will float that to 43.4.0 or beyond.

**Overturned 2. The `synchronous` pragma argument, in all three of the versions the drafts gave.**
Measured with better-sqlite3 13.0.3 in WAL mode, taking the median of 20 to 25 single-row
`BEGIN IMMEDIATE` commits.

| Connection settings | Median commit |
|---|---|
| `synchronous=NORMAL`, which is what Tortie sets today at `db/sqlite.ts:52` | 0.0116 ms |
| `synchronous=FULL`, `fullfsync=0` | 0.0512 ms |
| `synchronous=NORMAL`, `fullfsync=1` | 0.0104 ms, which is no effect at all |
| `synchronous=FULL`, `fullfsync=1` | 4.1083 ms |

Two facts fall out, and no draft had both halves.

- `fullfsync=1` on its own is a placebo. Under `NORMAL` the WAL is not synced at commit, so there is
  no sync for `F_FULLFSYNC` to strengthen. Any recommendation phrased as "turn on `fullfsync` for
  the important commits" buys nothing unless it also raises `synchronous`.
- `synchronous=FULL` on its own costs 0.05 ms because it does far less than it sounds like. That
  figure cannot be a device cache flush. It is a plain `fsync(2)`, which on macOS does not flush the
  drive. It survives an application crash. It does not survive power loss. State the property in
  those terms rather than as "stronger durability".

Scoping works, which settles the question of how to pay for it. On a `NORMAL` connection, raising
both pragmas around one commit and lowering them again gave 0.0115 ms for the commits before,
4.2538 ms for the one scoped commit, and 0.0113 ms for the commits after. Both pragmas are
per-connection and switchable with no reconnect. So "stronger durability on the commits that matter"
is four `db.pragma()` calls around one transaction at a measured price of 4.24 ms on those commits
and nothing anywhere else.

**Overturned 3, as a statement about the tree. The single-instance lock is no longer absent.** The
brief and the Need 3 draft both say the lock is absent and verified so. At `bfa67d7` that was
correct. It is now present at `src/main/index.ts:144`, added by the concurrent session, and the
implementation already carries a `harnessLaunch` exemption so that `GMUX_SMOKE` and `GMUX_SHOT` runs
never take the lock. It also carries a `GMUX_ALLOW_SECOND_INSTANCE=1` escape hatch, and it exits
with `app.exit(0)` rather than `app.quit()`, which is the correct choice. Phase 19 must treat this
item as in progress and must not build it twice. The one property that implementation's comment
block does not mention is the 20-second watchdog described in section 3.3.

---

## 2. The dependency checklist, and every ADOPT scored against it

### 2.1 What a dependency costs in this app

Three build targets treat dependencies in opposite ways, and a proposal has to say which one it
lands in.

- `main` and `preload` use `externalizeDepsPlugin()`. That externalises everything in
  `dependencies`. A main-process dependency is therefore not bundled. It stays a runtime `require()`
  and must be physically present in `node_modules` inside the asar.
- `renderer` has no externalise plugin, so renderer dependencies are bundled into
  `out/renderer/assets/`. That is why `electron-builder.yml` carries roughly 55 explicit
  `!node_modules/...` lines to stop the same code shipping twice.

Phases 19 and 20 are main-process work, so the double-shipping problem mostly does not apply. Any
proposal that puts durability UI in the renderer inherits it.

The packaged app measured today from `release/mac-arm64/Tortie.app` is 449 MB, with a 96,082,792
byte `app.asar` and a 35 MB `app.asar.unpacked` tree. The DMG is 168 MB and the ZIP is 167 MB.

**One pure-JavaScript main-process dependency, priced concretely.** Installing the leading Need 1
candidate in a scratch project gave `write-file-atomic@8.0.0` plus `signal-exit@4.1.0`. That is 2
packages, 188 KB on disk and 34 files added to the asar, of which 164 KB is `signal-exit`. Install
time is inside the noise. Build time is unchanged because it is not bundled. The cost at an Electron
major upgrade is zero. That is genuinely cheap, and 188 KB is not the reason to refuse it. Section
3.1 gives the reason.

**A devDependency costs nothing at package time.** The `files:` block ships `out/**` and
`package.json`, and `npm ci --omit=dev` in CI never sees it. The costs are install time, lockfile
surface, and supply-chain exposure on the build machine, which is where the credentials live.

**A native dependency changes the shape of the price.** The three native modules already here put 13
Mach-O files into `app.asar.unpacked`. Three of those are x86_64 and are dead weight on an arm64
target. Five are duplicates of a file already present elsewhere in the tree. `better-sqlite3` alone
is 27 MB of the 35 MB unpacked tree, and 7 of its 8 prebuilds are for platforms this app does not
target. Every one of those 13 files must be Developer ID signed with hardened runtime the day
`identity` stops being `null`, because `kSecCSCheckNestedCode` is checked on every Squirrel update
and a missed nested signature fails the install on the user's machine rather than only at
notarization. Verified today, only `bin/specstory` is hardened, at `flags=0x10002(adhoc,runtime)`,
because `build/sign-nested-binaries.cjs` does it by hand. The other twelve carry
`flags=0x20002(adhoc,linker-signed)` with no team identifier. At an Electron major upgrade every
`.node` file is ABI-pinned, so 43 to 44 means a rebuild, a re-sign, and a re-notarize, and if a
module has not been updated for the new ABI it means waiting for its maintainer before Tortie can
move.

**A dependency that ships or fetches a binary has three distinct shapes, and only one is
disqualifying.**

| Shape | Example already here | Verdict |
|---|---|---|
| Per-platform binaries as registry `optionalDependencies` | `@vscode/ripgrep@1.18.0`, which has no install script and 12 platform packages | Acceptable. Lockfile-pinned, integrity-hashed by npm, present before signing, and signable in place. |
| Prebuilds inside the package's own tarball | `better-sqlite3@13.0.3` with 8 prebuilds, `node-pty@1.1.0` with 7 | Acceptable but wasteful. The same properties hold, and you carry the other platforms. |
| A `postinstall` or `preinstall` that downloads a binary from outside the registry | None in `dependencies` today | Disqualifying. There is no lockfile integrity and no reproducibility, and it lands after `npm ci` while remaining invisible to `mac.binaries`. |

The project already set the right precedent for the third shape, and it should be quoted at anyone
who proposes a downloader. `build/fetch-specstory.cjs` fetches at build time rather than install
time, pinned by two SHA-256 hashes and a byte count in `build/specstory-release.json`, materialised
by `beforePack`, hardened by `afterPack`, and listed in `mac.binaries`. Any binary that enters this
app takes that path or does not enter. The brief's stronger claim, that a downloaded binary cannot
be re-signed inside a signed app, holds, and the mechanism is worth stating. `afterPack` runs before
`signApp`, and anything written into `Contents/` after the seal invalidates it. A runtime downloader
is therefore not a packaging inconvenience. It is a Gatekeeper failure on the user's machine.

**Licences.** Runtime dependencies today are MIT, ISC or Apache-2.0. `@pierre/diffs` is the only
Apache-2.0 one, and its tarball ships a `NOTICE` file, so the section 4(d) obligation is currently
met by accident rather than by design. MIT and ISC both require the copyright notice to travel with
the distribution, and npm always includes `LICENSE` in a tarball, so that is also satisfied by
accident today. It stops being satisfied by accident the moment someone flips `files:` to an
allowlist, which is worth one line in that phase's brief. GPL is a hard refusal for both adopting
and vendoring, which is why section 3.6 reads asciinema's format documentation and does not copy its
code.

**Provenance is a preference and must never be a gate.** Measured today with
`npm view <pkg> dist.attestations`, provenance is present on `write-file-atomic@8.0.0`,
`better-sqlite3@13.0.3`, `zustand@5.0.14`, `xstate@5.32.5`, `playwright@1.62.1` and `ssri@14.0.0`.
It is absent on `atomically@2.1.1`, `exit-hook@5.1.0`, `signal-exit@4.1.0`, `fuzzysort@4.0.1`,
`node-pty@1.1.0`, `@parcel/watcher@2.6.0` and **`electron@43.3.0`** itself. A rule requiring
provenance would exclude the framework, both compiled native modules the app cannot function
without, and `signal-exit`, which is a transitive of the very package such a rule would be written
to admit. A checklist the project itself fails is worse than no checklist.

### 2.2 The checklist

Any ADOPT in this document, and any ADOPT in a later Phase 19 or 20 proposal, must be scored against
these ten items in writing.

1. **Requirement coverage, stated as a subtraction.** List the requirements it meets and the ones it
   does not, and estimate the lines still owed. If the remainder is more than half the job, the
   dependency is a wrapper around a problem you still have.
2. **Read the whole implementation.** Under about 300 lines, say what it does. Over that, say why
   you cannot own the part you need instead. For durability code this is not optional. An unread
   dependency is less inspectable than code in the tree, which is what the Zen rule is actually
   about.
3. **No lifecycle scripts.** `install`, `preinstall`, `postinstall` and `prepare` must be absent, and
   this must be verified from the tarball rather than from `npm view`, because the registry metadata
   omitted `scripts` for every package checked today. Binaries may arrive only as registry
   `optionalDependencies` or as in-tarball prebuilds, never from a downloader.
4. **Budget.** At most 3 packages and at most 1 MB added, for anything that ships in the asar.
   Development-only dependencies get a looser budget and still get counted.
5. **Alive on two clocks.** A release in the last 12 months, and a repository push in the last 6.
   Both checked live. One without the other is a package on the way out.
6. **Engines satisfied twice.** By Electron 43.3.0's Node 24.18.1, and by the build machine's Node
   22.23.1. `write-file-atomic@8`'s `^22.22.2 || ^24.15.0 || >=26.0.0` passes both. A package
   requiring `>=24` would break `npm test` locally while working inside the app.
7. **Licence is MIT, ISC, BSD or Apache-2.0**, and the licence file is present in the tarball. GPL is
   refused for both adopting and vendoring.
8. **Pin exactly, with no caret, if it is durability-critical.** This matches what the tree already
   does for `@pierre/diffs`, `@vscode/ripgrep`, `fuzzysort` and `web-tree-sitter`.
9. **Prefer provenance and never require it.** Do check that `npm audit signatures` passes.
10. **State the Electron-major cost in the proposal.** For pure JavaScript that is "none". For native
    code it is the rebuild, the number of new nested Mach-O files, and the name of whoever signs
    them.

### 2.3 The checklist calibrated against what is already here

Running the checklist against the existing dependencies is what tells you which items are gates and
which are budgets.

| Dependency | 3 scripts | 4 budget | 5 alive | 6 engines | 7 licence | 8 pinned | 9 provenance | Verdict |
|---|---|---|---|---|---|---|---|---|
| `better-sqlite3@13.0.3` | pass | **fail**, 27 MB unpacked with 7 useless prebuilds | pass, 13.0.3 on 2026-08-05 and pushed 2026-08-10 | pass | MIT | `^13.0.3` | yes | Keep. The fix for item 4 is a packaging filter, not a different database. |
| `node-pty@1.1.0` | pass | **fail**, 7 prebuilds and 6 nested Mach-O files | 1.1.0 stable, 1.2.0-beta.15 on 2026-08-03 | pass | MIT | `^1.1.0` | **no** | Keep. It is irreplaceable and the cost is structural. |
| `@vscode/ripgrep@1.18.0` | pass, no install script | pass | pass | pass | MIT | exact | no | The model citizen for the binary case. |
| `@parcel/watcher@2.6.0` | pass | duplicate `.node` shipped twice | pass, 2026-07-20 | pass | MIT | `^2.6.0` | no | Keep. |
| `@pierre/diffs@1.3.5` | pass | renderer-only, bundled and then excluded | current | pass | **Apache-2.0** | exact | not checked | Keep. See the NOTICE note in 2.1. |
| `electron@43.3.0` | n/a | n/a | 43.4.0 shipped 2026-08-11 | n/a | MIT | `^43.3.0` | **no** | Keep. Item 9 as a gate would exclude the framework. |

Two of the four native dependencies fail the size budget. One of the six fails the provenance
preference, and so does the framework. **Items 3, 5, 6 and 10 are hard gates. Items 4 and 9 are
budgets to be argued against in writing rather than walls.**

### 2.4 Every ADOPT in this document, scored

There are three ADOPT verdicts and none of them is an npm package, so several checklist items do not
apply. Each is scored anyway, because "it is a built-in" is exactly the kind of claim that should
still be written down.

**ADOPT 1. Electron's `app.requestSingleInstanceLock()`, `powerMonitor` and `crashReporter`.**

| Item | Score |
|---|---|
| 1 coverage | The lock covers "one writer per userData directory" completely. It does **not** cover the `-L gmux` socket, so it is half the answer to two writers rather than all of it. `powerMonitor` covers sleep and wake notification and nothing else. `crashReporter` covers local dump capture only, with `uploadToServer: false`. |
| 2 read it | Read. `App::RequestSingleInstanceLock` in `shell/browser/api/electron_api_app.cc` constructs a Chromium `ProcessSingleton` over `chrome::DIR_USER_DATA`. Electron carries one patch touching it, `feat_add_data_parameter_to_processsingleton.patch`, so the stale-lock logic is stock `chrome/browser/process_singleton_posix.cc`, which is compiled on macOS. |
| 3 scripts | n/a. No new package. |
| 4 budget | Zero bytes added. |
| 5 alive | Electron 43.4.0 shipped 2026-08-11. |
| 6 engines | n/a. |
| 7 licence | MIT, already shipped. |
| 8 pinned | Follows the existing `^43.3.0`. |
| 9 provenance | Electron has none, which is item 9 working as a preference. |
| 10 Electron major | None. This is Electron's own API. |

**ADOPT 2. `/usr/bin/sqlite3 .recover` as the last-resort reconstruction path.**

| Item | Score |
|---|---|
| 1 coverage | Covers reconstruction from a damaged file and nothing else. Verified working on this machine at Apple's SQLite 3.43.2. Run against a damaged copy it emitted a 94-line `BEGIN; PRAGMA writable_schema = on; ...` script. |
| 2 read it | Not read. It is Apple's build of SQLite's own shell. This is the one place where "older than this product" substitutes for reading the source. |
| 3 scripts | n/a. Nothing is installed. It is invoked as a subprocess of a binary already on every macOS machine. |
| 4 budget | Zero bundled bytes and zero signing exposure. |
| 5 alive | SQLite is maintained. Apple's shipped version lags, which is acceptable for a recovery path that is documented and tested rather than depended on. |
| 6 engines | n/a. |
| 7 licence | Public domain. |
| 8 pinned | Not pinnable. This is a risk and it is named in section 8. |
| 9 provenance | n/a. |
| 10 Electron major | None. |

**ADOPT 3. tmux's checksummed `#{window_layout}` string for layout validation.**

| Item | Score |
|---|---|
| 1 coverage | Covers detection of a corrupted layout string completely, because the producer and the validator are the same code. It covers nothing else, and tmux persists no other state. |
| 2 read it | Read. `layout_checksum` in `layout-custom.c` is eight lines, quoted in section 3.6. |
| 3 to 9 | n/a. tmux is already a hard dependency of the product. |
| 10 Electron major | None. |

---

## 3. The six needs in full

### 3.1 Need 1. Durable file writes. Verdict BUILD

**What is true today.** `src/main/restore/snapshots.ts:94` is three lines.

```ts
const tmp = join(dir, `.${sessionId}.tmp`);
await writeFile(tmp, text, 'utf8');
await rename(tmp, final);
```

`grep -rn "fsync|fdatasync|O_SYNC" src` returns no matches, confirmed at `bfa67d7` and again in the
working tree today. The temp name is fixed per session, so two capture paths racing on one session
write the same temp file, and both the quit path and the `%exit` path exist. The live workload read
from the operator's own snapshots directory is 43 files totalling 1.2 MB.

**The candidates, decided from their tarballs.** Every cell below was decided by extracting the
published tarball and grepping the shipped source. None was taken from a README.

| Package | Latest | Published | Licence | Runtime deps | Install script | fsyncs file | **fsyncs directory** | size verify | checksum | generations | marker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `write-file-atomic` | 8.0.0 | 2026-05-08 | ISC | 1, `signal-exit` | none | yes | **no** | no | no | no | no |
| `atomically` | 2.1.1 | 2026-02-08 | MIT | 2, `stubborn-fs` and `when-exit` | none | yes | **no** | no | no | no | no |
| `fast-write-atomic` | 0.4.0 | 2026-02-13 | MIT | 0 | none | yes | **no** | no | no | no | no |
| `write-json-file` | 7.0.0 | 2025-09-14 | MIT | 4, wraps `write-file-atomic` | none | inherited | **no** | no | no | no | no |
| `steno` | 4.0.2 | 2023-12-26 | MIT | 0 | `prepare` only | **no** | no | no | no | no | no |
| `fs-extra` | 11.4.0 | 2026-07-23 | MIT | 3 | none | **no** | no | no | no | no | no |
| `@openclaw/fs-safe` | 0.5.5 | **2026-08-12** | MIT | 0 | none | yes | **yes** | no | no | no | no |
| `lmdb` | 3.5.6 | 2026-06-18 | MIT | 6 | **`install`, `gypfile:true`** | yes | yes | n/a | n/a | n/a | n/a |
| `proper-lockfile` | 4.1.2 | **2021-01-25** | MIT | 3 | none | n/a, it is a lock | n/a | n/a | n/a | n/a | n/a |

The two receipts that decide it are these.

- `write-file-atomic@8.0.0`. `lib/index.js` contains `fsync` at exactly two places, lines 121 to 122
  and lines 227 to 228, and both are the file descriptor. The word `opendir` does not appear.
  `O_DIRECTORY` does not appear. `dirname` does not appear at all. The library never opens the
  containing directory, so it never syncs it.
- `atomically@2.1.1`. `dist/index.js` uses `path.dirname` at exactly two places, lines 66 and 156,
  and in both the very next statement creates the parent directory. The parent is created and never
  synced. `fsync` appears at lines 88 to 93 and 172 to 177, on the file descriptor only.

**The gap is known and nobody owns it.** `npm/write-file-atomic#64`, titled "Rename atomicity is not
enough", has been open since 2020-07-09 with its last activity on 2021-01-13 and 5 comments. The
request is word for word the missing requirement, which is to fsync the directory after the rename.

**One package does sync the directory and it is still a reject.** `@openclaw/fs-safe` exports
`syncDirectoryBestEffort` from `dist/fsync.js` and uses it from `replace-file.js`. Verified live, it
is at 0.5.5, it was first published on 2026-05-06, it has shipped 26 versions in fourteen weeks, and
the latest of those was published today. Its actual purpose is capability-style path sandboxing for
untrusted relative paths, and durable replace is a side feature. Under the Zen rule it fails "older
than this product" by four years. Under the one-maintainer constraint it fails on churn before the
0.x version number gets a vote. Adopting a durability primitive on its release day is the specific
mistake this section exists to prevent.

**`lmdb` is disqualified by the signing constraint, stated explicitly.** It sets `gypfile: true`, it
has an `install` script, and it fetches prebuilt `.node` binaries per platform. That is a third
native module for `electron-rebuild` and a further nested Mach-O to sign inside the Developer ID
bundle and re-sign on every upgrade. It appears in this document only as design evidence, because
`mdb.c` maps `MDB_FDATASYNC` to `fcntl(fd, F_FULLFSYNC)` on Apple. It was never a candidate.

**The macOS mechanism, measured, and the trap inside it.** `man 2 fsync` on this machine states that
`fsync` flushes to the drive but that "the drive itself may not physically write the data to the
platters for quite some time", and that this "is not a theoretical edge case". `F_FULLFSYNC` is the
call that does flush. libuv's `uv__fs_fsync` handles this for you.

```c
static int uv__fs_fsync(uv_fs_t* req) {
#if defined(__APPLE__)
  /* Apple's fdatasync and fsync explicitly do NOT flush the drive write cache
   * to the drive platters. ... F_FULLFSYNC is Apple's equivalent for flushing
   * buffered data to permanent storage. If F_FULLFSYNC is not supported by the
   * file system we fall back to F_BARRIERFSYNC or fsync(). This is the same
   * approach taken by sqlite, except sqlite does not issue an F_BARRIERFSYNC call. */
  int r;
  r = fcntl(req->file, F_FULLFSYNC);
  if (r != 0) r = fcntl(req->file, 85 /* F_BARRIERFSYNC */);
  if (r != 0) r = fsync(req->file);
  return r;
#else
  return fsync(req->file);
#endif
}
```

`uv__fs_fdatasync` on Apple is `return uv__fs_fsync(req);`. So `fs.fsync()` from Node is already
`F_FULLFSYNC` on macOS. There is no need for a native addon, an FFI shim or a helper binary, which
is the fact that makes this buildable at all under the notarization constraint.

Measured on 25 KB files, median of 15, with each variant on its own fresh descriptor. Measuring
several calls on one descriptor is wrong, because the second call finds nothing dirty and reports
8 microseconds.

| Call | C | Node 22 with libuv 1.51.0 | **Electron 43.3.0 with libuv 1.52.1** |
|---|---|---|---|
| `fsync(fileFd)` | 0.039 ms | 4.765 ms | **3.849 ms** |
| `fcntl(fileFd, F_BARRIERFSYNC)` | 0.533 ms | not applicable | not applicable |
| `fcntl(fileFd, F_FULLFSYNC)` | 2.156 ms | not applicable | not applicable |
| `fdatasync(fileFd)` | not measured | 4.016 ms | **3.942 ms** |
| **`fsync(dirFd)`** | **0.002 ms** | 3.938 ms | **3.798 ms** |
| `fcntl(dirFd, F_FULLFSYNC)` | 2.131 ms | not applicable | not applicable |

Two things follow, and the second would have shipped a bug.

1. Node's 3.8 ms against C's 0.039 ms is empirical proof that the `F_FULLFSYNC` branch is taken. It
   was confirmed inside the exact runtime rather than inferred from a source read of a different
   libuv.
2. **A directory sync written the textbook POSIX way is a no-op on APFS.** Calling
   `open(dir, O_RDONLY)` and then `fsync(fd)` in C returns success in two microseconds having
   flushed nothing. Anyone porting the Linux recipe, which is what every article on this subject
   describes, ships a placebo and believes it works. Going through Node's `fs.fsyncSync` is what
   makes it real, because libuv escalates the call. This is the kind of platform fact a wrapper
   library hides, and hiding it is not an advantage when it is the fact you have to reason about.

Mechanics confirmed on this machine. `fs.openSync(dir, 'r')` returns a usable descriptor and
`fs.openSync(dir, 'w')` throws `EISDIR`. The promises API equivalent is `FileHandle.sync()`.

**`fsync` is not a completeness check, and this is confirmed more strongly than the drafts claimed.**
Reproduced today on a 6 MB sparse APFS image filled to `ENOSPC`, with a full durable-write sequence
attempted into it.

```json
{"write":"ENOSPC","fsync":"OK","sizeOnDisk":0,"intended":524288,
 "sizeMatches":false,"rename":"OK","dirFsync":"OK","finalBytes":0}
```

Every durability primitive reported success while publishing a zero-byte file. `fsync` returned OK.
`rename` returned OK. The directory `fsync` returned OK. What is now on disk under the final name is
empty. Nothing except an explicit size check and hash check between the write and the rename catches
this.

In fairness to the libraries, this does not condemn `write-file-atomic` or `atomically`. Both
propagate the write error and never reach their `rename`. What it condemns is the belief that a
successful `fsync` means a complete file, and it is the reason the requirement list for Need 1
includes verification at all.

**What it costs at the real workload.** Measured inside Electron 43 on 43 files of 25 KB, which is
the operator's actual snapshot shape.

| Shape | Total | Per session |
|---|---|---|
| Today. `writeFile` plus `rename`, no fsync | **3.99 ms** | 0.09 ms |
| fsync each payload and fsync the directory after every file | 369.58 ms | 8.59 ms |
| **Recommended.** fsync each payload and fsync the directory once | **179.86 ms** | **4.18 ms** |
| Add a durable completion record | plus 8.69 ms | not applicable |
| sha256 of all 43 | 0.68 ms | not applicable |
| Read back and verify length and sha256 of all 43 | 1.28 ms | not applicable |

Batching the directory sync halves the cost, from 370 ms to 180 ms, and that alone justifies the
shape of the sequence in section 4. The integrity half, which is the part that sounds expensive, is
2 ms out of 190 and is effectively free. The whole cost is 43 calls of about 4 ms each to
`F_FULLFSYNC`, and it is irreducible, because that is what asking the drive to flush costs. The
comparison that decides whether it is affordable is already in `snapshots.ts:40`, which documents
quit as 0.9 s to 1.9 s for 16 sessions of `capture-pane`. Adding about 190 ms to a 43-session quit
is a 10 to 15 percent increase on a path already dominated by tmux serialising captures, and it buys
the property that a snapshot which exists is a snapshot that is complete and verified.

**The adversary's objections, attached rather than smoothed away.**

*Objection: name the library that already does it.* Named. They are `write-file-atomic`,
`atomically`, `fast-write-atomic`, `write-json-file` and `steno`. Their source was read. All five
stop at `fsync(file)` followed by `rename`, which is the half that already almost works, and none of
the five does the directory sync. None does size verification, a checksum, generations or a
completion record. The best of them meets two of the seven requirements. Adopting it means adding a
dependency and then writing the other five requirements around it anyway, in code that must now also
keep step with the dependency. The six-year-old open issue says the gap is not about to close.

*Objection: is the author confusing "our requirements are unusual" with "we did not look hard
enough"?* The requirements are not unusual. They are what LevelDB, RocksDB, LMDB and SQLite all do.
What is unusual is that no npm package implements them, which is a fact about npm rather than a fact
about Tortie.

*Conceded honestly.* `write-file-atomic` does three things that a fresh 70 lines will not. It
preserves owner and mode from the original file's `stat`. It retries on `EMFILE`. It registers a
`signal-exit` handler to clean up orphaned temp files. Applying the constraints rather than
mentioning them, Tortie's snapshots are `0600` files it created itself inside its own userData
directory, so ownership preservation is dead weight. The app opens tens of files rather than
thousands, so `EMFILE` is not in frame. Adding a package that installs process-exit handlers into
the Electron main process is a cost in the one place where section 3.3 shows Chromium has already
intercepted the signals. A stale `.part` file is swept on the next boot by the same pass that prunes
generations.

`fcntl(F_FULLFSYNC)`, `rename(2)` and a directory `fsync` are boring, inspectable, and older than
this product by decades. `write-file-atomic@8.0.0`, published three months ago, is not more boring
than seventy lines that can be read in one sitting.

### 3.2 Need 2. SQLite integrity and backup. Verdict ALREADY HAVE IT, plus policy

**Measured on the operator's real manifest**, copied read-only into the scratchpad with its `-wal`
and `-shm`, and opened with the in-tree `better-sqlite3` inside Electron.

```
sqlite 3.53.4 · journal_mode wal · 17 pages × 4096 B · 40 sessions
tables: migrations, sqlite_sequence, sessions, projects
quick_check       0.0259 ms
integrity_check   0.0412 ms
VACUUM INTO       0.723 ms -> 65,536 bytes
```

**Use `integrity_check`, not `quick_check`.** The cost argument is over before it starts, because
`integrity_check` is 41 microseconds on this database. It is strictly stronger. SQLite's
documentation is explicit that `quick_check` skips UNIQUE constraint checking and skips verifying
that index content matches table content. The 16 microseconds saved are not worth a class of
undetected fault in which an index answers a question about a value the table no longer holds. One
draft demonstrated exactly that fault on a manifest-shaped database, where a table page was rewritten
without the index. `quick_check` returned `ok`, and a lookup by name returned `id 1500` from the
index while the table row for `id 1500` held a different name. Mapped onto this schema, that is a
manifest lookup by session name returning another session's `argv` or `cwd`, after which every
restore decision is made from the wrong row. Revisit the choice only above roughly 50 MB, which 40
sessions in 68 KB will not reach.

Checking before opening means opening read-only first, checking, closing, and reopening read-write.
The read-only probe creates a `-shm` beside the database and changes nothing else, which was
verified by bytes.

**`VACUUM INTO` is confirmed, including the property that matters most.** The claim that a read-only
`VACUUM INTO` does not disturb the source was checked by bytes rather than by reasoning, because a
backup helper that mutates the live manifest is the exact failure this phase exists to prevent.

```
before  db c890e908…:69632   wal 7ff65bcd…:4120032   shm 4f9b3c81…:32768
after   db c890e908…:69632   wal 7ff65bcd…:4120032   shm 4f9b3c81…:32768
```

All three files are byte-identical, including the `-shm`.

The invariant that must be a test rather than a habit is that every recovery-path connection opens
with `{ readonly: true, fileMustExist: true }`. The reason is that the last write connection to close
checkpoints and truncates the WAL, so a helper that opens read-write "just to check" becomes a
mutator of the user's live database. That was observed directly. A database with 300 rows committed
showed a 4096-byte `.db` and a 115,392-byte `-wal` while the writer was open, and a 106,496-byte
`.db` with a zero-length `-wal` after the writer closed.

**Three rules, stated so they can be tested.**

- Never copy the `.db` alone. It is stale by up to a checkpoint interval, and the copy is a valid
  database. `integrity_check` returns `ok` on it and nothing you can run on the copy will tell you it
  is behind. Measured on the operator's real manifest, a `.db`-only copy produced identical row
  counts in every table and `integrity_check` returned `ok`, while a per-table content hash showed
  `sessions` differing, with `last_seen` stale on 40 of 40 rows and `status` stale on one.
- Never copy `.db`, `-wal` and `-shm` as files under a live writer. Measured over 150 consecutive
  three-file copies with a hot writer, 70 could not be opened at all with "database disk image is
  malformed", 20 more opened but were structurally corrupt, and 60 were clean. That is a 60 percent
  failure rate.
- Never fix that by checkpointing first. `wal_checkpoint(TRUNCATE)` is a write to the user's live
  database, and it does not close the race anyway, because a writer can commit the moment it
  returns.

**Decode the 3.9 MB WAL before anyone sizes anything from it.** `manifest.db-wal` is 4,120,032
bytes, which is a 32-byte header plus exactly 1000 frame slots of 24 plus 4096 bytes. That is the
default `wal_autocheckpoint` of 1000 pages, reached once and thereafter recycled in place. A WAL file
never shrinks except at a TRUNCATE checkpoint or at a clean last-connection close. Only 211 of the
1000 frames carry the current generation's salt. It is a high-water mark over a 17-page database
rather than a backlog. Never derive a backup size, a disk-space warning, or an estimate of unflushed
data from it.

**Reconstruction. ADOPT `/usr/bin/sqlite3 .recover`.** Verified present and working on this machine
at Apple's SQLite 3.43.2. Run against a damaged copy it emitted a 94-line
`BEGIN; PRAGMA writable_schema = on; ...` reconstruction script. It costs zero bundled bytes and has
zero signing exposure. It is the last-resort path and it should be documented and tested rather than
wrapped in code.

**The one correction to what is already here.** `DbVerification` and `copyDatabase()` in
`src/main/migrate/userdata.ts`, with `VACUUM INTO` at line 638 and the readonly rationale documented
at line 591, are the right primitives and have been run against real user data. Generalise them into
`manifest/recovery.ts` and change exactly one thing. **Row-count comparison is not verification.**
Tortie's manifest churn is almost entirely `UPDATE` statements against `last_seen` and `status`, and
row counts cannot see an `UPDATE`. Replace `sameCounts()` with a per-table sha256 over the ordered
rows. Measured on the real manifest that costs 0.30 ms including the `integrity_check`, against a
`VACUUM INTO` that costs 0.72 ms.

**CORRECTED ON 2026-08-13 BY PHASE 20. The draft claim was right and this section was wrong.** The
original text is kept below because the reason it was wrong is the useful part. One draft states that
on a damaged file `quick_check` throws rather than returning a row, so any gate written as an `if`
misses the case it exists for. Phase 20 reproduced it: smashing the cell pointer array on the
`migrations` table root page produces a file on which `integrity_check` **throws** `database disk
image is malformed`. So the throwing behaviour is reachable, not merely possible, and
`db/integrity.ts` already covers both. Read the paragraph below as a record of an injection that was
too weak rather than as a finding about SQLite.

*Original text.* Injecting 360 bytes of `0x5a` into page 3 of a freshly vacuumed copy gave a file that
opened, both checks returning `ok`, and all 40 rows reading back. That injection was too weak,
because it landed in a region the checker does not walk. This is a failure to reproduce rather than a
refutation, and it carries its own lesson, which is that a byte-level difference from the original is
not necessarily a corruption SQLite can see. Two cheap instructions follow for the phase. Write the
gate to handle both a returned non-`ok` row and a thrown exception, because one of those two
behaviours is certainly reachable and neither costs anything to cover. Whoever builds the fault
matrix must inject corruption at a located structure such as a cell-pointer array or an index leaf
rather than at a blind offset, and must assert that the injection took effect before asserting that
the detector fired. A fault test that silently fails to inject is worse than no test.

### 3.3 Need 3. Electron process and power safety. Verdict ADOPT built-ins, plus policy

**There is nothing to adopt from npm, and that is the correct answer.**

| Package | Latest | Published | Deps | Verdict |
|---|---|---|---|---|
| `electron-single-instance` | 0.0.2 | **2015-11-10**, 2 versions ever | 0 | Reject. Abandoned for 11 years. |
| `proper-lockfile` | 4.1.2 | **2021-01-25** | 3 | Reject. It is advisory file locking rather than app instancing, and duplicating in JavaScript what Chromium does in-process is strictly worse. |
| `exit-hook` | 5.1.0 | 2026-02-04 | 0 | Reject. It is a synchronous `process.on('exit')` hook. Nothing durability-useful is synchronous, and Chromium pre-empts the signals it listens for. |
| `signal-exit` | 4.1.0 | 2023-07-29 | 0 | Reject, for the same reason. |
| `async-exit-hook` | 2.0.1 | **2017-08-03** | 0 | Reject. Nine years stale, and its premise was measured false. |
| `node-graceful` | 3.1.0 | **2021-08-17** | 0 | Reject, same premise and same measurement. |

This is the case where the two rules agree rather than conflict. The boring, inspectable,
decades-old thing is Chromium's `ProcessSingleton`, and it is already compiled into the binary Tortie
ships. The wrong move here is not "write your own". It is adding a 2017 npm package to wrap signals
Chromium has already intercepted.

**The built-in, measured, including the part nobody documents.** A scratchpad Electron app calling
`app.requestSingleInstanceLock()` with its own `--user-data-dir` produced three symlinks in userData,
with the real socket in `$TMPDIR`.

```
userData/  SingletonCookie -> 7061198866548420674
           SingletonLock   -> Mac-95350            (hostname-pid)
           SingletonSocket -> $TMPDIR/scoped_dirOczmQC/SingletonSocket
```

| Scenario | Measured |
|---|---|
| Second instance while the primary is healthy | `got=false` after 5 ms. The primary received `second-instance` before the secondary's call returned. |
| Primary SIGKILLed, then relaunch | A stale `SingletonLock` was left on disk. The next instance acquired the lock in 1 ms and rewrote all three symlinks. |
| Primary SIGSTOPped, so alive but wedged, then relaunch | The newcomer blocked for **20,007 ms**, then got the lock, and **the incumbent was gone afterwards**. |

The third row is the finding. `kTimeoutInSeconds` is 20, after which `KillProcessByLockPath()` sends
SIGKILL to the incumbent. A wedged Tortie is killed by the newcomer after a 20-second dock bounce,
with no `before-quit` and no snapshot pass. For this product that is closer to a feature than a
hazard, because sessions live in tmux and the newcomer inherits them. It must be written down in the
same commit anyway, because a mysterious 20-second CI stall is the shape this behaviour takes when it
surprises someone.

Two further facts about the lock. It is keyed on the userData directory, which is why the
implementation now in the tree exempts harness launches. Both `npm run dev` and the packaged app
resolve to `~/Library/Application Support/Tortie` through `applyProcessIdentity()`, and each of the
smoke harnesses passes its own `--user-data-dir`. The lock protects the manifest and it does not
protect the `-L gmux` socket, so it is half the answer to two writers rather than all of it.

**Signals, and the fact that matters most for Need 4.** Measured against a victim Electron app.

| Signal to the main process | Observed |
|---|---|
| `SIGTERM` | `before-quit` fired. `event.preventDefault()` was honoured. 3000 ms of async work ran to completion, then `will-quit`, then `quit`. A Node-level `process.on('SIGTERM')` handler never ran, because Chromium owns the signal. |
| `SIGINT` | Identical to `SIGTERM`. |
| `SIGHUP` | Identical to `SIGTERM`. |
| `SIGKILL` | Nothing. The log ends mid-sentence and the lock is left on disk. |

So `kill <pid>` is a graceful quit in Electron rather than a crash. Any crash-safety harness built on
SIGTERM is testing the happy path. Only SIGKILL is a crash.

Also confirmed, `NSSupportsSuddenTermination` is absent from Electron 43.3.0's `Info.plist`, verified
with `plutil`, so macOS gives the app the polite terminate path at logout within loginwindow's grace
period.

**What four real applications do, since the drafts checked them.** VS Code does not use
`app.requestSingleInstanceLock()` at all. It serves a node IPC handle and becomes a client on
`EADDRINUSE`, and it writes a pid to a lockfile that it never checks for liveness. Its `will-quit`
runs `Promises.settled(joiners)` with no timeout. Its `powerMonitor` use is telemetry plus two
functional consumers of resume, which are a terminal texture-atlas clear and a minimap repaint.
Nothing is saved on suspend, because durability comes from a 1-second debounced backup instead.
Signal Desktop uses the Electron lock and calls `app.exit()` rather than `app.quit()` when it loses,
which is the correct choice, and it places the call after the userData directory is set with a
comment saying why. Logseq uses `.quit` and starts a promise chain in `before-quit` without calling
`preventDefault()`, so nothing awaits it. Obsidian could not be checked, because it is proprietary
and closed source, and the brief's assumption that it could be read is wrong. What is documented
about Obsidian is that its File Recovery plugin keeps whole-file snapshots a minimum of 5 minutes
apart for 7 days, stored outside the vault, and that its own documentation says it is not a complete
backup solution.

**What to build, about 40 lines.** `powerMonitor`, `crashReporter` and `render-process-gone` appear
nowhere in `src`, confirmed by grep. Four items in descending order of value.

1. Finish the single-instance work already in flight and document the 20-second watchdog in the same
   commit.
2. Wire `powerMonitor.on('resume')` to clear the WebGL texture atlas. This is VS Code's
   `terminalNativeContribution.ts` handler and it is six lines. Tortie already holds the pieces,
   because `TerminalPane.tsx` keeps a `webglRef` and already calls `clearTextureAtlas()` on late font
   load at line 342 and on zoom change at line 455. `clearTextureAtlas()` is public API in
   `@xterm/xterm@6`. Calling the same function VS Code calls is assembling rather than
   reimplementing.
3. On resume, force one immediate status tick rather than waiting for the 1 Hz poll, and give a
   `statusPollBusy` latch stranded by a suspended `execFile` a defined recovery point.
4. Close the three kill-path gaps. Start `crashReporter` with `uploadToServer: false` for local
   dumps. Add a `render-process-gone` handler that reloads rather than leaving a dead renderer
   attached to tmux. Write a boot-time unclean-exit sentinel on `whenReady` and delete it in
   `will-quit`.

Do not rewrite the existing `before-quit` flow at `src/main/index.ts:1675`. It already has the
`quitFlowStarted` latch, `preventDefault()`, bounded async teardown, and a second pass that lets a
repeated Command-Q through. That is the VS Code and Signal shape, and it is better than Logseq's
unattached promise chain.

### 3.4 Need 4. Testing crash safety. Verdict BUILD, with no dependency

The reasoning for rejecting Playwright is in section 1.1. The harness design is in section 5,
because the brief asks for it in enough detail to build from.

The short form is that a zero-dependency supervisor was measured working today, and Tortie already
owns the other half of the harness. The `GMUX_SMOKE=<mode>` pattern, with eleven modes each running
under its own `--user-data-dir` and the app driving itself in-process from a mode switch, is exactly
the fault-injection channel Playwright was wanted for, minus the websocket.

### 3.5 Need 5. Multi-stage restore status. Verdict BUILD

**The defect, confirmed by reading three lines.** `restore/restore.ts:277` returns
`{ info, replayed, armedCommand }`. `sessions/core.ts:833` is `const { info } = outcome;` and line
839 writes `status: 'running'`. Both `send-keys` stages are wrapped in `try/catch` blocks that only
call `console.warn`, at `restore.ts:255` to `:260` and `:270` to `:274`. A restore whose scrollback
replay and resume arming both threw is stored, broadcast as `EVT_STATUS_CHANGED` with `running`, and
rendered as a healthy working session.

**The scale of the thing being modelled.** `SessionStatus` has 5 members at `src/shared/types.ts:22`.
There are 36 non-test references across 12 files, and 20 literal `status: '<member>'` writes. There
are 4 `manifest.setStatus()` call sites. The restore pipeline has 5 steps that can fail
independently, and about 14 realistic transition edges in the liveness graph.

**Candidates checked.**

| Package | Latest | Published | Licence | Runtime deps | Unpacked | Alive in 2026 |
|---|---|---|---|---|---|---|
| `xstate` | 5.32.5 | 2026-07-14, with `6.0.0-alpha.36` on 2026-08-12 | MIT | 0 | 2.29 MB, 132 files | Yes |
| `@xstate/store` | 4.2.3 | 2026-08-10 | MIT | 0 | 143 KB | Yes |
| `@xstate/fsm` | 2.1.0 | **2023-06-21** | MIT | 0 | 57 KB | No. Superseded by XState 5. |
| `robot3` | 1.2.0 | 2025-09-20 | BSD-2-Clause | 0 | 28 KB | Marginal. |
| `typescript-fsm` | 1.6.0 | 2025-04-10 | Apache-2.0 | 0 | 31 KB | Marginal. |
| `javascript-state-machine` | 3.1.0 | **2018-07-12** | MIT | 0 | 91 KB | No. Eight years. |

None ships or builds native code, so the signing constraint eliminates none of them. They are
eliminated on fit.

**Do not adopt XState.** Health is not the argument, because XState is alive and would install
cleanly. Four other arguments decide it.

1. The liveness graph is not owned by the app. `SessionStatus` is a projection of observed reality.
   `reconcile()` reads the live tmux server and writes `restorable` or flips back to `running` at
   `manifest/store.ts:819` and `:832`. The activity oracles write `running`, `idle` and
   `needs_input` from what the agent is actually doing. A machine placed here either rubber-stamps
   whatever the reconciler already decided, which is 2.29 MB of ceremony for an assignment, or it
   disagrees with the reconciler, which is a new class of bug in the one subsystem that must not have
   one.
2. The restore pipeline is 5 stages and about 10 edges, all linear. XState's leverage comes from
   hierarchy, parallel regions, delayed transitions, invoked actors and history states. None of those
   is present.
3. This is a typing defect, and XState does not fix typing defects. The bug is that `core.ts:833` was
   allowed to drop two fields. A discriminated union whose failure arms carry no `Session` makes that
   line fail to compile. An actor's output can be ignored just as easily as a plain object's fields.
4. Persisting a library's internal snapshot would put a third party's representation inside the
   recovery format. XState's own documentation warns that a restored state may be incompatible after
   the machine logic changes, and version 5 ships no versioning or migration guidance. That the
   problem is live is not an inference. `xstate@6.0.0-alpha.36`, published the day this was written,
   adds `machineVersions().adaptEvents()` for adapting complete event histories between machine
   versions. A library still designing its state-migration story in 2026 is the opposite of "older
   than this product".

TypeScript discriminated unions with an exhaustive `switch` are not custom code competing with a
library. They are the language feature the library is a heavier alternative to. Both rules point the
same way here.

**What to build. Two unions, not one wider one.** One field is currently being asked to carry two
unrelated facts, which are how the session is behaving right now and how it got here. Flattening
those into one alphabet multiplies states, because a restored-shell-only session that is now working
is both `running` and `restored_shell_only` at the same time. That multiplication is what creates the
temptation to reach for a machine.

```ts
SessionStatus  // unchanged, 5 members, liveness now, owned by reconcile and the oracles
RestoreOutcome =
  | { kind: 'failed';      stage: 'preflight' | 'create'; reason: string }   // NO info field
  | { kind: 'shell_only';  info; replayFailure?: string; armFailure?: string }
  | { kind: 'transcript';  info; armFailure?: string }
  | { kind: 'armed';       info; armedCommand: string }
```

A later M6 arm would be
`{ kind: 'conversation_confirmed'; info; armedCommand: string; confirmedAt: number }`. Derive the
stored `SessionStatus` from the arm rather than assigning it, so that `failed` leaves the row
`restorable` and `running` becomes unreachable from a failed restore by construction. Keep the
exhaustive `switch` without a `default` that `renderer/app/status.ts` already uses, so that adding a
member is a compile error rather than a silent fall-through.

**One extra defect found while measuring, worth folding into the same change.**
`manifest/store.ts:228` declares the runtime list as `readonly SessionStatus[]`. That type accepts a
shorter array, so adding a sixth member to the union and forgetting this list compiles cleanly, and
every row carrying the new status silently degrades to `restorable` on read. Declare the list
`as const` and derive the type from it. The resulting union is byte-identical, so this is a
same-shape substitution to an append-only contract rather than an edit to the alphabet, and the
integrator should be told that explicitly. `RESUME_CAPTURES` at line 245 has the identical shape and
the identical hazard. No validation library is warranted at this boundary, because zod and its peers
buy schema composition that a five-member enum with a documented safe default does not need.

**The restore-intent journal. BUILD, one table.** The requirement is that before `tmux new-session`
runs, Tortie records that a restore of session X was attempted, so that a SIGKILL between stages
leaves evidence the next launch can act on rather than a session that reads healthy or an orphan tmux
session with no manifest row.

| Package | Latest | Published | Deps | Disqualified by |
|---|---|---|---|---|
| `@temporalio/worker` | 1.22.0 | 2026-08-05 | 20 | A Rust native module, and it needs a Temporal server. Disqualified twice. |
| `@dbos-inc/dbos-sdk` | 4.25.14 | 2026-07-30 | 6 | Requires PostgreSQL. A second database for one user. |
| `@restatedev/restate-sdk` | 1.16.5 | 2026-08-11 | 1 | Requires a Restate server process. |
| `effect` | 3.22.1 | 2026-07-30 | 2 | 27.2 MB unpacked. A whole-program paradigm for one journal table. |
| `write-ahead-log` | 0.1.4 | **2024-03-08** | 5 | Two years stale, and it is a file WAL, so it inherits every Need 1 problem instead of solving one. |
| `better-queue-sqlite` | 1.0.7 | **2022-10** | 3 | Dead, and it depends on `sqlite3`, which would put a second SQLite binding in the app. |
| `p-queue` | 9.3.3 | 2026-07-22 | 2 | Alive, but in-memory only, so it offers no durability at all. |

Build it in the manifest, because everything it needs is already there and none of it is generic.
`immediateTransaction` in `db/sqlite.ts` already uses `BEGIN IMMEDIATE` for a documented and observed
reason, which was `SQLITE_BUSY_SNAPSHOT` surfacing as "database is locked" out of `reconcile()`. The
migration runner already applies each step atomically with its bookkeeping row, and migration
`006-restore-attempts` is about 15 lines. better-sqlite3 is synchronous, so the intent row is written
before the first side effect with no `await` and therefore no window, whereas an async journal
library would reintroduce exactly that window. One table in the existing file is inspectable with
`sqlite3 manifest.db 'select * from restore_attempts'` at three in the morning with no product
running, and that last property is the Zen test that nothing in the table above passes.

```sql
CREATE TABLE restore_attempts (
  id INTEGER PRIMARY KEY, session_id TEXT NOT NULL, started_at INTEGER NOT NULL,
  tmux_id TEXT,            -- filled the instant new-session returns
  outcome TEXT,            -- NULL means crashed mid-restore, else RestoreOutcome.kind
  finished_at INTEGER
);
```

`outcome IS NULL` at the next launch is the whole signal. If `tmux_id` is also NULL then no side
effect was taken, and the row is closed as failed. If `tmux_id` is set then a session exists that
must be either adopted or killed, and the `@gmux-id` rule already tells the reconciler which. Bound
the table with a delete on open, or the table grows without limit.

This is where the pragma finding from section 1.1 lands. The intent row and its resolution are the
two commits that get `synchronous=FULL` plus `fullfsync=1`, at a measured 4.24 ms each, with
everything else staying at 0.011 ms. Under `NORMAL` alone those rows survive a SIGKILL, because the
committed frames are in the kernel page cache. They do not survive power loss or a kernel panic
mid-restore, which is precisely the case where the app would wake holding a tmux session it has no
record of creating.

### 3.6 Need 6. Persisting and verifying terminal session state

**ALREADY HAVE IT for layout validation, through tmux.** `#{window_layout}` is checksummed by the
producer and validated by the parser. From `layout-custom.c`, read from current source.

```c
static u_short layout_checksum(const char *layout) {
    u_short csum = 0;
    for (; *layout != '\0'; layout++) {
        csum = (csum >> 1) + ((csum & 1) << 15);
        csum += *layout;
    }
    return (csum);
}
```

It is dumped as `xasprintf(&out, "%04hx,%s", layout_checksum(layout), layout)`. On parse it is
re-read with `sscanf(layout, "%hx,%n", &csum, &n)`, recomputed, and rejected with `"invalid layout"`
on a mismatch. If Tortie ever persists geometry, it should store the string verbatim and hand it back
to `select-layout`, and let tmux reject a corrupted one. Do not parse it. Do not normalise it. Do not
recompute the checksum. The value here is that the producer and the validator are the same eight
lines of ISC C, which are fifteen years older than this product. That meets the Zen criterion exactly
and at zero cost.

Note what tmux does not give you. It persists nothing else. Reading the full 4,377-line `CHANGES`
file found no session-state persistence feature and no sign that one ever existed. The only
`history-file` option saves command-prompt history rather than sessions. The server's state is
process memory plus a unix socket. Tortie's architecture invariant is a bet on process lifetime
rather than on files, and that bet is why Needs 1 and 2 exist at all.

**The negative exemplar, verified from current `master`.** `tmux-resurrect` has 13k stars and an MIT
licence, and it writes its save file like this.

```bash
fetch_and_dump_grouped_sessions > "$resurrect_file_path"
dump_panes   >> "$resurrect_file_path"
dump_windows >> "$resurrect_file_path"
dump_state   >> "$resurrect_file_path"
```

That is a direct `>` redirect followed by three appends. There is no temp file and no rename, and
there is no fsync anywhere. A crash between the first line and the last leaves a partial file under
its final name. The `last` pointer is worse.

```bash
if files_differ "$resurrect_file_path" "$last_resurrect_file"; then
    ln -fs "$(basename "$resurrect_file_path")" "$last_resurrect_file"
```

The symlink is moved when the content differs rather than when the write completed, so a truncated
save is promoted to `last` precisely because truncation makes it differ. This is the most-installed
piece of prior art in this space and it is a worked example of the two failures the sequence in
section 4 is ordered to avoid.

**Verdict.** ALREADY HAVE IT for layout validation. BUILD the rest on Need 1's primitive, because
there is nothing to adopt. Every relevant tool, which includes tmux, zellij, abduco, dtach and
asciinema, is a C or Rust program with no library surface, and the one plugin with real mindshare is
the negative exemplar above. asciinema's cast format is worth reading and its code is GPL-3.0, so it
must not be copied.

---

## 4. The exact durable write sequence

A builder should be able to implement Need 1 from this section alone. Steps 1 to 7 run per artefact.
Step 8 runs once per batch. Steps 9 and 10 run last. Steps 11 to 13 are the read path.

```
per artefact:
  1. body = Buffer.from(text)
     sha  = createHash('sha256').update(body).digest('hex')

  2. tmp  = <dir>/.<stem>.<Date.now().toString(36)>-<randomBytes(4).hex>.part
     The temp file MUST be in the same directory as the final name, because
     rename(2) is only atomic within one filesystem.

  3. fh = await open(tmp, 'wx', 0o600)
     'wx' fails rather than clobbering a stale temp from an earlier crash.

  4. await fh.write(body, 0, body.length, 0)

  5. const st = await fh.stat()
     if (st.size !== body.length) throw
     This step is not optional. On a full volume the write throws ENOSPC and
     every later primitive still returns success, which was measured.

  6. await fh.sync()
     On macOS this reaches fcntl(F_FULLFSYNC) through libuv. Do not try to call
     F_FULLFSYNC yourself and do not add a native module for it.

  7. await fh.close()
     await rename(tmp, <dir>/<stem>.<generation>)

once per batch, after ALL renames have returned:
  8. const dh = await open(<dir>, 'r')
     await dh.sync()
     await dh.close()
     Without this the rename can be lost on power failure. Open the directory
     with 'r'. Opening it with 'w' throws EISDIR. Batch this: one directory
     sync makes every preceding rename into that directory durable, which is
     the difference between 370 ms and 180 ms on the real 43-file workload.

last, and only then:
  9. Write the completion record naming { file, bytes, sha256 }. This is a
     manifest row, committed with the scoped pragmas from section 1.1. It must
     never become durable before step 8 has returned. This is LevelDB's
     SyncDirIfManifest rule, which is that the pointer must not become durable
     before the thing it points at.

 10. Prune older generations, keeping the newest N. Do this only after step 9
     succeeded. Pruning before the record commits reintroduces the single point
     of failure that generations exist to remove. This same pass sweeps stale
     .part files from earlier crashes.

on read:
 11. Read the completion record to find the newest recorded generation.
 12. Verify the byte length first, then the sha256.
 13. On a failure of either, fall back to the next newest generation. If no
     generation verifies, report "no verified snapshot" rather than replaying
     unverified bytes.
```

Three notes on the shape.

- Tortie needs no separate marker file. The SQLite manifest is already the source of truth for
  restore, so a manifest row committed after step 8 is the completion record. That is where Needs 1
  and 2 meet.
- The current fixed temp name `.${sessionId}.tmp` must go. Two capture paths can race on one session,
  because the quit path and the `%exit` path both exist today, and they currently write the same temp
  file.
- The ordering of steps 2, 6, 7, 8 and 9 is what LevelDB, RocksDB, LMDB and SQLite all agree on.
  RocksDB is the strictest of the four, because it calls `fcntl(fd_, F_FULLFSYNC)` unconditionally on
  macOS and returns an error if it fails, including on the directory descriptor. SQLite is the
  loosest, because it passes `fullSync=0` for its directory sync and therefore hits the no-op path
  described in section 3.1, and it ignores the error.

---

## 5. The crash test harness design

This is the largest gap. Of the 29 fault rows in Tortie's own matrix, 20 are exercised by nothing,
and no harness anywhere kills the app. The design below covers 11 of those rows plus one new one.

### 5.1 The supervisor, and the two traps in it

The supervisor is about 40 lines of Node. It was measured working today against a victim Electron app
with handlers on `before-quit`, `will-quit` and `process.on('exit')`.

```json
{"direct-exe":{"spawnedPid":86042,"log":["boot 86042","ready"]}}
```

Four properties were confirmed by that run.

- The spawned pid is the main process. The app logged `boot 86042` and the supervisor spawned 86042,
  so `process.kill(pid, 'SIGKILL')` hits the right process with no driver library needed to tell you
  which one it is.
- SIGKILL ran zero handlers. The log ends at `ready`, with no `before-quit`, no `will-quit` and no
  process exit line. That is the definition of the fault under test.
- Child processes are reaped. `ps` at one second, three seconds and six seconds after killing the
  main pid showed both `Electron Helper` children gone, with nothing orphaned.
- The shim trap is real. Spawning `node_modules/.bin/electron` gave pid 86346 while the app logged
  `boot 86349`, so killing the shim's pid leaves the app running and still writing. Always spawn
  `Electron.app/Contents/MacOS/Electron` directly, or resolve the child before killing.

The second trap is in section 3.3. SIGTERM, SIGINT and SIGHUP all run the full graceful quit in
Electron, including honouring `preventDefault()`. Only SIGKILL is a crash. A harness that uses
SIGTERM is testing the happy path and proving nothing.

### 5.2 The fault-injection channel

Tortie already has it. The `GMUX_SMOKE=<mode>` pattern has eleven modes, each running under its own
`--user-data-dir`, with the app driving itself in-process from a mode switch. Add `GMUX_FAULT=<named
point>` with an advancing counter, and that plus the supervisor is the whole harness. Around 16 call
sites and about 40 lines under `src/main/fault/` are needed, plus a driver of about 250 lines.

Two patterns are worth borrowing.

- From SQLite's own crash tests, use an advancing named fault counter rather than a random timer, so
  that a failure is reproducible by index rather than only by luck. Assert atomicity properties
  rather than exact content.
- From Jepsen, keep the generator, the fault injector and the checker separate, and run the checker
  out of process, so that a checker cannot be corrupted by the same fault it is checking for.

### 5.3 Real faults, with the exact commands

All three were run today and all three reproduced. None needs root and none needs a library.

**A real full disk, producing ENOSPC.** This is the one that matters most, because it is the fault
that publishes a zero-byte file through primitives that all report success.

```bash
S=/tmp/tortie-fault
mkdir -p "$S/mnt"

# 1. Create a 6 MB sparse APFS image.
hdiutil create -size 6m -type SPARSE -fs APFS -volname TortieFault "$S/full.sparseimage" -quiet

# 2. Attach it without showing it in Finder.
hdiutil attach -nobrowse -mountpoint "$S/mnt" "$S/full.sparseimage"

# 3. Fill it. dd stops at ENOSPC by itself.
dd if=/dev/zero of="$S/mnt/ballast" bs=65536

# 4. Point the app at it and run.
GMUX_SMOKE=<mode> ./Electron.app/Contents/MacOS/Electron . --user-data-dir="$S/mnt/profile"

# 5. Tear down.
hdiutil detach "$S/mnt" -quiet
```

Measured on step 3, `dd` transferred 4,784,128 bytes and stopped, leaving 1068 KB reported free by
`df` because of the APFS reserve. A 256 KB write into that volume then failed with `ENOSPC` and left
a zero-byte file on disk. For a fault that must strike while the app is already running, boot the app
on the volume first, then squeeze the remaining space with a ballast file so that the next write
fails at a chosen moment.

**A real permission failure, producing EACCES.**

```bash
mkdir -p "$S/ro"
chmod 500 "$S/ro"      # readable and executable, not writable
# ... run the app against it ...
chmod 700 "$S/ro"      # restore, so cleanup can remove it
```

Measured, a write into that directory returned `EACCES`.

**A read-only volume, producing EROFS.**

```bash
hdiutil attach -nobrowse -readonly -mountpoint "$S/mnt" "$S/full.sparseimage"
```

Measured, a write into that mount returned `EROFS`. This is a different fault from EACCES, because
it fails at the volume rather than at the directory, and code that only handles EACCES will not
handle it.

### 5.4 What was rejected for the harness

| Approach | Reason | Condition that would reopen it |
|---|---|---|
| Playwright `_electron` | `launch` hangs against Electron 43.3.0 and works against 35.7.5 on the same machine, so `app.evaluate()` is unreachable. | Re-test on every Electron major. If `launch` returns, `playwright-core` is the right package rather than `playwright`, and the supervisor is small enough to retire. |
| macFUSE | A kernel extension, which requires Reduced Security boot on Apple Silicon. | Nothing reasonable. This is disqualified for the product's whole lifetime. |
| `DYLD_INSERT_LIBRARIES` fsync interposition | It stops working the moment the hardened runtime is required for notarization, unless `disable-library-validation` is granted, which research 27 section 6.2 deliberately excludes. | Nothing. Naming it and killing it is the point, because it is the obvious trick and it is incompatible with the signing direction already chosen. |
| `mock-fs` and `memfs` | Cannot produce a real `ENOSPC` beneath a native SQLite binding or beneath tmux, because both go through real syscalls. | Nothing. The whole point is to exercise the real syscall path. |
| CrashMonkey | Linux only, and its repository was last pushed in 2022. | Nothing. |
| Jepsen | Alive and excellent, and it needs a cluster. Its separation of generator, nemesis and checker is worth copying without adopting the tool. | Nothing, for a single-user desktop app. |

---

## 6. What Tortie must write itself, and why each is not reinvention

Five things go into the tree. Each is listed with the specific reason it is not the reinvention the
"assemble, never reimplement" rule exists to prevent.

| What | Size | Why this is not reinvention |
|---|---|---|
| The durable write sequence in section 4 | About 70 lines | The rule "prefer a maintained library" presupposes that a library does the job. Five maintained packages were read and all five stop at the same line, and the open issue asking for the missing half has gone six years without a maintainer reply. Writing 70 lines is not competing with a library. It is doing what no library does. |
| The integrity and quarantine policy around SQLite | About 150 lines | The engine is SQLite's and it is already linked. `VACUUM INTO` and `DbVerification` already exist in `migrate/userdata.ts` and have been run against real user data. What is written is the policy of when to check, what to quarantine, and how many copies to keep, and policy is by definition specific to this product. |
| The `powerMonitor` and kill-path wiring | About 40 lines | The mechanisms are Electron's and Chromium's. The 40 lines call `clearTextureAtlas()`, which is the same public API function VS Code calls from the same event. That is assembling. The alternative on offer was a 2017 npm package wrapping signals Chromium has already intercepted. |
| The crash harness | About 40 lines of injection plus a 250-line driver | The incumbent tool does not start against this runtime, measured three times. It is not reinvention if the thing you would have adopted does not run. Half the harness already exists as the `GMUX_SMOKE` pattern the project already trusts for `smoke:t1`, `smoke:t3` and `conformance:resume`. |
| The two restore unions and the `restore_attempts` table | About 30 lines plus a 15-line migration | The defect is that a caller was allowed to drop two fields, which is a typing defect that no runtime library fixes. Discriminated unions are a language feature rather than custom code competing with a package. The journal goes in the manifest because an external journal would be a second durability domain that can disagree with the first, which is the exact failure the journal exists to detect. |

---

## 7. What was rejected, and what would reopen it

| Rejected | Verified state today | Reason | Condition that would reopen it |
|---|---|---|---|
| `write-file-atomic@8.0.0` | ISC, 1 dep, published 2026-05-08, provenance yes, 99.8 M weekly downloads | Meets 2 of 7 requirements. No directory sync, no size verify, no checksum, no generations, no completion record. | Issue #64 being fixed and released, which would still leave four requirements unmet. |
| `atomically@2.1.1` | MIT, 2 deps, published 2026-02-08 | Same gap. `dirname` is used only to create the parent, never to sync it. Its `stubborn-fs` dependency also binds the async `fs.fsync` into a sync wrapper, which is latent rather than live but is a smell in a durability library. | The same fix, with the same remaining shortfall. |
| `fast-write-atomic@0.4.0` | MIT, 0 deps, published 2026-02-13 | The smallest honest one, and it stops in the same place. Its temp name is `.{pid}.{counter}`, which collides across restarts of the same pid. | Nothing. |
| `steno@4.0.2` | MIT, 0 deps, **published 2023-12-26** | No fsync anywhere. It is a write coalescer rather than a durability tool, and it uses a fixed temp name that two processes will corrupt. | Nothing. |
| `@openclaw/fs-safe@0.5.5` | MIT, 0 deps, first published 2026-05-06, **26 versions in 14 weeks**, latest published today | The only package found that does sync the directory. Rejected on age and churn rather than on quality. Its real purpose is path sandboxing. | Still maintained, still MIT, and past 1.0 in a year. The code Tortie writes in section 4 is small enough to swap out then. |
| `lmdb@3.5.6` | MIT, 6 deps, `gypfile:true` and an `install` script | A third native module to rebuild, and a further nested Mach-O to sign in the Developer ID bundle. Kept as design evidence only. | Nothing, unless the app already carries an embedded key-value store for another reason. |
| `proper-lockfile@4.1.2` | MIT, 3 deps, **published 2021-01-25** | Advisory file locking rather than app instancing. Electron already has `requestSingleInstanceLock()`. | Nothing. |
| `electron-single-instance@0.0.2` | **Published 2015-11-10**, 2 versions ever | Abandoned for 11 years. | Nothing. |
| `exit-hook@5.1.0` and `signal-exit@4.1.0` | Alive and well maintained | Both are for synchronous exit hooks. Nothing durability-useful can be done synchronously at exit, and Chromium pre-empts the signals they listen for, which was measured. | Nothing. |
| Litestream v0.5.16 | Apache-2.0, published 2026-08-05, six releases in five months, 14,239 stars, alive and excellent | It is a Go binary. Nested inside `Tortie.app` it must be signed with the same Developer ID and re-notarized on every Litestream upgrade, and a binary installed at runtime cannot be signed inside an already-signed app. The only npm wrapper, `@purecontext/litestream@0.2.5`, does not vendor the binary and tells you to `brew install` it. The shape is also wrong, because it is continuous replication with a supervised sidecar for a 68 KB database that a 0.72 ms `VACUUM INTO` copies whole. | Tortie shipping a signed sidecar process for some other reason, at which point the marginal signing cost changes. |
| LiteFS | Alive | Disqualified twice. It needs a macFUSE kernel extension, and it is a cluster tool. | Nothing. |
| `xstate@5.32.5` | MIT, 0 deps, 2.29 MB, alive | Four reasons in section 3.5, of which the deciding one is that persisting its snapshot would put a third party's internal representation inside the recovery format, and version 6 is still designing its migration story. | Tortie growing a genuinely hierarchical or concurrent state problem, which restore is not. |
| `@temporalio/worker`, `@dbos-inc/dbos-sdk`, `@restatedev/restate-sdk` | All alive | Each requires a server process, and Temporal also ships a Rust native module. | Nothing, for a single-user desktop app. |
| `effect@3.22.1` | MIT, alive, 27.2 MB unpacked | A whole-program paradigm adopted for one journal table. | A deliberate decision to rewrite the main process in it, which is not this phase. |
| `write-ahead-log@0.1.4` | MIT, **published 2024-03-08** | It is a file WAL, so it inherits every Need 1 problem rather than solving one. | Nothing. |
| `better-queue-sqlite@1.0.7` | **Published 2022-10** | Dead, and it depends on `sqlite3`, which would put a second SQLite binding in the app. | Nothing. |
| Playwright `_electron` | `playwright@1.62.1` Apache-2.0, no lifecycle scripts, `playwright-core` has zero dependencies and no `.node` or `.dylib` in the installed tree | `launch` hangs against Electron 43.3.0 and works against 35.7.5 on the same machine. The fault-injection channel does not exist. | `_electron.launch` returning against whatever Electron the app is pinned to. Re-test on every Electron major. |
| A generational SQLite backup library for Node | The field is empty | Searched, and nothing applicable exists. | A serious one appearing. |

---

## 8. Open questions, and what was reasoned rather than verified

Stated plainly, because a survey that hides its gaps is worth less than one that names them.

**Not verified.**

- Whether `npm/write-file-atomic#64` has had any maintainer replies. The state and the dates were
  checked, and the authorship of the 5 comments was not.
- ~~The precise SQLite fault class that makes `quick_check` throw rather than return a row.~~
  **SETTLED BY PHASE 20 on 2026-08-13.** Smashing the cell pointer array on a table's root page makes
  `integrity_check` throw `database disk image is malformed`. See §3.2, which has been corrected.
- The exact Electron major at which Playwright's `_electron.launch` broke. Only two data points are
  established, which are that 35.7.5 works and 43.3.0 does not, on this machine.
- Litestream, LiteFS and macFUSE were rejected on constraints without being installed.
- Obsidian's lifecycle handling. It is proprietary and closed source, so no claim about it would be
  verifiable, and the brief's assumption that it could be read is wrong.
- `@pierre/diffs` provenance was not checked, and the Apache-2.0 NOTICE obligation is currently met
  by accident rather than by design.

**Reasoned rather than measured.**

- The 10 to 15 percent quit-time increase from the durable write sequence is arithmetic over two
  measured numbers, which are 190 ms of added cost and the 0.9 s to 1.9 s quit already documented at
  `snapshots.ts:40`. The combined figure was not measured end to end in the real app.
- The claim that the harness design covers 11 fault-matrix rows plus one new one is a mapping from
  the design onto the matrix rather than a count of passing tests.
- The estimate that the durable write is about 70 lines comes from a working scratchpad prototype
  that implemented the sequence, the generations, the completion record and the verified load with a
  correct fallback past a tampered generation. It was not written against Tortie's own interfaces.

**Open questions for the phase brief to settle.**

1. How many generations to keep. The sequence in section 4 requires more than one and does not say
   how many. Snapshots are 25 KB on average with a 446 KB maximum today, so three generations of 43
   sessions is about 3.6 MB, and that number should be chosen deliberately rather than inherited.
2. Whether the `restore_attempts` table is bounded by row count or by age. Either works. Nobody has
   chosen.
3. What the app does when no generation verifies. Section 4 says report "no verified snapshot" rather
   than replaying unverified bytes, and the user-visible behaviour behind that phrase is undecided.
   The session still exists in tmux, so this is a display question rather than a data-loss question.
4. `/usr/bin/sqlite3` cannot be pinned, because it is Apple's build and Apple moves it. The recovery
   path must therefore tolerate a version change, and the acceptance test for it should assert on the
   recovered content rather than on the exact shell output.
5. Whether the single-instance lock's 20-second watchdog should be documented only, or also surfaced
   to the user. A 20-second dock bounce with no explanation is the worst of the available options,
   and nobody has decided between the other two.
