# Tortie — build & packaging status (FINAL, Phase 17)

Tortie is installed. This is the state of the shipped thing.

**Measured 2026-08-12** · version 0.0.1 · macOS 15.7.9 arm64 · node v22.23.1 ·
electron 43.3.0 · electron-builder 26.15.3 · system tmux 3.6a
(`/opt/homebrew/bin/tmux`) · private socket `-L gmux`.

---

## 1. What Tortie is

A calm, durable place for agentic work — an Electron window in front of a
**private tmux server**, so the sessions belong to the work rather than to the
application displaying them. Product philosophy: [docs/ZEN-OF-TORTIE.md](docs/ZEN-OF-TORTIE.md).
Architecture: [current architecture simplification audit](docs/audits/2026-08-14-electron-typescript-architecture.md).

Three things it does that a normal editor cannot, and everything else is in
service of them:

1. **Named agent sessions that outlive the window.** Quit Tortie, crash it, or
   reboot the machine — the sessions are in tmux, not in the app. After a
   reboot, Restore replays each pane's scrollback and *arms* the agent's own
   resume command so the conversation comes back, not just the shell.
2. **Many projects in one window.** Project tabs, each with its own sessions,
   file tree, git surface and search.
3. **The agent layer.** A ten-agent registry with per-agent launch flags, icons,
   hotkeys, native status oracles, image drop, and bundled SpecStory capture.

### The name

The product is **Tortie** (`com.itavero.tortie` since Phase 27,
`com.specstory.tortie` from Phase 16.5 to Phase 27,
`~/Library/Application Support/Tortie` throughout — the data directory follows
`app.setName`, not the bundle id, so the Phase 27 change moved no data).
Tortie ships under Itavero, the operator's LLC; the SpecStory integration
keeps its name because it is a separate product Tortie talks to.
It was `gmux` until Phase 16.5 and much of the code's *prose* still says so —
deliberately. The identifiers **live data is bound to must never be renamed**:
the tmux socket `-L gmux`, `resources/gmux-tmux.conf`, the `@gmux-*` session
options, the `GMUX_SESSION_ID` / `GMUX_MANAGED` pane env, the inner
`<userData>/gmux/` directory, the `window.gmux` bridge, the `gmux-asset:`
scheme, `gmux.*` localStorage keys, `gmux-*` CSS classes. Renaming any of the
first five strands sessions that are running right now. README has the full
table; CLAUDE.md carries the rule. **User-visible copy is the only place the
name appears, and there it is always "Tortie".**

---

## 2. How to run it

### Installed

`/Applications/Tortie.app`. Launch from Spotlight/Finder like anything else.
**⌘I → About Tortie** shows `Version 0.0.1 (<short sha>)` — the build version in
parentheses is the git commit the binary was built from, with `-dirty` appended
if the tree had uncommitted changes. That line is how you answer "is what I am
running what is in git?" without a build log.

### Dev

```sh
npm install         # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev         # electron-vite dev with HMR
```

**A dev run shares the installed app's userData** (Electron derives it from the
app name), so `npm run dev` opens your real sessions and your real manifest.
That is convenient and it is also the one footgun: every smoke and conformance
harness therefore passes its own `--user-data-dir` and never boots into the real
profile.

Since Phase 18.5 a second copy on the same profile refuses to start. It prints
one line, brings the window of the copy that is already running to the front,
and exits 0. So `npm run dev` while `/Applications/Tortie.app` is open now stops
instead of opening a second app on the same manifest. Two ways past it:

- run the built app on its own profile, which is the safe one and is what this
  phase verified against:
  `npm run build && electron . --user-data-dir=/tmp/tortie-dev`;
- or set `GMUX_ALLOW_SECOND_INSTANCE=1`, which starts the second copy on the
  real profile anyway. That is the state the lock exists to prevent, so use it
  only when you know why you need it.

The harnesses are exempt from the lock. Each already runs on its own profile,
and several of them run at the same time as each other.

### Package

```sh
npm run package     # electron-vite build + electron-builder --mac
                    # → release/Tortie-0.0.1-arm64.dmg (+ .zip)
                    # → release/mac-arm64/Tortie.app
npm run package:dir # faster: unpacked app only
npm run icon        # re-copy the Tortie brand assets into their build /
                    # runtime / renderer homes (no generation, no tools)
npm run vendor:specstory  # pre-fetch the pinned specstory-cli into build/vendor
```

Packaging needs network **once** per pin: `build/before-pack.cjs` downloads the
specstory release named in `build/specstory-release.json` and checks it against
two recorded SHA-256s (the tarball's and the extracted Mach-O's). After that it
is cached in `build/vendor/specstory/cache` and every later build is offline and
instant. Air-gapped: point `GMUX_SPECSTORY_TARBALL` at the tarball — it is
checked against the same pin, so the escape hatch cannot substitute a different
build.

Install: open the DMG, drag Tortie to Applications. **The app is unsigned for
distribution** — on any machine other than the build machine Gatekeeper blocks
the first launch: right-click → Open → Open, or
`xattr -dr com.apple.quarantine /Applications/Tortie.app`.

### The harnesses

| Command | What it proves | Cost |
|---|---|---|
| `npm run typecheck` | node + web projects type-clean | ~20 s |
| `npm test` | 1,483 unit/integration tests | ~18 s |
| `npm run smoke:t1` | a session survives a simulated app restart; manifest reconciles; re-attach flows bytes | ~40 s |
| `npm run smoke:t3` | out-of-band kill → `restorable` → restored with replayed scrollback and an ARMED, unexecuted resume line — for a claude row AND a non-claude (`pi`) row | ~60 s |
| `npm run smoke:capture` | SpecStory wraps both launch argv and resume argv; capture is live; F3 (agents are not uniquely killable) still holds under the wrapper | ~30 s |
| `npm run smoke:identity` | sessions are bound by `@gmux-id`, never by name | ~20 s |
| `npm run conformance:resume:capture` | every agent's registry resume claim is executable — manifest assertion only, no model turns, no cost | ~17 s |
| `npm run conformance:resume` | the full roundtrip: create → plant nonce → kill → restore → prove the agent still holds the conversation | ~3 min, real turns |

Every one of them runs against its own `--user-data-dir` and against the live
private tmux server, prefixes the sessions it creates, refuses to kill anything
it did not create, and never kills the tmux server.

---

## 3. Phase history at a glance

| Phase | Commit | What landed |
|---|---|---|
| 1 | `e55dd88` | Design system + Electron scaffold, frozen IPC contracts |
| 2 | `d2f73ed` | **Durable session core** — private tmux server (`-L gmux`), SQLite manifest, attach; T1 restart test |
| 3 | `d6042cc` | App shell — project tabs, session sidebar, create/rename (⌘T, F2) |
| 4 | `21678a7` | Git sidebar + git-decorated file tree |
| 5 | `68e37ac` | Monaco editor, diff-vs-HEAD on file click |
| 6 | `0024e38` | **Reboot restore** — snapshots, manifest replay, ARMED agent resume |
| 7 | `2f4cd23` | Polish + packaging — native menus, icon, DMG |
| 8.1–8.3 | `96cbc61` `2201a6f` `05b46fb` | Hardening — native menus, first-quit toast, focus-correct rename |
| 9 / 9.2 | `ca129d5` `86ecd36` `d9336d7` | Dogfood 1 — login-shell PATH capture (agents stopped dying at launch), input-aware status detector, terminal glyph coverage |
| 10 / 10.1 | `0d43f16` `9522e6b` | **Agent fleet** — registry launching, Settings + per-agent hotkeys, drag-to-split, branch management |
| 11 / 11.1 | `207decf` `bc8ebd9` | Pierre diffs + trees; Monaco demoted to editor-only |
| 12.0 | `611d74c` | Large diffs open fast (Pierre's virtualized path) |
| 12 / 12.1 | `d3ee863` `539e76d` | Terminal menu + capture, git push/pull, editor tabs, markdown preview, image drop |
| 12.2–12.6 | `c638575` `6ef60e0` `c19719a` `7174482` `f305f6f` | Scrollback in agent panes, Shift+Enter newline everywhere, preview tabs, drag/rename fixes |
| 12.7 | `8f39864` | **Durability hardening** — durable agents no longer uniquely killable (F3), identity by id, diagnosable deaths |
| 12.8 / 12.85 | `a58458e` `d95d0e9` | Real agent marks; the Tortie seated-sentinel icon + menu-bar item |
| 12.9–12.12 | `5e39605` `39cfa4f` `6b7fc5d` | File operations service, project/file management, image preview, tree-to-agent drag, per-pane zoom, shared agent grid, keyboard reference |
| 13 / 13.1 | `4c6f2ea` `81a40d1` | **Per-agent activity oracles** replace the byte heuristic |
| 13.5a/b/c | `7a47257` `3a14699` `d8f1208` | **Universal resume** — session ids captured for every agent that supports one; the UI says *before* the reboot which sessions come back with their conversation; the conformance harness makes every resume claim executable |
| 13.5.1 | `eca4c7b` | Verifier fixes — incl. deepseek's dead-pane resume |
| 14 / 14.1 / 14.3 | `2890625` `f41a8f0` `aa7b8d2` | **Project search, quick open, symbols** (ripgrep + tree-sitter). Parity scope capped here. |
| 14.5–14.7 | `08b05c3` `011bade` `e417722` | True git log graph with lanes and origin divergence; View-menu radios follow the store |
| 15 / 15.1 | `e930530` `1db2853` | **SpecStory bundled** — specstory-cli 2.8.0 inside the app, capture wraps launch AND resume, Settings owns device sign-in |
| 16.0 / 16 / 16.1 | `bfc3c85` `ab42553` `ae6a1b7` | **Consolidation** — one IPC surface, domain boundaries, dead code removed, three guardrails made executable |
| 16.5a / 16.5 / 16.5.1 | `53fa1e4` `09cb853` `cda2b1a` | **Rename to Tortie** + userData migration (copy, verify, keep the original) |
| **17** | *this* | **Installed for daily use** — packaged from HEAD, bundle verified, switched over live, About commit stamp, acceptance script |

---

## 4. What is verified, and how

Every number below was re-measured on **2026-08-12** from the tree this build
was cut from. Nothing here is inherited.

### Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | green (node + web) |
| `npm run build` | green (monaco is the expected 26 MB renderer chunk) |
| `npm test` | **1,481 passed · 2 skipped · 0 failed** (118 files) in 17.7 s |
| `npm run smoke:t1` | PASS — session survived the simulated restart, manifest reconciled, re-attach flowed 844 bytes |
| `npm run smoke:t3` | PASS — both rows: `claude --resume <uuid>` and `pi --session-id <uuid>` restored with replayed scrollback and the resume line armed but **not executed** |
| `npm run smoke:capture` | PASS 8/8 — bundled specstory 2.8.0 resolved, resume argv wrapped with the inner command intact, `.specstory/history` live, F3 holds under the wrapper |
| `npm run conformance:resume:capture` | **6 PASS · 0 FAIL · 0 BLOCKED · 4 SKIP** in 16.8 s |
| Packaged-app smoke | `GMUX_SMOKE=basic` from `release/mac-arm64/Tortie.app` — 6/6 PASS, **exit 0**, twice. No first-launch teardown flake this build. |

### The packaged bundle

Re-measured **2026-08-13** from the Phase 27 release rehearsal (version
0.18.0, signed and notarized). The installed `/Applications/Tortie.app` is
still the Phase 17 build of 0.0.1; nothing below replaced it. Checked on the
built copy, the app inside the ZIP and the app off the mounted DMG
(`build/verify-signed.mjs --artifacts`):

- `CFBundleIdentifier=com.itavero.tortie`, `CFBundleName=Tortie`,
  `CFBundleExecutable=Tortie`, `CFBundleShortVersionString=0.18.0`.
- All four helper bundles renamed **and** their `CFBundleName` rewritten —
  `Tortie Helper`, `Tortie Helper (GPU)`, `Tortie Helper (Plugin)`,
  `Tortie Helper (Renderer)` — so every Tortie process answers to Tortie however
  macOS is asked (`build/after-pack.cjs`).
- `Contents/Resources/bin/specstory` — 43,207,904 bytes, Mach-O 64-bit arm64,
  exec bit set, runs (`2.8.0 (SpecStory)`), `codesign --verify --strict` clean,
  `Identifier=com.itavero.tortie.specstory`, `flags=0x10000(runtime)`, signed
  `Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)`. The unpacked
  ripgrep carries `Identifier=com.itavero.tortie.rg` with the same identity.
  Verified **off the mounted DMG** too, not only from `release/`.
- `Contents/Resources/gmux-tmux.conf` present (3,886 bytes) — the name the
  rename deliberately did not touch.
- Six tree-sitter grammars + `web-tree-sitter.wasm` in `Resources/tree-sitter/`;
  the menu-bar template images in `Resources/menu-bar/`.
- ripgrep unpacked from the asar at
  `app.asar.unpacked/node_modules/@vscode/ripgrep-darwin-arm64/bin/rg`
  (4,528,512 bytes) — required for correctness today and for signing later.
- Signature (Phase 27): **Developer ID with the hardened runtime**, and Apple
  notarized it. `codesign --verify --deep --strict` passes on all three
  copies. The designated requirement is
  `identifier "com.itavero.tortie" and anchor apple generic ... subject.OU =
  "4GRQMF5T5U"` — an identity requirement, not a cdhash, which is the
  precondition for self-update (research 27 section 1.3). `spctl -a -vv` says
  `accepted, source=Notarized Developer ID`. Notarization submissions
  94a1db5b (first signed build), d35b08de and 0130dfee (the rehearsal builds,
  76 to 86 s each), all **Accepted**. Until Phase 27 this line read "none on
  the bundle" — the 0.0.1 build was unsigned and would not launch on another
  machine. This one would.
- The rehearsal also caught a boot crash no repo gate saw: main imports
  parse5 since Phase 20.5, and electron-builder.yml still excluded it, so the
  packed app died in its first JavaScript tick behind a modal dialog.
  parse5 + entities now ship, and `build/assert-main-requires.cjs` fails any
  build whose main/preload bundles require an excluded package. The packaged
  `GMUX_SMOKE=basic` smoke passes 6/6 in 2.6 s from the signed app.

Sizes (0.18.0): DMG **172,088,555 B (164.1 MB)** · ZIP **171,088,500 B
(163.2 MB)**, both with blockmaps, plus `release/latest-mac.yml` (the updater
feed, ZIP first).

### The switchover itself (Phase 17's own evidence)

The premise of the product is that quitting the app does not touch the work.
The handover was the test:

- **Before:** 44 live sessions on the private socket; 40 manifest rows across 8
  projects; 34 of those rows carrying both an `agent_session_id` and a
  `resume_argv`; 43 snapshots on disk.
- The full gate battery ran against the live socket **while all 44 sessions were
  up**, and the session-id list afterwards was byte-identical. Every harness
  logged the user's sessions as "live tmux sessions with no manifest row
  (ignored)" — proof of the rule that a session carrying neither `@gmux-id` nor
  `GMUX_SESSION_ID` is not ours and is never adopted and never killed.
- The old app was quit through **its own quit path**, never a signal to tmux and
  never `pkill`, so snapshots flushed on the way out.
- **After:** the tmux server and all 44 sessions still alive; the manifest row
  count unchanged; sessions re-adopted from the live socket by `@gmux-id`;
  settings and hotkeys intact.

### The migration (Phase 16.5a), as it actually ran

Recorded in `~/Library/Application Support/Tortie/.userdata-migration.json`:

```
status   complete
from     ~/Library/Application Support/gmux
to       ~/Library/Application Support/Tortie
files    97        bytes  1,480,944
gmux/manifest.db   raw-copy   source 41 sessions / 8 projects / 5 migrations
                              copy   41 sessions / 8 projects / 5 migrations   ok
```

Row counts were compared **source vs copy** and matched. The original was left
in place (see §7). The one-time rename notice — TCC grants do not carry across a
bundle-id change, and the SMAppService login item was registered under the old
id — was shown and acknowledged at `2026-08-12T04:56:21Z`; the stamp file
`.rename-notice-shown` prevents it firing twice.

### Resume conformance — which agents are covered LIVE

`npm run conformance:resume` drives **Tortie's own** create → capture → kill →
restore path per agent, never a hand-typed command, so what it proves is our
capture rather than the CLI's documentation. Per agent it plants a nonce turn,
asserts the manifest got an agent session id and a resume argv, kills the tmux
session out of band (the reboot), restores, presses Enter, and asks the resumed
agent to repeat the planted token joined to a **second nonce generated after the
kill**. That join is the assertion: restore replays the pre-kill scrollback, so
"the nonce is on screen" proves nothing — only a process that still holds the
conversation can put a token it has never seen next to one it was told before.

Full matrix, measured 2026-08-11 (182 s, concurrency 3):

| agent | verdict | capture route | armed at spawn | id before first turn |
|---|---|---|---|---|
| claude 2.1.227 | **PASS** | pre-assign `--session-id` | yes | yes |
| cursor 2026.08.04 | **PASS** | pre-assign-cmd `create-chat` | yes | yes |
| codex 0.147.0 | **PASS** | harvest cwd-newest / exact | no | no (first turn) |
| antigravity 1.1.11 | **PASS** | harvest time-only / weak | no | no (first turn) |
| muse 0.1.0 | **PASS** | harvest tmux-pane / exact | no | yes |
| qwen 0.21.7 | **PASS** | harvest pid / exact | no | yes |
| pi 0.84.1 | **PASS** | pre-assign `--session-id` | yes | yes |
| deepseek 0.8.26 | **PASS** | harvest cwd-newest / weak | no | no (first turn) |
| gemini 0.54.0 | BLOCKED | pre-assign `--session-id` | yes | yes |
| droid | SKIP | — | — | — |

**8 of 9 installed agents proven end to end.** gemini is BLOCKED, not failed:
capture is proven, the roundtrip is not, because the provider refuses every turn
on this account. droid is not installed here. Before Phase 13.5 the number was
1 (claude).

Exit code is **1 only when an agent FAILs** — that is Tortie's own defect.
SKIP and BLOCKED are reported loudly and are not red, because a harness that
goes red when the operator is logged out of one provider stops being run, and
one nobody runs catches no drift. `GMUX_CONF_STRICT=1` promotes BLOCKED to red.

Cadence: `conformance:resume:capture` before any commit touching
`agents/registry.ts`, `manifest/harvest/**`, `manifest/agents.ts` or
`restore/**`; the full matrix once per phase and after any agent-CLI upgrade.
It exists because agent CLIs change under us — it has already caught codex
rollout-format drift, gemini's `.json` → `.jsonl` rename, deepseek's dead-pane
resume, and a one-word `availableAt` error the whole battery above was blind to.

---

## 5. Verification the user runs

Everything above is machine evidence. The human-side check — quit with an agent
mid-task, reboot and Restore, drop an image, scroll a long transcript, search
across a project, read the git graph — is
**[docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)**. It is written to be run from the
operator's seat, in plain language, with what each step should show and what it
would mean if it did not.

---

## 6. Deliberately deferred — with the condition that reopens each

Named here so the next agent inherits the decision instead of re-deriving it.

### Code signing & notarization

This section used to say that only an Apple Development certificate exists on
this machine, so a distributable signature was impossible. That was false, and
because it was written down as the reason, it stood as the only recorded blocker
on notarization. Corrected in Phase 18.5 from research 27 section 1.1, and
measured again on 2026-08-12 with `security find-identity -v -p codesigning`.

What is actually here:

| Thing | State on 2026-08-12 |
|---|---|
| Developer ID Application certificate | present, `Gregory Ceccarelli (4GRQMF5T5U)`, valid 2026-06-01 to 2031-06-02 |
| Apple Development certificate | present, a second identity, not the one distribution needs |
| notarytool and stapler | present, both from Xcode, notarytool 1.1.0 |
| App Store Connect key | present, `~/.appstoreconnect/private_keys/AuthKey_8NH6JLTWBN.p8`, key id `8NH6JLTWBN` |
| App Store Connect **issuer id** | **missing**, and it is what still blocks notarization |

The issuer id is a UUID that `notarytool` needs next to the key. It is not in
the shell rc files, and there is no saved `notarytool store-credentials`
keychain profile, so no notarization round trip has ever run from this machine.
It is one copy and paste from App Store Connect, under Users and Access, then
Integrations, then Keys.

So the honest state is that signing is switched off, not unavailable. **Reopen**
as soon as the issuer id is to hand. The work is then four changes, written out
in `docs/research/27-release-and-updates.md` section 6.2: set `identity` in
`electron-builder.yml`, turn on `hardenedRuntime`, add the Electron entitlements
(`com.apple.security.cs.allow-jit` and its neighbours), and notarize, then
staple. The inside out nested binary machinery is already in place.
`build/sign-nested-binaries.cjs` ad-hoc hardens `Resources/bin/specstory` today
in exactly the shape notarization will want, and `mac.binaries` already lists it
(inert while identity is null). Keep the two lists in step.

### Deleting Monaco
Decided on evidence, not inheritance. `@pierre/diffs` ships `/edit` and it works,
but v1.3's own release notes say *"Edit mode is experimental in 1.3 — the API may
still shift"*, diffs.com/edit still labels it experimental, and five patches
landed in six days. Tortie's editing surface is the user's **unsaved buffer** —
exactly the class CLAUDE.md reserves Tier 3 for, and exactly the class not to
build on a moving API. The size case is also weaker than it looks: Monaco is
42.2 MB raw / 7.1 MB gzip, about 9% of a 451 MB `.app`, and research 25 §6.1
found ~45 MB of shipped bytes no code reads, reclaimable by config alone.

**Trigger condition** (mechanical, so the re-check costs nothing):

1. Pierre `/edit` drops the "experimental" label, **or** two consecutive
   `@pierre/diffs` minors ship with no breaking change to the `Editor` API;
   **and**
2. the phase that does the swap delivers a **minimap** and a
   **diagnostics/marker source** for ts/js/json/css/html (those four language
   workers are 18.7 MB of the 42.2 — the half whose replacement costs most), or
   explicitly retires them with the user's agreement.

Re-check on the next `@pierre/diffs` minor. The seam is good and not degrading:
722 deletable lines across three modules, six consumers, and no CSS anywhere
names a Monaco class. Nothing is lost by waiting except disk.

### ~45 MB of packaging wins
Research 25 §6.1 measured shipped bytes no code reads: a second
`@vscode/tree-sitter-wasm` copy (21 MB), `better-sqlite3`'s seven unusable
prebuilds + `deps/` (~24 MB), `web-tree-sitter`'s sourcemaps and `debug/`. All
reclaimable by turning `electron-builder.yml`'s `files` into an allowlist, plus
renderer `build.minify`. **Reopen** as its own measurement round — every one of
these gates on the packaged-app smoke, never on `out/`, which is exactly why
they survived sixteen phases.

### Bundled pinned tmux
Tortie uses system tmux 3.6a (homebrew → `/usr/bin` → PATH). **Reopen when**
the app must run on a machine without tmux. The machinery is ready: add it to
`NESTED_BINARIES` in `build/sign-nested-binaries.cjs` and to `mac.binaries`, the
same two lines specstory took — plus static libevent/ncurses and terminfo
(research 09 Appendix F.1/F.2), which specstory did not need.

### OSC-133 prompt marking
Status detection is heuristic (output-flow + prompt regex, main-side per-agent
oracles since Phase 13). The upgrade path to OSC 133 / agent hooks is documented
at the top of `src/renderer/state/status-detector.ts`.

### Consolidation steps not taken in Phase 16
- **§7 step 3** (segregate ~6,100 harness lines out of production bundles) — a
  mistake here silently disarms the T3 gate; wants its own phase with the smoke
  scripts as the acceptance test.
- **§7 step 5** (command layer) and **step 7** (`renderer/state/store.ts` into
  slices) — the spec itself calls step 7 "the weakest-covered step in the plan"
  (61 importers, no store test). Phase 16's rule was *write the test first or
  skip the step*.
- **§7 step 8** (`app.css` colocation) — no CSS regression harness exists, and
  cascade order changes when files move.

### Other
Auto-update feed (`publish: null`), x64/universal builds (arm64 only — the dev
target), structural/AST search, replace-in-files, LSP, debugging, task runners,
extensions (all explicitly out of scope per CLAUDE.md's parity cap).

---

## 7. Known limitations

**1. The migration was one-way and it has already run.**
`~/Library/Application Support/Tortie/.userdata-migration.json` says
`status: complete`, and the migration is gated on that marker — it will never
run again. Anything written by the old `gmux.app` after the switchover would
therefore never cross. **Do not launch an old gmux.app.** There is none in
`/Applications`; if you keep one anywhere, treat it as an archive, not an app.

**2. The old userData is still there, as your backup.**
`~/Library/Application Support/gmux/` was **copied, not moved** — the original is
untouched, including `gmux/manifest.db` and every snapshot as of the migration.
Tortie never reads it again. **You may delete it whenever you are confident**
(after a few days of normal use, or after working through
[docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)); nothing in the app will notice. Keep
it if you would rather have the parachute — it is ~1.5 MB of real data plus
Electron cache.

**3. TCC permissions were re-asked, and the login item needed repair.**
Bundle-id changes reset macOS privacy grants: Full Disk Access, Files & Folders,
Automation, Accessibility — anything granted to `com.specstory.gmux` means
nothing to `com.specstory.tortie`, and macOS asks again once per permission at
the moment it is needed. The SMAppService login item was registered under the
old id; `reconcileLoginItem()` re-registers from a recorded preference, but the
pre-rename build never recorded one, so for this upgrade only the answer was
genuinely unrecoverable and the app said so in a one-time dialog. A stale entry
may linger in **System Settings → General → Login Items** pointing at an app
that is not there; remove it by hand.

**4. Unsigned for distribution.** Gatekeeper will block first launch on any
other machine. See §2.

**5. The DMG is 160.6 MB / the `.app` is 450.8 MB.** Electron 43's framework, the
Monaco renderer chunk and the 41 MB bundled specstory-cli dominate. §6 has the
~45 MB that is genuinely dead weight and how to reclaim it.

**6. Agents flush their transcripts asynchronously — a kill a heartbeat after a
turn can lose it.** MEASURED on pi 0.84.1: the user message reaches its JSONL
about two seconds after the keystroke, and the reply can land on screen first.
The conformance harness hit this as a coin flip until it started waiting for
pane quiet plus 2.5 s before the kill. Recorded here rather than only fixed,
because the fact is the user's too: **a machine that loses power seconds after an
agent replies can come back to a conversation missing its last turn.** That is
the agent's durability, not Tortie's, and no shell can fix it from outside.

**7. `@parcel/watcher` can SIGABRT at exit.** `unsubscribe()` is
fire-and-forget, so an FSEvents subscription can still be initialising when
`app.exit()` tears the env down — `napi_throw` in `RunCleanup`. Cosmetic for
users (the app has already exited) but it can turn a green smoke red. The
conformance harness works around it with a 1.5 s settle. Real fix (owner:
`src/main/manifest/harvest`): await `unsubscribe()` in the watch's cancel path,
then drop the workaround. Not observed in this build's packaged smoke (exit 0,
twice).

**8. Shell environment after a reboot is best-effort.** Restore brings back the
pane, the scrollback and the armed resume command. It does not replay whatever
you had exported by hand in that shell, and it cannot bring back background
processes an agent spawned (dev servers, watchers). Restart those yourself.

**9. Spatial state is browser-local.** Split layout, pane sizes and which tab was
active live in the renderer's localStorage, not in the manifest. They survive
quit and relaunch; they are not part of the durability guarantee and are not
carried by the manifest's restore path.

**10. Restore can report `running` optimistically.** The restore path arms the
resume command; it does not verify that the agent then re-attached to its
conversation. If transcript replay or command arming partially failed, the row
can still read `running`. A typed restore state machine is the recorded fix
(docs/research/26).

**11. Nine live tmux sessions are not Tortie's.** `tmux -L gmux ls` currently
shows 44 sessions; the manifest has 40 rows. Sessions carrying neither
`@gmux-id` nor `GMUX_SESSION_ID` are deliberately **never adopted and never
killed** — the app logs them as ignored at every boot. That is the safety rule
working, not a bug.

**12. Two environment-dependent tests.** Two FSEvents tests cannot start their
streams and one process-ancestry test cannot observe its parent chain under some
sandboxes. They pass on this machine (0 failures this run).

**13. `npm run icon` needs `rsvg-convert`** (homebrew librsvg), present here, not
vendored. It only re-copies authored assets; nothing generates the icon.

---

## 8. Where the authority lives

| Question | File |
|---|---|
| Why does Tortie exist, what is it for | `docs/ZEN-OF-TORTIE.md` |
| Architecture | `docs/audits/2026-08-14-electron-typescript-architecture.md` |
| Design | `DESIGN.md`, `docs/DESIGN-SPEC.md` |
| Agent conventions and invariants | `CLAUDE.md` |
| What is still called gmux, and why | `README.md` |
| The work queue and its history | `docs/BACKLOG.md` |
| Banked research (26 documents) | `docs/research/` |
| The honest durability assessment | `docs/research/26-tortie-durability-architecture-and-recovery.md` |
| The check you run yourself | `docs/ACCEPTANCE.md` |
