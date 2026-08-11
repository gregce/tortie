# Research: true git log graph — lanes + local/origin divergence (Phase 14.5, dimension 1)

Algorithm and prior-art research for BACKLOG Phase 14.5. Every library, licence and
maintenance claim below was verified live on **2026-08-11** against the npm registry, the
GitHub API and the projects' own source — not from memory. Measurements were taken on this
machine against `/Users/gdc/getspecstory` (932 commits, 185 merges, 26 local + 33 remote
branches, 72 tags), `/Users/gdc/gmux` (62 commits, fully linear) and a local
`microsoft/vscode` clone (130 622 commits) as a stress case.

---

## 0. Recommendation in one paragraph

**Port VS Code's swimlane algorithm; take no dependency.** The algorithm that matters is
~90 lines of straight-line TypeScript in one MIT file, it is a *single streaming pass* whose
state is entirely "the previous row's output lanes", and that property is what buys the two
things Phase 14.5 demands — provable lane stability across paging, and one self-contained SVG
per row so the list stays virtualizable. No library is worth it: the only real git-lane
library (`@gitgraph/*`) is **archived and cannot import a real repository's log**, and the
generic DAG layouts (`d3-dag`, `elkjs`, `dagre`) solve a different problem (Sugiyama layered
layout) that produces the wrong picture and costs more. Budget **~250 lines of layout +
~120 lines of SVG rendering**, plus the data-layer changes in §6 which are the actual
blockers for ask #1.

**Three findings that change the plan as written in BACKLOG.md:**

1. **`mhutchie/vscode-git-graph` is not MIT.** The backlog says it is. Its LICENSE explicitly
   withholds derivative-work rights (§2.2). Reading it is fine; porting it is not. Nothing
   from it may enter gmux.
2. **Ask #1 is blocked in the data layer, not the renderer.** gmux's `git log` walks HEAD
   only, so commits that exist on `origin/main` but not locally are *absent from the log
   entirely* — the divergence picture is unrenderable today no matter what the row draws.
   Separately, `badgesFor()` shows the remote pill **only when `ahead === 0 && behind === 0`**,
   i.e. exactly when it is redundant, and suppresses it exactly when it carries the message
   (§6.1). That one condition is why the reference screenshot is impossible today.
3. **`--topo-order` costs 530 ms on a large repo without a commit-graph file, and 10 ms with
   one** (§9.1). This is a 53× cliff that decides whether the feature feels instant.

---

## 1. Prior art: microsoft/vscode's built-in Source Control Graph

**Licence: MIT** (verified: `github.com/microsoft/vscode` LICENSE.txt, GitHub API
`license.spdx_id = "MIT"`). Shipping and GA — not preview. Verified against the installed
**VS Code 1.131.0** on this machine (`scmGraph.foreground1` is present in
`workbench.desktop.main.js`), and its settings carry production defaults rather than a
preview flag: `scm.graph.pageSize` (default 50), `scm.graph.pageOnScroll` (default true),
`scm.graph.badges`, `scm.graph.showIncomingChanges`, `scm.graph.showOutgoingChanges`.

### 1.1 Files that matter

| File | What it holds |
|---|---|
| `src/vs/workbench/contrib/scm/browser/scmHistory.ts` | **The whole algorithm.** 607 lines: `toISCMHistoryItemViewModelArray()` (lane assignment), `renderSCMHistoryItemGraph()` (per-row SVG), `renderSCMHistoryGraphPlaceholder()` (the load-more row), the 5-colour registry, and `addIncomingOutgoingChangesHistoryItems()` (the divergence nodes). Last changed 2025-12-08 (`25c94ab342`). |
| `src/vs/workbench/contrib/scm/browser/scmHistoryViewPane.ts` | 2248 lines: virtualization (`ListDelegate.getHeight() → 22`), the colour map (`_getGraphColorMap`), paging, and the merge-base resolution that feeds divergence. |
| `src/vs/workbench/contrib/scm/common/history.ts` | The `ISCMHistoryItem` / `ISCMHistoryItemViewModel` / `ISCMHistoryItemGraphNode` shapes. |
| `extensions/git/src/historyProvider.ts` | `provideHistoryItems()` — turns git output into history items; `_resolveHistoryItemRefs()` maps `%D` decoration into typed refs. |
| `extensions/git/src/git.ts` | `log()` at ~L1444 — the exact argv. |

> A local clone exists at `/Users/gdc/vscode` but it is pinned to **2025-03-07**; the graph
> code has roughly doubled since. Read from `raw.githubusercontent.com/microsoft/vscode/main`,
> not from that clone.

### 1.2 The data feed (verified from `git.ts` L1444–1500)

```
git log --format=<COMMIT_FORMAT> -z \
        --topo-order --decorate=full --stdin \
        -n<limit> [--skip=<n>] [--shortstat --diff-merges=first-parent]
# COMMIT_FORMAT = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%D%n%B'
# ref names are fed on STDIN — deliberately, to dodge the argv length limit
# when the "all refs" filter is on.
```

Three details worth copying verbatim:

- **Ref names go in on stdin**, not argv. With 129 refs on getspecstory this is already
  prudent; with 1564 refs (the vscode clone) argv would be at risk.
- **`--decorate=full`** puts refs on the commit rows themselves (`%D`), so badges are pinned
  by *the walk*, not by a separate SHA-matching pass. This is materially better than gmux's
  current approach of cross-referencing `git:branches` output by SHA, because it picks up
  tags and remote refs for free and cannot drift from the log.
- **`--diff-merges=first-parent`** on the stat query, gated on `git >= 2.31`.

### 1.3 The lane algorithm (verbatim behaviour of `toISCMHistoryItemViewModelArray`)

Each row carries `inputSwimlanes` (state entering the row) and `outputSwimlanes` (state
leaving it). A swimlane node is `{ id: <sha this lane is waiting for>, color }`.

```
for each commit c, in topo order:
    input  = previous row's output            (deep-copied)
    output = []
    firstParentAdded = false

    if c.parentIds.length > 0:                        # ← see §4.3, this guard is a bug
        for node in input:
            if node.id == c.id:
                if not firstParentAdded:
                    output.push({ id: c.parentIds[0],
                                  color: labelColor(c) ?? node.color })
                    firstParentAdded = true
                continue                              # duplicate lanes are DROPPED (join)
            output.push(node)                         # everything else keeps its index

    for i in (firstParentAdded ? 1 : 0) .. c.parentIds.length-1:
        color = (i == 0) ? labelColor(c)
                         : labelColor(commitById(c.parentIds[i]))
        if color is undefined:
            colorIndex = rot(colorIndex + 1, 5); color = colorRegistry[colorIndex]
        output.push({ id: c.parentIds[i], color })    # new lanes always append RIGHT

    inputIndex  = input.indexOf(node where node.id == c.id)
    circleIndex = inputIndex != -1 ? inputIndex : input.length
```

The properties that fall out of this, and why they are the right ones:

- **A lane is a promise to show a specific SHA.** `output[i].id` is the commit column *i* is
  waiting for. Nothing else is tracked.
- **Lane joins compact; lane splits append.** When a commit occupies several input columns
  (several children already seen), the first becomes its continuation and the rest vanish,
  shifting later columns left. New lanes only ever appear at the right edge.
- **`circleIndex` is not `output`-derived.** The dot sits where the commit was *awaited*, or
  one past the right edge if nothing awaited it (a branch tip entering the window).
- **Colour is a rotating counter, not a function of lane index.** `colorIndex` advances once
  per newly opened unlabelled lane and never resets, so a colour is not "owned" by a column
  and does not flicker when columns shift.
- **Refs override colour.** `labelColor()` looks the commit's refs up in a colour map; the
  current branch, its upstream and its merge base have fixed role colours, so the HEAD lane
  is always the same colour regardless of where the rotation happens to be.

### 1.4 Rendering (`renderSCMHistoryItemGraph`)

`SWIMLANE_HEIGHT = 22`, `SWIMLANE_WIDTH = 11`, `CIRCLE_RADIUS = 4`, `CIRCLE_STROKE_WIDTH = 2`,
`SWIMLANE_CURVE_RADIUS = 5`. One `<svg>` per row, width `11 * (maxLanes + 1)`, containing only
that row's segments — **no path crosses a row boundary**. Lane *i*'s centre is at
`x = 11 * (i + 1)`.

Five primitive cases, each an SVG path:

1. **Straight through** — column keeps its index: `M x 0 V 22`.
2. **Shift left** — column *i* continues at output index *j < i*: down to `y=6`, arc
   (r=5), horizontal run, counter-arc, down to `y=22`.
3. **Base-commit slide** — the commit's own lane arrives at index ≠ `circleIndex`: a quarter
   arc of radius 11 from the top of the lane into the row's mid-line, then horizontal to the
   circle.
4. **Extra parent (merge)** — for each `parentIds[1..n]`, `findLastIndex(output, parentId)`
   locates the target column, then draws a horizontal run from the circle plus a quarter arc
   down into that column. **This loop is generic in *n*, which is why octopus merges need no
   special case.**
5. **Stub in / stub out** — `M x 0 V 11` when the commit was awaited, `M x 11 V 22` when it
   has parents.

Node glyphs: HEAD = outer ring r=7 + inner filled r=2; merge (`parentIds.length > 1`) = ring
r=6 + inner ring r=3; ordinary = ring r=5; incoming/outgoing pseudo-nodes = ring + dashed ring
(`stroke-dasharray: 4,2`). **Shape carries merge-ness and HEAD-ness independently of colour**,
which is the DESIGN.md "never colour alone" rule already satisfied by the reference.

### 1.5 Virtualization and the window boundary

`ListDelegate.getHeight()` returns a constant `22` — fixed row height is what makes the
virtual list cheap, and the per-row-self-contained SVG is what makes fixed height possible.

The load-more row is a real list element carrying
`graphColumns: lastHistoryItem.outputSwimlanes`, rendered by
`renderSCMHistoryGraphPlaceholder(columns)` as plain vertical lines in each still-open lane —
so the graph visibly continues off the bottom instead of being amputated. It is only emitted
when `outputSwimlanes.length > 0`. Expanded file rows reuse the same placeholder with the
parent commit's `circleIndex` highlighted at `stroke-width: 3`, so an expanded commit does not
break the lane visually.

### 1.6 Divergence (`addIncomingOutgoingChangesHistoryItems`) — directly relevant to ask #1

VS Code does **not** rely on the local and remote pills happening to land on different rows.
It synthesizes two pseudo-commits and splices them into the view model *after* layout, so they
can borrow real lane colours:

- **Outgoing changes** — inserted immediately above the `HEAD` row when
  `currentHistoryItemRef.revision !== mergeBase`. Its output lanes are the HEAD row's input
  lanes plus one new lane in the local role colour, and the HEAD row's input gains the same
  lane — so a visible stub sprouts above your unpushed work.
- **Incoming changes** — inserted at the merge-base row when the remote ref's revision differs
  from the merge base. It rewrites the *remote-coloured* lane's id from the merge base to a
  sentinel on the rows between, so the incoming lane reads as its own line of history that
  rejoins at the base.
- Both are guarded on the merge base being **inside the loaded window**
  (`beforeHistoryItemIndex !== -1 && afterHistoryItemIndex !== -1`), and there is an explicit
  carve-out for "the incoming changes were already merged" (vscode#276064).

Merge base comes from `resolveHistoryItemRefsCommonAncestor([localName, remoteName])` →
`git merge-base`. Role colours: `scmGraph.historyItemRefColor` (chartsBlue) local,
`scmGraph.historyItemRemoteRefColor` (chartsPurple) remote,
`scmGraph.historyItemBaseRefColor` (`#EA5C00`) base.

---

## 2. Prior art: mhutchie/vscode-git-graph

### 2.1 Its algorithm, and why it is the wrong shape for gmux

`web/graph.ts` (913 lines). Fundamentally different: a **whole-graph** algorithm, not a
streaming one.

- Builds the complete `Vertex`/parent DAG for the entire loaded set first (`loadCommits`).
- Then repeatedly calls `determinePath(i)`, which walks *downward* from a vertex following the
  first-unprocessed-parent chain and allocates a `Branch` object per chain.
- Column allocation is per-row cursor based: each `Vertex` has a `nextX` bumped by
  `registerUnavailablePoint()`, so a branch takes the leftmost x not already claimed *on that
  row*. This compacts more aggressively than VS Code (it matches `git log --graph` more
  closely) but requires the whole graph in hand.
- Colour reuse via `availableColours[]`, where the array index is the colour and the value is
  the last row that colour is live on; `getAvailableColour(startAt)` returns the first colour
  free before `startAt`. Genuinely nicer than VS Code's blind rotation.
- Rendering is **one SVG for the entire graph** with per-branch polylines spanning many rows,
  plus a `<mask>` and an `expandAt` fudge that shifts every y-coordinate when a commit is
  expanded.

Two disqualifiers even setting licence aside: multi-row polylines are **incompatible with row
virtualization** (you cannot render row 400 without the paths from rows 1–399), and the
`expandAt` machinery would have to be reinvented for gmux's inline file expansion, which VS
Code gets for free because its rows are independent.

### 2.2 Licence — the backlog is wrong, and this is blocking

`LICENSE` on `develop`, fetched 2026-08-11, grants use/copy/modify/merge and then:

> **Permission is NOT GRANTED to publish, distribute, sublicense, and/or sell derivative works
> of the Software.**

GitHub's API reports `license.spdx_id: "NOASSERTION"` for exactly this reason. This is
source-available, not open source, and it fails the "MIT/Apache licensing" constraint that
BACKLOG.md applies to every phase. **Do not port, transcribe or adapt any of it.** The good
news is that its one genuinely better idea — colour reuse keyed on when a colour goes free —
is a two-line independent reinvention over VS Code's rotation, and §5.4 specifies it from
first principles.

### 2.3 Maintenance (verified 2026-08-11, GitHub API)

Not archived, but dormant: last release **v1.30.0, 2021-04-05**; last commit to `master`
**2021-09-19**; last push to any branch 2023-07-08; **325 open issues**; 2487 stars.

---

## 3. Libraries assessed

| Package | Latest | Published | Licence | Verdict |
|---|---|---|---|---|
| `@gitgraph/js` | 1.4.0 | **2021-03-06** | MIT | **No.** Repo `nicoespeon/gitgraph.js` is **archived** (July 2024) with an explicit "unmaintained since 2019" notice. Decisive on capability, not just staleness: it is an *authoring* API (`branch()`, `commit()`, `merge()`) for illustrating graphs in blog posts. It has no path from `git log --parents` to a layout. |
| `@gitgraph/react` | 1.6.0 | 2021-03-06 | MIT | Same repo, same verdict. |
| `@gitgraph/core` | 1.5.0 | 2021-03-06 | MIT | Same. |
| `gitgraph.js` | 1.15.2 | 2019-04-07 | MIT | **Deprecated** on npm ("Please use @gitgraph/js instead"). |
| forks (`@sourceflow/…`, `@dolthub/…`, `@colining-…`) | 2023–2024 | | MIT | Stale snapshots of the archived core; inherit the capability gap. |
| `d3-dag` | 1.2.2 | 2026-07-05 | MIT | Actively maintained, but **wrong tool**. It does Sugiyama/layered DAG layout with crossing minimisation — it will happily reposition a commit's row to reduce edge crossings, which is precisely what a git log must never do (row order is fixed by topo order, and lanes must be stable). Would also need a full-graph pass. |
| `@dagrejs/dagre`, `elkjs`, `@antv/layout` | current | | MIT/EPL | Same category error as `d3-dag`, plus heavier. |
| npm search for 2026 entrants | — | | | Nothing. Searches for "git graph commit lane", "commit graph layout", "git log graph" return CI tooling, generic graph layout, and two terminal apps (`committree` 2026-06, `gitgraph-tui` 2026-07). **No maintained browser library that lays out a real commit DAG into lanes exists in 2026.** |

The decisive argument is not maintenance, it is that we must theme every stroke from
DESIGN.md tokens anyway, we must own the divergence pseudo-nodes anyway, and we must emit one
SVG per row to keep the list virtualizable anyway. A library that dictated its own rendering
would have to be fought on all three.

---

## 4. Measured behaviour of the algorithm on real repositories

A faithful port of §1.3 was run against the repos on this machine. Lane counts are the number
of concurrent columns; the pane is ~280 px wide (DESIGN.md §2.2: sidebar 280 default, 220–400).

### 4.1 Lane width is dominated by the ref filter, not the algorithm

| Repo | Ref set | Window | max lanes | avg | rows > 8 lanes |
|---|---|---|---|---|---|
| getspecstory | HEAD + upstream | 50 | **5** | 2.8 | 0 % |
| getspecstory | HEAD + upstream | 200 | 11 | 7.3 | 52 % |
| getspecstory | HEAD + upstream | 752 | 17 | 7.3 | 44 % |
| getspecstory | **all 129 refs** | 50 | 5 | 4.8 | 0 % |
| getspecstory | **all 129 refs** | 200 | 24 | 9.0 | 36 % |
| getspecstory | **all 129 refs** | 932 | **48** | 20.0 | 62 % |
| vscode (130 k) | HEAD | 50 | 3 | 1.8 | 0 % |
| vscode (130 k) | HEAD | 200 | 3 | 2.1 | 0 % |
| vscode (130 k) | HEAD | 5000 | 23 | 12.4 | 88 % |
| gmux | all | 62 | **1** | 1.0 | 0 % |

Read that table as the width budget. At the default page of 50 commits the graph is 3–5 lanes
— **44–66 px at an 11 px pitch**, which fits the pane with room for the subject. It is *paging
depth* and *ref breadth* that break it, not merge-heavy history per se. Two consequences:

- **Default the ref set to HEAD + upstream + merge base**, as VS Code does. An "all refs"
  toggle is fine as an opt-in; it must not be the default.
- The pane must **degrade rather than clip** (BACKLOG constraint). §8 specifies how.

Note also that on the full getspecstory graph only **25 columns ever host a commit dot while
46 columns exist** — over half the width at that depth is pure pass-through edge.

### 4.2 Ground-truth agreement with `git log --graph`

Diffing the port's output against git's own renderer on getspecstory (`HEAD origin/dev`,
`--topo-order`), counting git's prefix columns at 2 chars per lane:

| Window | git's own max lanes | port (faithful) | port + dedupe (§5.3) |
|---|---|---|---|
| 50 | 5 | 5 | **5** |
| 200 | 9 | 11 | 11 |
| 752 | 12 | 17 | **14** |

Structure matches exactly — same commits at the same relative depths, verified row by row on
the synthetic repo in §4.4. The residual width gap is that git collapses a freed column
*within* the row (its `|/` rows), while the swimlane model holds the slot until the next row.
That is a rendering choice, not a topology difference, and it is the honest cost of one
independent SVG per row.

### 4.3 Two defects in the reference worth fixing in the port

- **Root-commit lane wipe.** The whole first loop is guarded by
  `if (historyItem.parentIds.length > 0)`. A parentless commit therefore produces an **empty**
  `outputSwimlanes`, silently killing every other live lane below it. Harmless when the single
  root is the last row; wrong for repos with multiple roots, for grafted or shallow clones,
  and for `--max-parents=0` filters. Fix: always run the loop; let the commit's own lane close
  naturally because there is no first parent to hand it to. Measured impact on these repos:
  none (both are single-root) — this is correctness insurance, not an optimisation.
- **Duplicate lanes for an already-tracked parent.** The second loop appends `parentIds[i]`
  without checking whether that SHA is already awaited in another column. A merge whose second
  parent is already on screen therefore opens a *phantom parallel lane* that converges later.
  It self-heals, but it is visible spaghetti. Measured on getspecstory HEAD+upstream @ 752
  commits: **1264 duplicate lane-slots**, max lanes 17 → **14** and average 7.28 → **6.60**
  once deduped. On the vscode clone @ 5000: 3025 → 2728 duplicates. Fix in §5.3.

### 4.4 Awkward cases, verified on a purpose-built repo

A synthetic repo was built in the scratchpad with local `main` **7 ahead / 2 behind**
`origin/main`, a two-parent merge, a **three-parent octopus merge**, a tag, and three side
branches. The port's ASCII rendering:

```
◉ ┊ ┊       437f888  [@main tag:v1.0]  Octopus merge featB+featC     lanes=3
│ │ ●       89efea6  [featC]           c1                            lanes=3
│ ● │       469e237  [featB]           b1                            lanes=3
◍ │ │ ┊     3bd07d1                    Merge featA                   lanes=4
│ │ │ ●     5a45a98  [featA]           a2                            lanes=4
│ │ │ ●     9d906af                    a1                            lanes=4
● │ │ │     4210e8f                    local1                        lanes=4
│ │ │ │ ●   5fc40ba  [origin/main]     remote2                       lanes=5
│ │ │ │ ●   33f9374                    remote1                       lanes=5
● │ ┊ ┊ ┊   ecb9ba9                    base2   ← merge base          lanes=5
● ┊         948f71f                    base1                         lanes=2
```

This is topologically identical to `git log --graph --all` on the same repo. Three things it
proves: **octopus needs no special case** (⊛ opened two extra lanes in one row via the generic
`parentIds[1..n]` loop); **`origin/main` occupies its own lane** converging at the merge base,
which is exactly the ask-#1 picture; and the sequence is stable.

### 4.5 Lane stability under paging — the property Phase 14.5 actually demands

The algorithm is a left fold whose state is only the previous row's output, so **row *n*'s
lanes are a pure function of commits `0..n`**. Verified empirically rather than argued:

| Repo | Perturbation | Rows whose lane changed |
|---|---|---|
| getspecstory (932) | second page appended | **0 / 466** |
| getspecstory (932) | new commit lands at HEAD | **0 / 932** |
| gmux (62) | both of the above | **0 / 62** |

Zero drift, including the case where a fresh commit shifts every row down by one. This holds
under gmux's current "grow `limit`, refetch the whole window" paging, so that pattern can
stay. **The two things that would break it** and must be treated as invariants:

1. **The ref set must not change between pages.** Toggling "all refs" is a full relayout and a
   scroll-position reset, not an append. Resolve the ref set once, cache it with the page
   state (VS Code stores it as `historyItemsFilter`), and reuse it verbatim.
2. **The ordering flag must not change between pages**, for the same reason.

Layout cost is negligible either way: **0.7 ms for 752 rows, 1.3 ms for 932, 2.7 ms worst
case** — irrelevant beside the git process spawn.

---

## 5. The algorithm to implement

Data contract first, then the fold. This is specified tightly enough to write directly.

### 5.1 Types

```ts
/** A lane is a promise to render `sha` when the walk reaches it. */
interface Lane {
  /** The commit this column is waiting for. */
  sha: string;
  /** Palette slot or fixed role — see §7. */
  color: LaneColor;
}

interface GraphRow {
  entry: GitLogEntry;
  /** Lanes entering the row (= previous row's `out`). */
  in: readonly Lane[];
  /** Lanes leaving the row. */
  out: readonly Lane[];
  /** Column of this commit's dot. May equal `in.length` (a tip). */
  circle: number;
  /** Output columns this commit's extra parents were routed into. */
  mergeTargets: readonly number[];
  /** Lanes whose sha is not in the loaded window (§5.5). */
  openEnded: boolean;
}
```

`LaneColor` is a discriminated union, not a number — the role colours must survive the
rotation: `{ kind: 'role', role: 'local' | 'remote' | 'base' } | { kind: 'cycle', slot: 0..4 }`.

### 5.2 Data feed

```
git log -z --topo-order --decorate=full --stdin -n<limit+1> \
  --format=%H%x1f%h%x1f%P%x1f%D%x1f%an%x1f%ae%x1f%at%x1f%s
# stdin: one full refname per line
```

Changes from gmux's current `git log -z --max-count=N --format=LOG_FORMAT`:

- **`--topo-order`** — required. Without an ordering flag git's default reverse-chronological
  walk gives no guarantee that a parent follows all of its children (clock skew breaks it),
  and the fold's correctness rests on that guarantee. `--date-order` also provides it and
  costs the same (§9.1), but `--topo-order` additionally stops unrelated lines of history
  interleaving, which is what keeps the picture readable.
- **`--decorate=full` + `%D`** — pins refs by the walk instead of by SHA cross-reference, and
  brings tags along for free (the `HistorySection.tsx` header comment already flags missing
  tag badges as a known gap; this closes it).
- **`--stdin`** with the ref set on stdin — dodges argv limits at 129+ refs.
- Keep `%h` — gmux already surfaces short SHAs and git's abbreviation length is repo-dependent.

Parse `%D` per `historyProvider.ts:_resolveHistoryItemRefs`: skip `refs/remotes/origin/HEAD`;
`HEAD -> refs/heads/x` → current local; `refs/heads/x` → local; `refs/remotes/x` → remote;
`refs/tags/x` → tag.

### 5.3 The fold

```ts
function layout(entries: GitLogEntry[], roleOf: (e) => LaneColor | undefined): GraphRow[] {
  const rows: GraphRow[] = [];
  let cycle = -1;
  const nextCycle = (): LaneColor =>
    ({ kind: 'cycle', slot: (cycle = (cycle + 1) % CYCLE_LENGTH) });

  for (const e of entries) {
    const inLanes = rows.at(-1)?.out ?? [];
    const out: Lane[] = [];
    let circle = -1;

    // 1. Walk the input lanes, preserving column order.
    //    FIX vs VS Code: no `parentIds.length > 0` guard (§4.3).
    for (let i = 0; i < inLanes.length; i++) {
      if (inLanes[i].sha !== e.hash) { out.push(inLanes[i]); continue; }
      if (circle === -1) {
        circle = i;                                   // first match owns the dot
        if (e.parents.length > 0) {
          out.push({ sha: e.parents[0], color: roleOf(e) ?? inLanes[i].color });
        }                                             // root: lane simply ends
      }
      // later matches are children converging here — their columns close
    }

    // 2. Nothing awaited it → a branch tip entering the window; open a lane.
    if (circle === -1) {
      circle = out.length;
      if (e.parents.length > 0) {
        out.push({ sha: e.parents[0], color: roleOf(e) ?? nextCycle() });
      }
    }

    // 3. Extra parents (merge / octopus — generic in n).
    const mergeTargets: number[] = [];
    for (let p = 1; p < e.parents.length; p++) {
      const sha = e.parents[p];
      const existing = out.findIndex((l) => l.sha === sha);   // FIX: dedupe (§4.3)
      if (existing !== -1) { mergeTargets.push(existing); continue; }
      mergeTargets.push(out.length);
      out.push({ sha, color: roleForParent(sha) ?? nextCycle() });
    }

    rows.push({ entry: e, in: inLanes, out, circle, mergeTargets, openEnded: false });
  }
  return rows;
}
```

Complexity is `O(rows × lanes)` with tiny constants — 1.3 ms for 932 rows measured. The
`findIndex` calls are over an array whose length is the lane count (≤ 48 observed, ≤ 8 after
the §8 cap), so they are not worth indexing.

### 5.4 Colour cycling rule (independent of git-graph's implementation)

VS Code rotates blindly, so two adjacent lanes can land on the same slot. Reuse-on-free is
strictly better and is trivial to derive: keep `lastUsedRow: number[]` indexed by slot; when
opening a lane pick the slot whose `lastUsedRow` is furthest in the past *and* not currently
live in `out`; update `lastUsedRow[slot] = rowIndex` whenever a lane in that slot is live.

Two hard rules, both from DESIGN.md:

- **Role colours are never handed out by the cycler.** The HEAD branch's lane, the upstream's
  lane and the merge-base lane get fixed colours (§7) so the divergence reading is stable.
- **Colour never encodes state.** DESIGN.md §1.3 reserves colour for session status; lane
  colour is *identity only*, and merge-ness / HEAD-ness are carried by dot shape as in §1.4.

### 5.5 Parents outside the loaded window

A lane whose `sha` never arrives simply stays in `out` forever — the fold needs no special
case. Rendering does:

- Compute `loaded = new Set(entries.map(e => e.hash))` once per page.
- The **load-more row** draws every lane in the last row's `out` as a plain vertical line, per
  `renderSCMHistoryGraphPlaceholder`. This is what makes the graph read as *continuing* rather
  than severed, and it is cheap.
- When `hasMore === false` (the walk is genuinely exhausted) and lanes remain open, those
  lanes point at commits excluded by the *ref filter*, not by the page limit. Fade the final
  8 px of those strokes to transparent rather than drawing a hard stop; a hard stop reads as
  "this branch ends here", which is a lie.

### 5.6 Divergence rows (ask #1)

Follow §1.6, but note the ordering trap: the pseudo-rows must be spliced **after** the fold,
because their lane colours are copied from real neighbouring rows. Preconditions, all of which
gmux can already answer: HEAD's branch has an upstream; `merge-base HEAD @{u}` resolves; the
merge base is inside the loaded window; and the remote tip is inside the window (which
requires §6.2). Skip silently when any fails — a partial divergence drawing is worse than
none. Reuse the existing `ahead`/`behind` from `GitBranchInfo` for the row labels rather than
recounting.

---

## 6. Ask #1 is blocked in gmux's data layer

Three concrete blockers, each small.

### 6.1 The remote pill is suppressed exactly when it matters

`src/renderer/scm/HistorySection.tsx:80` —

```ts
if (b.upstream !== undefined && b.upstreamGone !== true && b.ahead === 0 && b.behind === 0) {
  badges.push({ kind: 'remote', name: b.upstream, head: false });
}
```

The `origin/main` pill renders **only when local and remote are identical**, i.e. when it adds
nothing, and is hidden whenever there is a divergence to communicate. Even with the guard
removed it would land on the wrong row, because the badge is attached to the *local* branch's
SHA. Correct source: the remote ref's own SHA (already available as
`GitRemoteBranchInfo.sha` via `git:remoteBranches`, loaded into `RepoDepthState.remoteBranches`
at `depth.ts:283–288` and currently consumed only by `BranchesView.tsx:107`), or better, `%D`
per §5.2.

### 6.2 The log cannot see commits you do not have merged

`src/main/git/service.ts:166` —

```ts
async log(maxCount = 200) {
  const r = await runGit(this.repoPath, [
    'log', '-z', `--max-count=${maxCount}`, `--format=${LOG_FORMAT}`
  ]);
```

No revision arguments means an implicit `HEAD` walk. If you are **behind** origin, the
incoming commits are not in `entries` at all, so no renderer change can show them. This is the
single change that unlocks ask #1: add the ref set (§5.2). It is also what makes `origin/main`
a *lane* rather than a floating pill.

### 6.3 "Up to date" against a stale remote ref

BACKLOG's honesty requirement. `RepoDepthState.lastFetchedAt` (`.git/FETCH_HEAD` mtime) is
already plumbed through `git:remoteBranches`. The graph must not imply freshness it does not
have: when `lastFetchedAt` is older than ~1 hour, the divergence affordance should read
"as of 3h ago" rather than a bare "up to date". No new plumbing needed.

---

## 7. Colours from DESIGN.md tokens

Constraint: gmux is dark-only, and the graph sits on `--bg-sidebar #17181C`, `--bg-raised
#22252B` (hover) and `--bg-active #2A2E36` (selected row). A 1–2 px stroke is non-text UI, so
WCAG 1.4.11 asks **3:1 against the background** — and the *selected row* is the worst case,
which is easy to forget because it is the state you least often screenshot.

All values below were computed, not eyeballed: WCAG contrast against all three backgrounds,
and Viénot-style dichromat simulation (protanopia / deuteranopia) with RGB separation
distances between every pair.

### 7.1 The reference palette does not survive gmux's background

VS Code's `colorRegistry` is the IBM colourblind-safe five: `#FFB000 #DC267F #994F00 #40B0A6
#B66DFF`. Separation is excellent (worst protan/deutan pair distance **56**). Contrast is not:

| | on `--bg-sidebar` | on `--bg-active` |
|---|---|---|
| `#FFB000` | 9.7 | 7.4 |
| `#DC267F` | 3.9 | **3.0** (borderline) |
| `#994F00` | 2.9 | **2.25 — fails** |
| `#40B0A6` | 6.7 | 5.2 |
| `#B66DFF` | 5.6 | 4.3 |

`#994F00` is a dark brown chosen to also work on VS Code's light themes; on a dark-only ground
it is unusable. Adopting the palette verbatim would ship a failing lane colour.

### 7.2 The naive "just use the terminal palette" also fails

DESIGN.md §1.6's ANSI bright set clears contrast comfortably but collapses under CVD: `yellow
#F0C674` / `green #85D488` are **20** apart under protanopia and `blue #8FC7FF` / `magenta
#D19FE8` are **27** apart under deuteranopia — both confusable.

### 7.3 Recommended: five rotating hues, drawn from DESIGN.md §1.6

```css
--graph-lane-1: #56C2C0;  /* terminal cyan    */
--graph-lane-2: #E8629C;  /* pink — the one new hue, see below */
--graph-lane-3: #E2B340;  /* = --git-modified */
--graph-lane-4: #85D488;  /* terminal brGreen */
--graph-lane-5: #C583D8;  /* terminal magenta */
```

Measured: **minimum contrast 4.32 on the selected row** (all five pass 3:1 on all three
backgrounds), **minimum protan/deutan pair separation 32** — the best of the candidate sets
tested, and the only one that passes contrast outright. Four of the five are existing tokens;
`#E8629C` is the single new value, needed because every in-palette alternative collapsed
against another lane hue.

Honest caveat: 32 is "acceptable", not "good" — no five-hue set on a ground this dark clears
both tests handsomely, which is why VS Code trades contrast away to win separation. This is
survivable *only* because DESIGN.md already forbids colour-alone signalling: lane identity is
also carried by column position, by the ref pill, and by dot shape. Do not add a sixth hue;
past five, cycle.

### 7.4 Role colours, and a place gmux can beat the reference

```css
--graph-local:  var(--accent);  /* #4D9DE8 — HEAD's branch lane */
--graph-remote: #E8629C;        /* upstream lane                */
--graph-base:   #F0883E;        /* = --git-conflict, merge base */
```

VS Code pairs local **blue** with remote **purple** (`chartsBlue`/`chartsPurple`). Measured
against gmux's accent, that family separates by only **21 (protan) / 27 (deutan)** — the two
lanes whose distinction *is the entire feature* are the ones a red-green colourblind user
cannot tell apart. Candidates measured against `--accent #4D9DE8`:

| Remote candidate | contrast (selected row) | protan sep | deutan sep | |
|---|---|---|---|---|
| `#C583D8` terminal magenta | 4.93 | 21 | 27 | weak |
| `#B98CFF` violet (VS Code-like) | 5.35 | 24 | 31 | weak |
| `#56C2C0` terminal cyan | 6.40 | 64 | 60 | good |
| **`#E8629C` pink** | **4.32** | **85** | **83** | **good** |
| `#E2B340` amber | 6.97 | 174 | 190 | good, but see below |

`#E8629C` wins. Amber and orange separate even better but are disqualified: `#E2B340` is
`--git-modified` and adjacent to `--status-attention #F5B84A`, the loudest colour in the app
and reserved for "needs input" — spending it on a lane would be the single worst possible
token choice in gmux. Note `--graph-remote` and `--graph-lane-2` are deliberately the same
value: when an upstream lane is on screen its pink is *the* remote lane, so the cycler must
skip slot 2 while a remote role lane is live.

---

## 8. Degrading in a ~300 px pane

BACKLOG requires graceful degradation, not clipping. At an 11 px pitch, gmux's 280 px sidebar
can spend roughly 88 px (8 lanes) before the subject line stops being readable — the current
row already spends 20 px on the rail plus 12 px on the chevron.

- **Pitch 10 px, not 11.** gmux rows are 24 px (`.scm-hrow`), not VS Code's 22, so the aspect
  is slightly taller; 10 px keeps dots from looking sparse and buys a lane inside the same
  width. Dot radius 4, stroke 1.5.
- **Cap at 6 visible lanes (60 px), hard-cap 8.** Beyond the cap, collapse the overflow into a
  single "bundled" column drawn as a 2 px double stroke in `--text-muted` with a `+n` count on
  hover. This is a *rendering* cap only — the fold keeps full fidelity, so uncapping is a
  re-render, not a relayout, and lane stability is unaffected.
- **Never widen the gutter dynamically per page.** Width must be a function of the cap, not of
  the current maximum, or every "Load 50 more" reflows the subject column and the whole list
  jumps. Fix the gutter at `cap × 10 + 10` px from first paint.
- **The dot column is what must stay visible.** If `circle >= cap`, render the dot at the cap
  boundary with the bundled marker behind it rather than dropping it.

---

## 9. Performance

### 9.1 The commit-graph cliff — the most actionable perf finding here

Measured on the 130 622-commit vscode clone, `-n50`, best of three:

| Invocation | Time |
|---|---|
| gmux's current `git log` (no ordering flag) | **0.01 s** |
| `--date-order` | 0.53 s |
| `--topo-order` | 0.53 s |
| `--author-date-order` | 0.55 s |
| `--topo-order` + all 1564 refs via `--stdin` | 0.60 s |

Any ordering flag forces a full history walk to compute in-degrees, and `-n50` cannot stop it
early. **This would make the SCM history feel broken on a large repo.**

The fix is the commit-graph file. Verified end to end in an isolated `--shared` clone so no
repo on this machine was mutated:

| | Time |
|---|---|
| `--topo-order -n50` before | 0.53 s |
| `git commit-graph write --reachable` (one-off) | 0.63 s, 8.1 MB |
| `--topo-order -n50` after | **0.01 s** |
| `--topo-order -n500` after | **0.01 s** |

**53× faster, and topo-order becomes as cheap as no ordering at all.** Recommended handling:
probe `.git/objects/info/commit-graph` (and `commit-graph-chain`) when a repo is first opened;
if absent and `rev-list --count HEAD` exceeds ~20 000, run
`git commit-graph write --reachable --split` once in the background. It writes only into
`.git/objects/info/` and changes no history — but it *is* a write to the user's repo, so it
needs an explicit product decision, and the honest alternative is to fall back to no ordering
flag on large graph-less repos and accept occasional clock-skew artefacts. Many repos will
already have one: `git gc` writes it by default (`gc.writeCommitGraph`) since git 2.24. Neither
gmux nor the vscode clone had one; getspecstory is small enough not to care.

Also worth adopting from `06-git-components.md` §1.1, already established for gmux: set
`GIT_OPTIONAL_LOCKS=0` on the log spawn so a background graph refresh never contends with an
agent's foreground git.

### 9.2 Virtualization

BACKLOG says virtualization "stays". It does not currently exist: `HistorySection.tsx:745`
renders `entries.map(renderCommitRow)` into a plain scroller, and there is no virtualization
package in `package.json`. That is fine at 50 rows and fine today at 24 px flat rows, but the
graph changes the arithmetic: at the measured average of ~7 lanes each row's SVG carries
roughly 8–9 elements, so 200 rows ≈ 1 700 extra DOM nodes and 1 000 rows ≈ 8 500.

Recommendation: keep the plain scroller for now — the per-row SVG design deliberately makes
adding virtualization later a drop-in, because rows are independent and the height is constant
— but **fix the row height in CSS as a constant and derive the SVG height from the same
token**, so the day a windowing layer is added it needs no measurement pass. Revisit at the
first sign of jank past ~400 rows.

---

## 10. Verification plan

Phase 14.5 sets Tier 3-style evidence for topology. Concretely:

1. **Ground-truth diff.** For `getspecstory` at windows 50 / 200 / 752 and for the synthetic
   divergence repo, assert the port's `(row, circle, mergeTargets)` against
   `git log --graph --oneline --topo-order` parsed from git's own prefix columns. Structure
   must match exactly; lane *count* may exceed git's by the §4.2 gap and that is expected —
   assert on structure, and regression-test the count with a ceiling.
2. **Stability harness.** Assert 0 lane changes for (a) appending a page and (b) prepending a
   commit at HEAD, on both repos. These are the assertions that protect the user-visible
   promise, and they are cheap enough to run on every commit.
3. **Octopus + root + off-window.** Keep the §4.4 synthetic repo as a fixture: a 3-parent
   merge, a root commit, and a window deliberately truncated mid-branch so lanes stay open.
4. **Colour.** Unit-test the contrast and CVD-separation numbers in §7 so a future palette
   tweak cannot silently ship a failing lane colour.
5. **No regressions.** Hover card, native context menu, copy-SHA, click-to-expand and the
   `source: 'history'` open-file bus all stay — the graph replaces `.scm-hrail` only.

---

## Sources

All fetched or executed 2026-08-11.

- [microsoft/vscode — `scmHistory.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/scm/browser/scmHistory.ts) (MIT; last changed `25c94ab342`, 2025-12-08)
- [microsoft/vscode — `scmHistoryViewPane.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/scm/browser/scmHistoryViewPane.ts)
- [microsoft/vscode — `common/history.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/scm/common/history.ts)
- [microsoft/vscode — `extensions/git/src/historyProvider.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/historyProvider.ts)
- [microsoft/vscode — `extensions/git/src/git.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/src/git.ts)
- [microsoft/vscode — `scm.contribution.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/scm/browser/scm.contribution.ts) (`scm.graph.*` settings)
- [microsoft/vscode — LICENSE.txt](https://raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt) (MIT)
- [mhutchie/vscode-git-graph — `web/graph.ts`](https://raw.githubusercontent.com/mhutchie/vscode-git-graph/develop/web/graph.ts)
- [mhutchie/vscode-git-graph — LICENSE](https://raw.githubusercontent.com/mhutchie/vscode-git-graph/develop/LICENSE) (**not** MIT — no derivative-work rights)
- [mhutchie/vscode-git-graph — repo metadata](https://github.com/mhutchie/vscode-git-graph) (GitHub API: last release v1.30.0 2021-04-05, last commit 2021-09-19, 325 open issues)
- [nicoespeon/gitgraph.js](https://github.com/nicoespeon/gitgraph.js) (archived July 2024; authoring API only)
- npm registry: [`@gitgraph/js`](https://registry.npmjs.org/@gitgraph%2fjs), [`@gitgraph/core`](https://registry.npmjs.org/@gitgraph%2fcore), [`gitgraph.js`](https://registry.npmjs.org/gitgraph.js) (deprecated), [`d3-dag`](https://registry.npmjs.org/d3-dag)
- Local measurement: `/Users/gdc/getspecstory`, `/Users/gdc/gmux`, `/Users/gdc/vscode`, and a synthetic divergence/octopus repo; git 2.50.1, Node 22.23.1, VS Code 1.131.0.
