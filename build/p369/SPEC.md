# Phase 369 — "Electon a" — Electron moves to 45 before 43's fixes stop — SPEC

Written by the spec step on 2026-11-14 in `/private/var/tmp/tortie-wt/wt-p369`, a detached worktree at origin/main
`3b17beaf` ("build(diagnostic): a Tortie that names what damaged the session list"; Phase 364 landed). **On 2026-11-17
the main session moved the worktree and the parent to origin/main `3c8fc02e`** ("docs(backlog): his answers on 369,
its build starts"; since `3b17beaf` it carries Phases 368, 325.1 and 360, the 0.115.0 release and the skills pin's
re-pin of tar to 7.5.23), and the build ran there: **`git diff 3c8fc02e` in the worktree must be exactly Phase 369's
delta**, this file included. Every file:line below was re-read at `3c8fc02e`; §0.2 names the ones that moved, his
answers of 2026-11-17 and what 45.3.4 changed. origin/main moves while the phase
runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The charter is `docs/BACKLOG.md`
"## Phase 369" (`:45265`), `build/p366/SPEC.md` (its method, its measurements and its §14 Q2), `build/p365/SPEC.md` D7
and D14, `build/p364/SPEC.md` §4.1, §4.4 and §4.7, and research 143 §2.5 and §7, bound as written except where §0.1
says the tree or a measurement wins. His word, 2026-11-14 ("Electon a"). His standing rulings bind: **no regression
against today** (a scenario worse than the parent is a defect: fix it or drop the part, and name which); Tortie never
ends a session on its own; just enough words; no tmux vocabulary in anything a person reads; nothing released, tagged,
version-bumped, archived or uploaded; refusal 1 (this phase changes which Electron runs Tortie's own code and adds
nothing that runs in it); his session count is allowed (`build/electron-run.mjs`'s read-only census).

## THE STOP (read first)

**Settled on 2026-11-17 by his answers** ("ok all of the defaults for the 3 questions seem good"): Q1 (a), macOS 13
becomes Tortie's minimum, with one CHANGELOG item; Q2 (a), node-abi 4.40.0 in the lock alone; Q3, Q5 and Q6 at their
defaults; Q4 as the newest 45.x at the install, which is 45.3.4 (§0.2, §14). The stop is kept below as it was written.

**The move needs two things that THE ONE INSTALL does not allow and that his "Electon a" does not settle.** The spec is
written whole so the build can start on his answer; §14 Q1 and Q2 are the two answers, each with a default.

1. **Electron 44.0.0 removed macOS 12 support, so Tortie would stop opening on Monterey.** Electron's
   `docs/breaking-changes.md` at `v45.3.2` ("Removed: macOS 12 support … macOS 13 (Ventura) or later will be required to
   run Electron v44.0.0 and higher", PR #51967, Chromium change 7907086), the 44.0.0 release notes, and the measurement:
   the 45.3.2 zip's `Electron.app/Contents/Info.plist` says `LSMinimumSystemVersion` **13.0** (43.8.7: 12.0), every
   Mach-O file in it carries `LC_BUILD_VERSION minos 13.0` (43.8.7: 12.0), Chromium 156's `build/config/mac/mac_sdk.gni`
   sets `mac_deployment_target` and `mac_min_system_version` to 13.0 (150: 12.0), and a trial package of this tree on
   45.3.2 (§2.5) reads `LSMinimumSystemVersion` 13.0. `electron-builder.yml` sets no `minimumSystemVersion`, so the
   packaged value is Electron's. Tortie's update feed names no minimum (electron-builder 26.15.3 writes none into
   `latest-mac.yml`; `release/latest-mac.yml` of the parent's package holds none), so electron-updater 6.8.9
   (`out/AppUpdater.js:364-379`, which skips only an update whose feed names one) would offer the release to a Monterey
   Mac, and the app it installs would not open there. The brief names this exact case ("a macOS minimum above Tortie's
   LSMinimumSystemVersion 12.0") as a question for him.
2. **The install cannot complete with today's lock.** The postinstall's `electron-rebuild -f -w node-pty,better-sqlite3`
   exits 255 at 45.3.2: "Could not detect abi for version 45.3.2 and runtime electron. Updating "node-abi" might help
   solve this issue if it is a new release of electron" (`node_modules/node-abi/index.js:9-40`, reached through
   `@electron/rebuild/lib/rebuild.js:84` and `lib/module-type/prebuild-install.js:54`). The locked node-abi **4.33.0**
   (`package-lock.json:6633-6635`, a dependency of `@electron/rebuild` 4.2.0 only) names Electron up to
   `44.0.0-alpha.1 = 149`. electron-builder's own rebuild at package time fails the same way (`⨯ Could not detect abi for
   version 45.3.2`, measured, exit 1), and so would the postinstall of `npm ci` in CI (not run). node-abi **4.35.0** (2026-08-28) is the first release
   naming `45.0.0-alpha.1 = 150`; **4.40.0** (2026-10-23) is the newest, and `@electron/rebuild` 4.2.0 (and 4.2.1) accept
   `^4.2.0`. Measured in a scratch clone: with node-abi 4.40.0 the rebuild succeeds in 15 s, the package builds and its
   launch runs (§2.5). The brief names this case too ("another package's version … or any other").

Not stops, and settled by the entry ("No product change but what a breaking change requires"): Electron 44's clipboard
rearchitecture breaks two of Tortie's product calls (Capture Screen's image; Copy and Copy as HTML), its shot harness
and two probes (§0.1 item 6, §4.2, §4.3), so product code changes in two files; and the synchronous `safeStorage`
methods Tortie uses are deprecated at 45 and removed at 46 (§14 Q3).

| | |
| --- | --- |
| Subject | `build(deps): move Electron to 45` (the entry's) |
| First body line | `Phase 369: Electron 45` (the entry's) |
| Semver | Patch, unreleased, Mac only, released on his word. **One CHANGELOG item, by his Q1 (a) and Q5**: the macOS minimum is something a person meets (§5) |
| Lane | Build: Spec → [his answer] → Build (THREE builders, `electron` first, then `clipboard` and `harness` at once) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: Electron is the runtime of every Tortie process (main, the renderers, the phone door's and the watcher's utility processes, the skills check run as Node), node-pty is compiled against it, and better-sqlite3 (the session list) and @parcel/watcher load inside it, so a defect anywhere can lose a person's work (CLAUDE.md:268); a new major moves NODE_MODULE_VERSION. Parent measured (§2); two independent methods at least, one an attack (§10) |
| The version | **`45.3.4`**, by his Q4 (the newest 45.x at the install): npm `latest` and dist-tag `45-x-y`, published 2026-11-17T19:08Z, the newest of the 11 stable 45.x (45.0.0 on 2026-10-21). The spec step read 45.3.2 (2026-11-13T13:26Z); 45.3.3 (2026-11-16) and 45.3.4 came after it (§0.2) |
| The native ABI | **NODE_MODULE_VERSION 148 → 150** (`abi_version` of both npm packages, `node_module_version` in `build/args/all.gn` at both tags, the headers' `node_version.h`, `process.versions.modules` read live). Every native module Tortie loads is N-API (§0.1 item 4), so the move changes which binary node-pty is, not whether a module loads |
| Product code | **Two files change** (`src/main/capture/service.ts`, `src/main/capture/ipc.ts`), plus the shot harness (`src/main/harness/shot.ts`) and two probes that call the removed clipboard API (D4, D5) |
| Menus | **No row added, renamed or removed** |
| Contract | **Does not move**: `gate:contract` must read byte for byte (the IPC channels and their types stay; a handler becoming async is not in the inventory) |
| `HELPER_USER_FLOOR` | **192, unchanged** (188 at `3b17beaf`): no script reaching `build/electron-run.mjs` is added (D10) |
| CLAUDE.md | No row moves (§4.5); one clause on the `conformance:runtime` row only if a measurement disagrees with it |
| CHANGELOG | One item, by his Q1 (a) and Q5 (§5) |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another round's worktree or scratch
  (`wt-p359*`, `wt-p360*`, `wt-p3251*`, `wt-r145`, `/private/var/tmp/tortie-wt/scratch/p364/electron-cache`). Scratch lives
  under `/private/var/tmp/tortie-wt/scratch/p369/<role>/`, never `/private/tmp`; a probe's `TMPDIR` points there too, and
  for `npm test` it is spelled through `/var/tmp/…` (Phase 365's finding: `preview/__tests__/protocol.test.ts` needs
  `tmpdir()` behind a symlink).
- **THE ONE INSTALL is the `electron` builder's (§4.1) and the only one in the phase**: in `/private/var/tmp/tortie-wt/wt-p369`
  only, through the repository's own npm and postinstall, with `HOME=/private/var/tmp/tortie-wt/scratch/p369/install-home`,
  `npm_config_cache=…/p369/npm-cache` and `electron_config_cache=…/p369/electron-cache`. On his Q2 answer (a) it also moves
  node-abi in the lock, by the one command §4.1 E1b names, and nothing else. Nothing global, nothing in `/Users/gdc/gmux`,
  nothing in the parent, no `npm audit fix`, no other package named. Every other role installs nothing: no `npm install`,
  `npm ci`, `npm update`, `npx`, `electron-rebuild` or `install.js` in any tree that ships. A role that finds `node_modules`
  wrong stops and says so.
- **THE PARENT** is `/private/var/tmp/tortie-wt/wt-p369-parent` (`3c8fc02e` since 2026-11-17, Electron 43.8.7, the same
  `node_modules`); its `out/` was removed at the move and built once by the `electron` builder (B9, 2026-11-17 16:43; no
  `out/p292/` any more). Never install, edit or
  rebuild anything in it: at the parent run the harness lines directly, never an npm script that begins with `npm run build`
  (`smoke:quit`, `smoke:quitdoors`, `smoke:fault`, `probe:p236`), and package it as §2.4 did (the package script's read-only
  checks, then `electron-builder`, so `out/` is not rebuilt), removing its `release/` afterwards.
- **probe:p365's parent arms need `ce4c77f6`**: the spec step's built shared clone at
  `/private/var/tmp/tortie-wt/scratch/p369/spec/p365-parent` (`node_modules` and `build/vendor` cloned by `cp -Rc` from the
  369 parent, so Electron 43.8.7; `out/` built; `.git/objects/info/alternates` names `/Users/gdc/gmux/.git/objects`, only
  read). Use it read only, as `P365_PARENT_CHECKOUT`.
- **The spec step's instruments are kept; read them, do not import them** (a role may RUN a launcher named here, copied
  into its own scratch first): `…/p369/spec/bin/` (`hb.sh`, the history block with a scratch environment; `lockrun.sh`, one
  slot, released once; `native-table.sh`; `tree-list.mjs`; `pkg-launch.mjs`, the packaged launch with `lsof`);
  `…/spec/rt/` (a no-window, Dock-hidden runtime reader `app/main.js` and `app/child.js`, its launcher `launch.mjs`, the
  readings `out/` and `out3/`); `…/spec/logs/` (every run's log, `tree-parent.txt`, `native-parent.before`,
  `parent-fuses.txt`, `parent-pkglaunch.json`, `trial45-*`); `…/spec/notes/` (the 38 release notes, both breaking-changes
  documents, `releases.json`); `…/spec/src/` (Electron's sources at both tags, Chromium's `mac_sdk.gni` at both);
  `…/spec/tarball/` (both npm tarballs and `electron.d.ts`); `…/spec/zip45/` (the 45.3.2 zip, sha256 `8bdf5d55…`, and its
  extraction); `…/spec/gyp/devdir/` (Electron's headers for 43.8.7 and 45.3.2); `…/spec/nodeabi/` (node-abi 4.34.0 to
  4.40.0 tarballs); `…/spec/lockpredict/` and `lockpredict2/`; `…/spec/tscheck/` (the scratch clone of §2.5: 45's
  `electron.d.ts` and `package.json`, node-abi 4.33.0 put back, native modules rebuilt for 150); `…/spec/checker/`. The build's (2026-11-17): `…/p369/electron-cache/7a59d5bd…/` (the
  45.3.4 zip); `…/p369/install-home/.electron-gyp/45.3.4/` (its headers, written by the install's `electron-rebuild`);
  `…/p369/electron/` (the `electron` builder's logs, the 45.3.3, 45.3.4 and Node 24.22.3 notes, its runtime reader `rt/`);
  `…/p369/clipboard/` and `…/p369/harness/` (their ablations); `…/p369/integrator/`.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.
- **No real agent runs, not even for a version.** Every real-app launch hides every probed registry row it does not need
  (`build/hidden-agents.mjs`) and reads `agents:list` back. `conformance:resume:capture` and the full `conformance:resume`
  start real agents and are NOT run (his standing rule overrides the entry's proof line, §10.3).
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store, his
  shell history's contents or his live Tortie profile. `safeStorage` reads and writes his login keychain, so it is NOT
  driven live; §2.1 weighs it from Electron's sources.
- **His pasteboard.** Copy, Copy as HTML and Capture Screen write the general pasteboard, which is his. A run that drives
  them goes through the shot harness's own save and restore (`GMUX_SHOT_CLIPBOARD`, rewritten in §4.3): every flavour
  saved first, restored in a `finally`, names and sizes compared after, no byte of his ever printed, logged or written to
  disk. A role that cannot show its restore holding on the parent first does not run it at HEAD and says so (§14 Q6).
- **His crash reports.** Count `~/Library/Logs/DiagnosticReports` (and `Retired/`) by NAME and mtime only, before and
  after every run that can crash; name what your run added; never open a report. A scratch crash app sets `crashDumps`
  into its own profile, starts Crashpad with `ignoreSystemCrashHandler: true`, hides its Dock icon and opens no window.
  **Tortie itself does not ignore the system handler** (`src/main/log/crash.ts:99`), so a deliberate crash of a real
  Tortie process (Lens B's renderer crash) can add a report: at most one per build, each named. Grade a crash by its exit
  signal and by the dumps under YOUR scratch profile, each read and then deleted (a dump holds the environment); no `.dmp`
  is kept, copied or committed. Other rounds run Electrons now and add reports named `Electron-…` (two did during the
  spec step, §2.6): attribute by time and process name and say when you cannot.
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps` or `lsof`
  runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` (the spec's `bin/hb.sh` is the shape); the
  four `/bin/ps` native tests fail inside it by design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1).
  What needs Electron, `/bin/ps` or `lsof` runs outside it under `zsh -f` with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `SHELL_SESSION_HISTORY=0`, and every `CLAUDE*`, `CSC_*`, `APPLE_*`, `GMUX_*`,
  `TMUX*`, `SSH_AUTH_SOCK`, `SECURITYSESSIONID`, `GH_TOKEN`, `GITHUB_TOKEN`, `TERM_SESSION_ID` and `TERM_PROGRAM*`
  variable unset (`bin/lockrun.sh` is the shape: `env -i`). Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history`
  before and after every run (`746321 1794670684` and `23166 1790702242`, unmoved across every run of the spec step; `747174 1794949984` and
  `23166 1790702242` through the build). A
  move across an unblocked run: start nothing for 3 minutes and stat again; moved again is his; still moved means STOP and
  report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. **His Tortie (pid 94808 at the spec step, 35546 at the build) has the same bundle id as every build you run**: never an Apple
  Event, `osascript` or `open`; a quit is pressed through the native Quit row in main (`item.click()`), `app.emit`, or the
  harness.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two quit smokes through
  `build/quit-smoke.mjs`), with a scratch profile, `HOME` and socket. `smoke`, `smoke:t1` and `smoke:t3` start Electron
  outside the helper and are the MAIN SESSION's alone, at landing; `smoke:quit`, `smoke:quitdoors` and `smoke:fault` may be
  run, each under a lock slot. Driving a `GMUX_SMOKE` mode through `withElectron` is allowed (Lens A's update path). A
  `withElectron` body must bound its own wait: the helper's `ceilingMs` did not end a launch whose body awaited
  `exited` (the spec step's first runtime launch ran 10 min 29 s, §2.6). No Simulator. No real Tailscale, DNS, APNs or ssh;
  never `smoke:remote` or `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- **The lock has three slots, shared with four other rounds**: `zsh /private/var/tmp/tortie-ops/lock.sh try p369-<role>`
  prints the slot or exits 1 (retry every 60 s in a NEW command); release it from a trap, ONCE, and only while the slot's
  `owner` file is still yours (`lock.sh release` checks nothing). Every probe, smoke, package or Electron run holds one.
  `df -h /` before any build, install or clone; under 8 GB free, wait and report (80 to 84 GiB free at the spec step).
- **PACKAGING IS UNSIGNED, ALWAYS**: `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*`, `APPLE_*`, `GH_TOKEN` and
  `GITHUB_TOKEN` unset, `-c.mac.identity=null`; the diagnostic package through `build/diagnostic/package.mjs --dir`, never
  `--notarize`; never `--publish`, never notarize or staple, never `build/verify-signed.mjs` against his identity. A
  package log naming `identityName=Developer ID` is a defect reported at once. A packaged app launches only through
  `withElectron` with `program: 'packaged'`; `release/` is removed after. **electron-builder's `@electron/get` (3.1.0,
  nested under `app-builder-lib`) reads no cache override but `HOME`**: a HEAD package runs with `HOME` a scratch folder
  whose `Library/Caches/electron/7a59d5bd370c2958cab00938a19523aad37fb643e4ce440c8a33e5417aa3eb43/` holds a `cp -c` of the
  45.3.4 zip from `…/p369/electron-cache` (the folder is sha256 of
  `https://github.com/electron/electron/releases/download/v45.3.4`, the formula checked against 43.8.7's `7f040e81…`); the
  parent's packages from a scratch home holding a `cp -Rc` of `/private/var/tmp/tortie-ops/pkg-home-43.8.7/Library/Caches/electron`
  (read it, never write it); `ELECTRON_BUILDER_CACHE=/Users/gdc/Library/Caches/electron-builder`, read only (its listing
  by size and mtime did not move across the spec step's parent package). No package step may download Electron into his
  home.
- **Reads off the machine**: `npm view`, Electron's release notes, breaking-changes document and sources on GitHub, and
  Chromium's mirror there, unauthenticated (`curl` or WebFetch, read only, post nothing); never `gh`.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

1. **The newest 45.x is 45.3.4** (npm `latest` and `45-x-y`, published 2026-11-17T19:08:22Z; 45.3.3 on
   2026-11-16T05:55:50Z; read by the `electron` builder before its install and again by the integrator at 22:48Z). Its
   package: `dist.integrity`
   `sha512-cqU5u6arfGd9KJvCODjj32ckxkDQbweTL3v8J51tAsKGmDWYKcAqszvie0NDKBIGl6Ze19QTL74yIAUHrqNDig==` (re-derived from the
   tarball, 210,139 bytes), the same dependencies, `engines` and `bin` as 45.3.2 and no install script; against 45.3.2
   only `package.json` (the version), `electron.d.ts` (its first line) and `checksums.json` differ, so the types are
   45.3.2's. The darwin-arm64 zip: 120,975,664 bytes, sha256
   `f3ac0124c48a6cc3aa9332caca0e913cc478cd3610a378881729ca33452caa72` (re-derived, equal to `checksums.json`). **What
   the spec step read on 2026-11-14, kept as read:** the newest was 45.3.2. `npm view electron versions --json` (1,891
   versions) names 45.0.0, 45.1.0, 45.2.0 to
   45.2.3, 45.3.0 to 45.3.2 (and 44.0.0 to 44.11.3, 29 releases; `46.0.0-alpha.10` is the newest alpha; `43-x-y` is now
   43.8.10). `latest` and `45-x-y` are 45.3.2, published 2026-11-13T13:26:20Z. Its package: `dist.integrity`
   `sha512-bPO0MMvJCdKdPfXgd3ES8zupu+ocr6XmSuRGwyZazTiigTz8jE7rwukSkck0iomS6UZeFuCwzu0uanMD/D34uw==` (re-derived from the
   tarball, 210,139 bytes), the same three dependency ranges as 43.8.7 (`@electron-internal/extract-zip ^1.0.1`,
   `@electron/get ^5.0.0`, `@types/node ^24.9.0`), `engines.node >= 22.12.0`, no install script, the same `bin`; against
   43.8.7's package `index.js`, `install.js` and `cli.js` are byte-identical and `package.json` (version), `abi_version`
   (148 → 150), `electron.d.ts` (1,138,588 → 1,195,492 bytes), `checksums.json` (75 → 67 entries: the 32-bit builds gone,
   `xcache-*` added) and `README.md` ("macOS (Monterey and up)" → "macOS (Ventura and up)") differ. The darwin-arm64 zip:
   120,964,377 bytes, sha256 `8bdf5d55fbcc2c348b5d34b9e87a364cd2947d00b7c8bfadc6cc50233cd79ac6` (re-derived, equal to
   `checksums.json`).
2. **The runtime, read live in both binaries** (§2.2): 43.8.7 is Node 24.22.1, V8 15.0.245.31-electron.0, Chromium
   150.0.7871.250, modules 148, N-API 10, libuv 1.52.1; 45.3.2 is **Node 24.22.2, V8 15.6.75.57-electron.0, Chromium
   156.0.8078.100, modules 150, N-API 10, libuv 1.52.1**, the same in its utility child, and equal to
   releases.electronjs.org's index. **45.3.4, read live by the `electron` builder's B6 at HEAD: Node 24.22.3** (45.3.3's
   update, a security release), V8 15.6.75.57-electron.0, Chromium 156.0.8078.100, modules 150, N-API 10, the same in
   its utility child. Node 24.22.3 is inside `engines.node` (`^24.11.1`), `.nvmrc` (22.23.1, the checks'
   runtime) and `SUPPORTED_NODE` (`build/verification-checks.mjs:98-103`); none of the three reads Electron's Node (Phase
   366 D6), so nothing there moves.
3. **The macOS minimum moves to 13.0** (THE STOP item 1). Electron 45.3.2's binaries (and 45.3.4's, B1): `MacOS/Electron`, the framework,
   the helpers and `libffmpeg.dylib` all read `minos 13.0`; 43.8.7's read 12.0. Native modules compiled against 45's
   headers get `MACOSX_DEPLOYMENT_TARGET` 13.5 from its `common.gypi:742` (43.8.7: 12.0) unless their own `binding.gyp`
   sets one: node-pty's `binding.gyp:105` and better-sqlite3's `deps/common.gypi:37`, `:59` say 10.7; the trial build's
   `pty.node`, `spawn-helper` and @parcel/watcher's local build read `minos 13.0` (§2.5), the checker build 11.0. Nothing
   Tortie compiles therefore needs more than Electron's own 13.0. **Context for Q1, measured and not run further**: the
   tmux Tortie bundles (`build/vendor/tmux/bin/tmux`, and `Contents/Resources/bin/tmux` in the parent's package) reads
   `minos 15.0`, and a packaged Tortie runs that copy and nothing else (`src/main/tmux/resolve.ts:39-45`); whether it runs
   on macOS 12 to 14 was not measured (no older macOS here).
4. **Every native module Tortie loads is N-API, so the ABI move does not decide whether any of them loads.** By symbol
   (`nm`): `better-sqlite3/prebuilds/darwin-arm64.node`, `node-pty/build/Release/pty.node`, node-pty's prebuild and
   @parcel/watcher's local build export `napi_register_module_v1`, and all of them, with
   `@parcel/watcher-darwin-arm64/watcher.node`, import only `napi_*` (38 to 60 each) and no `v8::` symbol. Measured live
   (§2.2): Electron 45.3.2's main loads the parent's better-sqlite3 prebuild (2,000 rows, `integrity_check` ok, SQLite
   3.53.4) and the parent's `pty.node` built against 43.8.7's headers (20 of 20 spawns right), and its utility child loads
   the watcher prebuild. The postinstall still compiles node-pty again (`-f`), as at every Electron move.
   - **better-sqlite3 13.0.3**: the postinstall compiles nothing for it (`binding.gyp`'s `prebuild_exists`); its
     `build/Release/.forge-meta` becomes `arm64--150`; the prebuild (`98e0e8ac…`, 1,980,736 bytes) is untouched.
   - **@parcel/watcher 2.6.0**: `watcher.node` from `@parcel/watcher-darwin-arm64` (`bdc5c395…`, 326,000 bytes) is
     untouched; the postinstall's module walk rebuilds the never-loaded local build (`build/Release/watcher.node`
     `87d6a14c…` 491,408 → `6df6cada…` 465,872 bytes in the trial) and adds `bin/darwin-arm64-150/watcher.node` beside the
     kept `-148` copy (Phase 366 §As built corrections 1 and 2).
   - **node-pty 1.1.0**: `pty.node` (`24998490…`, 86,552 bytes, 11.0) and `spawn-helper` (`3bc9f9a1…`, 50,544) are
     compiled again from the patched source; the trial produced `pty.node` `2137be90…` (86,584 bytes, UUID
     `CB274F6D-A1CA-3ED4-8020-CA52FE263740`, minos 13.0, arm64) and `spawn-helper` `6c062590…` (34,048, ad hoc
     linker-signed as before), `.forge-meta` `arm64--150`, and `bin/darwin-arm64-150/node-pty.node` beside the kept
     `-148` copy.
   - **The diagnostic checker** (`build/diagnostic/build-checker.mjs`, which compiles better-sqlite3 from source with
     `-Dforce_build=1` against the headers of `node_modules/electron`'s version, `:252-272`): built against 45.3.2's
     headers in the scratch clone it is **byte-identical** to the 43.8.7 build: diagnostic `38c741d0…` (2,015,696 bytes,
     UUID `07F07E5D-E0BE-3C7D-A002-4D548B843724`), test `b9cece4d…`, plain `8e25e56a…`, minos 11.0 at both; the N-API
     headers (`node_api.h`, `js_native_api.h`, both `_types.h`) are identical at both versions and
     `NODE_API_SUPPORTED_VERSION_MAX` is 10 at both. `check:checker` passes 29 of 29 at both (§2.3, §2.5). **Nothing under
     `build/diagnostic/` needs a change** (no builder `diagnostic`, D7); it needs 45.3.4's headers in its `--devdir`, which
     the install's `electron-rebuild` writes into `install-home/.electron-gyp/45.3.4/` (its four N-API headers
     byte-identical to 43.8.7's and 45.3.2's, measured by the `electron` builder).
5. **The lockfile, predicted.** npm 10.9.8 on scratch copies (`--package-lock-only --ignore-scripts`): the electron line
   alone changes exactly two hunks, `:64` (the root range) and `:4023-4025` (version, resolved, integrity
   `sha512-bPO0…D34uw==`); node-abi does not move with it. `npm update node-abi --package-lock-only` then changes exactly
   `:6633-6635` (4.33.0 → 4.40.0, integrity `sha512-GuvqvtrOk+AC27RidBxBsMzVNkwNl7PjHgc4NXbmdvSVLgIUjpaqcG1FjNRYnt2Yn9Ytq+Ln37XsBaglUcte/w==`,
   re-derived from the tarball) and leaves `package.json` alone: 7 lines added and 7 removed in all, sha256 `cfdaa984…`
   (`…/spec/lockpredict2/package-lock.json`). At 45.3.4 and `3c8fc02e` (whose lock, `674cac09…`, differs from
   `cb2c4661…` by 0.115.0's version lines alone) the same three hunks carry 45.3.4's fields, sha256 `8c80e28a…`,
   predicted two ways by the `electron` builder and equal to the lock its install wrote. node-abi 4.40.0 depends on `semver ^7.6.3` and `engines.node >=22.12.0`, as
   4.33.0 does; `index.js` and `getNextTarget.js` are byte-identical between the two, only `abi_registry.json` grows.
   `tree-list.mjs` names 567 packages at the parent and the worktree, identical.
6. **The types: 13 errors, all Electron 44's clipboard.** A scratch clone with 45.3.2's `electron.d.ts` (45.3.4's
   differs by its first line alone): `tsc -b` exits 2,
   `tsc --noEmit -p tsconfig.node.json` exits 0 (20 s). `src/main/capture/service.ts(72,13)` `writeImage` does not exist;
   `(226,11)` `{ text, html } | { text }` is not `ClipboardItem[]`; `src/main/harness/shot.ts` `(290,30)`
   `availableFormats`, `(292,27)` `readHTML`, `(293,26)` `readRTF`, `(294,28)` `readImage` do not exist, and seven more at
   `:309-325` from them. Electron 45's `Clipboard` is `clear(): void`, `has(mime): Promise<boolean>`,
   `read(): Promise<ClipboardItem[]>`, `readText(): Promise<string>`, `write(items: ClipboardItem[]): Promise<void>`,
   `writeText(text): Promise<void>`, `selection`; `ClipboardItem` is exported to main. Read live: 45.3.2's `clipboard` has
   exactly `clear, has, read, readText, write, writeText` (43.8.7: 20 methods). Two probes call the removed methods inside
   a main-process eval, which no type check sees: `build/probe-p236-chip.mjs:552-570` and
   `build/probe-p239-anchored.mjs:797-815`; the second saves his pasteboard with `availableFormats`/`readBuffer` and
   restores it after a `clipboard.clear()` with `writeBuffer`, so at 45 it would clear his pasteboard and put nothing
   back (D5).
7. **What the release notes change that touches Tortie**: §2.1, row by row with the file and line each touches.
8. **Electron's own sources at the two tags** (GitHub raw, read): unchanged in what Tortie depends on are
   `UtilityProcessWrapper::Kill()` (byte-identical: `Terminate`, then `base::EnsureProcessTerminated`, the 2 s wait
   `host.ts` rule 7 steps around), the fork's option parsing (`Create`, byte-identical but its binding call: `env: {}`
   still reads as "inherit everything", `env_map.empty() ? false : true`; the string `stdio` still becomes three entries
   in `lib/browser/api/utility-process.ts`), `OnV8FatalError`'s `emit('error', 'FatalError', …)` (so the door's fork with no
   `'error'` listener still throws in main on a V8 fatal error in the door, as Phase 365 §As built left it), the uncaught
   exception dialog's title (`lib/browser/init.ts:29`, so `src/main/log/crash.ts:200` stays right), the menu controller's
   posted close callback after `menuDidClose:` (so `src/main/menu-popup.ts:136-143`'s one-macrotask wait still sees the
   click first), Chromium's `Info.plist` template (`LSMinimumSystemVersion ${MACOSX_DEPLOYMENT_TARGET}`), the fuse
   schema (`build/fuses/fuses.json5`, nine fuses) and safeStorage's synchronous path (`OSCrypt::IsEncryptionAvailable`,
   `EncryptString`, `DecryptString`). Changed: the utility process (a launch that fails before spawn now emits `exit` with
   code 1, posted, where 43.8.7 emitted nothing on macOS; stdio read ends closed at termination; the Prompt API's AI
   manager), the crash reporter (`start` moved from JavaScript into C++ with the same defaults and a type check per
   option; `getLastCrashReport` native), the menu (`Menu` and `MenuItem` now native: `lib/browser/api/menu.ts` is a
   binding; `item.click(event, window, contents)` runs the role or the user's `click(item, window, event)` as before,
   measured synchronous at both), safeStorage's async encryptor (`kEncryptSyncCompat` dropped) and its deprecation
   wrapper, the clipboard (rewritten, `shell/browser/api/electron_api_clipboard*.cc`; its writes still go through one
   `ui::ScopedClipboardWriter`, `WriteText`, `WriteHTML(text, "")`, `WriteImage(bitmap)`, the same calls 43.8.7's
   `write({text, html})` and `writeImage` made).
9. **Electron's packaging moves** (the 45.3.2 zip against 43.8.7's `dist/`, and the trial package): `Electron.app` 280 MB
   → 253 MB; `Libraries/libEGL.dylib` and `libGLESv2.dylib` are gone (ANGLE statically linked, PR #52288); the framework
   gains `Helpers/app_shim_loader` (51,344 bytes, arm64, ad hoc linker-signed: Electron's own, PR #55072); the Mach-O
   count of the bare app goes 15 → 14, of Tortie's package 27 → **28** (those three, plus the two `bin/darwin-arm64-150/`
   copies beside the kept `-148` ones, §2.5); the lproj count is unchanged (55 and 220); the fuse wire read by
   `@electron/fuses` 1.8.0 is identical field for field (§2.4); no entitlement or `electron-builder.yml` key is needed.
10. **electron-vite 5.0.0 builds 45 as it builds 43.** Its tables stop at Electron 39
    (`node_modules/electron-vite/dist/chunks/lib-q6ns0vZr.js:160-215`) and any later major takes `node22.20` and
    `chrome142`; the trial's `out/` is byte-identical to the parent's but `BUILD_COMMIT` (`"3b17beaf"` against `"dev"`,
    the clone having no `.git`) and the parent's `out/p292/`. `@electron/rebuild` 4.2.0 reads only `electron/package.json`;
    electron-builder 26.15.3 packaged 45.3.2 once node-abi knew it. Newer: `@electron/rebuild` 4.2.1 (same `node-abi ^4.2.0`,
    so moving it alone does not help), electron-builder 26.18.0, electron-vite 6.0.0; none is needed (D3).
11. **The literals.** `package.json:416` (`:408` at `3b17beaf`), `package-lock.json:64`, `:4023-4025` move (and `:6633-6635` on Q2 (a)). The rest
    stay: comments that record where a measurement was made (every `Electron 43…` comment under `src/` and `build/`,
    among them `src/main/watcher/host.ts:22`, `:225`, `:736`, `src/main/pocket/bind.ts:193`, `src/main/log/crash.ts:27`,
    `:200`, `src/main/fs/open-with.ts:24-25`, `src/main/restore/login-item.ts:4`, `build/conformance-watcher.mjs:1399`,
    `:1407`, `:1412`); test data and fixtures naming 43.8.7 as a string (`build/p364/fixtures/graders.json`,
    `build/p365/fixtures/**`); history (`docs/research/**`, `build/p*/SPEC.md`). `build/p364/probe-p364.mjs:1547` reads the
    installed version, so its grading follows the move; its `:98`, `:182` and `:1003` are prose. Node 24.22.1 and
    NODE_MODULE_VERSION 148 appear only in those.
12. **The parent's packaged app** (§2.4): `CFBundleShortVersionString` 0.114.1 (0.115.0 at `3c8fc02e`), `LSMinimumSystemVersion` 12.0, bundle id
    `com.itavero.tortie`, framework 43.8.7; main holds `pty.node` and better-sqlite3's prebuild, ONE `Tortie Helper` holds
    the watcher prebuild, no other process holds a `.node`.
13. **Electron 45's support window.** Electron supports three stable majors; 42's support ended with 45.0.0 (its notes'
    "End of Support for 42.x.y"). Majors come every eight weeks (44.0.0 2026-08-25, 45.0.0 10-21), so 43 should stop
    getting fixes when 46.0.0 ships around mid-December 2026, and 45 when 48.0.0 ships, around mid-April 2027. An inference
    from the registry, not an announcement. 46 removes the synchronous `safeStorage` methods (§14 Q3).

## 0.2 Since the spec: the tree at `3c8fc02e`, his answers and 45.3.4 (the integrator, 2026-11-17)

- **The move.** On 2026-11-17 the main session moved the worktree and the parent to origin/main `3c8fc02e`. Since
  `3b17beaf` it carries Phase 368 (issue 44: sizes, widths, links, copies), Phase 325.1, Phase 360, the 0.115.0 release
  and the skills pin's re-pin of tar to 7.5.23 (`3f0c850b`). It removed `build/vendor/skills` in both trees on purpose,
  so the first package installs it again from the registry under the pin, as CI does (tar 7.5.23, read back after this
  build's package). `node_modules` and the rest of `build/vendor` were as the spec step found them: Electron 43.8.7 in
  both, the patches applied, `addon-webgl.mjs` `e4ab05d2…`, specstory 2.10.0.
- **The citations that moved**, each read again at `3c8fc02e`. 287 files changed since `3b17beaf`. 12 of the 166 file names
  this spec cites (found by a pattern over its text) are among them, and these are the only cited lines that moved:
  - `package.json:408` → `:416` (the `electron` line). The lock's `:64`, `:4023-4025` and `:6633-6635` did not move;
    the parent's lock is `674cac09…`, which is `cb2c4661…` plus 0.115.0's version lines.
  - `src/main/index.ts:419` → `:421` (`sandbox: false`) and `:694` → `:702` (the comment that names `window-shown`).
  - `src/main/capture/ipc.ts:59-70` → `:63-73` (`capture:image`), `:111-113` → `:115-117` (`clipboard:writeRich`) and
    `:118` → `:123` (`webContents.paste()`). These are the lines at `3c8fc02e`, before this phase's edit; Phase 368 moved
    them.
  - `CLAUDE.md:268` → `:270` (the Tier 3 question).
  - `HELPER_USER_FLOOR` 188 → 192 (`build/assert-electron-teardown.mjs:693`), and Tortie's version 0.114.1 → 0.115.0.
  - Unchanged: `build/verification-checks.mjs:98-103` (`SUPPORTED_NODE`), `src/main/capabilities.ts:391`
    (`powerMonitor`) and `docs/BACKLOG.md:45265`. `build/assert-bundle-refusals.mjs` and
    `docs/audits/contract-baseline.txt` moved, but the spec names no line in either, and the contract still reads byte
    for byte.
- **His answers** settle §14 (recorded at its end). Q1 (a), Q2 (a), and Q3, Q5 and Q6 (a) at their defaults. Q4 takes
  the newest 45.x at the install, which is 45.3.4.
- **45.3.4.** Its facts are §0.1 items 1 and 2, and its two releases are §2.1's last three rows: Node 24.22.3 (45.3.3), a
  DevTools extension race (45.3.3) and a leak after a right-click (45.3.4). None touches a line of Tortie's. The
  `clipboard` builder fetched Electron's five clipboard sources at `v45.3.4`; they are byte-identical to the spec
  step's `v45.3.2` copies.
- **Where the builders' measurements overrode this spec** (each recorded by its builder, kept here):
  1. node-pty built at the worktree's path gives `pty.node` `b088cc43…` (86,552 bytes) and `spawn-helper` `dfab72c2…`
     (34,000 bytes), not the trial's `2137be90…` (86,584) and `6c062590…` (34,048). The code is the same: `__text` is
     0x4ae8 in both, with the same disassembly and the same symbols. Only the string table differs, and it depends on
     the build path; a control rebuild at a longer path came out at 86,584 bytes.
  2. `node_modules/electron/dist` did not survive E2, so E3 had nothing to move aside.
  3. §0.1 item 6's sentence on `probe-p239-anchored.mjs` is wrong. At 45 the unported probe throws on
     `availableFormats` before its copy, so it never touched his pasteboard. **At the PARENT, though, its 43 save reads
     each listed format with `readBuffer(<MIME name>)`, which reads as empty, and then calls `clear()`.** That reading
     comes from Electron 43's source and was not run. **`probe:p239` never runs at the parent.**
  4. The parent's shot harness puts back only text, HTML, RTF and one image. A `GMUX_SHOT_CLIPBOARD` run at the parent
     cannot honour Q6 (a)'s "every flavour" by itself (§As built, "For the lenses").
  5. The new test has 10 rows. At the parent's two files 9 are red and 1, the unchanged empty-image refusal, is green.
     That row goes red in the `clipboard` builder's ablation A5.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The stop | macOS 12 stops being able to open Tortie, and today's lock cannot install 45: both are his (§14 Q1, Q2) |
| 2 | The move, on his answer | `electron` `^43.8.7` → `^45.3.4` at `package.json:416`; the lock's electron fields and, on Q2 (a), node-abi 4.33.0 → 4.40.0; then `npm install` (the three patches, node-pty compiled for 150) and Electron's own installer, every cache in scratch |
| 3 | The native modules | All N-API; node-pty is compiled again; both prebuilds are the same files; the diagnostic checker builds byte-identical against 45's headers |
| 4 | Product code | Capture Screen's image and Copy and Copy as HTML move to Electron's new `clipboard.write([ClipboardItem])`, awaited; the shot harness's pasteboard save and restore and two probes move to `clipboard.read()`; nothing else |
| 5 | What 45.3.4 changes on Tortie's paths | ANGLE in every process; the menu and the crash reporter native; `exit` for a utility process that failed to launch; microtasks in protocol handlers on time (#54301); `executeJavaScript(…, true)` grants user activation (#54959, the shot harness); faster menus, framework prefetch at launch; Chromium 156's backports; safeStorage's sync methods deprecated; Node 24.22.3's TLS resumes no session for the phone door's mutual TLS (45.3.3) |
| 6 | The proof | Lens A: the parent's battery and probes beside HEAD's, the runtime facts with the lens's own instrument, the clipboard's flavours at both builds, `out/` byte for byte, the update path through the two unsigned packages. Lens B: the quit table, a crash dump written and read, the door over the stand-ins, a renderer crash, each changed utility-process and protocol path attacked, the clipboard under hostile payloads, ablations |
| 7 | What stays | No gate, contract, floor, menu, entitlement, fuse or `electron-builder.yml` key moves; the 43.x workarounds stay |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **Exactly 45.3.4; `package.json` says `^45.3.4`, the lock pins 45.3.4.** The caret is the house style the line already uses | The entry's item 1, the brief ("the newest 45.x the registry names") and his Q4 ("the newest 45.x at the install"). §0.1 item 1 |
| D2 | **The install is four steps in one environment**: the one-line edit; the lock moved first (`npm install --package-lock-only --ignore-scripts`, then on Q2 (a) `npm update node-abi --package-lock-only --ignore-scripts`), compared with the spec's prediction byte for byte; `npm install --no-audit --no-fund` with NO package argument, so the postinstall runs as it does for anyone; then `node node_modules/electron/install.js`, Electron's own installer, into `electron_config_cache`, checked against `checksums.json` | §0.1 items 3 and 5. The lock moves before the reify because a postinstall that fails midway (as it does with node-abi 4.33.0) leaves `node_modules` half moved. Electron 42+ downloads lazily (breaking-changes 42.0), so without the last step the first shim launch downloads inside a probe's scratch `HOME` |
| D3 | **No other package moves**: not `@electron/rebuild`, electron-builder, electron-vite, `@types/node`, node-pty, better-sqlite3 or @parcel/watcher; node-abi only on his Q2 (a) | The entry ("no other dependency unless 45 requires it and he agrees"); §0.1 item 10: nothing else is required |
| D4 | **The clipboard change is the smallest that keeps every flavour**: `remember()` writes `new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })` and is awaited, so `captureImage` and `captureViewport` resolve only once the image is on the pasteboard; `writeRichClipboard` writes one item of `text/plain` and, only when non-empty, `text/html`, and is awaited by its handler; `capture:image`'s handler awaits inside its `try`, so a failure still answers "Couldn't capture this session." | Electron 44's breaking change (`clipboard` "rearchitected", PR #52508), the entry's "No product change but what a breaking change requires". 45's `ClipboardItem::WriteTo` reaches the same `ScopedClipboardWriter` calls (`WriteText`, `WriteHTML(text, "")`, `WriteImage` of the PNG decoded at scale 1.0, as `nativeImage.createFromBuffer` did), so the bytes a paste reads should not move; Lens A A7 measures it. `src/main/pocket/ipc.ts:306`'s `clipboard.writeText(text)` still writes synchronously inside its native call and is left (no cleanup) |
| D5 | **The shot harness and the two probes move to `clipboard.read()`**, keeping their promise to put back what his pasteboard held: save every type `read()` lists (45 lists the standard MIME types and every other raw format as `electron application/osclipboard;format="…"`, so more flavours round-trip than at 43), restore with one `clipboard.write` of new items, `clipboard.clear()` only when the pasteboard held no flavour at all, inside the restore (`conformance:redline` rule 13, `build/conformance-redline.mjs:1457-1477`) | `tsc` fails on `shot.ts` (§0.1 item 6), and `probe-p239-anchored.mjs` would clear his pasteboard at 45 |
| D6 | **Every 43.x workaround stays, each re-measured at 45, none removed on a release note**: the string `stdio` in both forks and W365-7; the one-variable `env` (`{}` still hands the child main's 22 variables, measured); `host.ts` rule 7's SIGKILL before `kill()` (`kill()` of a stopped child still holds main 2,004 ms at 45); the watcher's `'error'` listener and the door's fork without one; the comments that record where a measurement was made | The entry's mechanism 4 and "no cleanup of what 43 needed"; §2.2 |
| D7 | **No builder `diagnostic`**: `build/diagnostic/**` is unchanged and builds a byte-identical checker at 45; the integrator builds the diagnostic package at 45 (§11 step 13) and runs `check:checker` against the install's headers | The brief's condition ("if the checker needs any change at 45") is measured false: §0.1 item 4, §2.5 |
| D8 | **The newest 45.x at the install is taken (45.3.4); one published after the install is reported, never taken**; 46 is never taken | His Q4 of 2026-11-17; the spec read 44.0.0 to 45.3.2, the `electron` builder 45.3.3 and 45.3.4 (§2.1's last rows); the entry ("No Electron 46 or later") |
| D9 | **The update path is the phase's own independent method**: the parent's unsigned package (43.8.7) writes a profile and a session list, HEAD's unsigned package (45.3.4) reads them on the same profile and socket | Phase 366 D11: the scenario a person meets is an app update over running sessions. The real Squirrel update cannot be run unsigned (`build/update-rehearsal.mjs` needs his identity and shares his ShipIt state), §10.3 |
| D10 | **No new probe, seam, gate or script under `build/`**; `HELPER_USER_FLOOR` stays 192 (188 at `3b17beaf`). The spec step's instruments stay in scratch; the lenses write their own | A dependency move; the existing probes cover the surfaces (§8) |
| D11 | **The clipboard unit test is new** (`src/main/capture/__tests__/p369-clipboard.test.ts`): nothing tests `writeRichClipboard` or `captureImage`'s write today (`history-range.test.ts:129` mocks `clipboard: {}`) | A product change with no test is a change no gate holds; the test mocks Electron 45's shapes and is ablated in Lens B |
| D12 | **A regression 45.3.4 causes that Tortie's code cannot answer inside this entry goes to him with the numbers**; the fixer never picks another Electron or another package | The brief's STOP rule; D3 |
| D13 | **Packaging stays unsigned in this phase.** Library validation and notarization of 45.3.4's framework, the new `app_shim_loader` and the rebuilt `pty.node` under his Developer ID are proved by the release lane's `build/verify-signed.mjs`, on his word | The hard rules; Phase 366 D9; §14 |

## 2. What the spec step measured, how, and the numbers

**These are the spec step's readings, at `3b17beaf` on 45.3.2, kept as measured.** The build took 45.3.4 at `3c8fc02e`:
§2.1's last three rows add 45.3.3 and 45.3.4, and §As built holds every reading the build made of 45.3.4.

Every Electron ran through `build/electron-run.mjs`'s `withElectron` inside `build/harness-socket.mjs`, by
`zsh -f …/spec/bin/lockrun.sh <tag> <checkout> <command>` (one slot taken, released once by a trap; `env -i` with `HOME`,
`ZDOTDIR` and `TMPDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`). Every other command ran under the history block
(`…/spec/bin/hb.sh`), but for the slips §2.6's last row names. His history read `746321 1794670684` and
`23166 1790702242` before and after every run and at the end.

### 2.1 The release notes from 43.8.7 to 45.3.2 (and, read at the build, 45.3.3 and 45.3.4), and what each change touches in Tortie

Read from `docs/breaking-changes.md` at `v45.3.2` and the 38 GitHub release pages 44.0.0 to 45.3.2
(`…/spec/notes/notes-44.0.0-to-45.3.2.md`, `notes-45.0.0.md`, `notes-patches.md`), and, where it decides, the source at
both tags (`…/spec/src/`). "Nothing in the tree" means a search of `src/` found no caller.

| Area | Release, PR | The change | Tortie at `3b17beaf` | What the move does | Proved by |
| --- | --- | --- | --- | --- | --- |
| Platform | 44.0.0 #51967 | **macOS 12 dropped**; macOS 13 required | `electron-builder.yml` sets no `minimumSystemVersion`; `app-builder-lib/out/macPackager.js:392-394` keeps Electron's `LSMinimumSystemVersion` | The packaged Tortie needs 13.0 (measured) | THE STOP, §14 Q1 |
| | 44.0.0 #52288 | ANGLE statically linked into every process; `libEGL`/`libGLESv2` no longer shipped | The renderer's WebGL (xterm's `addon-webgl`); `build/after-pack.cjs:63-72` counts Mach-O files, pins no count or name | 28 Mach-O files, all arm64 (measured); ANGLE's code mapped in main and helpers too | Lens A A5 (resident sizes) |
| | 44.9.0 #55073 | App shims for windows under another app's Dock icon; `Helpers/app_shim_loader` in the framework | No `app shim` API under `src/` | One more Electron-owned binary in the bundle, signed by the release lane like the rest | A5, the release lane (D13) |
| Clipboard | 44.0.0 #52508 | **The `clipboard` module is the W3C shape**: `read`, `write(ClipboardItem[])`, `readText`, `writeText` return promises; `writeImage`, `readHTML`, `readRTF`, `readImage`, `availableFormats`, `readBuffer`, `writeBuffer` and the bookmark and find helpers removed; gone from renderers | `src/main/capture/service.ts:24`, `:72` (`writeImage`), `:224-228` (`write({text, html})`); `src/main/capture/ipc.ts:59-70`, `:111-113`; `src/main/harness/shot.ts:18`, `:286-332`, `:457`; `src/main/pocket/ipc.ts:139`, `:306` (`writeText`); `build/probe-p236-chip.mjs:552-570`; `build/probe-p239-anchored.mjs:797-815`. The renderers use `navigator.clipboard` only | 13 type errors; at runtime Capture Screen throws, Copy and Copy as HTML reject unheard, the harness and the two probes break | D4, D5; Lens A A7, Lens B U5 |
| Login item | 44.0.0 #52667 | `openAsHidden`, `wasOpenedAsHidden`, `restoreState` removed; a deadlock in `getLoginItemSettings()` fixed | `src/main/restore/login-item.ts:127`, `:134`, `:181` use `openAtLogin` alone | A possible deadlock removed | — |
| `net` | 44.0.0 #52216, #52397 | `net.request` refuses frame destinations without navigate mode; `select-client-certificate` now also for `net.request`/`net.fetch`, and unhandled it presents the first matching certificate | No `net.request` under `src/`; the two `net.fetch` calls fetch `file:` URLs; electron-updater's requests go to servers that ask for no client certificate | Nothing in the tree | — |
| Sandboxed preloads | 45.0.0 #54048 | No `events`, `timers`, `url`, `Buffer`, `setImmediate` in SANDBOXED preloads | Both windows are `sandbox: false` (`src/main/index.ts:419`, `src/main/settings/window.ts:83`): their preloads keep Node | Nothing in the tree | — |
| Windows, security | 45.0.0 #52472, #53706, #53692; 44.3.0 #53723 | `window.open` children of unsandboxed openers in their own process; `nodeIntegrationInWorker` only from frames that have Node; `execCommand('paste')` needs activation in its frame; reply IPCs validated against the sender | Every window open denied (`src/main/security/trusted-window.ts:135`); no worker integration, no webview; paste is `webContents.paste()` from main (`src/main/capture/ipc.ts:118`) | Nothing in the tree | The build's containment gates |
| ASAR | 45.0.0 #52833 | `fs.open` and friends read a packed file in place; its descriptor is useless to a native addon, a child's `stdio` or `respondWithFile`; writing fails `EACCES`; `fs.stat` follows a packed symlink | The two utility entries load from `app.asar` by path; no fd of a packed file is handed anywhere (`openSync` only in `src/main/watcher/open-files.ts:523` and `src/main/updates/shipit-state.ts:345`, both on real files); the `.node` files and `.wasm` are unpacked or `extraResources` (`electron-builder.yml:342`) | Nothing in the tree; the packaged launch proves the forks load | A5 |
| `builtinModules` | 45.0.0 #53624 | Electron's `electron/js2c/*` bundles no longer listed | `src/main/arch/resolver/index.ts:154` builds `BUILTINS` from it | Measured: the eight `electron/js2c/*` names leave (82 → 74); no Node builtin moves; no repository imports them | §2.2 |
| utilityProcess | 45.0.0 #54230 | A child that fails to launch reports `systemErrorCode` in `child-process-gone`, and (source, §0.1 item 8) `exit` with code 1 is posted when its stdio cannot be set up | Both forks `stdio: 'ignore'` (`/dev/null` opened per fork); the watcher host restarts on an unexpected exit with its backoff (`src/main/watcher/host.ts`), the door host as `src/main/pocket/bind.ts:218-219` and `src/main/pocket/ipc.ts:653`, `:662` | Under descriptor exhaustion a fork now ends at once with `exit(1)` rather than never answering (43.8.7: no event; the host's 10 s reply bound replaced it) | Lens B U6 |
| | 44.1.0 #53279/#53300, 44.8.0 #54960, 44.10.0 #55273, 44.4.1 #53968 | The 43.5.0, 43.8.0 and 43.8.4 utility-process fixes, carried; object lifetimes | Both hosts (`bind.ts:205`, `host.ts:220`) | Already in 43.8.7: measured the same at both (§2.2) | A2 |
| | unchanged | `Kill()`, `Create`'s option parsing, `OnV8FatalError` | `host.ts:258-288` rule 7, `:221-232`; `bind.ts:193-208` | The rules stay right (measured) | A2 |
| Protocol handlers | 45.0.0 **#54301** (45 only) | `process.nextTick` and promise callbacks queued in `protocol`/`webRequest` handlers now run at the right time | Both handlers are async and answer with `net.fetch(pathToFileURL(real))`: `src/main/assets/protocol.ts:117-142`, `src/main/preview/protocol.ts:625`, `:641` | Their awaits resume sooner; the stream loader under them is 43.5.0's fixed one | Lens B U4 |
| | 45.0.0 #53742 | `registerSchemesAsPrivileged` refuses a scheme that is not RFC 3986 | ONE call, `src/main/assets/protocol.ts:92-104`, schemes `gmux-asset` and the preview's, both valid | Nothing | `privileged-schemes.test.ts` |
| | 45.0.0 #54521 | `protocol.registerSource()` (experimental) | Not used | Nothing in the tree | — |
| Menus | 45.0.0 #53914; 45.1.0 #55326 | `Menu`/`MenuItem` native and faster; `Menu.popup()` sometimes showed nothing after another closed (fixed by closing without animation) | `src/main/menu-popup.ts:136-143` (popup, then one macrotask before resolving the click); the application menu (`src/main/menu.ts`); probes press rows with `item.click()` | Measured: `item.click()` is a function and runs the click synchronously at both; a quick second right-click menu now shows | A3, Lens B B1 (the Quit row) |
| Crash reporting | 45.0.0 #54519, #53851 | `start` native (same defaults, a wrong-typed option throws); `setUploadToServer` after `start` works; a Windows helper | `src/main/log/crash.ts:99` (`crashReporter.start({ uploadToServer: false })`), the dump sweep `:87-89`, `src/main/log/index.ts:347-377` | Nothing moves for `{ uploadToServer: false }` | Lens B B2 (a 45 dump read by the lens's own reader) |
| Uncaught exception | unchanged | The dialog's title | `src/main/log/crash.ts:200` | Stays right | — |
| safeStorage | 45.0.0 #53850 | **The synchronous methods are deprecated; Electron 46 removes them**; each warns once per process on main's stderr (`console.warn('(electron) …')`, `lib/common/deprecate.ts`); the sync path still calls `OSCrypt` as at 43.8.7; the async encryptor dropped `kEncryptSyncCompat` | Five callers: `src/main/settings/store.ts:795`, `:807`, `:828`; `src/main/config/seal.ts:68`, `:84`, `:108`; `src/main/credentials/index.ts:139`, `:159`, `:167`; `src/main/harness/vault-drive.ts:201`; the door's sealed identity through them. Main's console is not captured into app.log | Up to three warning lines on main's stderr per run; nothing in app.log; nothing a person sees | NOT driven (his keychain); §14 Q3 |
| powerMonitor | 44.6.0 #54596 | A launch crash when macOS refused sleep and wake registration (43.7.8's, carried) | `src/main/power/index.ts:219`, `src/main/capabilities.ts:391` | Already in 43.8.7 | — |
| Quit | 45.0.0 #54526; 45.3.0 #55680; 45.3.2 #55773 | A potential crash at shutdown; a hang at quit with `systemPreferences.subscribe*Notification` (not used); cookies set just before quit saved | `src/main/index.ts` and `src/main/capabilities.ts`' quit; no `subscribe*Notification` under `src/` | Fewer exit-time faults | A3, B1 |
| Updater | 44.0.0 #51584; 44.7.0 #54204; 44.7.2 #54844 | Squirrel.Mac updated: streamed and resumed downloads, binary deltas, an interrupted update no longer leaves a broken app | electron-updater 6.8.9 drives `autoUpdater` (`src/main/updates/updater.ts`, `shipit-state.ts`) | The update INTO 45 is installed by the 43.8.7 app's Squirrel; later updates by 45's | NOT run unsigned (D9, §10.3) |
| `executeJavaScript` | 45.0.0 #54959 (45 only) | `userGesture: true` now grants browser-side user activation | The shot harness (`src/main/harness/shot.ts:143-169`, `executeJavaScript(js, true)`) and `src/main/power/smoke.ts:94`; no product path | A driven page may now pass activation gates it failed at 43 (a probe's reading can move) | Lens A A3 notes it per probe |
| Theme | 45.0.0 #54648 | A stale `shouldUseDarkColors` after resetting `themeSource` | `src/main/settings/chrome.ts:50`, `:107`; no `themeSource` under `src/` | Nothing in the tree | — |
| Launch | 45.0.0 #54528, #52290 | Framework prefetched at cold launch; only the locales Electron uses shipped | The packaged app | Time to window may move; measured in A4 | A4 |
| V8, ABI | 44.0.0, 45.0.0 | V8 15.0 → 15.6; modules 148 → 150; code caches from 43 refused and rebuilt once | The renderer's code cache in a person's profile; web-tree-sitter's wasm (`src/main/symbols`) | The first launch after the update compiles once | A4 |
| Bundled Node | 44.x, 45.x | 24.22.1 → 24.22.2 (24.22.2's security release) | Main, both utility processes, the skills check (`src/main/skills/resolve.ts:365`), the door's `node:tls` (`src/main/pocket/door/listener.ts:636`), APNs' `node:http2`, the name check's `node:dgram` | None expected to refuse Tortie's own certificates | Lens B B3 |
| Fuses, entitlements | — | Fuse schema identical; no new entitlement | `electron-builder.yml:420-432`, both entitlement files (`allow-jit`, `allow-unsigned-executable-memory`, `allow-dyld-environment-variables`) | Nothing | A5's fuse wire |
| Bundled Node (read at the build) | 45.3.3 #55753 | **Node 24.22.3, a security release** (`…/p369/electron/notes/node-24.22.3.json`): a mutual TLS server with no session id context resumes no session; renegotiation, a HelloRetryRequest or a resumption can no longer change the SNI; a remotely reachable TLS server crash fixed; HTTP/2 stream and buffer fixes | The phone door's TLS server (`src/main/pocket/door/listener.ts:633-643`: `requestCert`, `rejectUnauthorized: false`, no `sessionIdContext`); APNs' `node:http2` | A phone that connects again does a full handshake instead of resuming; the pin check on `secureConnection` is unchanged | Lens B B3 (`probe:p330` at HEAD) |
| DevTools (read at the build) | 45.3.3 #55794 | A DevTools extension's `devtools_page` no longer runs before `chrome.devtools` exists | Tortie loads no extension | Nothing in the tree | — |
| Context menu (read at the build) | 45.3.4 #55503 | An element a person right-clicked is released after the `contextmenu` event (a renderer leak) | Tortie's right-click menus are native (`ui:popupMenu`), asked for from the renderers' `contextmenu` handlers | Less renderer memory held after a right-click; nothing drawn changes | — |

### 2.2 The runtime, read live in both binaries (`…/spec/rt/`, `program`: each binary by absolute path)

A scratch app (no window, Dock hidden, `crashDumps` in its profile, Crashpad with `ignoreSystemCrashHandler: true`; the
clipboard only asked `typeof`, `safeStorage` never called) loading the modules from the parent's `node_modules` by absolute
path; p45b loads node-pty from the scratch clone's 150 build. `…/spec/rt/out/rt-*.jsonl`, `out3/` for `builtinModules`.
Each launch exit 0, no dump, Crashpad's database made.

| Reading | 43.8.7 (the parent's) | 45.3.2 (p45: the parent's modules; p45b: node-pty built for 150) |
| --- | --- | --- |
| `process.versions` | electron 43.8.7, node 24.22.1, v8 15.0.245.31-electron.0, chrome 150.0.7871.250, modules 148, napi 10, uv 1.52.1 | electron 45.3.2, node 24.22.2, v8 15.6.75.57-electron.0, chrome 156.0.8078.100, modules 150, napi 10, uv 1.52.1; the utility child the same |
| `clipboard`'s keys | 20, `writeImage` a function, no `ClipboardItem` | `clear, has, read, readText, write, writeText`; `ClipboardItem` a function; `safeStorage.encryptStringAsync` a function |
| A menu row's `click()` | a function, the click ran synchronously with the item | the same |
| better-sqlite3 (prebuild) in main | 2,000 rows in WAL, 2,000 prepared reads, `integrity_check` ok, SQLite 3.53.4, 71 ms | the same, 28 and 30 ms |
| node-pty in main | 20 of 20 right, 188 ms | p45 (the 148 build) 20 of 20, 149 ms; p45b (the 150 build) 20 of 20, 427 ms |
| @parcel/watcher | main: 2 events in 88 ms; utility child: loaded the prebuild, 2 events in 6,618 ms | main: p45 no event in 8 s, p45b 2 events in 1,639 ms; child: p45 2 events in 44 ms, p45b no event in 8 s; the prebuild loaded every time. **FSEvents delivery was unreliable on the machine during the spec step** (load 6 to 22; the parent's own FSEvents tests failed the same way, §2.3), so this row says the module loads and works, not how fast |
| `app.getAppMetrics()` for a fork | `{ type: 'Utility', name: <its serviceName>, serviceName: 'node.mojom.NodeService' }` | the same |
| Fork to first message | 40, 44, 35, 34, 35 ms | 36, 35, 35, 35, 35 and 39, 37, 38, 37, 35 ms |
| Ending a child (Phase 365's M1) | `kill()` running 2 ms, exit 2 ms, code 0; SIGKILL then `kill()` running 2 ms; `kill()` stopped held main **2,004 ms**; SIGKILL then `kill()` stopped 3 ms; never a `child-process-gone` | the same: 3, 3, **2,004 and 2,005**, 3 ms; never a `child-process-gone` |
| 200 messages, then `process.exit(0)` | 200 before `exit`, three of three (the reader's counter missed `{ burst: 0 }` and printed 199) | the same |
| `env: {}` against one named variable | 22 variables with `HOME` against 3 without | the same |
| A child still launching at `app.quit()` | `exit` code 0 (#55272, in since 43.8.4) | the same |
| `builtinModules` in main | 82, eight of them `electron/js2c/*` | 74, none `electron/*`; the other 74 identical |

### 2.3 The parent's battery and probes (one Electron at a time, each under a lock slot)

| Run | How | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| `npm run build` | history block | 0 | 63 s | `gate:electron` 593 files, **188** reach the helper against a floor of 188; `gate:background` 595 files, 4 starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator` 593 scripts, 5 against 5; `gate:docker` 604, 2 against 2; known-hosts 625 files; `assert-hermetic-checks` 288 check scripts, 55 `tsxCli()` importers against 54, 1,209 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations; stapler 31, 18, 28; the contract byte for byte |
| `npm test` | history block, scratch `HOME`, `TMPDIR` through `/var` | 1 | 88 s | **22,956 passed, 12 failed, 24 skipped of 22,992**; files 1,199 passed, 6 failed, 4 skipped of 1,209. The twelve: the four `/bin/ps` tests and eight FSEvents tests that waited for an event and saw none (`repo-watcher.native` ×4, `p365-process.native` ×3, `store-watch.native` ×1). Alone, a minute later at load 22: 2 of 10 still failed. Phase 364's landing battery (outside the block, `/private/tmp/tortie-ops/battery-p364.log:1149-1150`): 22,967 passed, 8 failed, 17 skipped, with `p365-process.native` failing the same way. The FSEvents tests are load-sensitive; the lenses run both builds in one session, interleaved |
| `conformance:runtime` | history block | 0 | 1.7 s | `^22.22.3 \|\| ^24.11.1 \|\| ^25.1.0 \|\| >=26.0.0`; 22.23.1, 26.8.2 (Homebrew) and 24.20.0 (Homebrew `node@24`) predicted yes and load each module once; 22.14.0 (`/usr/local`) predicted no and refused |
| `conformance:diagnostic` | history block | 0 | 1.0 s | PASS: 35 clauses, 170 attacks red, 47 controls green, 5 readers proved, 6 not applicable; D8 read the shipped prebuild |
| `check:checker` | history block, `--out …/spec/checker/parent --devdir …/spec/gyp/devdir` (43.8.7's headers fetched there by node-gyp 12.4.0, 0.8 s) | 0 | 167 s | 29 passed, 0 failed, 0 unreadable; every ablation caught and missed as owed; diagnostic `38c741d0…` (2,015,696 bytes, UUID `07F07E5D-…`), test `b9cece4d…`, plain `8e25e56a…`; nothing under `node_modules` moved; reports 43 before and after (its five deliberate faults in plain Node wrote none) |
| `smoke:quit` ×2 | `node build/harness-socket.mjs gmux-smoke-quit 'node build/quit-smoke.mjs quit'` | 0, 0 | 6.1, 3.8 s | 48 of 48 fixtures, 5 of 5 sentinel texts, 5 of 5 checkout cases; held: SIGKILL after **4,238** (the first after the build) **and 1,922 ms**, held line, sentinel armed and cleared, session list made, Crashpad's database, 0 dumps, 0 reports; teardown: exit 0 after **1,731 and 1,756 ms**, sentinel left marked |
| `smoke:quitdoors` ×2 | `… gmux-p144-doors 'node build/quit-smoke.mjs quit-doors'` | 0, 0 | 1.7, 1.7 s | 9 of 9 doors, SIGKILL after **1,595 and 1,638 ms**, 0 dumps, 0 reports |
| `smoke:fault` | `node build/fault-harness.mjs --json …` | 0 | 60 s | PASS, 20 cases, every invariant held (`…/spec/logs/parent-fault.json`) |
| `probe:p292` | `node build/harness-socket.mjs --fresh gmux-p292 'node build/p292/probe-p292.mjs'` | 0 | 133 s | a to h and RUN PASS, 0 findings |
| `probe:p365` SK, SQ, RH | `P365_ARMS=SK,SQ,RH P365_KEEP=1 P365_PARENT_CHECKOUT=…/spec/p365-parent P365_OUT_DIR=…/spec/p365-out/parent` | 0 | 230 s | SK-head PASS at 152 s (the SIGKILL's 24 watches re-bound 828 ms after the exit, 577 ms after the fork, 520 ms after ready; one more watcher exit, code 5, its dump in `FSEventsBackend::start`, read and deleted; the stopped process replaced at its 6 s bound with 38 requests pending; main 98 to 107 MB, the watcher 51 to 64 MB); SQ-parent PASS (`ce4c77f6`: SIGABRT, `napi_fatal_error` named from main's dump, read and deleted: the run's one deliberate crash, no report); SQ-head PASS (exit 0, no dump, `watcher.node` never in main); RH-parent and RH-head PASS (both ids armed, the first at 2,544 and 2,513 ms); RUN PASS |

### 2.4 The parent packaged, unsigned, and launched

- **The package** (lock slot, outside the block; `HOME` a scratch folder holding a `cp -Rc` of
  `/private/var/tmp/tortie-ops/pkg-home-43.8.7/Library/Caches/electron`; `ELECTRON_BUILDER_CACHE` his, read only;
  `CSC_IDENTITY_AUTO_DISCOVERY=false`; `node build/check-tmux-pin.cjs && node build/assert-bundle-refusals.mjs && node
  build/assert-preview-containment.mjs && node build/assert-css-order.mjs && node_modules/.bin/electron-builder --mac
  --publish never -c.mac.identity=null`): exit 0 in 58 s. `@electron/rebuild electronVersion=43.8.7` prepared three
  modules and rebuilt nothing (the native table by sha256, size and mtime identical before and after); the zip not fetched
  (its mtime unchanged); 27 Mach-O files, every one arm64; 7 externalized requires present; "skipped macOS code signing
  reason=identity explicitly is set to null", no `Developer ID` or `identityName` in the log; DMG 166,731,076 bytes, ZIP
  166,357,332; `latest-mac.yml` names no minimum. `CFBundleShortVersionString` 0.114.1, `LSMinimumSystemVersion` 12.0,
  framework 43.8.7. The builder cache's listing (13 entries) identical before and after.
- **The fuse wire** (`electron-fuses read`, `…/spec/logs/parent-fuses.txt`): RunAsNode Enabled, EnableCookieEncryption
  Disabled, EnableNodeOptionsEnvironmentVariable Enabled, EnableNodeCliInspectArguments Enabled,
  EnableEmbeddedAsarIntegrityValidation Disabled, OnlyLoadAppFromAsar Disabled, LoadBrowserProcessSpecificV8Snapshot
  Disabled, GrantFileProtocolExtraPrivileges Enabled, `undefined` (the ninth, `wasm_trap_handlers`) Enabled. The 45.3.2
  zip and 43.8.7's `dist/` read the same.
- **One launch** (`…/spec/bin/pkg-launch.mjs`, `program: 'packaged'`, `GMUX_SHOT` with a 25 s delay, one scratch git
  repository as its argument, every probed agent row hidden, `lsof` at 10 s and 20 s): exit 0 at 26.2 s. Main (`Tortie`,
  162.8 then 153.4 MB) holds `node-pty/build/Release/pty.node` and better-sqlite3's prebuild; ONE `Tortie Helper` (54.9 MB)
  holds `@parcel/watcher-darwin-arm64/watcher.node`; the renderer 135 MB, GPU 83.6 then 68.6 MB, the network service 30 MB,
  tmux 1 MB. No dump; app.log: `opening folder from launch` and, at the shot's exit, `the watcher process exited (code 0)`.
  The helper's teardown "ended 1 process the teardown found still running". `release/` (463 MB app) removed after.

### 2.5 The lock prediction, the type check and the trials in a scratch clone (`…/spec/tscheck`, removed by nobody)

A `cp -Rc` clone of the worktree, its `.git` file removed: no tree that ships changed.

- **Types** (§0.1 item 6): 45.3.2's `electron.d.ts` in, `tsc -b` exit 2 with 13 errors, the node project exit 0, 20 s.
- **The postinstall's rebuild**, `electron-rebuild -f -w node-pty,better-sqlite3` with 45.3.2's `package.json` in the
  clone and a scratch `HOME`: **exit 255, "Could not detect abi for version 45.3.2"** with node-abi 4.33.0; with node-abi
  4.40.0's four files copied in: exit 0 in 15.4 s, "Building modules: @parcel/watcher, better-sqlite3, node-pty", headers
  fetched into the scratch `HOME/.electron-gyp/45.3.2`, the native table §0.1 item 4 gives.
- **The checker**: `checker-selftest.mjs --out …/spec/checker/trial45 --devdir …/spec/gyp/devdir` (45.3.2's headers): 29
  passed, 0 failed, 240 s; every module byte-identical to the 43.8.7 build; reports 43 before and after.
- **The package** (lock slot; `HOME` seeded with the 45.3.2 zip at its `@electron/get` folder; `electron-vite build`, the
  four read-only checks, `electron-builder --mac --dir --publish never -c.mac.identity=null`): exit 0 in 35 s;
  `@electron/rebuild electronVersion=45.3.2`; **28 Mach-O files**, all arm64 (against the parent's 27: `+app_shim_loader`,
  `+@parcel/watcher/bin/darwin-arm64-150/watcher.node`, `+node-pty/bin/darwin-arm64-150/node-pty.node`, `-libEGL.dylib`,
  `-libGLESv2.dylib`); 7 externalized requires; signing skipped; `LSMinimumSystemVersion` **13.0**, framework 45.3.2, the
  four helpers renamed. With node-abi 4.33.0 put back: `⨯ Could not detect abi for version 45.3.2`, exit 1.
- **One launch of that package** (`pkg-launch.mjs`, as §2.4): exit 0 at 26.5 s (parent 26.2); main (174.2 then 158.3 MB)
  holds the 150 `pty.node` and better-sqlite3's prebuild; ONE `Tortie Helper` (53.2 MB) holds the watcher prebuild;
  renderer 149 then 137 MB, GPU 92 then 71, network 32, tmux 1; no dump; app.log's same two lines; no `(electron)` or
  `deprecated` line on its output (a fresh profile never asks `safeStorage` at boot).
- **`out/`**: identical to the parent's but `BUILD_COMMIT` and the parent's `out/p292/` (§0.1 item 10).

### 2.6 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `stat` of his two history files (start 13:05, every lockrun, the end) | 0 | | `746321 1794670684`, `23166 1790702242` every time |
| `df -h /` | 0 | | 80 to 84 GiB free |
| `npm view electron versions`, `dist-tags`, `time`, `electron@45.3.2`, `@43.8.7`; `npm view node-abi versions`, `time`, `@latest`; `@electron/rebuild`, `electron-builder`, `electron-vite` versions (scratch `HOME` and cache, history block) | 0 each | | §0.1 items 1, 5, 10 |
| `curl` of both npm tarballs (integrity re-derived), the 45.3.2 zip (sha256 re-derived), node-abi 4.34.0 to 4.40.0, `releases.json`, five pages of GitHub's releases API (unauthenticated, 500 releases, the 38 of 44.x and 45.x kept), both `breaking-changes.md`, 45 Electron source files at both tags, Chromium's `mac_sdk.gni` at 150.0.7871.250 and 156.0.8078.100 | 0 each | | §0.1, §2.1 |
| node-gyp 12.4.0 `install` of 43.8.7's and 45.3.2's headers into `…/spec/gyp/devdir` | 0, 0 | 0.8 s each | installVersion 11; `node_version.h` 148 and 150 |
| `npm run build`, `npm test`, `conformance:runtime`, `conformance:diagnostic`, `check:checker` at the parent | §2.3 | | §2.3 |
| `git clone --shared --no-checkout` of the parent, `checkout --detach ce4c77f6`, `cp -Rc` of `node_modules` and `build/vendor`, `npm run build` there | 0 | 60 s | `…/spec/p365-parent`, 186 helper users against 186 |
| `lockrun.sh` × 12: quit-parent (both quit smokes twice), fault-parent, p292-parent, p365-parent, pkg-parent, pkglaunch-parent, rt, rt2, rt3, pkg-trial45 (twice), pkglaunch-trial45 | 0 each | 1 to 638 s | §2.2 to §2.5; every slot released once |
| `tree-list.mjs` at the parent and the worktree | 0 | | 567 entries each, identical; the lock's sha256 `cb2c4661…` at both; `npm ls --all` 144 `UNMET OPTIONAL` lines of other platforms |
| `npm install --package-lock-only` in `lockpredict`, `npm update node-abi --package-lock-only` in `lockpredict2` | 0, 0 | <1 s | §0.1 item 5 |
| `tsc`, `electron-rebuild` (×2), `checker-selftest.mjs`, `electron-vite build` and `electron-builder --dir` (×2) in `…/spec/tscheck` | §2.5 | | §2.5 |
| The Electron count (CLAUDE.md's command, outside the block, at the end) | 0 | | §As built of the spec step below |
| His reports folder | | | 41 entries at the first run, 43 at the end. Added during the spec step: `Electron-2026-11-14-134532.ips` (mtime 1794681932, inside the parent's packaged launch, 13:45:21 to 13:45:47) and `Electron-2026-11-14-134559.ips` (1794681959, after it, before the next run). Both are named `Electron`, the development binary's name; that launch ran only processes named `Tortie…`, and the p359 reverify held a slot from 13:42:13 running `wt-p359/node_modules/electron/dist/Electron.app`. Neither is attributed to this step; neither was opened |
| Slips, said plainly | | | Outside the history block: read-only `stat`, `ls`, `grep`, `sed -n`, `cat`, `awk`, `diff`, `cmp`, `shasum`, `openssl dgst`, `otool`, `nm`, `lipo`, `codesign -dv`, `file`, `xattr`, `PlistBuddy`, `uptime`, `git log`/`status`; three `node -e` reads (the tarball checksums, the `@electron/get` folder hash, and one import of the worktree's own node-abi to ask it four versions; a second import, of the downloaded 4.35.0, failed on `semver` and ran nothing); `python3` and `sed -i` edits of the spec step's own scratch files; this file written with the Write tool. The first runtime launch had no `package.json` in its app folder, so Electron's default app ran (and may have shown its window and Dock icon) for 10 min 29 s until the spec step sent SIGTERM to its own launcher (pid 15680, read by `ps -p` first), whose helper ended the app; the slot was held that long. His history never moved |

## 3. The tree at this head: the paths the move touches

**Edited, by the builders:** `package.json:416` (`"electron": "^43.8.7",` → `"electron": "^45.3.4",`) and
`package-lock.json` (`:64`, `:4023-4025`, and on Q2 (a) `:6633-6635`) by `electron`; `src/main/capture/service.ts`,
`src/main/capture/ipc.ts` and the new `src/main/capture/__tests__/p369-clipboard.test.ts` by `clipboard`;
`src/main/harness/shot.ts`, `build/probe-p236-chip.mjs` and `build/probe-p239-anchored.mjs` by `harness`. **Edited, by the
integrator:** `CHANGELOG.md` (his Q1 (a)), and this file's §0.2 and §As built.

**Read and unchanged** (the Tortie column of §2.1): `src/main/pocket/bind.ts`, `src/main/pocket/ipc.ts`,
`src/main/watcher/host.ts`, `src/main/log/crash.ts`, `src/main/log/index.ts`, `src/main/index.ts`, `src/main/capabilities.ts`,
`src/main/assets/protocol.ts`, `src/main/preview/protocol.ts`, `src/main/security/trusted-window.ts`,
`src/main/diagnostics/process-gone.ts`, `src/main/menu-popup.ts`, `src/main/menu.ts`, `src/main/power/index.ts`, the five
safeStorage callers, `src/main/restore/login-item.ts`, `src/main/arch/resolver/index.ts`, `src/main/settings/chrome.ts`,
`src/main/skills/resolve.ts`, `src/main/tmux/resolve.ts`, `electron-builder.yml`, both entitlement files,
`build/after-pack.cjs`, `build/assert-arm64-only.mjs`, `build/diagnostic/**`, `build/p364/**`,
`build/conformance-runtime.mjs`, `build/verification-checks.mjs`, `build/conformance-watcher.mjs`,
`build/conformance-redline.mjs`, `electron.vite.config.ts`, `.nvmrc`, `.github/workflows/**`.

## 4. The design

### 4.1 The move (builder `electron`)

Its files: `package.json` (the one line) and `package-lock.json`. Its scratch: `/private/var/tmp/tortie-wt/scratch/p369/electron/`
and the three folders the install writes: `X=/private/var/tmp/tortie-wt/scratch/p369`, `$X/install-home`, `$X/npm-cache`,
`$X/electron-cache`. Every step runs from `/private/var/tmp/tortie-wt/wt-p369` with every token and socket variable of §0
unset, `HOME=$X/install-home ZDOTDIR=$X/install-home npm_config_cache=$X/npm-cache electron_config_cache=$X/electron-cache
TMPDIR=/var/tmp/tortie-wt/scratch/p369/electron/tmp HISTFILE=/dev/null SHELL=/bin/sh`, under the history block unless it
says otherwise. **It starts only once he has answered Q2 (a)**; without node-abi the install fails at E2.

- **E0, before.** The history stats; `df -h /`; `npm view electron versions --json`: the newest 45.x is taken (45.3.4, his Q4), a
  newer one after the install reported, not installed (D8); `git diff --stat 3c8fc02e` shows only `build/p369/SPEC.md`;
  `node …/spec/bin/tree-list.mjs /private/var/tmp/tortie-wt/wt-p369` equals `…/spec/logs/tree-parent.txt` (567); the
  lock's sha256 starts `cb2c4661`; `zsh -f …/spec/bin/native-table.sh /private/var/tmp/tortie-wt/wt-p369` equals
  `…/spec/logs/native-parent.before` (the five patched files among it: `addon-webgl.mjs` `e4ab05d2…`, `addon-webgl.js`
  `311a2455…`, `xterm.js` `e417ca75…`, `xterm.mjs` `48624603…`, `node-pty/src/unix/pty.cc` `0a6b2908…`).
- **E1, the edit.** `package.json:416`, one line, with the Edit tool; nothing else in the file.
- **E1a, the lock for electron.** `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`: exactly
  `:64` and `:4023-4025` (§0.1 item 5).
- **E1b, the lock for node-abi (Q2 (a) only).** `npm update node-abi --package-lock-only --ignore-scripts --no-audit
  --no-fund`: exactly `:6633-6635`. Then `cmp package-lock.json …/spec/lockpredict2/package-lock.json` (sha256
  `cfdaa984…` at 45.3.2 and `3b17beaf`; at 45.3.4 and `3c8fc02e` the prediction is `8c80e28a…`); any difference STOPS the
  builder.
- **E2, the install.** `npm install --no-audit --no-fund`, no package argument. Expected: npm changes two packages; the
  postinstall prints `[patches] … already applied` for `@xterm+addon-webgl+0.19.0.patch`, `@xterm+xterm+6.0.0.patch` and
  `node-pty+1.1.0.patch`; `electron-rebuild` fetches 45.3.4's headers into `$X/install-home/.electron-gyp/45.3.4`
  (`https://www.electronjs.org/headers`, answered at the spec step), builds @parcel/watcher's local copy, compiles
  `pty.node` and `spawn-helper`, compiles nothing for better-sqlite3, "Rebuild Complete". Exit code and wall time
  recorded. Any other package moved, anything global, or a failure: STOP and report.
- **E3, Electron's binary.** If `node_modules/electron/dist` survived E2, record its `dist/version` and `mv` it into
  `$X/electron/old-dist/`; then `node node_modules/electron/install.js`. It downloads `electron-v45.3.4-darwin-arm64.zip`
  into `$X/electron-cache/7a59d5bd370c2958cab00938a19523aad37fb643e4ce440c8a33e5417aa3eb43/`, checks it against
  `checksums.json` (sha256 `f3ac0124c48a6cc3aa9332caca0e913cc478cd3610a378881729ca33452caa72`), extracts it into
  `node_modules/electron/dist` and writes `path.txt`.
- **E4, the checks** (each with its numbers):
  - **B1** `node_modules/electron/package.json` 45.3.4, `abi_version` 150, `dist/version` 45.3.4, `path.txt`
    `Electron.app/Contents/MacOS/Electron`; `dist`'s files equal the zip's listing (`unzip -Z1`); `Info.plist`
    `CFBundleVersion` 45.3.4 and **`LSMinimumSystemVersion` 13.0**; `Contents/Frameworks` the same eight entries as
    43.8.7; the framework's `Libraries` holds `libffmpeg.dylib`, `libvk_swiftshader.dylib`, `vk_swiftshader_icd.json` and
    its `Helpers` `app_shim_loader` and `chrome_crashpad_handler`; the framework's UUID and `codesign -dv` recorded.
  - **B2** `node build/apply-patches.mjs` prints the three `already applied` lines; the five patched files' sha256
    unchanged (`addon-webgl.mjs` still `e4ab05d2…`).
  - **B3** the native table again: `pty.node` and `spawn-helper` rebuilt (the trial's `2137be90…`, 86,584 bytes, and
    `6c062590…`, 34,048, are the expectation; other bytes are reported, not a stop), `lipo -archs` arm64, `minos` 13.0;
    every `.forge-meta` `arm64--150`; `bin/darwin-arm64-150/` copies added and the `-148` ones kept; both prebuilds
    byte-identical; @parcel/watcher's local build rebuilt. Any other ABI tag: STOP.
  - **B4** the tree: `tree-list.mjs` against `tree-parent.txt` is exactly `node_modules/electron electron@43.8.7 →
    electron@45.3.4` and `node_modules/node-abi node-abi@4.33.0 → node-abi@4.40.0`. Anything else is named; a package
    that moved and 45.3.4 does not require is put back at the parent's version, and the report says how.
  - **B5** the delta: `git diff 3c8fc02e -- package.json` is the one line; `git diff 3c8fc02e -- package-lock.json` is
    exactly §0.1 item 5's three hunks, 7 lines added and 7 removed.
  - **B6** the runtime, live: copy `…/spec/rt/` into `$X/electron/rt/` and launch it once at HEAD under a lock slot
    (`node build/harness-socket.mjs --fresh gmux-p369rt 'node <copy>/launch.mjs /private/var/tmp/tortie-wt/wt-p369
    <out> head=/private/var/tmp/tortie-wt/wt-p369/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron=/private/var/tmp/tortie-wt/wt-p369/node_modules'`,
    outside the block, through a runner shaped like `…/spec/bin/lockrun.sh` with an owner tag of its own). Expected:
    §2.2's 45.3.2 column (Node 24.22.3 at 45.3.4) with HEAD's own modules; a reading that differs is reported, never adjusted.
  - **B7** `npm run typecheck`: **exit 2 with exactly §0.1 item 6's 13 errors in `src/main/capture/service.ts` and
    `src/main/harness/shot.ts`** (the `clipboard` and `harness` builders remove them); any other error: STOP.
  - **B8** `npm test` (history block, scratch `HOME`, `TMPDIR` through `/var`): §2.3's parent counts; the four `/bin/ps`
    tests named; an FSEvents test that fails is re-run alone once and named with the load. Any other failure: STOP.
  - **B9** `npm run build`: exit 0 with §2.3's gate lines (electron-vite does not type-check).
  - **B10** the history stats, the reports folder, the Electron count, the slot released.
- **What it returns**: every file changed with its line counts (`package.json` 1 and 1; `package-lock.json` 7 and 7), each
  command with its exit code, wall time and numbers, the native table before and after, the tree and lock diffs, the B6
  readings, and anything that moved that §0.1 did not predict.

### 4.2 The clipboard (builder `clipboard`, after `electron` returns)

Its files: `src/main/capture/service.ts`, `src/main/capture/ipc.ts`, `src/main/capture/__tests__/p369-clipboard.test.ts`
(new). It reads 45.3.4's `node_modules/electron/electron.d.ts` (`interface Clipboard`, `class ClipboardItem`).

- `service.ts`: import `ClipboardItem` beside `clipboard`. `remember(png, suggestedName)` becomes `async` and writes
  `await clipboard.write([new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })])` in place of
  `clipboard.writeImage(image)` (`:72`); it still records `lastCapture` first and returns the size read from
  `nativeImage.createFromBuffer(png).getSize()` and `png.byteLength`, as today. `captureViewport` awaits it;
  `captureImage` becomes `async` (`Promise<CaptureResult>`), its empty-image refusal unchanged. `writeRichClipboard` becomes
  `async (input): Promise<void>` and writes ONE item: `{ 'text/plain': input.text }`, plus `'text/html': input.html` only
  when `input.html.length > 0` (the comment at `:218-222` keeps its reason). No other line moves.
- `ipc.ts`: `capture:image`'s handler is `async` and `return await captureImage(input)` inside its `try`, so a rejection
  still becomes "Couldn't capture this session."; `clipboard:writeRich`'s handler `await`s `writeRichClipboard(input)`, so
  a failed write rejects the invoke as a thrown write did at 43.8.7, instead of an unhandled rejection in main.
- The test: `vi.mock('electron', …)` with a recording `clipboard.write` and a `ClipboardItem` that keeps its record, and
  asserts: one item per Copy with exactly `text/plain` (and `text/html` only when non-empty, never an empty one); one item
  per capture with exactly `image/png` whose Blob bytes are the PNG's; `captureImage` resolves only after `write` resolves;
  a `write` that rejects makes `capture:image` answer `UNKNOWN` "Couldn't capture this session." and `clipboard:writeRich`
  reject. Each assertion is shown red once against the parent's code (the builder's own ablation, named in its report).
- It runs `npm run typecheck` (the two `service.ts` errors gone), its test, `npm test`, and the path-triggered gates its
  files reach (none in CLAUDE.md's table names `src/main/capture/service.ts` or `ipc.ts`; `gate:checks` reads the new test
  file name, inside `npm run build`).

### 4.3 The shot harness and the two probes (builder `harness`, after `electron` returns, beside `clipboard`)

Its files: `src/main/harness/shot.ts`, `build/probe-p236-chip.mjs`, `build/probe-p239-anchored.mjs`.

- `shot.ts:286-332`: `priorClipboard` becomes the awaited reading of `clipboard.read()`: for each item its `types` and,
  for each type, the bytes of `await item.getType(type)` (a `Blob`, or the bookmark object for `electron
  application/bookmark`), plus the list of type names; the read happens where it happens today (shot mode with
  `GMUX_SHOT_CLIPBOARD` only, before any `wc.copy()`). `restoreClipboard` becomes `async`: when any type was saved, ONE
  `await clipboard.write([...])` of new `ClipboardItem`s carrying every saved type (an `osclipboard` raw format as its
  `Blob`, text types as strings, `image/*` as a `Blob`), and the meta-charset reasoning of `:312-319` kept only if a
  measurement at 45 shows `WriteHTML` still prepends it; when nothing was saved and the pasteboard listed no type,
  `clipboard.clear()`, still the one `clipboard.clear();` and still inside the restore (`conformance:redline` rule 13).
  `:457`'s `clipboard.readText()` is awaited. The `clipboard-formats` line keeps printing the type NAMES only, never a
  byte; it now prints 45's names (MIME types and `electron application/osclipboard;format="…"`), and the report names
  every probe that reads that line (`probe-p194-redline-view.mjs`, `probe-p197-nits.mjs`, `probe-p219-geometry.mjs`, and
  any other `grep -rln clipboard-formats build/` finds) and whether its expectation still holds.
- The two probes: the save, the copy and the restore inside their main-process evals move to the same shape
  (`clipboard.read()` then one `clipboard.write` of new items, `clipboard.readText()` awaited); `probe-p239-anchored.mjs`
  clears only after a save that succeeded, so a refused read leaves his pasteboard alone and fails the run. Each probe's
  own self-test or grader fixtures, if it has them, are run; neither probe is run live by the builder (the lenses decide,
  §14 Q6).
- It runs `npm run typecheck` (the eleven `shot.ts` errors gone), `npm test`, `npm run conformance:redline` (rule 13
  green, and red when the builder moves `clipboard.clear();` out of the restore in a scratch copy, named), and
  `node build/assert-electron-teardown.mjs` (the floor 192 still met).

### 4.4 The diagnostic build at 45 (no builder, D7)

`build/diagnostic/build-checker.mjs` reads `node_modules/electron`'s version and refuses a `--devdir` without that
version's `include/node/node_api.h` and an `installVersion` node-gyp accepts (`:252-272`); after E2 the install's own
`$X/install-home/.electron-gyp/45.3.4/` is that folder. The integrator runs `npm run check:checker -- --out
$X/integrator/checker --devdir $X/install-home/.electron-gyp` (expected: 29 passed and the three modules byte-identical
to §0.1 item 4), `npm run conformance:diagnostic`, and the diagnostic package (§11 step 13). `probe:p364` reads the
installed version (`build/p364/probe-p364.mjs:1547`), so it grades 45.3.4 without an edit.

### 4.5 What the integrator writes

- **CHANGELOG.md** (on Q1 (a) or (b)): §5's one item under `## Unreleased`, `### Changed`, its link added by the
  follow-up.
- **Unchanged, each confirmed**: `CLAUDE.md` (no row names the Electron version, the bundled Node or the macOS minimum;
  the `conformance:runtime` row's "never the Node inside Electron" stays true), `build/verification-checks.mjs` (no check
  script added; `SUPPORTED_NODE` is tsx's), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 192),
  `docs/audits/contract-baseline.txt` (byte for byte).
- **This file's §As built**: what moved, the seams (§9.2), the commands of §11 with their numbers.

## 5. Words

No new string a person reads in the app. On Q1 (a) or (b), one CHANGELOG item in his style:
`- Tortie now needs macOS 13 or later` (and on (b) nothing more: the feed's behaviour is not a person's sentence). The
clipboard change has no words: Copy, Copy as HTML and Capture Screen read as they do today.

## 6. What moves on purpose

Electron 43.8.7 → 45.3.4 (Chromium 150.0.7871.250 → 156.0.8078.100, V8 15.0.245.31 → 15.6.75.57, Node 24.22.1 →
24.22.3, NODE_MODULE_VERSION 148 → 150); the macOS minimum 12.0 → 13.0 (his answer); node-abi 4.33.0 → 4.40.0 (his
answer); node-pty's two binaries and @parcel/watcher's unused local build compiled again; the package's Mach-O files 27
→ 28; Capture Screen's and Copy's clipboard write through Electron's new API; the shot harness's pasteboard save and
restore through `clipboard.read()`. Nothing in the contract, no gate's rule count, no floor, no menu, no entitlement, no
fuse, no `electron-builder.yml` key. The first launch after the update compiles the renderer's code once (V8's caches
refused).

## 7. The gates

| Changed | Gate |
| --- | --- |
| `package.json`, `package-lock.json` | `gate:checks` (inside `npm run build`: `engines`, `SUPPORTED_NODE` and `.nvmrc` unchanged); `conformance:runtime` (unchanged table); `gate:contract` (byte for byte); `gate:arm64` (its self-test, and inside the package's after-pack over 45.3.4's framework and `app_shim_loader`) |
| The runtime under every built bundle | `conformance:watcher` (W365-1 to W365-10 green; W365-2's built half reads `out/main/index.js`); `conformance:pocket` (U5 reads the door's built chunks); `conformance:diagnostic`; `check:checker` |
| `src/main/harness/shot.ts` (the clipboard knob) | `conformance:redline` (rule 13) |
| `src/main/capture/__tests__/p369-clipboard.test.ts` (a test file added) | `gate:checks` |
| `src/main/capture/service.ts`, `ipc.ts`, `build/probe-p236-chip.mjs`, `build/probe-p239-anchored.mjs` | no path-triggered gate names them; `npm test`, `npm run typecheck`, `gate:electron` and `gate:background` (inside the build) read the probes |

## 8. The app runs

No new probe (D10). The runs this phase reads, with what each covers: `smoke:quit`, `smoke:quitdoors` and `smoke:fault`
(the quit's order and the session list under SIGKILL); `probe:p292` (real keys and wheel into the terminal: node-pty's
attach and Chromium's input); `probe:p365` SK, SQ and RH (the watcher's utility process, its kill and its quit, the
harvest's rescue with a stand-in codex); `probe:p167` (sessions split, closed and attached again, the renderer's heap);
`probe:p362`'s 64-shell arms; `probe:p330` (the door's utility process, its environment, mutual TLS, pairing over the
stand-ins, Remove, an unexpected exit, the quit, the orphan); `probe:p364` (the diagnostic build at 45); the
`GMUX_SHOT_CLIPBOARD` probes for the clipboard (§10.1 A7); the unsigned packaged app through `withElectron`; and the main
session's `smoke`, `smoke:t1` and `smoke:t3` at landing. Each probe's own header says what it needs; every launch hides
the agent rows it does not need and reads `agents:list` back.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns |
| --- | --- |
| `electron` | `package.json` (the `electron` line, `:416`, and nothing else), `package-lock.json`; it runs THE ONE INSTALL (§4.1) |
| `clipboard` | `src/main/capture/service.ts`, `src/main/capture/ipc.ts`, `src/main/capture/__tests__/p369-clipboard.test.ts` (new) |
| `harness` | `src/main/harness/shot.ts`, `build/probe-p236-chip.mjs`, `build/probe-p239-anchored.mjs` |
| integrator | `CHANGELOG.md` (on Q1), `CLAUDE.md` (only if a measurement contradicts a row, which none should), `build/verification-checks.mjs` (only if a classification moves, which none should), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR`, 192, unchanged), `docs/audits/contract-baseline.txt` (only if a contract line moves, which none should), this file's §As built |

No builder `diagnostic` (D7). `src/main/pocket/ipc.ts` is nobody's (D4).

### 9.2 The seams

- `electron` runs first and alone; `clipboard` and `harness` start from its tree (they need 45.3.4's `electron.d.ts` to
  type-check) and run at once on disjoint files.
- `clipboard` and `harness` share only the shape of Electron 45's `ClipboardItem`; neither imports the other's code, and
  the shot harness is not a product caller of `service.ts`.
- `npm run typecheck` is green only when both have returned (B7's 13 errors split 2 and 11); each builder's own report
  names the errors left in the other's file as expected.

### 9.3 The builders' briefs

- **`electron`**: §4.1 E0 to E4 in order, B1 to B10 each with its numbers, the STOP rules at E1b, E2, B3, B7 and B8,
  the return of §4.1. It runs no probe but B6's one launch, packages nothing, and edits nothing under `src/` or `build/`.
- **`clipboard`**: §4.2. It edits nothing but its three files, runs no Electron, and its report shows each test
  assertion red once against the parent's `service.ts`.
- **`harness`**: §4.3. It edits nothing but its three files, runs no Electron and no probe live, and reports every
  reader of the `clipboard-formats` line.

## 10. The proof, run rather than read (Tier 3)

Both lenses work at the parent (`wt-p369-parent`, 43.8.7) and at HEAD (`wt-p369`, 45.3.4), the parent first in every pair,
one Electron at a time, every pair in ONE session so the numbers share a machine and a load (record `os.loadavg()` at each
run's start: the machine ran at load 6 to 22 during the spec step). §2's numbers are the spec step's; a lens measures the
parent again beside HEAD and does not copy them.

### 10.1 Lens A: the behaviour (Method 1 the parent; real data)

- **A1, the gates once at HEAD**: `npm run typecheck`, `node build/contract-inventory.mjs --check`, `npm test` (history
  block), `npm run build`, `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket`,
  `conformance:redline`, `conformance:diagnostic`. Re-run once, then spend the time on the methods below.
- **A2, the runtime facts the tree depends on, with the lens's OWN instrument** (not `…/spec/rt/`, not the builder's B6):
  `process.versions` at both builds in main and in a utility child; `app.getAppMetrics()` naming a fork by its
  `serviceName` (`host.ts:258-264`); Phase 365's M1 kill shapes, each one's hold on main, exit code and
  `child-process-gone`; the environment a fork gets for `env: {}` against one named variable, read with `ps -E`
  (`bind.ts:193-208`); fork to first message; a child launching at the quit; the three native modules in main and the
  watcher in a utility child, by which `.node` file `lsof` shows.
- **A3, the battery and probes, both builds**: `smoke:quit` and `smoke:quitdoors` five rounds interleaved (the parent
  through its harness lines), `smoke:fault` once, `probe:p292`, `probe:p365` with `P365_ARMS=SK,SQ,RH` and the spec's
  `p365-parent`, `probe:p167` (at the parent through `node build/harness-socket.mjs --fresh gmux-p167-scale 'node
  build/probe-p167-scale.mjs'`), `probe:p362`'s 64-shell arms. For each probe that drives a page with
  `executeJavaScript(…, true)`, a reading that moved is checked against #54959 before it is called a regression.
- **A4, THE UPDATE PATH (independent method: the update a person makes)**: both builds packaged unsigned (§11 step 12,
  and the parent as §2.4), then, each pair on its own scratch profile and socket inside one `build/harness-socket.mjs`
  run, through `withElectron` with each package's own executable as an absolute `program`: `GMUX_SMOKE=create` on the
  43.8.7 package then `GMUX_SMOKE=verify` on the 45.3.4 package, and `GMUX_SMOKE=t3-prep` then `t3-verify`; the session
  the 43.8.7 app made found, its pane attached, the manifest read (a read-only `sqlite3` of the scratch session list beside
  the harness's verdict), and the restorable row restored and armed; the controls are parent to parent and HEAD to HEAD.
  Then the time to the main window (the `window-shown` mark, `src/main/index.ts:694` names it) on a profile the 43.8.7 package wrote:
  HEAD's first launch against its second (V8's caches refused once), the parent's first against its second.
- **A5, the packaged app at HEAD**: §11 step 12's package; its fuse wire equal to §2.4 field for field;
  `CFBundleShortVersionString` 0.115.0, `LSMinimumSystemVersion` as he ruled (13.0), framework 45.3.4; 28 Mach-O files,
  every one arm64 (or each other one named); one launch as §2.4's: main holds the REBUILT `pty.node` (the builder's B3
  sha256, `b088cc43…`) and better-sqlite3's prebuild, ONE helper holds `watcher.node` alone, exit 0 by its shot, no dump, nothing left;
  resident sizes beside §2.4's, within 15% or explained (ANGLE now maps into every process).
- **A6, `out/` byte for byte (independent method: re-derive)**: `diff -r` of `out/main`, `out/preload` and `out/renderer`
  between the parent and HEAD. Expected: `BUILD_COMMIT` and the parent's `out/p292/`, and every byte the `clipboard` and
  `harness` builders' edits explain; anything else is a finding.
- **A7, the clipboard at both builds (real use)**: through the `GMUX_SHOT_CLIPBOARD` harness (its save first, its
  restore in a `finally`, names and sizes only): terminal Copy, Copy as HTML (a colored selection) and Capture Screen
  (the viewport and a history range), each at the parent and at HEAD; read after each, with the build's own API, the list
  of types, each type's byte length and sha256 of the TEST's bytes (never his), and the image's pixel size; HEAD must equal
  the parent type for type, or each difference is named and judged against what a paste into a browser, a text editor and
  an image editor receives. His pasteboard's type names and sizes equal before and after every run.

### 10.2 Lens B: the attack (Method 2)

- **B1, the quit table, both builds**: the native Quit row pressed in main with sessions running and the watcher
  watching; a quit pressed while the door process is still launching (the phone door switched on over the stand-ins and
  the Quit row pressed 0 to 200 ms later); a quit while the first watch is in flight; the teardown leg (`smoke:quit`).
  For each: the exit, the lines in app.log, any door, watcher or Funnel stand-in process left, and the sessions on the
  scratch socket unchanged.
- **B2, a crash dump written and read**: a scratch crash app per build (no window, Dock hidden,
  `crashReporter.start({ uploadToServer: false })` plus `ignoreSystemCrashHandler: true`, `crashDumps` in its profile, a
  planted canary variable), crashed once in main; the dump read by the lens's OWN reader: the module list (the framework's
  UUID per build), the exception, the threads, every memory range against the thread stacks (research 144: stacks only, no
  heap), the canary in the environment block; then deleted. A 45.3.4 dump that keeps a range research 144 did not see is
  named (it feeds the diagnostic build). Two deliberate crashes in all.
- **B3, the phone door over the stand-ins**: `probe:p330` at both builds (its header: the Tailscale stand-in behind its
  preflight and sampler, the DNS stand-in, two node phones over mutual TLS, `ps -E` of the door process, Remove, an
  unexpected exit, the quit, the orphan). At HEAD the door's TLS is Node 24.22.3's, which resumes no session for a mutual TLS server with no session id
  context, the door's shape: a phone that connects again does a full handshake (§2.1's 45.3.3 row).
- **B4, a renderer crash, both builds**: the main window's renderer crashed while sessions run; main stays up, one
  `process.gone` record, the sessions on the scratch socket untouched (Tortie never ends a session), the quit afterwards by
  its ordinary path; at most one report per build, named.
- **U4, the protocol handlers (#54301, #53276's shape), both builds**: the real app under research 143 §2.4's request
  shape: `gmux-asset:` and the preview's scheme requested and aborted mid-stream at a high rate for at least 10 minutes;
  no crash, no error, main's peak resident size beside the parent's (Phase 366's lens saw 19,585 MB against 5,429 MB at
  43.8.7 under 16 fetches of 8 MB at once; the same shape is measured again at 45.3.4).
- **U5, the clipboard under hostile payloads, both builds**: Copy as HTML of an empty selection, a 1 MB selection, text
  with non-BMP characters, NUL and a lone surrogate; Capture Screen of a 1-pixel image, a 16,384-pixel-wide history range,
  and a PNG the renderer cannot decode; each answer (resolved, refused with which words, unhandled rejection in app.log or
  not) beside the parent's. Under A7's save and restore.
- **U6, a utility process that cannot launch (45's `exit(1)`)**: in a scratch app on both Electrons, a fork with
  descriptors exhausted (a lowered `RLIMIT_NOFILE` set before the fork); then the real app at HEAD with the watcher's fork
  failing the same way: the host's lines, its restart and give-up, no session touched, the parent's answer beside it.
- **G1, garbage collection with the native modules**: research 143's Tortie-shaped better-sqlite3 churn beside node-pty
  spawns, in a scratch app on HEAD's Electron for at least 10 minutes: no abort.
- **The independent step, ablations**: a hostile copy of `conformance:watcher`'s input (through a scratch copy) with
  each fork's `stdio` made a short array, an empty `env` and a second `utilityProcess.fork(`: each red at 45.3.4 as at
  43.8.7 (D6); `p369-clipboard.test.ts` run over `service.ts` with each of D4's choices undone one at a time (the
  `writeImage` call put back, the empty `text/html` written, the await dropped): each red; and node-abi 4.33.0 planted back
  in a scratch clone of HEAD: the postinstall's rebuild and the package must fail loudly (exit 255 and 1), never pass.

### 10.3 Not run, and why

`conformance:resume:capture` and the full `conformance:resume` (they start real agents: his standing rule overrides the
entry's proof line; restore and the harvest are held by `conformance:derived`, the restore and harvest vitest files inside
`npm test`, `probe:p365` RH's stand-in codex, A4's `t3-prep` to `t3-verify` across the two packages, and the main
session's `smoke:t1` and `smoke:t3`); `smoke`, `smoke:t1` and `smoke:t3` by any role but the main session; a signed
package, a signed launch and the real Squirrel update from a 43.8.7 build to a 45.3.4 build (his identity and his ShipIt
state; `build/update-rehearsal.mjs` builds "locally signed packages"; D9, D13); `safeStorage` live (his keychain: §2.1
weighs it from the sources; its sync path is unchanged and deprecated); macOS 12 itself (no Monterey Mac here: the plist
and every binary's `minos` are the evidence); a real Tailscale, DNS, APNs or ssh; the Simulator and the phone build
(nothing under `ios/` moves); his everyday app.

### 10.4 No regression (both builds, one session)

| Row | What | Parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | `npm test` in the block | at `3c8fc02e`: 23,470 passed, 12 failed (the `/bin/ps` four and eight load-sensitive FSEvents tests), 45 skipped of 23,527 (22,956, 12 and 24 of 22,992 at `3b17beaf`) | the same with the 10 new clipboard tests passing, or every other failure explained as load by its re-run alone, beside the parent's in the same session |
| N2 | `npm run build`, `npm run typecheck` | §2.3's lines; typecheck clean | the same lines; typecheck clean (the 13 errors gone) |
| N3 | `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket`, `conformance:redline`, `conformance:diagnostic`, `check:checker` | PASS, the same tables; the checker 29 of 29 | the same; the checker's modules byte-identical |
| N4 | `smoke:quit` held and teardown, `smoke:quitdoors` | PASS; 1,922, 1,731 to 1,756, 1,595 to 1,638 ms at the spec step | PASS on every leg; each leg's median within 250 ms of the parent's in the same session, or explained |
| N5 | `smoke:fault` | PASS, 20 cases | PASS, 20 cases |
| N6 | `probe:p292` | 0 findings, a to h | 0 findings |
| N7 | `probe:p365` SK, SQ, RH | all PASS; SK re-bind 828 ms after the exit; RH first id at 2.5 s | all PASS; within the parent's range in the same session |
| N8 | `probe:p167`, `probe:p362` 64 shells | their verdicts and rulers | PASS, no ruler worse |
| N9 | the update path | the controls | 43.8.7 package to 45.3.4 package as parent to parent, and HEAD to HEAD |
| N10 | the packaged launch | §2.4 | the same holders of each `.node`; exit 0; no dump; resident sizes within 15% or explained |
| N11 | the runtime facts (A2) | §2.2 | rule 7's shapes unchanged; fork to first message no slower than the parent's slowest plus 20 ms; `exit` at the quit answered with no line and no restart |
| N12 | `out/` | — | identical but §10.1 A6's named differences |
| N13 | the fuse wire | §2.4 | identical |
| N14 | the clipboard (A7, U5) | the parent's types, lengths and answers | the same, or each difference named and judged by what a paste receives |
| N15 | `smoke`, `smoke:t1`, `smoke:t3`, `package` (main session) | the main session's battery at the parent | exit 0 |
| N16 | macOS 12 | opens | does not open (13.0): the ruled change, on his Q1 |

A row worse than the parent is a defect: fixed, or the part dropped and named (D12). N16 is the one ruled exception.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `gmux-p369*` and probe socket under
`/private/tmp/tmux-501/` gone or with no server answering; the history stats; the reports folder by name and mtime; no
`.dmp` left under the run folders; his pasteboard's type names and sizes as at the role's start; every lock slot this role
took released.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `git -C /private/var/tmp/tortie-wt/wt-p369 diff --stat 3c8fc02e` (only the builders' seven files, `CHANGELOG.md` if Q1,
   and `build/p369/SPEC.md`); `git diff 3c8fc02e -- package.json package-lock.json` (the one line and exactly §0.1 item 5's
   three hunks); `git diff --stat 3c8fc02e -- src ios resources` (only the four `src/main` files of §9.1)
2. `node …/spec/bin/tree-list.mjs /private/var/tmp/tortie-wt/wt-p369` against `…/spec/logs/tree-parent.txt` (only electron
   and node-abi)
3. `node build/apply-patches.mjs` (three `already applied`; `addon-webgl.mjs` sha256 `e4ab05d2…`)
4. `npm run typecheck` (clean)
5. `node build/contract-inventory.mjs --check` (byte for byte)
6. `npm test` (history block, scratch `HOME`, `TMPDIR` through `/var`; the four `/bin/ps` tests named as the expected
   failures, every FSEvents failure re-run alone once and named with the load)
7. `npm run build` (`gate:electron` 192 against 192; `gate:checks` with the new test file; the contract byte for byte)
8. `npm run conformance:runtime`, `npm run gate:arm64`, `npm run conformance:watcher`, `npm run conformance:pocket`,
   `npm run conformance:redline`, `npm run conformance:diagnostic`
9. `npm run check:checker -- --out $X/integrator/checker --devdir $X/install-home/.electron-gyp` (29 passed; the three
   modules byte-identical to §0.1 item 4)
10. the CHANGELOG item of §5 if Q1, then `git diff --stat 3c8fc02e`
11. `npm run smoke:quit`, `npm run smoke:quitdoors`, `npm run smoke:fault`, each under a lock slot
12. `npm run package -- -c.mac.identity=null` under a lock slot (unsigned, discovery off, every token unset; `HOME` a
    scratch folder holding a `cp -c` of `$X/electron-cache/7a59d5bd…/electron-v45.3.4-darwin-arm64.zip` at
    `<HOME>/Library/Caches/electron/7a59d5bd…/`; `ELECTRON_BUILDER_CACHE=/Users/gdc/Library/Caches/electron-builder`, read
    only, its listing compared before and after; the log names no Developer ID; `@electron/rebuild electronVersion=45.3.4`
    rebuilds nothing, the builder's `pty.node` keeping its mtime; 28 Mach-O files, every one arm64; the externalized
    requires present; `LSMinimumSystemVersion` 13.0), then `node_modules/.bin/electron-fuses read --app
    release/mac-arm64/Tortie.app` (history block; equal to §2.4)
13. the diagnostic package: `node build/diagnostic/build-checker.mjs --variant diagnostic --out $X/integrator/bs3 --devdir
    $X/install-home/.electron-gyp --json $X/integrator/bs3.json`, then, in a `cp -Rc` clone of the checkout under a lock
    slot, `node build/diagnostic/package.mjs --dir --checker $X/integrator/bs3/build/Release/better_sqlite3.node` with the
    same scratch `HOME` and cache rules (its JSON line: the packed module's sha256 the checker's, no `app-update.yml` or
    `latest-mac.yml`, the bundle id, D14's two schema versions), then `npm run conformance:diagnostic -- --node <the packed
    module>`
14. ONE packaged launch of step 12's app through the helper (`…/spec/bin/pkg-launch.mjs` copied into the integrator's
    scratch, under a lock slot): §2.4's readings at HEAD; then `release/` removed (and the clone of step 13 with its own)
15. The Electron count, the sockets, the history stats, the reports folder

## 12. What is NOT in this phase

- No Electron 46 or later, and no other dependency: not `@electron/rebuild`, electron-builder, electron-vite,
  `@types/node`, node-pty, better-sqlite3 or @parcel/watcher, whatever `npm outdated` says; node-abi only on his Q2 (a).
- No product code but the clipboard (D4): no line under `ios/` or `resources/`; no change to the quit's order, its bounds
  or its hard exits; no new listener (the door's fork stays without an `'error'` listener); `src/main/pocket/ipc.ts`'s
  `writeText` left as it is.
- No cleanup of what 43 needed: the string `stdio`, W365-7 and its message naming 43.3.0, the one-variable `env`, the
  SIGKILL before `kill()`, and every comment that records where a measurement was made.
- No port of `safeStorage` to the async methods (deprecated at 45, removed at 46: §14 Q3); no change to how Tortie seals.
- No `minimumSystemVersion` in `electron-builder.yml`, no feed change, no release-lane edit (§14 Q1 (b) is a later round
  of its own if he takes it); no entitlement, no fuse, no signing change; nothing signed, notarized, released, tagged,
  archived or uploaded; Tortie's own version stays 0.115.0 (0.114.1 at `3b17beaf`).
- No new probe, gate, seam, smoke mode or script under `build/`; no rebuild of the bundled tmux (its `minos 15.0` is
  noted, not touched).
- No reading of Chromium's history beyond what GitHub's mirror shows without signing in.

## 13. For the main session at landing

1. The battery at HEAD (`typecheck`, `build`, vitest, `package` unsigned, `smoke:t1`, `smoke`, `smoke:t3`) beside the
   parent's, both in one session; the FSEvents tests are load-sensitive (§2.3).
2. His checkout keeps Electron 43.8.7 and node-abi 4.33.0 until `npm ci` after main is merged into it, on his word,
   confirmed with `npm ls electron node-abi`; no gate ties the installed Electron to the lock (Phase 366 §As built).
3. **A later Electron move needs node-abi to know it first**: 46's ABI (154) is in node-abi 4.40.0 already, 47's will
   not be; the failure is loud (the postinstall exits 255).
4. **Electron 46 removes the synchronous `safeStorage`** Tortie uses in five places (§2.1): that port is a phase of its own
   before any move to 46; Electron 45's own fixes are expected to stop around mid-April 2027 (§0.1 item 13).
5. The bundled tmux reads `minos 15.0` (§0.1 item 3): with macOS 13 as the app's floor, a packaged Tortie on macOS 13 or
   14 runs a tmux built for 15; whether that matters was not measured.
6. Cleanup after the follow-up commit: the worktree, `wt-p369-parent`, and `/private/var/tmp/tortie-wt/scratch/p369/`
   (`spec/` with `p365-parent`, `tscheck`, `zip45`, `checker`, `gyp`, `install-home`, `npm-cache`, `electron-cache` with the
   45.3.4 zip, every role's folder), any `release/`, and the probe sockets.
7. The release itself is his word; the release lane's `build/verify-signed.mjs` is the first signed proof of the new
   framework, `app_shim_loader` and the rebuilt `pty.node` (D13).
8. `build/electron-run.mjs` documents `ceilingMs` among `withElectron`'s options (`:1427`) but enforces it only in
   `runElectron` (`:1738-1750`); a `withElectron` body that awaits `exited` alone is unbounded (the spec step's stuck launch,
   §2.6). Not this phase's to change (D10); a later round touching the helper may.

## 14. Questions for him (the main session asks; the build proceeds on the defaults once he answers Q1 and Q2)

1. **macOS 12.** Electron 44 and later do not run on macOS 12, so a Tortie on Electron 45 needs macOS 13 or later, and
   today's update feed would still offer it to a Mac on macOS 12, where it would not open. **Default (a)**: move to 45 and
   accept macOS 13 as Tortie's minimum, with one CHANGELOG line saying so. **(b)**: the same, and a later release-lane
   round makes the feed name the minimum so a macOS 12 Mac stays on 0.114 (electron-updater 6.8.9 compares the feed's
   `minimumSystemVersion` with the kernel's version, so it would be written `22.0.0`; not built or measured here).
   **(c)**: stay on 43 until its fixes stop, around mid-December, and decide again for 46. Context: the tmux Tortie bundles
   is already built for macOS 15.
2. **node-abi.** The install fails at 45 because node-abi 4.33.0 does not know Electron 45. **Default (a)**: move node-abi
   to 4.40.0 in the lock alone (three lines, measured to fix the install, the package and a launch in a scratch clone).
   **(b)**: no move, and the phase cannot install 45 (the other ways change the postinstall script and still leave the
   package step failing).
3. **safeStorage.** Electron 45 deprecates the synchronous `safeStorage` calls Tortie uses in five places and Electron 46
   removes them. **Default**: nothing in this phase; the port to the async calls is its own phase before any move to 46.
4. **The version.** 45.3.2 was published a day before this spec. **Default**: take it (the newest, as the brief asks); a
   newer 45.x published during the phase is reported, not taken.
5. **A changelog line.** **Default** with Q1 (a) or (b): `Tortie now needs macOS 13 or later`. The other choice is none.
6. **His pasteboard during the proof.** Measuring Copy, Copy as HTML and Capture Screen at both builds writes the
   pasteboard; the shot harness saves every flavour first and puts it back after, showing only names and sizes.
   **Default**: run it that way (Phases 191 to 239 did). The other choice is to skip A7 and U5 and rely on the unit tests
   and the sources (both versions reach the same system writer calls).

**His answers, 2026-11-17** ("ok all of the defaults for the 3 questions seem good", relayed by the main session with
the build's brief), which settle the stop:

- **Q1 (a)**: move to 45 and accept macOS 13 as Tortie's minimum, with ONE CHANGELOG item under Unreleased, Changed:
  `Tortie now needs macOS 13 or later`. No feed change in this phase.
- **Q2 (a)**: node-abi 4.33.0 → 4.40.0 in the lock alone, the three lines of §0.1 item 5.
- **Q3**: no `safeStorage` port here; it is its own phase before any move to 46.
- **Q4**: the newest 45.x at the install: 45.3.4 (45.3.3 and 45.3.4 were published after this spec; their notes are
  §2.1's last three rows; every 45.3.2 this spec names as the target reads 45.3.4, and its facts are re-derived in §0.1
  items 1 and 2 and §As built).
- **Q5**: the default line, as Q1 (a) says.
- **Q6 (a)**: the proof measures Copy, Copy as HTML and Capture Screen at both builds with his pasteboard saved first,
  every flavour, and put back after, showing only names and sizes (§4.3; but see §As built, "For the lenses", on what
  the parent's harness can put back).

## §As built of the spec step (2026-11-14, 13:05 to 14:25)

Nothing under `src/`, `build/` (but this file), `ios/` or `resources/` moved; `git diff --stat 3b17beaf` shows this file
alone, untracked. The parent `wt-p369-parent` holds only its built `out/` (with `out/p292/`) beyond its commit; its
`release/` was removed. Every lock slot taken was released once. His history never moved; his reports folder is §2.6's;
no `.dmp` is left under the spec step's scratch.

## §As built (the integrator, 2026-11-17, 17:37 to 18:10 local, 22:37 to 23:10 UTC)

Three builders, then the integrator, in `/private/var/tmp/tortie-wt/wt-p369`. **The main session moved the worktree and the
parent from `3b17beaf` to origin/main `3c8fc02e` before the build started** (§0.2), and the build ran on **his answers of
2026-11-17** ("ok all of the defaults for the 3 questions seem good"): Q1 (a) macOS 13 and one CHANGELOG item, Q2 (a)
node-abi 4.40.0 in the lock alone, Q3 no safeStorage port, Q4 the newest 45.x at the install (45.3.4), Q5 the default
line, Q6 (a) the pasteboard measured with every flavour saved and put back. Nothing committed, staged or stashed.
`git diff 3c8fc02e` is 8 changed files (413 insertions, 123 deletions) and 2 new ones (this file and the test), all this
phase's. The machine ran at load 7 to 65 (his own work: `fseventsd` above a full core, a Virtualization.framework VM).

### What is in the tree

| Builder | File | Lines |
| --- | --- | --- |
| `electron` | `package.json` (`:416`, `^43.8.7` → `^45.3.4`) | +1 −1 |
| | `package-lock.json` (`:64`, `:4023-4025`, `:6633-6635`, three hunks) | +7 −7 |
| `clipboard` | `src/main/capture/service.ts` (`remember` and `captureImage` async, `ClipboardItem` writes, `writeRichClipboard` async) | +33 −10 |
| | `src/main/capture/ipc.ts` (`capture:image` awaited inside its `try`, `clipboard:writeRich` awaited) | +10 −4 |
| | `src/main/capture/__tests__/p369-clipboard.test.ts` (new, 10 rows over a mock of Electron 45's clipboard) | 347 |
| `harness` | `src/main/harness/shot.ts` (`GMUX_SHOT_CLIPBOARD` saves every listed flavour with `clipboard.read()`, puts them back in ONE awaited write, prints `clipboard-put-back` names and sizes) | +219 −57 |
| | `build/probe-p236-chip.mjs` (`COPY_AND_PUT_BACK`, note K6) | +69 −27 |
| | `build/probe-p239-anchored.mjs` (`PASTEBOARD_SAVE` and `PASTEBOARD_PUT_BACK`, note C3) | +68 −17 |
| integrator | `CHANGELOG.md` (`## Unreleased`, `### Changed`, `- Tortie now needs macOS 13 or later`, no link: the follow-up adds it) | +6 |
| | this file (the header, THE STOP's settlement, the table, §0, §0.1 to §0.2, §1, §2's note and three rows, §3 to §14, this section) | |

**The lockfile against the parent** (`git diff 3c8fc02e -- package-lock.json`, sha256 `8c80e28a…` against the parent's
`674cac09…`): `"electron": "^43.8.7"` → `"^45.3.4"` (`:64`); `node_modules/electron` 43.8.7 → 45.3.4, `resolved`
`electron-45.3.4.tgz`, `integrity` `sha512-F3Z7…Cnw==` → `sha512-cqU5u6…qNDig==` (`:4023-4025`); `node_modules/node-abi`
4.33.0 → 4.40.0, `node-abi-4.40.0.tgz`, `sha512-vLBW…8raDA==` → `sha512-Guvq…cte/w==` (`:6633-6635`). Nothing else.

**The installed tree against the parent** (`…/spec/bin/tree-list.mjs`, 567 packages each): exactly
`node_modules/electron electron@43.8.7 → electron@45.3.4` and `node_modules/node-abi node-abi@4.33.0 → node-abi@4.40.0`.
The parent's tree equals the spec step's `tree-parent.txt`. Tortie's own version stays 0.115.0.

**The native table against the parent** (`…/spec/bin/native-table.sh`): `node-pty/build/Release/pty.node` `24998490…`
→ `b088cc43…` (86,552 bytes both), `spawn-helper` `3bc9f9a1…` (50,544) → `dfab72c2…` (34,000), the three `.forge-meta`
`arm64--148` → `arm64--150`, `@parcel/watcher/build/Release/watcher.node` `87d6a14c…` (491,408) → `065db535…` (465,440),
`bin/darwin-arm64-150/` added beside the kept `-148` copies for both; both prebuilds (`98e0e8ac…`, `bdc5c395…`), node-pty's
prebuilds and the five patched files unchanged. The parent's table equals the spec step's `native-parent.before`.

**The builders' own measurements**, each in its report and not repeated as the integrator's:
- `electron`: E1a and E1b exit 0 (1 s, 0.4 s); the lock predicted two ways, both `8c80e28a…`; E2 `npm install` exit 0 in
  18 s ("changed 2 packages", three "already applied", "Building modules: @parcel/watcher, better-sqlite3, node-pty",
  "Rebuild Complete"; headers in `install-home/.electron-gyp/45.3.4`, installVersion 11, `NODE_MODULE_VERSION` 150);
  E3 exit 0 in 4 s. B1: `dist` equals the zip's listing (584 entries), `Info.plist` 45.3.4 and `LSMinimumSystemVersion`
  13.0, the same eight `Frameworks` entries, `Libraries` libffmpeg, libvk_swiftshader and `vk_swiftshader_icd.json`,
  `Helpers` `app_shim_loader` and `chrome_crashpad_handler`, 14 Mach-O files all arm64 at `minos` 13.0 (the parent's 15
  at 12.0), the framework's UUID `4C4C4419-5555-3144-A102-2A7318B44646` ad hoc linker-signed, 259,012 KB against 286,456.
  B6 (the spec's runtime reader at HEAD, slot 1, 16:32:13 to 16:32:35): exit 0 in 21.8 s, 0 dumps; Node 24.22.3, V8
  15.6.75.57-electron.0, Chromium 156.0.8078.100, modules 150, N-API 10, the same in the utility child; `clipboard` the six
  W3C methods and `ClipboardItem`; a menu row's `click()` synchronous; better-sqlite3 2,000 rows, `integrity_check` ok;
  node-pty 20 of 20; fork to first message 43 to 74 ms; the kill shapes held main 3, 3, 2,004 and 4 ms with no
  `child-process-gone`; `env: {}` 22 variables against 3; a child launching at the quit `exit` code 0; `builtinModules`
  74. The ablation: node-abi 4.33.0 put back in a scratch clone, `electron-rebuild` exits 255 "Could not detect abi for
  version 45.3.4"; 4.40.0 in the same clone exits 0.
- `clipboard`: its ablations A0 to A7 in a `cp -Rc` clone; at the parent's two files 9 of 10 rows red and 4 unhandled
  rejections ("clipboard.write expects an array of ClipboardItem", "clipboard.writeImage is not a function"); each row red
  in at least one arm. Electron's five clipboard sources at `v45.3.4` byte-identical to `v45.3.2`'s.
- `harness`: `conformance:redline` rule 13 red on its own message for CR1 (`clear()` moved out of the restore) and CR2
  (the put back moved out of the `finally`); a 20-case scratch test of the save and put back and 30 ablation arms, each red
  on its rule; p236's self-test 8 of 8, p239's 18 of 18; the readers of `clipboard-formats`: p194's check 21 still finds a
  name holding `text`, p197's line shape unchanged, p219 reads neither.

### The seams the integrator reconciled

1. **The type check needs both halves.** Exit 0 only with the `clipboard` and `harness` edits together (2 and 11 of
   the 13 errors); they share only Electron 45's `ClipboardItem` shape and import nothing of each other's.
2. **`out/` against the parent's**: 509 files each, and `out/main/index.js` alone differs, in 20 hunks: `remember`,
   `captureImage` and `writeRichClipboard` (`ClipboardItem` writes, awaited), the two handlers, the shot harness's save
   and put back, `BUILD_COMMIT` (`"3c8fc02e"` against `"3c8fc02e-dirty"`), and rollup renaming an unrelated local in
   another module, `notKept` → `notKept2`, because `shot.ts` now declares a top-level `notKept` in the same bundle.
   Nothing else; `out/preload` and `out/renderer` byte for byte.
3. **The shared files.** `CHANGELOG.md` gains his line (Q1 (a), Q5), under a new `## Unreleased` and `### Changed`.
   No second item: nothing else a person meets moved in what the build measured (the packaged app's holders, its launch
   and its words are the parent's; Copy and Capture Screen are the lenses' A7). Unchanged, each confirmed: `CLAUDE.md`
   (no row names the Electron version, its Node or the macOS minimum, and `conformance:runtime`'s "never the Node inside
   Electron" held: it read four Node lines on this Mac), `build/verification-checks.mjs` (`gate:checks` PASS, 295 check
   scripts, 1,232 test files with the new one), `build/assert-electron-teardown.mjs` (192 reach the helper against 192),
   `docs/audits/contract-baseline.txt` (byte for byte).
4. **This file**: 45.3.4 is the target everywhere the spec named 45.3.2 as one, with its facts re-derived (§0.1 items 1
   and 2: the tarball's `sha512-cqU5u6…`, the zip's 120,975,664 bytes and `f3ac0124…` against `checksums.json`, both
   re-derived again by the integrator); the spec step's own readings OF 45.3.2 (THE STOP, §0.1's "kept as read", §2)
   stay as measured, because rewriting them would claim readings nobody took. Every file:line that moved is §0.2's.

### The integrator's commands (§11), in order

History block (`…/integrator/bin/hb.sh`, the spec's shape) for everything but the Electron, `/bin/ps` and `lsof` runs,
which ran through `…/integrator/bin/lockrun.sh` (`zsh -f`, one slot taken once and released once from a trap, `env -i`,
`HOME` and `ZDOTDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, no `CSC_*`, `APPLE_*`, `GMUX_*`, `CLAUDE*`, `TMUX*`,
token or terminal variable), one at a time.

| # | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| 1 | `git diff --stat 3c8fc02e`; `git diff 3c8fc02e -- package.json package-lock.json`; `-- src ios resources` | 0 | | the seven builders' files (407 insertions, 123 deletions) and, untracked, `build/p369/` and the test; package.json one line, the lock exactly three hunks, 7 and 7; under `src/` exactly the four `src/main` files |
| 2 | `tree-list.mjs` at both trees | 0, 0 | | 567 each; exactly electron and node-abi differ |
| 3 | `node build/apply-patches.mjs` | 0 | | three "already applied"; `addon-webgl.mjs` `e4ab05d2…`; the native table above |
| 4 | `npm run typecheck` | 0 | 3 s | import boundaries 1,457 files, 8,306 imports, 0 violations; no runtime cycles (1,454 files, 5,086 edges); shared types OK |
| 5 | `node build/contract-inventory.mjs --check` | 0 | 1 s | byte for byte |
| 6 | `npm test` (scratch `HOME`, `TMPDIR` `/var/tmp/…`) | 1 | 133 s | load 17.6 to 59.5. **23,480 passed, 12 failed, 45 skipped of 23,537**; files 1,221 passed, 6 failed, 5 skipped of 1,232; `p369-clipboard.test.ts` 10 of 10. The 12 are the parent's 12 (its count at `3c8fc02e`, the `electron` builder's: 23,470, 12, 45 of 23,527): the four `/bin/ps` tests that cannot pass inside the block (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1) and eight FSEvents tests (`store-watch.native` ×1, `p365-process.native` ×3, `repo-watcher.native` ×4). Those three files alone, HEAD then the parent in one session: 8 of 10 failed (37 s, load 45) and 7 of 10 (38 s, load 31), the one that differs ("ignores churn inside an ignored directory") passing at the parent in 9.4 s. A plain-Node check at 17:43 saw **no FSEvents event in three rounds of 10 s** (`fseventsd` at 103% of a core): the machine was not delivering events. These tests load no Electron, and the code under them did not change |
| 7 | `npm run build` | 0 | 61 s | load 31. `gate:electron` 603 files, **192 reach the helper against a floor of 192**; `gate:background` 605 files, 4 starts each in a `finally`, 32 of 32 fixtures; `gate:simulator` 603 scripts, 5 of 5; `gate:docker` 615, 2 of 2; known-hosts 635 files; `assert-hermetic-checks` 295 check scripts, 56 `tsxCli()` importers against 54, 1,232 test files, the runtime range one range; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations; stapler 31, 18, 28; refusals as the parent's (8 updater); the contract byte for byte |
| 8 | `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket`, `conformance:redline`, `conformance:diagnostic` | 0 each | 2, <1, 5, 14, 28, 1 s | runtime: 22.23.1, 26.8.2 and 24.20.0 load each module once, 22.14.0 refused as predicted; arm64: 41 fixtures, 34 ablations; watcher: 5 sites, 10 W365 rules over 56 variants; pocket: 192 rules, 25,984 checks, U5 read 2 built files; redline: every rule, rule 13 one put back in a `finally` and one `clipboard.clear()` inside the restore; diagnostic: 35 clauses, 170 attacks red, 47 controls, 5 readers, 6 not applicable |
| 9 | `npm run check:checker -- --out …/integrator/checker --devdir <a cp -Rc of install-home/.electron-gyp, diff -r identical>` | 0 | 173 s | load 23 to 7. **29 passed, 0 failed, 0 unreadable**; diagnostic `38c741d0…` (2,015,696 bytes, UUID `07F07E5D-E0BE-3C7D-A002-4D548B843724`), test `b9cece4d…` (2,033,056), plain `8e25e56a…` (1,997,488): byte-identical to §0.1 item 4's; nothing under `node_modules` moved; reports 45 before and after |
| 10 | the CHANGELOG item; `git diff --stat 3c8fc02e` | 0 | | 8 files, 413 insertions, 123 deletions |
| 11 | `smoke:quit`, `smoke:quitdoors`, `smoke:fault` by their harness lines over the `out/` step 7 wrote, the parent's beside HEAD's, alternated | 0 each | | below |
| 12 | `npm run package -- -c.mac.identity=null` (slot; `HOME` `…/integrator/pkghome` holding a `cp -c` of the zip at `Library/Caches/electron/7a59d5bd…/`; `CSC_IDENTITY_AUTO_DISCOVERY=false`; `ELECTRON_BUILDER_CACHE` his, read only) | 0 | 57 s | load 24 to 35. before-pack installed skills 1.5.22 into `build/vendor/skills` (its `tar` 7.5.23); `@electron/rebuild electronVersion=45.3.4` rebuilt nothing (the native table identical before and after by sha256, size and mtime); the zip's mtime unchanged and nothing else written under that `HOME`; **28 Mach-O files, every one arm64** (after-pack, and the integrator's own count by first bytes: against the spec step's parent package +`app_shim_loader`, +the two `bin/darwin-arm64-150/` copies, −`libEGL.dylib`, −`libGLESv2.dylib`; 19 at `minos` 13.0, 6 at 11.0, 2 at 12.0, the bundled tmux at 15.0); 7 externalized requires present; "skipped macOS code signing reason=identity explicitly is set to null", **0 lines naming `Developer ID` or `identityName`**; DMG 165,603,300 bytes, ZIP 165,150,747 (the parent's at `3b17beaf` 166,731,076 and 166,357,332); `latest-mac.yml` names no minimum; `CFBundleShortVersionString` 0.115.0, **`LSMinimumSystemVersion` 13.0**, `com.itavero.tortie`, framework 45.3.4; the app 447,156 KB. His builder cache's listing (13 entries, size and mtime) identical before and after; the mtimes of his `~/Library/Caches/electron`, `~/.electron-gyp`, `~/.npm` and builder cache folders unchanged. `electron-fuses read` (block): **identical to §2.4's field for field**, nine fuses |
| 13 | `build-checker.mjs --variant diagnostic --out …/integrator/bs3 --devdir <the copy>` | 0 | 16 s | `38c741d0…`, 2,015,696 bytes, UUID `07F07E5D…`, Electron 45.3.4, node-gyp 12.4.0, headers on disk |
| 13b | `package.mjs --dir --checker …/bs3/…/better_sqlite3.node --git …/wt-p369` in a `cp -Rc` clone, its `.git` file removed (slot; the same `HOME` and caches) | 0 | 39 s | `ok`; `packedModule` `38c741d0…`, `sameAsChecker` true; the clone's prebuild `98e0e8ac…` unchanged; no `app-update.yml`, no `latest*.yml`, no blockmap; `com.itavero.tortie`; stamp `dev Diagnostic`; `mainNamesChecker` true; schema 20/13 against `v0.115.0` 20/13, `goingBack` same, `filesSame` true; before-pack found specstory, skills and tmux vendored; `@electron/rebuild` 45.3.4; 28 Mach-O files, every one arm64; 7 externalized requires; signing skipped, 0 `Developer ID`. `--git` is the integrator's: off the runner D14 reads the release from a checkout named there (read only, `git tag --list` and `git show`) |
| 13c | `npm run conformance:diagnostic -- --node <the packed module>` | 0 | 1 s | PASS; D8 read it as diagnostic; 35 clauses, 171 attacks red, 47 controls, 5 not applicable |
| 13d | the diagnostic app launched once (`…/integrator/bin/diag-launch.mjs`, the spec's `pkg-launch.mjs` with two more app.log words, through the clone's own helper, `program: 'packaged'`, `GMUX_SHOT` at 25 s, every probed agent hidden; slot) | 0 | 27 s | exit 0 at 26,141 ms; `diagnostic.armed` (checker 364.3, variant diagnostic, guard 16, `installed` true, `floorMs` 25); watcher `send` ×4, `start`, `exit`; `boot.env` names Electron 45.3.4, packaged; main holds the packed checker and `pty.node`, one helper the watcher prebuild; 0 dumps. No "updates are off" line, because no harness launch reaches `initUpdater` (`src/main/index.ts:822-827`); the bundle's two updater refusals hold by absence (step 7, and step 13b's refusals line) |
| 14 | ONE packaged launch of step 12's app (`…/integrator/bin/pkg-launch.mjs`, a copy of the spec's; slot) | 0 | 27 s | **exit 0 at 26,311 ms**; main 146.2 then 125.5 MB holds `node-pty/build/Release/pty.node` (`b088cc43…`, the rebuilt one) and better-sqlite3's prebuild (`98e0e8ac…`); **ONE Tortie Helper** (48.2 then 47.6 MB) holds `@parcel/watcher-darwin-arm64/watcher.node` (`bdc5c395…`); renderer 122.6 then 111.8 MB, GPU 80.0 then 69.2, network 29.7 then 28.0, tmux 0.9; no dump; app.log's two lines and `boot.env` electron 45.3.4; **no `(electron)` or deprecation line on its output**. Against §2.4 (the parent, the spec step's session): main 162.8 then 153.4, renderer 135, GPU 83.6 then 68.6, watcher 54.9, network 30: every HEAD size at or below its parent's. `release/` removed after, and the step 13 clone with its own |
| 15 | the end | | | below |

**Step 11, beside the parent** (load 21 to 65; every leg 0 dumps and 0 reports):

| Smoke | Parent | HEAD |
| --- | --- | --- |
| `smoke:quit` held (SIGKILL after) | 2,872, 2,963 ms | 3,103, 2,444 ms |
| `smoke:quit` teardown (exit 0 after) | 1,897, 1,852 ms | 1,975, 2,023 ms |
| `smoke:quitdoors` (9 of 9, SIGKILL after) | 2,619, 1,881 ms | 2,669, 1,819 ms |
| `smoke:fault` | PASS, 20 cases, 85 s at load 65 | PASS, 20 cases, 81 s at load 32 |

Each smoke's self-test 48 of 48 fixtures, 5 of 5 sentinel texts, 5 of 5 checkout cases. The medians sit within 250 ms
of the parent's (the teardown's 124 ms the widest); two samples a build are not N4's five rounds, which stay the lens's.

### For the lenses (found while integrating; none of them the integrator's files, so not changed here)

1. **`probe:p239` never runs at the parent** (§0.2 item 3), and the ported p239 and p236 are never pointed at an
   Electron 43 build.
2. **The parent's `GMUX_SHOT_CLIPBOARD` puts back text, HTML, RTF and one image only.** Q6 (a) promises every
   flavour, so before any parent arm of A7 or U5, read the pasteboard's flavour NAMES with a 45.3.4 reader that asks
   `clipboard.read()` for each item's `types` and reads no bytes. Run the parent arm alone only when every listed flavour
   is one of those four; otherwise wrap it in a 45.3.4 save and put back of every flavour, as HEAD's harness does.
3. **Read HEAD's `clipboard-put-back` line** (names and sizes before and after). `probe-p194-redline-view.mjs` and
   `probe-p197-nits.mjs` fingerprint his pasteboard with `pbpaste` and `osascript`, which this phase forbids, so neither
   runs.
4. **`probe:p368` at HEAD** (`build/p368/probe-p368.mjs:489-496`): its main recorder reads `d.text` from
   `clipboard.write`'s argument, an array at 45, so a Capture Screen during it records `''`. Its Copy rows come from its
   replaced `clipboard:writeRich` handler and are unchanged. Its `clipboard.writeHTML` assignment adds a property 45 lacks
   and nothing calls it. Nothing reaches his pasteboard either way.
5. **N11, fork to first message**: B6 read 43 to 74 ms at 45.3.4, in its own session at load about 10 to 17, against
   the spec step's 34 to 44 ms at the parent in another session. The bound (the parent's slowest plus 20 ms) must be read
   with both builds alternated in one session (A2).
6. **FSEvents was not delivering on this machine** at 17:43 (above). `probe:p365` SK, the watcher's event arms and A2's
   watcher-in-a-child row will read "no event" at both builds until it recovers. Run `…/integrator/bin/fsevents-check.mjs`
   (plain Node, the `electron` builder's) before them.
7. **Node 24.22.3 resumes no TLS session for the door** (§2.1's 45.3.3 row): `probe:p330` at HEAD meets a full
   handshake on every reconnect.
8. Stale prose, left: `src/shared/menu-codicons.ts:150` still says `clipboard.writeImage`, and
   `src/main/pocket/ipc.ts:306`'s `clipboard.writeText(text)` now returns a promise its caller drops (D4 leaves it).
9. The scratch the lenses may reuse: `…/integrator/pkghome` (the 45.3.4 zip seeded for a package `HOME`),
   `…/integrator/devdir` (the 45.3.4 headers, a copy), `…/integrator/bs3` (the diagnostic checker),
   `…/integrator/bin/{pkg-launch,diag-launch,macho-list,fsevents-check}.mjs`.
10. **The parent's `build/vendor/skills` is gone too** (the move removed it in both trees). The parent's first package
    therefore installs skills 1.5.22 there from the registry in its `before-pack`, as HEAD's did (git ignores the
    folder). Package the parent as §2.4 did, so its `out/` is not rebuilt.

### His history, his reports, the end

- History: `747174 1794949984` and `23166 1790702242` at the integrator's first stat (17:37:13), after every run, and
  at the last stat (18:09:34), after a second `npm run build` run once this section was written (exit 0, 68 s at load
  4.9, every gate line as step 7's). It never moved.
- Crash reports: 45 entries at the start and at the end, identical by name and mtime; every lockrun counted 45 before
  and after; nothing of the integrator's could have added one but `check:checker`'s five deliberate faults in plain
  Node, which added none. No `.dmp` under the integrator's scratch (both packaged launches read 0 and deleted 0).
- The Electron count, once, outside the block (18:04): none of the integrator's. His Tortie (35546, started 16:07:34)
  and its crash handler (35669), a crash handler of his earlier Tortie (94828), and Slack's, Granola's, Cursor's,
  Claude's and Chrome's crash handlers. No process names a `p369` path. `/private/tmp/tmux-501/` holds `gmux` alone. All
  three lock slots free. `release/` removed from the worktree and the clone; the clone removed. 86 GiB free.
- Outside the block, said plainly: the Electron runs through `lockrun.sh`; the end's `ps`; `ps` of `fseventsd`'s load;
  and, early, read-only `git status`, `git log`, `git diff --stat`, `ls`, `cat`, `stat`, `df`, `sysctl`, a `find` of the
  reports folder by name and mtime, one `node -e` printing `package.json`'s scripts, and a `diff` of the two fuse
  readings. Nothing interactive; none wrote outside the integrator's scratch.

### Not run, and why

`smoke`, `smoke:t1` and `smoke:t3` (the main session's, at landing); `smoke:remote` and `smoke:machines` (never);
`conformance:resume` and `conformance:resume:capture` (they start real agents); `probe:p364`, `probe:p365`, `probe:p292`,
`probe:p330`, `probe:p167`, `probe:p362`, the update path and the pasteboard arms (the lenses'); `safeStorage` live (his
login keychain; §2.1 weighs it from the sources, and the packaged launch printed no deprecation line); a signed package,
notarization, stapling, `verify-signed.mjs` and the real Squirrel update (his identity, his word); the parent's package
(the lenses', for A4, from `pkg-home-43.8.7`; item 10 above); macOS 12 itself (no such Mac here).

### The probe review, the lenses and the landing (2026-11-17)

**The probe review** (`scratch/p369/probe-review/`) fixed three graders, each proved by a before and after run, and
launched no Electron:
- `check:checker --reuse` never compared the Electron version in a build's record with the one installed, so builds made
  against 43.8.7's headers read green at 45 (29 passed with a record set to 43.8.7). It now requires
  `prior.electron` to equal the installed version; the same build was rebuilt against 45.3.4's headers, byte-identical
  (`b9cece4d…`). The parent's copy keeps the hole: at the parent, run it without `--reuse` or with a fresh `--out`.
- `probe:p239`'s C1 passed when no reading came back (`String(undefined)` has no control words), and its readings file
  kept the pasted text, which is his own text when the copy did not land. C1 now requires a string, and the file keeps
  only `{read, length, isTheFile}`: over four fixtures through the probe's own block, 1 of 4 answered wrongly before
  and 4 of 4 right after, with no text kept.
- `probe:p167-scale` left the previous run's `report.json` ("every driven profile plateaued") behind a run that stopped
  partway with exit 1. It now deletes the old report at its start.
- Found, not changed (none of them a probe or gate file), owed: `src/main/harness/shot.ts` prints `readText()` on its
  `[gmux-shot] clipboard` line when a copy writes nothing, which is then the pasteboard's own text (the parent does
  the same; p194 and p197 parse that line); a refused read after the put back still exits 0, with `after` a string and
  not a list; each flavour's bytes are fetched lazily, so a drive that writes the pasteboard while a read is pending
  would be saved as his; nothing grades the put back (HTML that did not start with Chromium's tag comes back 22 bytes
  longer, pictures are re-encoded, and SVG, image types other than PNG and flavours with non-ASCII names are lost).
  `probe:p364`'s arm R can never fail its "no Crashpad dump" check (its test app starts no crash reporter), and its
  other arms' dump checks do not require proof that Crashpad ran.

**Lens A, the behaviour** (`scratch/p369/vrt/`), answered **approved**. Its own step: the update path through two
unsigned packages by its own driver. A 43.8.7 package booted a profile seeded by `seed-sessions --shape his`, made six
shells on a scratch socket, typed into each through the bridge's own attach and quit by the native Quit row; two
sessions were then ended out of band; the 45.3.4 package on the same profile and socket found the four live ones with
the same pids, restored the two and typed into all six, twice, beside 43-to-43 and 45-to-45 controls. It also wrote its
own native-module app and measured the clipboard at both builds while HEAD's harness held his pasteboard. Every row
equal: npm test (every difference named), conformance:runtime and conformance:diagnostic, the quit smokes (medians of
five, ABBA: 2,487, 2,005 and 2,021 ms against 2,459, 2,019 and 2,267), smoke:fault, probe:p292 (arm h's race at both),
probe:p365 SK, SQ, RH, SO and SP at HEAD, probe:p167 and probe:p362 at 64 shells, probe:p368's a, b, d and f,
probe:p364's R and M1 on the diagnostic package, and Copy, Copy as HTML and Capture Screen. Main's resident size after a
packaged launch: 115.2 MB against 102.3 MB (+12.6%, inside §10.4's 15%).

**Lens B, the attack** (`scratch/p369/attack/`), answered **approved**. Its own steps: a minidump reader and a crash
app, crashing main, a utility process and the V8 heap at each Electron; a witness loaded into the real app's main at
both builds, pressing the Quit row at the watcher's and the door's first fork, killing and stopping both processes,
crashing the renderer, emitting sleep and wake during a quit, and starving main of descriptors during a watcher
restart; the parent's clipboard arm wrapped in a 45.3.4 keeper that saved every flavour; a capped asset-stream stress;
60 forks timed, alternated (median 38 ms against 37, maximum 84 against 64, at N11's bound); three ablations, Electron
43.8.7 planted under the 45 lock, W365-7 planted wrong three ways, process names stripped live. Every row equal or
better.

Their findings, and what the landing did:
- (minor, both builds, owed) A Quit pressed while the watcher process is launching, before the session list is held,
  ends main with SIGTRAP on CrBrowserMain during Node's teardown: 2 of 2 at each build and once at a parent relaunch. A
  person gets a macOS report and "Tortie quit unexpectedly" at the next launch. A later phase takes the hard exit, or
  ends a launching watcher, in that window.
- (minor, both builds, owed) Under 16 concurrent 8 MB `gmux-asset` loads cut mid-stream, main grows about 1.5 GB/s and
  keeps the memory; uncapped it hit a V8 out-of-memory crash at 20.7 GB at 43.8.7 and 10.4 GB at 45.3.4 (one sample
  each). Phase 366 noted the defect; a later phase measures it with forced GC.
- (minor, owed, and said at landing) Nothing ties `node_modules/electron` to the lock: with 43.8.7 planted under the 45
  lock, test, build, contract and conformance:runtime pass, typecheck fails only on a cold `.tsc` cache, and only
  `npm ls` says invalid. A checkout must run `npm ci` before Copy and Capture Screen work, because 43 has no
  `ClipboardItem`. A later round adds a check of `node_modules/electron`'s version against the lock.
- (minor, owed) Rule 7 of the watcher's quit depends on `app.getAppMetrics()` naming the utility process
  `Tortie Watcher`; W365-7 reads only that the guard calls it, and the unit test mocks the name. With the names stripped
  live, a stopped watcher held the quit 2,177 ms and nothing noticed. The dependency holds at 45.3.4, measured.
- (minor, owed) `probe:p292`'s `h alt` stage parks before the shell's loop has printed and stops the run (one full run
  at HEAD, one arm-h run at the parent); `probe:p365`'s RUN fails on any new macOS report whoever wrote it, and SK and
  `probe:p167`'s profile c read UNREADABLE or FAIL with no sentence when FSEvents delivers nothing.
- (nit) A lone surrogate in copied text pastes as three U+FFFD at 45 against one at 43; NUL and astral characters
  survive at both, and a terminal selection never holds a lone surrogate. No change.
- (nit) A watcher fork starved of descriptors exits at once at 45, which counts as an exit: a short exhaustion recovers
  in 6.3 s against 11.3 s, and a lasting one would spend the five restarts in about 36 s against about 76 s (reasoned,
  not run). No change.
- (nit, owed) `probe:p364`'s arm R pass sentence names Electron 43.8.7 although R read 45.3.4; `probe:p292`'s arm g is
  not self-contained when run alone; `probe:p330`'s A1, A2, A7 and A12 fail with identical clauses at both builds,
  their expectations older than the door at `3c8fc02e`; the door host logs "the door process stopped unexpectedly"
  twice per exit, at both builds.
- Crash reports: Lens B's runs wrote seven `Electron-2026-11-17-*.ips` reports into his DiagnosticReports folder
  (19:29 to 20:40), all from scratch profiles and never opened: four quit-at-fork crashes, the parent's relaunch quit,
  and the two uncapped out-of-memory runs.
- His history moved four times during the build: to `747174` at 16:13:04, before the first builder's first stat at
  16:52; then at 18:21:57, 18:38:58 and 18:43:28, to `747276`. At each of the last three, every command of every role
  then running was inside the no-history sandbox, which refuses writes to that file, so the moves are his own
  terminal's. `.bash_history` never moved.

**The landing** (`95885696` on `3c8fc02e`; main had not moved): typecheck, build, the unsigned package (45.3.4's zip
from a scratch package HOME, nothing downloaded; LSMinimumSystemVersion 13.0, framework 45.3.4, an ad hoc signature),
conformance:runtime, conformance:diagnostic, gate:arm64, conformance:watcher, conformance:pocket, conformance:redline,
check:checker (29 passed; the test, diagnostic and plain checkers byte-identical to the integrator's, `b9cece4d…`,
`38c741d0…` and `8e25e56a…`), smoke:t1, smoke and smoke:t3: every one exit 0. npm test exit 1 with 4 of 23,537 failing,
each a timing bound (p220-shutdown, ttfr.integration, specstory login, tmux resolve's hung shell); the four files alone
passed 56 of 56 at HEAD and at the parent, alternated, twice each. smoke:quit (held: SIGKILL at 2,041 ms; teardown:
exit 0 at 1,789 ms) and smoke:quitdoors (SIGKILL at 1,768 ms) PASS with 0 dumps and 0 reports. Said plainly: the main
session's first run of those two smokes was wrapped in the no-history sandbox, inside which Chromium cannot start its
own; both failed, and the crashed helpers wrote 20 `Electron Helper*.ips` and `Electron-*.ips` reports into his
DiagnosticReports folder (22:06 to 22:07). The run without the sandbox passed and added none. His history never moved
during the landing.
