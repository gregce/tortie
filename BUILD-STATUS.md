# Tortie — build & packaging status

> **Phase 16.5 renamed the app from `gmux` to `Tortie`** (appId
> `com.specstory.gmux` -> `com.specstory.tortie`, productName `gmux` ->
> `Tortie`). Everything measured BELOW this line was measured before the
> rename and still carries the old artifact names — `release/gmux-0.0.1-arm64.dmg`,
> `/Applications/gmux.app`, `Identifier=com.specstory.gmux.specstory`. Those
> numbers are still true of that build; the names are not. Packaging now emits
> `release/Tortie-0.0.1-arm64.dmg` / `.zip` and `release/mac-arm64/Tortie.app`,
> and Phase 17 re-measures the whole set under the new name.
>
> Three things the rename deliberately did NOT change, because live data is
> bound to them: the private tmux socket (`-L gmux`), the bundled tmux config
> (`Contents/Resources/gmux-tmux.conf`), and the inner data directory
> (`<userData>/gmux/`). The userData ROOT did change — Electron derives it from
> the app name — and `src/main/migrate/` copies the old one across on first
> launch and leaves the original in place as a backup. See README, "What is
> still called gmux, and why".
>
> Two macOS consequences of the new bundle id, both handled in code and both
> worth knowing before Phase 17 installs the app: TCC grants do not carry
> across (macOS re-asks), and the SMAppService login item was registered under
> the OLD id. `reconcileLoginItem()` re-registers it from a recorded
> preference, and a one-time dialog (`src/main/migrate/notice.ts`) says both
> things plainly the first time the renamed app opens.
>
> Two smoke scripts changed with it: `smoke`/`smoke:t1`/`smoke:t3`/`shot` now
> run against their own `--user-data-dir` instead of the default profile. They
> used to boot into the user's real userData; after the rename that directory
> is the one the migration is waiting to populate, and a harness booting there
> first would leave a `gmux/manifest.db` behind that makes the migration's
> "target already has data" guard refuse — costing the user their real
> manifest. A test harness must never be the thing that performs the upgrade.

Date: 2026-08-09 · version 0.0.1 · machine: macOS 15.7.9 arm64, node v22.23.1, electron 43.3.0, electron-builder 26.15.3, system tmux 3.6a (`/opt/homebrew/bin/tmux`).

## What works

### Phases landed (git log, all committed)

| Phase | Commit | Scope |
|---|---|---|
| 1 | `5c4c2af` | Design system + Electron scaffold, frozen IPC contracts |
| 2 | `49c0776` | Durable session core — private tmux server (`-L gmux`), SQLite manifest, attach; T1 restart test |
| 3 | `cf8ac8e` | App shell — project tabs, session sidebar, create/rename UX (⌘T, F2) |
| 4 | `fe840a5` | Git sidebar + git-decorated file tree |
| 5 | `1a22fc3` | Monaco editor, diff-vs-HEAD default on file click |
| 6 | `deb1f7d` | Reboot restore — snapshots, manifest replay, ARMED agent resume (`claude --resume <uuid>` pre-typed) |
| 7 (this) | — | Polish (native app menu, window title, launch flash, scrollbars, §2.3/§1.1 design drift, shot harness) + packaging (icon, electron-builder config, DMG+ZIP, packaged-app smoke) |

⌘J attention overlay IS built (`src/renderer/app/AttentionOverlay.tsx`) — every NEEDS_INPUT session across projects, ↑↓+↩ jump. Shortcuts overlay too (`ShortcutsOverlay.tsx`).

### Gates (all re-run fresh by the Phase 7 integrator with polish + packaging reconciled, this machine, this date)

- `npm run typecheck` — green (node + web projects).
- `npm run build` — green (electron-vite; monaco is the expected 26 MB renderer chunk).
- `npm test` — 103/103 tests, 9 files, green.
- `npm run smoke` (GMUX_SMOKE=basic, dev) — 6/6 PASS, exit 0.
- `npm run smoke:t1` — T1 restart acceptance test green (session survives simulated app restart; manifest reconciles; re-attach flows bytes).
- `npm run smoke:t3` — T3 reboot-restore acceptance test green, now for TWO rows (out-of-band kill → row 'restorable' → restored with replayed scrollback + armed resume line typed but NOT executed). Phase 13.5.1 added the second: a row relabelled `pi` with a `pi --session-id <id>` argv, because until then the only restore this gate had ever exercised was claude's — the exact regression BACKLOG 13.5 item 6 was written to prevent, uncovered inside the battery meant to prevent it. No agent binary is launched; the pane is a shell and the argv is planted, so what it pins is that restore arms whatever the manifest recorded rather than something claude-shaped.
- `npm run package` — produces `release/gmux-0.0.1-arm64.dmg` (134 MB) + `release/gmux-0.0.1-arm64.zip`.
- **Packaged-app smoke**: `GMUX_SMOKE=basic release/mac-arm64/gmux.app/Contents/MacOS/gmux` — 6/6 PASS, exit 0 (window + renderer + preload load, better-sqlite3 + node-pty native modules work from `app.asar.unpacked`, private tmux socket reachable). See Known issues for a first-launch teardown flake.

### Packaged bundle verified

- `Contents/Resources/gmux-tmux.conf` present (main resolves it via `process.resourcesPath` when `app.isPackaged` — `src/main/tmux/supervisor.ts`, `src/main/attach/attach-host.ts`).
- Native addons (`*.node`) unpacked from asar (`asarUnpack`); electron-builder rebuilt node-pty / better-sqlite3 / @parcel/watcher against electron 43 headers during packaging.
- Renderer-only production deps (monaco-editor, react, react-dom, @xterm/*, zustand, and since Phase 11 @pierre/diffs, @pierre/trees + their exclusive transitives shiki/@shikijs/preact/diff/…) are **excluded** from the asar — electron-vite bundles them into `out/renderer`; the main bundle only requires node-pty, better-sqlite3, @parcel/watcher at runtime. Keeps ~135 MB of dead weight out of the app. A tail of small transitives (~4 MB: @types/*, micromark-util-*, unist-*, plus monaco's marked/dompurify) still rides along — see Phase 13's packaging item.
- Signature: **ad-hoc** (`Signature=adhoc, linker-signed`), identifier `Electron`. Launches locally; see Deferred for real signing.
- **Bundled specstory-cli (Phase 15)** — `Contents/Resources/bin/specstory`, 43,207,712 bytes, `2.8.0 (SpecStory)`, plus a 299-byte `specstory.json` naming the version so Settings can show it without a spawn. Verified in the shipped app AND off the mounted DMG: Mach-O arm64, exec bit intact, runs, `codesign --verify --strict` clean, `Identifier=com.specstory.gmux.specstory`, `flags=0x10002(adhoc,runtime)`. Size cost: **+42,200 KiB (41.2 MiB) on the .app, ~15.9 MB compressed**. Resolution order is bundled-first with a user-installed copy as the fallback (`src/main/specstory/resolve.ts`); nothing about the bundle forks the CLI's state, so one `specstory login` still serves both copies (all of it is `$HOME`-derived — `utils.GetAuthPath()`).

## How to run

### Dev

```sh
npm install         # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev         # electron-vite dev with HMR
```

Smokes: `npm run smoke` (basic) · `npm run smoke:t1` (restart durability) · `npm run smoke:t3` (out-of-band kill → restorable → armed resume) · `npm run smoke:identity` (bind by id, never by name) · `npm run conformance:resume` (per-agent resume matrix — see below).

### Package / DMG

```sh
npm run package     # electron-vite build + electron-builder --mac
                    # → release/Tortie-0.0.1-arm64.dmg (+ .zip)
npm run package:dir # faster: unpacked app only → release/mac-arm64/Tortie.app
npm run icon        # re-copy the Tortie brand assets into their build /
                    # runtime / renderer homes (no generation, no tools)
npm run vendor:specstory  # fetch the pinned specstory-cli release into
                          # build/vendor (gitignored). Packaging runs this
                          # itself via beforePack — this is for pre-warming
                          # or for a network-free build machine.
```

Packaging needs network **once** per pin: `build/before-pack.cjs` downloads the specstory release named in `build/specstory-release.json` and verifies it against two recorded SHA-256s (the tarball's and the extracted Mach-O's). After that it is cached in `build/vendor/specstory/cache` and every later build is offline and instant. Air-gapped: put the release tarball anywhere and set `GMUX_SPECSTORY_TARBALL` — it is checked against the same pin, so the escape hatch cannot substitute a different build. Bumping the version means editing `build/specstory-release.json` (tag + version + both hashes) and nothing else.

Install: open the DMG, drag Tortie to Applications. **The app is unsigned for distribution** — on any machine other than this one, Gatekeeper will block the first launch: right-click → Open → Open (or `xattr -dr com.apple.quarantine /Applications/Tortie.app`).

Icon (Phase 12.85): the mark is the Tortie seated sentinel, and `docs/brand/tortie/` is the source of truth — an authored, production-ready package that must NOT be regenerated (its README records the master SHA-256 and forbids wrapping the mark in a rounded square, badge or any outer chrome). `build/icon.icns` is a byte-for-byte copy of `docs/brand/tortie/macos/Tortie.icns`; `resources/menu-bar/TortieTemplate.png` + `@2x` (the menu-bar status item) and `src/renderer/assets/brand/tortie-128.png` (the one in-window mark, on the first-run empty state) are copies of their brand-package originals. `npm run icon` re-copies all three. The old generated `build/icon.svg` and its rsvg pipeline are gone — nothing derives the icon from an SVG any more.

## Resume conformance — which agents are covered LIVE (Phase 13.5)

`npm run conformance:resume` is the standing answer to "would this session come back with its
conversation?" It drives **gmux's own** create → capture → kill → restore path per agent, never a
hand-typed command, so what it proves is our capture rather than the CLI's documentation. Harness:
`src/main/conformance/` (`GMUX_SMOKE=conformance-resume`); spec: `docs/research/22-resume-audit.md`.

Per agent it: creates a session in a fresh scratch cwd → plants a nonce turn → **asserts gmux wrote
an agent session id + a resume argv into the manifest** → kills the tmux session out of band (the
reboot) → restores through `GmuxCore.restoreSession` (scrollback replayed, resume argv ARMED but not
fired) → presses Enter → asks the resumed agent to repeat the planted token joined to a **second
nonce generated after the kill**. That join is the assertion: restore replays the pre-kill scrollback
into the same pane, so "the nonce is on screen" proves nothing — only a process that still holds the
conversation can put a token it has never seen next to one it was told before the kill.

**Measured on this machine, 2026-08-11** (macOS 15.7.9 arm64, tmux 3.6a, private socket `-L gmux`,
concurrency 3, whole matrix in **182 s**):

| agent | verdict | capture route | armed at spawn | id before first turn | roundtrip |
|---|---|---|---|---|---|
| claude 2.1.227 | **PASS** | pre-assign `--session-id` | yes | yes | proven |
| cursor 2026.08.04 | **PASS** | pre-assign-cmd `create-chat` | yes | yes | proven |
| codex 0.147.0 | **PASS** | harvest cwd-newest / exact | no | no (first turn) | proven |
| antigravity 1.1.11 | **PASS** | harvest time-only / weak | no | no (first turn — registry corrected in Phase 13.5.1) | proven |
| muse 0.1.0 | **PASS** | harvest tmux-pane / exact | no | **yes** | proven |
| qwen 0.21.7 | **PASS** | harvest pid / exact | no | **yes** | proven |
| pi 0.84.1 | **PASS** | pre-assign `--session-id` | yes | yes | proven |
| gemini 0.54.0 | BLOCKED | pre-assign `--session-id` | yes | yes | — provider refuses every turn on this account ("This request failed"), exactly the API-400 wall research 22 §6 item 2 recorded. **Capture is proven; the roundtrip is not.** |
| deepseek 0.8.26 | **PASS** | harvest cwd-newest / weak | no | no (first turn) | proven (Phase 13.5.1 — was a dead pane; the launch flags now LEAD the `resume` subcommand) |
| droid | SKIP | — | — | — | not installed here |

Live coverage is therefore **8 of 9 installed agents proven end to end**, 1 blocked by a provider
account, 1 not installed — `8 PASS · 0 FAIL · 1 BLOCKED · 1 SKIP in 187.7s`, re-measured after the
Phase 13.5.1 fixes. Before this phase the number was 1 (claude).

Four things the harness measured on its first runs, which is the argument for keeping it:

1. **deepseek restore was a dead pane whenever any launch flag was chosen** — Known issues #6,
   FIXED in Phase 13.5.1. A real P1 the registry could not have caught by inspection, because the
   verb, the id and the capture are all correct and only the flag POSITION was wrong.
2. **antigravity's `availableAt: 'session-open'` is wrong** — its conversation directory does not
   exist until the first turn (measured: nothing after 50 s idle; the id lands ~4 s after the first
   reply). The roundtrip still PASSes, so the harness reports it as a NOTE rather than a failure —
   but that field is what bounds how long the UI may say "capturing…", so a session with a stale
   value sits hopeful forever. `conformance:resume:capture` reported antigravity FAIL until it was
   corrected to `'first-turn'` in `src/main/agents/registry.ts` (Phase 13.5.1); that gate is now
   `6 PASS · 0 FAIL · 4 SKIP in 16s`, and its failure line says exactly which of the two causes it
   is when it goes red again.
3. **`codex --dangerously-bypass-approvals-and-sandbox` does not skip the first-run workspace-trust
   dialog** and codex has no flag that does, so the harness answers it — but only when it can read
   which option is highlighted (`› 1. Yes, continue`, `▶ [a] Trust this workspace`). deepseek's
   onboarding screen also says "trust" and has no readable default; a bare Enter into it kills the
   pane, so the harness leaves it alone and lets the case go BLOCKED.
4. **qwen 0.21.7 has no autonomy flag at all** — the `--yolo` / `--approval-mode yolo` presets in its
   catalog are gemini-derived guesses (`provenance: 'RESEARCH'`, re-verified absent 2026-08-11).
   Passing one would be a dead pane, so the harness passes nothing to qwen, and a unit test binds
   every bypass flag it does pass to a `VERIFIED` entry in `AGENT_FLAG_PRESETS` so they cannot rot.

How to run it:

```sh
npm run conformance:resume          # full matrix, ~3 min, two short real model turns per agent
npm run conformance:resume:capture  # manifest assertion only, ~60 s, no model turns, no cost
npm run smoke:t3:agent              # one NON-CLAUDE full roundtrip (pi), ~16 s — BACKLOG 13.5 item 6
GMUX_CONF_AGENTS=muse,qwen npm run conformance:resume     # a subset
```

Exit code: **1 only when an agent FAILs** — that is gmux's own defect (no id captured, a resume argv
the CLI rejects, a conversation that did not come back). SKIP (not installed) and BLOCKED (a login
wall or provider error, which requires positive evidence on screen) are reported loudly and are not
red, because a harness that goes red when the operator is logged out of one provider stops being run
— and one nobody runs catches no drift. `GMUX_CONF_STRICT=1` promotes BLOCKED to red for a CI box
where every agent is expected to work.

Cadence: `conformance:resume:capture` before any commit touching `agents/registry.ts`,
`manifest/harvest/**`, `manifest/agents.ts` or `restore/**`; the full matrix once per phase and after
any agent-CLI upgrade. It exists because agent CLIs change under us — research 22 already caught
codex rollout-format drift and gemini's `.json` → `.jsonl` store rename — and this catches that the
day it happens rather than the day the user reboots.

Safety, since it runs against the user's live private tmux server: every session it creates is
`zz-conf-` prefixed and it refuses to kill a tmux session whose name lacks that prefix; it runs
against its own `--user-data-dir`, so the user's gmux has no manifest row for any of it and its
reconcile ignores it; it never kills the tmux server. Verified after the full run above: 0 leftover
`zz-conf` sessions, 0 leftover scratch dirs, the user's 17 live sessions untouched.

## Phase 16 — consolidation (2026-08-11)

Spec: `docs/research/25-codebase-context.md` (the Phase 15.5 re-baseline). The goal was **zero
behaviour change**, so every step had to be a pure move, a type-only deletion, or a change covered by
a named test run before and after. Three parallel streams, reconciled by the integrator.

### Landed

| §7 step | What | Proof |
|---|---|---|
| 0 | `busy_timeout` pragma, `.filter-field` rename | committed separately as `ec5ded2` |
| 1 | 17 dead type aliases deleted; the nine-level alias ladder in `shared/ipc.ts` flattened to one intersection | channel key set parsed before/after — **77 channels, identical** |
| 2 | Guardrail 1 closed on the main side: second `handle` wrapper generation deleted, 18 raw `ipc.handle` calls converted, event half went 3/10 → 10/10 typed channels, new `main/typed-events.ts` for the send half | `typecheck` + `smoke:t1` + `smoke:t3` (restore rides `restore/ipc.ts`) |
| 4 | The four `git:changed` subscribers collapsed to one `state/repo-changed.ts` | **test written first** — `state/__tests__/repo-changed.test.ts` |
| 6 | `class GmuxCore` → `main/sessions/core.ts`, popup bridge → `main/menu-popup.ts`; `main/ipc.ts` 1,998 → **136 lines** | pure move — `diff` of the moved range against HEAD is clean; full battery + `conformance:resume:capture` |
| 9 | `tmux/errors.ts` → `main/errors.ts`; `settings/specstory-*.ts` → `main/specstory/`; `scm/graph-geometry.ts` + `CommitGraph.tsx` → `scm/graph/`; `attach-host.ts` imports `TMUX_SOCKET`; keymap display-hint fixes | pure moves — `typecheck`, the moved tests, `smoke:capture`, `smoke:t3` |
| 10 | `uuid` + `@types/uuid` **deleted** (replaced by stdlib `node:crypto` `randomUUID`); the four phantom deps (`unified`, `unist-util-visit`, `@types/hast`, `@shikijs/types`) pinned into `devDependencies`; `material-icon-theme` demoted to `devDependencies` (build-script-only); 29 dead symbols removed | `typecheck`; the three `ManifestStore` members rode `smoke:t3` + `conformance:resume:capture` |
| 11 | `<EndSessionButton>` + the shared agent-option builder extracted from `TerminalRegion`/`SessionDock`/`SplitSurface` | component tests + `typecheck` |
| — | B1 `stripAnsi` divergence fixed (`main/ansi.ts` + test); the §6 Monaco defect fixed (`GMUX_MONACO_THEME` was exported *and* hardcoded — now `editor/monaco-theme-name.ts`) | new unit tests |

**Three standing guardrails became executable**, which is the part that stops this rotting:
`shared/__tests__/ipc-single-bridge.test.ts` (6 tests: nothing registers an invoke handler outside
`typed-ipc.ts`, nothing sends a static event outside `typed-events.ts`, no `ipcRenderer` outside the
preload, every `EVT_*` has a payload type, every channel in `AllEventPayloadMap` is subscribed,
allow-list honesty) and `shared/__tests__/canvas-color-single-source.test.ts` (binds `--bg-canvas`
across `tokens.css`, `WINDOW_BACKGROUND` and both `index.html` pre-paint grounds). Both are
**negative-controlled** — a planted violation fails them. Their shared scanner is
`shared/__tests__/source-scan.ts`, extracted by the integrator when the post-parallel clone scan
found the walker duplicated verbatim between the two.

### Deliberately NOT landed in Phase 16

Named here so the next agent inherits the decision rather than re-deriving it:

- **§7 step 3** (segregate the ~6,100 harness lines out of production bundles) — a mistake here
  silently disarms the T3 gate; wants its own phase with the smoke scripts as the acceptance test.
- **§7 step 5** (the command layer) and **step 7** (`renderer/state/store.ts` into slices) — the spec
  itself calls step 7 "the weakest-covered step in the plan" (61 importers, no store test). Both need
  a test that does not exist yet, and this phase's rule was *write the test first or skip the step*.
- **§7 step 8** (`app.css` colocation) — there is still no CSS regression harness, and cascade order
  changes when files move. Screenshots are a weak instrument for a 2,174-line move.
- **§6.1's ~45 MB of packaging wins** (the second `@vscode/tree-sitter-wasm` copy, `better-sqlite3`'s
  seven unusable prebuilds, `web-tree-sitter`'s `debug/`) and renderer `build.minify`. These are real
  and still on the table, but each one gates on the **packaged-app smoke**, not `out/` — that is a
  measurement round, not a refactor, and mixing it into a behaviour-preserving phase would have made
  the "zero behaviour change" claim unfalsifiable.

### Monaco stays — decided on today's evidence, not inherited

The BACKLOG carried "swap Monaco for Pierre `/edit`" as blocked on Pierre `/edit` reaching GA. The
re-baseline re-checked it and the blocker **has not cleared**: `@pierre/diffs` `latest` is 1.3.5 and
`/edit` is physically shipped and functional, but the v1.3.0 release notes say verbatim *"Edit mode is
experimental in 1.3 — the API may still shift"*, diffs.com/edit still labels it experimental, and five
patches landed in six days. gmux's editing surface is **the user's unsaved buffer** — precisely the
class CLAUDE.md reserves Tier 3 for, and precisely the class not to build on a moving API.

The size case is also weaker than the BACKLOG implied. Monaco is 42.2 MB raw / 7.1 MB gzip of
renderer JS — but that is ~9% of a 451 MB `.app`, and §6.1 found ~45 MB of shipped bytes no code
reads, reclaimable by config changes alone. Spending a library swap to win less than the config
changes win is the wrong order.

**Trigger condition for reopening** (mechanical, so the re-check costs nothing):

1. Pierre `/edit` drops the "experimental" label, **or** two consecutive `@pierre/diffs` minors ship
   with no breaking change to the `Editor` API; **and**
2. the phase that does the swap delivers a **minimap** and a **diagnostics/marker source** for
   ts/js/json/css/html (the four language workers are 18.7 MB of the 42.2 — the half whose
   replacement costs the most), **or** explicitly retires them with the user's agreement.

Re-check on the next `@pierre/diffs` minor. The seam is good and not degrading — 722 deletable lines
across three modules, six consumers, no CSS anywhere names a Monaco class — so nothing is lost by
waiting except disk.

## What's deferred (not built today, on purpose)

- **Code signing & notarization** — only an Apple Development cert exists on this machine; it cannot produce a distributable signature, so `identity: null` in `electron-builder.yml` (arm64 gets an ad-hoc signature so it runs locally). A real release needs: Developer ID Application cert → `hardenedRuntime: true` + entitlements (`com.apple.security.cs.allow-jit` etc. for Electron) → notarytool + stapling.
- **Bundled pinned tmux** — the app uses system tmux 3.6a today (homebrew → `/usr/bin` → PATH lookup in `src/main/tmux/`). Bundling a pinned, ad-hoc/Developer-ID-signed tmux binary under `Contents/Resources` is out of scope today; noted in code comments and `electron-builder.yml`. When it lands, the machinery is already here: add it to `NESTED_BINARIES` in `build/sign-nested-binaries.cjs` and to `mac.binaries`, the same two lines Phase 15's specstory took (tmux additionally needs Appendix F.1/F.2 — static libevent/ncurses and terminfo — which specstory did not).
- **OSC-133 prompt-marking status upgrade** — status detection is heuristic (output-flow + prompt regex, `src/renderer/state/status-detector.ts`); the upgrade path to OSC 133 / agent hooks is documented at the top of that file.
- **Auto-update feed** (`publish: null` today), SMAppService login item, x64/universal builds (arm64 only — the dev target).

## Known issues

1. **First-launch teardown flake (packaged smoke only)**: on the very first launch of a freshly built gmux.app, one run crashed AFTER printing `6/6 cleanup done — PASS` — `FATAL ERROR: Error::ThrowAsJavaScriptException napi_throw` inside `@parcel/watcher-darwin-arm64/watcher.node` during `node::Environment::RunCleanup()` (i.e., during `app.exit(0)`). 3/3 subsequent runs exit 0 cleanly; dev smoke always exits 0. Root cause: a `@parcel/watcher` FSEvents subscription (agent-session discovery watches `~/.codex/sessions` — `src/main/manifest/agents.ts`) is still initializing/active when `app.exit()` tears the env down. **Fix for the integrator (owner: main/)**: await `unsubscribe()` on all parcel watcher subscriptions (repo-watcher + agents) in a `before-quit`/smoke-exit path before calling `app.exit()`. Cosmetic for users (app already exited), but it can turn a green smoke exit code red in CI.
2. **Unsigned build**: Gatekeeper warning on other machines (see How to run). Not fixable without a Developer ID cert.
3. **DMG is 160.6 MB** (`.app` 451 MB) — measured by the Phase 16 integrator; the older 134 MB figure predates Phase 15's 41 MiB bundled specstory-cli. Electron 43's framework + the Monaco renderer chunk dominate; renderer-dep exclusion is already applied. The next wins are **not** a Monaco swap: research 25 §6.1 measured ~45 MB of shipped bytes no code reads (a second `@vscode/tree-sitter-wasm` copy at 21 MB, `better-sqlite3`'s seven unusable prebuilds + `deps/` at ~24 MB, `web-tree-sitter`'s sourcemaps and `debug/`), reclaimable by turning `electron-builder.yml`'s `files` into an allowlist, plus renderer `build.minify`. All of it gates on the packaged-app smoke, never on `out/` — which is exactly why it survived fifteen phases.
4. electron-builder warns `@electron/rebuild already used by electron-builder, consider removing from devDependencies` — harmless double-rebuild (postinstall + packaging). Leave as-is: the postinstall rebuild is what makes `npm run dev`/`smoke` work.
5. `npm run icon` requires `rsvg-convert` (homebrew librsvg) — present on this machine, not vendored.
6. **FIXED in Phase 13.5.1 — deepseek restore was a DEAD PANE whenever the user picked any launch
   flag.** Found by `npm run conformance:resume`, 2026-08-11, on every run. Research 22 §3.4 rule 3
   says re-append the original extras to every resume argv (MEASURED: claude, codex, muse and qwen
   all lose their permission flags across resume), and `registryResumeArgv()` did that for everyone:

   ```
   $ deepseek resume 9f027ced-… --skip-onboarding
   error: unexpected argument '--skip-onboarding' found
   ```

   The first diagnosis — "deepseek's resume subcommand refuses extras, so drop them" — was half
   right and would have cost something real. deepseek's usage line is `deepseek [OPTIONS] <COMMAND>
   [ARGS]`: it is the POSITION that is wrong, not the flags. Verified hands-on in tmux 2026-08-11,
   `deepseek --skip-onboarding resume <id>` brings the conversation back, and keeping the flag is
   load-bearing — a bare `deepseek resume <id>` opens the first-run workspace-trust dialog in a
   directory deepseek has not seen, which is its own kind of stuck pane. So rule 3 holds for
   deepseek too, and the exception is carried as data: `AgentResumeInfo.resumeExtrasPosition:
   'leading'` on the deepseek entry, honoured in `registryResumeArgv()`, which both composition
   sites (`manifest/agents.ts`, `ipc.ts`) already go through. `conformance:resume` now reports
   deepseek PASS with `recall=<nonce><token>` — the conversation itself came back.
7. **@parcel/watcher SIGABRT at exit, amplified by the conformance harness.** Same root cause as #1:
   `GmuxCore.dispose()` cancels the harvest watches but `@parcel/watcher`'s `unsubscribe()` is
   fire-and-forget, so an FSEvents subscription can still be initialising when `app.exit()` tears the
   env down — `napi_throw` in `RunCleanup`, SIGABRT, and an exit code that no longer reports the run.
   The harness starts one watcher per harvest agent, so it hits the window far more often than the
   app does; it currently works around it with a 1.5 s settle before `app.exit()`
   (`src/main/conformance/resume.ts`). Real fix (owner: `src/main/manifest/harvest`): await
   `unsubscribe()` in the watch's cancel path, then drop the workaround.
8. **Agents flush their transcripts asynchronously — an agent killed a heartbeat after a turn can
   lose it.** MEASURED 2026-08-11 on pi 0.84.1: the user message reaches its JSONL about two seconds
   after the keystroke, and the reply can land on screen first. The conformance harness killed the
   pane the instant the answer appeared, which made the pi case a coin flip — PASS then FAIL on
   identical stage timings, with **no session file anywhere on disk** for the failing run, only the
   one the resumed process then created for itself. The harness now waits for pane quiet plus
   `PRE_KILL_FLUSH_MS` (2.5 s) before the kill (`src/main/conformance/resume.ts`), and pi went 3/3
   then 1/1 in the full matrix. Recorded here rather than only fixed, because the underlying fact is
   the user's too: a machine that loses power seconds after an agent replies can come back to a
   conversation missing its last turn, and that is the agent's durability, not gmux's.

## Files owned by this phase

- `electron-builder.yml` — real config (was a stub): appId `com.specstory.gmux`, productName `gmux`, dmg+zip arm64, `artifactName gmux-${version}-${arch}`, extraResources gmux-tmux.conf, asarUnpack `**/*.node`, `identity: null`, renderer-dep excludes, drag-to-Applications DMG layout.
- `build/icon.svg` (source), `build/icon.icns` (generated, all 10 iconset sizes).
- `package.json` scripts: `package`, `package:dir`, `icon` (existing scripts untouched).
- `BUILD-STATUS.md` (this file).
