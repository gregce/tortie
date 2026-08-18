# Tortie

A calm, durable place for agentic work: **durable named terminal sessions**
(backed by a private tmux server that survives app quit/crash/update), project
tabs, a VS Code-grade git sidebar, a git-decorated file tree, and a Monaco
editor with diff-vs-HEAD — in one window. tmux is invisible: the GUI is the
whole interface.

Philosophy and naming: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md).
Architecture authority: [`docs/audits/2026-08-16-electron-typescript-architecture.md`](docs/audits/2026-08-16-electron-typescript-architecture.md).

> **The app was called `gmux` until Phase 16.5.** The product name, bundle id
> and data directory (`~/Library/Application Support/Tortie`) all changed; the
> first launch under the new name copies the old
> `~/Library/Application Support/gmux` across and leaves the original in
> place as a backup (`src/main/migrate/`). Several INTERNAL identifiers keep
> the old spelling ON PURPOSE — most importantly the private tmux socket
> `-L gmux`, which live sessions are bound to and which must never be renamed.
> See "What is still called gmux, and why" below.
>
> **The bundle id changed again in Phase 27**: `com.itavero.tortie`, because
> Tortie ships under Itavero, the operator's LLC, not SpecStory. The data
> directory follows `app.setName` ("Tortie"), not the bundle id, so nothing
> moved. macOS keys privacy grants and the login item on the bundle id, so
> permissions are asked again once and `reconcileLoginItem()` re-registers the
> login item from the recorded preference. The SpecStory integration keeps its
> name everywhere; it is a separate product Tortie talks to.

## Dev quickstart

Requirements: macOS (arm64), Node 22+, Xcode Command Line Tools (for native
module builds and for compiling the bundled tmux), `pkg-config`, and `git` on
PATH.

A system `tmux` (3.6 or newer, `brew install tmux`) is needed to run
`npm run dev` and the harnesses, because a development build resolves tmux from
PATH. It is NOT needed to run a packaged Tortie. Since Phase 41 the app carries
its own tmux 3.7b at `Contents/Resources/bin/tmux` and a packaged build resolves
only that path.

```sh
npm install        # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev        # electron-vite dev server + Electron with HMR
```

### Scripts

| Script              | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Dev mode with HMR (renderer) and hot restart (main/preload)          |
| `npm run build`     | Production bundles into `out/`                                       |
| `npm run typecheck` | Strict `tsc --noEmit` over node (main/preload/shared) + web configs  |
| `npm run smoke`     | Build, then headless boot check: window + native modules + private tmux server reachable, exits 0 in <15 s |
| `npm run shot`      | Build, then screenshot the window after 3 s (`GMUX_SHOT=/path.png npm run shot`) |
| `npm run package`   | electron-builder `--dir` build (unsigned dev packaging stub)         |
| `npm run vendor:tmux` | Build the pinned tmux into `build/vendor/tmux/bin/tmux`. Measured between 31 s and 55 s the first time, depending on what else the machine is compiling, and 0.1 s afterwards, because a binary that already reports the pinned version is left alone. `npm run package` runs it for you. |
| `npm run pin:tmux:check` | Prove `build/tmux-release.json` and `src/main/tmux/version.ts` say the same thing. Spawns nothing, makes no request, measured at 0.1 s. `npm run package` runs it too, so a drifted pin cannot reach a build. |
| `npm run conformance:tmux-pair` | Drive the release's one tested tmux version pair with a real attach: a warm server on the older tmux, the app's create and verify smoke halves as the newer client, and proof the old server never moved. |

### Where each remote gate keeps its isolated config root

Each of these gates runs the app under its own config root and its own tmux
socket, so two of them can run at once and neither can reach the operator's
data. Pointing a probe at the wrong root produces a refused connection to a port
nothing is listening on, which reads like a broken machine and is not one. Every
value below is read from the script in `package.json`, and `${TMPDIR}` is
`${TMPDIR:-/tmp/}` as the scripts write it.

| Gate | Config root | tmux socket |
| --- | --- | --- |
| `npm run smoke:config` | `${TMPDIR}gmux-smoke-config` | `gmux-smoke-config` |
| `npm run smoke:machines` | `${TMPDIR}gmux-smoke-machines` | `gmux-smoke-machines` |
| `npm run smoke:execplane` | `${TMPDIR}gmux-p69-exec` | `gmux-p69-exec` |
| `npm run smoke:remote` | `${TMPDIR}gmux-p70-remote` | `gmux-p70-remote` |

`smoke:execplane` and `smoke:remote` both honour a `GMUX_CONFIG_ROOT` already in
the environment and fall back to the value above. The other two always use the
value above.

Two more gates set a config root without naming it in `package.json`, because
their harness makes a new one on every run. `npm run smoke:partition` uses
`<tmpdir>/p71-partition-<pid>` and `npm run smoke:matrix` uses
`<tmpdir>/p72-matrix-<pid>`. Both take their socket from
`build/harness-socket.mjs`, which is `gmux-p71-partition` and
`gmux-p72-matrix`. There is no fixed root to point at for those two, so there is
nothing to point at wrongly.

`node build/probe-execplane.mjs` reads `GMUX_CONFIG_ROOT` too, and it is the one
place the variable changes what the script does rather than only where it writes.
With the variable set the probe writes its carriage file into that root, leaves
its scratch sshd and key holder running for a harness, and prints the kill
command for both. With the variable empty it kills every pid it recorded, closes
the ssh control socket and removes its own run directory. Since Phase 71
`smoke:remote` provisions its own machine through
`build/with-scratch-machine.mjs`, so the handoff mode is a convenience a person
asks for and nothing depends on it.

### Environment variables for the tmux work

| Variable | What it does |
| --- | --- |
| `GMUX_TMUX_BIN` | Names the tmux binary a development build uses, in place of the PATH probe. A packaged Tortie ignores it and logs one warning, so it cannot redirect a user's copy. It is what lets the interop probes drive a real version pair instead of simulating one. |
| `GMUX_TMUX_TARBALL_DIR` | A directory holding the three source tarballs `build/build-tmux.mjs` needs, for an offline or air-gapped build. Files found there are used in place of a download and are checked against the same pinned hashes, so the escape hatch cannot smuggle different sources in. |

## tmux safety

Tortie only ever talks to its **private** tmux server:

```sh
tmux -L gmux -f resources/gmux-tmux.conf <command>
```

It never reads `~/.tmux.conf`, never touches the default `tmux` server, and
its config keeps the private server alive with zero sessions (`exit-empty off`).
That server, not the GUI, is the durability boundary.

Phase 41 closed the bundling question the [pre-build architecture assessment](docs/audits/2026-08-09-prebuild-architecture-assessment.md) (§5, Stream A1) left open.
A packaged Tortie runs the tmux inside its own bundle. A development build
still runs the system tmux, so the two can differ on the same machine, and
`GMUX_TMUX_BIN` is how you point a development run at the bundled copy.

Tortie adopts a new tmux only when it CREATES a server, which in practice means
after a reboot. It never restarts, signals, reconfigures or upgrades a server
that is already running. On a warm server it reads the server's version before
the first attach and stops the boot with a screen when the pair is one it has
not tested. The reasoning and the measurements are in
[docs/research/43-bundled-tmux.md](docs/research/43-bundled-tmux.md).

## Layout

```
src/main/       Electron main: window, (later) tmux/, manifest/, attach/, git/, watcher/, fs/, ipc.ts
src/preload/    The typed window.gmux bridge (contextBridge, isolation on)
src/shared/     FROZEN contracts: types.ts (domain), ipc.ts (channels + GmuxApi)
src/renderer/   React app: app/ (shell), terminal/, scm/, tree/, editor/, styles/
resources/      gmux-tmux.conf (private server config)
```

`src/shared/` is the contract every work stream codes against: append new
types/channels, never change existing declarations.

## What is still called gmux, and why

The Phase 16.5 rename changed what the USER sees. It deliberately changed none
of the identifiers that live data is already bound to, because renaming those
would strand it:

| Still `gmux` | Why it can never change |
| --- | --- |
| tmux socket `-L gmux` | Every live session is on that socket. Rename it and the app starts a second, empty server while the user's work sits unreachable on the first. |
| `resources/gmux-tmux.conf` | Passed as `-f` to the running server; paired with the socket above. |
| tmux session options `@gmux-id`, `@gmux-agent`, `@gmux-session-id` | Stamped into sessions that are running RIGHT NOW. They are how the app proves a live session is its own — and, by the same rule, how it knows not to touch anyone else's. |
| `GMUX_SESSION_ID`, `GMUX_MANAGED` pane env | Same argument, plus users' own tooling may read them. |
| `<userData>/gmux/` (manifest, snapshots, hooks, dropped images) | Copied wholesale by the migration; renaming it inside the copy would be a second migration for no gain. |
| `window.gmux` preload bridge, `gmux-asset:` scheme, `gmux.*` localStorage keys, `gmux-*` CSS classes | Private to the process. The localStorage keys in particular carry the user's tab order, layouts and one-time-tip flags. |
| `GMUX_*` env vars and `[gmux]` log prefixes | Developer surface: harness switches and greppable log lines, never shown in the UI. |

## The keychain and the harness (2026-08-16)

Harness launches run Chromium with `--use-mock-keychain`, appended in `src/main/index.ts`
whenever `GMUX_SMOKE` or `GMUX_SHOT` is set. Do not remove it, and do not launch Electron
with a redirected HOME outside those modes. The reason is an incident. Chromium stores its
safe-storage key in the default keychain, a probe with a redirected HOME has no keychain
there, and macOS answers with a modal alert reading "A keychain cannot be found to store".
Keychain prompts queue system-wide behind one modal. One unanswered dialog on an unattended
machine therefore blocks every later process that touches the keychain, including claude
reading its own credentials at boot, and the visible symptom is a harness that hangs with no
output and no error on every tree at once. If a harness ever hangs that way again, look at
the machine's screen first.

One more path belongs in the same list, and it is not a `gmux` spelling. It is
execution bearing all the same:

| Never move | Why |
| --- | --- |
| `Contents/Resources/bin/tmux` | The bundled tmux, added in Phase 41. Three separate things key off that exact path. `build/sign-nested-binaries.cjs` signs it with the identifier `com.itavero.tortie.tmux` and `mac.signIgnore` in `electron-builder.yml` names the same path, so the two lists must stay in step or notarization rejects the build. macOS attributes file access grants to the responsible process, so every grant an agent's pane has earned is tied to that path. And the server started from it outlives the app on purpose, which means the path has to still be there when the app comes back. |
