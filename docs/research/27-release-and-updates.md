# 27 — Release, versioning and self-update

**Measured 2026-08-12** on the build machine · macOS 15.7.9 (24G830) arm64 ·
Apple M4 Pro (12 cores, 48 GB) · Xcode 26.3 · notarytool 1.1.0 · node v22.23.1 ·
npm 10.9.8 · electron 43.3.0 (latest stable **43.4.0**, published 2026-08-11) ·
electron-builder 26.15.3 (GitHub latest 26.15.7) · electron-updater 6.8.9 ·
Tortie 0.0.1 · installed at `/Applications/Tortie.app` · live private tmux server
`-L gmux` with 44 sessions · 40-row manifest · **no git remote yet**.

This document is the banked research for the phase that gives Tortie a version
scheme, a release ritual, a self-update path and the CI that keeps the loop
fast. It merges three independent investigations run the same day — versioning
and data compatibility, the updater and its signing prerequisite, and CI — and
reconciles them where they disagreed. Two disagreements were real and are
resolved in the text: the **starting version number** (§3.3) and **whether
`conformance:resume:capture` belongs in CI** (§7.2). Both resolutions are
flagged where they land.

Everything in §1, §2, the probe in §4.2 and the timings in §7.4–§7.5 was
executed on this machine today. Everything else is cited to a primary source
fetched today. Where a claim could not be verified it is named as such in §10
rather than rounded up.

---

## 0. The decision

Four sentences, each with the reason that forced it.

1. **Version scheme — semver, `0.MINOR.PATCH`, first tagged release `0.18.0`.**
   Not taste: `electron-updater` parses the *running app's own* version with the
   `semver` package and throws `ERR_UPDATER_INVALID_VERSION` if it fails, and the
   natural CalVer shape `2026.08.1` is **invalid semver** (leading zeroes are
   forbidden in numeric identifiers — measured, §3.1). The minor is seeded from
   the phase number because this repo already thinks in phases, and pre-1.0 the
   app version *cannot* carry the compatibility statement — which is why §4's
   schema numbers exist and are not optional.

2. **Release process — `npm version`, a hand-written changelog entry, gates,
   candidate run, then a draft GitHub Release promoted by a human.** No
   semantic-release, no release-please, no changesets: all four were checked at
   today's versions (§3.6) and each removes the human from the one decision that
   must stay human — *is now a safe moment to replace the app somebody has 44
   live sessions in?* — or needs pull requests this repo does not have.

3. **Updater — `electron-updater` 6.x, publishing **ZIP** + `latest-mac.yml` to
   GitHub Releases, with Squirrel.Mac underneath.** It is already a transitive
   part of the toolchain that builds the app, macOS delta updates do work
   (landed 6.2.0, re-landed 6.3.0 — and the `.blockmap` files are already being
   emitted today), and the alternatives lose on maintenance risk rather than on
   features: Sparkle 2.9.5 is the better framework but its only published
   Electron bridge has four stars, and Velopack is pre-1.0 with a Vite/`.node`
   collision (§5.1–§5.6).

4. **CI — GitHub Actions, hosted macOS arm64, four lanes: `gates` on every PR
   and push to `main` (~6 min), `durability` nightly, `compat` weekly on
   `macos-26`, `release` on `v*` tags only.** Hosted macOS runners have an
   emulated display, so Electron opens windows and every agent-free durability
   harness runs there; the agent layer cannot, because it needs installed CLIs
   and live credentials, and that boundary — not cost — is what decides the
   shape (§7.2, §7.8).

### 0.1 The five findings that decided them

1. **A Developer ID Application certificate already exists on this machine.**
   `Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)`, valid to
   2031-06-02, with an App Store Connect key beside it at
   `~/.appstoreconnect/private_keys/AuthKey_8NH6JLTWBN.p8`, plus notarytool 1.1.0
   and stapler. **`BUILD-STATUS.md` §6 and the header of `electron-builder.yml`
   both say only an Apple Development cert exists. They are stale, and they are
   the only recorded blocker.** Nothing needs buying or applying for. The single
   missing credential is the App Store Connect *issuer UUID*, which is a
   two-minute copy-paste. §1.1.

2. **Self-update is not merely unwired — it is structurally impossible today.**
   The installed app has no `_CodeSignature` at all (`identity: null` skips
   `signApp`), so its designated requirement is a literal `cdhash` of this one
   build, and Squirrel.Mac verifies every update against the running app's
   designated requirement. No future build can satisfy a cdhash. **Signing is
   not a polish item preceding updates; it is the update feature.** §1.2–§1.3.

3. **An update genuinely does nothing to the work — measured, not assumed.**
   The tmux server (pid 3948, up since 9 August, 44 sessions) runs
   `/opt/homebrew/bin/tmux` from outside the bundle; the manifest and snapshots
   are in userData; zero files have been written inside the bundle since
   install; a running process survives its bundle being `mv`'d aside and then
   `rm -rf`'d; and the app is user-owned on the same APFS volume as staging, so
   the swap is atomic and needs no admin prompt. §2.

4. **Three defects stand between here and a safe update, all found by testing
   rather than reading.** `supervisor.ts:99` passes `-f <confPath>` on every
   tmux call and that path is inside the bundle an update replaces — harmless
   while a server runs, but on a **cold start with the file missing tmux
   silently starts a server at `history-limit 2000` instead of Tortie's 25000**,
   exit 0, no error (§2.5). There is **no single-instance lock** anywhere in
   `src/main/`, and every updater ends by relaunching (§2.7). And there is **no
   release gate** on `codesign --verify --deep --strict`, which is why the
   current build fails it unnoticed (§1.2).

5. **The downgrade story is "refuse, never reverse", and Tortie is one of the
   few apps that can afford it.** A measured probe of migrations 001–005 plus a
   hypothetical 006 shows a breaking migration makes the *older* build throw at
   `insertSession()` — Step 0 of session creation, i.e. when the user tries to
   start work — while an *additive* one succeeds silently and leaves load-bearing
   columns NULL. The answer is a `min_compatible_version` and a blocking refusal
   screen, and it costs the user **visibility, not work**, because the sessions
   are in tmux. §4.

### 0.2 The shortest possible statement of what must be true before the first update ships

`app.requestSingleInstanceLock()` · the conf-path assertion and `history-limit`
read-back · a Developer ID signature with hardened runtime, notarized and
stapled · `codesign --verify --deep --strict` as a release gate · a
`min_compatible_version` in the manifest and the refusal that reads it · and one
end-to-end update installed over this machine with live sessions, twice, with
the session-id list byte-identical afterwards.

---

## 1. What is actually on this machine (measured)

### 1.1 The signing identity that BUILD-STATUS says does not exist

```
$ security find-identity -v -p codesigning
  1) C5D13BEB…  "Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)"
  2) DB676305…  "Apple Development: Gregory Ceccarelli (4JU99365LU)"
     2 valid identities found

subject= UID=4GRQMF5T5U, CN=Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U),
         OU=4GRQMF5T5U, O=Gregory Ceccarelli, C=US
issuer=  CN=Developer ID Certification Authority, OU=G2, O=Apple Inc., C=US
notBefore=Jun  1 22:57:19 2026 GMT
notAfter= Jun  2 22:57:18 2031 GMT
```

A Developer ID Application certificate can only be issued to an **active Apple
Developer Program membership** ($99/yr, [Apple][apple-fee]). It is valid for
another **four years and ten months**. Team ID `4GRQMF5T5U`.

Also present:

```
$ xcrun --find notarytool   → /Applications/Xcode.app/…/usr/bin/notarytool  (1.1.0)
$ xcrun --find stapler      → /Applications/Xcode.app/…/usr/bin/stapler
$ ls ~/.appstoreconnect/private_keys/
  AuthKey_8NH6JLTWBN.p8      (created 2026-07-22, mode 0600)
```

So the notarization key ID is `8NH6JLTWBN`. **The one credential I could not
find on disk is the App Store Connect *issuer* UUID**, which `notarytool`
needs alongside the key. It is not in the shell rc files, not in `~/.config`,
and there is no saved `notarytool store-credentials` keychain profile. It is
one copy-paste from App Store Connect → Users and Access → Integrations → Keys.
I did not guess it, so I did not run a live notarization round-trip; that is the
single unverified step in this whole document, and it is a two-minute step.

### 1.2 The installed app is not signed at all — not even ad-hoc

`electron-builder.yml` says *"electron-builder ad-hoc signs arm64 so the app
still launches locally"*, and BUILD-STATUS §4 records the bundle's signature as
"ad-hoc". Both are wrong about what is on disk:

```
$ ls /Applications/Tortie.app/Contents/_CodeSignature
ls: … No such file or directory                      ← no bundle signature exists

$ codesign -dv --verbose=4 /Applications/Tortie.app
Identifier=Electron                                  ← not com.specstory.tortie
CodeDirectory v=20400 … flags=0x20002(adhoc,linker-signed)
TeamIdentifier=not set

$ codesign --verify --deep --strict /Applications/Tortie.app
/Applications/Tortie.app: code has no resources but signature indicates they must be present

$ spctl -a -vvv -t exec /Applications/Tortie.app
/Applications/Tortie.app: code has no resources but signature indicates they must be present
```

`identity: null` makes electron-builder skip `signApp` entirely. What remains is
the **linker's** ad-hoc signature on each Mach-O — `Identifier=Electron`,
`Electron Helper`, `Electron Framework`, all `flags=0x20002 (adhoc,
linker-signed)`. There is no `CodeResources`, so the bundle fails its own strict
verification. The app runs only because it was built here and never carried a
quarantine attribute.

The one part that *is* signed the way the build intends is the nested CLI, which
`build/sign-nested-binaries.cjs` signs deliberately:

```
$ codesign -dv /Applications/Tortie.app/Contents/Resources/bin/specstory
Identifier=com.specstory.tortie.specstory
flags=0x10002(adhoc,runtime)                        ← hardened runtime, as designed
```

That hook did its job. Nothing sealed the bundle around it.

### 1.3 Why that kills self-update, specifically

Squirrel.Mac — which Electron's `autoUpdater` embeds and which electron-updater
drives on macOS — takes the **designated requirement of the currently running
application** and requires the downloaded update to satisfy it:

```objc
// Squirrel/SQRLUpdater.m:234
_signature = [SQRLCodeSignature currentApplicationSignature:&error];
// …:848  → [signature verifyBundleAtURL:updateBundle.bundleURL]

// Squirrel/SQRLCodeSignature.m:127
SecStaticCodeCheckValidityWithErrors(staticCode,
    kSecCSCheckNestedCode | kSecCSStrictValidate | kSecCSCheckAllArchitectures,
    (__bridge SecRequirementRef)self.requirement, &validityError);
```

`SQRLInstaller.m` re-derives the requirement from the target bundle on disk and
verifies again immediately before the swap (lines 261–264). Two independent
checks, both against a designated requirement.

Tortie's designated requirement today:

```
$ codesign -d -r- /Applications/Tortie.app
# designated => cdhash H"d9244a80cc5820eaeb63618fb9d14e88356abe37"
```

That is a hash of **this exact build**. No future build can ever satisfy it —
that is what a cdhash means. Add `kSecCSCheckNestedCode | kSecCSStrictValidate`
against a bundle with no `CodeResources` and the verification fails before the
cdhash even matters.

With a Developer ID signature the designated requirement becomes the standard
identifier-plus-anchor form (`identifier "com.specstory.tortie" and anchor apple
generic and certificate leaf[subject.OU] = "4GRQMF5T5U"`), which is stable
across every build signed by that team. **This is the whole ballgame.** Every
updater option in §4 depends on it, including the ones that do not use
Squirrel.

### 1.4 A second, quieter cost of not signing: TCC

macOS keys privacy grants to the app's code-signing identity, not just its
bundle ID. Ad-hoc signatures produce a new identity on every build, so
permissions do not persist across rebuilds ([HackTricks, macOS TCC][tcc]).
Phase 16.5 already paid this bill once for the bundle-ID change and documented
it in BUILD-STATUS §7.3.

The consequence for updates is concrete: **as long as Tortie is ad-hoc signed,
every update would re-ask for Full Disk Access, Automation and Accessibility.**
Signing with Developer ID costs that re-prompt exactly **once more** — the
transition from cdhash identity to team identity — and then never again. Worth
saying to the user in the release notes for the first signed build, in the same
one-time-notice shape `src/main/migrate/notice.ts` already implements.

---

## 2. The Tortie-specific constraint, tested rather than assumed

The premise: sessions live in a private tmux server and survive the app being
replaced. Phase 17 proved it for a manual swap. An automated update is the same
swap performed by ShipIt, so the question is whether anything in the automated
path differs. I tested the parts that could.

### 2.1 The server on this machine has already outlived two app identities

```
$ ps -o pid,lstart,command -p 3948
 3948 Sun Aug  9 19:10:25 2026  /opt/homebrew/bin/tmux -L gmux \
                                -f /Users/gdc/gmux/resources/gmux-tmux.conf start-server
$ tmux -L gmux ls | wc -l
      44
```

Up since **9 August**, 44 sessions, across the Phase 16.5 rename *and* the
Phase 17 app replacement. The tmux binary is `/opt/homebrew/bin/tmux` — outside
the bundle — so replacing `Tortie.app` cannot touch the server process, its
binary, or its sessions. That part needs no defending.

### 2.2 Durable state is entirely outside the bundle

```
~/Library/Application Support/Tortie/
  .userdata-migration.json  .rename-notice-shown
  gmux/manifest.db  (69,632 B)  manifest.db-wal  snapshots/ (45 entries)  hooks/
```

and, on the other side:

```
$ find /Applications/Tortie.app -newermt "2026-08-12 01:30" -type f | wc -l
       0
```

Nothing has been written inside the bundle since it was installed. The bundle is
genuinely disposable; the manifest, snapshots, settings and hotkeys are not in
it. **An update must do nothing to either, and by construction it cannot.**

One nuance worth recording. The `.updaterId` file electron-updater uses for
staged-rollout bucketing is written to `app.userDataPath`
(`AppUpdater.ts:723-724`), i.e. into the same directory as the manifest. That is
correct and desirable — the bucket must be stable across updates — but it means
any future userData migration has one more file to carry.

### 2.3 A running process does not care that its bundle was replaced

Measured with a real long-running process whose binary sat in a
`Contents/Resources/bin/` layout, sandbox disabled, confined to the scratchpad:

| what was done to the bundle | running process after |
|---|---|
| whole bundle replaced by `mv` (the ShipIt pattern) | **alive** |
| old bundle then `rm -rf`'d | **alive**, `lsof` still shows the unlinked image mapped |
| binary overwritten **in place** with random bytes | alive through a 2 s window — see below |

The first two are the ones that matter and they are unambiguous: rename-and-
delete of an app bundle is invisible to processes already running out of it,
because the vnode outlives the directory entry. That is exactly what ShipIt
does, and it is why agents inside tmux panes cannot be disturbed by an update.

The third deserves an honest caveat rather than a clean claim. The process
survived my two-second observation window because the pages it needed were
already resident. The hazard with in-place overwrite is **deferred, not
absent**: a later page-in of a modified page in a code-signed binary is a
signature violation and the kernel kills the process. The operational rule is
unchanged and absolute — **an installer must replace by rename and never
overwrite in place** — and Squirrel.Mac obeys it.

(Aside worth recording so the next agent does not lose an hour to it: copies of
macOS *platform* binaries such as `/bin/sleep` are `SIGKILL`ed on exec once
re-signed, and re-signing an already-signed binary like `node` ad-hoc gets it
`SIGTRAP`ed at dyld. Neither is relevant to the question; both look exactly like
"my test failed". The bundled specstory binary copied to a scratch directory and
re-signed ad-hoc+runtime runs fine — `2.8.0 (SpecStory)`, exit 0.)

### 2.4 No admin prompt is needed to install an update

```
$ ls -ld /Applications /Applications/Tortie.app
drwxrwxr-x  66 root  admin   /Applications
drwxr-xr-x@  3 gdc   staff   /Applications/Tortie.app
$ dsmemberutil checkmembership -U gdc -G admin  → user is a member of the group
$ df /Applications ~/Library/Caches  → both /dev/disk3s5
```

The app is owned by the user, `/Applications` is group-writable by `admin`, and
the staging directory and the install destination are on the same APFS volume,
so the final `rename()` is atomic. Squirrel.Mac can swap the bundle with no
authorization dialog. (If Tortie is ever installed by a different user or into a
root-owned location, ShipIt would need authorization — worth a startup check
before offering updates at all.)

### 2.5 The one real coupling — and it fails silently

`src/main/tmux/supervisor.ts:99` builds **every** tmux invocation as:

```ts
return ['-L', ctx.socket, '-f', ctx.confPath, ...rest];
```

and `resolveConfPath()` returns `process.resourcesPath/gmux-tmux.conf` when
packaged — that is, a file **inside the bundle an update deletes and recreates**.
`src/main/attach/attach-host.ts:190` does the same.

Tested on a scratch socket (never `-L gmux`):

```
# server already running, conf file then deleted:
tmux -L probe -f <deleted> list-sessions   → exit 0, sessions listed
tmux -L probe -f <deleted> new-session -d  → exit 0, session created
```

Good: mid-update, with the server up, a missing conf is a non-event. tmux only
reads `-f` when it starts a server.

But the cold-start case is worse than a crash would be:

```
# NO server running, conf file missing:
tmux -L cold -f <missing> new-session -d -s cold1   → exit 0   (no error!)
tmux -L cold show-options -g history-limit          → history-limit 2000
tmux -L probe show-options -g history-limit         → history-limit 25000
```

tmux **silently ignores a missing `-f` file** and starts a server with defaults.
Tortie's `resources/gmux-tmux.conf` sets `history-limit 25000`; the default is
2,000. So a boot in which the conf is absent — a partially applied update, an
interrupted install, a bundle whose resources did not land — produces a private
tmux server whose scrollback capacity is **8% of what the product promises**,
with no error anywhere. Scrollback is the thing Restore replays. This is a
silent-degradation bug in the class CLAUDE.md reserves Tier 3 for, and it exists
today independently of updates; updates simply create a new way to reach it.

**Required before shipping updates** (all cheap, all in `src/main/tmux`):

1. `resolveConfPath()` asserts the file exists when `app.isPackaged` and raises a
   typed error rather than returning a path into the void.
2. After `ensureServer()`, read back one sentinel option (`history-limit`) and
   log loudly — or refuse — if it is not the configured value. This catches the
   general case, including a server someone else started on the socket.
3. Consider not passing `-f` at all when a server is already running. It is
   dead weight on every invocation and it is the only reason a bundle path is on
   the hot path.

### 2.6 What the manifest records about the bundle

```
$ sqlite3 <copy of manifest.db> "select count(*) from sessions;"                     → 40
$ … "select count(*) from sessions where argv like '%.app/%' or resume_argv like '%.app/%';" → 0
$ … "select count(*) from sessions where specstory is not null;"                     → 0
```

Today **no manifest row depends on a path inside the app bundle**, because these
40 sessions were created by dev runs and none has capture on. The mechanism the
Phase 16.5 brief warns about is nonetheless live: a captured session records the
absolute `Contents/Resources/bin/specstory` it launched under, in both `argv`
and `resume_argv`.

For updates specifically this is **benign, and for a reason worth stating**: an
update replaces the bundle *at the same path*, so `/Applications/Tortie.app/
Contents/Resources/bin/specstory` still resolves — to the new version. Combined
with the Phase 15.1 re-resolution in `armableResumeArgv`, the failure mode the
rename produced cannot recur from an update. The residual risk is different: a
captured session's recorded `bin_version` will silently differ from the binary
that resume actually runs. That is acceptable and should simply be documented,
not engineered around.

### 2.7 The gap an update would walk straight into

```
$ grep -rn "requestSingleInstanceLock\|second-instance" src/main/
(no matches)
```

**Tortie has no single-instance lock.** Every updater ends with "relaunch the
app", and Squirrel's relaunch races the old process's exit. Two Torties against
one SQLite manifest (WAL, `manifest.db-shm` present) and one tmux server is not
a theoretical problem — it is a manifest-corruption problem and a
double-adoption problem. `app.requestSingleInstanceLock()` is a ten-line fix and
it is a **prerequisite** for any auto-update work, not a follow-up.

Related, and in Tortie's favour: `src/main/index.ts:1675` defers the first
`before-quit` so `shutdownGmuxCore()` can write app-quit snapshots, bounded at
8 s. Squirrel.Mac installs *after* the process terminates, so this ordering is
already correct — snapshots flush, then the glass is replaced. Any updater that
installed *before* quit completed would break it.

### 2.8 Summary of what an update touches

| Thing | What an update does to it | Verified by |
|---|---|---|
| tmux server (`-L gmux`) and its 44 sessions | **nothing** — separate process, binary outside the bundle | §2.1, §2.3 |
| Agents/PTYs inside panes | **nothing** — vnodes outlive the bundle | §2.3 |
| `manifest.db`, snapshots, settings, hotkeys | **nothing** — all in userData | §2.2 |
| Recorded absolute specstory path in captured rows | still resolves; now points at the new version | §2.6 |
| `gmux-tmux.conf` (inside the bundle) | replaced; harmless while a server runs, **silently degrading on cold start** | §2.5 |
| TCC grants | preserved across signed updates; **one** final re-prompt at the ad-hoc → Developer ID transition | §1.4 |
| Login item (SMAppService) | preserved — same bundle ID, same path | `index.ts:1634` |
| Renderer localStorage (split layout, zoom) | preserved — userData | BUILD-STATUS §7.9 |

The honest headline: **Tortie is unusually safe to auto-update, and the reason
is the same reason it exists.** An update is the glass being replaced while the
work keeps running.

---

## 3. Versioning

The version number is a **compatibility statement about the user's data**, not a
marketing device. Everything in this section follows from that, and from the one
hard mechanical constraint in §3.1.

| Question | Answer |
|---|---|
| Semver or CalVer? | **Semver.** `electron-updater` throws `ERR_UPDATER_INVALID_VERSION` on a version `semver` cannot parse, and the natural CalVer shape `2026.08.1` **is not valid semver** (measured, §3.1). |
| Where does 0.0.1 go? | **`0.18.0` at the first tagged release** — the minor seeded from the phase it ships from. Stay on `0.x` until an update has been installed over a machine with live sessions, twice. `1.0.0` has a definition (§3.3), not a vibe. |
| Does a manifest migration force a major? | **No — only a non-backward-readable one does**, and which class a migration is in is *measurable*, not a judgement call (§4.2). Additive migrations are minor. |
| Does a bundled-binary bump force a major? | **No.** specstory/ripgrep/tree-sitter are implementation details of the app, not of the user's data. The bump only matters if it changes a *recorded durable artifact* — and then it is the schema rule that decides, not the binary. |
| Beta channel? | **Not today.** One user, then ~ten. The zero-cost preparation is to keep versions semver-clean; the day a second person is handed a build, `0.19.0-beta.1` *is* the beta channel with no code change (§3.4). |
| changesets / release-please / semantic-release / release-it? | **None of them, yet.** `npm version` + an annotated tag + a hand-written changelog. Each tool's 2026 state and the mechanical trigger that would reopen it: §3.6. |
| Downgrade story? | **Refuse, never reverse** (§4.4). |

### 3.1 Semver, not CalVer — with the constraint that decides it

CalVer is attractive for a desktop app with no API: the number tells the user how
old their build is, which is roughly the only thing the number means. Two facts
kill it here.

**Fact 1 — the updater parses semver and only semver.** From
`electron-updater`'s `AppUpdater.ts` (master, fetched 2026-08-12):

```ts
throw newError(`App version is not a valid semver version: "${currentVersionString}"`,
               "ERR_UPDATER_INVALID_VERSION")
...
const isLatestVersionNewer = isVersionGreaterThan(latestVersion, currentVersion)  // semver.gt
```

The running app's own version is parsed at startup and compared with `semver.gt`
/ `semver.lt`. A version string the `semver` package rejects does not produce a
"no update" — it produces a throw.

**Fact 2 — the obvious CalVer shape is invalid semver.** Measured:

```
0.0.1              valid= 0.0.1          2026.8.1    valid= 2026.8.1
2026.08.1          valid= null   ← leading zero      2026.8.0-beta.1  valid= 2026.8.0-beta.1
gt('2026.10.1','2026.8.1') = true                    gt('1.0.0','1.0.0-beta.1') = true
```

Semver forbids leading zeroes in numeric identifiers, so a zero-padded month is
an invalid version and an app that ships one cannot check for updates. CalVer is
therefore only usable here disguised as semver (`2026.8.1`), at which point it
has bought nothing and added a footgun that fires in August of any year someone
writes `08`.

**Fact 3 — semver's major slot is the one Tortie actually needs.** The question
a Tortie user asks before installing is not "how old is this" but "will this
still see my sessions". That is precisely what a major bump exists to signal, and
§3.2 defines it in exactly those terms. CalVer has no slot for it.

Decision: **semver**, and the number is a *compatibility statement about the
user's data*, not a marketing device.

---

### 3.2 What counts as major / minor / patch, here

The rule is keyed to Tortie's actual promise ("the application may come and go;
the session continues"), not to code churn.

**MAJOR** — the durability contract changes such that the previous build can no
longer safely operate on this user's data or sessions. Any one of:

1. A manifest migration that is **not backward-readable** — a column rename, a
   drop, a retype, a `NOT NULL` without default, a table rebuild. Measured
   consequence: the previous build throws at `insertSession()`, which is *Step 0
   of session creation*, so the failure lands when the user tries to start work
   (§4.2).
2. A change to any identifier live sessions are bound to — the tmux socket
   `-L gmux`, the `@gmux-*` session options, the `GMUX_SESSION_ID` /
   `GMUX_MANAGED` pane env, `resources/gmux-tmux.conf`, the inner
   `<userData>/gmux/` directory. CLAUDE.md forbids these; a major is what it
   would cost if the ban were ever lifted deliberately.
3. A userData relocation (what Phase 16.5a actually was — and note it shipped as
   *no version change at all*, see §3.5's finding about `release/`).
4. Dropping the ability to adopt sessions created by the previous major.

**MINOR** — new capability, or an additive data change that the previous build
survives:

- an **additive** manifest migration (nullable column, or `NOT NULL DEFAULT`) —
  measured safe for older builds;
- a new user-visible feature or a new agent in the registry;
- an **Electron major** bump (43 → 44): new Chromium, new renderer behaviour,
  worth a minor even when nothing user-visible changed;
- a bundled-binary bump that changes behaviour (specstory 2.8 → 3.0, a ripgrep
  major, a new tree-sitter grammar);
- a new settings field.

**PATCH** — fixes, performance, copy, icons, and dependency patch/minor bumps,
including **Electron security patches** (43.3.0 → 43.4.0). No schema change, no
new capability.

Two consequences worth stating out loud:

- **Electron dominates the patch cadence.** Verified 2026-08-12: Electron ships a
  new major every 8 weeks, supports the latest three majors (41/42/43 today), and
  *only the latest minor of each line gets the security fix*. This tree is on
  43.3.0; 43.4.0 is out. Whatever the release ritual is, it must be cheap enough
  to run for "bump Electron, ship" roughly fortnightly, or Tortie will sit on
  known-vulnerable Chromium.
- **The migration class is the only hard input to the bump decision**, so make it
  mechanical: require a git trailer on any commit that adds a migration —

  ```
  Manifest-Migration: 006-restore-state (additive)
  ```

  `additive` | `breaking`. A release script greps the tag range for the trailer
  and *derives* minor-vs-major instead of asking someone to remember. A CI check
  that any diff touching `MIGRATIONS` carries the trailer makes it executable —
  the same shape as the resume-conformance gate that already exists.

---

### 3.3 Pre-1.0, and what 1.0 would mean

Tortie is `0.0.1` and is one person's daily driver holding 44 live sessions. The
version understates it, and `0.0.x` has no room to express the distinction in
§3.2.

**Go to `0.18.0` at the first tagged release** — `0.MINOR.PATCH`, with the minor
*seeded* from the phase it ships from. Two dimensions of this research disagreed
here and this is the reconciliation: one argued for the conventional `0.1.0`,
the other for making the minor the phase number, because BACKLOG, BUILD-STATUS
and every commit message already think in phases and a version that indexes the
build story is strictly more informative at zero cost. The phase number wins as
a *seed*; the rule below governs afterwards, and the two will drift the first
time a phase ships two releases (the second is a patch) or a release ships
without a phase. Either way the updater does not care —
`semver.gt('0.19.0','0.18.9')` is true regardless.

**And the honest caveat that makes §4 non-optional.** The ordinary `0.x`
convention reads the slots one place left, so MINOR carries the major meaning —
which means pre-1.0 there is **no slot left** to distinguish "new capability"
from "your old build can no longer read this file". The app version therefore
cannot carry the compatibility statement until 1.0. That is not a reason to
delay 1.0; it is the reason the manifest's own `min_compatible_version` (§4.3)
is the primary mechanism and the app version is only ever the label on it.

**`1.0.0` when all three are true** (each is already a named deferral in
BUILD-STATUS §6, so this costs no new scope):

1. Developer ID signing + hardened runtime + notarization + stapling — the app
   installs on a machine that is not the build machine without a Gatekeeper
   ritual;
2. an update has been installed over a running machine **twice**, with live tmux
   sessions present before and after, and the manifest row count byte-identical
   (the Phase 17 switchover evidence, repeated as a gate);
3. the downgrade refusal of §4.4 exists in code, with the compatibility number
   it reads.

Until then `0.x` is honest, and honesty is cheap: nobody is depending on Tortie's
version to plan anything.

---

### 3.4 Channels: none today, and one line away when needed

Recommendation: **stable only.** No beta channel until there is a second user.

Why not: verified in `AppUpdater.ts`, the prerelease semantics are subtle enough
to be a maintenance burden for an audience of one.

- `allowPrerelease` "defaults to `true` if application version contains
  prerelease components … otherwise `false`", and if true it **forces
  `allowDowngrade = true`".
- The `channel` setter *also* forces `allowDowngrade = true`:
  `set channel(value) { … this._channel = value; this.allowDowngrade = true }`.
- Consequence, reported repeatedly upstream: a user parked on `beta` can be
  pulled onto an `alpha`, and downgrades become permissible as a side effect of
  a line you wrote for an unrelated reason.

A second channel is a second `*-mac.yml` feed to keep green, a second matrix cell
for every durability claim, and a new class of bug (channel/downgrade
interaction) — bought for nobody.

What replaces it at n=1 is already the house practice, and should simply be
named: **the candidate run.** Phase 17 built the app, ran the packaged bundle
from `release/mac-arm64/Tortie.app` against a scratch `--user-data-dir`, verified
it, and only then replaced the installed copy. That *is* the beta channel; it
costs one command and touches no real data.

The zero-cost preparation for the day a channel is wanted: keep every version
valid semver and never publish a prerelease-tagged version by accident.
electron-builder infers the channel from the prerelease component (version
`0.19.0-beta.1` ⇒ channel `beta` ⇒ `beta-mac.yml`), so the channel arrives with a
version string, not a refactor.

**And the one thing that will force the day early.** Doyensec's February 2026
threat model for Electron updaters names "untested version" — dev or candidate
builds reaching production clients — as a real attack class, and separate
channels are its stated mitigation. So the rule is not "no channels ever", it is
**no channel until a build leaves this machine for a second person, and a
channel the moment one does.** Until then the candidate run above *is* the
isolation, because the build never leaves.

---

### 3.5 How the version is derived and stamped

**What exists today, verified on the installed app:**

| Layer | Value | Source |
|---|---|---|
| `package.json` `version` | `0.0.1` | hand-edited |
| `CFBundleShortVersionString` | `0.0.1` | electron-builder ← package.json |
| `CFBundleVersion` | `0.0.1` | electron-builder `buildVersion`, defaults to version |
| `app.getVersion()` → About | `0.0.1` | `src/main/menu.ts:411` |
| About's second field | short SHA, `-dirty` if the tree was edited | `__TORTIE_BUILD_COMMIT__` define in `electron.vite.config.ts` → `src/main/build-info.ts` |
| Artifact filenames | `Tortie-0.0.1-arm64.dmg` | `artifactName: ${productName}-${version}-${arch}.${ext}` |

This is already better than most Electron apps: the commit stamp answers "is what
I am running what is in git?" without a build log, and the `-dirty` suffix is
load-bearing.

**Finding — the version has never moved, and `release/` proves why that matters.**
The directory currently holds *both*:

```
gmux-0.0.1-arm64.dmg      Tortie-0.0.1-arm64.dmg
gmux-0.0.1-arm64.zip      Tortie-0.0.1-arm64.zip   (+ blockmaps)
```

Two materially different applications — different bundle id, different userData,
different helper names — shipping under the same version string. Nothing broke
because nothing consumed the number. The moment an update feed exists, a version
string is a *key*, and two artifacts sharing one is how a user gets served a
build they already have (or worse). The rename should have carried a version bump
of its own; the rule that follows is **never cut two artifacts at one version** — which is exactly
what §3.7's checklist enforces.

**Recommendations:**

1. **`package.json` stays the single source.** Never hand-edit Info.plist; never
   pass `--c.buildVersion` ad hoc.
2. **`npm version <patch|minor|major>` is the whole bump tool.** It edits
   package.json, commits, tags (`v0.19.0`), refuses on a dirty tree, and works
   fine on a `private: true` package because nothing publishes. npm 10.9.8 here.
   No dependency added.
3. **Make `-dirty` fatal for a release build.** Today `buildCommit()` annotates.
   For a tagged release the annotation is the wrong response: a build from an
   edited tree is not reproducible from the tag it claims. Gate on an env var
   (`TORTIE_RELEASE=1` ⇒ throw on dirty) so the dev build keeps its current
   forgiving behaviour.
4. **Separate `CFBundleVersion` from the marketing version only when re-cuts
   start happening.** Verified: if `buildVersion` is unset but a build number is,
   electron-builder makes it `${version}.${buildNumber}`. Leave them equal now;
   set `buildVersion: ${version}.${run_number}` when notarization means the same
   version may be uploaded twice. Note the "at most three non-negative integers"
   rule is a Mac App Store constraint and Tortie is not MAS-bound — but keep the
   *short* version string to three integers regardless, because that is the one
   the user reads.
5. **Do not put the schema number in About.** The Zen rule ("hide the machinery")
   wins: About stays `Version 0.19.0 (a1b2c3d)`. Put the data-version line in the
   diagnostics/copyable support block instead, where the one conversation that
   needs it can find it (§4.7).
6. **Once a channel exists, put it in the About line, not in a new surface.**
   `Version 0.19.0-beta.1 (a1b2c3d)` already says everything; a channel badge
   would be a second place to keep true. Until then there is nothing to add.

---

### 3.6 Tagging and release notes: the four tools, at today's versions

Verified from the npm registry and GitHub on 2026-08-12.

| Tool | State today | Fit for a one-person Electron app with no PRs |
|---|---|---|
| **semantic-release** | `25.0.9` (2026-08-05), `26.0.0-beta.1` in flight, 26 releases in 12 months — very much alive | **No.** Its whole value is removing the human from the release decision. Tortie's release decision — "is now a safe moment to replace the app a person has 44 live sessions in?" — is the one that should stay human. Also npm-publish-shaped; you would be disabling its default plugins. |
| **release-please** | `17.11.1` (2026-07-31), actively maintained by googleapis, no deprecation notice found | **Not yet.** Its unit of work is the pull request. This repo has no remote, no PRs, and a release PR you open and merge to yourself is ceremony with a CI bill. Reopen the day a second person commits. |
| **changesets** | `3.0.0` shipped **2026-08-11 — one day ago**; new site changesets.dev, a v2→v3 migration guide, `maintenance-v2` at `2.31.1` | **No.** Built for multi-package npm publishing; the intent-file workflow is its differentiator and Tortie has one package. Adopting a major on day two of its existence, for a feature you do not need, is the opposite of "boring and older than this product". |
| **release-it** | `21.0.2` (2026-08-09), 18 releases in 12 months | **Optional, and the best of the four if a tool is wanted.** It is a release *runner*, not an opinion: bump, tag, changelog, GitHub release, run your `npm run package` as a hook. This is the one to reach for if the manual ritual starts being skipped. |

Changelog generators, same date:

- `conventional-changelog-cli` is **deprecated on npm** — "This package is no
  longer maintained. Please use the conventional-changelog package instead."
  `conventional-changelog` `8.1.2` (2026-08-10) is the live one.
- `standard-version` last shipped `9.5.0` in **2022**; the maintained fork is
  `commit-and-tag-version` `13.1.2` (2026-07-28).
- `changelogen` `0.6.2` — last publish **2025-07-06**, nothing in 12 months.
  Treat as dormant.
- `git-cliff` `v2.13.1` (2026-04-26) — maintained, Rust, generates from **git log
  alone**, which is the only generator in this list that does not want PRs.
- GitHub's own generated notes (`gh release create --generate-notes`, verified
  present in gh 2.95.0) are built from **merged pull requests**. This repo
  commits straight to `main`; with no PRs the "free" option degrades to a
  contributors line and a compare link. It is not free — it costs a workflow
  change.

**Recommendation: none of them.** The release ritual is three commands and a
paragraph:

```sh
npm version minor -m "Tortie %s"          # bumps, commits, tags v0.2.0
git log v0.1.0..HEAD --format='- %s (%h)' # the DRAFT for the changelog
# …then write the entry by hand, in the user's terms
```

The argument is not laziness, it is that **Tortie's release notes have a required
shape no commit-message generator can produce**. CLAUDE.md already mandates it:
"Report to the user in their terms when a phase lands: what they can now do that
they could not before, and what is still not true." A generator turns
`Phase 18: release and updates` into a bullet that says `Phase 18: release and
updates`, which tells the user nothing. The commit history is the *build story*
and is already excellent at being that; the changelog is a different document for
a different reader, and it is roughly six sentences per release.

Keep the existing `Phase N:` / `docs:` commit convention. Do **not** convert to
Conventional Commits — it would buy tooling that has just been declined, and the
one decision that actually needs deriving from history (minor vs major) is better
served by the `Manifest-Migration:` trailer in §3.2, which encodes the thing that
matters instead of a category word.

**Mechanical triggers to revisit** (so the re-check costs nothing):

- a second person commits to the repo ⇒ adopt **release-please** (PRs now exist,
  and its review-the-release-PR model is the right one for two people);
- two consecutive releases ship without a changelog entry, or the tag ritual gets
  skipped ⇒ adopt **release-it** and let it run the checklist;
- releases exceed roughly one a week ⇒ revisit both.

---

### 3.7 The release checklist

Ordered so that nothing irreversible happens before the evidence exists. Steps 1
and 4 are already written elsewhere; this reuses them rather than restating them.

0. **Decide the bump.** Grep the tag range for `Manifest-Migration:` trailers;
   `breaking` ⇒ major (or `0.MINOR` while pre-1.0), `additive` or a new feature ⇒
   minor, otherwise patch.
1. **Gates.** `npm run typecheck && npm test && npm run build && npm run smoke:t1
   && npm run smoke:t3 && npm run smoke:capture && npm run
   conformance:resume:capture`; the full `conformance:resume` once per release
   and after any agent-CLI upgrade (CLAUDE.md's own cadence — a release is a
   phase boundary).
2. **Tag.** `npm version <bump> -m "Tortie %s"` on a clean tree.
3. **Package.** `npm run package` with `TORTIE_RELEASE=1` so a dirty tree fails
   rather than producing a `-dirty` artifact under a clean tag.
4. **Verify the bundle** against the checklist that already exists in
   BUILD-STATUS §4 — bundle id, all four helper `CFBundleName`s, nested specstory
   bytes + `codesign --verify --strict`, `gmux-tmux.conf`, six grammars +
   `web-tree-sitter.wasm`, unpacked ripgrep, sizes. Verify off the **mounted
   DMG**, not only `release/`.
5. **Candidate run** (the n=1 beta): launch `release/mac-arm64/Tortie.app` with a
   scratch `--user-data-dir`, and run `GMUX_SMOKE=basic` from the packaged app.
6. **Publish.** `gh release create v0.19.0 --notes-file CHANGELOG-entry.md` with
   the DMG, ZIP and their blockmaps attached (plus `latest-mac.yml` once the
   updater exists — §3.7.1).
7. **Record.** Update BUILD-STATUS's `Measured <date> · version` header and the
   phase table. That file is already the release record; keep it that way rather
   than adding a second one.

Two prohibitions, both learned from `release/`:

- **Never cut two artifacts at one version.** If a build must be re-cut, bump the
  build number, not nothing.
- **Never tag before step 5.** A tag that names a build nobody ran is a promise
  with no evidence behind it.

Cost note, since the checklist is what CI eventually automates: GitHub-hosted
macOS runners are **$0.062/min** (down from $0.080 on 2026-01-01) and burn
against included minutes at a **10× multiplier**, which makes a packaged build
trivial per *tag* and ruinous per *push*. §7 turns that asymmetry into the lane
split, and §9 into the bill.

---

#### 3.7.1 The publish half of the ritual, once a remote exists

```
git tag v0.18.0
  → CI: typecheck, test, build, smoke:t1, smoke:t3, packaged-app smoke
  → CI: package → sign (Developer ID) → notarize → staple
  → CI: verify (codesign --deep --strict, spctl, stapler validate ×3)
  → CI: publish a DRAFT GitHub Release: .dmg, .zip, .zip.blockmap, latest-mac.yml
  → human: read the artifacts, then promote the draft
```

**Draft-first is the important part.** Promotion is the one human gate, it makes
the release reviewable, and it turns "halt" into "do not promote" rather than an
emergency. Note that `publish: null` today means **no `latest-mac.yml` is
generated at all** — the `.blockmap` files already are (`release/` has four of
them), so the delta machinery is one config line away from live.

**Where the artifacts live.** GitHub Releases is the right host to start: 2 GiB
per file (the ZIP is 168 MB), no limit on total release size or download
bandwidth, free. If the repo must stay **private**, `electron-updater`'s GitHub
provider needs a token on every client — at which point switch to the `generic`
provider in front of **Cloudflare R2** ($0.015/GB-month, **zero egress**, 10 GB
free tier), which is also the better answer if Tortie ever has real download
volume. This decision is coupled to the CI bill and to the zero-infrastructure
feed option — see §7.8, and decide public vs private *before* designing the
feed.

---

## 4. Data and schema versioning, and the downgrade story

This is the part with teeth, because Tortie's data is the product — and because
pre-1.0 the app version cannot carry a compatibility statement on its own
(§3.3). **The two integers in this section are where the durability guarantee
actually lives.** Everything below was measured against the live 40-session
manifest and a probe that replicates the real migration list.

#### 4.1 What exists today (measured on the live 40-session manifest)

```
user_version:    0
application_id:  0
migrations:      001-initial, 002-exit-code, 003-death-forensics,
                 004-resume-capture, 005-specstory-capture
sessions: 40   projects: 8
```

- `runMigrations` (`src/main/db/sqlite.ts`) is **name-keyed**: it creates a
  `migrations(name, applied_at)` table and skips any migration whose name is
  already recorded. Each step runs in an immediate transaction with its own
  bookkeeping row, so a crash cannot half-apply one. That design is good and
  should stay.
- What it cannot do is answer *"is this file newer than me?"* An older build
  opening a newer manifest sees five names it recognises, no names it needs, and
  proceeds — silently.
- `PRAGMA user_version` and `application_id` are both **0**: unused, free.
- `settings.json` writes `"version": 1` and **never reads it**.
- Snapshots are plain `<session-id>.txt` — no format, no version, no hazard.
- `symbols.db` is explicitly disposable (its own header calls out the
  `rm symbols.db` recovery) — a different compatibility rule applies to it
  (§4.6).

#### 4.2 The measured downgrade matrix

A probe replicated migrations 001–005 verbatim, applied a hypothetical `006`, and
then did exactly what an older build does: re-run its own migration list, run its
`insertSession()` column list, and `SELECT *`. Script kept at
`scratchpad/downgrade-probe.cjs`; it is small enough to belong in
`src/main/manifest/__tests__/` as a standing test.

| `006` does… | old build re-runs migrations | old build INSERT | old build SELECT * |
|---|---|---|---|
| *(nothing — baseline)* | OK | OK | 1 row, 18 cols |
| adds a **nullable** column | OK | **OK** | 1 row, 19 cols |
| adds `NOT NULL DEFAULT 'agent'` | OK | **OK** | 1 row, 19 cols |
| adds `NOT NULL`, no default (table rebuild) | OK | **THROW** `NOT NULL constraint failed: sessions.kind` | — |
| **renames** `resume_argv` → `resume_command` | OK | **THROW** `table sessions has no column named resume_argv` | — |

Three things follow, and they are the whole basis of §3.2's rule:

1. **Additive is genuinely safe.** `SELECT *` feeds a mapper that reads named
   fields, so extra columns are ignored; the INSERT names its columns, so extra
   nullable/defaulted ones are filled by SQLite. Old builds keep working.
2. **Breaking is not detected — it is *hit*.** The old build boots fine, opens
   the manifest fine, lists sessions fine, and then throws the first time the
   user creates a session, because `insertSession` is Step 0 of session creation.
   That is the worst possible place for the failure: after the user has committed
   to an action, with a message about a SQLite column.
3. **The additive case has a quieter hazard than the breaking one.** An old build
   writing to a newer manifest succeeds while leaving the new column NULL. If
   that column is load-bearing for restore, the old build has just created rows
   the new build cannot restore — data loss by silence, with no error anywhere.

#### 4.3 Three numbers, not one

Adopt the split Chromium has used for its SQLite stores for fifteen years
(`sql::MetaTable`, verified 2026-08-12): *"Rule of thumb: check the version
number when you're upgrading, but check the compatible version number to see if
you can use the file at all. If it's larger than your code is expecting, fail."*

1. **App version** — semver, `package.json`. What the user and the updater see.
   It does **not** encode the schema version, and should not try to. Firefox and
   Chrome do not either; the app knows the maximum schema it can handle, the file
   knows what it requires.
2. **Manifest schema version + minimum compatible version** — two integers stored
   in the manifest itself:
   - `PRAGMA user_version` = the schema the file is at (currently would be `5`);
   - a `meta` row `min_compatible_version` = the *oldest* schema number whose
     code can still safely operate this file.
   Keep the name-keyed `migrations` table as the runner's bookkeeping — it is the
   right mechanism for *applying* steps. The two integers are a different job:
   the *compatibility statement*. Additive migration ⇒ bump `user_version`, leave
   `min_compatible_version` alone. Breaking migration ⇒ bump both.
   Also set `PRAGMA application_id` once to a fixed constant, so `file` and any
   forensic tool can identify a Tortie manifest, and a wrong file opened by
   accident is caught rather than migrated.
   The rule for `min_compatible_version` is stricter than SQLite's tolerance:
   **bump it whenever a new column is required for correct restore, even when
   SQLite would let an old build write without it** — that is hazard 3 above,
   and it is the only defence against it.
3. **Settings file version** — the `1` that is already written. Make it real:
   read it; if it is higher than this build knows, run on defaults for the
   unknown keys and **refuse to rewrite the file**.

   This one is not hypothetical. `loadFile()` rebuilds the file from
   `sanitizeSettings()`, which starts from `defaultGmuxSettings()` and copies only
   keys it recognises, and `persist()` writes that reconstruction back. So an
   older build opening a newer `settings.json` **silently deletes** every key it
   does not know, on the first write. Preferences are recoverable, unlike
   sessions — but silent deletion is still the wrong default, and the fix is a
   version check plus preserving unknown keys.

#### 4.4 The refusal — the policy, in one sentence

> **Tortie migrates data forward automatically and never migrates it back. A
> build that finds data newer than it understands refuses to touch it, and says
> so.**

Mechanism: on manifest open, if `min_compatible_version > THIS_BUILD_SCHEMA`,
do not run migrations, do not open for writing, and show a blocking, plain-
language screen:

> **This copy of Tortie is older than your session data.**
> Your sessions are safe and still running. Open Tortie 0.20.0 or newer to see
> them.
> *[Quit]  [Reveal data folder]*

The wording matters, and so does why it is honest: **the sessions are in tmux.**
A refusal costs the user *visibility*, not work — the agents keep running, the
conversations stay resumable, and installing the newer build restores the view.
Refusal is the correct answer here precisely because of the architecture; in an
app that owned its own processes it would be the wrong one. This is the Zen
paragraph made operational: "the application may come and go; the session
continues."

Corollaries:

- **No `down()` migrations, ever.** The runner has no down path today — keep it
  that way. Writing a down-migration means writing the code that deletes the
  user's newest data, and this codebase's settled instinct is the opposite (the
  rename migration *copied, verified, and kept the original*).
- **An older build must never be reachable by machine.** When auto-update
  arrives, `allowDowngrade` must stay `false` on stable — and note the trap
  verified in `AppUpdater.ts`: assigning `channel` sets `allowDowngrade = true`
  as a side effect, as does a prerelease component in the running version. If
  either is ever set, re-assert `allowDowngrade = false` explicitly afterwards.
  (§5 and §8.E carry the implementation; it is recorded here because it is a
  *versioning* consequence.)
- **Manual downgrade stays possible and stays supported-with-a-caveat.** A user
  can always drag an older `.app` back. The refusal screen is what turns that
  from data corruption into an inconvenience.

#### 4.5 The backup that makes "no down-migration" affordable

Before the **first breaking migration** runs, snapshot the manifest:

```
<userData>/gmux/manifest.pre-schema-<N>.db     (VACUUM INTO, from a readonly handle)
```

The mechanism already exists and is already proven in `src/main/migrate/
userdata.ts` — a readonly `VACUUM INTO` that cannot checkpoint or truncate the
source, pinned by a test that fingerprints every byte before and after. Reuse it;
do not write a second one.

That file *is* the downgrade story: you do not migrate backwards, you keep the
last file an older build can open, you say where it is, and you never delete it
automatically. Additive migrations do not need it (measured: old builds cope).

#### 4.6 Policy: additive by default, and make it executable

- Prefer additive migrations. Adding a nullable column plus a backfill is almost
  always available in place of a rebuild, and it keeps downgrade working by
  construction.
- Promote the probe in §4.2 to a test in `src/main/manifest/__tests__/`: apply
  the current `MIGRATIONS`, then assert that the *previous release's* INSERT
  column list still runs. That converts "is this migration additive?" from a
  judgement in a review into a red test — the same move that made the resume
  claims executable (`conformance:resume:capture`).
- Different stores, different rules — state them where each store is defined:
  - **manifest.db** — refuse if too new. Irreplaceable.
  - **settings.json** — run on defaults, refuse to rewrite. Recoverable but not
    worth silently eating.
  - **symbols.db** — if too new, **delete and rebuild**. It is a cache; its own
    header already says so. Never refuse to boot over a cache.
  - **snapshots/*.txt** — no version, no rule needed. Keep it that way; if a
    future format ever needs one, put the version in the *filename*, not in the
    bytes, so an old build simply does not match it.
  - **renderer `localStorage` (`gmux.*`)** — spatial state, browser-local,
    already outside the durability guarantee (BUILD-STATUS §7.9). Tolerate
    anything; never let it block a boot.

#### 4.7 How app version relates to data version

- **One-way and recorded.** Each release records the schema number it ships in
  the changelog entry and in BUILD-STATUS. The app version does not encode it.
- **A schema bump may only ship in a release that also bumps the app's minor
  (additive) or major (breaking)** — never in a patch. Otherwise the version
  named in the refusal screen is not a version the user can act on.
- **Record who last touched the file.** A `meta` row `last_opened_by = "0.19.1"`
  makes the first support question answerable with one query, and costs one
  write per boot.
- **Surface it where the machinery belongs**: not in About, but in the
  diagnostics/copyable support block — `manifest schema 6 (min compatible 5),
  last opened by 0.19.1`.

---

## 5. The self-update design

Six options were canvassed against today's versions; the recommendation is
`electron-updater` 6.x and the reasoning is §5.1. §5.7 is the honest answer
about rollback, which no macOS updater has. §5.8–§5.11 are the UX, which is
almost nothing on purpose. §5.12 is the failure envelope.

Everything here is downstream of §6: **without a Developer ID signature none of
it can work at all**, for the reason measured in §1.3.

### 5.1 electron-updater 6.x — recommended

Latest stable **6.8.9**; `7.0.0-alpha.5` on the `next` tag. The monorepo is
alive: last push to `electron-userland/electron-builder` was **2026-08-12**
(today), latest electron-builder release 26.15.7 (2026-07-18), 85 open issues
against 14.6k stars.

How it works on macOS (read from
`packages/electron-updater/src/MacUpdater.ts`, master): it fetches
`latest-mac.yml`, picks the **ZIP** (`findFile(files, "zip", ["pkg","dmg"])` —
the DMG is never used for updates), downloads it, then stands up a
**loopback HTTP server on `127.0.0.1:0` protected by HTTP Basic auth with a
per-run random password**, points Electron's native `autoUpdater` at it, and
lets Squirrel.Mac do the fetch, verify and install. So electron-updater on macOS
is a feed client and a download manager in front of Squirrel.Mac; the security
property is Squirrel's designated-requirement check from §1.3.

| Property | Reality |
|---|---|
| Signing required | **Yes, absolutely.** Squirrel.Mac requirement; Electron's own docs: *"Your application must be signed for automatic updates on macOS."* |
| Delta updates | **Yes on macOS, contrary to most search results.** Landed in electron-updater **6.2.0**, re-landed **6.3.0** (PRs #7709, #8095) after a revert in between. `MacUpdater` caches the previous `update.zip` and does a multi-range differential fetch against the published `.blockmap`. Falls back to a full download whenever the cache is cold or the range request fails, and logs which happened. |
| Staged rollout | **Yes.** `stagingPercentage: 0-100` in `latest-mac.yml`; the bucket is a UUID persisted at `<userData>/.updaterId`, bucketed by `UUID.parse(id).readUInt32BE(12) / 0xffffffff` (`AppUpdater.ts:482-503`) — stable per install, so a user never flaps in and out of a rollout. `_isUserWithinRollout` is overridable (#9021). |
| Rollback | **No, and no updater has one** — see §5.7. |
| Channels | `latest` / `beta` / `alpha` via `channel` + `allowPrerelease`; setting `channel` auto-sets `allowDowngrade` (`AppUpdater.ts:234-245`). |
| Cost | £0 / $0. |
| Providers (26.x) | `github`, `gitlab`, `s3` (with a custom `endpoint`, so R2/MinIO work), `spaces`, `generic`, `bitbucket`, `keygen`, `snapStore`, `custom`. Master adds a first-class `r2` provider, shipping in v27. |

Two things to know before adopting:

- **v27 is a breaking release and is close.** `quitAndInstall(true, false)`
  becomes `quitAndInstall({isSilent, isForceRunAfter})`, and
  `autoInstallOnAppQuit: boolean` becomes
  `autoInstallEvent: "manual" | "onQuit" | "onNextLaunch"`. **macOS is
  explicitly unaffected** by the session-end corruption class that motivated it,
  because Squirrel.Mac stages natively. Write the integration against the v26
  API but keep it in one module so the v27 migration is a single file.
- **Doyensec published a threat model in February 2026** ([blog][doyensec])
  covering downgrade, integrity, race and untested-version attacks against
  Electron updaters, and referencing the 2020 electron-updater signature-bypass
  RCE. Nothing there is a reason to avoid electron-updater; the mitigations it
  recommends (immutable version manifests, no downgrade, separate channels for
  dev builds, restricted temp dirs) map onto configuration choices in §3 and §5.7.

### 5.2 Electron's built-in `autoUpdater` + update.electronjs.org — the zero-infrastructure option

`electron/update.electronjs.org` is a free hosted Squirrel feed. Requirements,
from its README: macOS or Windows; **a public GitHub repository**; builds
published to GitHub Releases; **builds code-signed** (macOS). macOS assets must
be `.zip` with a `-mac`/`-darwin`/`-osx` marker and an optional `-arm64` tag.
Client side is `update-electron-app`, roughly three lines.

It is genuinely the least code. What it costs: no delta updates, no staged
rollout, no channels, no control over the feed, and **the repo must be public**.
Worth keeping in the back pocket if Tortie goes open-source and the release
cadence is slow; not worth choosing over electron-updater when electron-updater
is already a transitive part of the toolchain that builds the app.

### 5.3 Squirrel.Mac directly

Notable 2026 finding, because the folklore says otherwise: **Squirrel.Mac is
being actively maintained again.** Last release is still 0.3.2 (2017), but the
default branch has commits from **2026-08-11**, including *"stream update
downloads to disk, resume them, and verify a declared digest"* (#327) and
*"test: post state transitions with deliverImmediately"* (#321). It is not
abandonware, whatever its release page suggests.

You still would not adopt it directly. Electron already embeds it; using it
directly means writing your own feed client, your own version comparison, your
own download management and your own delta scheme — which is precisely what
electron-updater is.

What is worth knowing is how its installer behaves, because it defines Tortie's
failure envelope (`SQRLInstaller.m`, 810 lines):

- Verifies the update against the target bundle's designated requirement
  **before** touching anything (lines 261-264).
- Takes ownership of the existing bundle by moving it aside to a backup
  (`SQRLInstallerErrorBackupFailed` exists as a distinct error), installs the
  new one, and only then removes the backup and its temp directory (line 489).
- Uses `rename()` for the swap — *"rename() is atomic, NSFileManager sucks"*
  (line 619).
- Persists resumable state in a `NSUserDefaults` domain keyed by application
  identifier, with an explicit `SQRLInstallerErrorInvalidState`, so an install
  interrupted mid-flight is resumed or reverted on the next attempt rather than
  left half-applied.

That is a better fault story than most installers, and it is the reason §7 can
be short.

### 5.4 Sparkle 2 via a native shim

Sparkle is the best macOS updater there is, and it is **very** alive: **2.9.5,
published 2026-08-02**, with 2.9.1 through 2.9.5 all shipping since March. It
has genuine binary delta updates generated by `generate_appcast`, phased group
rollouts (`sparkle:phasedRolloutInterval`, correctly skipped for critical
updates and manual checks), and EdDSA (ed25519) signing that is independent of
Apple's certificate chain.

The problem is the shim. Sparkle is an Objective-C framework with its own XPC
services and its own UI; using it from Electron means a native N-API bridge, a
`Sparkle.framework` embedded in the bundle (and therefore signed, and therefore
in `mac.binaries`), the XPC services signed and notarized too, EdDSA keypair
custody, and an appcast generation step alongside the electron-builder one. The
only published bridge I could find,
[`Innei/electron-sparkle-updater`][sparkle-shim], has **4 stars, no releases**,
and last activity 2026-07-19. That is not a dependency for a durability-critical
path.

CLAUDE.md's rule is *assemble, never reimplement* — and here assembling
electron-updater is the assembly. Sparkle would be a native-integration project
whose payoff over electron-updater is better deltas and nicer rollout controls
for **one user**. Revisit only if Tortie ships to a population large enough that
bandwidth or rollout granularity is a real cost.

### 5.5 Velopack — the 2026 entrant

[Velopack][velopack] is a modern cross-platform installer/updater (the spiritual
successor to Squirrel/Clowd.Squirrel) with first-class JS/Electron support,
macOS included, delta updates, and — notably — the ability to **sign and
notarize during its own build** via `vpk`. Its pitch is "zero config", and its
delta implementation is a genuine advantage over blockmap range fetching.

Two blockers for Tortie today. It is **pre-1.0 with APIs that can still change**,
which is exactly the criterion BUILD-STATUS §6 used to defer the Pierre `/edit`
swap — the same rule should apply here. And it ships a native `.node` module
that its own docs flag as incompatible with Vite/Rollup bundling, which is a
direct collision with `electron-vite` and `externalizeDepsPlugin`. Re-check when
it reaches 1.0.

### 5.6 Commercial and hosted (ToDesktop, Nucleus, Hazel, Nuts)

All of them solve "I do not want to run a feed", which is not a problem Tortie
has: GitHub Releases is free and R2 is $0.015/GB-month with **zero egress**
([R2 pricing][r2]). Paying a vendor to host 168 MB and a YAML file, and handing
that vendor the signing pipeline for a durability-critical developer tool, is
not a trade worth making here. Skip.

### 5.7 Rollback — the honest answer for every option

**No macOS updater has rollback.** Not Squirrel, not Sparkle, not Velopack.
Once an install completes and the backup is discarded there is no "undo". Three
mechanisms actually exist, and they should be treated as the rollback plan:

1. **Halt.** Clients only ever read `latest-mac.yml`. Reverting or deleting that
   one file stops every install that has not already happened. It is the fastest
   lever and it should be a one-command script, not a memory of how to do it.
2. **Roll forward.** Publish a *higher* version containing the previous bits —
   `0.19.1` whose payload is `0.18.0`'s. Republishing an old version number does
   nothing, because updaters compare semver. This must be written down
   somewhere the panicking future operator will find it.
3. **Downgrade escape hatch.** `allowDowngrade = true` plus a channel switch can
   pull a user back, but it needs the app to already ship the code path. Cheap
   insurance; wire it behind a hidden preference rather than UI.

Plus the one that costs nothing at Tortie's scale: **stage the rollout**. With
one user, `stagingPercentage` is theatre — say so and skip it until there is a
population. The halt script is the thing that earns its keep on day one.

#### The UX, derived from the Zen

> *"Only a question, decision or failure should rise above the surface."*
> *"The application may come and go. The session continues."*

Most apps must interrupt you to update because updating costs you your work.
**Tortie's update costs nothing**, and the interface should reflect that by
being almost absent. The design below is a direct reading of the Zen, not a
generic updater UX.

### 5.8 When to check

- **30 seconds after launch, not at launch.** Boot is when Restore is replaying
  scrollback and re-adopting sessions; an update check has no business competing
  for that moment.
- **Every 6 hours** thereafter while running. Tortie sessions are long-lived;
  the app may not be relaunched for days.
- **On explicit request** — a *Check for Updates…* item in the Tortie menu,
  directly under *About Tortie*, which is where macOS users look. This is the
  only path that is allowed to report "you are up to date" or an error.
- **Never** on a timer that fires during a modal, a rename, or a drag.

### 5.9 What the user is told (almost nothing)

There is no toast, no modal, no badge, no counter. A number that goes up on its
own is exactly what the Zen calls "noise in a nicer font".

When an update has downloaded and is staged, **one thing changes**: the Tortie
menu grows an item.

```
Tortie
  About Tortie
  Update to 0.19.0 — installs when you quit        ← appears only when staged
  Check for Updates…
  Settings…
  …
```

That is the whole announcement. It is discoverable where version information
already lives, it states the mechanism in five words, and it never takes focus.
Settings may show a fuller line (current version, channel, last checked, what is
staged) for the user who goes looking — Settings is a place you go, not a thing
that shouts.

Failure is silent by the same rule. A failed background check writes to the log
and nothing else; only a **user-initiated** check may report a failure, because
only then is someone waiting for an answer.

### 5.10 Installing: on quit, automatically

Squirrel.Mac stages the downloaded update natively and applies it on the next
launch after a normal quit — on macOS, electron-updater's `"onQuit"` and
`"onNextLaunch"` are the same native behaviour (its own v27 changelog says so).
So the default `autoInstallOnAppQuit = true` is exactly right for Tortie:

- The user quits when *they* choose. The update rides that.
- The tmux server and all sessions keep running through the quit (T1 by design,
  `index.ts:1669-1698`) and through the swap (§2.3).
- The next launch is the new glass, re-adopting the same sessions by `@gmux-id`.
- **Tortie never calls `quitAndInstall()` on its own, and never relaunches the
  user's app.** An app that restarts itself is an app that decides for you.

The one exception is an explicit user action. If the menu item is clicked
directly it may offer to update now, and — uniquely — it can tell the truth
about what that means:

> **Update to 0.19.0**
> Tortie will close and reopen. Your sessions keep running; nothing is
> interrupted.
> [ Later ]  [ Update Now ]

Most apps cannot write that second line. Tortie can, and Phase 17 is the
evidence: 44 sessions across an app replacement, the id list byte-identical
afterwards. That sentence is the product's promise appearing at the exact moment
the user is most likely to disbelieve it.

### 5.11 What must be true before the first update ships

- `app.requestSingleInstanceLock()` (§2.7) — non-negotiable.
- The conf-path assertion and the `history-limit` read-back (§2.5).
- A **post-update self-check**: on the first boot after `app.getVersion()`
  changes, verify the bundle's runtime resources resolve — `gmux-tmux.conf`,
  `Resources/bin/specstory`, the unpacked `rg`, the six tree-sitter `.wasm`
  files — and surface a single quiet failure if any is missing. This is the one
  case where something *should* rise above the surface, because it is a failure.
- Do **not** show release notes in a window. If they matter, they are a link.

### 5.12 Failed or partial updates

The requirement is that a failed update never leaves a broken app, and — Tortie
specifically — never touches the work.

**What already protects it:**

1. Squirrel verifies the update's signature against the designated requirement
   before the swap, twice (§1.3). A truncated, corrupted or foreign build never
   gets installed; the update simply does not happen.
2. ShipIt moves the existing bundle to a backup, installs, then deletes the
   backup, and keeps resumable state so an interrupted install is resumed or
   reverted (§5.3).
3. The swap is a same-volume `rename()` (§2.4) — atomic.
4. electron-updater falls back from a differential to a full download whenever
   the range fetch fails, and logs which path it took (`MacUpdater.ts:116-136`).
5. **The blast radius excludes the user's work entirely.** Worst realistic case
   is a Tortie that will not launch. The tmux server, all sessions, all agents
   and the manifest are untouched, and reinstalling from the DMG recovers
   everything. No other class of desktop app can say that, and it should be
   said in the release notes for the first self-updating build.

**What does not protect it, and needs building:**

- The cold-start conf degradation (§2.5) — the only silent failure I found.
- No single-instance lock (§2.7).
- No release gate on `codesign --verify --deep --strict` — the current build
  fails it (§1.2).
- No halt script for `latest-mac.yml` (§5.7).

---

## 6. Signing and notarization — the prerequisite, stated plainly

**There is no configuration of an ad-hoc build that produces an updatable app.**
Not a slow one, not a degraded one — none. Squirrel.Mac verifies every update
against the running application's designated requirement (§1.3), and an ad-hoc
build's designated requirement is a `cdhash` of that single build. Self-update
begins the day `codesign -d -r-` stops printing a cdhash and starts printing an
identifier-and-anchor expression, and not one day earlier.

The certificate to do it with is already on this machine (§1.1). What follows is
the exact configuration, the nested-binary rule that must not drift, and the
verification gates.

### 6.1 What is unlocked now, and what is impossible without it

With the Developer ID cert in §1.1:

- Gatekeeper first-launch **without** right-click → Open, on any Mac.
- A **stable designated requirement**, which is the precondition for self-update
  (§1.3), and for TCC grants surviving updates (§1.4).
- `spctl` assessment passing, which is what tools and MDM check.
- A secure timestamp on the signature, so signatures keep validating after the
  certificate eventually expires.

Impossible without it, and worth stating plainly so nobody re-litigates it:
**every one of the above.** There is no configuration of an ad-hoc build that
produces a Gatekeeper-clean app or an updatable one. This is not a spectrum.

### 6.2 The exact changes to `electron-builder.yml`

```yaml
mac:
  identity: "Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)"
  hardenedRuntime: true            # default is already true for darwin
  gatekeeperAssess: true           # let the build fail loudly, not the user
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.inherit.plist
  notarize: true
  binaries:
    - Contents/Resources/bin/specstory
  target:
    - { target: dmg, arch: [arm64] }
    - { target: zip, arch: [arm64] }   # the ZIP is what the updater consumes
publish:
  provider: github                  # once the remote exists
  # releaseType: draft — publish drafts, promote by hand (§3.7.1)
```

From `packages/app-builder-lib/src/options/macOptions.ts`: `hardenedRuntime`
*"Defaults to `true` for `darwin` builds"*; `entitlements` falls back to
`build/entitlements.mac.plist` if it exists, then to `@electron/osx-sign`
defaults; and notarization activates only when one of these credential sets is
in the environment —

1. `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` ← **use this one**;
   the option-1 recommendation is in electron-builder's own docstring.
2. `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
3. `APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`

Concretely here: `APPLE_API_KEY=~/.appstoreconnect/private_keys/AuthKey_8NH6JLTWBN.p8`,
`APPLE_API_KEY_ID=8NH6JLTWBN`, `APPLE_API_ISSUER=<the UUID from §1.1 that is not
on this machine>`.

Entitlements Tortie actually needs — keep this list minimal and justified,
because every entitlement is an attack-surface note in the notarization record:

```xml
<key>com.apple.security.cs.allow-jit</key><true/>                       <!-- V8 -->
<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/> <!-- V8 -->
<key>com.apple.security.cs.allow-dyld-environment-variables</key><true/> <!-- Electron -->
```

Deliberately **not** included: `disable-library-validation`. Tortie's native
modules (`node-pty`, `better-sqlite3`) and the unpacked ripgrep are all signed
by electron-builder with the same team identity, so library validation is
satisfied. If a future dependency forces this entitlement on, that is a signal
worth a paragraph in the phase brief, not a quiet addition.

### 6.3 The nested specstory binary across an update

This is already right, and the update path does not change it — but the
mechanism is worth stating because it has two halves that must stay in step.

Signing is **inside-out**: nested Mach-O first, app last. electron-builder emits
`afterPack` after `extraResources` are copied and before `signApp`, which is
where `build/sign-nested-binaries.cjs` sits. Today, with `identity: null`, that
hook signs `Resources/bin/specstory` ad-hoc with hardened runtime and a stable
identifier. The moment `identity` is set, the hook **steps aside**
(`willElectronBuilderSign` branch) and `mac.binaries` signs the same file with
the Developer ID before the app is sealed. The two lists —
`NESTED_BINARIES` in the hook and `mac.binaries` in the YAML — must stay
identical; both files already say so.

What changes for updates:

- The specstory binary is inside the sealed bundle, so
  `kSecCSCheckNestedCode` (which Squirrel passes) verifies it on **every**
  update. A missed nested signature does not just fail notarization; it fails
  the update install on the user's machine.
- `codesign --verify --deep --strict` must be a **release gate**, run against
  the built `.app`, the app inside the ZIP, and the app off the mounted DMG.
  Today that command fails (§1.2), which is the clearest possible evidence that
  it is not currently gated.
- **Nothing may write into the bundle after signing.** `after-pack.cjs`
  rewrites helper `CFBundleName`s, which is safe only because `afterPack`
  precedes `signApp`. A future hook placed after signing would invalidate the
  seal, and the symptom would be a Gatekeeper failure on the user's machine
  rather than a build error. Worth a comment in `after-pack.cjs`.
- `xcrun stapler staple` must run on the `.app` **before** the DMG and ZIP are
  produced, so both carry a stapled ticket and first launch works offline.
  electron-builder's notarize integration does this in the right order; verify
  it rather than assume, with `stapler validate` on all three artifacts.

### 6.4 Verification gates for the first signed build

```sh
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Tortie.app
codesign -d -r- release/mac-arm64/Tortie.app          # expect identifier+anchor, NOT cdhash
spctl -a -vvv -t exec release/mac-arm64/Tortie.app    # expect: accepted, source=Notarized Developer ID
xcrun stapler validate release/mac-arm64/Tortie.app
xcrun stapler validate release/Tortie-<v>-arm64.dmg
codesign -dv --verbose=2 …/Contents/Resources/bin/specstory   # expect Developer ID, runtime
codesign -dv --verbose=2 …/app.asar.unpacked/node_modules/@vscode/ripgrep-darwin-arm64/bin/rg
```

The second line is the one that matters most: **the designated requirement
changing from `cdhash H"…"` to an identifier-and-anchor expression is the
moment self-update becomes possible**, and it is a one-line check.

---

## 7. CI that stays fast

Everything below was measured on **2026-08-12** on the dev machine (Apple M4
Pro, 12 cores, 48 GB, macOS 15.7.9, node v22.23.1, electron 43.3.0) **in an
isolated copy of the tree under a scratchpad** — that is how the packaging
timing was taken without overwriting `release/`. Nothing here wrote to `out/`,
`release/` or `node_modules/` in the working tree. Runner-side figures are
*derived* from those measurements plus the hosted runner's published
specification; §7.11 is the probe that turns them into evidence, and **until it
has run once, no row marked `probe` may be quoted as proven.**

Three intuitions this section overturns, recorded so nobody re-derives them:
`electron-rebuild` is **not** the slowest install step (11.23 s, §7.5);
`node_modules` should **not** be cached (§7.5); and
`conformance:resume:capture` — the cheap local gate CLAUDE.md rightly mandates
before any resume-touching commit — is a **vacuously green** gate on a runner
with no agent CLIs installed (§7.2). It also closes the one thing nobody could
answer from a desk: **tmux is confirmed absent from the runner image** (§7.2).

### 7.1 The decision, in one page

| Question | Answer |
|---|---|
| Can the gates run on a hosted macOS runner at all? | **Most of them, yes.** Hosted macOS runners have an **emulated display**, so Electron opens windows; `node-pty` needs only `/dev/ptmx`. The one missing piece is **tmux, confirmed absent from the image** — one `brew install tmux`. |
| Which gates must stay LOCAL? | `conformance:resume` (real turns), **`conformance:resume:capture`** (needs the agent CLIs — in CI it reports **10 SKIP and exits 0**, so using it as *the* CI gate is a trap: §7.2), `smoke:capture` (launches a real `claude`), ACCEPTANCE. |
| What is actually expensive? | **Not `electron-rebuild`.** Measured **11.23 s**, and **10.71 s** even with `--build-from-source`, because `better-sqlite3` 13 is N-API and ships its own prebuild. The intuition that it is "the slowest install step" is wrong. The real cold costs are four downloads: the Electron zip (**116 MB**), npm tarballs (**106 MB**), electron-builder's `dmg-builder` toolset (**96 MB**) and the specstory tarball (**16 MB**). §7.5. |
| Biggest single speed-up? | **Stop building four times.** `smoke:t1`, `smoke:t3`, `smoke:capture` and `conformance:resume` each prepend `npm run build` (21.2 s local, ~55 s on a runner). §7.6. |
| Which runner label? | **`macos-15`** for the gate lane — closest to the machine every BUILD-STATUS number came from — and `macos-26` weekly. **Never `macos-latest`**: it moved to macOS 26 across June–July 2026 and will move again. |
| Self-host on this Mac? | **No for the gate lane, and not because of speed.** A self-hosted runner executes PR code on the machine holding 44 live sessions. The case for self-hosting is the *durability* lane — agent CLIs and credentials only exist on a real machine — and that wants a dedicated Mac. §7.8. |
| Cost? | **$0 if the repo is public.** Private, at ~120 gate runs + a nightly + 2 releases/month: **≈ $55/month** net of a Pro allowance. The cheapest single control is `timeout-minutes` on every job: the default cap is **6 hours** = **$22.32** for one hung Electron smoke. §7.7–12.8. |

---

### 7.2 What actually runs on a hosted macOS runner

Three properties decide every row below, and all three were checked rather than
assumed.

**A window.** Electron cannot create a `BrowserWindow` without a window server,
which is why Electron CI is normally a Linux-plus-`xvfb` story. On macOS it is
not: GitHub's hosted macOS runners are virtualised with an **emulated display**
— that is exactly what separates them from a headless self-hosted Mac, where a
display is only recognised once someone attaches VNC. Tortie helps itself here:
every smoke window is constructed `show: false` (`src/main/index.ts:197`,
`:339`), and the screenshot harness uses `webContents.capturePage()`, which is
in-process and needs no Screen Recording TCC grant. `desktopCapturer` would
need one; nothing in the battery uses it.

**A pty.** `node-pty` needs `/dev/ptmx` and `forkpty`, both unconditionally
present on macOS.

**tmux — the assumption nobody could settle from a desk, now checked.** The `macos-26-arm64` image manifest
(`20260728.0273.1`, macOS 26.5.2, Xcode 26.6, Homebrew 6.0.13) lists 7-Zip,
aria2, bazel, bsdtar, curl, git, gh, jq, openssl, packer, yq, zstd and ninja —
and **no tmux**; macOS has never shipped one. So every durability gate begins
with `brew install tmux`. That is a bottle install of tmux plus libevent and
utf8proc, not a build. `resources/gmux-tmux.conf` needs `extended-keys`
(tmux ≥ 3.2) and `allow-passthrough` (≥ 3.3); Homebrew's current tmux is 3.6a,
the same version this tree is developed against. **This does not reopen the
bundled-tmux question** that a first reading suggests it might: one `brew install` in a
composite action is cheaper than shipping a signed static tmux with libevent,
ncurses and terminfo (BUILD-STATUS §6).

| Gate | Hosted runner? | Why |
|---|---|---|
| `npm run typecheck` | **Yes** | Pure `tsc`, 3.84 s local. |
| `npm test` (1,483 tests) | **Yes** | `vitest` under Node. The native modules are N-API, so they load under plain node despite the Electron-ABI rebuild. BUILD-STATUS §7.12's two FSEvents tests and one process-ancestry test are the ones most likely to behave differently in a VM. **probe** |
| `npm run build` | **Yes** | 21.2 s local, **3.76 GB peak RSS** — the number that interacts with a 7 GB runner (§7.3). |
| `smoke:t1` | **Yes, after tmux** | No agent: creates a shell session, quits, asserts it survived. **probe** |
| `smoke:t3` | **Yes, after tmux** | Deliberately launches **no real agent** — "the pane is a shell, the row is relabelled, and the planted argv is a pi one"; the claude row plants a *fake* uuid. The highest-value durability gate CI can actually hold. **probe** |
| `smoke:migrate`, `smoke:identity`, `smoke:procid` | **Yes, after tmux** | tmux and the manifest, no agents. **probe** |
| Packaged-app smoke | **Yes, and nearly free** | `electron-builder --mac --dir` measured **4.31 s**. This is the only gate that catches the `extraResources`/`asarUnpack` class of bug that `out/` is structurally blind to (research 19 §7.2). |
| `npm run package` (DMG + ZIP) | **Yes** | `hdiutil` works on a real macOS VM. DMG creation is the step with a history of `Resource busy` flakes — one more reason the gate lane should not build one. |
| `smoke:capture` | **No — LOCAL** | Launches a real agent (`GMUX_SMOKE_AGENT ?? 'claude'`) under bundled specstory and asserts the agent is the pane's child. |
| `conformance:resume:capture` | **No — LOCAL, and this is the counter-intuitive one** | It resolves each agent binary and **SKIPs when not installed**, and `exitCodeFor` makes SKIP deliberately not red so the harness stays runnable when the operator is logged out of a provider. On a runner with zero agents that is **10 SKIP, exit 0, green** — a gate that passes because nothing was tested, which is strictly worse than no gate. If it is ever wired in, it needs `GMUX_CONF_STRICT=1` **and** an assertion that at least one agent resolved. |
| `conformance:resume` (full) | **No — LOCAL** | Real model turns, real provider accounts. CLAUDE.md already says so. |
| `docs/ACCEPTANCE.md` | **No — human** | By construction. |

**The boundary that falls out.** CI can hold everything that does not need an
agent. The agent layer — the genuinely differentiated part of Tortie — is
exactly the part a hosted runner cannot verify, because it needs installed CLIs
and live credentials. That is not a gap to apologise for; it is the line, and
§7.8 is where it decides the self-hosting question.

---

### 7.3 The runner, and the two constraints that bite

| | Dev machine | Hosted `macos-15` / `macos-26` (arm64) |
|---|---|---|
| CPU | Apple M4 Pro, 12 cores | **3 cores** (M1) |
| RAM | 48 GB | **7 GB** |
| Disk | — | **14 GB SSD** |
| Concurrency | — | **5 concurrent macOS jobs** (Free/Pro/Team), 50 (Enterprise) |
| Job cap | — | 6 h default, 35 days per workflow run |

**Memory.** `npm run build` peaks at **4,034,330,624 B (3.76 GB)** resident
(`/usr/bin/time -l`). On a 7 GB runner that fits with ~2.5 GB of headroom and no
room for a second concurrent build in the same job. If a future Monaco/Shiki
addition pushes this past ~5 GB, it will present as an OOM kill on the runner
and a green build locally. Set `NODE_OPTIONS=--max-old-space-size=5120` so the
failure is a legible V8 heap error rather than a SIGKILL.

**Disk.** `node_modules` is 776 MB (`electron/dist` 295 MB, `monaco-editor`
98 MB), the unpacked `.app` is 450 MB, DMG + ZIP are 167,824,496 B +
167,301,007 B, and `build/vendor/specstory` is 41 MB of binary plus a 16 MB
cached tarball. A full release job lands at ~2.7 GB against 14 GB — comfortable,
but it is the reason the gate lane should not build a DMG it throws away.

**Deployment target is not a risk.** A worry worth killing before someone
raises it: building on a newer image does not raise Tortie's minimum macOS.
Measured on binaries this tree's own toolchain produced — `pty.node` is
`LC_BUILD_VERSION platform MACOS minos 11.0 sdk 26.2`, better-sqlite3's prebuild
is `minos 11.0 sdk 15.5` — node-gyp pins `-mmacosx-version-min` from Electron's
headers, not from the SDK in the image. `LSMinimumSystemVersion` stays `12.0`,
set by electron-builder from Electron 43. `macos-26` will not silently narrow
the supported range.

---

### 7.4 Measured timings, and the budget derived from them

Local numbers measured 2026-08-12 in the scratch copy. "Runner" is derived at
**≈2.5×** the local wall clock — a 3-core M1 against a 12-core M4 Pro, with
measured parallelism of 1.65× on the build and 1.89× on packaging — and is an
estimate until §7.11 runs.

| Step | Local (M4 Pro) | Derived runner | Notes |
|---|---|---|---|
| `npm ci --ignore-scripts`, **fresh** npm cache | **8.66 s** | ~25 s | pulls **106 MB** of tarballs |
| `npm ci --ignore-scripts`, warm `~/.npm` | **4.80 s** | ~12 s | |
| electron install, warm `~/Library/Caches/electron` | **0.84 s** | ~5 s | extracts 295 MB into `node_modules` |
| electron install, **cold** | — | ~15–25 s | cached artifact `electron-v43.3.0-darwin-arm64.zip` = **122,102,881 B** |
| `electron-rebuild -f -w node-pty,better-sqlite3` | **11.23 s** | ~30 s | builds three modules (`@parcel/watcher` too) |
| …with `--build-from-source` | **10.71 s** | ~28 s | *the worst case equals the normal case* — §7.5 |
| …no-op re-run (no `-f`) | **0.08 s** | — | |
| `npm run typecheck` | **3.84 s** | ~10 s | |
| `npm test` | 17.7 s (BUILD-STATUS, today) | ~45 s | 1,481 passed · 2 skipped, 118 files |
| `npm run build` | **21.20 s** | ~55 s | 26 MB monaco chunk; 3.76 GB peak RSS |
| `electron-builder --mac --dir` | **4.31 s** | ~12 s | the 450 MB `.app`, hard-linked |
| `electron-builder --mac zip` | **18.64 s** | ~35 s | 167,301,007 B + blockmap |
| **`npm run package`** (build + DMG + ZIP) | **43.32 s** | **~110 s** | 81.87 s user — *the number BUILD-STATUS never recorded* |
| `smoke:t1` harness only (minus its build) | ~20 s | ~50 s | |
| `smoke:t3` harness only | ~40 s | ~100 s | |
| Apple notary service | — | **2–15 min** | not runner-speed; occasionally far longer |

| Lane | Trigger | Derived wall clock | Cost at $0.062/min |
|---|---|---|---|
| **gates** | every PR push, push to `main` | **5–7 min** warm, 8–10 cold | $0.31–0.43 |
| **durability** | nightly cron + dispatch | 11–14 min | $0.68–0.87 |
| **compat** | weekly, `macos-26` | 11–14 min | $0.68–0.87 |
| **release** | `v*` tag | 8–20 min (notary-dominated) | $0.50–1.24 |

---

### 7.5 Caching: cache the inputs, not the output

The reflex is to assume `electron-rebuild` is the slowest install step and to
cache both `node_modules` and the rebuild output. The measurements support
neither half.

Why the rebuild is cheap, recorded so nobody re-derives it:

- `better-sqlite3` **13** is N-API and ships `prebuilds/darwin-arm64.node`
  (1,980,736 B) **inside its own npm tarball**. Its gyp target emits only
  `.stamp` files — there are **no `.o` files** in its `build/` tree after a
  rebuild. Nothing compiles.
- Only `node-pty` and `@parcel/watcher` actually compile (`pty.node`,
  `spawn-helper`, two `.o` files).
- Hence `-f` → **11.23 s** and `-f --build-from-source` → **10.71 s**. There is
  no expensive fallback to defend against, and nothing to cache separately: the
  output is 11 s of work keyed on inputs a cache would have to key on anyway.

So the cache design is about **four downloads**, not about compilation:

| Cache | Path | Size | Key |
|---|---|---|---|
| npm tarballs | `~/.npm` | ~106 MB cold | `actions/setup-node@v7` with `cache: npm` |
| Electron binary | `~/Library/Caches/electron` | **122,102,881 B** | `electron-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}` |
| electron-builder toolsets | `~/Library/Caches/electron-builder` | **96 MB** `dmg-builder@1.2.5` + 22 MB downloads | DMG-building lanes only |
| **specstory vendor** (the Tortie-specific one) | `build/vendor/specstory/cache` | **16 MB** tarball → 41 MB binary | `hashFiles('build/specstory-release.json')` — `before-pack.cjs` is already idempotent and network-free once warm, so this is pure keying |

**Do not cache `node_modules`.** It is the reflex and it loses on these numbers.
Restoring 776 MB costs 30–60 s of decompression on a runner, to replace
`npm ci` (~12 s warm) + electron extract (~5 s) + rebuild (~30 s) ≈ 47 s — a
wash at best — while buying three failure modes the download caches do not
have: a tree stale against the lockfile, an Electron-ABI `.node` restored under
a different Electron, and an entry that must be invalidated on *both*
`package-lock.json` and the Electron version. **Cache the inputs, not the
output.**

Hygiene that matters here:

- Override the Electron cache path with **`electron_config_cache`, not
  `ELECTRON_CACHE`** — verified at `node_modules/electron/install.js:46`.
  Simplest is to leave the default and cache `~/Library/Caches/electron`.
- Cache storage is a **separate 10 GB per-repo allowance** ($0.07/GB-month
  beyond it, vs $0.25/GB-month for artifacts). These four total ~370 MB.
  Entries evict after 7 days without access, so a repo that only builds weekly
  always pays cold.
- Caches restore from the default branch into PR branches, so the first `main`
  build after a lockfile bump warms every later PR.

**Artifacts are the storage trap, not caches.** Included Actions storage is
500 MB (Free) / 1–2 GB (Pro/Team) and one release pair is **335 MB**. Never
upload a DMG from the gate lane; use `retention-days: 3` for logs and failure
screenshots; and keep release binaries on the **GitHub Release**, which is
where the updater reads them from anyway.

---

### 7.6 The free minute: stop building four times

Every heavy script in `package.json` prepends its own build:

```
smoke:t1      = npm run build && smoke:create && smoke:verify
smoke:t3      = npm run build && GMUX_SMOKE=t3-prep … && GMUX_SMOKE=t3-verify …
smoke:capture = npm run build && …
conformance   = npm run build && …
```

Correct for a human at a terminal, wasteful in a job that has already built.
Running `typecheck`, `test`, `smoke:t1` and `smoke:t3` naively costs **four**
builds — 84 s locally, ~3.7 min of runner time — for one tree.

`smoke:create` and `smoke:verify` already exist build-free, so T1 needs no repo
change:

```bash
npm run build
npm run smoke:create && npm run smoke:verify
```

T3, capture and migrate have no build-free variant, so CI inlines them:

```bash
GMUX_SMOKE=t3-prep   npx electron . --user-data-dir="$RUNNER_TEMP/t3"
GMUX_SMOKE=t3-verify npx electron . --user-data-dir="$RUNNER_TEMP/t3"
```

**Small repo change worth making:** add `smoke:t3:only`, `smoke:capture:only`,
`smoke:migrate:only` — the same commands without the `npm run build &&` prefix —
and leave the composite scripts alone for human use. The workflows below use the
inline form so they work against this tree unchanged.

Second free win from the same measurement: `--mac --dir` is **4.31 s**. The
packaged-app smoke — today a manual Phase 17 step, and the only gate that
catches a missing `extraResources` entry or an un-unpacked ripgrep — costs about
a minute of runner time. It belongs in the gate lane.

---

### 7.7 Concurrency, timeouts and triggers

```yaml
concurrency:
  group: gates-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

Keyed on the **PR number** rather than `github.ref` so a force-push and a normal
push to the same PR collapse into one group. The release lane inverts both —
`group: release-${{ github.ref }}`, `cancel-in-progress: false` — because a
half-cancelled notarization is worse than a duplicate one. (`cancel-in-progress`
accepts an expression, so one workflow can cancel on branches and not on tags;
`queue: max` and `cancel-in-progress: true` cannot be combined.)

**`timeout-minutes` on every job is the real cost control.** The default is the
6-hour platform cap: one Electron smoke hanging on a pty costs **$22.32**. The
harnesses carry their own watchdogs (`armWatchdog(60_000)` for T3, 120 s for
capture) but those only fire once the process reached the harness — the
runner-level timeout is the backstop for everything before that. Suggested:
`gates: 25`, `durability: 40`, `release: 60`.

**Path filters, and the trap.** `paths-ignore: ['docs/**', '**/*.md']` saves a
macOS run on every research doc — but if `gates` is a *required* check, a
skipped workflow never reports and the PR blocks forever. Use the twin-job
pattern: a second workflow with the **same job name** and the inverse filter
that does nothing and succeeds.

---

### 7.8 Hosted vs self-hosted on this Mac

**The public-repo lever dominates.** Standard hosted runners are free and
unlimited on public repositories, and Tortie is already MIT in `package.json`.
Public makes the whole bill $0 *and* unlocks the zero-infrastructure feed in
§5.2 (update.electronjs.org requires a public repo); private forces the R2/S3
`generic` provider, because the GitHub provider on a private repo means a token
inside the asar. **Decide public vs private before designing the feed** — it
decides more than the CI bill.

Private-repo math (Pro, $0.062/min, **10× multiplier** against a 3,000-minute
pool ⇒ **300 free macOS minutes/month**):

| Item | Volume | macOS minutes | Cost |
|---|---|---|---|
| gates | 120 runs × 6 min | 720 | $44.64 |
| durability nightly | 30 × 13 min | 390 | $24.18 |
| compat weekly (`macos-26`) | 4 × 13 min | 52 | $3.22 |
| release | 2 × 15 min | 30 | $1.86 |
| **gross** | | **1,192** | **$73.90** |
| less included allowance | | −300 | −$18.60 |
| **net** | | | **≈ $55/month** |

**Self-hosting on this Mac — the case against, in the order that matters.**

1. **It runs PR code beside 44 live sessions.** A self-hosted runner executes
   whatever a workflow file on a branch says. GitHub's own guidance is that
   self-hosted runners should almost never serve a public repository, and even
   privately, anyone who can open a PR can run code on the host. That host is
   currently the machine holding the user's entire body of work.
2. **Electron needs a logged-in GUI session.** Installed as a LaunchDaemon the
   runner is headless and `BrowserWindow` fails; it must be a LaunchAgent in an
   auto-logged-in session. That is machine configuration, not workflow
   configuration — and it is the thing that silently breaks after a reboot.
3. **CI would share the live `-L gmux` socket.** The only reason this is even
   discussable is that the harnesses are safe by construction: they prefix what
   they create (`smoke-*`, `zz-conf-*`), refuse to kill what they did not
   create, adopt only by `@gmux-id`, and never kill the server — Phase 17 proved
   it by running the whole battery against the live socket with all 44 sessions
   up and getting a byte-identical session list afterwards. But safe is not
   free: a CI job and a human working simultaneously contend on one tmux server,
   and the first flake will be unreproducible.

**Where self-hosting is actually right.** The durability lane is the one CI
cannot buy at any price: `conformance:resume` needs ten agent CLIs and live
provider credentials. When that wants automating it wants a **dedicated Mac** —
auto-logged-in, agents installed, registered as an **ephemeral** runner so one
PR cannot poison the next job, and triggered only from trusted refs
(`workflow_dispatch`, `schedule`; never `pull_request`). Until such a machine
exists, that lane stays where BUILD-STATUS already puts it: local, once per
phase.

---

### 7.9 The release job (CI mechanics only)

The signing configuration and entitlements are settled in §6.2 and are not
repeated here, and §8's sequencing stands — **cut the first signed release by
hand on this machine, prove an update lands, then move the working recipe into
CI.** What CI adds on top:

1. `rm -rf release` before packaging. §3.5 records two different apps sitting in
   `release/` at the same `0.0.1`; a publish step must never be pointed at a
   directory it did not create.
2. `npx electron-builder --mac --publish always`. electron-builder signs
   inside-out, notarizes, and **staples automatically** with `notarize: true`.
   `mac.binaries` already lists `Contents/Resources/bin/specstory` and
   `build/sign-nested-binaries.cjs` correctly steps aside
   (`willElectronBuilderSign`) once a real identity exists.
3. **Verify, do not assume** — the same "check it off the DMG, not off
   `release/`" discipline BUILD-STATUS §4 already applies:
   `codesign --verify --deep --strict --verbose=2`, `xcrun stapler validate`,
   `spctl -a -vvv -t install`, and `test -f release/latest-mac.yml`. That last
   assertion is cheap insurance: drop the zip target as a size optimisation and
   the feed silently stops existing.
4. Set both `APPLE_API_ISSUER` **and** `APPLE_ISSUER` — electron-builder's docs
   name that variable differently on two pages — and assert in the job log that
   notarization actually ran rather than being skipped for missing credentials.
5. `timeout-minutes: 60`. Apple's notary queue is 2–15 minutes typically and has
   no SLA; runner size does not affect it.
6. Add `actions/attest-build-provenance@v4` over the DMG and ZIP. One step,
   free, and for an app that has been asking people to bypass Gatekeeper it is a
   real answer to "where did this binary come from".

**The five secrets**, and no more: `CSC_LINK` (base64 of a `.p12` export of the
Developer ID cert **with its private key**), `CSC_KEY_PASSWORD`, `APPLE_API_KEY`
(the `.p8`, written to a temp file by the workflow), `APPLE_API_KEY_ID`
(`8NH6JLTWBN`) and `APPLE_API_ISSUER`. Use the API-key form rather than
Apple-ID-plus-app-password — electron-builder's own docstring recommends it —
and remember that the issuer UUID is the one credential not currently on this
machine (§1.1).

---

### 7.10 Recommended workflow files

Five workflows and one composite action. Action majors are today's; **pin them
to commit SHAs** in the real files — tag mutation on popular actions is a live
supply-chain risk.

```
.github/
  actions/setup/action.yml      composite: node + caches + tmux + npm ci
  workflows/gates.yml           PR + push to main          ~6 min
  workflows/gates-skip.yml      docs-only twin, same job name, instant
  workflows/durability.yml      nightly + dispatch         ~13 min
  workflows/compat.yml          weekly on macos-26         ~13 min
  workflows/release.yml         on v* tags                 ~8–20 min
  workflows/runner-probe.yml    one-time, dispatch only    §7.11
```

**`.github/actions/setup/action.yml`**

```yaml
name: setup
description: Node, dependency caches, tmux, and npm ci.
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7          # v7.0.0
      with:
        node-version: '22.23.1'            # matches the dev machine
        cache: npm
    - name: Cache the Electron binary
      uses: actions/cache@v6               # v6.1.0
      with:
        path: ~/Library/Caches/electron
        key: electron-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}
    - name: Cache the vendored specstory tarball
      uses: actions/cache@v6
      with:
        path: build/vendor/specstory/cache
        key: specstory-${{ hashFiles('build/specstory-release.json') }}
    - name: tmux (confirmed absent from the runner image)
      shell: bash
      env:
        HOMEBREW_NO_AUTO_UPDATE: '1'
        HOMEBREW_NO_INSTALL_CLEANUP: '1'
      run: command -v tmux || brew install tmux; tmux -V
    - name: Install
      shell: bash
      run: npm ci                          # postinstall = electron-rebuild, ~30 s
```

**`.github/workflows/gates.yml`** — the loop that must stay fast.

```yaml
name: gates
on:
  pull_request:
    paths-ignore: ['docs/**', '**/*.md']
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']
concurrency:
  group: gates-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  gates:
    runs-on: macos-15          # never macos-latest
    timeout-minutes: 25
    env:
      NODE_OPTIONS: --max-old-space-size=5120
    steps:
      - uses: actions/checkout@v7          # build-info.ts stamps the short SHA
      - uses: ./.github/actions/setup
      - run: npm run typecheck             # ~10 s
      - run: npm test                      # ~45 s
      - run: npm run build                 # ~55 s — ONCE, see §7.6
      - name: T1 — a session survives a restart
        run: npm run smoke:create && npm run smoke:verify
      - name: T3 — restorable → restored → armed
        run: |
          GMUX_SMOKE=t3-prep   npx electron . --user-data-dir="$RUNNER_TEMP/t3"
          GMUX_SMOKE=t3-verify npx electron . --user-data-dir="$RUNNER_TEMP/t3"
      - name: The packaged bundle contains what it claims
        run: |
          npx electron-builder --mac --dir            # 4.3 s local
          GMUX_SMOKE=basic release/mac-arm64/Tortie.app/Contents/MacOS/Tortie \
            --user-data-dir="$RUNNER_TEMP/pkg"
      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: gates-logs
          path: |
            ${{ runner.temp }}/**/*.log
            out/*.png
          retention-days: 3
```

**`.github/workflows/durability.yml`** — everything agent-free the gate lane is
too slow to carry.

```yaml
name: durability
on:
  schedule: [{ cron: '0 9 * * *' }]
  workflow_dispatch:
concurrency: { group: durability, cancel-in-progress: true }
jobs:
  durability:
    runs-on: macos-15
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - uses: actions/cache@v6
        with:
          path: ~/Library/Caches/electron-builder      # dmg-builder, 96 MB
          key: ebuilder-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npm run build
      - run: |
          for m in migrate identity procid; do
            GMUX_SMOKE=$m npx electron . --user-data-dir="$RUNNER_TEMP/$m"
          done
      - run: npm run package                # full DMG + ZIP, ~110 s
      - run: |
          GMUX_SMOKE=basic release/mac-arm64/Tortie.app/Contents/MacOS/Tortie \
            --user-data-dir="$RUNNER_TEMP/pkg"
      # deliberately NOT here: smoke:capture, conformance:resume* — §7.2
```

`compat.yml` is `durability.yml` with `runs-on: macos-26` and a weekly cron.
`release.yml` is §7.9 plus §6.2's config and the five secrets below, with
`permissions: { contents: write, id-token: write, attestations: write }`.

---

### 7.11 The one-time runner viability probe

Nothing in §7.2 marked **probe** has been executed on a GitHub runner, because
there is no remote yet. This repo's standard is that a verifier who only reads
code has not verified, so the first workflow to write is not `gates.yml` — it is
a throwaway that answers the four open questions and replaces the estimates in
§7.4 with measurements.

```yaml
name: runner-probe
on: workflow_dispatch
jobs:
  probe:
    strategy: { fail-fast: false, matrix: { image: [macos-15, macos-26] } }
    runs-on: ${{ matrix.image }}
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - name: Q1 — hardware and image, as the runner sees it
        run: sysctl -n machdep.cpu.brand_string hw.ncpu hw.memsize; df -h /; sw_vers
      - name: Q2 — does the private tmux server come up
        run: |
          tmux -L gmux-probe -f resources/gmux-tmux.conf new -d -s p 'sleep 5'
          tmux -L gmux-probe ls && tmux -L gmux-probe kill-server
      - name: Q3 — does Electron open a window and does a pty flow bytes
        run: /usr/bin/time -l npm run smoke:t1
      - name: Q4 — the environment-dependent tests (BUILD-STATUS §7.12)
        run: npm test -- --reporter=verbose
      - name: Timings that replace the estimates in §7.4
        run: |
          /usr/bin/time -p npm run build
          /usr/bin/time -p npx electron-builder --mac --dir
          /usr/bin/time -p npx electron-builder --mac zip
```

What each answer changes. **Q1** replaces the 2.5× scaling factor with a
measurement. **Q2** is the only genuinely unknown dependency — tmux is absent
from the image and the config uses 3.2/3.3-era options. **Q3** is load-bearing:
if `show: false` windows and `forkpty` work under the emulated display, every
durability gate in §7.2 is available; if they do not, the gate lane shrinks to
typecheck + test + build + `--dir`, and the durability lane must move to a
dedicated Mac immediately rather than eventually. **Q4** tells you whether the
three environment-dependent tests survive a VM *before* they fail a PR that had
nothing to do with them.

---

## 8. The backlog entry, phased

Written so an implementer can execute it without re-reading the rest of the
document. Each phase names its **tier** (CLAUDE.md's rubric), the **files it
owns**, the **gates**, and the **evidence** that closes it. The ordering is not
cosmetic: it is arranged so that nothing irreversible happens before the thing
that proves it works exists, and so that every step that needs a remote or a
certificate is quarantined into a phase that says so.

**Three prerequisites, and which phases they gate**

| Prerequisite | Have it? | Gates |
|---|---|---|
| Developer ID cert + App Store Connect key | **Yes, already on this machine** (§1.1) | B, D, E |
| App Store Connect **issuer UUID** | No — a two-minute copy-paste from App Store Connect → Users and Access → Integrations → Keys | B |
| A GitHub remote | **No — coming** | D, E, F |

Phases **A** and **C** need none of the three and can start today.

---

### 8.A — Before the remote exists: correct the record and close the three defects

**Tier 3** (durability), except A1 which is Tier 1. Nothing here needs a remote,
a certificate or a network.

| # | Work | Files | Why it is first |
|---|---|---|---|
| A1 | Correct `BUILD-STATUS.md` §6 and the header comment in `electron-builder.yml`: the Developer ID cert **exists**. | `BUILD-STATUS.md`, `electron-builder.yml` (comments only) | Every future agent currently inherits a false blocker and defers the whole of §6 because of it. |
| A2 | `app.requestSingleInstanceLock()` + a `second-instance` handler that focuses the existing window. | `src/main/index.ts` | Every updater ends by relaunching, and Squirrel's relaunch races the old process's exit. Two Torties against one WAL manifest and one tmux server is a corruption path (§2.7). |
| A3 | `resolveConfPath()` asserts the file exists when `app.isPackaged` and throws a typed error; after `ensureServer()`, read back `history-limit` and refuse (or log loudly) if it is not 25000; stop passing `-f` when a server is already running. | `src/main/tmux/supervisor.ts`, `src/main/attach/attach-host.ts` | The only **silent** degradation found anywhere in the update path: a cold start with the bundle's conf missing yields a server at 8% of the promised scrollback, exit 0, no error (§2.5). Scrollback is what Restore replays. |
| A4 | Add `codesign --verify --deep --strict --verbose=2` and `codesign -d -r-` to the packaging gate, failing the build on a cdhash-only designated requirement once an identity is configured. | `build/` (a new `verify-signature.cjs`), `package.json` | The current build fails `--deep --strict` and nothing notices (§1.2). |
| A5 | Add build-free script variants `smoke:t3:only`, `smoke:capture:only`, `smoke:migrate:only` — the same commands without the `npm run build &&` prefix. Leave the composite scripts alone for human use. | `package.json` | Saves three redundant builds per CI job (~3.7 min of runner time) and costs nothing locally (§7.6). |

**Gates:** `npm run typecheck && npm run build && npm test && npm run smoke:t1 &&
npm run smoke:t3`.
**Evidence to close:** a packaged app launched with `Resources/gmux-tmux.conf`
deliberately deleted and **no** server running must refuse or log, never
silently produce `history-limit 2000`; a second `Tortie.app` launch must focus
the first window rather than open a second.

---

### 8.B — Needs Developer ID: the first signed, notarized build, cut by hand

**Tier 3.** Still no remote. Do this **locally, before any CI exists** — setting
up CI first means debugging secret management and the signing pipeline
simultaneously, over a ten-minute feedback loop, at $0.062 a minute.

1. Fetch the App Store Connect **issuer UUID** (the one missing credential).
2. Apply §6.2 to `electron-builder.yml`: `identity`, `hardenedRuntime: true`,
   `gatekeeperAssess: true`, `entitlements`, `notarize: true`. Create
   `build/entitlements.mac.plist` with exactly the three V8/Electron
   entitlements listed there — **not** `disable-library-validation`.
3. Confirm `build/sign-nested-binaries.cjs` steps aside via its
   `willElectronBuilderSign` branch, and that `NESTED_BINARIES` and
   `mac.binaries` still list the same file.
4. `npm run package`, then run **every** command in §6.4 against the built
   `.app`, the app inside the ZIP, and the app off the **mounted DMG**.
5. The line that matters: `codesign -d -r-` must print
   `identifier "com.specstory.tortie" and anchor apple generic and certificate
   leaf[subject.OU] = "4GRQMF5T5U"` — **not** a cdhash.
6. Install it over the running copy with sessions live, exactly as Phase 17 did,
   and re-run the Phase 17 evidence: session count, session-id list, manifest
   row count, before and after.
7. Tell the user, in the release notes, that this build costs **one** final TCC
   re-prompt (ad-hoc identity → team identity) and then never again — the same
   one-time-notice shape `src/main/migrate/notice.ts` already implements (§1.4).

**Evidence to close:** `spctl -a -vvv -t exec` reports
`source=Notarized Developer ID`; `stapler validate` passes on the `.app`, the
DMG and the ZIP; the session-id list is byte-identical across the swap.

---

### 8.C — Before the remote exists: versioning and data compatibility

**Tier 2** for the version plumbing, **Tier 3** for the schema work. No remote,
no certificate.

| # | Work | Files |
|---|---|---|
| C1 | `npm version` becomes the only bump tool; make `-dirty` **fatal** under `TORTIE_RELEASE=1`; leave `buildVersion` equal to `version` until CI can cut the same version twice, then `${version}.${run_number}`. First tag is `v0.18.0` (§3.3, §3.5). | `src/main/build-info.ts`, `electron.vite.config.ts`, `package.json` |
| C2 | `PRAGMA application_id` set once to a fixed constant; `PRAGMA user_version` written by the migration runner; a `meta` table carrying `min_compatible_version` and `last_opened_by` (§4.3). Keep the name-keyed `migrations` table as the runner's bookkeeping — it is the right mechanism for *applying* steps. | `src/main/db/sqlite.ts`, `src/main/manifest/store.ts` |
| C3 | The refusal: on manifest open, if `min_compatible_version > THIS_BUILD_SCHEMA`, do not migrate, do not open for writing, show the blocking plain-language screen in §4.4. | `src/main/manifest/`, one renderer surface |
| C4 | Make `settings.json`'s `"version": 1` real — read it, run on defaults for unknown keys, and **refuse to rewrite the file** when it is newer. Today an older build silently deletes every key it does not recognise on first write (§4.3). | `src/main/settings/store.ts` |
| C5 | `symbols.db`: if too new, **delete and rebuild**. Never refuse to boot over a cache (§4.6). | `src/main/symbols/` |
| C6 | Promote `scratchpad/downgrade-probe.cjs` to a standing test: apply the current `MIGRATIONS`, then assert the **previous release's** `insertSession()` column list still runs. Adopt the `Manifest-Migration: <name> (additive\|breaking)` commit trailer and a CI check that any diff touching `MIGRATIONS` carries it (§3.2, §4.6). | `src/main/manifest/__tests__/` |
| C7 | Before the **first** breaking migration, `VACUUM INTO <userData>/gmux/manifest.pre-schema-<N>.db` reusing the already-proven readonly path in `src/main/migrate/userdata.ts`. Do not write a second one (§4.5). | `src/main/manifest/` |

**Gates:** the standard battery **plus** `npm run conformance:resume:capture`
(CLAUDE.md's rule: anything under `manifest/**` or `restore/**`).
**Evidence to close:** the previous release's binary, run against a manifest
carrying a hypothetical breaking `006`, shows the refusal screen and writes
nothing — verified by fingerprinting the file before and after.

---

### 8.D — The day the remote lands

Everything in this phase is blocked on the remote existing, and the first item
decides more than it looks like it does.

1. **Decide public vs private, and decide it first.** Public makes the entire CI
   bill **$0** and unlocks the zero-infrastructure feed (§5.2); private forces
   the `generic`/R2 provider, because the GitHub provider on a private repo
   means a token inside the asar, and costs ≈$55/month (§9). `package.json`
   already says MIT.
2. **Run the one-time runner probe** (§7.11) — `workflow_dispatch`, both images,
   four questions. This is a few dollars and one afternoon and it is the
   difference between a CI plan and a CI hypothesis. Replace §7.4's derived
   figures with its measurements.
3. **Wire the five secrets**: `CSC_LINK` (base64 `.p12` of the Developer ID cert
   *with* its private key), `CSC_KEY_PASSWORD`, `APPLE_API_KEY` (the `.p8`,
   written to a temp file by the workflow), `APPLE_API_KEY_ID=8NH6JLTWBN`,
   `APPLE_API_ISSUER`. Set `APPLE_ISSUER` to the same value — electron-builder's
   docs name that variable differently on two pages.
4. **Land `gates.yml` + `gates-skip.yml` + the composite setup action** (§7.10).
   Pin every action to a commit SHA, not a tag.
5. **Publish `v0.18.0` as a draft release**, promote it by hand, and confirm the
   assets are `.dmg`, `.zip`, `.zip.blockmap` and `latest-mac.yml`.

---

### 8.E — Self-update, wired (needs Developer ID **and** the remote)

**Tier 2 for the plumbing, Tier 3 for the proof.** The risky halves were paid in
A and B.

1. `electron-updater` in **one module** (`src/main/updater/`), so the v27 API
   migration is a single file: `quitAndInstall(true,false)` →
   `quitAndInstall({isSilent,isForceRunAfter})` and `autoInstallOnAppQuit` →
   `autoInstallEvent`.
2. Behaviour per §5.8–§5.10: first check at **+30 s** (never at launch — Restore
   is replaying scrollback then), every **6 h** thereafter, silent download,
   `autoInstallOnAppQuit = true`, **never** call `quitAndInstall()` unprompted
   and never self-relaunch.
3. Exactly **one** new UI element: a Tortie-menu item under *About Tortie* that
   appears only when an update is staged —
   `Update to 0.19.0 — installs when you quit`. Plus *Check for Updates…*, the
   only path allowed to report "you are up to date" or an error. No toast, no
   badge, no modal.
4. `allowDowngrade` explicitly re-asserted `false` after any assignment to
   `channel` or any prerelease version — both flip it to `true` as a side
   effect (§4.4, §3.4).
5. A **post-update self-check**: on the first boot after `app.getVersion()`
   changes, verify `gmux-tmux.conf`, `Resources/bin/specstory`, the unpacked
   `rg` and the six tree-sitter `.wasm` files resolve; surface one quiet failure
   if any is missing. This is the one case where something *should* rise above
   the surface, because it is a failure.
6. A **halt script** — one command that reverts or deletes `latest-mac.yml` —
   and the roll-forward rule written down where a panicking operator will find
   it: *republishing an old version number does nothing; ship `0.19.1` carrying
   `0.18.0`'s bits* (§5.7).

**Evidence to close (Tier 3, and the only proof that counts):** publish
`0.18.0`, then `0.18.1`, and let the app update itself on this machine with
sessions live. Session ids byte-identical before and after, manifest row count
unchanged, scrollback intact, agents still resumable — twice.

---

### 8.F — CI industrialised

Only after E's recipe is known to work by hand. `durability.yml` (nightly),
`compat.yml` (weekly, `macos-26`), `release.yml` (`v*` tags only) per §7.10,
with `timeout-minutes` on every job — the default is the 6-hour platform cap and
one hung Electron smoke costs **$22.32** (§7.7).

**Deliberately not in CI, ever, on a hosted runner:** `smoke:capture`,
`conformance:resume`, `conformance:resume:capture` and `docs/ACCEPTANCE.md`.
They need installed agent CLIs and live credentials; on a runner they either
fail or, worse, pass vacuously (§7.2). Those stay local, once per phase, exactly
where BUILD-STATUS already puts them.

---

### 8.G — Deferred, each with the condition that reopens it

BUILD-STATUS §6 style, so a future agent can re-check cheaply rather than
re-argue.

- **Staged rollout** (`stagingPercentage`) — reopen when there is more than a
  handful of users. At n=1 it is theatre; it is one YAML key when that day comes.
- **A beta channel** — reopen the day a build is handed to a second person.
  `0.19.0-beta.1` *is* the channel; electron-builder infers it from the
  prerelease component and emits `beta-mac.yml`.
- **Sparkle** — reopen if bandwidth or rollout granularity becomes a real cost,
  and only if a maintained Electron bridge exists (today's only one has 4 stars).
- **Velopack** — reopen at its 1.0, if the `.node`/Vite bundling collision is
  resolved.
- **`update.electronjs.org`** — reopen only if the repo goes public *and* the
  release cadence is slow enough that deltas and channels do not matter.
- **electron-updater v27** — adopt on its stable release; the macOS-relevant
  breaking changes are two call sites, which is why E1 says "one module".
- **A self-hosted durability runner** — reopen when a *dedicated* Mac exists.
  Never this machine (§7.8).
- **x64 / universal builds** — reopen when someone runs Tortie on an Intel Mac.
- **release-it** — adopt if two consecutive releases ship without a changelog
  entry, or the tag ritual gets skipped (§3.6).
- **release-please** — adopt the day a second person commits, because pull
  requests will then exist (§3.6).

---

## 9. Costs

Prices verified 2026-08-12 from the vendors' own pages.

### 9.1 Money

| Item | Price | Tortie's exposure |
|---|---|---|
| Apple Developer Program | **$99/yr** | **Already paid** — the Developer ID cert exists and runs to 2031-06-02 (§1.1). No new spend. |
| Apple notary service | **$0** | Included in the programme. Unmetered. |
| `electron-updater` / `electron-builder` | **$0** | MIT, already in `devDependencies`. |
| GitHub Releases hosting + bandwidth | **$0** | 2 GiB/file (the ZIP is 168 MB); no cap on total release size or downloads. |
| GitHub Actions, **public repo** | **$0** | Standard hosted runners are free and unlimited on public repositories. |
| GitHub Actions, **private repo** | macOS **$0.062/min** at a **10× multiplier**; Linux $0.006/min at 1× | **≈$55/month** at the volumes in §7.8 (see below). |
| Actions cache storage | 10 GB/repo free, **$0.07/GB-month** beyond | The four caches total **~370 MB**. $0. |
| Actions artifact storage | 500 MB (Free) / 1–2 GB (Pro/Team) included, **$0.25/GB-month** beyond | **The real trap:** one release pair is **335 MB**. Never upload a DMG from the gate lane; `retention-days: 3` on logs. |
| Cloudflare R2 (only if the repo stays private) | **$0.015/GB-month**, **zero egress**, 10 GB free | ~$0 at Tortie's size. The `generic` provider's home. |
| Commercial updaters (ToDesktop, Nucleus, Hazel, Nuts) | tens of $/month | **Not bought.** They solve "I do not want to run a feed", which GitHub Releases already solves for free, and they want the signing pipeline. |

**Private-repo detail** (Pro: 3,000 included minutes ÷ 10× ⇒ **300 free macOS
minutes/month**):

| Lane | Volume | macOS minutes | Cost |
|---|---|---|---|
| gates | 120 runs × 6 min | 720 | $44.64 |
| durability nightly | 30 × 13 min | 390 | $24.18 |
| compat weekly (`macos-26`) | 4 × 13 min | 52 | $3.22 |
| release | 2 × 15 min | 30 | $1.86 |
| **gross** | | **1,192** | **$73.90** |
| less included allowance | | −300 | −$18.60 |
| **net** | | | **≈ $55/month** |

**The single most expensive mistake available** is not a lane — it is a missing
`timeout-minutes`. The default job cap is **6 hours**; one Electron smoke
hanging on a pty costs **$22.32** on its own.

**So the whole bill is a single decision.** Public repo ⇒ $0/month for
everything in this document, forever. Private ⇒ ≈$55/month plus an R2 bucket.
That decision also picks the update feed (§7.8), so make it once, deliberately,
before writing a workflow.

### 9.2 Wall clock, which is the cost that actually bites

| Thing | Cost | Notes |
|---|---|---|
| `npm run package` | **43.32 s** local, ~110 s derived on a runner | The number BUILD-STATUS never recorded (§7.4). |
| A full `gates` run | **5–7 min** warm, 8–10 cold | The loop the developer waits on. |
| Apple notary queue | **2–15 min**, no SLA, occasionally far longer | Not runner-speed; nothing buys it down. This is why `release` is tag-only. |
| A release, end to end | 8–20 min of CI + a human reading the artifacts | Draft-first means the human gate is asynchronous. |
| The release ritual by hand (§3.7) | ~15 min including the candidate run | Cheap enough to run fortnightly, which it must be: Electron ships majors every 8 weeks and only the latest minor of each line gets security fixes (§3.2). |

### 9.3 What is spent that is not money or minutes

**One TCC re-prompt.** Moving from the current ad-hoc identity to the Developer
ID identity invalidates macOS privacy grants exactly **once**. After that they
persist across every signed update — whereas *today* every rebuild re-asks
(§1.4). Signing is a net reduction in user friction, not an addition.

---

## 10. Risks, and everything that is not verified

### 10.1 Not verified — stated plainly so nothing here is mistaken for measurement

1. **A live notarization round-trip.** The App Store Connect **issuer UUID** is
   not on this machine and was not guessed (§1.1). Every other link in the chain
   — cert, key, notarytool 1.1.0, stapler, Xcode 26.3 — is present and was
   checked. This is the single unverified step in the signing story and it is a
   two-minute step.
2. **An end-to-end self-update.** It cannot be performed until §8.B is done.
   That is the point of the document, not a gap in it.
3. **No GitHub runner has executed any of §7.** There is no remote. Every
   runner-side figure is *derived* at ≈2.5× the local wall clock from a 3-core
   M1 against a 12-core M4 Pro. §7.11 is the one-time probe that must run before
   the CI plan is quoted as proven; until then, treat every row marked `probe`
   in §7.2 as a hypothesis.
4. **The in-place-overwrite kill (§2.3) is deferred, not demonstrated.** The
   test process survived a two-second observation window because its pages were
   already resident. The operational rule — *replace by rename, never overwrite
   in place* — does not depend on which way that resolves, and Squirrel.Mac
   obeys it.
5. **`npm test` under a VM.** BUILD-STATUS §7.12's two FSEvents tests and one
   process-ancestry test are the ones most likely to behave differently on a
   virtualised runner. Probe Q4 exists to find that out before it fails a PR
   that had nothing to do with it.
6. **Delta-update behaviour in practice.** macOS deltas are read from
   electron-updater's source and changelog, not observed. The fallback to a full
   download is explicit and logged, so the worst case is a 168 MB download, not
   a failure.

### 10.2 Risks, ranked by what they cost the user

| Risk | Likelihood | Cost if it happens | Mitigation, and where |
|---|---|---|---|
| **Cold start with the bundle's tmux conf missing** ⇒ a private server at `history-limit 2000` instead of 25000, exit 0, no error | Real today, and updates add a new way to reach it | Restore replays 8% of the scrollback it promised. **Silent.** | §8.A3 — assert the path, read back the sentinel option |
| **Two Torties after an update relaunch** against one WAL manifest and one tmux server | Certain to be attempted; no lock exists | Manifest corruption, double adoption | §8.A2 — `requestSingleInstanceLock()` |
| **An older build silently writes NULLs into a newer manifest** | Whenever a user drags an old `.app` back | Rows the new build cannot restore. **Data loss by silence** — worse than the loud failure | §8.C2/C3 — `min_compatible_version` + refusal |
| **An older build silently deletes unknown `settings.json` keys** on first write | Same trigger | Preferences lost; recoverable but wrong | §8.C4 |
| **A breaking migration ships without anyone noticing it was breaking** | Whenever a migration is written under time pressure | The previous build throws at `insertSession()` — Step 0 of session creation, i.e. *after* the user committed to starting work | §8.C6 — the standing downgrade test + the `Manifest-Migration:` trailer |
| **Two artifacts published at one version** | Already happened: `release/` holds both `gmux-0.0.1-arm64.dmg` and `Tortie-0.0.1-arm64.dmg` — two materially different apps at one version string | Nothing broke because nothing consumed the number. A feed *is* a consumer: users get served a build they already have, or worse | §3.7 — never cut two artifacts at one version; `rm -rf release` before packaging (§7.9) |
| **A hook writes into the bundle after signing** | Low, but `after-pack.cjs` already rewrites helper plists and only escapes because `afterPack` precedes `signApp` | Gatekeeper failure on the *user's* machine, not a build error | §6.3 — and a comment in `after-pack.cjs` saying why the order is load-bearing |
| **`allowDowngrade` flipped to `true` by accident** | Genuinely easy: assigning `channel` sets it as a side effect, as does a prerelease component in the running version | An older build reachable by machine, which defeats the whole of §4 | §8.E4 — re-assert `false` after any such assignment |
| **A CI gate that passes because nothing was tested** | High if `conformance:resume:capture` is wired in naively — on a runner with no agents it is **10 SKIP, exit 0, green** | False confidence in the one claim Tortie most needs to be true | §7.2 — keep it local; if ever wired, `GMUX_CONF_STRICT=1` **and** assert ≥1 agent resolved |
| **Action tag mutation** (supply chain) | Ongoing industry risk | Arbitrary code in the job that holds the signing secrets | §7.10 — pin every action to a commit SHA |
| **A hung job at the 6-hour default cap** | One flake away | **$22.32** per occurrence on a private repo | §7.7 — `timeout-minutes` on every job |
| **Notary queue stalls a release** | 2–15 min typical, no SLA | A slow release, nothing more | `timeout-minutes: 60`; release is tag-only so it never blocks the loop |

### 10.3 The risk that is conspicuously absent

**Losing the user's work.** Across every failure mode above, the worst realistic
outcome is *a Tortie that will not launch*. The tmux server, all 44 sessions,
every agent, the manifest and every snapshot are untouched, and reinstalling
from the DMG recovers the view. That is not luck — it is the architecture, and
it is the reason a refusal screen (§4.4) is an acceptable answer here and would
be an unacceptable one in an app that owned its own processes. It should be said
out loud in the release notes for the first self-updating build.

---

## 11. Sources

All fetched or measured **2026-08-12**.

Four load-bearing external facts were re-fetched independently at synthesis time
and all four held: `electron-updater` `latest` = **6.8.9**, `next` =
**7.0.0-alpha.5** (npm dist-tags); GitHub-hosted macOS runners = **$0.062/min**
for 3–4 core, $0.102 for 5-core arm64, Linux $0.006, Windows $0.010 (GitHub
Docs, Actions runner pricing); `electron` `latest` = **43.4.0**, `beta` =
44.0.0-beta.3 — this tree is one patch behind on 43.3.0, exactly as §3.2's
cadence argument predicts; Sparkle `2.9.5`, published **2026-08-02** (GitHub
releases API), confirming it is alive and that the reason to decline it is the
shim, not the framework.

### 11.1 Versioning, release tooling and data compatibility

- npm registry: [`@changesets/cli` 3.0.0](https://www.npmjs.com/package/@changesets/cli) (2026-08-11) ·
  [`semantic-release` 25.0.9](https://www.npmjs.com/package/semantic-release) (2026-08-05) ·
  [`release-please` 17.11.1](https://github.com/googleapis/release-please) (2026-07-31) ·
  [`release-it` 21.0.2](https://github.com/release-it/release-it) (2026-08-09) ·
  [`conventional-changelog` 8.1.2](https://www.npmjs.com/package/conventional-changelog) (2026-08-10) ·
  `conventional-changelog-cli` 5.0.0 **deprecated** · `standard-version` 9.5.0 (2022) ·
  [`commit-and-tag-version` 13.1.2](https://www.npmjs.com/package/commit-and-tag-version) (2026-07-28) ·
  `changelogen` 0.6.2 (2025-07-06, dormant) ·
  [`git-cliff` v2.13.1](https://github.com/orhun/git-cliff) (2026-04-26)
- [Announcing Changesets v3](https://changesets.dev/blog/announcing-changesets-v3) — 2026-08-11, breaking v2→v3
- [electron-updater `AppUpdater.ts`](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/AppUpdater.ts)
  — semver parse/compare, `allowPrerelease`, `allowDowngrade`, the `channel` setter, `.updaterId` bucketing
- [electron-builder `MacConfiguration`](https://www.electron.build/electron-builder.Interface.MacConfiguration.html)
  and [Configuration](https://www.electron.build/docs/configuration/) — `buildVersion` → `CFBundleVersion`,
  `${version}.${buildNumber}`, channel inferred from the prerelease component
- [Chromium `sql/meta_table.h`](https://chromium.googlesource.com/chromium/src/+/HEAD/sql/meta_table.h)
  — version vs compatible-version semantics
- [Electron release timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)
  — 8-week majors, latest three supported, latest minor only
- [GitHub automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
  — merged pull requests only; `gh` 2.95.0 `--generate-notes`
- In-repo, measured: `src/main/db/sqlite.ts`, `src/main/manifest/store.ts`,
  `src/main/settings/store.ts`, `src/main/build-info.ts`,
  `electron.vite.config.ts`, `electron-builder.yml`, the live manifest pragmas,
  `/Applications/Tortie.app/Contents/Info.plist`, and `release/`

### 11.2 Signing, notarization and the updater

Primary sources read: `Squirrel/Squirrel.Mac` (`SQRLUpdater.m`,
`SQRLInstaller.m`, `SQRLCodeSignature.{h,m}`, README, commit log),
`electron-userland/electron-builder` (`MacUpdater.ts`, `AppUpdater.ts`,
`macOptions.ts`, `macPackager.ts`, `publishOptions.ts`, the electron-updater
CHANGELOG), `electron/update.electronjs.org` README, Electron `autoUpdater`
docs, the `sparkle-project/Sparkle` releases API, npm registry metadata for
`electron` and `electron-updater`, GitHub Actions billing docs, Cloudflare R2
pricing, and the Apple Developer Program membership page.

### 11.3 CI, runners, images and pricing

- GitHub Docs: [Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)
  (macOS 3–4 core **$0.062/min**, 5-core arm64 $0.102, Linux $0.006, Windows $0.010) ·
  [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
  (macOS arm64 = **3 cores / 7 GB / 14 GB SSD**; free and unlimited on public repos) ·
  [Actions billing][gha-billing] (2,000 / 3,000 / 3,000 / 50,000 included minutes;
  **macOS 10×**, Windows 2×; artifacts $0.25/GB-month, cache $0.07/GB-month beyond 10 GB) ·
  [Actions limits](https://docs.github.com/en/actions/reference/limits)
  (**5 concurrent macOS jobs** Free/Pro/Team, 50 Enterprise; 6 h job cap) ·
  [workflow syntax → concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) ·
  [secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [`actions/runner-images` macos-26-arm64 readme](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)
  — image `20260728.0273.1`, macOS 26.5.2, Xcode 26.6, Node 24.18.0 (22.23.1 cached),
  Homebrew 6.0.13, **no tmux** ·
  [macos-26 GA](https://github.blog/changelog/2026-02-26-macos-26-is-now-generally-available-for-github-hosted-runners/) ·
  [`macos-latest` → macos-26, June 2026](https://github.com/actions/runner-images/issues/14167) ·
  [runner-images discussion #5730](https://github.com/actions/runner-images/discussions/5730)
  — hosted macOS runners have an **emulated display**; headless self-hosted Macs do not
- [Actions cache >10 GB](https://github.blog/changelog/2025-11-20-github-actions-cache-size-can-now-exceed-10-gb-per-repository/) ·
  [dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- Action majors from the GitHub API: `actions/checkout` **v7.0.1** (2026-07-20),
  `actions/setup-node` **v7.0.0**, `actions/cache` **v6.1.0**,
  `actions/upload-artifact` **v7.0.1**, `actions/download-artifact` **v8.0.1**,
  `actions/attest-build-provenance` **v4.2.2** (2026-08-06),
  `apple-actions/import-codesign-certs` **v7.0.0**, `softprops/action-gh-release` **v3.0.2**
- electron-builder [notarization](https://www.electron.build/docs/features/code-signing/notarization/)
  (**staples automatically**; API-key auth for CI) ·
  [auto-update](https://www.electron.build/docs/features/auto-update/)
  (**zip target required** or `latest-mac.yml` is not created) ·
  [troubleshooting](https://www.electron.build/docs/troubleshooting/)
  (`ELECTRON_BUILDER_CACHE` → `~/Library/Caches/electron-builder`)
- npm dist-tags: `electron` **43.4.0** (44.0.0-beta.3) · `electron-builder`
  `latest` **26.15.3** but `v26` **26.15.7** — pin exactly · `electron-updater`
  **6.8.9** · `@electron/rebuild` **4.2.0** · `@electron/notarize` **3.1.1**
- Measured in an isolated scratch copy (no writes to the working tree):
  `npm ci` cold **8.66 s / 106 MB**, warm **4.80 s**; electron extract **0.84 s**
  from a **122,102,881 B** zip; `electron-rebuild -f` **11.23 s**,
  `--build-from-source` **10.71 s**, no-op **0.08 s**; `typecheck` **3.84 s**;
  `build` **21.20 s / 3.76 GB peak RSS**; `--mac --dir` **4.31 s**; `--mac zip`
  **18.64 s**; **`package` 43.32 s** → DMG **167,824,496 B** + ZIP
  **167,301,007 B** + blockmaps; `node_modules` 776 MB;
  `~/Library/Caches/electron-builder` = 96 MB `dmg-builder@1.2.5` + 22 MB;
  `build/vendor/specstory` = 41 MB bin + 16 MB cache; `vtool -show-build` on
  `pty.node` (**minos 11.0**, sdk 26.2) and better-sqlite3's prebuild
  (**minos 11.0**, sdk 15.5); `LSMinimumSystemVersion 12.0`;
  `node_modules/electron/install.js:46` (`electron_config_cache`);
  `src/main/index.ts` (`show: false`, the T3 header, `GMUX_SMOKE_AGENT`);
  `src/main/conformance/resume.ts` (SKIP-when-not-installed, `exitCodeFor`,
  `GMUX_CONF_STRICT`); `package.json` scripts; `build/sign-nested-binaries.cjs`

### 11.4 Link definitions

[apple-fee]: https://developer.apple.com/programs/whats-included/
[doyensec]: https://blog.doyensec.com/2026/02/16/electron-safe-updater.html
[tcc]: https://hacktricks.wiki/en/macos-hardening/macos-security-and-privilege-escalation/macos-security-protections/macos-tcc/index.html
[sparkle-shim]: https://github.com/Innei/electron-sparkle-updater
[velopack]: https://docs.velopack.io/getting-started/javascript
[r2]: https://developers.cloudflare.com/r2/pricing/
[gha-billing]: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
