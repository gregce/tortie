# 30 — SpecStory distribution, drift and provider discovery

Investigated and assembled 2026-08-12 on macOS 15.7.9 (24G830), arm64.

Four questions, four parallel investigators, one document. **§1** bundle-vs-discover-vs-hybrid
for `specstory-cli`. **§2** agent-version drift. **§3** dynamic SpecStory provider support.
**§4** the book icon. **§5** is a backlog-ready phase entry covering all four with per-item
verification tiers; **§6** is risks and the honest list of what was reasoned rather than
measured.

**§0 comes first and overrides the sections it corrects** — the investigators worked
blind to each other and contradicted each other in three places, each re-measured before
assembly.

Everything marked *measured* was produced by a command run on this machine on 2026-08-12.
All repository and binary access was read-only; the only `specstory` invocations were
`--version`, `--help` and deliberately-invalid provider ids run from scratch working
directories and a scratch `HOME`. The user's `~/.specstory` was not written to, not synced,
and `auth.json` was stat'd but never read.

**The four answers in one line each.** (1) Keep bundling, but resolve newest-wins across
every copy on disk inside a compatibility band — never build a runtime downloader, because
the bundled copy cannot be updated in place once the app is properly signed. (2) The
manifest records the wrapper's version and not the agent's; add it, then warn on missing
flags rather than on version numbers. (3) The provider list is *already* dynamic and
already correct — the real gap is a closed vocabulary, and the best probe surface is
`specstory list <sentinel>`. (4) The book exists in vector, vendor-sanctioned in
monochrome; the conversion is specified and baked in §4.4.

---

# §0 Synthesis note — where the four investigations disagreed, and who was right

The four sections below were produced by parallel investigators who did not see each
other's work. Three places they contradicted each other were re-measured independently
on 2026-08-12 before this document was assembled. **Read this section first; it overrides
the sections it corrects.**

### 0.1 The provider probe must be `list`, never `run` — §3 is right, §1 and §4 are wrong

§1.7 step 4 and §4.7 gap 3 both propose probing with `specstory run <sentinel>`. §3.3
found that `run`'s `RunE` calls `config.EnsureDefaultProjectConfig()` and writes into the
probe's working directory. Re-measured here from two scratch `HOME`s and two empty
directories:

```
$ (cd emptyA && HOME=scratchA specstory list __tortie_provider_probe__ …)
  9 provider lines, exit 1, stdout 0 bytes, stderr 549 bytes
  emptyA afterwards:  .  ..                        ← nothing written

$ (cd emptyB && HOME=scratchB specstory run  __tortie_provider_probe__ …)
  9 provider lines, exit 1
  emptyB afterwards:  .  ..  .specstory/cli/config.toml   ← written
```

This is worse than "a stray file in the probe cwd", because **`probeProviders()` passes
no `cwd` at all** (`src/main/specstory/capture.ts:96` calls `runGuarded` without the
`cwd` option, and `src/main/proc/guarded.ts:196` only forwards `cwd` when it is set). The
probe therefore inherits the Electron main process's working directory — `/` under
launchd, but the terminal's directory when Tortie is started from a shell, i.e. very
plausibly one of the user's repositories. A `run`-based probe would drop an uninvited
`.specstory/cli/config.toml` into an unpredictable location on every app start.

**Resolution: `specstory list <sentinel>` is the probe.** Everywhere the phase touches
this, `run` appears only as the ladder's second rung (`run --help`, which is read-only and
is what ships today). Whichever probe is used, pass an explicit `cwd` — a directory
Tortie owns — rather than inheriting one.

### 0.2 There are three copies of specstory on this machine, not two — §1 is right

§4.7 describes "two (bundled 2.8.0 and `/opt/homebrew/bin/specstory`)". §1 found three.
Re-measured:

| Path | Version | Note |
|---|---|---|
| `/opt/homebrew/bin/specstory` | **2.5.0** | **wins `command -v`** — this is what a first-PATH-hit resolver picks |
| `/usr/local/bin/specstory` | **2.6.0** | `install.sh` copy; newer, shadowed, invisible to `brew upgrade` |
| `/Applications/Tortie.app/…/bin/specstory` | **2.8.0** | bundled, installed |
| `/Users/gdc/gmux/build/vendor/specstory/bin/specstory` | 2.8.0 | build vendor dir |
| `~/.local/bin/specstory` | absent | — |

Three versions spanning three minors, on the machine of the person the app is being
built for. This is the strongest single argument for §1's recommendation, and the
`/usr/local` copy is exactly the one a "probe the first PATH hit" resolver never sees.

### 0.3 The mission's premise about the Settings list is wrong — §3 and §4 independently agree

The brief describes the "Capture new sessions" list as "currently a hardcoded-looking
list". It is hardcoded-*looking* and genuinely dynamic: `capture.ts` probes the resolved
binary, parses `Available provider IDs:`, and intersects with the registry. §3 and §4
reached this conclusion separately and their arithmetic matches (9 in the binary → 8 known
to Tortie → 7 intersect → 6 shown, `droid` not installed). **A SpecStory provider that
Tortie already supports as an agent already appears with no Tortie release.** The genuine
gap is narrower and is stated in §3.2: the *vocabulary* is closed, so an id Tortie has
never heard of is silently discarded. Today that is exactly `qwen`.

### 0.4 Format stability of the probe surface, extended to a third version

§3 verified the per-line provider format on 2.5.0 and 2.8.0. The 2.6.0 copy found in §0.2
gives a third data point, re-measured here — identical shape on all three, 8 providers on
2.5.0 and 2.6.0, 9 on 2.8.0 (`copilotide` added). The regex §3.4 proposes matched **9 of
9** lines on 2.8.0 with no false positives.

---

# §1 Bundle, discover, or hybrid — how Tortie should ship specstory-cli

Investigated 2026-08-12 on macOS 15.7.9 (24G830), arm64. Every claim below marked
*measured* was produced by a command run on this machine that day; sources are
`/Users/gdc/getspecstory` (read-only, working tree `dev`), the public GitHub API, the
Homebrew tap, and Tortie's own packaged `release/mac-arm64/Tortie.app`. Nothing in the
user's `~/.specstory` was written, and `auth.json` was stat'd but never read.

**Recommendation up front: hybrid, prefer-newest, no runtime downloader.** Keep bundling.
Stop preferring the bundled copy unconditionally. Pick the newest of {bundled, every copy
on disk} inside a declared compatibility band, prove the choice with a capability probe
rather than semver faith, and pin the resolved path + version + cdhash per session in the
manifest. Do **not** build a mechanism that downloads a replacement specstory at runtime —
§1.4 shows the bundled copy cannot be updated in place at all once the app is properly
signed, and §1.2 shows the channel that would justify the machinery (Homebrew) already
exists, is auto-bumped by SpecStory's own release workflow, and shares Tortie's config and
auth by construction.

---

## 1.1 What Tortie does today

| Fact | Value | Source |
|---|---|---|
| Pinned version | 2.8.0, tag `v2.8.0` | `build/specstory-release.json` |
| Fetched by | `build/before-pack.cjs` → `build/fetch-specstory.cjs`, hash-verified twice | build scripts |
| Lands at | `Contents/Resources/bin/specstory` (+ `specstory.json` sidecar) | `electron-builder.yml:158` |
| Signed by | `build/sign-nested-binaries.cjs` — ad-hoc, `--options runtime`, identifier `com.specstory.tortie.specstory` | measured: `codesign -dv` on the packaged app |
| Size on disk | 43,207,712 bytes (41 MB) of a 449 MB app; ~16 MB of a 168 MB DMG | measured: `du`, `ls` |
| Resolution order | **bundled first**, installed only as fallback | `src/main/specstory/resolve.ts` `resolveOnce()` |
| Tortie's own update channel | **none** — `publish: null`, version `0.0.1` | `electron-builder.yml:218`, `package.json:4` |

The last two rows are the whole problem. Tortie prefers a frozen copy, and Tortie has no
way to unfreeze it short of a hand-downloaded 168 MB DMG.

## 1.2 How specstory-cli is actually distributed

**Three channels, no npm.**

1. **GitHub releases** — GoReleaser, four platforms, `.tar.gz` and `.zip`
   (`SpecStoryCLI_Darwin_arm64.tar.gz`, 16,256,374 bytes for v2.8.0), plus a
   `SpecStoryCLI_<version>_checksums.txt`. Measured via the releases API.
2. **`install.sh`** — `curl | tar` of `releases/latest` into `/usr/local/bin`, `sudo` if
   needed. No uninstall, no version selection, no update command.
3. **Homebrew tap `specstoryai/tap`** — and this is the important one: the release
   workflow's `update-homebrew-tap` job downloads the fresh artifacts, recomputes all four
   SHA-256s and pushes `Formula/specstory.rb` to `specstoryai/homebrew-tap` **in the same
   run that publishes the release** (`.github/workflows/release.yml`). Brew is not a
   lagging mirror; it is same-minute.
4. **npm** — does not exist. `https://registry.npmjs.org/specstory` → `{"error":"Not found"}`
   (measured).

**The tap ships the identical bytes Tortie bundles.** The formula's darwin-arm64 sha256 is
`ef70a4278ab5ef2f98618e517fc2d61b2aba192dffd42a46ea03d2de9141bf24`, byte-for-byte the
`assetSha256` in `build/specstory-release.json`. Bundling and `brew install` are the same
artifact; only the cadence differs.

**Cadence, measured from the releases API:**

| Release | Published | Gap |
|---|---|---|
| v2.4.0 | 2026-07-20 | — |
| v2.5.0 | 2026-07-24 | 4 d |
| v2.6.0 | 2026-08-04 | 11 d |
| v2.7.0 | 2026-08-07 | 3 d |
| v2.8.0 | 2026-08-10 | 3 d |

Nine minor releases between 2026-06-29 (v2.0.0) and 2026-08-10 (v2.8.0) — **a release
every 4.9 days on average**. A Tortie build that ships today and is not re-cut for a
quarter will be roughly eighteen specstory releases behind.

**There is no self-update.** The command list of the bundled 2.8.0 is
`check help list login logout reindex resume run search skills sync version watch` —
no `update`, no `upgrade` (measured: `specstory --help`). The only update machinery in the
CLI is `pkg/utils/version_update.go`, which does a 2.5 s `HEAD` against
`github.com/…/releases/latest`, compares strings and prints a box telling the user to visit
the docs. It never writes anything. So neither the bundled nor an installed copy will ever
rewrite itself, and Tortie's `--no-version-check` on every invocation is what keeps that box
out of the user's pane. Measured, on this machine:

```
$ /opt/homebrew/bin/specstory run --help          # brew copy, 2.5.0
╭─────────────────────────────────────────────────────────────╮
│                   Update Available! 🚀                      │
│ Current version: 2.5.0                                      │
│ Latest version:  2.8.0                                      │
```

## 1.3 Where config and auth live, and whether copies can share them

They share everything, by construction. `utils.GetAuthPath()` is literally
`filepath.Join(homeDir, ".specstory", "cli", "auth.json")` — home-derived, not
binary-derived, and a grep of `os.Getenv("SPECSTORY…")` across the CLI returns nothing that
relocates it.

Measured on this machine:

| Path | State |
|---|---|
| `~/.specstory/cli/auth.json` | present, mode 0600, 1,083 bytes (not read) |
| `~/.specstory/cli/config.toml` | present, 2,772 bytes |
| `~/.specstory/sessions.db` | present, **3,212,251,136 bytes (3.2 GB)** |
| `<project>/.specstory/history/*.md` | per-project, cwd-derived |

Consequences for the distribution question:

- **One `specstory login` serves every copy.** A bundled copy cannot strand the user in a
  second account, and Tortie's `specstoryEnv()` already guarantees it never doctors `HOME`.
- **`sessions.db` is shared mutable state, and it is enormous.** Research 13 §2.4 calls it
  a derived cache that "can be deleted and rebuilt". True, but at 3.2 GB a `reindex` is not
  a shrug. If two copies of materially different vintages alternate over it, the recovery
  path is expensive. That is an argument for *converging* the versions in use, which the
  hybrid does, and against *deliberately running two* — which nothing here proposes.
- **Config is additive TOML with unknown keys ignored**, so an older copy reading a config
  written under a newer one degrades to ignoring new keys.
- Do not write `[version_check] enabled = false` into the user's config to silence the nag.
  It is the user's file and their own terminal copy would go quiet too. The per-invocation
  `--no-version-check` flag is the right tool and Tortie already uses it.

## 1.4 The macOS signing reality, measured

This is where the options separate, so it was tested rather than asserted.

### Can a bundled copy be updated in place, independently of the app?

**No — not once the app carries a real signature.** Built a minimal signed bundle, signed
inside-out exactly the way `build/sign-nested-binaries.cjs` does, then swapped the nested
binary and re-signed *it*:

```
$ codesign --force --sign - --options runtime SealTest.app/Contents/Resources/bin/specstory
$ codesign --force --sign - --options runtime SealTest.app
$ codesign --verify --strict SealTest.app
SealTest.app: valid on disk
SealTest.app: satisfies its Designated Requirement

# swap the nested binary, re-sign the nested binary only:
$ cp /bin/cat SealTest.app/Contents/Resources/bin/specstory
$ codesign --force --sign - --options runtime SealTest.app/Contents/Resources/bin/specstory
$ codesign --verify --strict SealTest.app
SealTest.app: a sealed resource is missing or invalid
file modified: …/SealTest.app/Contents/Resources/bin/specstory       exit=1
$ spctl --assess --type execute SealTest.app
SealTest.app: a sealed resource is missing or invalid                exit=1
```

`Contents/Resources/bin/specstory` is a sealed entry in the bundle's `CodeResources`
(confirmed by parsing the plist: `files2['Resources/bin/specstory'] = {hash2: …}`).
Re-sealing the bundle requires the Developer ID private key, which is on the release
machine and never on the user's. **An in-place bundled-copy auto-update is not a policy
choice; it is impossible.**

**And there is a trap in today's build.** The shipped `Tortie.app` is
`adhoc,linker-signed` with `Identifier=Electron` and has **no `_CodeSignature/CodeResources`
at all** (measured — the file does not exist). So a swap of the nested binary works fine
*today* and would start failing the day Developer ID signing lands. Any code written now
against "we can just replace the bundled binary" would pass every local test and break at
the exact moment the app becomes distributable. Write it down; do not build it.

### Can a binary downloaded post-install run at all?

**Yes, and Gatekeeper is not the obstacle people expect.** Measured on macOS 15.7.9:

| Test | Result |
|---|---|
| xattrs on a tarball fetched by Node's `fetch` | `com.apple.provenance` only — **no `com.apple.quarantine`** |
| Extracted binary, no quarantine, exec | `2.8.0 (SpecStory)`, exit 0 |
| Same binary with `com.apple.quarantine` = `0001`, `0003`, `0083`, exec | exit 0 in all three cases |
| `spctl --assess --type execute` on that binary | `rejected`, exit 3 |

Gatekeeper's assessment gate is applied by LaunchServices (`open`, Finder double-click) and
by dyld for loaded libraries. A plain Mach-O `posix_spawn`ed by a parent process is not
assessed. Upstream release binaries are `adhoc,linker-signed`, `Identifier=a.out`,
`TeamIdentifier=not set` (measured on the brew copy, the `install.sh` copy and a fresh
extract) — which satisfies arm64's "must be signed with *something*" rule and nothing more.
Tortie's hardened runtime, when it lands, constrains what loads *into* Tortie's own
processes; it does not constrain what a child process is, and specstory is exec'd by tmux
two levels down anyway.

So the honest obstacle to a runtime downloader is **not** signing. It is:

1. **Supply chain.** A binary fetched at runtime is not covered by Tortie's notarization.
   Tortie would have to carry the hash-pinning discipline `fetch-specstory.cjs` already has,
   at runtime, offline-tolerant, behind corporate proxies.
2. **A writable exec path with Tortie's TCC identity.** A managed copy in
   `<userData>/gmux/specstory/…` is writable by anything running as the user, and Tortie
   would exec it with Tortie's responsible-process identity and whatever Files-and-Folders
   grants the user gave Tortie. The bundled copy has the same weakness today and loses it
   the moment the app is sealed. Mitigation is cheap if this is ever built — record the
   cdhash at install and re-verify before each spawn; measured cost of
   `codesign -dv --verbose=4` is **under 10 ms**, versus **~0.09 s** for a full SHA-256 of
   the 43 MB binary. Use the cdhash.
3. **A whole subsystem** — fetch, verify, stage, atomically swap, garbage-collect old
   versions, handle "user is on a plane", handle "IT blocks github.com" — built for a
   product that does not yet auto-update itself, to duplicate a channel (`brew upgrade
   specstory`) that is already same-minute and already shares the auth file.

## 1.5 What happens when the two disagree — measured, not hypothesised

The disagreement is real on the author's own machine right now:

| Copy | Version | Note |
|---|---|---|
| `/opt/homebrew/bin/specstory` | **2.5.0** | Homebrew; **wins PATH** |
| `/usr/local/bin/specstory` | **2.6.0** | `install.sh`; newer, and PATH-shadowed |
| `Tortie.app/…/Resources/bin/specstory` | **2.8.0** | bundled |

Three versions, and the *oldest* is the one PATH resolves. Tortie's `probeInstalled()` uses
`resolveBinaryAgainst('specstory', pathValue, extraBinDirs())`, which takes the first PATH
hit — so on this machine Tortie's "installed" candidate is 2.5.0 while a 2.6.0 sits one
directory later. **Probe every candidate location and take the newest**, rather than taking
the first. On this machine that single change moves the answer from 2.5.0 to 2.6.0.

The failure mode of an out-of-date copy is not subtle. The registered provider set differs
by version (measured, `run --help`):

| Version | Registered providers |
|---|---|
| 2.5.0, 2.6.0 | antigravity, claude, codex, cursor, cursoride, deepseek, droid, gemini (8) |
| 2.8.0 | the same **+ copilotide** (9) |

and asking an older copy for a newer provider fails hard and legibly:

```
$ /usr/local/bin/specstory --no-version-check list copilotide     # 2.6.0
Provider 'copilotide' is not a valid provider implementation

The registered providers are:
  - antigravity - Antigravity CLI
  …
exit=1
```

Note also that `muse` — the provider research 13 §1.1 tables — is **not** in the released
2.8.0. It was branch-only (`muse-provider`) and did not ship. Anything Tortie composes for
`muse` against the bundled copy would hit the error above.

The full disagreement matrix, and the ruling for each case:

| installed vs bundled | Ruling | What Settings says |
|---|---|---|
| identical (the common case — brew ships Tortie's exact bytes) | either; report as one | "specstory 2.8.0 (bundled, matches your Homebrew copy)" |
| installed **older** | **bundled wins** | "Using the bundled 2.8.0. Your installed copy is 2.5.0 — `brew upgrade specstory` to catch up." Never run it for them. |
| installed **newer, same major** | **installed wins**, after the provider-list probe passes | "Using your installed 2.9.0 (newer than the bundled 2.8.0)." |
| installed **newer, different major** | **bundled wins**, and warn | "Your installed 3.0.0 is a major version ahead of the 2.8.0 Tortie was built against; using the bundled copy." A major bump is exactly when argv semantics move. |
| installed unparseable / won't exec | bundled wins, silently | current behaviour, keep it |
| neither resolvable | capture toggle disabled with a reason | can only happen unpackaged; impossible in a shipped app |

## 1.6 The three options, honestly

### (a) Bundle only — today's shape

**For.** Capture works on a machine that has never heard of SpecStory, which is the whole
reason it was bundled. The bundled version is the one every argv template in
`src/main/specstory/wrap.ts` was verified against. One stable path for signing and TCC.
Supply chain closed by two hash checks at build time. Tamper-evident under the seal once
the app is signed. All of the signing work is done and exercised on every package.

**Against.** It pins a dependency that ships every 4.9 days to a release train that has
shipped zero times and has `publish: null`. A specstory fix reaches users only as a 168 MB
DMG they must find and download. And the resolver being bundled-*first* actively discards
the user's newer copy: someone who runs `brew upgrade specstory` the hour it releases still
gets Tortie's frozen 2.8.0. The 41 MB is the least interesting cost.

### (b) Discover only — like the agent CLIs

**For.** −41 MB app, −16 MB DMG. The user's cadence, not Tortie's. No nested-binary signing
step. Symmetric with how Tortie already treats `claude`, `codex`, `cursor` — Tortie does not
bundle those and nobody minds.

**Against.** The symmetry is false. Tortie is *for* driving agents the user chose and
installed; SpecStory capture is a Tortie feature the user turns on inside Tortie. A toggle
that greys out on a fresh machine with "install specstory first" is a terminal errand in a
product whose pitch is removing terminal errands. And the version you get is arbitrary —
this machine's PATH answer is 2.5.0, three releases and one provider behind — so every argv
Tortie composes becomes a bet against an unknown build. The trust story is not actually
worse (Tortie already execs whatever `claude` is on PATH), but the *reliability* story is
much worse.

### (c) Hybrid

**(c1) Prefer the newest of {bundled, installed}, no downloader.** Keeps (a)'s
zero-install floor and (b)'s cadence, costs one changed function and some Settings copy.

**(c2) c1 plus a Tortie-managed copy under `<userData>/gmux/specstory/<version>/`, refreshed
independently of the app.** Technically legal — §1.4 shows a downloaded copy runs fine even
quarantined — but it buys speed Tortie does not need over brew, and it costs an update
subsystem, a supply-chain obligation, and a user-writable binary executed with Tortie's TCC
identity. Not worth it while Tortie has no updater of its own.

## 1.7 Recommendation

**Adopt (c1).** Concretely:

1. **Keep bundling, keep the pin, keep the signing hook.** The zero-install floor is worth
   41 MB and the signing recipe is already correct.
2. **Change the resolution rule from bundled-first to newest-wins inside a compatibility
   band.** Band = same major version, and ≥ the bundled version. Outside the band, bundled
   wins and Settings explains why.
3. **Probe every candidate location, not just the first PATH hit.** PATH hit,
   `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`. Report all of them in Settings —
   on this machine that surfaces the 2.5.0/2.6.0/2.8.0 spread instead of hiding two thirds
   of it.
4. **Do not trust semver alone — probe capability.** Before offering capture for a provider,
   ask the *chosen* binary which providers it registers, and intersect. The list is
   available today from `run --help` and the failure is explicit and parseable
   (`Provider 'x' is not a valid provider implementation`, exit 1). This is the same probe
   §3 needs for the Settings capture list, so build it once.
5. **Pin per session in the manifest: absolute path + version + cdhash.** `bin` and
   `bin_version` already exist; add the cdhash. A `brew upgrade` mid-flight must not change
   the meaning of an armed `resume_argv`. If the recorded binary is gone at restore, fall
   back to the bundled copy and record that it happened.
6. **Never write a runtime updater for the bundled copy.** Add a comment in
   `sign-nested-binaries.cjs` saying so, with the `spctl` output from §1.4, because it will
   look like it works right up until the app is signed.
7. **Make pin staleness a build-time signal, not a user-time surprise.** A cheap CI check:
   fetch `specstoryai/homebrew-tap`'s `Formula/specstory.rb`, compare its darwin-arm64
   sha256 against `build/specstory-release.json`. Mismatch = the pin is behind. It is one
   `curl` and one string compare, and at a 4.9-day cadence it will fire often enough to keep
   the bump a chore rather than an archaeology project. Bump the pin alongside the
   conformance-harness run so the two stay in step.
8. **Revisit (c2) only if Tortie itself gains an update channel.** At that point the bundled
   copy rides Tortie's own updater — which replaces the whole signed bundle and therefore
   has no seal problem — and a separately-managed copy is still unnecessary.

## 1.8 Migration from today

Small, and mostly in one file.

| Step | Where | Notes |
|---|---|---|
| newest-wins selection | `src/main/specstory/resolve.ts` `resolveOnce()` | today: `active: bundled ?? installed`. Becomes a comparison across all probed candidates within the band. `SpecstoryResolution` grows from `{active, bundled, installed}` to `{active, candidates[]}` with `source: 'bundled' \| 'installed'` and the path retained. |
| multi-location probe | same file, `probeInstalled()` | probe PATH hit + `extraBinDirs()` entries as separate candidates rather than resolving to one. Cost: one 5 s-capped `--version` per candidate, at most four, once per app run (the result is already cached). |
| provider capability probe | new, shared with §3 | ask the chosen binary for its provider set; cache per resolved cdhash. |
| cdhash in the manifest | `manifest/` schema + `src/main/specstory/wrap.ts` | additive column beside `bin` / `bin_version`. |
| Settings copy | SpecStory settings group | show the chosen copy, the other copies with versions, and the "why" sentence from the §1.5 table. Never offer to run `brew upgrade` — print it. |
| the header comment in `resolve.ts` | same file | its bundled-first rationale is a good argument against *older* copies and is silent on newer ones; rewrite it around the band. |
| pin-staleness CI check | `build/` + CI | §1.7 step 7. |
| the "do not auto-update the bundle" note | `build/sign-nested-binaries.cjs` | §1.7 step 6. |

Research 13 §2.3 originally specified installed-preferred-if-newer; the implementation
landed bundled-first for a reason that is real but one-sided. This section is the
reconciliation: bundled-first was defending against *older* copies, and a band-checked
newest-wins defends against those too, without discarding the user's fresher one.

### Loose ends worth naming

- **The pin's `muse` gap.** Research 13's per-agent table includes `muse`, which is not in
  the released 2.8.0 (measured). Whatever Tortie composes for `muse` against the bundled
  copy will hit `Provider 'muse' is not a valid provider implementation`. The §1.7 step 4
  capability probe closes this; until then it is a live inconsistency between the research
  table and the shipped pin.
- **`install.sh` copies are invisible to `brew upgrade`.** A user who ran the curl installer
  has a `/usr/local/bin/specstory` that nothing will ever update. Settings listing every
  copy it found is the only way that ever becomes visible to them.
- **`sessions.db` at 3.2 GB** is the one piece of shared state where a version disagreement
  is expensive to recover from. Nothing here makes it worse, but it is the reason not to
  deliberately run two vintages side by side.

---

# §2 Agent-version drift — what Tortie records, what it misses, what to build

Investigated 2026-08-12. Every number in this section was measured on this
machine that day against the installed agent CLIs; nothing is inferred from
documentation. Probes were `--version` and `--help` only.


## 2.1 The measurement that makes this urgent

`src/main/agents/flags.ts` carries `helpVerifiedVersion` per agent: the exact
version whose `--help` was read when the flag catalog was written (2026-08-09).
Re-probing every installed agent on **2026-08-12 — three days later**:

| Agent | `helpVerifiedVersion` (2026-08-09) | Live 2026-08-12 | Probe cost | Drifted |
|---|---|---|---|---|
| claude | `2.1.226 (Claude Code)` | `2.1.228 (Claude Code)` | 82 ms | **yes** |
| cursor | `2025.09.18-7ae6800` | `2026.08.11-e8db854` | 355 ms | **yes** |
| codex | `codex-cli 0.147.0` | `codex-cli 0.147.0` | 26 ms | no |
| gemini | `0.54.0` | `0.54.0` | 673 ms | no |
| droid | `null` (not installed) | not installed | — | n/a |
| deepseek | `v0.8.26 (npm wrapper, …)` | `deepseek (npm wrapper) v0.8.26` | 48 ms | no (string differs) |
| antigravity | `1.0.2` | `1.1.12` | 87 ms | **yes** |
| muse | `Muse Code 0.1.0 (0.1.0-R708.1)` | same | 46 ms | no |
| qwen | `0.21.7` | `0.21.9` | 158 ms | **yes** |
| pi | `0.79.1` | `0.84.1` | 665 ms | **yes** |

**Five of nine installed agents drifted in three days.** Cursor moved almost a
year of date-stamped builds. This is not a theoretical risk; it is the steady
state.

The good news, measured the same day: **every load-bearing flag survived.**
Grepping the *current* `--help` of each drifted agent for the exact strings
Tortie composes:

```
claude 2.1.228   : --resume OK  --session-id OK  --dangerously-skip-permissions OK
cursor 2026.08.11: --resume OK  --force OK       create-chat OK
agy 1.1.12       : --conversation OK             --dangerously-skip-permissions OK
qwen 0.21.9      : --resume OK
pi 0.84.1        : --session-id OK
```

qwen 0.21.9 still has **no** autonomy flag (`--yolo`/`--approval-mode`/trust
all absent), so the deliberately-empty `BYPASS_FLAGS.qwen` is still correct.
Drift did not break anything this time. It broke Codex's rollout format once
before (codex#21761, the reason the Phase 13.5 harness exists), and nothing in
the current build would have told the user.

## 2.2 What Tortie records today — the honest inventory

Read from `src/main/manifest/store.ts` (`MIGRATIONS`, 5 migrations) and
`src/shared/types.ts`:

| Fact | Recorded? | Where |
|---|---|---|
| Agent id (`claude`, `codex`, …) | yes | `sessions.agent` |
| Absolute agent binary path | yes, inside argv | `sessions.argv[0]`, `resume_argv[0]` |
| **Agent CLI version at launch** | **NO** | — |
| SpecStory binary path | yes | `sessions.specstory` JSON → `bin` |
| **SpecStory binary version at launch** | **yes** | `sessions.specstory` JSON → `binVersion` |
| Exit-code fidelity of the wrap | yes | `sessions.specstory` JSON → `exitCodeFidelity` |
| Resume capture state | yes | `sessions.resume_capture` |

So the manifest already records the version of the *wrapper* and not the
version of the *agent*. That asymmetry is the whole bug: `SpecstoryCaptureRecord`
(`src/main/specstory/capture.ts`) explicitly stores `binVersion` "so a restore
after a mid-flight `brew upgrade` replays the same binary it launched with" —
the same reasoning applies with more force to the agent, whose resume semantics
are the thing that can silently change.

Research 11 §3 gap 5 said "Record the agent CLI version per manifest row
(already planned)". **It was never built.** This is the single highest-value
change in this section.

Two further blind spots, same class:

- **`AgentConformanceResult`** (`src/main/conformance/report.ts`) records
  `binary` but has no `version` field, so `out/conformance-resume.json` cannot
  answer "which agent builds did this pass against". A green conformance report
  from last week proves nothing about today's claude.
- **Detection caches forever.** `listDetectedAgents()` memoizes `scanPromise`
  for the life of the process with no TTL; the only invalidation is the
  Settings "Re-scan" button (`rescanAgents()`). Tortie's whole premise is that
  it stays open across days and reboots, so the version in Settings is stale by
  construction for exactly the users who matter most.

## 2.3 Cost of knowing — measured, so the cadence argument is not hand-waving

`versionProbe` per agent (registry `versionProbe.args`), measured cold-ish
above: **26 ms (codex) to 673 ms (gemini)**. Serial total for the nine
installed agents ≈ **2.14 s**; run in parallel (which `scanAgents` already
does) the wall clock is bounded by the slowest, ≈ **0.7 s**.

`--help` probes cost the same order: 26 ms (codex) to 670 ms (gemini).

A full drift check — version probe **plus** a `--help` grep for every flag
Tortie composes — therefore costs about **1.4 s of wall clock and zero agent
turns and zero tokens**. That is cheap enough to run more often than once per
app launch, and it is the same order as `conformance:resume:capture` (~16 s),
which CLAUDE.md already mandates as a pre-commit gate.

## 2.4 Recommendation — four changes, in dependency order

**D1. Record the agent version at launch (manifest migration 006).**
Add `agent_version TEXT` to `sessions`, populated at create from the detection
scan's `DetectedAgent.version` (already computed, already cached — no new
subprocess on the create path). NULL for pre-existing rows means "unknown",
which is exactly what those rows are. Surface it on `SessionRecord` as
`agentVersion?: string` beside the existing `capture?: SessionCapture`.

Nothing else can be built without this. It is one migration in the shape the
file already has four of.

**D2. Re-probe cadence — three triggers, no timer.**
Mirror the pattern `SpecStorySection.tsx` already uses for auth (window focus,
no polling). Concretely:

1. **App launch** — as today (`listDetectedAgents()` on first call).
2. **Window focus, throttled to once per 10 minutes** — a `brew upgrade` or
   `npm i -g` happens in a terminal while Tortie is in the background, and
   focus is the moment the user comes back. 0.7 s parallel, off the UI thread.
3. **Store-root FSEvents tripwire** — the registry's `extraProbeDirs` are
   already watched-adjacent; a binary's mtime change under a resolved bin dir
   is a free "something moved" signal. Optional; triggers 1+2 carry the value.

Explicitly **not** a background timer: it burns battery for a fact nobody is
looking at, and Tortie's design rule elsewhere ("No timer: see the file
header") already rejects that shape.

**D3. Two-layer drift detection — version *and* flags.**

- *Layer 1, identity:* compare `DetectedAgent.version` against
  `AGENT_FLAG_PRESETS[id].helpVerifiedVersion`. A mismatch is **not** an error
  — it is "the flag catalog was verified against a different build". It should
  set a `flagsVerifiedAgainst: 'this-version' | 'other-version' | 'never'`
  field on the scan result.
- *Layer 2, substance:* for each agent whose version drifted, run one `--help`
  and assert that every `provenance: 'VERIFIED'` flag string in the catalog
  *and* the agent's resume token (`--resume` / `resume` / `--conversation` /
  `--session-id`) still appears. This is exactly the check run by hand in §2.1
  above; it took ~1.4 s for the whole fleet and it is the difference between
  "the version number changed" (noise, 5 of 9 in three days) and "a flag we
  compose is gone" (signal, actionable, would have caught codex#21761's class
  of breakage at the flag level).

A version bump with all flags intact should be **silent** — auto-adopt the new
version as the catalog's verified version in the scan result and move on.
Warning on every patch bump would train the user to ignore the warning, and
5-of-9-in-three-days says that is precisely what would happen.

**D4. Warn only where it costs the user something — the resume path.**
Three surfaces, in increasing loudness:

| Surface | Condition | Copy |
|---|---|---|
| Settings › Agents row | version ≠ `helpVerifiedVersion`, flags intact | quiet secondary line: "Verified against 2.1.226" — informational, no icon |
| Settings › Agents row | a VERIFIED flag disappeared from `--help` | warning icon + "Some launch options Tortie offers are no longer in this version" + the flag names |
| **Session restore** | `agent_version` recorded ≠ version detected now, **and** the row has a `resume_argv` | inline on the armed resume, before the user fires it |

The restore case is the one that earns real estate, because it is the one where
a wrong answer costs the user a conversation. `src/main/restore/` today does
**zero** version checking — it replays the recorded argv verbatim. The
recommendation is deliberately conservative and matches the existing
"armed, never auto-fired" product decision:

- Still arm the resume. Never refuse, never rewrite the argv.
- When the versions differ, add one sentence to the armed-resume affordance:
  *"This session ran under Claude Code 2.1.226; 2.1.228 is installed now. If it
  doesn't come back, the conversation is still in ~/.claude/projects."*
  (Naming the store path is the part that makes it actionable — the store is
  the user's real backstop, and the registry already knows the path per agent.)
- Do **not** warn on a patch-level difference alone once Layer 2 says the
  resume token still exists. Warn on: minor/major change, a changed resume
  strategy, or a Layer-2 failure. For date-stamped versions with no semver
  (cursor: `2026.08.11-e8db854`), treat any difference as minor.

**D5. Conformance on a schedule — yes, but not on a clock.**
CLAUDE.md already fixes the two conformance tiers (`conformance:resume:capture`
~16 s per commit under the resume-touching paths; full `conformance:resume`
~3 min once per phase *and after any agent-CLI upgrade*). The gap is that
nothing **detects** the agent-CLI upgrade, so "after any agent-CLI upgrade" is
an instruction to a human who has no signal. Close it:

1. Add `agentVersion` to `AgentConformanceResult` and to `ConformanceRun` (a
   `versions: Record<agentId, string|null>` block at the top of the report), so
   `out/conformance-resume.json` states what it proved and against what.
2. Have the drift check (D3) compare live versions against the versions in the
   **last conformance report**, not against a hand-maintained constant. When
   any agent in `GMUX_CONF_AGENTS` has drifted since that report, the report is
   stale for that agent — that is the trigger, and it is derived rather than
   remembered.
3. Cadence: run the cheap capture-mode roundtrip when the drift check fires
   (16 s, no turns, no tokens — cheap enough to run unattended); leave the full
   token-spending roundtrip a human-initiated, once-per-phase act. A wall-clock
   cron would spend real agent turns on days when nothing changed.

---

# §3 Dynamic SpecStory provider support

Investigated 2026-08-12, read-only, against the bundled specstory 2.8.0 and the
user's Homebrew 2.5.0, from a scratch cwd and a scratch `HOME`.


## 3.1 What is already dynamic (and works)

This is not a greenfield question — `src/main/specstory/capture.ts` **already**
probes the resolved binary rather than trusting a table. It runs
`specstory run --help`, scans past the marker `Available provider IDs:` for
`<id> (` pairs, caches the result for the app run
(`availableProviders()`), and intersects it with the agent registry's
`specstory.provider` rows (`capturableAgents()`). `status-ipc.ts` ships that
list to the renderer, and `SpecStorySection.tsx` renders
`capturable.has(a.id) && a.installed`.

**The screenshot's list is therefore already data-driven, and it is correct.**
Verified by recomputing the intersection by hand on 2026-08-12:

- specstory 2.8.0 (bundled) registers **9**: `antigravity, claude, codex,
  copilotide, cursor, cursoride, deepseek, droid, gemini`
- Tortie's registry has `specstory.provider` rows for **8**: `claude, cursor,
  codex, gemini, droid, deepseek, antigravity, muse`
- Tortie-launchable ∧ has-a-provider-row ∧ in-the-binary = **7** (drops `muse`,
  absent from 2.8.0; drops `cursoride`/`copilotide`, `launchable: false`)
- ∧ installed on this machine = **6**: Claude Code, Cursor CLI, Codex CLI,
  Gemini CLI, DeepSeek TUI, Antigravity CLI — **exactly the screenshot.**
  (Factory Droid is missing because droid is not installed here, not because
  anything is hardcoded.)

`muse` is the proof the mechanism works: Tortie has a full `muse` row, the
bundled 2.8.0 has no muse provider, and the row is correctly *absent* from the
list with no code branch for it. The day specstory merges PR #269, muse appears
with **no Tortie release**.

## 3.2 The one real gap: a closed vocabulary

Three places hardcode the set of provider ids Tortie can even *name*:

1. `SpecstoryProviderId` in `src/main/agents/registry.ts:134-142` — an 8-member
   string union.
2. `ALL_PROVIDERS` in `src/main/specstory/capture.ts:50-59` — the same 8, used
   as an allowlist that `parseProviderIds` filters against ("a formatting
   change can lose ids… but can never invent one").
3. Each agent's `specstory: { provider, exitCodeFidelity, verified }` row.

So the parse is dynamic but the *dictionary* is closed: an id the binary
reports that is not in `ALL_PROVIDERS` is **silently discarded**.

Today that is exactly one provider, and it is imminent: **`qwen`**. Tortie has
a full launchable `qwen` agent row (registry line 858, `launchable: true`,
verified flags, verified resume) and **no `specstory` row**; specstory's
`qwen-provider-support` branch (PR #268, dev+4) registers `r.providers["qwen"]`.
When that merges and the pin bumps, Tortie will detect qwen the agent, and
still refuse to offer capture for it, until someone ships a Tortie release.
`pi` is the same story one step further out (neither side has it yet).

## 3.3 What the binary can actually be asked — measured against 2.8.0 and 2.5.0

Everything below was run against the bundled
`build/vendor/specstory/bin/specstory` (2.8.0) and the user's Homebrew copy
(2.5.0), read-only, with `--no-version-check --no-usage-analytics`, from a
scratch cwd and a scratch `HOME`.

| Surface | Machine-readable? | Verdict |
|---|---|---|
| `specstory version` / `--version` | `2.8.0 (SpecStory)` only | No provider info. `version --json` → **error, unknown flag**. |
| **`specstory <cmd> --help`** | yes, one wrapped paragraph | `Available provider IDs: antigravity (Antigravity CLI), claude (Claude Code), …` — present on `run`, `list`, `sync`, `watch` and (as `Supported agents:`) top-level. **Absent** from `check`, `resume`, `reindex`, `search`, `skills`. **Hard-wrapped at ~120 cols with trailing padding**, and it wraps mid-name (`copilotide (VS Code ⏎ Copilot IDE)`). `COLUMNS` does **not** change the wrap. 114 ms. |
| **`specstory list <sentinel>`** | **yes, one provider per line** | `  - antigravity - Antigravity CLI` … on **stderr**, exit **1**, stdout empty. Unwrapped. 147 ms. **Writes nothing to cwd.** |
| `specstory check <sentinel>` | yes, `  • id - Name` on **stdout** | Same list, bullet glyph. Also fine, but see the cwd caveat below for `run`. |
| `specstory run <sentinel>` | yes, `  • id - Name` on stdout | **Rejected as the probe:** `run`'s `RunE` calls `config.EnsureDefaultProjectConfig()`, which **created `.specstory/cli/config.toml` in the probe cwd**. Measured. Never use `run` as a probe. |
| `specstory list --json` (no activity) | accidental | Prints a stderr warning naming providers by **display name only** ("- Claude Code"), then `[]`. Display names, no ids, only on the empty case. Unusable. |
| `specstory providers` | — | **No such command.** Full command list: check, help, list, login, logout, reindex, resume, run, search, skills, sync, version, watch. There is no dedicated provider-list command and no `--json` on any help surface. |

**Why these surfaces are trustworthy rather than incidental.** All of them are
generated from one function. `Registry.GetProviderList()`
(`pkg/spi/factory/registry.go:207-238`) sorts the registered ids and joins
`fmt.Sprintf("%s (%s)", id, provider.Name())` with `", "`; the five help
strings interpolate it (`main.go:156,302,542`, `pkg/cmd/list.go:76`,
`pkg/cmd/watch.go:72`). The per-line form comes from the same registry walk in
the not-found branches (`main.go:360`, `main.go:1252`, `pkg/cmd/check.go:124`,
`pkg/cmd/list.go:116`). **`registerAll()` is documented in-source as "the ONLY
place that needs to be updated when adding new providers"**, so every provider
specstory ever adds appears in all of them automatically. Both branch diffs
confirm it — `muse-provider` and `qwen-provider-support` each add exactly four
lines to `registerAll()` and nothing else.

**And the registry is genuinely per-machine, not just per-version.** The
Copilot IDE variants register only when `copilotide.HasAnyChatSessions(...)` is
true, so the provider set can differ between two machines running the same
binary. A version→providers lookup table would be *wrong*, not merely stale.
Asking the binary is the only correct method.

**Format stability across versions** (the thing a parse has to bet on): the
per-line form is **byte-identical in shape** between 2.5.0 and 2.8.0, and both
help forms carry the same marker. 2.5.0 lists 8 providers (no `copilotide`),
2.8.0 lists 9 — the surface tracked the change correctly across a three-minor
gap. That is the strongest evidence available that parsing it is safe.

**One unavoidable side effect, and it is pre-existing.** *Every* specstory
invocation — including a bare `--help` — creates `~/.specstory/cli/config.toml`
if it is missing (measured against a pristine scratch `HOME`). There is no
probe that avoids it. It is an inert commented default, the user's own CLI
creates it on first run, and Tortie already spawns specstory today, so no probe
choice makes this better or worse. Worth stating in the doc so nobody
"discovers" it later and thinks the probe is at fault.

## 3.4 Recommended probe

Replace the single `run --help` probe with a two-step, best-first ladder in
`probeProviders()`:

```
1. specstory list __tortie_provider_probe__ --json --no-version-check --no-usage-analytics
   → parse stderr lines matching /^\s*[-•]\s+([a-z][a-z0-9_-]*)\s+-\s+(.+?)\s*$/
   → yields {id, displayName} pairs, unwrapped, no cwd writes, exit 1 expected
2. specstory run --help --no-version-check --no-usage-analytics
   → the existing marker parse (keep it; it is the proven path today)
3. neither answered → the measured fallback set, AND say so in the UI (§3.6)
```

Step 1 first because it is unwrapped (no mid-name line breaks to defend
against) and because it carries the **display name**, which step 2's wrapped
form mangles and which §3.5 needs for providers Tortie has no row for. Step 2
stays as the fallback precisely because it is what ships today and is known to
work on 2.5.0 and 2.8.0.

Sentinel discipline: use a token that can never become a real provider id
(`__tortie_provider_probe__` — leading underscores are not a Go-ish provider
id). Assert exit ≠ 0 and that the sentinel is echoed back in the error, so a
future version that *accepts* the argument cannot be mistaken for a provider
list. Cache exactly as today (once per app run, `resetProviderCache()` on the
Settings re-check).

## 3.5 The intersection, made open-vocabulary

Keep the three-fact rule `capture.ts` already documents — registry row, binary
support, binary exists — but stop letting fact 1 be a closed union.

```
offered(agent) ⇔ agent.launchable
               ∧ providerIdFor(agent) ∈ probedProviders
               ∧ specstoryResolution.active ≠ null
```

Two changes make that work without inventing anything:

1. **`SpecstoryProviderId` becomes `string`** (a branded/nominal string if the
   type ergonomics matter), and `ALL_PROVIDERS` is deleted. The parse's
   fail-closed property is preserved by a *shape* guard
   (`/^[a-z][a-z0-9_-]{0,31}$/`) instead of a membership guard: a formatting
   change still cannot invent an id, but a *new* id is no longer discarded.
2. **`providerIdFor(agent)` gets a second source.** Today it is only the
   registry row. Add a fallback: when an agent has no `specstory` row, try
   `agent.id` itself against the probed set. That single line is what makes
   qwen work the day PR #268 merges — Tortie's agent id is `qwen`, specstory's
   provider id is `qwen`, and every other agent in the registry already agrees
   on the id except `antigravity`↔`agy` (which has an explicit row anyway).
   Never match on display name, never fuzzy-match.

**Two tiers of confidence, because the intersection is not the whole truth.**
A provider Tortie has never measured has unknown exit-code fidelity, and
`SessionCapture.exitCodeApproximate` is a claim the death report makes to the
user. So:

- **measured** — the agent has a `specstory` row with
  `verified: 'verified'`. Behaves exactly as today: offered, remembered
  per-agent default, silent.
- **newly discovered** — the id matched but there is no verified row. Still
  offered (that is the point of the round), with three conservative defaults:
  `exitCodeFidelity: 'collapsed'` (the pessimistic value — it only ever makes
  the death report say "at least 1" instead of asserting a wrong number),
  capture default **off** regardless of any stored per-agent preference, and a
  quiet secondary line on the Settings row: *"New in this version of SpecStory
  — capture works, but Tortie hasn't measured how it reports exit codes yet."*

That is the honest position: offer the capability the moment the binary can do
it, and be explicit about the one fact Tortie cannot yet vouch for. It also
gives the phase a clean follow-up — measuring a newly discovered provider is a
`conformance:resume:specstory` run away, and promoting it is a one-line
registry edit.

Verified example of why the caution is right, not paranoia: qwen's
`ExecuteQwen` (`pkg/providers/qwencode/qwen_exec.go:98-101`) does
`os.Exit(exitErr.ExitCode())`, so qwen is actually `'exact'`. Tortie has no way
to know that without measuring, and guessing `'exact'` would have been right by
luck and wrong for the next one.

## 3.6 The honest fallback when the binary cannot be asked

Today the fallback is good and invisible: `verifiedProviders()` returns the
registry rows marked `verified: 'verified'`, and the only trace is a
`console.warn` the user never sees. Two additions:

1. Carry a `providerSource: 'probed' | 'fallback'` field through
   `SpecStoryStatus` to the renderer.
2. When it is `'fallback'`, put one line above the capture list: *"Tortie
   couldn't ask SpecStory which agents it supports, so this list is the set
   this build was tested against."* No error styling — capture still works for
   everything listed; the user is being told the list may be short, not that
   something is broken.

The existing hardcoded `defaultCaptureAgents()`
(`src/shared/specstory-status.ts:172`) stays as the renderer's pre-IPC
placeholder — it is the third fallback, one layer further out, and it is
correct for that job.

## 3.7 What this does and does not buy

**Does:** muse the day PR #269 merges (already true). qwen the day PR #268
merges (needs §3.5). Any future provider whose id equals Tortie's agent id,
with no release. A Settings list that is correct on a machine whose Homebrew
specstory is three minors behind the bundled one.

**Does not:** a provider for an agent Tortie cannot *launch* — `cursoride` and
`copilotide` are `launchable: false` and stay out, correctly, because the
intersection is with what Tortie can put in a tmux pane. Nor does it buy
capture for an agent Tortie has no registry row for at all; the agent side of
the intersection is still versioned with the code, and that is the right place
for it, because launching is where Tortie's own measured knowledge lives.

---

# §4 The book icon — replacing the cloud glyph with SpecStory's own mark

Investigated 2026-08-12 on macOS 15.7.9 (24G830), arm64. Every dimension, bbox and
pixel count below was produced by a command run on this machine that day
(`inkscape --query-*`, `rsvg-convert`, `sips`, PIL). All repo access was read-only;
the only `specstory` invocations were `--version` and `run --help`, both against the
copy bundled inside `/Applications/Tortie.app`.

**Answer up front: the book asset exists, in vector, and it is unambiguous.** It is
SpecStory's own logo mark — a standing book, cyan cover / orange spine / gold top
edge — and SpecStory already ships a monochrome derivation of it, so Tortie is not
inventing a treatment. The conversion is a mechanical three-step (drop one path, fit
the long axis to 24, bake the transform) and is specified byte-exactly in §4.4.

## 4.0 The path the operator gave does not exist

`/Users/gdc/getspecstoryai` — **absent**. The real trees, all confirmed present:

| Path | What it is |
|---|---|
| `/Users/gdc/getspecstory` | the monorepo, branch `dev`, HEAD `3de8b77` |
| `/Users/gdc/getspecstory/specstory-mac` | the Mac app — **empty directories on `dev`**; its content lives only in the `.claude/worktrees/wf_*` checkouts |
| `/Users/gdc/specstory-website` | Next.js marketing site, last touched 2024-11 |
| `/Users/gdc/SpecStory` | docs/growth repo — no product art |
| `/Users/gdc/specstory-cli` | the Go CLI — no raster/vector art at all (its "logos" are ANSI text banners in `pkg/utils/logos/*.txt`) |

Two consequences worth recording, because they will waste the next agent's time
otherwise. First, `git ls-files` in `getspecstory` returns **no** `.svg`/`.png`/`.icns`
at all — every image found under that tree is inside a worktree or a build output, not
tracked on `dev`. Second, a plain `find` that excludes `build/` and `dist/` (the
reflexive thing to do) finds nothing in `specstory-mac`; the asset catalog only shows
up if you search the worktrees.

## 4.1 What was found — the asset inventory

Searched: the five trees above, plus a `~`-wide sweep for `*specstory*.svg`.

**Raster — the book, but pixels:**

| Path | Format | Size | Notes |
|---|---|---|---|
| `…/wf_c38a65f9-366-1/specstory-mac/Assets.xcassets/MenuBarIcon.imageset/menubar.png` | PNG RGBA | **12×16** | The book, monochrome, `template-rendering-intent: template` |
| `…/MenuBarIcon.imageset/menubar@2x.png` | PNG RGBA | 23×32 | same, @2x |
| `…/MenuBarIconLive.imageset/menubar-live@2x.png` | PNG RGBA | 23×32 | full-colour book, used while recording |
| `…/AppIcon.appiconset/icon_512x512@2x.png` | **WebP** (despite the extension) | up to 2048² | app icon; `sips` cannot read it |
| `/Users/gdc/specstory-website/website/public/specstory_logo.jpeg` | JPEG, progressive | 100×100 | full-colour book, white matte baked in |
| `/Users/gdc/getspecstory/.claude/worktrees/wf_744b45d6-27e-1/…/MenuBarIcon.imageset/menubar@2x.png` | PNG RGBA | 36×36 | **fully transparent** — an empty placeholder, alpha extrema `(0,0)`. Ignore it. |

The 12×16 template is the proof that "the book" is the intended identity and not a
loose association. `specstory-mac/Sources/Views/MenuBarLabel.swift:19` says so
literally:

```swift
/// Always the SpecStory book: template (adapts to menu bar appearance)
/// when idle, full color while sessions are recording, badged on error.
```

**Vector — three distinct exports of the same artwork:**

| Path | viewBox | Shape |
|---|---|---|
| **`/Users/gdc/Downloads/SpecStory-logo.svg`** | `0 0 380 550` | 4 flat paths, no transforms, no `<defs>`, 626 bytes — **tight-cropped, the best source** |
| `/Users/gdc/specstory-monorepo/resources/specstory.svg`<br>`/Users/gdc/.windsurf/extensions/specstory.specstory-vscode-0.24.2/resources/specstory.svg` | `0 0 550 550` | byte-identical to each other; **same four paths, same coordinates**, wrapped in `<g transform="translate(47.711864,0.443)">` and force-filled black — this is SpecStory's own monochrome derivation, shipped in its VS Code extension |
| `/Users/gdc/docs/specstory.svg`<br>`/Users/gdc/.mintlify/mint/apps/client/public/specstory.svg` | `0 0 359.36 517.36` | same artwork, different vintage: matrix transforms and an older palette (`#fd6822`/`#02b9d9`/`#fec554`). **Do not use** — transform-laden and off-brand. |

`/Users/gdc/Downloads/SpecStory-logo.svg (1).svg` is byte-identical to the first.
`specstorylogo.svg` (1120×167, found in seven repos) is the **wordmark**, not the mark.

## 4.2 The chosen source, and the four paths

`/Users/gdc/Downloads/SpecStory-logo.svg`, verbatim:

```svg
<svg width="380" height="550" viewBox="0 0 380 550" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M115.443 549.557L115.511 151.613L380 80.5696L379.931 478.514" fill="#52B7D6"/>   <!-- 1: cyan cover  -->
<path d="M86.5823 151.263V548.345C77.6389 548.351 23.5959 550.449 0 486.816V85.3798C17.2279 149.171 86.5823 151.263 86.5823 151.263Z" fill="#EB7139"/>  <!-- 2: orange spine -->
<path d="M311.618 1.88002L311.618 37.8999L40.6146 110.515C32.2064 102.537 25.2641 92.4532 19.9725 80.0115L311.618 1.88002Z" fill="#F6C768"/>            <!-- 3: gold top edge -->
<path d="M96.8037 129.873C96.8037 129.873 60.1264 128.671 40.2847 110.032L311.456 37.8796L348.133 64.3353L96.8037 129.873Z" fill="white"/>              <!-- 4: white page block -->
</svg>
```

Because it lives in `~/Downloads` it is not a durable source of record. **Commit the
tight 380×550 export into the Tortie repo** alongside the derived icon so the
derivation is reproducible; the in-repo fallback with identical geometry is the
windsurf/monorepo `resources/specstory.svg`.

Licensing is a non-issue: this is SpecStory's own mark and Tortie ships as
`com.specstory.tortie`. No attribution line is needed (unlike codicons CC-BY-4.0).

## 4.3 Path 4 is a white knockout, and it must be dropped — not recoloured

Path 4 is filled `white`, not "no fill". In the vendor's own monochrome SVG, paths 1–3
are overridden to `#000000` and **path 4 is left `#ffffff`**. That reads correctly on a
white page and is wrong everywhere else: on Tortie's `--bg-sidebar` (`#17181c`) it would
paint an opaque white wedge through the mark. It is a knockout, so under `currentColor`
it must become **absence**, not a colour.

Dropping it is exactly what SpecStory did for the menu bar: the 12×16 template shows the
gold top bar, a gap, then the body — path 4's band is transparent there.

**Ground-truth check (measured).** Rendered the vendor's monochrome SVG at 400px on
white, cropped to ink (278×399), rendered the drop-path-4 silhouette to the same ink
height (277×399), and differenced:

| Threshold | Differing pixels | % of frame |
|---|---|---|
| > 8/255 | 2,449 | 2.21 % |
| > 32/255 | 2,053 | 1.85 % |
| > 128/255 | 775 | 0.70 % |

The overlay (`scratchpad/book/gt_overlay.png`, red = vendor, cyan = mine) shows the
residual is a one-pixel fringe on the spine's left edge and the top bar's leading edge —
the 278-vs-277 width difference and its resampling, nothing structural. **Dropping path
4 reproduces the vendor's own monochrome treatment.**

## 4.4 The conversion — measured, then baked

**Step 1 — silhouette.** Keep paths 1, 2, 3. Discard path 4.

**Step 2 — confirm no boolean union is needed.** Their bounding boxes overlap
(path 2 `x 0–86.58`, path 3 `x 19.97–311.62`), so this had to be checked rather than
assumed. Inkscape's `path-union` on the three returns a path with **three separate
subpaths**, i.e. the shapes are geometrically disjoint. Disjoint subpaths fill
identically under `nonzero` regardless of winding, so the three can simply be
concatenated into one `<path>` — which keeps the vendor's exact coordinates instead of
inheriting the ~0.014-unit drift Inkscape's boolean introduced (`311.618` → `311.63172`,
`0` → `-0.002201416`).

**Step 3 — fit the long axis to 24, centred, no stretch.** Measured silhouette extent:

```
inkscape --query-x/-y/-width/-height  →  x=0  y=1.88002  w=380  h=547.677
```

The mark is portrait (aspect 0.6938), so **height** is the long axis — the mirror image
of Phase 12.8's Meta treatment, which fitted a 3:2 landscape mark to the box's *width*
and centred it vertically.

```
scale = 24 / 547.677      = 0.04382144950399597
width = 380 × scale       = 16.652150811518467
dx    = (24 − 16.65215)/2 = 3.6739245942407663
dy    = −1.88002 × scale  = −0.0823852014965025
```

**Step 4 — bake, expanding `V`/`H` to `L` and rounding to 3 dp.** Verified after
rounding — the fit is exact, and the margins are symmetric (3.674 left, 24 − 3.674 −
16.652 = 3.674 right):

```
inkscape --query-* on the final file  →  x=3.674  y=0  w=16.652  h=24
```

**The deliverable** (356 bytes; also at
`scratchpad/book/deliverable/specstory.svg`) — matches the house contract in
`src/renderer/assets/agents/*.svg` exactly: `1em`/`1em`, `viewBox="0 0 24 24"`,
`fill="currentColor"`, one `<path>`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M8.733 24L8.736 6.562L20.326 3.448L20.323 20.887ZM7.468 6.546L7.468 23.947C7.076 23.947 4.708 24.039 3.674 21.251L3.674 3.659C4.429 6.455 7.468 6.546 7.468 6.546ZM17.329 0L17.329 1.578L5.454 4.761C5.085 4.411 4.781 3.969 4.549 3.424Z"/></svg>
```

Do **not** add `fill-rule="evenodd"`. The subpaths are disjoint so it would render the
same today, but it removes the safety margin if the geometry is ever nudged.

One coordinate looks alarming and is fine: the cubic control point `4.708 24.039` sits
below the box, but it is a control point — the curve it steers stays inside, which is
why the measured bbox height is exactly 24.

**Filing.** `src/renderer/assets/brand/specstory.svg`, next to the existing
`brand/tortie-128.png` — **not** `assets/agents/`. SpecStory is not a launchable agent;
dropping it in `agents/` would put a non-agent key into `AgentIcon`'s `LOGOS` map.

## 4.5 Legibility at 16px — it reads, but it is heavy

Fitting the long axis to 24 is the house convention, confirmed by measuring every
existing mark (`claude` 24×24, `droid` 24×24, `qwen` 23.84×24, `cursor` 20.85×24,
`muse` 24×15.94, `deepseek` 24×17.66). The book at `16.652×24` sits squarely in it.

Rendered at 16px on `--bg-sidebar` in `--text-secondary`, beside the four codicons it
will actually share the rail with (`scratchpad/book/rail_strip.png`, 14× nearest-neighbour):
the book is **unmistakably a book** — top edge, page gap, spine gap and cover all
survive. The spine gap is the thinnest feature at **0.84px** (28.86 source units →
1.265 units in the 24 grid → 0.84px at 16), and antialiasing renders it as a legible
grey line, the same compromise SpecStory accepted in its own 12×16 template.

**But there is a real finding, and scaling cannot fix it.** Ink coverage inside the
16×16 box, measured from the alpha channel:

| Glyph | Ink (px² of 256) |
|---|---|
| `cloud` (today) | 35.6 |
| `hubot` | 49.3 |
| `settings-gear` | 57.7 |
| `rocket` | 70.4 |
| **book, long axis 24** | **127.8** |
| book, long axis 22 (inset variant) | 107.5 |

The book carries **2.4× the codicon mean and 1.8× the heaviest codicon.** The cause is
not size, it is *kind*: codicons are outline glyphs with open interiors, and the
SpecStory book is a solid slab. Matching `rocket`'s weight would need the book shrunk to
~17.8 of 24, visibly smaller than its neighbours — trading one mismatch for a worse one.

**Recommendation: ship the solid book at the house convention (long axis 24) and accept
the weight.** Three reasons. It is a brand mark, not UI furniture, and brand marks are
allowed to differ. Solid is the *vendor-sanctioned* monochrome form (§4.3) — outlining it
would be inventing a treatment SpecStory has not authorised. And the SpecStory entry is
deliberately **last on the rail** (`SettingsApp.tsx:36–38`), so the odd weight sits at the
edge of the list rather than in the middle of it. If the weight is judged unacceptable in
review, the 22-of-24 inset variant is generated and measured
(`d = M9.005 23L9.008 7.015L19.632 4.161L19.629 20.146ZM7.846 7.001L7.846 22.951C7.486 22.952 5.316 23.036 4.368 20.48L4.368 4.354C5.06 6.917 7.846 7.001 7.846 7.001ZM16.885 1L16.885 2.447L5.999 5.364C5.661 5.043 5.383 4.638 5.17 4.139Z`)
— but it only buys 16 % and slightly muddies the top bar. Prefer the full-bleed one.

## 4.6 Where the icon is used — and the collision it resolves

Exactly **one** site today:

```
src/renderer/settings/SettingsApp.tsx:39
  { id: 'specstory', label: 'SpecStory', icon: 'cloud' }
…rendered at line 100 as  <Codicon name={s.icon} size={16} />
```

The ⌘T create-session sheet mentions SpecStory but its capture control is a plain
checkbox with a caption — no icon (`CreateSessionModal.tsx:210–222`).

**The change fixes a genuine ambiguity, not just an aesthetic.** `cloud` is not
SpecStory's glyph in this codebase — it is already the **git remote-branch** glyph:

```
src/renderer/scm/ref-badges.tsx:229    remoteBranch: 'cloud'
src/renderer/scm/BranchesView.tsx:380  <Codicon name="cloud" size={12} />
```

Today one glyph means both "SpecStory" and "this branch is on a remote". The book
retires that overload; leave both SCM sites on `cloud`, which is the correct meaning
there.

**Wiring.** The rail hardcodes `Codicon`, so it needs a one-line escape hatch — the
minimal shape is to let a rail entry carry either a codicon name or a raw SVG:

```tsx
type RailIcon = { codicon: string } | { svg: string };
// …
{'svg' in s.icon ? <InlineSvg svg={s.icon.svg} size={16} /> : <Codicon name={s.icon.codicon} size={16} />}
```

`InlineSvg` already does the right thing (fixed 16×16 span, `font-size` set for the
`1em` sizing the mark declares, `aria-hidden`), and its doc comment explicitly scopes it
to "trusted, build-time-bundled SVG strings" — which a `?raw` import of a committed brand
asset is. It is **not** in `icons/index.ts`'s public exports today (only `AgentIcon`,
`Codicon`, `FileIcon` and helpers are); add it there rather than deep-importing it.

**Verification tier: Tier 1.** Per CLAUDE.md this is "icons and assets" — gates plus one
cheap screenshot of the Settings rail. No probe, no matrix.

## 4.7 How this Settings section changes under §1–§3

### §3 (dynamic providers) is already built — the screenshot is misleading

The "Capture new sessions" list in `media_pyGJcwxRrt` **looks** hardcoded and is not. It
is a live three-way intersection, resolved in main and pushed to the renderer:

- `src/main/specstory/capture.ts` `probeProviders()` runs
  `specstory run --help --no-version-check`, finds the marker `Available provider IDs:`,
  and regex-scans `<id> (` pairs out of the wrapped, space-padded help text.
- `parseProviderIds()` keeps only ids Tortie has a registry row for, so a formatting
  change can *lose* providers (fail closed, capture off) but can never invent one. On a
  parse failure it falls back to `verifiedProviders()` — registry rows whose fidelity was
  actually measured.
- `SpecStorySection.tsx:424` renders `reading.status.captureAgents`, further narrowed to
  agents installed on this Mac.

Measured against the bundled 2.8.0 today, which confirms the arithmetic behind the
screenshot:

```
$ /Applications/Tortie.app/Contents/Resources/bin/specstory run --help --no-version-check
  Available provider IDs: antigravity (Antigravity CLI), claude (Claude Code),
  codex (Codex CLI), copilotide (VS Code Copilot IDE), cursor (Cursor CLI),
  cursoride (Cursor IDE), deepseek (DeepSeek TUI), droid (Factory Droid CLI),
  gemini (Gemini CLI).
```

9 reported → Tortie knows 8 (`ALL_PROVIDERS`) → **7 intersect** → the screenshot shows
**6**, because `droid` is not installed here. `copilotide`/`cursoride` are correctly
dropped as IDE providers Tortie cannot launch, and `muse` is correctly dropped because
2.8.0 has no such provider. **A provider SpecStory adds tomorrow that Tortie already
supports as an agent appears with no Tortie release** — which is the property §3 asks for.

Three gaps remain, all small:

1. **The probe is cached for the whole app run** (`providerCache`, one promise). Upgrade
   specstory while Tortie is open and the list is stale until relaunch. `resetProviderCache()`
   already exists and is commented "Test seam / Settings 're-check'" — it just needs a
   button wired to it, which §1's hybrid resolution wants anyway.
2. **Absence is unexplained.** `captureSupportFor()` computes a precise reason
   (`no-binary` / `no-provider-for-agent` / `provider-missing-from-cli`) and the UI throws
   it away — agents simply do not appear. Render the row disabled with the reason instead;
   "your specstory is too old for this agent" is the single most useful thing this section
   could say, and it is already computed.
3. **A second, cleaner oracle exists.** An unknown provider id prints a stable bulleted
   list rather than wrapped, padded help prose:

   ```
   $ specstory run __probe__ --no-version-check
   ❌ Provider '__probe__' is not a valid provider implementation
   The registered providers are:
     • antigravity - Antigravity CLI
     • claude - Claude Code
     …
   ```

   One `id - Display Name` per line, no wrapping, and it yields the **display names**
   the Settings list currently hardcodes. There is no `--json`; `--json` and
   `--output json` both return `Unknown flag`. Worth adopting as the primary parse with
   `run --help` as fallback — but it exits non-zero and prints `❌`, so it must never
   reach a user-visible log.

   > **Corrected by §0.1 — use `list <sentinel>`, not `run <sentinel>`.** The oracle is
   > right; the *subcommand* is not. `run` calls `config.EnsureDefaultProjectConfig()` and
   > writes `.specstory/cli/config.toml` into its working directory (measured twice,
   > independently). `list <sentinel>` prints the same list — `-` bullets instead of `•`,
   > on stderr, exit 1 — and writes nothing.

### §1 (bundle vs discover) — the section must stop implying one binary

§1 recommends hybrid prefer-newest across {bundled, every copy on disk}. The UI assumes
a singular binary: `reading.status.binary` is one value, and `captureDisabled` is just
`binary === null`. Under hybrid, this section becomes the only place a user can see
**which copy won and why** — today this machine has two (bundled 2.8.0 at
`/Applications/Tortie.app/Contents/Resources/bin/specstory`, and `/opt/homebrew/bin/specstory`,
which greets you with an *"Update Available!"* banner, i.e. the copies already disagree).
So: show the chosen path + version, list the others found, and add the "re-check" button
from gap 1 above. That button is also the natural place to invalidate `providerCache`.

### §2 (agent-version drift) — the rail entry needs a badge slot

If a session's recorded agent version stops matching what is on disk, the warning has to
surface somewhere, and the rail is the obvious summary point. The rail item has no badge
affordance today — it is `<Codicon>` plus a label inside a 32px flex row
(`settings.css:26–38`). The `InlineSvg` change in §4.6 should therefore leave room for a
badge on the rail row generally, rather than being special-cased to SpecStory. Drift is
an **Agents**-section concern first; SpecStory only inherits it because capture wraps the
agent's argv (`wrap.ts`), where a flag change is what breaks capture.

## 4.8 Open questions for the operator

1. **Confirm the source of record.** The best export sits in `~/Downloads`. Should the
   380×550 tight SVG be committed to `gmux`, or is there a canonical brand-kit location
   in `getspecstory` it should be pulled from instead? (It is tracked in *no* SpecStory
   repo right now — `git ls-files` finds no SVG at all in `getspecstory`.)
2. **The weight call in §4.5** — ship the solid mark at full house scale, or accept the
   22-of-24 inset. Recommendation is the former; this is a two-minute visual judgement
   that is cheaper to make from a screenshot than to argue in prose.


---

# §5 Backlog-ready phase entry

Paste into `docs/BACKLOG.md` in the house format (`## Phase N — title`, root cause,
reference screenshots, verification tier, what must not regress). Numbered 18 because the
backlog ends at Phase 17 (shipped 2026-08-12). The four mission questions do **not** map
onto one tier, so per CLAUDE.md they are tiered per item rather than promoting the whole
phase to Tier 3.

---

## Phase 18 — specstory hybrid resolution, agent drift, open-vocabulary providers, the book mark

**Root cause (one sentence per item, because these are four different bugs that happen to
share a Settings pane):**

1. **18.1 — the SpecStory rail entry borrows the git glyph.** `SettingsApp.tsx:39` uses
   `icon: 'cloud'`, and `cloud` is already the remote-branch glyph
   (`scm/ref-badges.tsx:229`, `scm/BranchesView.tsx:380`). One glyph currently means both
   "SpecStory" and "this branch is on a remote".
2. **18.2 — the provider vocabulary is closed even though the parse is dynamic.**
   `SpecstoryProviderId` (`agents/registry.ts:134`) and `ALL_PROVIDERS`
   (`specstory/capture.ts:50`) are 8-member allowlists used as a membership filter, so a
   provider id the binary reports that Tortie has never heard of is dropped silently. The
   probe itself also parses wrapped help prose when a cleaner unwrapped surface exists.
3. **18.3 — specstory resolution prefers the bundled copy unconditionally, and
   `resolveBinaryAgainst` takes the first PATH hit.** On this machine that picks 2.5.0
   over an installed 2.6.0 and a bundled 2.8.0 (§0.2). specstory ships every 4.9 days;
   Tortie has no update channel, so a bundled-only pin means a specstory fix needs a
   Tortie release.
4. **18.4 — the manifest records the *wrapper's* version and not the *agent's*.**
   `sessions.specstory.binVersion` exists; there is no `agent_version`. Research 11 §3
   gap 5 recorded this as "already planned"; it was never built. Five of nine installed
   agents drifted in three days (§2.1) and `src/main/restore/` does zero version checking.

**Reference screenshots:** `media_pyGJcwxRrt` (Settings › SpecStory, the "Capture new
sessions" list) — a conversation attachment handle, matching existing BACKLOG convention;
no `media_*` handle referenced in BACKLOG.md resolves to an on-disk path. Generated
evidence for 18.1 (rail strip at 14×, ground-truth overlay, 16/24/48 px renders) is
listed in §4 and is **ephemeral scratchpad** — the durable copy of the icon is the
`<path d="…">` inlined in §4.4 of this document.

**Specs:** this document. §1 for 18.3, §2 for 18.4, §3 for 18.2, §4 for 18.1, and **§0
overrides §1.7 step 4 and §4.7 gap 3 on the probe command.**

## 5.1 Items, tiers, and why each tier

| # | Item | Tier | Why this tier |
|---|---|---|---|
| 18.1 | Book mark replaces `cloud` on the Settings rail | **1** | CLAUDE.md names "icons and assets" as Tier 1. Gates + one screenshot of the rail. |
| 18.2 | Probe ladder + open vocabulary + absence reasons + re-check button | **2** | One subsystem, fails closed, cannot lose data. Gates + a targeted probe + one screenshot. The natural A/B is free on this machine: the same pane against bundled 2.8.0 (9 providers) and brew 2.5.0 (8) must differ by exactly `copilotide`. |
| 18.3 | Hybrid newest-wins resolution, multi-location probe, cdhash pin, no downloader | **3** | Changes which binary wraps a session's argv **and gets pinned into `resume_argv`** — durability. Also a "performance/behaviour regression with a number attached" (which copy wins changes from 2.5.0 to 2.6.0 on this machine today). |
| 18.4 | Manifest migration, drift detection, restore warning, conformance versions | **3** | Manifest migration + restore path + a claim of universality across agents. `conformance:resume:capture` is a **mandatory** added gate per CLAUDE.md (touches `agents/`, `manifest/`, `restore/`). |
| 18.5 | Pin-staleness CI check (tap formula sha256 vs `build/specstory-release.json`) | **1** | Build tooling, no runtime surface. |

## 5.2 Builder ownership (disjoint, per the phase contract)

| Builder | Owns | Must not touch |
|---|---|---|
| A (18.1) | `src/renderer/assets/brand/specstory.svg` (new), `src/renderer/icons/index.ts` (export `InlineSvg`), `src/renderer/settings/SettingsApp.tsx`, `settings.css` rail row | `SpecStorySection.tsx` |
| B (18.2) | `src/main/specstory/capture.ts`, `src/shared/specstory-status.ts`, `src/renderer/settings/SpecStorySection.tsx`, **and the `SpecstoryProviderId` type alone** in `agents/registry.ts` | `resolve.ts`, `manifest/` |
| C (18.3) | `src/main/specstory/resolve.ts`, `wrap.ts`, `build/sign-nested-binaries.cjs`, the CI check | `capture.ts`, `manifest/store.ts` |
| D (18.4) | `src/main/manifest/store.ts`, agent detection + `flags.ts` consumers, `src/main/conformance/report.ts`, `src/main/restore/**` | `registry.ts`, `capture.ts` |

**Three ownership collisions the integrator must pre-empt, not discover:**

1. **One migration, not two.** 18.3 wants a cdhash column and 18.4 wants `agent_version`.
   **D owns a single migration 006 adding both**; C consumes it. D's migration lands
   first or they conflict on `MIGRATIONS`.
2. **`registry.ts` is wanted by B (widen the provider type) and D (read `flags.ts`
   presets).** D reads only; B is the sole writer.
3. **The provider capability probe is shared** between 18.2 (the Settings list) and 18.3
   (§1.7 step 4's "don't trust semver, probe capability"). **Build it once, in B's
   `capture.ts`, and have C call it** — this is exactly the "grep for an existing helper"
   rule, and the failure mode is two probes with two caches disagreeing.

## 5.3 What must NOT regress

- **Capture fails closed.** An unparseable probe may lose providers; it may never invent
  one. 18.2 replaces a *membership* guard with a *shape* guard — the fail-closed property
  must survive that swap, with a test that feeds it garbage.
- **`cloud` stays the SCM remote-branch glyph.** 18.1 changes exactly one call site.
- **No runtime downloader for the bundled copy, ever** (§1.4: it cannot work once the app
  is properly signed). 18.3 adds the warning comment; it does not add the mechanism.
- **The bundled copy still ships and is still ad-hoc signed.** `before-pack.cjs` /
  `after-pack.cjs` behaviour is unchanged except the comment.
- **Sessions with `agent_version` NULL restore exactly as today.** Pre-migration rows are
  "unknown", never "mismatched" — an unknown must not raise the 18.4 warning.
- **The armed resume is still armed.** 18.4 adds a sentence; it never refuses a resume and
  never rewrites `resume_argv`.
- **No probe writes to the user's `~/.specstory`** beyond the inert `cli/config.toml` the
  CLI creates on any invocation (§3.3), and **no probe uses `run <sentinel>`** (§0.1).
- **The name strands** (`-L gmux`, `resources/gmux-tmux.conf`, `@gmux-*`,
  `GMUX_SESSION_ID`, `<userData>/gmux/`) are untouched. 18.2 adds a `__tortie_*` sentinel
  string, which is user-invisible probe input, not a live-data identifier.
- **Version-bump noise stays silent.** 5-of-9-in-3-days (§2.1); a patch bump with all
  flags intact must produce no user-visible warning, or the warning becomes wallpaper.

## 5.4 Gates

Standard `typecheck && build && smoke:t1` for every item; integrator runs the full
battery. **18.4 additionally requires `npm run conformance:resume:capture`** (CLAUDE.md
mandates it for commits under `agents/`, `manifest/harvest/**`, `manifest/agents.ts`,
`restore/**` — 18.4 touches three of the four), and the full `npm run conformance:resume`
once for the phase.

---

# §6 Risks, and what is *not* verified

Split deliberately: risks are things that could go wrong if the recommendations are
adopted; unverified items are claims in this document that were reasoned rather than
measured. The second list is the one a later agent should distrust.

## 6.1 Risks in the recommendations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **The `list <sentinel>` probe parses an *error path*.** SpecStory has never promised the format. An unknown provider could become a soft warning at exit 0, or the list could move to stdout, or the bullet could change. | Med | The ladder (§3.4) falls back to `run --help`, which ships today and is verified on 2.5.0/2.6.0/2.8.0; then to the measured set with `providerSource: 'fallback'` shown to the user. **The real fix is upstream:** ask SpecStory for `specstory providers --json`. It is one function (`Registry.GetProviderList()`), already the single source for all five existing surfaces. |
| R2 | **Newest-wins can pick a copy Tortie has never tested.** A user's brew copy could be newer than the bundled one and behave differently. | Med | The compatibility band (same major, ≥ bundled) plus the capability probe plus the two-tier confidence model (§3.5), which offers an unmeasured provider with capture **off** by default and `exitCodeFidelity: 'collapsed'`. |
| R3 | **A `brew upgrade` mid-flight changes the meaning of an armed `resume_argv`.** | Med | The cdhash pin (§1.7 step 5), with a recorded fallback to the bundled copy when the pinned binary is gone. **Design gap:** what Tortie should do when the cdhash differs but the version matches is not specified — decide it in the phase, do not leave it to the builder. |
| R4 | **Widening `SpecstoryProviderId` to `string` removes a compile-time check** that today catches a typo in a registry row. | Low | The shape guard plus a test asserting that every registry `specstory.provider` value is matched by at least one probed id on the bundled binary — a stronger check than the union, because it is against the real binary. |
| R5 | **Two probe caches disagreeing** if 18.2 and 18.3 each build one. | Med | Named as integrator collision 3 in §5. |
| R6 | **`~/.specstory/sessions.db` is 3.2 GB on this machine.** Deliberately running two vintages against it risks a forced reindex. | Med | Newest-wins picks *one* copy; nothing here runs two. Do not add a "try the other copy" retry. |
| R7 | **The drift warning becomes wallpaper.** | Med | The two-layer split (§2.4 D3): version drift is silent, a missing VERIFIED flag or resume token is the warning. This is a product decision that must survive review — it is the difference between a useful warning and a dismissed one. |
| R8 | **The book mark is 2.4× the ink of the codicon mean** (§4.5) and cannot be scaled into parity without looking undersized. | Low | Shipped solid at house scale, last on the rail; a measured 22-of-24 inset exists if review disagrees. Operator call, §4.8. |
| R9 | **The icon's provenance.** The best source is `~/Downloads/SpecStory-logo.svg`; `git ls-files` finds no SVG tracked anywhere in `getspecstory`. Committing an untracked brand asset into Tortie is a licensing/brand question, not a technical one. | Low | §4.8 open question 1 — the vendor's own monochrome derivation exists in the VS Code extension, so the *treatment* is sanctioned even though the *file* is untracked. |

## 6.2 Not verified — treat these as claims, not findings

1. **No agent's resume *semantics* were tested.** §2 greps `--help` for flag presence.
   Flag presence is a proxy; a flag that still exists and now means something slightly
   different is exactly the Codex rollout-format failure that motivated the Phase 13.5
   harness. Only `npm run conformance:resume` proves semantics, and it was not run here
   because it spends real agent turns. **This is the single biggest gap in §2**, and it
   is also the argument for D5.
2. **The signing finding was proven without a Developer ID.** §1.4 built a test bundle and
   showed that swapping a nested binary breaks the seal. Tortie's shipped app is
   `adhoc,linker-signed` with no `_CodeSignature/CodeResources` at all, so today a swap
   *works*. The conclusion "it breaks once signed properly" is sound in direction — real
   Developer ID signing is strictly stricter — but it has not been demonstrated against a
   notarized build, because Tortie has no Developer ID enrolment (BACKLOG carries
   notarization forward).
3. **Quarantine behaviour is a snapshot of macOS 15.7.9.** The measured result — a
   downloaded ad-hoc-signed CLI execs despite `spctl` rejecting it — is exactly the kind
   of thing Apple tightens. It only matters if someone revisits the downloader, which is
   recommended against.
4. **Drift rate is one machine, one day.** "Five of nine in three days" is a single
   sample against one `helpVerifiedVersion` timestamp. The *direction* is safe; the rate
   should not be quoted as a constant.
5. **`droid` is not installed here**, so its provider row, its capture path and its place
   in the intersection are untested on this machine. It is the one row in the screenshot's
   arithmetic that is absent for an environmental reason.
6. **`muse` is a live inconsistency**, not a resolved one: research 13's per-agent table
   includes it, the released 2.8.0 does not have the provider (branch-only). It is
   currently harmless because the intersection drops it correctly — but the research table
   and the shipped pin disagree, and only the capability probe keeps that from mattering.
7. **`qwen`'s `exitCodeFidelity: 'exact'`** was read from specstory's source
   (`qwen_exec.go:98-101` does `os.Exit(exitErr.ExitCode())`), not measured end to end.
   §3.5 deliberately does not act on it — a newly discovered provider still defaults to
   `'collapsed'`. Do not promote qwen to `'exact'` on the strength of a source read.
8. **The `agent.id` → provider-id fallback** (§3.5) is verified to be correct for every
   agent in today's registry except `antigravity`↔`agy`, which has an explicit row. It is
   *not* a general solution: any future agent whose Tortie id differs from SpecStory's
   provider id still needs a registry row, i.e. still needs a release. That limit is
   named, not fixed.
9. **Cost figures are warm-cache, single-run.** Version probes 26–673 ms, `list` probe
   ~147 ms, `run --help` ~114 ms, full drift check ≈1.4 s. Good enough to justify the
   cadence argument; not benchmark-grade.
10. **The Homebrew tap check is a point-in-time match.** The tap's darwin-arm64 sha256
    equalled `build/specstory-release.json`'s `assetSha256` on 2026-08-12. That is what
    makes the CI check in 18.5 meaningful, but it was checked once.
