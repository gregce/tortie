# 24 · Git graph — Dimension 3: visual design in gmux's system

Phase 14.5 (BACKLOG). Scope: how the multi-lane graph and the local/origin
divergence **look and behave** inside gmux's token system, at 400px and at
300px and at the 220px sidebar minimum. Companion to the algorithm/data
dimensions. Everything below is expressed in token names and pixels.

Written 2026-08-11. Every colour number here was measured, not estimated —
the scripts are in the session scratchpad and the method is stated inline.
Sources: `DESIGN.md` §1–§5, `docs/DESIGN-SPEC.md` S3A/S3C/S12,
`docs/ZEN-OF-TORTIE.md`, `src/renderer/scm/HistorySection.tsx`,
`src/renderer/scm/scm.css` L565–800, `src/renderer/styles/tokens.css`.

---

## 0. The two asks, and the one precondition

| Ask | Reference | Verdict |
|---|---|---|
| 1. Divergence local ↔ origin, ref pills pinned to their commits | media_0Vi1Ch95fr | Solved by **ref placement + a dot-fill rule**. Needs no new shapes. |
| 2. Real multi-lane topology, colour carrying lane identity | media_ZqhpfGRGSk | Solved by a **6-colour ramp + a 12px-pitch SVG gutter**. |

**The precondition, and it is load-bearing:** today's source is
`git log --topo-order -n 50` from HEAD (DESIGN-SPEC S3A). A commit that is on
`origin/main` but not on `main` is *not returned by that command*. No amount
of drawing can show a divergence whose commits were never fetched into the
list. Ask #1 is a **log-scope** problem before it is a rendering problem.

The History section must load from a **ref set**, not from HEAD:

| Scope (persisted per repo) | git args | Purpose |
|---|---|---|
| **Current branch and its remote** (default) | `HEAD @{u}` | Exactly the reference screenshot #1 picture |
| All local branches | `--branches` | Your worktrees and side branches |
| All refs | `--branches --remotes` | Reference screenshot #2 picture |

Measured on `/Users/gdc/getspecstory` (2026-08-11), all three scopes at
`-n 50` — with `--parents --decorate=full` for the topology and the pills —
return in **15–20 ms**. This is not a performance decision.

---

## 1. Measured ground truth (this is what sizes the design)

### 1.1 Lane census — how many lanes actually happen

Classic gitk/VS Code column algorithm, run over the real repos on this
machine. "Active lanes" = columns carrying a line through or into a row.

| Repo | Scope | Rows | Merges | Max lanes | p95 |
|---|---|---|---|---|---|
| `gmux` | HEAD, entire history | 62 | 0 (0%) | **1** | 1 |
| `getspecstory` | HEAD, 50 | 50 | 5 (10%) | **5** | 4 |
| `getspecstory` | HEAD + upstream, 50 | 50 | 5 | **5** | 4 |
| `getspecstory` | all branches + remotes, 50 | 50 | — | **5** | 5 |
| `getspecstory` | all **local** branches, 50 | 50 | — | **9** | 8 |
| `getspecstory` | HEAD, 752 | 752 | 143 (19%) | **12** | 10 |

Read this three ways:

1. **gmux's own history is one lane, forever.** The graph must cost that case
   nothing — see §3.2, where a 1-lane gutter is pixel-identical to the rail
   shipped today.
2. **The default scope fits in ≤6 lanes even in the messiest repo here.** 94%
   of `getspecstory`'s default window is ≤4 lanes; 100% is ≤5.
3. **"All local branches" is where it blows past 6** (9 lanes). That is the
   scope a user opts into, and it is exactly where the cycling rule (§2.4)
   and the bundle column (§3.5) have to work.

### 1.2 Ref census — what commits actually carry

`getspecstory`, last 60 commits: 7 rows carry refs. The HEAD commit carries
**five**: `HEAD -> refs/heads/dev`, `tag: refs/tags/v2.8.0`,
`refs/remotes/specstoryai/dev`, `refs/remotes/specstoryai/HEAD`,
`refs/remotes/origin/dev`. Other findings:

- **Two remotes** (`origin` and `specstoryai`) — a bare `cloud` glyph cannot
  distinguish them.
- `refs/remotes/*/HEAD` is symbolic noise and must be filtered.
- One commit carries **four** worktree branches (`worktree-wf_d91bd193-266-1…4`).
- One commit carries **two tags** (`v2.7.0`, `specstory-cli/v2.7.0`).
- Longest local name **29 chars**, longest remote **65 chars**
  (`specstoryai/dependabot/github_actions/github/codeql-action-4.37.3`).

Consequence: the shipped "max 2 pills + `+n`, sorted head→local→remote
alphabetically" rule would hide `origin/dev` behind `+3` on the one commit
where divergence matters most. §4.3 fixes the ordering.

### 1.3 Palette measurements

WCAG 2.1 relative-luminance ratios; CIEDE2000 for hue separation; Viénot
1999 matrices for the CVD simulation.

**VS Code 1.131.0's shipped swimlane palette, measured on gmux's surfaces**
(extracted live from `/Applications/Visual Studio Code.app/.../workbench.desktop.main.js`):

| VS Code token | hex | on `--bg-sidebar` | on `--bg-active` | ΔE2000 vs our `--status-attention` |
|---|---|---|---|---|
| `scmGraph.foreground1` | `#FFB000` | 9.68 | 7.43 | **4.9** |
| `scmGraph.foreground2` | `#DC267F` | 3.91 | **3.00** | 56.7 |
| `scmGraph.foreground3` | `#994F00` | **2.93** | **2.25** | 34.3 |
| `scmGraph.foreground4` | `#40B0A6` | 6.74 | 5.17 | 40.5 |
| `scmGraph.foreground5` | `#B66DFF` | 5.59 | 4.29 | 62.9 |

Adopting it wholesale is not merely off-brand, it is **measurably broken on
gmux's ground**: `foreground3` fails the 3:1 WCAG 1.4.11 non-text floor on
both `--bg-sidebar` and `--bg-active`, `foreground2` sits exactly on the floor
with zero margin, and `foreground1` is ΔE 4.9 from our attention amber — i.e.
it *is* the "needs you" colour. This is the concrete evidence for the
constraint "our colour scheme, not a library's defaults."

---

## 2. Lane colour

### 2.1 How many distinct lane colours the palette supports: **six**

Search space: every chromatic colour gmux already owns — `--accent` family
(§1.2), git decorations (§1.4), feedback (§1.5), and the sixteen-entry xterm
palette (§1.6). Filters applied: ≥3:1 on `--bg-active` (the worst row
background), and ≥ΔE2000 15 from `--status-attention` `#F5B84A`. Fourteen
survivors. Objective: maximise the minimum pairwise ΔE2000, with lane 0
pinned to `--accent`.

| Ramp size | Min pairwise ΔE2000 |
|---|---|
| 4 | 31.7 |
| 5 | 24.1 |
| **6** | **19.5** |
| 7 | 12.2 ← two blues collide |
| 8 | 7.1 ← collapse |

There is a cliff between 6 and 7. **Six is the answer, and it is a measured
answer, not a taste one.**

Two colours are disqualified outright and must never appear as a lane:
`--git-modified` `#E2B340` is **ΔE2000 4.5** from the attention amber, and
terminal `brYellow` `#F0C674` is **6.0**. A yellow lane in the sidebar reads
as "needs you." **There is no yellow lane.**

### 2.2 The ramp

Ordered so that **consecutive** lane indices are maximally separated — those
are the columns that physically sit side by side. Minimum neighbour
separation, including the L6→L1 wrap: **ΔE2000 42.5**.

| Lane index | Token | Source | hex | `--bg-sidebar` | `--bg-raised` | `--bg-active` | ΔE to next |
|---|---|---|---|---|---|---|---|
| 0 | `--graph-lane-1` | `var(--accent)` | `#4D9DE8` | 6.17 | 5.34 | 4.73 | 45.4 |
| 1 | `--graph-lane-2` | `var(--git-deleted)` | `#E5655E` | 5.37 | 4.65 | 4.12 | 54.2 |
| 2 | `--graph-lane-3` | xterm `cyan` §1.6 | `#56C2C0` | 8.34 | 7.22 | 6.40 | 46.5 |
| 3 | `--graph-lane-4` | `var(--git-conflict)` | `#F0883E` | 7.01 | 6.07 | 5.38 | 42.5 |
| 4 | `--graph-lane-5` | xterm `brMagenta` §1.6 | `#D19FE8` | 8.31 | 7.19 | 6.38 | 46.2 |
| 5 | `--graph-lane-6` | `var(--git-added)` | `#6BC46D` | 8.23 | 7.12 | 6.32 | 49.6 (wrap) |

Every entry clears **4.1:1 on the worst surface** — well past the 3:1
graphical floor, and past 4.5:1 on the sidebar itself. The weakest global
pair is red↔orange at ΔE 19.5, and they are **two indices apart**, so they
only ever sit adjacent if a column between them is empty.

Why this reads as gmux and not as a chart library: it is the terminal
palette's chromatic wheel with two substitutions — blue → `--accent` (so
lane 0 is the colour HEAD's dot already wears), and yellow → `--git-conflict`
(because yellow belongs to attention). Three of the six are literally §1.4
git-decoration tokens. Lane colour is **git state**, which is the category
§1.4 already exists to serve; it is not the §1.2 accent being spent on
decoration and it is not the §1.3 status vocabulary.

### 2.3 Where lane 0 comes from (stability guarantee)

Seed the walk at HEAD. **Lane 0 is claimed by HEAD's commit and inherited by
its first parent forever.** The current branch's spine is always the leftmost
column and always `--graph-lane-1`. A branch keeps its column for its whole
life; a column is freed only when its lane ends, and a freed column is reused
only by a *new* lane. **No lane ever shifts column mid-list** — this is a
visual requirement that constrains the algorithm, and it is what satisfies
BACKLOG's "lanes must not reshuffle under the user's eyes as they scroll."

### 2.4 Cycling rule

```
laneColour(i) = var(--graph-lane-{ (i mod 6) + 1 })
```

Colour follows the **column index**, not an allocation counter. Stateless,
deterministic, and — because a lane never changes column (§2.3) — a lane's
colour never changes either, including across "Load 50 more". Two columns
sharing a colour are necessarily 6 columns (72px) apart; they can never be
visually adjacent.

### 2.5 Colour is never the only signal — the other four channels

DESIGN.md's rule, and here it is not a formality: at 6 hues on a dark ground
the protanope-simulated minimum pair is ΔE **3.1** and the deuteranope
minimum is **6.5**. No 6-hue categorical ramp survives red-green CVD. So
colour is the *convenience* channel and these four carry the load:

1. **Column position** — the primary channel, and it is free. A lane *is* an
   x coordinate. Two lanes at different x are distinguishable with no colour
   perception at all. Because lanes never shift column (§2.3), position alone
   is a complete identity.
2. **The ref pill** — names the lane in words at its tip (§4).
3. **Lane emphasis on gutter hover** (§3.6) — pointing at the gutter raises
   one lane to full opacity and drops every other to `.45`. This is the
   channel that lets *anyone* trace a lane across a merge.
4. **Dot fill** — grey vs coloured encodes "shared vs yours alone" (§5.2),
   and hollow vs solid encodes merge (already shipped).

---

## 3. Geometry: the graph gutter

### 3.1 Constants

| Constant | Value | Rationale |
|---|---|---|
| Row height | **24px — unchanged** | Keeps the 4px grid, the inline file rows, the keyboard scroll maths and the S3A section budget untouched. VS Code uses 22; we do not follow it there. |
| Lane pitch | **12px** | On-grid (§1.7). 8px dot + 4px clear. VS Code uses 11px off-grid. |
| Lane 0 centre | **x = 10px** | Exactly today's `.scm-hrail` centre (20px column). |
| Dot | **8px Ø** | Unchanged; equals VS Code's `CIRCLE_RADIUS = 4`. |
| Merge dot ring | **1.5px**, fill = row background | Unchanged from the shipped rail. |
| Lane stroke | **2px** | Centred on an integer x → lands on pixel boundaries, crisp at 1x and 2x. A 1.5px stroke would straddle and blur. Matches VS Code's `CIRCLE_STROKE_WIDTH = 2`; 1:4 stroke:dot ratio. |
| Corner radius | **5px** | Fits inside both the 12px pitch and the 12px half-row. Same as VS Code's `SWIMLANE_CURVE_RADIUS`. |
| Dot centre y | **12px** (row mid) | — |

New tokens: `--graph-lane-1…6`, `--graph-lane-w`, `--graph-lane-pitch`,
`--graph-lane-x0`, `--graph-dot`, `--graph-dot-ring`, `--graph-curve-r`,
`--graph-bundle`. Full block in §8.

### 3.2 Gutter width

```
gutterWidth = 20 + (lanes − 1) × 12
```

| lanes | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| gutter | **20** | 32 | 44 | 56 | 68 | 80 |

At one lane this is **20px — byte-identical to the rail shipped today**. A
linear repo (gmux: 100% of its 62 commits) gets zero visual change and zero
regression surface. The graph only costs width when there is topology to
show. That is Zen-of-Tortie §"Hide the machinery": the stronger the machinery,
the quieter the product should feel.

**One gutter width for the whole loaded window**, computed from that window's
maximum lane count — *not* per row. VS Code sizes its SVG per row, which makes
every message start at a different x; at 24px density that jitter is worse
than the width it saves. Message text must align in a column.

When "Load 50 more" raises the maximum, the gutter widens with a `width`
transition over `--dur-base` `--ease-out` (a reveal, per §5); instant under
`prefers-reduced-motion`.

### 3.3 The path vocabulary — three shapes, no more

Lane centre `xᵢ = 10 + 12i`. Row is 24 tall, dot at y = 12, `r = 5`.

| Shape | `d` | When |
|---|---|---|
| **Pass-through** | `M x 0 V 24` | lane crosses this row untouched |
| **Half-lane, upper** | `M x 0 V 12` | lane arrives at this commit's dot |
| **Half-lane, lower** | `M x 12 V 24` | first parent continues in this lane |
| **Elbow down** (merge-in) | `M xᵢ 12 H xⱼ∓r A r r 0 0 s xⱼ 17 V 24` | 2nd+ parent lives in lane j |
| **Elbow up** (branch-out) | `M xᵢ 12 H xⱼ∓r A r r 0 0 s xⱼ 7 V 0` | a child of this commit lives in lane j |

Because §2.3 forbids mid-list column shifts, there is no S-curve case. An
octopus merge draws one elbow-down per extra parent from the same dot.

**Row-edge continuity.** Every 24px row in the list — including the inline
**file-expansion rows** and the **"Load 50 more"** row — renders the gutter
with all live lanes as pass-throughs (no dot). This fixes an existing defect:
today `.scm-hfile` has `padding-left: 32px` and no rail at all, so expanding
a commit visually severs the spine.

**Window edges.** Parent outside the loaded window → the line runs to y = 24
and the list edge says the rest. A true root (zero parents) → the line stops
at y = 12. Both are truthful; neither needs an extra glyph.

### 3.4 Responsive tiers

Row budget, right of the gutter:
`chevron 12 + gaps 12 + message + age 28 + padding-right 8` = **60px fixed**.
Message floor **96px** (≈15 characters at 12px SF Pro Text).

```
maxDrawnLanes = clamp( 1, floor((W − 156 − 20) / 12) + 1, 6 )
```

| Sidebar W | Content W | Max drawn lanes | Note |
|---|---|---|---|
| 400 (max) | 400 | **6** | ramp-limited, not width-limited |
| 300 | 300 | **6** | ramp-limited |
| 280 (default) | 280 | **6** | ramp-limited |
| 272 | 272 | 6 | the break-even point |
| 240 | 240 | 5 | |
| 220 (min) | 220 | **4** | width-limited |

The pitch never shrinks and the dot never shrinks. Degradation happens by
folding lanes (§3.5) and by shedding row content in a declared order (§6.2),
never by making the graph smaller and mushier.

### 3.5 The bundle column (more lanes than fit)

Lanes with index ≥ `maxDrawnLanes − 1` share the last drawable column.

- Its vertical line draws at **2px `--graph-bundle`** (= `--text-muted`,
  3.88:1 on `--bg-active`) — colourless and slightly heavier, so it reads as
  "several branches in here" rather than as a seventh hue.
- A commit landing in a folded lane still draws **its own dot in its own
  ramp colour** in that column, so identity survives.
- Such a row's `aria-label` and `title` gain `", off-graph branch"`.

This is the only clipping the design permits, and it is announced rather than
silent.

### 3.6 Lane emphasis

Pointer over the **gutter** (not the whole row — DESIGN.md §5 forbids hover
theatrics, and a full-row trigger would strobe the list on every mouse
traverse): the hovered lane's paths hold `opacity: 1`, all other lanes go to
`opacity: .45` over `--dur-fast` `--ease-out`. Pure CSS via a class on the
list root plus `data-lane` on each path — no React re-render. Pointer over the
message area = ordinary `--bg-raised` row hover, nothing else.

### 3.7 SVG, not canvas — and the reasoning

Verified: **VS Code 1.131.0 ships SVG** for its Source Control Graph
(`scmHistory.ts`: `SWIMLANE_HEIGHT = 22`, `SWIMLANE_WIDTH = 11`,
`CIRCLE_RADIUS = 4`, `CIRCLE_STROKE_WIDTH = 2`, `SWIMLANE_CURVE_RADIUS = 5`).
Independently, for gmux:

1. **Tokens.** `stroke="var(--graph-lane-3)"` reads the custom property
   directly. Canvas needs `getComputedStyle` plus a manual repaint hook, and
   DESIGN.md §0 commits to adding a light theme later — SVG gets the theme
   swap free.
2. **Volume is trivial.** 50 rows per page, ≈4 path nodes per row. Even 500
   loaded rows is ~3,000 nodes. Canvas only starts winning in the tens of
   thousands.
3. **Interaction is CSS.** Lane emphasis (§3.6), `prefers-reduced-motion`,
   and `forced-colors` all work on SVG through the stylesheet. On canvas,
   lane hover means repainting the gutter on every pointer move.
4. **No hit-testing needed.** The row is the hit target; canvas's one real
   advantage does not apply.
5. **DPR.** This is a laptop-plus-external-monitor app. SVG is
   resolution-independent; canvas needs a DPR-scaled backing store and a
   re-scale on display change.

**One `<svg>` per row**, inline in the row element, `width = gutterWidth`,
`height = 24`, `shape-rendering="geometricPrecision"`, `aria-hidden="true"`,
`pointer-events` enabled on the wrapper only (so §3.6 works while the row's
own `onMouseEnter` / `onContextMenu` still fire — the SVG is a child of the
row div, so both bubble).

### 3.8 Virtualization

Not virtualized today (the tree and the diff are; the history list is not —
it renders all 50×N rows). Recommendation: **stay unvirtualized until the
loaded window exceeds 400 rows**, then virtualize on a fixed 24px row height,
which is exact and trivial. The section is height-capped (S3A: weight 2 of the
post-Changes remainder, min 120px), so only ~5–25 rows are ever on screen.

The constraint virtualization imposes, and it must hold from day one:
**lane layout is computed for the entire loaded window up front**, as a pure
function of the log, producing a per-row descriptor (`lane`, `paths[]`,
`dot`, `bundled`). Any row must be renderable in isolation with no knowledge
of its neighbours. This is also what makes §3.2's single gutter width and
§2.3's stability guarantee cheap.

---

## 4. Ref badges

### 4.1 The four pill types

Measured first, because it changes the shipped spec: **fill and border are
nearly invisible channels here.** `--bg-raised` on `--bg-sidebar` is
**1.16:1**; `--border-strong` on `--bg-sidebar` is **1.66:1**. Worse, the
shipped local-branch pill fills with `--bg-raised` — which on a hovered row
(also `--bg-raised`) is **1.00:1**: the pill's body disappears entirely. That
is a live defect this work should fix.

So the pill vocabulary is carried by **glyph + text colour + shape + weight**,
and `--bg-raised` is dropped as a pill fill.

| Pill | Icon (10px) | Text | Fill | Border | Radius | Weight |
|---|---|---|---|---|---|---|
| **HEAD branch** | `git-branch` | `--accent-text` (7.41:1 on the composited wash) | `--accent-wash` | none | `--r-sm` | **500** |
| **Local branch** | `git-branch` | `--text-secondary` (7.88 / 6.83 / 6.05) | none | 1px solid `--border-strong` | `--r-sm` | 400 |
| **Remote branch** | `cloud` | `--text-secondary`; the `remote/` prefix in `--text-muted`, stepping to `--text-secondary` on hover/selected | none | 1px **dashed** `--border-strong` | `--r-sm` | 400 |
| **Tag** | `tag` | `--text-secondary` | none | 1px solid `--border-strong` | `0 --r-sm --r-sm 0` | 400 |

Names in `--font-mono` at 10px/14. Icons are codicons — all four verified
present in `@vscode/codicons` 0.0.46-24 on disk.

Three non-colour channels separate local from remote: the glyph
(`git-branch` vs `cloud`), **solid vs dashed** border ("here" vs
"elsewhere"), and the dimmed remote prefix. The tag's asymmetric radius is a
flag shape — a fourth channel that survives greyscale and 10px icons. The
HEAD pill's weight 500 is its greyscale channel.

The `--text-muted` prefix step-up on hover is required, not cosmetic:
`--text-muted` is 5.05:1 on `--bg-sidebar` but **4.38:1 on `--bg-raised`** —
below 4.5. The row already does exactly this for `.scm-hauthor`.

Two remotes (`origin`, `specstoryai` — §1.2) are distinguished by the prefix
text itself, which is why the remote pill shows its prefix rather than hiding
the whole name in a tooltip the way the shipped spec does.

### 4.2 Filter — refs that must never render

`refs/remotes/*/HEAD` (symbolic noise, seen live in `getspecstory`),
`refs/stash`, `refs/notes/*`, `refs/pull/*`, `refs/prefetch/*`. Worktree
branches are real local branches and stay.

### 4.3 Priority order under truncation

The shipped alphabetical sort would push `origin/dev` behind `+3` on the one
commit where divergence matters. Order, highest first:

1. **HEAD's branch**
2. **HEAD's branch's upstream**
3. other local branches (alphabetical)
4. tags (reverse version order — newest first)
5. other remote branches (alphabetical)

Ranks 1 and 2 are the divergence story and **may never fall into `+n`**.

### 4.4 Truncation and narrow degradation

- **Middle-truncate** with a single `…`, matching the branch-menu button
  ("truncate middle", S3A). Branch names are hierarchical left-to-right;
  head-truncation would destroy `feat/`, `fix/`, `dependabot/` and
  tail-truncation destroys the distinguishing tail. Real names here run to 65
  characters.
- Pill `max-width: 96px` (as shipped). Full name in the pill `title` and in
  the row `aria-label`.
- **Pill count is width-derived, not fixed at 2**: lay pills out while the
  message column stays ≥96px; minimum 1, maximum 3. `+n` is shown whenever
  anything is hidden.
- **Below 260px content width** (container query — Chromium 150 in Electron
  43.3.0, verified on disk), pills lose their names and render **icon-only**
  as 16×16 squares, keeping glyph, border style and radius. The full ref list
  moves to the row tooltip and to the hover card.

### 4.5 The hover card gains a refs row

Between the stat line and the SHA row, a wrapping **refs line**: every ref on
the commit as a full-name pill, no truncation. This is where `+n` resolves
properly — today the overflow tooltip is a `\n`-joined `title` string, which
is a placeholder, unreachable by keyboard and unreadable by AT. Card geometry
(520px, `--bg-surface`, `--r-lg`, `--shadow-3`) is unchanged.

---

## 5. Divergence at a glance

### 5.1 The ref pills do the primary work

`main` on one commit and `origin/main` two rows below it, in the same lane,
*is* the sentence "you have two unpushed commits." That is precisely what the
reference screenshot communicates, and it needs no invented glyph. It only
needs (a) the log scope from §0 and (b) the priority order from §4.3 so the
upstream pill is never the one that gets hidden.

### 5.2 The dot-fill rule: coloured = yours alone

One rule, uniform across every lane:

> **A commit's dot is filled in its lane colour when the commit exists on no
> remote. Otherwise it is `--text-muted`.**

- Unpushed run on the current branch → a short stack of **coloured** dots
  above a long stack of **grey** dots, with `origin/main` pinned exactly at
  the boundary.
- Unpushed work on *any* branch lights up the same way. "Coloured dot = only
  on this machine" is a genuinely useful reading and it costs nothing.
- HEAD keeps `--accent`, which on lane 0 **is** `--graph-lane-1` — the two
  rules agree by construction, no special case.
- Merge dots stay hollow: 1.5px ring in the dot's colour, fill = the row
  background. Merge and sync-state compose without collision because one is
  shape and one is fill.

Data: one call, `git rev-list --branches --not --remotes -n 500`, returning a
`Set<sha>`. Measured at **20 ms** on `getspecstory` (which returns 0 — it is
fully pushed). No per-commit reachability queries.

### 5.3 Unpulled commits need no vocabulary at all

Once the log scope includes `@{u}`, commits on the remote that you do not have
are topologically a diverged branch off the merge-base. They land in **lane 1
with their own colour**, tipped by the `origin/main` pill, and their dots are
**grey** — because they *are* on a remote. They look like a branch you have
not merged, which is the literal truth. Nothing new is invented.

The one degenerate case — you are purely behind, zero local commits — puts
them above HEAD in lane 0, all grey, with `origin/main` at the top and `main`
below it. The pill order alone reads "one commit to pull."

### 5.4 Where the ahead/behind summary lives: **nowhere new**

The `[⟳ ↑2 ↓1]` sync control in the 36px view header (S3C) already owns the
number, and S3C's own reasoning — "a band that grows a verb per feature stops
being a band" — applies with equal force to the History section header. **Do
not duplicate the count.** The band owns the number; the list owns the
placement. The two are redundant channels for the same fact, which is the
point.

`gmux` itself currently has `main` with **no upstream**, so its History
renders one lane, all dots coloured (nothing is pushed), and the header shows
S3C's `[☁︎ Publish]` rather than a dead counter.

### 5.5 The scope control

The History section header gains one hover-revealed 20×20 accessory: codicon
`filter` 16, tooltip "Graph scope". Native menu, radio group, persisted per
repo:

```
✓ Current branch and its remote
  All local branches
  All refs
```

It belongs to the History section, not the view band — it changes what this
list shows, not what the repo does.

---

## 6. Row anatomy

### 6.1 Full anatomy, unchanged parts marked

```
┌ gutter (SVG, computed) ┬ chevron 12 ┬ message ┬ author ┬ ─── ┬ refs ┬ age 28 ┬ 8 ┐
│         NEW            │  shipped   │ shipped │shipped │     │ §4   │shipped │pad│
└────────────────────────┴────────────┴─────────┴────────┴─────┴──────┴────────┴───┘
                            row height 24px — unchanged
```

### 6.2 Declared shrink order (CSS flex, plus one container query)

| Element | Basis | `flex-shrink` | Min |
|---|---|---|---|
| gutter | computed | **0** | — |
| chevron | 12 | 0 | 12 |
| message | auto | 1 | **96** (48 on ref-carrying rows) |
| author | auto | 4 | 0 → hides |
| refs | auto | 2 | 16/pill (icon-only via container query <260px) |
| age | 28 | 3 | 0 → hides |

`min-width: 0` throughout. Age sheds first (it is in the hover card), then the
author (already `flex: 0 4 auto` today), then pill names, then the message.
Only 7 of `getspecstory`'s last 60 rows carry refs, so the message-poor case
is rare and, on exactly those rows, the ref *is* the more valuable content.

### 6.3 ASCII — wide (400px sidebar), divergence, ask #1

```
   x=10        gutter 20px  (one lane — identical to the shipped rail)
     │  ┌ chevron 12
     ▼  ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ●  ›  Wire the graph gutter into HistorySection    [⎇ main]     2m  │ 24
   │  │                                                                   │
   │  ●     Fix the lane colour cycling rule                          1h  │ 24
   │  │                                                                   │
   │  ●     Extract laneLayout() from the renderer  [☁ origin/main]   3h  │ 24
   │  │                                                                   │
   │  ●     Bump @vscode/codicons to 0.0.46-24                        1d  │ 24
   │  │                                                                   │
   │  ○     Merge branch 'feat/registry'                              2d  │ 24
   └──────────────────────────────────────────────────────────────────────┘
      ▲▲                                                ▲
      ││                                                └ origin/main sits two
      ││                                                  rows below main → ↑2
      │└ rows 1–2: dot filled --graph-lane-1  = yours alone, unpushed
      └─ rows 3–5: dot filled --text-muted    = already on a remote
         lane line: 2px --graph-lane-1;  ● solid = commit;  ○ hollow = merge
```

### 6.4 ASCII — wide (400px sidebar), multi-lane, ask #2

```
   x= 10  22  34   gutter 44px (3 lanes)
      │   │   │
   ┌──────────────────────────────────────────────────────────────────────┐
   │  ●          ›  Merge pull request #218 from …       [⎇ dev]      2m  │
   │  ├──╮                                                                │
   │  │  ●          deepseek: fix the provider probe                  4h  │
   │  │  │                                                                │
   │  ●  │          Changelog for 2.8.0                               6h  │
   │  │  │                                                                │
   │  │  ●          deepseek: add the CLI surface   [☁ origin/review…] 1d │
   │  │  ├──╮                                                             │
   │  │  │  ●       wip: registry shape                               1d  │
   │  ○──╯  │       Merge branch 'dev' into review/pr218              2d  │
   │  │     │                                                             │
   │  ●     ●       Two lanes, two roots inside this window           3d  │
   └──────────────────────────────────────────────────────────────────────┘
     lane 0        lane 1          lane 2
     --graph-      --graph-        --graph-
      lane-1        lane-2          lane-3
      #4D9DE8       #E5655E         #56C2C0
```

### 6.5 ASCII — 300px sidebar (the stated worst realistic case)

Six lanes still fit; nothing degrades except how much message survives.

```
   ◀─────────────────── 300px sidebar ───────────────────▶
     gutter 44px (3 lanes)
   ┌────────────────────────────────────────────────────┐
   │  ●        ›  Merge pull request #218…  [⎇ dev]  2m │
   │  ├──╮                                              │
   │  │  ●        deepseek: fix the provider…        4h │
   │  ●  │        Changelog for 2.8.0                6h │
   │  │  ●        deepseek: add the CLI…  [☁ orig…/…] 1d│
   │  ○──╯        Merge branch 'dev' into…           2d │
   └────────────────────────────────────────────────────┘
   message column ≥ 96px holds; the ref-carrying rows shed
   the author first, then age, per §6.2.
```

### 6.6 ASCII — 220px sidebar (the minimum), with bundling

`maxDrawnLanes = 4`. Lanes 4+ fold into the last column.

```
   ◀────────── 220px (sidebar min) ──────────▶
     gutter 56px (4 columns, the 4th bundled)
   ┌──────────────────────────────────────────┐
   │  ●        ›  Merge pull req…  [⎇][☁]     │  icon-only pills (<260px)
   │  ├──╮                                    │
   │  │  ●        deepseek: fix…           4h │
   │  ●  │  ┃     Changelog for 2.8.0      6h │
   │  │  ●  ┃     deepseek: add…           1d │
   │  │  │  ●     off-graph branch commit  2d │  ← dot keeps its own colour
   │  ○──╯  ┃     Merge branch 'dev'…      2d │
   └──────────────────────────────────────────┘
        ▲    ▲
        │    └ bundle column: 2px --graph-bundle (--text-muted), no hue.
        │      aria-label / title gain ", off-graph branch".
        └ lanes 0–2 keep full colour and full geometry.
```

---

## 7. Non-regression contract

Nothing in DESIGN-SPEC S3A may change behaviour. Specifically:

| Shipped behaviour | How it survives |
|---|---|
| Hover card at 600ms | SVG is a child of the row div; `onMouseEnter` still fires on the row. Card geometry untouched; §4.5 adds one line inside it. |
| Native context menu | Right-click bubbles from the SVG to the row. Menu items and order unchanged. |
| Copy Commit ID / Copy Commit Message | Untouched. |
| Click → inline file expansion | Untouched. File rows now also draw the gutter (§3.3) — they gain a lane column, they lose no behaviour. |
| ↑↓ ← → ↩ keyboard nav | Untouched; row height stays 24px so `scrollIntoView` maths is unchanged. |
| `role="option"` / `aria-selected` | Untouched. SVG is `aria-hidden="true"`. |
| "Load 50 more" | Untouched, plus it now continues the lanes through its 24px. |
| Section collapse / drag-reorder / space budget | Untouched — the section's flex weight and 120px min are unchanged. |

**New `aria-label` format** (the graph is invisible to AT, so the label is
where the topology lives):

```
"{subject}, {author}, {age}[, merge of N parents][, on {refs…}][, not pushed][, off-graph branch]"
```

---

## 8. Tokens to add to `src/renderer/styles/tokens.css`

S12.1 forbids hex literals *outside* `tokens.css`, so the two terminal-palette
entries live here as literals with their provenance named.

```css
/* --- 1.4b Commit-graph lanes (SCM History section only) --------------------
   Six categorical hues, all from colour gmux already owns: --accent, three
   §1.4 git decorations, and two chromatic normals from the §1.6 xterm
   palette. Ordered so CONSECUTIVE indices are maximally separated —
   min ΔE2000 42.5 between neighbours, including the 6→1 wrap. Every entry
   clears 4.1:1 on --bg-active, the worst row background.

   No yellow: --git-modified is ΔE2000 4.5 from --status-attention and
   xterm brYellow is 6.0. A yellow lane would read as "needs you".          */
--graph-lane-1: var(--accent);       /* #4D9DE8  blue   — always HEAD's lane */
--graph-lane-2: var(--git-deleted);  /* #E5655E  red                         */
--graph-lane-3: #56c2c0;             /* xterm cyan (§1.6)                    */
--graph-lane-4: var(--git-conflict); /* #F0883E  orange                      */
--graph-lane-5: #d19fe8;             /* xterm brMagenta (§1.6)               */
--graph-lane-6: var(--git-added);    /* #6BC46D  green                       */

--graph-lane-count: 6;               /* cycling modulus: colour = i mod 6    */
--graph-lane-pitch: 12px;            /* x between lane centres (4px grid)    */
--graph-lane-x0: 10px;               /* lane 0 centre = today's rail centre  */
--graph-lane-w: 2px;                 /* lane stroke; integer-x → crisp       */
--graph-dot: 8px;                    /* commit dot Ø (VS Code r=4)           */
--graph-dot-ring: 1.5px;             /* hollow merge-dot ring                */
--graph-curve-r: 5px;                /* branch/merge elbow radius            */
--graph-dim: 0.45;                   /* non-hovered lanes on gutter hover    */
--graph-bundle: var(--text-muted);   /* folded-lane column, 3.88:1 on active */
```

DESIGN.md change required: a new **§1.4b** block recording the ramp, the
"no yellow" rule, and the reason lane colour counts as git state (§1.4)
rather than as accent decoration (§1.2) or session status (§1.3).

---

## 9. Additions to the S12 acceptance checklist

14. **Lane ramp**: zero graph hexes outside `tokens.css`; no lane renders
    `--status-attention`, `--git-modified` or any yellow; every lane ≥3:1 on
    `--bg-active` (spot-check the red, `#E5655E`, the darkest at 4.12:1).
15. **Linear repo is unchanged**: screenshot-diff gmux's own History before
    and after — a 1-lane repo must render a 20px gutter identical to the
    shipped rail.
16. **Lane stability**: load page 1, then "Load 50 more"; no lane changes
    column and no lane changes colour. Scroll the full window; no reshuffle.
17. **Topology correctness (Tier 3)**: diff the rendered lanes against
    `git log --graph --oneline` on `getspecstory` at all three scopes,
    including its 143 merges and its two remotes. Not eyeballed.
18. **Divergence**: with the current branch 2 ahead / 1 behind, the local pill
    and the upstream pill sit on different commits, the upstream pill is never
    inside `+n`, and the unpushed run's dots are lane-coloured while the rest
    are `--text-muted`.
19. **Narrow degradation**: at 220px nothing clips — pills go icon-only, lanes
    4+ bundle into the `--graph-bundle` column, and the message column never
    drops below 96px on ref-free rows.
20. **Row-edge continuity**: expand a commit inside a multi-lane run; the
    lanes must pass through the file rows and the "Load 50 more" row without
    a seam.
21. **Non-regression sweep**: hover card at 600ms, native context menu, copy
    SHA, click-to-open, ↑↓↩ — all verified over the new gutter.

---

## 10. Rulings this dimension needs

1. **§1.4b placement.** Lane colour is being classified as git state (§1.4),
   not as accent (§1.2) or session status (§1.3). It puts `--accent` on a
   permanent 2px spine in the History section, which is louder at rest than
   today's 1px `--border-strong` rail. Confirm, or rule that a lone lane 0
   keeps the grey hairline until a second lane appears.
2. **`--git-conflict` as a lane colour.** ΔE2000 17.4 from the attention
   amber — comfortably distinguishable, and the SCM sidebar contains no amber
   at all today. Confirm that an orange lane is acceptable cross-region, or
   drop to a 5-colour ramp (min pairwise ΔE rises 19.5 → 24.1).
3. **Default scope.** "Current branch and its remote" changes what the History
   list contains on first open — it can now show commits that are not
   ancestors of HEAD. That is the point of ask #1, but it is a behaviour
   change to the shipped section.
4. **Dropping `--bg-raised` as a ref-pill fill** (§4.1) is a fix to a shipped
   defect (1.00:1 on hover), not a new decision — but it does visibly change
   the local-branch pill.
