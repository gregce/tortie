# Phase 347.1 — "file links unclickable on broken lines" — a path broken over rows opens whole, and never moves a link that opens today (issue 40) (SPEC)

The spec for `docs/BACKLOG.md`'s `## Phase 347.1` entry (`:42157-42210`), reconciled with the tree at `5f5efba2`
(origin/main, shipped as 0.111.2 without issue 40). Every `file:line` below was re-read at that commit in
`/private/tmp/wt-p3471`. Where this file and the entry disagree, this file is the build's authority and §14 says why.
Nothing committed, staged or stashed. `git diff 5f5efba2` at the end of the build must be exactly the files of §15.

- **Subject.** `fix(terminal): a file path broken over rows opens as one link`
- **First body line.** `Phase 347.1: a broken path opens whole`
- **Semver.** Patch. Main is at 0.111.2; the release commit is not this phase's.
- **Tier.** Tier 2 plus the attack (the entry). A rendered surface with no new state, but the operator reported it
  (issue 40 is John Berryman's, his to fix), so the parent measurement is mandatory, and a link that opens the wrong
  file is the failure the path doors exist to prevent, so the verifier's independent method is the attack over
  corpora and its own hostile fixtures, not a reading (§10).
- **Contract change: none.** No IPC channel, no `GMUX_*` name, no storage key, no schema, no smoke mode. `gate:contract`
  must read byte for byte. Nothing under `build/` may spell a new `GMUX_[A-Z0-9_]+` (the inventory sweeps `build/`).
- **Native menus: none move.** No surface is added, renamed or removed.
- **Binding sources.** The entry; his ruling of 2026-10-13 ("Ship 41 + 33, redo 40") and the reverifier's rule it
  adopted; `build/p347/SPEC.md` (§1.2, D5 to D10, §5.2, §6.2, §7, §12 L2 to L4 and L11 to L14, and §His ruling);
  the kept work in `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3471/kept/`
  (`p347-issue40-wip.patch`, `p347-path-join.test.ts`, `p347-path-links-join.test.ts`, `p347-SPEC.md`); research 107
  (refusals 5, 8), research 111 §4.2 and research 115 §4 (why nothing reads `isWrapped`).
- **His standing rule that binds:** no scenario worse than today. Here it is not a measured outcome of shape rules,
  which is how Phase 347 failed twice; it is a construction (D2), and the corpora (§7) prove the construction holds.
- **His ruling of 2026-10-14, the absolute-only round: "Join absolute paths only."** A path broken over rows is
  offered as ONE link only when the JOINED text is an absolute path (starts with `/`) or a home path (starts with
  `~/`), and the chain's top piece is the START of that path token on its row. A chain whose top would be relative
  is refused whole and never shortened; single-row links do not change at all. D2, J1 to J9 and the J9 refusals
  stay (all but J8 at the chain's top, which this round measured redundant under the ruling, D16); the absolute rule
  is a further refusal, never a replacement. Binding input: the ruled round's reverify,
  `<scratchpad>/p3471/round3-input.json` (`rulingRoundReverify`), and its census tools in `<scratchpad>/p3471/rv2/`.
  This round's spec is §2.4, D14 to D17, the corrections to D5, D11 and L4, §4.6, §5.4, §6.3, §7.2b, §7.7, §9.4,
  §10's last paragraph, §11, §12, L8, L9 and §15a.

## 0. What changes for a person

| Today (`5f5efba2`, 0.111.2) | After this phase |
| --- | --- |
| A path an agent printed broken over two or three rows (issue 40's 45/42/30 rows, Codex's break after `-`, a terminal soft wrap) underlines nothing and opens nothing | Pointing at any of its rows underlines the whole path and a press opens it at its line, when the joined path starts with `/` or `~/` (his ruling of 2026-10-14, D14) |
| If one row's piece happens to be a real file of its own, that row opens it | The same: that row still opens its own file, and the whole path is not offered from any row (D2; the price of the guarantee, L1) |
| Every link that opens today | Opens the same file from the same cells (D2, proved per cell over three corpora and both doors, §7) |
| A RELATIVE path an agent printed broken over rows (`src/main/…/menu-` over `template.test.ts:38`) underlines nothing | The same, from every row, wherever and however it was broken (J10, his ruling of 2026-10-14) |
| A path a program cut mid-name, or just before a `/`, at a fixed width narrower than the pane | The same: stays plain (J11, D15) |

## 1. The reading (cited, do not re-derive)

- The provider is `PathLinkProvider` (`src/renderer/terminal/path-links.ts:170-367`), registered after `WebLinksAddon`
  (`TerminalPane.tsx:370-388`). `provideLinks` (`:181-228`) reads the hovered row and the row above as drawn, calls
  `pathSpansInRow` (`src/shared/path-spans.ts:456-477`) with `width: this.term.cols`, the row's own `cellColumns`
  map, the row above and its own end column (`aboveEnd`, `0` with no row above, `null` when the map cannot answer).
  `linksFor` (`:231-263`) asks `doorFor` about every span in ONE `Promise.all` and draws a link only where the door
  answers a door. `open` (`:332-366`) re-asks the door at the click. Refusal 5 is `provideLinks`' first statement.
- Refusal 8 (`edgeRefusal`, `path-spans.ts:430-448`) refuses a span whose end column is the last column, and a span
  at the row's head (past `GUTTER`, `:126`, which strips only `│ ┃ | └ ├ ⎿ > • ⏺` and ONE optional space) below a
  predecessor that filled its last column and ended on a path character.
- `conformance:pathdoors` rule 13 (`build/conformance-pathdoors.mjs:1427-1518`) reads `provideLinks` for
  `width: this.term.cols`, `cellColumns(lineAbove)`, `aboveEnd:` and no `?? 0`. This phase does not touch those lines.
- xterm 6.0.0 resolves a cell by asking every provider for the HOVERED ROW only (moving to another row clears the
  current link and asks again), drops any link that shares a column ON THAT ROW with an earlier one, providers in
  registration order and links in returned order (`Linkifier._removeIntersectingLinks`: a link that starts above the
  row claims from column 0, one that ends below it claims to `cols`; `TerminalPane.tsx:377-382` relies on it to keep
  URLs first), and takes the first remaining link whose range holds the cell in reading order
  (`Linkifier._linkAtPosition`: `start.y * cols + start.x <= y * cols + x <= end.y * cols + end.x`). So what a cell
  opens is a function of what `provideLinks(<that cell's row>)` returns, and that is what §7 compares. Under D2 an
  accepted join shares no column with a link the provider returns, so the removal never takes one of ours.
- `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts`, `src/shared/path-doors.ts` and
  `build/p247/path-open.mjs` are byte-identical at `af2662e6` (Phase 347's parent, against which the kept work and
  the three reverifies were measured) and at `5f5efba2`; `build/conformance-pathdoors.mjs` differs by rule 5's
  `src/main/pocket/ipc.ts` row alone, which Phase 347 landed (`git diff --stat af2662e6 5f5efba2 -- <those files>`).

## 2. Measured for this spec (no Electron, no agent, no shell of his; every scratch under the spec's scratchpad)

His history read before and after every command that started a shell or a tool: `737549 1791921744` and
`23166 1790702242`, never moved. Disk 64 GiB free at the start.

### 2.1 The kept work on the tree of the day

In a `cp -Rc` clone of `/private/tmp/wt-p3471` (`.git` file removed, see §16 S1):

| Command | Exit | Reading |
| --- | --- | --- |
| `git apply --3way p347-issue40-wip.patch` | 1 | **It does not apply cleanly to `5f5efba2`.** `build/p247/path-open.mjs`, `src/renderer/terminal/path-links.ts` and `src/shared/path-spans.ts` apply cleanly; `build/conformance-pathdoors.mjs` conflicts in ONE hunk, rule 5's `DECLARED` row for `src/main/pocket/ipc.ts`, because Phase 347 already landed that row (with a slightly longer comment). Resolution: main's side, byte for byte |
| `git apply --reject --include=build/conformance-pathdoors.mjs <patch>` (in a plain copy, no repository) | 1 | hunks 1, 2 and 4 applied, hunk 3 (rule 5) rejected to a `.rej`; the result is byte-identical to the resolved clone. The same for `--include` of the other three files (exit 0, byte-identical). **This is how builders apply it (§4), never `--3way`, which writes the index** |
| `vitest run p347-path p247-path` (scratch HOME) | 0 | 6 files, 140 tests: `p347-path-join` 35, `p347-path-links-join` 23, `p247-path-spans` 36, `p247-path-links` 24, `p247-path-door` 16, `p247-path-open` 6 |
| `node build/conformance-pathdoors.mjs` | 0 | every rule passed; rule 17: 58 join readings and 8 provider readings as pinned, no `isWrapped`, 7 of 7 wiring plants caught, 23 of 23 ablations red; 10.8 s |
| `npm run typecheck` | 0 | 34 s; import boundaries 1,427 files, 0 violations; no runtime cycles |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 115 breaks (the probe on main, P arms held) |
| `node build/p247/path-open.mjs --self-test` (kept hunk applied) | 0 | PASS |

### 2.2 The shapes the three reverifies named, re-read on the kept work (a prototype of §7's per-cell comparator, `<scratchpad>/p3471/spec/proto/`)

A cell regresses when the parent (`5f5efba2`) opens a file there and the kept work opens another or none. "named" is
the regime where every spelling either build asks about exists as a file; "files" is the shipping `decidePathDoor`
over that model; "exists" also accepts a folder.

| Shape (rows, width) | Kept work, files door | Kept work, exists door | Why |
| --- | --- | --- | --- |
| Reverify 1: `moved src/` 1 to 2 cells short of the edge above `lib/util.ts today` | 0 | 0 | J8 refuses it short of the edge; on the last column refusal 8 hides both pieces at the parent, so nothing there opened today |
| Reverify 2: `• docs/research/` short of the edge above `• notes/a.md` | 0 | 0 | J8 at the chain's top |
| **Reverify 3: `• /r/tortie/docs/`, `• ~/tortie/docs/` or `• /r/tortie/src/n8kk-` 1 or 2 cells short above an item whose own spelling opens** | **regresses (6 of 6 layouts)** | **regresses** | still open, AND on the files-only door the product ships whenever the lower item is a file: the reverify's "0 with the files-only door" was a property of the repository's tree, not of the rule |
| A relative folder ON the last column above an item indented by two spaces, or by `⎿` and two spaces | regresses | regresses | refusal 8's head clause strips only `GUTTER` and one space, so the parent offered the indented item; J2 strips every space, so the join took it. Found by this spec |
| P3: issue 40's rows with the last fragment's own spelling planted | regresses (by design) | regresses | the kept spec's L4 trade |
| A word wrap that hard-cut `.claude/scheduled_tasks.` above `lock to fix the race.` (24 columns) | regresses when `.claude/scheduled_tasks` exists | regresses | the trailing `.` is stripped, so the fragment ends short of the edge and the parent offered it. Found by this spec |
| `Two files changed: /r/tortie/` (the base itself) above `.claude/scheduled_tasks.lock` | 0 | regresses (a folder the existence door accepts) | — |

Over prototype corpora of the same three families, smaller than §7's and not its exact generators (list: 6
directories, files as kids, 7 to 9 pairs, the 12 gutters and 4 shortfalls; prose: 4 paths, the 12 templates, the
14 widths and the 3 wraps of §7.2; captures: every 25th of the 1,255 at 4 widths):

| Sample | Kept work: regressing cells (layouts), files / exists | The governing rule (D2), prototype: regressing cells, files / exists | Gain cells, D2 vs kept |
| --- | --- | --- | --- |
| list, 2,496 layouts, regime repo | 0 / 0 | 0 / 0 | 25,949 vs 25,949 |
| list, regime named | 15,639 (396) / 15,639 (396) | 0 / 0 | 18,692 vs 21,993 |
| list, regime named-dirs | 0 / 15,639 (396) | 0 / 0 | — |
| prose, 6,048 layouts, regime repo | 0 / 2,702 (154) | 0 / 0 | 47,750 vs 48,321 (files) |
| prose, regime named | 9,940 (336) / 9,940 (336) | 0 / 0 | 41,113 vs 42,890 |
| captures, 204 layouts, every regime | 0 / 0 | 0 / 0 | 0 vs 0 |

With D2 in place, taking J5, J7, J8 (its row clause, and both clauses) out one at a time over the list sample read
**0 regressing cells in every regime and door**: D2 alone carries the guarantee. J5 out raised the gain by 21,990
cells (repo, files), the shape J5 governs, a folder item glued to the bare item below it, which is a link on the
wrong text; J7
and J8 out moved nothing in lists (their shapes are prose). So J1 to J8 stay, as precision rules (D4).

The prototype of D2 run against the kept tests: 135 of 140 pass; the 5 that fail are exactly the provider cases
whose fixture makes every fragment's own spelling a file (`EVERYTHING`), which D2 deliberately reads as today (§4.1).
Run against `conformance:pathdoors`: rule 17's `p-accepted-*` readings and three ablations move for the same reason,
and its read half needs the one-reader change (§6.1). Nothing else moved.

### 2.4 Measured for his ruling of 2026-10-14, the absolute-only round (`<scratchpad>/p3471/abs/spec/`)

Prototyped in a `cp -Rc` clone of `/private/tmp/wt-p3471` (`abs/spec/clone/`, its `.git` file removed before any
command ran in it; nothing ran in the worktree but `git -C /private/tmp/wt-p3471 show 5f5efba2:<path>`, read only).
The parent's three provider files were read that way into `abs/spec/parent-src/` and named to `corpora.mjs` as
`--parent <dir>`. Builds: **HEAD** (the reverified tree as it stands); **J10** (HEAD plus D14's one line);
**J10 + J11**, the build this round specifies (J10, D15's J11, and J8 at the chain's top taken out per D16;
`abs/spec/path-spans.pf.ts`, sha256 `130f9293…6f5fc`, its diff against HEAD `abs/spec/j10-j11.diff`); and one-clause
plants of it. His history, `stat -f '%z %m'` before and after every command that started a shell, tsx or node:
`737549 1791921744` and `23166 1790702242`, never moved. No Electron, no tmux, no lock slot, no agent, no model
turn, nothing read under his home. Disk 52 GiB free at the start. Load averages 10 to 40.

**The census, over real data** (the reverify's method, widened: `abs/spec/tool/census2.mts`, run as one command by
`abs/spec/tool/run-census.mjs`, which exits 1 on any wrong open). Every path of `fixtures/repo-paths.txt` (4,376)
printed inside ANOTHER real checkout of this repository, `/private/tmp/wt-p3471` (absolute, and for a quarter of the
paths as `~/wt/<path>` through a scratch HOME whose `wt` links there), read in a pane whose project is a different
checkout (the clone), so every relative tail of every printed path is a real file in the project. Through the
shipping `PathLinkProvider` of the parent and of each build and the shipping main-process `answerPathDoor` over the
real disk; every link a row returns pressed and what it opened compared by realpath with the printed file. Two
families: `sent`, the reverify's four sentences plus a backticked path and a path that ends its line, three with a
hanging indent, broken by issue 40's breaker (`agent`) and by wrap-ansi's hard mode (`hard`) at B = W − m for m 0
to 13 and W 38, 45, 47, 50, 56, 64, 72, 80, 96 and 120 (3,506,918 layouts); and `list`, `find`'s output, three
consecutive paths a line at every third path, flush or indented, by the terminal's own wrap at W and both breakers
at W − m (333,841 layouts). A WRONG OPEN is a link over two or more rows whose press opens a file that is not the
printed one, on rows where the parent opens no link to that file. A RIGHT layout offers the printed spelling. A CUT
is a join whose target is not a printed spelling: TOP when it is a proper suffix of one, MID-NAME BOTTOM when a
proper prefix ending neither in `/` nor `-`.

| Build | `sent` wrong opens (layouts) | `list` wrong opens (layouts) | right layouts, `sent` + `list` | top cuts (layouts) | mid-name bottom cuts (layouts) |
| --- | --- | --- | --- | --- | --- |
| HEAD | 13,711 (6,846) | 168 (70) | 315,932 + 50,907 = 366,839 | 65,186 (every relative tail among them) | 30,473 |
| J10 | **0** | **0** | 366,839, none lost | 3,928 | 30,473 |
| J10 + J11's top half alone | 0 | 0 | 315,913 + 50,734 = 366,647 | 2 | 30,360 |
| J10 + J11's bottom half alone | 0 | 0 | 313,991 + 50,860 = 364,851 | 3,883 | 9 |
| **J10 + J11 (this round)** | **0** | **0** | **313,972 + 50,612 = 364,584 (−2,255, 0.61%)** | **2** | **9** |
| J10 + "the row above holds a `/`" (the extension the reverify's nit suggested) | 0 | 0 | 315,932 + 47,390 = 363,322 (−3,517; 26% of `list`'s right join rows) | 34 | 30,150 |
| J10 + "a lone bottom row above a path character" | 0 | 0 | 304,352 + 36,284 = 340,636 (−26,203) | 3,659 | 9 |

On every candidate layout every build's single-row links equal the parent's (0 mismatches: D2 holds). HEAD's wrong
opens are all at m ≥ 1 (the greedy m = 0 controls read 0), the reverify's class at a larger scale (it read 4,031
layouts in 1,474,667). The census took 685 s for seven builds and 142 s for J10 + J11 alone. A top or mid-name cut
opens a file only where a real file sits at that shorter path; this tree has two such pairs (`answer.hard` beside
`answer.hard13`, `cmd.hard` beside `cmd.hard13`), which the reverify's 32-character prefix aligned once (its nit) and
this census's 21-character prefix never did. That is why J10 alone reads 0 here and why J11 is decided on the cuts it
leaves, not on the opens (D15).

**The committed corpora** (`node build/p3471/corpora.mjs --parent abs/spec/parent-src` in the clone, all 56 lines):

| Build | regression cells | stale wrong-file opens | gain cells | time |
| --- | --- | --- | --- | --- |
| HEAD (the reverify's `rv2/out/measure-head.json`) | 0 on all 56 | 0 on all 28 | 8,260,997 | |
| J10 | 0 on all 56 | 0 on all 28 | 6,859,528 | 346.9 s |
| **J10 + J11** | **0 on all 56** | **0 on all 28** | **6,855,097** | 320.4 s |

By corpus, HEAD → J10 → J10 + J11: list 1,064,531 → 698,873 → 698,873; prose 4,202,241 → 3,247,707 → 3,245,459;
captures 344 → 0 → 0; list-outside 532,415 throughout; prose-outside 2,084,827 → 2,065,823 → 2,064,094; prose-stale
250,426 → 191,978 → 191,714; prose-outside-stale 126,213 → 122,732 → 122,542; the other four 0 throughout. On the
files door over this repository's tree: list 120,706 → 79,549 → 79,549 cells, prose 808,770 → 642,164 → 641,420.
At HEAD `prose-outside` files `repo` reads 694 gain cells in 126 layouts, and J10 reads 0 there. **Corrected by the
integrator (the corpora builder's reading, re-read in its `dbg-po` dump):** this spec called every one of them a
relative tail of a path printed in `/q/tortie/` opening the project's own file. None is: all 694 cells are joins to
`/r/tortie/README.md`, the relative `README.md` that template 12 (`Created {p}, {q}, and README.md beside them.`)
prints, broken by the terminal's own wrap (`README.` above `md`, `R` above `EADME.md`), which J10 refuses because it is
relative. The printed-path count reads 0 there at HEAD. The reverify's class is on committed data in `prose-margin`
(D17): 55 printed-path wrong-file opens on each of its `repo` and `twin` lines at HEAD, 0 at J10 + J11 (§As built,
absolute only).

**A pure differential** (`abs/spec/tool/jdiff.mts`, `joinedPathAt` on every hovered row of all ten corpora, 1,898,668
rows). J10 removes join rows only where the joined target is relative: list 4,426 of 13,704; prose 9,453 of 39,041;
captures 12 of 12 (two Codex approval captures, a word ending one row glued to the absolute path at the head of the
next, `rest/private/tmp/…`); prose-outside 475; prose-stale 689; prose-outside-stale 112. J10's build with J8 at the
chain's top taken out answers identically on every row (D16). J11 then removes 77 rows in prose and in prose-outside
each and 10 in prose-stale and in prose-outside-stale each.

**The margin corpora, prototyped** (§7.2b; `abs/spec/clone/build/p3471-proto/generate.mts`, its diff
`abs/spec/generate-proto.diff`; the door-free cut report `abs/spec/tool/cutreport.mts`). prose-margin 40,185 layouts,
sha256 `c682754e…2477`, and listing 5,798, `d71bc44b…6d00`, each generated twice byte for byte and by a second spelling
(`abs/spec/tool/margin-gen.mts`, the reverify's wrap copied byte for byte) to the same sha256. Cut layouts by kind:

| Build | prose-margin: relative / top / mid-name | listing: relative / top / mid-name | right layouts, prose-margin / listing |
| --- | --- | --- | --- |
| HEAD | 600 / 46 / 232 | 36 / 2 / 16 | 1,654 / 692 |
| J10 | 0 / 46 / 232 | 0 / 2 / 16 | 1,478 / 692 |
| **J10 + J11** | **0 / 0 / 0** | **0 / 0 / 0** | 1,438 / 676 |
| J10 + J11 with J10 planted out | 442 / 0 / 0 | 22 / 0 / 0 | |
| J10 + J11 with J11's top half planted out | 0 / 46 / 0 | 0 / 2 / 0 | |
| J10 + J11 with J11's bottom half planted out | 0 / 0 / 232 | 0 / 0 / 16 | |

On prose, prose-outside, prose-stale and prose-outside-stale J10 + J11 reads 0 relative, 0 top and 0 mid-name cuts
too; list and list-outside read 2 mid-name layouts each, a list marker `1.` under a folder whose child is `18/`, which
names no path (the gutter does not strip `1.`), which is why §7.7's requirement names the prose family, prose-margin
and listing and not list.

**What the prototype broke, which the builders mend** (J10 + J11 in the clone, before any test or gate was touched):

- `vitest run p347-path p3471 p247-path`: 14 of 210 red, every one a case that expects a RELATIVE join (PJ4's J2
  middle, J8, and J8 at the chain's top; GR5's two; GR12's X2 and X3 lower-row controls; U5's seven relative
  controls). J11 turned no other case red.
- `conformance:pathdoors`: 13 findings: eight rule-17 readings that pin a relative join (`j2-middle-up`, `j8-full`,
  `j8-top-full`, `j9-fresh-upper`, `j9-g-clean-midwrap`, `j9-fresh-lower`, `j9-fresh-after-piece`,
  `j9-f1-below-alone`); the J8-at-top ablation with no anchor; J9's upper-half, row-above and bottom ablations and
  rule 18's G off each leaving a relative reading it owns where it read.
- `corpora.mjs --self-test`: 66 of 81. S4's three relative shapes, and its Mac shape, whose row above (`The brief is
  at`) ends at the same column as `/r/tortie/docs/` below it, so J11 refuses that join (L9's price, in a fixture);
  S6's G-stale-midwrap, X2 and X3, all relative.
- `--plant` (G off): caught (list 99,007 and prose 187,966 regression cells under `named` on both doors; 62.7 s).
- `--plant-j9`: its verdict FAILS: 0 wrong-file opens on captures-stale and on prose-outside-stale files `repo`,
  because every chain J9's cut left there was relative. What it still opens is absolute: under `named` on both
  doors, 180 a line on prose-stale and 166 on prose-outside-stale (a chain whose top piece starts `/tortie/…` or
  `/tortiq/…` below a stale `~`), and 5 on prose-stale files `repo` (259.8 s). §7.7 re-judges it there.
- `probe-p347 --grader-self-test` and `path-open --self-test`: PASS, unchanged. Each is arithmetic of its own; every
  P arm prints an absolute path, and P1 to P4 end on rows of more than one token, which J11 never reads (§8).

**The rows that decide** (`joinedPathAt` alone, J10 + J11): issue 40's rows join from rows 1, 2 and 3 at 45, 46, 47,
48 and 49 columns to `…/.planning/brainstorming.md:134`, `[1,0..3,30]`. The reverify's E1 at 47 joins nothing (HEAD:
`src/main/__tests__/menu-popup-template.test.ts:38`). Its nit (`I updated the test in /private` | `/tmp/wt-p3471-parent-rv2/docs/`
| `research/assets/58/answer.hard` | `13:60 today.` at 38) joins nothing (J10 alone:
`/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard`). `I saved it to /Users/me/proj` |
`/tmp/run-logs/nightly-build-` | `output.log today.` at 32 joins nothing; with J11's top half out,
`/tmp/run-logs/nightly-build-output.log`. `I updated /Users/me/proj/dist/` | `assets/vendor-chunk-a/index.js` |
`.map today.` at 33 joins nothing; with the bottom half out, `/Users/me/proj/dist/assets/vendor-chunk-a/index.js`.
`Two files changed: ~/tortie/` | `.claude/scheduled_tasks.lock` | `and ~/tortie/docs/audits/` at 31 joins nothing:
a whole path J11 refuses because two of its rows happen to end at one column (L9).

## 3. Decisions, each with its source

- **D1. The kept work is the base, re-applied by file** (§4), with rule 5's hunk dropped because main holds it.
  J1 to J8, the caps, `joinedPathAt`, `joinBoundary`, the one `ILink` from first cell to last, the fragment clause,
  the header text of D10 and `build/p247/path-open.mjs`'s arm E are kept as they are. Source: the entry's mechanism 1;
  §2.1.
- **D2. THE GOVERNING RULE (the reverifier's, adopted by his ruling): a join never takes a cell from a row span the
  door already accepts, judged over every row the join covers.** For a candidate join `J` that `joinedPathAt`
  answers for the hovered row, let `R(J)` be buffer rows `J.top` to `J.bottom`. For each row `r` of `R(J)`, the row
  spans are `rowSpansAt(drawnRow, r, Terminal.cols)`, which is exactly what `provideLinks(r + 1)` hands
  `pathSpansInRow` when row `r` is hovered. `U(J)` is every such span whose `spanColumns` range exists and shares a
  cell with `J` (`sharesCellWithJoin`). `J` is offered only when **J4** the door accepts `J.target` AND **G** the door
  refuses every target in `U(J)`, all asked through the same `doorFor` and cache in the same `Promise.all`. A missing
  answer counts as accepted; a row of `R(J)` that cannot be read refuses `J`. **Consequence, by construction:** when
  `J` is refused, every row's links are exactly today's (Phase 347's fragment clause drops a span only for an
  ACCEPTED join); when `J` is accepted, no link today's provider draws on any row of `R(J)` shares a cell with it,
  so every today link is returned unchanged and `J` covers only cells that had no link. A cell that opens `X` today
  opens `X` at HEAD. Rows outside `R(J)` are not touched. Source: his ruling; the entry's mechanism 2 ("it replaces
  any further shape-by-shape patching"); §1's xterm reading (a cell is decided by its own row's links); §2.2.
- **D3. Where it lives.**
  - `src/shared/path-spans.ts` (pure): `rowSpansAt`, `SpanUnderJoin`, `spansUnderJoin`, and `sharesCellWithJoin`
    MOVED here from `path-links.ts` (one spelling of the cell test, used by the rule and by the fragment clause). Exact
    text in §4.1, because rule 18's ablations anchor on it.
  - `src/renderer/terminal/path-links.ts`: `provideLinks` builds ONE reader closure `drawnRow` and hands it to both
    `joinedPathAt` and `spansUnderJoin`, synchronously, before any await, beside today's hovered-row computation,
    which is not touched (rule 13). `linksFor` pushes the under-targets after the join's target into the one
    `targets` list, so they ride the same `Promise.all`, and accepts the join only when `!taken`.
  - Why the hovered row is judged through `rowSpansAt` too, rather than through `spans`: one function judges every
    row the same way, and rule 18 proves `rowSpansAt` equals the provider's own derivation for every row of its
    fixtures (§6.2 R18-E). `doorFor` dedupes the repeated spellings, so the IPC count does not grow for them.
  - Asked "first" in the decision, not in time: the rows' own answers are read before the join's answer is used,
    and a taken cell refuses the join whatever the join's door said. A second round trip to skip the join's ask was
    weighed and refused: rule 17 holds the join to the spans' one round trip, and the hover never writes either way.
  Source: the module split of Phase 247 (grammar pure, provider does IO); Phase 250's "two spellings of a key drift".
- **D4. J1 to J8 stay, and none becomes redundant for the build.** With D2, J5, J7 and J8 no longer carry "no worse
  than today" (measured, §2.2: 0 regressions with each removed); they keep refusing joins whose joined name exists
  but is not what the text named (a list item glued to the folder above it, `README.md` plus `.bak beside it`, a
  relative folder mid-sentence), which are wrong gains that a per-cell regression count cannot see. Removing one is
  not "measured safe" by that count, so all stay, and every ablation of rule 17 still owns its own reading. J4 stays
  the last word on the join's own target. Source: the task's "keep them unless removing one is measured safe"; §2.2.
- **D5. Refused whole, never cut short.** A join that would take an accepted cell is not offered at all, rather than
  shortened to the rows whose pieces open nothing: a shortened join is a fragment, which is the caps' rule
  (`MAX_JOIN_ROWS`, `MAX_JOIN_CHARS`). Source: `build/p347/SPEC.md` D7's caps; research 107 refusal 8's purpose.
  **Corrected by his absolute-only round (2026-10-14).** D5 holds for the refusals that judge a chain: the governing
  rule, the caps and J9's whole refusals. It never held for a boundary J3, J5, J7 or J8 refuses: such a refusal only
  STOPS the walk, and the rows on either side of that boundary are then offered as chains of their own, because
  `joinedPathAt` answers the longest chain through the hovered row, not the longest chain of the printed path. This
  decision and the header's "Every refusal here is WHOLE, never a shorter chain" both said otherwise, and the
  reverify measured the consequence: a path into another worktree, wrapped narrower than the pane, joined its lower
  rows as a relative path that opened the project's own copy (4,031 of 1,474,667 real layouts; 6,916 of 3,840,759 in
  §2.4's census). A chain the walk stopped is now offered only when it reads absolute or `~/` on its own (J10, D14)
  and no breaker that cuts anywhere left it at either end (J11, D15); the cuts that remain are L8. §4.6 corrects the
  header in the same words.
- **D6. The click is unchanged** (Phase 347's D9): it re-asks the door about the joined target and opens
  `underBase ?? path` at the joined line. It does not re-run D2: a fragment that came into existence after the hover
  had no link drawn at that moment at the parent either (both read the same 30 s cache), so the click opening the
  join is a gain at that moment, never a moved link (L3). Source: `path-links.ts:332-366`; L14 of 347.
- **D7. What the kept spec called a trade is decided for today.** `build/p347/SPEC.md` L4 (a fragment's own spelling
  and the whole path both exist) and probe arm P3 now read as the parent: the fragment opens from its own row and
  the whole path is offered from no row. Issue 40's own rows still join, because none of their fragments is a file
  (`p347-SPEC.md` §2.2). Source: his ruling; his no-regression rule.
- **D8. The corpora are rebuilt as committed, deterministic tooling** under `build/p3471/` (§7), inheriting the
  names and the per-cell comparison of the scratch corpora that are gone, with two synthetic regimes added
  (`named`, `named-dirs`) because §2.2 found the repository's own tree too sparse to put a fragment and its join
  both on disk: the reverify's 7,557 cells needed the existence door, and the files-only door hid a live regression.
  `measure:p3471` is the entry. Source: the task; §2.2.
- **D9. `probe:p347` runs the P arms again** (§8): `HELD_ARMS` goes, the P arms grade against `5f5efba2`, P3 is
  regraded by D7, and P7 and P8 are the third reverify's two live shapes on the files-only door. Source: the entry
  ("probe:p347's P arms at the parent and HEAD"); §2.2.
- **D10. The headers say it.** `path-spans.ts`'s last header section (the kept "WHAT PHASE 347 JOINS…") gains one
  paragraph naming D2 and why it is a construction; `path-links.ts`'s "A path broken over rows" paragraph says the
  join yields to any row span the door accepts on any row it covers. In the same commit as the code.
- **D11. J9 (the fix round's, the app lens's major; made whole by his ruled round of 2026-10-14): a join is refused
  WHOLE when a boundary it crosses or stops at reads a cell past the pane's width, and is never cut there.** tmux
  draws on xterm's alternate buffer, which has no reflow, so a narrowed pane keeps every cell past its new edge
  (`node_modules/@xterm/xterm/src/common/buffer/Buffer.ts:248-257` trims on a shrink only with reflow on;
  `BufferSet.ts:44` builds the alternate buffer with reflow off), a later erase stops at the new width, and
  `translateToString(true)` still answers those cells. A boundary is read in two places, the upper row's drawn end
  and the lower row's first piece. `joinBoundary` refuses one whose upper row draws past `width`, so the walk never
  crosses it (the lens drew `src/deep/` at the end of a 47-column row whose stale `de` sat in columns 48 and 49 above
  `folder/one.ts:5`, and the fix round's build without this opened `src/deep/defolder/one.ts`). `joinedPathAt`, once
  top and bottom are known, then refuses the chain when the row above its top draws past the width, when its bottom
  row draws past it, or when the first piece of the row below its bottom reaches past it; an end no map answers
  counts as past. The fix round put J9 in `joinBoundary` alone, so it CUT the chain at such a boundary instead of
  refusing it, against D5: the rows below joined on their own, and a path in another folder broken over three rows
  with leftover cells on its top row joined its two lower rows as a RELATIVE path that opened the project's own file
  of that name, where the parent opened nothing (the reverify's F1, X2 and X3, and 118 wrong opens over its stale
  corpus with the printed paths moved out of the project). The row-above and row-below clauses are the reverify's
  measured candidate, applied as it stands. **The bottom row is this round's decision, measured** (his ruling:
  "refuse if it costs no gain on the clean corpora"): a token left past the width makes the bottom row read as two
  tokens, which ENDS a chain that went on, so `fixtures/parent-record-b-` above `first.json` stopped there and the
  candidate still offered the folder's prefix (the reverify counted 7 such joins in its synthetic `named` regime;
  this round's wrong-file count reads 122 over the five stale corpora, and 0 with the bottom clause). It costs no
  gain on any clean corpus: `joinedPathAt` answers the same on every hovered row of all five clean corpora with it and
  without it (a pure differential over 681,606 rows), and `measure:p3471`'s gain on the three original corpora is
  5,267,116 cells either way. It replaces the fix round's lower clause in `joinBoundary` (a lower piece reaching past
  the width), which it makes dead: with that clause the walk stopped above such a row and the row-below clause
  refused the chain; without it the walk crosses into the row, which becomes the bottom (its end is past the width,
  so the next boundary's upper half stops the walk), and the bottom clause refuses it. Measured: this build and the
  candidate with the bottom clause added answer `joinedPathAt` identically on every hovered row of all ten corpora
  (1,898,668 rows). The row-below clause decides only where the walk stopped for another reason (a bottom row of two
  tokens), and there it refuses a chain no stale cell cut; it is kept because it is the candidate as measured, and
  its price is stated in L7. A cell a repaint drew is never past `Terminal.cols`, so J9 only refuses joins, and a
  refused join leaves every row's links as today (D2). Not chosen: bounding the reader to `Terminal.cols`
  everywhere, which would keep joins on stale screens but moves refusal 8's head clause for single-row links (the
  parent reads the stale cells there too), so it belongs to its own phase, which now has the stale corpora of §7.2a
  to measure against (L7). Source: lens B's verdict and its pure reproduction; the reverify's verdict, its F1, X2 and
  X3 and its candidate; his ruling of 2026-10-14, "Apply the fix, re-check once".
  **Corrected by his absolute-only round.** The row-above, bottom and row-below clauses were measured here as the
  remedy for a cut whose lower rows read as a RELATIVE path. J10 now refuses every relative chain whatever J9 says,
  so those clauses decide only ABSOLUTE chains: a chain whose top piece starts `/` at the head of its row below a row
  that reads past the width (a cut just before a `/` on a stale screen; with J9's cut planted into J10's build, 180
  and 166 opens a line of `/tortie/…` and `/tortiq/…` under `named`, §2.4), an absolute chain whose bottom row reads
  past the width (the prefix case, whose top is `/q/tortie/build/p336/`), and the first piece of the row below. They
  stay, and rule 17 gives each an absolute reading to own (§6.3). The numbers above (122 wrong-file opens, 376,639
  cells and L7's) were measured before J10 and are this round's history, not its measurement.
- **D12. The door's kind is owned by behaviour (the fix round, lens A's minor).** `taken` counts a span ANY door
  accepts, and until this round every governing-rule fixture answered through the editor door, so an ablation that
  counted only the editor's answer (lens A's A1b) kept all 173 path unit tests and `measure:p3471` green and was
  caught by rule 18's text read alone. GR11, rule 18's `g-fragment-image` and `g-fragment-mac` with the ablation
  "only the editor door's answer, or a missing one, counts as taken", and S4's image and Mac shapes with a second
  self-test plant (`plant-editor/`) now own it by behaviour. The Mac shape is a `~/` PDF below an absolute folder
  one cell short, because the files door gives a relative PDF no door (`relative-external`) and `~/` is the one
  absolute spelling J3 lets start a lower row below a row short of the edge. Source: lens A's verdict.
- **D13. Every row is judged for CONSISTENCY, and the corpora cannot own that clause** (lens A's nit). xterm
  resolves a cell from its own row's links alone, so judging only the hovered row would already keep every cell
  (lens A's A2 read 0 cells on every corpus line); judging every row is what makes the chain answer alike from
  each of its rows and keeps its underline off another row's working link. GR10 and rule 18's two row-range
  ablations own it, and `path-spans.ts`' header says so, so a later round does not drop it as "measured safe".
- **D14. HIS RULING OF 2026-10-14, "JOIN ABSOLUTE PATHS ONLY": J10, ONE LINE IN `joinedPathAt`.** Once the joined
  token has met the grammar a row span meets (`tokensInRow`, `looksLikePath`, `stripDecoration`), the chain is refused
  whole unless its `target`, the very string the door is asked about (the joined token past the grammar's opening
  brackets, `file://` and the line suffix), starts with `/` or with `~/`. `~/` is the home exactly as the door expands
  one (`expandHome`, `src/main/fs/path-door.ts:63-67`, takes `~` alone and `~/…`); `~user/…`, `./…`, `../…`, a bare
  name and every other relative spelling are refused. Read after `stripDecoration` and before the first and last
  cells are looked up, beside the grammar's own refusals (§4.6 has the text). **The top piece is the START of its
  path token on its row by construction, and no further clause reads it:** a chain's top piece is its top row's LAST
  whitespace-delimited token past the content head (`upperPiece` over `shapeOf`), so what precedes it on its row is a
  space or the content head (the row's start or the `GUTTER` the join already strips), and the token's first
  character lies inside that piece, because J1 makes the piece end on a path character and no `OPEN` character is
  one, so only the grammar's own opening brackets (`` ' " ` ( [ { < ‘ “ « ``) can sit between the piece's first cell and
  the token's. A prefix glued onto an absolute path (`x=/abs/…`, `--file=/abs/…`, `foo:/abs/…`) is refused by the
  GRAMMAR before J10 reads it, because `=` and `:` are no path segment's characters (`looksLikePath`); one the grammar
  takes (`$HOME/abs/…`, `~me/abs/…`) puts a character other than `/` or `~/` first in the target, and J10 refuses it
  (corrected by the integrator from both builders' reading: this sentence said J10 refused the first three, and with
  J10 taken out they still join from no row); a glued gutter (`•/abs/…`) is the gutter his ruling names.
  U6 pins each spelling (§5.4). A chain whose top would be relative is refused whole and never shortened: its top
  piece is its first piece, so no shorter chain of the same rows has an absolute top to offer in its place.
  Single-row links do not change: J10 is in `joinedPathAt` alone, and `pathSpansInRow`, refusal 8 and the
  provider's hovered-row computation (rule 13) are not touched. D2 and J1 to J9 stay as they are; D16 removes only
  J8 at the chain's top, measured redundant. Measured (§2.4): the census's wrong opens 13,879 to 0 with every right
  join of the census kept, issue 40's rows joined from every row at 45 to 49 columns, 0 regression cells and 0 stale
  wrong-file opens on all 56 lines; the price is 1,401,469 of the committed corpora's 8,260,997 gain cells (17%), every
  one of them a relative join (L4); 694 of them on `prose-outside` files `repo` are joins to the relative `README.md`
  the sentence prints, not the reverify's class (corrected by the integrator, §2.4). Source: his ruling; the
  reverify's census; §2.4.
- **D15. J11, A CUT BY A BREAKER THAT CUTS ANYWHERE, AT EITHER END OF THE CHAIN (the task's open question,
  measured).** J10 does not answer a chain whose joined text begins `/` because the breaker cut just before a `/`
  (`… in /private` above `/tmp/wt-…/docs/` above …), nor one cut mid-name at its bottom (`…/answer.hard` above
  `13:60 today.`). Both begin `/`, both are pieces of a longer printed path, and both can open a real file the screen
  does not name: the first where the rest after that `/` is itself an absolute path (`I saved it to /Users/me/proj`
  above `/tmp/run-logs/nightly-build-` names `/tmp/run-logs/…`), the second where a shorter name sits beside the
  printed one (`index.js` beside `index.js.map`, `answer.hard` beside `answer.hard13`). The reverify's nit layout is
  both at once; it opened `answer.hard` where the screen names `answer.hard13` through its BOTTOM cut, while its top
  cut, `/tmp` for `/private/tmp`, happens to name the same file. Both come from one breaker: wrap-ansi's hard mode,
  which Ink draws an agent's text with, moves a token that fits a row to the next and cuts a longer one at the row's
  limit wherever it falls, so every row it cuts ends at ONE column, short of the pane's edge once the pane is wider
  than that limit, and J7 (which reads a break short of the edge after `/` or `-` as an agent's) lets the walk cross
  exactly the cuts that land after `/` or `-` and stop at the others. **J11 refuses the chain whole when its top row
  holds only its piece, starting on a path character, below a row that ends on a path character at the same column
  short of the edge; or when its bottom row holds only its piece, ending on a path character at the same column as
  the row above it short of the edge, above a row whose content starts with a path character.** It sits after J6's
  top clause, where J8's top clause was (D16), and reads `belowBottom` and `firstBelow` from J9. Chosen against three
  alternatives over the census (§2.4): it takes the top cuts from 3,928 layouts to 2 and the mid-name bottom cuts from
  30,473 to 9 for 2,255 right layouts of 366,839 (0.61%); "the row above holds a `/`", the extension the reverify's nit
  suggested, leaves 34 top cuts and every bottom cut and costs 26% of the listing family's right join rows, because a
  `find` listing's previous path is a row holding a `/`; "a lone bottom row above a path character" costs 26,203 right
  layouts; and a door-based rule (refuse a join the door would also accept lengthened by its neighbouring piece)
  would refuse fewer right joins but asks the door two more targets a hover and is a second construction beside D2,
  which belongs to its own phase (§12). On the committed corpora J11 costs 4,431 gain cells of 6,859,528 and moves no
  regression; on the margin corpora it takes the top and mid-name cuts to 0 (§2.4). Its price is L9. Source: the
  task; the reverify's nit; §2.4.
  **Corrected by the fix round of his absolute-only round (2026-10-15).** "Every row it cuts ends at ONE column" is
  wrap-ansi's hard mode alone. Python's and Rust's textwrap also break after `-`, so their other rows end short of
  the limit; Tortie's xterm draws an emoji Ink counts as two cells in one, so Ink's row holding it ends a column
  early; a breaker that breaks before `/` ends its rows anywhere; and J11 read no full row, so a soft wrap ending in
  `]` before `/` escaped it. The attack lens opened `cmd.hard` for `cmd.hard13`, `/private/tmp/…` for
  `~/h/bbb…/tmp/…` and 1,014 hostile-tree layouts' twins through exactly those, where the parent opened nothing. J11
  now asks, at each end the walk stopped, whether a breaker of any limit the chain allows (never below the widest row
  it draws, counted as a breaker counts) could have cut there, and refuses the chain whole if one could; the rule,
  its owners and its price are §As built, absolute only: the fix round. The one-column rule and its alternatives
  above are this decision's history.
- **D16. J8 AT THE CHAIN'S TOP IS REMOVED, MEASURED REDUNDANT UNDER J10.** It refused a chain whose top piece is a
  folder short of the edge unless the piece matched ``^[`'"(\[{<]*(\/|~\/)``. Every chain it refuses that J10 does not
  begins `file:///`, or a curly opener (`‘ “ «`) the grammar strips and its own set does not, so all it still did was
  refuse absolute joins. Over every hovered row of the ten corpora (1,898,668), J10's build with and without it answers
  identically (§2.4's differential). Its rule-17 ablation would own no reading that moves, which the gate
  refuses, and its three readings (`j8-top-bullet`, `j8-top-alone`, `issue-50-bottom`) now belong to J10's ablation.
  J8 in `joinBoundary` stays: under J10 it still decides one absolute shape, a relative folder one cell short of the
  edge after other words above a row that starts `~/` (the `~/` unit is two cells, so J3 passes), where it lets the
  `~/` path below join on its own instead of gluing it to the folder and refusing both (`b8-tilde-below`, §6.3).
  Source: the task ("unless the spec measures one redundant"); §2.4.
- **D17. THE COMMITTED INSTRUMENT SEES BOTH CLASSES (the reverify's minor).** Every committed generator wraps at the
  pane's own width, so no cut below a breaker narrower than the pane ever arose in it, and no committed line could see
  a cut that opened the project's own file (the 694 gain cells `prose-outside` files `repo` reads at HEAD are joins to
  a printed `README.md`, §2.4 as corrected). §7.7
  moves the census's margin regime into `build/p3471/generate.mts` (`prose-margin`, `listing`), gives every list and
  prose layout the spellings it printed, adds the `twin` regime (the other folder's tree beside the project's, the
  census's setup modelled), counts on every line of every layout that carries its printed spellings a join that
  opens anything else (required 0 on `repo` and `twin`), adds a door-free cut report (0 relative cuts anywhere, and 0
  top and mid-name cuts on the prose family, `prose-margin` and `listing`), and two plants that must be caught,
  `--plant-abs` (J10 out) and `--plant-j11` (J11 out); `--plant-j9` is re-judged where J9's cuts still open something
  under J10. The real-disk census stays a verification tool (`abs/spec/tool/run-census.mjs`, §9.4): it reads a
  second checkout at a fixed path, which no committed gate may. Source: the reverify's minor; §2.4.

## 4. The build, file by file

Apply the kept work by file from `/private/tmp/wt-p3471` (cwd), NEVER with `--3way` (it writes the index):

```
K=/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3471/kept
git apply --include=src/shared/path-spans.ts --include=src/renderer/terminal/path-links.ts $K/p347-issue40-wip.patch   # builder join, exit 0
git apply --include=build/p247/path-open.mjs $K/p347-issue40-wip.patch                                              # builder gate, exit 0
git apply --reject --include=build/conformance-pathdoors.mjs $K/p347-issue40-wip.patch; rm build/conformance-pathdoors.mjs.rej   # builder gate, exit 1 by design: the rejected hunk is rule 5's row main holds
cp $K/p347-path-join.test.ts src/shared/__tests__/p347-path-join.test.ts                                              # builder join
cp $K/p347-path-links-join.test.ts src/renderer/terminal/__tests__/p347-path-links-join.test.ts                       # builder join
```

### 4.1 Builder `join` — the product and its unit tests

- `src/shared/path-spans.ts`: the kept hunks, then append after `joinedPathAt`, byte for byte (rule 18 anchors on
  these lines; a deliberate change is reported to the gate builder and the integrator):

```ts
/**
 * THE ROW'S OWN SPANS, AS THE PROVIDER DERIVES THEM (Phase 347.1).
 *
 * Exactly `pathSpansInRow` with the arguments `PathLinkProvider.provideLinks`
 * hands it when row `i` is hovered: the row as drawn, its own column map, the
 * pane's width, and the row above as drawn with its own end column, 0 when
 * there is no row above and null when that row's map cannot answer. The
 * governing rule asks it of every row a join covers, so what it calls a row's
 * link is what that row draws today.
 */
export function rowSpansAt(
  rows: (i: number) => DrawnRow | null,
  i: number,
  width: number
): PathSpan[] {
  const here = rows(i);
  if (here === null) return [];
  const above = i > 0 ? rows(i - 1) : null;
  return pathSpansInRow(here.text, {
    width,
    columns: here.columns,
    above: above === null ? null : above.text,
    aboveEnd: above === null ? 0 : (above.columns[above.text.length] ?? null)
  });
}

/** A row span a join would cover: its buffer row, its target and its xterm range. */
export interface SpanUnderJoin {
  row: number;
  target: string;
  range: { start: number; end: number };
}

/**
 * THE GOVERNING RULE'S FACTS (Phase 347.1, build/p3471/SPEC.md D2).
 *
 * Every row span, on every row the join covers, that shares a cell with it,
 * or null when a row the join covers cannot be read, which refuses the join.
 * The door is the provider's: a join is offered only when the door refuses
 * every one of these, so a join never takes a cell from a link that opens
 * today.
 */
export function spansUnderJoin(
  rows: (i: number) => DrawnRow | null,
  join: JoinedSpan,
  width: number
): SpanUnderJoin[] | null {
  const out: SpanUnderJoin[] = [];
  for (let r = join.top; r <= join.bottom; r += 1) {
    const here = rows(r);
    if (here === null) return null;
    for (const span of rowSpansAt(rows, r, width)) {
      const range = spanColumns(span, here.columns);
      if (range === null) continue;
      if (sharesCellWithJoin(range, r, join)) out.push({ row: r, target: span.target, range });
    }
  }
  return out;
}
```

  plus `sharesCellWithJoin` moved here from `path-links.ts` with its doc comment and body unchanged (exported), and
  the D10 paragraph appended to the header's last section. Nothing existing renamed or reordered.
- `src/renderer/terminal/path-links.ts`: the kept hunks, then, inside `provideLinks` only, the kept `const join =
  joinedPathAt(` block is replaced by (byte for byte):

```ts
    // PHASE 347 (issue 40) and 347.1. ONE reader of drawn rows for the join
    // and for the governing rule: the same rows, their own column maps and
    // the same width; `isWrapped` is never read.
    const drawnRow = (i: number): DrawnRow | null => {
      const drawn = buffer.getLine(i);
      return drawn === undefined
        ? null
        : { text: drawn.translateToString(true), columns: cellColumns(drawn) };
    };
    const candidate = joinedPathAt(drawnRow, y, buffer.length - 1, this.term.cols);
    // PHASE 347.1, THE GOVERNING RULE's facts, read now and before any await:
    // every span a row the candidate covers draws today that shares a cell
    // with it. A row that cannot be read refuses the join.
    const under = candidate === null ? null : spansUnderJoin(drawnRow, candidate, this.term.cols);
    const join = under === null ? null : candidate;
```

  the call becomes `void this.linksFor(spans, columns, bufferLineNumber, join, under ?? []).then(callback);`, and in
  `linksFor` (new parameter `under: SpanUnderJoin[]`) the targets and the acceptance read, byte for byte:

```ts
    const targets = spans.map((s) => s.target);
    const joinAt = targets.length;
    if (join !== null) targets.push(join.target);
    const underAt = targets.length;
    for (const u of under) targets.push(u.target);
    const answers = await Promise.all(
      targets.map((target) => this.doorFor(target, base))
    );
    // J4. The join is offered only when the door accepts the joined target.
    const joinAnswer = join === null ? undefined : answers[joinAt];
    // THE GOVERNING RULE (Phase 347.1). A join never takes a cell from a row
    // span the door already accepts, on any row it covers; an answer that is
    // missing counts as accepted.
    const taken = under.some((_, k) => answers[underAt + k]?.door !== null);
    const accepted =
      join !== null && joinAnswer !== undefined && joinAnswer.door !== null && !taken
        ? join
        : null;
```

  `sharesCellWithJoin` is imported from `@shared/path-spans` (no second definition, no re-export). The hovered
  row's own computation (`row`, `columns`, `lineAbove`, `above`, `spans` and the `pathSpansInRow` call) is not
  touched: rule 13 reads it. The header paragraph per D10.
- `src/shared/__tests__/p347-path-join.test.ts`: the kept file, unchanged (every PJ case passes with D2, §2.2).
- `src/renderer/terminal/__tests__/p347-path-links-join.test.ts`: the kept file, re-pointed for D2 and nothing
  else: `sharesCellWithJoin` imported from `@shared/path-spans`; PL1's first two cases and PL2's "really is a
  different reading when the door accepts" use a door table holding the whole file and `/a/other.md` and NO
  fragment (`JOIN_ONLY`); PL3 is rewritten as "the whole path and a fragment both exist: every row reads as today"
  (from rows 2, 3 and 4 the links equal the `joinOff` reading; a press on the bottom fragment opens
  `${BASE}/.planning/brainstorming.md`, never the whole file; the top fragment at 47 columns opens itself).
- NEW `src/shared/__tests__/p3471-spans-under-join.test.ts` and NEW
  `src/renderer/terminal/__tests__/p3471-governing-rule.test.ts` (§5).

### 4.2 Builder `gate` — the gate, arm E, and the shared stage

- NEW `build/p3471/stage.mjs`, written FIRST (the corpora builder imports it): rule 17's `stageProvider` and its
  rule-17 probe's `cellsOf` and `fakeLine`, moved verbatim and exported, with the door module's path a parameter:
  `stageProvider(text, doorsPath) -> { text, loose }`, `writeStage(dir, { spans, links })` (writes `path-spans.ts`,
  `path-links.ts`, `bridge-stub.ts`, `store-stub.ts` exactly as rule 17 does), `cellsOf(text)`, `fakeLine(text)`.
  Plain `.mjs`, no imports beyond `node:fs` and `node:path`. Rule 17 and rule 18 import it; nothing is duplicated.
- `build/conformance-pathdoors.mjs`: the kept hunks (rule 17 and its header item), then §6: rule 17's read half
  re-pointed to the one reader, its provider fixtures re-pointed for D2, its probe importing `fakeLine` from
  `build/p3471/stage.mjs` by file URL, and NEW rule 18 in the same tsx process. The gate's header gains item 18 and
  its measured time.
- `build/p247/path-open.mjs`: the kept hunk (arm E opens the whole file from the head and the tail row; a press past
  its end opens nothing). Arm E's fragments name no file of their own, so D2 does not change it.

### 4.3 Builder `corpora` — `build/p3471/` (§7)

NEW `build/p3471/corpora.mjs`, `build/p3471/generate.mts`, `build/p3471/compare.mts`,
`build/p3471/fixtures/repo-paths.txt`. It imports `build/p3471/stage.mjs` (the gate builder's) and
`build/ts-runner.mjs`'s `tsxCli()`; it never imports `build/conformance-pathdoors.mjs`, which runs the gate on import.

### 4.4 Builder `probe` — `probe:p347` (§8)

`build/p347/probe-p347.mjs`, `build/p347/fixtures/readings.json`, `build/p347/fixtures/breaks.json`.

### 4.5 The integrator

`package.json` (`"measure:p3471": "node build/p3471/corpora.mjs"`), `build/verification-checks.mjs` (its
classification, §9.2), `CLAUDE.md` (§9.3), `CHANGELOG.md` (§11), and this file's `§As built`. It runs §9.1 and
scans the delta for duplicated 10+ line blocks (rule 17's old `stageProvider` and `cellsOf` must be gone from
`conformance-pathdoors.mjs`).

### 4.6 His absolute-only round (2026-10-14): the build, file by file

Every builder works in `/private/tmp/wt-p3471` on the tree the ruled round left, and owns exactly its §15a files.
The spec's prototype of `path-spans.ts` is `<scratchpad>/p3471/abs/spec/path-spans.pf.ts` (its diff against today's
file, `abs/spec/j10-j11.diff`) and of the generators `abs/spec/clone/build/p3471-proto/generate.mts`
(`abs/spec/generate-proto.diff`): a builder may start from them, and the anchored lines below are binding whichever
way it starts. **No `git apply`; edit by hand or with `patch` on a copy.**

**Builder `join`, `src/shared/path-spans.ts`.** Three edits to `joinedPathAt` and the header; nothing else moves.

1. Replace the whole `// J8 AT THE CHAIN'S TOP …` comment and its `if (…) { return null; }` (today between J6's top
   clause and `const bottomPiece = lowerPiece(bottomRow.shape);`) with J11, byte for byte from `const aboveTop` to the
   second `return null;` (rule 17's two J11 ablations anchor on `    aboveTop !== null &&\n` and
   `    aboveBottom !== null &&\n`, and `--plant-j11` on the same two lines; the comment above is the builder's to word,
   naming D15, wrap-ansi's hard mode and the nit's rows):

```ts
  const aboveTop = read(top - 1);
  if (
    aboveTop !== null &&
    topRow.shape.tokens.length === 1 &&
    PATH_CHARACTER.test(topRow.shape.tokens[0]?.text[0] ?? '') &&
    PATH_CHARACTER.test(upperPiece(aboveTop.shape)?.text.slice(-1) ?? '') &&
    topRow.shape.end !== undefined &&
    topRow.shape.end < width &&
    aboveTop.shape.end === topRow.shape.end
  ) {
    return null;
  }
  const aboveBottom = read(bottom - 1);
  if (
    aboveBottom !== null &&
    firstBelow !== undefined &&
    PATH_CHARACTER.test(firstBelow.text[0] ?? '') &&
    bottomRow.shape.tokens.length === 1 &&
    PATH_CHARACTER.test(bottomRow.shape.tokens[0]?.text.slice(-1) ?? '') &&
    bottomRow.shape.end !== undefined &&
    bottomRow.shape.end < width &&
    aboveBottom.shape.end === bottomRow.shape.end
  ) {
    return null;
  }
```

2. After `if (target.length === 0) return null;` (right after `stripDecoration`), J10, its code line byte for byte
   (rule 17's J10 ablation, `--plant-abs` and S7 anchor on it; the comment above it is the builder's, naming D14, his
   words, the reverify's census and why the top piece is its token's start by construction):

```ts
  if (!target.startsWith('/') && !target.startsWith('~/')) return null;
```

3. The header and the two doc comments say it, in the same commit:
   - the header's "WHAT PHASE 347 JOINS" paragraph: "Every refusal here is WHOLE, never a shorter chain" becomes the
     truth of D5's correction (the governing rule, the caps and J9 refuse a chain whole; J3, J5, J7 and J8 only stop
     the walk, so a chain can be a PIECE of a longer path), and a new section after "WHY EVERY ROW, AND WHO OWNS THAT",
     headed `JOIN ABSOLUTE PATHS ONLY (his ruling of 2026-10-14)`, says J10, why a relative piece is the one that opens
     the project's own copy (the reverify's census), why the top piece starts its token by construction, J11 and the
     breaker it reads, and that both are refusals only, so a refused chain leaves every row as today (D2);
   - `joinBoundary`'s doc comment: its first line drops nothing (J8 still lives there);
   - `joinedPathAt`'s doc comment: "J8 at the chain's top" goes; "J10 on the joined target and J11 at the chain's two
     ends" joins the list.

`src/renderer/terminal/path-links.ts`: one sentence in the header's "A path broken over rows" paragraph, that a join
is offered only when the joined path starts with `/` or `~/` (`@shared/path-spans`' J10). No code. Rule 13's, 17's and
18's read halves strip comments, so nothing they read moves.

**The four test files (`join`)**, every relative join re-pointed by one rule: a case that expects a RELATIVE join now
expects none from any row (J10), and its clause gains an ABSOLUTE twin (the same rows with the path under `/r/`,
`/p/` or `~/`, widths moved so the same cells sit where they sat) that carries the control the relative case carried.
The fourteen cases §2.4 lists are the whole of what J10 + J11 turned red; each is re-pointed so, and §5.4 adds U6, U7,
GR13 and GR14. `p347-path-join.test.ts`'s comments that name "J8 at the chain's top" name J10.

**Builder `gate`, `build/conformance-pathdoors.mjs`**: §6.3.

**Builder `corpora`, `build/p3471/generate.mts`, `compare.mts`, `corpora.mjs`**: §7.2b and §7.7.

**Unchanged this round, and why.** `build/p347/probe-p347.mjs` and its fixtures (every P arm prints an absolute
path; P1 to P4 end on a row of more than one token and P2's rows are full, so J11 never reads them; P5, P6, P7 and P8
expect no join, so a refusal by J11 in place of J5, J7 or the governing rule reads the same; §8);
`build/p247/path-open.mjs` (arm E is absolute and its rows end on more than one token); `build/p3471/stage.mjs`;
`package.json` (`measure:p3471` keeps its name). The integrator owns `CLAUDE.md`, `CHANGELOG.md`,
`build/verification-checks.mjs` (its `measure:p3471` comment names the twelve corpora and the measured time) and this
file's §As built.

## 5. The unit tests, and the clause each owns

### 5.1 `src/shared/__tests__/p3471-spans-under-join.test.ts` (join), pure

- U1 `rowSpansAt` equals `pathSpansInRow` with the provider's own arguments (the row as drawn, its map,
  `width`, the row above and `cellColumns(above)[above.length] ?? null`, `0` for row 0) on every row of a table:
  issue 40's rows at 45 to 52 columns, a row ending on the last column, a row-head span below a full row ending on a
  path character (refusal 8's head clause), a padded predecessor, a `⚠️ `-decorated row, row 0, and a predecessor
  whose map stops short (`aboveEnd` null). Proved can fail: the same table with `above` dropped reads differently.
- U2 `spansUnderJoin` over issue 40's rows with `/a/other.md` beside the bottom piece returns the three pieces and
  never `/a/other.md`; cells after the top piece and the bottom row's gutter are inside the join's range (the kept
  cell test) and hold no span.
- U3 `spansUnderJoin` answers null when a row inside the join reads null on the second read (a reader that answers
  once and then null).
- U4 `sharesCellWithJoin` answers the kept table (`p347-path-links-join.test.ts`'s last case) from its new home, and
  `path-links.ts` declares no function of that name.
- U5 (the fix round, D11, as his ruled round made it) J9: the stale upper row refuses from either row, the same rows
  as a 47-column repaint draws them join at column 38, the stale row at the 49 columns it was drawn at joins; a lower
  piece running into the stale cells refuses beside its control; and the width is read in cells (a `中文` row of 45
  characters and 47 cells is not past it). His ruled round: stale cells AFTER the lower piece now refuse too (the fix
  round kept that join), beside the same rows drawn fresh; lens B's own G-stale-midwrap rows (the stale row the
  buffer's first) refused from both rows beside their clean twin; the reverify's F1 at 38 columns, X1 joining the whole
  path in the other folder from every row and X2 (leftover glued) and X3 (a blank cell away) joining from no row,
  with the two lower rows shown to join when nothing past the width sits above them; the prefix case
  (`fixtures/parent-record-b-` with `ests_` left past 31 columns, above `first.json`), refused from every row beside
  its clean twin; and the row below a chain whose first piece reaches past the width, refused beside its control.

### 5.2 `src/renderer/terminal/__tests__/p3471-governing-rule.test.ts` (join), the provider over a stub buffer and door

A `vi.mock('@shared/path-spans')` switch `governingOff` makes `spansUnderJoin` answer `[]`, so every case below
also asserts that with the switch on its reading DIFFERS (each clause can fail). A second switch `joinOff` (the kept
one) gives today's links.

- GR1 issue 40's rows at 47 with the bottom fragment's own spelling a file: from rows 2, 3 and 4 the links equal
  `joinOff`'s; the bottom press opens the fragment.
- GR2 the top fragment a file (47 columns, so refusal 8 does not hide it): every row equals `joinOff`.
- GR3 the middle piece's spelling accepted (a door that accepts a folder, the existence door's shape): every row
  equals `joinOff`.
- GR4 the third reverify's shapes, each 1, 2 and 3 cells short of the edge, both spellings files:
  `• /r/tortie/docs/` above `• notes/a.md`, the same with `~/tortie/docs/`, and `• /r/tortie/src/n8kk-` above
  `• draft8.md`: every row equals `joinOff`, and the lower press opens the item's own file.
- GR5 a relative folder ON the last column above `  notes.md` and above `⎿  notes.md`, both spellings files: every
  row equals `joinOff`.
- GR6 a fragment refusal 8 hid: issue 40 at 45 columns with the top fragment's spelling a file (its end is the last
  column) and, separately, with the middle piece's spelling accepted (the full top row ends on `-`, so refusal 8's
  head clause hid it): the join IS offered from all three rows, because neither fragment drew a link today.
- GR7 an accepted span beside the join on its bottom row (`/a/other.md`): the join is offered and `/a/other.md`'s
  link is kept.
- GR8 a row that answers once and then undefined: no join; the hovered row's links equal `joinOff`'s.
- GR9 every target in `U(J)` is asked through `classify`, the join's target too, with one base.
- GR10 from every row of a chain the answer is the same: all offer the join or none does.
- GR11 (the fix round, D12) the door's kind does not matter: a bottom fragment the image door accepts
  (`.planning/shot.png`) and a `~/brief.pdf` the Mac door accepts, below an absolute folder one cell short, each
  read every row as today, the rule out reads the join, and a press opens the fragment through its own door
  (`openInTortie` for the image, `openOnMac` for the PDF).
- GR12 (his ruled round, D11) the reverify's F1 through the shipping provider at 38 columns, with a door that opens
  the project's own `build/fixtures/facts/manifests/package.json` and nothing in the other folder: X2 and X3 read
  every row as `joinOff` does and a press on the lower rows opens nothing; the same two rows with nothing past the
  width above them DO join and open that file at line 134, so the row above is what refuses the join, whole.

### 5.3 The two kept files (join), as §4.1 re-points them; every PJ case unchanged.

### 5.4 His absolute-only round's cases (join)

- **The re-pointing.** In `p347-path-join.test.ts`: PJ4's J2-middle case reads `dddd/eeee.md` from the bottom no more
  (J10): its middle row's second token becomes an absolute folder (`/dd/` or as fits the width) so the bottom chain
  joins an absolute path, and the relative spelling is kept beside it as "no join from any row". J8's case: the
  relative rows read no join (J10) whatever J8 does; its boundary assertions (`joinBoundary`) stay, because J8 still
  lives in `joinBoundary`, and its chain control on the last column becomes absolute; and NEW, `b8-tilde-below`'s
  rows at 11 columns: `moved src/` (one cell short of the edge) above `~/proj/xxx-` (on the last column) above
  `y.md now` join `~/proj/xxx-y.md` from rows 2 and 3, where without J8 the walk glues `src/` on and J10 refuses the
  three (verified both ways on the prototype). "J8 at the chain top" becomes "a relative chain
  top is refused by J10", its absolute control kept. In `p3471-spans-under-join.test.ts`: U5's seven relative
  controls (the fresh twins of the stale rows, X1, the two lower rows shown to join, the prefix's clean twin where it
  is relative, the row below's control) become absolute twins under `/p/` (`Please open ${'z'.repeat(26)} /p/deep/`
  above `folder/one.ts:5 now open it` at 47 joins `/p/deep/folder/one.ts:5`; with a stale `de` past 47 it joins
  nothing, §2.4), and every relative reading of the same rows is asserted "no join from any row". In
  `p3471-governing-rule.test.ts`: GR5's relative folder ON the last column above `  notes.md` and `⎿  notes.md`
  becomes `/r/tortie/docs/research/` with the door accepting both `/r/tortie/docs/research/notes.md` and
  `/r/tortie/notes.md`, every row reading as `joinOff`, and the switch on reading the join; GR12's X2 and X3 keep
  "every row as today, no press opens a file", and its "the two lower rows DO join with nothing above them" control
  becomes the rule's own: those lower rows are relative and join from no row (J10), so the row-above clause's control
  moves to an absolute twin: `x`, `'Plan:' + ' '.repeat(5) + ' zz'`, `/r/aaa-`, `bbb.md now`, `y` at 10 join nothing,
  and the same rows with `Plan:` alone (nothing past the width) join `/r/aaa-bbb.md` from rows 2 and 3 (both read on
  the prototype; rule 17's `j9a-row-above`, §6.3).
- **U6 J10, pure.** Issue 40's rows at 45 to 49 join from rows 1, 2 and 3 (PJ1's, asserted again here beside the
  rest). The reverify's E1 rows drawn at 46 (`⏺ Updated /private/tmp/wt-p3471-parent-rv2/`, `  src/main/__tests__/menu-popup-`,
  `  template.test.ts:38 and ran the tests.`) at 46 join the whole absolute path from all three rows, and at 47, 48, 49
  and 50 join nothing from any row (HEAD today: the relative tail from rows 2 and 3). Its 40-cell row at 38 columns,
  `Plan at /private/tmp/p3471rv2-app/othe`, `r/`, `build/fixtures/facts/manifests/package`,
  `.json:134 and the rest follows.`, joins nothing from rows 3 and 4 (today's HEAD:
  `build/fixtures/facts/manifests/package.json:134`); rows 1 and 2 still offer the folder
  `/private/tmp/p3471rv2-app/other/`, which no door opens. Issue 40's rows with the top row's leading `/` taken off (`Users/johnberryman/projects/github/arcturus-`) join
  nothing from any row at 45 (today's HEAD joins the relative `Users/johnberryman/…/brainstorming.md:134` from all
  three). Spellings, each at a width where J1 to J9 pass: `(/abs/foo-` and
  `` `~/abs/foo- `` and `file:///abs/foo-` above `bar.md now` join (`/abs/foo-bar.md`, `~/abs/foo-bar.md`,
  `/abs/foo-bar.md`); `•/abs/foo-` (a gutter glued on) joins; `~me/foo-`, `./foo-`, `../foo-` and `foo-` join nothing;
  `x=/abs/foo-` joins nothing. And the construction itself, by a property over every chain the tests above answer:
  the target's first character is the first non-opening-bracket character of the top piece, and the top piece is its
  row's last token.
- **U7 J11, pure** (every expectation below read on the prototype). The top half: `I saved it to /Users/me/proj`
  above `/tmp/run-logs/nightly-build-` above `output.log today.` at 32 columns joins nothing from any row; its control,
  the first row one cell shorter (`I saved it to /Users/me/pro`, so the two rows no longer end at one column), joins
  `/tmp/run-logs/nightly-build-output.log` from rows 2 and 3: the column decides, not the text. The bottom half:
  `I updated /Users/me/proj/dist/` above `assets/vendor-chunk-a/index.js` above `.map today.` at 33 joins nothing;
  its control, `assets/vendor-chunk-ab/index.js` in the middle (one cell longer), joins
  `/Users/me/proj/dist/assets/vendor-chunk-ab/index.js` from rows 1 and 2. Both halves: the reverify's nit at 38
  joins nothing from any row. The price, pinned (L9): `Two files changed: ~/tortie/` above
  `.claude/scheduled_tasks.lock` above `and ~/tortie/docs/audits/` above `contract-baseline.txt.` at 31 joins nothing.
  And the same paths soft-wrapped by the terminal at the pane's width (every row but the last full) join whole: J11
  reads only rows short of the edge.
- **GR13 J10 through the shipping provider.** E1 at 47 with a door that opens the project's
  `src/main/__tests__/menu-popup-template.test.ts` and nothing in the other folder: every row reads as `joinOff` and
  no press opens a file; at 46 with a door that opens the other folder's file, the join opens it at line 38 from every
  row. That it can fail is the builder's clone ablation (§15a): J10's line taken out, E1 at 47 joins the project's
  file and the case reads red.
- **GR14 J11 through the shipping provider.** The nit at 38 with a door that opens both
  `/tmp/wt-p3471-parent-rv2/docs/research/assets/58/answer.hard` and `…/answer.hard13`: every row reads as `joinOff`
  and no press opens a file. The index.js rows at 33 with a door that opens both `…/index.js` and `…/index.js.map`:
  the same.

## 6. The gate clauses (`build/conformance-pathdoors.mjs`, builder `gate`)

### 6.1 Rule 17, the kept rule, re-pointed for D2 and the one reader

- Read half: `joinWiringFindings` reads `joinedPathAt(<reader>, y, buffer.length - 1, this.term.cols)` and
  requires `<reader>` to be one `const` arrow in `provideLinks` whose body holds `translateToString(true)` and
  `columns: cellColumns(`. Every kept wiring plant is cut from the new text and must still read as a finding.
- Provider fixtures: `p-accepted-top`, `p-accepted-bottom`, `p-accepted-45` use doors that accept the whole file
  and `/a/other.md` and NO fragment. The door clause and the fragment clause each own a fixture D2 does not decide:
  `p-refused-bare-*` (no fragment and no whole file accepted, `/a/other.md` only) for the door clause, and the kept
  `p-refused-*` (every fragment accepted, the whole file not) for the fragment clause. Every kept ablation still moves
  a reading it owns; the counts are re-pinned and printed.
- The fix round (D11): six join readings (`j9-stale-upper` from either row, `j9-fresh-upper`, `j9-stale-lower`,
  `j9-fresh-lower`, `j9-stale-after-piece`) and four boundaries (`b-j9-upper`, `b-j9-lower`, `b-j9-control`,
  `b-j9-drawn-at-49`), every expected value derived by hand, and two ablations, the upper clause (owns the stale
  upper readings and `b-j9-upper`) and the lower clause (owns `j9-stale-lower` and `b-j9-lower`). Four kept
  fixtures a pane cannot draw were made drawable, because J9 refuses them: `j2-hovered` and `j2-hovered-below`
  (a 20-cell row at 19 columns), `j8-full` and `b-j8-head` (an 11-cell lower piece at 10 and 6 columns).
- His ruled round (D11): `j9-stale-after-piece` now reads no join (beside `j9-fresh-after-piece`), and `b-j9-lower`
  reads `1`, because a lower piece past the width is no longer the boundary's to refuse; fifteen join readings
  added, every value derived by hand: lens B's own G-stale-midwrap with its clean twin (`j9-g-stale-midwrap`,
  `j9-g-clean-midwrap`), the prefix case (`j9-prefix-clean`, `-top`, `-bottom`), the reverify's F1 (`j9-f1-x1-top`,
  `-x1-bottom`, `-x2-middle`, `-x2-bottom`, `-x3-middle`, `-x3-bottom`, `-below-alone`) and the row below
  (`j9-below-reach`, `-control`); two provider readings, `p-j9-f1-x2` and `p-j9-f1-x3`, where a door that opens the
  project's own file of the tail's name draws nothing on the lower rows, as today. The lower-clause ablation is gone
  with its clause; three ablations take its place, one per clause of `joinedPathAt`'s J9: the row above (owns the
  four F1 X2 and X3 readings and both provider readings), the bottom row (owns `j9-stale-lower`,
  `j9-stale-after-piece` and both prefix readings) and the row below (owns `j9-below-reach`); the upper half's now
  owns `j9-g-stale-midwrap` too. `p-accepted-45` reads a bottom row shortened to fit 45 columns (its 46-cell row is
  one no pane draws, and J9 refuses it); the second path it shortens is not in that fixture's door.

### 6.2 Rule 18, NEW: A JOIN NEVER TAKES A CELL FROM A ROW SPAN THE DOOR ACCEPTS (Phase 347.1)

Driven in rule 17's one tsx process, over staged copies through `build/p3471/stage.mjs`:

- R18-F provider fixtures, each graded against TODAY's links re-derived by the probe without the provider (the
  kept `:today` re-derivation): `g-fragment-top`, `g-fragment-bottom`, `g-fragment-middle` (GR1 to GR3),
  `g-list-abs`, `g-list-tilde`, `g-list-dash` (GR4 at 1 cell short), `g-indent-edge` (GR5), each reading exactly
  today's links from every row; `g-edge-45` and `g-edge-head-45` (GR6) reading the join; `g-beside` (GR7) reading the join and
  `/a/other.md`; `g-row-gone` (GR8) reading today's links.
- R18-E for every row of every R18-F fixture, `rowSpansAt` answers the same targets and ranges as today's
  re-derivation.
- R18-R read, with plants cut from the shipping text: `spansUnderJoin(` is called in `provideLinks` with the SAME
  reader identifier `joinedPathAt(` is handed and `this.term.cols`; `under === null ? null : candidate`; the
  under-targets are pushed into `targets` before the one `Promise.all`; `taken` reads `?.door !== null`; `accepted`
  requires `!taken`; `spansUnderJoin` calls `rowSpansAt(` and `sharesCellWithJoin(`; `rowSpansAt` calls
  `pathSpansInRow(`; exactly one declaration of `sharesCellWithJoin` under `src/`.
- Ablations, one clause each, each required to move the reading it owns (anchors are §4.1's lines):

| Ablation | From → to | Owns |
| --- | --- | --- |
| G off | `&& joinAnswer.door !== null && !taken` → `&& joinAnswer.door !== null` | g-fragment-*, g-list-*, g-indent-edge |
| only the bottom row judged | `for (let r = join.top; r <= join.bottom; r += 1) {` → `for (let r = join.bottom; r <= join.bottom; r += 1) {` | g-fragment-top |
| only the top row judged | `for (let r = join.top; r <= join.bottom; r += 1) {` → `for (let r = join.top; r <= join.top; r += 1) {` | g-fragment-bottom |
| the width ignored | in `rowSpansAt`, `    width,\n    columns: here.columns,` → `    width: Number.POSITIVE_INFINITY,\n    columns: here.columns,` | g-edge-45, R18-E |
| the predecessor dropped | `    above: above === null ? null : above.text,\n    aboveEnd: above === null ? 0 : (above.columns[above.text.length] ?? null)` → `    above: null,\n    aboveEnd: 0` | g-edge-head-45, R18-E |
| an unreadable row keeps the join | `    if (here === null) return null;\n    for (const span of rowSpansAt(` → `    if (here === null) continue;\n    for (const span of rowSpansAt(` | g-row-gone |
| the cell test widened to whole rows | `if (sharesCellWithJoin(range, r, join)) out.push(` → `if (true) out.push(` | g-beside |
| the under-targets never asked | `    for (const u of under) targets.push(u.target);\n` → `` | p-accepted-* (fail closed: the join is never offered) |
| only the editor door's answer is taken (the fix round, D12) | `answers[underAt + k]?.door !== null` → `answers[underAt + k] === undefined \|\| answers[underAt + k]?.door === 'editor'` | g-fragment-image, g-fragment-mac |

The fix round adds `g-fragment-image` and `g-fragment-mac` (GR11), each reading today's links from every row with
the fragment's link held and its press opening the fragment through its own door; G off owns them too.

Rule 13 and every other rule stay green unedited. The rule says in its header that D2 is the guarantee and J1 to J8
the shape rules, and names research 115 §4.

### 6.3 His absolute-only round (builder `gate`)

Every expected value below derived by hand and read on the prototype (§2.4). The rule: a reading that pinned a
RELATIVE join now pins `""` (no join from that row), and the clause that owned it gets an ABSOLUTE twin to own. Every
row list below is the rows between a leading `''` and a trailing `''`, `'>'`, exactly as the prototype read them
(so the reading's rows are 0-based from that `''`), unless it names its own first and last rows (`x`, `y`).

- **Rule 17, J10.** NEW ablation "J10, his ruling, is not asked" (`  if (!target.startsWith('/') && !target.startsWith('~/')) return null;\n`
  → nothing), owning the readings that read a relative join before J10 and read `""` now: `j2-middle-up`, `j8-full`,
  `j8-top-full`, `j8-top-bullet`, `j8-top-alone`, `issue-50-bottom`, `j9-fresh-upper`, `j9-g-clean-midwrap`,
  `j9-fresh-lower`, `j9-fresh-after-piece`, `j9-f1-below-alone`, and NEW `j10-e1-47` and `j10-e1-50` (the reverify's
  E1 rows drawn at 46, read at 47 and 50, hovered on the bottom row), `j10-x40` (its rows `Plan at /private/tmp/p3471rv2-app/othe`,
  `r/`, `build/fixtures/facts/manifests/package`, `.json:134 and the rest follows.` at 38, hovered on row 4:
  `build/fixtures/facts/manifests/package.json:134@3.0-4.9` with J10 out, `""` in), `j10-relative-issue` (issue 40's rows at 45 with
  the top row's leading `/` taken off, hovered on row 2). Plain readings beside them: `j10-e1-46` (the same rows at 46 join the whole absolute path),
  `j10-spell-*` for U6's spellings (`(/`, `` `~/ ``, `file:///` and a glued `•` join; `~me/`, `./`, `../`, `x=/`
  join nothing).
- **Rule 17, J8 at the chain's top: the ablation goes with its clause (D16)**; its three readings move to J10's
  ablation, above. J8's `joinBoundary` ablation keeps `b-j8-relative` and gains `b8-tilde-below`, rows `x`,
  `moved src/`, `~/proj/xxx-`, `y.md now`, `z` at 11 hovered on row 2: `~/proj/xxx-y.md@2.0-3.4`, `""` with J8 out.
- **Rule 17, J11.** NEW ablations "J11's top half is not asked" (`    aboveTop !== null &&\n` → `    false &&\n`),
  owning `j11-top` and `j11-top-row3` (`I saved it to /Users/me/proj`, `/tmp/run-logs/nightly-build-`,
  `output.log today.` at 32, hovered on rows 2 and 3: `""`, and `/tmp/run-logs/nightly-build-output.log@2.0-3.10`
  with the half out); "J11's bottom half is not asked" (`    aboveBottom !== null &&\n` → `    false &&\n`), owning
  `j11-bottom` and `j11-bottom-row1` (`I updated /Users/me/proj/dist/`, `assets/vendor-chunk-a/index.js`,
  `.map today.` at 33: `""`, and `/Users/me/proj/dist/assets/vendor-chunk-a/index.js@1.10-2.30` with the half out).
  Plain readings: `j11-both` (the reverify's nit at 38, `""` from rows 2 and 3, owned by neither half alone),
  `j11-top-control` and `j11-bottom-control` (§5.4's one-cell controls, joining), `j11-price` (L9's rows at 31, `""`).
- **Rule 17, J9, re-owned.** The upper half stops owning `j9-stale-upper`, `j9-stale-upper-top` and
  `j9-g-stale-midwrap` (they stay, `""`) and owns NEW `j9a-stale-upper` and `j9a-stale-upper-top`
  (`Please open ${'z'.repeat(26)} /p/deep/de` above `folder/one.ts:5 now open it` at 47: `""`, and with the half out
  `/p/deep/defolder/one.ts:5@1.39-2.15`), beside the plain `j9a-fresh-upper` (`…/p/deep/` without `de`:
  `/p/deep/folder/one.ts:5@1.39-2.15`). The row-above clause stops owning the four F1 X2 and X3 readings and
  `p-j9-f1-x2`, `p-j9-f1-x3` (they stay as they read: `""` and today's links) and owns NEW `j9a-row-above` and
  `j9a-row-above-row3` (`x`, `'Plan:' + ' '.repeat(5) + ' zz'`, `/r/aaa-`, `bbb.md now`, `y` at 10:
  `""`, and `/r/aaa-bbb.md@2.0-3.6` with the clause out). The bottom clause stops owning `j9-stale-lower` and
  `j9-stale-after-piece` (they stay, `""`), keeps both prefix readings (absolute already, still moving), and owns NEW
  `j9a-stale-lower` (`Please open ${'z'.repeat(26)} /p/deep/` above `folder/${'k'.repeat(37)}.md` + `de` at 47: `""`,
  and `/p/deep/folder/kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.mdde@1.39-2.49` with the clause out). The row-below clause
  is unchanged (`j9-below-reach` is absolute).
- **Rule 18.** G off stops owning `g-indent-edge` (it stays, reading today's links from every row) and owns NEW
  `g-indent-edge-abs`: `/r/tortie/docs/research/` ON the last column above `  notes.md`, and again above
  `⎿  notes.md`, with the door accepting `/r/tortie/docs/research/notes.md` and `/r/tortie/notes.md`: today's links
  from every row, and with G off the join takes the indented item's cells. Every other rule-18 fixture is absolute
  and unchanged (`g-fragment-mac`'s row above, `The brief is at`, does not end where `/Users/me/projects/app/docs/`
  ends, so J11 does not read it).
- **Counts.** The gate prints the new totals of rule 17's join and provider readings and ablations and rule 18's
  fixtures; every ablation red on every reading it owns; the header's item 17 names J10 and J11 and says J8 at the
  chain's top is gone, measured redundant (D16); rule 17's read half and rule 18's are unchanged (the provider is).

## 7. The corpora (`build/p3471/`, builder `corpora`)

Everything here is deterministic: the same inputs give the same corpus, byte for byte, every run. No Electron, no
tmux, no ssh, no agent, nothing read under his home. It starts the pinned tsx (`tsxCli()`) with `spawnSync` and,
for `--parent <rev>`, `git -C <repo> show <rev>:<path>` for the parent's two files, read only. Its one write is a
`mkdtemp` staging directory under `os.tmpdir()`, removed in a `finally`. No new `GMUX_*` name anywhere.

### 7.1 Inputs

- `build/p3471/fixtures/repo-paths.txt`: `git ls-tree -r --name-only 5f5efba2`, 4,376 lines, 170,504 bytes, sha256
  `7be107842a808e811803518b535d675be1a3e810759674ea678fa08084db7727`, pinned in `generate.mts`; a mismatch exits 2.
- The committed captures: every `build/fixtures/questions/*.jsonl` record whose `rows` is a non-empty array (1,221),
  files in name order and records in line order, then every `build/fixtures/reply/*.txt` and `*.ansi` in name order
  (34), with escape sequences removed by `/\x1b\[[0-9;?]*[ -\/]*[@-~]/g`, `/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g`,
  `/\x1b[()][A-Za-z0-9]/g` and control characters but `\n` by `/[\x00-\x08\x0b-\x1f\x7f]/g`.
- Cells are counted by `cellsOf` from `build/p3471/stage.mjs` (the gate's), never by string length.

### 7.2 The three generators (`generate.mts`), each returning `{ name, base, home, repo: boolean, layouts }` with a layout `{ shape, width, rows }`, rows' trailing whitespace removed

- **`list`**, base `/r/tortie`, home `/r`, `repo: true`. Directories = every proper prefix of a listed path, sorted
  by JavaScript's default order; picked = every 13th (`i % 13 === 0`), 39 directories. `kids(d)` = its immediate
  children, a file as its name and a subdirectory as `name/`, sorted the same way, the first two. For each kid `c`
  (and `c2` the other kid, when there is one) the pairs `[shape, A, B]`, in this order:
  `rel-folder/rootrel` `d/` over `d/c`; `rel-folder/child` `d/` over `c`; `abs-folder/child` `/r/tortie/d/` over
  `c`; `abs-folder/rootrel` `/r/tortie/d/` over `d/c`; `tilde-folder/child` `~/tortie/d/` over `c`;
  `abs-folder/root-item` `/r/tortie/d/` over `package.json`; `rel-folder/root-item` `d/` over `package.json`; when
  `c`'s name (without a trailing `/`) holds a `-` that is neither its first nor last character, `rel-dash/rest`
  `d/<name up to and including its first ->` over the rest of `c`, and `abs-dash/rest` the same under `/r/tortie/`;
  and when `c2` exists, `rel-file/next` `d/c` over `d/c2`. Each pair under the 12 gutters `''`, `'• '`, `'- '`,
  `'* '`, `'1. '`, `'  '`, `'│ '`, `'⎿  '`, `'> '`, `'⏺ '`, `'├ '`, `'└ '`, at shortfalls 0, 1, 2 and 3: width =
  cells of `gutter + A` plus the shortfall, skipped when `gutter + B` is wider; rows
  `['Files:', gutter + A, gutter + B, '', '> ']`. **21,444 layouts** (computed by this spec independently; the
  builder's generator must produce the same count).
- **`prose`**, base `/r/tortie`, home `/r`, `repo: true`. Files = every 150th listed path (`i % 150 === 0`), 30;
  partner `q` = files[(i + 7) % 30]; spellings `rel` (as listed), `abs` (`/r/tortie/` + it), `tilde`
  (`~/tortie/` + it). Templates, in order (`{p}` the path, `{q}` the partner, template 4 using `{p}`'s folder, up to
  and including its last `/`):
  `I updated {p} to fix the race.` · `See {p} for the details, then run the tests again.` · `Wrote the notes to {p}` ·
  `The plan is written down at {p}:134 and the rest follows.` · `Moved {p} into place; the old copy is gone.` ·
  `Two files changed: {p} and {q}.` · ``Read `{p}` before editing anything else.`` ·
  `Everything is in the folder (see {p}).` · `  ⎿  Wrote 12 lines to {p}` · `⏺ Update({p})` ·
  `  2. Yes, and open {p} for this session (p)` · `Created {p}, {q}, and README.md beside them.`
  Widths 24, 31, 38, 45, 47, 52, 60, 67, 74, 80, 88, 96, 104, 120. Three wraps, defined by this code (the
  prototype's, measured in §2.2):

```js
function wordWrap(line, w) {      // a word wrapper; a token wider than the row is cut at the width
  const rows = []; let row = '';
  for (const tok of line.split(' ')) {
    const sep = row === '' ? '' : ' ';
    if ([...row].length + sep.length + [...tok].length <= w) { row += sep + tok; continue; }
    if (row !== '') rows.push(row);
    let rest = tok;
    while ([...rest].length > w) { rows.push([...rest].slice(0, w).join('')); rest = [...rest].slice(w).join(''); }
    row = rest;
  }
  rows.push(row); return rows;
}
function agentWrap(line, w) {     // issue 40's breaker: a token that does not fit breaks after a / or -
  const rows = []; let row = '';
  for (const tok of line.split(' ')) {
    const sep = row === '' ? '' : ' ';
    if ([...row].length + sep.length + [...tok].length <= w) { row += sep + tok; continue; }
    let first = true;
    for (const u of tok.split(/(?<=[/-])/)) {
      const s = first ? sep : '';
      if ([...row].length + s.length + [...u].length <= w) { row += s + u; first = false; continue; }
      if (row !== '') rows.push(row);
      let rest = u;
      while ([...rest].length > w) { rows.push([...rest].slice(0, w).join('')); rest = [...rest].slice(w).join(''); }
      row = rest; first = false;
    }
  }
  rows.push(row); return rows;
}
function softWrap(line, w) {      // the terminal's own wrap
  const cs = [...line]; const rows = [];
  for (let i = 0; i < cs.length; i += w) rows.push(cs.slice(i, i + w).join(''));
  return rows;
}
```

  rows `['', ...wrapped, '', '> ']`, shape `<wrap>/<spelling>/t<template>`. **45,360 layouts** (30 × 3 × 12 × 14 × 3).
- **`captures`**, base `/work/project`, home `/Users/me`, `repo: false`. Each capture's rows at its widest row in
  cells (`w0`) and at `w0 + 1`, `+ 2`, `+ 3`; shape the record's `id` without its trailing `-NNNN`, or the file
  name. **5,020 layouts** (1,255 × 4).
- Pins: `generate.mts` holds each corpus's layout count and the sha256 of `JSON.stringify(layouts)`; the measurement
  prints a moved pin as a line and still runs, the self-test fails on it, and `--repin` prints the new constants
  for a deliberate change (it writes nothing).

### 7.2a His ruled round's seven corpora (2026-10-14)

No layout of §7.2's three is wider than its pane (but list's `Files:` above a short folder) and none prints a path
outside its project, and both wrong-file opens of this phase's fix rounds lived exactly there, so the per-cell count
read PASS over each. Seven corpora are added, each pinned by count and sha256 like the three:

- **`list-outside`** (12,492) and **`prose-outside`** (30,240): the layouts of `list` whose shape starts `abs-` or
  `tilde-`, and of `prose` whose spelling is `abs` or `tilde`, with the path in ANOTHER folder of the same length:
  `/q/tortie/` for `/r/tortie/` and `~/tortiq/` for `~/tortie/` (the home is `/r`, so `~/tortiq/` is `/r/tortiq/`,
  beside the project). Every layout breaks at the same cells as its inside twin. Base `/r/tortie`, so `repo` holds
  the project's tree and the printed path opens nothing there; a join cut short reads its lower rows as a relative
  path, which resolves against the project.
- **`<corpus>-stale`** for each of the five: `list-stale` (36,608), `prose-stale` (80,642), `captures-stale` (7,641),
  `list-outside-stale` (21,085), `prose-outside-stale` (54,942). Every layout `i` of the source drawn again three
  ways, the reverify's: `prev`, a pane `1 + i % 12` cells wider drew layout `(i * 7919 + 13) % N` and then narrowed,
  so each row keeps that layout's cells past the width (a row whose leftover is blank is unchanged); `glue`, every
  full row carries `LEFTOVERS[(i + k) % 10]` glued onto its last cell; `spaced`, every row carries
  `LEFTOVERS[(i + 3k) % 10]` one blank cell past the width, `LEFTOVERS` being `de x /a -b .md 1 zz/ ts _2 b/c.md`.
  A variant that changed no row is left out. Each layout keeps its `clean` rows, the source layout's.

The counts were derived a second way: a Python reading of the same definitions over the committed path list counts
12,492, 30,240, 21,085 and 54,942, and the three inside stale counts equal the reverify's own stale tool's.

### 7.2b His absolute-only round's two margin corpora, and the spellings every layout printed (2026-10-14)

Every generator above wraps at the pane's own width, and the reverify's census found the class this phase kept
missing exactly where an agent's breaks sit NARROWER than the pane (an agent's past output after a person widens the
pane, which tmux never rejoins, or a TUI wrapping short of its edge). Two corpora are added, each pinned by count and
sha256 like the ten, with the code in `abs/spec/clone/build/p3471-proto/generate.mts` (diff `abs/spec/generate-proto.diff`):

- **`MARGIN_SENTENCES`**, the census's six, each with the hanging indent its continuation rows take:
  `['claude', '⏺ Updated {p}:134 and ran the tests.', '  ']`, `['plain', 'I updated the test in {p}:134 today.', '']`,
  `['wrote', '  ⎿  Wrote 12 lines to {p}', '     ']`, `['codex', '• Edited {p} (+3 -1)', '  ']`,
  ``['tick', 'Read `{p}` before editing anything else.', '']``, `['end', 'The plan is written down at {p}:134', '']`.
  `MARGIN_WIDTHS` 38, 47, 56, 72, 96; `MARGINS` 1 to 13 (the breaker's limit is W − m). `MARGIN_SPELLINGS`, in order:
  `rel` (as listed), `abs` (`/r/tortie/` + it), `tilde` (`~/tortie/` + it), `other` (`/q/tortie/` + it) and
  `other-tilde` (`~/tortiq/` + it), the outside spellings the ruled round's corpora use.
- **`marginWrap(kind, line, limit, indent)`**: the reverify's census breaker (`rv2/tool/realcut.mts` `wrap`) byte for
  byte in behaviour: `agent` breaks a token that does not fit after its last `/` or `-` that fits, cutting a unit wider
  than a row at the limit; `hard` (wrap-ansi's hard mode) moves a token that fits a whole row (the limit less the
  indent) to the next row and cuts a longer one at the limit, starting on the current row. A leading run of spaces in
  the line stays on its first row; every pushed row starts with the indent.
- **`prose-margin`**, base `/r/tortie`, home `/r`, `repo: true`, `twin: true`: for each of `prose`'s thirty paths
  (every 150th listed), each spelling, each sentence, each width, each margin and each breaker in that order, the
  rows `['', ...marginWrap(kind, line, width - m, indent), '', '> ']` through `drawn`, a layout whose `(width, rows)`
  an earlier one already drew left out; shape `${kind}/m${m}/${spelling}/${sentence}`; `printed: [p]`.
  **40,185 layouts, sha256 `c682754e9a7aa27712773692129fd2d899465c4f4c24e08856bb627b134e2477`.**
- **`listing`**, the same base, home and flags: for every listed index `i` with `i % 150 === 0` and `i + 2` listed, the
  three paths `i`, `i + 1` and `i + 2` spelled `abs`, then `other`; flush or under a two-space indent; at each width;
  `soft` (the terminal's own `softWrap` of the indented path at the width, m 0), then `agent` and `hard` at each
  margin; rows `['$ find .', ...each path's rows in turn, '', '> ']` through `drawn`; repeated `(width, rows)` left out;
  shape `${kind}/m${m}/${spelling}/${flush|indent}`; `printed` the three spellings. **5,798 layouts, sha256
  `d71bc44b018bad007d760f2689882f532f37a2646a6eeffad9b6a09669326d00`.**
- **Every list and prose layout carries `printed`** (a new optional field after `rows`, and after `clean` on a stale
  layout): a `list` layout `[A, B, A + B]` (its two rows' spellings, and the one path a terminal wrap of the two
  would draw on the same cells, so a join to it is the J5 ambiguity the per-cell rule already judges, not a wrong
  file); a `prose` layout the spelling put for `{p}` (the folder for template 4), the one put for `{q}` when the
  template has one, and `README.md` for the template that prints it; the outside corpora the same; a stale layout its
  source's. The captures carry none. The counts do not move; eight pins do, deliberately, to: `list`
  `cc83f921149946d380780ddda5d63957fb7cdf40cef2526e7af95bc65a3935e0`, `prose`
  `0404250ada7face32b245e5ee9e5e91b6a28896d0ca816460336474cca283ca8`, `list-outside`
  `b4da9e3bdf3d750ec42a86df10ebd3ab159e1a466593d95117cfd590d3def84b`, `prose-outside`
  `6231426024f34700c933f08c025c2f263d42aedf16ff7f67ff9eecc4375d3fcd`, `list-stale`
  `18a0a68764e47ce264414f01c0e81e7d41de1f764eec05f9e854e1268140f532`, `prose-stale`
  `22a754bcd452c08e4223343ae07eedd8d504949ac00c1f5a5fe4abf7741feece`, `list-outside-stale`
  `3512a604aeb728a339a1370dfa9480019ae30182db60ab1c4f33585498d03f74`, `prose-outside-stale`
  `2e2f7c95f9fba7ab79d55309073b45a6e7095a37983c0863b6ac092d74e83acc`; `captures` and `captures-stale` keep theirs.
- **`Corpus` gains `twin: boolean`** (not a layout field, so no pin moves for it): true on `list-outside`,
  `prose-outside`, `list-outside-stale`, `prose-outside-stale`, `prose-margin` and `listing`, every corpus that prints
  a path in another folder.
- `CORPUS_NAMES` is the ten in their order, then `prose-margin`, `listing`.

### 7.3 The regimes and the doors (`compare.mts`)

- A spelling resolves as `answerPathDoor` does without a filesystem: `~` and `~/…` expand against the corpus's
  home; an absolute spelling is `path.posix.resolve`d; a relative one is resolved against the base and carries
  `resolvedFrom: base`.
- Regimes, per layout: **`repo`** (list and prose): every listed file under `/r/tortie` a file, every proper ancestor
  and the base a folder. **`named`**: every spelling either build asks the door about, while every row is hovered
  under a door that accepts everything, is a FILE. **`named-dirs`**: every spelling the PARENT asks about is a
  FOLDER, every other asked spelling a FILE.
- Doors: **`files`**: the shipping `decidePathDoor` (`src/shared/path-doors.ts` of HEAD, which this phase does not
  change; the tool refuses, exit 2, if the parent's copy differs) over facts from the regime (`realPath` the resolved
  path when the regime holds it, else null; `kind` from the regime or `missing`; `bundle` and `executable` false;
  `resolvedFrom` as above). **`exists`**: the regime holds the resolved path, file or folder, and a relative
  spelling stays `insideBase`, answering `{ door: 'editor', path }`. The opened identity is `path` plus the line.

### 7.4 The comparison

Per corpus × regime × door × layout: one fresh `PathLinkProvider` per build (`isLocal` true, `repoPath` the base,
`now` 0), every row hovered top to bottom; every distinct link a row returns is activated once and what reached
`openInTortie` or `openOnMac` recorded (nothing, when the click's fresh door refused); cell `(x, y)`, `x` in
`1..width`, resolves, after `_removeIntersectingLinks` is applied to that row's list as xterm 6.0.0 applies it,
to the FIRST remaining link `provideLinks(y + 1)` returned whose range holds it in reading order (§1). A
**regression** is a cell where the parent resolves to an opened target `T` and HEAD to anything else (another
target, a link that opens nothing, or no link). A **gain** is a cell where the parent opens nothing and HEAD opens a
target. URL links (`WebLinksAddon`, asked first and winning its own cells at both builds) are not modelled.

Report per corpus × door × regime: layouts, cells, regression cells, regressing layouts, gain cells, gain layouts,
and the first five regressing layouts (rows, width, cell, parent's and HEAD's targets). **Required: 0 regression
cells on every line.**

**The wrong-file count (his ruled round).** On a layout that carries `clean` rows, a join HEAD offers whose press
opens a file, and which HEAD does not offer at the same range opening the same file on the clean rows, opens a file
the screen does not name: the cells a person sees are the same on both screens, so it read cells nobody sees or was
cut where they sat. The parent offers no join, so each is a wrong open where today nothing opens. HEAD's clean
reading is taken only when the stale one has a join that opens, and the census reads HEAD on the clean rows too, so
`named` holds every file either screen asks about. Reported per line beside the regression cells as wrong-file opens
and their layouts, with the first five (rows, clean rows, the join's range and what it opened). **Required: 0
wrong-file opens on every stale line.**

### 7.5 The entry (`corpora.mjs`) and its flags

`node build/p3471/corpora.mjs --parent <rev|dir> [--head <dir>] [--corpus list,prose,captures] [--out <file>]`.
`--parent` names a git revision (read with `git show`) or a checkout directory (its two files read from disk); HEAD
defaults to this checkout's working tree. Each build's `path-spans.ts` and `path-links.ts` are staged with
`stageProvider` and `writeStage` (bridge and store stubbed, the door module HEAD's). One tsx process per corpus.
`--plant` stages HEAD with D2 removed in memory (the "G off" ablation of §6.2) and inverts the verdict: exit 0 only
when `list` and `prose` each read more than 0 regression cells under `named` on both doors. `--out` refuses a path
inside the checkout. Exit 0 when every line reads 0 regression cells, 1 when any does (each named), 2 when it
cannot run (no `--parent`, a moved repo-paths sha256, a staging that left a loose import, parent's `path-doors.ts`
different from HEAD's). Budget: under 15 minutes for all three corpora on this machine at a load average under 20;
the builder measures it and writes the number in the header (the prototype read about 14 s of CPU per 6,000 prose
layouts per build pair).

His ruled round: `--corpus` takes the ten names and all ten are the default; a FAIL names every line with regression
cells or wrong-file opens. `--plant-j9` stages HEAD with `joinedPathAt`'s J9 removed, so a chain is cut where it
cannot read as the fix round cut it, judges the asked stale corpora and inverts the verdict: exit 0 only when every
asked stale corpus reads wrong-file opens and `prose-outside-stale` reads them on the files door over this
repository's tree, the reverify's own line (it refuses unless `prose-outside-stale` is asked). The budget is the same
15 minutes for all ten.

### 7.6 `--self-test` (starts only the pinned tsx; under a minute)

- S1 the comparator's arithmetic on stub providers: the same links read 0 and 0; one link moved one cell right reads
  its cells as regressions; a link removed reads its cells; a link opening another file reads its cells; a link on
  empty cells reads gain only.
- S2 the doors: `files` refuses a folder, a missing path, a relative spelling resolving outside the base, and opens
  a `~/` spelling against the home; `exists` accepts a folder.
- S3 every generator twice, byte-identical, and equal to its pins (counts 21,444, 45,360 and 5,020; his ruled
  round adds §7.2a's seven).
- S4 **the planted regression**: over a committed table of the shapes §2.2 found (the third reverify's absolute,
  `~/` and `-` list shapes at 1 cell short; issue 40's rows at 47 with the bottom fragment planted; `  docs/research/`
  on the last column above `  notes.md`; `.claude/scheduled_tasks.` above `lock to fix the race.` at 24), each with
  both spellings files: HEAD with D2 removed reads at least one regression cell on EVERY shape and HEAD as it is reads
  0 on every shape, under both doors. A planted HEAD that reads 0 fails the self-test. The fix round (D12) adds
  two shapes whose fragment the files door gives the image door and the Mac door, and a second plant,
  `plant-editor/` (only the editor door's answer counted as taken), which must read regressions on those two under
  the files door and none under the existence door.
- S5 HEAD against HEAD reads 0 regressions and 0 gain over the first 200 layouts of each corpus (his ruled round:
  of all ten, with 0 wrong-file opens, the count taken on exactly the five stale ones).
- S6 (his ruled round) **the stale shapes**: every layout where a build of this phase opened a file the screen does
  not name, each with its clean rows and its files: lens B's G-stale-midwrap, the reverify's X2 and X3, the prefix
  case and a lower piece glued to a stale `zz`. HEAD reads 0 wrong-file opens and 0 regression cells on each under
  both doors, and the plant each names reads at least one wrong-file open: `plant-off/` (J9 removed whole) for
  G-stale-midwrap, `plant-cut/` (`joinedPathAt`'s J9 removed) for the other four.

### 7.7 His absolute-only round's instrument (`compare.mts`, `corpora.mjs`, builder `corpora`)

- **The `twin` regime**, on every `twin` corpus, after `repo`: this repository's tree under `/r/tortie` AND under
  `/q/tortie` and `/r/tortiq` (the home is `/r`, so `~/tortiq/` lands there), files as files and every ancestor a
  folder (`repoTruth` three times, merged). It is the census's setup modelled: every printed path a real file in its
  own folder and every relative tail a real file in the project, so a cut join opens the project's own copy where the
  real disk would.
- **The printed-path wrong-file count**, on every line of every layout that carries `printed`, clean or stale, inside
  or outside: each HEAD link over two or more rows whose press opened something (not `NOTHING`). Its opened path is
  the `opens` string without a trailing `:<line>` and without `mac:`. It is NAMED when it equals
  `resolveSpelling(s, base, home).abs` for a printed spelling `s`, or when the regime holds it as a folder that is an
  ancestor of one (the existence door opens a folder; the files door never does); otherwise, unless a parent link on
  a row the HEAD link covers opens the same path, it is a printed-path wrong-file open. Reported on every line beside
  the stale count, with its first five layouts (rows, the link's range, what it opened, the printed spellings).
  **Required 0 on every `repo` and `twin` line.** On `named` and `named-dirs` lines it is printed and not graded:
  those regimes make every spelling either build asks exist, so they count every cut the governing rule lets
  through, and the cut report below judges cuts door-free instead.
- **The cut report**, per corpus whose layouts carry `printed`, door-free: HEAD's own `joinedPathAt` (the staged
  `path-spans.ts` of the build judged, so a plant is judged by its own) on every hovered row, the rows through
  `fakeLine` and the build's `cellColumns`. A join whose target is not a printed spelling is a CUT, of exactly one kind,
  tested in this order: `relative` (the target starts with neither `/` nor `~/`), `bottom-at-slash`, `bottom-at-dash`
  and `bottom-mid-name` (a proper prefix of a printed spelling ending in `/`, in `-`, or in anything else), `top` (a
  proper suffix), `other`. Reported as layouts by kind, with up to three examples of `relative`, `top` and
  `bottom-mid-name`. **Required: 0 `relative` layouts on every corpus that carries `printed`, and 0 `top` and 0
  `bottom-mid-name` layouts on `prose`, `prose-outside`, `prose-stale`, `prose-outside-stale`, `prose-margin` and
  `listing`.** (A list layout's lower item can begin with a marker the gutter does not strip, `1.` under a folder
  whose child is `18/`, which reads as a mid-name prefix and names no path: list and list-outside read 2 such layouts
  at the prototype, and are reported, not graded.)
- **The verdict.** Exit 0 when every line reads 0 regression cells, every stale line 0 stale wrong-file opens, every
  `repo` and `twin` line 0 printed-path wrong-file opens, and the cut report meets its requirement; 1 otherwise, each
  failing line or corpus named with its first examples; 2 as today. `LINES_PER_CORPUS` gains 2 for each `twin`
  corpus (8 each) and the two new corpora; `SPEC_COUNTS` gains 40,185 and 5,798; the default `--corpus` is all twelve.
- **`--plant-abs` (NEW)**: HEAD with J10 removed in memory (§4.6's J10 line → nothing, found exactly once or exit 2),
  judged over the asked corpora with the verdict turned over: exit 0 only when the cut report reads `relative` cuts
  on `prose-margin` and on `listing`, and `prose-margin` reads printed-path wrong-file opens on its `twin` and `repo`
  lines of the files door (the reverify's class: a relative tail of a path printed in `/q/tortie/` opening the
  project's copy). It refuses unless both corpora are asked. At the prototype: 442 and 22 relative cut layouts; the
  wrong-file count is this round's new measurement, and a builder who reads 0 there reports it and stops, because
  then the twin regime does not model the census.
- **`--plant-j11` (NEW)**: HEAD with J11 removed in memory (`    aboveTop !== null &&\n` and `    aboveBottom !== null &&\n`
  → `    false &&\n`, each found exactly once), verdict turned over: exit 0 only when the cut report reads `top` and
  `bottom-mid-name` cuts on `prose-margin` (46 and 232 layouts at the prototype). It refuses unless `prose-margin` is
  asked.
- **`--plant-j9`, re-judged**: J9's cut planted into J10's build leaves no relative chain to open, so its old verdict
  (wrong-file opens on every asked stale corpus, and on `prose-outside-stale` files `repo`) cannot be met, and read 0
  on captures-stale and on that line. It now passes only when `prose-stale` and `prose-outside-stale` each read stale
  wrong-file opens under `named` on both doors (180 and 166 a line at the prototype), and it refuses unless both are
  asked. Its header says why.
- **`--plant`** (G off) is unchanged: list 99,007 and prose 187,966 regression cells under `named` at the prototype.
- **`--self-test`**: S3 pins twelve corpora (counts and the sha256s of §7.2b, computed by this spec twice and by a
  second spelling); S4's three relative shapes become absolute twins (`  /r/tortie/docs/research/` and
  `/r/tortie/docs/research/` ON the last column above `  notes.md` and `⎿  notes.md`; `I updated` above
  `/r/tortie/.claude/scheduled_tasks.` above `lock to fix the race.` at 34, the top row full, its files
  `/r/tortie/.claude/scheduled_tasks` and `…scheduled_tasks.lock`), and the Mac shape's row above becomes
  `The brief:` so it does not end where `/r/tortie/docs/` ends (J11's price met in a fixture, §2.4); S5 runs HEAD
  against HEAD over all twelve with 0 printed-path wrong-file opens on `repo` and `twin`; S6's G-stale-midwrap, X2 and
  X3 become absolute twins (`Please open ${'z'.repeat(26)} /p/deep/` + `de` at 47; X2 and X3 with the cut just
  before a `/`, at 46: `The plan is now written down in the note at /q` (46 cells) + `e/A` glued or ` zz` spaced,
  above `/tortie/build/fixtures/facts/manifests/package` above `.json:134 and the rest follows.`, the file
  `/tortie/build/fixtures/facts/manifests/package.json`; the clean rows join the whole `/q/tortie/…` path, the stale
  ones nothing, and with J9's cut planted the two lower rows join `/tortie/…/package.json:134`, read on the prototype), each
  still caught by its plant (`plant-off` for the midwrap, `plant-cut` for the rest); NEW S7 the cut report's kinds on
  a table of one target per kind (and an empty printed list read as no requirement), and U7's three J11 rows at HEAD
  (no cut) and under `plant-j11` (a `top` cut, a `bottom-mid-name` cut, both); NEW S8 the printed-path count on
  stubs (a join opening a printed path, its folder under the existence door, a project copy of a printed path's tail,
  and the same with the parent opening it on those rows: 0, 0, 1, 0).
- **Budget.** All twelve corpora under 15 minutes on this machine at a load average under 20; the builder measures
  it and writes it in `corpora.mjs`'s header (the ten took 320 s at the prototype; the two new ones and the `twin`
  lines are about 46,000 layouts more).

## 8. `probe:p347` (builder `probe`)

- `HELD_ARMS` is removed. `JOIN_ARMS = ['P1', …, 'P8']` and `JOIN_MARKS = ['export function joinedPathAt(',
  'export function spansUnderJoin(']` in `src/shared/path-spans.ts`.
- `parentRefusal` decides by the parent's kind. A parent holding `PHASE_FILES` is Phase 347's HEAD, so it is Phase
  347.1's parent (`5f5efba2`): it must hold no `JOIN_MARKS` line, a default run asks the P arms alone, and a K or W arm
  named with it is refused with the sentence "K and W arms are Phase 347's and grade against a parent before it
  (af2662e6)". A parent holding neither (`af2662e6`) runs every arm, as today. HEAD must hold `PHASE_FILES` and both
  `JOIN_MARKS` lines. `armsAsked` takes the parent's kind; the injected `holds`/`marks` predicates keep it pure.
- Graders (P1, P2, P4, P5, P6 unchanged): **P3** is graded the same at both builds: the press on the last row opens
  the planted fragment, and no row above it draws a pointer (D7). **P7 NEW**: `• <proj>/p7kkk…/` (an absolute
  folder, `k`s chosen so the row ends 1 cell short of the last column) above `• sub7/x7.md`, with both
  `<proj>/sub7/x7.md` and `<proj>/p7kkk…/sub7/x7.md` files: at both builds no pointer on the top row, a pointer on
  the item, and its press opens `<proj>/sub7/x7.md`, never the joined file. **P8 NEW**: `• <proj>/n8kkk…-` above
  `• draft8.md`, with `<proj>/draft8.md` and `<proj>/n8kkk…-draft8.md` files: the same, opening `<proj>/draft8.md`.
  Their composer (`composeListBreak({ width, proj, kind })`, null when the pane is too narrow) is pure and proved by
  the self-test at thirteen widths by the probe's own arithmetic, never the product's: the top row ends exactly 1
  cell short of the last column, its piece ends in `/` or `-` (J7), and the item's first unit (`firstUnitOf`) could
  not have fitted on the top row (J3). (`layoutProblems` asks for three rows and is not the check here.)
- `fixtures/readings.json`: P3's head reading moves to the planted fragment; P7 and P8 readings at both builds.
  `fixtures/breaks.json`: breaks that turn exactly P7's or P8's row (the joined file opened; a pointer on the top
  row; nothing opened) and P3's head (the whole file opened).
- The header and its "What it proves" say the P arms are back, D2, P7 and P8, and the two parents.
- **His absolute-only round: no change to the probe** (§4.6). Every P arm prints an absolute path; P1 to P4 end on a
  row of more than one token and P2's rows are full, so J11 never reads them, and P5 to P8 expect no join, so a
  refusal by J11 where J5, J7 or the governing rule refused reads the same. `--grader-self-test` passes unchanged at
  the prototype (148 breaks). The live classes of this round (E1, the hard cut) are lens B's to drive with the
  reverify's own tools (§10), because the probe's pane is the app's width and those shapes need a narrower one.

## 9. Gates, obligations, CLAUDE.md

### 9.1 Gates the paths trigger (CLAUDE.md's table)

`typecheck`, `build` (which runs `gate:electron`, `gate:background`, `gate:checks`, `gate:contract` and the eager
bundle budget of `build/assert-probe-containment.mjs`; report the eager bytes it prints), the whole vitest,
`conformance:pathdoors`, `measure:p3471` at the parent and its `--self-test` and `--plant`,
`node build/p347/probe-p347.mjs --grader-self-test`, `node build/p247/path-open.mjs --self-test`, `package`.

### 9.2 Obligations

1. No new script reaches `build/electron-run.mjs`: `HELPER_USER_FLOOR` stays 173.
2. No new shape for `gate:knownhosts` or `gate:background`: `corpora.mjs` uses `spawnSync` only.
3. No contract change: the baseline is not regenerated, `gate:contract` reads byte for byte.
4. `measure:p3471` is classified in `build/verification-checks.mjs` as
   `adapter('measure:p3471', 'node, the repository install and its pinned tsx, and git read only (git show <rev>:<path> for the two provider files of the parent); a staging directory under the system temporary directory removed in a finally', 'never skips; with no --parent it refuses with a sentence, exit 2')`,
   with a comment block in the house shape. It is in no battery.

### 9.3 CLAUDE.md (integrator)

- The `conformance:pathdoors` row: its paths gain `build/p3471/stage.mjs`; its account gains one sentence: rule 17
  drives the join over rows (J1 to J8, both caps, one link from first cell to last), and rule 18 the governing rule,
  that a join never takes a cell from a row span the door accepts on any row it covers, each clause with its
  ablation; the measured time.
- The `probe:p347` row: the P arms are no longer held; with a built `5f5efba2` parent a default run is P1 to P8 alone
  and a K or W arm is refused; P3 now opens the planted fragment at both builds; P7 and P8; the measured time.
- A new probes-table row `measure:p3471`: when (`src/shared/path-spans.ts`'s join, `src/renderer/terminal/path-links.ts`,
  `build/p3471/**`), cost (measured), and what it compares.

### 9.4 His absolute-only round's commands (the integrator's, beside §9.1)

`npm run typecheck`; `npm run build`; the whole `npm test` (scratch HOME and ZDOTDIR); `npm run conformance:pathdoors`;
`node build/p3471/corpora.mjs --self-test --parent 5f5efba2`; `node build/p3471/corpora.mjs --parent 5f5efba2`
(twelve corpora); `--plant --corpus list,prose`; `--plant-j9 --corpus prose-stale,prose-outside-stale`;
`--plant-abs --corpus prose-margin,listing`; `--plant-j11 --corpus prose-margin`; THE CENSUS,
`node <scratchpad>/p3471/abs/spec/tool/run-census.mjs --head /private/tmp/wt-p3471 --out <scratchpad>/p3471/integrator-abs/census.json`
(about 2.5 minutes; it stages the parent from `git -C /private/tmp/wt-p3471 show 5f5efba2:…`, read only, and reads
`/private/tmp/wt-p3471` as the other checkout and the spec's clone as the project; exit 0 only with 0 wrong-file
opens and 0 single-row mismatches in both families; at the prototype 0 and 0, and at today's HEAD 13,879 wrong
opens); `node build/p347/probe-p347.mjs --grader-self-test`; `node build/p247/path-open.mjs --self-test`;
`npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background`; `df -h /`, then
`CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` and `rm -rf release`. His history stat'd before and after each.

CLAUDE.md (integrator): the `conformance:pathdoors` row's account says rule 17 now holds J10 (his ruling, a join only
of a path that reads absolute or `~/`) and J11 (a cut by a breaker that cuts anywhere, at either end), that J8 at the
chain's top is gone, measured redundant, and the measured time; the `measure:p3471` row says twelve corpora (the two
margin ones), the `twin` regime, the printed-path wrong-file count, the cut report, the four plants and the measured
time. `build/verification-checks.mjs`: the `measure:p3471` comment names the twelve corpora and the time, its
classification unchanged.

## 10. Verification, Tier 2 plus the attack (verifiers independent of the builders)

Each verifier names in its verdict the step it did that no builder did. Verdicts are typed (`verdict`, `evidence`,
`problems`). His history is read before and after each launch and each shell.

- **Lens A, the attack (no Electron).** (1) `measure:p3471 -- --parent 5f5efba2` at HEAD: 0 regression cells on
  every corpus × door × regime, the gain printed. (2) The instrument can fail: `--plant` caught, and the same
  measurement with `--head` a `cp -Rc` clone (`.git` removed, §16) holding the kept 347 patch reads more than 0.
  (3) ITS OWN hostile fixtures through the SHIPPING provider, graded by its OWN per-cell model written from §1's
  xterm arithmetic (not `compare.mts`): at least a fragment accepted on a MIDDLE row; a `⚠️ `-decorated row whose
  fragment's string index is not its column; a row that ends one broken path and starts another, with each
  fragment accepted in turn; a fragment refusal 8 hid (must still join); a reader that answers differently on its
  second read; a grep suffix `:12:text` on the bottom row; the cache sequence (hover with the fragment missing, the
  fragment created, hover after `CACHE_MS`: today's links); an accepted span ending in the cell before the join's
  first. (4) The attack itself: try to build any layout where HEAD moves a link that opens at the parent, and report
  every attempt and its reading.
- **Lens B, the app run (under the lock, verifiers only).** `probe:p347` with `P347_PARENT_CHECKOUT` a BUILT
  checkout of `5f5efba2` and HEAD built: P1 to P8 graded, exit 0, measured time recorded. `probe:p247` at HEAD
  (arm E). `smoke:t1`. The Electron census once at the end (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`).
- A fix round, if any verdict is `needs_work`, is followed by ONE independent reverify that re-runs the failed items
  live; a second `needs_work` goes to the operator.
- **His absolute-only round (Tier 2 plus the attack, as before).** Lens A, the attack, no Electron: (1) the census
  over a SECOND printing prefix of its own (a `cp -Rc` copy of the worktree, `.git` removed, at a path whose length is
  neither 21 nor 32, so cuts land on other characters than the spec's and the reverify's did) through the shipping
  provider and door, 0 wrong opens required; (2) its own hostile tree: prefix and suffix pairs planted on disk
  (`index.js` beside `index.js.map`, `foo.ts` beside `foo.tsx`, `out.log` beside `out.log.1`, `/tmp/…` names that a
  printed `…/proj/tmp/…` ends in) and every hard-cut alignment of their printed paths at m 1 to 13 driven, every
  press graded by realpath; (3) J10's construction attacked with spellings this spec did not list (a ligature or
  a wide glyph opener before `/`, a quote that is not in `OPEN`, a `[`/`]` cut, `~` alone, `file://` with a host) and
  J11 attacked for a refusal it should make and does not (a breaker that pads its rows, a TUI that draws a right
  border); (4) the instruments can fail: `--plant-abs`, `--plant-j11`, `--plant-j9` and `--plant` each caught, and
  the measurement with `--head` a clone of today's HEAD reads printed-path wrong-file opens on `prose-margin` and
  `prose-outside` (`repo` and `twin`). Lens B, the app run under the lock: `probe:p347` P1 to P8 at a built parent
  and HEAD; then the reverify's own live tools (`<scratchpad>/p3471/rv2/tool/rv2-drive.mjs`, `rv2-drive2.mjs`,
  `tui.mjs`) re-run unchanged in their safety (through `build/electron-run.mjs` inside `build/harness-socket.mjs`,
  `build/hidden-agents.mjs` first): E1 widened from 46 to 47, 48, 49 and 50, E1b, the margin-1 TUI and the 40-cell
  row at 38 must open nothing at HEAD, as at the parent; issue 40's rows at 45 to 49 must open
  `brainstorming.md` at line 134 from every row; and a hard-cut stand-in of the verifier's (the TUI with wrap-ansi's
  hard mode one or more columns short) printing the nit's rows at 38 and the `index.js` rows at 33 must open nothing.
  The Electron census once at the end.

## 11. CHANGELOG item (`## Unreleased`, a new `### Fixed`; the follow-up docs commit adds the link)

- A file path an agent printed broken over two or more rows now opens as one link when it starts with / or ~/: pointing at any of its rows underlines the whole path and a press opens it at its line, where it used to open nothing. A relative path broken over rows stays plain, and where one row's piece is itself a file Tortie opens, that row keeps opening it instead. Reported by [John Berryman](https://github.com/JnBrymn) in [#40](https://github.com/gregce/tortie/issues/40)

## 12. What is NOT in this phase

- No change to which kinds of file open, to the doors, to refusal 8, or to a link on a single row.
- No reading of `isWrapped`.
- Nothing for paths whose first part has scrolled above the session, or which run past its last row (J6).
- No joining across a span the door accepts, ever (D2), and no join shortened by the governing rule, the caps or J9
  (D5; what a boundary J3, J5, J7 or J8 refuses leaves on either side is J10's and J11's to judge, and L8 says what
  remains).
- No change to `WebLinksAddon`, to the click's re-ask, or to the hover cache.
- No change to Phase 347's K and W arms or to issues 41 and 33. No new door, channel, setting or menu item.
- **No join of a relative path broken over rows** (his ruling of 2026-10-14, J10): wherever and however it was
  broken, it stays plain from every row, as today.
- No door asked about a neighbouring row's piece (a join refused because the door would also accept it lengthened by
  the next row's first token); D15 weighed it and left it for its own phase.
- No change to `probe:p347`'s arms or to `build/p247/path-open.mjs` this round (§4.6, §8).
- Not `/Users/gdc/tortiedotsh/src/data/docs.ts:605` ("A path wrapped onto a second row of the pane stays plain…"),
  which is another repository: named for the operator, not edited.

## 13. Stated limits (each no worse than today)

- **L1 (D2, D7).** Where a row's own piece of a broken path is itself a file Tortie opens, that row opens it and the
  whole path is offered from no row, exactly as today. That keeps today's wrong-file hazard of issue 40 (P3) where it
  is today and never adds one.
- **L2** (347's L2). Blank cells between an agent's break and the right edge, and a continuation row's gutter, are
  inside the link's range.
- **L3 (D6).** The rule reads the same 30 s hover cache every underline reads; a fragment created after the hover is
  read at the first hover after the cache expires, and the click re-asks the door about the joined target only.
- **L4** (347's L3, L11 to L13; CORRECTED by his absolute-only round). Not joined, so as today: **a relative path
  broken over rows, wherever and however it was broken (J10, D14)**; a folder's `/` above a bare name short of the
  last column (J5); the rest of a path above the screen or past its last row (J6); more than 8 rows or 1,024
  characters; a break right before `[`; a terminal wrap just before `:` of a line suffix stops the join at the row
  above. An agent that wraps NARROWER than the pane is joined only across boundaries where its break was forced (J3)
  and looks like an agent's (J7). The earlier wording, "an agent that wraps narrower than the pane (J3): not joined",
  was false for a path of three or more rows: the rows on either side of a boundary J3 or J7 refuses are pieces of
  their own, and the reverify's census found them opening the project's copy of a path printed in another worktree.
  A piece is now offered only when it reads absolute on its own (J10) and no breaker that cuts anywhere left it at
  either end (J11); what remains is L8.
- **L5** (347's builder note). A row that ends one broken path and begins another answers, from that row, the join
  ending on its first token; the other is answered from the row below.
- **L6.** The corpora model the path provider and the door without a filesystem: no symlink, bundle or executable
  bit (the door's own refusals are `conformance:pathdoors` rules 1 and 2), and no URL provider.
- **L7 (D11, the fix round and his ruled round).** After a pane narrows, a row printed before the narrowing keeps
  cells past the new edge on xterm's alternate buffer. A path broken over rows is then not joined when any row it
  covers, the row above it, or the first piece of the row below it reads such cells: the whole path stays plain, as
  today, until the rows are printed again, and no shorter join is offered in its place. That is a price in gain on
  stale screens only, measured over the stale corpora (§7.2a) on the files door over this repository's tree: on the
  prose layouts with another layout's leftovers (`prev`) the reverify measured the fix round's cut at 209,311 gained
  cells and the candidate at 56,323; over all three ways on `prose-stale` this round reads the fix round at 230,705
  (with 124 wrong-file opens), the candidate at 69,647 and this build, which also refuses a bottom row with
  leftovers, at 44,803 (0 wrong-file opens); over all 28 stale lines 2,152,267, 492,035 and 376,639 cells. The
  row-below clause alone costs 4,983 of those cells and stops no wrong open (§As built, his ruled round). No clean
  corpus loses a cell of gain. Lens B read 13 of 151 rows past the pane's width
  in its run. The parent's single-row links read the same stale cells (refusal 8's head clause among them), and this
  phase leaves them as they are.
- **L8 (D14, D15). What an absolute piece can still be.** After J10 and J11 a chain the walk stopped can still be a
  piece of a longer printed path in four shapes, each counted over §2.4's census and margin corpora and none of which
  opened a file the screen does not name there: a piece ending at a `/` (a folder, which no door opens: 14,285 census
  layouts, 148 and 6 in `prose-margin` and `listing`), one ending after a `-` (a file whose name ends in `-`: 8,531;
  76 and 16), two printed paths, or a path and the next word, glued where a terminal wrap filled a row exactly (2,125
  census listing layouts; 260 in `prose`, 20 in `listing`; a name no tree holds), and a cut inside `[id]` (11 census layouts: `[` and
  `]` are path characters to the grammar and not to J1 and J2). Each opens a file only where a file of exactly
  that name exists; §7.7's cut report prints them every run.
  **Corrected by the fix round of his absolute-only round.** J11 now refuses the first two shapes and the `[id]` cut
  wherever a breaker could have made them (the piece ends in `/` or `-` and the fragment after it would not have fitted
  at the widest row above; `]` on a row reaching the widest row), so of the four only the glued paths remain, refused
  by nothing because the walk itself glues them as it glues any soft wrap at a `/` (the attack lens: "None needed
  beyond what L8 already says"): 1,389 census `list` layouts and no `sent` one, 515 in `list`, 260 in `prose`, 20 in
  `listing` and 32 in `prose-cutters`, and the attack's `two-abs-glued` shape. Every other cut kind reads 0 on the
  census, the attack lens's census and on every committed corpus.
  **Corrected by its reverify (2026-10-15).** That last sentence held only because no tree any of them read held a
  name with `--` in it. Python's own textwrap breaks BEFORE a run of two or more `-` that a word character precedes
  and follows (its `wordsep_re` holds `(?<=[\w!"'&.,?])(?=-{2,}\w)`), so it leaves a fifth shape: a bottom piece cut
  mid-name just before `--`, one cell short of the widest row above, which J11 read as a cut at the limit and let
  through, opening a regular file named exactly the text before `--` where the parent opened nothing (1,320 of the
  reverify's 346,473 hostile layouts over a tree holding `pi-sessions` beside `pi-sessions--Users-…/…jsonl`,
  `plan.md` beside `plan.md--old.md` and two more such pairs; live, 2 of 2). J11 now reads that break (L10), the
  hostile layouts read 0 wrong with all 49,978 right layouts kept, and `prose-cutters` draws the listed path holding
  `--`, so the glued paths are again the only shape a committed corpus or census leaves. On the reverify's
  eight-breaker census, which adds Rust textwrap's OptimalFit (L10), cuts at a `/` (946 join rows) and after a `-`
  (1,389) also remain where the fragment after them would have fitted: L8's first two shapes, refused wherever it
  would not have, a folder no door opens or a name ending in `-`, with 0 wrong and 0 moved there.
  **Corrected by the quick check of the `--` fix (2026-10-15).** The `--` clause read Python's break before a run only
  where Python's textwrap CUTS a long word, at its limit or after its last hyphen, so that the bottom row ends near the
  widest row. With `break_long_words=False` Python's textwrap never cuts a chunk longer than its row: it puts that chunk
  on a line of its own, overflowing it, and the terminal soft-wraps the overflow at the pane's edge. The text before
  `--` is such a chunk, the run is the next line's first chunk, and the chain's bottom row is the overflow's remainder,
  as short as it happens to be, far below the widest row (a full row above it), so `bottom.end + run > widestAbove`
  read no cut there and the join opened a regular file named exactly the text before `--` where the parent opened
  nothing: 3,477 of the re-checker's census layouts, every one `pynolong` and every one that shorter name, and live 5
  of 5 presses on `X-nolong-planw-19` (`Wrote` above `/private/tmp/p3471rc.app/o/notes/plan.md` soft-wrapped at 19
  above `--old.md`) and `X-nolong-plan2s-50`. That is a sixth shape. **His ruling, "Add that refusal": J11 refuses a
  chain whose lone bottom piece ends in a character Python's `wordsep_re` breaks after (`[\w!"'&.,?]`, Python's `\w`
  being Unicode's) above a row starting with a run of two or more `-` and a word character, when a row of the chain
  above its bottom fills the pane** (the narrower of the two forms the re-checker measured: it caught 5,856 of 5,856
  such cuts, as the wider one did, at 3,838 right layouts where the wider cost 4,482; L9). The bottom row must
  hold only its piece, as J11's bottom half already asks, because a piece with a space beside it is whole; that takes
  the shipped price to 3,267, every layout of it one the measured form refuses too. With it, no
  committed corpus and no census this round read leaves a cut but L8's glued residue and the first two shapes above,
  each where the fragment after it would have fitted.
- **L10 (D15 as the fix round widened it; corrected by its reverify). What J11 does not model.** A breaker whose
  fragments run past the next break opportunity J11 reads (after a `-` the whole token; after a `/` the next `/` or
  `-` no digit follows; before a `/` the next `/` or `-`; before a run of two or more `-`, the run) and that broke
  with room left for the fragment it moved; and a row above whose drawn width falls short of what its breaker counted
  by more than one cell per UTF-16 unit outside ASCII. The round before said no named breaker breaks with room left,
  and it missed two things. **Python's textwrap breaks before `--`** (L8's correction), an opportunity J11 did not
  read until its reverify, which read that break as a cut at the limit; it now reads it, the moved fragment being the
  run. **Rust textwrap's default algorithm, `WrapAlgorithm::OptimalFit`, is a real breaker that breaks with room
  left**: it balances its rows by a penalty over every row, so it breaks at an opportunity whenever that lowers the
  penalty, whether or not the next fragment would have fitted. The reverify ported it (textwrap 0.16, `Penalties::new()`,
  under UAX #14 fragments and under ASCII spaces, each with its hyphen splitter and `break_words`) into its census:
  over 427,182 and 563,871 of its 11,662,529 layouts it reads 0 wrong and 0 moved, because the room it leaves falls
  at a break opportunity, after a `/` or a `-`, and what J11 lets through there is a folder no door opens or a name
  ending in `-` (L8's first two shapes, 946 and 1,389 cut join rows); a cut mid-name is still only at its limit.
  UAX #14 forbids a break before `/`, and wrap-ansi and Python's and Rust's textwrap first fit break before a `/`
  only at their limit. The two hand shapes of that kind the attack built, `~` alone and a URL's host above `/tmp/…`,
  are refused by J11's root clause instead; any other stays a join, as an absolute path is at the parent on one row.
  **Corrected by the quick check of the `--` fix (2026-10-15).** "A cut mid-name is still only at its limit" was
  false of one breaker: Python's textwrap with `break_long_words=False` never cuts a long word, so it leaves a row
  that OVERFLOWS its limit and the terminal soft-wraps it, and the row that ends the chain is a remainder whose width
  says nothing about any limit. J11's arithmetic cannot see that break, so it is refused by shape instead (L8's sixth
  shape): a lone bottom piece ending in a character Python breaks after, above a run of `--` and a word character,
  below a full row. What that does not model, and what stays a join: an overflow above a row that starts with
  anything but such a run (the next chunk is a word, so the overflow ended a whole name, as an ordinary soft wrap
  does), an overflow followed by a bare `--` or a run before a character `\w` does not match, and a chain no row of
  which fills the pane (no overflow was soft-wrapped there; the `--` clause's arithmetic reads it).
- **L9 (D15). J11's price.** Where two rows of a path happen to end at one column short of the edge, and the end
  row holds only its piece, J11 refuses the whole path, as today: `Two files changed: ~/tortie/` above
  `.claude/scheduled_tasks.lock` above `and ~/tortie/docs/audits/` at 31 columns (J11's bottom half refuses the first
  path; the second, `~/tortie/docs/audits/` short of the edge above the bare `contract-baseline.txt.`, is J5's, as at
  every round before; the join builder's reading). Measured: 2,255 of 366,839 right
  census layouts (0.61%), 4,431 of 6,859,528 committed gain cells, 40 of 1,478 right `prose-margin` layouts.
  **Corrected by the fix round of his absolute-only round.** The price is now a whole path whose lone bottom piece
  reaches the widest row above it, or comes within the next row's fragment of it after a `/` or a `-`, above a word a
  name could go on into; or whose lone top piece starts below a row within its moved fragment of the widest row, or
  below `~`, a `$` variable or a URL. The L9 rows above are still refused (J11's bottom half), and the soft-wrapped
  ones still join. Measured against J10 alone: 8,626 of 366,839 right census layouts (2.35%: `sent` 315,932 to
  311,980, `list` 50,907 to 46,233), 138,463 of 6,859,528 committed gain cells (2.0%); against the round before's J11,
  6,371 (1.75%) and 134,032 (1.96%).
  **Corrected by the `--` fix and its quick check (2026-10-15): the flag price.** Both `--` refusals cost gain on one
  shape only, a path printed before a flag (`deploy.sh --dry-run`, `--force --yes`), where the parent opens nothing:
  the run clause in `movedFragmentCells` refuses such a path when its bottom row plus the run reaches past the widest
  row above, 761 of the re-checker's census layouts (all `f1` and `f2`, the flag families); the overflow refusal
  refuses it when a soft wrap left the path's last piece alone on a row above the flag below a full row, 3,838 right
  layouts for the form his ruling chose as the re-checker measured it (1.59%, every one a path followed by a flag), and
  3,267 of 241,026 (1.36%; 1,607 `f1`, 1,660 `f2`) as shipped, because the bottom row must hold only its piece (571
  of the 3,838 hold the flag's next word beside the piece, which is whole there). Neither costs a cell on a committed
  corpus: every line of the twelve other corpora reads the round before's gain to the cell, the overflow refusal
  changes no join on `prose-cutters`' first 72,680 layouts, and on its 2,550 new ones it takes 250 cut layouts away
  and no right one; the reverify's hostile census keeps all 49,978 right layouts.

## 14. What the entry got wrong, and what this spec changed

1. "The work is kept … at `~/.claude/projects/…/backups/…`": builders read the copies under the spec's scratchpad
   `kept/` (the task's), never `~/.claude`.
2. "applies cleanly": not to `5f5efba2`; rule 5's hunk conflicts with the row Phase 347 landed (§2.1). Applied by
   file, rule 5's hunk dropped.
3. "the list corpus reads … 0 with the files-only door": a property of the repository's tree. With both spellings
   files the kept work regresses on the files-only door too (§2.2), so the corpora add the `named` regimes (D8).
4. Not in the entry: two further shapes that re-pointed links on the kept work, the indented item at the last
   column and the hard-cut `.`-ended fragment (§2.2); D2 covers them without a rule of their own.
5. Not in the entry: under D2, the kept spec's L4 trade and arm P3 read as the parent (D7), and the CHANGELOG says so.
6. His absolute-only round (2026-10-14): D5's "never cut short" and L4's "an agent that wraps narrower than the pane:
   not joined" were false for paths of three or more rows (the reverify's census, §2.4); corrected in place, with
   J10 (his ruling), J11 (measured), J8 at the chain's top removed (measured redundant) and the instrument widened
   (D14 to D17).

## 15. Who owns what (disjoint)

| Builder | Files |
| --- | --- |
| `join` | `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts`, `src/shared/__tests__/p347-path-join.test.ts` (kept, new to the tree), `src/renderer/terminal/__tests__/p347-path-links-join.test.ts` (kept, new to the tree), NEW `src/shared/__tests__/p3471-spans-under-join.test.ts`, NEW `src/renderer/terminal/__tests__/p3471-governing-rule.test.ts` |
| `gate` | `build/conformance-pathdoors.mjs`, `build/p247/path-open.mjs`, NEW `build/p3471/stage.mjs` |
| `corpora` | NEW `build/p3471/corpora.mjs`, NEW `build/p3471/generate.mts`, NEW `build/p3471/compare.mts`, NEW `build/p3471/fixtures/repo-paths.txt` |
| `probe` | `build/p347/probe-p347.mjs`, `build/p347/fixtures/readings.json`, `build/p347/fixtures/breaks.json` |
| integrator | `package.json`, `build/verification-checks.mjs`, `CLAUDE.md`, `CHANGELOG.md`, this file's `§As built` |

What each builder proves before it reports (no Electron, scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no
`TERM_SESSION_ID`, his history stat'd before and after):

- `join`: `./node_modules/.bin/vitest run p347-path p3471 p247-path` green with counts; every GR case red with
  `governingOff`; `npm run typecheck`; the final text of every §4.1 anchored line, quoted, in its report.
- `gate`: `node build/conformance-pathdoors.mjs` green once `join` has landed, rule 17's and rule 18's readings and
  ablations counted, every ablation red on its owner; `node build/p247/path-open.mjs --self-test`; the `.rej` gone.
- `corpora`: `node build/p3471/corpora.mjs --self-test` exit 0 with the three counts equal to §7.2's; `--parent
  5f5efba2 --corpus list` and `--plant --corpus list` once `join` has landed, with their readings.
- `probe`: `node build/p347/probe-p347.mjs --grader-self-test` exit 0, the break count, each new break turning
  exactly its own row.

## 15a. Who owns what in his absolute-only round (disjoint; every file in exactly one list)

| Builder | Files |
| --- | --- |
| `join` | `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts` (one header sentence), `src/shared/__tests__/p347-path-join.test.ts`, `src/renderer/terminal/__tests__/p347-path-links-join.test.ts`, `src/shared/__tests__/p3471-spans-under-join.test.ts`, `src/renderer/terminal/__tests__/p3471-governing-rule.test.ts` |
| `gate` | `build/conformance-pathdoors.mjs` |
| `corpora` | `build/p3471/generate.mts`, `build/p3471/compare.mts`, `build/p3471/corpora.mjs` |
| integrator | `CLAUDE.md` (the `conformance:pathdoors` and `measure:p3471` rows), `CHANGELOG.md` (§11's item replacing the one under `## Unreleased` / `### Fixed`), `build/verification-checks.mjs` (the `measure:p3471` comment only), this file's §As built |

Unchanged: `build/p3471/stage.mjs`, `build/p3471/fixtures/repo-paths.txt`, `build/p347/**`, `build/p247/path-open.mjs`,
`package.json`. `git diff 5f5efba2` stays exactly §15's files.

What each proves before it reports (no Electron, scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no
`TERM_SESSION_ID`, his history stat'd before and after; no `git apply`, no stage, no commit):

- `join`: §4.6's two code blocks quoted from the final file; `vitest run p347-path p3471 p247-path` green with
  counts; U6, U7, GR13 and GR14 each shown red with its clause taken out in a `cp -Rc` clone (`.git` removed), the
  file restored by sha256; `npm run typecheck`.
- `gate`: `node build/conformance-pathdoors.mjs` green once `join` has landed, every new ablation red on every
  reading it owns, the counts printed; the readings of §6.3 equal to the values written there.
- `corpora`: `--self-test` exit 0 (twelve counts and pins equal to §7.2b's); `--parent 5f5efba2 --corpus
  prose-margin,listing,prose-outside` exit 0 with its lines; `--plant-abs`, `--plant-j11` and `--plant-j9` each
  exit 0 (caught) with the counts; `tsc --noEmit --strict` over `compare.mts` and `generate.mts`; the measured budget.
  And the instrument seen to fail on today's tree: the same measurement with `--head` today's HEAD reads
  printed-path wrong-file opens on `prose-outside` and `prose-margin` (`repo` and `twin`, files door).

**Order.** The three builders run at once on disjoint files, but the gate's new ablations and the corpora's two new
plants anchor on §4.6's lines, which exist in the tree only once `join` has written them. Until then each judges a
scratch head: a `cp -Rc` clone of the worktree (`.git` removed) with `<scratchpad>/p3471/abs/spec/path-spans.pf.ts` as
its `src/shared/path-spans.ts` (the gate run there; the corpora with `--head <that clone>`), and runs again on the
worktree once `join` reports, before it reports itself.

## 16. Safety for every role

- **S1. A `cp -Rc` clone of the worktree SHARES ITS GIT INDEX.** The worktree's `.git` is a file naming
  `/Users/gdc/gmux/.git/worktrees/wt-p3471`, and a copy keeps it, so any git command that writes the index in the
  clone writes `/private/tmp/wt-p3471`'s. This spec step ran `git apply --3way` in such a clone and it staged four
  files in the worktree's index; `git -C /private/tmp/wt-p3471 reset -q` restored it at once (the working tree was
  never touched; `git status --short` and `git diff HEAD` read empty after). **Remove the clone's `.git` file before
  any git command in it**, and never use `--3way`, `--index` or `--cached` in this phase.
- Never commit, stage or stash. `/Users/gdc/gmux` read only. Never `-L gmux`. End only pids you started. No
  screenshot. No model turn. Builders and the integrator launch no Electron; every Electron is a verifier's, through
  `build/electron-run.mjs` inside `build/harness-socket.mjs`, under the lock, with `build/hidden-agents.mjs` before
  any launch. `df -h /` before any parent build or `package`; under 8 GB free, wait and report.

## §As built (the integrator, 2026-10-13)

`git diff 5f5efba2` is exactly §15's files and nothing else: modified `CHANGELOG.md`, `CLAUDE.md`, `package.json`,
`build/verification-checks.mjs`, `build/conformance-pathdoors.mjs`, `build/p247/path-open.mjs`,
`build/p347/probe-p347.mjs`, `build/p347/fixtures/readings.json`, `build/p347/fixtures/breaks.json`,
`src/shared/path-spans.ts` (+448 −10), `src/renderer/terminal/path-links.ts` (+108 −8); new `build/p3471/` (this file,
`stage.mjs` 85 lines, `corpora.mjs` 376, `generate.mts` 384, `compare.mts` 841, `fixtures/repo-paths.txt` 4,376 lines,
sha256 `7be10784…84db7727` as pinned) and the four test files. Nothing staged, committed or stashed (`git diff --cached`
empty; the one stash entry, `a31999fc`, predates the phase and is shared from the operator's repository). No `.rej`, no
`.p247-ablation-*` left under `src/main/fs`. `p347-path-join.test.ts` is byte-identical to the kept copy (`cmp`).

**The integrator's files.** `package.json` gains `"measure:p3471": "node build/p3471/corpora.mjs"`;
`build/verification-checks.mjs` classifies it as §9.2's `adapter(...)` with a comment block; `CHANGELOG.md` gains
§11's item under `## Unreleased` in a new `### Fixed` (no commit link; the follow-up docs commit adds it);
`CLAUDE.md`'s `conformance:pathdoors` row gains `build/p3471/stage.mjs`, the measured time and one sentence on rules 17
and 18, the `probe:p347` row says the P arms run again by the parent's kind with P7 and P8, and a new `measure:p3471`
row sits above `measure:semantic`.

**Seams reconciled.** None needed editing: `stage.mjs` matches §4.2's API and both rule 17/18 and `corpora.mjs` import
it; the probe's `JOIN_MARKS` match the lines `path-spans.ts` holds; rule 18's anchors match §4.1's text. `grep 'function
stageProvider\|function cellsOf' build/conformance-pathdoors.mjs` prints nothing (exit 1): one spelling, in
`build/p3471/stage.mjs`. `sharesCellWithJoin` is declared once under `src/` (in `path-spans.ts`).

**Duplicated blocks.** A 10-line-window scan of every delta file against its directory found, among lines this phase
added, only the test fixtures' xterm cell model (a code point to cell splitter of 10 to 13 lines) in
`p3471-spans-under-join.test.ts` and `p3471-governing-rule.test.ts`, which mirrors the copies in
`p247-path-links.test.ts` (at the parent) and the two kept Phase 347 test files. Not extracted, deliberately: §4.1 pins
`p347-path-join.test.ts` unchanged, every copy carries its own fault injection (`padTo`, `cellsAnswered`, a reader that
answers once), and a shared helper would put a fourth spelling beside two pinned ones. Every other hit was between
files the phase did not add those lines to (`build/p247/path-open.mjs` and `build/p347/probe-p347.mjs` against older
probes' launch boilerplate). No production block is duplicated.

**Commands** (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset; load
averages 7 to 25 while they ran, falling from 330 before; no Electron launched by this role, no lock slot taken):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 3 s (incremental); import boundaries 1,427 production files, 8,118 imports, 0 violations; no runtime cycles over 1,424 files and 4,947 edges |
| `npm run build` | 0 | 41 s; eager set 2 chunks, 1,683,091 raw and 430,043 gzip against 2,000,000 and 500,000; `gate:electron` 173 against the floor 173; `gate:background` 3 of 563 in a `finally`, 19 of 19 fixtures; `gate:simulator`, `gate:knownhosts`, `gate:checks` (268 classified), `conformance:ios`, `conformance:harnessprobes`, `gate:onlyadd` pass; `contract-inventory` byte for byte |
| `npm test` | 0 | 62 s; 1,136 files passed and 2 skipped (1,138); 21,238 tests passed and 14 skipped |
| `vitest run p347-path p3471 p247-path --reporter=verbose` | 0 | 8 files, 195 tests: `p347-path-join` 35, `p347-path-links-join` 24, `p3471-spans-under-join` 30, `p3471-governing-rule` 24, `p247-path-spans` 36, `p247-path-links` 24, `p247-path-door` 16, `p247-path-open` 6 |
| `npm run conformance:pathdoors` | 0 | 15 s; rule 9 38 of 38 ablations red; rule 17 58 join and 10 provider readings as pinned, 8 of 8 wiring plants, 23 of 23 ablations red on every reading each owns; rule 18 11 fixtures, 64 hovered rows, `rowSpansAt` equal on every row, 12 of 12 plants, 8 of 8 ablations red; every other rule green unedited |
| `node build/p3471/corpora.mjs --self-test` | 0 | 47 of 47 checks in 1.7 s; counts 21,444, 45,360 and 5,020 with their sha256 pins; S4 caught on all seven planted shapes on both doors (8 to 30 regression cells each with the rule out, 0 with it in) |
| `npm run measure:p3471 -- --parent 5f5efba2` | 0 | 49.4 s; **0 regression cells on all 16 lines**. Gain, files/exists: list repo 120,706 (2,562 layouts) / 130,891 (2,832), named 162,991 (3,748) both, named-dirs 323,961 (6,852) / 162,991; prose repo 808,770 (14,978) / 719,376 (13,782), named 602,328 (11,770) both, named-dirs 867,111 (16,288) / 602,328; captures named 60 (4) both, named-dirs 164 (6) / 60 (4); 5,267,116 in all. xterm's removal dropped no link on any line |
| `npm run measure:p3471 -- --parent 5f5efba2 --plant` | 0 (caught) | 49.7 s; with the governing rule out: list files/repo 108 (12), exists/repo 14,490 (516), named 121,395 (3,104) on both doors; prose exists/repo 40,713 (2,206), named 224,289 (4,943) on both doors; captures named 86 (2) on both doors, two real Codex approval captures where a word ending one row is glued to the absolute path that starts the next |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 146 breaks each turning exactly its own row; nothing launched |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `npm run gate:contract` / `gate:checks` / `gate:electron` / `gate:background` | 0 each | byte for byte; 268 classified, `measure:p3471` an adapter integration test; 173 against 173; 3 of 563 |
| `df -h /` | — | 90 GiB free before `package` |
| `npm run package` (`CSC_IDENTITY_AUTO_DISCOVERY=false`), then `rm -rf release` | 0 | 75 s; zip 172,766,372 bytes and dmg 173,127,511, 828 MB in `release/`, removed. With the scratch HOME electron-builder's cache was empty, so it downloaded the Electron zip and its dmgbuild bundle into the scratch HOME's cache (234 MB, deleted after); nothing was installed outside the scratch HOME |

His history, read before and after every command above: `~/.zsh_history` `737549 1791921744`, `~/.bash_history`
`23166 1790702242`, never moved.

**Stated for the verifiers.** (1) `gate:checks`' rule 4 counts only top-level `build/*.mjs` (`readdirSync(buildDir)`),
so `build/p3471/corpora.mjs`, which calls `tsxCli()`, is not counted and `RUNNER_CALLER_FLOOR` stays 53; this predates
the phase (`build/p342/measure-p342.mjs` is not counted either, though the floor's comment names it). (2) The plant's
captures line shows a join shape the J rules do not refuse: a word at the end of a row glued to an absolute path at the
head of the next (`rest` + `/private/tmp/…`). D2 refuses it whenever the absolute path opens, so it is not a
regression, and in the `named` regime the absolute path is a file too, so D2 refuses it there. It is offered only
where the absolute path does not open and the glued name exists under the base, which no corpus models. A per-cell
count cannot see a gain on the wrong text, so lens A's attack should look at it; the 60 captures gain cells were not
broken down by this role. (3) `npm run typecheck` does not cover `build/**/*.mts`; the
corpora builder ran a strict `tsc --noEmit` over `compare.mts` and `generate.mts` (exit 0).

## §As built, the fix round (the fixer, 2026-10-14)

The verify answered lens A `approved` with one minor and two nits, and lens B (the app run) `needs_work` with one
major and two nits. This round fixes the major and the minor in the code, takes lens A's first nit into the headers,
and leaves the three tooling nits for the operator (below). Nothing was committed, staged or stashed; no Electron was
launched and no lock slot taken; `git diff 5f5efba2` is still exactly §15's files.

**The major (lens B): a join read cells a narrowed pane left behind, and opened a file the screen does not name.**
Fixed by J9 in `joinBoundary` (D11): `if (upperEnd > width) return false;` and, for the lower piece's own end,
`const lowerEnd = below.columns[next.start + next.text.length]; if (lowerEnd === undefined || lowerEnd > width)
return false;`. The lower clause reads the PIECE's end, not the row's, so stale cells after it, which the joined
name never reads, keep the join; a whole-row lower clause was built first and refused for that reason (it also
turned GR6's, U2's and PL1's readings at 45 columns red, whose last row is 46 cells while its piece is 30). Lens B's own pure reproduction, `app-lens/drive/pure-stale.mts`, run through the pinned tsx at this
tree: the 47-cell row answers `src/deep/folder/one.ts:5` at 0.38 to 1.15, the 49-cell row `null` (exit 0); before
the round it answered `src/deep/defolder/one.ts`. The lost gains are L7. `path-links.ts` is unchanged (sha256
`fb273a22…`).

**Fixtures a pane cannot draw.** J9 refuses a piece wider than the pane, and four kept assertions in
`p347-path-join.test.ts` and four rule 17 fixtures used one (a 20-cell row at 19 columns; `lib/util.ts`, 11 cells, at
10 and at 6). Each was made drawable with its clause intact, and the file is NO LONGER byte-identical to the kept copy
(+19 −11, said in comments beside each): the J2 middle control is read at 20 with the middle row on the last column;
J8's terminal-wrap control reads `moved src/` above `lib/a.ts` at 10 and its boundary `src/` above `lib/a.c` at 7; the
hovered-row case uses `go /Users/me/aaaaa-` at 19. In the gate: `j2-hovered` and `j2-hovered-below` (same rows,
`/Users/me/aaaaa-bb.md@1.3-2.5`), `j8-full` (`src/lib/a.ts@1.6-2.8`), `b-j8-head` (`src/` over `lib/a.c` at 7).

**New behaviour checks for J9.** U5 (five cases, §5.1) and rule 17's six join readings, four boundaries and two
ablations (§6.1), every expected value derived by hand. The gate's two ablations are each red on every reading they
own; the unit ablations, run by `fixer/ablate-units.py` in place with the file restored by sha256 each time: the upper
clause out turns 2 of U5's cases red ("from either row", "in CELLS"), the lower clause out turns 1 ("a lower piece
that runs into the stale cells").

**The minor (lens A, A1b): the door's kind was owned by a text read alone.** Fixed in behaviour (D12): GR11 (two
cases), rule 18's `g-fragment-image` and `g-fragment-mac` with the ablation "only the editor door's answer, or a
missing one, counts as taken" (G off owns both too), and S4's two shapes with the self-test's second plant,
`plant-editor/`. The rule 18 probe's stub door now takes a `kinds` map and records a Mac press as `mac:<path>`; no
earlier fixture names a kind or presses a Mac door, so every earlier reading is unchanged. A1b in place turns both
GR11 cases red; in S4 it reads 18 regression cells for the image (files door) and 11 for the PDF, and 0 on the
existence door, which answers the editor for everything.

**Lens A's first nit** is D13 and two header paragraphs (`path-spans.ts`' "WHY EVERY ROW, AND WHO OWNS THAT", and
rule 18's header in the gate): judging every row is a consistency rule owned by GR10 and rule 18, not by the corpora.

**Not done, for the operator.** Lens A's third nit (a folder on the last column above a bare name whose glued
spelling exists, in a column listing) needs no change in this phase; it stays a lead. Lens B's two nits are tooling:
the P arms run at the app's own width (152 columns), so a narrow-width arm is a later probe change; and
`probe:p247` and `build/electron-run.mjs`' census each read `tmux -L gmux list-sessions` (read only, at the parent
too), which the briefs' "never `-L gmux`" does not name as an exception. Both are left as they are.

**Commands** (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset; load
averages 400 to 560 throughout, from other phases):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 18 s; import boundaries 1,427 files, 8,118 imports, 0 violations; no runtime cycles over 1,424 files and 4,947 edges |
| `tsc --noEmit --strict` over `build/p3471/compare.mts` and `generate.mts` | 0 | |
| `npm run build` | 0 | 73 s; eager set 2 chunks, 1,683,230 raw and 430,069 gzip; `gate:electron` 173 against 173; `gate:background` 3 of 563, 19 of 19 fixtures; `gate:checks` 268 classified, tsxCli floor 53; `conformance:ios`, `conformance:harnessprobes`, `gate:onlyadd`, `gate:simulator`, `gate:knownhosts` pass; contract inventory byte for byte |
| `npm test` | 0 | 81 s; 1,136 files passed and 2 skipped; 21,245 tests passed and 14 skipped (7 more than before the round: U5's five and GR11's two) |
| `vitest run p347-path p3471 p247-path --reporter=verbose` | 0 | 202 tests: `p347-path-join` 35, `p347-path-links-join` 24, `p3471-spans-under-join` 35, `p3471-governing-rule` 26, `p247-path-spans` 36, `p247-path-links` 24, `p247-path-door` 16, `p247-path-open` 6 |
| `npm run conformance:pathdoors` | 0 | 19 s; rule 9 38 of 38; rule 17 68 join and 10 provider readings as pinned, 8 of 8 wiring plants, 25 of 25 ablations red on every reading each owns; rule 18 13 fixtures, 75 hovered rows, `rowSpansAt` equal on every row, 12 of 12 plants, 9 of 9 ablations red; every other rule green unedited |
| `node build/p3471/corpora.mjs --self-test` | 0 | 57 of 57 checks in 2.6 s (S1 15, S2 15, S3 4, S4 20, S5 3; the round added S4's six, two shapes on two doors and a kind check each, and left S1, S2, S3 and S5 as they were, so the "47" in the integrator's table above is short of the 51 its tree held by arithmetic, not by a run of that tree); counts 21,444, 45,360 and 5,020 |
| `npm run measure:p3471 -- --parent 5f5efba2` | 0 | 61 s; **0 regression cells on all 16 lines**; gain 5,267,116 cells, every line equal to the integrator's, so J9 costs no gain on any corpus (no corpus piece is wider than its pane) |
| `npm run measure:p3471 -- --parent 5f5efba2 --plant` | 0 (caught) | 59 s; every regression count equal to the integrator's (list 108, 14,490 and 121,395; prose 40,713 and 224,289; captures 86) |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 148 breaks each turning exactly its own row; nothing launched |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `npm run gate:contract` / `gate:checks` / `gate:electron` / `gate:background` | 0 each | byte for byte; 268 classified; 173 against 173; 3 of 563 |
| `df -h /` | — | 50 GiB free before `package` |
| `npm run package` (`CSC_IDENTITY_AUTO_DISCOVERY=false`), then `rm -rf release` | 0 | 76 s; zip 172,764,736 bytes and dmg 173,128,930, 844 MB in `release/`, removed; electron-builder's downloads went to the scratch HOME's cache (246 MB), deleted after |

His history, read before and after every command above: `~/.zsh_history` `737549 1791921744`, `~/.bash_history`
`23166 1790702242`, never moved.

**For the reverify.** Re-run lens B's failed item live (`G-stale-midwrap`: print at 49, narrow to 47, print the wrapped
relative path; the press must open nothing, as at the parent) beside lens B's clean rows (issue 40's at 45 to 49 must
still join) and the resize readings; and re-run lens A's A1b, which must now read red in vitest (GR11) and in
`measure:p3471 --self-test` (S4's editor-door plant). The round's own delta is saved as `fixer/fix-round.patch` in
the phase scratchpad.

## §As built, his ruled round (the fixer, 2026-10-14)

The reverify answered `needs_work` with one major, one minor and one nit, and his ruling on that second `needs_work`
was "Apply the fix, re-check once". This round is that fix; the re-check is the next role's, and its verdict goes to
him. Nothing was committed, staged or stashed (`git diff --cached` empty); no Electron was launched and no lock slot
taken; `git diff 5f5efba2` is still exactly §15's files.

**A fixer before this one died part way.** A first fixer for this round (`<scratchpad>/p3471/fixer2/`) edited
`path-spans.ts`, two test files, the gate and the kept provider test between 14:58 and 15:07 and stopped. Its
`pre/` copies were proved to be the reverified tree (the reverify's `candidate.diff` applied to `pre/path-spans.ts`
gives the reverify's `candidate-path-spans.ts` byte for byte), its five edited files were restored from them, and its
diffs were kept beside this round's scratch (`fixer3/dead-fixer2/`). This round started again from the reverified
tree, as a crash means restart fresh.

**The major: J9 cut the chain, and is now refused whole (D11).** `joinedPathAt`, once top and bottom are known:

```ts
  const pastWidth = (i: number): boolean => {
    const got = read(i);
    return got !== null && !(got.shape.end !== undefined && got.shape.end <= width);
  };
  if (pastWidth(top - 1) || pastWidth(bottom)) return null;
  const belowBottom = read(bottom + 1);
  const firstBelow = belowBottom === null ? undefined : lowerPiece(belowBottom.shape);
  if (belowBottom !== null && firstBelow !== undefined) {
    const reach = belowBottom.row.columns[firstBelow.start + firstBelow.text.length];
    if (reach === undefined || reach > width) return null;
  }
```

The row-above and row-below clauses are the reverify's candidate. Two choices of this round, each measured:

- **The bottom row is refused too** (his open question). The candidate, judged by this round's wrong-file count over
  the five stale corpora, still opens **122** files the screen does not name (every one the measurement prints is a
  `prev` layout whose bottom row carries leftovers after its piece, so the chain stops at a prefix:
  `…/parent-record-b-`, `…/77-arch-`, `src/main/machines/__tests__`; one of the 122 is on the existence door over
  this repository's own tree). With the bottom
  clause: **0**. On the clean corpora it costs nothing: `joinedPathAt` answers identically with and without it on all
  681,606 hovered rows of the five clean corpora, and the original three corpora's gain is 5,267,116 cells either way.
- **The fix round's lower clause in `joinBoundary` is removed as dead.** The candidate plus the bottom clause and
  this build answer `joinedPathAt` identically on every hovered row of all ten corpora (1,898,668 rows, a pure
  differential, `fixer3/tool/join-diff.mts`), and read every one of the 28 stale lines alike in the measurement (gain
  376,639 cells, 0 regression cells, 0 wrong-file opens each). The upper half stays in `joinBoundary`: taking it out
  reopens lens B's G-stale-midwrap (`src/deep/defolder/one.ts`).
- **The row-below clause is kept as the candidate measured it, and it is conservative.** It decides only where the
  walk stopped for another reason (a bottom row of two tokens), and there it refuses a chain no leftover cut. Without
  it this build reads 0 wrong-file opens and 4,983 more gained cells on the stale corpora (381,622 against 376,639);
  that is its whole price, on stale screens only.

**The stale-screen gain the refusal gives up (L7)**, files door over this repository's tree on `prose-stale` (all
three ways summed): the fix round 230,705 cells with 124 wrong-file opens, the candidate 69,647 with 0 there (and 122
elsewhere), this build **44,803** with 0. The reverify read the same fall on its `prev` split alone, 209,311 to
56,323. Over all 28 stale lines: the fix round 2,152,267 gained cells with 9,036 wrong-file opens, the candidate
492,035 with 122, this build 376,639 with 0. No clean corpus loses a cell.

**Fixtures a pane cannot draw.** The bottom clause refuses a 46-cell bottom row at 45 columns, which no pane draws,
so the four cases that read issue 40's rows with `/a/other.md` beside the bottom piece at 45 (GR6's two, U2's "at 45",
PL1's "a row with no span of its own") and rule 17's `p-accepted-45` shorten the second path to `/a/o.md`, which none
of those door tables accepts, each with its own comment. The fix round met the same rows and chose the piece's end for
that reason; his question asked for the row, and the corpora say it costs nothing that a pane can draw.

**The tests (U5, GR12, rule 17).** U5 rewritten (§5.1): the "after its piece" case turned around beside its clean
twin, lens B's own G-stale-midwrap rows beside its clean twin, F1's X1 from every row, X2 and X3 refused from every row with the two lower rows shown to join when nothing past
the width sits above them, the prefix case, and the row below. GR12 (§5.2) is F1 through the shipping provider: no
press opens the project's file. Rule 17 (§6.1): 83 join readings (15 new) and 12 provider readings (2 new), 27 of 27
ablations red on every reading each owns, the lower-clause ablation replaced by three, one per clause of
`joinedPathAt`'s J9. In a `cp -Rc` clone with its `.git` removed, each clause taken out once, the file restored by
sha256 after each and the clone's `src` compared equal to the worktree's after all (`fixer3/tool/ablate.py`, 210
tests at the time):

| Ablation | vitest (`p347-path p3471 p247-path`, 209 tests) | `conformance:pathdoors` |
| --- | --- | --- |
| `joinBoundary`'s upper half | exit 1, 6 red (U5 "from either row", lens B's own rows, F1 X2, F1 X3, prefix, "in CELLS") | exit 1, 10 findings (`j9-stale-upper`, `-upper-top`, `j9-g-stale-midwrap`, the four F1, `b-j9-upper`) |
| the row above (the fix round's cut) | exit 1, 4 red (U5 F1 X2 and X3, GR12 X2 and X3) | exit 1, 10 findings (the four F1, `p-j9-f1-x2` and `-x3` drawing `build/…/package.json:134` where today draws nothing) |
| the bottom row | exit 1, 3 red (U5 lower piece glued, after its piece, prefix) | exit 1, 6 findings (`j9-stale-lower` reading `…kkk.mdde`, `j9-stale-after-piece`, both prefix readings) |
| the row below | exit 1, 1 red (U5 row below) | exit 1, 2 findings (`j9-below-reach`) |
| lens A's A1b (only the editor door's answer is taken) | exit 1, 2 red (GR11's image and Mac) | exit 1, 11 findings (`g-fragment-image`, `g-fragment-mac`) |

**The minor: the words.** D11 and L7 rewritten (above), §5.1, §5.2, §6.1, §7.2a, §7.4, §7.5 and §7.6 extended; the
`path-spans.ts` header's J9 sentence now says a join is refused WHOLE, and every refusal there is whole; the
`joinBoundary` and `joinedPathAt` comments say which half lives where and why. Lens A's minor (the door's kind owned by
behaviour) was answered by the fix round and still holds: A1b turns GR11's two cases red by behaviour, rule 18's
`g-fragment-image` and `g-fragment-mac` read the join, and the self-test's S4 editor-door plant reads 18 and 11
regression cells on the files door.

**The nit: the corpora now see both classes (§7.2a).** Seven corpora, pinned; the wrong-file count (§7.4); S6; and
`--plant-j9`. The instrument can fail on each: at the fix round's own build the measurement reads **9,036** wrong-file
opens, **105** of them on `prose-outside-stale` over this repository's tree with the files door (the reverify's class,
the lower rows of a path in another folder opening the project's own file); with `joinedPathAt`'s J9 planted out of
HEAD, 9,700 and the same 105; with J9 removed whole (S6's `plant-off`), lens B's `src/deep/defolder/one.ts`. Run
through the reverify's own T and F tools at the four builds: G-stale-midwrap, T1 to T4, X2 and X3 open nothing at the
parent, the candidate and HEAD (the fix round opens `/r/tortie/build/fixtures/facts/manifests/package.json:134` on X2
and X3); T3c, the clean midwrap and issue 40 at 47 join at HEAD as before (gains 90, 24 and 124 cells, 0 regressions).

**Commands** (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID`, `TERM_PROGRAM` unset; load
averages 4 to 235, from other phases):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 6.3 s; no runtime cycles over 1,424 files and 4,947 edges |
| `tsc --noEmit --strict` over `build/p3471/compare.mts` and `generate.mts` | 0 | |
| `vitest run p347-path p3471 p247-path --reporter=verbose` | 0 | 210 tests: `p347-path-join` 35, `p347-path-links-join` 24, `p3471-spans-under-join` 41, `p3471-governing-rule` 28, `p247-path-spans` 36, `p247-path-links` 24, `p247-path-door` 16, `p247-path-open` 6 |
| `npm test` | 0 | 89.0 s; 1,136 files passed and 2 skipped; 21,253 tests passed and 14 skipped (8 more than the fix round's 21,245) |
| `node build/conformance-pathdoors.mjs` | 0 | 16 s; rule 9 38 of 38; rule 17 83 join and 12 provider readings, 8 of 8 wiring plants, 27 of 27 ablations; rule 18 13 fixtures, 75 hovered rows, 12 of 12 plants, 9 of 9 ablations; every other rule green unedited |
| `node build/p3471/corpora.mjs --self-test --parent 5f5efba2` (and with no `--parent`) | 0 | 81 of 81 checks in 21.1 s (18.8 s); the ten counts equal §7.2 and §7.2a; S6 10 of 10 |
| `node build/p3471/corpora.mjs --parent 5f5efba2` | 0 | 302.7 s; **0 regression cells on all 56 lines and 0 wrong-file opens on the 28 stale ones**; the original 16 lines' gain unchanged, 5,267,116; 8,260,997 over every line |
| `… --parent 5f5efba2 --plant` | 0 (caught) | 320.4 s; the original three equal the integrator's (list 108, 14,490 and 121,395; prose 40,713 and 224,289; captures 86); `list-outside`, `prose-outside`, `prose-stale` and `prose-outside-stale` read regressions under `named` too, and `list-stale`, `captures-stale` and `list-outside-stale` none, where HEAD offers no join at all |
| `… --parent 5f5efba2 --plant-j9 --corpus <the five stale>` | 0 (caught) | 242.7 s; wrong-file opens on every stale corpus, 105 on `prose-outside-stale` files `repo` |
| `… --parent 5f5efba2 --head <the fix round's build>` (stale corpora) | 1 | 324 s; 9,036 wrong-file opens, the reverify's major seen by the committed measurement |
| `… --head <the candidate>` / `<the candidate with the bottom clause>` / `<HEAD without the row-below clause>` | 1 / 0 / 0 | 318 s, 239 s, 238 s; 122 wrong-file opens / 0 and 376,639 cells, HEAD's on every line / 0 and 381,622 cells |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 148 breaks; nothing launched |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `npm run build` | 0 | 42.5 s; eager set 1,683,551 raw and 430,162 gzip; `gate:electron` 173 against 173; `gate:background` 3 of 563, 19 of 19 fixtures; `gate:checks` 268 classified, tsxCli floor 53; `conformance:ios`, `conformance:harnessprobes`, `gate:onlyadd`, `gate:simulator`, `gate:docker` pass; contract inventory byte for byte |
| `npm run gate:checks` / `gate:contract` | 0 each | 268 classified; byte for byte |

His history, read before and after every command above: `~/.zsh_history` `737549 1791921744`, `~/.bash_history`
`23166 1790702242`, never moved.

**For the re-check.** Re-run F1's X2 and X3 and lens B's G-stale-midwrap live at the parent and at HEAD (the press
must open nothing), issue 40's rows at 45 to 49 (the whole path from every row), and the reverify's stale corpus with
its out-of-project spellings, which must read 0 wrong opens; and attack the bottom clause, the one rule this round
chose, on a screen it would wrongly keep or wrongly refuse.

## §As built, absolute only (the integrator, 2026-10-14)

His ruling, "Join absolute paths only", is built as §4.6 wrote it: J10 at `path-spans.ts:1061`, byte for byte
(`  if (!target.startsWith('/') && !target.startsWith('~/')) return null;`), J11's two blocks byte for byte (§4.6's
25 lines are a substring of the file; each anchor, `    aboveTop !== null &&` and `    aboveBottom !== null &&`,
occurs once), and J8 at the chain's top gone. Nothing was committed, staged or stashed (`git diff --cached` empty);
no Electron was launched, no lock slot taken, no tmux started, no model turn spent; `git diff 5f5efba2` and
`git status --short` list exactly §15's files.

**Two builders stopped, and an integrator before this one died part way.** The gate and corpora builders each
stopped when `~/.zsh_history` moved: `737549 1791921744` became `737573 1792023642` (20:20:42), `737600 1792023650`
(20:20:50), `737644 1792023773` (20:22:53) and `737736 1792023873` (20:24:33), four appends in four minutes while
their only processes were node, the pinned tsx, a read-only `git show` and a non-interactive `zsh -f`, each with
`HISTFILE=/dev/null` and a scratch HOME and ZDOTDIR. `~/.bash_history` never moved. Nothing in this phase writes
that file, the appends match commands typed in a shell elsewhere, and it has not moved since 20:24:33: a poller the
first integrator left running (pid 49979, stat only, exits on its own after four hours; not this role's to end)
logged no move from 20:26:44 to the end of this role's run. A first integrator (`<scratchpad>/p3471/integrator-abs/`,
20:26 to 20:32) read its baseline as `737736 1792023873`, ran typecheck, the path tests, the gate and both self-tests
(exit 0 each), corrected §2.4, D14, D17 and L9 from the builders' readings, wrote §11's CHANGELOG item and the
`conformance:pathdoors` row, and stopped during its twelve-corpus measurement. This role re-read each of those edits
against the builders' reports, kept them, and ran every command again from the start; its baseline is the same.

**What each builder built** (each report is in `<scratchpad>/p3471/{join4,gate-abs,corpora-abs}/`):

- `join`: J10 and J11 in `joinedPathAt`, J8 at the top removed, the header's new section `JOIN ABSOLUTE PATHS ONLY`
  and D5's correction, one header sentence in `path-links.ts`; the fourteen §2.4 cases re-pointed with absolute twins;
  U6 (15 tests), U7 (8), GR13, GR14 (three cases, one beyond §5.4, so each half of J11 owns a provider case) and
  `b8-tilde-below`. Each clause taken out in a clone turned its owners red (J10 24 tests, J11's top half 2, bottom 3,
  both 7, J8 in `joinBoundary` 2, J9's four 4, 2, 3 and 1).
- `gate`: rule 17 at 114 join readings (was 83) and 12 provider readings, 29 of 29 ablations (J10's new, J11's two
  halves new, J8-at-top gone, J9's three re-owned to absolute twins); rule 18 at 14 fixtures and 82 rows, G off
  owning `g-indent-edge-abs`. Every §6.3 value read live.
- `corpora`: §7.2b's two margin corpora and `printed` on every list and prose layout (all twelve pins equal to
  §7.2b), the `twin` regime, the printed-path wrong-file count, the cut report, `--plant-abs`, `--plant-j11`,
  `--plant-j9` re-judged, S7 and S8. It stopped before the twelve-corpus run and the measured budget, which this
  role ran and wrote.

**Decisions of this role.**

1. **The J11 top control is one cell, as every place says.** U7 and GR14 spelled it `I saved it to /Users/me/pr`, two
   cells shorter, beside a comment and §5.4 saying one; the gate's `j11-top-control` and §6.3 use `/Users/me/pro`.
   Both tests now use `/pro` (§5.4 corrected): the two rows end one column apart, which is the claim that the column
   decides. The control still joins and opens through the provider (245 of 245, below).
2. **`corpora.mjs`'s PASS line no longer says "0 wrong-file opens on the 0 stale ones"** when no stale corpus is
   asked; it says `no stale line asked` (the corpora builder's wording note). Its header gains this round's measured
   budget and readings.
3. **Kept, not extracted:** the one duplicated run the 10-line scan of this round's added lines found
   (`dupscan.py` over the nine files' pre-round copies) is the twelve corpus names, listed in `generate.mts`
   (`CORPUS_NAMES`) and again in `corpora.mjs` (`CORPORA`): `corpora.mjs` is plain node and does not load the
   `.mts`, and S3 and S5 read all twelve, so a list that drifts fails the self-test. No production block is
   duplicated.
4. **Kept from the first integrator:** D14 (the glued prefixes `x=`, `--file=` and `foo:` are refused by the grammar
   before J10; `$HOME/abs/…` and `~me/abs/…` are J10's), §2.4 and D17 (`prose-outside`'s 694 HEAD cells are joins to
   a printed `README.md`, not the reverify's class, which lives in `prose-margin`), L9 (J11's bottom half refuses
   the first path of the price rows and J5 the second).
5. **Kept as §6.3 wrote them:** the readings the gate builder found also moving under an ablation that does not
   own them (`j10-spell-tilde-user`, `-dot`, `-dotdot`, `-bare` under J10; `j11-price` under J11's bottom half;
   `j9-f1-x2-middle` under J9's upper half). Owning them would add nothing a reading already owned does not prove.
6. CLAUDE.md: the `measure:p3471` row says twelve corpora, the margin corpora, the `twin` regime, the printed-path
   count, the cut report, the four plants, `--plant-j9`'s re-judged verdict and the times measured here;
   the `conformance:pathdoors` row (the first integrator's) says J10, J11 and J8-at-top gone. `verification-checks.mjs`:
   the comment names the twelve corpora, 361 s, and the two new plants; the classification is unchanged.

**What the measurement reads** (`node build/p3471/corpora.mjs --parent 5f5efba2`, 361.0 s, exit 0): 0 regression
cells on all 80 lines, 0 wrong-file opens on the 32 stale lines, 0 printed-path wrong-file opens on the 32 `repo` and
`twin` lines, the cut report met on the 10 corpora that carry what they printed. The ten corpora's 56 lines outside
the `twin` regime gain **6,855,097** cells, the spec's prototype figure exactly (§2.4; 8,260,997 before his ruling);
8,921,504 over all 80. By corpus (gain over all its lines; files door `repo` gain; cut layouts relative /
bottom-at-slash / bottom-at-dash / mid-name / top / other):

| Corpus | layouts | lines | gain | files `repo` | cuts |
| --- | --- | --- | --- | --- | --- |
| list | 21,444 | 6 | 698,873 | 79,549 | 0 / 0 / 0 / 2 / 0 / 515 |
| prose | 45,360 | 6 | 3,245,459 | 641,420 | 0 / 395 / 0 / 0 / 0 / 260 |
| captures | 5,020 | 4 | 0 | | none carried |
| list-outside | 12,492 | 8 | 698,873 (532,415 outside `twin`) | 0 | 0 / 0 / 0 / 2 / 0 / 515 |
| prose-outside | 30,240 | 8 | 3,256,473 (2,064,094) | 0 | 0 / 395 / 0 / 0 / 0 / 260 |
| list-stale | 36,608 | 6 | 0 | 0 | 0 throughout |
| prose-stale | 80,642 | 6 | 191,714 | 35,579 | 0 / 72 / 0 / 0 / 0 / 0 |
| captures-stale | 7,641 | 4 | 0 | | none carried |
| list-outside-stale | 21,085 | 8 | 0 | 0 | 0 throughout |
| prose-outside-stale | 54,942 | 8 | 191,427 (122,542) | 0 | 0 / 70 / 0 / 0 / 0 / 0 |
| prose-margin | 40,185 | 8 | 271,785 (154,199) | 42,149 | 0 / 148 / 76 / 0 / 0 / 0 |
| listing | 5,798 | 8 | 366,900 (232,936) | 35,056 | 0 / 6 / 16 / 0 / 0 / 20 |

On `named` and `named-dirs` (printed, not graded) the printed-path count reads what the governing rule lets through
where every asked spelling exists (list 502 and 517 a line, prose 310 and 584, prose-margin 0 and 209, listing 20
and 44); the cut report judges those cuts door-free and every one is a `bottom-at-slash`, `bottom-at-dash` or `other`
piece (L8).

**Commands** (in `/private/tmp/wt-p3471` through `<scratchpad>/p3471/integrator-abs/tool/run2.sh`: HOME and ZDOTDIR
`integrator-abs/home2`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset, npm's update check off; his history stat'd
before and after each, every exit and second in `integrator-abs/cmdlog-r2.txt`, every output in `integrator-abs/out2/`;
load averages 4 to 6, except 5 to 135 from 22:22 to 22:29 while the four plants ran at once beside another phase's
Simulator and `xcodebuild`, memory 49 % free):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 5 s; import boundaries 1,427 files, 8,118 imports, 0 violations; no runtime cycles over 1,424 files and 4,947 edges |
| `vitest run p347-path p3471 p247-path` | 0 | 245 tests: `p347-path-join` 36, `p3471-spans-under-join` 67, `p3471-governing-rule` 36, `p347-path-links-join` 24, `p247-path-spans` 36, `p247-path-links` 24, `p247-path-door` 16, `p247-path-open` 6 |
| `npm run conformance:pathdoors` | 0 | 12 s; rule 9 38 of 38; rule 17 114 join and 12 provider readings, 8 of 8 wiring plants, 29 of 29 ablations red on every reading each owns; rule 18 14 fixtures, 82 hovered rows, 12 of 12 plants, 9 of 9 ablations; no `.p247-ablation-*` folder left |
| `node build/p3471/corpora.mjs --self-test --parent 5f5efba2` | 0 | 93 of 93 checks in 18.3 s; twelve counts equal §7.2 to §7.2b; again after this role's edit, 93 of 93 in 20.4 s |
| `node build/p3471/corpora.mjs --parent 5f5efba2 --out …/integrator-abs/measure.json` | 0 | 361.0 s (list 10.4, prose 22.9, captures 16.2, list-outside 7.7, prose-outside 20.7, list-stale 21.2, prose-stale 70.8, captures-stale 87.0, list-outside-stale 12.6, prose-outside-stale 57.3, prose-margin 26.2, listing 8.0); the table above |
| `… --plant --corpus list,prose` | 0 (caught) | 48.2 s; under `named` on both doors list 99,007 and prose 187,966 regression cells (§2.4's) |
| `… --plant-j9 --corpus prose-stale,prose-outside-stale` | 0 (caught) | 165.0 s; under `named` on both doors 180 and 166 wrong-file opens a line (§2.4's); prose-stale files `repo` 5, exists `repo` 10; prose-outside-stale `twin` 3 and 7 |
| `… --plant-abs --corpus prose-margin,listing` | 0 (caught) | 48.9 s; relative cut layouts 442 and 22 (§2.4's); prose-margin printed-path wrong-file opens 50 on files `repo` and `twin`, 49 on exists `repo` and `twin` |
| `… --plant-j11 --corpus prose-margin` | 0 (caught) | 30.5 s; 46 top and 232 mid-name cut layouts (§2.4's); 0 printed-path wrong-file opens on `repo` and `twin`, as the census read J10 alone (a cut opens a file only where one sits at the shorter path) |
| `… --corpus prose-margin,listing,prose-outside` | 0 | 57 s; 24 lines; `PASS: … no stale line asked …`; gain 3,895,158 |
| `… --head <today's HEAD: corpora-abs/head-today, the pre-ruling path-spans.ts> --corpus prose-outside,prose-margin,listing` | 1 | 65 s; the instrument on today's tree: prose-margin 55 printed-path wrong-file opens on each `repo` and `twin` line of both doors; relative cut layouts 185, 600 and 36; prose-margin 46 top and 232 mid-name, listing 2 and 16 |
| THE CENSUS, `node <scratchpad>/p3471/abs/spec/tool/run-census.mjs --head /private/tmp/wt-p3471 --out …/integrator-abs/census.json` | 0 | 146 s; `sent` 3,506,918 layouts: 0 wrong readings, 0 single-row mismatches, right layouts 313,972, cut layouts top 2, mid-name 9, at `/` 13,718, at `-` 7,629; `list` 333,841 layouts: 0 wrong, 0 mismatches, right 50,612, glued 2,125, at `/` 567, at `-` 902. Right layouts 364,584 and top and mid-name cuts 2 and 9, equal to §2.4's J10 + J11 row; today's HEAD reads 13,879 wrong opens there |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 148 breaks, nothing launched |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `tsc --noEmit --strict --target ES2023 --lib ES2023 --module ESNext --moduleResolution bundler --types node --allowImportingTsExtensions --allowJs --skipLibCheck --noUncheckedIndexedAccess build/p3471/compare.mts build/p3471/generate.mts` | 0 | 177 files; without `--allowJs` exit 2 on TS7016 alone (`./stage.mjs` has no declaration) |
| `npm test` | 0 | 61 s; 1,136 files passed and 2 skipped; 21,288 tests passed and 14 skipped (35 more than the ruled round's 21,253: 245 less 210) |
| `npm run build` | 0 | 37 s; eager set 1,684,100 raw and 430,277 gzip (1,683,551 and 430,162 in the ruled round); `gate:electron` 173 against 173; `gate:background` 3 of 563, 19 of 19 fixtures; `gate:checks` 268 classified, tsxCli 53 of 53; `gate:simulator`, `gate:docker`, `conformance:ios` (50 rules), `conformance:harnessprobes` (6 clauses, 16 ablations) pass; contract inventory byte for byte |
| `npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | byte for byte; 268 classified; 173 of 173; 3 of 563 and 19 of 19 |
| `df -h /` | — | 74 GiB free |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`, then `rm -rf release` | 0 | 53 s; dmg 173,129,718 bytes, zip 172,764,579, 831 MB in `release/`, removed. With the scratch HOME electron-builder downloaded the Electron zip and its dmgbuild bundle into `home2`'s cache (247 MB), removed with it |
| `git diff --cached --stat`; `git status --short` | — | empty; exactly §15's files |

His history, before and after every command above: `~/.zsh_history` `737736 1792023873`, `~/.bash_history`
`23166 1790702242`, never moved.

**For the verifiers.** Re-run issue 40's rows at 45 to 49 and the reverify's E1 at 46 and 47 live at the parent and
at HEAD (the whole absolute path from every row at 46; nothing at 47, where the parent also opens nothing); press the
reverify's nit and the two J11 rows of §5.4 with both names on disk (nothing opens); and attack J10 and J11 where
they could wrongly keep a join: an absolute piece that is a cut of a longer printed path the census's two breakers
never drew (L8's four shapes are the known residue), and a `~/` the grammar takes that is not a home path.

## §As built, absolute only: the fix round (the fixer, 2026-10-15)

**The verdicts.** Lens 1, the attack, read `needs_work`: one major, J11 read ONE column for every row a breaker cut,
which is wrap-ansi's hard mode alone, so Rust's textwrap, Python's textwrap, Ink with an emoji Tortie's xterm draws a
cell narrower than Ink counts, and a breaker that breaks before `/` each opened a file the screen does not name where
the parent opened nothing (4 layouts and 321 cells in its 11,126,872-layout census, 1,014 layouts in its hostile tree,
and hand shapes); one minor, seven of J11's fourteen conjuncts owned by no test, two of them carrying gain; two nits,
a soft wrap ending in `]` before `/` and L8's glued paths. Lens 2, the app run, read `approved`. The task's rule for
this round: refuse more, never join more; anything that can open a file the screen does not name is refused whole.
Nothing was committed, staged or stashed (`git diff --cached` empty); no Electron was launched, no lock slot taken, no
tmux started, no model turn spent, nothing installed.

**What changed in `joinedPathAt`: J11 rewritten, refusals only** (`src/shared/path-spans.ts`; its comment, the
header's J11 paragraph and `joinedPathAt`'s doc comment say it in the same words). A breaker that cuts inside a token
cuts at its LIMIT, or at one of its break opportunities when the fragment after it does not fit, and its limit is
never below the widest row it drew. So, with `widest` the widest row the chain draws and `widestAbove` the widest of
its rows above the bottom, each counted as a breaker may have counted it (`cellsWide`: a glyph xterm draws two cells
wide counts as one, since a breaker counting code points counts it so):

- **The top half** refuses the chain when its top row holds only its piece and the row above it either (a) plus the
  fragment a breaker may have moved down to the top row reaches past `widest`, the row above counted with every
  UTF-16 unit outside ASCII past its gutter as a cell xterm may have drawn narrower than the breaker counted
  (`cellsUndrawn`: Ink's string-width counts `✅`, `⚠️` and `🔧` as two cells, and Tortie's xterm, with no unicode11
  addon, draws each in one); or (b) ends in a root a path goes on from (`continuesARoot`: `~` or `~name` alone, a `$`
  variable alone, or a URL, its last token and the top piece read together as `scheme://…`).
- **The bottom half** refuses the chain when its bottom row holds only its piece, the row below starts with a
  character a name goes on with (`NAME_CHARACTER`: `SEGMENT`'s and `/`), the piece ends in no line suffix, and the
  bottom row plus the fragment a breaker may have moved down from it reaches past `widestAbove`.
- **The moved fragment** (`movedFragmentCells`, one function for both halves), the longest any modelled breaker could
  have moved: after a `-`, the whole token (Python's textwrap breaks again only at a `-` between letters, Rust's
  between letters or digits); after a `/`, through the next `/` or `-` no digit follows (UAX #14), or the whole token;
  before a `/`, the piece up to its next `/` or through its first `-` (`firstFragmentCells`, the attack's breaker);
  otherwise one cell, a cut at the limit.

| The attack's shape | Why the one-column J11 missed it | What refuses it now |
| --- | --- | --- |
| Rust textwrap: `⏺ Updated /private/tmp/wt-p3471-parent-` (39) above `  attack/…/58/cmd.hard` (41) above `  13:62 …` at 45 | the row above the bottom ends after `-`, short of the limit | the bottom row (41) reaches the widest row above it (39) |
| Python textwrap: `xxxxxxx Saved to ~/h` (20) above `/tmp/p3471atk/very-` (19) … at 21 | the top row ends after `-`, so the two rows end at different columns | the top: 20 + `/tmp` (4) past 19 |
| Ink with `✅`: `⏺ ✅ Updated ~/h/bbb…` (46 drawn, 47 counted) above `  /tmp/p3471atk/…-f` (47) at 47 | the top row is full, and J11 read only rows short of the edge | the top: 46 + 1 (`✅`) + `/tmp` past 47 |
| A breaker that breaks before every `/` (the attack's hostile one) | its rows end before a `/` anywhere, never at one column | the top: the row above within `/tmp` of `widest` |
| A soft wrap ending in `]` before `/` (the nit) at 23 | J1 stops the walk at `]`, and J11 read no full row | the top: 23 + `/tmp` past 23 |
| `I wrote the build log to ~` above `/tmp/…`, `See https://example.com` above `/tmp/…` (hand shapes) | no modelled breaker leaves them: the row above ends short | the top's root clause: `~` alone, a URL |
| Two absolute paths glued where the first fills its row exactly (L8, the nit) | the walk itself glues them, as any soft wrap at a `/` | not refused: L8, as before (the attack lens: "None needed") |

**Decisions of this round.**

1. **The model, not the column.** Every real breaker the attack named cuts inside a token only at its limit or at a
   break opportunity, and the attack's hostile breaker adds before `/`. J11 now asks, at each end the walk stopped,
   whether any breaker of a limit the chain allows could have cut there, which needs no knowledge of the limit. What
   it does not model is L10.
2. **The break opportunities are refused at the bottom too** (a piece ending in `/` or `-`, or a row below starting
   with `/`): they leave a folder, a bundle the Mac door would open, or a name ending in `-`, which L8 had left. Over
   the spec's census this costs 1,564 `list` right layouts and no `sent` one; refusing more is this round's rule.
3. **Two exemptions on the bottom keep gain and are owned** (the minor): a row below that starts with a character no
   name goes on with (`(+3 -1)`, `:12`) and a piece ending in a line suffix. Neither can leave a shorter name of a
   longer printed one: the first because the two are not one name, the second because the suffix's `:` ended it.
   Without them the bottom half costs 7,940 more `sent` right layouts. The top half has no such exemption: a row
   above ending in any token is read, which is what refuses the `]` soft wrap and the root shapes.
4. **The before-`/` model at the top is kept although no real breaker needs it**, because the attack listed the
   hostile breaker's 954 layouts as worse than today: it costs 3,345 `list` right layouts and 1 `sent` (`find`
   listings whose previous path ends within a segment of the widest row) and is the price of refusing them.
5. **J9's row-above clause now decides only a top row holding more than its piece**: J11's top half refuses a lone top
   piece below any row reaching past `widest`, a row read past the pane's width among them. Kept (D11), and re-owned by
   `j9a-row-above-tokens` (rule 17) and a U5 case. **J8 in `joinBoundary` decides no join any more**: the one absolute
   shape it decided (D16, `b8-tilde-below`) is J11's too, since the row above ends in `/` and `~/` would not have
   fitted beside it. Kept, as a refusal, owning its boundary reading `b-j8-relative`; the brief keeps J1 to J9 unless
   one is measured redundant, and this records the measurement without removing it.
6. **The instruments that planted one clause plant J11 beside it**, or they would plant nothing: `--plant-j9` and the
   self-test's `cut` plant take J11's top half out with J9's cut (`PLANT_CUT`), and `--plant-abs` takes J11 out with
   J10 (`PLANT_ABS`), because the widened J11 refuses the relative tails the margin corpora draw as well (each sits
   below a row ending in `/` or `-`). J10 still alone owns its unit tests (21 red without it), its rule-17 readings
   (`j10-*`) and S7's row, a relative tail below a row that ends short. S7's J10 row is that tail
   (`⏺ Updated /q/tortie/` above `src/main/…`): the reverify's E1 is J11's too now.
7. **The instrument sees the class** (the major's last ask): `build/p3471/generate.mts` gains `prose-cutters`, 69,008
   layouts, sha256 `efc2ddb8415fce23486853dd0d9187c77a0aeb486a1890dc96e279e688e75f7b`: `prose-margin`'s thirty paths,
   five spellings, six sentences and five widths at 0 to 13 cells short of the pane, broken by Python's textwrap
   (`textwrapWrap`), Rust's textwrap first fit with its hyphen splitter (`hyphenWrap`), the attack's before-`/` breaker
   (`slashWrap`), and Ink (`inkWrap` over `wrapAnsiHard`, wrap-ansi 7's `exec` with Ink's options, its widths counted
   as string-width counts them) over three sentences carrying an emoji. Generated twice to one sha256, and a second
   time with Python's own `textwrap.wrap`, a first fit written in Python and the real wrap-ansi from `node_modules`, to
   the same count and sha256; row for row `textwrapWrap` equals Python's own over all 63,000 asks, `inkWrap` the real
   wrap-ansi over all 31,500, and `hyphenWrap` and `slashWrap` the attack lens's own ports over the 63,000 with no
   indent. It is `twin` and in `CUT_STRICT`; the round before's J11, judged as `--head`, reads 519 `top` and 12
   `bottom-mid-name` cut layouts there and fails, and `--plant-j11` reads its cuts when it is asked.
8. **U7's and GR14's one-cell controls are re-pointed**: one cell short is now a cut a breaker that breaks before `/`
   may have made (`I saved it to /Users/me/pro`, U8 and `j11-slash`), and one cell longer a bottom row reaching the
   widest row (`assets/vendor-chunk-ab/index.js`, U8 and `j11-wider`); the controls are a row five cells short and a
   bottom row two cells shorter, which join and open. `X40`'s folder join, `issue-50-bottom` and the E1 rows keep
   their readings; `b8-tilde-below` now reads no join.
9. **Not chosen**: D15's door check (two more targets a hover, a second construction beside D2); refusing every soft
   wrap that breaks just before a `/` (L8's glued residue, at the price of about one soft-wrapped path in ten); and a
   bottom fragment of the whole token after any break (it refused the reverify's relative E1 tail too, which left
   `--plant-abs`'s J10 unseen, and costs right joins J10 already refuses).

**Who owns each clause** (the minor). Every conjunct and term of the new J11 has a unit test (U7, U8, GR14) and a
rule-17 reading with its own ablation, each red on every reading it owns (rule 17: 142 join and 12 provider readings,
49 of 49 ablations). Twenty-six one-clause ablations in a `cp -Rc` clone (`.git` removed, the file restored by content
and its sha256 `690ddccd…` checked in a `finally`), each turning the path tests and `conformance:pathdoors` red:

| Ablation | vitest red | pathdoors |
| --- | --- | --- |
| J11's top half out / bottom half out | 15 / 8 | red / red |
| top: the moved fragment as one cell; no undrawn cell; the gutter counted | 5; 1; 1 | red |
| top: no root; no home or variable; no URL | 5; 3; 2 | red |
| a wide glyph counted as drawn | 1 | red |
| top / bottom: a row holding more than its piece read | 4 / 11 | red |
| bottom: the row below read whatever it starts with; a line suffix read | 1; 1 | red |
| bottom: past rather than reaching `widestAbove`; top: one cell past `widest` | 4; 3 | red |
| both ends: every break a cut at the limit; before a `/` not a break; after `-` not; after `/` not | 5; 4; 1; 2 | red |
| after `-` the first fragment only; after `/` a `-` before a digit a break; after `/` without the `/`; the first fragment through the `/` | 1; 1; 2; 1 | red |
| J10 out; J9's row above out; J8 in `joinBoundary` out | 21; 1; 2 | red |

**What it reads.**

| Instrument | Today (`5f5efba2`) | The round before (integrator) | This round |
| --- | --- | --- | --- |
| The attack lens's census, its own tools re-run over this repository's tree at `/private/tmp/wt-p3471-parent-attack` (`git archive 5f5efba2`), 11,126,872 layouts | nothing over two rows | 4 wrong layouts, 321 cells | **0 wrong, 0 moved**; 5,113 cut join rows left, every one a glued `other` (L8) |
| Its emoji census, 3,448,508 layouts | — | 0 wrong; 1,786 top and 28,962 mid-name cut rows offered | **0 wrong, 0 moved**; 4,094 cut rows, every one glued |
| Its hostile tree (absolute twins under `/private/tmp/p3471atk`), 1,545,743 layouts | — | 1,014 wrong layouts | **0 wrong, 0 moved** |
| Its 23 hand shapes and its emoji demo | — | 16 shapes wrong, `two-abs-glued` among them | **0**, but `two-abs-glued` (35 cells, L8) |
| The spec's census (`run-census.mjs`), `sent` 3,506,918 and `list` 333,841 | — | 0 wrong; right 313,972 + 50,612; top 2, mid-name 9, at `/` 13,718 + 567, at `-` 7,629 + 902 | **0 wrong, 0 mismatches**; right 311,980 + 46,233; **every cut kind 0** but 1,389 glued `list` |
| `measure:p3471`, thirteen corpora, 88 lines | — | (twelve) PASS, gain 8,921,504 | **PASS**: 0 regression, 0 stale wrong-file opens on 32 lines, 0 printed-path wrong-file opens on 36 `repo` and `twin` lines, the cut report met on 11 corpora; gain 9,683,454 (8,736,663 on the twelve, 6,721,065 on the ten outside `twin`) |

**Commands** (in `/private/tmp/wt-p3471` unless named; HOME and ZDOTDIR `<scratchpad>/p3471/fixabs/home`,
`HISTFILE=/dev/null`, `TERM_SESSION_ID` unset; every exit and second in `<scratchpad>/p3471/fixabs/logs/cmdlog.txt`;
load averages 10 to 1,000 while another phase's Simulator, its probes and someone's `while :` loads ran):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | import boundaries 1,427 files, 0 violations; no runtime cycles |
| `vitest run p347-path p3471 p247-path` | 0 | 265 tests (245 before: U8's 15, U5's one, U7 and GR14 re-pointed, GR14's four attack shapes) |
| `npm run conformance:pathdoors` | 0 | 17 to 38 s; rule 17 142 join and 12 provider readings, 8 of 8 wiring plants, 49 of 49 ablations; rule 18 unchanged |
| `node build/p3471/corpora.mjs --self-test --parent 5f5efba2` | 0 | 95 of 95, 25.5 to 30.2 s; thirteen counts pinned |
| `node build/p3471/corpora.mjs --repin` | 0 | prints `prose-cutters: { count: 69008, sha256: 'efc2ddb8…' }`, every other pin unmoved |
| `node build/p3471/corpora.mjs --parent 5f5efba2` | 0 | 643.6 s (prose-cutters 59.9 s) and 1,348.0 s at a load average near 1,000; the table above |
| `… --plant --corpus list,prose` | 0 (caught) | 37.8 s |
| `… --plant-j9 --corpus prose-stale,prose-outside-stale` | 0 (caught) | 133.1 s; cut kinds read: top 89 and 76, at `/` 27 and 35, at `-` 35 and 52 |
| `… --plant-abs --corpus prose-margin,listing` | 0 (caught) | 41.7 s; relative cut layouts 648 and 36; printed-path wrong-file opens 57 on files `repo` and on files `twin` |
| `… --plant-j11 --corpus prose-margin,prose-cutters` | 0 (caught) | 82.8 s; prose-margin top 46, mid-name 232; prose-cutters top 584, mid-name 98 |
| `… --head <a clone holding the round before's path-spans.ts> --corpus prose-cutters,prose-margin` | 1 (as it must) | 77.3 s; `FAIL: prose-cutters 519 top cut layouts; prose-cutters 12 bottom-mid-name cut layouts` |
| the spec's census, `node <scratchpad>/p3471/abs/spec/tool/run-census.mjs --head <a copy of this tree's two provider files>` | 0 | 202 s; the table above |
| the attack lens's census, emoji census, hostile tree, hand shapes and emoji demo, its own `.mts` files copied (paths from `git ls-tree 5f5efba2`), over a staging of this round's providers and the parent's (`git show 5f5efba2`) | 0 each | 434 to 605 s, 129 to 169 s, 97 s, 29 s, 2 s; the table above |
| the 26 clone ablations | 0 | 501 s; the table above |
| a second spelling of `prose-cutters` (Python's `textwrap`, a Python first fit, the real wrap-ansi), and each breaker against them | 0 | 69,008 layouts, `efc2ddb8…`; 0 of 63,000, 0 of 31,500 and 0 of 63,000 rows differ |
| `tsc --noEmit --strict … build/p3471/compare.mts build/p3471/generate.mts` | 0 | 177 files |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 148 breaks, nothing launched |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `npm test` | 0 | 53 s; 1,136 files passed and 2 skipped; 21,308 tests passed and 14 skipped (20 more than the round before: U8's 15, U5's one and GR14's four) |
| `npm run build` | 0 | 38 s; `gate:electron` 173 against 173; `gate:background` 3 of 563, 19 of 19 fixtures; contract inventory byte for byte |
| `npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | byte for byte; classified; 173 of 173; 3 of 563 and 19 of 19 |
| `df -h /` | — | 81 GiB free |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`, then `rm -rf release` | 0 | 48 s; dmg 173,134,880 bytes, zip 172,763,924, 831 MB in `release/`, removed; electron-builder's downloads in the scratch HOME removed with it |
| `git diff --cached --stat`; `git status --short` | — | empty; the same files as the round before, no new one |

His history, `stat -f '%z %m'` before and after every command above (190 readings in
`<scratchpad>/p3471/fixabs/logs/hist.txt`): `~/.zsh_history` `737736 1792023873`, `~/.bash_history`
`23166 1790702242`, never moved.

**For the reverify.** Re-run the attack lens's own tools unchanged in their method (its census, emoji census, hostile
tree, hand shapes and emoji demo); they read 0 wrong and 0 moved here, but `two-abs-glued` (L8). Attack J11 where it
could still keep a cut: a breaker whose fragments run past the next opportunity J11 reads and that broke with room
left (L10), a row above whose emoji outnumber its non-ASCII units, and a gutter that is not one of `GUTTER`'s. And
press the controls that must still join: issue 40's rows at 45 to 49, the U7 and GR14 controls, `j11-gutter`,
`j11-name`, `j11-line` and `j11-break-short`.

## §As built, the -- refusal (the fixer, 2026-10-15)

**The verdict and the ruling.** The reverify of the absolute-only fix round found one wrong-file class and read
`needs_work` on it: Python's own `textwrap` breaks BEFORE a run of two or more hyphens (its `wordsep_re` holds
`(?<=[\w!"'&.,?])(?=-{2,}\w)`, and the run is a chunk of its own), J11 read that break as a cut at the limit and
counted the moved fragment as one cell, so a bottom row ending mid-name just before `--`, one cell short of the widest
row above, was not refused, and the chain opened a regular file named exactly the text before `--` where the parent
opened nothing: 1,320 of 346,473 hostile layouts over a tree holding `pi-sessions` beside
`pi-sessions--Users-example-rookery--/…jsonl`, `plan.md` beside `plan.md--old.md` and two more such pairs, and 2 of
2 live. His ruling: "Add the `--` fix, quick check, land". The glued residue (two absolute paths on adjoining rows,
the first exactly filling its row) stays L8. Nothing was committed, staged or stashed; no Electron was launched, no
lock slot taken, no tmux started, no model turn spent, nothing installed.

**The change, a refusal only** (`src/shared/path-spans.ts`, `movedFragmentCells`): the reverify's measured remedy,
exactly, before `return 1;`:

```ts
const run = /^-{2,}/.exec(piece.text)?.[0].length ?? 0;
if (run > 0) return tokenCells(row, piece, run);
```

A piece that starts with a run of `--` was moved there by a break before the run, so the fragment is the run's
cells, never one. It can only raise the fragment, so it only refuses. Its doc comment, the header's J11 paragraph and
the bottom half's comment in `joinedPathAt` name the break. L8 and L10 are corrected above: L8's "every other cut kind
reads 0" held only because no tree read held a `--` name, and L10 now reads the `--` break among J11's opportunities
and names Rust textwrap's `OptimalFit` as a real breaker that breaks with room left (0 wrong over the reverify's
eight-breaker census, its cuts at a `/` or after a `-` only).

**Who owns it.**

- **U9** in `src/shared/__tests__/p3471-spans-under-join.test.ts`, four cases, every row Python's own `textwrap.wrap`
  output read with `/usr/bin/python3 -I`: the pi-sessions shape at 41 (`/research/assets/63-fixtures/pi-sessions`, 40,
  below 41, above `--Users-example-rookery--/…`) and the `plan.md--old.md` shape at 23 (`s/tortie/notes/plan.md`, 22,
  below 23, above `--old.md`) join from no row; the run counted in cells (`pla.md`, 21, above `--old.md` joins
  `/Users/me/projects/tortie/notes/pla.md` from both rows, and above `---old.md` is refused); issue 40's rows still join
  at 45 to 49. With the clause taken out in a `cp -Rc` clone (`.git` removed): 3 of 87 red, the three named.
- **Rule 17** in `build/conformance-pathdoors.mjs`: six readings (`j11-dashes-pi`, `-pi-row2`, `-plan`, `-plan-row2`
  refused; `j11-dashes-room` a join, `/Users/me/projects/tortie/notes/pla.md@1.6-2.21`; `j11-dashes-run` refused) and
  three ablations, each red on what it owns: the clause out (pi, pi-row2, plan, plan-row2, run), the run counted as two
  cells whatever its length (run), and the whole token in place of the run (room, the gain kept). The one-cell
  ablation of every break opportunity now owns `j11-dashes-pi` and `j11-dashes-plan` too. 148 join readings (142
  before), 52 of 52 ablations (49). With the clause out of the shipping source in the clone the gate reads 9
  findings, exit 1: the five refused readings, the three new ablations' anchors, and the one-cell ablation leaving the
  two it now owns.
- **The instrument**: `build/p3471/generate.mts`'s `prose-cutters` now draws, after its thirty paths, every listed
  path holding `--`, the list's one: `docs/research/assets/63-fixtures/pi-sessions--Users-example-rookery--/…jsonl`,
  in its five spellings. **Its pin moved on purpose**: 69,008 layouts, sha256
  `efc2ddb8415fce23486853dd0d9187c77a0aeb486a1890dc96e279e688e75f7b`, to 72,680, sha256
  `c8b4af054a0a866863c9e624196e2046eefa72851f458c0a7ebf0ce731ab1cc7` (`PINS` and `corpora.mjs`'s `SPEC_COUNTS`),
  `--repin` twice to one sha256, and the round before's 69,008 layouts, regenerated by this file with the `--` path
  spelled out of reach, are byte for byte the new corpus's first 69,008 (sha256 `efc2ddb8…` again). No other pin
  moved. With the clause out (`--head` the clone) `measure:p3471` reads `FAIL: prose-cutters 6 bottom-mid-name cut
  layouts`, each a textwrap break before `--Users-…`; with it, 0.

**What it reads.**

| Instrument | The round before | This round |
| --- | --- | --- |
| The reverify's hostile layouts (`rvfix/dd`: Python's own `textwrap`, 346,473 layouts), its tools re-run unchanged over this tree, its parent staged by `git show 5f5efba2` | 1,320 wrong layouts, 153,985 cells | **0 wrong, 0 moved**; 49,978 right layouts, as the reverify's trial |
| Python-wrapped `--` shapes of the fixer's own (4 paths, 5 sentences, 12 prefixes, 18 to 79 columns), pure `joinedPathAt` | 176 of 1,279 join the name before `--` | **0 of 1,279** |
| `measure:p3471 --parent 5f5efba2`, thirteen corpora, 88 lines | PASS, gain 9,683,454 | **PASS**: 0 regression, 0 stale wrong-file opens on 32 lines, 0 printed-path wrong-file opens on 36 lines, the cut report met on 11 corpora (`prose-cutters` 0 `top` and 0 mid-name over 72,680); gain 9,809,302, every one of the twelve other corpora's gain and cut report the round before's to the cell, `prose-cutters` 946,791 to 1,072,639 with 3,960 layouts joining a printed path (3,770) |
| The reverify's eight-breaker census with the remedy (its measurement, not re-run) | — | 745,856 of 745,856 right layouts and 1,652,875 of 1,652,875 right join rows kept, 22 `pytw` cut rows gone, 0 wrong, 0 moved |

**Commands** (in `/private/tmp/wt-p3471`; HOME and ZDOTDIR `<scratchpad>/p3471/fixdd/home`, `HISTFILE=/dev/null`,
`TERM_SESSION_ID` unset; logs in `<scratchpad>/p3471/fixdd/logs/`; load averages 5 to 15):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 7 s; import boundaries 1,427 files, 0 violations; no runtime cycles |
| `vitest run p347-path p3471 p247-path` | 0 | 269 tests (265 before: U9's four) |
| the same file in the clone with the clause out | 1 (as it must) | 3 of 87 red, U9's three |
| `npm run conformance:pathdoors` | 0 | 35 s; rule 17 148 join and 12 provider readings, 8 of 8 wiring plants, 52 of 52 ablations; rule 18 9 of 9 |
| the same in the clone with the clause out | 1 (as it must) | 9 findings, above |
| `node build/p3471/corpora.mjs --self-test --parent 5f5efba2` | 0 | 95 of 95, 25 s; thirteen counts pinned, `prose-cutters` 72,680 |
| `node build/p3471/corpora.mjs --repin`, twice | 0, 0 | identical output; only `prose-cutters` moved |
| `node build/p3471/corpora.mjs --parent 5f5efba2 --head <clone> --corpus prose-cutters` | 1 (as it must) | 56 s; `FAIL: prose-cutters 6 bottom-mid-name cut layouts` |
| `node build/p3471/corpora.mjs --parent 5f5efba2` | 0 | 467 s; the table above |
| `tsc --noEmit --strict … --noUncheckedIndexedAccess build/p3471/compare.mts build/p3471/generate.mts` | 0 | |
| the reverify's `dd` census (its `gen.py` and `grade.mts`, its tree planted under the scratchpad and removed in a trap) | 0 | 11 s; the table above |
| `node build/p347/probe-p347.mjs --grader-self-test`; `node build/p247/path-open.mjs --self-test` | 0, 0 | PASS, 148 breaks, nothing launched; PASS |
| `npm test` | 0 | 57 s; 1,136 files passed and 2 skipped; 21,312 tests passed and 14 skipped (21,308 before) |
| `npm run build` | 0 | 39 s; `gate:electron` 173 against 173; `gate:background` 3 of 563, 19 of 19; contract inventory byte for byte |
| `npm run gate:checks`, `npm run gate:contract` | 0, 0 | 268 check scripts classified; byte for byte |

His history, `stat -f '%z %m'` before and after every command above (in `<scratchpad>/p3471/fixdd/logs/hist.txt`):
`~/.zsh_history` `737736 1792023873`, `~/.bash_history` `23166 1790702242`, never moved.

**Files this round touched**: `src/shared/path-spans.ts`, `src/shared/__tests__/p3471-spans-under-join.test.ts`,
`build/conformance-pathdoors.mjs`, `build/p3471/generate.mts`, `build/p3471/corpora.mjs`, `build/p3471/SPEC.md` and
`CLAUDE.md` (the `conformance:pathdoors` row: J11's `--` and 52 ablations; the `measure:p3471` row: the `--` path).

**For the next reader.** The `--` break was the one opportunity of Python's `textwrap` J11 did not read; the others
(after a hyphen between letters, a long word cut at its limit or after its last hyphen) were read already. What is left
is L8's glued residue and what L10 names, each counted above.

## §As built, the overflow refusal (the fixer, 2026-10-15)

**The verdict and the ruling.** The quick check of the `--` fix found one remaining major. Python's own `textwrap`
with `break_long_words=False` never cuts a chunk longer than its row: it puts the chunk on a line of its own,
overflowing it, and the terminal soft-wraps the overflow at the pane's edge. The text before `--` is such a chunk and
the run starts the next line, so the chain's bottom row is the overflow's remainder, of any length, far below the widest
row, and `bottom.end + run > widestAbove` did not refuse it: the join opened a regular file named exactly the text
before `--` (3,477 shorter-name census layouts; live, 5 of 5 presses on `X-nolong-planw-19` and `X-nolong-plan2s-50`).
His ruling: "Add that refusal, quick check, land", in the narrower form the re-checker measured. Nothing was committed,
staged or stashed; no Electron was launched, no lock slot taken, no tmux started, no model turn spent, nothing installed.

**The change, a refusal only** (`src/shared/path-spans.ts`, `joinedPathAt`, after J11's bottom half): two classes
beside `URL_START`, `ENDS_BEFORE_A_RUN = /[\p{L}\p{N}_!"'&.,?]$/u` (Python's `wordsep_re` look-behind, its `\w`
Unicode's) and `STARTS_A_RUN = /^-{2,}[\p{L}\p{N}_]/u`, and

```ts
let chainFillsAbove = false;
for (let r = top; r < bottom; r += 1) {
  if ((read(r)?.shape.end ?? 0) >= width) chainFillsAbove = true;
}
if (
  bottomRow.shape.tokens.length === 1 &&
  ENDS_BEFORE_A_RUN.test(bottomPiece?.text ?? '') &&
  STARTS_A_RUN.test(firstBelow?.text ?? '') &&
  chainFillsAbove
) {
  return null;
}
```

It returns null and nothing else, so it can only take a join away. One condition beyond the re-checker's measured form:
the bottom row holds only its piece, as J11's bottom half already asks, because a piece with a space beside it is
whole there (his measured form read the row's last character, so it also refused `…/deploy.sh --force` above
`--yes`). Every layout the shipped form refuses, the measured form refuses too (571 of its 3,838 it does not), and it
catches the same 5,856 of 5,856. The header's J11 paragraph and the clause's comment name the shape; L8, L9 and L10 are
corrected above.

**Who owns it.**

- **U9 and U10** in `src/shared/__tests__/p3471-spans-under-join.test.ts`. U9's two refused shapes cut their path AT
  the pane's width, so the overflow refusal refuses them too; its run clause now owns two of Python's own layouts a
  cell or more narrower than the pane (`textwrap.wrap(…plan.md--old.md:12…, 33)` at 34, `…report---final.txt…` at 29
  in 30), and its room control moved to one with no full row (`…/c/repo` above `---final.txt`, 25 against 29, joins),
  because the old room (21 against 23 at 23) is a hard cut AT the pane and is the overflow refusal's now. U10, seven
  cases, every line Python's own `textwrap.wrap(…, break_long_words=False)` read with `/usr/bin/python3 -I`, drawn at
  the pane's width: the planw shape at 19 and the plan2s shape at 50 join from no row; the price, `deploy.sh` above
  `--dry-run` and above `--force --yes` at 30, joins from no row, as at the parent; a name that itself holds `--`
  (`…/pi-sessions--Users-example-rookery--/…jsonl:12` at 27) joins whole from every row it covers; one control per
  conjunct (a word below, a bare `--` below, `g++` above `--std`, no full row, a bottom row holding `v2` beside its
  piece) joins; `--été.md` below is a run; issue 40 joins at 45 to 49. In a clone with the clause out: 4 of 95 red
  (planw, plan2s, the price, `--été`); with each conjunct out the cases holding its control: the piece's last
  character 1, the run below 9 (its controls and every chain below a full row that ends above anything, issue 40's
  at 45 among them), the full row 2 (U9's room too), the lone piece 1, ASCII `\w` 1.
- **Rule 17** in `build/conformance-pathdoors.mjs`: fourteen readings beside the round before's, `j11-overflow-*` (six
  refused: planw from rows 2 and 4, plan2s, the flag, `--été`, the old room; five joins: word, bare, name, plus, tokens)
  and `j11-dashes-alone`, `-alone-row2`, `-alone-run` and the new `j11-dashes-room`; six ablations, each red on what it
  owns: the clause out (the six refused), each of its four conjuncts out (plus; word, bare and name; the dashes room;
  tokens) and the run's word character read as ASCII `\w` (`--été`). The run clause's three ablations and the
  one-cell ablation re-pointed to the readings the run clause alone refuses, `j11-dashes-pi` and `-plan` now refused by
  both clauses and owned by neither, as `j11-both`. 162 join readings (148), 58 of 58 ablations (52). In a `cp -Rc`
  clone with the clause out of the shipping source (`.git` removed): 12 findings, exit 1, the six refused readings,
  the two ablations whose anchor left with the clause, and the four conjunct ablations moving nothing.
- **The instrument**: `build/p3471/generate.mts`'s `textwrapWrap` takes `breakLongWords` (false is
  `_handle_long_word`'s intact branch: the chunk alone on an empty row), `paneRows` draws a row wider than the pane as
  the terminal soft-wraps it, and `prose-cutters` appends, after every earlier layout, that breaker over the six
  sentences on the thirty paths and the listed `--` path, then on `overflowNames`' three (every 75th path of the list,
  45 characters or longer, that Python keeps as one chunk, with `--old.md` after it: the listed `--` path breaks after
  `pi-` first and never leaves the shape). The breaker answers what Python's own `textwrap.wrap(...,
  break_long_words=False, subsequent_indent=…)` answers on all 71,400 inputs the corpus hands it. **The pin moved on
  purpose**: 72,680 layouts, sha256 `c8b4af054a0a866863c9e624196e2046eefa72851f458c0a7ebf0ce731ab1cc7`, to 75,230,
  sha256 `2297b71d773d78c845bee00ae040141f8dbdce7d99084afb0064c9124b07f1f3` (`PINS` and `corpora.mjs`'s
  `SPEC_COUNTS`); generated twice to one sha256, the first 72,680 layouts still hash to `c8b4af05…`, and no other pin
  moved. With the clause out (`--head` a clone) `measure:p3471 --corpus prose-cutters` reads 250 `bottom-mid-name`
  cut layouts and 125 printed-path wrong-file opens on each `repo` line and 250 on each `twin` line, `FAIL`; with it,
  0 and 0, `PASS`.

**What it reads.**

| Instrument | The round before (the `--` fix) | This round |
| --- | --- | --- |
| The re-checker's own census (`rc/own`: its `gen.py`, its plants and `grade.mts` unchanged, Python's own `py`, `pynoh` and `pynolong`, seven TS breakers and the terminal; 1,478,812 layouts), at this HEAD | 3,814 wrong layouts: 3,477 `pynolong` shorter-name, 337 glued (L8) | **337 wrong, every one glued (L8)** (`sbin/deploy.sh--dry-run` and `--force` planted beside `deploy.sh`), 0 shorter-name, 0 moved |
| A pure pass over the same layouts, the re-checker's staged HEAD against this one | 6,167 mid-name cut layouts (5,856 `pynolong`, 311 `slash`) | **311**, the `slash` breaker's, which open nothing; 5,856 of 5,856 caught; 0 new joins on any row; 3,267 of 241,026 right layouts refused, every one `f1` or `f2` |
| The reverify's hostile layouts (`rvfix/dd`, Python's own `textwrap`, 346,473 layouts), its `run.sh` unchanged with `ATK_STAGE` this HEAD | 0 wrong, 49,978 right | **0 wrong, 0 moved, 49,978 right** |
| `measure:p3471 --parent 5f5efba2`, thirteen corpora, 88 lines | PASS, gain 9,809,302 | **PASS**: 0 regression, 0 stale wrong-file opens on 32 lines, 0 printed-path wrong-file opens on 36 lines, the cut report met on 11 corpora; every line of the twelve other corpora the round before's to the cell; `prose-cutters` 75,230 layouts, gain 10,100,236 in all |

`prose-cutters`' new layouts also draw what L8 already states: 624 cut layouts ending after a `-`, Python's
`break_on_hyphens` overflowing `…/parent-` above `record-b-first.json`, a name ending in `-` that opens a file only
where a file of exactly that name exists (0 on every `repo` and `twin` line). This round's ruling refuses the `--`
overflow alone and leaves that shape as L8 states it.

**Commands** (in `/private/tmp/wt-p3471`; HOME and ZDOTDIR `<scratchpad>/p3471/fixov/home`, `HISTFILE=/dev/null`,
`TERM_SESSION_ID` unset; logs in `<scratchpad>/p3471/fixov/logs/`; load averages 10 to 17):

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run typecheck` | 0 | 8 s; import boundaries 1,427 files, 0 violations; no runtime cycles |
| `vitest run p347-path p3471 p247-path` | 0 | 277 tests (269 before) |
| the spans file in a clone with the clause out, then with each conjunct out | 1 each (as they must) | 4 of 95 red with the clause out; each conjunct's control red with it out |
| `node build/conformance-pathdoors.mjs` | 0 | 20 s; rule 17 162 join and 12 provider readings, 8 of 8 wiring plants, 58 of 58 ablations; rule 18 9 of 9; rule 9 38 of 38 |
| the same in a `cp -Rc` clone with the clause out | 1 (as it must) | 12 findings, above |
| `node build/p3471/corpora.mjs --repin`, three times | 0 | identical output each time; only `prose-cutters` moved |
| `node build/p3471/corpora.mjs --self-test --parent 5f5efba2` | 0 | 95 of 95, 28 s; thirteen counts pinned, `prose-cutters` 75,230 |
| `node build/p3471/corpora.mjs --parent 5f5efba2` | 0 | 517 s; the table above |
| `node build/p3471/corpora.mjs --parent 5f5efba2 --head <clone> --corpus prose-cutters` | 1 (as it must) | 72 s; above |
| `tsc --noEmit --strict --target ES2023 --lib ES2023 --module ESNext --moduleResolution bundler --types node --allowImportingTsExtensions --allowJs --skipLibCheck --noUncheckedIndexedAccess build/p3471/compare.mts build/p3471/generate.mts` | 0 | |
| the reverify's `dd` census (`rvfix/dd/run.sh dd-fixov-head`, `ATK_STAGE` this HEAD) | 0 | 14 s; the table above |
| the re-checker's own census (`rc/own`'s files, run by a copy of its `run.sh` against this HEAD) and the pure pass | 1 (as it must: L8's 337 glued layouts) | 92 s; the table above |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | PASS, 148 breaks, nothing launched |
| `npm test` | 0 | 60 s; 1,136 files passed and 2 skipped; 21,320 tests passed and 14 skipped (21,312 before) |
| `npm run build` | 0 | 39 s; `gate:electron` 173 against 173; contract inventory byte for byte |
| `npm run gate:checks`, `npm run gate:contract` | 0, 0 | 268 check scripts classified; byte for byte |

His history, `stat -f '%z %m'` before and after every command above (in `<scratchpad>/p3471/fixov/logs/hist.txt`):
`~/.zsh_history` `737736 1792023873`, `~/.bash_history` `23166 1790702242`, never moved.

**Files this round touched**: `src/shared/path-spans.ts`, `src/shared/__tests__/p3471-spans-under-join.test.ts`,
`build/conformance-pathdoors.mjs`, `build/p3471/generate.mts`, `build/p3471/corpora.mjs`, `build/p3471/SPEC.md` and
`CLAUDE.md` (the `conformance:pathdoors` row: the overflow refusal and 58 ablations; the `measure:p3471` row: the
`break_long_words=False` breaker and what it reads with the refusal out).

**For the next reader.** The overflow is the one way Python's `textwrap` leaves a row whose width says nothing about
its limit; every other cut J11 reads by arithmetic. It is refused by shape, and its price is a path a soft wrap left
alone above a flag, which opens nothing at the parent either.
