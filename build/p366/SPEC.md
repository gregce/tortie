# Phase 366 — "Electron moves to the newest 43.x" — SPEC

Written by the spec step on 2026-11-09 in `/private/var/tmp/tortie-wt/wt-p366`, a detached worktree at origin/main
`a79ad099` ("docs(backlog): file watches one at a time, landed"; Phase 365 landed at `ae8599ad`). **`git diff a79ad099`
in the worktree must be exactly Phase 366's delta**, this file included. origin/main moves while the phase runs; nobody
here rebases, pulls or merges; the main session moves the tree at landing. The charter is `docs/BACKLOG.md`
"## Phase 366" (`:45208`), research 143 §2.5, §3 row (f) and §7 ("Move to the newest 43.x in a normal dependency phase,
not in this hotfix. 43.5.0 carries #53276."), and `build/p365/SPEC.md` D7 and D14, bound as written except where §0.1
says the tree or a measurement wins. His word, 2026-11-08 ("4. sounds good"). His standing rulings bind: **no regression
against today** (a scenario worse than the parent is a defect: fix it or drop the part, and name which); Tortie never ends
a session on its own; just enough words; no tmux vocabulary in anything a person reads; nothing released, tagged,
version-bumped, archived or uploaded; refusal 1 (no code Tortie did not choose: this phase changes which Electron runs
Tortie's own code and adds nothing that runs in it); his session count is allowed (`build/electron-run.mjs`'s read-only
census).

| | |
| --- | --- |
| Subject | `build(deps): move Electron to the newest 43.x` (the entry's) |
| First body line | `Phase 366: Electron at the newest 43.x` (the entry's) |
| Semver | Patch, unreleased, Mac only, released on his word. **No CHANGELOG item by default**: nothing a person sees moved in any measurement (§5, §14 Q1) |
| Lane | Build: Spec → Build (ONE builder, `electron`) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: Electron is the runtime of every Tortie process (main, the renderers, the phone door's and the watcher's utility processes, the skills CLI run as Node), node-pty is compiled against it, and better-sqlite3 (the manifest) and @parcel/watcher load inside it, so a defect anywhere can lose a person's work (CLAUDE.md:268). Parent measured (§2); two independent methods at least, one an attack (§10) |
| The version | **`43.8.7`**: npm dist-tag `43-x-y`, published 2026-11-03, the newest of the 25 releases after 43.3.0 (`latest` is 45.2.3) |
| The native ABI | **Unchanged: NODE_MODULE_VERSION 148 at both** (§0.1 item 2) |
| Product code | **None changes** (D4). Typecheck passes against 43.8.7's declarations (§2.5) |
| Menus | **No row added, renamed or removed** |
| Contract | **Does not move**: `gate:contract` must read byte for byte |
| `HELPER_USER_FLOOR` | **187, unchanged**: no script reaching `build/electron-run.mjs` is added (D7) |
| CLAUDE.md | Two clauses (D6); no row added |
| CHANGELOG | None by default (§14 Q1) |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree or scratch
  (`wt-p359*`, `wt-p360*` and `wt-p3251*` wait on his answers). Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p366/<role>/`, never under `/private/tmp`; a probe's `TMPDIR` points there too, and
  for `npm test` it is spelled through `/var/tmp/…` (Phase 365's finding: `preview/__tests__/protocol.test.ts` needs
  `tmpdir()` behind a symlink).
- **THE ONE INSTALL is the `electron` builder's (§4.1) and the only one in the phase**: in `/private/var/tmp/tortie-wt/wt-p366`
  only, through the repository's own npm and its own postinstall, with `HOME`, `npm_config_cache` and
  `electron_config_cache` in scratch. Nothing global, nothing in `/Users/gdc/gmux`, nothing in the parent, no
  `npm update`, no `npm audit fix`, no other package named. Every other role installs nothing: no `npm install`,
  `npm ci`, `npx`, `electron-rebuild` or `install.js`. A role that finds `node_modules` wrong stops and says so.
- **THE PARENT** is `/private/var/tmp/tortie-wt/wt-p366-parent` (`a79ad099`, Electron 43.3.0, the same `node_modules`),
  built once by the spec step (`out/` at 10:39). Never install, edit or rebuild anything in it: at the parent run the
  harness lines directly, never an npm script that begins with `npm run build` (`smoke:quit`, `smoke:quitdoors`,
  `smoke:fault`, `probe:p167`), and package it as §2.4 did (the package script's read-only checks, then
  `electron-builder`, so `out/` is not rebuilt), removing its `release/` afterwards. A role that needs a parent it can
  write makes its own `git clone --shared` with `node_modules` and `build/vendor` cloned by `cp -Rc`.
- **probe:p365's parent arms need `ce4c77f6`**: the spec step's built shared clone at
  `/private/var/tmp/tortie-wt/scratch/p366/spec/p365-parent` (`node_modules` and `build/vendor` cloned from the 366
  parent, so Electron 43.3.0; `out/` built; `.git/objects/info/alternates` names `/Users/gdc/gmux/.git/objects`, which is
  only read). Use it read only, as `P365_PARENT_CHECKOUT`.
- **The spec step's instruments are kept, read them, do not import them** (a builder may RUN the two launchers named in
  §4.1 B6, copied into its own scratch first): `…/scratch/p366/spec/rt/` (a no-window, Dock-hidden runtime reader
  `app/main.js` and `app/child.js`, its launcher `launch.mjs`, the parent's readings `out-parent.jsonl`);
  `…/spec/pkg/pkg-launch.mjs` and `out-parent.json` (the packaged launch with `lsof`); `…/spec/bin/` (`tree-list.mjs`,
  every installed `name@version`; `reports.sh`; `lockrun.sh`); `…/spec/logs/` (every parent run's log, `tree-parent.txt`,
  `parent-fuses.txt`, `npm-ls-wt.txt`); `…/spec/notes/` (the 25 release notes), `…/spec/prs/` (the PR diffs read),
  `…/spec/src/` (Electron's sources at both tags and 43.8.7's patch set), `…/spec/tarball/` (the 43.8.7 npm tarball,
  its `electron.d.ts` and `dts.diff`), `…/spec/lockpredict/`, `…/spec/p365-out/parent/probe-p365.json`.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.
- **No real agent runs, not even for a version.** Every real-app launch hides every probed registry row it does not need
  (`build/hidden-agents.mjs`) and reads `agents:list` back. `conformance:resume:capture` and the full `conformance:resume`
  start real agents and are NOT run (his standing rule overrides the entry's proof line, §10.3).
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents or his live Tortie profile. `safeStorage` reads and writes his login keychain, so it is
  NOT driven live; §2.1 weighs it from the release notes and the sources.
- **His crash reports.** Count `~/Library/Logs/DiagnosticReports` by NAME and mtime only, before and after every run that
  can crash (`…/spec/bin/reports.sh`); name what your run added; never open a report. A scratch crash app sets
  `crashDumps` into its own profile, starts Crashpad with `ignoreSystemCrashHandler: true`, hides its Dock icon and opens
  no window (the spec step's one deliberate crash, probe:p365's SQ-parent, reached nothing: 105 entries before the first
  run and after the last, identical by name and mtime). **Tortie itself does not ignore the system handler**
  (`src/main/log/crash.ts:99`), so a deliberate crash of a real Tortie process (Lens B's renderer crash) can add a report:
  at most one per build, each named. Grade a crash by its exit signal and by the dumps under YOUR scratch profile, each
  read and then deleted (a dump holds the process's whole environment, research 42:164); no `.dmp` is kept past its
  reading, copied out of scratch or committed.
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps` or
  `lsof` runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`; the four `/bin/ps` native tests
  fail inside it by design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1; name each as it fails). What
  needs Electron, `/bin/ps` or `lsof` runs outside it under `zsh -f` with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `SHELL_SESSION_HISTORY=0`, and every `CLAUDE*`, `CSC_*`, `APPLE_*`, `GMUX_*`,
  `TMUX*`, `SSH_AUTH_SOCK`, `SECURITYSESSIONID`, `GH_TOKEN`, `GITHUB_TOKEN`, `TERM_SESSION_ID` and `TERM_PROGRAM*`
  variable unset (`…/spec/bin/lockrun.sh` is the shape). Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history`
  before and after every run (`743319 1794200266` and `23166 1790702242`, unmoved across every run of the spec step). A
  move across an unblocked run: start nothing for 3 minutes and stat again; moved again is his; still moved means STOP
  and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. **His Tortie (pid 692) has the same bundle id as every build you run**: never an Apple
  Event, `osascript` or `open`; a quit is pressed through the native Quit row in main (`item.click()`), `app.emit`, or
  the harness.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two quit smokes through
  `build/quit-smoke.mjs`), with a scratch profile, `HOME` and socket. `smoke`, `smoke:t1` and `smoke:t3` start Electron
  outside the helper and are the MAIN SESSION's alone, at landing; `smoke:quit`, `smoke:quitdoors` and `smoke:fault` may
  be run, each under a lock slot. Driving a `GMUX_SMOKE` mode through `withElectron` is not one of those scripts and is
  allowed (Lens A's update path). No Simulator. No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or
  `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- **The lock has three slots, shared**: `zsh /private/tmp/tortie-ops/lock.sh try p366-<role>` prints the slot or exits
  1 (retry every 60 s in a NEW command); release it from a trap, ONCE, and only while the slot's `owner` file is still
  yours (`lock.sh release` checks nothing: the spec step's first runner printed its release twice after `smoke:fault`,
  the second `rm -rf` landing on a slot already free, and was fixed). Every probe, smoke, package or Electron run holds
  one. `df -h /` before any build, install or clone; under 8 GB free, wait and report (78 to 79 GiB free at the spec step).
- **PACKAGING IS UNSIGNED, ALWAYS**: `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*`, `APPLE_*`, `GH_TOKEN` and
  `GITHUB_TOKEN` unset, `-c.mac.identity=null`; never `--publish`, never notarize or staple, never
  `build/verify-signed.mjs` against his identity. A package log naming `identityName=Developer ID` is a defect reported
  at once. A packaged app launches only through `withElectron` with `program: 'packaged'`; `release/` is removed after.
- **Reads off the machine**: `npm view`, Electron's release notes and sources on GitHub, unauthenticated (`curl` or
  WebFetch, read only, post nothing); never `gh`.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

1. **The newest 43.x is 43.8.7.** `npm view electron versions --json` (1,878 versions) names 43.0.0 to 43.8.7; the
   `43-x-y` dist-tag is 43.8.7, published 2026-11-03T19:02Z; 25 releases follow 43.3.0 (43.4.0, 43.4.1, 43.5.0, 43.5.1,
   43.6.0, 43.7.0 to 43.7.11, 43.8.0 to 43.8.7). Its npm package: `dist.integrity`
   `sha512-F3Z7xEYlS62Re9Y2WCRhB8jFIkDwpUO7wjJ85l8NpPEgQ/CEyBvwtYEsNY2lioT7VOWi2vBrnMckCvXBkq+Cnw==` (re-derived from the
   tarball, 197,842 bytes), the same three dependency ranges as 43.3.0 (`@electron-internal/extract-zip ^1.0.1`,
   `@electron/get ^5.0.0`, `@types/node ^24.9.0`), `engines.node >= 22.12.0`, no install script; against 43.3.0's
   package only `version`, `install.js` (the zip extractor required lazily), `electron.d.ts` (1,122,904 → 1,138,588
   bytes), `checksums.json` and `README.md` differ.
2. **The native ABI does not move.** NODE_MODULE_VERSION is 148 at both: the `abi_version` file of both npm packages,
   `node_module_version = 148` in `build/args/all.gn` at both tags, and `modules: 148` for every 43.x in
   releases.electronjs.org's index. **The runtime**: 43.3.0 read live at the parent (§2.2): Electron 43.3.0, Node
   24.18.1, V8 15.0.245.23-electron.0, Chromium 150.0.7871.212, modules 148, N-API 10, libuv 1.52.1. 43.8.7 from the index,
   Electron's `DEPS` and `build/args/all.gn` at `v43.8.7`: Node 24.22.1, V8 15.0.245.31, Chromium 150.0.7871.250,
   modules 148, libuv 1.52.1; the builder reads it live (B6).
3. **Electron 43's npm package downloads its binary lazily, never at install.** It has no install script;
   `node_modules/electron/index.js` downloads on the first `require('electron')` whose `dist/` is missing, through
   `install.js` with `cacheRoot: process.env.electron_config_cache`. npm replaces the package folder when the version
   changes, so after the install `dist/` is expected to be gone until something asks (E3 handles it either way), and the
   first ask would be a probe's shim launch inside a scratch `HOME`. Hence D2: the builder runs Electron's own installer once, in the install's environment.
   `@electron/rebuild` reads only `electron/package.json` (`lib/electron-locator.js:9-24`, `lib/cli.js:117-125`), and
   `electron-vite` takes only the MAJOR version for its targets (`dist/chunks/lib-q6ns0vZr.js:121-131`, `:160-215`), so
   neither needs the binary and neither builds differently for 43.8.7.
4. **The three native modules, and what the move does to each.**
   - **better-sqlite3 13.0.3** loads its N-API prebuild `prebuilds/darwin-arm64.node` (`lib/binding.js` takes the
     prebuild first; `binding.gyp` defines `NAPI_VERSION=10`). The postinstall's `electron-rebuild -f -w …,better-sqlite3`
     compiles NOTHING for it: its two targets are `type: 'none'` when the prebuild exists (`binding.gyp`
     `prebuild_exists`), so `build/Release` holds only `.forge-meta` (`arm64--148`) and two stamps. The binary the app
     maps (UUID `C87A9325-F748-3E31-91DC-18CFB1217A68`, sha256 `98e0e8ac…`, the one in his crash report) is untouched.
   - **@parcel/watcher 2.6.0** loads `@parcel/watcher-darwin-arm64`'s N-API prebuild `watcher.node` (`index.js:14-20`;
     UUID `8AE534B6-…`, sha256 `bdc5c395…`). Its `build/Release/watcher.node` (17 September, 490,912 bytes, sha256
     `80062729…`, UUID `7301BDBF-…`, `.forge-meta` `arm64--148`) is a fallback the loader never reaches: the parent's
     packaged app shows the prebuild in the watcher's helper (§2.4). The postinstall does not name it.
   - **node-pty 1.1.0** loads `build/Release/pty.node` (`lib/utils.js:17-38`), compiled from the patched source
     (`patches/node-pty+1.1.0.patch`) by the postinstall's `electron-rebuild -f -w node-pty,…` against Electron's
     headers, with node-addon-api 7.1.1. Today: `pty.node` UUID `5C456E8C-A1FA-3DC2-9CB8-BC7EFDAAB523`, sha256 `26df302e…`,
     86,504 bytes; `spawn-helper` sha256 `42da90a4…`; both 17 September. The move compiles both again against 43.8.7's
     headers: a new build, the same ABI tag.
   - **None of the three uses `node::ObjectWrap`** (no match for it or `node_object_wrap.h` anywhere in `node-pty/src`,
     `better-sqlite3/src` or `@parcel/watcher/src`; all three are node-addon-api), so the Node 24.19+ abort Electron fixed in 43.6.0 (#53393:
     `~ObjectWrap()` asserting in garbage collection) is not reachable from Tortie's modules.
5. **The lockfile, predicted.** npm 10.9.8 resolving a scratch copy of `package.json` with `"electron": "^43.8.7"`
   against the worktree's lock (`--package-lock-only --ignore-scripts`, scratch `HOME` and cache, "up to date in
   604ms") changes exactly three hunks: the root's devDependency range (`:64`), a root `engines` block npm records from
   `package.json:10-12` (added by Phase 262 on 2026-09-13 and never written into the lock since: three lines added after
   `:74`, closing `devDependencies` and opening `"engines": { "node": "^22.22.3 || ^24.11.1 || ^25.1.0 || >=26.0.0"`),
   and electron's `version`, `resolved` and `integrity` (`:4020-4022`): 7 lines added and 4 removed in all. No other
   package moves. `npm ls --all` lists no extraneous or invalid
   package (143 lines, every one an absent optional platform package of another OS), so the install prunes nothing.
6. **The types.** A scratch copy of this tree with 43.8.7's `electron.d.ts` passes `tsc -b` and
   `tsc --noEmit -p tsconfig.node.json` (exit 0, 19 s, all five projects re-checked). The declaration diff (681 lines)
   touches nothing Tortie calls: `UtilityProcess`'s `login` gains a leading `event` (Tortie passes no
   `respondToAuthRequestsFromMainProcess`), `PrintToPDFOptions` folds into another structure (no `printToPDF` under
   `src/`), `SSLConfig.minVersion` narrows to `tls1.2 | tls1.3` (no `setSSLConfig`; the `minVersion` at
   `src/main/pocket/door/listener.ts:636` is Node's `tls`), `initiatorOrigin` is added, and the rest is documentation.
7. **What the release notes change that touches Tortie**: §2.1, row by row with the file and line each touches.
8. **Electron's own sources at the two tags** (GitHub raw, read): byte-identical are the crash reporter
   (`shell/browser/api/electron_api_crash_reporter.cc`, `lib/browser/api/crash-reporter.ts`), safeStorage
   (`electron_api_safe_storage.cc`), powerMonitor (`electron_api_power_monitor.cc`, `_mac.mm`),
   `lib/common/api/net-client-request.ts`'s `login`, and `UtilityProcessWrapper::Kill()` (`Terminate` then
   `base::EnsureProcessTerminated`, the 2 s wait `src/main/watcher/host.ts`'s rule 7 steps around). Changed: the utility
   process (the wrapper registry, the stdio default, `DispatchPendingMessages`, the `PostMessage` guard, `ShutdownAll`),
   `shell/services/node/node_service.cc` (the child boots from Node's startup snapshot), `shell/browser/browser.cc` (Node's
   per-process teardown before `exit()` when the loop never ran), `lib/browser/init.ts` (one import path in the uncaught
   exception dialog: its title and text are unchanged, so `src/main/log/crash.ts:200` stays right), `electron_api_app.cc`
   (no window from an opener Electron did not create; a scoped CoreFoundation reference), `build/args/all.gn` (V8's
   code-cache hash salted with Electron's V8 patch set; Node built against Chromium's V8).
9. **Chromium's patch set grew from 160 to 461 lines: 303 new patches.** Read in 43.8.7's source tarball: none touches
   `components/os_crypt`, keychain code, `partition_alloc`, `content/browser/utility_process`, `base/process` or `v8/`;
   two touch Crashpad ("Fix overflow in crashpad", `util/process/process_memory.cc`; "Round up OOB stack pointers in
   ScanStackForPointers", `snapshot/sanitized`), one the macOS power monitor (43.7.8's #54597), one the app shim (43.8.0's
   clicks posted to a background app), six `services/network`, eighteen `content/browser/renderer_host`. Chromium's own
   history between 150.0.7871.212 and .250 could not be read: googlesource answered 401, "Please sign in".
10. **The entry's mechanism 3 reads two gates as covering Electron's Node; neither does.** `conformance:runtime` measures
    tsx's loader on the Node lines installed on this Mac (`build/conformance-runtime.mjs:83-101`), and `gate:checks`
    holds `engines`, `SUPPORTED_NODE` and `.nvmrc` to one range for the machine that runs the checks
    (`build/verification-checks.mjs:98-175`). Electron's Node runs main, the two utility processes and the skills CLI
    (`ELECTRON_RUN_AS_NODE`, `src/main/skills/resolve.ts:365`), never tsx. Its 24.22.1 is inside `^24.11.1` anyway; it is
    read as `process.versions` (B6, Lens A) and both gates read the same before and after (D6 writes that down). And
    `gate:arm64` is not inside `npm run build`: it runs in every package's `build/after-pack.cjs` and as its own
    self-test; `gate:stapler` is inside the build.
11. **No fuse is flipped anywhere** (no `electronFuses` key in `electron-builder.yml`, no `@electron/fuses` call under
    `build/`), and the parent's packaged fuse wire is Electron's defaults (§2.4).
12. **The literals.** `package.json:404` (the entry's `:397` has moved), `package-lock.json:64`, `:4020-4022` move. The
    rest stay: comments that record where a measurement was made (`electron.vite.config.ts:67`,
    `src/main/index.ts:188`, `src/main/assets/protocol.ts:76`, `src/main/preview/protocol.ts:109`,
    `src/main/log/crash.ts:27`, `:200`, `src/main/watcher/host.ts:221`, `src/main/menu.ts:37`,
    `src/main/capabilities.ts:1053`, `src/renderer/terminal/keys/index.ts:4`, `src/renderer/theme/installed-fonts.ts:13`,
    `src/renderer/terminal/capture/{rasterize.ts:76,capture-fonts.ts:19}`, `build/conformance-watcher.mjs:1399`, `:1412`,
    `build/p365/probe-p365.mjs:50`, `:876`); test data that names 43.3.0 as a string and reads no runtime
    (`src/main/log/__tests__/{schemas,diagnostics}.test.ts`, `src/main/watcher/__tests__/p365-host.test.ts:227`, `:256`,
    `build/watcher-conformance-probe.mts:957`); history (`docs/research/**`, `build/p*/SPEC.md`, `BUILD-STATUS.md:6`,
    "Measured 2026-08-12", a FINAL Phase 17 snapshot). **One comment speaks in the present tense**:
    `src/main/watcher/host.ts:22`, "not in our 43.3.0". It is left (D4, §13 item 5). Node 24.18.1 is named only under
    `docs/research/`.
13. **Electron 43's support window.** Electron supports three stable majors; 42's last release (42.11.18) came on
    2026-10-21, the day 45.0.0 shipped. Majors have come every eight weeks (43.0.0 2026-06-30, 44.0.0 08-25, 45.0.0
    10-21), so 43 should stop receiving fixes when 46.0.0 ships, around mid-December 2026. This is an inference from the
    registry, not an announcement (§14 Q2).

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The move | `electron` `^43.3.0` → `^43.8.7` at `package.json:404`, 43.8.7 in `package-lock.json`, through `npm install` (its postinstall: the three patches, then node-pty compiled for 43.8.7) and Electron's own installer, every cache in scratch |
| 2 | The native modules | The ABI stays 148: node-pty is compiled again from its patched source; better-sqlite3's and the watcher's N-API prebuilds are the same files |
| 3 | Product code | None. The types pass; no API Tortie calls changed; every 43.3.0 workaround stays |
| 4 | What 43.8.7 fixes on Tortie's paths | #53276 (the stream loader both protocol handlers feed), #53278 (stdio), #53301, #54962 and #55272 (a utility process at exit and quit), #54597 (powerMonitor at launch), #53420 (IPC volume), #52870 (exit after `tls`), 303 Chromium and V8 backports, and Node 24.22.1's `tls`, `http` and `dns` security fixes |
| 5 | The proof | Lens A: the parent's battery and probes beside HEAD's, the runtime facts the tree depends on re-measured with the lens's own instrument, `out/` compared byte for byte, and **the update path**: a session made by the 43.3.0 app found, attached and restored by the 43.8.7 app. Lens B: the quit table, a crash dump written and read, the phone door paired over the stand-ins, a renderer crash, and each utility-process change attacked with its own PR's failure shape |
| 6 | What stays | No gate, contract, floor, menu, word or entitlement moves; CLAUDE.md gains two clauses |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **Exactly 43.8.7; `package.json` says `^43.8.7`, the lock pins 43.8.7.** The caret is the house style the line already uses, and it moves the floor past #53276 and #53278 | The entry's item 1 and research 143 §7. §0.1 item 1 |
| D2 | **The install is three steps in one environment**: the one-line edit, `npm install --no-audit --no-fund` with NO package argument (npm 10.9.8 runs the root lifecycle only then: `lib/commands/install.js:152-166`, so the postinstall runs as it does for anyone who installs), then `node node_modules/electron/install.js`, Electron's own installer (its `install-electron` bin), so the binary is fetched once into `electron_config_cache` and checked against the package's `checksums.json`. A `dist/` that survives the npm step is moved aside first, so the zip lands in an empty folder | §0.1 item 3: without the third step the first shim launch downloads inside a probe's scratch `HOME`. Editing the line by hand, not `npm install electron@…`, keeps npm from rewriting `package.json` |
| D3 | **The lock's new root `engines` block is kept** and named in the delta | npm writes it from `package.json:10-12`; removing it is a hand edit of a generated file the next install undoes (§0.1 item 5) |
| D4 | **No product code changes, and every 43.3.0 workaround stays**: `stdio: 'ignore'` as a string in both forks and W365-7 that holds it; `env` one named variable; host.ts rule 7's SIGKILL before `kill()`; the door's fork without an `'error'` listener; the comment at `host.ts:22` | The entry asks for none; each still holds at 43.8.7 (the stdio default reads past nothing, `Kill()` is byte-identical, `env: {}` handling is unchanged); the brief's "no cleanups". §2.1 |
| D5 | **No CHANGELOG item** unless a measurement shows a person something move | The entry ("only if a person sees something move"); §14 Q1 |
| D6 | **CLAUDE.md gains two clauses**: the `conformance:runtime` row says it reads only the Node lines on this Mac and never the Node inside Electron; the `probe:p365` row's "when" gains "or an Electron move", because the host ends its process through Electron's own `kill()` and process list | §0.1 item 10 (the entry itself misread the first); `host.ts:258-288` (the second depends on Electron's internals, measured by disassembly at 43.3.0 and re-measured by Lens A here) |
| D7 | **No new probe, no seam, no new script under `build/`**; `HELPER_USER_FLOOR` stays 187. The spec step's instruments stay in scratch; the lenses write their own | A dependency move; the existing probes cover the surfaces (§8). Obligation 1 is untouched |
| D8 | **The parent's `smoke`, `smoke:t1`, `smoke:t3`, `package` and outside-the-block vitest numbers are Phase 365's landing battery** (`/private/tmp/tortie-ops/battery-p365.log`, 2026-11-09 10:21); the spec step measured the rest at the parent (§2.3) | The brief; those three smokes are the main session's alone |
| D9 | **Packaging stays unsigned in this phase.** Library validation of 43.8.7's framework, `watcher.node`, `pty.node` and `darwin-arm64.node` under his Developer ID is proved by the release lane's `build/verify-signed.mjs` on his word, as Phase 365 left `watcher.node`'s | The hard rules (his identity lives in his keychain); `build/p365/SPEC.md` D14 and its §As built; §14 Q3 |
| D10 | **A newer 43.x published while the phase runs is reported, never taken.** The builder installs 43.8.7, the version §2.1 read, and names any newer one; reading its notes is a question for the main session | The spec read 43.3.0 to 43.8.7 and nothing after |
| D11 | **The update path is the phase's own independent method**: the parent's app writes a profile and a session list, HEAD's app reads them, as on his Mac the day he updates | No-regression against the scenario a person actually meets: an app update over running sessions (§10.1 A4) |
| D12 | **A regression that 43.8.7 causes and Tortie's code cannot answer inside this entry goes to him with the numbers**; the fixer never picks another Electron version on its own | The brief's STOP rule and the entry's "No move to Electron 44" |

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs`'s `withElectron` inside `build/harness-socket.mjs`, by
`zsh -f …/spec/bin/lockrun.sh <tag> <checkout> <command>` (a lock slot taken and released by a trap; `HOME`, `ZDOTDIR` and
`TMPDIR` in scratch; `HISTFILE=/dev/null`, `SHELL=/bin/sh`; every token and socket variable unset). Every other command ran
under the history block, but for the slips §2.6's last row names. His history read `743319 1794200266` and `23166 1790702242` before and after every run. His
reports folder held 105 entries before the first run and after the last, identical by name and mtime; no run added one.

### 2.1 The release notes from 43.3.0 to 43.8.7, and what each change touches in Tortie

Read from the 25 GitHub release pages (`…/spec/notes/notes-43.4.0-to-43.8.7.md`) and, where it decides, the pull
request's own diff (`…/spec/prs/`). "Nothing in the tree" means a search of `src/` found no caller.

| Area | Release, PR | The change | Tortie at `a79ad099` | What the move does | Proved by |
| --- | --- | --- | --- | --- | --- |
| utilityProcess | 43.5.0 #53278 | `fork()` read past the end of a short `stdio` ARRAY (the old loop indexed `stdio_arr[i]` for i < 3 after `opts.Get` could shorten it; the note words the PR as "object lifetime bugs") | Two forks, both `stdio: 'ignore'`, a string: `src/main/pocket/bind.ts:198-202`, `src/main/watcher/host.ts:215-220`; held by W365-7 (`build/conformance-watcher.mjs:1399`) | Not reached at either version; the rule stays (D4) | `conformance:watcher` |
| | 43.5.0 #53301 | `postMessage()` after the child exited crashed main (the guard read only `node_service_remote_`) | `bind.ts:397-415` guards `this.exited` and wraps the post; `host.ts:395-402` guards `proc.retired` and wraps it. The window left is a post between the child's death and its `exit` event | A main-process crash path closed | Lens B U1 |
| | 43.5.0 #53135 | A utility child boots from Node's embedded startup snapshot (`node_service.cc`) | Fork to first message 60 to 71 ms at the parent (§2.2); the watcher's first watch waits for it (Phase 365 §As built: 55 to 58 ms) | Faster or equal; the child's bootstrap path changes | Lens A A2, probe:p365 SK, probe:p330 |
| | 43.7.6 #54279 | Output a child wrote just before exiting no longer dropped | Both forks `stdio: 'ignore'` | Nothing in the tree | — |
| | 43.8.0 #54962 | Messages the child posted before exiting are dispatched BEFORE `exit`; at browser shutdown its port is closed and its messages dropped | The watcher posts `watching`, `events`, `note`; the door posts its answers and `stopped`. Both hosts map a message to the process generation that sent it (`host.ts:465-470`; `bind.ts:244-245`, `:259`) | A message that used to be lost can now arrive just before `exit` | Lens B U2 |
| | 43.8.4 #55272 | A child still launching when the app quits now gets `exit` at browser shutdown (`ShutdownAll`); 43.3.0 left it to heap teardown | Tortie's ordinary quit ends by SIGKILL in `will-quit` (`src/main/index.ts:902-919`) before that point; the quit with an update staged, the teardown leg of `smoke:quit` and a harness's `app.exit()` reach it. The handlers: `host.ts:487-493` (no line, no restart once quitting), `bind.ts:541-554` then `src/main/pocket/ipc.ts:1672-1674` (no restart once `pocketShutdownStarted()`) | An `exit` that never came now comes (parent: none, §2.2) | Lens A A2, Lens B U3 |
| | unchanged | `Kill()`; the `'error'` forwarding; `env: {}` read as unset | `host.ts:258-288` (rule 7: SIGKILL by the pid `app.getAppMetrics()` names, then `kill()`), `:221-226`; `bind.ts:185-195` | Rule 7 and the one-variable `env` stay right | Lens A A2 re-measures |
| Crash reporting | sources identical | — | `src/main/log/crash.ts:99` (`crashReporter.start({ uploadToServer: false })`), `:85-88` (5 dumps, 30 days); `src/main/log/index.ts:349-377` (the sentinel and the dump inventory at the next boot) | — | smoke:quit's legs |
| | 43.4.0 #52725 | A JavaScript out-of-memory crash is reported at its site, not inside the crash-key handler | Dump readers (`build/p365/probe-p365.mjs`'s DUMP READER) | An OOM dump's faulting frame moves | — |
| | Chromium backports | Two Crashpad patches (an overflow in `process_memory.cc`; out-of-bounds stack pointers in the sanitized snapshot) | Research 144: a main-process dump holds each thread's stack and the environment, no heap range | To be read again on a 43.8.7 dump | Lens B B2 |
| safeStorage | none named | `electron_api_safe_storage.cc` identical; no new Chromium patch touches `components/os_crypt` or keychain code; Chromium's own .212 → .250 history unreadable (§0.1 item 9) | `src/main/settings/store.ts:792-828`, `src/main/config/seal.ts:66-108`, `src/main/credentials/index.ts:131-167`, the sealed vault, the door's sealed identity (`src/main/pocket/tls.ts:208`) | No change expected | NOT driven (§10.3) |
| powerMonitor | 43.7.8 #54597 | A crash at launch when macOS refused the sleep and wake registration (a Chromium cherry-pick in `power_monitor_device_source_mac.mm`); Electron's power monitor sources identical | `src/main/power/index.ts:219`, `src/main/capabilities.ts:391` (the wake mark), `src/main/index.ts:751` | A launch crash removed | — |
| Quit | 43.4.1 #52870 | Node's per-process teardown joins the CA loader `require('tls')` starts, before `exit()`, including `app.exit()` before the loop runs | `src/main/index.ts:237-251` (`app.exit(0)` at module scope when the single-instance lock is refused), `src/main/notice/refusal-screen.ts:86`; main loads `tls` and `node:http2` (`src/main/push/apns.ts:62`); the skills CLI (`resolve.ts:365`) | An exit-time SIGABRT removed | — |
| | 43.4.1 #52905 | libuv's loop interrupt suspended while Electron's embed thread is parked (fewer idle wakeups in main) | Every timer in main: the disposer's 3 s guard and late drain, the watcher host's reply bounds, the debounces | Timing of main's loop; no bound may move | Lens A A3 (quit times), probe:p365 SK (the bounds) |
| | 43.4.1 #52925, 43.7.6 #54268 | A session created during shutdown; `vm` contexts collected before quit | No `session.fromPartition` and no `node:vm` under `src/main` | Nothing in the tree | — |
| Windows, webContents, IPC | 43.4.1 #52892; 43.5.0 #53288 | A leak creating BrowserWindows; a destroyed webContents or parent still referenced | `src/main/index.ts:395-440`, `src/main/settings/window.ts:79-125` | Fixed | — |
| | 43.6.0 #53420; 43.5.0 #53018 | A crash after a large number of renderer IPC messages; cheaper large IPC and contextBridge calls | Every invoke and push (`src/main/typed-ipc.ts`, `src/preload/index.ts`), terminal data above all | A crash removed; faster | probe:p292, probe:p167 |
| | 43.5.0 #53142 | Renderer subresource loads skip the main thread when no `webRequest` listener or intercepted scheme exists | None registered (no `webRequest` under `src/main`; both `protocol.handle` schemes are custom, not intercepted `http`, `https` or `file`) | The packaged renderer's `file:` loads go straight to the loader | probe:p167 |
| | 43.7.1 #53944; 43.7.0 #53496; 43.7.6 #54456, #54440 | `loadURL` again after a failed load; a `console-message` listener on a destroyed webContents; a child WebContentsView's focus; zoom reset on a hash change | Tortie never reloads after `render-process-gone` (`src/main/diagnostics/process-gone.ts:154-165` logs only); `console-message` only in `src/main/harness/shot.ts:238`; no WebContentsView; no page zoom (the Settings window replaces its hash at `src/renderer/settings/SettingsApp.tsx:170`, and nothing zooms) | Nothing in the tree | Lens B B4 (the renderer crash) |
| Protocol handlers | 43.5.0 **#53276** | The stream loader deleted itself while still subscribing to a stream whose `on()`, `removeListener()` or `destroy()` re-entered it (`node_stream_loader.cc`) | Both handlers answer with `net.fetch(pathToFileURL(real))`'s Response, which `protocol.handle` hands to that loader: `src/main/assets/protocol.ts:117-142` (fetch `:140`), `src/main/preview/protocol.ts:625`, `:641` | Research 143's suspect (f) removed | Lens B U4 |
| | 43.8.6 #55481; 43.8.5 #55447 | One `file:` loader factory per browser context, interception still decided per request (no content cache); a body-less `net.fetch` skips `Writable.toWeb` | The same two `net.fetch` calls | Faster repeated fetches | Lens B U4 |
| | 43.6.0 #53374; 43.4.1 #52853; 43.7.0 #53704 | A chunked upload inside a handler; `registerFileProtocol`'s no-cors answers; `initiatorOrigin` | Both handlers refuse anything but GET (`assets/protocol.ts:118`); no `register*Protocol`; additive | Nothing in the tree | — |
| | none | — | ONE `registerSchemesAsPrivileged` call (`assets/protocol.ts:92-104`), the 43.3.0 measurement at `:74-84` | Unchanged | `privileged-schemes.test.ts` |
| CSP, partitions, security | 43.7.0 #53712, #53718, #53726, #53701, #53750; 43.4.1 #52848, #52830; 43.8.1 #55049 and GHSA-jr5w-w6x2-84p9 | Node in workers; webview popups; internal IPC checks; `execCommand('paste')` activation; cross-site drag; sandboxed openers; link-opened windows' session; eMudhra intermediates | The main window: `contextIsolation: true`, `nodeIntegration: false` (`src/main/index.ts:402-410`); every window open denied and every navigation refused (`src/main/security/trusted-window.ts:135`, `:141`); the CSP a meta tag (`src/renderer/index.html:18`), the preview's served CSP held by `build/assert-preview-containment.mjs`; no session partition, no webview, no `execCommand('paste')` | Nothing in the tree | The build's containment gates |
| Native menus | 43.4.0 #52673; 43.6.0 #53432, #53045; 43.8.0 #54905 | Menu switching under load (`views/menu_delegate.cc`: Linux and Windows); `popup` with an offscreen frame; `MenuItem.badge`; clicks another process posts to a background app | `src/main/menu-popup.ts:119-136` pops no offscreen frame; no badge; Tortie posts no clicks (probes press rows in main) | Nothing on macOS | — |
| Bundled Node | 43.5.0, 43.6.0, 43.7.0, 43.8.0, 43.8.4 | 24.18.1 → 24.22.1. 24.22.1's security fixes: `tls` rejects non-canonical IP addresses and fixes IP normalization, an `http` agent guard, `dns` null bytes, brotli, OpenSSL 3.5.9, NSS 3.131.1 roots, undici 7.30.1; Electron's new `tls` SPKI blocklist patch | Main; the door (`node:tls`, `src/main/pocket/door/listener.ts:636`, loopback with a `ts.net` SNI and pinned keys); the watcher process; APNs (`node:http2`); the name check (`node:dgram`, `src/main/pocket/public-name.ts:65`); the skills CLI | None expected to refuse Tortie's own certificates | Lens B B3 (the door) |
| | 43.6.0 #53393 | ObjectWrap cleanup hooks for Node 24.19+, without which `~ObjectWrap()` aborts in garbage collection | No `node::ObjectWrap` in Tortie's three modules (§0.1 item 4) | Not reachable | Lens B G1 |
| V8, ABI | 43.4.0 to 43.5.0; `all.gn` | V8 15.0.245.23 → .31; V8's code-cache hash salted with Electron's patch set, so caches and serialized wasm written by 43.3.0 are refused and rebuilt once; 43.7.6 #54238 (wasm from a code cache after a patch update) | The renderer's code cache in a person's profile; web-tree-sitter's wasm (`src/main/symbols`) | The first launch after the update compiles once | Lens A A4 (time to window, first and second launch) |
| | — | NODE_MODULE_VERSION 148 at both | — | No ABI move | B3 |
| Hardened runtime, entitlements, fuses | 43.8.4 #55185, #55179; 43.4.1 #52857 | Asar paths in child processes and the integrity record read from the outer bundle (reached only with `EnableEmbeddedAsarIntegrityValidation` or `OnlyLoadAppFromAsar`); malformed archives | `electron-builder.yml:420-432` and both entitlement files unchanged; no fuse flipped (§0.1 item 11); both integrity fuses Disabled (§2.4) | Nothing in the tree; the utility processes still load their entries from `app.asar` | Lens A A5 |

### 2.2 The parent's runtime, read live (`…/spec/rt/`, one launch, `program: 'app'`, 7.3 s, exit 0, no dump)

A scratch app (no window, Dock hidden, `crashDumps` in its profile, Crashpad with `ignoreSystemCrashHandler: true`) on the
parent's Electron, loading the three modules from the parent's `node_modules` by absolute path
(`…/spec/rt/out-parent.jsonl`):

| Reading | Parent (43.3.0) |
| --- | --- |
| `process.versions` | electron 43.3.0, node 24.18.1, v8 15.0.245.23-electron.0, chrome 150.0.7871.212, modules 148, napi 10, uv 1.52.1 |
| better-sqlite3 | a WAL file database: 2,000 rows, then 10,000 prepared statements dropped across five forced collections (`--js-flags=--expose-gc`) and five `:memory:` connections opened and closed; `integrity_check` ok; SQLite 3.53.4; 393 ms |
| node-pty | 20 spawns of `/bin/sh -c 'printf p366-$0; exit 3'`: every output right, every exit code 3; 253 ms |
| The watcher in a utility process | subscribe, one write, its event in 3 ms, unsubscribe |
| Fork to first message | 63, 60, 61, 60, 71 ms (`stdio: 'ignore'`, one `env` variable) |
| `app.getAppMetrics()` | the fork is `{ type: 'Utility', name: <its serviceName>, serviceName: 'node.mojom.NodeService' }` |
| 200 messages posted, then `process.exit(0)` | 200 received before `exit`, three times out of three (main's thread was not held; #54962's own test blocks it) |
| Ending a child (Phase 365's M1 shapes) | `kill()` running: held main 2.6 ms, exit 3 ms, code 0, no `child-process-gone`; SIGKILL then `kill()` running: 2.3 ms; `kill()` stopped: held main **2,002.6 ms**, exit 2,003 ms, code 0; SIGKILL then `kill()` stopped: 2.4 ms; never a `child-process-gone` |
| A child still launching at `app.quit()` | **no `exit` event** (its pid still null at the quit): #55272's case |

### 2.3 The parent's battery and probes (one Electron at a time, each under a lock slot)

| Run | How | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| `npm run build` | history block | 0 | 53 s | `gate:electron` 586 files, 187 reach the helper against a floor of 187; `gate:background` 588 files, 4 starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator` 5 against 5; `gate:docker` 2 against 2; `known-hosts` 616 files; `assert-hermetic-checks` 286 check scripts, 55 `tsxCli()` importers against 54, 1,203 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses and 16 ablations; `stapler` self-test 31, 18, 28; the contract byte for byte |
| `npm test` | history block, scratch `HOME`, `TMPDIR` through `/var` | 1 | 71 s | 22,918 passed, 4 failed, 23 skipped of 22,945; files 1,196 passed, 3 failed, 4 skipped of 1,203. The four are the `/bin/ps` tests. (Phase 365's landing battery, outside the block: 22,929 passed, 16 skipped of 22,945) |
| `npm run typecheck` | history block | 0 | 21 s | 107 boundary fixtures, 1,445 files, 8,245 imports, 0 violations; 15 cycle fixtures, 1,442 files, 5,044 edges, 0 cycles |
| `conformance:runtime` | history block, scratch `HOME` | 0 | 2 s | `^22.22.3 \|\| ^24.11.1 \|\| ^25.1.0 \|\| >=26.0.0`; 4 runtimes (22.23.1 this one, 26.8.2 and 24.20.0 Homebrew, 22.14.0 `/usr/local` predicted no and refused as predicted), 3 loading each module once (no nvm line: `HOME` was scratch) |
| `gate:arm64` | history block | 0 | <1 s | self-test: 41 fixtures, 34 ablations |
| `smoke:quit` | `node build/harness-socket.mjs gmux-smoke-quit 'node build/quit-smoke.mjs quit'` | 0 | 4 s | 38 of 38 fixtures, 5 of 5 sentinel texts; held: SIGKILL after **2,065 ms**, held line, sentinel armed and cleared, session list made, 0 dumps, 0 reports; teardown: exit 0 after **1,779 ms**, sentinel left marked, 0 dumps, 0 reports |
| `smoke:quitdoors` | `… gmux-p144-doors 'node build/quit-smoke.mjs quit-doors'` | 0 | 2 s | 9 of 9 doors, SIGKILL after **1,731 ms**, 0 dumps, 0 reports |
| `smoke:fault` | `node build/fault-harness.mjs --json …` | 0 | 58 s | PASS, 20 cases, every invariant held |
| `probe:p292` | `node build/harness-socket.mjs --fresh gmux-p292 'node build/p292/probe-p292.mjs'` | 0 | 132 s | a to h and RUN PASS on tmux 3.7b, 0 findings |
| `probe:p365` SK, SQ, RH | `P365_ARMS=SK,SQ,RH P365_KEEP=1 P365_PARENT_CHECKOUT=…/spec/p365-parent`, preflight 49 checks PASS | 0 | 231 s | SK-head PASS at 151.5 s (after the SIGKILL 14 watches re-bound 345 ms after the exit, 93 ms after the fork, 4 ms after ready; the stopped process replaced at its bound with 32 requests pending, the next fork 251 ms later; main 109 to 118 MB, the watcher 60 to 68 MB); SQ-parent PASS (`ce4c77f6`: SIGABRT, `napi_fatal_error` from `watcher.node`'s `Init` on CrBrowserMain, the dump read and deleted: the step's one deliberate crash, no report); SQ-head PASS (exit 0, no dump, `lsof` never shows `watcher.node` in main and always in the process); RH-parent and RH-head PASS (both ids armed, the first at 2,511 and 2,542 ms); RUN PASS |

### 2.4 The parent packaged, unsigned, and launched

- **The package** (lock slot; `HOME` a scratch folder seeded by `cp -c` with his cached
  `electron-v43.3.0-darwin-arm64.zip`, 122,102,881 bytes, `ELECTRON_BUILDER_CACHE` a `cp -Rc` clone of his
  `~/Library/Caches/electron-builder`, both read only; `CSC_IDENTITY_AUTO_DISCOVERY=false`; `node build/check-tmux-pin.cjs
  && node build/assert-bundle-refusals.mjs && node build/assert-preview-containment.mjs && node build/assert-css-order.mjs
  && node_modules/.bin/electron-builder --mac --publish never -c.mac.identity=null`, so `out/` was not rebuilt): exit 0
  in 29 s. `@electron/rebuild` prepared @parcel/watcher, better-sqlite3 and node-pty and rebuilt nothing (all six native
  files and `.forge-meta` files kept their mtimes and sizes); the zip was not fetched again (its mtime `1786298401`
  unchanged); 27 Mach-O files, every one arm64; 7 externalized requires present; "skipped macOS code signing reason=identity
  explicitly is set to null", no Developer ID in the log; DMG 164,894,995 bytes, ZIP 164,547,240. The packed
  `watcher.node`, `darwin-arm64.node` and `pty.node` are the shipped ones by sha256 and UUID. `CFBundleShortVersionString`
  0.114.1, `LSMinimumSystemVersion` 12.0.
- **The fuse wire** (`node_modules/.bin/electron-fuses read`, @electron/fuses 1.8.0, `…/spec/logs/parent-fuses.txt`):
  RunAsNode Enabled, EnableCookieEncryption Disabled, EnableNodeOptionsEnvironmentVariable Enabled,
  EnableNodeCliInspectArguments Enabled, EnableEmbeddedAsarIntegrityValidation Disabled, OnlyLoadAppFromAsar Disabled,
  LoadBrowserProcessSpecificV8Snapshot Disabled, GrantFileProtocolExtraPrivileges Enabled, and a ninth fuse the 1.8.0
  reader names `undefined`, Enabled.
- **One launch** (`…/spec/pkg/pkg-launch.mjs`, `program: 'packaged'`, `GMUX_SHOT` with a 25 s delay, so an isolated
  harness launch that ends itself, one scratch git repository as its argument; `lsof` at 10 s and 20 s): exit 0 at 26.0 s.
  Main (`Tortie`, 197 then 187 MB) holds `pty.node` and better-sqlite3's `darwin-arm64.node`; ONE `node.mojom.NodeService`
  helper (`Tortie Helper`, 65 MB) holds `watcher.node` and no other `.node`; the renderer 164 MB, GPU 102 then 90 MB, the
  network service 35 MB; the bundled tmux. No dump; nothing of the run left under the profile; app.log: `opening folder
  from launch` and, at the shot's `app.exit()`, `the watcher process exited (code 0)` (Phase 365 §As built). `release/`
  (784 MB) was removed after.

### 2.5 The lock prediction and the type check

`…/spec/lockpredict/`: the worktree's `package.json` and lock copied, the line edited, `npm install --package-lock-only
--ignore-scripts --no-audit --no-fund` (scratch `HOME` and cache, history block), exit 0, "up to date in 604ms"; the diff
is §0.1 item 5's three hunks. `…/spec/tscheck/` (removed after): a `cp -Rc` clone of the worktree, its `.git` file
removed, 43.8.7's `electron.d.ts` dropped in: `tsc -b && tsc --noEmit -p tsconfig.node.json` exit 0 in 19 s, every
`.tsc/*.tsbuildinfo` rewritten.

### 2.6 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `stat` of his two history files (start, every lockrun, end) | 0 | | `743319 1794200266`, `23166 1790702242` every time |
| `df -h /` | 0 | | 79 then 78 GiB free |
| `npm view electron versions`, `time`, `dist-tags`, `electron@43.3.0` and `@43.8.7` (scratch `HOME` and cache, history block) | 0 | | §0.1 item 1 |
| `curl` of the 26 GitHub release pages (API, unauthenticated), 21 PR diffs, Electron sources at both tags (raw), releases.electronjs.org's index, the 43.8.7 npm tarball, 43.8.7's source tarball (21,377,482 bytes, `patches/` extracted), Node's `CHANGELOG_V24.md`, three `HEAD` checks of the 43.8.7 headers and zip | 0 each; googlesource 401 | | §0.1, §2.1 |
| `git clone --shared --no-checkout` of the parent, `checkout --detach ce4c77f6`, `cp -Rc` of `node_modules` and `build/vendor`, `npm run build` there | 0 | 54 s | `…/spec/p365-parent`, 186 helper users against 186 (365's parent) |
| `npm run build`, `npm test`, `npm run typecheck`, `conformance:runtime`, `gate:arm64` at the parent | §2.3 | | §2.3 |
| `lockrun.sh` × 8 (rt-parent, quit-parent, quitdoors-parent, fault-parent, p365-parent, pkg-parent, pkglaunch-parent, p292-parent) | 0 each | 2 s to 231 s | §2.2 to §2.4; every slot released |
| `node …/spec/bin/tree-list.mjs` at the parent and the worktree | 0 | | 567 entries each, identical; lock sha256 `a2c9be87…` at both |
| `npm ls --all` in the worktree (history block) | 0 | | no extraneous or invalid package |
| `npm install --package-lock-only` in `…/spec/lockpredict` | 0 | <1 s | §2.5 |
| `tsc` in `…/spec/tscheck` | 0 | 19 s | §2.5 |
| The Electron count (CLAUDE.md's command, outside the block, at the end) | 0 | | his Tortie (692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; none of this step's; no `p366`, `p365`, `p292`, `smoke-quit` or `p144-doors` socket under `/private/tmp/tmux-501/`; all three slots free |
| Slips, said plainly | | | Outside the history block: read-only `ls`, `grep`, `sed -n`, `cat`, `stat`, `shasum`, `xcrun dwarfdump`, `PlistBuddy` and `node -e` reads; two `python3 -I` and one `sed -i` edits of this file and of the spec step's own `lockrun.sh`; and ONE run of the clone's `build/vendor/specstory/bin/specstory --version` (CLAUDE.md's check for a rebuilt worktree), made with his real `HOME`, which printed a banner and was read no further. The lock runner's first version released its slot twice after `smoke:fault` (§0). His history stats never moved |

## 3. The tree at this head: the paths the move touches

**Edited, by the builder:** `package.json:404` (`"electron": "^43.3.0",` → `"electron": "^43.8.7",`) and
`package-lock.json` (`:64`, the new root `engines` block after `:74`, `:4020-4022`). **Edited, by the integrator:**
`CLAUDE.md`'s `conformance:runtime` row (`:364`) and `probe:p365` row (`:400`), and this file's §As built.

**Read and unchanged** (the Tortie column of §2.1): `src/main/pocket/bind.ts`, `src/main/pocket/ipc.ts`,
`src/main/watcher/host.ts`, `src/main/log/crash.ts`, `src/main/log/index.ts`, `src/main/index.ts`,
`src/main/assets/protocol.ts`, `src/main/preview/protocol.ts`, `src/main/security/trusted-window.ts`,
`src/main/diagnostics/process-gone.ts`, `src/main/menu-popup.ts`, `src/main/power/index.ts`, the safeStorage callers,
`src/main/skills/resolve.ts`, `electron-builder.yml`, `build/entitlements.mac.plist`, `build/entitlements.mac.inherit.plist`,
`build/after-pack.cjs` (it renames every helper's `CFBundleName` generically, `:87-110`), `build/conformance-runtime.mjs`,
`build/verification-checks.mjs`, `build/conformance-watcher.mjs`. **No sentence anywhere names Phase 366 today** outside
the backlog.

## 4. The design

### 4.1 The move (builder `electron`)

Its files: `package.json` (the one line) and `package-lock.json`. Its scratch: `/private/var/tmp/tortie-wt/scratch/p366/electron/`,
and the three folders the install writes: `X=/private/var/tmp/tortie-wt/scratch/p366`, `$X/install-home`,
`$X/npm-cache`, `$X/electron-cache`. Every step below runs from `/private/var/tmp/tortie-wt/wt-p366` under `zsh -f`, with
every token and socket variable of §0 unset, `HOME=$X/install-home ZDOTDIR=$X/install-home npm_config_cache=$X/npm-cache
electron_config_cache=$X/electron-cache TMPDIR=/var/tmp/tortie-wt/scratch/p366/electron/tmp HISTFILE=/dev/null
SHELL=/bin/sh`, and under the history block unless it says otherwise.

- **E0, before.** The history stats; `df -h /`; `npm view electron versions --json`: the newest 43.x must be 43.8.7, and a
  newer one is reported, not installed (D10); `git diff --stat a79ad099` shows only `build/p366/SPEC.md`;
  `node …/spec/bin/tree-list.mjs /private/var/tmp/tortie-wt/wt-p366` equals `…/spec/logs/tree-parent.txt` (567 entries);
  the lock's sha256 starts `a2c9be87`; the native table (§0.1 item 4: `pty.node`, `spawn-helper`, both prebuilds,
  @parcel/watcher's local build, the three `.forge-meta` files) and the five patched files (`addon-webgl.mjs` `e4ab05d2…`,
  `addon-webgl.js` `311a2455…`, `xterm.js` `e417ca75…`, `xterm.mjs` `48624603…`, `node-pty/src/unix/pty.cc` `0a6b2908…`)
  each by sha256, size and mtime.
- **E1, the edit.** `package.json:404`, one line, with the Edit tool; nothing else in the file.
- **E2, the install.** `npm install --no-audit --no-fund`, no package argument. Expected: npm changes one package; the
  postinstall prints `[patches] @xterm+addon-webgl+0.19.0.patch: already applied`, the same for `@xterm+xterm+6.0.0.patch`
  and `node-pty+1.1.0.patch`; `electron-rebuild` fetches Electron 43.8.7's headers into `$X/install-home/.electron-gyp`
  (`https://www.electronjs.org/headers` redirects to artifacts.electronjs.org; the tarball and `SHASUMS256.txt` answered
  200 at the spec step), builds nothing for better-sqlite3 and compiles `pty.node` and `spawn-helper`. Exit code and wall
  time recorded. If npm moves any other package, wants anything global, or fails: STOP and report.
- **E3, Electron's binary.** If `node_modules/electron/dist` survived E2, record its `dist/version` and `mv` it into
  `$X/electron/old-dist/`; then `node node_modules/electron/install.js`. It downloads `electron-v43.8.7-darwin-arm64.zip`
  into `$X/electron-cache/7f040e817a384b63b39fe629645d6ba50ce04dcd85c0fa3478bdbe8184077bd1/` (@electron/get's folder:
  sha256 of the release URL's directory), checks it against the package's `checksums.json` (sha256
  `e09665902c46a648800b998e4271052a7819bd48ad02dc22d8c1452d248bfa09`), extracts it into `node_modules/electron/dist` and
  writes `path.txt`.
- **E4, the checks** (each with its numbers in the report):
  - **B1** `node_modules/electron/package.json` 43.8.7, `abi_version` 148, `dist/version` 43.8.7, `path.txt`
    `Electron.app/Contents/MacOS/Electron`; `dist`'s files equal the zip's listing (`unzip -Z1`); the app's
    `Info.plist` `CFBundleVersion` 43.8.7 and `LSMinimumSystemVersion` 12.0 (43.3.0: 12.0); `Contents/Frameworks`
    holds the same eight entries as 43.3.0 (four `Electron Helper` apps, `Electron Framework`, `Mantle`,
    `ReactiveObjC`, `Squirrel`); the framework's UUID and `codesign -dv` (Electron's own signature) recorded.
  - **B2** `node build/apply-patches.mjs` prints the three `already applied` lines; the five patched files' sha256
    unchanged (`addon-webgl.mjs` still `e4ab05d2…`).
  - **B3** the native table again: `pty.node` and `spawn-helper` rebuilt (new mtime; sha256, UUID and `lipo -archs`
    arm64 recorded); both prebuilds and @parcel/watcher's local build byte-identical; every `.forge-meta` `arm64--148`.
    Any other ABI tag: STOP.
  - **B4** the tree: `tree-list.mjs` at HEAD against `tree-parent.txt` is exactly
    `node_modules/electron electron@43.3.0 → electron@43.8.7`. Anything else is named; a package that moved and 43.8.7
    does not require (its three dependencies are satisfied by `@electron-internal/extract-zip` 1.0.5, `@electron/get`
    5.1.0 and `@types/node` 24.13.3) is put back at the parent's version, and the report says how.
  - **B5** the delta: `git diff a79ad099 -- package.json` is the one line; `git diff a79ad099 -- package-lock.json` is
    exactly §0.1 item 5's three hunks (D3).
  - **B6** the runtime, live: copy `…/spec/rt/` into `$X/electron/rt/`, point its `OUT` path there, and launch it once
    at HEAD under a lock slot (`node build/harness-socket.mjs --fresh gmux-p366rt 'node <copy>/launch.mjs
    /private/var/tmp/tortie-wt/wt-p366 head'`, outside the block, the runner shaped like `…/spec/bin/lockrun.sh` with an
    owner tag of its own). Expected: electron 43.8.7, node 24.22.1, v8 15.0.245.31-electron.0, chrome 150.0.7871.250,
    modules 148, napi 10, uv 1.52.1 (a reading that differs is reported, never adjusted); better-sqlite3, node-pty and the
    watcher each ok; fork to first message, the kill shapes and the 200-message burst beside §2.2's; and
    `exit-while-launching` now written (#55272). Every reading that differs from §2.2 is named.
  - **B7** `npm run typecheck`: exit 0 with §2.3's counts.
  - **B8** `npm test` (scratch `HOME`, `TMPDIR` through `/var`): 22,918 passed, 4 failed (the four `/bin/ps` tests), 23
    skipped of 22,945, as at the parent. Any other failure: STOP (it would need product code, which no builder owns yet).
  - **B9** `npm run build`: exit 0 with §2.3's gate lines.
  - **B10** the history stats, the reports folder, the Electron count, the slot released.
- **What it returns**: every file changed with its line counts (`package.json` 1 and 1; `package-lock.json` 7 added, 4
  removed is the prediction), each command with its exit code, wall time and numbers, the native table before and after,
  the tree and lock diffs, the B6 readings, and anything that moved that §0.1 did not predict.

### 4.2 What the integrator writes

- **CLAUDE.md** (D6): the `conformance:runtime` row (`:364`), after "so a tsx upgrade re-measures here", gains ". It
  reads only the Node lines on this Mac, never the Node inside Electron (Phase 366)"; the `probe:p365` row (`:400`), after
  "and after an `@parcel/watcher` upgrade", gains " or an Electron move (the host ends its process through Electron's own
  `kill()` and process list)".
- **Unchanged, each confirmed**: `CHANGELOG.md` (D5), `build/verification-checks.mjs` (no check script added; the runtime
  table is tsx's), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 187), `docs/audits/contract-baseline.txt`
  (byte for byte).
- **This file's §As built**: what moved, the seams (none: one builder), the commands of §11 with their numbers.

## 5. Words

No new string a person reads. No CHANGELOG item by default (§14 Q1). If he wants one, in his style and with the link
added by the follow-up: `- Tortie now runs on a newer release of Electron 43, with its fixes for crashes in the parts
Tortie uses`.

## 6. What moves on purpose

Electron 43.3.0 → 43.8.7 (Chromium 150.0.7871.212 → .250 with 303 backports, V8 15.0.245.23 → .31, Node 24.18.1 →
24.22.1); node-pty's two binaries, compiled again for it; the lock's three hunks. Nothing in the contract, no gate's rule
count, no floor, no menu, no word, no entitlement, no fuse, no `electron-builder.yml` key. The first launch after the
update compiles the renderer's code once (§2.1, V8 row).

## 7. The gates

| Changed | Gate |
| --- | --- |
| `package.json`, `package-lock.json` | `gate:checks` (inside `npm run build`: `engines`, `SUPPORTED_NODE` and `.nvmrc` unchanged); `conformance:runtime` (unchanged table); `gate:contract` (byte for byte); `gate:arm64` (its self-test, and inside the package's after-pack over 43.8.7's framework) |
| The runtime under every built bundle | `conformance:watcher` (W365-1 to W365-10 green; W365-2 and its built half read `out/main/index.js`); `conformance:pocket` (U5 reads the door's built chunks) |
| Nothing under `src/` | no path-triggered gate beyond these; the integrator confirms `git diff --stat a79ad099 -- src` is empty |

## 8. The app runs

No new probe (D7). The runs this phase reads, with what each covers: `smoke:quit`, `smoke:quitdoors` and `smoke:fault`
(the quit's order and the manifest under SIGKILL); `probe:p292` (real keys and wheel over CDP into the terminal: node-pty's
attach and Chromium's input); `probe:p365` SK, SQ and RH (the watcher's utility process, its kill and its quit, the
harvest's rescue with a stand-in codex); `probe:p167` (sessions split, closed and attached again, the renderer's heap and
detached nodes); `probe:p330` (the door's utility process, its environment, mutual TLS, pairing over the stand-ins,
Remove, an unexpected exit, the quit, the orphan); the unsigned packaged app through `withElectron`; and the main session's
`smoke`, `smoke:t1` and `smoke:t3` at landing. Each probe's own header says what it needs; every launch hides the agent
rows it does not need and reads `agents:list` back.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns |
| --- | --- |
| `electron` | `package.json` (the `electron` line, `:404`, and nothing else), `package-lock.json`; it runs THE ONE INSTALL (§4.1) |
| integrator | `CLAUDE.md` (the two clauses), `CHANGELOG.md` (only on his word), `build/verification-checks.mjs` (only if a classification moves, which none should), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR`, 187, unchanged), `docs/audits/contract-baseline.txt` (only if a contract line moves, which none should), this file's §As built |

No other builder: no product code must change (§0.1 items 6 and 7, D4). If B7, B8 or B9 fails for a reason in the new
Electron, the build stops there, and a builder for product code is a new decision of the main session's.

### 9.2 The seams

None between builders. The integrator reads the builder's report and edits nothing the builder owns; `package.json`'s
other lines are nobody's in this phase.

### 9.3 The builder's brief

**`electron`**: §4.1 E0 to E4 in order, B1 to B10 each with its numbers, the STOP rules at E2, B3 and B8, and the return
of §4.1. It runs no probe but B6's one launch, packages nothing, and edits nothing under `src/` or `build/`.

## 10. The proof, run rather than read (Tier 3)

Both lenses work at the parent (`wt-p366-parent`, 43.3.0) and at HEAD (`wt-p366`, 43.8.7), the parent first in every pair,
one Electron at a time, every pair in ONE session so the numbers share a machine and a load (record `os.loadavg()` at each
run's start). §2's numbers are the spec step's; a lens measures the parent again beside HEAD and does not copy them.

### 10.1 Lens A: the behaviour (Method 1 the parent; real data)

- **A1, the gates once at HEAD**: `npm run typecheck`, `node build/contract-inventory.mjs --check`, `npm test` (history
  block), `npm run build`, `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket`. Re-run once,
  then spend the time on the methods below.
- **A2, the runtime facts the tree depends on, with the lens's OWN instrument** (not `…/spec/rt/`, not the builder's B6):
  `process.versions` at both builds; `app.getAppMetrics()` naming a fork by its `serviceName` (`host.ts:258-264`); Phase
  365's M1 shapes (`kill()` of a running and a stopped child, SIGKILL then `kill()`, each's hold on main, exit code and
  `child-process-gone`) on which `host.ts` rule 7 rests; the environment a fork gets for `env: {}` against one named
  variable, read with `ps -E` (`bind.ts:185-195`: 4,458 against 884 bytes at 43.3.0); fork to first message; and a child
  launching at the quit (#55272) together with what Tortie's two hosts then do (no line, no restart, no process left).
- **A3, the battery and probes, both builds**: `smoke:quit` and `smoke:quitdoors` three times each (the parent through its
  harness lines), `smoke:fault` once, `probe:p292`, `probe:p365` with `P365_ARMS=SK,SQ,RH` and the spec's `p365-parent`,
  `probe:p167` (at the parent through `node build/harness-socket.mjs --fresh gmux-p167-scale 'node build/probe-p167-scale.mjs'`).
- **A4, THE UPDATE PATH (independent method: the update a person makes)**. Two pairs, each on its own scratch profile and
  its own scratch socket inside one `build/harness-socket.mjs` run, through `withElectron` with each build's own Electron
  binary given as an absolute `program` and its checkout as the app folder (shell panes only:
  `src/main/harness/durability.ts`; read `build/smoke-standalone.mjs` as text for the environment it gives each leg):
  `GMUX_SMOKE=create` on the parent's app then `GMUX_SMOKE=verify` on HEAD's; and `GMUX_SMOKE=t3-prep` on the parent's
  app then `GMUX_SMOKE=t3-verify` on HEAD's. The session the 43.3.0 app made is found by the 43.8.7 app and its pane
  attached, the manifest read (a read-only `sqlite3` of the scratch manifest beside the harness's own verdict), and the
  restorable row restored and armed; the controls are the parent to the parent and HEAD to HEAD. Then the time to the main
  window (the `window-shown` mark, `src/main/index.ts:416`) on a profile the parent wrote: HEAD's first launch against its
  second (the code cache refused once and rebuilt, §2.1's V8 row), and the parent's first against its second.
- **A5, the packaged app at HEAD**: §11 step 12's package; its fuse wire equal to §2.4 field for field;
  `CFBundleShortVersionString` 0.114.1 and the framework's own version 43.8.7; one launch as §2.4's: main holds the
  REBUILT `pty.node` (its sha256 the builder's B3) and `darwin-arm64.node`, the `node.mojom.NodeService` helper holds
  `watcher.node` alone, exit 0 by its shot, no dump, nothing left; resident sizes beside §2.4's.
- **A6, `out/` byte for byte (independent method: re-derive)**: `diff -r` of `out/main`, `out/preload` and `out/renderer`
  between the parent and HEAD, both built from the same sources. Every byte that differs is named and explained, or it is
  a finding.

### 10.2 Lens B: the attack (Method 2)

- **B1, the quit table, both builds**: the native Quit row pressed in main with sessions running and the watcher
  watching; a quit pressed while the door process is still launching (the phone door switched on over the stand-ins and
  the Quit row pressed 0 to 200 ms later, #55272); a quit while the first watch is in flight; the teardown leg's Node
  teardown (`smoke:quit`). For each: the exit, the lines in app.log, any door, watcher or Funnel stand-in process left,
  and the sessions on the scratch socket unchanged.
- **B2, a crash dump written and read**: a scratch crash app per build (no window, Dock hidden, Tortie's own
  `crashReporter.start({ uploadToServer: false })` plus `ignoreSystemCrashHandler: true`, `crashDumps` in its profile, a
  planted canary variable), crashed once in main; the dump read by the lens's OWN reader (port the DUMP READER of
  `build/p365/probe-p365.mjs` by reading it as text, or write one: Phase 363's three readers left with its scratch). Read:
  the module list (the framework's UUID per build), the exception, the threads, every memory range against the thread
  stacks (research 144: stacks only, no heap), the canary in the environment block; then the dump deleted. A 43.8.7 dump
  that keeps a range research 144 did not see is named (it feeds Phase 364). Two deliberate crashes in all.
- **B3, the phone door over the stand-ins**: `probe:p330` at both builds (its header: the Tailscale stand-in behind its
  preflight and sampler, the DNS stand-in, two node phones over mutual TLS, `ps -E` of the door process, Remove, an
  unexpected exit, the quit, the orphan). At HEAD the door's TLS is Node 24.22.1's.
- **B4, a renderer crash, both builds**: the main window's renderer crashed while sessions run (`Page.crash` over CDP, or
  `webContents.forcefullyCrashRenderer()` through main's inspector); main stays up, one `process.gone` record, the sessions
  on the scratch socket untouched (Tortie never ends a session), the quit afterwards by its ordinary path; at most one
  report per build, named.
- **U1 to U4, each utility-process change attacked with its own PR's failure shape, at both builds**: U1 (#53301) the
  watcher process SIGKILLed (its own child, `ps -p` first) in the same tick as a burst of 50 watches, so posts land
  between its death and its `exit`; and, in a scratch app, `postMessage()` from the `exit` listener and after it (the PR's
  own fixture): HEAD must not crash, and the parent's answer is recorded (one parent crash at most, counted). U2 (#54962)
  a child that posts 200 messages and exits while main's thread is held (the PR's own test, `sleepSync`): HEAD delivers
  every one before `exit`; the parent's count recorded. U3 (#55272) a fork followed at once by `app.quit()` in a scratch
  app, and Tortie's watcher forked at the first watch with the Quit row pressed within 50 ms. U4 (#53276, #55481) the
  real app at HEAD under research 143 §2.4's request shape: images and previews through `gmux-asset:` and `gmux-preview:`
  requested and aborted mid-stream at a high rate for at least 10 minutes, no crash and no error, the parent beside it.
- **G1, garbage collection with the native modules (#53393's class)**: research 143's Tortie-shaped better-sqlite3 churn
  (connections and statements dropped under forced collection) beside node-pty spawns, in a scratch app on HEAD's
  Electron for at least 10 minutes: no abort.
- **The independent step**: a hostile copy of `conformance:watcher`'s input (through a scratch copy) with each fork's
  `stdio` made a short array, an empty `env`, and a second `utilityProcess.fork(`: each red, so the 43.3.0 rules still
  bite at 43.8.7 (D4).

### 10.3 Not run, and why

`conformance:resume:capture` and the full `conformance:resume` (they start real agents: his standing rule overrides the
entry's proof line; restore and the harvest are held by `conformance:derived`, the restore and harvest vitest files inside
`npm test`, `probe:p365` RH's stand-in codex, A4's `t3-prep` to `t3-verify` across the two builds, and the main session's
`smoke:t1` and `smoke:t3`); `smoke`, `smoke:t1` and `smoke:t3` by any role but the main session; a signed package and a
signed launch (his keychain; D9); `safeStorage` live (his keychain; §2.1 weighs it: Electron's source identical, no new
Chromium patch in `components/os_crypt`, Chromium's own history unreadable); a real Tailscale, DNS, APNs or ssh; the
Simulator and the phone build (nothing under `ios/` moves); his everyday app.

### 10.4 No regression (both builds, one session)

| Row | What | Parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | `npm test` in the block | 22,918 passed, 4 failed (the `/bin/ps` four), 23 skipped of 22,945 | the same |
| N2 | `npm run build`, `npm run typecheck` | §2.3's lines | the same lines |
| N3 | `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket` | PASS, the same tables | the same |
| N4 | `smoke:quit` held and teardown, `smoke:quitdoors` | PASS; 2,065, 1,779 and 1,731 ms in the spec step | PASS on every leg; each leg's median within 250 ms of the parent's in the same session, or explained |
| N5 | `smoke:fault` | PASS, 20 cases | PASS, 20 cases |
| N6 | `probe:p292` | 0 findings, a to h | 0 findings |
| N7 | `probe:p365` SK, SQ, RH | all PASS; SK re-bind 345 ms after the exit; RH first id at 2.5 s | all PASS; the re-bind and the bounds within the parent's range |
| N8 | `probe:p167` | its plateau verdicts and rulers | PASS, no ruler worse |
| N9 | the update path | the control (parent to parent) | parent to HEAD as parent to parent, and HEAD to HEAD |
| N10 | the packaged launch | §2.4 | the same holders of each `.node`; exit 0; no dump; resident sizes within 15% or explained |
| N11 | the runtime facts (A2) | §2.2 | rule 7's shapes unchanged; fork to first message no slower than the parent's slowest plus 20 ms; `exit` at the quit answered with no line and no restart |
| N12 | `out/` | — | byte-identical, or each difference explained |
| N13 | the fuse wire | §2.4 | identical |
| N14 | `smoke`, `smoke:t1`, `smoke:t3`, `package` (main session) | Phase 365's battery: 54 s, 67 s, 56 s, 47 s, all exit 0 | exit 0 |

A row worse than the parent is a defect: fixed, or the part dropped and named (D12).

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `gmux-p366*` and probe socket under
`/private/tmp/tmux-501/` gone or with no server answering; the history stats; the reports folder by name and mtime; no
`.dmp` left under the run folders; every lock slot this role took released.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `git -C /private/var/tmp/tortie-wt/wt-p366 diff --stat a79ad099` (only `package.json`, `package-lock.json` and
   `build/p366/SPEC.md`); `git diff a79ad099 -- package.json package-lock.json` (exactly §0.1 item 5's hunks and the one
   line); `git diff --stat a79ad099 -- src ios` (empty)
2. `node …/spec/bin/tree-list.mjs /private/var/tmp/tortie-wt/wt-p366` against `…/spec/logs/tree-parent.txt` (only electron)
3. `node build/apply-patches.mjs` (three `already applied`; `addon-webgl.mjs` sha256 `e4ab05d2…`)
4. `npm run typecheck`
5. `node build/contract-inventory.mjs --check` (byte for byte)
6. `npm test` (history block, scratch `HOME`, `TMPDIR` through `/var`; the four `/bin/ps` tests named as the expected
   failures)
7. `npm run build` (`gate:electron` 187 against 187; `gate:checks` 286 classified; the contract byte for byte)
8. `npm run conformance:runtime`, `npm run gate:arm64`, `npm run conformance:watcher`, `npm run conformance:pocket`
9. the CLAUDE.md edits of §4.2, then `git diff --stat a79ad099` (four files: the builder's two, `CLAUDE.md`, this file;
   no gate reads CLAUDE.md, so nothing is re-run for it)
10. `npm run smoke:quit` and `npm run smoke:quitdoors`, each under a lock slot
11. `npm run smoke:fault` under a lock slot
12. `npm run package -- -c.mac.identity=null` under a lock slot (unsigned, discovery off, every token unset; a scratch
    `HOME` seeded by `cp -c` with `$X/electron-cache/7f040e81…/electron-v43.8.7-darwin-arm64.zip` at
    `<HOME>/Library/Caches/electron/7f040e81…/`, `ELECTRON_BUILDER_CACHE` a `cp -Rc` clone of `…/spec/eb-cache`; the log
    names no Developer ID; `@electron/rebuild` rebuilds nothing, the builder's `pty.node` keeping its mtime; 27 Mach-O
    files as at the parent, or each new one named, every one arm64; the externalized requires present), then `node_modules/.bin/electron-fuses read --app
    release/mac-arm64/Tortie.app` (history block; equal to §2.4)
13. ONE packaged launch through the helper (`…/spec/pkg/pkg-launch.mjs` copied into the integrator's scratch, under a lock
    slot): §2.4's readings at HEAD; then `release/` removed
14. The Electron count, the sockets, the history stats, the reports folder

## 12. What is NOT in this phase

- No move to Electron 44 or 45 (the entry), and no other dependency: not `electron-builder`, `@electron/rebuild`,
  `@types/node`, `electron-vite`, node-pty, better-sqlite3 or @parcel/watcher, whatever `npm outdated` says.
- No product code: no line under `src/`, `ios/` or `resources/`; no change to the quit's order, its bounds or its hard
  exits; no new listener (the door's fork stays without an `'error'` listener, Phase 365 §As built's note for the main
  session).
- No cleanup of what 43.3.0 needed: the string `stdio`, W365-7 and its message naming 43.3.0, the one-variable `env`, the
  SIGKILL before `kill()`, and every comment that records where a measurement was made, `host.ts:22` included.
- No `electron-builder.yml` key, no entitlement, no fuse, no signing change; nothing signed, notarized, released, tagged,
  archived or uploaded; Tortie's own version stays 0.114.1.
- No new probe, gate, seam, smoke mode or script under `build/`; no CHANGELOG item unless he asks.
- No reading of Chromium's history beyond what is public without signing in.

## 13. For the main session at landing

1. The battery at HEAD (`typecheck`, `build`, vitest, `package` unsigned, `smoke:t1`, `smoke`, `smoke:t3`) beside Phase
   365's (`/private/tmp/tortie-ops/battery-p365.log`: 2, 49, 69, 47, 67, 54, 56 s; vitest 22,929 passed and 16 skipped of
   22,945 outside the block).
2. The lock's root `engines` block is in the delta on purpose (D3); its three lines change nothing installed.
3. Phase 364 (the diagnostic build) starts after this lands, on 43.8.7, as its entry says; Lens B B2 says whether a 43.8.7
   dump keeps what research 144 read.
4. Electron 43's fixes are expected to stop when 46.0.0 ships, around mid-December 2026 (§0.1 item 13): §14 Q2.
5. `src/main/watcher/host.ts:22` still says "our 43.3.0"; a docs sweep may say "43.3.0" there. Nothing else in the tree
   claims the running version.
6. Cleanup after the follow-up commit: the worktree, `wt-p366-parent`, and `/private/var/tmp/tortie-wt/scratch/p366/`
   (`spec/p365-parent` with its cloned `node_modules`, `spec/src/tarball87`, `spec/eb-cache`, `spec/runhome`,
   `install-home`, `npm-cache`, `electron-cache` with the 43.8.7 zip, every role's folder), any `release/`, and the probe
   sockets.
7. The release itself is his word, as for any release; the release lane's `build/verify-signed.mjs` is the first signed
   proof of the new framework (D9).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **A changelog line?** Default: none, because nothing a person sees changed in any measurement. The other choice is one
   line saying Tortie runs on a newer Electron 43 with its crash fixes.
2. **Electron 43 stops getting fixes when Electron 46 ships, about mid-December 2026.** Default: nothing queued by this
   phase; the main session asks at landing whether to queue a move to 45 as its own phase before then. The entry rules out
   44 here.
3. **Proving the new runtime under his signing identity.** Default: the release lane's signed check proves it at the next
   release, on his word, as it did for Phase 365's watcher. The other choice is a signed local launch before that release,
   which needs his keychain.

## §As built (the integrator, 2026-11-09)

Built as written by ONE builder (`electron`, §4.1) and integrated with no seam to reconcile (§9.2): the builder owned the
`electron` line of `package.json` and `package-lock.json` and ran THE ONE INSTALL; the integrator owned `CLAUDE.md`'s two
clauses and this section. Nothing under `src/`, `ios/`, `resources/` or `build/` but this file moved. The verify lenses
(§10) have not run yet; nothing below replaces them.

### What moved

| File | Change |
| --- | --- |
| `package.json` | `:404` `"electron": "^43.3.0",` → `"electron": "^43.8.7",`: 1 line added, 1 removed; sha256 `5f3d9f7f…` → `8e7bc398…`; `version` stays 0.114.1 |
| `package-lock.json` | 7 lines added, 4 removed, in exactly §0.1 item 5's three hunks: `:64` the range; the root `engines` block after `:74` (D3); electron's `version`, `resolved` and `integrity` (`sha512-F3Z7…Cnw==`, the spec's re-derived value) at `:4020-4022` → `:4023-4025`. Byte-identical (`cmp`) to `…/spec/lockpredict/package-lock.json`; sha256 `a2c9be87…` → `cb2c4661…` |
| `CLAUDE.md` | D6: the `conformance:runtime` row (`:364`) gains ". It reads only the Node lines on this Mac, never the Node inside Electron (Phase 366)"; the `probe:p365` row (`:400`) gains " or an Electron move (the host ends its process through Electron's own `kill()` and process list)". 2 lines changed, no row added |
| `build/p366/SPEC.md` | this file, untracked until the commit |

Unchanged, each read by `git diff a79ad099`: `CHANGELOG.md` (D5: no measurement below shows a person anything move),
`build/verification-checks.mjs` (no check script added), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 187),
`docs/audits/contract-baseline.txt` (byte for byte).

### The installed tree against the parent

- **By package** (`…/spec/bin/tree-list.mjs`, 567 entries at both): exactly `node_modules/electron electron@43.3.0 →
  electron@43.8.7`; the parent's own list unchanged since the spec step. Nothing to put back. The hidden
  `node_modules/.package-lock.json` differs in electron's three fields and its stale root `version` (0.106.0 → 0.114.1).
- **By file** (the integrator's own `diff -rq` of the two `node_modules`, 22,672 files, 173 lines): `electron/`
  (`package.json`, `README.md`, `checksums.json`, `electron.d.ts`, `install.js` and `.bin/install-electron`, which links
  to it, and 120 lines under `dist/`); the hidden lock; vitest's results cache (`.vite/vitest/…/results.json`, written by
  the test runs); and the build trees the postinstall's `electron-rebuild` writes: node-pty (`build/Release/pty.node`,
  `spawn-helper`, their objects and `.deps`, the makefiles, `config.gypi`, node-addon-api's three `*.target.mk`, and
  `bin/darwin-arm64-148/node-pty.node`), @parcel/watcher (`build/Release/watcher.node`, its objects and `.deps`, the
  makefiles, `config.gypi`, and `bin/darwin-arm64-148/watcher.node`) and better-sqlite3 (`build/Makefile` and
  `build/config.gypi` only, no binary). Nothing else: both N-API prebuilds (`better-sqlite3/prebuilds/darwin-arm64.node`
  `98e0e8ac…`, `@parcel/watcher-darwin-arm64/watcher.node` `bdc5c395…`), node-pty's own `prebuilds/`, the five patched
  files and every `.forge-meta` (`arm64--148`) are identical.

### Corrections to this spec, from the tree

1. **@parcel/watcher's local build moves** (§0.1 item 4 said "The postinstall does not name it"; B3 expected it
   byte-identical). `electron-rebuild -w` adds modules to its walk of the production dependencies and never narrows it
   (`@electron/rebuild/lib/cli.js:30-34`, `:165`, `lib/module-walker.js`, the builder's reading), and `@parcel/watcher`
   is a dependency (`package.json:353`), so every postinstall rebuilds it: `build/Release/watcher.node` is now 491,408
   bytes, sha256 `3aa79114…`, UUID `3E6B93DE-9DC4-3A8B-8DF5-7F88CE62D7C1`, arm64. The parent's copy was made the same way
   on 2026-09-17. It is never loaded: `@parcel/watcher/index.js:14-20` requires the prebuild package first and falls back
   only on `MODULE_NOT_FOUND`; plain Node loads `@parcel/watcher-darwin-arm64/watcher.node` (the integrator's read of
   `require.cache`), and so does the packaged app's watcher helper (A5 below). Left as the install wrote it: no install
   produces 43.3.0-built bytes beside 43.8.7.
2. **The same walk writes a `bin/darwin-arm64-148/` copy of each compiled module**
   (`@parcel/watcher/bin/darwin-arm64-148/watcher.node`, `node-pty/bin/darwin-arm64-148/node-pty.node`, each
   byte-identical to its `build/Release` file), which §0.1 item 4's table did not list. Neither is on a loader's path
   (node-pty's `lib/utils.js:17-38` tries `build/Release`, `build/Debug`, then `prebuilds/darwin-arm64`), and both are
   inside the package at both builds, two of the 27 Mach-O files.
3. **Three gates read CLAUDE.md** (§4.2 and §11 step 9 said none does), each for its own name only:
   `conformance:containment` rule 8 (`build/conformance-containment.mjs:449`), `conformance:credentials` (`:4265`) and
   `conformance:logins` (`:2451`). The two clauses only add words; all three were run after the edit and pass (step 9).
4. **`out/` is not byte-identical while the delta is uncommitted.** `diff -rq` of the two `out/` finds one differing
   file: `out/main/index.js:77530`, `BUILD_COMMIT = "a79ad099"` at the parent and `"a79ad099-dirty"` at HEAD (and the
   parent's `out/` also holds the spec step's `p292/`). Committed, that line reads the commit's own hash.

### The integrator's commands (§11), with their numbers

Every command that starts no Electron ran under the history block (`sandbox-exec -f …/no-history.sb`) through
`…/integrator/bin/inenv.sh`: scratch `HOME`, `ZDOTDIR` and npm cache, `TMPDIR` through `/var/tmp/…`, `HISTFILE=/dev/null`,
`SHELL=/bin/sh`, every token and socket variable unset. Every Electron ran through `…/integrator/bin/lockrun.sh`: a lock
slot taken, released once from a trap and only while its owner file was still this role's, the same environment outside
the block, his history and his reports folder recorded before and after.

| # | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| 1 | `git diff --stat a79ad099`; `git diff a79ad099 -- package.json package-lock.json`; `git diff --stat a79ad099 -- src ios` | 0 | | `package.json` 1 and 1, `package-lock.json` 7 and 4 in 3 hunks; `src` and `ios` empty; `build/p366/SPEC.md` untracked |
| 2 | `tree-list.mjs` at HEAD and at the parent, each against `…/spec/logs/tree-parent.txt` | 0 | | 567 entries each; the parent unchanged; HEAD differs at one line, electron |
| 3 | `node build/apply-patches.mjs` | 0 | <1 s | three `already applied`; the five patched files unchanged by sha256, size and mtime (`addon-webgl.mjs` `e4ab05d2…`, 126,646 bytes) |
| 4 | `npm run typecheck` | 0 | 3 s | 107 fixtures, 1,445 files, 8,245 imports, 0 violations; 15 fixtures, 1,442 files, 5,044 edges, 0 cycles; shared-types OK: the parent's lines. Incremental: the builder's B7 had re-checked every project against 43.8.7's `electron.d.ts` (1,138,588 bytes, the npm tarball's by sha256) in 23 s |
| 5 | `node build/contract-inventory.mjs --check` | 0 | <1 s | byte for byte |
| 6 | `npm test`, twice | 1, 1 | 71 s, 72 s | N1 below |
| 7 | `npm run build` | 0 | 57 s | every gate line equal to the parent's build log, times aside: `gate:electron` 586 files, 187 reach the helper against 187; `gate:background` 588 files, 4 starts, 32 of 32; `gate:simulator` 5 against 5; `gate:docker` 2 against 2; known-hosts 616 files; `assert-hermetic-checks` (`gate:checks`) 286 classified, 55 against 54, 1,203 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations; stapler 31, 18, 28; the contract byte for byte |
| 8 | `conformance:runtime`, `gate:arm64`, `conformance:watcher`, `conformance:pocket` | 0 each | 1, 1, 4, 13 s | `conformance:runtime`'s table and `gate:arm64`'s line identical to the parent's logs (22.23.1, 26.8.2 and 24.20.0 load each module once; 22.14.0 predicted no and refused; 41 fixtures, 34 ablations); `conformance:watcher` PASS (10 W365 rules over 56 variants) and `conformance:pocket` PASS (192 rules, 25,741 checks), each identical to the builder's B9 run |
| 9 | the two CLAUDE.md clauses, then `git diff --stat a79ad099` | 0 | | three tracked files and this untracked one; then the three readers of CLAUDE.md: `conformance:containment` 0 in 1 s (rule 8 "listed in CLAUDE.md", 52 readings, 10 of 10 ablations red), `conformance:logins` 0 in 26 s, `conformance:credentials` 0 in 48 s |
| 10 | `npm run smoke:quit`, `npm run smoke:quitdoors` | 0, 0 | 59 s, 59 s | quit: 38 of 38 fixtures, 5 of 5 sentinel texts; held PASS (SIGKILL after 2,857 ms, held line, sentinel armed then cleared, the list made, 0 dumps, 0 reports); teardown PASS (exit 0 after 2,145 ms, the sentinel left marked, 0 dumps, 0 reports). quitdoors: 9 of 9 doors, SIGKILL after 2,180 ms, 0 dumps, 0 reports. Each leg ran straight after its script's own 57 s build; N4 below is the comparison |
| 11 | `npm run smoke:fault -- --json …/integrator/logs/fault.json` | 0 | 115 s (the build, then about 58 s) | PASS, 20 cases, every invariant held. Against the spec step's `parent-fault.json`: the same 20 cases by name (the three random points drawn at 266, 1 and 218 ms against 244, 1 and 200), 0 failures, 0 survivors and 0 leftovers at both |
| 12 | `npm run package -- -c.mac.identity=null`, then `electron-fuses read` | 0, 0 | 53 s | A5 below |
| 13 | ONE packaged launch (`…/integrator/pkg/pkg-launch.mjs`: the spec's instrument with only its `OUT` path moved) | 0 | 26 s | A5 below; `release/` (788 MB) removed after |
| 14 | the close-out | | | below |

### N1: `npm test` at HEAD

| Run | Passed | Failed | Skipped (of 22,945) | The failures |
| --- | --- | --- | --- | --- |
| The parent, the spec step | 22,918 | 4 | 23 | the four `/bin/ps` tests |
| HEAD, the builder's B8 | 22,918 | 4 | 23 | the same four |
| HEAD, the integrator's first (load 3.02) | 22,917 | 5 | 23 | the four, and `src/main/proc/__tests__/guarded.test.ts` "kills the child the deadline had not reached yet": `no pid in …/slow.pid` |
| HEAD, the integrator's second (load 6.97) | 22,917 | 5 | 23 | the four, and `src/main/watcher/__tests__/p347-open-files.native.test.ts` "N8: a separate writer renaming over the file twice, 0 and 1 ms apart…": its last 2 s `waitFor` for a notice read false (`:468`) |

**Each fifth failure is a timing flake of a test the move cannot reach, and neither is a regression of this phase.** Both
files run in vitest's plain Node 22.23.1, neither they nor the modules under them import `electron`, and the only
binaries that differ between the two `node_modules` are node-pty's (neither file loads node-pty) and @parcel/watcher's
local build (never loaded; plain Node takes the identical prebuild). The first is a race in the test itself:
`forkedPid` (`guarded.test.ts:58-65`) waits for the pid file to EXIST and then reads it, while the fixture's
`echo $$ > file` (`:575`) creates the file before it writes it, so a read between the two under load sees an empty file,
which is pid 0. The second waits 2 s (`:55`) for an FSEvents notice while the whole suite loads the machine. Alone, under
the block, `guarded.test.ts` passed 5 runs of 5 (10 tests) and `p347-open-files.native.test.ts` 3 of 3 (11 tests).
Neither has failed in a landed battery since Phase 353 (`/private/tmp/tortie-ops/battery-*.log`). The four `/bin/ps`
tests (three files, 10 tests) pass outside the block with a scratch `HOME` (exit 0, 3 s). For the main session: the
guarded race is old and small (wait for a non-empty file, not an existing one); it is not this phase's to fix.

### N4: the quit smokes paired in one session

`…/integrator/bin/quit-pairs.sh 3` under one lock slot: each build's own harness lines, never an npm script, so nothing
was rebuilt (`node build/harness-socket.mjs gmux-smoke-quit 'node build/quit-smoke.mjs quit'` and the `quit-doors`
line), the parent then HEAD, three rounds, load 13.2 falling to 10.0.

| Leg | Parent (ms) | HEAD (ms) | Median, parent → HEAD |
| --- | --- | --- | --- |
| held (SIGKILL after) | 2,347, 1,992, 2,002 | 1,952, 1,967, 1,962 | 2,002 → 1,962 |
| teardown (exit 0 after) | 1,819, 1,782, 1,882 | 1,771, 1,773, 1,770 | 1,819 → 1,771 |
| doors (SIGKILL after) | 1,802, 1,687, 1,717 | 1,655, 1,666, 1,672 | 1,717 → 1,666 |

Every leg PASS at both builds, with 0 dumps and 0 reports each. HEAD sits inside the parent's range on every leg and its
median is 40 to 51 ms lower. A leg's time is the whole `withElectron` call (the launch, the census, the quit and the
teardown; `build/quit-smoke.mjs:361-409`), so step 10's slower single readings, each taken straight after a build, are
not a runtime difference.

### A5: the package and the packaged launch at HEAD

- **The package.** Under a lock slot and outside the block, because its after-pack runs the packed Electron as Node for
  the skills check: `CSC_IDENTITY_AUTO_DISCOVERY=false`; every `CSC_*` and `APPLE_*`, `GH_TOKEN` and `GITHUB_TOKEN` unset;
  `HOME` a scratch folder holding a `cp -c` of the 43.8.7 zip at `Library/Caches/electron/7f040e81…/` (123,832,592
  bytes, its mtime unchanged by the run, so nothing was fetched); `ELECTRON_BUILDER_CACHE` a fresh `cp -Rc` of
  `…/spec/eb-cache`. Exit 0 in 53 s, `electron-vite build` included. `@electron/rebuild electronVersion=43.8.7` prepared
  @parcel/watcher, better-sqlite3 and node-pty and rebuilt nothing: the native table before and after is identical
  (`pty.node` `66087300…`, 86,552 bytes, mtime 11:21:33, the builder's B3). "skipped macOS code signing reason=identity
  explicitly is set to null"; the log names no `Developer ID` and no `identityName`. After-pack: 27 Mach-O files, every
  one arm64 (the integrator's own enumeration with `file` agrees: 27, each `lipo -archs` arm64); the four helper names;
  specstory, rg and tmux signed ad hoc; 7 externalized main and preload requires present; skills 1.5.22 runs under the
  packed Electron. `CFBundleShortVersionString` 0.114.1, `LSMinimumSystemVersion` 12.0, the framework's `CFBundleVersion`
  43.8.7. DMG 166,609,287 bytes (parent 164,894,995) and ZIP 166,269,102 (parent 164,547,240): the framework is
  4,126,544 bytes larger. Every packed `.node` is HEAD's `node_modules` file by sha256: `pty.node` and its `bin/` copy
  `66087300…`, `spawn-helper` `8e10e783…`, `darwin-arm64.node` `98e0e8ac…`, the watcher prebuild `bdc5c395…`, the
  local watcher build and its `bin/` copy `3aa79114…`, node-pty's `prebuilds/` unchanged.
- **The fuse wire (N13)** (`electron-fuses read`, history block): RunAsNode Enabled, EnableCookieEncryption Disabled,
  EnableNodeOptionsEnvironmentVariable Enabled, EnableNodeCliInspectArguments Enabled,
  EnableEmbeddedAsarIntegrityValidation Disabled, OnlyLoadAppFromAsar Disabled, LoadBrowserProcessSpecificV8Snapshot
  Disabled, GrantFileProtocolExtraPrivileges Enabled, `undefined` Enabled. `diff` against `…/spec/logs/parent-fuses.txt`
  is empty.
- **One launch (N10)** (`program: 'packaged'`, `GMUX_SHOT` with a 25 s delay, one scratch git repository, `lsof` at 10 s
  and 20 s): exit 0 at 25.8 s (parent 26.0). Main holds `node-pty/build/Release/pty.node`, the rebuilt one, and
  `better-sqlite3/prebuilds/darwin-arm64.node`; ONE `node.mojom.NodeService` helper holds
  `@parcel/watcher-darwin-arm64/watcher.node` and no other `.node`; no other process holds one. Resident KB at 10 s and
  20 s, parent → HEAD: main 196,768 → 197,504 and 187,056 → 187,936; GPU 101,728 → 100,768 and 90,192 → 89,168; network
  34,800 → 35,184 and 34,912 → 35,280; the watcher helper 64,656 → 61,040 both times; renderer 164,432 → 165,376 and
  164,544 → 165,440; tmux 2,128 → 2,144. Every one within 6%. No dump; nothing of the run left; app.log reads
  `opening folder from launch` and, at the shot's exit, `the watcher process exited (code 0)`, as at the parent. The
  helper's teardown "ended 1 process the teardown found still running", its sweep by profile path, as in the spec step's
  parent runs of `probe:p292`, `probe:p365` and `smoke:fault`.

### The close-out

- **The Electron count** (CLAUDE.md's command, outside the block, once): his Tortie (692) and its crash handler (2727),
  and the crash handlers of Slack, Chrome, Granola and Cursor; none of this role's. No process names this role's scratch.
- **Sockets**: `/private/tmp/tmux-501/` holds only `gmux` (his, 5 November); nothing of this role's runs.
- **His history** read `743319 1794200266` and `23166 1790702242` at the start, before and after every run, and at the end.
- **His reports folder**: 105 entries at the start and at the end, identical by name and mtime, and identical to the spec
  step's start. This role added no report and crashed nothing on purpose. No `.dmp` under the integrator's scratch.
- **Slots**: every slot taken was released once; all three free at the end. `df -h /`: 77 to 78 GiB free throughout.
- **Slips**: before the first wrapped command, read-only `stat`, `ls`, `cat`, `grep`, `awk` and `git log`/`git status`
  of the worktree ran outside the history block. The history never moved.

### Not run by the integrator, and why

The lenses' work (§10: A2 to A4 and A6, B1 to B4, U1 to U4, G1, `probe:p292`, `probe:p365`, `probe:p167` and
`probe:p330`, the parent beside HEAD); `smoke`, `smoke:t1` and `smoke:t3` (the main session's, at landing);
`conformance:resume:capture` and the full `conformance:resume` (real agents, §10.3); a signed package or launch and
`safeStorage` live (his keychain, D9); `npm test` at the parent again (the spec step's reading stands, and a run there
would rewrite the parent's vitest cache).

## §As built: the probe review, the lenses and the landing (the main session, 2026-11-09)

### D7 as built: the probe review moved four probes

D7's "nothing under `build/` but this file" no longer holds. The probe review, run after the integrator, found five ways
the four graders the lenses compare with could pass a crash, a missing reading or a cut-short run, and fixed each in
the probe file alone. No new script, seam or gate; `HELPER_USER_FLOOR` stays 187.

| File | Change |
| --- | --- |
| `build/quit-smoke.mjs` | `QUIT_SMOKE_CHECKOUT` on another Electron refuses, exit 2 (it moves the app folder, never the Electron, so it compared 43.8.7 with itself); "no dump" counts only beside Crashpad's `settings.dat`; fixtures 38 → 48 |
| `build/p292/probe-p292.mjs` | `P292_CHECKOUT` refuses the same way; a dump in the profile is a RUN finding; arm d's missing thumb after a resize is a finding; fixtures 113 → 126 |
| `build/probe-p167-scale.mjs` | a dump fails the run; a missing `Performance.getMetrics` value or an empty `lsof` reads unreadable and fails the profile, never 0 |
| `build/p365/probe-p365.mjs`, `build/p365/fixtures/graders.json` | every arm needs Crashpad's database (UNREADABLE without it); SP, SA, SQ and SK's HEAD graders read no dump of any other helper; readings 251 → 270 |
| `build/p365/fixtures/raw/rv366-*` | eight constructed runs, each labelled as the probe review's |

The parent's copies (`a79ad099`) keep the old rules, so the lenses counted the parent's dumps and Crashpad databases by
hand. Every new rule fired at HEAD with no false failure in the lenses' runs.

### D4 corrected

W365-7 holds the watcher's string `stdio` alone. The door's (`src/main/pocket/bind.ts`) is held by `bind.test.ts`'s
source test inside `npm test`: Lens B set it to `['ignore','ignore']` and `conformance:pocket` and the build stayed green,
while that test failed and the door at 43.8.7 could not open.

### The lenses

Both approved; no fix round.

- **Lens A, the behaviour** (its own native-module instrument over four real manifests each build's app left with a WAL at
  its held-quit SIGKILL, identical digests at both; a node-pty client typed into and read back by `capture-pane`, 30 of
  30 attach cycles; 21 of 21 watch events; the update path through the two unsigned packaged apps, 43.3.0's create then
  43.8.7's verify on one profile and socket). `npm test` 22,918, 4, 23 at both; the quit smokes over 5 interleaved
  rounds (held 1,940 → 1,918 ms, teardown 1,794 → 1,745, doors 1,613 → 1,614), 30 legs PASS; `smoke:fault` 20 cases at
  both; `probe:p292` 0 findings at both; `probe:p167` plateau at both, the planted leak 1,032 of 1,032; `probe:p365` 8 of
  8 at both and SP at HEAD 10 minutes, 9,330 watches answered, 0 crashes; `probe:p362`'s 64-shell arms 15 of 15 at both.
- **Lens B, the attack** (its own minidump reader; each changed utility-process path driven with its own pull request's
  failure shape at both builds; three ablations). #54962: a child posting 200 messages and exiting while main is held:
  43.3.0 delivered 1, 43.8.7 all 200 in order, 3 of 3. #53301: `postMessage` from the exit listener during a quit: 43.3.0
  main SIGSEGV, 43.8.7 exit 0. #53276: `gmux-asset:` under 16 fetches at once of 8 MB with aborts for 120 s: 43.3.0
  refused 30,378 requests and its renderer crashed; 43.8.7 served 236,682 with 0 errors. The quit table, the unclean-exit
  notice after a planted real dump, a renderer kill, the watcher and the door killed and restarted, sleep and wake during
  a quit, a second copy, and `probe:p313`: each the same at both.

### Still worse than the parent, stated

- Under #53276's stress, main peaked at 19,585 MB at 43.8.7 against 5,429 MB, transient, back to 1,944 MB; the parent's
  renderer crashed in that run. At 4 at once over 64 KB, 300 MB against 312 MB. A person's renderer path, a few images
  at a time, was not stressed. Noted for Phase 364.
- A second copy launched while Tortie runs exits in a mean of 304 ms against 262 ms (5 each; Node's teardown join from
  #52870); the folder opens in the running Tortie both ways.
- The DMG and ZIP are about 1.7 MB larger.

### For the main session and later phases

- **No gate ties the installed Electron to the lock** (Lens B's ablation 1: 43.3.0 planted under the 43.8.7 lock passes
  every gate; only `npm ls electron` says `invalid`). His checkout keeps 43.3.0 until it is reinstalled (`npm ci`), on
  his word, confirmed with `npm ls electron`. CI runs `npm ci` and is safe.
- **The watcher's spawn carry has no guard** (`src/main/watcher/host.ts:229-232`): with it neutered, one quick quit in 76
  hung 60 s or more after main's `exit`, unexplained; the shipping build went 0 for 57.
- **Two helper blocks of about 20 lines are duplicated** (the checkout check in `quit-smoke.mjs` and `probe-p292.mjs`; the
  crash read in `probe-p292.mjs` and `probe-p167-scale.mjs`). D7 ruled out a shared script here; the next phase that
  touches these probes extracts them.
- `guarded.test.ts`'s pid read races its fixture's `echo $$ >` (wait for a non-empty file); not this phase's.
