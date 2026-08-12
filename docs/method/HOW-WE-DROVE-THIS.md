# How we drove this

Session: `https://claude.ai/code/session_012PYAqFDkfSKXpwqMpYhySa`. Companion to [HOW-WE-BUILT-THIS.md](HOW-WE-BUILT-THIS.md), which covers the phase loop. This one covers only how agents opened, drove and verified the real application.

Everything below spawns a **real Electron app** against the **real private tmux server**. No mocks, no headless stubs. The whole approach rests on one safety property: every launch gets its own `--user-data-dir`, so a test instance cannot see, adopt or corrupt the operator's real manifest — which is what made it safe to run all of this on a machine holding 45 live sessions of real work.

## 1. Self-driving harness modes

The app ships entry points that do a scripted job and exit, selected by `GMUX_SMOKE` and wired as npm scripts. They are the backbone: cheap, deterministic, and re-runnable as gates on every commit.

| Script | What it proves |
| --- | --- |
| `smoke` | boots, private tmux server reachable, quits 0 |
| `smoke:t1` | **restart survival** — `create` leaves a session running, `verify` is a *separate process* that finds it alive and re-attaches |
| `smoke:t3` | **reboot restore** — `t3-prep` then `t3-verify`, two launches, restorable → restored with an armed-but-unexecuted resume |
| `smoke:capture` | SpecStory wrap: launch and resume argv both wrapped, transcript written, pkill-safety holds |
| `smoke:migrate` | userData migration against a populated fixture |
| `smoke:identity` | `@gmux-id` binding, env markers, a name squatter is not adopted, external SIGTERM recorded |
| `smoke:procid` | process naming and owned-pid rollup, dev and packaged |
| `conformance:resume` | **every agent's resume claim, executed** — create → plant nonce → kill → restore → recall, as a PASS/FAIL/SKIP matrix |

The `create`/`verify` split is the important pattern: two *separate* app processes, where the point is that the session outlives the first one. That is the product's central promise expressed as a test that cannot pass by accident.

`conformance:resume` exists because agent CLIs drift underneath you. It has knobs for the awkward cases — `GMUX_CONF_AGENTS=pi` to target one, `GMUX_CONF_MODE=capture`, `GMUX_SPECSTORY_NO_CLOUD=1` so a test never touches real cloud state.

## 2. Screenshot mode, and actually looking

`npm run shot` → `GMUX_SHOT=<path> electron .`: boot, wait (`GMUX_SHOT_DELAY_MS`), `capturePage`, write PNG, quit. Around it:

- `GMUX_SHOT_DRIVE=<json>` — a spec the renderer executes before the capture: open a diff, build a 2×2 split, arm a drop overlay, scroll a pane, run tree operations. This is how a screenshot shows a *state* rather than a cold boot.
- `GMUX_SHOT_JS=<expr>` — evaluate one expression in the renderer and return it. Used to read computed styles, DOM geometry and SVG path data straight out of the running window.
- `GMUX_SHOT_CAPTURE_OUT`, `GMUX_SHOT_VERBOSE=1` — write what a driven capture produced; tee the renderer console, because otherwise a stalled drive is a black box from main's side.

Then the step that matters: **crop with `sips` and read the PNG.** Several defects existed only as pixels — a magnifier glyph sitting on a placeholder's first letter, a scrollbar measured at 1.96:1 contrast and genuinely unfindable at 1×, an xterm viewport black band. No assertion would have caught them.

## 3. Live CDP driving

For anything needing real interaction, launch Electron with `--remote-debugging-port=<port>` plus an isolated user-data-dir, then attach over the Chrome DevTools Protocol and dispatch **genuine input**:

- `Input.dispatchKeyEvent` at the focused element — real key events, including the `text:` field so Chromium emits the follow-on char event (this is what exposed a double-submit hazard on Shift+Enter).
- Real `PointerEvent` sequences for drags — tab reorder, drag-to-split, scrollbar scrub, tree drag-to-move.
- `Input.dispatchMouseEvent` `mouseWheel` for scrollback.
- Native menus, which `capturePage` cannot photograph, verified two ways: by code, and by behaviour (a popup's nested run loop blocking `app.exit` is itself proof the menu opened).

**Gotcha worth inheriting:** Chromium clamps timers to ~1 Hz in a non-frontmost window. One probe reported 996 ms for something that actually takes 47 ms. Always pass `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`.

## 4. Ground truth from outside the app

The renderer can lie; the system cannot. Every important claim was checked against something the app does not control:

- **tmux** — `capture-pane` for what a pane really shows, `display -p '#{pane_width}x#{pane_height}'` for geometry the app claims to have set, `#{scroll_position}`, `#{history_size}`, `#{pane_dead_status}`, `#{alternate_on}`.
- **git** — rendered lanes diffed against `git log --graph`, historical diffs against `git show <sha>^:path`, ahead/behind against `git rev-list --left-right --count`.
- **the OS** — `ps`/`pgrep` for process trees, group ids and leaks (read-only; **never `pkill`**), `codesign --verify --strict` on nested binaries, and reading `~/.Trash/.DS_Store` for Finder's Put-Back records to prove "delete" really meant trash.
- **the filesystem** — SQLite opened read-only to compare manifests row by row, transcript files opened to confirm a nonce survived a restore.

## 5. Measure, don't impress

Numbers, before and after, on the real machine: diff open 22,954 ms → 567 ms; a full-height scrollbar drag stalling a concurrent tmux client 6,259 ms → 37 ms; search time-to-first-result 3 ms on an 83,000-file tree; the activity poll at 2.75 ms for 16 panes. A claim with a number attached can be re-checked later; "feels fast" cannot.

## Safety rules (non-negotiable, and why)

1. **Private socket only** — `tmux -L gmux`. The operator's default tmux server is never touched.
2. **`zz-` prefixed scratch sessions**, killed by exact name when done. Never kill a session the agent did not create.
3. **Never `pkill`.** Read-only `pgrep` is fine and was used to *prove* durable agents are no longer uniquely pattern-killable.
4. **Isolated `--user-data-dir` on every launch**, so a probe cannot adopt or corrupt real sessions.
5. **List the operator's sessions before and after** and diff them. Several reports end with "45 sessions, byte-identical before and after" — that is the evidence that verification cost them nothing.
6. **Scratch repos for anything mutating**; the operator's repos are read-only.
