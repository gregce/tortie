# gmux — build & packaging status

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
- `npm run smoke:t3` — T3 reboot-restore acceptance test green (out-of-band kill → row 'restorable' → restored with replayed scrollback + armed resume line typed but NOT executed).
- `npm run package` — produces `release/gmux-0.0.1-arm64.dmg` (134 MB) + `release/gmux-0.0.1-arm64.zip`.
- **Packaged-app smoke**: `GMUX_SMOKE=basic release/mac-arm64/gmux.app/Contents/MacOS/gmux` — 6/6 PASS, exit 0 (window + renderer + preload load, better-sqlite3 + node-pty native modules work from `app.asar.unpacked`, private tmux socket reachable). See Known issues for a first-launch teardown flake.

### Packaged bundle verified

- `Contents/Resources/gmux-tmux.conf` present (main resolves it via `process.resourcesPath` when `app.isPackaged` — `src/main/tmux/supervisor.ts`, `src/main/attach/attach-host.ts`).
- Native addons (`*.node`) unpacked from asar (`asarUnpack`); electron-builder rebuilt node-pty / better-sqlite3 / @parcel/watcher against electron 43 headers during packaging.
- Renderer-only production deps (monaco-editor, react, react-dom, react-arborist, @xterm/*, zustand, uuid) are **excluded** from the asar — electron-vite bundles them into `out/renderer`; the main bundle only requires node-pty, better-sqlite3, @parcel/watcher at runtime. Keeps ~100 MB of dead weight out of the app.
- Signature: **ad-hoc** (`Signature=adhoc, linker-signed`), identifier `Electron`. Launches locally; see Deferred for real signing.

## How to run

### Dev

```sh
npm install         # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev         # electron-vite dev with HMR
```

Smokes: `npm run smoke` (basic) · `npm run smoke:t1` (restart durability) · `npm run smoke:t3` (out-of-band kill → restorable → armed resume).

### Package / DMG

```sh
npm run package     # electron-vite build + electron-builder --mac
                    # → release/gmux-0.0.1-arm64.dmg (+ .zip)
npm run package:dir # faster: unpacked app only → release/mac-arm64/gmux.app
npm run icon        # regenerate build/icon.icns from build/icon.svg
                    # (needs rsvg-convert: brew install librsvg)
```

Install: open the DMG, drag gmux to Applications. **The app is unsigned for distribution** — on any machine other than this one, Gatekeeper will block the first launch: right-click → Open → Open (or `xattr -dr com.apple.quarantine /Applications/gmux.app`).

Icon: `build/icon.svg` is the source of truth (graphite plate, accent-blue prompt chevron, attention-amber block cursor, muted session tallies — palette from DESIGN.md §1). `build/icon.icns` is generated from it. Both are tracked in git (verified: `.gitignore` has no icon rules — `git check-ignore` matches nothing under `build/`).

## What's deferred (not built today, on purpose)

- **Code signing & notarization** — only an Apple Development cert exists on this machine; it cannot produce a distributable signature, so `identity: null` in `electron-builder.yml` (arm64 gets an ad-hoc signature so it runs locally). A real release needs: Developer ID Application cert → `hardenedRuntime: true` + entitlements (`com.apple.security.cs.allow-jit` etc. for Electron) → notarytool + stapling.
- **Bundled pinned tmux** — the app uses system tmux 3.6a today (homebrew → `/usr/bin` → PATH lookup in `src/main/tmux/`). Bundling a pinned, ad-hoc/Developer-ID-signed tmux binary under `Contents/Resources` is out of scope today; noted in code comments and `electron-builder.yml`. When it lands, it needs nested Mach-O signing.
- **OSC-133 prompt-marking status upgrade** — status detection is heuristic (output-flow + prompt regex, `src/renderer/state/status-detector.ts`); the upgrade path to OSC 133 / agent hooks is documented at the top of that file.
- **Auto-update feed** (`publish: null` today), SMAppService login item, x64/universal builds (arm64 only — the dev target).

## Known issues

1. **First-launch teardown flake (packaged smoke only)**: on the very first launch of a freshly built gmux.app, one run crashed AFTER printing `6/6 cleanup done — PASS` — `FATAL ERROR: Error::ThrowAsJavaScriptException napi_throw` inside `@parcel/watcher-darwin-arm64/watcher.node` during `node::Environment::RunCleanup()` (i.e., during `app.exit(0)`). 3/3 subsequent runs exit 0 cleanly; dev smoke always exits 0. Root cause: a `@parcel/watcher` FSEvents subscription (agent-session discovery watches `~/.codex/sessions` — `src/main/manifest/agents.ts`) is still initializing/active when `app.exit()` tears the env down. **Fix for the integrator (owner: main/)**: await `unsubscribe()` on all parcel watcher subscriptions (repo-watcher + agents) in a `before-quit`/smoke-exit path before calling `app.exit()`. Cosmetic for users (app already exited), but it can turn a green smoke exit code red in CI.
2. **Unsigned build**: Gatekeeper warning on other machines (see How to run). Not fixable without a Developer ID cert.
3. **DMG is 134 MB** — Electron 43 framework + Monaco renderer chunk dominate; renderer-dep exclusion already applied. Further wins (Monaco language-worker pruning) belong to the editor stream.
4. electron-builder warns `@electron/rebuild already used by electron-builder, consider removing from devDependencies` — harmless double-rebuild (postinstall + packaging). Leave as-is: the postinstall rebuild is what makes `npm run dev`/`smoke` work.
5. `npm run icon` requires `rsvg-convert` (homebrew librsvg) — present on this machine, not vendored.

## Files owned by this phase

- `electron-builder.yml` — real config (was a stub): appId `com.specstory.gmux`, productName `gmux`, dmg+zip arm64, `artifactName gmux-${version}-${arch}`, extraResources gmux-tmux.conf, asarUnpack `**/*.node`, `identity: null`, renderer-dep excludes, drag-to-Applications DMG layout.
- `build/icon.svg` (source), `build/icon.icns` (generated, all 10 iconset sizes).
- `package.json` scripts: `package`, `package:dir`, `icon` (existing scripts untouched).
- `BUILD-STATUS.md` (this file).
