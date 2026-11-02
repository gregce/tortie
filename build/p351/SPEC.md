# Phase 351 — "can we also please address this issue?" — no Intel-only code in the app (issue 43) — SPEC

Written by the spec step on 2026-11-02 in `/private/var/tmp/tortie-wt/wt-p351`, a detached worktree at origin/main
`e81c8ff7` ("docs(backlog): queue 351, no Intel-only code in the app, and 350's ruled round"). **`git diff e81c8ff7`
in the worktree must be exactly Phase 351's delta.** The charter is `docs/BACKLOG.md` "## Phase 351" (line 44133) and
issue 43 by Sean Johnson (belucid). His standing rulings bind: no regression against today; just enough words;
nothing released, tagged, version-bumped, signed, notarized or uploaded without his word. Between 0.113.0 (`f1103aee`,
the version the issue reports) and `e81c8ff7` the packaging inputs did not move: `electron-builder.yml`,
`build/after-pack.cjs` and `build/sign-nested-binaries.cjs` are byte for byte the same, `package.json` gained one
probe script, and the lockfile holds better-sqlite3 13.0.3, node-pty 1.1.0, Electron 43.3.0, electron-builder 26.15.3
and @parcel/watcher 2.6.0 at both. So the parent package measured here is the issue's bundle, unsigned.

| | |
| --- | --- |
| Subject | `fix(package): leave the Intel-only native modules out of the app` |
| First body line | `Phase 351: no Intel-only code in the app (issue 43)` |
| Semver | Patch, unreleased, Mac only, released on his word |
| Lane | Build: Spec → Build (ONE builder) → Verify → [Fix → Reverify] → Commit |
| Tier | **2**, and why: nobody sees it in use and it moves no state, but it changes what the signed bundle carries, and a native file the app loads that went missing would stop every session and the manifest. Two independent methods: the parent measured, and the gate attacked (§10) |
| Menus | **No change.** No user-facing surface is added, renamed or removed |
| Contract | **No change.** No channel, env name, storage key or smoke mode; `docs/audits/contract-baseline.txt` does not move, and no new `GMUX_` token may appear in any `build/*.mjs`, `build/*.cjs` or `package.json` (the inventory sweeps those) |
| `HELPER_USER_FLOOR` | **Unchanged.** Nothing new reaches `build/electron-run.mjs` |
| CHANGELOG | One item under `## Unreleased`, `### Fixed` (§7.3) |

## 0. The hard rules, stated once (builder, verifier, fixer, reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p350*`.
- Scratch lives under `/private/var/tmp/tortie-wt/scratch/p351/<role>/`, never under `/private/tmp`, which macOS cleans.
- `-L gmux` is named only by `build/electron-run.mjs`'s read-only census; no command of yours names it; never edit
  `electron-run.mjs`. A census finding naming a session your run did not make is his own activity: note it, run once
  more.
- PACKAGE ONLY UNSIGNED: `CSC_IDENTITY_AUTO_DISCOVERY=false`, `-c.mac.identity=null`, a scratch `HOME`, and every
  signing and notarization variable unset (§9.1 has the exact `env -u` line). Never `stapler`, `notarytool`, `spctl`
  against Apple, `build/notarize-local.mjs`, `verify-signed.mjs --expect-notarized`, or `--publish` anything but
  `never`.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his live Tortie profile, or `/Applications/Tortie.app` (never read it, never launch it).
- His shell history is never written by us: every command that does not launch an Electron runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. `/bin/ps` will not start under it (measured:
  "operation not permitted"), so the one Electron count at the end runs outside it. Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run that starts the app or a shell.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started; every process you start
  ends in a `finally`. Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` with a
  scratch profile, HOME and socket. **The packaged app is `program: 'packaged'`** (the release app of the checkout whose
  `electron-run.mjs` you import) **or an absolute path**; `program: 'app'` is the development Electron
  (`node_modules/electron/dist/Electron.app`), per the helper's own header. The computed task text said `'app'`; the
  header wins.
- No agent runs: the app run starts shell sessions only, and `build/hidden-agents.mjs`'s `writeHiddenAgents(profile,
  prefix, hiddenAgentsBesides([]))` hides every agent row first. Never run `smoke:remote` or `smoke:machines`. Never
  import a `build/` script to inspect it (read it as text); importing `electron-run.mjs` and `hidden-agents.mjs` to
  USE them is how every probe launches.
- The lock has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p351 <role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>`, from a `trap` so it
  is released whatever happens. Every package build, smoke and app run holds one. `df -h /` before any package; under
  8 GB free, wait and report.

## 1. The answer first

1. **Three Intel-only files ship, not two, and none is loaded** (M1, M2). The parent package carries 30 Mach-O files:
   27 arm64 and three x86_64-only, being the issue's two and **`node-pty/prebuilds/darwin-x64/spawn-helper`** (9,248
   bytes, mode 0644, no extension), which the issue's `find` cannot see because it is neither executable nor named
   `.node` or `.dylib`. The running packaged app maps `better-sqlite3/prebuilds/darwin-arm64.node`,
   `node-pty/build/Release/pty.node` and `@parcel/watcher-darwin-arm64/watcher.node`, and no other `.node` file.
2. **The issue's own check is blind where every package lands.** Its `grep -v arm64` drops whole lines, so over
   `release/mac-arm64/Tortie.app` it prints nothing at the parent; run from inside `release/mac-arm64` with relative
   paths it prints exactly the issue's two lines (§2.1). No proof in this phase uses it at a path holding `arm64`.
3. **The fix is two `files` exclusions in `electron-builder.yml`** (§5), chosen by M3: on a package of this tree with
   only those two lines, exactly the 15 prebuild files that are not `darwin-arm64` are gone (16,446,432 bytes: the
   three Intel-only Mach-O, four Linux ELF and eight Windows PE), every other file of the bundle is byte identical by
   sha256 except `app.asar` (its header, and the tree's `-dirty` build stamp) and the asar hash in `Info.plist`, the app
   still maps the same three native files, and the issue's command prints nothing.
4. **The gate is `build/assert-arm64-only.mjs`, `npm run gate:arm64`** (§6): every Mach-O file in a packaged bundle,
   found by its first bytes and never by its name, mode or path, must hold an arm64 slice, and each one that does not
   is named. `build/after-pack.cjs` calls it FIRST, before the hook writes or signs anything, so every package build in
   every lane (§2.4: two npm scripts, the update rehearsal and all four CI workflows, none of which needs an edit)
   fails before electron-builder signs, notarizes, cuts the DMG and ZIP or publishes. It also runs alone on any bundle
   named on its command line, e.g. the app inside a mounted DMG. Every invocation proves its reader first, on three
   planted bundles holding 41 fixtures, and 34 ablations, each red on every fixture it names (22 and 17 before the
   fix round, "§As built" → "The fix round").

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | The `files` exclusion, not an afterPack deletion | The entry's mechanism 1 says pick by measurement. M3: the globbing removes exactly the 15 files and nothing else moves. A deletion in `after-pack.cjs` would run after the asar is packed, and the parent's asar header lists all 15 as `unpacked` entries (measured), so it would leave 15 dangling header entries; it would also be new writing code inside the hook the SEAL WARNING guards |
| D2 | The extglob form, one line per module, saying "every prebuild that is not darwin-arm64" | A platform a module upgrade adds stays out with no edit (new). Measured with electron-builder's own minimatch 10.2.6 and `{ dot: true }` before the package (§2.3). If a later electron-builder stops reading extglobs, the Intel files come back and the gate fails the package; the ELF and PE files come back silently, as dead weight only (§11) |
| D3 | Keep `build/Release`, `bin/` and every `darwin-arm64` file of both modules | Mechanism 2: never remove a file the app loads. node-pty's loader tries `build/Release` first (`lib/utils.js:17-38`) and the app maps `build/Release/pty.node`; `prebuilds/darwin-arm64/` stays as that loader's fallback. Removing node-pty's or @parcel/watcher's unused arm64 copies is not this phase (entry: no change to which native modules ship) |
| D4 | The gate reads bytes, never names, modes or paths | The entry's "found by its magic number rather than its name"; and M1 measured why both alternatives fail: a name-and-mode filter misses the Intel `spawn-helper`, and a path filter on `arm64` hides everything under `release/mac-arm64/` |
| D5 | The gate is the first statement of the afterPack hook after its darwin check | "Fails before anything can be signed or published" (entry): `platformPackager.js:245` emits afterPack, `:255` signs after it, `macPackager.js:318` notarizes and `:281` cuts the DMG and ZIP later still. First rather than after `renameHelpers`, because a read-only refusal belongs before every write the hook makes (new) |
| D6 | Every invocation runs the self-test first, the afterPack one included; `npm run build` does not change | The house rule that a gate proves it can fail on every run (as `conformance:harnessprobes` does). Running it at the point of use puts it in every package in every lane, gates.yml on every push among them, without editing the shared build line Phase 350 may also touch (new) |
| D7 | No workflow edit | M4: all six packaging call sites run electron-builder with this repository's `electron-builder.yml`, whose `afterPack` key is the only hook config; none passes `--prepackaged` or a `-c.afterPack` override |
| D8 | ESM `.mjs`, dynamically imported by `after-pack.cjs`; the CLI detects itself by realpath | The entry's suggested name; `build/before-pack.cjs` already imports `build-tmux.mjs` the same way. Realpath, because `/var` is a symlink to `/private/var` on macOS, and `build-tmux.mjs`'s plain `process.argv[1] === fileURLToPath(import.meta.url)` would then do nothing and exit 0 when run through a `/var/...` path, which for a gate is a silent pass |
| D9 | No committed probe | Tier 2, and the app run is the verifier's (§10.3); a committed probe would add a `gate:electron` population, a classification and a CLAUDE.md row for a one-off measurement (as Phase 335 decided) |
| D10 | `gate:arm64` is classified `pure` | Node alone; it spawns nothing; its only write is its planted bundle under the system temporary directory, removed in a `finally` |
| D11 | The CHANGELOG item is the entry's, verbatim | The entry drafted it; it is still true with three files ("only Apple silicon code") |

## 2. What the spec step measured, how, and the numbers (M1 to M4)

Everything ran under the history block except the two app runs, which launch an Electron (history unchanged across
both, §14). The scripts and logs stay under `/private/var/tmp/tortie-wt/scratch/p351/spec/` (`bin/`, `logs/`).

### 2.1 M1: the parent packaged, and what it carries

The parent is `/private/var/tmp/tortie-wt/wt-p351-parent`: `git clone --local --no-checkout /Users/gdc/gmux`, then
`checkout --detach e81c8ff7`, then `cp -Rc` of `node_modules` and `build/vendor` from `wt-p351`. **It and its package
are kept for the verifier**: `/private/var/tmp/tortie-wt/wt-p351-parent/release/mac-arm64/Tortie.app` (unsigned, `--dir`,
built 2026-11-02 12:32). Packaged by `bin/package.zsh` (§9.1's env), `npm run package:dir -- -c.mac.identity=null`
under a lock slot: exit 0 in 30 s, `skipped macOS code signing reason=identity explicitly is set to null`; the
`@electron/rebuild` step rebuilt nothing (every `.node` in `node_modules` kept its September mtime, because each
`build/Release/.forge-meta` reads `arm64--148`). **The Electron 43.3.0 zip was downloaded once from GitHub** (122,102,881
bytes, sha256 `ee939d15…`, byte for byte the copy in his own cache) into the scratch `HOME`'s `Library/Caches/electron`:
`@electron/get` 5.1.0 takes its cache from `HOME` (`env-paths`), so the `ELECTRON_CACHE` the wrapper also set was read by
nothing. The M3 package found the zip there (its modification time stayed 12:32:21); each package, cache hit or not,
also fetches Electron's small `SHASUMS256.txt` to check the zip. §9.1 seeds every later role's scratch `HOME` from it,
so the zip is not downloaded again.

**The issue's command, both ways.** Over the app's absolute path (`find /…/release/mac-arm64/Tortie.app …`): nothing,
pipeline exit 1, because every line holds `mac-arm64`. From inside `release/mac-arm64` (`find Tortie.app …`, relative
paths): exactly

```
x86_64	Tortie.app/Contents/Resources/app.asar.unpacked/node_modules/node-pty/prebuilds/darwin-x64/pty.node
x86_64	Tortie.app/Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/darwin-x64.node
```

**Every file by its first bytes** (`bin/inventory.mjs`, the spec step's own reader) and, independently, **`lipo -archs`
over all 843 regular files**: both find 30 Mach-O files, 27 arm64 and 3 x86_64, no fat file; 17 symlinks, every one
relative and inside the bundle (the frameworks' `Versions/Current` links and `skills-cli/node_modules/.bin`); 4 ELF
and 8 PE files; 2,169 files packed INSIDE `app.asar`, none of them Mach-O (`bin/asar-scan.cjs`); du 488,596 KB.

| Prebuild file under `Contents/Resources/app.asar.unpacked/node_modules/` | Bytes | Kind | Ships at the parent | Loaded |
| --- | ---: | --- | --- | --- |
| `better-sqlite3/prebuilds/darwin-arm64.node` | 1,980,736 | Mach-O arm64 | yes | **yes** |
| `better-sqlite3/prebuilds/darwin-x64.node` | 1,982,880 | **Mach-O x86_64** | yes | no |
| `better-sqlite3/prebuilds/linux-arm64.node` | 2,066,328 | ELF | yes | no |
| `better-sqlite3/prebuilds/linux-x64.node` | 2,226,168 | ELF | yes | no |
| `better-sqlite3/prebuilds/linuxmusl-arm64.node` | 2,312,112 | ELF | yes | no |
| `better-sqlite3/prebuilds/linuxmusl-x64.node` | 2,435,680 | ELF | yes | no |
| `better-sqlite3/prebuilds/win32-arm64.node` | 1,903,104 | PE | yes | no |
| `better-sqlite3/prebuilds/win32-x64.node` | 1,989,632 | PE | yes | no |
| `node-pty/prebuilds/darwin-arm64/pty.node` | 85,496 | Mach-O arm64 | yes | no (fallback) |
| `node-pty/prebuilds/darwin-arm64/spawn-helper` | 50,480 | Mach-O arm64, 0644 | yes | no |
| `node-pty/prebuilds/darwin-x64/pty.node` | 52,864 | **Mach-O x86_64** | yes | no |
| `node-pty/prebuilds/darwin-x64/spawn-helper` | 9,248 | **Mach-O x86_64, 0644, no extension** | yes | no |
| `node-pty/prebuilds/win32-arm64/{conpty,conpty_console_list,pty}.node` | 302,592; 122,368; 293,376 | PE | yes | no |
| `node-pty/prebuilds/win32-x64/{conpty,conpty_console_list,pty}.node` | 312,320; 134,656; 303,104 | PE | yes | no |
| `node-pty/build/Release/pty.node`, `spawn-helper` | 86,504; 50,512 | Mach-O arm64, 0755 | yes | **yes** (`pty.node`; the helper is spawned from the same folder, `lib/unixTerminal.js:27-31`) |
| `node-pty/bin/darwin-arm64-148/node-pty.node` | 86,504 | Mach-O arm64 | yes | no |

The win32 folders also hold `.dll`, `.exe` and `.pdb` files in `node_modules`; electron-builder drops those on a mac
build by default (`app-builder-lib/out/util/appFileCopier.js:127-139`), so only their `.node` files ship.

### 2.2 M2: the parent's packaged app, run, and what it maps

`bin/m2-run.zsh` → `node build/harness-socket.mjs gmux-p351m2 'node bin/m2-probe.mjs <checkout> <report>'` from the
parent checkout, with `TMPDIR` and `HOME` under the spec scratch and `ZDOTDIR`/`HISTFILE` unset, under a lock slot.
The probe imports the parent's own `build/electron-run.mjs` and `build/hidden-agents.mjs`, writes the hidden-agents
file for every probed row, and runs `withElectron({ program: 'packaged', … })` twice on one profile: `GMUX_SMOKE=create`
(its `tmuxSocket: null`, so the teardown leaves the session for the next leg) and `GMUX_SMOKE=verify` (its
`tmuxSocket` the scratch socket, so the census runs and the teardown ends the server). While each leg runs it reads
`lsof -n -P -p <pid> -Fn` of the app and every descendant every 100 ms, and one `vmmap -wide <appPid>` after the leg's
second smoke line.

| Leg | Exit | The smoke's own lines | Native files the app maps (lsof, first seen; vmmap agrees) |
| --- | --- | --- | --- |
| create | 0 | `2/5 session created: "smoke-keeper"`, `3/5 term data flowing: 611 bytes`, `5/5 PASS (create)` | `node-pty/build/Release/pty.node` and `@parcel/watcher-darwin-arm64/watcher.node` at 483 ms, `better-sqlite3/prebuilds/darwin-arm64.node` at 938 ms |
| verify | 0 | `3/6 manifest row reconciled to running`, `4/6 re-attach works: 726 bytes`, `6/6 PASS (verify)` | the same three, at 274, 274 and 453 ms |

No `darwin-x64`, `linux` or `win32` path was mapped by any process in either leg. No census finding was printed; no
`p351` socket file was left under `/private/tmp/tmux-501/`. Wall 3 s for both legs.

### 2.3 M3: the `files` exclusion on a package of this tree, with only that change

In a separate clone (`/private/var/tmp/tortie-wt/scratch/p351/spec/m3-tree`, from the parent clone, at `e81c8ff7`, the
same `node_modules` and `build/vendor`; `wt-p351` itself was never edited), the two lines of §5 were inserted before
`extraResources:` and nothing else changed (`git diff --stat`: `electron-builder.yml | 3 +++`, the third line a
comment). First, electron-builder's own matcher, `minimatch` 10.2.6 from `app-builder-lib`'s resolution with
`{ dot: true }` (`out/fileMatcher.js:14`), over the module paths: the better-sqlite3 line excludes every
`prebuilds/*.node` but `darwin-arm64.node`; the node-pty line excludes every file under a `prebuilds/` folder not named
exactly `darwin-arm64` (a `darwin-arm64-extra/` folder is excluded too); `build/Release/*` and `bin/*` are kept. Then
packaged exactly as M1: exit 0 in 29 s.

- **What remains**: `better-sqlite3/prebuilds/darwin-arm64.node`; `node-pty/prebuilds/darwin-arm64/{pty.node,
  spawn-helper}`; `node-pty/build/Release/{pty.node,spawn-helper}` and `bin/darwin-arm64-148/node-pty.node`. No empty
  `darwin-x64` or `win32-*` folder is created.
- **File by file against the parent** (`bin/compare.mjs`, sha256 of every regular file, every symlink target): 860
  entries → 845. Only in the parent: exactly the 15 non-`darwin-arm64` prebuild files, 16,446,432 bytes. Only in M3:
  none. Differing: exactly two, `Contents/Resources/app.asar` (96,476,541 → 96,472,571 bytes; its header 644,364 →
  640,388 bytes, the 15 `unpacked` entries gone) and `Contents/Info.plist` (same size; one line, the
  `ElectronAsarIntegrity` hash `f7e09d6f…` → `dce8d9f6…`). Inside the asar, 2,169 packed files in both and one
  differing, `out/main/index.js`, in one string: `BUILD_COMMIT = "e81c8ff7"` → `"e81c8ff7-dirty"`, because the M3 tree
  had an uncommitted change. That is the tree's state stamp, not the fix; HEAD's package will carry the same `-dirty`
  until the commit.
- **Both readers** over the M3 bundle: 828 regular files, 27 Mach-O, all arm64, no ELF, no PE; du 473,520 KB.
- **The issue's command** from inside `release/mac-arm64`: nothing (pipeline exit 1).
- **The M3 package run** exactly as M2 (`logs/m2-m3.json`): create exit 0 (614 bytes), verify exit 0 (726 bytes), the
  same three `.node` files mapped and no other.

**Prediction for HEAD.** The builder changes no `src/`, so HEAD's `--dir` package (an uncommitted tree, so
`e81c8ff7-dirty` too) should equal M3's package byte for byte, every regular file by sha256: the gate only reads, the
yml comment is not shipped, and the `package.json` inside the asar is electron-builder's trimmed copy with no `scripts`
at all (1,684 bytes against the repository's 37,478; `bin/asar-pkg.cjs`), so the new npm script does not reach the
bundle. Any difference is something beyond the two lines, and the verifier names it.

### 2.4 M4: where every package build runs, and where the gate fails it

| Call site | Command | When | afterPack runs | Before |
| --- | --- | --- | --- | --- |
| `package.json:317` `package` | `electron-vite build && … && electron-builder --mac --publish never` | by hand; `build/update-rehearsal.mjs:663,673` runs it twice | yes | signApp, DMG, ZIP |
| `package.json:318` `package:dir` | `… && electron-builder --mac --dir` | by hand | yes | signApp |
| `.github/workflows/gates.yml:59` | `npx electron-builder --mac --dir -c.mac.identity=null` | every pull request and push to main | yes | the packaged basic smoke at `:60` |
| `.github/workflows/durability.yml:74` | `npx electron-builder --mac --publish never -c.mac.identity=null` | nightly | yes | DMG, ZIP, the packaged smoke |
| `.github/workflows/compat.yml:61` | the same | weekly, on macos-26 | yes | DMG, ZIP, the packaged smoke |
| `.github/workflows/release.yml:145` | `npx electron-builder --mac --publish never -c.mac.notarize=true -c.publish.*` | `v*` tags | yes | Developer ID signing, notarization, staple, DMG, ZIP, `verify-signed` at `:197`, the draft at `:229` |

electron-builder 26.15.3 orders a mac pack as: files copied and the asar packed, extraResources copied, then
`emitAfterPack` (`app-builder-lib/out/platformPackager.js:245`), then fuses and `doSignAfterPack` (`:255`, `signApp`
at `:334`), then notarization (`macPackager.js:318`) and the DMG and ZIP (`:281`). A throw in afterPack ends the run
before all of it, and in `release.yml` a failed step stops the job, so no later step (the DMG ticket, the release gates,
the attestation, `gh release create`) runs. No call site passes `--prepackaged` or a `-c.afterPack` override
(`grep` over `package.json`, `.github` and `build/*.{mjs,cjs}`); `build/notarize-local.mjs` works on an already-built
`release/` and packages nothing. **No workflow needs an edit.**

## 3. The tree at this head, re-read

| What | Where, at `e81c8ff7` |
| --- | --- |
| The hook config | `electron-builder.yml:77` `afterPack: build/after-pack.cjs`; `:78-162` `files`, whose last entry is `- "!node_modules/@ungap/**"` at `:162`; `:163` `extraResources:`; `:328-341` `asarUnpack` (`"**/*.node"` at `:329`); `:342` `npmRebuild: true`; `:400`, `:402` `arch: [arm64]` for both targets |
| The hook | `build/after-pack.cjs`: header `:1-46` (SEAL WARNING `:15-21`; "the three things" `:2-8`, which already omits `assertMainRequires`), `exports.default` `:55`, darwin check `:56`, then `renameHelpers` `:57`, `signNestedBinaries` `:58`, `assertMainRequires` `:64`, `assertSkillsCli` `:68` |
| The ESM-from-CJS precedent | `build/before-pack.cjs:39-40`, `await import('./build-tmux.mjs')` |
| Existing Mach-O magic readers | `build/sign-nested-binaries.cjs:298-313` `isMachO` (five magics, no `cafebabf`, a Java class reads as Mach-O; used for the skills tree), `build/build-tmux.mjs:312-318` (the same set), `build/p316/test-ios.mjs:340-343` (`MACH_O`, `machOFiles`) and `:628-667` (`entitlementSections`, iOS slices). **None reads a CPU type**, so the gate needs its own reader; none is changed or consolidated here (§13) |
| node-pty's loader | `node_modules/node-pty/lib/utils.js:17-38` (`build/Release`, `build/Debug`, `prebuilds/<platform>-<arch>`, each relative to `..` then `.`); `lib/unixTerminal.js:27-31` (the helper is `native.dir + '/spawn-helper'`, `app.asar` → `app.asar.unpacked`); `lib/index.js:51` loads it at import |
| better-sqlite3's loader | `node_modules/better-sqlite3/lib/binding.js:41-50` `getPrebuildPath`: `prebuilds/<platform>-<arch>.node` when it exists, else `build/Release/better_sqlite3.node`; its `build/Release` holds stamps and no `.node` |
| The node_modules matcher | `app-builder-lib/out/fileMatcher.js:177-212` (`getNodeModuleFileMatcher` keeps only the `!` patterns of `files` and prepends `**/*`), `out/util/filter.js` (`minimatchAll`), `out/util/NodeModuleCopyHelper.js:47-161` (each file's relative path is `node_modules/<name>/…`), `out/asar/unpackDetector.js` (a module holding a `.node` is unpacked whole) |
| Scripts | `package.json:317-318` `package`, `package:dir`; `:320-331` the `gate:*` scripts, `gate:menu-accelerators` last at `:331`; `postinstall` runs `electron-rebuild -f -w node-pty,better-sqlite3` |
| Classification | `build/verification-checks.mjs:1197-1199` `pure('gate:menu-glyphs')`, `pure('gate:menu-accelerators')`, `pure('assert:doctypes')`; `gate:checks`' families `build/assert-hermetic-checks.mjs:170` |
| CLAUDE.md | the path-triggered table's last row, `gate:contract`, at `:360`; the "Some gates run inside `npm run build`" sentence at `:298` (not edited, D6) |
| The release checklist | `docs/research/27-release-and-updates.md` §3.7, step 4 "Verify the bundle … off the mounted DMG" (`:810-814`) |

## 4. Where the entry, the issue or the task is wrong or stale at this head

1. **"Exactly two Intel-only files."** Three (§2.1): node-pty's `darwin-x64/spawn-helper` is Intel-only Mach-O too.
   The fix removes the whole `darwin-x64` folder, so it goes with the other two.
2. **"His check … prints nothing on a fixed app."** It also prints nothing on the broken app at
   `release/mac-arm64/Tortie.app`, where every package build puts it (§2.1). A proof that uses it runs it from inside
   `release/mac-arm64` with relative paths, or over a copy at a path with no `arm64` in it. The DMG is blind the same
   way: it mounts at `/Volumes/Tortie 0.113.0-arm64`, so over the parent's DMG the command prints nothing at the
   volume's absolute path and the two lines only from inside the volume (the verifier's nit, measured again in the
   fix round).
3. **"No `build/Release` in this tree"** (better-sqlite3): the folder exists and holds only node-gyp stamps and no
   `.node`; the conclusion stands, and the app maps `prebuilds/darwin-arm64.node` (§2.2).
4. **"The fix keeps exactly those"** (mechanism 2): the fix keeps the loaded files AND every other `darwin-arm64` or
   `build/` or `bin/` file of both modules (D3); it removes only prebuilds that are not `darwin-arm64`.
5. **"No change to which native modules ship … unless the packaged app loads something other than its `darwin-arm64`
   file."** node-pty loads `build/Release/pty.node`, the arm64 copy `postinstall`'s `electron-rebuild` compiles, not
   its `darwin-arm64` prebuild. It is arm64 and correct, so nothing about how modules ship or are rebuilt changes.
6. **The computed task's `program: 'app'`** for the packaged app: wrong by the helper's own header (§0).
7. **"The release checklist can point it at the app inside a downloaded DMG."** No Mac release checklist file exists
   beyond research 27 §3.7 step 4; the gate's command line takes any bundle, and pointing that step at it is the main
   session's to put to him (§12).

## 5. The mechanism: two lines in `electron-builder.yml`

Insert at the END of the `files` list, after `- "!node_modules/@ungap/**"` (`:162`) and before `extraResources:`,
exactly these two entries and a comment in the file's house shape. The two pattern lines are the M3 lines byte for byte;
the comment's wording is the builder's, but it must say: why (issue 43, the three Intel-only files, two of them named
by the issue), that none is loaded and what is (§2.2), that `!(…)` is minimatch's extglob as electron-builder 26.15.3
reads it (D2), and that `build/assert-arm64-only.mjs`, run from `build/after-pack.cjs`, fails the package if Intel-only
code comes back by any route.

```yaml
  - "!node_modules/better-sqlite3/prebuilds/!(darwin-arm64.node)"
  - "!node_modules/node-pty/prebuilds/!(darwin-arm64)/**"
```

Nothing else in `electron-builder.yml` changes: not `asarUnpack`, not `npmRebuild`, not `signIgnore`, not the targets.

## 6. The gate: `build/assert-arm64-only.mjs`

### 6.1 The module

ESM, Node built-ins only (`node:fs`, `node:path`, `node:os`, `node:url`). It spawns nothing, follows no symlink,
writes nothing but its planted fixture bundle under `os.tmpdir()` (removed in a `finally`), and names no `GMUX_`
token anywhere, comments included. Its header says, in the house shape: why it exists (issue 43, the three files, the
two blind spots of the issue's command), what it asserts (the clauses of §6.2), where it runs (afterPack first; alone
on a named bundle; `npm run gate:arm64`), how to point it at the app inside a DMG (`hdiutil attach -nobrowse -readonly
<dmg>`, run it on `/Volumes/<name>/Tortie.app`, `hdiutil detach`), and its limits (§11).

Exports, exactly these:

| Export | Does |
| --- | --- |
| `CPU_TYPE_ARM64` | `0x0100000c` |
| `readMachO(path)` | One file's verdict from its bytes: `{ macho: false }`, `{ macho: true, archs: string[] }`, or `{ macho: true, unreadable: string }` |
| `judgeBundle(app)` | Walks one bundle: `{ files, symlinks, machO, executable, offenders: [{ path, holds }] }`, `path` relative to the bundle, offenders sorted by path |
| `selfTest()` | Builds the planted bundles (§6.5), judges them with the shipped rules and then under each ablation (§6.6), removes them in a `finally`: `{ fixtures, ablations, skipped: string[], problems: string[] }` |
| `assertArm64Only(app)` | `selfTest()`, then `judgeBundle(app)`; throws one `Error` whose message names every problem or offender; returns `{ machO, files, fixtures, ablations }` |

The ablations reach the reader and the walker through an internal rules object that only `selfTest()` swaps; the
CLI, `assertArm64Only` and every export above use the shipped rules, and no flag, argument or environment variable can
select an ablated rule.

### 6.2 The clauses (each fixture and each ablation names the clause it owns)

| Clause | The rule |
| --- | --- |
| **R1** thin | A file whose first four bytes are `cf fa ed fe` or `ce fa ed fe` (little-endian on disk) or `fe ed fa cf` or `fe ed fa ce` (big-endian) is a one-architecture Mach-O; its `cputype` is the 32-bit word at offset 4 and its `cpusubtype` at offset 8, in the magic's byte order |
| **R2** fat | `ca fe ba be` (20-byte entries) or `ca fe ba bf` (32-byte entries), big-endian: `nfat_arch` at offset 4, entries from offset 8: `cputype`, `cpusubtype`, then `offset` and `size` as 32-bit words (`be`) or 64-bit words (`bf`, `size` at entry offset 16) |
| **R3** not Mach-O | A `ca fe ba be`/`bf` file shorter than 8 bytes, or whose `nfat_arch` is 0 or above 30, is not Mach-O (libmagic's rule: a Java class file shares the magic and carries its version there, 61 for Java 17); so is any file shorter than 4 bytes or with any other first bytes |
| **R4** unreadable | A thin file too short to hold its `cpusubtype` (under 12 bytes), a fat table that runs past the end of the file, a slice whose `offset + size` runs past it, that is too short to hold its `cpusubtype` or that does not begin with an R1 magic, or a 64-bit offset or size above `Number.MAX_SAFE_INTEGER` (the builder's B2 and B3), is Mach-O-shaped and unreadable, and is NAMED, never skipped |
| **R5** arm64 | A Mach-O passes when one of its slices has `cputype` exactly `0x0100000c` (arm64 and arm64e). Nothing else passes: `0x01000007` x86_64, `7` i386, `0x0200000c` arm64_32, `18` ppc. `holds` names every slice: `arm64`, `arm64e` (subtype low byte 2), `x86_64`, `i386`, `arm64_32`, `arm`, `ppc`, `ppc64`, else `cputype 0x…` |
| **W1** walk | Every regular file in every folder under the bundle at any depth, dot-named ones included (`readdirSync(…, { withFileTypes: true })`); symlinks are counted and never followed or judged, because every target inside a Tortie bundle is a regular file walked in its own right (§2.1); other entry types are skipped |
| **W2** bytes only | A file's verdict comes from its bytes alone: its name, extension, mode, size and path play no part. (The issue's `find` judged by name and mode and missed `spawn-helper`; its `grep` judged by path and hid every line under `mac-arm64`) |
| **W3** fail closed | A file or folder the gate cannot open or read is named, `unreadable: <code>` |
| **F1** a bundle | At least one regular file directly in `<bundle>/Contents/MacOS/`, not below it and not in a nested app's, reads as Mach-O; otherwise the bundle is refused, "no Mach-O in Contents/MacOS: not an app bundle, or the walk saw none of it". A gate that judged nothing has not passed |

Reading: at most the first 4,096 bytes, plus the fat table and each slice's first four bytes by positioned reads.

### 6.3 What it prints, and exits with

- Self-test, green: `[arm64-only] self-test: <n> fixtures read as written, <m> ablations each red on the clause it
  breaks` (plus one `skipped:` line per fixture or arm skipped, §6.5).
- A bundle, green: `[arm64-only] <bundle>: <machO> Mach-O files of <files>, every one holds arm64 code`.
- A bundle, red: `[arm64-only] <bundle>: <k> of <machO> Mach-O files hold no arm64 code, and macOS warns about an app
  that carries Intel-only code:`, one line per offender `  <holds>  <path>`, then `Leave each out of the package
  (electron-builder.yml, files) or ship an arm64 build of it.`
- The CLI: `node build/assert-arm64-only.mjs [<bundle>]`. No argument: the self-test alone. One argument: the self-test,
  then that bundle. Exit 0 when green; 1 for any offender, an F1 refusal or a self-test problem; 2 when the argument
  names nothing or not a directory (one sentence saying so). It runs its main only when
  `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)` (D8).

### 6.4 The call in `build/after-pack.cjs`

The first statement after `if (context.electronPlatformName !== 'darwin') return;`, before `renameHelpers(context)`:

```js
  const { assertArm64Only } = await import('./assert-arm64-only.mjs');
  const arm64 = assertArm64Only(
    join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  );
  console.log(`  • after-pack: ${arm64.machO} Mach-O files, every one holds arm64 code`);
```

with a comment above it in the file's voice: Phase 351, issue 43; it only reads; it is first so a package with
Intel-only code stops before this hook writes or signs anything and before electron-builder signs, notarizes, cuts the
DMG and ZIP or publishes; it throws. The header's numbered list gains it as the first step, and the sentence it heads
names the true count (five: refuse Intel-only code, the rename, the nested signing, the main requires, the skills CLI),
because the header already undercounts by one. Nothing else in the file changes.

### 6.5 The planted fixtures (the entry's four, the hostile shapes M1 found, and the fix round's nineteen)

`selfTest()` makes `mkdtempSync(join(tmpdir(), 'tortie-arm64-'))` and inside it three bundles. **The fixtures write
the format's bytes themselves** (every magic, entry size and cputype is spelled in the fixture code, never taken from
the reader's constants), so a constant broken in the reader is not broken in step in the bytes it reads (the fix
round, after the verifier's A3). Byte shapes: **thin64** = 32-byte `mach_header_64` (`0xfeedfacf`, cputype,
cpusubtype, filetype 8, zeros) padded to 64 bytes, little-endian unless stated; **thin32** = 28-byte `mach_header`
(`0xfeedface`) padded to 64; **fat32** / **fat64** = the R2 header and entries, each slice a thin64 of its cputype at
offsets 4096, 8192 …, `size` 64, `align` 12, unless the row says otherwise.

| # | Path in its bundle (`Fixture.app` unless named) | Bytes | Mode | Expected, exactly | Owns |
| --- | --- | --- | --- | --- | --- |
| f1 | `Contents/MacOS/Fixture` | thin64 arm64 | 755 | pass | R1, F1 |
| f2 | `Contents/Frameworks/Lib.framework/Versions/A/Lib` | thin64 arm64e (subtype 2) | 755 | pass | R5 |
| f3 | `Contents/Frameworks/Lib.framework/Lib` | symlink → `Versions/A/Lib` | — | not judged | W1 |
| f4 | `Contents/Resources/app.asar.unpacked/node_modules/m/prebuilds/darwin-x64.node` | thin64 x86_64 (subtype 3) | 644 | `x86_64` | R1, R5, W1 |
| f5 | `…/node_modules/m/prebuilds/darwin-x64/spawn-helper` | thin64 x86_64 | 644 | `x86_64` | W2, W1 |
| f6 | `Contents/Resources/release/mac-arm64/intel.node` | thin64 x86_64 | 644 | `x86_64` | W2 |
| f7 | `Contents/Resources/universal.node` | fat32 [x86_64, arm64] | 644 | pass | R2, R5 |
| f8 | `Contents/Resources/universal64.dylib` | fat64 [x86_64, arm64] | 755 | pass | R2 |
| f9 | `Contents/Resources/intel-fat.node` | fat32 [x86_64] | 644 | `x86_64` | R2 |
| f10 | `Contents/Resources/old.dylib` | thin32 little-endian i386 | 644 | `i386` | R1 |
| f11 | `Contents/Resources/watch.dylib` | thin64 arm64_32 (`0x0200000c`) | 644 | `arm64_32` | R5 |
| f12 | `Contents/Resources/ppc.dylib` | thin32 big-endian ppc (18) | 644 | `ppc` | R1 |
| f13 | `Contents/Resources/Big.class` | `ca fe ba be 00 00 00 3d` + 56 bytes | 644 | pass (not Mach-O) | R3 |
| f14 | `Contents/Resources/linux.node` | `7f 45 4c 46 02 01 01 00` + 56 bytes | 644 | pass | R3 |
| f15 | `Contents/Resources/win.node` | `4d 5a 90 00` + 60 bytes | 644 | pass | R3 |
| f16 | `Contents/Resources/notes.txt` | text | 644 | pass | R3 |
| f17 | `Contents/Resources/empty.node` | 0 bytes | 644 | pass | R3 |
| f18 | `Contents/Resources/short.node` | `cf fa ed fe 0c 00` | 644 | `unreadable: a thin header under 12 bytes` | R4 |
| f19 | `Contents/Resources/badfat.node` | fat32, entry 1 arm64 at an offset past the end and never written, entry 2 a valid x86_64 slice | 644 | `unreadable: slice 1 runs past the end of the file` | R4 |
| f20 | `Contents/Resources/link-to-intel.node` | symlink → `app.asar.unpacked/node_modules/m/prebuilds/darwin-x64.node` | — | not judged; f4 named once | W1 |
| f21 | `Contents/Resources/locked.node` | thin64 arm64, then `chmod 000` | 000 | `unreadable: EACCES` | W3 |
| f22 | `Empty.app/Contents/Resources/readme.txt` | text | 644 | the bundle refused by F1 | F1 |
| f23 | `Contents/Resources/intel-fat64.node` | fat64 [x86_64] | 644 | `x86_64` | R2 |
| f24 | `Contents/Resources/armv7.dylib` | thin32 little-endian arm (12, subtype 9) | 644 | `arm` | R1, R5 |
| f25 | `Contents/Resources/ppc64.dylib` | thin64 big-endian ppc64 (`0x01000012`) | 644 | `ppc64` | R1 |
| f26 | `Contents/Resources/three.node` | `cf fa ed` | 644 | pass | R3 |
| f27 | `Contents/Resources/shortfat.node` | `ca fe ba be 00 00` | 644 | pass | R3 |
| f28 | `Contents/Resources/nfat0.node` | `ca fe ba be`, nfat_arch 0, `01 02 03 04` | 644 | pass | R3 |
| f29 | `Contents/Resources/nfat30.node` | `ca fe ba be`, nfat_arch 30, one x86_64 entry, 28 bytes | 644 | `unreadable: its fat table runs past the end of the file` | R3, R4 |
| f30 | `Contents/Resources/nfat31.node` | `ca fe ba be`, nfat_arch 31, zeros to 64 bytes | 644 | pass | R3 |
| f31 | `Contents/Resources/cut-slice.node` | fat32 [x86_64, arm64], the file cut 16 bytes into the arm64 slice (its magic and cputype there) | 644 | `unreadable: slice 2 runs past the end of the file` | R4 |
| f32 | `Contents/Resources/short-slice.node` | fat32 [x86_64, arm64 of `size` 8, in bounds, beginning with its magic] | 644 | `unreadable: slice 2 is too short to hold its cpusubtype` | R4 |
| f33 | `Contents/Resources/no-magic.node` | fat32 [x86_64, arm64 of 64 zero bytes, in bounds] | 644 | `unreadable: slice 2 does not begin with a Mach-O magic` | R4 |
| f34 | `Contents/Resources/far.node` | fat64 [arm64 at offset 2^60, never written] | 644 | `unreadable: slice 1's offset or size is above Number.MAX_SAFE_INTEGER` | R4 |
| f35 | `Contents/Resources/big intel.node` | thin64 x86_64 extended to 16 MiB (`truncateSync`, sparse: 4,096 bytes allocated on APFS, measured) | 644 | `x86_64` | W2 |
| f36 | `Contents/Library/d01/…/d40/deep.node` (40 folders) | thin64 x86_64 | 644 | `x86_64` | W1 |
| f37 | `Contents/Resources/.cache/.intel.node` | thin64 x86_64 | 644 | `x86_64` | W1, W2 |
| f38 | `Contents/Resources/locked` | a folder holding a thin64 x86_64 `intel.node`, then `chmod 000` | 000 | `unreadable: EACCES` | W3 |
| f39 | `Nested.app/Contents/MacOS/launcher` | 0 bytes | 755 | the bundle refused by F1 | F1 |
| f40 | `Nested.app/Contents/MacOS/bin/helper` | thin64 arm64 | 755 | pass | F1 |
| f41 | `Nested.app/Contents/Resources/Inner.app/Contents/MacOS/Inner` | thin64 arm64 | 755 | pass | F1 |

The suite holds the verdict of EVERY file EXACTLY (pass, or the exact `holds` string, an unreadable reason included),
the exact sorted offender list of every bundle (`Fixture.app`'s: f4, f5, f6, f9, f10, f11, f12, f18, f19, f21, f23 to
f25, f29, f31 to f38), `Fixture.app`'s counts (34 regular files, 2 symlinks, 24 read as Mach-O, 22 offenders: f21
and f38 cannot be opened, so each is an offender and not a Mach-O count), F1's acceptance of `Fixture.app` and its
refusal of `Empty.app` and `Nested.app`, and that no bundle judged a path no fixture planted. When
`process.getuid() === 0`, f21 and f38 are not planted and X16 and X31 are not run, each said on a `skipped:` line,
because root opens a mode-000 file or folder; the counts are then 33, 2, 24 and 20. The bundles are removed in a
`finally` (f21's and f38's modes restored first). The entry's four (x86_64-only, arm64-only, universal, not Mach-O)
are f4, f1, f7 and f14.

### 6.6 The ablations (in memory, every invocation; each must turn red EVERY fixture it names)

| Arm | Clause | The rule broken | Reddens |
| --- | --- | --- | --- |
| X1 | R1 | the 64-bit little-endian magic (`cf fa ed fe`) not recognised | f1, f4 |
| X2 | R1 | the 32-bit big-endian magic (`fe ed fa ce`) not recognised | f12 |
| X3 | R1 | a little-endian `cputype` read big-endian | f1, f4 |
| X4 | R2 | the fat magic `ca fe ba be` not recognised | f9 |
| X5 | R2 | `ca fe ba bf` read with 20-byte entries | f8 |
| X6 | R3 | the `nfat_arch` bound removed | f13 |
| X7 | R4 | a slice that runs past the end of the file read on | f19, f31 |
| X8 | R4 | a thin file too short read as not Mach-O | f18 |
| X9 | R5 | any Mach-O passes | f4, f11 |
| X10 | R5 | every slice must be arm64 | f7 |
| X11 | R5 | the ARM family by the low byte (`(cputype & 0xff) === 12`) | f11, f24 |
| X12 | W1 | no descent below two levels | f4, f5 |
| X13 | W1 | symlinks followed | f3, f20 |
| X14 | W2 | only `.node`, `.dylib` or an execute bit judged (the issue's `find`) | f5 |
| X15 | W2 | a path holding `arm64` skipped (the issue's `grep`) | f6 |
| X16 | W3 | an unreadable file skipped | f21 (skipped under root) |
| X17 | F1 | the bundle check removed | f22, f39 |
| X18 | R1 | the 64-bit big-endian magic (`fe ed fa cf`) not recognised | f25 |
| X19 | R1 | the 32-bit little-endian magic (`ce fa ed fe`) not recognised | f10, f24 |
| X20 | R2 | the fat magic `ca fe ba bf` not recognised | f23 |
| X21 | R3 | `nfat_arch` 0 read as fat | f28 |
| X22 | R3 | the `nfat_arch` bound lowered by one | f29 |
| X23 | R3 | the `nfat_arch` bound raised by one | f30 |
| X24 | R4 | a slice too short to hold its cpusubtype read on | f32 |
| X25 | R4 | a slice that does not begin with a Mach-O magic read on | f33 |
| X26 | R4 | a 64-bit offset above `Number.MAX_SAFE_INTEGER` read on | f34 |
| X27 | R5 | 32-bit ARM (`cputype` 12) passes | f24 |
| X28 | W1 | descent stopped one folder above the deepest fixture | f36 |
| X29 | W2 | a file over 1 MiB skipped | f35 |
| X30 | W2 | a dot-named file or folder skipped | f37 |
| X31 | W3 | an unreadable folder skipped | f38 (skipped under root) |
| X32 | F1 | any Mach-O satisfies F1 | f39 |
| X33 | F1 | `Contents/MacOS` matched anywhere in the path | f39 |
| X34 | F1 | a Mach-O below `Contents/MacOS` counts | f39 |

An arm passes when every fixture it names reads wrongly under it; an arm that leaves any of them reading as written
is a self-test problem naming the arm and the fixture. Every fixture an arm names must own the arm's clause, checked
on every run; an arm naming a fixture that is not planted (under root) is skipped and says so. Each rule an arm breaks
is a member of the internal rules object (`sliceBounds`, `sliceMin`, `sliceMagic`, `wideBound`, `unreadableFile`,
`unreadableFolder` and `executableAt` joined it in the fix round, splitting `sliceChecks` and `failClosed`).

## 7. Classification, npm script, CLAUDE.md, CHANGELOG

### 7.1 `package.json` and `build/verification-checks.mjs`

- `package.json`: `"gate:arm64": "node build/assert-arm64-only.mjs",` directly after `"gate:menu-accelerators"`
  (`:331`). The `build` script does NOT change (D6).
- `build/verification-checks.mjs`, directly after `pure('gate:menu-accelerators'),` (`:1198`), with a comment in the
  house shape (PHASE 351, what it holds, where it runs, what it never does):

```js
  pure(
    'gate:arm64',
    'node and the repository install; it writes its planted fixture bundles under the system temporary directory and removes them in a finally, spawns nothing, and reads a packaged .app only when one is named on its command line',
    'never skips; with no bundle named it runs its fixtures and ablations alone, and an argument that names no directory exits 2 with the reason'
  ),
```

### 7.2 CLAUDE.md: one row

In the path-triggered table, directly above the `gate:contract` row (`:360`), in the table's one-line shape:

| `electron-builder.yml`'s `files`, `asarUnpack` and `extraResources`, `build/after-pack.cjs`, `build/assert-arm64-only.mjs`, a native dependency in `package.json` | `gate:arm64` | ~0.17 s, spawns nothing; it also runs inside every package build | Every Mach-O file in the packaged app holds arm64 code (Phase 351, issue 43): read by its first bytes, never its name, mode, size or path, so node-pty's Intel `spawn-helper` is caught and a path holding `arm64` hides nothing; `build/after-pack.cjs` runs it first, before anything is signed, in every lane that packages, and it runs alone on any `.app` named on its command line. Its 41 fixtures and 34 ablations run on every invocation, each ablation red on every fixture it names, and the fixtures write the format's bytes without the reader's constants |

The `~0.1 s` was this spec's guess: the builder measured 0.13 s at 22 fixtures and 17 ablations, and the fix round
0.17 s at 41 and 34 (five runs, 0.165 to 0.169 s). The sentence "Some gates run inside `npm run build`…" does not
change.

### 7.3 CHANGELOG.md

Under `## Unreleased`, after the `### Added` list, a new `### Fixed` heading and this one line, verbatim from the entry,
with NO commit link (the follow-up docs commit that writes the running-log line adds it):

```
- macOS no longer warns that Tortie includes a component that will not work with a future version of macOS: the app now carries only Apple silicon code. Reported by [Sean Johnson](https://github.com/belucid) in [#43](https://github.com/gregce/tortie/issues/43)
```

## 8. Files, and the one builder

**One builder owns every file below.** Nothing else is edited. `docs/BACKLOG.md` belongs to no builder (the landing
commits write it).

| File | Change |
| --- | --- |
| `electron-builder.yml` | §5: two `files` entries and their comment |
| `build/assert-arm64-only.mjs` | NEW, §6.1 to §6.3, §6.5, §6.6 |
| `build/after-pack.cjs` | §6.4: the call first, and the header's list |
| `package.json` | §7.1: the `gate:arm64` script |
| `build/verification-checks.mjs` | §7.1: the `pure('gate:arm64', …)` entry and its comment |
| `CLAUDE.md` | §7.2: one table row |
| `CHANGELOG.md` | §7.3: `### Fixed` and its item |
| `build/p351/SPEC.md` | the builder appends "§As built — 351 (the builder, <date>)": every file, every decision that moved from this spec and why, every command with its exit code, wall time and numbers, the history stats, and what it could not run |

Not touched, and the builder says so: `build/sign-nested-binaries.cjs` (its `isMachO` answers a different question),
`build/verify-signed.mjs`, `build/before-pack.cjs`, every `.github/workflows/*.yml` (D7), `src/`, `package-lock.json`,
`node_modules/`, `docs/audits/contract-baseline.txt`, `build/electron-run.mjs`, `build/assert-electron-teardown.mjs`,
`build/hidden-agents.mjs`, `DEVELOPMENT.md`, `BUILD-STATUS.md`, `docs/research/`.

## 9. What the builder runs (it launches no app, runs no smoke, runs no agent)

### 9.1 The unsigned package, exactly

Under a lock slot (released from a `trap`), `df -h /` first, under the history block, from `wt-p351`. Seed the role's
scratch `HOME` and toolset cache once, so nothing downloads: `mkdir -p <scratch>/home/Library/Caches && cp -Rc
/private/var/tmp/tortie-wt/scratch/p351/spec/home/Library/Caches/electron <scratch>/home/Library/Caches/` (the Electron
zip, §2.1) and `cp -Rc /private/var/tmp/tortie-wt/scratch/p351/spec/caches/electron-builder <scratch>/eb-cache` (the DMG
toolset, needed by the full package only). Then:

```sh
env -u CSC_LINK -u CSC_KEY_PASSWORD -u CSC_NAME -u CSC_INSTALLER_LINK -u CSC_INSTALLER_KEY_PASSWORD -u CSC_KEYCHAIN \
    -u APPLE_ID -u APPLE_APP_SPECIFIC_PASSWORD -u APPLE_TEAM_ID -u APPLE_KEYCHAIN_PROFILE -u APPLE_KEYCHAIN \
    -u APPLE_API_KEY -u APPLE_API_KEY_ID -u APPLE_API_ISSUER -u GH_TOKEN -u GITHUB_TOKEN -u ZDOTDIR -u HISTFILE \
    HOME=<scratch>/home CSC_IDENTITY_AUTO_DISCOVERY=false npm_config_update_notifier=false \
    ELECTRON_BUILDER_CACHE=<scratch>/eb-cache \
    npm run package:dir -- -c.mac.identity=null > <scratch>/logs/package.log 2>&1
```

The log prints `downloaded label=electron progress=100%` even on a cache hit, because `@electron/get` fetches Electron's
small `SHASUMS256.txt` to check a cached zip (`node_modules/@electron/get/dist/index.js`, `validateArtifact` after
"Cache hit"); the proof that the zip itself was not fetched again is its modification time in the seeded cache not
moving, which the role reads before and after. `/private/var/tmp/tortie-wt/scratch/p351/spec/bin/package.zsh` is the
spec step's form of it with the lock around it (it also set an `ELECTRON_CACHE` that nothing reads). The full DMG and
ZIP form (the verifier's battery) is the same with `npm run package --`.

### 9.2 The commands, in order (record each exit code, wall time and printed line)

1. `npm run typecheck` → 0.
2. `npm run build` → 0, with `gate:contract` reporting no diff.
3. `npm run gate:arm64` → 0, its self-test line naming 22 fixtures (21 under root) and 17 ablations (16 under root);
   since the fix round, 41 fixtures (39 under root) and 34 ablations (32 under root).
4. `npm run gate:checks` → 0 (the new script classified both ways).
5. `npm test` under a scratch `HOME` → 0 (nothing under `src/` moved; once, whole).
6. §9.1 → 0. The log shows `after-pack: 27 Mach-O files, every one holds arm64 code` BEFORE the first
   `after-pack: CFBundleName` line, and `skipped macOS code signing` after it. Then over
   `release/mac-arm64/Tortie.app`: the prebuild listing equals §2.3's "What remains"; the issue's command, run from
   inside `release/mac-arm64`, prints nothing; `bin/compare.mjs` (or the builder's own) against the M3 package
   (`/private/var/tmp/tortie-wt/scratch/p351/spec/m3-tree/release/mac-arm64/Tortie.app`) finds no difference (§2.3's
   prediction), and any difference is named.
7. `node build/assert-arm64-only.mjs /private/var/tmp/tortie-wt/wt-p351-parent/release/mac-arm64/Tortie.app` → exit 1
   naming exactly the three files of §2.1 with `x86_64`; over HEAD's package → 0.
8. `node build/assert-arm64-only.mjs /private/var/tmp/tortie-wt/scratch/p351/builder` → 1 (F1), and over a path that
   does not exist → 2.
9. A ten-line duplicated-block scan over the touched files; `git diff e81c8ff7 | grep -o 'GMUX_[A-Z0-9_]*' | sort -u`
   prints nothing new; `git diff e81c8ff7 --stat` names only §8's files.
10. Remove the builder's own `release/` and `out/` from `wt-p351` only if it made them and the verifier does not need
    them; say which.

## 10. Verification: Tier 2 (the verifier; then the reverifier on any fix)

### 10.1 The gates, once each

`npm run typecheck`, `npm run build`, `npm test` under a scratch `HOME`, `npm run gate:checks`, `npm run gate:arm64`,
and the battery: `npm run package -- -c.mac.identity=null` with §9.1's env (DMG and ZIP, unsigned), `npm run
smoke:t1`, `npm run smoke`, `npm run smoke:t3`, each under a lock slot, PASS lines copied, not inferred from exit codes.

### 10.2 Method 1: the parent measured (the verifier re-derives; it never reads a builder report as proof)

Over the parent's package (kept, §2.1) and HEAD's package (built by the verifier):

- Their own reader of every regular file (`lipo -archs` over all, or one of their own): parent 843 files, 30 Mach-O,
  27 arm64 and 3 x86_64 (the three of §2.1); HEAD 828 files, 27 Mach-O, 0 not arm64, 0 ELF, 0 PE.
- The issue's command from inside each `release/mac-arm64` (relative paths): the parent prints exactly the issue's two
  lines; HEAD prints nothing. (At the absolute path both print nothing, §4.2.)
- `npm run gate:arm64 -- <parent app>` → exit 1 naming exactly three files; `-- <HEAD app>` → 0.
- File by file by sha256, parent against HEAD: exactly the 15 prebuild files of §2.1 gone, and only `app.asar` and
  `Info.plist`'s asar hash otherwise changed; inside the asar only `out/main/index.js`'s `BUILD_COMMIT` (`-dirty` while
  uncommitted). HEAD against the M3 package: identical.
- The DMG: mount HEAD's unsigned DMG read-only (`hdiutil attach -nobrowse -readonly`), run the gate on the app inside
  it (green) and the issue's command from its volume (nothing), then `hdiutil detach`, in a `finally`.

### 10.3 The packaged app run beside the parent's

One run of HEAD's package and one of the parent's, one after the other, each through `build/electron-run.mjs` inside
`build/harness-socket.mjs` (scratch profile, HOME and socket, the hidden-agents file written first, `TMPDIR` under the
verifier's scratch so the profile lands there): `GMUX_SMOKE=create` then `GMUX_SMOKE=verify` on one profile (§2.2's
shape: `tmuxSocket: null` on the first leg so the session survives to the second), and the native files each app maps
read from its pid (`lsof -p` of the app and its descendants while it runs, `vmmap`). Pass: both legs PASS at both
builds; at HEAD the mapped native files are exactly the parent's three; no `darwin-x64`, `linux` or `win32` path is
mapped at either. The verifier writes its own reader of the mappings; the spec step's
`/private/var/tmp/tortie-wt/scratch/p351/spec/bin/m2-probe.mjs` and `m2-run.zsh` may be read as a reference, not
reused as the proof.

### 10.4 Method 2: the gate attacked

1. **Source ablations of their own.** In a `cp -Rc` clone of HEAD (never `wt-p351` itself), break each clause in the
   gate's SOURCE, one at a time (at least R1, R2, R3, R4, R5, W1, W2, W3, F1), run `node build/assert-arm64-only.mjs`,
   and show it red, naming the clause; restore by sha256.
2. **Hostile shapes the builder did not plant**, e.g. an x86_64 `MH_OBJECT` (`.o`) file, a fat file whose arm64 slice
   is itself truncated, a 0-byte file at `Contents/MacOS/Tortie` with no other executable, a bundle path holding
   spaces, a deep path of 40 folders; each judged as §6.2 says.
3. **The real pipeline.** In a clone of HEAD, copy the parent's `node-pty/prebuilds/darwin-x64/spawn-helper` to
   `node_modules/node-pty/build/Release/intel-helper` (a path no exclusion covers) and package unsigned (§9.1): the
   package exits non-zero; the error names `intel-helper` and `x86_64`; no `after-pack: CFBundleName`, no `after-pack:
   signed` line and no `skipped macOS code signing` line follows it, and no DMG or ZIP exists, so it failed before
   anything was signed.
4. **M4, re-read**: every packaging call site of §2.4 still goes through `electron-builder.yml`'s afterPack.

### 10.5 At the end, once

`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct` (outside the history
block, which `/bin/ps` will not start under) lists nothing the run started; no `p351` socket of the run under
`/private/tmp/tmux-501/`; every lock slot released; the history stats before and after. The verdict is typed:
`verdict`, `evidence`, `problems`, with a section of what is not true or not verified.

## 11. Stated limits

1. **On disk only.** A Mach-O packed inside `app.asar` is not a file macOS or this gate sees; 0 of the 2,169 packed
   files is Mach-O (§2.1).
2. **Not archives.** A static library (`!<arch>`) or a Mach-O inside a zip or tarball is not judged; none ships.
3. **Symlinks are not followed.** All 17 in a Tortie bundle point inside it and their targets are walked; a link out of
   the bundle would go unjudged.
4. **arm64 only, on purpose.** A package built for another architecture (`--x64`) fails the gate; Tortie ships arm64
   alone.
5. **The extglob.** If a later electron-builder stops reading `!(…)`, the Intel prebuilds come back and the gate fails
   the package; the ELF and PE ones come back unannounced, as dead weight.
6. **A module's layout can move.** An upgrade that renames or nests better-sqlite3's or node-pty's `darwin-arm64`
   prebuild could be left out by the same lines; every CI lane's packaged basic smoke loads both modules from the
   bundle and would fail at the next push, and the verifier of that upgrade re-measures M2.
7. **macOS's rule is not published.** The gate's rule (a Mach-O with no arm64 slice) is the reporter's check made
   exact; the parent-to-HEAD difference is exactly the three Intel-only files.
8. **Unsigned.** Proven on unsigned packages only, on his ruling; signing writes no new file into the bundle.

## 12. What is NOT in this phase

- No signing, notarization, release, tag or version bump; the signed app is checked in the release lane on his word.
- No Intel or universal build; Tortie stays Apple silicon only.
- No change to which native modules ship, their versions or how they are rebuilt (§4.5); node-pty's unused arm64 copies
  and @parcel/watcher's two unused copies stay.
- No workflow edit, no `npm run build` change, no committed probe, no change to `sign-nested-binaries.cjs` or
  `verify-signed.mjs`, and no consolidation of the three older Mach-O magic readers.
- No edit to the release checklist (research 27 §3.7) or `BUILD-STATUS.md`; the main session asks him whether step 4
  should name `npm run gate:arm64 -- "/Volumes/<dmg>/Tortie.app"`. The case for it is stronger than first written: the
  issue's command is blind at the mounted DMG too (§4.2), and the gate is not.
- Not the phone app.
- No reply on GitHub: the main session asks him before commenting on or closing issue 43. Facts for that reply: three
  Intel-only files, not two (the third is node-pty's `darwin-x64/spawn-helper`, mode 0644, which the issue's `find`
  skips), none loaded, and the issue's `grep -v arm64` hides every line when the app sits under a folder named
  `mac-arm64`, and at the mounted DMG, whose volume is named `Tortie 0.113.0-arm64`.

## 13. Found, not this phase's, owed an entry

1. `DEVELOPMENT.md:134` says `npm run package` is an "electron-builder `--dir` build (unsigned dev packaging stub)"; it
   is `--mac --publish never` (DMG and ZIP) and signs with the login keychain's identity on his Mac.
2. Three older Mach-O magic readers (§3) answer "is it Mach-O" differently: `sign-nested-binaries.cjs` and
   `build-tmux.mjs` miss `ca fe ba bf` and read a Java class as Mach-O. Harmless where they are used today.
3. Dead arm64 weight the app never maps: node-pty's `bin/darwin-arm64-148/node-pty.node` and
   `prebuilds/darwin-arm64/{pty.node,spawn-helper}` (222,480 bytes), @parcel/watcher's `bin/darwin-arm64-148/` and
   `build/Release/` copies (981,824 bytes).

## 14. The spec step's commands, exit codes and numbers

Scripts and logs: `/private/var/tmp/tortie-wt/scratch/p351/spec/` (`bin/package.zsh`, `bin/inventory.mjs`,
`bin/asar-scan.cjs`, `bin/compare.mjs`, `bin/asar-diff.cjs`, `bin/asar-files.cjs`, `bin/asar-pkg.cjs`,
`bin/m2-probe.mjs`, `bin/m2-run.zsh`; `logs/m1-parent-package.log`, `logs/m1-parent-inventory.txt`, `logs/m2-parent.{json,log}`,
`logs/m3-package.log`, `logs/m3-compare.json`, `logs/m3-inventory.txt`, `logs/m2-m3.{json,log}`). Every command but
the two app runs and the final `ps` ran under the history block.

| Step | Command | Exit | Numbers |
| --- | --- | --- | --- |
| history, first | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` | 0 | `742100 1793638187`, `23166 1790702242` |
| the parent | `git clone --local --no-checkout /Users/gdc/gmux …/wt-p351-parent`; `checkout --detach e81c8ff7`; `cp -Rc` of `node_modules` and `build/vendor` | 0 | 2.1 s, 3.5 s, 0.6 s |
| caches | `cp -Rc` of `~/Library/Caches/electron/85f2b742…/` and `~/Library/Caches/electron-builder/dmg-builder@1.2.5` into `spec/caches` | 0 | the Electron 43.3.0 arm64 zip, 122,102,881 bytes, sha256 `ee939d15…`; the zip copy turned out unused (§2.1), the dmg-builder copy is the DMG toolset §9.1 seeds |
| an aside, owned | `build/vendor/specstory/bin/specstory --version` in `wt-p351`, once, with his `HOME`, before every later binary was given a scratch `HOME` | 0 | it printed an "Update Available" box, so it asked the network and may have written its own update-check state under his `HOME`; not inspected, because SpecStory's folder there is a conversation store. No other command of this step that could write under a `HOME` ran with his |
| M1 package | `bin/package.zsh wt-p351-parent …` (lock slot 1) | 0 | 30 s; unsigned; nothing rebuilt; the Electron zip downloaded once into the scratch `HOME` (sha256 `ee939d15…`, the official one) |
| M1 the issue's command | over the app's absolute path; then from inside `release/mac-arm64` | 1; 0 | nothing; the issue's two lines |
| M1 readers | `node bin/inventory.mjs <app> --all`; `lipo -archs` over every Mach-O and then over all 843 files | 0 | 30 Mach-O: 27 arm64, 3 x86_64; 4 ELF, 8 PE, 17 symlinks |
| M1 asar | `node bin/asar-scan.cjs` | 0 | 2,169 packed, 0 Mach-O; 286 unpacked entries, 15 of them non-`darwin-arm64` prebuilds |
| M2 parent run | `zsh bin/m2-run.zsh wt-p351-parent …` (lock slot 1; history before and after unchanged) | 0 | create 0, verify 0; three native files mapped; 0 others |
| M3 matcher | `minimatch` 10.2.6 over 17 module paths | 0 | §2.3 |
| M3 tree and package | `git clone --local` of the parent; the two lines; `bin/package.zsh m3-tree …` | 0 | 29 s |
| M3 against the parent | `node bin/compare.mjs`; `bin/asar-diff.cjs`; `bin/asar-files.cjs`; `plutil` diff; `cmp` of `out/main/index.js` | 0 (the plist `diff` 1, one line) | §2.3: 15 files, 16,446,432 bytes; app.asar and Info.plist; `BUILD_COMMIT` |
| M3 readers | `node bin/inventory.mjs`; `lipo -archs` over all 828 files | 0 | 27 Mach-O, all arm64 |
| the packed `package.json` | `node bin/asar-pkg.cjs` over the parent's asar | 0 | 1,684 bytes, no `scripts`, not the repository's 37,478-byte file |
| M3 run | `zsh bin/m2-run.zsh m3-tree …` (lock slot 1; history unchanged) | 0 | create 0, verify 0; the same three native files |
| node_modules untouched | `stat` of `pty.node`, `darwin-arm64.node`, `watcher.node`, `.forge-meta` in all three trees | 0 | September mtimes in all three |
| 0.113.0 against the parent | `git diff --stat f1103aee e81c8ff7 -- electron-builder.yml build/after-pack.cjs build/sign-nested-binaries.cjs package.json`; the lockfile at both | 0 | one probe script in `package.json`; the same five module versions |
| leftovers | `ls /private/tmp/tmux-501/ \| grep -c p351`; `ps -Ao pid,command` read for `wt-p351` or `scratch/p351` in any command line | 0 | 0 sockets; no process |
| Electrons at the end, once | CLAUDE.md's `ps -Ao pid,ppid,rss,comm \| grep -E …` (outside the history block) | 0 | none of this step's: the bare `Tortie` 70872 is Phase 350's run (its shim 70871 names `wt-p350` and its own profile), 90306 is his installed app, the rest are his other apps' crash handlers |
| locks at the end | `zsh /private/tmp/tortie-ops/lock.sh status` | 0 | this step holds none (slot 1 was taken and released four times; at the end it was Phase 350's) |
| disk | `df -h /` before each package and at the end | 0 | 77 GiB, 75 GiB, 75 GiB free |
| history, last | as first | 0 | `742100 1793638187`, `23166 1790702242`: unchanged at every reading |

## §As built — 351 (the builder, 2026-11-02)

Built in `/private/var/tmp/tortie-wt/wt-p351` at `e81c8ff7`, nothing committed, staged or stashed. Scratch, scripts
and logs: `/private/var/tmp/tortie-wt/scratch/p351/builder/` (`run.zsh`, `package.zsh`, `bin/compare-bundles.mjs`,
`bin/dup-scan.mjs`, `bin/issue-43.sh`, `probe/`, `logs/`). Every command ran under the history block with
`HOME=<scratch>/home` and `npm_config_update_notifier=false`, except the one Electron count at the end. No app was
launched, no smoke run, no agent run.

### Files

| File | What changed |
| --- | --- |
| `electron-builder.yml` | §5's two `files` lines, byte for byte M3's (the two lines hash alike, sha256 `4907b3de…`), after `!node_modules/@ungap/**` and before `extraResources:`, under a twelve-line comment: issue 43, the three Intel-only prebuilds (two named by the issue), the three files the app maps, the extglob as electron-builder 26.15.3 reads it, and the gate as the backstop |
| `build/assert-arm64-only.mjs` | NEW, 789 lines: §6.1's five exports and nothing else exported, R1 to R5, W1 to W3, F1, §6.3's output and exits, the realpath main check, §6.5's 22 fixtures and §6.6's 17 ablations on every invocation |
| `build/after-pack.cjs` | §6.4's call as the first statement after the darwin check, with its comment; the header's list is five steps with the gate first |
| `package.json` | `"gate:arm64": "node build/assert-arm64-only.mjs",` after `gate:menu-accelerators`; `build` unchanged |
| `build/verification-checks.mjs` | §7.1's `pure('gate:arm64', …)` after `pure('gate:menu-accelerators')`, its two strings byte for byte, under a PHASE 351 comment |
| `CLAUDE.md` | §7.2's row directly above `gate:contract`, with `~0.13 s` measured (below) |
| `CHANGELOG.md` | `### Fixed` after `## Unreleased`'s `### Added` list, §7.3's line verbatim, no commit link |
| `build/p351/SPEC.md` | this section |

Not touched, as §8 lists: `build/sign-nested-binaries.cjs`, `build/verify-signed.mjs`, `build/before-pack.cjs`, every
workflow, `src/` (0 files), `package-lock.json`, `node_modules/`, `docs/audits/contract-baseline.txt`,
`build/electron-run.mjs`, `build/assert-electron-teardown.mjs`, `build/hidden-agents.mjs`, `DEVELOPMENT.md`,
`BUILD-STATUS.md`, `docs/research/`. `git diff e81c8ff7 --name-only` names exactly the six tracked files above; the
two untracked are the gate and this SPEC.

### Decisions that moved from the spec, or that it left open

| # | Decision | Why |
| --- | --- | --- |
| B1 | `after-pack.cjs`: the sentence under the list now reads "Steps 1, 3, 4 and 5 live in their own modules …" naming each module's reason, and `renameHelpers`'s comment says "Step 2", not "Step 1" | §6.4's renumbering made both false; no behaviour moves (the spec said nothing else changes, and these two keep the file true) |
| B2 | R4 also names a fat slice whose `size` is under 12 bytes ("too short to hold its cpusubtype"), the thin-file rule applied to each slice, decided from the table without reading more than the slice's first four bytes; X7 removes it with the bounds and magic checks | §10.4's "a fat file whose arm64 slice is itself truncated" could otherwise pass with a tiny in-bounds size; no real slice is under 12 bytes |
| B3 | R4's `Number.MAX_SAFE_INTEGER` check covers a fat64 slice's offset as well as its size | an offset above 2^53 cannot be represented either |
| B4 | `readMachO` THROWS when a file cannot be opened or read; W3 is the walker's, which names it `unreadable: <code>` and does not count it as Mach-O | §6.1 gives `readMachO` three shapes and none is "could not read"; §6.5's counts (f21 an offender, not a Mach-O count) require this split |
| B5 | Files are opened with `O_RDONLY \| O_NOFOLLOW` | W1 held at the open as well as in the walk, should a link replace a file between the two |
| B6 | A subdirectory the walk cannot read is named `unreadable: <code>` (W3); the bundle itself unreadable throws | fail closed for folders as for files |
| B7 | A multi-slice offender's `holds` joins the slice names with a space, as `lipo -archs` does | §6.3 left the separator open |
| B8 | The CLI checks its argument before the self-test; more than one argument exits 2 with a sentence; a stat error other than ENOENT says `cannot be read (<code>)` and exits 2; an unexpected throw exits 1 with its message. Green to stdout, red to stderr, as `assert-menu-accelerators.mjs` does | §6.3 left these open |
| B9 | X13 follows a link to a FILE (realpath, then judges the target under the link's path); no fixture links a folder. It is the one place the file follows a link, over its own planted links | the faithful break of W1 that §6.6 asks for |
| B10 | X12's "two levels": folders at depth 2 or less below the bundle are read (`Contents`, then `MacOS`, `Resources`, `Frameworks`), so f1 is still judged and the deep prebuild folders are not | the reading that keeps F1 out of X12's result |
| B11 | Fixture.app being refused by F1 is a mismatch owned by f1 (R1, F1) | how X1 reddens f1, as §6.6 says |
| B12 | The counts are written down (19, 2, 13, 10; 18, 2, 13, 9 under root), not derived from the fixture table | a fixture added without its count goes red |

### What each ablation reddens (a scratch copy of the gate with a printer appended, `probe/arm-detail.mjs`)

| Arm | Clause | Fixtures it owns that go red | Everything red |
| --- | --- | --- | --- |
| X1 | R1 | f4, f10, f1 | f1, f4 to f11, f18, the list, two counts |
| X2 | R1 | f12 | f12, the list, two counts |
| X3 | R1 | f1, f4, f10 | f1, f2, f4, f5, f6, f10, f11, the list, a count |
| X4 | R2 | f9 | f9, f19, the list, two counts |
| X5 | R2 | f8 | f8, the list, a count |
| X6 | R3 | f13 | f13, the list, two counts |
| X7 | R4 | f19 | f19, the list, a count |
| X8 | R4 | f18 | f18, the list, two counts |
| X9 | R5 | f4, f11 | f4, f5, f6, f9, f10, f11, f12, the list, a count |
| X10 | R5 | f7 | f7, f8, the list, a count |
| X11 | R5 | f11 | f11, the list, a count |
| X12 | W1 | f3, f4, f5 | f2 to f6, the list, four counts |
| X13 | W1 | f3, f20 | f3, f20, the list, four counts |
| X14 | W2 | f5 | f5, f13, f16, the list, two counts |
| X15 | W2 | f6 | f6, the list, two counts |
| X16 | W3 | f21 | f21, the list, a count |
| X17 | F1 | f22 | f22 |

Every arm matches §6.6's "Reddens" column. Under root (a scratch copy with `process.getuid` forced to 0): `21 fixtures
read as written, 16 ablations each red on the clause it breaks`, then `skipped: f21 …` and `skipped: X16 …`, exit 0.
A shipped rule broken in a scratch copy (`cpuOrder` always big-endian): `self-test: 9 problems`, each naming the
clauses its fixture owns, exit 1, and `assertArm64Only` throws one 42-line error.

### §9.2, in order

| Step | Command | Exit | Wall | Lines and numbers |
| --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 18.9 s | import boundaries OK (1434 files, 0 violations); no runtime cycles (0 SCCs); `[shared-types] OK` |
| 2 | `npm run build` | 0 | 47.0 s | `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte`; `[electron-teardown]` 179 reach the helper against a floor of 179; `[background-teardown]` 3 starters; `assert-hermetic-checks: PASS. 276 check scripts`; `[conformance:ios] PASS`; `[gate:onlyadd] PASS`; `[conformance:harnessprobes] PASS` |
| 3 | `npm run gate:arm64` | 0 | 0.2 s | `[arm64-only] self-test: 22 fixtures read as written, 17 ablations each red on the clause it breaks`. Timed separately five times: 0.128, 0.123, 0.124, 0.128, 0.127 s (bare `node`: 0.050, 0.047, 0.047 s), so CLAUDE.md says ~0.13 s |
| 4 | `npm run gate:checks` | 0 | 0.5 s | 276 check scripts classified (275 at `e81c8ff7`), 82 pure |
| 5 | `npm test`, scratch `HOME` | **1** | 57.2 s | 1164 files: 3 failed, 1159 passed, 2 skipped; 21,844 tests: **4 failed**, 21,826 passed, 14 skipped. The four read the live process table through `/bin/ps`: `process-table.native.test.ts` (1), `ps.native.test.ts` (2), `p269-env-names.test.ts` (1, `spawnSync /bin/ps EPERM`). `/bin/ps` is setuid (`-rwsr-xr-x`) and the block refuses it: `sandbox-exec … /bin/ps` → `execvp() of '/bin/ps' failed: Operation not permitted`, exit 71. The three files alone: exit 1, 4 failed, 6 passed. No file under `src/` changed. See "Not run" |
| 6 | §9.1, `package:dir` | 0 | 41.3 s | `df`: 75 GiB free. Slot `electron.lock2`, released from the trap. The seeded zip read 122,102,881 bytes, mtime 1793640741 (12:32:21) before AND after: not fetched again. Log line 577 `after-pack: 27 Mach-O files, every one holds arm64 code`, line 578 the first `after-pack: CFBundleName`, line 587 `skipped macOS code signing  reason=identity explicitly is set to null`; no `[arm64-only]` line, so the module's own main did not run on import |
| 6 | prebuilds in the package | — | — | better-sqlite3: `prebuilds/darwin-arm64.node` only; node-pty: `prebuilds/darwin-arm64/{pty.node,spawn-helper}`, `build/Release/{pty.node,spawn-helper}` (and its `node-addon-api` stamp), `bin/darwin-arm64-148/node-pty.node`. No `darwin-x64*` or `win32-*` folder; the one `linux` folder is `@parcel/watcher/src/linux`, C++ source. §2.3's "What remains", exactly |
| 6 | the issue's command (`bin/issue-43.sh`) from inside each `release/mac-arm64` | 1; 0 | — | HEAD: nothing. The parent: exactly the issue's two lines, tab-separated |
| 6 | HEAD against M3 | 0 | — | `bin/compare-bundles.mjs`: 1,282 entries each, 828 regular files by size, sha256 and mode, 17 link targets, 437 folder modes: **no difference**. The spec's `bin/compare.mjs`: 845 against 845, none. `app.asar` 96,472,571 bytes, sha256 `d3fbf1e4…` in both; `Info.plist` `05978b1f…` in both; asar hash `dce8d9f6…`; `BUILD_COMMIT = "e81c8ff7-dirty"`. (`du`, allocated blocks and not content: HEAD 479,644 KB, M3 469,820 KB, parent 485,908 KB) |
| 7 | gate over the parent's app | 1 | 0.1 s | `3 of 30 Mach-O files hold no arm64 code, …`, then `x86_64` and `better-sqlite3/prebuilds/darwin-x64.node`, `node-pty/prebuilds/darwin-x64/pty.node`, `node-pty/prebuilds/darwin-x64/spawn-helper`, exactly the three of §2.1. The same through `/var/tmp/…` paths (D8): exit 1, the same three |
| 7 | gate over HEAD's app | 0 | 0.1 s | `27 Mach-O files of 828, every one holds arm64 code` |
| 8 | gate over `scratch/p351/builder` | 1 | 0.2 s | `no Mach-O in Contents/MacOS: not an app bundle, or the walk saw none of it` |
| 8 | gate over a missing path; over `package.json` | 2; 2 | 0.0 s | `… names nothing: give the path of a packaged .app.`; `… is not a directory: …` (the second is an extra check) |
| 9 | ten-line duplicated blocks (`bin/dup-scan.mjs`) | 0 | — | 5,721 windows in the touched files against 610 files (the touched ones and every script under `build/`): 0 duplicated |
| 9 | `git diff e81c8ff7 \| grep -o 'GMUX_[A-Z0-9_]*' \| sort -u` | 0 | — | prints `GMUX_`, from an unchanged CONTEXT line (CLAUDE.md's `gate:contract` row, "`GMUX_*`"). On added lines: nothing. In the new gate: 0 |
| 9 | `git diff e81c8ff7 --stat` | 0 | — | 6 files, 58 insertions, 9 deletions, all §8's; untracked: the gate and this SPEC |
| 10 | cleanup | 0 | — | removed `release/` (479,652 KB), `out/` (56,300 KB) and `.tsc/` (27,712 KB, born 13:16:55 inside step 1), all made by this builder; the verifier builds its own package and `out/` (§10.1, §10.2), and a stale `.tsc/` would let its `tsc -b` skip re-checking. `node_modules`' native files kept their September mtimes (`.forge-meta` `arm64--148`) |
| extra | `npm run gate:contract` over the final tree, because this SPEC changed after step 2 | 0 | 1.1 s | `contract-inventory: OK, … byte for byte`; the inventory sweeps `.mjs`, `.cjs` and `.mts` under `build/`, never this `.md` |

At the end, once: the Electron count (outside the block) lists nothing of this run: the bare `Tortie` 90306 (parent
pid 1) and its crashpad 90413 are his installed app, the rest his other apps' crashpad handlers. No `p351` socket
under `/private/tmp/tmux-501/`; every lock slot free; no `tortie-arm64-*` fixture folder left in `TMPDIR`.

History, `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at 12:59:46, 13:16:48, before and after the package, and
13:24:43: `742100 1793638187` and `23166 1790702242` at every reading.

### Not run, and why

- **`npm test` → 0.** Under the history block the four tests that read the live process table cannot pass, because a
  sandboxed process cannot exec the setuid `/bin/ps`; running them outside the block is forbidden (§0). They test
  nothing this phase touched, and the verifier will meet the same four.
- **Root.** Simulated in a scratch copy only.
- **An app run, a smoke, the DMG and ZIP package, signing, notarization**: not the builder's (§9, §10).

### The fix round (the fixer, 2026-11-02)

The verifier answered `needs_work`. The gate judged every real and hostile bundle correctly, but its self-test did not
pin four clauses (major: R4 bounds, W1 depth, W2 size, F1 location; their arms A9, A15, A19, A24, and A23 and A26
beside them) or seven smaller rules (minor: A3, A6, A7, A8, A12, A18, A21). A nit: the issue's command is blind at
the mounted DMG too. All three are fixed here and nothing was dropped. No scenario is worse than the parent: the
reader's verdicts on every real and hostile bundle are unchanged, and HEAD's package is byte for byte what it was.
Work in `/private/var/tmp/tortie-wt/wt-p351`, nothing committed, staged or stashed. Scratch, scripts and logs are in
`/private/var/tmp/tortie-wt/scratch/p351/fixer/` (`bin/`, `logs/`, `probe/`, `attack/`, `hostile/`). Every command ran
under the history block, except the history `stat`s, the final Electron count and the few listed under "Disclosure".

#### Files changed in this round

| File | What changed |
| --- | --- |
| `build/assert-arm64-only.mjs` | 789 → 885 lines. The reader and the walker consult seven new members of the rules object (`wideBound`, `sliceBounds`, `sliceMin`, `sliceMagic`, `unreadableFile`, `unreadableFolder`, `executableAt`), which replace `sliceChecks` and `failClosed`. Every shipped value keeps the rule it replaces, so no verdict moves. The self-test section is rewritten: the fixture byte writers now use literal values, there are 41 fixtures (§6.5) and 34 arms (§6.6), each arm names the fixtures it must turn red, the expected reasons are exact (`prefix` is gone), and the suite reads three bundles. The header's clauses W1, W2, W3, F1 and its self-test paragraph are updated, and two subtype constants only the old writers used are removed. The five exports, the CLI, `assertArm64Only` and the output lines are unchanged except for the counts |
| `CLAUDE.md` | The `gate:arm64` row, in place: `~0.17 s`, "never its name, mode, size or path", "41 fixtures and 34 ablations … each ablation red on every fixture it names, and the fixtures write the format's bytes without the reader's constants" |
| `build/p351/SPEC.md` | §1 item 4, §4 item 2 (the DMG), §6.2 (W1, W2, W3, F1, and R4 naming B2 and B3), §6.5 and §6.6 (new tables), §7.2 (the row and its time), §9.2 step 3, §12 (the DMG, twice) and this section. The builder's §As built tables above are left as measured |

Not touched: every other file of §8, and `electron-builder.yml`, `build/after-pack.cjs`, `package.json`,
`build/verification-checks.mjs` and `CHANGELOG.md`, whose text is still true. `git diff e81c8ff7 --stat` is still
6 files, +58/−9. The CLAUDE.md row was replaced in place, so it is still one line. Untracked: the gate and
`build/p351/`.

#### Decisions, each with where it comes from

| # | Decision | Where it comes from |
| --- | --- | --- |
| FR1 | Nineteen fixtures, f23 to f41 (§6.5). Each is read wrongly by one single break that a self-test of 22 could not see | The verifier's fix list: f24, f28, f31 to f33, f35 to f41 (major and minor). New: f23, f25 to f27, f29, f30 and f34 |
| FR2 | The fixtures spell every magic, entry size and cputype themselves, and never use the reader's constants | The verifier's A3: `FAT_ARCH_64 = 24` was written and read wrongly in step. The same was true of `FAT_MAGIC_64`, `FAT_ARCH` and the CPU types (B4 to B6, B17 to B19 below) |
| FR3 | Every expected reason is exact: f18, f19, f21 and the new R4 and W3 rows | New. A fixture matched by prefix let a break swap one R4 reason for another: A9 turned f19 from "runs past the end" into "does not begin with a magic" and stayed green. The exact text also pins `THIN_MIN` (B11, B12) and makes A11 red through f34 |
| FR4 | Each arm names the fixtures it must turn red, and every named fixture must own the arm's clause. Both are checked on every run. An arm is skipped under root when a fixture it names is not planted, so the `needs` field is gone | The verifier asked to raise §6.6. Naming the fixtures is new: it proves each new fixture is needed, so an edit that blunts a fixture turns the self-test red |
| FR5 | One rules member per rule an arm breaks. `sliceChecks` is split into `sliceBounds`, `sliceMin` and `sliceMagic`, with `wideBound` beside them. `failClosed` is split into `unreadableFile` and `unreadableFolder`. `executableAt` is new | Needed so each new fixture has an arm in memory |
| FR6 | X1, X2 and X4 now break one magic each (they broke two each), X7 breaks the slice bounds alone (it broke all three slice checks), and X18 to X20 break the other three magics alone | FR4. A two-magic arm cannot show that a magic's own fixture is needed. The verifier's A1 (one magic) is mirrored by X19 |
| FR7 | f35 is 16 MiB, extended with `truncateSync`, which is sparse on APFS (4,096 bytes allocated, measured) | The verifier asked for a file over 2 MB. 16 MiB also catches a size cut-off up to 16 MiB, eight times the issue's largest file (1,982,880 bytes), at no disk cost |
| FR8 | f36 is 40 folders below `Contents/Library`, and X28 stops the walk one folder above it | The verifier asked for 16 folders or more. HEAD's deepest files are 9 folders down. A folder no other fixture uses also pins "every folder" (B28) |
| FR9 | One `Nested.app` (f39 to f41) holds a 0-byte `Contents/MacOS/launcher`, an arm64 Mach-O at `Contents/MacOS/bin/helper` and one at `Inner.app/Contents/MacOS/Inner`. X32, X33 and X34 each turn it red | The verifier asked for a third and a fourth bundle. One bundle catches A23, A24 and A26 and the verifier's Zero Exec shape (B30) |
| FR10 | f29 and f30 pin `FAT_ARCH_MAX` at exactly 30 from both sides | New. Lowering the bound would let an Intel-only fat file with more slices pass as not Mach-O (B7, B8) |
| FR11 | `SPEC` §6.5 and §6.6 are replaced in place. The builder's tables are left as measured | The verifier's fix list |
| FR12 | The reader keeps its two table checks and its whole-table read, all three equivalent in today's configuration (B14, B23, B24). Removing both table checks is red (B25) | Not this round's to simplify. The builder wrote them for generality, and no verdict depends on them |

#### The source ablations, run as the CLI over a scratch copy

`node bin/ablate.mjs attack/build/assert-arm64-only.mjs hostile/Hostile\ Bundle.app logs/ablations.json`: exit 0 in
12.4 s, the copy restored by sha256 (`2b8e2583…`, the gate in `wt-p351`) after every arm. Each arm makes one exact
replacement in the source, then runs the copy as the CLI, first alone and then over a copy of the verifier's hostile
bundle (its two locked entries locked again, and their modes restored from a trap). The arms are the verifier's 26,
with the needles re-cut where the fix moved a line, and 42 of the fixer's own.
**68 arms: 64 red, 4 green.**

- **The verifier's 26 are all red.** The four the verifier rated major are red, and each owning fixture is named:
  - A9 is red on f19's exact reason, and f31 reads `pass`;
  - A15 is red on f36;
  - A19 is red on f35;
  - A24 is red on f39, and so are A23 and A26.
  The minor seven are red too: A3 on f8, A6 on f28, A7 on f32, A8 on f33, A12 on f24, A18 on f37 and A21 on f38. A11,
  which the verifier rated equivalent, is now red on f34's exact reason.
- **The fixer's own, red:**
  - B1 to B3: one magic dropped (f25, f4, f12).
  - B4 and B5: the fat magic constants changed (f23, f9).
  - B6: `FAT_ARCH` = 24 (f7).
  - B7 to B10: `FAT_ARCH_MAX` set to 2, 29, 31 and 60 (f29, f29, f30, f30).
  - B11 and B12: `THIN_MIN` set to 8 and 16 (f18).
  - B13: four head bytes.
  - B15 and B16: the 4-byte and 8-byte floors (f26, f27).
  - B17 to B19: the CPU type constants (f1, f4, f24).
  - B20 to B22: `>=`, start-only and an 8-byte slice minimum (f7, f31, f32).
  - B25: both table checks removed (f29).
  - B26 to B28: dot folders, nested `.app` folders and `Contents/Library` skipped (f37, f41, f36).
  - B29: files under 4 bytes skipped (f17).
  - B30: a non-Mach-O file in `Contents/MacOS` counted (f39).
  - B31: arm64e refused (f2).
  - B32 to B34 and B41: fat fields misread (f7, f8).
  - B35: the offenders left unsorted.
  - B37: links neither counted nor followed (f3).
  - B38: arm64_32 named arm64 (f11).
  - B39: a reason reworded (f18).
  - B40: a big-endian cputype read little-endian (f12).
  - B42: the walk capped at 40 folders (f36).
- **Green, each changing no verdict:**
  - B14: 12 head bytes. The table is then read on its own (`readAt(fd, 0, tableEnd)`), so every verdict is the same.
  - B23 and B24: either table check removed alone. They are a redundant pair: with 4,096 head bytes and at most 30
    entries of 32 bytes (968), the second check and the separate read never run unless the file shrinks during the
    read. B25 removes both and is red.
  - B36: `O_NOFOLLOW` dropped. It guards a race in which a file is swapped for a link between the walk and the open.
    The walker never opens a link, so no static fixture can show this.
- **Over the hostile bundle**, every arm left the CLI at exit 1.

#### What each arm turns red in memory (`probe/arm-detail.mjs`, a scratch copy with a printer appended)

The shipped rules: 0 mismatches. Every arm turned red every fixture it names (§6.6's "Reddens" column, exactly).
Several also turned others red, for example X3 (13 fixtures), X9 (13) and X12 (10). f35 measured 16,777,216 bytes
with 4,096 allocated. X26 turns only f34 red, through its exact reason. X32 to X34 turn only f39 red.

#### Commands, in order (exit code, wall time, numbers)

| Step | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| history, first | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` (13:53:53) | 0 | — | `742100 1793638187`, `23166 1790702242` |
| self-test | `node build/assert-arm64-only.mjs` | 0 | 0.08 s | `[arm64-only] self-test: 41 fixtures read as written, 34 ablations each red on the clause it breaks` |
| root | a scratch copy with `process.getuid = () => 0` | 0 | — | `39 fixtures …, 32 ablations …`, then `skipped:` f21, f38 ("a mode-000 file", "folder"), X16, X31. Over the parent's app: the same line. 0 `tortie-arm64-*` folders left |
| ablations | above | 0 | 12.4 s | 68 arms: 64 red, 4 green, restored by sha256 |
| real bundles | the fixed gate over the parent's app, the verifier's spaced copy, a `/var/tmp/…` path, the three hostile bundles, `release/mac-arm64`, `Contents/Frameworks`, a missing path, two arguments, a file and `''` | 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2 | — | The parent: exactly the three files, `3 of 30`. Hostile: `16 of 19`, the 16 lines `diff`-identical to the verifier's `hostile-expected.txt`. Zero Exec, Nested Only and `Contents/Frameworks`: refused by F1. `release/mac-arm64`: refused by F1 and the 3 named |
| 1 | `npm run typecheck` | 0 | 18.9 s | 1434 files, 0 violations; 0 SCCs; `[shared-types] OK` |
| 2 | `npm run build` | 0 | 44.6 s | `contract-inventory: OK, … byte for byte`; `[electron-teardown]` 179 against a floor of 179; `[background-teardown]` 3 starters; `assert-hermetic-checks: PASS. 276 check scripts`; `[conformance:ios] PASS`; `[gate:onlyadd] PASS`; `[conformance:harnessprobes] PASS` |
| 3 | `npm run gate:arm64` | 0 | 0.2 s | the self-test line above. Five more runs: 0.165 to 0.169 s through npm, and 0.092 to 0.114 s for bare `node` (3 runs). So CLAUDE.md says `~0.17 s` (it said 0.13 s at 22 and 17) |
| 4 | `npm run gate:checks` | 0 | 0.5 s | 276 check scripts classified |
| 5 | `npm test`, scratch `HOME` | **1** | 53.3 s | Files: 4 failed, 1,158 passed, 2 skipped (1,164). Tests: **5 failed**, 21,825 passed, 14 skipped (21,844). Four are the `/bin/ps` tests the block refuses, as at the builder's and the verifier's runs. The fifth is `src/main/config/__tests__/store-watch.native.test.ts` ("re-reads the file after it changes on disk"), a native file-event test with a deadline, run at load average 22. Its file alone, twice: exit 0, 1 of 1 passed, in 1.1 s and 1.0 s |
| 6 | the full unsigned package (`package.zsh package`: §9.1's env, `npm run package -- -c.mac.identity=null`) | 0 | 51.2 s | `df`: 73 GiB free. Lock slot `electron.lock`, released from the trap. The seeded Electron zip read `122102881 1793640741` before and after. Log line 577 `after-pack: 27 Mach-O files, every one holds arm64 code`, line 578 the first `after-pack: CFBundleName`, line 587 `skipped macOS code signing`, lines 588 and 589 the ZIP and DMG targets. DMG 164,877,614 bytes, ZIP 164,514,985 |
| 6 | the issue's command (`issue-43.sh`) from inside `release/mac-arm64`; at the absolute path; from inside the parent's | 1; 1; 0 | — | HEAD: nothing either way. The parent: exactly the issue's two lines, tab-separated |
| 6 | the gate over HEAD's app | 0 | — | `27 Mach-O files of 829, every one holds arm64 code` |
| 6 | HEAD against the M3 package (`bin/tree-diff.mjs`, sha256 of every file) | 0 | — | 828 files against 829; only in HEAD: `Contents/Resources/app-update.yml` (99 bytes), which the full build writes and `--dir` does not; differing: none; 17 links, 437 folders each. HEAD: 478,768,974 bytes |
| 6 | HEAD's DMG and the verifier's parent DMG, each mounted read-only and unbrowsable, and detached from a trap (`bin/dmg-check.zsh`) | 0; 0 | — | Both mount at `/Volumes/Tortie 0.113.0-arm64`. HEAD: gate exit 0 (`27 … of 829`); the issue's command prints nothing at the absolute path and from inside; the app inside equals `release/mac-arm64/Tortie.app` (829 files, 0 differing). The parent: gate exit 1, naming the 3; the issue's command prints nothing at the absolute path and the two lines from inside; the app inside equals its `release/mac-arm64` (844 files, 0 differing). No Tortie volume left in `/Volumes` |
| 9 | ten-line duplicated blocks (`bin/dup-scan.mjs`) | 0 | — | 3,935 windows in the gate, `after-pack.cjs` and `verification-checks.mjs`, against 3,229 files under `build/` and `src/` and within each file: 0 duplicated |
| 9 | `git diff e81c8ff7 \| grep '^+' \| grep -o 'GMUX_[A-Z0-9_]*'` | 1 | — | nothing added; 0 in the gate |
| extra | `npm run gate:contract`; `npm run gate:arm64`, over the final tree after the doc edits | 0; 0 | 1.2 s; 0.2 s | `contract-inventory: OK, … byte for byte`; the self-test line; the gate's sha256 still `2b8e2583…`, the bytes the package and the ablations ran |
| 10 | cleanup | 0 | — | removed this round's `release/` (802,536 KB), `out/` (56,300 KB) and `.tsc/` (27,712 KB) from `wt-p351`, all made by this round, so the reverifier builds and checks its own |

At the end, once: the Electron count (outside the block, CLAUDE.md's line) lists nothing of this round. The bare
`Tortie` 90306 (parent pid 1) and its crashpad 90413 are his installed app, and the rest are other apps' crashpad
handlers. Every lock slot is free. There is no `p351` socket under `/private/tmp/tmux-501/`, no `tortie-arm64-*`
folder in `TMPDIR` and no Tortie volume in `/Volumes`.

History, `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at 13:53:53, 14:16:31, before and after the package, and at
14:25:56: `742100 1793638187` and `23166 1790702242` at every reading.

**Disclosure.** Besides the history `stat`s and the final count, these ran in the tool's own non-interactive shell,
outside the history block:
- one setup step: two heredoc writes (`run.zsh` and `package.zsh` into the fixer's scratch), a `chmod +x` and an
  `ls`;
- `uptime`, twice;
- `ls /Volumes`, twice.

The history files never moved. No build script was imported. The gate was read as text, and only scratch copies of it
were run.

#### Not run, and why

- **`npm test` → 0.** The four `/bin/ps` tests cannot pass under the block, as before. The fifth failure passed alone
  twice.
- **An app run, `smoke:t1`, `smoke`, `smoke:t3`.** This round changes no file the app ships. The package equals the M3
  package file for file, and the verifier ran the packaged app at both builds. These belong to the reverifier.
- **Root.** Simulated in a scratch copy only.
- **Signing, notarization, stapling, Gatekeeper, `verify-signed --expect-notarized`.** Forbidden.
