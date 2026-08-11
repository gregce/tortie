# 23 — Scrollback limits: the measured answer, Settings spec, and understated diagnostics

**Status:** synthesis of three hands-on probes (A = tmux cost curve, B = renderer,
C = Settings/diagnostics design) plus this synthesizer's own independent
re-verification and two new measurements the probes did not make.
**Date:** 2026-08-10. **Machine:** Apple M4 Pro, 48 GiB, darwin 24.6.0, tmux 3.6a
(`/opt/homebrew/bin/tmux`), Electron 43.3.0 / Chromium 150, xterm.js 6.0.0.
**Closes** the gap `docs/research/01-durability-layer.md` left open on day one:
*"scrollback memory footprint at scale (20 sessions × 50k lines in one tmux server)"*.
**Spec for** Phase 13.7 (`docs/BACKLOG.md`).

---

## 0. Verdict in six lines

1. **The cost of a scrollback line is not one number.** It ranges 40 B → 4,576 B
   across a 114× span, and an exact model predicts every measurement.
2. **20 sessions × 50k lines = 371 MB at the user's real content rate, 2.0 GB at a
   realistic agent rate, 4.7 GB worst case.** Linear in panes, no cliff.
3. **Memory is not the binding constraint. Scroll latency is.** A scrollbar drag to
   the top of a pane costs **21 µs per line and freezes the entire tmux server** —
   1.05 s at today's 50,000. This was never measured before and it is the reason to
   *lower* the default, not raise it.
4. **Recommended: `history-limit` 50,000 → 25,000** (default), min 1,000, max 100,000.
5. **The renderer cap cannot be shipped as a setting — it is not connected to
   anything.** Every gmux pane lives in xterm's alternate buffer, which has no
   scrollback by construction. The number that *does* govern what the user sees come
   back is `SNAPSHOT_LINES`, and that is the second control.
6. **Diagnostics: no gauge, ever — and not only for Zen reasons.** The most
   dashboard-shaped number available, tmux server RSS, currently reads **164.8 MB
   while the server actually holds 6.99 MB of scrollback**. An ambient readout would
   be wrong by 23×.

---

# PART 1 — THE MEASURED ANSWER

## 1.1 Bytes per line: the model

Both probes converged on the same figure independently, and the residuals are zero:

```
bytes_per_line = 40  +  5 × stored_cells  +  23 × extended_cells

stored_cells   = the smallest of { W/4, W/2, W } that fits (content_length + 1),
                 where W is the PANE WIDTH in columns
extended_cells = cells tmux cannot pack into a 5-byte grid_cell_entry
```

* **40 B** is `sizeof(struct grid_line)` — the floor. A blank line costs 40 bytes.
* **A cell costs 5 B** when packed, **28 B** when extended.
* **Extended** ⇢ truecolour fg or bg, non-ASCII glyph (box drawing), OSC 8 hyperlink,
  underline colour.
* **Not extended** ⇢ 256-palette colour, bold, dim, italic, reverse. These are free.

### Verification of the model against every measured case

20,000 lines per case, single detached pane, deltas from tmux's own `#{history_bytes}`:

| content | pane W | measured B/line | model | RSS B/line | × plain@162 |
|---|---|---|---|---|---|
| blank lines | 80 | **39.9** | 40 | 61 | 0.05 |
| plain ASCII, full width | 80 | **439.9** | 440 | 457 | 0.52 |
| plain ASCII, full width | 162 | **849.9** | 850 | 875 | 1.00 |
| plain ASCII, full width | 200 | **1,039.9** | 1,040 | 1,074 | 1.22 |
| 256-colour SGR, ~20 runs/line | 162 | **849.9** | 850 | 883 | 1.00 |
| truecolour, ~20 runs/line | 162 | **4,575.9** | 4,576 | 5,071 | **5.38** |
| truecolour, **one** run/line | 162 | **4,575.9** | 4,576 | 5,039 | **5.38** |
| synthetic agent mix | 162 | **1,940.0** | — (47 ext cells) | 2,141 | 2.28 |
| 35-col plain (probe C) | 160 | **240** | 240 | — | 0.28 |
| 62-col, bold + 16-colour | 160 | **463** | 463 (1 ext) | — | 0.54 |
| 160-col palette every 8 | 160 | **840** | 840 | — | 0.99 |
| 160-col truecolour fg+bg | 160 | **4,519** | 4,520 | — | 5.32 |

Two probes, two harnesses, twelve content shapes, model error ≤ 1 byte. Treat this
model as ground truth for any estimator in the product.

### The four consequences that matter for a UI

1. **Truecolour costs 5.4× plain at the same width.** Claude Code, Codex and most
   modern agents emit 24-bit colour by default. This is the common case, not a corner.
2. **One truecolour escape per line costs exactly as much as twenty.** The `rgbwhole`
   and `sgrrgb` rows are byte-identical. It is per-*cell* state, not per-escape. Any
   intuition of the form *"agents change attributes a lot, that's the expensive part"*
   is wrong. The expensive part is that agents use RGB at all.
3. **Pane width sets the quantum.** Stored cells snap to W/4, W/2 or W — confirmed
   identically at W = 40, 100 and 162. A 24-character line and a 25-character line
   differ in cost by 75%. The same 30-character log line costs 240 B in a 162-column
   pane and 140 B in an 80-column one.
4. **200 columns costs 2.4× 80 columns for identical text.** Worst realistic
   combination (truecolour at 200 cols) vs 80-col plain: **12.8×**.

### `#{history_bytes}` is trustworthy; `ps rss` is not

On a 4.58 GB server, `vmmap` reported ALLOCATED 4.6 G against `history_bytes` 4.576 G —
**2% fragmentation**. Across all cases RSS/`history_bytes` ran 1.03–1.11.

But at 20 truecolour panes macOS **compressed 1.7 GB** of cold grid: `ps` said 3.06 GB
while the physical footprint was 4.7 GB. **RSS under-reports by 35% exactly when memory
is getting tight.** Cold scrollback is highly compressible — good news for real pressure,
disqualifying for anyone measuring with `ps`.

## 1.2 Real-world calibration — the user's own live server

Read-only `list-panes` against `-L gmux`, this synthesizer, 2026-08-10:

| pane | W | history lines | history_bytes | B/line |
|---|---|---|---|---|
| `zen of tortie` (settled claude transcript) | 162 | **14,867** | 2,382,817 | **160** |
| `pi1` (node agent, active) | 117 | 1,649 | 2,454,222 | **1,451** |
| `test1` (codex, active) | 161 | 993 | 1,397,733 | **1,350** |
| `muse-1` | 162 | 128 | 299,916 | 1,764 |
| `shell-2-2` | 149 | 41 | 32,617 | 393 |
| `cursor-1` (screen only) | 146 | 0 | 15,504 | 361 |

```
ALL 15 panes:   18,829 lines,  6.99 MB history  ->  371 B/line
excluding zz-*: 18,305 lines,  6.82 MB          ->  372 B/line
```

**Three facts to carry into every design decision below:**

* **The user's whole fleet holds 6.99 MB of scrollback.** Nineteen days of real agentic
  work at `history-limit 50000`.
* **The deepest session ever observed is 14,867 lines — 29.7% of the limit.** Confirmed
  independently by all three probes at different moments. Nothing in the real fleet is
  within 3× of the ceiling.
* **`history-limit` is a ceiling, not an allocation.** Five empty panes at
  `history-limit 5000000` moved server RSS by 112 KB total (22 KB/pane — the pane struct
  and its 42-row screen). `linedata` grows on demand. *Raising the number costs nothing
  until it is filled.* This is the single most important fact for the Settings design.

**Note on `history_bytes` and the visible screen:** `history_bytes` includes the live
screen grid, so dividing it by `history_size` alone over-attributes cost on shallow
panes. `muse-1` reads 1,764 B/line over 170 total lines, but 42 of those are a
full-width truecolour TUI screen worth ~190 KB on its own. Any estimator must divide by
`history_size + pane_height`, and should weight toward panes with real depth.

## 1.3 The multi-pane curve — the gap 01-durability-layer.md left open

50,000 lines per pane, 162 columns, ramped 1 → 5 → 10 → 20, with a system-free-memory
floor of 25% (never approached; lowest reading 52%, so no ramp had to be stopped early).

**Realistic agent mix (1,940 B/line):**

| panes | history lines | `history_bytes` | RSS | physical | MB/pane |
|---|---|---|---|---|---|
| 1 | 49,961 | 96.5 MB | 104 MB | 103 MB | **101.4** |
| 5 | 249,805 | 483 MB | 510 MB | 509 MB | **101.3** |
| 10 | 499,610 | 965 MB | 1.01 GB | 1.0 GB | **101.1** |
| **20** | **999,220** | **1.93 GB** | **2.03 GB** | **2.0 GB** | **101.7** |

**Worst case, all-truecolour full width (4,576 B/line):**

| panes | `history_bytes` | RSS | physical | MB/pane |
|---|---|---|---|---|
| 1 | 229 MB | 242 MB | 242 MB | **239.2** |
| 5 | 1.14 GB | 1.20 GB | 1.2 GB | **240.1** |
| 10 | 2.29 GB | 2.41 GB | 2.3 GB | **240.1** |
| **20** | **4.58 GB** | 3.06 GB *(compressed)* | **4.7 GB** | **~235** |

**Perfectly linear to 1M lines and 4.7 GB.** No per-pane overhead beyond the grid, no
superlinearity, no allocator cliff. The curve is `panes × lines × bytes_per_line`, full
stop. So the answer to the day-one question, **20 sessions × 50k lines**, is:

| content rate | 20 × 50,000 |
|---|---|
| the user's actual measured fleet rate (371 B/line) | **371 MB** |
| a realistic busy-agent rate (1,940 B/line) | **2.03 GB** |
| worst case, dense truecolour at full width (4,576 B/line) | **4.7 GB** |

**Fill throughput:** a single `cat` fills 200,000 lines in **1.1 s**; ten panes filling
concurrently took 7 s for 50k each. **A runaway command reaches a 50k ceiling in about
0.3 seconds.** This kills any "you are approaching your limit" warning design — see §5.4.

### Honest ceilings by machine

Taking 5% of RAM as a defensible budget for background durability infrastructure:

| machine | 5% budget | panes @50k realistic (101 MB) | panes @50k worst (235 MB) | 20 panes @50k realistic | 20 panes @50k worst |
|---|---|---|---|---|---|
| **16 GB** | 819 MB | 8 | 3 | 2.03 GB = **12.7%** | 4.7 GB = **29%** |
| **32 GB** | 1.6 GB | 16 | 7 | 2.03 GB = 6.3% | 4.7 GB = 14% |
| **48 GB** (this machine) | 2.4 GB | 24 | 10 | 2.03 GB = 4.2% | 4.7 GB = 9.8% |
| **64 GB** | 3.3 GB | 32 | 14 | 2.03 GB = 3.2% | 4.7 GB = 7.2% |

At 200,000 lines, multiply by four: 20 worst-case panes = **18.3 GB**. Not survivable on
16 GB, uncomfortable on 32 GB. This sets the hard maximum.

## 1.4 The finding that changes the recommendation: scroll cost

**New measurement, made by this synthesizer** (probe A's report was truncated before its
numbers landed). Rig: own throwaway socket `-L zzsyn`, real `gmux-tmux.conf`, one
162×42 pane filled to 199,961 lines (170 MB of `history_bytes`).

`scrollPaneTo` — the scrollbar drag, `src/main/tmux/scroll.ts:157` — reduces to a
**single** `send-keys -X -N <delta> scroll-up`. Measured:

| `scroll-up -N` | wall time | notes |
|---|---|---|
| 1 | 19.6 ms | ~20 ms is the tmux client round-trip floor |
| 10 | 20.7 ms | |
| 100 | 20.3 ms | |
| 1,000 | 42.0 ms | |
| **10,000** | **237.8 ms** | |
| **50,000** | **1,053.1 ms** | ← today's `history-limit` |
| **200,000** | **3,155.1 ms** | |

Net of the 20 ms client floor this is **21 µs per line scrolled**, dead linear.

**And it blocks everything.** While a 200,000-line scroll ran, a concurrent
`tmux display-message` from a second client — the same class of call the 1 Hz activity
poll makes — **stalled for 1,170 ms**. The tmux server is single-threaded: a deep scroll
in one pane freezes output, input and polling for *every other session on the server*.

```
scroll-to-top freeze  ≈  21 µs × history depth,  fleet-wide
   10,000 lines -> 0.21 s      50,000 lines -> 1.05 s
   25,000 lines -> 0.52 s     100,000 lines -> 2.10 s
                              200,000 lines -> 4.20 s
```

This is the binding constraint on `history-limit`, and it binds a full 4× tighter than
memory does. It is also the constraint most likely to be *felt*: a user drags the
scrollbar and sixteen agents stop breathing for a second.

**Mitigation exists and is cheap, but is out of this phase's scope:** chunk the scroll.
`scrollPaneBy` could issue the delta in slices of ~2,000 lines with an await between,
turning one 1,050 ms freeze into 25 × 42 ms freezes with service windows in between.
Total work is unchanged; perceived freeze drops by 25×. **If that lands, the safe
maximum for `history-limit` rises accordingly.** Recorded in §7 as the unlock.

## 1.5 The recommended numbers, and why

### `history-limit` — recommend **25,000** (today: 50,000)

| candidate | 20-pane memory (real / realistic / worst) | scroll-to-top freeze | headroom over deepest real session (14,867) |
|---|---|---|---|
| 10,000 | 74 MB / 388 MB / 916 MB | 0.21 s | **−33% — would truncate today's deepest session** |
| **25,000** | **186 MB / 970 MB / 2.29 GB** | **0.52 s** | **+68%** |
| 50,000 *(today)* | 371 MB / 2.03 GB / 4.7 GB | **1.05 s** | +236% |
| 100,000 | 742 MB / 4.1 GB / 9.2 GB | 2.10 s | +573% |
| 200,000 | 1.48 GB / 8.1 GB / 18.3 GB | 4.20 s | +1,245% |

**Reasoning, in the order the constraints bind:**

1. **Scroll freeze.** 0.52 s for a full-height drag is at the edge of tolerable;
   1.05 s is not. This alone rules out 50,000 until the scroll is chunked.
2. **Worst-case memory on a 16 GB machine.** 25,000 caps the truecolour disaster at
   2.29 GB (14%); 50,000 puts it at 4.7 GB (29%), which is a machine the user notices.
3. **Observed need.** The deepest session in a day of real work reached 14,867 lines.
   25,000 clears it by 68% and is 1.7× the largest depth ever seen on this fleet.
4. **Cost at the real rate is trivial either way** — 186 MB vs 371 MB across 20
   sessions. Memory is *not* what is being bought back here; latency and the 16 GB tail
   risk are.
5. **Nothing downstream is hurt.** `SNAPSHOT_LINES` is independent (§3.3), capture is
   capped separately at 1,000 rows, and the 64 MB `maxBuffer` wall is nowhere near.

**Range for the control: min 1,000, max 100,000, default 25,000.** Above 50,000 the
caption should say what the user is buying. 200,000 is deliberately not offered: 4.2 s
of fleet-wide freeze on a scrollbar drag, and 18.3 GB in the worst case.

### Renderer scrollback cap — recommend **do not ship a control at all**

See §2. It is inert. Shipping it would be a placebo lever in a product whose philosophy
is *"hide the machinery"* — the worst possible thing to teach a user.

### Saved scrollback (`SNAPSHOT_LINES`) — recommend **10,000** (unchanged), max 25,000

This is the number the user *thinks* the renderer cap is. Default stays at today's
10,000; maximum clamped to `min(25,000, history-limit)`. Rationale in §3.3 and §4.3 —
the binding constraint is quit latency against a single-threaded tmux server.

---

# PART 2 — WHAT A SETTINGS CHANGE CAN AND CANNOT DO

## 2.1 The scope rules, measured on tmux 3.6a

The man page says *"applies only to new windows"*. That is imprecise in a way that
matters. Measured directly (own socket, real conf, existing pane at 50000, then
`set -g history-limit 200000`):

| operation | resulting `#{history_limit}` | |
|---|---|---|
| existing pane, after `set -g` | **50000** | unchanged |
| `new-window` in the OLD session | 200000 | ✅ new |
| `split-window` into the OLD window | 200000 | ✅ new |
| `new-session` | 200000 | ✅ new |
| **`respawn-pane -k` on the original pane** | **50000** | the grid *and* the limit survive respawn |

**The boundary is PANE CREATION** — not window, not session. `respawn-pane` keeping the
old limit is the same property that lets gmux's respawn keep the scrollback.

## 2.2 Two traps that will cost an implementer a day each

### Trap 1 — `set -p history-limit` succeeds, echoes back, and does nothing

```
$ tmux set -p -t %0 history-limit 7777        # exit 0, no error, no warning
$ tmux show-options -p -t %0 history-limit
history-limit 7777                             # echoed back — looks applied
$ tmux display -p -t %0 '#{history_limit}'
50000                                          # the truth
```

Proven inert end-to-end: a pane created at limit 500, given
`set -p history-limit 40000`, then fed 3,000 lines, settled at `history_size` **491**.
There is **no per-pane override on 3.6a**. The value is read once in
`window_pane_create` and handed to `grid_create(sx, sy, hlimit)`. An implementer will
try `set -p` first, get exit 0 *and* a confirming `show -p`, and ship a broken setting.

### Trap 2 — `set -w` is NOT inert, and this corrects probe A

Probe A reported that `set -w` "behaves the same way" as `set -p`. It does not.
Measured:

```
tmux set -w -t zz-scope:0 history-limit 41000
  ->  existing panes in that window:        unchanged
  ->  NEW split in that window:             41000     ✅ took effect
  ->  NEW window elsewhere in that SESSION: 41000     ✅ took effect
  ->  a DIFFERENT session:                  200000    (global, unaffected)
```

`history-limit` is a **session** option. `set -w` with a window target resolves to that
window's *session* and sets a per-session override — so it silently applies more
broadly than the flag suggests, and it *is* honoured by panes created afterwards. This
is a usable mechanism for per-session depth if that is ever wanted; it is not what the
flag name implies, and it must not be mistaken for a way to change a running pane.

## 2.3 The only live lever: `clear-history`, and it is all-or-nothing

There is no "trim history to N lines" in tmux. Remediation is total.

Measured by this synthesizer on the 199,961-line pane:

| | before | after |
|---|---|---|
| `history_size` | 199,961 | **0** |
| server RSS | 343,904 KB | **179,056 KB** |
| freed | — | **165 MB of the 170 MB held** |
| wall time | — | **60.8 ms** |

Probe A measured the same operation across 21 panes holding 4.58 GB:
**1,191 ms total (~57 ms/pane), physical footprint 4.7 GB → 141 MB — 97% returned.**

At *small* scale the return does not show: clearing a 1.3 MB pane moves RSS by nothing,
because libmalloc retains small-zone pages. The memory only comes back once the
allocations are large enough to unmap — which is exactly when you need it.
`#{history_limit}` is unchanged by `clear-history`.

**gmux already ships this lever** as **Clear ⌘K** (`clearPaneHistory`,
`src/main/tmux/sessions.ts:314`). No new machinery is needed for remediation; the UI
just has to say so.

## 2.4 Stated plainly enough to become UI copy

> **A change to scrollback depth CAN:**
> set the depth of every session started from now on — including every session brought
> back by Restore, because `restoreSession` runs `tmux new-session -d`, which creates a
> brand-new pane. After one quit-and-restore cycle the whole fleet is on the new number.
>
> **A change to scrollback depth CANNOT:**
> deepen or shrink a session that is already running. Not by any tmux option, and not by
> respawning the pane. The only way to give a running session a new depth is to end it
> and start it again — which throws away the scrollback you were trying to keep more of.
>
> **Lowering the number frees nothing.** Existing deep sessions keep their depth *and*
> their memory until they are cleared or ended. Clearing a session (⌘K) frees its
> scrollback immediately and completely — there is no partial trim.

**Final note copy for under the card:**

> Both depths apply to sessions you start from now on. A session already running keeps
> the depth it started with — ending it and starting it again is the only way to change
> that. Clearing a session frees its scrollback immediately.

## 2.5 Wiring — one trap, one existing hook

`start-server -f` applies `gmux-tmux.conf` **only when it creates the server**. A tmux
server left running from an older conf never re-reads the file — which is precisely why
`BOOT_SERVER_OPTIONS` at `src/main/ipc.ts:129` already re-asserts `remain-on-exit`,
`mouse`, `copy-mode-position-format` and `mode-style` at every boot.

**`history-limit` must join that list**, sourced from settings, *and* be applied
immediately in `onSettingsUpdated` via one `set-option -g history-limit N`. Without
both, the user changes the setting and observes nothing for days.
`resources/gmux-tmux.conf` keeps a literal value as the first-boot default; the two must
be kept in sync or the conf value will silently win on a fresh install until the first
settings write.

**Verified:** `set-option -g history-limit N` takes effect for new panes immediately, no
server restart, no reattach.

---

# PART 3 — DOWNSTREAM COSTS AT DEPTH

## 3.1 The renderer cap is inert — the brief's premise is false

**Probe B, in the real app** (`electron /Users/gdc/gmux` under CDP, live `Terminal`
instance reached by walking the React fiber on `.gmux-terminal-pane`):

```
at attach:                    { optionsScrollback: 10000, bufferType: "alternate",
                                activeLength: 42, normalLength: 42, cols: 144, rows: 42 }
after pushing 50,000 lines:   { optionsScrollback: 10000, bufferType: "alternate",
                                activeLength: 42, normalLength: 42 }
renderer RSS: 185.5 -> 191.1 MB   (+5.6 MB of transient parse churn, not +125 MB)
```

`tmux attach-session` opens with `ESC[?1049h`. **Every gmux pane's xterm lives in the
alternate buffer for its whole life, and xterm's alternate buffer has no scrollback by
construction.** `TERMINAL_SCROLLBACK = 10000` governs the *normal* buffer, which never
receives a line. xterm's `CircularList` grows lazily, so the cap also allocates nothing.

Three independent confirmations:
* Probe B measured it in the shipping component.
* `src/renderer/terminal/scroll/surface.ts` and `src/main/tmux/scroll.ts` already
  document it in their header comments.
* This synthesizer confirmed there is no counter-path: the only `capturePane` callers
  are `restore/snapshots.ts` (quit snapshots), `capture/service.ts` (the ⌘-capture UI,
  capped at `MAX_CAPTURE_ROWS = 1000`), and `main/index.ts` lines 646/818 (200- and
  20-line activity probes). `main/index.ts:530` is a **restore-verification poll** that
  waits for a marker string — it does not feed xterm.

**Independence from tmux history is verified both empirically and structurally.** Probe
B set `term.options.scrollback` at runtime on a session holding 49,962 lines and
re-measured reachable depth through the exact bridge the scrollbar and wheel use:

| renderer cap | max scroll position | tmux history | top row shown |
|---|---|---|---|
| 100 | 49,962 | 49,962 | first line of the transcript |
| 1,000 | 49,962 | 49,962 | same |
| 10,000 | 49,962 | 49,962 | same |
| 200,000 | 49,962 | 49,962 | same |

Structurally: `ScrollSurface`'s entire state is `#{scroll_position}` / `#{history_size}`
/ `#{pane_height}` from `display-message`. The only xterm read in the whole scroll path
is `this.term.rows` as a page-size fallback — geometry, not depth.

**Also true and relevant:** there is **no reattach backfill anywhere in the codebase**.
`AttachHost.attach()` spawns a bare `attach-session`; tmux redraws the visible screen and
stops. Probe B drove a full detach→attach cycle in the real app: still alternate, still
42 rows, nothing restored. And `TerminalHost` mounts panes only for *visible* sessions,
so a tab switch **disposes** the `Terminal` — even without the alt buffer, xterm-side
scrollback would be wiped on every switch.

**Three stale claims in the source should be corrected** (all read-only to this probe):

| file | claim | reality |
|---|---|---|
| `src/main/tmux/sessions.ts:281` | *"This backfills xterm.js after reattach (T1)"* | no caller does this |
| `src/renderer/terminal/theme.ts:58` | `TERMINAL_SCROLLBACK = 10000` | inert; normal buffer never used |
| `src/renderer/terminal/TerminalPane.tsx` header | *"Scrollback 10k (tmux holds 50k server-side)"* | the 10k buys nothing |

Keep the constant as insurance if a pane ever lands in the normal buffer; **mark it
inert**.

### What a retained line *would* cost, if a backfill were ever built

Probe B, standalone Electron harness, normal buffer, WebGL, same xterm/addon versions
out of the app's own `node_modules`:

| lines | Δ renderer RSS | write | write→paint |
|---|---|---|---|
| 1,000 | 9.9 MB | 14 ms | 22 ms |
| 10,000 | 44.8 MB | 35 ms | 41 ms |
| 25,000 | 98.1 MB | 83 ms | 89 ms |
| 50,000 | 142.5 MB | 139 ms | 145 ms |
| 100,000 | 262.9 MB | 252 ms | 258 ms |

**RSS ≈ 19.8 MB fixed + 2.53 KB per retained line at 120 cols**, i.e. `12 × cols` bytes
(xterm's three `uint32` per cell) plus ~1.1 KB of JS object and allocator overhead.
Width sweep at 25,000 lines confirms **11.6 B/cell/line** (80 cols 85.8 MB, 120 cols
97.5 MB, 200 cols 118.9 MB).

**This is the upside-down half of the whole question:** tmux's cost tracks *content* — a
blank line is 40 B. xterm's cost tracks *geometry* — a blank line is 162 × 12 = 1,944 B,
**48× tmux's**. The two numbers are not the same kind of number and must never be
presented in the UI as if they were.

## 3.2 `capture-pane` at depth

gmux's exact argv (`-p -e -J -t <pane> -S -<n>`), 162-col pane, p50 of 3:

| lines | realistic agent | | worst-case truecolour | |
|---|---|---|---|---|
| | ms | output | ms | output |
| 1,000 | 9.8 | 245 KB | 16.7 | 537 KB |
| **10,000** (today's `SNAPSHOT_LINES`) | **53.9** | **2.46 MB** | **116** | **5.08 MB** |
| **50,000** (today's `history-limit`) | **296** | **12.2 MB** | **563** | **25.3 MB** |
| 200,000 | 1,127 | 48.8 MB | 2,247 | 101 MB |

Linear: ~5.6 µs/line realistic, ~11 µs/line worst case. **Dropping `-e` halves both time
and bytes** (10k realistic: 10.9 ms / 1.29 MB) — relevant only if a future
non-colour-preserving consumer appears; snapshots need `-e`.

**Correction to the brief:** research 17's *"~183 ms for 300 lines"* is the SVG→canvas
rasteriser (168 of those ms), not capture. That research measured `capture-pane` itself
at 6 ms. Capture is cheap; rendering a *screenshot* is not.

### The 64 MB wall is real and does not bind where you would expect

`execTmux` sets `maxBuffer: 64 * 1024 * 1024`. Proven with a Node harness using gmux's
exact `execFile` options against a 200k-line worst-case pane:

```
-S -10000:   OK      5.1 MB in  117 ms
-S -50000:   OK     25.3 MB in  526 ms
-S -120000:  OK     60.7 MB in 1259 ms
-S -200000:  FAILED after 2034 ms -> ERR_CHILD_PROCESS_STDIO_MAXBUFFER
```

**Raising `history-limit` cannot reach this wall**, because nothing in production
captures the whole history: `SNAPSHOT_LINES` is 10,000, `MAX_CAPTURE_ROWS` is 1,000, the
activity probes use 200 and 20 lines, and scrolling uses copy-mode, not capture.
(`capture-pane -p -S -` appears only in a comment in `scroll.ts`.) **The wall binds
against the *saved scrollback* number** — which is exactly why that control needs a
maximum, and why 25,000 is a safe one (25.3 MB worst case, 39% of budget).

## 3.3 Reboot snapshots — the brief's assumption is wrong

**`SNAPSHOT_LINES = 10_000` (`src/main/restore/snapshots.ts:26`) is a constant,
independent of `history-limit`. Raising `history-limit` does not grow snapshot files at
all.** The brief's "deeper history means bigger files" is only true if the *saved*
number is raised too — which is precisely why it belongs in Settings as its own control.

Measured, and confirmed against reality:

| | 10,000 lines | 50,000 lines |
|---|---|---|
| realistic agent | 2.46 MB / session | 12.2 MB / session |
| worst-case truecolour | 5.08 MB / session | 25.3 MB / session |
| quiet shell (profile A) | 0.34 MB / 32 ms | 1.72 MB / 78 ms |

**The user's actual snapshots directory right now: 14 files, 908 KB total, largest
449 KB** (verified by this synthesizer at `~/Library/Application Support/gmux/gmux/
snapshots`). Pay-as-you-go again — most sessions have nowhere near 10,000 lines.

**The real cost of raising it is quit latency, not disk.** Snapshots run under
`Promise.allSettled` over all sessions (`ipc.ts:459`) — but they all queue against a
**single-threaded tmux server**, so the captures serialise inside tmux regardless of the
concurrency in Node:

| saved depth | 16 sessions, realistic | 16 sessions, worst case | transient main-process buffer |
|---|---|---|---|
| 10,000 *(today)* | **0.9 s** | 1.9 s | ~39–81 MB |
| 25,000 | 2.3 s | 4.5 s | ~98–203 MB |
| 50,000 | **4.7 s** | **9.0 s** | ~195–405 MB |

Quit is already deferred once (`src/main/index.ts:1199`). **4.7 s of capture on quit is
not acceptable**, and 9.0 s is a beachball. This is the reason the saved depth must stay
well below the live depth, and it belongs in the caption, not a footnote.

## 3.4 Summary of what each number actually buys

| number | today | governs | cost driver | recommend |
|---|---|---|---|---|
| tmux `history-limit` | 50,000 | how far scrolling and capture can **reach** | server RAM; **scroll freeze** | **25,000** |
| `TERMINAL_SCROLLBACK` | 10,000 | *nothing* (alternate buffer) | — | **do not expose; mark inert** |
| `SNAPSHOT_LINES` | 10,000 | what **comes back after a restart** | **quit latency**; disk | **10,000**, max 25,000 |
| `MAX_CAPTURE_ROWS` | 1,000 | the ⌘-capture UI | already bounded | leave alone |

---

# PART 4 — THE SETTINGS SPEC

## 4.1 Placement

**`Settings → General`, a third group card** after Startup and Sessions. Settings today
has four nav sections (`General / Agents / Hotkeys / Launch defaults`,
`SettingsApp.tsx:20`). **No new nav section, and specifically no section called
"Diagnostics"** — a nav item named Diagnostics is a dashboard by another name. The
global figure earns its place only as *evidence for the choice being made in this card*,
so it lives inside it.

```
SCROLLBACK
┌──────────────────────────────────────────────────────────────┐
│ Scrollback depth                            [ 25,000 ▾ ]     │ h:48
│ How much output each session keeps. About 9 MB per session   │
│ at this depth, based on what your sessions produce now.      │
├──────────────────────────────────────────────────────────────┤
│ Saved scrollback                            [ 10,000 ▾ ]     │ h:48
│ How much of a session comes back after a restart.            │
│ Your saved scrollback uses 0.9 MB.                           │
├──────────────────────────────────────────────────────────────┤
│ Your sessions are holding 7 MB of scrollback.  Copy details  │ h:36
└──────────────────────────────────────────────────────────────┘
Both depths apply to sessions you start from now on. A session
already running keeps the depth it started with.
```

Row anatomy, tokens, dropdown `[h:24]`, note 11 px `--text-muted` — all per S13
(`docs/DESIGN-SPEC.md:485`). Changes apply immediately; no Save button.

## 4.2 Control 1 — Scrollback depth (tmux `history-limit`)

```
  10,000 lines      ~4 MB per session
  25,000 lines      ~9 MB per session      ✓ default
  50,000 lines      ~19 MB per session
  Custom…           1,000 – 100,000
```

Estimates are **computed live from the user's own output**, never hardcoded. Custom
opens an `[h:24] w:72` mono stepper whose caption updates on every keystroke — so at
100,000 it reads "About 37 MB per session", and the estimate *is* the guard rail.

Above 50,000 the caption gains one clause, because the cost there is latency, not bytes:

> At this depth, dragging the scrollbar to the top of a long session can pause all
> sessions for about a second.

*(21 µs × depth; see §1.4. Show it from 50,000 up, where the freeze passes ~1 s.)*

### The estimator

```ts
/** Measured 2026-08-10, tmux 3.6a. Model: 40 + 5*cells + 23*extended_cells. */
const BYTES_PER_LINE_FALLBACK = 463;   // a typical agent at ~62 cols, 16-colour
const BYTES_PER_LINE_CEILING  = 4576;  // dense truecolour at 162 cols
const BYTES_PER_LINE_FLOOR    = 40;    // sizeof(struct grid_line) — a blank line

/**
 * Bytes per scrollback line, from the user's OWN sessions.
 *
 * Divide by (historySize + rows), NOT historySize: #{history_bytes} includes
 * the live screen grid, and on a shallow pane a full-width truecolour TUI
 * screen dominates the ratio by 10x. Require some real depth for the same
 * reason. Measured on the user's live fleet this returns ~371 B/line.
 */
function observedBytesPerLine(panes: PaneFacts[]): number {
  const deep = panes.filter((p) => p.historySize >= 200);
  if (deep.length < 2) return BYTES_PER_LINE_FALLBACK;
  const bytes = sum(deep, (p) => p.historyBytes);
  const lines = sum(deep, (p) => p.historySize + p.rows);
  return clamp(bytes / lines, BYTES_PER_LINE_FLOOR, BYTES_PER_LINE_CEILING);
}
```

**Honesty requirement:** this estimate carries roughly ±4× of real uncertainty
(160 B/line for a settled claude transcript vs 1,451 B/line for an active node agent, on
the same machine on the same day). The copy must therefore say **"About X MB"** and
**"based on what your sessions produce now"** — never a bare figure that reads as a
guarantee.

## 4.3 Control 2 — Saved scrollback (`SNAPSHOT_LINES`)

```
   2,000 lines      enough to see where you left off
  10,000 lines      ✓ default
  Match scrollback depth
  Custom…           500 – 25,000
```

**Clamped to `min(25,000, history-limit)`** — saving more than a session keeps is
meaningless, and 25,000 is the point at which quit latency (2.3–4.5 s for 16 sessions)
and the 64 MB `maxBuffer` (25.3 MB worst case) both start to matter.

Caption carries the two real costs, scaled from the user's *measured* snapshot directory
rather than a model:

> At 10,000 lines your saved scrollback uses 0.9 MB. At 25,000 it would use about 2 MB,
> and quitting would take a little longer while sessions are saved.

## 4.4 Persistence and wiring

Two new keys on `GmuxSettings` (`src/shared/settings.ts`), which is a flat interface with
a `defaultGmuxSettings()` factory — extend both, and the main-side sanitiser must clamp:

```ts
/** tmux history-limit for panes created from now on. 1,000–100,000. */
scrollbackLines: number;      // default 25_000
/** Lines captured into each session's reboot snapshot. 500–25,000, <= scrollbackLines. */
savedScrollbackLines: number; // default 10_000
```

* `scrollbackLines` → a settings-derived entry in `BOOT_SERVER_OPTIONS`
  (`src/main/ipc.ts:129`) **and** one `set-option -g history-limit N` in
  `onSettingsUpdated`.
* `savedScrollbackLines` → replaces the `SNAPSHOT_LINES` constant at its two read sites
  (`restore/snapshots.ts:63`, and the `lines = 10_000` default at
  `tmux/sessions.ts:294`). Keep the exported constant as the fallback default.
* Sanitise both main-side. A user-editable JSON file that can set `history-limit` to
  50,000,000 is a memory-exhaustion footgun; clamp before the tmux call, not after.

---

# PART 5 — THE DIAGNOSTICS SPEC

## 5.1 The ZEN-OF-TORTIE argument, made explicitly

`docs/ZEN-OF-TORTIE.md` refuses this feature in one line:

> **Not a dashboard.** No counters, no activity feeds, no progress theatre. A number
> that rises on its own is not a signal, it is noise in a nicer font.

**Read the refusal precisely.** It forbids counters, feeds and theatre, and it states its
*reason*: such a number **is not a signal**. The document defines a signal two sections
earlier — *"Only a question, decision or failure should rise above the surface"* — and
names the one question the interface must answer: **"What needs me now?"**

So the test is not *"is it a number?"* It is **"does it change what the human should
do?"**

A memory figure climbing 40 → 60 MB changes nothing. The same mechanism, at the moment a
session begins *discarding output*, changes exactly one thing: it tells the user the
product just stopped keeping something. Losing scrollback is a durability event, and
durability is the promise the document closes on — **"Nothing important gets lost."**

> **The Zen forbids reporting state. It requires reporting loss.**
> A gauge is forbidden. A loss is mandatory.

Three rules follow, and every surface below sits on one side of them:

1. **No number is ambient.** Not in the identity strip, not in a session row, not in a
   tab badge, not in a tooltip that appears unasked. Zero counters on the main window's
   chrome.
2. **Every number is available on demand**, at the place where the user already has the
   question. A pull surface cannot be noise in a nicer font, because it costs no
   attention until attention is spent deliberately.
3. **Only a crossed threshold with a real, irreversible consequence may become
   proactive** — and then it speaks **once**, names the session, and offers the action.
   That is the same category as *"Sessions were interrupted"*, not the same category as
   a gauge.

Two further refusals bind the design:

* *"Not a supervisor's console. Tortie never asks the human to watch an agent work."* —
  **A table listing every session ranked by memory is a supervisor's console** and is out
  even on demand. The global view is an aggregate; the per-session number is available
  only for the session the user is already looking at; enumeration happens only in
  response to an actual problem, one named session at a time.
* *"Hide the machinery"* binds the vocabulary. These surfaces say **scrollback, memory,
  disk, session**. They never say `history-limit`, `capture-pane`, RSS, tmux, or server.

## 5.2 The empirical argument — the dashboard numbers are not even true

This is the synthesizer's addition, and it is decisive independently of philosophy.

The brief proposed surfacing *"tmux server RSS, app RSS, snapshot disk usage, free
disk"*. Measured on the user's live server this moment:

| | value |
|---|---|
| scrollback the server actually holds (`Σ history_bytes`) | **6.99 MB** |
| tmux server RSS (`ps`, after 1 d 3 h uptime) | **164.8 MB** |
| **overstatement** | **23.6×** |

The three probes measured that same RSS at 26.2 MB, 71 MB, 94 MB and 164.8 MB within a
few hours of each other, on a fleet whose actual scrollback never left single-digit
megabytes. RSS is a **high-water mark**: probe A watched 4.58 GB of history clear down to
141 MB physical while RSS stayed elevated, and after killing four scratch sessions only
37 MB of ~90 MB came back.

**An ambient "gmux is using N MB" readout would therefore be wrong by more than an order
of magnitude, most of the time, in the alarming direction.** And it would be
*unactionable*: neither setting in this spec moves it, because the renderer cap is inert
and the tmux allocator does not return small pages.

Two independent conclusions:

* **Cut app RSS and tmux server RSS from every visible surface.** Not "hide them behind
  a disclosure" — cut them. They answer no question the user can act on and they
  misreport the present.
* **`#{history_bytes}` is the only honest source.** Exact (within 2% of `vmmap`
  ALLOCATED), live, per-pane, and free to read (§6).

Both cut numbers survive in exactly one place: the **Copy details** action, which puts a
plain-text block on the clipboard for a bug report. Their diagnostic value is preserved;
they never get a pixel.

## 5.3 What is kept, what is cut

| candidate | verdict | why |
|---|---|---|
| per-session lines used vs its depth | **keep, on demand** | the only figure with a loss consequence attached |
| per-session approximate memory | **keep, on demand** | answers "is this the expensive one" |
| total scrollback held by sessions | **keep, on demand** | the evidence for the depth choice, in the place the choice is made |
| saved-scrollback disk in userData | **keep, on demand** | the cost of control 2 |
| free disk | **threshold only, never a figure** | a free-disk gauge in a terminal app is pure dashboard; running out is a durability failure |
| **app RSS** | **cut** | unactionable, unaffected by either setting, most dashboard-shaped number in the list |
| **tmux server RSS** | **cut** | overstates present scrollback by 23× (measured) |
| a per-session memory league table | **cut** | supervisor's console, explicitly refused |
| "session is 80% full" progress indicator | **cut** | see §5.4 — the prediction is worthless |

## 5.4 Why there is no "approaching the limit" warning

The brief proposed surfacing *"a session near its scrollback limit"*. The measurements
kill this specific design:

**A runaway command fills a 50,000-line buffer in about 0.3 seconds** (200,000 lines in
1.1 s, measured). There is no useful warning window. A "you are at 80%" toast would fire
0.06 s before the loss it warns about, and the discarded content in that regime is junk
anyway.

The opposite regime — `zen of tortie` accumulating 14,867 lines over a full day — has
plenty of warning time, but a percentage crawling upward over days is exactly the
*"number that rises on its own"* the Zen names.

So the honest trigger is neither a percentage nor a prediction. It is the **event**:

> **The first time a session discards a line, say so once. Never again for that
> session.**

Both regimes are served correctly. The runaway user learns something true they did not
know (this session produces more output than it keeps). The long-transcript user learns
the thing they actually need (the start of this conversation is gone). And the cost is
bounded at **one notification per session lifetime**, forever.

At the recommended 25,000 with the deepest real session ever observed at 14,867 lines,
**this will essentially never fire on this user's fleet** — which is the correct
behaviour for a signal, and the strongest evidence it is not a gauge.

## 5.5 The surfaces, concretely

### Surface 1 (primary, on demand) — `Settings → General → Scrollback`

One sentence and a button, inside the card where the choice is made:

> Your sessions are holding 7 MB of scrollback.  ·  **Copy details**

That is the entire "diagnostics panel". It appears only when Settings is open, it is
evidence for a decision the user is actively making, and it contains no rising number.

**Copy details** puts a plain-text block on the clipboard — the bug-report escape hatch
where the cut numbers live:

```
gmux scrollback report — 2026-08-10T21:14:02Z
settings: depth 25,000 lines · saved 10,000 lines
sessions: 15 · scrollback held 6.99 MB · 18,829 lines · ~371 bytes/line
deepest:  "zen of tortie" 14,867 lines (59% of depth)
saved:    14 files, 908 KB (largest 449 KB)
disk:     412 GB free
tmux server rss 164.8 MB (high-water mark, not current usage)
gmux main rss 231 MB · renderer rss 191 MB
```

### Surface 2 (per session, on demand) — the existing context menu

`src/renderer/app/session-actions.tsx` already builds a per-session menu
(Rename / Restore / Restart / Copy directory path / Remove / End session…). Add **one
disabled informational item** at the top of the scrollback-adjacent group:

```
  Scrollback   4,210 of 25,000 lines · about 1.5 MB
  ─────────────
  Clear ⌘K
```

No new surface, no popover to design, no hover behaviour. It appears only on an explicit
right-click, next to the remediation (`Clear`) that the number motivates. This is the
"per-session info popover" the brief asked for, assembled from what already exists —
`docs/ZEN-OF-TORTIE.md`: *"assemble it from what already exists rather than reinventing
it."*

### Surface 3 (proactive, rare) — one toast, once per session

Fires the first time a session's `history_size` reaches its `history_limit`. Uses the
existing toast vocabulary (`src/renderer/app/Toasts.tsx`), not a new banner.

> **"claude-3" has started discarding its oldest output.**
> It reached its 25,000-line scrollback depth. Later sessions can keep more.
> *[Change depth]  [Dismiss]*

Rules, all mandatory:
* **Once per session, ever.** Latch on the session id in main; never re-arm, not on
  reattach, not on app restart. A session that discards for six hours produces one toast.
* **Names the session and offers the action.** A notification the user cannot act on is
  theatre.
* **No count, no percentage, no rate.** "Started discarding" is a state change, not a
  measurement.
* **Suppressed during the first 60 s of a session's life.** A restored session replaying
  a snapshot, or a deliberate `cat` of a huge file, should not lecture the user.

### Surface 4 (proactive, rarer) — disk

Two thresholds, both genuine durability failures, both one-shot with a 24 h re-arm:

* **Snapshots exceed 1 GB** in userData → *"Saved scrollback is using 1.2 GB. You can
  reduce how much each session saves."* → opens Settings. (At the recommended defaults
  this is 100+ sessions away; the user's real total is 908 KB.)
* **Free disk below 2 GB** → *"Low disk space — sessions may not be saved when you
  quit."* This one is unconditional: it is the failure of the core promise.

Free disk is never displayed as a figure. Only the threshold speaks.

### What is deliberately absent

No badge on any session row. No number in the identity strip or titlebar. No entry in
the ⌘K palette. No status bar — `docs/DESIGN-SPEC.md:34` says *"No bottom status bar in
v1"*, so the brief's third candidate surface has no host and needs none.

---

# PART 6 — THE SAMPLING PLAN AND ITS COST BUDGET

## 6.1 Tier 1 — the existing 1 Hz poll, extended by three fields

`src/main/activity/panes.ts` runs exactly one `list-panes -a -F PANE_FORMAT` per second
for the whole server (measured at 4.54 ms wall / 2.75 ms CPU for 16 panes). **Add three
fields to that format. Add no timer.**

```
#{history_size}    lines currently held
#{history_limit}   the depth this pane was born with — the ONLY reliable read (§2.2)
#{history_bytes}   exact live memory, the honest source (§5.2)
```

**Measured cost, by this synthesizer, on the live 15-pane server** (25 runs each,
interleaved to cancel drift):

| format | p50 | min | p90 |
|---|---|---|---|
| current `PANE_FORMAT` | 4.01 ms | 3.70 | 4.61 |
| + the three history fields | **3.89 ms** | 3.42 | 5.02 |
| current `PANE_FORMAT` (repeat) | 3.51 ms | 3.35 | 3.64 |
| + history fields (repeat) | **3.60 ms** | 3.41 | 4.01 |

**Free at the real fleet's depth** — the delta is inside run-to-run noise.

Because `history_bytes` might have been a grid walk, it was re-measured against a
deliberately extreme server — **5 panes holding 999,805 lines** (the worst case this
whole spec contemplates, 20 panes × 50k):

| format | p50 | min |
|---|---|---|
| without `history_bytes` | 3.71 ms | 3.29 |
| **with `history_bytes`, 1M lines buffered** | **4.14 ms** | 3.98 |
| without (repeat) | 3.65 ms | 3.16 |
| with (repeat) | **4.11 ms** | 3.98 |

**Worst-case marginal cost: +0.45 ms per poll at one million buffered lines** —
reproducible to ±0.03 ms. At the user's actual fleet it is +0.1 ms or less.

### Hard cost budget

| | budget | measured |
|---|---|---|
| new timers | **0** | 0 |
| new tmux processes per second | **0** | 0 |
| added wall time per 1 Hz poll, real fleet | ≤ 0.5 ms | **~0.1 ms** |
| added wall time per 1 Hz poll, 20 panes × 50k lines | ≤ 1.0 ms | **0.45 ms** |
| added CPU duty cycle | ≤ 0.1% | **0.045%** |

**Implementation note:** `PANE_FORMAT` puts `#{pane_title}` **last on purpose** — it is
the one field whose content is arbitrary, so everything after the 12th tab belongs to it.
Insert the three new fields **before** `pane_current_command`, and bump
`TITLE_FIELD = 12` accordingly. Getting this wrong silently corrupts agent state
detection, not just the diagnostics.

## 6.2 Tier 2 — lazy, on open only

| sample | cost | when |
|---|---|---|
| snapshot directory size | `readdir` + `stat`, 14 files, < 2 ms | Settings opens; after a quit-time snapshot write |
| free disk | `statfs`, sub-ms | Settings opens; hourly for the threshold check only |
| app / tmux RSS | `app.getAppMetrics()` + one `ps` | **only** when *Copy details* is clicked |

Nothing in tier 2 runs while the main window is merely open. The Settings window is a
separate renderer; when it is closed, none of this executes.

## 6.3 Where the threshold state lives

The discard latch (§5.5, surface 3) is one `Set<sessionId>` in main, derived from the
tier-1 poll it already receives. `history_size >= history_limit` is a comparison of two
integers that arrive in the same line of `list-panes` output. **No additional sampling of
any kind is required to implement the proactive surface** — which is the strongest
practical argument that this design is not a dashboard: a dashboard would have needed a
data pipeline.

---

# PART 7 — RISKS AND WHAT IS STILL UNMEASURED

## 7.1 Risks

| # | risk | severity | mitigation |
|---|---|---|---|
| 1 | **Implementer reaches for `set -p history-limit`.** Exit 0, `show -p` confirms, setting is inert. Ships broken and passes a naive test. | **high** | §2.2. Any test must assert `#{history_limit}` on a **newly created** pane, never `show-options`. |
| 2 | **Conf and settings drift.** `resources/gmux-tmux.conf` hardcodes 50000; a server started from the conf before the first settings write silently wins. | **high** | Put `history-limit` in `BOOT_SERVER_OPTIONS` *and* apply on change (§2.5). Consider a startup assertion that the two agree. |
| 3 | **Scroll freeze gets worse if the max is raised.** 21 µs/line, fleet-wide, single-threaded. | **high** | Cap at 100,000; warn above 50,000. Chunk `scrollPaneBy` to unlock higher (§1.4). |
| 4 | **Lowering the default to 25,000 is a silent behaviour change** for existing users, invisible until a pane that would have held 40,000 lines truncates. | medium | It only affects *new* panes; the deepest session ever observed is 14,867. Mention in release notes, not in a modal. |
| 5 | **Raising *saved* scrollback lengthens quit.** 50,000 × 16 sessions = 4.7–9.0 s of single-threaded capture on the quit path. | medium | Hard-cap at 25,000; caption states it (§4.3). |
| 6 | **The per-session memory estimate can be off by 4×** in either direction (160 vs 1,451 B/line on the same machine, same day). | medium | "About X MB", computed from the user's own fleet, never a bare guarantee (§4.2). |
| 7 | **`PANE_FORMAT` field-order break.** `TITLE_FIELD` is a positional index. | medium | Insert before `pane_current_command`; update the constant; the existing parser tests should catch it. |
| 8 | **A user sets 100,000 and fills it with truecolour on a 16 GB machine** → 9.2 GB across 20 panes. | low-medium | The live estimate caption is the guard rail; `Clear ⌘K` is the escape. |
| 9 | **Deleting `TERMINAL_SCROLLBACK` outright** would remove real insurance if a future pane ever lands in the normal buffer. | low | Keep the constant, mark it inert, fix the three stale comments (§3.1). |

## 7.2 Still unmeasured

1. **Behaviour under genuine memory pressure.** No ramp on this machine ever dropped
   below 52% free, so nothing was measured at the point where macOS starts swapping or
   the jetsam killer takes an interest. The 16 GB × truecolour × 20-panes corner
   (4.7 GB) is **modelled, not observed**, on a 48 GB machine.
2. **Whether tmux's compressed cold grid behaves well under sustained pressure.** 1.7 GB
   compressed at 20 truecolour panes is encouraging; decompression cost on a scroll into
   old history was not measured.
3. **The scroll freeze with a real attached client and 16 live agents.** Measured with
   one pane and a synthetic probe client. The 1,170 ms stall is a lower bound; a fleet
   of attached clients each needing a redraw afterwards could be worse.
4. **Chunked-scroll behaviour.** The proposed mitigation in §1.4 is arithmetic, not a
   measurement. Someone must verify that tmux actually services other clients between
   chunked `send-keys` calls before the max is raised on the strength of it.
5. **Whether a client terminfo without `smcup` would keep a gmux pane in xterm's normal
   buffer.** Probe B explicitly declines to assume this is a viable route to renderer-side
   scrollback, and so does this spec.
6. **Snapshot write cost on a slow or nearly-full disk.** All snapshot figures are
   capture time; the `writeFile` + `rename` was never the bottleneck on this SSD.
7. **Long-horizon accumulation.** The deepest observed session is one day old at 14,867
   lines. Nobody has run a gmux session for a week. If real depth grows linearly with
   session age, a 7-day session reaches ~100,000 lines and the 25,000 recommendation
   would need revisiting — which is exactly the case the once-per-session discard toast
   (§5.5) exists to detect in the field.

## 7.3 Corrections this document makes to its own inputs

| source | claim | correction |
|---|---|---|
| the mission brief | *"reboot snapshots are written per session, so deeper history means bigger files"* | **False.** `SNAPSHOT_LINES` is an independent constant; raising `history-limit` does not grow snapshots at all (§3.3). |
| the mission brief | *"capture research measured ~183 ms for 300 lines"* | That was research 17's SVG rasteriser (168 of those ms). `capture-pane` itself is ~6 ms for 300 lines, ~5.6 µs/line (§3.2). |
| the mission brief / BACKLOG 13.7 | make *both* numbers configurable | The renderer cap is inert. Ship `SNAPSHOT_LINES` as the second control instead (§3.1). |
| BACKLOG 13.7 §3 | surface *"tmux server RSS, app RSS"* | Cut from all visible surfaces — RSS overstates held scrollback by 23× (§5.2). |
| BACKLOG 13.7 §3 | surface proactively when *"a session [is] near its scrollback limit"* | No useful warning window exists (0.3 s to fill 50k). Fire on the discard **event**, once (§5.4). |
| probe A | *"`set -w` behaves the same way [as the inert `set -p`]"* | **Wrong.** `history-limit` is a session option; `set -w` sets a per-session override that new panes *do* inherit (§2.2). |
| probe A | *"a single `cat` fills 50,000 lines in 2.1–2.6 s"* | Re-measured at 200,000 lines in 1.1 s — about **0.3 s** to fill 50,000 (§1.3). |
| `src/main/tmux/sessions.ts:281` | *"This backfills xterm.js after reattach (T1)"* | No caller does this. `main/index.ts:530` is a restore-verification poll (§3.1). |

---

## Appendix — reproduction

Harnesses and raw data, all under
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/`:

| what | where |
|---|---|
| tmux cost curve, scaling, downstream | `bench/{gen.py,cost.sh,scale.sh,downstream.sh}`, results in `bench/out/*.tsv` |
| renderer per-line curve, DOM vs WebGL, splits | `m1-out.json`, `m2-out.json`, `harness/` |
| backfill curve | `m3-out.json`, `m4-out.json` |
| WebGL atlas pressure | `m5-out.json` |
| real app: alternate buffer, independence table | `app-probe.mjs`, `app-probe-out.json` |
| real app: tab-switch latency | `app-probe2.mjs`, `app-probe2-out.json` |
| **history-limit scope rules (synthesizer)** | `scope.sh` |
| **scroll cost + server blocking + clear-history (synthesizer)** | `scroll2.sh` |
| **1 Hz poll marginal cost (synthesizer)** | `pollcost.sh`, `hbcost.sh` |

**Safety:** all fills ran on throwaway sockets (`-L zzsyn`, `-L zzhb2`, `zzhb-*`,
`zzscale-*`, `zzdown-*`) with `zz-`-prefixed session names, and every server was killed
at the end. The user's `-L gmux` server was read with `list-panes` / `display-message`
format queries **only** — never written to. Nothing under `/Users/gdc/gmux/src/**` was
modified.
