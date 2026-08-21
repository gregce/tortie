# How we verify this

This document explains how a phase of Tortie is verified by agents, with no person watching. It covers 2 things:

- the fixed sequence of agent roles that every workflow run followed
- the entry points compiled into the app, and the scripts in `build/`, that let an agent launch the app, drive it, kill it and read the result

It is a companion to [how we built this](HOW-WE-BUILT-THIS.md), which covers the phase loop, and [how we drove this](HOW-WE-DROVE-THIS.md), which covers the early live probes.

Every rule in this document replaced a sentence in a prompt or a backlog entry after we found that sentence was wrong. Each section names the failure that caused the rule.

## 1. The workflow shape every phase followed

We ran 196 workflows between 9 and 21 August 2026. They spawned 1,303 agents, a median of 6 per run. Every run followed one of 2 sequences.

```
Build lane     Spec -> Build (n builders, disjoint files) -> [Integrate] -> Verify -> [Fix -> Reverify] -> Commit
Research lane  Investigate -> Attack (adversaries) -> Judge or Synthesize -> Write (one doc) -> Commit
```

The build lane ran 87 times in its plain form. Every other build sequence is that form with one step added. The phase titles that appear most often are Verify (126), Commit (121), Build (115), Spec (92), Fix (27), Investigate (20), Integrate (16) and Attack (15).

### The 7 agent roles and what each may not do

| Role | Does | Never does |
| --- | --- | --- |
| Spec | Reads the backlog entry and the research. Names every file each builder owns. | Writes code |
| Builder | Builds only its own files. Runs `npm run typecheck` and `npm test` before it returns. | Touches another builder's file. Commits |
| Integrator | Reconciles the seams the builders named. Runs the full gate battery. | Commits |
| Verifier | Runs the app. Produces evidence with numbers. Returns a typed verdict. | Reads code as its only method. Commits |
| Fix | Fixes forward from the problems the verifier named. | Commits |
| Reverifier | Re-runs only the failed items, live. | Accepts a fix report as proof |
| Committer | Makes one commit with a conventional subject and the phase label on the first body line. | Pushes. Adds trailers |

### The 5 rules written into the workflow scripts

1. The verifier returns a JSON object, not prose. 114 of the 123 distinct scripts pass a schema of the form `{verdict: 'pass' | 'needs_work', evidence: string, problems: string[]}` to the verifier agent. The schema has no field for "looks good", so the agent cannot return it.
2. A verifier that returns `null` counts as `needs_work`. An agent that crashes returns `null`. 22 scripts coerce that to `needs_work` before the fix step. Phase 48 was committed on a `null` verdict, and the re-verify in the next phase found 15 defects in it.
3. Only the committer role runs `git commit`. 27 scripts put the text `NEVER commit` in the prompt of every other role. Before this rule, a builder in one phase ran `git add -A` and staged half built files from a neighbour phase, and 2 backlog entries recorded a commit hash that held none of their code.
4. `phase-runner.js` throws before it spawns an agent if `args.phase` is undefined or `args.worktree` is missing. From 15 August this one parameterised script replaced a new script per phase. Before the guard, 3 phases spent agents building "Phase undefined", and a committer with no worktree argument committed into the operator's checkout at `/Users/gdc/gmux`.
5. The spec agent lists every file each builder owns, and no file appears in 2 lists. When 2 parallel phases edited the same file, the second to commit rebased over the first and lost its edits. Phases that share no files did not.

The fix step runs once, then a reverifier re-runs only the failed items. If the reverifier also returns `needs_work`, the workflow returns that verdict to the operator and stops. The 2 earliest scripts looped up to 3 times. We removed the loop because a second `needs_work` on the same problem meant the spec was wrong, and the operator needs to rewrite it.

## 2. The entry points and scripts that test the app

Tortie is an Electron app. Its sessions live in a tmux server on the socket `-L gmux`, and its manifest is a SQLite file. The harness has 2 parts:

- entry points compiled into the app under `src/main/harness/`, selected by the `GMUX_SMOKE` environment variable
- 92 scripts in `build/` that launch the app with an isolated profile, drive it, kill it and read tmux, SQLite, the process table and the screenshot from outside

Each one has an `npm run` name, and CI uses the same names.

```
                 npm run <gate>
                       |
            build/harness-socket.mjs          composes  gmux-<base>-<cwd slug>-<pid>
            refuses socket "gmux" and "default"  writes   <socket>.run marker
                       |                         reaps   servers that dead runs left behind
                       v
   electron . --user-data-dir=$GMUX_HARNESS_DIR  GMUX_SMOKE=<mode>
                       |
        src/main/harness/isolation.ts   exits 1 unless the profile is inside the scratch root
                                        exits 1 unless the tmux socket is not "gmux"
                       |
        src/main/harness/<mode>.ts      does one scripted job, exits 0 or 1
                       |
        read from outside the app       tmux capture-pane, sqlite opened read only, ps, git, the PNG
```

The counts on 21 August 2026: 92 scripts in `build/`, 25 `GMUX_SMOKE` modes, 47 CDP probes, 455 unit test files and 434 lines of contract baseline.

### 2.1 The gates, from a 1 second check to a 3 minute battery

| Gate | Cost | What it proves | Runs on |
| --- | --- | --- | --- |
| `typecheck`, `test`, `build` | 1 to 2 min | Types, 455 unit test files, import boundaries, bundle refusals, preview containment | every commit |
| `conformance:agents`, `:installs`, `:machines`, `:context` | about 1 s each, spawn nothing | The agent table, the install map, the machine table and the context matrix match what their source claims | any commit under the named paths |
| `contract-inventory --check` | seconds | 434 lines of IPC channels, SQLite schema, `gmux.*` keys, `GMUX_*` names and refusal counts are byte identical to `docs/audits/contract-baseline.txt` | refactors |
| `smoke:t1` | about 30 s | A session survives the app. `GMUX_SMOKE=create` and `GMUX_SMOKE=verify` are 2 separate processes | every commit |
| `smoke:t3` | about 1 min | A session goes from restorable to restored to armed across 2 launches | integrators, CI |
| `smoke:fault` | minutes | The app survives SIGKILL at 16 named points in create, snapshot, restore and backup, then relaunches | CI durability lane |
| `conformance:resume` | about 3 min, real turns | Every agent's resume claim, run as create, plant nonce, kill, restore, recall | once per phase and after an agent CLI upgrade |
| `update-rehearsal` | minutes, 2 signed builds | Version 0.18.1 updates to 0.18.2 from a loopback feed and keeps every tmux session | release phases |
| `build/probe-*.mjs` | minutes each | One phase's specific claim, run in the live window | the phase that owns it |

The backlog entry names a tier and the verifier runs the gates that tier lists. Tier 1 runs `typecheck`, `build`, `test` and `smoke:t1`. Tier 2 adds one probe and one screenshot the verifier opens and reads. Tier 3 runs the full battery plus a probe written for the claim.

### 2.2 How a probe drives the window without a mouse

No probe moves a pointer over a button. A probe calls the store action the button's handler calls, or dispatches a DOM event on the element, and then reads the window back. There are 4 mechanisms.

| Mechanism | How it works | Where it lives |
| --- | --- | --- |
| Drive hook | Main reads the `GMUX_SHOT_DRIVE` environment variable, which holds a JSON spec, and passes it to `window.__gmuxShotDrive` with `executeJavaScript`. The hook calls store actions such as `createSession`, `useLayout.splitWith` and `requestOpenFile`, then sets `__gmuxShotReady`. Main polls that flag, calls `capturePage`, writes the PNG and quits. | `src/main/harness/shot.ts`, `src/renderer/editor/shot-hook.ts`, about 40 spec fields |
| DOM events | Where the claim is about the widget itself, the per-feature probe dispatches `PointerEvent`, `KeyboardEvent` and `input` events on the real element. The rename field, the drag to move and the Enter key reach the same listeners a person's input would. | `src/renderer/tree/shot-probe.ts`, `src/renderer/app/split/shot-probe.ts` |
| CDP | A script launches the app with `--remote-debugging-port=0`, finds the page target, runs `Runtime.evaluate` in the window and reads back with `Page.captureScreenshot`. No code inside the app is needed. | 8 of the `build/probe-*.mjs` scripts |
| AppleScript | `osascript` and System Events open native menus and dialogs, which the renderer cannot reach. `window-shot.mjs` reads the front window's rectangle from System Events and passes it to `screencapture -R`. | 7 probes, `build/window-shot.mjs` |

`GMUX_SHOT_JS=<expression>` evaluates one expression in the window and prints the result as JSON. A verifier uses it to read a computed style, an element's bounding box or an SVG path, instead of reading them off a screenshot.

This design has 2 gaps. A button whose click handler is wired to the wrong action passes a drive hook probe, because the hook calls the action directly. The CDP `Input.dispatchKeyEvent` method described in [how we drove this](HOW-WE-DROVE-THIS.md) was used in early probes that were not kept in the repository, so no script in the tree today sends real key or mouse events.

### 2.3 The 4 design choices that let an agent run it unattended

The socket and profile names refuse the real ones before anything starts. `build/harness-socket.mjs` composes a socket name as `gmux-<base>-<directory slug>-<pid>`, so 2 git worktrees cannot share one tmux server. It rejects the base names `gmux` and `default` before it composes, because composing first would turn `gmux` into `gmux-wt-1234`, which passes every check. Inside the app, `src/main/harness/isolation.ts` resolves symlinks on both paths and exits 1 if the profile is outside the scratch root or the socket is `gmux`. `src/main/conformance/scratch.ts` throws on any kill of a session whose name does not start with `zz-conf-`. These checks are why the full battery ran on the operator's Mac while it held 45 live agent sessions, and why verifier reports could end with "45 sessions, byte identical before and after".

A survival test uses 2 processes. The product promises that a session outlives the app. `smoke:t1` runs `GMUX_SMOKE=create` to exit, then `GMUX_SMOKE=verify` as a new process that finds the session in `tmux ls` and in the manifest. `smoke:t3` runs `t3-prep` then `t3-verify` the same way. `conformance:resume` kills the agent process between the 2 launches. A test inside one process can pass because the session was still in memory. A second process cannot.

The bundle gates read `out/` and the packaged app, not the source. `build/assert-bundle-refusals.mjs` exists because a unit test pinned a refusal in `src/main/manifest/reconstruct.ts` and rollup deleted the `if` statement from `out/main/index.js`. The refusal's single caller always passed the constant, so the bundler proved the branch dead. Vitest imports the source and could not see the difference. The gate opens the shipped bundle and checks that each refusal's message text is in the source file and in the bundle. `build/contract-inventory.mjs` uses the same approach for the schema. It bundles the real migration runner, builds a manifest in a temporary directory and dumps `sqlite_master` from it. The CI packaged smoke launches `release/mac-arm64/Tortie.app/Contents/MacOS/Tortie`, not `electron .`.

Faults are injected at named points. `src/main/fault/inject.ts` exports `faultPoint(name)`, which is called at 16 places in the create, snapshot, restore and backup paths. `GMUX_FAULT=<point>[#<n>]` sends SIGKILL on the nth arrival at that point, and arming is refused unless `GMUX_SMOKE` is also set. `build/fault-harness.mjs` runs one case per point, relaunches the app and compares the manifest. A failure names the point, so it reproduces. The random cases draw a kill time from the intervals where a control run recorded fault points, because we measured the uniform draw and 84.7% of the run is the workload waiting for a marker on a pane.

### 2.4 The 4 CI lanes and the npm scripts they run

There are 4 lanes in `.github/workflows/`:

- `gates.yml` runs `typecheck`, `test` and `build`, packages an unsigned `.app` with `electron-builder --mac --dir`, and runs `GMUX_SMOKE=basic` from inside that `.app`
- `durability.yml` runs `smoke:t1`, `smoke:t3`, the 16 case fault battery, and the `migrate`, `identity` and `procid` modes, then packages a DMG and runs the basic smoke from it
- `compat.yml` runs the durability lane weekly on the `macos-26` runner image, so a macOS or Xcode image change shows up on a Monday and not on release day
- `release.yml` signs with a temporary keychain, notarizes and publishes

Every step is an `npm run` name or a `node build/` script, so an agent can run the same command locally.

## 3. The evidence a passing verdict must contain

The verifier's prompt in 23 scripts contains the sentences "verify by doing, never by reading alone", "produce evidence rather than assurance" and "do not be agreeable". A passing verdict carries:

- the gate names and their PASS lines, copied from the output and not inferred from the exit code, because 2 runs of the fault matrix returned exit 0 while dying halfway through
- a number before and after for any claim about speed, for example a diff open at 567 ms from 22,954 ms
- a value read from outside the app for any claim about state, for example `tmux capture-pane` for what a pane shows or a read only SQLite open for what the manifest holds
- a cropped PNG the verifier opened and read, for any claim about pixels
- a section headed "what is not true", naming what was not verified and what was assumed

## 4. What to add to another Electron app to get the same harness

Most of the harness is outside the app. The part inside is 5 hooks, and you only need 2 to start.

| Layer | Inside the app | What you add | Size in Tortie |
| --- | --- | --- | --- |
| Isolated profile | No | Pass `--user-data-dir` and one environment variable for each external resource, such as a socket or database path. Refuse to run destructive modes outside the scratch root. | `harness-socket.mjs`, `isolation.ts` about 40 lines |
| Smoke modes | Yes | One switch at startup, `if (process.env.X_SMOKE) return runMode(...)`. Each mode does one job and calls `app.exit(0 or 1)`. | `harness/index.ts` and one file per mode |
| Screenshot | Yes | Boot, wait, `capturePage`, write PNG, quit. | `shot.ts`, about 60 lines |
| Drive hook | Yes | One renderer global that takes JSON and calls your store actions, plus a ready flag. It grows with the app. | `shot-hook.ts`, 40 fields after 148 phases |
| Eval hook | Yes | `executeJavaScript` of one expression, print the result. | 10 lines |
| CDP probes | No | Launch with `--remote-debugging-port=0`. | 47 scripts, no app code |
| Fault injection | Yes | A `faultPoint(name)` call in each write path, and an environment variable such as `X_FAULT=<name>` that makes the call send SIGKILL. | one helper, 16 call sites |
| Bundle assertions | No | Scripts that read `out/` and the packaged app. | one per claim |
| Ground truth | No | Whatever the app's state lives in, opened read only. | none |

To start, add the isolated profile, one smoke switch and the screenshot mode. That is under 200 lines. It gives you gates, screenshots and CDP probes on the first day. Add the drive hook and the fault points next. Those 2 keep growing, because each entry is written for one feature.

Two things do not port:

- the app needs state the harness can read without the app, which here is tmux and SQLite, so an app whose only state is in memory has nothing to check from outside
- the 2 process survival tests only prove something if the product promises survival

## 5. Limits of the harness and of this document

- The harness runs on macOS only. Nothing here has run on Linux.
- `conformance:resume` spends real agent turns and needs each agent CLI installed and signed in. It skips what is absent and says so, but a SKIP row is not a PASS row.
- The update rehearsal proves one green roundtrip. The corruption and downgrade probes are a verifier's matrix on top of it, not part of the script.
- A probe in `build/probe-*.mjs` proves the claim of the phase that wrote it. Most are not wired as gates and will drift if nobody runs them.
- The workflow scripts are not in this repository. They live in the Claude Code session directory. The counts above come from reading 196 run records there on 21 August 2026.
