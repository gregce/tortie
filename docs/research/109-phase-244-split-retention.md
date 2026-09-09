# The split-session retention finding, reproduced, with a retaining path

Date: 9 September 2026. Phase 244, finding F6. **Nothing was repaired.**

Execution commit: the Phase 244 repair round, on top of `f2a4b2ec`.
Package version: `0.101.0`.

The finding is [F6 of the 0.101.0 architecture audit](../audits/2026-09-08-electron-typescript-architecture-0.101.0.md#f6-the-old-split-retention-finding-still-needs-closure).
The [architecture goal's closure requirement](../audits/2026-09-06-architecture-36-goal.md) is a
retaining path and a regression, or a controlled explanation that reproduces both the failing and the
passing conditions. **This round obtained the first half of the first one and neither of the others**,
and the whole point of writing it down is that four rounds in a row obtained nothing at all.

## What every previous round got, and why

| Round | What it drove | What it read |
| --- | --- | --- |
| Phase 200 | The CPU throttle and a second app beside it, its two levers | Neither reproduced |
| Phase 220 | Gave the profile the detached census, the workload floor and `heap-retainers.mjs` | Failed twice of three at `b5cc017`, then seven clean runs over a byte-identical renderer |
| The 0.101.0 audit | Profiles b, c and d in one session | 142, 13 and 13 detached, the first block's excess released rather than accumulated; passed |
| Phase 244, the measure step | Profile d alone, 3 blocks of 6 | 0, 0, 0 detached; passed |
| **Phase 244, this round** | **Profile d alone, 3 blocks of 6** | **0, 0, 599 detached. FAILED, and the heap was photographed** |

**The reason nothing was ever explained is not that nobody looked.** It is that the snapshot had to be
asked for in advance, with `P167_SNAPSHOT=1`, on a run nobody knew would fail. For an intermittent
finding that is the same as not having it at all: every run that failed was a run without a snapshot,
and every run with a snapshot passed.

## What this round changed about the instrument, and it is not a repair

`build/probe-p167-scale.mjs` now asks `judge` — the very function that decides the verdict, over the
blocks read so far, with that profile's own rules — after every block from the second onwards. The
first time it says something, the run photographs the renderer heap **while what caused it is still
held**, and then reads the file with `build/heap-retainers.mjs` in a child process and prints the
retaining paths. `P167_SNAPSHOT_ON_FINDING=0` turns it off. A green run costs nothing at all and
writes no file, which was measured: a 2-block run wrote no snapshot, and the same run with
`P167_HEAP_MB=0.01` wrote one and read it.

Nothing about the workload, the churn, Past Sessions, the budgets, the census or the verdict moved.
The verdict is still computed over every block after the loop, by the same call.

**It asks from the SECOND block on.** Asked after block 1, `judge` answers "fewer than two blocks were
read, so no plateau can be judged", which is a sentence about the run rather than a finding about the
app; the first version of this did exactly that and photographed a 22 MB heap for nothing.

## The reproduction

`P167_PROFILES=d node build/harness-socket.mjs --fresh gmux-p244-p167d-<pid> 'node build/probe-p167-scale.mjs'`,
one Electron on a scratch profile and that scratch socket, 3 blocks of 6 cycles, full speed
(profile d is not in `P167_CPU_PROFILES`, so the throttle read 1).

```
d, split, close and reattach
  before   heap  7.2 MB, nodes  452 (277 on screen), listeners 231, ptmx 0, ttys 0
  census   0 detached element(s), 0 in Past Sessions
  block 1  heap 10.3 MB, nodes  453 (278 on screen), listeners 231, ptmx 0, ttys 0
  census   0 detached element(s), 24 in Past Sessions
  block 2  heap 10.0 MB, nodes  453 (278 on screen), listeners 231, ptmx 0, ttys 0
  census   0 detached element(s), 48 in Past Sessions
  block 3  heap 13.4 MB, nodes 1181 (278 on screen), listeners 231, ptmx 0, ttys 0
  census   599 detached element(s), 72 in Past Sessions
  FAIL d: the renderer held 599 more detached element(s) after block 3 than after
          block 2, over the 50 budget.
```

Every ruler was armed and every one of them agrees:

- **The workload landed**: 24, 48 and 72 discarded sessions in Past Sessions, three quarters of
  `cycles × 4` in every block, so this is not a flat reading over an absent workload.
- **Nothing on screen moved**: 278 live elements in all three blocks, and 231 listeners. The 728 extra
  nodes in block 3 are the 599 detached elements and their text.
- **Main held its descriptors**: 0 `ptmx` and 0 `ttys` after every block, Phase 167 finding 1 still closed.
- **The planted-leak control saw all 1,032 of its elements** and read 0 after release, so a census that
  reads 0 reads 0 because there are none.
- The operator's own `-L gmux` server read **21 sessions before and 21 after**.

**This is the historical shape.** Phase 200 recorded about 5 MB and exactly 1,020 DOM nodes a block;
this is 3.4 MB and 728 nodes, in one block of three.

## The retaining path, which is the new thing

`build/heap-retainers.mjs <snapshot> --detached --top 8`. All 599 matched elements, 89.3 KB of self
size, in a snapshot of 325,809 nodes. The census groups them by the root of each detached tree:

| Root of the detached tree | Trees | Elements |
| --- | ---: | ---: |
| `div.xterm-scrollable-element.mac` | 43 | 387 |
| `div.terminal.xterm` | 43 | 86 |
| `div.xterm-decoration-container` | 43 | 43 |
| `style` | 43 | 43 |
| `canvas` | 40 | 40 |

**Forty-three disposed xterm terminals**, and every one of the paths ends the same way:

```
    43  native <div class="xterm-decoration-container">
        native <div class="xterm-decoration-container">  <- property _container
        object Gt  <- context this
        object system / Context / scope @79547  <- internal context
        closure   <- element [0]
        object Array  <- property _refreshCallbacks
        object en  <- property _renderDebouncer
        object Qt  <- property _renderService
        object ei  <- context this
        object system / Context / scope @79825  <- internal context
        closure   <- element [1]
        native V8FrameRequestCallback  <- element [1]
        native V8FrameCallback  <- element [13]
        native blink::HeapVectorBacking<...FrameCallback...>  <- element [2]
        native ScriptedAnimationController  <- element [34]
        native HTMLDocument  <- property <symbol Window#DocumentCachedAccessor>
        object Window [JSGlobalObject] / file://  <- internal global_object
        synthetic (Global handles) -> synthetic (GC roots) -> (root)
```

**Read it from the bottom.** The document's `ScriptedAnimationController` — the list of pending
`requestAnimationFrame` callbacks — holds a vector of `FrameCallback`s. Each detached terminal hangs
off a DIFFERENT element of that vector (`[8]`, `[10]`, `[13]`, `[30]` in the top eight alone), so this
is **forty-three separate un-served animation-frame callbacks**, each whose closure captures one whole
disposed terminal.

The chain from the callback down is xterm's own: the closure captures the terminal core (`ei`), which
holds `_renderService` (`Qt`), which holds `_renderDebouncer` (`en`), whose `_refreshCallbacks` array
holds the closures that capture the render layers, which hold the detached DOM. The
`div.xterm-screen`, `div.xterm-helpers`, `textarea.xterm-helper-textarea` and `div.composition-view`
paths all reach `ei` directly through `_screenElement`, `_textarea` and `_coreBrowserService`.

So the answer to "what holds them" is settled and it is one mechanism: **a pending
`requestAnimationFrame` per disposed terminal, still registered on the document.**

## What is NOT established, stated plainly

**Why the callback is pending.** `@xterm/xterm` 6.0.0's `RenderDebouncer.dispose()` does
`this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame)` and clears
`_refreshCallbacks`, and `TerminalPane.tsx`'s effect cleanup does call `term.dispose()`, after
`observer.disconnect()` and after `webgl?.dispose()`. So a cancelled frame should not be in that list.
Two shapes fit the evidence and this round separated neither:

1. **A refresh scheduled AFTER dispose.** `RenderDebouncer` has no disposed guard: a later
   `addRefreshCallback` schedules a new frame that nothing will ever cancel. The candidate trigger in
   Tortie's own cleanup order is `webgl?.dispose()`, which is inside a `try` and runs BEFORE
   `term.dispose()`; swapping a renderer out asks the render service to refresh.
2. **A frame that was never served.** `requestAnimationFrame` callbacks are only run when the page
   produces frames. If the probe's window was occluded or the compositor was not producing frames for
   part of block 3, callbacks pile up and a `cancelAnimationFrame` during that window still removes
   them — so this shape needs the callback to have been scheduled after the cancel too, which makes it
   a variant of the first rather than an alternative to it.

**Why it is intermittent.** Blocks 1 and 2 read 0 in this same run over the same workload, and seven
Phase 220 runs and two Phase 244 runs read 0 throughout. Whatever decides it is not the workload.

**Whether it costs a person anything.** 599 elements and 89.3 KB of self size after 72 discarded
sessions is small. The finding matters because it is unexplained and unbounded, not because a number
was reached.

## The next experiment, so the next round does not start where this one did

1. **Instrument the schedule, not the heap.** Wrap `window.requestAnimationFrame` in the harness build
   only, record a stack per pending id, and print the stacks of the ids the census's detached trees
   hang off. That names shape 1 or refutes it in one run, and it is a smaller instrument than a
   snapshot.
2. **Drive the cleanup order.** Run the split profile with `webgl` never enabled
   (the pane already falls back), and separately with `webgl?.dispose()` moved after `term.dispose()`.
   If either reads 0 over three runs where the shipped order reads 599, that is the controlled
   explanation the goal asks for.
3. **Only then repair**, and the repair belongs in `TerminalPane.tsx`'s cleanup order rather than in
   `@xterm/xterm`, because this tree assembles and does not reimplement.

**Do not remove Past Sessions and do not reduce the churn to obtain the point.** The Phase 244 entry
forbids it and it would be buying a number.

## Safety

One Electron per run, through `build/harness-socket.mjs` on a scratch profile and the scratch sockets
`gmux-p244-p167-<pid>`, `gmux-p244-p167s-<pid>`, `gmux-p244-p167f-<pid>` and `gmux-p244-p167d-<pid>`,
each ended by the harness. No agent was spawned and no token was spent. The operator's own `-L gmux`
server was read before and after and did not move. The snapshot files are under `out/`, which
`.gitignore` refuses, and none is committed.
