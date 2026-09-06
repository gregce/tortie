# 81 — What shipping Tortie on Linux and Windows would cost

Research for Phase 216, `Phase 216: the cost of Linux and Windows`, asked by the operator on
2026-09-06. Research only: this phase changes no shipping code, adds no `electron-builder.yml`
target and adds no CI lane. It prices options and recommends; the operator chooses.

The charter in `docs/BACKLOG.md` splits the question into six parts and this file holds all six:
**A** the session substrate, **B** every macOS mechanism and what replaces it, **C** the agents,
**D** distribution and packaging, **E** the self-update path, and **F** the honest total. Linux and
Windows are kept apart throughout, because they are two questions and not one.

**How this document was assembled.** Six probes ran in parallel on 2026-09-06 against
`/private/tmp/wt-p216` at `bb9a5cb`, each measuring one part, and this file is the integration of
their findings. Where two probes disagreed the disagreement is **resolved by a third measurement
taken during integration, not averaged**, and §0.5 lists every one of them with the resolution.
Where a probe reasoned to a number instead of measuring it, the claim is marked **UNMEASURED** here
even when the probe stated it plainly.

**No Linux machine and no Windows machine were available to any probe.** That is the largest single
limit on this document and it is stated once here rather than apologised for repeatedly: every claim
about runtime behaviour on either platform is derived from source read on the day, from a shipped
binary's own bytes, or from a vendor's own documentation, and each one that needs a real machine to
settle is named in §0.6 with the probe that would settle it. Nothing was built for either target, so
**no artifact size and no launch is claimed for either platform.**

**What the fix round changed, on 2026-09-06, after an independent verifier attacked both verdicts.**
Six defects were confirmed by re-measuring rather than by agreeing, and none of them moved either
headline verdict, though one moved a recommendation inside it.
1. **§D.3.1's most emphatic sentence was wrong.** It said a tmux server started inside an AppImage
   outlives the app *"because there is no container to tear down"*. There is a FUSE mount to tear down.
   The claim is withdrawn, the exact teardown mechanism is now read out of the runtime's own source on
   both sides, the outcome is marked UNMEASURED with its probe, and **§D.3.6 and §D.0 now put the
   `.deb` first**, because a `.deb` puts real files at a stable absolute path and that is the mechanism
   the live tier actually rests on.
2. **§0.2's "there is no tmux on Windows and never has been" was refuted by the tarball in this
   repository**, which carries a first-class Cygwin platform arm, and by MSYS2, which packages tmux
   3.7c today. A fifth option, **E**, is now priced and refused on the record in §A.2.6 rather than
   excluded by an absolute.
3. §0.5 and §A.1.6 reported a re-derivation that had read only one of its two arms; linux-arm64 carries
   `GLIBCXX_3.4.29` and `CXXABI_1.3.9` as well, identically to x64. The 2.34 floor is unchanged.
4. §A.2.5 counted pull requests as issues. It is 36 open Windows issues and 9 open Windows pull
   requests, and **#5195 is one of the pull requests**, which makes the point sharper rather than
   weaker.
5. §0.5 mixed denominators on the tmux file counts; §F.1 always had them right.
6. §A.1.2's version floor is one release stronger than it stated: `noattr` was fixed twice after 3.6,
   the second fix naming the default `mode-style` the conf actually sets.

**What ran and what did not.** No Electron was started. No tmux server was started. No agent was
spawned and no token was spent. The pinned tmux 3.7b tarball at
`build/vendor/tmux/cache/tmux-3.7b.tar.gz` was extracted read-only to scratch and read; the shipped
`.node` prebuilds under `node_modules/` were read as bytes; the installed `app-builder-lib@26.15.3`
and `electron-updater@6.8.9` were read as source rather than as changelogs. Registry, vendor and
issue-tracker facts were fetched on 2026-09-06 and are cited with what was read.

---

## 0. The answer, before any detail

### 0.1 Linux — a port, and a small one in code

**Build it if he wants it. Nothing in the architecture refuses it, and the shipping code is the
cheap half.**

tmux is the same program. Grepped over the pinned 3.7b tarball's own top-level sources on
2026-09-06: **zero `__APPLE__` conditionals in any `.c` or `.h` at the top level** — every platform
difference lives in `compat/` behind configure, and `environ.c`, `spawn.c`, `server-client.c` and
`session.c`, which are the four files Tortie's durability actually rests on, name neither
`__APPLE__` nor `__linux__`. So the session, environment and spawn semantics are byte-identical.

Every identifier `CLAUDE.md` protects survives unchanged: the socket `-L gmux` still resolves to
`/tmp/tmux-<uid>/gmux` because `tmux.h`'s `_PATH_TMP` is `/tmp/` on glibc as on macOS; the five
`@gmux-*` session options and the `GMUX_SESSION_ID` / `GMUX_MANAGED` pane stamps are tmux features
with no platform branch; `resources/gmux-tmux.conf` is portable text; and the inner `<userData>/gmux/`
directory moves only its root, to `~/.config/Tortie/gmux/`. **No rename is required anywhere.**

**All twelve launchable agents run natively on Linux**, checked row by row against the vendors' own
installers and registries on the day (§C.1). Six of them capture as well as they do on macOS on day
one; four more need one measurement each; one needs a rewrite; two IDE rows must be hidden.

The cost is not the code. It is five things:

1. **The bundled tmux has to be built on Linux, and `build/build-tmux.mjs` is the most macOS-shaped
   file in the tree.** About eleven executable statements across five functions, a fourth pinned
   tarball so ncurses is static rather than borrowed from the host, and a second architecture. The
   script refuses outright at `build/build-tmux.mjs:455`. Bundling is not an optimisation here: the
   conf needs tmux **3.6** and **no shipped LTS meets it** (§A.1.2), so a distro tmux is refused at
   boot by the version gate.
2. **`node-pty` 1.1.0 ships no Linux prebuild** — `node_modules/node-pty/prebuilds/` holds
   `darwin-arm64`, `darwin-x64`, `win32-arm64`, `win32-x64` and nothing else, listed 2026-09-06 —
   so Linux compiles from source at install. And the Phase 167 `/dev/ptmx` leak patch sits inside an
   `#if defined(__APPLE__)` block, so **Phase 167's fd hygiene is unproven on Linux** and must be
   re-measured against `/proc/self/fd` rather than ported.
3. **Two silent returns.** `build/before-pack.cjs:35` and `build/after-pack.cjs:56` are both
   `if (context.electronPlatformName !== 'darwin') return;`. A Linux build today would package with
   no tmux, no specstory and no skills CLI, exit 0, and fail at runtime.
4. **A packaging choice that turns out to be a durability choice.** The `.deb` and not the AppImage is
   the artifact to hand somebody first, because a `.deb` installs real files at `/opt/Tortie` while an
   AppImage runs from a fresh random FUSE mount every launch whose behaviour under a tmux server that
   outlives the app is **unmeasured** and whose documented design intent is to tear that mount down
   (§D.3.1). It costs a password prompt on every self-update, which is the smaller of the two prices.
5. **Two durability hazards that are product decisions rather than code.** systemd's
   `tmpfiles.d/tmp.conf` ages `/tmp` at 10 days and tmux holds no persistent lock on its socket
   directory (§A.1.4); and `logind`'s `KillUserProcesses` defaults to `yes` upstream, which the man
   page itself says *"will break tools like screen(1) and tmux(1)"*. Debian and Ubuntu override it to
   `false`; Fedora, RHEL, Arch and openSUSE were **not checked**.

**And what it really costs is measurement.** Every number in the tmux layer's docstrings was taken on
macOS. `TESTED_TMUX_PAIRS` holds one row. There is no Linux gate lane, no Linux packaged-dir smoke,
and `probe:p167`'s central assertion measures a code path that does not exist there. Tortie's
confidence comes from measurement and none of the Linux measurements exist yet. **That, and not the
port, is the three phases in §F.4.**

### 0.2 Windows — refuse the native product

**Do not build a native Windows Tortie. The reason is not packaging and it is not the agents.**

Packaging is *cheaper* than macOS. NSIS builds on any host; electron-builder signs the nested
binaries itself on its own walk, so `build/sign-nested-binaries.cjs` needs no counterpart; there is
no notarization, no stapling, no entitlements. And Microsoft's own page, read 2026-09-06, says EV
certificates no longer bypass SmartScreen and that a new binary warns until it has *"hundreds of
clean installs from a wide audience"* — so for a one-user product **no purchasable certificate
removes the first-run warning**, and the honest cheapest path is a free Microsoft Store MSIX (§D.4.1).

The agents are not the reason either. **Eleven of the twelve launchable agents publish a Windows
binary and nine have a documented install route** (§C.1). Only `muse` cannot run at all, refused by a
`die` in Meta's own launcher.

**It is refused because of the substrate, and specifically because of what keeping it would require
Tortie to own.** tmux does not run NATIVELY on Windows — upstream's own README lists OpenBSD, FreeBSD,
NetBSD, Linux, macOS and Solaris. It does build and ship under Cygwin, and an earlier draft of this
document turned that README line into *"there is no tmux on Windows and never has been"*, which the
pinned tarball in this very repository refutes: §A.2.6 now prices that path as option E rather than
excluding it. **Five options exist and §A.2 prices all five:**

- **A, WSL2 as a machine** — keeps every promise, writes no new durability code, and reuses the
  remote plane Phases 68–73 already built. Its cost is a real install floor (WSL2, a distro, tmux and
  the agents inside it) and one honest product rule: **repos must live on the Linux side**, because
  `microsoft/WSL#4739` — inotify not firing for Windows-side files — has been open since 2019-12-06
  and was last updated 2026-05-24.
- **B, a Tortie-owned ConPTY supervisor** — buildable, and cheaper than it looks because
  `@xterm/headless` 6.0.0 supplies all eight deep terminal-emulator format variables. **Refused
  anyway**, because the Zen says *"anything durability-critical should be boring, inspectable and
  older than this product"* and a supervisor written this year is none of the three. When it has a
  bug, what is lost is the in-flight turn, which is the one thing the cold tier cannot bring back.
- **B′, zellij as the substrate** — the option "assemble, never reimplement" requires pricing.
  Refused today on measurement rather than taste: 36 open Windows issues and 9 open Windows pull
  requests on 2026-09-06, among them **PR #5195, the server failing to break out of the parent's job
  object**, which is the live tier itself and which has been open and untouched since May; no per-session key/value options, so the five `@gmux-*` stamps have no home; no
  `remain-on-exit failed` equivalent, so exit-code truth is lost; no control-mode event stream, so
  `control-client.ts` has nothing to attach to; and no Windows arm64 asset has ever been published.
- **E, tmux under Cygwin/MSYS2** — the real tmux, and MSYS2 packages **3.7c**, one release newer than
  the 3.7b this repository pins and above the conf's own floor, which no Linux LTS in §A.1.2's table
  manages. So it is the only option besides A that keeps the Zen's *"boring, inspectable and older
  than this product"*. **Refused anyway, on price rather than on an absolute:** a Cygwin pty is not a
  Windows console, so every native `.exe` agent needs `winpty` in front of it at every pane rather
  than only at the attach; `/cygdrive/c` paths disagree with the Windows paths the agents write their
  own stores at, which breaks §C.2's harvest encodings and inverts §C.3's one findable defect; there
  is no Landlock and no seccomp for the agents; the `msys` environment is x86_64 only, which is the
  same criticism this document makes of zellij; and it asks a person to install a runtime nothing else
  on their machine wants. Option A gets the same tmux with none of that.
- **C, sessions that die with the app** — refused. It sacrifices the frequent case (quit, daily) to
  save the rare one (reboot, monthly), and it makes the first sentence of the Zen false.

**The one Windows that is affordable today needs no Windows code at all.** Windows 11 ships WSLg, and
a Linux Electron app runs in it as an ordinary window. So **the Linux target IS a Windows answer**:
*"Tortie runs on Windows today through WSL; a native shell comes later."* It is a Linux app on a
Windows machine — GTK menus, no taskbar integration, Windows 11 only — and it is the cheapest thing
in this document that keeps every promise.

**Two measurements decide whether even that is real, and neither was taken.** Whether a tmux server
keeps a WSL2 distro alive with every terminal closed, and whether the attach stream survives the
ConPTY boundary. Both are named in §0.6.

### 0.3 Refusing is a real answer, and here is what each refusal costs

The charter says refusing must be priced like any other option rather than treated as failure.

**Refusing Linux costs:** twelve working agents on a platform where they all run; the `tmux-pane`
harvest key, which is the strongest key in the registry and is free there; and reach into the
segment that runs agents on servers. It saves: a second packaged-dir smoke on every pull request, a
second durability soak, a Linux row in `TESTED_TMUX_PAIRS` that somebody has to keep true, and the
`build/build-tmux.mjs` rewrite. **The saving is small and the loss is real.** Linux is the platform
this research most clearly says is worth it.

**Refusing Windows costs:** reach, in the largest desktop segment there is, and the awkwardness that
nine agents run there natively while Tortie does not. It saves, and this is the larger half: no
second substrate contract paid for by every future session phase, in code and in gates and in
verification; no ConPTY fidelity surface; no second signing regime, SmartScreen reputation or MSIX
lifecycle; and **no pressure to write a durability layer Tortie owns**, which is the standing refusal
that B, B′ and C all lean on. Refusing Windows is not a gap in this document. It is the
recommendation, and §0.4 says exactly what would reverse it.

### 0.4 What would have to change to flip each verdict

**To flip Linux to a refusal:** if the `KillUserProcesses` check on Fedora, RHEL, Arch and openSUSE
comes back `yes` on most of them, and `loginctl enable-linger` turns out to need a polkit prompt
Tortie should not raise, then Linux's live tier is conditional on a setting the person must change,
and *"the session continues"* becomes a footnote. That is the one finding that would make Linux look
like Windows. It is one command on four machines and nobody has run it.

**To flip Windows to a build:** any one of these, in this order of cheapness.

1. **Measurement 1 comes back positive** — a tmux server keeps a WSL2 distro alive with every
   terminal closed — *and* the operator judges "install WSL2 and keep your repos on the Linux side"
   an acceptable floor to ask of a Windows user. That is a product judgement and it is his.
2. **Microsoft closes `WSL#4739`.** It is A's only real product concession and it is Microsoft's bug.
3. **zellij's Windows port matures**: PR `#5195` merged, an `aarch64-pc-windows-msvc` release asset
   published, the open Windows issue count in single digits, and durable per-session metadata plus an
   exit-status-on-death semantic added. Re-price in twelve months, not sooner.
4. **His explicit word on option B**, because it contradicts a standing Zen refusal. B is not
   unbuildable — `@xterm/headless` makes it materially cheaper than it looks — it is *undesirable*,
   and those are different claims.
5. **WSL2 becomes unavailable to the person** — a locked-down machine, a policy, an older Windows.
   That is the only case in which **option E**, tmux under Cygwin/MSYS2 (§A.2.6), rises above A, and it
   is listed last because it is the least likely of the five and the most expensive to be wrong about.

**To flip Flatpak or Snap** (both refused in §D.3): somebody would have to want Tortie on a
distribution AppImage and deb do not reach, and be willing to accept either a bundled tmux that
cannot see the user's agents or a `--talk-name=org.freedesktop.Flatpak` permission that makes the
sandbox decorative. Neither is likely.

### 0.5 Where the probes disagreed, and how each was resolved

The six probes measured overlapping ground and contradicted each other in seven places. Every one was
re-measured during integration on 2026-09-06 at `bb9a5cb` rather than averaged.

| Disagreement | What each said | Resolved, and how |
| --- | --- | --- |
| How many files under `src/main` name tmux | boundary and the charter: **338**. The two substrate probes: **334** | **Both are right about different sets.** `grep -rl tmux src/main` = 338; restricted to `.ts`/`.tsx` = 334. The four extra are test fixtures (`activity/__tests__/fixtures/pi-idle.txt`, three files under `machines/__tests__/golden/`). Case-insensitive it is 352. The document uses **338 naive / 334 `.ts`/`.tsx` / 149 of those 334 under `__tests__` / 544 non-test files in the directory**, all re-run at integration. **Corrected at the fix round:** an earlier draft wrote "334 source files, 153 of them tests", which mixes denominators — 153 is 149 tests plus the 4 non-`.ts` fixtures, so it is 153 of **338**, and of the 334 it is 149 tests against 185 non-test source files. §F.1's table always had it right |
| `process.platform` sites in `src/` | macos-mechanisms: **11**. substrate-linux: **8** | Both correct, different denominators. Re-run: **11 total, 8 non-test, and only 6 of those 8 are code** — the other two are the words `process.platform` inside a comment in `src/shared/ipc/base.ts:120` and `src/main/diagnostics/off-device.ts:105`. **Six real runtime branches in the entire product** |
| Settings in `resources/gmux-tmux.conf` | substrate-windows: **12**. macos-mechanisms: **11**. boundary: **eleven** | Re-counted at integration: **12**. Listed in §A.1.2 |
| The conf's tmux version floor | substrate-linux: **3.6**, attributed per directive from the pinned tarball's `CHANGES`. boundary: *"3.3-ish"* | **3.6, and boundary's estimate was wrong.** Re-derived at integration by extracting the pinned tarball and locating each directive's line in `CHANGES` against its section headers: `copy-mode-position-format` at line 549 and `noattr` for `mode-style` at line 452 both sit inside `CHANGES FROM 3.5a TO 3.6` (lines 375–576). This is the finding that makes bundling mandatory on Linux, so it mattered |
| Whether Windows agent availability is 10, 9 or 11 of 12 | substrate-windows: *"10 of 12 run natively"*. agents: 9 with a documented route, 2 more binary-only, 1 impossible | **agents is right and its distinction is the useful one.** substrate-windows counted a published binary as "runs on Windows". The document states it as: **11 of 12 publish a Windows binary, 9 have a documented install route, `muse` cannot run at all.** `codewhale` and `omp` are the two whose vendor ships an `.exe` and documents no way to get it |
| tmux argv composition sites | substrate-windows: **88** exec-door call sites, production only. boundary: **103** argv composition sites, 19 verbs, split 32 in the layer / 35 product outside / 36 harness | Different questions, both kept. The two agree exactly on the number that matters — **19 distinct tmux verbs in production** — which is a corroboration rather than a clash, since neither probe saw the other's list |
| What the Windows verdict is | substrate-windows: recommend **A (WSL2 as a machine)** with **A2 (the Linux build under WSLg)** as the first step. distribution: **do not ship Windows** | **Not a contradiction once "Windows" is disambiguated.** distribution priced a native Windows *package*; substrate-windows priced a Windows *substrate*. The document's verdict is both: refuse the native Windows product (§0.2), and note that A2 needs no Windows package at all because it ships the Linux one |

One further correction the probes did not disagree about but which integration checked: better-sqlite3's
Linux glibc floor. substrate-linux read **GLIBC_2.34** and **GLIBCXX_3.4.29** out of
`prebuilds/linux-x64.node`. Re-derived at integration with `strings` over both Linux prebuilds —
and **re-run again at the fix round, because the integration reading under-read the arm64 arm.** The
two are IDENTICAL in their versioned symbol sets, not merely in their glibc floor: both
`prebuilds/linux-x64.node` and `prebuilds/linux-arm64.node` carry `GLIBC_2.34`, `GLIBCXX_3.4.29` and
`CXXABI_1.3.9` as their highest versions, x64 additionally naming the older `GLIBC_2.2.5`/`2.3`/`2.4`
and arm64 the older `GLIBC_2.17`, which are architecture baselines rather than floors. The integration
sentence said "`GLIBC_2.34` on arm64" and stopped, which was one of two arms half read. **The verdict
does not move: 2.34 is binding on both**, and it excludes Ubuntu 20.04, Debian 11, RHEL 8 and Amazon
Linux 2.

### 0.6 What this document could not measure, in one place

Every one of these is a claim a real machine would settle in under a day. They are collected here so
a later round inherits the gap rather than the guess; §A.1.9, §A.2.10, §B.5, §C and §D.9 repeat each
one beside the claim it limits.

| UNMEASURED | The probe that settles it |
| --- | --- |
| **Whether a tmux server keeps a WSL2 distro alive with every terminal closed.** Option A's entire live tier rests on this, and `instanceIdleTimeout` — the setting that governs it — is not in the settings tables on Microsoft Learn's `.wslconfig` page as read on 2026-09-06 | Start a tmux server in a distro, close every terminal, wait five minutes, `wsl --list --running` |
| **Whether Tortie's attach stream survives the ConPTY boundary.** `microsoft/terminal#15976`, the ConPTY out-of-sync megathread, has been open since 2023-09-17 | Drive Claude Code inside WSL tmux through both carriages — node-pty/ConPTY, and `tmux -CC` over plain pipes — and check shift+enter (CSI-u), bracketed-paste image drop, OSC 52 and focus events |
| **`KillUserProcesses` on Fedora, RHEL, Arch and openSUSE.** Upstream defaults `yes`; Debian sets `false` in `debian/rules`. The other four were not checked | `loginctl show --property=KillUserProcesses` on one machine each |
| **Whether an AppImage's FUSE mount comes down under a live tmux server, or is held open by it.** The runtime tears the mount down when the last holder of an inherited, non-`CLOEXEC` pipe descriptor closes it, and nothing in Tortie's chain closes that descriptor, so the two possible outcomes are a lost live tier and a leaked mount per launch. Neither has been seen. It is why §D.3.6 now puts deb first (§D.3.1) | Build the AppImage, `GMUX_SMOKE=create`, quit, then `mount \| grep '\.mount_'`, `ls -d /tmp/.mount_*`, `pgrep -a squashfuse`, `tmux -L gmux ls`, `GMUX_SMOKE=verify`; repeat over three launches |
| **Whether `/tmp` ageing really reaches a live tmux socket directory.** The `q /tmp … 10d` default and the absence of a persistent flock in tmux are both measured; whether real use refreshes the timestamps enough is not | A 10-day-uptime Linux box and `systemd-tmpfiles --clean --dry-run` |
| **Anything about the Linux CPU status tier.** procps-ng documents `time` as whole seconds, the sampling constants are `CPU_BUSY_PERCENT = 5` and `CPU_BUSY_TICKS = 2`, and the conclusion that the CPU promoter stops firing follows arithmetically. **Nobody has watched a Linux agent fail to promote** | Run one agent under a Linux Tortie and read `src/main/activity/process.ts`'s own tier decisions |
| **`fs.inotify.max_user_watches` against Tortie's real watch count**, and whether the count exceeds it over the operator's repositories | Open his repositories on a Linux box and count watch descriptors |
| **Whether the Windows Claude Code build takes the same three advisory locks** with the same names and staleness bounds. Research 79's offsets were read from a macOS bundle | Read the Windows bundle the same way |
| **The Linux and Windows locations of `managed-settings.json`** (`src/main/context/agent-context.ts:180` hard-codes the macOS one) | Read Anthropic's managed-settings delivery docs per OS, then a `conformance:context` matrix row per platform |
| **Snap strict confinement's PID-namespace and `/tmp` behaviour.** Canonical's confinement documentation was behind a readthedocs login on 2026-09-06 (HTTP 302 to a CAS login) | Read it on a machine, or run the T1 smoke inside a strict snap |
| **Electron's own glibc floor.** Its README says only that it supports distributions *"in versions that are still supported by both Chromium and the distro maker"* and that the prebuilts are built on Ubuntu. No number is published; the 2.34 floor above is better-sqlite3's | Read the Electron binary's own version symbols |
| **Whether Electron's process on Windows sits in a job object** that would block `CREATE_BREAKAWAY_FROM_JOB`. Option B's first requirement | One `QueryInformationJobObject` call on a Windows box |
| **Everything in §D.9** — nothing was built for either platform, so no artifact size, no launch, no AppImage FUSE behaviour and no cross-distro tmux portability is claimed | §D.9 names eleven probes |
| **Windows support for `omp` and `muse` beyond what their vendors publish**, and whether pi's and omp's Windows store-path encodings match what `sanitizePiCwd` and `sanitizeOmpCwd` compose | One install of each on Windows and one `ls` of the store |

---

## A. The session substrate

The substrate is the whole question, because the durability promise rests on it and nothing else in
the product can compensate for losing it. This section keeps Linux and Windows completely apart.

### A.0 The finding that reframes the Windows half: tmux is not what survives a reboot

The charter says the promise *"rests entirely on a tmux server outliving the app."* That is true of
one half of the promise and false of the other, and the difference decides everything in §A.2.

Read from the tree: `src/main/restore/snapshots.ts:2` calls scrollback snapshots *"the reboot survival
layer (Phase 19 item 3)"*; `src/main/restore/restore.ts:1-11` describes restore as `new-session -d -c
<cwd>` running a **fresh** shell, `send-keys` of the snapshot replay so prior scrollback becomes inert
history, then **typing** the recorded resume command **without Enter**; and `WHY-TORTIE-IS-DEPENDABLE.md:21`
says *"After a restart, it restores the project and prepares the agent's own resume command. You
decide when to run it."*

So the contract has two tiers with entirely different mechanisms:

| Tier | What it survives | What carries it |
| --- | --- | --- |
| **Live** | app quit, app crash, renderer death, detach | the tmux server, and only the tmux server |
| **Cold** | reboot, power loss, tmux server death | the SQLite manifest (argv + resume_argv), the scrollback snapshots, and the agent's own conversation store |

**The tmux server does not survive a macOS reboot and never did.** The cold tier is SQLite and files
and names no POSIX primitive at all; it is portable to any platform with `%APPDATA%`. Two consequences
bind §A.2: a Windows substrate only has to keep the **live** tier, which is a far smaller thing than
"reimplement tmux"; and the option the charter phrases as *"survives app quit but not reboot"* is not
a weaker contract, **it is the contract macOS already ships**.

### A.1 Linux — portable, with four named exceptions and two hazards

#### A.1.1 The tmux layer itself contains no platform check

`src/main/tmux/` holds **no `process.platform` site at all**. The whole of `src/` holds 11, of which 8
are non-test and only 6 are code (§0.5), and **none of the six is in the session substrate**. What is
macOS-shaped there is a short list of literals:

| Site | What it assumes | Verdict |
| --- | --- | --- |
| `src/main/tmux/resolve.ts:839-842` — dev tmux probe `['/opt/homebrew/bin/tmux','/usr/local/bin/tmux','/usr/bin/tmux']` | Homebrew | **needs-work**, 3 lines. `/usr/bin/tmux` is already right; the dev build otherwise falls through to the PATH scan at `:847`, which works as written |
| `src/main/tmux/resolve.ts:803` — packaged path `join(resourcesPath,'bin','tmux')` | nothing | **portable as written.** electron-builder places `extraResources` under `resources/` on Linux and `process.resourcesPath` resolves there |
| `src/main/tmux/resolve.ts:918` — `join(process.resourcesPath,'gmux-tmux.conf')` | nothing | **portable as written** |
| `src/main/tmux/resolve.ts:146` — `/opt/homebrew/bin` in `extraBinDirsFor` | Homebrew | **needs-work**, 1 line. The other seven entries are all correct on Linux; `SYSTEM_PATH_DIRS` at `:169` is correct verbatim. Linux wants `/home/linuxbrew/.linuxbrew/bin` |
| `src/main/tmux/resolve.ts:202,264,458` — `$SHELL ?? '/bin/zsh'` | zsh is the login shell | **needs-work**, 3 lines. `$SHELL` is set in every Linux desktop session so the fallback rarely fires, but when it does the probe dies with ENOENT. The Linux fallback is `/bin/bash` |
| `src/main/tmux/resolve.ts:904` — `Install tmux with "brew install tmux"` | Homebrew | **needs-work**, copy only |
| `src/main/tmux/env.ts:22` — `DEFAULT_UTF8_LANG = 'en_US.UTF-8'`, docstring at `:15` *"en_US.UTF-8 ships on every macOS"* | that locale is generated | **needs-work**, 1 line, and it is a real defect. On Linux that locale exists only if it was generated; a machine installed in another language, or any container, has it absent. tmux itself is satisfied because it only string-scans for `UTF-8` (mirrored correctly at `env.ts:56-60`), but every process **inside** the pane calls `setlocale`, gets `Cannot set LC_CTYPE` and falls back to C. The Linux default is `C.UTF-8` |
| `src/main/tmux/env.ts:94-141` — `SECURITYSESSIONID` | macOS login sessions | **portable as written.** Rule 4 of its own docstring already reasoned it through: the variable does not exist off macOS, `loginSessionEnv` returns `{}`, and the `new-session` line is byte-identical |
| `names.ts`, `sessions.ts`, `control-parser.ts`, `control-client.ts`, `server-options.ts`, `version.ts` | nothing | **portable.** Pure tmux verbs and pure string work |

#### A.1.2 `resources/gmux-tmux.conf` is portable text with a blocking version floor

Twelve settings, re-counted at integration, none of which names a path or a platform:

```
set -g status off                                set -s focus-events on
set -s escape-time 0                             set -g mouse off
set -s extended-keys on                          set -s exit-empty off
set -g allow-passthrough on                      set -g default-terminal "tmux-256color"
set -g history-limit 25000                       set -g remain-on-exit failed
set -g copy-mode-position-format ""
set -g mode-style "noattr,bg=default,fg=default"
```

Each new directive was attributed to the release that introduced it by reading the pinned tarball's
own `CHANGES`, and the two that decide the floor were re-derived at integration against the file's
section headers:

| Directive | Introduced in | Where in `CHANGES` |
| --- | --- | --- |
| `set -s exit-empty off` | 2.7 | `CHANGES FROM 2.6 TO 2.7` |
| `set -s extended-keys on` | 3.2 | `CHANGES FROM 3.1c TO 3.2` |
| `set -g remain-on-exit failed` | 3.2 | `CHANGES FROM 3.1c TO 3.2` |
| `set -g allow-passthrough on` | 3.3 | `CHANGES FROM 3.2a TO 3.3` |
| **`set -g copy-mode-position-format ""`** | **3.6** | line 549, inside `CHANGES FROM 3.5a TO 3.6` (375–576) |
| **`set -g mode-style "noattr,…"`** | **3.6** | line 452, same section |

**And the effective floor for `noattr` is a release ABOVE 3.6, which the fix round found by reading the
rest of the same file.** `noattr` enters at `CHANGES:452` as the table says, and the same `CHANGES`
records it being fixed twice afterwards, both against upstream issue 4713: *"Fix noattr so it does not
delete attributes set in the style itself"* at `:366`, inside `CHANGES FROM 3.6 TO 3.6a` (349–374), and
*"Fix the noattr attribute in styles, **used by the default mode-style**"* at `:335`, inside
`CHANGES FROM 3.6b TO 3.7` (14–343). The conf's line is
`set -g mode-style "noattr,bg=default,fg=default"` — the default mode-style, which is exactly what the
second fix names. So a tmux at exactly 3.6 accepts the directive and gets it wrong, silently, and the
first release that behaves is 3.7. **No verdict moves**, because no distro in the table below sits at
3.6 and the gate below refuses all of them anyway; the bundling argument is simply one release
stronger than the table alone states.

**The floor is 3.6, and no shipped LTS meets it.** Distro versions read from repology.org on
2026-09-06:

| Repo | tmux | meets 3.6 |
| --- | --- | --- |
| Ubuntu 22.04 LTS | 3.2a | no |
| Ubuntu 24.04 LTS | 3.4 | no |
| Debian 12 | 3.3a | no |
| Debian 13 | 3.5a | no |
| RHEL / CentOS Stream 9 | 3.2a | no |
| RHEL / CentOS Stream 10 | 3.3a | no |
| Fedora 41 / 42 | 3.5a | no |
| Alpine 3.21 | 3.5a | no |
| Ubuntu 26.04 | 3.6a | yes |
| Fedora 43, Arch, nixpkgs unstable | 3.7c | yes |
| openSUSE Tumbleweed | 3.7b | yes |

**What a below-floor tmux actually does, read out of `cfg.c` rather than run:** it does not refuse to
start. `cfg_add_cause()` at `cfg.c:207` collects the errors and `cfg_show_causes()` at `:241` reports
them; for a control-mode client — which `src/main/tmux/control-client.ts` is — it writes
`%config-error <text>` lines at `cfg.c:252`. `parseControlLine` at
`src/main/tmux/control-parser.ts:160` falls to `default: break` and returns `{ kind:
'other-notification' }`, so **Tortie swallows it silently.** The symptom would be tmux's own position
box painting over the transcript on every scroll — the exact thing the conf's own comment exists to
prevent — with nothing in any log.

It would not get that far anyway. `TESTED_TMUX_PAIRS` at `src/main/tmux/version.ts:103` holds exactly
one pair, `{server:'3.6a', client:'3.7b'}`, and `decideVersionGate` at `:462` returns `untested-pair`
for anything else and stops the boot with a screen. **Every distro tmux in that table is refused at
boot.** So bundling on Linux is not an optimisation, it is the only route — the same conclusion
research 43 reached for macOS, for different reasons.

#### A.1.3 `build/build-tmux.mjs` is the largest single piece of Linux work

`process.platform !== 'darwin'` throws at line 455. The macOS-bound executable statements beyond it:

| Line | What | Linux answer |
| --- | --- | --- |
| 95 | `const ARCH = 'arm64'` | Linux needs x64 **and** arm64 |
| 239, 263, 291 | `CC: \`cc -arch ${ARCH}\`` | `-arch` is an Apple clang flag; gcc rejects it |
| 271-272 | removes `*.dylib` from the utf8proc prefix | the stray is `libutf8proc.so*` |
| 312-317, 401 | `isMachO()` and the five Mach-O magics | ELF magic `\x7fELF` |
| 405 | `/usr/bin/lipo -archs` | no lipo; `readelf -h` or `file` |
| 410-419 | `/usr/bin/otool -L` plus the `/usr/lib/` allowlist that proves nothing leaked in from Homebrew | `ldd` or `readelf -d`, and the allowlist becomes `/lib/<triplet>` — a different and **weaker** assertion, because glibc versioning rather than path purity is what decides which distros the binary runs on |
| 458-463 | `which pkg-config` plus `"brew install pkg-config"` | copy |
| 218, 271, 485 | `/usr/bin/tar`, `/bin/ls`, `/usr/bin/strip` at absolute Apple paths | all three exist on Debian and Fedora — portable by luck, not by design |

Three requirements the script does not check today and would have to, read from the pinned tarball:

1. **yacc/bison is a hard configure requirement.** `configure.ac:291-294` is
   `AC_CHECK_PROG(found_yacc, $YACC, yes, no)` then `AC_MSG_ERROR("yacc not found")`. `cmd-parse.c`
   *is* pre-generated in the release tarball, but configure errors out regardless. macOS ships
   `/usr/bin/yacc` with the Command Line Tools, so this has never fired here.
2. **ncurses.** The README names libevent 2.x and ncurses as the dependencies, and the script's own
   header at lines 36-41 says ncurses comes from the operating system, which on macOS is Apple's
   `/usr/lib/libncurses`. On Linux the headers are not installed by default and the resulting binary
   dynamically links `libtinfo.so.6`, which the bundle would then have to carry or require. **The
   clean answer is a fourth pinned tarball built static, exactly like libevent and utf8proc.**
3. **`--enable-utf8proc` is optional on Linux.** `configure.ac:910-943` shows the "must give
   `--enable-utf8proc` or `--disable-utf8proc`" error is inside `case "$host_os" in *darwin*)` and
   nowhere else. Passing it on Linux still works and is arguably still right, since it is what the
   fleet runs. A note, not a change.

**Roughly 150 lines rewritten in a ~500-line file, plus one new pinned dependency and a second
architecture.** The build environment a Linux CI runner needs is `gcc`, `make`, `pkg-config`, `bison`
and (if ncurses is not vendored) `libncurses-dev`; `ubuntu-latest` has all of them. Cross-compiling
arm64 from an x64 runner is the awkward part and `ubuntu-24.04-arm` runners exist, so a second job is
the honest answer (§D.5).

For completeness: tmux publishes **source only**. The GitHub releases API on 2026-09-06 returns 3.7c
(2026-08-17) with exactly one asset, `tmux-3.7c.tar.gz` (789,431 bytes). There is no prebuilt binary
for any platform. The bundled tmux is 1,437,872 bytes on macOS, 0.83% of the DMG per
`electron-builder.yml:279`; on Linux, plus static ncurses, expect comparable or slightly larger,
times two architectures. **UNMEASURED:** nothing was built.

#### A.1.4 Two Linux hazards the macOS build does not have

**Hazard one: systemd-tmpfiles ages `/tmp`.** Upstream systemd ships `tmpfiles.d/tmp.conf`, fetched
verbatim on 2026-09-06:

```
q /tmp     1777 root root 10d
q /var/tmp 1777 root root 30d
```

`systemd-tmpfiles --clean` ages by timestamp and **does not check whether a file is open**. There is
an open, closed-without-fix tmux issue for exactly this — tmux/tmux#4640, *"tmux session files
vulnerable to systemd-tmpfiles removal"*. systemd documents an escape: a directory holding a shared
BSD file lock is skipped along with everything under it. **tmux does not take that lock.** The only
`flock` in tmux 3.7b is `client_get_lock` at `client.c:89-98`, and reading `client_connect` at
`:135-172` shows it is a transient *server-start* lock on `<socket>.lock`, taken `LOCK_EX|LOCK_NB` and
`close()`d at `:166` the moment the server is up. Nothing holds a lock on `/tmp/tmux-<uid>/` for the
server's life.

So on a default systemd distro, a Tortie tmux server whose socket directory has not been touched for
10 days is eligible for removal while every session inside it is running. The machine has to be up for
10 days for it to fire, which for a product whose pitch is sessions that outlive quit, crash and
reboot is not hypothetical. The mitigation is a `tmpfiles.d` drop-in with an `x /tmp/tmux-*`
exclusion, **which a `.deb` or `.rpm` can install and an AppImage cannot** — the first place the
substrate question reaches into the distribution question. Moving to `TMUX_TMPDIR=$XDG_RUNTIME_DIR` is
worse, not better: `/run/user/<uid>` is destroyed at last logout unless lingering is enabled.
**UNMEASURED:** whether real use refreshes the directory's timestamps enough to stay under 10 days.

**Hazard two: logind may kill the server at logout.** `logind.conf(5)`, quoted 2026-09-06, says
`KillUserProcesses` *"Defaults to `yes`"* and then says in as many words: *"Note that setting
`KillUserProcesses=yes` will break tools like screen(1) and tmux(1), unless they are moved out of the
session scope."* That `yes` is upstream's compile-time default and distros override it; Debian sets
`-Ddefault-kill-user-processes=false` in `debian/rules`, read from salsa on the day, so Debian and
Ubuntu are safe out of the box. **Fedora, RHEL, Arch and openSUSE were not checked.**

This is the single largest durability difference between macOS and Linux. The honest product answer is
that Tortie on Linux must either check `KillUserProcesses` at boot and say so plainly, or run
`loginctl enable-linger` for the user — which needs polkit and is a thing a terminal app should ask
about rather than do. **It is a product decision, not a code change**, and §0.4 names it as the one
finding that could flip the Linux verdict.

#### A.1.5 Flatpak and Snap are ruled out by the substrate, not by the packager

The Flatpak wiki's Sandbox page describes each instance as having *"A private pid namespace with a
minimal init process that reaps zombies"* and *"A watcher monitor that exits when pid 2 (the initial
process) of the app exits"*, and `docs.flatpak.org/sandbox-permissions` lists `/tmp` among the
directories that *"need to be explicitly requested with `--filesystem` and are not available with
`home, host, host-os, host-etc` by default"*.

A tmux server started inside such a sandbox lives in that instance's PID namespace and writes its
socket to that instance's private tmpfs. **Neither survives the app exiting and neither is visible to
the next launch.** That is the durability contract, gone. Escaping it needs `--filesystem=/tmp` *and*
`--talk-name=org.freedesktop.Flatpak`, which together are full host access wearing a sandbox's
clothes. §D.3.4 reaches the same refusal from the packaging side, for additional reasons.

**Snap strict confinement is assumed to be the same shape and it is UNMEASURED:** Canonical's
confinement documentation sat behind a readthedocs login on 2026-09-06 (HTTP 302 to a CAS login page).
§D.3.5 refuses Snap on grounds that do not depend on this — the `home` interface excludes dotfiles by
design, so `~/.claude` and `~/.codex` are out of reach without classic confinement and a Canonical
audit.

#### A.1.6 The native modules against the pinned Electron

`package.json` pins `electron: ^43.3.0` (installed 43.3.0), `node-pty: ^1.1.0` (1.1.0),
`better-sqlite3: ^13.0.3` (13.0.3), with a postinstall `electron-rebuild -f -w
node-pty,better-sqlite3`.

**The Electron ABI question is moot, and that is measured rather than assumed.** Both modules are
N-API: node-pty's `binding.gyp` depends on `node-addon-api ^7.1.0`, better-sqlite3 on `^8.0.0`, and
`napi_register_module_v1` and `node_api_module_get_api_version_v1` are present in the shipped
binaries. N-API is ABI-stable across Node and Electron versions, so a prebuild is per-**platform**,
not per-Electron.

**better-sqlite3 13.0.3 — portable, prebuilds already in the npm tarball.**
`node_modules/better-sqlite3/prebuilds/` holds `darwin-arm64`, `darwin-x64`, `linux-arm64`,
`linux-x64`, `linuxmusl-arm64`, `linuxmusl-x64`, `win32-arm64`, `win32-x64`, straight from npm.
`lib/binding.js:41-50` picks `<platform>-<arch>.node`, and `isLinuxMusl()` at `:52` switches to the
musl set by reading `process.report.getReport().header.glibcVersionRuntime`. Notably, on this machine
`build/Release/` holds no `.node` at all — `electron-rebuild` produced only stamps — so **the running
app already loads a prebuild rather than a rebuild**. Linux gets the same treatment for free. The
floor, re-derived at integration with `strings` over the prebuilds themselves and re-run at the
fix round because the integration reading stopped short on one arm: **`GLIBC_2.34`, `GLIBCXX_3.4.29`
(GCC 11) and `CXXABI_1.3.9` on linux-x64 — and the same three, identically, on linux-arm64.** That excludes Ubuntu 20.04
(2.31), Debian 11 (2.31), RHEL 8 (2.28) and Amazon Linux 2, and is met by Ubuntu 22.04+, Debian 12+,
RHEL 9+ and Fedora 35+.

**node-pty 1.1.0 — needs-work, no Linux prebuild in the pinned version.**
`node_modules/node-pty/prebuilds/` holds only the two darwin and two win32 directories, listed at
integration. The install script (confirmed against the registry: `npm view node-pty@1.1.0
scripts.install`) is `node scripts/prebuild.js || node-gyp rebuild`, and `scripts/prebuild.js:31`
exits 1 when `prebuilds/<platform>-<arch>` is absent, so **Linux compiles from source at install**,
needing python3 and a C++ toolchain on every machine that runs `npm install`. In CI that is fine; it
is one more thing the release lane carries. `binding.gyp` is kind here: the non-Windows branch builds
one target, `pty`, from `src/unix/pty.cc` with `-lutil`, and `spawn-helper` is an `OS=="mac"` target
only, so Linux has one artefact and nothing extra to unpack.

The upstream fix exists and is not released. `npm pack node-pty@1.2.0-beta.15 --dry-run` (published
2026-08-03, checked on the day) lists `prebuilds/linux-arm64/pty.node` and
`prebuilds/linux-x64/pty.node`; the downloaded x64 binary reads ELF x86-64 with a floor of
`GLIBC_2.28` / `GLIBCXX_3.4.22`, **lower than better-sqlite3's**, so better-sqlite3's 2.34 stays the
binding constraint for the whole app.

**The Phase 167 patch does not exist on Linux.** `patches/node-pty+1.1.0.patch` is the `/dev/ptmx`
leak fix. The patched region around `src/unix/pty.cc:778` sits inside the block opened by
`#if defined(__APPLE__)` at line 686 and closed at 791; Linux takes the `#if defined(__linux__)`
branch at line 611, which uses `forkpty` and never reaches it. So **Phase 167's fd hygiene is unproven
on Linux**, and `probe:p167`'s finding-1 assertion — that main holds exactly the `/dev/ptmx` and
`/dev/ttys` descriptors it started with — would have to be re-measured against `/proc/self/fd`. It is
a different mechanism, not a ported one.

**The other two are free.** `@parcel/watcher` 2.6.0 ships optional platform packages including
`linux-x64-glibc`, `linux-arm64-glibc` and both musl variants. `@vscode/ripgrep` 1.18.0 lists twelve
platform packages including `linux-x64`, `linux-arm64` and `linux-arm`, and
`src/main/search/resolve.ts:39-40` **already** composes
`@vscode/ripgrep-${process.platform}-${process.arch}` and already branches `rg.exe` for win32. That
module is portable today; what is not portable is the packaging around it (§D.2).

#### A.1.7 The login-shell PATH injection holds, and needs four lines

The Phase 12.7 F3 mechanism has three parts and only one of them is an OS behaviour.

1. **`captureLoginShellPath`** (`resolve.ts:262-360`) spawns `$SHELL -lic "printf
   '__GMUX_PATH__%s__GMUX_PATH__' \"$PATH\""` detached, settles on the markers and reaps the process
   **group** on the deadline. The flag form was measured locally: `bash -lic` accepts the clustered
   options and prints between the markers, exit 0 (GNU bash 3.2.57 on macOS — a Linux bash 5.x was not
   available, so the Linux run is **UNMEASURED**). `-l` sources `/etc/profile` and
   `~/.bash_profile`/`~/.profile`, `-i` adds `~/.bashrc`, which is where nvm, pyenv and rbenv init
   lines live on Linux exactly as on macOS. The docstring at `:213` already claims bash and fish
   accept the same flags and that is right.
2. **A pane takes its PATH from the tmux CLIENT**, and that is a tmux behaviour rather than a macOS
   one. `supervisor.ts:442-452` records it as measured on tmux 3.6a. The mechanism is
   platform-independent: `environ.c`, `spawn.c` and `server-client.c` in the pinned sources contain
   neither `__APPLE__` nor `__linux__`. The `set-environment -g PATH` write at `supervisor.ts:575` is,
   as its own comment says, for `show-environment -g` and the harness rather than for the pane.
3. **The premise** — that a GUI-launched app inherits a minimal PATH — is launchd on macOS. On Linux
   it is the display manager or `systemd --user`, and the answer **varies by desktop**: an X session
   started through `/etc/X11/Xsession` sources `~/.profile` and the app already has the user's PATH,
   while a GNOME/Wayland session under `systemd --user` may not. So the probe is **less often
   necessary and never harmful** — `mergePathDirs` at `resolve.ts:186` dedupes order-preservingly, so
   re-finding directories the app already had costs nothing.

**Four lines:** the `/bin/zsh` fallback at `:202,264,458`, and `/opt/homebrew/bin` at `:146` plus
`/home/linuxbrew/.linuxbrew/bin`. `PATH_MARKER` at `:154` and the ownership-tag trick
`proc/orphans.ts` depends on work verbatim.

#### A.1.8 Three neighbours of the substrate that will bite

**`/bin/ps` is hard-coded at five production sites** — `src/main/proc/ps.ts:87`,
`src/main/activity/process.ts:98,217,236`, `src/main/sessions/resume-in-place.ts:294,325`,
`src/main/scrollback/service.ts:245` — plus `/usr/bin/pgrep` at `activity/process.ts:255`,
`resume-in-place.ts:310` and `updates/recovery.ts:148`. On merged-`/usr` distros `/bin/ps` resolves;
on others it is `/usr/bin/ps` only. **Mechanical.**

**The `stat` flags port; the `time` resolution does not, and it silently degrades the status oracle.**
`src/main/activity/process.ts` reads only two STAT characters, `'s'` at `:138` and `'+'` at
`:288,306`, and procps-ng's `ps(1)` documents both identically — *"`s` is a session leader"*, *"`+` is
in the foreground process group"*, shown for BSD formats and when the `stat` keyword is used, which
`-o stat=` is. That tier ports. The CPU tier does not: `parseCpuTime` at `:57-68` is written for
macOS's `[[DD-]HH:]MM:SS.**ss**` and its docstring at `:51` says *"Resolution is 10 ms, which is why
the sampling interval must stay at 1 s"*, while procps-ng documents `time` as **`[DD-]hh:mm:ss`** —
whole seconds, no fractional part. The parser's arithmetic still produces the right number and nothing
crashes. But at a 1-second sample interval ΔTIME on Linux is quantised to 0 or 1 second, so the
derived percentage is 0% or ~100%, and `CPU_BUSY_TICKS = 2` at `:39` requires **two consecutive**
ticks over `CPU_BUSY_PERCENT = 5` at `:37`. **Derived, not measured:** an agent working at 20–40% of a
core accumulates one whole CPU-second every 2–5 samples and can essentially never produce two
consecutive increments, so the CPU promoter would stop firing for exactly the sessions it exists to
catch. The Linux answer is `/proc/<pid>/stat` fields 14–15 (utime+stime in clock ticks, 10 ms at
`USER_HZ`=100) — **cheaper than `ps` as well as finer, since it spawns nothing.** It needs a new
reader, not a flag.

**`proc/orphans.ts:157` — `if (row.ppid !== 1) continue;`** The orphan reaper identifies stranded tmux
clients by reparenting to PID 1. On a systemd machine `systemd --user` is a child subreaper — the
kernel's own `PR_SET_CHILD_SUBREAPER` patch names "the systemd per-user instance" as its motivating
user — so an orphaned client's parent is that manager's pid, not 1, and **the rule matches nothing.**
It fails in the *safe* direction: the reaper reaps nothing rather than signalling something it should
not. But the Phase 23 incident this file documents at `:117-138` is exactly about this predicate, so
it must be changed deliberately and not widened. `killProcessGroup`'s `process.kill(-pid, …)` at
`proc/guarded.ts:87` is POSIX and portable as written. `lsofOwnership` at
`manifest/harvest/agy-owner.ts:117` already spawns bare-name `lsof` with an explicit
`ENOENT → {ok:false}` fail-closed branch, so it degrades honestly on a box with no lsof — see §C.2 for
why that honest degradation is still a product loss.

#### A.1.9 The Linux substrate verdict

| Item | Verdict |
| --- | --- |
| tmux exists and behaves identically | **portable** — proven from the pinned sources: zero `__APPLE__` in tmux's core |
| Socket `-L gmux` and its `/tmp/tmux-<uid>/` path | **portable**, with the tmpfiles ageing hazard |
| `@gmux-*` options, `GMUX_SESSION_ID`/`GMUX_MANAGED`, `<userData>/gmux/` | **portable**, no rename anywhere |
| The conf against a distro tmux | **blocked** — floor 3.6, no LTS ships it, the version gate refuses at boot |
| The conf against a bundled tmux | **portable**, unchanged text |
| `build/build-tmux.mjs` | **needs-work** — ~11 statements, a fourth pinned tarball, two architectures |
| `before-pack.cjs` / `after-pack.cjs` | **needs-work** — 2 silent returns that must become deliberate branches |
| `src/main/tmux/resolve.ts` | **needs-work** — 8 lines |
| `src/main/tmux/env.ts` | **needs-work** — 1 line (`C.UTF-8`) |
| better-sqlite3, @parcel/watcher, ripgrep | **portable**, prebuilds exist; glibc floor **2.34** |
| node-pty | **needs-work** — no prebuild in 1.1.0; source build, or move the pin once 1.2.0 ships stable |
| Login-shell PATH injection | **portable** — 4 lines |
| `/bin/ps` sites and the CPU tier | **needs-work** — mechanical, plus one new `/proc` reader |
| `proc/orphans.ts` ppid rule | **needs-work** — one predicate, fails safe today |
| Flatpak / Snap strict confinement | **blocked** — private PID namespace and private `/tmp` destroy the durability contract |
| `KillUserProcesses` at logout | **needs-work, and it is a product decision** |

**The shipping code is roughly 300–400 lines across nine files, plus about 150 rewritten lines in
`build/build-tmux.mjs` and one new pinned dependency.** On a machine that already has Linux hardware
that is one phase. What it costs is everything downstream: a real Linux row in `TESTED_TMUX_PAIRS`
(and `TESTED_REMOTE_TMUX_VERSIONS`'s own `subject` field already insists a distribution's patched
build is a different subject from an upstream tarball — Debian's tmux links `libsystemd0` and
`libjemalloc2`, so it genuinely is one); a Linux gate lane, since `smoke:t1`, `smoke:t3`,
`conformance:resume` and `probe:p167` all assume macOS shapes; and `-ApplePersistenceIgnoreState YES`
in about 30 npm scripts becoming positional garbage on a Linux harness launch. §F.4 prices it.

### A.2 Windows — the five options, priced

#### A.2.1 What the substrate contract actually is, measured

A Windows substrate is not judged against "tmux". It is judged against what Tortie asks tmux for.
Measured over `src/main` excluding `__tests__`, with the file counts re-run at integration:

| Measurement | Value |
| --- | --- |
| `.ts`/`.tsx` files under `src/main` | 985 |
| …non-test | 544 |
| …that name tmux at all | **334** `.ts`/`.tsx`, of which **149 are under `__tests__` and 185 are not**; 338 counting four non-`.ts` test fixtures |
| **Local substrate** — files holding a real tmux verb string or an exec-door call, excluding `machines/`, `harness/`, `conformance/` | **20 files, 15,064 lines** |
| Same, including them | 52 files, 35,128 lines, of which `machines/` is 15 files and 12,343 lines |
| Exec-door call sites in production | **88** (50 `execOn`, 33 `execTmux`, 5 `tmuxCommand`) |
| Distinct tmux **verbs** used in production | **19** |
| Distinct tmux **format variables** read in production | **31** |

The 19 verbs, with production site counts: `send-keys` (22), `display-message` (15), `list-sessions`
(12), `set-option` (10), `show-environment` (9), `new-session` (8), `list-panes` (8), `capture-pane`
(7), `show-options` (6), `set-environment` (6), `start-server` (5), `rename-session` (5),
`kill-server` (4), `kill-session` (3), `attach-session` (3), `respawn-pane` (2), `copy-mode` (2),
`has-session` (1), `clear-history` (1). The boundary probe counted the same 19 verbs by a different
method over a wider set (§F.2), which is a corroboration since neither saw the other's list.

**The 31 format variables are the real contract, and they split three ways.**

- **18 are the supervisor's own bookkeeping** — `session_id`, `session_name`, `session_created`,
  `session_activity`, `session_attached`, `session_windows`, `window_id`, `window_activity`,
  `window_bell_flag`, `pane_id`, `pane_active`, `pane_height`, `pane_current_path`,
  `pane_start_command`, `history_limit`, `dir`, `socket_path`, `pid`, `version`. A dictionary and a
  clock.
- **8 are deep terminal-emulator state** — `alternate_on`, `keypad_flag`, `pane_in_mode`,
  `scroll_position`, `history_size`, `history_bytes`, `pane_title`, `mouse_any_flag`. These are why
  tmux is a VT parser and not a pipe. They feed `src/main/activity/panes.ts` and `oracles.ts`,
  `src/main/tmux/scroll.ts` and `src/main/scrollback/service.ts`.
- **5 come from the OS** — `pane_pid`, `pane_current_command`, `pane_dead`, `pane_dead_status`,
  `pane_dead_signal`.

**Two of those five are what Windows genuinely cannot give back.** ConPTY has no foreground process
group, so `pane_current_command` — "what is running in this pane right now" — has no honest Windows
answer; you would walk the process tree and guess. And Windows has no signals, so `pane_dead_signal`
and the registry's own measured claim for claude, that a `^C` in a tmux pane leaves
`#{pane_dead_status}` at 130, do not transfer; Windows returns `0xC000013A` for Ctrl+C. The exit-code
truth contract in `src/main/manifest/schema.ts` is POSIX-signal-shaped and would need a per-platform
meaning.

Four of the conf's twelve settings are load-bearing and a substitute must reproduce them or lose a
feature: `exit-empty off` (the server survives the last session closing — this *is* the live tier),
`remain-on-exit failed` (exit-code truth), `allow-passthrough on` (OSC 52 and images — the image-drop
feature) and `extended-keys on` (CSI-u, which is Claude Code's shift+enter and the `multilineKey`
contract in the registry).

#### A.2.2 Option A — WSL2, shaped as a machine

**The shape that makes this cheap is not the obvious one.** Do not model WSL as "the local substrate,
but Linux". Model it as **a machine**, which Tortie already has: Phases 68–73 built a remote plane of
15 files and 12,343 lines. `src/main/machines/context.ts` already composes exactly two shapes through
one function, and the remote one is
`file: <ssh>, argv: [...sshOptions, host, "<remoteTmuxPath> -L <socket> -f /dev/null <verb>"]`. The
WSL shape is the same shape with a different carriage: `wsl.exe -d <distro> -e <tmuxPath> -L gmux -f
/dev/null <verb>` — one quoted command handed across a boundary to a Linux shell. `execOn` in
`exec-plane.ts` is already the one door and already takes an injected transport, and
`src/main/tmux/control-client.ts` had its transport made injectable in Phase 71 precisely so the line
protocol could run over a local pipe and over a connection to another machine.

**What works, unchanged.** tmux is the same program, so all 19 verbs, all 31 format variables,
`gmux-tmux.conf` as written, the `-L gmux` socket, all five `@gmux-*` options, `GMUX_SESSION_ID` and
`GMUX_MANAGED`, `remain-on-exit failed`, `#{pane_dead_status}` with real POSIX signal numbers, and the
whole activity oracle stack survive byte for byte. **Every identifier `CLAUDE.md` protects is portable
under A and under no other Windows option.** The agents run their Linux builds, with sandboxing —
Anthropic's own setup page, read 2026-09-06, states *Sandboxing — Not supported* for native Windows
and *Supported* for WSL 2, and OpenAI's current guidance says WSL2 gives Landlock and seccomp,
*"the same sandbox the models were primarily trained against."* **The agents are safer inside WSL than
on native Windows**, which points the same way the substrate does.

**What a person installs first:** WSL2, a distribution, tmux inside it, and their agents inside it.
That is a real floor and it is A's honest cost. It is also the floor VS Code Remote-WSL has imposed
since 2019.

**Does the live tier survive? UNMEASURED, and it has a caveat that matters.** Microsoft's `.wslconfig`
page (updated 2026-06-02) documents `vmIdleTimeout`, default 60,000 ms, Windows 11 only — but that
timer governs **the VM after all distros have stopped**, not the distro. The setting that governs the
distro, `instanceIdleTimeout` (default 15,000 ms, `[general]` section), **does not appear anywhere in
the settings tables on that page as read on 2026-09-06.** Community sources agree it exists and that
it triggers only *"if there are no active user processes in the WSL instance"*, and that a long-running
process such as tmux keeps the distribution running — which is exactly Tortie's case, since
`exit-empty off` means the tmux server is always an active process. **So A's live tier almost certainly
works, by the same mechanism Docker Desktop uses (a `wslkeepalive` dummy process), and nobody has
run it.** This is the single measurement A must make before it is chosen and it is cheap: start a tmux
server in a distro, close every terminal, wait five minutes, `wsl --list --running`.

**Reboot costs nothing extra.** A Windows reboot tears down the WSL VM exactly as a macOS reboot kills
the tmux server, and both land in the cold tier, which is already built (§A.0). The one addition is
that Tortie must bring the distro back (`wsl.exe -d <distro> -e true`) before restore runs.
`app.setLoginItemSettings` is supported on Windows — and **not on Linux**, which is a separate problem
for the Linux target.

**What breaks, and it is the file boundary.** `microsoft/WSL#4739` — *"[WSL2] File changes made by
Windows apps on Windows filesystem don't trigger notifications for Linux apps"* — is **open, created
2019-12-06, last updated 2026-05-24, 180 comments, 513 👍**. Six and a half years. The 9p server backing
`/mnt/c` does not deliver inotify. Microsoft's own filesystems page (updated 2026-06-02) says plainly:
*"We recommend against working across operating systems with your files… store your files in the WSL
file system if you are working in a Linux command line… your performance speed will improve if you
store them directly on the `\\wsl$` drive."*

Concretely, if the repo is on the Windows side: the Explorer tree, the Changes list, the Architecture
panel and the file watcher all go **silently stale**, which is the failure mode the Zen explicitly
names as worse than none (*"a map that goes quietly stale is worse than no map at all"*). Search would
run ripgrep over 9p and be slow. **So A carries a product rule, not a workaround: repos live on the
Linux side, Tortie says so on its face, and it refuses to open a `/mnt/c` project quietly.** That is a
legitimate constraint honestly stated. It is not a bug anyone can fix but Microsoft.

**The fidelity trap, and its escape hatch.** node-pty on Windows *is* ConPTY — measured from the
vendored source at `node_modules/node-pty/src/windowsPtyAgent.ts:62`, node-pty 1.1.0 chooses ConPTY
when the Windows build number is ≥ 18309 and falls back to the bundled winpty below that. So an attach
carriage of `node-pty → wsl.exe → tmux attach` puts every byte tmux emits through conhost's
screen-buffer round trip, which is where `allow-passthrough on` and `extended-keys on` are at risk:
`microsoft/terminal#15976`, *"[megathread] ConPTY buffer gets out-of-sync"*, is **open, created
2023-09-17, last updated 2026-08-05**, promoted by maintainers to a megathread tracking an in-proc
conpty. OSC ordering relative to text is documented as not preserved. **WSL2 does not escape ConPTY,
because the terminal is still on the Windows side.**

The escape hatch is real and Tortie already owns half of it: **tmux control mode over plain pipes, no
pty at all.** tmux's `refresh-client` documents a `no-output` client flag meaning *"the client does not
receive pane output in control mode"* — which is precisely what `src/main/tmux/control-client.ts` sets
today to suppress the `%output` firehose. Not setting it makes control mode a rendering path, which is
the design iTerm2 has shipped for over a decade. A carriage of `child_process.spawn('wsl.exe',
[...,'tmux','-CC','attach'], {stdio:'pipe'})` creates no ConPTY, so no conhost parses anything and the
bytes reach xterm.js untouched. It costs a second rendering path and its own flow control, and the
`%output` escaping must be measured. **UNMEASURED, and it is A's second required measurement.**

**Verdict on A: keeps every promise, reuses the largest existing seam, and its two open risks are both
measurable in a day.**

#### A.2.3 Option A2 — ship the Linux build under WSLg

Windows 11 ships WSLg, a Wayland/X11 compositor, and a Linux Electron app runs in it as a normal
window with clipboard and GPU. **A2 requires zero Windows-specific code: the Linux target, which this
phase is pricing anyway, IS the Windows target.**

What it costs: it is a Linux app on a Windows machine. GTK menus rather than native Windows menus, so
the `CLAUDE.md` rule about native menus is satisfied in letter and not in spirit. Windows 11 only
(build 22000+). GPU through a paravirtualized stack. No Windows taskbar or file-association
integration. It is not a product anyone would market as "Tortie for Windows".

But it is the cheapest thing in this document that keeps **every** promise, and it is a defensible
*first* Windows answer: *"Tortie runs on Windows today through WSL; a native shell comes later."*

#### A.2.4 Option B — a Tortie-owned supervisor over ConPTY

**Say it plainly: it is a new durability layer, written this year, on the path where losing a byte
loses an agent's turn.** The Zen names this refusal directly — *"Not clever where it could be dull.
Anything durability-critical should be boring, inspectable and older than this product."* A supervisor
Tortie writes is none of those three.

The minimum to keep the live tier is eight things and none is optional:

1. A detached process that **breaks out of the parent's job object**. On Unix, tmux forks, `setsid`s
   and reparents to launchd and nothing can kill it. Windows has no such default: `detached: true`
   gets the child its own console, but a process created inside a job object joins that job unless it
   is spawned with `CREATE_BREAKAWAY_FROM_JOB` and the job permits breakaway. **Whether Electron's own
   process on Windows sits in such a job is UNMEASURED**, and it is the first thing B must prove.
2. One ConPTY per session, owned by the supervisor rather than the app.
3. **A VT parser, a screen model and a 25,000-line scrollback ring per session** — that is what serves
   `capture-pane`, `history_size`, `alternate_on`, `pane_in_mode` and `scroll_position`.
4. A client protocol over a named pipe: attach, replay, stream, input, resize, detach, list, kill,
   rename, options get/set, capture, send-keys.
5. Flow control. The attach host's 256 KB / 64 KB watermarks (`attach-host.ts`) assume the server
   keeps absorbing output while the client is paused; that absorption is tmux's, and the supervisor
   must inherit it.
6. Exit-code capture with a `remain-on-exit failed` semantic, and a Windows meaning for
   `pane_dead_signal` that does not exist.
7. Durable per-session metadata for the five `@gmux-*` options, and pane-env stamping.
8. Eighteen years of not dying, which it does not have.

**Item 3 is smaller than it looks, and that was checked rather than assumed.** `@xterm/headless` 6.0.0
exists, published 2025-12-22, **zero dependencies**, same major as the `@xterm/xterm` ^6.0.0 Tortie
already ships. Read from the installed typings at `node_modules/@xterm/xterm/typings/xterm.d.ts`:
`modes.applicationKeypadMode` (line 1915) is tmux's `keypad_flag`; `buffer.active.type: 'normal' |
'alternate'` (1507) is `alternate_on`; `buffer.active.length` (1536) is `history_size`; `baseY` (1531)
is the `scroll_position` basis. **All eight deep-emulator format variables are obtainable**, and using
the same emulator the renderer draws with would make `capture-pane` and the drawn screen agree by
construction, which tmux and xterm.js do *not* guarantee today.

So B is buildable and cheaper than the naive reading. **It should still be refused, for three reasons
that are not about difficulty:**

- **What breaks when it has a bug is the product's only irreplaceable thing.** A supervisor crash
  loses every live session on the machine, and the cold tier brings back the *conversation* but not
  the in-flight turn — the forty minutes of work that was running.
- **It doubles the substrate contract forever.** Every future phase that touches sessions pays for two
  substrates, in code, in gates and in verification. `conformance:resume`, `smoke:t3` and the
  durability lane are all tmux-shaped.
- **It is `src/main` owning the one thing the scope guardrail says to assemble rather than
  reimplement.** A terminal multiplexer is not glue and it is not a differentiator.

**No line count is put on B**, because nothing was built and a guessed number is what this phase
forbids. What can be said is measured: **20 files and 15,064 lines of local substrate would have to be
rewritten against a new door, at 88 call sites**, and that is the *client* side, before the supervisor
exists.

#### A.2.5 Option B′ — zellij, which "assemble, never reimplement" requires pricing

**Zellij shipped native Windows support in v0.44.0, published 2026-03-23, and has maintained it
through v0.45.1, published 2026-08-28** — verified from the GitHub releases API on the day rather than
from an article. A detached server, sessions that outlive clients, `attach`, and a CLI. Structurally
it is tmux's shape.

Then what is open. **36 open ISSUES and 9 open PULL REQUESTS with "Windows" in the title, 45 threads in
all** — re-run at the fix round on 2026-09-06 through the GitHub search API, because the integration
figure of "45 open issues" counted pull requests as issues (`is:issue is:open Windows in:title` = 36,
`is:pr` = 9, unqualified = 45). The relevant ones read like a list of Tortie's own requirements, and
which kind each thread is is stated, because for the first one it is the whole point:

- **#5195 is a PULL REQUEST, not an issue: `fix(windows): break server out of parent job on spawn`,
  open, created 2026-05-19 and untouched since 2026-05-20** (GitHub API, read at the fix round). The
  server does not break out of the parent's job object, so when the parent's job is terminated
  *"there's nothing left to `zellij attach` to."* **That is the live tier, and the correction makes the
  case sharper rather than softer: a proposed fix for the substrate's own durability has sat unmerged
  for three and a half months.**
- #5580, issue, opened 2026-09-03 — a stale session marker whose PID has been reused hangs the client
  forever.
- #4998, issue, opened 2026-04-03 — cannot attach to a session after renaming it. Tortie calls
  `rename-session` at 5 production sites.
- #5333, issue, opened 2026-07-05 — multi-line bracketed paste renders in **reverse line order**.
  Tortie's image drop is a bracketed paste of a path.
- #5022, #5017 (both 2026-04-08), #5294 (2026-06-21) and #5360 (2026-07-12), all issues — Ctrl+D not
  passed through, all Ctrl+ combinations emitting `[xx;5u` garbage, Ctrl+Enter not reported. That is
  the `extended-keys` / `multilineKey` contract.
- #5258 (2026-06-13) and #5090 (2026-04-23) — the Windows ARM64 CI target. **Both are pull requests
  and both are open**, which is the same reading as #5195: the work is proposed and not landed. **No
  release has ever published a Windows ARM64 asset**; every Windows artefact from v0.44.0 to v0.45.1
  is `x86_64-pc-windows-msvc` only.

And structurally, independent of bug counts: zellij has **no user-settable per-session key/value
options**, so the five `@gmux-*` stamps have no home and only the `GMUX_SESSION_ID` pane-env half
survives; **no `remain-on-exit failed` / `pane_dead_status` equivalent**, so exit-code truth is lost;
and **no control-mode event stream**, so `control-client.ts` — Tortie's event bus — has nothing to
attach to.

**Refuse today. Re-price when the open Windows issue count is in single digits, #5195 is merged, and an
`aarch64-pc-windows-msvc` asset exists.** Its Windows port is five and a half months old against
tmux's eighteen years, and Tortie's rule is that the durability layer must be older than the product.

#### A.2.6 Option E — tmux under Cygwin/MSYS2, which the pinned tarball refutes excluding

**This option was excluded by an absolute, and the absolute was wrong.** The first draft of this
document wrote *"There is no tmux on Windows and never has been"* and cited tmux's own README. The
README line is verbatim correct — `README:7` of the pinned 3.7b tarball reads *"This release runs on
OpenBSD, FreeBSD, NetBSD, Linux, macOS and Solaris"* — but the inference from it is not, and the
tarball sitting in this repository is what refutes it. Read at the fix round on 2026-09-06 out of
`build/vendor/tmux/work/tmux-3.7b/`:

- `configure.ac:993-995` — `*cygwin*|*msys*) AC_MSG_RESULT(cygwin); PLATFORM=cygwin`, a first-class arm
  beside the darwin, linux and solaris ones rather than a fall-through to the `*)` arm's
  `PLATFORM=unknown` at `:1001-1003`.
- `configure.ac:1016` — `AM_CONDITIONAL(IS_CYGWIN, test "x$PLATFORM" = xcygwin)`.
- `Makefile.am:79-82` — `# Set flags for Cygwin. / if IS_CYGWIN / AM_CPPFLAGS += -DTMUX_SOCK_PERM=0`.
- `server-client.c:2546-2549` — `#ifdef __CYGWIN__`, reopening the client's tty by name.

**And it ships.** `packages.msys2.org/base/tmux`, read 2026-09-06, packages **tmux 3.7c** in MSYS2's
`msys` repository — one release NEWER than the 3.7b this repository pins, and above the conf's own
floor, which is more than any Linux LTS in §A.1.2's table manages. So option E is real, it is the same
eighteen-year-old program with the same 19 verbs and the same 31 format variables, and on its face it
scores on exactly the grounds B and B′ are refused on: boring, inspectable, older than this product,
and no new durability code Tortie owns.

**It is refused, and this is the price rather than another absolute.**

1. **The pty is emulated, so every agent needs a second adapter — at every pane.** The `msys`
   environment is a Cygwin runtime and a Cygwin pty is not a Windows console. winpty exists for
   precisely this, and its own README (read 2026-09-06) states the case: it *"allows running Windows
   console programs (e.g. CMD, PowerShell, IronPython, etc.) under `mintty` or Cygwin's `sshd` with
   properly-functioning input (e.g. arrow and function keys) and output (e.g. line buffering)"*, by
   *"starting the `winpty-agent.exe` process with a new, hidden console window"* and polling that
   console's screen buffer for changes, and its own opening paragraph says it is *"a tool for Cygwin
   and MSYS for running Windows console programs in a Cygwin/MSYS pty"*. Every agent that runs on
   Windows at all runs there as a native `.exe` — eleven of the twelve, per §C.1 — so under E every
   pane becomes `tmux → winpty-agent → a hidden conhost → the agent`. That is the ConPTY fidelity tax option A pays, paid one layer deeper and at every pane
   rather than only at the attach carriage — and option A has an escape hatch from its tax
   (`tmux -CC` over plain pipes, §A.2.2) where E has none, because E's adapter is *inside* the pane.
   MSYS2 packages winpty 0.4.3-3, whose upstream predates ConPTY entirely.
2. **Paths stop agreeing with themselves, and that is not cosmetic.** A Cygwin tmux gives its panes a
   Cygwin view of the filesystem, `/cygdrive/c/Users/x/repo`, while the agents running in those panes
   are Windows programs writing their stores at `C:\Users\x\...`. §C.2's harvest descriptors encode a
   project's cwd into a store directory name; encoded from the Cygwin form they name a directory the
   agent never created, so `tmux-pane` degrades to nothing on exactly the rows §C.1 says are strongest.
   And §C.3's one findable defect inverts rather than disappears: `bareNameFor`'s
   `bare.includes('/')` guard fires on the Cygwin spelling of a path and not on the Windows spelling of
   the same binary, so the two halves of one session disagree about what a path is.
3. **The agents lose their sandbox, which is the same reading §A.2.2 takes in A's favour.** Cygwin
   offers no Landlock and no seccomp; Anthropic's own setup page reads *Sandboxing — Not supported* for
   native Windows and *Supported* for WSL 2. E's agents are exactly as exposed as B's.
4. **No Windows arm64, which is the criticism this document makes of zellij four paragraphs up.** The
   `msys` environment is x86_64 only; MSYS2's single aarch64 environment is CLANGARM64, an
   LLVM/ucrt **native Windows** toolchain (msys2.org/docs/environments, read 2026-09-06), which by
   construction cannot host a Cygwin-emulated tmux. Refusing B′ partly for a missing arm64 asset and
   then shipping E would be inconsistent.
5. **A second runtime a person installs first, and it is not the one they would otherwise install.**
   A asks for WSL2, which Microsoft ships, which VS Code Remote has required since 2019 and which the
   agent vendors themselves document. E asks for MSYS2, which nothing else on the machine wants, and
   then asks for tmux and the agents inside it anyway — so E's install floor is A's install floor with
   a less familiar runtime at the bottom of it.
6. **One startup pathology, fixed, and included because of what it indicates rather than what it
   costs.** tmux/tmux#3428, *"Reissue: slow startup under MSYS2/Cygwin"*, opened 2023-01-08 and now
   **closed**, traced multi-second client startup to Windows' TCP SYN retransmission behaviour on the
   connect path. It is not a live defect. It is here because the upstream README declining to list the
   platform is a maintainer's statement about what they test, and this is the shape of what goes wrong
   on a platform tested by somebody else.

**What E genuinely buys, stated so the refusal is priced and not dismissed.** E is the only option
besides A under which Tortie writes no durability code, and unlike A it leaves Tortie a **native
Windows app**, so the Explorer tree, the Changes list, the Architecture panel and the watcher all read
Windows files natively and `microsoft/WSL#4739` — A's one product concession — does not exist. That is
a real advantage and it is the reason E gets a section rather than a sentence.

**Verdict: refuse, on the record.** E trades A's one file-boundary concession for an emulated pty at
every pane, a path model that disagrees with the agents' own, no agent sandboxing, no arm64 and an
unfamiliar runtime. **E would rise above A only if WSL2 were unavailable to the person**, which is not
a case anybody has presented. It does not move the recommendation, which stays D with A2 as the
shippable step — and it is written down so a later round prices it rather than inheriting an absolute
this one got wrong.

**UNMEASURED for E, and it is everything behind the arithmetic above:** no MSYS2 machine was used. In
particular, whether `gmux-tmux.conf` loads clean on the MSYS2 3.7c build, whether `remain-on-exit
failed` reports a native `.exe`'s exit code faithfully through the Cygwin process layer, whether
`#{pane_dead_signal}` has any meaning there, and what a Cygwin tmux server does across a Windows
logoff. The probe is one MSYS2 install and the existing T1 smoke.

#### A.2.7 Option C — a weaker durability contract

As the charter states it ("survive app quit but not reboot"), **C is not weaker than macOS — it is
macOS**, per §A.0. So the option has to be restated to mean anything: C is *sessions that do not
survive app quit*, which is where you land if you refuse WSL, refuse a supervisor and ship anyway.

What the product becomes: a multi-project tabbed terminal with a nice tree and an agent picker.
Quitting kills the agent mid-turn. The Zen's first section — *"The shell is a promise… Closing the app
should feel safe"* — is false there, and all three bullets of `WHY-TORTIE-IS-DEPENDABLE.md` are false.

And the arithmetic is worse than the same degradation would be on macOS: **quit is the common case and
reboot is the rare one.** An agent runs for forty minutes, you close the window, that is every day.
Reboot is monthly. C sacrifices the frequent case to save the rare one. (Windows Update's forced
restarts also make reboots more frequent on Windows, which makes the cold tier matter more rather than
less; **frequency UNMEASURED**.)

**Refuse.** A platform where closing the window loses work should not carry this product's name. If
that is the only Windows on offer, D is better than C, because refusing is honest and C is a promise
that quietly is not kept.

#### A.2.8 Option D — refuse Windows

**A real answer, and the correct fallback.**

**What it costs:** reach, in the segment where a lot of agentic coding happens, and the awkwardness
that eleven of twelve agents publish a Windows binary while Tortie does not.

**What it saves, and this is the larger half:** no second substrate contract, no second fidelity
surface, no ConPTY, no second signing regime, SmartScreen reputation or MSIX lifecycle, and no
pressure to write a durability layer Tortie owns.

**One sharp Windows-specific finding that belongs to D's case and to §D.** MSIX terminates every
process running from a package when that package is disabled or updated. If Tortie shipped as MSIX
with a supervisor inside the package, **a self-update would kill every live session** — a direct
collision with Phase 24's self-update path and with the live tier itself. Anthropic is currently
living this: `anthropics/claude-code#76357`, *"Windows (MSIX): update fails with 'Another program is
currently using this file'"*, and #88586 on the notification-area instance holding the single-instance
lock. So any Windows build must be NSIS or a plain installer, or must put the supervisor outside the
package — another reason B is worse than it first looks.

#### A.2.9 The five-way comparison

| | **A. WSL2 as a machine** | **B. Tortie supervisor / B′ zellij** | **E. Cygwin/MSYS2 tmux** | **C. Sessions die with the app** | **D. Refuse Windows** |
| --- | --- | --- | --- | --- | --- |
| Live tier (quit, crash) | **Kept** — tmux, unchanged | B: kept if written correctly. B′: **open PR #5195** | **Kept** — the real tmux, `exit-empty off` | **Lost** | n/a |
| Cold tier (reboot) | Kept — same code as macOS | Kept | Kept | Kept | n/a |
| Protected identifiers | **All portable** | B: reimplemented. B′: `@gmux-*` has no home | **All portable** | Reimplemented | n/a |
| 19 verbs / 31 formats | **All, free** | B: 18 free, 8 via `@xterm/headless`, 2 with no honest Windows answer | **All, free** | Same as B | n/a |
| Agent sandboxing | **Supported** (WSL2) | Not supported | Not supported | Not supported | n/a |
| Terminal fidelity | ConPTY tax on attach, **avoidable via control mode over pipes** | ConPTY tax, unavoidable | **winpty at every pane**, not only at attach, and no escape hatch | ConPTY tax | n/a |
| Path model the agents agree with | Linux paths, agents run Linux builds | Windows paths throughout | **Split** — `/cygdrive/c` in the pane, `C:\…` in the agents' stores | Windows paths throughout | n/a |
| Explorer / git / search, repo on the Windows side | **Broken** (WSL#4739, open 6.5 yrs) — so the product requires Linux-side repos | Native and correct | **Native and correct** — E's one real advantage over A | Native and correct | n/a |
| Windows arm64 | Yes | B: yes. B′: **no asset ever published** | **No** — `msys` is x86_64 only | Yes | n/a |
| Person must install first | WSL2 + distro + tmux + agents | Nothing | MSYS2 + tmux + agents | Nothing | n/a |
| New durability code Tortie owns | **None** | B: all of it. B′: a second substrate contract forever | **None** | All of it | None |
| Largest existing seam reused | `machines/` — 15 files, 12,343 lines | None | `machines/`, same shape as A | None | n/a |
| Breaks the Zen | No | **Yes** (*"boring, inspectable and older than this product"*) | No — the substrate is older than the product | **Yes** (*"the session continues"*) | No |

#### A.2.10 The Windows substrate verdict

**Two options write no new durability code, A and E**, and E is the one the fix round added after the
first draft excluded it by an absolute. Between them A wins on every axis but one: the agents keep
their sandbox, the pty tax is confined to the attach carriage and has an escape hatch, the paths the
panes see are the paths the agents write, and Windows arm64 exists. E's single advantage is that Tortie
stays a native Windows app, so §A.2.2's file-boundary concession disappears — which is real, and is not
worth an emulated pty in front of every agent. Every other option asks the product to own the layer its
own philosophy says it must not own. So: **A is the shape if Windows ever happens, A2 is its shippable
first step, B, B′, E and C are refused with their reasons on the record, and D is what this document
recommends holding until A's two measurements are taken.**

**UNMEASURED for §A.2, in full:** no Windows machine and no MSYS2 installation were used. Specifically
— whether a tmux server keeps a WSL2 distro alive; whether Electron's process on Windows sits in a job
object; ConPTY fidelity for Tortie's actual stream; `tmux -CC` as a rendering carriage; WSL2
boot-to-usable latency; 9p throughput in numbers; Windows Update restart frequency; and everything in
§A.2.6's own UNMEASURED paragraph, being whether `gmux-tmux.conf` loads clean on MSYS2's tmux 3.7c and
whether exit-code truth survives the Cygwin process layer.

---

## B. Every macOS mechanism, and what replaces it

**Method.** Read out of the tree at `bb9a5cb` on 2026-09-06. Counts marked *(measured)* come from
scanners that strip `/* */` and `//` comments before matching, so a mechanism named only in a
docstring is never counted as a call site; they exclude `__tests__/`, `src/main/harness/` and any file
whose name contains `probe` or `smoke`. Platform facts marked *(read)* were fetched on the day from
the source named.

### B.0 The headline counts

| Count | Value |
| --- | --- |
| `process.platform` sites in `src/` | **11** total, **8** non-test, **6** of those are code (§0.5) |
| Files in `src/` naming `darwin` | **10** (4 non-test) |
| Shipping files scanned | **1,184** |
| macOS-mechanism call sites in shipping code | **144 across 29 files** |
| Keymap chords total / carrying `Cmd` / using `CmdOrCtrl` | **70 / 49 / 0** (`src/shared/keymap.ts`) |
| Plain `Cmd+X` chords, no other modifier | **32** |
| `.metaKey` reads in shipping renderer code | **48 across 20 files** |
| `startsWith('/')` as an absoluteness test — **local** side | **31 sites, 22 files** |
| same — **remote** side (`machines/`, `remote-*`, `harvest/`) | **41 sites, 25 files**, correct by construction because the far end is always POSIX |
| `build/` scripts naming a macOS-only tool or bundle path | **36 of 204** |
| Probes driving **real OS keystrokes** via AppleScript System Events | **13** |
| Probes driving **CDP Input / `sendInputEvent`** (portable) | **7** |
| npm scripts / build scripts passing `-ApplePersistenceIgnoreState` | **23 / 6** |

**The shape of the finding: the binding is thin in `src/` and thick in `build/` and in the keymap.**
144 sites over 1,184 files is 2.5% of files. But 49 of 70 chords and 48 `metaKey` reads are one
coherent surface that has to be redesigned rather than branched, and 36 of 204 build scripts are the
release lane and the verification apparatus.

### B.1 The table

Cost is in engineer-days of build work for the mechanism alone, excluding verification. **WORSE**
means the surface is permanently degraded on that platform, not merely different.

| # | Mechanism | File(s) | What macOS does | Linux | Windows | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Tortie's own credential vault** | `credentials/vault.ts`, `index.ts:87` | Keychain item `Tortie-credentials-<slot>-<8 hex of sha256(logins root)>` via `/usr/bin/security -i` | **Already shipped.** `fileVault(join(root,'kept'))` — one `0600` file per slot in a `0700` dir. `keychainIsTheStore()` is one `process.platform === 'darwin'` and the else-branch is production code today | Same `fileVault` branch | **0 d** |
| 2 | …but the file vault's **confinement** | `vault.ts` `fileVault`, `nofollow.ts` | Keychain ACL binds the item to Tortie's signature; another process as the same user needs a prompt | POSIX `0700`/`0600` — any process as the user reads it. **WORSE** | `mkdirSync(mode:0o700)` and `CREDENTIAL_FILE_MODE` are **no-ops on Windows** (Node's mode maps only to the read-only bit). The dir sits under `%APPDATA%\Tortie`, so the user-profile ACL is the only protection and Tortie asserts none of it. **WORSE** | 1–2 d for an explicit Windows ACL; on Linux there is nothing to do and nothing that helps |
| 3 | **The vendor claude store** | `credentials/stores.ts:174,274,314,364` | Keychain item `Claude Code-credentials` | **Already shipped.** `!d.keychainForClaude` → `~/.claude/.credentials.json`, which Anthropic's own IAM docs (read 2026-09-06) say is exactly what Linux uses at mode `0600` | Same file at `%USERPROFILE%\.claude\.credentials.json`, *"inherit[ing] the access controls of your user profile directory"* per the same doc | **0 d** |
| 4 | **`forgetStore`** (the Phase 206 stray-item delete) | `stores.ts:364` | Deletes the derived keychain item a login-remove leaves behind | No-op and correct: the credential is a file inside the directory the remove already deleted | Same | **0 d**, it already returns early when `!keychainForClaude` |
| 5 | **Claude Code's three advisory locks** | `credentials/locks.ts` | `mkdir` on `<config-home>/.oauth_refresh.lock`, `<realpath config-home>.lock`, `<config-dir>/.storage-write` | Portable verbatim — `mkdir` is atomic, `realpath` exists | `mkdir` is atomic on NTFS and `realpathSync` resolves. **UNMEASURED** whether the Windows Claude Code build takes the same three locks with the same names; research 79's offsets were read from a macOS bundle | Linux 0 d; Windows 2–3 d to re-derive, or a documented race |
| 6 | **The no-follow write guard** | `credentials/nofollow.ts:126` | `openSync(path, O_RDONLY \| O_NOFOLLOW)` refuses a planted symlink at a store's name | Identical | **`constants.O_NOFOLLOW` is undefined on Windows** — Node defines it only `#ifdef O_NOFOLLOW` (`src/node_constants.cc:1167`, read 2026-09-06) and the MSVC CRT has no such flag. The shipping line is `constants.O_RDONLY \| (constants.O_NOFOLLOW ?? 0)`, verified at integration, so the guard **silently degrades to a following open**. Junctions and symlinks both exist on NTFS. **WORSE, and silently** | 1 d: `lstat`-then-open-by-handle, or fail closed when the constant is absent. **The `?? 0` must not stay as-is** |
| 7 | **The danger-flag seal** | `settings/store.ts:322-345`, `config/confirm-smoke.ts` | `safeStorage` → Keychain; its own docstring says another process as the same user cannot read it without a keychain prompt | `safeStorage` → `gnome-libsecret`/`kwallet*` **when a secret store exists**. Where none does, Electron falls back to `basic_text`, *"encrypted via hardcoded plaintext password"* (Electron `docs/api/safe-storage.md`, read 2026-09-06), and `isEncryptionAvailable()` still returns true. **The seal's threat model is an agent writing the user's home directory and Tortie runs many. WORSE**, and it is the Phase 23 refusal-8 gate | DPAPI. Electron's docs: *"protected from other users on the same machine, but not from other apps running in the same userspace"*. Same threat model, same failure. **WORSE** | 0 d to port, 3–5 d to build a replacement guarantee, or refuse the danger-defaults feature on both and say so in the UI |
| 8 | **The application menu bar** | `menu.ts` (1,205 lines) | Global AppKit menu bar | Electron's docs: *"Under Windows and Linux, menus are visually similar to Chromium"* and `setApplicationMenu` *"will be set as each window's top menu"* — an **in-window** bar drawn by Views. It is still not DOM-drawn, so the UI refusal survives | Same in-window bar | 5–8 d: the titlebar carries the project tab spine and reserves 76 px on the left; a second in-window bar is a layout redesign, not a branch |
| 9 | **The four inert menu roles** (`services`, `hide`, `hideOthers`, `unhide`) | `menu.ts` | AppKit implements them | Electron's `lib/browser/api/menu-item-roles.ts` (read 2026-09-06) gives these roles **no `appMethod`, `windowMethod` or `webContentsMethod`**, while `canExecuteRole` returns true off-mac. They render as **dead rows** | Same | 0.5 d to delete them per platform — cheap, but they must go or a person clicks nothing |
| 10 | **`role: 'about'` + build commit** | `menu.ts:1156` | `setAboutPanelOptions({version: BUILD_COMMIT})` — Phase 17's *"is what I am running what is in git?"* | `about` gets `appMethod: app.showAboutPanel()`, but **`version` is macOS-only** (`docs/api/app.md`, read 2026-09-06); Linux takes `authors`/`website` and *"values must be set in order to be shown; there are no defaults"* | Same; `credits` and `iconPath` only | 1 d to move `BUILD_COMMIT` into `applicationVersion` or the copyright block |
| 11 | **`togglefullscreen`** | `menu.ts` ×2 | `Control+Command+F`; Phase 60/62.1 measured the row | Electron substitutes `F11`; the Phase 60 pixel work is macOS-only | `F11` | 0 d mechanically, 0.5 d to re-check the row |
| 12 | **Native context menus** | `menu-popup.ts` | `Menu.popup` = AppKit NSMenu; the UI rule's *"never DOM-drawn"* | `Menu.popup` = a Views-drawn OS menu. **The refusal survives intact.** `sourceType` is Windows/Linux-only and should be passed | Same | 1 d. `hintToAccelerator` already parses `⌘⇧⌥⌃` glyphs and those glyphs must not be shown off-mac |
| 13 | **Menu row icons** | `native-menu-icon.ts`, `menu-icons.generated.ts` | 32×32 PNG at `scaleFactor: 2`, tinted as template images | Views menus render the bitmap with no automatic light/dark tinting; needs two sets or a runtime tint | Same | 1–2 d plus a second generated icon set |
| 14 | **Menu-bar status item** | `tray/` (286 lines), `resources/menu-bar/TortieTemplate.png` | `Tray` + `setTemplateImage(true)`; macOS inverts the art | SNI where the desktop has one, else `GtkStatusIcon`. **GNOME ships no tray host by default** — a stock GNOME user gets nothing. Template images are meaningless. **WORSE** | Works. Needs an `.ico`, and the `guid` is stable only if the exe is code-signed | 2 d for art and a branch. The Linux surface should be **honestly refused** rather than shipped half-working |
| 15 | **Keyboard: 49 `Cmd` chords, 48 `metaKey` reads** | `shared/keymap.ts` and 20 renderer files | ⌘ for app verbs, ⌃ for terminal control characters — **two physically distinct keys** | One `Ctrl`. Naive `Cmd→Ctrl` puts app verbs on top of readline: `Cmd+C`↔SIGINT, `Cmd+S`↔**XOFF (freezes the pane)**, `Cmd+Q`↔XON, plus `A/K/E/W/F/T/J/O/B/P`. The conventional escape, `Ctrl+Shift+C` for copy, is **already taken**: it is `view.context` in the keymap today, alongside `Ctrl+Shift+G/A/P` | Identical problem, identical collision | **8–12 d.** A keymap redesign with its own research, not a mapping table. `renderer/terminal/keys/index.ts`'s whole measured premise, *"⌘C keeps working as interrupt"*, has no analogue |
| 16 | **File watching: the 8-path kernel exclusion** | `watcher/ignored-roots.ts` (`EXCLUSION_PATH_BUDGET = 8`, verified at integration), `conformance:watcher` | `FSEventStreamSetExclusionPaths`, kernel-side, hard cap 8, returns false and applies **zero** above it | **The cap does not exist and neither does the kernel exclusion.** Read from `@parcel/watcher` 2.6.0 in the tree: `linux/InotifyBackend.cc` adds one `inotify_add_watch` per directory and `unix/fts.cc:40` skips ignored paths during the tree walk, so an exclusion still buys watch descriptors — but every filter is `Watcher::isIgnored` in userspace. The new limit is `fs.inotify.max_user_watches` (**UNMEASURED**), and the failure is `inotify_add_watch` returning `-1`, which the backend throws on | `windows/WindowsBackend.cc:138` — **one recursive `ReadDirectoryChangesW` handle per subscription**, 1 MB buffer (64 KB on network drives), no kernel exclusion at all. Every `.git` object write crosses to userspace. **WORSE** | 3–5 d. `conformance:watcher` becomes three gates: keep the 8-path assertion for darwin, add a watch-descriptor budget for Linux, add an `ERROR_NOTIFY_ENUM_DIR` overflow assertion for Windows. **The exclusion planner itself needs no change** — both non-mac backends consult `ignorePaths` and `ignoreGlobs` through the same `isIgnored` |
| 17 | **Window chrome** | `main/index.ts:363`, `renderer/styles/app.css:32` | `titleBarStyle: 'hiddenInset'`; `padding-left: 76px` for the traffic lights; `-webkit-app-region: drag` on the tab band | Controls are on the **right**. The 76 px left inset becomes dead space and the tab spine runs under the close button. Needs `titleBarStyle: 'hidden'` + `titleBarOverlay`, or a frame | Same, and `titleBarOverlay` gives system-drawn controls whose colour must be set from the theme tokens and re-set on every scheme and hue change | 4–6 d, and it is a **design decision**: the Phase 207/210/213/214 frame work all lands on this band |
| 18 | **Pre-paint window fill** | `settings/chrome.ts` | `backgroundColor` + `SCHEME_ARG` preload switch | Fully portable — no macOS API | Portable | **0 d.** Genuinely free |
| 19 | **`app.setName` and userData** | `proc/identity.ts:62`, `migrate/userdata.ts` | `~/Library/Application Support/Tortie`, inner `gmux/` | `$XDG_CONFIG_HOME` or `~/.config/Tortie` (`docs/api/app.md`, read 2026-09-06). Inner `gmux/` and the socket are untouched. `migrate/userdata.ts` is already structurally portable — it composes from an injected `appDataDir` at `:346,363,372` and only the prose at `migrate/index.ts:4` and `notice.ts:268` names Library | `%APPDATA%\Tortie` — that is **Roaming**. The manifest is SQLite in WAL mode and Electron's own doc warns *"some environments may backup this directory to cloud storage"*. On a domain-joined or OneDrive-synced profile a WAL database in Roaming is a corruption hazard. **WORSE** | Linux 0 d. Windows 2 d: point the manifest at `%LOCALAPPDATA%` through `sessionData` and say so |
| 20 | **`process.title = 'Tortie'`** | `identity.ts:66` | Rewrites argv space; `pgrep -fl Tortie` finds it | Same | `process.title` sets the **console window title**; there is no argv rewrite and no `pgrep`. Phase 13.8's *"an app you cannot find is an app you cannot judge"* has no Windows answer short of a signed exe name | 0 d; the guarantee is just smaller |
| 21 | **Login-shell PATH capture** | `tmux/resolve.ts:264,458` | `$SHELL -lic 'printf …$PATH…'`, 10 s budget, `detached: true` + `kill(-pid)` | Portable; the leaf list needs Linux entries (§A.1.7) | **No analogue.** No login shell, no per-shell PATH; Windows PATH is the process environment Electron already inherits. The whole capture is deleted | Linux 1 d; Windows 1 d to delete and prove the deletion |
| 22 | **Bare-name binary resolution** | `resolve.ts` `resolveBinaryAgainst` / `isExecutableFile` | `accessSync(path, X_OK)` over `PATH` plus extra dirs | Verbatim | **Returns null for every agent.** Three independent breaks: it joins `dir + 'claude'` and never tries PATHEXT (`.exe`, `.cmd`, `.ps1`); Node's own fs docs say `X_OK` *"has no effect on Windows (will behave like `fs.constants.F_OK`)"*; and `expanded.includes('/')` is the absolute-path test while a Windows absolute path is `C:\…` with no forward slash. **The agent-detection layer is dead on Windows** | Linux 0 d; Windows 2–3 d, plus the follow-on that npm-installed agents are `.cmd` shims Node refuses to spawn without `shell: true` since the 2024 batch-file fix |
| 23 | **`ps` / `pgrep` — the Tier-2 status oracle** | `activity/process.ts`, `proc/ps.ts`, `sessions/resume-in-place.ts`, `scrollback/service.ts` (7 `/bin/ps` + 3 `/usr/bin/pgrep` sites) | `ps -axo pid=,ppid=,time=,stat=`; TIME at 10 ms; `s`-without-`+` in STAT is the setsid'd-tool-child signal | `ps` exists but procps-ng `time` is whole seconds (§A.1.8), so the CPU tier degrades. **The real Linux answer is better than `ps`: `/proc/<pid>/stat` fields 14/15 — 10 ms at `USER_HZ`=100, and it spawns nothing.** `s`/`+` both exist in procps STAT | **No `/proc`, no `ps`, no `pgrep`, no process groups.** Needs `GetProcessTimes` through native code, or PowerShell polling. There is no STAT column and no session-leader concept, so **the setsid'd-tool-child oracle — the only signal that survives a blocked tool call — has no Windows analogue at all.** WORSE | Linux **4–6 d**, and it is an improvement (zero spawns). Windows **8–12 d** and it still cannot answer the blocked-tool-call case |
| 24 | **Process-group kill** | `proc/guarded.ts` (`process.kill(-pid)`, `detached: true` ×5) | SIGTERM then SIGKILL the pgid; reaches the shell fork | Identical | `process.kill(-pid)` is meaningless; `detached: true` makes a new **console** group, not a process group; only a SIGKILL-equivalent exists. The answer is a **Job Object** (native code) or `taskkill /T /F` | Linux 0 d; Windows 3–4 d |
| 25 | **`/usr/bin/open` — Open With** | `fs/open-with.ts`, `shell/shim.ts:106` | `osascript -l JavaScript` calling `NSWorkspace.URLsForApplicationsToOpenURL`, measured at 45.6–323.1 ms | No registry of "apps that can open this type" beyond `xdg-mime query default` plus `.desktop` scanning — one default, not a list. **The Open With submenu becomes one entry or nothing. WORSE** | `AssocQueryString` / `SHAssocEnumHandlers` gives a real list but needs native code or a PowerShell shell-out | Linux 2 d for a degraded submenu; Windows 4–5 d, or refuse the feature on both |
| 26 | **The `tortie` shell shim** | `shell/shim.ts` | `/bin/sh` script exec'ing `/usr/bin/open -n -b com.itavero.tortie --args <abs>`; the single-instance lock catches it | Portable shape, different body: exec the AppImage or `/usr/bin/tortie`. `SHIM_CANDIDATE_DIRS` drops `/opt/homebrew/bin` | A `.cmd` or a `Start-Process`; `%LOCALAPPDATA%\Microsoft\WindowsApps` is the conventional target | 1–2 d each |
| 27 | **Finder `open-file` event** | `main/index.ts:281` | `will-finish-launching` → `open-file`, one event per selected file | **The event does not fire.** Paths arrive in `argv` / `second-instance`, which `noteShellOpenArgs` already handles — but that path *"accepts folders only"* today | Same | 1–2 d to widen the argv path to files |
| 28 | **Document types (Open With registration)** | `electron-builder.yml` `mac.extendInfo.CFBundleDocumentTypes`, `shared/openable.ts`, `build/assert-document-types.mjs` | Info.plist, role Viewer, rank Alternate, never seizes a default. The `public.folder` UTI is why `extendInfo` is used rather than `fileAssociations` | `.desktop` `MimeType=` — MIME types, not extensions, so the whole extension list is re-expressed; **`inode/directory` is expressible**, so folders survive | `fileAssociations` writes registry `ProgId`s. Windows has **no "rank Alternate"**: a registered handler either appears in Open With or claims the type, so the *never seizes anyone's default* promise needs re-proving | 3 d plus a rewritten `assert-document-types` per platform |
| 29 | **Time Machine off-device check** | `diagnostics/off-device.ts` | `plutil -extract` on `com.apple.TimeMachine.plist`, 9 ms, mounts nothing | **Already handled.** `platform !== 'darwin'` → `unknown`, with the platform in the evidence and an honest sentence | Same | **0 d.** The only domain in the tree that already ported itself, and it is the template |
| 30 | **Power / footprint / disk diagnostics** | `diagnostics/power.ts` (`top -l 2 -s 0 -stats pid,cpu,power,mem`), `footprint.ts`, `disk.ts` | BSD `top` with a POWER column; `/usr/bin/footprint` for `phys_footprint` | `top -b -n2` has different flags and **no POWER column**; footprint has no analogue (closest is `/proc/<pid>/smaps_rollup` PSS); `du` exists | None of the three. `Get-Counter`, or nothing | 2–3 d Linux, 4 d Windows, or **refuse the panel** off-mac — it already knows how to say "unavailable" |
| 31 | **Tailscale discovery** | `machines/tailscale.ts:57` | `/Applications/Tailscale.app/…`, then two Homebrew paths | `/usr/bin/tailscale` | `C:\Program Files\Tailscale\tailscale.exe` | 0.5 d each — a three-line list |
| 32 | **ssh / ssh-keygen / ssh-keyscan** | `machines/carriage.ts:48`, `key-material.ts:88`, `build/ssh-run.mjs`, `gate:knownhosts` | `/usr/bin/ssh` pinned absolute | `/usr/bin/ssh` (openssh-client — usually present, not guaranteed) | `C:\Windows\System32\OpenSSH\ssh.exe`, present since Win10 1809 as an on-by-default optional feature. The pinned-path rule and the `-o UserKnownHostsFile=` ordering all still hold | 1–2 d each; the gate's shape survives |
| 33 | **`git`** | `git/exec.ts:95` | `spawn('git')` bare against PATH; the error text says *"Install the Xcode Command Line Tools"* | Bare `git` fine; the error sentence is wrong and must be per-platform | libuv resolves `git.exe` off PATH, but **git is not installed by default on Windows**, so the error sentence becomes the whole onboarding story | 1 d of copy; the mechanism is fine |
| 34 | **The bundled tmux** | `build/build-tmux.mjs`, `resolve.ts`, `electron-builder.yml` | Three pinned tarballs against Apple's `/usr/lib/libncurses`; a packaged app resolves **only** `Resources/bin/tmux` and refuses `GMUX_TMUX_BIN` | §A.1.3 | **tmux does not exist** | Linux 3–5 d for the recipe; `join(resourcesPath,'bin','tmux')` needs no change |
| 35 | **Nested-binary signing** | `build/sign-nested-binaries.cjs` (3 rows), `entitlements.*.plist`, `verify-signed.mjs`, `specstory/__tests__/entitlement-contract.test.ts` | Inside-out `codesign` with stable reverse-DNS ids; three entitlements; specstory gets `allow-unsigned-executable-memory` for wazero; `disable-library-validation` is a hard refusal | **Nothing to sign.** ELF has no code signature, no hardened runtime, no entitlements, no library validation. The entitlement contract test becomes darwin-only and Phase 23 refusal 6 has nothing to bind | Authenticode over the exe and every nested exe/dll — and node-pty's Windows prebuild adds `winpty.dll`, `winpty-agent.exe`, `conpty.node` and `conpty_console_list.node` to the list (measured in `node_modules/node-pty/prebuilds/win32-x64/`). But see §D.4.2: electron-builder signs them itself | Linux **−3 d** (work removed). Windows 4–6 d plus a certificate |
| 36 | **The Squirrel.Mac recovery domain** | `updates/recovery.ts`, `shipit-state.ts`, `refusal-check.ts`, `rehearsal.ts` — 47 `ShipIt` sites in 3 files, **and zero `process.platform` guards in the whole directory** | Reads `~/Library/Caches/<bundle id>.ShipIt/ShipItState.plist`, deletes staging dirs, `defaults delete` the domain, `pgrep ShipIt` | **No ShipIt.** §E has the whole answer | `NsisUpdater`. No ShipIt, no `defaults`, no `.plist` | **The Phase 43 repair verb has no counterpart on either platform and would ship as dead code.** 3–4 d to gate the directory to darwin |
| 37 | **Verification apparatus** | 13 build scripts using `osascript` + System Events | Real OS keystrokes into the running app | No equivalent. `xdotool` on X11; **on Wayland there is no portable synthetic-input path at all** without compositor cooperation, and `ydotool` needs `/dev/uinput` write access. **The strongest verification method the project has does not port. WORSE** | `SendInput` via PowerShell or AutoHotkey — possible, and a new dependency | Rewrite 13 probes onto CDP `Input.dispatchKeyEvent` (7 already use it) — **5–8 d**, and it is a genuine loss of fidelity: CDP events never test the OS menu accelerator path |
| 38 | **`-ApplePersistenceIgnoreState YES`** | 23 npm scripts, 6 build scripts | An NSUserDefaults switch that stops window-state restore polluting harness runs | Harmless no-op; the problem it solves does not exist. **UNMEASURED** on a Linux Electron | Same | 0 d |
| 39 | **Fonts** | `renderer/styles/tokens.css:152,161,182,189`; `build/assert-tab-floor.mjs` | `-apple-system, BlinkMacSystemFont, 'Helvetica Neue'` and `ui-monospace, Menlo` | Neither resolves. Falls to `sans-serif`/`monospace`, whatever fontconfig picks, which varies per distro. **Every metric the design was measured against changes**, including the 50.00 px tab chrome and 23 px name floor the Phase 189 gate pins | `-apple-system` no; `ui-monospace` no | 3–5 d: bundle a UI face (the OFL infrastructure from Phase 78 already exists for the two mono families) and **re-measure `assert-tab-floor` per platform** |
| 40 | **POSIX path assumptions** | 22 shipping files, 31 sites | `startsWith('/')` as "is absolute" | Correct verbatim | Wrong at all 31. `path.isAbsolute` is the fix and is already imported in 5 of them. The 41 remote-side sites stay correct because the far end is always POSIX | 2–3 d, mechanical, plus a lint rule to keep it |
| 41 | **Managed Claude settings path** | `context/agent-context.ts:180` | `/Library/Application Support/ClaudeCode/managed-settings.json` | A different system directory. **UNMEASURED** — the Linux and Windows paths were not confirmed on the day | Same | 1 d plus a `conformance:context` matrix row per platform |
| 42 | **`brew` / `curl \| sh` install rows** | `agents/registry.ts` | Homebrew, `curl \| sh` and npm | `brew` exists at `/home/linuxbrew` but the paths in `extraBinDirsFor` do not; `curl \| sh` rows work | **Neither `brew` nor `curl \| sh` works.** Only the npm rows survive, and those install `.cmd` shims (see #22). `conformance:installs` asserts six shape rules that would need a Windows arm | 2–3 d to make the install map platform-aware; **an agent that cannot run is a row that must not be offered** |

### B.2 What is genuinely free

Five things, worth naming because they are the evidence the domain boundaries held.

1. **The credential file vault** (#1, #3, #4). The non-darwin branch is shipping production code today,
   exercised by `conformance:credentials` on every commit, and Anthropic's published Linux and Windows
   storage locations are byte-for-byte what `stores.ts` already composes.
2. **`off-device.ts`** (#29) — the only module in the tree that already answers `unknown` off-mac, with
   the platform in its evidence list.
3. **The pre-paint window fill and the whole hue/ramp/scheme stack** (#18). `chrome-hue.ts`,
   `frame-stops.ts` and `presets.ts` name no platform API; the eleven-minute `conformance:hue` walk is
   arithmetic and ports unchanged.
4. **`resources/gmux-tmux.conf`** — all twelve settings are generic tmux (§A.1.2).
5. **The native-module prebuild matrix**, which was expected to be the blocker and is not (§A.1.6):
   better-sqlite3, `@parcel/watcher` and `@vscode/ripgrep` all ship every target; only node-pty is
   short a Linux prebuild, and `npmRebuild: true` already compiles against Electron headers on the
   build machine, so the practical cost is a C++ toolchain on the Linux runner.

**And the vendored CLIs both ship for both targets** (GitHub release API, 2026-09-06): SpecStory
`v2.10.0` publishes `Linux_arm64`, `Linux_x86_64`, `Windows_arm64` and `Windows_x86_64`; codex
`rust-v0.153.4` publishes `*-unknown-linux-musl` and `*-pc-windows-msvc.exe` for both arches. Claude
Code's own docs support Windows 10 1809+, Ubuntu 20.04+ and Debian 10+.

### B.3 Where the port makes a surface permanently worse

Eight, ranked by what it costs the person rather than the builder.

1. **The Tier-2 status oracle on Windows** (#23). The setsid'd-tool-child signal is *"the ONLY signal
   that survives a blocked tool call"* by the module's own note. Windows has no session-leader concept
   and no STAT column, so a Windows Tortie cannot tell "waiting on a blocked tool call" from "idle" —
   the exact question the Zen says the interface must answer at a glance. **No amount of engineering
   fixes this; it is a missing kernel concept.**
2. **The danger-flag seal on both** (#7). On Linux without a secret store it is a hardcoded password;
   on Windows DPAPI is explicitly not protected from other apps in the same userspace. Phase 23
   refusal 8 rests on this seal.
3. **`O_NOFOLLOW` on Windows** (#6), and it degrades *silently* because the shipping code already
   writes `?? 0`. Small, cheap, and it must not be left alone.
4. **The status item on GNOME** (#14). Stock GNOME has no tray host, so the "what needs me now"
   surface that lives outside the window disappears.
5. **Real-keystroke verification** (#37). Thirteen probes lose the only method that tests the OS
   accelerator path. Verification quality is the operating contract, and this is a measurable
   reduction in it.
6. **The Open With submenu on Linux** (#25). One default handler, not a list.
7. **`.git` exclusion on Windows** (#16). Every git object write crosses the kernel boundary and is
   filtered in JavaScript. The macOS build's kernel exclusion measured 178,208 events → 1 and
   9.06 s → 0.03 s of CPU. That win is not available.
8. **The Phase 43 update-repair verb** (#36). Not worse so much as **absent** — the domain has no
   platform guard at all today and would ship 47 `ShipIt` references into builds where the file it
   repairs does not exist.

### B.4 The two things the recommendation must weigh

**One.** The `src/` binding is 144 sites across 29 of 1,184 files, which is small. But **49 of 70
keymap chords and 48 `metaKey` reads are one indivisible surface**, and the conventional Linux and
Windows escape for the ⌘/⌃ collision, `Ctrl+Shift+C`, is already spent on `view.context`. **Treat #15
as a research phase of its own, not a line item.**

**Two, and it is the larger one.** `build/` is where the weight is: **36 of 204 scripts** name a
macOS-only tool, 13 of them drive the app through System Events, all four CI workflows run on
`macos-15`/`macos-26`, and the entire release lane — `sign-nested-binaries.cjs`, `verify-signed.mjs`,
`notarize-local.mjs`, `update-rehearsal.mjs`, the entitlement contract test — exists to satisfy Apple.
A second platform does not add a `target:` to `electron-builder.yml`; it **doubles or triples the
verification apparatus**, which the operating contract says is where this project's quality actually
comes from. §F.4 carries that cost.

### B.5 UNMEASURED for §B

- `fs.inotify.max_user_watches` on a real distro, and whether Tortie's watch count over the operator's
  repositories would exceed it (#16).
- Whether the **Windows** Claude Code build takes the same three advisory locks (#5).
- The Linux and Windows locations of `managed-settings.json` (#41).
- That MSVC's `fcntl.h` defines no `O_NOFOLLOW` (#6). The chain is solid — Node defines the constant
  only `#ifdef O_NOFOLLOW`, and the shipping code's own `?? 0` proves the author expected absence —
  but the last link was read from the platform's flag set rather than run on a Windows box.
- Whether `-ApplePersistenceIgnoreState YES` is inert to a Linux Electron (#38).

---

## C. The agents, because they are the product

**Method and date.** Every availability fact in this section was read on **2026-09-06** from a package
registry, a vendor's own installer script, a vendor doc page, or a GitHub releases API response — not
recalled. Code facts are read from the worktree at `bb9a5cb`. No Linux or Windows machine was
available: `docker` is installed at `/usr/local/bin/docker` but its daemon was not running and
starting Docker Desktop was out of scope, so every claim that would need a Linux or Windows kernel to
settle is marked **UNMEASURED** rather than reasoned into a number.

`src/main/agents/registry.ts` holds **14 rows**: 12 launchable CLIs and 2 capture-only IDE watchers
(`cursoride`, `copilotide`, `launchable: false`).

### C.1 The per-agent availability matrix

| # | id | binary | macOS | Linux | Windows | How it installs on Linux / Windows | Store root (macOS → Linux → Windows) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `claude` | `claude` | shipped | **native** | **native** | Linux: `curl -fsSL https://claude.ai/install.sh \| bash`, signed apt/dnf/apk repos, npm. Windows: `irm https://claude.ai/install.ps1 \| iex`, `winget install Anthropic.ClaudeCode`, npm. Docs list Windows 10 1809+ | `~/.claude/projects` → same → `%USERPROFILE%\.claude\projects` (measured) |
| 2 | `cursor` | `cursor-agent` | shipped | **native** | **native** | Linux: `curl https://cursor.com/install -fsS \| bash`. Windows: `irm 'https://cursor.com/install?win32=true' \| iex` → `windows/<arch>/agent-cli-package.zip` → `cursor-agent.exe` under `%LocalAppData%\cursor-agent`. The script was fetched (3,142 bytes, build `2026.09.02-c22c1a3`) and read | `~/.cursor/chats` → same → UNMEASURED |
| 3 | `codex` | `codex` | shipped | **native** | **contradictory** | Linux: `curl -fsSL https://chatgpt.com/codex/install.sh \| sh`; musl tarballs. Windows: npm publishes `@openai/codex-win32-x64` and `-win32-arm64` and the README carries a PowerShell installer, but the repo's own `docs/install.md` still says *"Windows 11 via WSL2"*. **The contradiction is reported, not resolved by guessing** | `${CODEX_HOME:-~/.codex}/sessions` → same → UNMEASURED |
| 4 | `gemini` | `gemini` | shipped | **native** | **native** | `npm install -g @google/gemini-cli` everywhere; brew on mac and Linux. Depends on `@lydell/node-pty-win32-x64` and `-win32-arm64`. Requirements page names macOS 15+, Windows 11 24H2+, Ubuntu 20.04+ | `~/.gemini/tmp` → same → UNMEASURED |
| 5 | `droid` | `droid` | shipped (docs-only row) | **native** | **native** | npm optional deps `@factory/cli-linux-x64\|arm64\|-baseline` and `@factory/cli-win32-x64\|arm64\|-baseline`; `irm https://app.factory.ai/cli/windows \| iex` | `~/.factory/sessions` → same → UNMEASURED |
| 6 | `deepseek` (CodeWhale) | `codewhale`, `codew`, `deepseek` | shipped | **native** | **binary yes, route no** | Linux: `install.sh` handles `Linux`, assets `codewhale-linux-{x64,arm64}` (arm64 static musl since 0.9.6). Windows: the release carries `codew-windows-x64.exe` and `codew-windows-arm64.exe` and `scripts/install.js` writes `codewhale.exe`/`codew.exe` under `process.platform === "win32"`, but `install.sh` **refuses** with `unsupported OS` and the npm package declares no platform optional deps | `~/.codewhale/sessions` (legacy `~/.deepseek/sessions`) → same → UNMEASURED |
| 7 | `antigravity` | `agy` | shipped | **native** | **native** | Official docs: *"Antigravity CLI runs natively on macOS, Linux, and Windows."* Linux `~/.local/bin/agy`; Windows `%LocalAppData%\agy\bin`. `https://antigravity.google/cli/install.ps1` exists (7,165 bytes) | `~/.gemini/antigravity-cli/brain` → same → UNMEASURED |
| 8 | `muse` | `muse` | shipped | **native** | **NO** | The first-party launcher (`api.meta.ai/muse-launcher.sh`) accepts exactly four triples — `aarch64_macos`, `x86_macos`, `aarch64_linux`, `x86_linux` — and everything else hits `die "unsupported platform"`. There is no `@meta-ai/muse-code` on npm (404, checked). WSL2 only | `${XDG_DATA_HOME:-~/.local/share}/muse/sessions` → **already XDG-correct** → n/a |
| 9 | `qwen` | `qwen` | shipped | **native** | **native** | Linux and mac: `install-qwen-standalone.sh`, npm, brew. Windows: `irm .../install-qwen-standalone.ps1 \| iex`; npm carries `@lydell/node-pty-win32-{x64,arm64}` and `@teddyzhu/clipboard-win32-*-msvc` | `~/.qwen/projects` → same → UNMEASURED |
| 10 | `pi` | `pi` | shipped | **native** | **native** | Pure Node ≥ 22.19.0 npm package everywhere; first-party `https://pi.dev/install.ps1` (62,919 bytes), which even offers to install Git for Windows. Optional `@mariozechner/clipboard` has `win32-x64-msvc` and `win32-arm64-msvc` | `~/.pi/agent/sessions` → same → UNMEASURED |
| 11 | `omp` | `omp` | shipped | **native** | **binary yes, route no** | v18.1.12 release assets carry `omp-linux-{x64,arm64}`, `omp-linux-musl-{x64,arm64}`, **`omp-windows-x64.exe` and `omp-windows-arm64.exe`** (published 2026-09-06 at 14:25 UTC). But the registry's canonical command is `brew install can1357/tap/omp` and the tap's formula has `on_macos` and `on_linux` blocks only. **No Windows install route is documented anywhere** | `~/.omp/agent/sessions` → same → UNMEASURED |
| 12 | `grok` | `grok` | shipped | **native** | **native** | `install.sh` maps `Darwin→macos`, `Linux→linux`, `MINGW*\|MSYS*\|CYGWIN*→windows`; `install.ps1` is Windows-only and installs `grok.exe` and `agent.exe` into `%USERPROFILE%\.grok\bin` | `~/.grok/sessions` → same → **`%USERPROFILE%\.grok\sessions`** (measured from the installer) |
| 13 | `cursoride` | — (watcher) | shipped | **path-bound** | **path-bound** | Cursor IDE runs on all three; **the registry's `storeDirs` is a literal `~/Library/Application Support/…` string** | `…/Cursor/User/globalStorage/state.vscdb` → `~/.config/Cursor/…` → `%APPDATA%\Cursor\…`, both **DERIVED** from Electron's documented `appData` paths, not observed |
| 14 | `copilotide` | — (watcher) | shipped | **path-bound** | **path-bound** | Same, four app variants, four literal macOS paths | `…/Code/User/workspaceStorage` → `~/.config/Code/…` → `%APPDATA%\Code\…`, **DERIVED** |

**Linux: all twelve launchable agents run natively.** Nothing in the agent layer is a reason to refuse
Linux; it is the cheapest part of that port.

**Windows: eleven of twelve publish a binary, nine have a documented install route, one cannot run.**
Resolved from a disagreement between two probes (§0.5): a published `.exe` is not an install route.
`deepseek` and `omp` are the two whose vendor ships a Windows binary and documents no way to get it.
`muse` is refused by a `die` in Meta's own launcher, and its refusal is first-party rather than
inferred. **So agent availability is not what refuses Windows.**

**Two things a recall would have got wrong, and this is why the standing lesson says check.** `omp`'s
Homebrew tap has no Windows arm, yet the release ships two Windows binaries, published on the day this
was read. And the codex contradiction above is live: npm's win32 packages exist while the repo's own
requirements table still says WSL2.

**Two rows that must not be offered as they stand.** Both IDE watchers hard-code macOS
`Application Support` paths in `storeDirs`. On Linux and Windows they detect nothing and would draw as
"not installed" for a person who has Cursor or VS Code open in front of them. Fix them or hide them.

### C.2 The harvest descriptors, per key

`src/main/manifest/harvest/stores.ts` at `bb9a5cb` carries **seven** descriptors — `codex`, `qwen`,
`muse`, `deepseek`, `pi` (`rescueOnly`), `omp`, `antigravity` — over four live keys. (Phase 215 is
editing this file in another worktree; this reads it as it stands at `bb9a5cb` and says nothing about
what 215 lands.)

**`cwd-newest` — codex, deepseek, pi (rescue), omp.**

*Linux: ports, after one measurement per agent.* The key is a string compared to the pane's cwd and
that is platform-free. The *encoding* of the store directory is not. `sanitizeOmpCwd(cwd, home,
tmpdir)` buckets under `realpath(os.tmpdir())`, and its whole reason for existing is the macOS
`/tmp` → `/private/tmp` divergence, which **does not exist on Linux**, so the tmp bucket's shape
changes and the abs-wrap fallback fires on different inputs. The file's own comment records that
getting this wrong made the watch run 90 s against a directory omp never wrote to. `sanitizeQwenCwd`
(every non-alnum → `-`) and `sanitizePiCwd` are pure string functions and behave identically.
`DATE_SHARD_WINDOW_MS` walks nine months of day directories for codex, and on Linux the watcher
underneath is inotify with a per-user watch limit rather than FSEvents, which is §B #16 landing on
this descriptor.

*Windows: every encoding breaks and the key survives.* `sanitizePiCwd` does `.replace(/^\//,'')` then
`.replace(/[/\\:]/g,'-')`; on `C:\Users\x\proj` the leading-slash strip never fires, so it composes
`--C-Users-x-proj--`. **Whether that is what pi writes on Windows is UNMEASURED**, and the function
cannot be corrected without reading pi's own Windows path code. `sanitizeOmpCwd` uses `relative()` and
`isAbsolute()`; a cwd on a different drive letter from `HOME` makes `relative()` return an absolute
path, which the guard reads as "not under home" and drops into the legacy wrap — plausibly correct,
entirely unverified. And **`samePath()` is the load-bearing failure**: it is `a === b` then
`realpath(a) === realpath(b)`, which on Windows is case-sensitive against a case-insensitive
filesystem and reconciles neither `\` against `/` nor 8.3 short names. Every `confirm()` in this
family routes through it, so a wrong answer is not a missed capture, it is a **`'mismatch'`** — the
descriptor actively rejects the right record.

**`pid` — qwen.** *Linux: probably fine, UNMEASURED.* `process-table.ts` runs
`ps -Axo pid=,ppid=,comm=`. procps-ng's man page, read on the day, says `-A` selects all processes,
*"Options of different types may be freely mixed"*, `comm` is *"command name (only the executable
name)"*, and the historic 15-character truncation *"is no longer present"* in either procps or the
kernel. So `basename(row.comm)` and the bounded ppid walk should both work unchanged. **It was not
run.** *Windows: a new implementation, not a branch.* There is no `ps`.
`Get-CimInstance Win32_Process` yields `ProcessId`/`ParentProcessId` at a PowerShell spawn per poll
against a descriptor that polls every **500 ms**. Worse, Windows recycles pids aggressively and does
not invalidate `ParentProcessId` when the parent exits, so `isDescendantIn`'s ppid walk can climb into
a stranger's tree; correctness needs a creation-time comparison the `ProcessRow` type has no field
for. The `setProcessTableReader` seam Phase 171 added is the right shape for a second implementation
and is the only thing here that is already portable.

**`tmux-pane` — muse.** *Linux: ports unchanged, and it is the only key that does.* muse stamps
`payload.record.tmux_pane` (`"$371:@371.%372"`) into its own transcript at session open; `confirm()`
reads only that field and prefixes on `ctx.tmuxSessionId`. tmux is the same program, the pane-id
grammar is the same, and the fact that `tmux_socket_path` changes from `/private/tmp/tmux-501/gmux`
to `/tmp/tmux-<uid>/gmux` costs nothing because the confirm never reads it. **This is the strongest
key in the registry and it is free on Linux.** *Windows: gone twice over* — there is no tmux, so there
is no pane id for muse to stamp, and muse does not run on Windows at all. This one descriptor is the
cleanest proof that Linux and Windows are two different questions.

**`fd-owner` — antigravity.** *Linux: the concept improves and the implementation regresses.*
`/proc/<pid>/fd` is a readlink walk with no subprocess at all, strictly better than the current
`lsof -a -p <pids> -Fn` spawn plus its 1 s cache. But as written `lsofOwnership` treats `ENOENT` as
`ok: false` → `'unknown'` → the grace timer, and **lsof is not installed by default on Debian minimal
images or on Alpine**, so on a stock container-shaped Linux the antigravity key silently stops being
exact and nothing says so. The fix is `/proc`, not an `else` arm. *Windows: permanently degraded, and
it collides with a Phase 23 refusal.* There is no supported user-space way to enumerate another
process's open handles. Sysinternals `handle.exe` is not redistributable inside a signed bundle on
terms Tortie holds; `NtQuerySystemInformation(SystemHandleInformation)` is undocumented native code;
the Restart Manager API answers the inverse question and still needs native code. **Refusal 6 — no
third-party native code inside the signed bundle — is what stops the cheap route, and it should stop
it.** So on Windows the descriptor falls back to `graceMs: 5_000` forever, which the file's own
comments call *provisional*. antigravity runs natively on Windows and its capture would be the weakest
in the product there.

The two unused keys are not platform questions: `sqlite-index` is declared and used by no descriptor,
and `time-only` exists only so persisted provenance rows written by older builds still parse.

### C.3 Resume argv, the absolute-path rule, and bare-name launch

**The manifest rule.** `buildLaunchSpec`'s doc comment states it: the manifest stores absolute paths in
argv **and** resume_argv so restores survive PATH drift. SQLite stores text, so a Windows path with a
drive letter, backslashes and a `.exe` suffix persists fine. What breaks is the consumers.

**The one findable defect, and it is one line.** `bareNameFor` at
`src/main/sessions/launch-plan.ts:237`, read verbatim at integration:

```ts
export function bareNameFor(bare: string, abs: string, onLoginPath: string | null): string | undefined {
  if (bare.includes('/')) return undefined;
  return onLoginPath === abs ? bare : undefined;
}
```

The `includes('/')` guard exists so a Phase 23 overlay row written `~/x` or `/x` is never handed to
tmux as `argv[0]` — tmux expands no tilde, so that is a live fix rather than insurance. **A Windows
path contains no `/` at all**, so `C:\Users\x\.local\bin\claude.exe` passes the "is this really a bare
name" test. The second test would normally catch it, but `onLoginPath === abs` is also case-sensitive
and separator-naive on Windows. This is exactly the class of thing the charter means by "what breaks
when binaries live at Windows paths".

**The bare-name rule's justification does not exist on Windows.** Phase 12.7 F3 exists for one
measured reason, stated in the file: an absolute `argv[0]` made every durable gmux agent the one
process on the machine that `pkill -f "$(command -v claude)"` matched, while every ephemeral one
walked away. There is no `pkill` on Windows, and the nearest equivalents — `Stop-Process -Name claude`,
`taskkill /IM claude.exe` — match the **image name**, which substituting a bare name does not change.
So on Windows the rule buys **zero** protection while keeping its whole risk, being a pane running a
different file from the one the manifest recorded. The correct Windows behaviour is to always spawn
the recorded absolute path, and `bareNameFor` collapses to `return undefined`.

**The PATH injection that makes bare-name launch work** is §A.1.7. `src/main/tmux/user-path.ts` writes
`process.env['PATH']` on exactly one line. On Linux the mechanism is right and the eight-entry
fallback tail is wrong in one place; on Windows there is no login shell to interrogate, `-lic` means
nothing to PowerShell or cmd, a GUI process already inherits the per-user PATH from the registry, and
**the entire capture is unnecessary** — the leaf list would become `%LOCALAPPDATA%\cursor-agent`,
`%LOCALAPPDATA%\agy\bin`, `%USERPROFILE%\.grok\bin` and `%USERPROFILE%\.local\bin`. The one-writer
invariant, asserted by `user-path.test.ts` against the source, survives on both.

**Three more Unix assumptions on the launch path:** `buildLaunchSpec`'s shell branch is
`process.env['SHELL'] ?? '/bin/zsh'` plus `withLoginShellFlag` adding `-l`, and there is no `SHELL` on
Windows and `-l` means nothing to PowerShell; `resolveLaunchSpec` runs cursor's `create-chat` through
`runGuarded`, which kills the **process group**, a Unix concept needing a Job Object on Windows; and
`agentNotFoundMessage` says *"on your login shell's PATH"* in user-facing copy, which is the wrong
sentence on Windows.

**What does NOT break.** `resumeArgvFor` and `launchArgvFor` compose from registry data — a template
array plus a slot — and are string operations with no path assumption. The five pre-assign rows
(`claude`, `gemini`, `pi`, `grok` by flag; `cursor` by side command) mint the id in Tortie, so their
resume argv is correct on any platform where the binary runs, with no store watching and no process
facts at all. **That is the portable core of the agent layer.** `deepseek`'s
`resumeExtrasPosition: 'leading'` and `bareResumeIsDangerous` are equally platform-free.

### C.4 What a first release could honestly offer, per platform

**First Linux release — all twelve can run, graded by capture, which is what Tortie promises:**

- **Day one, capture as strong as macOS — 6 rows.** `claude`, `gemini`, `pi`, `grok` (pre-assign by
  flag, no store watch, no process facts, no path encoding); `cursor` (pre-assign by side command,
  with the `runGuarded` process-group caveat); `muse` (the `tmux-pane` key ports unchanged).
- **After one measurement each — 4 rows.** `codex`, `deepseek`, `omp` on `cwd-newest`, where the store
  encoding must be read off a real Linux install once; and `qwen` on `pid`, to confirm procps accepts
  `ps -Axo pid=,ppid=,comm=`.
- **After a rewrite — 1 row.** `antigravity`: move `fd-owner` onto `/proc/<pid>/fd` or it degrades to
  the grace timer on any machine without lsof, silently.
- **Unchanged from macOS — 1 row.** `droid` stays docs-only and unverified.
- **Must be fixed or hidden — 2 rows.** Both IDE watchers.

**First Windows release — availability is not what decides it.** Nine of twelve have a documented
install route, but **every one of them would run outside tmux, which does not exist there**, so what a
Windows Tortie could offer is settled by §A.2 and not by this section. Within the agent layer alone
the split is clean: **5 rows work with no new mechanism** (`claude`, `gemini`, `pi`, `grok`, `cursor`
— all pre-assign); **6 rows need a new implementation rather than a branch** (every `cwd-newest` row
needs a measured Windows path encoding *and* a case-insensitive separator-normalising `samePath`;
`qwen`'s `pid` key needs a whole new process table with creation-time disambiguation; `antigravity`'s
`fd-owner` key has no answer that does not collide with refusal 6); and **1 row is gone** (`muse`, and
with it the `tmux-pane` key, the only exact harvest key that costs nothing to move).

**The plain statement.** For Linux the agent layer costs about four measurements and one `/proc`
rewrite and delivers twelve agents. For Windows it delivers five agents with no new mechanism and six
more only by building capture machinery from scratch, into a product that has no session substrate
there. **If Windows is refused, this section is not what is lost; if Linux is refused, twelve working
agents and a free exact-harvest key are what is lost** — which is the strongest single argument in
this document for pricing the two platforms very differently.

**Sources for §C, all read 2026-09-06.** Claude Code setup docs · Cursor CLI installation and
`cursor.com/install?win32=true` · `openai/codex` `docs/install.md` · Gemini CLI installation ·
`QwenLM/qwen-code` README · Factory Droid CLI docs · `Hmbown/CodeWhale` latest release and
`codewhale.net/install.sh` · Antigravity CLI install docs and `install.ps1` · `api.meta.ai/muse-launcher.sh`
· `pi.dev` and `pi.dev/install.ps1` · `can1357/oh-my-pi` latest release and the homebrew tap's
`Formula/omp.rb` · `x.ai/cli/install.sh` and `install.ps1` · `specstoryai/getspecstory` v2.10.0 assets ·
tmux README · `ps(1)` procps-ng · Electron `app.getPath` · npm registry metadata for
`@anthropic-ai/claude-code`, `@openai/codex`, `@google/gemini-cli`, `@qwen-code/qwen-code`,
`codewhale`, `droid`, `@earendil-works/pi-coding-agent`, `@mariozechner/clipboard` and
`@vscode/ripgrep@1.18.0`.

---

## D. Distribution — what packaging and shipping Tortie on Linux and Windows actually costs

**Measured 2026-09-06** on the operator's build machine · macOS 15.7.9 (24G830) arm64 ·
node v22.23.1 · npm 10.9.8 · worktree `/private/tmp/wt-p216` at `bb9a5cb` · Tortie 0.100.0 ·
electron 43.3.0 · electron-builder 26.15.3 · electron-updater 6.8.9 (all four read out of the
installed `node_modules`, not out of `package.json`'s ranges).

**How to read the numbers.** Every figure below carries how it was obtained. Facts about
electron-builder and electron-updater were read out of the **installed** packages in this worktree,
so they describe what Tortie would actually get today rather than what a changelog says. Facts about
Microsoft, Flathub, Snapcraft and GitHub were fetched from those vendors' own pages on 2026-09-06 and
are quoted with the page's own last-updated date where it publishes one. **No Linux machine and no
Windows machine were available to this research.** Everything that would need one to settle is marked
**UNMEASURED** and §D.9 lists them all with the probe that would settle each.

---

### D.0 The decision, in five sentences

1. **Linux: ship deb and AppImage, and nothing else — in that order.** They are the two formats
   electron-builder cuts today with no sandbox to fight, they are the two `electron-updater` can update
   in place, and between them they cover "install it properly" and "download and run". Both are
   UNMEASURED on a real Linux box and both are cheap to try. **deb is named first, and the fix round
   moved it there:** a `.deb` puts real files at `/opt/Tortie` on the real filesystem, which is the
   stable-absolute-path mechanism the live tier rests on, while an AppImage runs from a fresh random
   FUSE mount per launch whose behaviour under a tmux server that outlives the app is unmeasured and
   whose documented design intent is to tear that mount down (§D.3.1). If that probe comes back clean
   the two are equal again.
2. **Linux: refuse Flatpak and Snap, and the reason is the same one for both.** Tortie's whole job is
   to start a durable tmux server and let it spawn the user's own agent binaries out of the user's
   own home directory. That is precisely the shape both sandboxes exist to prevent. Snap can only do
   it under **classic confinement**, which Canonical must "audit and vet" by hand; Flatpak can only do
   it by holding `--talk-name=org.freedesktop.Flatpak` and rewriting every spawn through
   `flatpak-spawn --host`, which is a sandbox escape hatch wearing a sandbox's clothes. Both add a
   store relationship and a review queue to a product with one user.
3. **Linux: rpm is a cheap third if and only if somebody asks for it.** It is the same fpm call as
   deb plus `rpmbuild` on the runner, and `electron-updater` has an `RpmUpdater`. It is not worth
   cutting for nobody.
4. **Windows: do not ship, and the packaging half is not the reason.** NSIS is the cheapest installer
   on the table and Windows signing turns out to be cheaper than macOS signing. The blocker is that
   **there is no NATIVE tmux on Windows** — there is a Cygwin one, and §A.2.6 prices it as option E and
   refuses it — which is §A.2's question; §A.2 answers it by refusing the native
   product, so a Windows installer today would package a product that cannot keep the promise on the
   first page of `docs/ZEN-OF-TORTIE.md`. Refusing Windows is the answer this section recommends, and
   §D.7 states exactly what would have to change to flip it.
5. **ARM: Linux arm64 is in, Windows arm64 is moot, Linux armv7l is out.** GitHub gives away free
   arm64 runners for public repositories on both Linux and Windows (§D.6), and every dependency Tortie
   pins has a linux-arm64 artifact (§D.2). armv7l is out because `@parcel/watcher` ships a
   `linux-arm-glibc` build but nothing else in the stack is exercised there and nobody has asked.

---

### D.1 What the mac lane does today, so the comparison is not against a memory

Read out of `electron-builder.yml`, `build/sign-nested-binaries.cjs`, `build/verify-signed.mjs` and
`.github/workflows/release.yml` in this worktree.

- One `mac:` block. Two targets, `dmg` and `zip`, arm64 only.
- `hardenedRuntime: true`, two entitlements plists, `gatekeeperAssess: false` with the reason
  written down, and **no `identity:` key** — the certificate is discovered from the keychain search
  list, which resolves differently and deliberately in three places.
- Three nested Mach-O binaries signed **inside-out at `afterPack`** by
  `build/sign-nested-binaries.cjs` with stable reverse-DNS identifiers, plus a `mac.signIgnore`
  list of three regexes that must stay in step with it, plus a sealed-entitlement set-equality
  read-back on each.
- Notarization, stapling, a second `notarytool submit` for the DMG container alone, a
  `refresh-dmg-feed.mjs` to re-align the feed after stapling changed the bytes, and
  `build/verify-signed.mjs` (347 lines, 8 classes of check) as the release gate.
- Published artifact sizes, read from the GitHub release API on 2026-09-06: `Tortie-0.100.0-arm64.dmg`
  **173,170,278 bytes**, `Tortie-0.100.0-arm64.zip` **172,132,305 bytes**, plus two blockmaps and
  `latest-mac.yml`.

**The headline, and it surprised this research.** Almost none of that apparatus has a counterpart on
either target, and that is a *saving*, not a gap. Linux formats require no code signature at all.
Windows requires one signature from one certificate applied by electron-builder's own walk, with no
notarization, no stapling, no entitlements, no stable-identifier problem and therefore **no
`sign-nested-binaries.cjs` equivalent** (§D.4). The expensive, fragile, uniquely-Apple half of
Tortie's release lane does not need porting because it does not exist elsewhere.

---

### D.2 The nested binaries, per platform — the measured half of the "what does it cost" question

Tortie carries four things that are not its own JavaScript. This is what each one costs per target.
The charter asks for this number measured rather than estimated; here it is.

| Carried thing | How it arrives today | linux-x64 | linux-arm64 | win32-x64 | win32-arm64 |
| --- | --- | --- | --- | --- | --- |
| **specstory CLI** | pinned GitHub release, `build/fetch-specstory.cjs`, one `darwin-arm64` row | **exists**, `SpecStoryCLI_Linux_x86_64.tar.gz`, 16,959,637 B | **exists**, `_Linux_arm64.tar.gz`, 15,700,895 B | **exists**, `_Windows_x86_64.zip`, 17,289,788 B | **exists**, `_Windows_arm64.zip`, 15,797,275 B |
| **ripgrep** | `@vscode/ripgrep` 1.18.0 optional dep, unpacked from the asar | **exists**, `@vscode/ripgrep-linux-x64` | **exists**, `-linux-arm64` | **exists**, `-win32-x64` | **exists**, `-win32-arm64` |
| **tmux 3.7b** | built from three pinned source tarballs by `build/build-tmux.mjs` | buildable, script is mac-shaped | buildable, script is mac-shaped | **DOES NOT EXIST** | **DOES NOT EXIST** |
| **skills CLI** | npm tarball, `build/fetch-skills.cjs`, contractually pure JavaScript | portable unchanged | portable unchanged | portable unchanged | portable unchanged |

*How the specstory row was obtained:* `GET api.github.com/repos/specstoryai/getspecstory/releases/latest`
on 2026-09-06 returned tag `v2.10.0` (published 2026-08-17), whose eleven assets include Linux
x86_64/arm64 and Windows x86_64/arm64. The pin in `build/specstory-release.json` names one asset,
`darwin-arm64`, with two SHA-256s and a byte count; **each new target costs one more row of the same
shape and two more hashes**, and the Windows rows additionally cost a `.zip` extraction path because
SpecStory publishes no `.tar.gz` for Windows.

*How the ripgrep row was obtained:* `optionalDependencies` of the installed
`node_modules/@vscode/ripgrep/package.json`, which lists twelve platform packages including all four
above. The cost is not the package — it is that `asarUnpack` and `mac.signIgnore` in
`electron-builder.yml` both name `@vscode/ripgrep-darwin-arm64` **by literal path**, and
`src/main/search/resolve.ts` rewrites `app.asar` → `app.asar.unpacked` to match. Three literal paths
become per-platform.

*How the tmux row was obtained:* reading `build/build-tmux.mjs` and `build/tmux-release.json`. tmux
publishes source only, so the pin is on three source tarballs by SHA-256. On Linux those same three
tarballs build the same way — this is tmux's native platform — but four things in the script are
written to macOS and must be re-decided rather than merely branched: `--enable-utf8proc` is passed
because *"tmux's configure STOPS with an error on macOS unless it is given"* it, ncurses is taken from
`/usr/lib` via `AC_SEARCH_LIBS` after `PKG_CONFIG_LIBDIR` is emptied, and the linkage gate is
`otool -L` refusing any path outside `/usr/lib`. On Linux those become a distro-portability question
(link ncurses static too, or accept a runtime dependency on the host's `libtinfo`), and the gate
becomes `ldd` with an allowlist that is genuinely harder to write than the macOS one because glibc
versioning is a real constraint on which distros the binary runs on. **UNMEASURED:** whether a tmux
built on `ubuntu-24.04` runs on Debian stable and Fedora. §D.9 names the probe.

**The Windows tmux row is the whole Windows verdict.** Two of the three native binaries exist for
Windows and are cheap. The third is the durability architecture, and `docs/BACKLOG.md`'s own Phase 216
entry says **338 files under `src/main` name tmux** — a number §F.1 reproduces and then shows
overstates the real binding by 2.8×, which changes the size of the port and not this conclusion. **A
Windows package is not blocked by packaging.**

---

### D.3 Linux — the five formats, priced

Every capability claim in this section was read out of `node_modules/app-builder-lib@26.15.3` and
`node_modules/electron-updater@6.8.9` in this worktree on 2026-09-06.

electron-builder 26.15.3 ships target implementations for **appimage, snap, flatpak, fpm
(deb/rpm/pacman/apk/…), nsis, appx, msi, msi-wrapped, pkg and archive** — read by listing
`node_modules/app-builder-lib/out/targets/`. So all five Linux formats the operator named are
"supported" in the sense that a target class exists. What differs enormously is what the *host* needs
and what the *user's machine* needs.

#### D.3.1 AppImage — ship it, but second, and only after one probe

- **What electron-builder produces today.** `AppImageTarget` builds a squashfs image with an AppImage
  runtime prepended and **appends a blockmap**, which is what makes differential update possible.
- **Two toolsets, and the default is the old one.** `configuration.d.ts` documents
  `toolsets.appimage` with `@default "0.0.0"` (the legacy FUSE2 toolset) and marks `1.0.2`/`1.0.3`
  (runtime 20251108, no FUSE requirement) as **Betas**. With the default, `AppImageTarget.js:26` sets
  `defaultArgs = ["--no-sandbox"]` into the generated `.desktop` `Exec` line. Two consequences to
  state plainly:
  - a default-built Tortie AppImage, launched from its desktop entry, runs Electron **with the
    Chromium sandbox off**. Given the Phase 23 CSP refusals and `build/assert-preview-containment.mjs`,
    shipping that silently would be a real regression in posture. Setting
    `linux.executableArgs: []` removes it; whether the app then starts is **UNMEASURED**.
  - the default toolset produces a **FUSE2** AppImage. On Ubuntu 24.04 and 26.04 `libfuse2` was
    renamed `libfuse2t64` and is **not installed by default**, so a first-run user gets
    `AppImages require FUSE to run` and must `sudo apt install libfuse2t64` (AppImage's own
    troubleshooting page and the Ubuntu package rename, both read 2026-09-06). Opting into the beta
    static-runtime toolset removes that, at the price of a toolset electron-builder itself labels beta.
- **Host to build on.** The FUSE2 toolset ships a `darwin` subdirectory of host tools
  (`toolsets/linux.js`, `getFuse2Paths`: `toolRoot = process.platform === "linux" ? "linux-<arch>" : "darwin"`),
  so an AppImage is buildable **on the Mac**. The static-runtime layout has no host subdirectory, so
  it reads as Linux-host-only. **UNMEASURED** — read from the path layout, not run.
- **Nested binaries, and the mount that has to come down.** AppImage is not a sandbox. It is a
  self-mounting archive; everything inside runs with the user's ordinary privileges and sees the
  user's ordinary `$HOME`, so specstory, rg and a bundled tmux all execute. **The first draft of this
  section then said a tmux server started from inside it "outlives the app exactly as on macOS,
  because there is no container to tear down", and called that the single most important compatibility
  fact here. That sentence is withdrawn.** There IS something to tear down — a FUSE mount — and the
  claim also contradicted §D.9, which listed the same question as unmeasured on the same day. What
  happens to a tmux server standing in that mount is **UNMEASURED**. What the fix round did measure is
  the mechanism on both sides, and the two sides point opposite ways.

  **The project's stated intent is teardown.** AppImage's own software overview, read 2026-09-06:
  *"After the payload application exited, the runtime unmounts the squashfs image and cleans up the
  temporary resources (such as, the temporary mountpoint directory)."* And in AppImage discussion
  #1327, dated 2024-05-25, the maintainer puts it in as many words: *"Once the main long-running
  process for your main executable exits, we assume that the application has been quit by the user and
  at this point all processes spawned by it should be terminated, and the mount point should be
  unmounted. This is by design."*

  **The runtime's own code implements no such thing, and the trigger is a file descriptor rather than
  an exit.** `src/runtime/runtime.c` from `AppImage/type2-runtime`, fetched and read at the fix round
  on 2026-09-06 (1,857 lines): it kills no process and no process group on the mount-and-run path, and
  calls no `fusermount -u` there either. Teardown is a keepalive pipe and nothing else. The runtime
  calls `pipe(keepalive_pipe)` at `:1726`, forks a squashfuse daemon whose `fuse_mounted` callback at
  `:608-613` starts `write_pipe_thread` (`:594-606`) writing into the WRITE end forever, closes the
  write end in the parent at `:1786`, does `dup2(dir_fd, 1023)` on the mount directory at `:1800`, and
  `execv`s AppRun at `:1850`. When the last holder of the READ end closes it, that thread's `write`
  returns `-1` and it does `kill(fuse_pid, SIGTERM)` at `:602`, which is what unmounts. So the mount
  comes down when the last process holding `keepalive_pipe[0]` goes, not when the payload exits.
  **Both toolsets are covered by that reading, which matters because the DEFAULT one is the older
  runtime.** `AppImageKit`'s `src/runtime.c` — the legacy FUSE2 runtime that
  `toolsets.appimage: "0.0.0"` prepends — was fetched at the same time (958 lines) and carries the
  identical design at its own line numbers: `keepalive_pipe` at `:135`, `write_pipe_thread` with the
  same `kill(fuse_pid, SIGTERM)` on a failed write at `:138-152`, `pipe()` at `:842`, and the same
  `dup2(dir_fd, 1023)` / `setenv("APPDIR", mount_dir)` / `execv(filename, real_argv)` sequence closing
  the parent branch. type2-runtime is a fork of it and this part was not changed.

  **And that descriptor is inherited by every descendant, including the tmux server.** The runtime uses
  `pipe()` rather than `pipe2(O_CLOEXEC)`, and `dup2` clears close-on-exec by definition, so both
  `keepalive_pipe[0]` and fd 1023 survive every `exec` down the tree. No link in Tortie's chain closes
  them: node-pty's Linux path forks and `execvp`s with no descriptor sweep at all
  (`node_modules/node-pty/src/unix/pty.cc:399-447` — the only `POSIX_SPAWN_CLOEXEC_DEFAULT` in that
  file is at `:703`, inside the `__APPLE__` branch), and tmux's `proc_fork_and_daemon` at
  `build/vendor/tmux/work/tmux-3.7b/proc.c:359-380` calls `daemon(1, 0)`, which redirects 0, 1 and 2
  and closes nothing above 2. **So the likely real outcome is neither the old claim nor the documented
  intent: the tmux server holds the AppImage MOUNTED after Tortie quits, leaving one `squashfuse`
  process and one `/tmp/.mount_*` directory per launch alive until the last session dies.** Both
  outcomes are defects — one loses the live tier, the other leaks a mount per launch — and neither has
  been seen on a machine.

- **The per-launch resources path, which is a defect whichever way the mount goes.** `build_mount_point`
  at `runtime.c:978-997` composes `<TMPDIR or /tmp>/.mount_<name>XXXXXX` and `:1721` runs `mkdtemp` on
  it, so `$APPDIR` is a **fresh random directory on every launch** and `process.resourcesPath` is
  `$APPDIR/resources`. Tortie composes the bundled tmux path from it at
  `src/main/tmux/resolve.ts:803` and the conf at `:918`. A tmux server started under one launch is
  therefore executing a binary at a path the next launch cannot name, and if the mount is ever released
  while that server lives, the server's own text pages are backed by a filesystem that has gone away.
  Worse for §A.1.7: electron-builder's generated `AppRun` (`generateAppRunScript` in
  `node_modules/app-builder-lib/out/targets/appimage/appImageUtil.js`) exports
  `PATH="${APPDIR}:${APPDIR}/usr/sbin:$PATH"` and `LD_LIBRARY_PATH="${APPDIR}/usr/lib:…"` into every
  descendant, so the tmux server's environment — the thing Phase 12.7 F3 deliberately seeds so
  `execvp` finds agents by bare name — carries two per-launch directories that outlive the launch and
  point into a mount that may be gone. And §A.1.4's hazard one gains a second thing for `/tmp` ageing
  to age, being the mount directory itself. **A `.deb` has none of this: `installPrefix` is `/opt`
  (`app-builder-lib/out/targets/LinuxTargetHelper.js:76`, used at `FpmTarget.js:215`), so
  `process.resourcesPath` is `/opt/Tortie/resources`, a real path on a real filesystem, stable across
  launches and across updates — which is the macOS mechanism the live tier actually rests on.**

- **The probe that settles it, and it is one afternoon on any Linux box.** Build the AppImage, run
  `GMUX_SMOKE=create`, quit the app, then read `mount | grep '\.mount_'`, `ls -d /tmp/.mount_*`,
  `pgrep -a squashfuse` and `tmux -L gmux ls`, and run `GMUX_SMOKE=verify`. Repeat over three launches
  to see whether mounts accumulate. **Until that has been run, AppImage is a SHIP with a condition and
  deb is the format the live tier should be measured on.**
- **Updates.** `electron-updater` picks `AppImageUpdater` for any Linux app with no `package-type`
  marker. It refuses unless `process.env.APPIMAGE` is set (`AppImageUpdater.js:18`), i.e. the app must
  actually be running as an AppImage; it downloads differentially against the blockmap and swaps the
  file in place. **No password prompt, no package manager, no store.** This is the closest thing Linux
  has to the macOS ZIP update path.
- **Store account or review.** None. AppImageHub listing is optional and nobody needs it.
- **Signing.** None required and nothing verifies one. AppImage supports an embedded GPG signature that
  no desktop checks by default.
- **Cost to set up:** one `linux:` block, two targets, per-platform paths for the three literal
  ripgrep strings, a Linux tmux build path, four more specstory pin rows. **Cost to keep:** the
  FUSE/toolset decision has to be revisited when the beta toolset goes stable, plus the mount question
  above, which is the one thing in this section that could cost more than it looks.

#### D.3.2 deb — ship it, and make it the primary format

- **What electron-builder produces.** `FpmTarget` shells out to a **bundled** fpm 1.17.0. The toolset
  table in `toolsets/linux.js` lists `fpm-1.17.0-ruby-3.4.3-darwin-arm64.7z` among five builds, so
  **a `.deb` is buildable on the operator's Mac** with no Docker and no Linux box.
- **Nested binaries, and this is why deb moved ahead of AppImage at the fix round.** A `.deb` is a
  tarball with a control file. No confinement, no sandbox and — the part that matters — **no mount**.
  Files land at `/opt/<productName>/` (`installPrefix = "/opt"` at
  `app-builder-lib/out/targets/LinuxTargetHelper.js:76`, applied at `FpmTarget.js:215`), so
  `process.resourcesPath` is `/opt/Tortie/resources` on every launch for the life of the install. The
  bundled tmux the server is executing sits at a stable absolute path, exactly as
  `/Applications/Tortie.app/Contents/Resources/bin/tmux` does on macOS, and an update replaces the file
  while a running server keeps its unlinked-but-open inode — which is the macOS behaviour, unchanged.
  **The tmux server outlives the app for the same structural reason it does on macOS**, and that
  sentence is true here in a way §D.3.1 could not establish for AppImage. It is also the format that
  can install the `tmpfiles.d` drop-in §A.1.4 needs.
- **Updates, and this is deb's one real cost.** `electron-updater` selects `DebUpdater` when
  `resources/package-type` reads `deb`. Installing means running `dpkg -i` — and `LinuxUpdater.js`
  shows what that means for a person: `runCommandWithSudoIfNeeded` checks for uid 0 and otherwise
  builds a `pkexec` / `kdesudo` / `gksudo` / `sudo` command with the comment
  `"<app> would like to update"`. **Every self-update raises an authentication prompt.** That is a
  materially worse update story than macOS's silent stage-and-install, and it is inherent to system
  package managers rather than to electron-updater. The alternative — hosting a real apt repository so
  `apt upgrade` picks it up — costs a signing key, a repo layout and a host, and is not worth it for
  one user.
- **Store account or review.** None.
- **Cost to set up:** one line in the target list plus a `deb.depends` list, plus the `tmpfiles.d`
  drop-in of §A.1.4. **Cost to keep:** the dependency list drifts as distros move; low.
- **Why it is now first rather than second.** The two formats were originally ordered by how pleasant
  the update is, and on that axis AppImage wins outright. The fix round re-ordered them by what the
  LIVE TIER rests on, which is a stable absolute path to the bundled tmux and no filesystem that can be
  torn down under a running server. deb wins that outright, and the update prompt is a nuisance a
  person sees a few times a month against a durability question nobody has answered. **If the §D.3.1
  probe comes back clean — the mount survives, no leak accumulates, `GMUX_SMOKE=verify` passes — the
  two are equal and the ordering can go back.**

#### D.3.3 rpm — cut it only if asked

Same `FpmTarget`, same bundled fpm, same absence of confinement, same `RpmUpdater` with the same sudo
prompt. The one extra cost is measured in `FpmTarget.js:281-292`: fpm cannot make an rpm without
`rpmbuild` on the host, and the code has a `process.platform === "darwin"` branch whose hint is to
install it. On an `ubuntu-latest` runner it is `apt-get install rpm`. **Verdict: not now.** It is a
one-line addition the day a Fedora user appears.

#### D.3.4 Flatpak — do not ship, and the reason is architectural

- **What electron-builder produces.** `FlatpakTarget` delegates to `@malept/flatpak-bundler@0.4.0`,
  which shells out to **`flatpak-builder` on the host** (`index.js:252`). So Flatpak cannot be built on
  the Mac and cannot be built on a runner without installing flatpak, flatpak-builder and the runtime
  and SDK refs.
- **The defaults are six years stale.** `FlatpakTarget.js:112-115` defaults `runtimeVersion: "20.08"`,
  `base: org.electronjs.Electron2.BaseApp`, `baseVersion: "20.08"`. Flathub's own API on 2026-09-06
  reports `org.freedesktop.Platform` at release `freedesktop-sdk-26.08.0`, and the summary for
  `org.electronjs.Electron2.BaseApp` reports `"runtimeIsEol": true`. Everything about the Flatpak path
  would have to be configured from scratch rather than inherited.
- **The sandbox is the disqualifier, not the build.** A Flatpak app sees the runtime's `/usr`, not the
  host's. The user's agent CLIs — `claude`, `codex`, whatever is on their `PATH` — **do not exist**
  inside that view. The only way out is `flatpak-spawn --host`, and that requires the manifest to hold
  **`--talk-name=org.freedesktop.Flatpak`**, which the flatpak project's own security advisories
  describe as the interface *"intended to give specially-flagged apps the ability to run arbitrary code
  on the host system."* Flathub does grant it — VSCodium's Flathub packaging uses exactly this
  mechanism — so it is possible. But it means:
  - every spawn in Tortie routes through `flatpak-spawn --host`, including tmux itself, which means
    **the bundled tmux stops being the bundled tmux**. Either tmux runs inside the sandbox and cannot
    reach the user's agents, or it runs on the host and Phase 41's entire promise — *"a fresh Mac needs
    nothing installed first"* — is dead on this platform;
  - the app ships a permission whose plain-English meaning is "this sandbox does not confine this app",
    which is worse than honest AppImage, not better.
- **Flathub adds two more refusals of its own,** read from `docs.flathub.org` on 2026-09-06:
  *"All source available submissions must be built entirely from source code"* and *"there is no
  network access during the build process."* The bundled specstory CLI is a 41 MB proprietary Go binary
  fetched from a GitHub release by SHA-256 pin. That is not a source build. An exception exists —
  *"Exceptions may be granted to well-known vendors on a case-by-case basis"* — and Tortie is not a
  well-known vendor.
- **Updates and review.** Flathub is a pull request against a manifest repository, reviewed by
  volunteers with *"no definite time limit as all reviewers are volunteers"*. Updates ship through
  Flathub, not electron-updater — there is **no `FlatpakUpdater`** in electron-updater 6.8.9 (the
  factory in `main.js:42-70` selects only Nsis, Mac, AppImage, Deb, Rpm and Pacman). So Phase 24's
  entire update surface goes dark on this format.
- **Verdict: refuse.** The cost is a rewritten spawn plane, a broken bundled-tmux guarantee, a store
  review queue, a build-from-source rule Tortie cannot satisfy, and no self-update — to reach users who
  can already run the AppImage.

#### D.3.5 Snap — do not ship, same reason, sharper

- **What electron-builder produces.** `SnapTarget` writes a `snapcraft.yaml` with
  `base: core24` and `confinement: options.confinement || "strict"`, then calls **`snapcraft`**, which
  must be installed. `snapcraftBuilder.js:174-204` refuses outright unless one of four build
  environments is chosen, and gates two of them on the host OS: `useLXD` and `useDestructiveMode` are
  *"only supported on Linux"*, leaving Multipass or Launchpad remote-build on a Mac.
- **Strict confinement cannot work, and it is measurable rather than arguable.** snapd's `home`
  interface *"allows access to non-hidden files owned by the user"* — dotfiles are excluded by design,
  because *"dot files are assumed to contain sensitive information"*. Tortie reads `~/.claude`,
  `~/.codex` and `~/.ssh`, all dotfiles, and `src/main/credentials/` exists specifically to handle the
  first two. The `personal-files` interface can carve out named paths but is itself store-reviewed per
  path. And beyond files, a strict snap cannot exec arbitrary host binaries at all, which is what
  launching a user's agent CLI is.
- **So Tortie is a classic snap, and classic costs a human.** Snapcraft's own documentation says
  classic confinement is for apps that *"need access to arbitrary binaries on the host, which isn't
  possible"* otherwise — a sentence that describes Tortie exactly — and that *"Canonical must therefore
  audit and vet all classic snaps prior to distribution on any store."* The request is a forum post in
  the `classic-confinement` category, reviewed by Canonical on Canonical's schedule.
- **Updates.** Snaps auto-refresh from the Snap Store, which is genuinely good. But again there is **no
  `SnapUpdater`** in electron-updater 6.8.9, so Phase 24's surfaces go dark, and snapd decides when the
  app restarts, which collides with `updater.ts` rule 3: *"Tortie never calls quitAndInstall on its own
  and never relaunches itself."* A snap refresh does exactly that.
- **Verdict: refuse.** A store account, a hand review by another company, a build environment that
  needs Multipass or Launchpad, no self-update surface, and an auto-refresh that violates a stated
  product rule.

#### D.3.6 The Linux table

| Format | Build host | Set up | Keep | Signing | Nested binaries survive? | Update path | Store / review | Ship? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **deb** | Mac (bundled fpm) or Linux | small | small | none | **yes** — real files at `/opt/Tortie`, stable path, no mount | `DebUpdater`, `dpkg` behind a `pkexec`/`sudo` prompt every time | none | **SHIP, first** |
| **AppImage** | Mac (FUSE2 toolset) or Linux | small | small | none | **unproven** — no sandbox, but a FUSE mount whose teardown vs. a live tmux server is UNMEASURED, and a per-launch `$APPDIR` (§D.3.1) | `AppImageUpdater`, differential, no prompt | none | **SHIP, second, after one probe** |
| **rpm** | Linux, or Mac + `rpmbuild` | small | small | none | **yes** | `RpmUpdater`, same prompt | none | later, on request |
| **Flatpak** | Linux + `flatpak-builder` only | **large** | large | Flathub's | **no** — needs `--talk-name=org.freedesktop.Flatpak` and `flatpak-spawn --host`, which breaks bundled tmux | Flathub only; **no updater** | Flathub PR, volunteer review, source-build rule specstory fails | **REFUSE** |
| **Snap** | Linux + LXD, or Multipass, or Launchpad | **large** | large | Store's | **only under classic** | Snap Store auto-refresh; **no updater**; refresh restarts the app | Snap Store account + **Canonical classic review** | **REFUSE** |

---

### D.4 Windows — NSIS and MSIX, priced

#### D.4.1 Code signing, checked today rather than recalled

Everything in this subsection was fetched on 2026-09-06 from Microsoft's own documentation, with the
page's published last-updated date.

**The single most important finding, and it inverts the received wisdom.**
Microsoft Learn, *SmartScreen reputation for Windows app developers* (updated 2026-08-17):

> **EV certificates no longer bypass SmartScreen.** Years ago, signing files with an Extended
> Validation (EV) code signing certificate would result in positive SmartScreen reputation by default,
> but this behavior no longer exists. … **Paying a premium for EV solely to avoid SmartScreen warnings
> is no longer justified.**

And on what a signed-but-new app looks like to a person:

> Even when signed, a newly created binary could still show a SmartScreen warning until its hash or
> publisher certificate accumulates sufficient evidence of positive reputation. … **There is no exact
> threshold, but it can take several weeks and hundreds of clean installs from a wide audience.**

**Therefore: for a product with one user, no purchasable certificate removes the first-run warning.**
Signing buys the *publisher name* in the dialog instead of "Unknown publisher", and it lets reputation
accumulate across versions instead of resetting each release. It does not buy a clean first run. Any
Windows plan that assumes "we sign it and the warning goes away" is wrong as of today.

The options, from Microsoft Learn *Code signing options for Windows app developers* (updated
2026-08-29):

| Option | Cost | Availability | First-download behaviour |
| --- | --- | --- | --- |
| Microsoft Store (MSIX) — Store re-signs | **free** | worldwide | **no warning at all** |
| Microsoft Store (MSI/EXE) — publisher signs | cert cost | worldwide | no SmartScreen prompt during Store install |
| **Azure Artifact Signing** (was Trusted Signing) | **~$9.99/month** | orgs USA/Canada/EU/UK; individuals USA and Canada only | warning until reputation builds |
| OV certificate (DigiCert, Sectigo, …) | **$150–300/year** | worldwide | same as Artifact Signing |
| EV certificate | **$400+/year** | worldwide | **same as OV since 2024** |
| self-signed / unsigned | free | — | blocks; enterprises may block entirely |

Three more measured details that matter to the plan:

- **The hardware rule killed the cheap file-based path.** Learn: *"As of June 2023, the CA/Browser
  Forum requires private keys for OV certificates to be stored on a hardware security module (HSM) or
  hardware token."* This is why the shape of Windows signing in CI changed: there is no `.pfx` to put
  in a GitHub secret any more.
- **Time to obtain.** Azure Artifact Signing's own quickstart (updated 2026-08-11) says
  *"Processing your identity validation request takes from 1 to 20 business days (possibly longer if we
  need to request more documentation from you)."* An OV certificate is *"several business days"* per
  the Learn page. So: **days to weeks of elapsed time, started before the release, not during it.**
- **The three-year rule is gone, and Ita Vero LLC would qualify.** The Artifact Signing quickstart's
  Prerequisites read on 2026-09-06 name **geography only** — Public Trust certificates for
  organizations in the US, Canada, EU, UK, Australia, New Zealand, Japan, South Korea, Singapore,
  Switzerland, Norway and Israel, individuals US and Canada — with no organization-age requirement,
  and the FAQ (updated 2026-08-14) answers "what if my country isn't listed" by pointing at those same
  prerequisites and mentions no age rule either. The three-years-in-business requirement was a public
  preview rule. **UNMEASURED:** whether an actual application for a US LLC succeeds; only an
  application settles that, and it costs a paid Azure subscription (the FAQ: *"Artifact Signing doesn't
  support free, trial, or sponsored Azure subscriptions"*).
- **Azure Artifact Signing does not issue EV**, by its own FAQ: *"No, Artifact Signing doesn't issue
  Extended Validation (EV) certificates. There's no plan to issue EV certificates in the future."*

**The recommendation, if Windows ever happens:** Azure Artifact Signing at $9.99/month. It is the
cheapest, it needs no USB token in a CI runner, Microsoft names it *"Microsoft's recommended code
signing service for non-Store distribution"*, and since EV buys nothing on SmartScreen any more there
is no argument left for the $400/year option.

**And one cheaper option that deserves naming.** Microsoft made Store developer registration free for
individuals last year and **for companies on 2026-05-07** (Windows Developer Blog, *"Publish to
Microsoft Store as a company—now with free registration and faster onboarding"*). An MSIX in the
Microsoft Store is re-signed by Microsoft, costs nothing, and is the **only** row in the table with
"no warning at all". If the Windows question ever reopens, the Store is the honest first answer and
NSIS-plus-a-certificate is the fallback, not the other way round.

#### D.4.2 What electron-builder would actually do — read from the installed code

- **NSIS builds anywhere.** `NsisTarget.js:555` resolves `makensis` from electron-builder's own
  toolset for every host; the `WineVmManager` appears at line 373 only for one post-build workaround.
  So an unsigned `.exe` installer can be cut on the operator's Mac today.
- **Signing an NSIS build cannot be done off Windows any more, in practice.**
  `windowsSignToolManager.js:348` sets `isWin = process.platform === "win32" || useVmIfNotOnWin`,
  where `useVmIfNotOnWin` is true for `.appx` **or when the certificate is not a file**. Off Windows
  with a certificate *file* it falls to `osslsigncode` — but the June 2023 HSM rule means no file
  exists. And the Azure path (`windowsSignAzureManager.js`) runs
  `Invoke-TrustedSigning` through **PowerShell inside `packager.vm.value`**, which on macOS resolves
  to a **Parallels VM** (`winPackager.js:32` → `getWindowsVm`). **Conclusion: signing Windows means a
  `windows-latest` runner. There is no way around it that a CI lane can take.**
- **Nested binaries need no hook, and this is the good news.** `platformPackager.js:239-241` runs
  `extraResources` and `extraFiles` through `createTransformerForExtraFiles`, and
  `winPackager.js:220-231` returns a transformer that signs any file `shouldSignFile` accepts as it is
  copied — which with no `signExts` configured means every `.exe`. `winPackager.js:256-262` then also
  walks `resources/app.asar.unpacked` and signs what it finds. So `resources/bin/specstory.exe` and the
  unpacked `rg.exe` are both signed by electron-builder itself, with the same certificate, with no
  identifier problem and no set-equality read-back. **`build/sign-nested-binaries.cjs` has no Windows
  counterpart because it needs none.** One caveat measured: `shouldSignFile` with no `signExts`
  returns `isExe`, so a bundled `.dll` would go unsigned; Tortie carries none today.
- **MSIX/APPX cannot be built on Linux and needs a real Windows on macOS.**
  `AppxTarget.js:52` throws unless the host is darwin or Windows 10+, and on darwin it drives
  `packager.vm.value`, i.e. Parallels. It also needs the Windows Kits bundle. **MSIX is a
  `windows-latest`-only target for any realistic lane.**
- **Updates.** `NsisUpdater` downloads the new installer, and if `publisherName` is configured runs
  `Get-AuthenticodeSignature` against it before executing (`NsisUpdater.js:84-99`,
  `windowsExecutableCodeSignatureVerifier.js`). With no `publisherName` it returns `null` and
  **verifies nothing** — which is the honest description of an unsigned Windows self-update: it is a
  download-and-execute with no authenticity check. There is **no MSIX updater**; a Store MSIX updates
  through the Store, and a sideloaded MSIX needs an App Installer `.appinstaller` feed that
  electron-updater does not speak.

#### D.4.3 The Windows table

| Format | Build host | Set up | Keep | Signing cost | Nested binaries | Update path | Store / review | Ship? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **NSIS** | any host to build; **`windows-latest` to sign** | medium | medium | $9.99/mo Azure Artifact Signing, 1–20 business days to onboard; or $150–300/yr OV on an HSM | signed automatically by electron-builder's own walk — **no hook needed** | `NsisUpdater`, differential, verifies Authenticode when `publisherName` is set | none | **NOT YET** — blocked on the substrate, not on packaging |
| **MSIX (sideload)** | **`windows-latest` only** (or Parallels) | large | large | same as NSIS | signed | none electron-updater speaks | none | **NO** |
| **MSIX (Store)** | **`windows-latest` only** | large | large | **free**, Microsoft re-signs | signed by Microsoft | Store | free account since 2026-05-07, **certification review** | the right answer *if* Windows ever happens |

---

### D.5 What `.github/workflows/` would have to grow

Read from `.github/workflows/release.yml` (239 lines), `gates.yml` (69), `durability.yml` (86),
`compat.yml` (73) and `.github/actions/setup/action.yml` in this worktree.

**The shared setup action is macOS-shaped in three specific places**, and every one of them is a
one-line branch rather than a rewrite:

1. `path: ~/Library/Caches/electron` — becomes `~/.cache/electron` on Linux and
   `~\AppData\Local\electron\Cache` on Windows.
2. `command -v tmux || brew install tmux` — becomes `apt-get install tmux` on Linux and **has no
   Windows answer at all**, which is the same wall as everywhere else.
3. Every one of the 28 `smoke:*` scripts passes `-ApplePersistenceIgnoreState YES`. Harmless-looking,
   and **UNMEASURED** on a Linux Electron.

**Can one lane cut all platforms? No, and the reason is measured rather than stylistic.**

- macOS artifacts must be signed and notarized on a Mac (`codesign`, `xcrun notarytool`, `stapler`).
- Windows artifacts must be signed on Windows — §D.4.2, `windowsSignAzureManager` needs PowerShell
  inside the packager's VM, and on macOS that VM is Parallels, which no hosted runner has.
- Linux AppImage and deb *can* be cut on the Mac today (§D.3.1, §D.3.2), so they are the one place a
  single lane is genuinely possible — but `npmRebuild: true` plus the `electron-rebuild` postinstall
  means `node-pty` and `better-sqlite3` are compiled for the target, and compiling linux-x64 and
  linux-arm64 natives on a darwin-arm64 runner is a cross-compile nobody has tried here. Native
  runners are free (§D.6), so the honest answer is not to try.

**The shape it becomes: a matrix of five jobs, then one publish job.**

| Job | Runner | Cuts | Signs with |
| --- | --- | --- | --- |
| `mac` | `macos-15` | dmg + zip, arm64 | Developer ID, notarized (unchanged) |
| `linux-x64` | `ubuntu-24.04` | AppImage + deb, x64 | nothing |
| `linux-arm64` | `ubuntu-24.04-arm` | AppImage + deb, arm64 | nothing |
| `win-x64` | `windows-latest` | NSIS, x64 | Azure Artifact Signing |
| `win-arm64` | `windows-11-arm` | NSIS, arm64 | Azure Artifact Signing |
| `publish` | `ubuntu-latest` | downloads all artifacts, one draft release | — |

Four things change beyond adding rows:

- **Four feed files instead of one, and one of them collides.** The naming is decided by
  `updateInfoBuilder.js:51-60`, read on 2026-09-06:
  `getUpdateInfoFileName` appends `-<platform>` for everything except Windows, and
  `getArchPrefixForUpdateFile` appends `-<arch>` **only when the platform is Linux**. So the five jobs
  produce `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` and — from **both** Windows
  jobs — `latest.yml`. **The two Windows arches write the same filename.** Whichever uploads second
  wins, and an arm64 user is then offered the x64 installer by their own updater. This is a real defect
  a naive matrix would ship, and the fix is a per-arch `publish.channel` on the Windows jobs or one
  Windows job that cuts both arches. `build/refresh-dmg-feed.mjs` is mac-only and stays that way; the
  publish job must upload every feed file plus every blockmap.
- **The single-draft rule needs re-thinking.** Today one job creates the draft and uploads. With five
  producers, the draft is created once by the publish job and every artifact is an upload into it, or
  five jobs race and `gh release create` fails four times.
- **`build/verify-signed.mjs` gains two siblings, not two branches.** It is 347 lines of `codesign`,
  `spctl` and `stapler`. The Windows equivalent is short — `signtool verify /pa` over the installer and
  the two nested `.exe`s. The Linux equivalent is not a signature check at all but a *contents* check:
  the three binaries are present, executable, and `ldd`-clean against an allowlist. Three small
  scripts, one per platform, is right; one script with three branches is not.
- **`build/gate:contract` and `build/contract-inventory.mjs`** hold a byte-compared baseline of the
  IPC channels, env names and smoke modes. A per-platform lane does not change the contract, so this
  gate is unaffected — worth stating because it is the kind of thing a port breaks by accident.

**Release time.** Measured from the GitHub Actions API on 2026-09-06, the last ten `release`
workflow runs took, newest first: 15m10s, 14m19s, 12m03s, 13m28s, 12m37s, 9m55s, 12m45s, 10m29s,
12m13s, 9m22s — **median 12m25s, worst 15m10s**. The five jobs above run in parallel, so wall-clock
becomes `max(job) + publish`. The Linux jobs are the shortest (no signing, no notarization); the
Windows jobs add an Azure round-trip per signed file; the Mac job is unchanged and is already the
long pole because of the notary queue, which the workflow's own comment prices at *"2 to 15 min and
has no SLA"*. **So the honest estimate is that the release lane gets no slower in wall-clock and
roughly triples in surface area** — five things that can fail instead of one, and four of them can
fail after the Mac artifact is already good.

**Cost in money: zero.** `gregce/tortie` is public (`"private": false`, read from the GitHub API
2026-09-06) and GitHub's runner documentation read the same day says *"Use of the standard
GitHub-hosted runners is free and unlimited on public repositories"* — including `ubuntu-24.04-arm`
and `windows-11-arm`. The cost of more platforms in CI is entirely maintenance, not billing.

**What happens to the gates lane is worse than what happens to the release lane.** `gates.yml` today
does typecheck, test, build and a **packaged-dir smoke** on macOS, warm in about six minutes. The
packaged smoke is described in the file as *"the only gate that catches the extraResources and
asarUnpack class of bug"* — and that class of bug is **per-platform by definition**, because the
`asarUnpack` glob and the three literal ripgrep paths become per-platform. So a Linux port that does
not add a Linux packaged-dir smoke has no gate at all on the exact thing most likely to break. That is
a second `ubuntu-24.04` job on every pull request. `durability.yml` (nightly, tmux) is portable to
Linux and has no Windows meaning.

---

### D.6 ARM, in or out

- **Linux arm64: IN.** `ubuntu-24.04-arm` is a free standard runner for public repositories. Electron
  43.3.0 publishes `electron-v43.3.0-linux-arm64.zip` (read from the electron release API 2026-09-06).
  `@vscode/ripgrep-linux-arm64` and `@parcel/watcher-linux-arm64-glibc` both exist;
  `better-sqlite3` 13.0.3 ships a `linux-arm64.node` prebuild and is rebuilt from source anyway;
  `node-pty` 1.1.0 ships prebuilds for `darwin-arm64`, `darwin-x64`, `win32-arm64` and `win32-x64` and
  **no Linux prebuild at all**, so Linux node-pty is a node-gyp build on every platform including x64 —
  which the ubuntu runners can do and which is therefore not an arm-specific cost. specstory publishes
  a Linux arm64 asset. tmux builds from source. **Nothing is missing.**
- **Linux armv7l: OUT.** Electron publishes it and `@parcel/watcher` has a `linux-arm-glibc` build, but
  no free arm32 runner exists, nobody has asked, and the scope guardrail applies.
- **Windows arm64: moot, and cheap if it ever stops being moot.** `windows-11-arm` is free,
  `electron-v43.3.0-win32-arm64.zip` exists, and `@vscode/ripgrep-win32-arm64`, `node-pty`'s
  `win32-arm64` prebuild, `better-sqlite3`'s `win32-arm64.node` and SpecStory's
  `SpecStoryCLI_Windows_arm64.zip` all exist. Every dependency is ready. The only missing piece on
  Windows arm64 is the same one missing on Windows x64. **UNMEASURED:** whether `windows-11-arm` ships
  a working MSVC toolchain for the `electron-rebuild` postinstall.
- **Windows ia32: OUT.** Electron still publishes it; nobody should ask.

---

### D.7 What would have to change for the Windows refusal to flip

Stated so a later round does not have to guess.

1. **A Windows session substrate exists that keeps the durability promise.** §A.2 prices five and
   recommends exactly one, being WSL2 shaped as a machine, whose two open measurements are named in
   §0.6. Until one of those is settled, everything in §D.4 is packaging for a product that does not
   work.
2. **A Windows machine exists to test on.** Not a runner — a machine somebody uses, because the
   first-run SmartScreen experience, the installer's Start Menu placement and the ConPTY behaviour are
   things a person has to look at.
3. **The Microsoft Store path is evaluated before the certificate is bought.** Store registration is
   free since 2026-05-07 and Store MSIX is the only path with no SmartScreen warning at all. Buying an
   Azure Artifact Signing subscription first would be buying the second-best answer.

And what would have to change for **Flatpak or Snap** to flip: somebody would have to want Tortie on
a distribution where AppImage and deb do not reach — which today is close to nobody — *and* be willing
to accept either a bundled tmux that cannot see the user's agents, or a `--talk-name=org.freedesktop.Flatpak`
permission that makes the sandbox decorative. Neither is likely and neither should be chased.

---

### D.8 The honest first release, if the Linux half is built

**What a person would get.** An `.AppImage` and a `.deb` for x64 and arm64, downloaded from the same
GitHub release the DMG comes from, of the same order of size as the 165 MiB DMG (**UNMEASURED** —
Electron's linux zip and the Linux specstory asset are within a few percent of their darwin
counterparts, but nothing was built). It launches, it starts a private tmux server on socket
`-L gmux` from a bundled tmux, and the AppImage updates itself silently the way the Mac does.
**Sessions surviving the quit is stated for the `.deb` and is UNPROVEN for the AppImage**, for the
mount reason in §D.3.1 — which is why the deb is the one to hand somebody first.

**What would be permanently worse than the macOS build:**

- **No code signature means no integrity story.** macOS gets Developer ID, notarization, stapling and
  a designated-requirement check on every self-update. Linux gets a GPG signature nothing verifies.
  The best available substitute is the `attest-build-provenance` step the release lane already runs,
  extended to the Linux artifacts — which is real, and which nobody's desktop checks.
- **The deb self-updates behind a password prompt**, or does not self-update at all.
- **The AppImage may need `libfuse2t64` installed by hand** on the two most common Ubuntu releases,
  unless Tortie opts into a toolset electron-builder labels beta.
- **The AppImage's live tier is unproven and may cost a leaked mount per launch.** Its resources live
  on a fresh random FUSE mount each time, so the bundled tmux a running server is executing sits at a
  path the next launch cannot name (§D.3.1). The `.deb` has no such problem, which is a real difference
  between the two artifacts in the same release rather than a packaging preference.
- **The bundled tmux is only as portable as its glibc**, where the macOS one is guaranteed by a single
  SDK.
- **Native menus.** `CLAUDE.md`'s UI rule says *"Native macOS menus via the `ui:popupMenu` bridge —
  never DOM-drawn context menus."* Electron's `Menu.popup` works on Linux but looks like GTK, and the
  tray/template-image work in `src/main/tray` is macOS-specific. Not §D's problem, but it is the thing
  a person notices first, and no packaging choice fixes it.

---

### D.9 UNMEASURED — everything §D could not settle, and the probe that would settle each

The standing lesson is that a research document that guesses is worse than none. These are the
guesses this section refused to make.

| Claim that needs measuring | Probe |
| --- | --- |
| An AppImage and a deb actually build and launch | `electron-builder --linux AppImage deb --x64` on an `ubuntu-24.04` runner or a Linux VM, then run the packaged binary with `GMUX_SMOKE=basic` |
| Whether the static-runtime AppImage toolset can build on a darwin host | run the build once with `toolsets.appimage: "1.0.3"` on the Mac and read the error |
| Whether removing `--no-sandbox` from `executableArgs` leaves a working app | build both ways, launch both |
| Whether a tmux built on ubuntu-24.04 runs on Debian stable and Fedora | build once, `ldd` it, run it in three containers |
| **Whether a tmux server started inside an AppImage really outlives the app, and whether it instead pins the mount open.** §D.3.1 measures the mechanism on both sides and they disagree: the format's documentation and maintainer say the mount is torn down when the payload exits, while the runtime's code ties teardown to the last holder of an inherited non-`CLOEXEC` descriptor that neither node-pty nor tmux closes. This is the highest-value unmeasured claim in §D | `GMUX_SMOKE=create`, quit, then `mount \| grep '\.mount_'`, `ls -d /tmp/.mount_*`, `pgrep -a squashfuse` and `tmux -L gmux ls`, then `GMUX_SMOKE=verify` — the existing T1 smoke plus four reads, on Linux, repeated over three launches |
| Whether `-ApplePersistenceIgnoreState YES` is inert to a Linux Electron | run any smoke script on Linux |
| Whether cross-compiling `node-pty` and `better-sqlite3` for linux from darwin works | it should not be attempted; use native runners |
| Whether `windows-11-arm` has an MSVC toolchain for `electron-rebuild` | one `npm ci` on that runner |
| Whether Ita Vero LLC is accepted for Azure Artifact Signing Public Trust | only an application settles it; needs a paid Azure subscription |
| The real artifact size of each Linux and Windows package | build them |
| Whether Flathub would grant `--talk-name=org.freedesktop.Flatpak` **and** waive the source-build rule for the specstory binary | a submission, which is not worth making |

---

## E. Phase 24's self-update — does it generalise?

Read from `src/main/updates/` (11 modules, **3,177 lines** measured by `wc -l`) and from the installed
`electron-updater@6.8.9`.

**The feed and the check generalise. The install does not.**

`electron-updater` picks its updater by platform at `main.js:42-70`: `NsisUpdater` on win32,
`MacUpdater` on darwin, and on everything else `AppImageUpdater` unless `resources/package-type` names
`deb`, `rpm` or `pacman`. So the *outer* shape of Phase 24 — a feed, a check on a 30-second delay and
then every 6 hours, one log file, the journey state machine, the refusal to check at launch, the rule
that Tortie never relaunches itself — is platform-independent and survives untouched. `journey.ts`
(261), `state.ts` (173), `log.ts` (48), `ipc.ts` (79), `rehearsal.ts` (46) and most of `ui.ts` (472)
are portable as written.

**What does not generalise is 1,304 of those 3,177 lines — 41.0 percent of the domain.**

| Module | Lines | Fate off macOS |
| --- | --- | --- |
| `shipit-state.ts` | 607 | **Nothing.** It parses `ShipItState.plist`, the `update.*` staging directories and `ShipIt_stderr.log` — Squirrel.Mac artefacts that exist on no other platform. |
| `recovery.ts` | 370 | **Nothing.** It deletes the ShipIt directory and the `com.itavero.tortie.ShipIt` defaults domain, and its own path guard requires the directory to sit under `~/Library/Caches`. |
| `refusal-check.ts` | 327 | **Nothing.** It reports the broken promise by reading Squirrel's own retry counting, derived in research 46 from *"disassembly of the shipped ShipIt"*. |

And the rule that ties them together does not exist elsewhere either. `updater.ts` rule 4 says
*"Staged means STAGED BY THE OS UPDATER, not downloaded"*, and the mechanism is
`nativeUpdater.on('update-downloaded')` at `updater.ts:491` — Electron's **built-in** `autoUpdater`,
which wraps Squirrel.Mac. On Windows that built-in wraps **Squirrel.Windows**, which Tortie would not
be using because the recommendation is NSIS, so the event would never fire. On Linux
`require('electron').autoUpdater` has no implementation at all. So on both targets, **the honest
`stagedVersion` moment that Phase 31 was built to get right simply has no source**, and rule 6's
`handedToInstaller` guard — which exists because *"every Squirrel staging deletes the update
directories of the previous ones"* — guards against a failure mode neither platform has.

**What each platform's install actually looks like:**

- **NSIS.** Download, optionally verify Authenticode, then run the installer at quit or on demand.
  There is no staging, so there is no gap between "downloaded" and "staged" and nothing to be honest
  about. `refusal-check` becomes "did the version change after the restart", which is three lines, not
  327.
- **AppImage.** Download differentially, write the new file beside the old, swap. Requires
  `process.env.APPIMAGE`, so a person who extracted the AppImage gets a refusal Tortie must word.
- **deb / rpm.** Download, then `pkexec`/`sudo` a `dpkg -i`. **A password prompt on every update.**
  That needs a product decision, not a port: the least-bad answer is probably that a deb build does
  not self-update at all and says so, leaving updates to whatever put the deb there.
- **Flatpak / Snap.** No updater exists. Phase 24's whole surface is dead, and a snap refresh restarts
  the app, which rule 3 forbids Tortie from doing to itself.

**The verdict for §E:** self-update needs **a separate answer per platform**, not a generalisation.
The good news is that the separate answers are each much smaller than the macOS one, because Squirrel
is the thing that made the macOS answer big. The right shape is a thin per-platform "installer
adapter" behind the existing journey state machine, with `shipit-state.ts`, `recovery.ts` and
`refusal-check.ts` moved behind a `darwin` guard rather than genericised — genericising them would
produce three empty implementations and one real one.

---

## F. The honest total

### F.1 The portability number, measured twice by methods that share no evidence

The charter asks for one hard number measured rather than estimated: **what fraction of `src/main` is
genuinely substrate-bound rather than merely tmux-naming, re-derived by a second method.** It was
measured twice on 2026-09-06 at `bb9a5cb`.

**The naive number, reproduced and then discarded.** `grep -rl 'tmux' src/main | wc -l` is **338**,
exactly the charter's number, re-run at integration. Decomposed:

| | files |
| --- | --- |
| naive set | **338** (334 of them `.ts`/`.tsx`; the other four are test fixtures) |
| …of which tests | 153 |
| …non-test | 185 (191 counting files that name only `Tmux`/`TMUX`) |
| …non-test with code-level evidence of any kind | 118 |
| …non-test, actually substrate-bound | **122** |
| substrate-bound files the naive test **misses** | **3** |

**338 → 122. The naive test overstates the binding by 2.8× and still misses three files:**
`src/main/activity/process.ts`, `src/main/manifest/harvest/agy-owner.ts` and
`src/main/usage/statusline.ts` — the last carrying `GMUX_MANAGED` and `GMUX_SESSION_ID` inside an
embedded `/bin/sh` status-line script while never saying "tmux".

**Method one — behavioural classification.** Per file, reading only that file's own source and its own
import statements, over a TypeScript AST so a mention in a comment can never be mistaken for code and
an identifier is resolved against the file's own import bindings before it counts (which is what stops
the renderer's IPC channel named `createSession` reading as tmux's `createSession`).

| tier | evidence | meaning |
| --- | --- | --- |
| **B3** | calls a tmux-bound runner, composes a tmux argv, or parses `#{…}` / `%output` | runs or reads the substrate |
| **B2** | declares or consumes substrate vocabulary in a data shape (`tmuxId`, `tmuxName`, `panePid`, `remoteTmuxPath`, `@gmux-*`, `GMUX_SESSION_ID`, `'tmux-pane'`) | carries the substrate in its contract |
| **B1** | imports a substrate module and forwards | consumer |
| **B0** | the word appears somewhere in the file and nowhere in code | mention only |
| **N** | never appears | no contact |

Two deliberate splits, and both changed the answer. **`src/main/tmux/` does two jobs**: `resolve.ts`
and `user-path.ts` export login-shell PATH capture and `argv[0]` resolution — `getUserPath`,
`resolveBinary`, `extraBinDirs`, `captureLoginShellEnv`, `installUserPath` — which touch no tmux, and
eleven files import only those and are **POSIX-bound rather than substrate-bound**, which is a
different problem with a different platform answer. And **the socket name is a contract, not an
operation**, which demotes `updates/{rehearsal,self-check,shipit-state,updater}.ts` from B3 to B2.

Result, `src/main` non-test, 544 files: **B3 69, B2 36, B1 16, B0 73, N 350** (product code alone:
43, 29, 15, 65, 339).

**Method two — structural symbol taint.** Not a rewording of method one: **it reads no tmux token in
any file body.** The only substrate definition it uses is *locational* — "declared in
`src/main/tmux/`" — and everything after that is the TypeScript checker resolving identifiers to their
original declaration through aliases and re-export chains. A TS program over all 1,960 files under
`src/`, with the precondition verified: 28 unresolved module specifiers, all of them renderer asset
imports (`?raw`, `?worker&inline`, `.png`, `.woff2`), and nothing under `src/main` or `src/shared`
failing to resolve, so the import graph is complete. Seed: 139 exported symbols declared in the layer.
Fixpoint in three rounds: 139 → **171**. Result, `src/main` non-test: **depth 0: 13, depth 1: 66,
depth 2: 26, depth 3: 18, unreached 421.**

**The reconciliation, which is the point of doing it twice.**

```
M1\M2    d0    d1   d2+  none   row
B3       12    47     6     4    69
B2        0     7     3    26    36
B1        0    12     3     1    16
B0        1     0     7    65    73
N         0     0    25   325   350
col      13    66    44   421
```

**Where they agree is the strongest single result.** Of the **79 files at direct-import depth (d0/d1),
78 are B1 or stronger under method one** — two methods that share no evidence, one reading file bodies
and one resolving symbols, agreeing on **98.7%** of the files with a real import edge into the
substrate. The one exception is `src/main/tmux/user-path.ts`: in the layer by location, POSIX-not-tmux
by behaviour. Both are right about different things, which is itself the finding of the first split
above.

Four disagreements, each resolved rather than averaged:

- **Cell A — method one says B3, method two sees no edge at all (4 files). Method one is right, and
  this is the most valuable disagreement in the measurement.** `attach/attach-plan.ts`,
  `machines/remote-stamps.ts`, `scrollback/service.ts` and `sessions/resume-in-place.ts` all compose
  tmux argv (`attach-session`, `set-option`, `list-panes`, `display-message`, `capture-pane`) and
  **import nothing from the layer**, because they take an *injected runner*:
  `run: (args: readonly string[]) => Promise<string>` at `scrollback/service.ts:94`, and
  `export type TmuxScrollRunner = (args: readonly string[]) => Promise<string>` at
  `tmux/scroll.ts:69`. Method two cannot see them because there is no symbol to resolve — the coupling
  has been dependency-injected away. **That injection is Tortie's real seam, and §F.2 says why it is
  one level too shallow.**
- **Cell D — method one says B2, method two sees no edge (26 files). Method one is right.** Substrate
  vocabulary living in data that no longer imports the layer, because a `string` field named
  `tmuxName` has no symbol to trace. This is the manifest half: `manifest/store.ts`, `codecs.ts`,
  `sessions-repository.ts`, `restore-journal.ts`, `reconciliation.ts`, `restore/journal.ts`,
  `harvest/{stores,claim-strength,agy-owner}.ts`, nine files under `machines/`,
  `activity/{process,state-machine,claude-registry}.ts`, `agents/registry.ts`, `capture/ipc.ts`,
  `log/diagnostics.ts`.
- **Cells B and C — method one says N or B0, method two says tainted at depth ≥ 2 (32 files). Method
  two is wrong on 30 of them, and the reason is worth writing down.** Two carriers over-propagate.
  `ExecTmuxOptions` (`machines/exec-plane.ts`) is a *generic exec options bag*, `{ timeoutMs?,
  execution? }`, that happens to carry `Tmux` in its name; `machines/remote-run.ts` imports it,
  becomes tainted, exports `runRemoteRead`/`runRemoteWrite`, and taints **18 files at depth 3** that
  are SSH file and git reads with no tmux in them at all — the file's own header says so.
  `getGmuxCore`/`GmuxCore` is the session facade, and every caller inherits the taint although
  `capabilities.ts`, `tray/index.ts`, `diagnostics/report.ts`, `restart/ipc.ts` and `restore/ipc.ts`
  would not change under a second substrate. **The diagnosis is the deliverable: the taint at
  depth ≥ 2 measures name contamination and facade-shape coupling, not substrate binding.
  `ExecTmuxOptions` is misnamed and it costs 18 false positives.** Method two is right on 2 of the 32:
  `activity/index.ts` and `sessions/index.ts` are barrels that re-export substrate operators without
  naming them.
- **Cell E — 6 files where method one says B3 and method two says depth 2+.** Not a disagreement in
  substance: `machines/*` reaches tmux through `exec-plane.ts` rather than directly, and both methods
  call them bound.

**The headline definition, stated so it can be argued with:** substrate-bound = `M1 ∈ {B3, B2, B1}`
∪ `M2 depth ≤ 1`, which is the union of "behaves like tmux" and "has a real import edge into the
layer" — exactly where the two methods were shown to agree.

| `src/main`, non-test (544 files) | files | share |
| --- | --- | --- |
| **substrate-bound** | **122** | **22.4%** |
| — product code | 88 | |
| — harness / smoke / conformance drivers | 34 | |
| **would be rewritten** (runs or parses tmux, or is the layer) | **70** | 44 product + 26 harness |
| **would be edited** (vocabulary or forwarding only) | **52** | |
| **zero substrate contact by either method** | **325** | **59.7%** |

Without `src/main/machines/` — the SSH remote plane, a separate feature that survives any port — the
product set is 430 files, **64 bound and 29 rewritten**.

| Whole of `src/`, non-test | files | substrate-bound | macOS/POSIX-bound |
| --- | --- | --- | --- |
| main | 544 | 122 | 87 |
| renderer | 548 | 15 | 2 |
| shared | 71 | 4 | 1 |
| preload | 18 | 1 | 1 |
| **total** | **1,181** | **142 (12.0%)** | **91 (7.7%)** |

**And per platform, which is the number the operator asked for:**

| | files that change at all | of which substantially |
| --- | --- | --- |
| **Linux** (tmux exists) | **43** (32 product, 10 harness, plus `SECURITYSESSIONID` in `tmux/env.ts`) | ~12 product |
| **Windows** (no tmux) | **192** (156 product, 36 harness) — **16.3% of `src/`** | **70** |
| clean on both axes | **962 (81.5%)** | |

Linux does not touch the substrate set at all: its whole surface is the 42 macOS-bound files plus the
21 substrate-bound files that also carry a macOS specific, plus the one macOS specific that lives
inside the substrate layer, being `MACOS_LOGIN_SESSION_VAR = 'SECURITYSESSIONID'` in
`src/main/tmux/env.ts`. **Rules that survive a Linux port unchanged — POSIX signals, login shells,
`~`, node-pty, ssh — are excluded from the Linux column and included in the Windows one**, which is
what makes the two columns comparable.

**The measurement's own error rate, reported because it is the honest thing to do.** 38 of 544 files
were hand-audited (7%): B2 7/7 with one borderline (`activity/process.ts` carries `panePid` as a
parameter name and nothing else), B1 7/7, N 14/14, B0 8/10. All 325 files both methods call clean were
independently grepped for any hard substrate token: **one** hit, `diagnostics/tree.ts`, a comment
saying *"A pane with no `@gmux-id`"*, which is a B0/N boundary case and both are "not bound". **Two
bugs in the scanner were found by that audit and fixed before the numbers above were taken:**
`scanner.getTokenText()` returns empty for trivia in TypeScript 5.9, so comments were never counted
and B0 was undercounted by 12 files; and `ts.isStringLiteralLike` excludes template-literal spans,
which is how `usage/statusline.ts`'s embedded shell script was missed. **The first version of that
measurement would have been wrong in a way that read as confident**, which is why it is reported here.

### F.2 The seam map — where a second substrate would attach, and where one would have to be invented

**The seam that exists, and it is better than expected.** Four process-creation sites in the whole
product, all taking one `SpawnPlan { file, argv }`:

| site | what it creates |
| --- | --- |
| `machines/exec-plane.ts:602` | every one-shot tmux command (`spawnTmux`) |
| `machines/exec-plane.ts:748` | the remote shell rung |
| `tmux/control-client.ts:274` | the long-lived control-mode client |
| `attach/attach-host.ts:228` | the attached pane, through node-pty |

And **one composer** turns a context plus tmux args into that plan, with the local/remote branch
already inside it:

```ts
// src/main/machines/context.ts
export function tmuxCommand(ctx: MachineContext, args: readonly string[]): SpawnPlan {
  if (ctx.kind === 'local')
    return { file: ctx.bin, argv: ['-L', ctx.socket, '-f', ctx.confPath, ...args] };
  return { file: ctx.sshBin, argv: [...sshOptions(ctx), ctx.host, shellQuoteArgv(remoteTmuxArgv(ctx, args))] };
}
```

`MachineContext = LocalMachineContext | RemoteMachineContext` is a real discriminated union, and **a
third `kind` is where a second substrate attaches.** `src/main/tmux/index.ts` is a genuine facade over
139 exported symbols. Two consumers already take injected runners (`TmuxScrollRunner`,
`ActivityMonitorDeps.run`, `scrollback` `deps.run`). `src/main/restart/restart.ts` takes
`createSession`/`killSession` as an injected interface and is fully portable as written. **This is why
§A.2.2 can model WSL2 as a machine rather than as a port: the union already has the shape.**

**The seam that does not exist, and this is the whole problem.** Every seam Tortie has is **at the
argv level**. The injected runner's type is `(args: readonly string[]) => Promise<string>`, and the
argument *is* a tmux command line. So the seam lets you change *where* a tmux command runs and never
*what language it is in*.

Measured: **103 tmux argv composition sites in 44 non-test files, using 19 distinct tmux verbs**
(`send-keys` 38, `list-sessions` 28, `set-option` 19, `display-message` 18, `show-environment` 14,
`capture-pane` 10, `new-session` 10, `list-panes` 9, `kill-server` 8, `kill-session` 8, `show-options`
7, `set-environment` 6, `start-server` 6, `copy-mode` 5, `rename-session` 4, `has-session` 2,
`respawn-pane` 2, `clear-history` 2, `attach-session` 1). Split:

| where | sites | files |
| --- | --- | --- |
| inside `src/main/tmux/` | 32 | 7 |
| **product code outside the layer** | **35** | **21** |
| harness / smoke | 36 | 16 |

**Two thirds of the tmux command language is composed outside the module that owns it.** A second
substrate needs an operation-level interface — `createSession`, `capture`, `setOption`, `sendKeys`,
`readExtent`, `scroll` — and 35 product call sites re-authored against it. **That interface does not
exist today and inventing it is the port.** (The §A.2.1 count of 88 exec-door call sites is the same
territory counted at the door rather than at the composition, and the two agree exactly on the 19
verbs, which neither probe took from the other.)

**Where the assumption is baked in, named exactly:**

- **The manifest.** `src/main/manifest/schema.ts` has `sessions.tmux_name TEXT NOT NULL` with
  `idx_sessions_tmux_name` on it, `sessions.pane_pid INTEGER`, and `restore_journal.tmux_id TEXT`.
  Three columns, one of them NOT NULL and indexed, in the SQLite file `CLAUDE.md` calls the source of
  truth for restore. Eighteen non-test files read or write those names.
- **The restore path.** `restore/restore.ts` and `restore/snapshots.ts` are B3 at depth 1;
  `restore/journal.ts` is B2. `restore.ts` composes `send-keys` and `capture-pane` directly.
- **The session lifecycle.** `sessions/core.ts` (B3, d1), `create-local.ts`, `id-harvest.ts`,
  `launch-plan.ts`, `resume-in-place.ts`. `launch-plan.ts` builds the pane environment as tmux `-e`
  pairs.
- **Identity.** `@gmux-id` is a tmux **session option** and `GMUX_SESSION_ID` is a tmux **server
  environment stamp**. *"A live session that carries neither is NOT OURS"* is an architecture
  invariant expressed in tmux primitives. On a substrate with neither, identity, adoption and the
  refusal to adopt all have to be re-mechanised — and that is the load-bearing safety rule, not a
  detail.

**Where the substrate crosses into the UI, and it is one field.** The renderer has **15
substrate-bound files and zero structural edges** — method two reaches nothing in the renderer at all.
All 15 are vocabulary: `Session.tmuxName: string` in `src/shared/types.ts`, carried through
`shared/ipc/terminal.ts`, `preload/terminal.ts` and eight renderer files; an error-copy family
(`TMUX_MISSING_COPY`, `TMUX_BUNDLE_INCOMPLETE_COPY`, `TMUX_VERSION_BLOCKED_COPY`); and the machines
rows (`remoteTmuxPath`, `acceptedTmuxVersion`). **The UI does not know what a multiplexer is.** That
is a real asset and it is why the Linux answer is "port" and not "fork".

**Modules that would not be touched at all.** Twelve modules under `src/main` have zero
substrate-bound and zero platform-bound files across 42 files: `logins`, `db`, `durable`, `settings`,
`drop`, `preview`, `restart`, `notice`, `assets`, `power`, `cache`, `security`. Adding the ones that
are platform-only — a keychain or a path to swap, no substrate — brings in `arch` (64 files), `context`
(24), `symbols` (13), `credentials` (12), `config` (10), `fs`, `git`, `search`, `quickopen`,
`watcher`, `recents`, `tray`. **`src/main/arch/` — 64 files, the whole Architecture feature — is
completely clean on both axes.** So is all of `src/renderer` apart from 15 vocabulary files and 2
platform files.

### F.3 The plain answer the seam map produces

**Linux is a port. Windows is a fork wearing a port's clothes.**

**Linux:** the substrate is the same program, the conf is portable as written, and the 142
substrate-bound files do not change. **43 files change**, 32 of them product code, and they are the
macOS mechanisms §B names. That is 3.6% of `src/`.

**Windows:** **192 files change, 16.3% of `src/`, of which 70 are rewrites rather than edits.** The
file count is the smaller half of the truth, and three things are the larger half:

1. **The manifest schema names tmux in a NOT NULL indexed column.** Durability is the product and the
   source of truth for it is spelled in the substrate's vocabulary. That is a migration of the one
   file that must never be lost, not a refactor.
2. **Session identity is a tmux mechanism.** On ConPTY there is no server to hold either stamp, so the
   safety rule has to be re-mechanised.
3. **The seam is at the wrong altitude.** 35 product call sites outside the layer speak tmux argv, and
   the operation-level interface has to be invented and threaded through them before a second
   substrate can exist at all.

**The architecture does admit a second substrate, but not in the shape it is in.** The evidence for
"admits": four process-creation sites, one `SpawnPlan`, a `MachineContext` union that already
discriminates local from remote, a renderer that touches the substrate through exactly one string
field, and 81.5% of `src/` clean on both axes. The evidence for "not in the shape it is in": every one
of those seams passes `readonly string[]`, and that string array is a tmux command line.

**And this is what makes §A.2's recommendation follow from the number rather than from taste.** If the
Windows answer is WSL2, **the substrate number collapses to the Linux number** plus a path-translation
and process-visibility layer, and none of the interface work above is needed at all. That is the
option the measurement most strongly favours, and it is the one to price first if Windows is ever
priced.

**One honest limit on §F, stated because a file count is a size and not a difficulty.** Whether the 70
rewrites are *hard* rewrites was not measured. `sessions/core.ts`, `restore/restore.ts` and
`tmux/supervisor.ts` are among the largest and most invariant-dense files in the tree, and three files
there could cost more than the other 67. And `build/` was measured by §B rather than by §F: **36 of
204 scripts are platform-shaped**, which is a comparable body of work to `src/main`'s and should not
be assumed small.

### F.4 What it would cost in phases, roughly, so it can be judged against the queue

These are sizes in Tortie's own unit — one phase is one workflow with spec, parallel builders, an
integrator, independent verification at its tier, a fix round and one commit. They are estimates
derived from the measurements above, not measurements; **no phase in this table has been built and
none of these numbers is a measurement.**

**Linux — three phases to a first release, plus one that is not optional afterwards.**

| Phase | What it does | Tier | Why that tier |
| --- | --- | --- | --- |
| **L1 — the build** | `build/build-tmux.mjs` on Linux with a fourth pinned tarball for static ncurses and two architectures; the two silent pack-hook returns become deliberate branches; the four specstory pin rows and the three literal ripgrep paths become per-platform; a `linux:` block cutting deb and AppImage on x64 and arm64, with the §D.3.1 mount probe run before the AppImage is offered to anybody; two CI jobs and the publish job (§D.5) | **Tier 3** | It spawns processes and it packages what a person runs. The per-row matrix is the four artifacts actually built and launched |
| **L2 — the substrate honest** | The nine files §A.1.9 names: `resolve.ts` (8 lines), `env.ts` (`C.UTF-8`), the five `/bin/ps` sites plus the new `/proc/<pid>/stat` reader, `proc/orphans.ts`'s ppid predicate, node-pty's Linux build path, and a real Linux row in `TESTED_TMUX_PAIRS` | **Tier 3** | It can lose the person's work — tmux, restore and session lifecycle are all in scope |
| **L3 — the macOS mechanisms** | §B's needs-work rows that are not the keymap: the in-window menu bar and the four dead roles, the window chrome and the 76 px inset, the tray refusal on GNOME, `about`, fonts and a re-measured `assert-tab-floor`, the 31 `startsWith('/')` sites, the Squirrel domain behind a darwin guard, and the three diagnostics panels refusing honestly off-mac | **Tier 2** | Rendered surfaces with no new durable state, one app run each, plus one independent method |
| **L4 — the gates, and it is not optional** | A Linux packaged-dir smoke on every pull request (§D.5 says the class of bug it catches is per-platform by definition), `smoke:t1` and `smoke:t3` on Linux, `conformance:resume`, a Linux `probe:p167` written against `/proc/self/fd` because the macOS assertion measures a code path that does not exist, and a durability soak over a real logout | **Tier 3** | This is the phase that turns "it runs" into "it is dependable", and without it the Linux build is a claim rather than a product |

**The keymap is its own research phase** and it is not in the table above, because §B.4 says so:
49 of 70 chords, 48 `metaKey` reads, and the conventional escape already spent.

**Windows — not priced as phases, deliberately.** Under option A the work is: the WSL machine kind in
`MachineContext`, a Windows Electron shell with §B's Windows column, the six harvest rows §C.4 names,
the two measurements §0.6 opens with, and the whole of §D.4's signing and installer lane. Under option
B it additionally includes a durability layer Tortie owns, which this document declines to size for
the reason §A.2.4 gives. **Under option A2 it is zero phases**, because the Linux target is the
deliverable. That asymmetry is the recommendation.

### F.5 What a first Linux release would and would not do

**What a person would get.** An `.AppImage` and a `.deb` for x64 and arm64 from the same GitHub
release the DMG comes from. It launches, it starts a private tmux server on socket `-L gmux` from a
bundled tmux, **sessions survive quitting the app on the `.deb`**, restore brings a project back after
a reboot with the agent's resume command prepared, and the AppImage updates itself silently the way the
Mac does. All twelve agents can be launched. Six of them capture as strongly as on macOS on day one.
**The AppImage's live tier is the one claim on this list that is unproven** — its resources sit on a
per-launch FUSE mount and §D.3.1 names the probe.

**What it would not do on day one:** capture exactly for `codex`, `deepseek`, `omp` and `qwen` until
each store encoding is read off a real install; capture exactly for `antigravity` on any machine
without lsof; offer either IDE watcher row; offer a status item on stock GNOME; offer the Open With
submenu as more than a single default; or offer the power, footprint and disk diagnostics panels.

**What would be permanently worse than the macOS build:**

- **No code signature means no integrity story.** macOS gets Developer ID, notarization, stapling and
  a designated-requirement check on every self-update. Linux gets a GPG signature nothing verifies.
  The best available substitute is the `attest-build-provenance` step the release lane already runs,
  extended to the Linux artifacts — which is real, and which nobody's desktop checks.
- **The danger-flag seal is weaker.** Where no secret store exists, Electron's `safeStorage` falls
  back to a hardcoded password while still reporting encryption as available, and the seal's whole
  threat model is an agent writing the user's home directory (§B #7).
- **The CPU status tier is coarser**, until the `/proc` reader replaces `ps` — and if it is not
  written, the CPU promoter essentially stops firing (§A.1.8, derived not measured).
- **`/tmp` ageing and `KillUserProcesses` are hazards macOS does not have** (§A.1.4), and the
  `tmpfiles.d` mitigation is available to a `.deb` and not to an AppImage.
- **The deb self-updates behind a password prompt**, or does not self-update at all (§E).
- **The AppImage may need `libfuse2t64` installed by hand** on the two most common Ubuntu releases,
  unless Tortie opts into a toolset electron-builder labels beta (§D.3.1).
- **The AppImage runs from a per-launch FUSE mount**, so the path the bundled tmux is executing from
  changes on every launch and the teardown behaviour under a live server is unmeasured (§D.3.1). The
  `.deb` is the artifact this document would hand somebody first, and that ordering is itself a thing
  macOS never has to think about.
- **The bundled tmux is only as portable as its glibc**, where the macOS one is guaranteed by a single
  SDK; the whole product's measured floor is **GLIBC_2.34**.
- **Real-keystroke verification does not port**, and on Wayland there is no portable synthetic-input
  path at all (§B #37). Thirteen probes lose the only method that tests the OS accelerator path.
- **The menus are GTK and the window chrome is a redesign.** The `CLAUDE.md` refusal survives —
  `Menu.popup` is still an OS menu and not a DOM one — but it looks like a different product, and no
  packaging choice fixes that.

### F.6 What a first Windows release would and would not do

**There is no first Windows release recommended.** If one happened anyway, this is what each option
would honestly claim.

**Under A2 (the Linux build under WSLg) — the only one this document would ship.** A person on Windows
11 installs WSL2, a distro and their agents, installs the Linux Tortie inside it, and gets **every
promise the macOS build makes**: sessions that outlive quit and crash, restore after reboot, exit-code
truth, the activity oracles, image drop, all twelve agents with sandboxing. What it would **not** do:
look like a Windows app — GTK menus, no taskbar or file-association integration, no native window
chrome; run on Windows 10; open a project stored on the Windows side without going silently stale
(§A.2.2); or exist at all without the person doing four installs first.

**Under A (a native Windows shell talking to WSL tmux)** — the same promises, plus native menus and
chrome, plus a signed NSIS installer that still shows a SmartScreen warning on first run (§D.4.1). It
would additionally not do: the setsid'd-tool-child status oracle, which has no Windows analogue at all
(§B #23), so a Windows Tortie cannot tell "waiting on a blocked tool call" from "idle"; exact capture
for six of the twelve agents without new machinery; `muse` at all; and it would carry a ConPTY
fidelity tax on the attach stream unless the control-mode carriage is built and proved.

**Under B or C** — the promises stop being true, which is why both are refused (§A.2.4, §A.2.7).

**What would be permanently worse than the macOS build on any Windows**, and these do not depend on
which option is chosen: the Tier-2 status oracle (no session-leader concept, no STAT column, no
process groups); `O_NOFOLLOW` silently absent so the credential write guard follows links (§B #6); the
danger-flag seal under DPAPI, which Electron's own docs say does not protect against other apps in the
same userspace; the manifest living in Roaming `%APPDATA%` where a WAL database can be synced to cloud
storage; no kernel-side `.git` exclusion for the watcher; no "rank Alternate" for document types, so
the *never seizes anyone's default app* promise needs re-proving; and a first-run SmartScreen warning
that **no purchasable certificate removes** for a product with one user.
