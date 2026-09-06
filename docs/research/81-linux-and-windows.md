# 81 — What shipping Tortie on Linux and Windows would cost

Research for Phase 216, `Phase 216: the cost of Linux and Windows`, asked by the operator on
2026-09-06. Research only: this phase changes no shipping code, adds no `electron-builder.yml`
target and adds no CI lane. It prices options and recommends; the operator chooses.

The charter in `docs/BACKLOG.md` splits the question into six parts. **This file currently holds
part D (distribution and packaging), the CI half of part D, and part E (self-update).** Parts A (the
session substrate), B (every macOS mechanism and what replaces it), C (the agents) and F (the honest
total) are written by the other builders of this phase and are merged in by the integrator. Where §D
needs an answer from §A it says so by name rather than guessing.

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

1. **Linux: ship AppImage and deb, and nothing else.** They are the two formats electron-builder cuts
   today with no sandbox to fight, they are the two `electron-updater` can update in place, and
   between them they cover "download and run" and "install it properly". Both are UNMEASURED on a
   real Linux box and both are cheap to try.
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
   **there is no tmux on Windows**, which is §A's question, and until §A answers it a Windows
   installer would package a product that cannot keep the promise on the first page of
   `docs/ZEN-OF-TORTIE.md`. Refusing Windows is the answer this section recommends, and §D.7 states
   exactly what would have to change to flip it.
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
entry says **338 files under `src/main` name tmux**. A Windows package is not blocked by packaging.

---

### D.3 Linux — the five formats, priced

Every capability claim in this section was read out of `node_modules/app-builder-lib@26.15.3` and
`node_modules/electron-updater@6.8.9` in this worktree on 2026-09-06.

electron-builder 26.15.3 ships target implementations for **appimage, snap, flatpak, fpm
(deb/rpm/pacman/apk/…), nsis, appx, msi, msi-wrapped, pkg and archive** — read by listing
`node_modules/app-builder-lib/out/targets/`. So all five Linux formats the operator named are
"supported" in the sense that a target class exists. What differs enormously is what the *host* needs
and what the *user's machine* needs.

#### D.3.1 AppImage — ship it

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
- **Nested binaries.** AppImage is not a sandbox. It is a self-mounting archive; everything inside runs
  with the user's ordinary privileges and sees the user's ordinary `$HOME` and `$PATH`. specstory, rg
  and a bundled tmux all work, and a tmux server started from inside it **outlives the app** exactly
  as on macOS, because there is no container to tear down. This is the single most important
  compatibility fact in this whole section.
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
  FUSE/toolset decision has to be revisited when the beta toolset goes stable, and that is about it.

#### D.3.2 deb — ship it

- **What electron-builder produces.** `FpmTarget` shells out to a **bundled** fpm 1.17.0. The toolset
  table in `toolsets/linux.js` lists `fpm-1.17.0-ruby-3.4.3-darwin-arm64.7z` among five builds, so
  **a `.deb` is buildable on the operator's Mac** with no Docker and no Linux box.
- **Nested binaries.** A `.deb` is a tarball with a control file. No confinement whatsoever. Everything
  works, and the tmux server outlives the app.
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
- **Cost to set up:** one line in the target list plus a `deb.depends` list. **Cost to keep:** the
  dependency list drifts as distros move; low.

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
| **AppImage** | Mac (FUSE2 toolset) or Linux | small | small | none | **yes**, no sandbox at all | `AppImageUpdater`, differential, no prompt | none | **SHIP** |
| **deb** | Mac (bundled fpm) or Linux | small | small | none | **yes** | `DebUpdater`, `dpkg` behind a `pkexec`/`sudo` prompt every time | none | **SHIP** |
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

### E. Phase 24's self-update — does it generalise?

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

### D.7 What would have to change for the Windows refusal to flip

Stated so a later round does not have to guess.

1. **§A produces a Windows session substrate that keeps the durability promise** — a WSL2 tmux, or a
   Tortie-owned ConPTY supervisor that survives the app's death and can resume a conversation. Until
   that exists, everything in §D.4 is packaging for a product that does not work.
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
`-L gmux` from a bundled tmux, the sessions survive quitting the app, and the AppImage updates itself
silently the way the Mac does.

**What would be permanently worse than the macOS build:**

- **No code signature means no integrity story.** macOS gets Developer ID, notarization, stapling and
  a designated-requirement check on every self-update. Linux gets a GPG signature nothing verifies.
  The best available substitute is the `attest-build-provenance` step the release lane already runs,
  extended to the Linux artifacts — which is real, and which nobody's desktop checks.
- **The deb self-updates behind a password prompt**, or does not self-update at all.
- **The AppImage may need `libfuse2t64` installed by hand** on the two most common Ubuntu releases,
  unless Tortie opts into a toolset electron-builder labels beta.
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
| Whether a tmux server started inside an AppImage really outlives the app | `GMUX_SMOKE=create` then quit, then `GMUX_SMOKE=verify` — the existing T1 smoke, unchanged, on Linux |
| Whether `-ApplePersistenceIgnoreState YES` is inert to a Linux Electron | run any smoke script on Linux |
| Whether cross-compiling `node-pty` and `better-sqlite3` for linux from darwin works | it should not be attempted; use native runners |
| Whether `windows-11-arm` has an MSVC toolchain for `electron-rebuild` | one `npm ci` on that runner |
| Whether Ita Vero LLC is accepted for Azure Artifact Signing Public Trust | only an application settles it; needs a paid Azure subscription |
| The real artifact size of each Linux and Windows package | build them |
| Whether Flathub would grant `--talk-name=org.freedesktop.Flatpak` **and** waive the source-build rule for the specstory binary | a submission, which is not worth making |
