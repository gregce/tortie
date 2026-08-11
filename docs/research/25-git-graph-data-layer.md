# 25 — Git graph: the data layer, measured

Research for the true-git-log-graph rework of `src/renderer/scm/HistorySection.tsx`.
Dimension 2 only: what commands feed a real multi-lane graph, how divergence is
computed, and what it costs. Rendering and colour choice are elsewhere; the one
rendering constraint this document *derives* is that lane colour must be keyed to
branch identity, not to lane index (§7).

Measured 2026-08-11, git 2.50.1 (Apple Git-155), M-series Mac, warm cache.
Benchmark harness spawns the git CLI and parses stdout the way
`src/main/git/exec.ts` does, so the numbers include process spawn and parse.

Repos used:

| repo | commits (`--all`) | merges | refs | .git |
|---|---|---|---|---|
| `/Users/gdc/getspecstory` | 932 | 185 | 132 | 94 MB |
| `/Users/gdc/helicone` | 13,874 | — | — | — |
| `/Users/gdc/vscode` | 139,175 | 6,390 in first 50k | 1,564 | 1.0 GB |

`getspecstory` is the merge-topology case the brief asked for; `vscode` is the
scale case and happens to be the exemplar too.

---

## 1. Headline

1. **The wire format already carries topology.** `LOG_FORMAT` in
   `src/main/git/parse.ts:202` is
   `%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%s` — `%P` is parents, and
   `parseLog` already splits it into `entries[].parents`. The graph needs
   exactly one new field: `%D` for ref decorations. Nothing else about the
   log call has to change.
2. **Ahead/behind counts are already free.** `status()` parses
   `# branch.ab +2 -14` from `git status --porcelain=v2 --branch`
   (`parse.ts` `parseHeader`). No `rev-list` needed for the counts.
3. **Never parse `git log --graph` ASCII.** Measured: it costs 585 ms where
   the equivalent data costs 30 ms, and emits 812 text rows for 500 commits (§4).
4. **`--topo-order` is free on small repos and catastrophic on large ones
   unless a commit-graph exists** — 582 ms flat on vscode, 64 ms with a
   commit-graph. This is the single biggest performance lever (§5).
5. **`--author-date-order` is a trap.** It stays at ~592 ms even *with* a
   commit-graph, because the graph file stores committer dates, not author
   dates. Use `--topo-order`.
6. **Paging is completely safe.** Log output is prefix-stable: deepening only
   appends, and lane assignment over a prefix-stable input has **0 % churn**
   (§6, §7).
7. **Use a curated ref set, not `--all`.** `--all` includes `refs/stash`,
   which is a two-parent merge commit — it silently adds phantom commits and a
   bogus merge lane (§3).

---

## 2. The one command

```
git log -z --topo-order --decorate=full --max-count=<N> \
  --format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s \
  HEAD --branches --remotes --tags
```

One field added to today's `LOG_FORMAT`: `%D` between `%at` and `%s`. It sits
before the subject so the existing "rejoin the tail" trick that protects
subjects containing `\x1f` keeps working — just change `f.slice(6)` to
`f.slice(7)`.

Field by field:

| field | why the graph needs it |
|---|---|
| `%H` | node identity, hover-card and context-menu key |
| `%h` | display |
| `%P` | **the topology** — space-separated parents; >1 means a merge |
| `%an` `%ae` | author, avatar |
| `%at` | ordering fallback, relative dates |
| `%D` | **ref badges pinned to their commit** — the `main` / `origin/main` pills |
| `%s` | subject |

`-z` (NUL-separated records) plus `\x1f` fields is the existing discipline and
already survives arbitrary subjects, branch names and author names. Keep it.

A real record and a real merge record:

```
210d6095…|210d609|93d9d539…|Greg Ceccarelli|gregce@gmail.com|1786122110|HEAD -> refs/heads/dev, tag: refs/tags/v2.8.0, refs/remotes/specstoryai/dev, refs/remotes/specstoryai/HEAD, refs/remotes/origin/dev|Feasibility doc: …
3a02cb90…|3a02cb9|d8190c17… 5d4575d6…|Sean Johnson|sean@specstory.com|1785848843||Merge branch 'dev' into copilot-ide
```

### `--decorate=full` is not optional

Short decoration is ambiguous — a tag and a branch with the same name are
indistinguishable, and you cannot tell a local branch from a remote one without
guessing at the `origin/` prefix:

```
short:  HEAD -> dev, tag: v2.8.0, specstoryai/dev, specstoryai/HEAD, origin/dev
full:   HEAD -> refs/heads/dev, tag: refs/tags/v2.8.0,
        refs/remotes/specstoryai/dev, refs/remotes/specstoryai/HEAD,
        refs/remotes/origin/dev
```

The whole first ask — `main` and `origin/main` as separate pills on different
commits — depends on telling `refs/heads/main` from `refs/remotes/origin/main`.
Use `--decorate=full` and classify by prefix.

Two parsing notes:

- Strip the `HEAD -> ` marker from the first entry, and keep the fact that HEAD
  points there (that is how you render the "you are here" ring).
- Drop `refs/remotes/*/HEAD`. It is the symbolic alias for the remote's default
  branch and renders as a duplicate pill. `parse.ts` already does this for
  remote branch listing (`parseForEachRefRemoteBranches` skips non-empty
  `%(symref)`); the graph needs the same skip.

### Ref set: not bare `--all`

`--all` adds `refs/stash`, and a stash entry is a merge commit:

```
47c2262 parents=[a31dc7a8… 2f2ef52e…] WIP on feat/deepseek-provider: …
```

On getspecstory that is 932 commits under `--all` vs 930 under either curated
form — two phantom commits and a merge lane that corresponds to nothing the
user did.

| ref set | commits | drops stash | detached HEAD | unborn repo |
|---|---|---|---|---|
| `--all` | 932 | no | included | clean exit 0 |
| `--exclude=refs/stash --all` | 930 | yes | **omitted** | clean exit 0 |
| `--branches --remotes --tags` | 930 | yes | **omitted** | clean exit 0 |
| `HEAD --branches --remotes --tags` | 930 | yes | included | `fatal: ambiguous argument 'HEAD'` |

Two edge cases had to be checked rather than assumed:

- **Detached HEAD.** Verified on a detached commit: it appears in *zero* of the
  ref-only sets. If you drop the explicit `HEAD`, work done while detached
  vanishes from the graph. Keep `HEAD` in the argument list.
- **Unborn repo.** Explicit `HEAD` makes git fail with
  `fatal: ambiguous argument 'HEAD': unknown revision …` instead of the
  `does not have any commits yet` that bare `git log` produces. This is
  **already safe**: `UNBORN_HEAD_RE` (`service.ts:53`) matches
  `ambiguous argument 'HEAD'` as well, so `log()` still returns `[]`. Verified
  both error strings against the live regex. No guard change needed — but do
  not "simplify" that regex without re-checking this path.

So: `HEAD --branches --remotes --tags`, and leave the unborn guard alone.

---

## 3. Divergence

### Counts — already free

`status()` returns `ahead` / `behind` today, parsed from porcelain v2's
`# branch.ab +2 -14`. Verified against a repo put 2 ahead / 14 behind:

```
$ git status --porcelain=v2 --branch
# branch.oid 114545ba…
# branch.head main
# branch.upstream origin/main
# branch.ab +2 -14
```

`git rev-list --left-right --count HEAD...@{upstream}` returns the same `2  14`
in 13 ms, but it is a second spawn for data the SCM pane already has. Use it
only if you need counts for a branch that is not HEAD.

### Which commits — two commands, repo-wide

The pane draws many branches at once, so per-branch `@{upstream}` loops are the
wrong shape. These two give the complete sets across every branch in one spawn
each:

```
git rev-list --branches --not --remotes     # unpushed  (local-only)
git rev-list --remotes --not --branches     # unpulled  (remote-only)
```

Measured 15–20 ms on both getspecstory and the 139k-commit vscode clone; cost
tracks actual divergence, not repo size. Load both into `Set<string>` and the
renderer shades a row with a set lookup.

For a single branch when you want the ahead/behind split with markers:

```
$ git rev-list --left-right HEAD...@{upstream}
<114545ba…     # '<' = ours, unpushed
<9dba05e7…
>889e7ee6…     # '>' = theirs, unpulled
…
```

Note the three-dot form. `HEAD..@{upstream}` (two dots) gives only one side.

### Staleness — "up to date" with a week-old ref

Three different signals that are routinely confused. getspecstory at time of
measurement shows exactly the lie the brief describes:

| signal | command | value seen | means |
|---|---|---|---|
| last fetch **attempt** | `stat -f %m .git/FETCH_HEAD` | 1786393305 → 8.8 h ago | when we last asked the remote |
| last ref **movement** | `git reflog show --date=unix refs/remotes/origin/dev` | 1786123281 | when that tracking ref last changed |
| remote **content** age | `git log -1 --format=%ct origin/dev` | 1786123266 → 4 days | how old the newest remote commit is |

So: fetched 8.8 hours ago, but the newest thing on the remote is 4 days old.
"0 behind" is true and useless. The number that makes it a lie is the **fetch
attempt** time — surface that.

`FETCH_HEAD` mtime is the right repo-wide signal, with one edge case worth
handling:

- **A fresh clone has no `FETCH_HEAD` at all** (verified on a clone made for
  this benchmark). Fall back to the clone time from the HEAD reflog:
  `git reflog show --date=unix --format='%gd %gs' HEAD | tail -1` →
  `HEAD@{1786424965} clone: from …`.
- `.git/packed-refs` mtime is not a substitute — it was 14 months stale here.
- Reflogs are available by default (`core.logAllRefUpdates` defaults true for
  non-bare repos; confirmed `true`).

---

## 4. `git log --graph`: no, and here is the number

Assessed properly rather than assumed. Every count below is measured.

1. **Rows are not commits.** 500 commits → **812 text rows**; 312 are
   continuation lines like `|\` and `| * |` carrying no commit. A virtualized
   list needs a 1:1 row↔commit mapping and a row count known up front.
2. **It costs 20× more.** On vscode, `--graph --all --max-count=200` = **585 ms**
   vs **30 ms** for the same 200 commits without it. `--graph` implies
   `--topo-order`, so it inherits the full-walk penalty of §5 and gives you no
   way to opt out.
3. **Unbounded, shifting columns.** Max graph prefix observed on getspecstory:
   **88 characters** (44 lanes). Commit text is indented by a variable amount
   that you cannot know without reading to the end.
4. **It is the wrong layer.** The ASCII is a lossy *rendering* of the parent
   DAG. Parsing it means recovering topology from a picture when `%P` hands you
   the topology directly, in the same call, for free.
5. **It cannot be paged.** Resuming a `--graph` walk at commit N restarts lane
   assignment from scratch with different lane numbers — precisely the
   reshuffle-under-the-user's-eyes failure the brief rules out.
6. **It bakes in a palette we must override.** `--color` emits ANSI codes for
   git's own lane colours. The requirement is DESIGN.md tokens.

Parsing `--graph` would be right only if git refused to expose parents. It does
not.

---

## 5. Performance, measured

Median of 5 runs after a warm-up. `git` = spawn to exit; `ttfb` = spawn to
first stdout byte; `parse` = JS decode + split into objects.

### getspecstory (932 commits) — everything is fast, nothing separates

| N | shape | KB | git | ttfb | parse |
|---|---|---|---|---|---|
| 200 | current `log` (HEAD) | 37 | 15 ms | 11 ms | 0.1 ms |
| 200 | `+%D --branches --remotes --tags` | 40 | 20 ms | 15 ms | 0.1 ms |
| 200 | `+%D … --topo-order` | 40 | 22 ms | 20 ms | 0.1 ms |
| 932 | `+%D … --topo-order` (whole repo) | 179 | 26 ms | 20 ms | 0.6 ms |

At this size every option is under 30 ms. Load the whole repo and stop
worrying.

### helicone (13.9k) — the flat penalty appears

| N | shape | KB | git | ttfb |
|---|---|---|---|---|
| 200 | `--all` default order | 42 | **18 ms** | 16 ms |
| 200 | `--all --topo-order` | 42 | **59 ms** | 58 ms |
| 5000 | `--all` default order | 910 | 43 ms | 17 ms |
| 5000 | `--all --topo-order` | 902 | 68 ms | 59 ms |

`--topo-order` costs a flat ~42 ms regardless of N — that is the full-history
walk it must do before emitting the first row.

### vscode (139k) — the penalty is disqualifying

| N | shape | KB | git | ttfb |
|---|---|---|---|---|
| 200 | `--all` default order | 40 | **25 ms** | 22 ms |
| 200 | `--all --topo-order` | 40 | **582 ms** | 576 ms |
| 1000 | `--all --topo-order` | 199 | 585 ms | 578 ms |
| 5000 | `--all` default order | 1004 | 64 ms | 23 ms |
| 5000 | `--all --topo-order` | 1003 | 606 ms | 588 ms |

582 ms to draw 200 rows. Entirely TTFB — git is walking 139k commits before it
will emit row 1.

### The fix: commit-graph

None of the repos on this machine had one (`.git/objects/info/commit-graph`
absent in all three; `fetch.writeCommitGraph` unset). Writing one on a
hardlinked clone of vscode took **10.3 s** and produced an **11 MB** file.
Re-measured on the same clone:

| N | shape | before | after | speedup |
|---|---|---|---|---|
| 200 | `--topo-order` | 556 ms | **64 ms** | 8.7× |
| 1000 | `--topo-order` | 566 ms | **65 ms** | 8.7× |
| 5000 | `--topo-order` | — | **98 ms** | — |
| 200 | `--date-order` | 557 ms | **60 ms** | 9.3× |
| 200 | **`--author-date-order`** | 579 ms | **593 ms** | **none** |

Generation numbers in the commit-graph let git do incremental topo-order
instead of a full walk. Author-date order gets nothing, because the file stores
committer dates. **Use `--topo-order`; never `--author-date-order`.**

Recommendation: on first open of a repo above ~20k commits, if
`.git/objects/info/commit-graph` is missing, run
`git commit-graph write --reachable` in the background once, and set
`fetch.writeCommitGraph=true` so it stays current. It is additive, takes only
the commit-graph lock, and does not disturb an agent working in the same
worktree. Until it lands, fall back to default order (25 ms) rather than
blocking 580 ms on topo-order.

### Output size

~190–205 bytes per commit with `%D`, stable across all three repos. So 1 MB per
5,000 commits over IPC. Parse is negligible: **3 ms per 5,000 commits**.

---

## 6. Paging

### Log output is prefix-stable

The property everything else rests on. Tested by comparing a shallow run
against the head of a deeper run:

| repo | comparison | topo | date | default |
|---|---|---|---|---|
| getspecstory | `max-count=200` vs first 200 of 1000 | stable | stable | stable |
| vscode | `max-count=1000` vs first 1000 of 5000 | stable | stable | stable |

Deepening only appends. No re-ordering of what the user is already looking at.

### Strategy

- **Open with `--max-count=200`** — 15–25 ms in every repo measured, including
  vscode. The pane paints immediately.
- **Deepen by re-running with a larger `--max-count`**, not `--skip`. Refetching
  1,000 costs 22–65 ms and refetching 5,000 costs 60–100 ms; both are cheaper
  than the correctness risk of `--skip`, and prefix-stability guarantees the
  rows you already drew are byte-identical. Diff by sha and append the tail.
- **Stop deepening around 5,000** unless asked. At 5k the payload is ~1 MB and
  layout is ~5 ms; beyond that, offer "load full history" explicitly. vscode at
  50k costs 78 ms of layout alone.
- Small repos (< ~2,000) can skip paging entirely — load everything on open.

---

## 7. Lane assignment and stability

### The algorithm

Single pass over the topo-ordered list, maintaining `lanes[]` where each column
holds the sha it is currently waiting for. A commit takes the leftmost column
awaiting it, or a free column if none does (a branch tip). Its first parent
inherits that column; additional parents (merges) claim columns to the right.
Trailing free columns are trimmed.

Cost, including the walk over parents:

| repo | commits | layout | peak lanes | merges |
|---|---|---|---|---|
| getspecstory | 932 | 1.2 ms | 46 | 185 |
| helicone | 5,000 | 2.7 ms | 13 | 83 |
| vscode | 5,000 | 5.4 ms | 38 | 525 |
| vscode | 50,000 | 77.5 ms | 129 | 6,390 |

Layout is not the bottleneck. Do it in the main process next to the parse, ship
the renderer a flat array with `lane`, `incoming`, `outgoing`, `merge`.

### Lanes get much wider than a sidebar

This is the finding that most affects the UI, and it contradicts the obvious
first guess. Curating the ref set does **not** fix it:

| ref set (getspecstory) | commits | peak | p95 |
|---|---|---|---|
| `--all` | 932 | 46 | 44 |
| `--branches --remotes --tags` | 930 | 46 | 44 |
| `HEAD + --remotes` | 930 | 46 | 44 |
| `HEAD + origin/*` | 920 | 46 | 44 |
| `HEAD` only | 752 | 14 | 12 |

Width comes from genuine concurrent merge topology, not from the number of
tips. On vscode only **1.4 %** of rows fit in 4 lanes and 6.2 % in 12. So the
pane must either cap rendered lanes (~8–12) and route overflow into a gutter,
or ship a branch filter. It cannot assume a handful of lanes.

Useful counterweight: the commit's **own** lane is usually shallow even when
the row is wide — 82 % of getspecstory commits and 66 % of vscode commits sit
in lane < 8. Capping the drawn width mostly hides pass-through lines, not
nodes.

### Stability: colour by identity, not by index

Lane *index* is a packing artefact. Measured churn against the previous layout:

| event | lane index moved | naive |
|---|---|---|
| append a page | **0 %** | — |
| new commit on current branch | **0 %** | — |
| new unrelated tip appears | 9.7 % (vscode) / 59 % (getspecstory) | — |
| fetch brings 3 new tips | 22.9 % / 75.4 % | — |

Appending and committing are free. A fetch that introduces refs genuinely
repacks columns. If colour is keyed to lane index, a fetch recolours most of
the pane — the reshuffle the brief forbids.

Fix: give each lane an **identity** that is intrinsic to the DAG and key colour
to that. Two refinements were needed; both were found by measurement:

1. A mint counter (`t0`, `t1`, …) is **worse than nothing** — 89.8 % churn,
   because inserting one tip renumbers every later lane.
2. "The sha that opened the lane" is better but still churns 19–62 %, because
   the opening sha changes whenever the tip advances by one commit.
3. **The ref name** (`refs/heads/main`), falling back to the opening commit sha
   for lanes born from a merge parent — a historical commit that never
   changes. `%D` already supplies this.

With ref-name identity, plus **pinning**: when several lanes converge on a
commit, prefer the lane carrying HEAD's identity rather than the leftmost.

| event | colour-key churn, ref identity | + pinning |
|---|---|---|
| append a page | 0 % | **0 %** |
| new commit on current branch | 0 % | **0 %** |
| new unrelated tip (vscode) | 59.4 % | **0.5 %** |
| fetch: 3 new tips (vscode) | 61.8 % | **0.5 %** |

0.5 % on the worst case. Lanes may slide sideways; the colour thread stays
continuous, which is what the eye actually tracks and what the reference
screenshot communicates.

---

## 8. Refreshing on `git:changed`

`src/main/watcher/repo-watcher.ts` already watches `HEAD`, `FETCH_HEAD`,
`packed-refs`, `refs/**`, `index` and the sequencer files, coalescing to one
event per 300 ms. That is everything the graph cares about — including `index`,
which it does **not** care about.

Agents touch the index constantly, so most `git:changed` events are irrelevant
to the graph. Gate on a cheap probe:

```
git for-each-ref --format='%(objectname) %(refname)'
```

**12 ms on vscode with 1,564 refs**, 18 ms on getspecstory. Hash the output; if
it matches the previous hash, no ref moved — refresh status only and leave the
graph untouched. This is the difference between 12 ms and a full log + layout on
the most frequent event class.

When the hash does change:

- **Only the HEAD tip advanced, new tip's first parent is the old head** —
  the overwhelmingly common case (commit, amend, fast-forward). Prepend the new
  commits, keep every existing lane. Measured 0 % churn, so no re-layout is
  needed at all.
- **Anything else** (fetch, branch create/delete, rebase, reset) — re-run the
  log at the current depth and re-layout. 26 ms + 1 ms on getspecstory, ~100 ms
  on a 5,000-row vscode window. Reconcile colours through the identity key so
  the repaint is not a reshuffle.
- Refresh the two divergence sets (§3) on the same trigger; 15–20 ms each.
- Refresh `FETCH_HEAD` mtime only when the watcher reports `FETCH_HEAD`.

---

## 9. What to change in `src/main/git`

Read-only survey; no code was modified.

| file | change |
|---|---|
| `parse.ts:202` | add `%x1f%D` before `%s` in `LOG_FORMAT`; bump `f.slice(6)` → `f.slice(7)`; require `f.length >= 8` |
| `parse.ts` | new `parseDecoration(d)` → `{ head, localBranches, remoteBranches, tags }`, splitting on `', '`, stripping `HEAD -> `, dropping `refs/remotes/*/HEAD` |
| `service.ts:167` | add `--topo-order --decorate=full` and the explicit ref set to the `log` args; keep `--max-count` |
| `service.ts` | new `divergenceSets()` → two `rev-list` spawns → `{ unpushed: Set, unpulled: Set }` |
| `service.ts` | new `refFingerprint()` → `for-each-ref` hash, for the refresh gate |
| `service.ts` | new `lastFetchAt()` → `FETCH_HEAD` mtime, falling back to HEAD-reflog clone time |
| new | `lanes.ts` — single-pass lane assignment with ref-name identity + HEAD pinning |

`GitLogEntryDetailed` already exposes `parents`, so the renderer contract barely
moves: add `decoration`, `lane`, `laneId`, `incoming`, `outgoing`.

---

## 10. Open questions for the UI dimension

1. Lane cap. Real data goes 38–46 wide. Cap at 8–12 with an overflow gutter, or
   ship a branch filter? §7 has the distributions to decide.
2. Does the pane default to HEAD-only (14 lanes, 752 commits) with an opt-in to
   all branches (46 lanes, 930)? That is a product call, not a data one.
3. Commit-graph write is a background side effect on the user's repo. Silent, or
   surfaced as a one-time "indexing history" affordance?

## Appendix — reproducing

Harnesses are in the session scratchpad, not the repo:

```
/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/
  bench.mjs   spawn+parse timings by command shape   node bench.mjs <repo>
  lanes.mjs   layout cost + append/head stability    node lanes.mjs <repo> <N>
  width.mjs   lane-width distribution                node width.mjs <repo>…
  fix3.mjs    ref-name lane identity churn           node fix3.mjs <repo>…
  fix4.mjs    identity + HEAD pinning churn          node fix4.mjs <repo>…
```

The vscode commit-graph comparison used
`git clone --local --no-checkout /Users/gdc/vscode <scratch>/vsc` (hardlinked,
32 ms) followed by `git commit-graph write --reachable --changed-paths`. The
source repos were not modified.
