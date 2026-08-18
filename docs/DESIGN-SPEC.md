# DESIGN-SPEC.md — per-screen build spec

Implement verbatim. Tokens (`--bg-canvas` etc.) come from DESIGN.md §1 and live in `src/renderer/styles/tokens.css`. Any measurement not given here resolves from DESIGN.md; any conflict: DESIGN.md wins on rules, this file wins on px. All copy strings in DESIGN.md §6 are final. UI streams code against the frozen mocks (session API, status-map store, event bus enum WORKING / NEEDS_INPUT / IDLE + `exited`).

Conventions: `[h:28]` = height 28px. Hairlines are 1px `--border`. Every interactive element gets `:focus-visible → box-shadow: var(--focus-ring)`. Hover fills use `--bg-raised` unless stated.

---

## S1 — App shell geometry

```
1440×900 default · min 960×600 · titleBarStyle hiddenInset · trafficLightPosition {12,12}

┌─ TITLEBAR [h:38] bg --bg-sidebar, hairline bottom ───────────────────────────────┐
│ ○○○ ·76px· [tab][tab][tab] [+]                 (spacer)               [🔔 3] ·12·│
├──┬──────────┬──────────────────────────────────────┬───────────────┬─────────────┤
│AB│ view     │ session tab strip (default)          │ editor tabs   │ SESSIONS    │ ← HEADER BAND
│48│ header   │ or identity strip ("right")          │               │ toolbar     │   [h:36], ONE
│  ╞══════════╪══════════════════════════════════════╪═══════════════╪═════════════╡   shared hairline
│  │ SIDEBAR  │ CENTER (terminal)                    │ EDITOR        │ SESSION LIST│
│  │ w:280    │ flex:1, min-w:640                    │ (when open)   │ ("right"    │
│  │ min:220  │ (min-w:560 when right list visible)  │ w:45% of ctr  │ orientation │
│  │ max:400  │ xterm.js  bg --bg-canvas             │ min:480       │ only) w:200 │
│  │ one view │ padding 8px 12px                     │ Monaco        │ min:160     │
│  │ SCM/Expl │                                      │ bg --bg-canvas│ max:320     │
└──┴──────────┴──────────────────────────────────────┴───────────────┴─────────────┘
```

- **HEADER BAND** (round-1): every region except the activity bar puts its header in one 36px band at `y = 38…74`: sidebar view header (S3), terminal-region header (session tab strip by default; identity strip in "right" orientation — S4), editor tabs row (S5, now 36px), and the right session list's toolbar (S4). All `[h:36]`, bg `--bg-sidebar`, and ONE shared 1px `--border` bottom hairline, pixel-continuous from the sidebar's left edge to the window's right edge — same y in every region, no offsets. Exactly one sanctioned interruption: the gap under the ACTIVE session tab, where `--bg-canvas` runs through to the terminal (standard tab affordance, S4). Vertical dividers cross the band; no other horizontal border may exist at that y. Acceptance: S12.9 screenshot-diff.
- **Activity bar**: w:48 fixed, full height below the titlebar, bg `--bg-sidebar`, 1px `--border` right hairline; never hides (spec S3). The band does not cross it.
- **Right session list** (only when orientation = "right", S4): w:200 persisted, drag 160–320 on its left divider; while visible the center's min-w drops to 560 (xterm refits).
- Region dividers: 1px `--border`. Drag handles: 5px invisible hit area centered on the divider; hover shows the divider at `--border-strong`; cursor `col-resize`. Sidebar and editor widths persist per project; right-list width and orientation persist app-wide.
- Editor closed → center takes everything. `contentWidth < 1400 (+ right-list width when visible)` → editor opens as OVERLAY instead of split: absolute, right-anchored, width `min(720px, 85% of center)`, `--z-editor-overlay`, `--shadow-3`, slides in 200ms `--ease-out`; 25% black scrim over the terminal (click scrim or Esc closes). Mode is automatic on open; a split editor converts to overlay live if the window shrinks past the threshold.
- No bottom status bar in v1.

## S2 — Titlebar & project tabs

```
 ○○○   ┌──────────────────┐ ┌────────────┐ ┌───────────┐  +            ┌─────┐
 x=12  │ ● webapp     (2) │ │ ● infra    │ │ ○ docs    │ 24px          │ 🔔 3 │
       └──────────────────┘ └────────────┘ └───────────┘               └─────┘
        selected tab                                                    right:12
```

- Tab: `[h:28]`, radius `--r-sm`, padding 0 10px, gap 6px between elements, 4px between tabs; vertically centered in the 38px bar. Entire bar is `-webkit-app-region: drag`; tabs/buttons `no-drag`.
- Anatomy: status dot 8px (roll-up: attention > working > idle across the project's sessions; attention dot pulses here too) · project name 13px/500 · attention badge (only when project NEEDS_INPUT count > 0): `[h:16]` min-w:16 pill, bg `--status-attention-badge-bg`, text 11px/600 `--status-attention-badge-fg`, tabular-nums.
- States — selected: bg `--bg-active`, text `--text-primary`; unselected: transparent, text `--text-secondary`, dot at 80% opacity; hover (unselected): `--bg-raised`; drag-reorder per the block below.
- Max tab width 200px, name truncates middle (keep suffix). ≥10 tabs: overflow into a native dropdown at the strip end (chevron button). **⌘1–⌘8 are positions and ⌘9 is the LAST tab however many are open** (Phase 12.12 item 3, the browser convention): "the ninth" left the tail of a long strip unreachable. Both directions of the rule come from one module, `src/renderer/app/project-shortcuts.ts` — what the keystroke does and what a tab claims below cannot disagree.
- **⌘-held tab numbers (Phase 12.12 item 4, the Arc gesture).** Hold ⌘ alone for 220ms and each tab reveals its digit — 1-8 by position, 9 on the last, nothing on the unreachable middle of a long strip; release and they go. No permanent numbers: the hint appears exactly when the hand is already on the key. 11px `--text-muted` (`--text-secondary` on the selected or hovered tab, where DESIGN.md §1.1 forbids muted on a raised fill), overlaid in the 16px slot the close × already reserves so **nothing reflows**, fading in `--dur-fast` (no transition under `prefers-reduced-motion`). While the numbers are up the × stands down; if the × itself holds keyboard focus the number yields instead, so a focused control is never hidden. Suppressed while a tab is being dragged. The dwell is what keeps ⌘S and ⌘C from strobing the strip, and the reveal is cleared by keyup, window blur AND visibilitychange — a window that loses focus while ⌘ is down never gets a keyup, and that is how numbers stick. Each tab's tooltip carries the same shortcut as a fallback for anyone who never holds ⌘.
- **Tab drag-reorder (round 2, user ref media_cWSQ48lD7j):** press + 4px pointer travel lifts the tab — ghost at 90% opacity, `--shadow-2`, follows the pointer on x only (y clamped to the bar). Neighbors do NOT reflow during the drag; instead a 2px `--accent` vertical insertion indicator `[h:20, r:1px]` marks the gap the tab will land in. Drop settles in 160ms `--ease-out`; Esc cancels (tab snaps home, no motion). Order is app-wide persisted state; ⌘1–⌘9, ⌃Tab cycling, and the ≥10-tab overflow menu all follow the visual order. Dragging past either end auto-scrolls the strip. `+` and 🔔 are never drop targets; a drag never leaves the titlebar row (project tabs cannot be dropped into the terminal).
- `+` button: 24×24, icon 16px `--text-secondary`; opens folder picker (⌘O). Opening an already-open project focuses its tab.
- 🔔 attention button: 28×28, right margin 12px; shows global NEEDS_INPUT count as the same amber badge; count 0 → bell at `--text-muted`, no badge. Click = ⌘J overlay. Dock badge mirrors this count via IPC.
- F2 / double-click on a tab → inline rename (S4 rename spec). Context menu (native): Rename, Close project (confirm: "Close 'webapp'? Its sessions keep running and reappear when you reopen it.").

## S3 — Activity bar & sidebar views

Sessions no longer live in the sidebar (S4). The sidebar shows ONE view at a time — Source Control (S3A) or Explorer (S3B) — selected from a VS Code-style activity bar. Active view persists per project.

### Activity bar `[w:48]`

Full height below the titlebar, bg `--bg-sidebar`, 1px `--border` right hairline. No horizontal hairline crosses it at the band's y.

- Items 48×48 hit area, codicon 24px centered: `files` (Explorer, ⌘⇧E) then `source-control` (⌃⇧G), top-aligned; `settings-gear` pinned at the bottom (opens the Settings window — S13, ⌘,).
- States: active — icon `--text-primary` + 2px `--accent` inset bar on the item's LEFT edge, full 48px item height; inactive — `--text-muted`; hover — `--text-secondary` (color change only, no fill); `:focus-visible` — `--focus-ring` inset.
- SCM badge: dirty-file count on the `source-control` item — pill `[h:16]` min-w:16, bg `--accent`, text 11px/600 `--on-accent` tabular-nums, anchored bottom-right of the icon (overlapping 2px); hidden at 0. Never amber — amber is attention-only.
- Tooltips (right side, 600ms): "Explorer ⌘⇧E" / "Source control ⌃⇧G" / "Settings ⌘," with keycap chips per DESIGN.md §3.
- Click inactive item → switch view. Click ACTIVE item → toggle sidebar collapse (= ⌘B), VS Code behavior. ⌘⇧E/⌃⇧G: show + focus the view; pressed again while focused → focus returns to the terminal.

### Sidebar view header (in the band, `[h:36]`)

Padding 0 12px, bg `--bg-sidebar`, shared band hairline below. Content per view (below). Right accessories are icon-buttons 20×20, codicon 16px, `--text-secondary`, hover `--bg-raised` r-sm.

### Sidebar section reordering (round 2, user ref media_Ncoe1XIPhD — VS Code GRAPH drag)

Applies to any view with ≥2 sections — today that is Source Control (CHANGES / HISTORY / BRANCHES); Explorer has one section, nothing to reorder yet. The draggable unit is the section: its sticky `[h:24]` header plus its whole body (the commit box travels with CHANGES).

- Hover a section header → cursor `grab`; codicon `gripper` 14 `--text-muted` appears at the far right, before the hover accessories (advertises draggability).
- Press + 4px vertical travel lifts a GHOST of the header row only (bg `--bg-raised`, 90% opacity, `--shadow-2`, full sidebar width minus 8px insets) that follows the pointer's y, clamped to the view; the sections themselves never move mid-drag (VS Code behavior per the reference).
- A 2px `--accent` drop line (inset 4px each side) marks the candidate boundary between sections — always a boundary, never inside a body. Drop reorders and settles in 160ms `--ease-out`; Esc cancels with zero motion; cursor `grabbing` throughout.
- Order persists **per view, app-wide**. Collapse state (▸/▾) is independent and keeps persisting per project. Headers stay sticky within the view's scroll regardless of order.
- Keyboard/native alternative: section header context menu (native) — "Move section up" / "Move section down".

### S3A — Source Control view

```
┌ band: [⎇ feat/auth ˅]  ↑2 ↓1                ↻ │  view header [h:36]
│ ▾ CHANGES 3                                    │  section header [h:24] (round 2)
│ [ Commit message (⌘↩ to commit)             ] │  commit box
│ [        Commit  (primary, full-w)           ] │
│ Staged (1)                                     │  group row [h:24]
│  M  auth.ts        src/routes                  │  scm row [h:24]
│ Changes (2)                                    │
│  M  db.ts          src/lib                     │
│  U  new.sql        migrations                  │
│ ▾ HISTORY                                      │  section header [h:24]
│ ●│ Feasibility doc: build inve…   [⎇ dev][+1] │  commit row [h:24]
│ ●│ Changelog.  Sean Johnson                    │
│ ○│ Merge branch 'copilot-ide'                  │  (merge = hollow dot)
│ ●│ Fix resume with Copilot IDE…                │
│   Load 50 more                                 │  [h:24] 12px --accent-text
│ ▸ BRANCHES                                  ⇣ │  section header [h:24] (round 2)
└─────────────────────────────────────────────────┘
```

Sections (round 2): three, reorderable per the S3 block above; default order CHANGES · HISTORY · BRANCHES; BRANCHES collapsed by default.

**View header (band):** branch menu button (left) · ahead/behind `↑n ↓n` mono 11px `--text-muted` tabular-nums (hidden at 0/0) · spacer · `refresh` codicon 16 (re-runs status + log). Non-git: folder name 12px `--text-muted` + the §6.3 body below.

**Branch menu button** `[h:24]`, r-sm, padding 0 6px, hover `--bg-raised`: codicon `git-branch` 14 `--text-secondary` · branch name mono 12px `--text-primary`, truncate middle, max-w 140px · codicon `chevron-down` 12 `--text-muted`. Click / ↩ → NATIVE menu:
- Local branches, current ✓-checked; selecting one runs checkout (failure — dirty tree etc. → §6.11 sticky toast, branch unchanged).
- Separator, then "Create branch…" → mini-modal (below), creates from HEAD and checks out.
- Detached HEAD state: button renders codicon `git-commit` + short SHA mono 12 in `--warning`.
- Context menu on the button (native): "Copy branch name" (toast "Branch name copied") — replaces round-0 click-to-copy (click now opens the menu).
- Round 2: last item, after a separator — "Manage branches": expands + focuses the BRANCHES section (opening the sidebar / SCM view first if needed). The menu stays the one-keystroke switcher; the section is the full UI.

**CHANGES section wrapper (round 2):** a "▾ CHANGES n" sticky header `[h:24]` (n = total files across Merge/Staged/Changes/Untracked; styled as every section header — 11px/600 uppercase `--text-muted`, count 11px `--text-muted`) now sits above the commit box; the box + file groups are its body (collapsing hides both), and the header doubles as the section's drag handle (S3 block). **Commit box, group rows and SCM file rows keep their round-0 geometry; the file rows gain round-2 multi-selection (S3D).** Commit box: textarea auto-grow 1–5 lines, 13px `--font-ui`, bg `--bg-surface`, border 1px `--border-strong`, r-sm, padding 6px 8px; [Commit] primary full-width `[h:28]` ("Committing…" + 12px spinner while running); ⌘↩ commits staged; nothing staged → "Stage all & commit". Group rows `[h:24]`: label 11px/600 `--text-secondary` + count 11px `--text-muted`; order Merge (when present), Staged, Changes, Untracked. SCM file row `[h:24]`, padding-left 20px: status letter mono 11px/600 in git color (M/A/U/D + strikethrough/R/`!` conflict) · filename 12px `--text-primary` · dir path 11px `--text-muted` truncated left; hover `--bg-raised` + stage ＋ / discard ↩ / unstage － icons 16px right; discard confirms before it runs; click → diff-vs-HEAD (S5); untracked → plain file. **Rows are multi-selectable and every verb follows the selection — see S3D.**

**Space budget (round 2, three sections):** sections stack in the user's order. A collapsed section costs its 24px header. Expanded: CHANGES caps at 45% of the view (commit box fixed at its top; file groups scroll together below it — round-0 rule preserved); the remaining height splits between the other expanded sections at HISTORY weight 2 : BRANCHES weight 1, min 120px each, each with its own scroll. Collapse states (▸/▾, sticky headers `[h:24]`) persist per project; section order per view app-wide (S3 block).

**HISTORY section** — source: ~~`git log --topo-order -n 50`~~ **(Phase 14.5)** one REF-SCOPED walk, `git log -z --topo-order --decorate=full --stdin -n 50`, its ref set chosen by the header's scope control and pinned while paging. The walk is no longer "ancestors of HEAD": with the default scope the upstream's commits are in the payload too, which is what makes a divergence renderable at all. ~~(single lane in v1; multi-lane graph explicitly deferred)~~ — multi-lane landed in Phase 14.5. "Load 50 more" row at the bottom `[h:24]`, 12px `--accent-text`, left-aligned to message x.

**Commit row `[h:24]`**, padding-right 8px:
- Rail column w:20: continuous 1px vertical rail `--border-strong` behind centered dots. Dot 8px filled `--text-muted`; HEAD commit: filled `--accent`; merge commits (2+ parents): hollow (1.5px ring `--text-muted`).
- Chevron slot w:12 after the rail: codicon `chevron-right` 12 on hover, `chevron-down` while expanded, else empty.
- Message 12px `--text-primary`, truncate · author name 11px `--text-muted` (rendered ONLY when commit author ≠ `git config user.name` — matches VS Code; truncates before the message does) · right: refs badges.
- ~~Refs badges: pill `[h:16]` r-sm padding 0 5px, gap 3px, max 2 + a `+n` overflow pill (tooltip lists all): local branch = codicon `git-branch` 10 + name mono 10; the HEAD branch pill: bg `--accent-wash`, text `--accent-text`; other pills: bg `--bg-raised`, 1px `--border-strong`, `--text-secondary`; remote branch = codicon `cloud` 10, name in tooltip only; tag = codicon `tag` 10 + name.~~ — **superseded by the Phase 14.5 block below** (research `24-git-graph-d3-visual-design.md` §4): the old rule showed the remote pill only when `ahead === 0 && behind === 0`, i.e. only when it was redundant, and hid it whenever it carried the message.
- **Refs badges (Phase 14.5).** Source is the walk's own `%D` decorations, so a pill is pinned to the commit it decorates and tags arrive for free. Pill `[h:16]` r-sm padding 0 5px, gap 3px, name mono 10 middle-truncated (`feat/…-4.37.3` — head and tail both carry meaning), max-width 96, max **3** pills + a `+n` overflow. **No fill:** `--bg-raised` measures 1.16:1 on the sidebar and 1.00:1 on a hovered row, so the four types are told apart by glyph, border style, shape and weight instead —
  - HEAD's branch: codicon `git-branch` 10, bg `--accent-wash`, text `--accent-text`, weight 500, no border;
  - local branch: `git-branch` 10, 1px **solid** `--border-strong`, `--text-secondary`;
  - remote branch: codicon `cloud` 10, 1px **dashed** `--border-strong`, the `remote/` prefix in `--text-muted` stepping to `--text-secondary` on hover/selected;
  - tag: codicon `tag` 10, radius `0 r-sm r-sm 0` (a flag);
  - detached HEAD: codicon `git-commit` 10, HEAD treatment.
  Priority under truncation: HEAD's branch → its upstream → other locals A–Z → tags newest first → other remotes A–Z. **Ranks 1 and 2 are the divergence sentence and may never fall into `+n`**; both keep a 76px floor, tags 52px, others degrade to their 20px glyph. Shrink order on a crowded row: age (hidden below a 320px pane on ref-carrying rows — it is in the card and the accessible name), then author, then message (min 48), then pill names; below a 260px pane every pill goes icon-only. The hover card gains a wrapping refs line with full names — that is where `+n` resolves.
- **Divergence shading (Phase 14.5).** A commit's dot is filled in its lane colour when it is on no remote (`--accent` on lane 0) and `--text-muted` otherwise, so an unpushed run reads as lit dots above grey ones with the upstream pill pinned at the boundary. Merge-ness stays a ring, so shape and fill compose. Incoming commits get no invented glyph — they are on a remote, so their dot is grey; their message steps to `--text-secondary` ("fetched, not yours yet"). Both states are named in the row's accessible name and in the hover card.
- **HISTORY header scope control (Phase 14.5).** One hover-revealed 18px accessory, codicon `filter` 14, native radio menu: **This branch + upstream** (default) · All local branches · Everything. Persisted per repo. Off the default the accessory stays lit `--accent-text` and the header carries the scope name in mono `--text-xs` `--text-muted` — a list containing other branches' commits must say so.
- **Last-fetch honesty (Phase 14.5).** Every ahead/behind claim is measured against a remote-tracking ref, i.e. against the last fetch. The Sync control's tooltip always names when ("… · last fetched 3 hours ago" / "nothing fetched from a remote yet"); when there is no counter AND the snapshot is over an hour old, the counter's slot carries the compact age (`⟳ 3h`) instead of implying freshness; the ⋯ menu puts the same fact in Fetch's hint column; each remote pill's tooltip carries it too. Muted throughout — a fact, never a warning.
- Hover: `--bg-raised`; after 600ms → hover card (below). Click → toggle inline expansion: the commit's files as SCM-style rows `[h:24]` indented to message x (letter badge in git color · filename 12 · dir path 11 muted); clicking a file opens a read-only Diff of `<sha>^ → <sha>` in the editor (tab tooltip "auth.ts — a1b2c3d"). ↑↓ ↩ navigate rows/expansion like every list.
- Empty repo: §6.13 line, 12px `--text-muted` at section padding.

**Commit context menu** (native, right-click — order and separators fixed):
```
Open Changes
Open on GitHub            ← only when a github.com remote exists
──────────────
Checkout (Detached)
──────────────
Create Branch…
──────────────
Create Tag…
──────────────
Cherry Pick
──────────────
Copy Commit ID
Copy Commit Message
```
Behaviors: Open Changes = expand the row + open **every** file the commit touched, each as a kept (non-preview) tab in commit order — round 2 made tabs accumulate (S5A), so "open the changes" can finally mean the whole changeset the way VS Code's multi-file diff does. A commit that changed nothing says so in a toast rather than opening an empty editor. Open on GitHub = `https://github.com/<owner>/<repo>/commit/<sha>` in the browser (parse any remote whose URL host is github.com; prefer `origin`). Checkout (Detached) = `git checkout <sha>` (failure → §6.11 toast; success → branch button enters detached state). Create Branch… = mini-modal, caption "from a1b2c3d", runs `git branch <name> <sha>` + checkout. Create Tag… = mini-modal with name + optional message → `git tag`. Cherry Pick = `git cherry-pick <sha>` (conflict → sticky toast + Merge group appears). Copy Commit ID = full SHA, toast "Commit ID copied". Copy Commit Message = full message, toast "Commit message copied".

**Mini-modal (Create branch / Create tag):** w:360, same chrome as S6 (r `--r-lg`, `--shadow-3`, scrim, 20vh); one mono-12 input (+ optional message input for tags), caption 11px `--text-muted` when created from a commit; inline 12px `--error` validation; [Cancel] [Create]; ↩ creates, Esc cancels.

**Commit hover card** — the rich card from the reference screenshot:

```
┌ w:520 · max-h:60vh · bg --bg-surface · r:--r-lg · 1px --border · --shadow-3 ┐
│ (GC) Greg Ceccarelli · 2 days ago (August 7, 2026 at 12:05 PM)              │ header
│                                                                              │
│ Research: can SpecStory ship as an agent plugin?          ← subject, 500     │ body
│ Paragraphs 13px/20 · bullets · `inline code` on --bg-raised · links          │ (scrolls)
│ ──────────────────────────────────────────────────────────────────────────── │
│ 1 file changed, 369 insertions(+), 2 deletions(-)                            │ stat
│ ──────────────────────────────────────────────────────────────────────────── │
│ ⧉ 93d9d53                                          ⚲ Open on GitHub          │ sha row
└──────────────────────────────────────────────────────────────────────────────┘
```

- Trigger: 600ms hover on a commit row; fade in `--dur-fast` (reduced-motion: instant). Anchored 8px right of the sidebar edge, top-aligned to the row; flips upward when it would clip the window bottom; never clips offscreen. `--z-tooltip`. Interactive: stays while the pointer is inside (100ms leave grace); Esc dismisses.
- Padding 16px; hairline-separated sections with 12px vertical rhythm.
- Header: avatar 20px disc — bg `--bg-raised`, 1px `--border-strong`, initials 9px/600 `--text-secondary` (no gravatar: gmux has no cloud component and never phones home) · author name 13px/600 `--text-primary` · relative age 12px `--text-secondary` · absolute date in parentheses 12px `--text-muted`, user locale ("2 days ago (August 7, 2026 at 12:05 PM)").
- Body — the FULL commit message, markdown-lite, 13px/20 `--text-primary` (body scrolls within max-h):
  - subject (first line) weight 500, its own paragraph;
  - blank lines split paragraphs (8px gap);
  - lines starting `- `, `* `, or `• ` render as a bullet list (marker `--text-muted`, indent 16px);
  - `` `backtick` `` spans → mono 12px on `--bg-raised`, r-sm, padding 1px 4px;
  - bare URLs → `--accent-text` links (open in browser); with a github remote, `#123` → issue links;
  - everything else literal — no heading/bold parsing (commit messages are not markdown).
- Stat line 12px (from `git show --shortstat`): "N files changed" `--text-secondary` + ", X insertions(+)" `--success` + ", Y deletions(-)" `--error`; zero parts omitted.
- SHA row `[h:24]`: codicon `copy` 14 + short SHA mono 12 `--text-secondary` — clicking either copies the FULL SHA (toast "Commit ID copied") · right: codicon `globe` 14 + "Open on GitHub" 12px `--accent-text` (github remote only).

**BRANCHES section (round 2)** — the full branch UI (BACKLOG Phase 10 #7); extends, never replaces, the branch menu.

```
│ ▾ BRANCHES                                  ⇣ ↻ │  section header [h:24]
│   Local (4)                                     │  group row [h:24]
│   ✓ main                          ↑2            │  current: check --accent, name 500
│   ⎇ feat/auth                    ↑1 ↓3         │
│   ⎇ fix/prompt-glyphs                          │
│   Remotes (6)                                   │
│   ☁ origin/main                                │
│   ☁ origin/feat/registry                       │
```

- **Header accessories** (hover, 20×20 icon-buttons): codicon `cloud-download` 16 = Fetch, tooltip "Fetch all remotes" — runs `git fetch --all --prune`; the icon swaps to a 12px spinner while running; on completion ahead/behind and both groups refresh; failure → §6.11 sticky toast. `refresh` re-enumerates refs without network.
- **Group rows** `[h:24]`, styled as S3A group rows: "Local (n)" / "Remotes (n)". No remotes → the Remotes group AND the fetch accessory are hidden (DESIGN.md §6.15 — not an error).
- **Branch row** `[h:24]`, padding-left 20px: codicon `git-branch` 12 `--text-secondary` (current row: `check` 12 `--accent`; remote rows: `cloud` 12) · name mono 12 `--text-primary`, truncate middle (remote rows keep the `origin/` prefix and render the whole name `--text-secondary`) · spacer · ahead/behind `↑n ↓n` mono 11 `--text-muted` tabular-nums vs upstream, local rows only, hidden at 0/0.
- **Current row**: name weight 500, `check` in `--accent`; click is inert. **Local row click (or ↩)** → `git checkout <name>`: the row's icon swaps to a 12px spinner; failure (dirty tree etc.) → §6.11 sticky toast, nothing changes. **Remote row click (or ↩)** → if a local branch with the same short name exists, checkout that; else `git checkout -b <short> --track <remote>/<short>`; same busy/failure treatment.
- After any checkout: branch button, ahead/behind, groups, and HISTORY refresh together; detached HEAD renders on the branch button (round-1 spec), never as a ✓ row.
- Hover `--bg-raised`; ↑↓ ↩ keyboard like every list. Context menus (native): local row — Checkout · Copy branch name; remote row — Checkout as local branch · Copy branch name. (Delete/rename: deliberately out of Phase 10.)

### S3C — Push / pull / remotes (round 2, BACKLOG item 3)

The 36px view header gains exactly **two** controls, because a band that grows a verb per feature stops being a band.

- **The ahead/behind readout became the button.** `[⟳ ↑2 ↓1]` — one click = Sync (pull, then push), the counter lives *inside* the control so the number you read is the thing you click, and at 0/0 it renders quiet (glyph only) rather than disappearing. Tooltip states the operation in full: "Pull 1 commit from origin/main, then push 2".
- **No upstream → `[☁︎ Publish]`**, never a dead counter. One remote publishes to it; several ask which. Publishing sets the upstream, so the control becomes Sync afterwards. No remotes at all → no control (DESIGN.md §6.15: a state, not an error). Detached HEAD → no control.
- **⋯ menu** (native, flat): Pull · Push · Sync — Fetch — Publish Branch… (only without an upstream) — then a disabled **Remotes** caption and one row per remote: `✓ origin — Copy URL` with the shortened URL in the hint column, ✓ marking the one the current branch tracks. That is item 3's "visible list of remotes" without a second panel.
- **In flight:** the running verb's glyph becomes a 12px spinner, `aria-busy`, and every other network verb disables — one network operation per repo at a time.
- **Failures are sticky toasts carrying git's own words** (auth prompt, unreachable host, rejected non-fast-forward) with the recovery named. Never a silent no-op; never a bare exit code.

### S3D — Multi-select in the Changes list (round 2, Phase 12.8 item 3)

VS Code parity, because staging four files one row at a time is the SCM view's most-repeated chore.

- **Gestures:** click selects one; **shift-click** takes the inclusive range from the anchor (the anchor stays put, so dragging the shift-click up and down re-measures rather than ratchets); **⌘-click** toggles one row and re-anchors there; **shift+↑/↓** extends; **⌘A** takes the cursor row's **group only** — Staged and Changes take opposite verbs, and one selection spanning both would offer neither well.
- **Painting:** every selected row wears `--bg-active`; the LEAD row adds a 1px inset ring (`--accent` when selected, `--border-strong` otherwise) that shows only while the list holds the keyboard. The listbox is `aria-multiselectable` and points `aria-activedescendant` at the lead row.
- **Reach:** the row's hover actions AND the native context menu apply to the whole selection **when the row is inside it**, and to that row alone when it is not (Finder's rule). Labels name the count — "Stage 4 files", "Open 4 files", "Discard changes in 4 files…" — never a bare verb over a set. Verbs are group-derived, so one mixed selection can offer Unstage (its staged rows), Stage, Mark resolved (its conflicts) and Discard (its tracked + untracked rows) side by side without either lying.
- **The discard confirm names the count**, and calls out untracked files separately because they are deleted outright, not reverted: "Discard changes in 4 files?" / "Delete 3 files?" / "…One of them is untracked and will be deleted outright, not reverted."
- **Across a refresh:** a `git:changed` that leaves the files in place keeps the selection; rows whose file left the list (staged from a terminal, committed, discarded) drop out of it, and a selection that loses everything clears rather than leaving ghosts.

### S3B — Explorer view

- View header (band): "EXPLORER" 11px/600 uppercase tracking +0.04em `--text-muted` · spacer · `collapse-all` codicon 16 · `refresh` on hover.
- **Tree row `[h:24]`** (@pierre/trees since Phase 11, indent 12px/level): chevron column 16px (folders only — files leave it empty) · **file-type icon 16px** (material-icon-theme subset injected as a shadow-DOM sprite sheet — `tree/pierre-icons.ts`; unmatched → theme default; icons keep their own colors) · name 12px · right: status letter as SCM row. File with git state: name tinted to the git color (letter badge is the redundant channel). Folder with dirty descendants: dot `--git-modified` in the right-hand git lane, same column as the letter badges and at the same full strength. Ignored: name dimmed, no badge. Click file → modified → diff, clean → plain file (S5). ~~No inline file ops in v1~~ — **superseded by S3E** (Phase 12.9): the tree creates, renames, duplicates, moves and trashes, and its native context menu carries all of it alongside Reveal in Finder / Copy path / Copy relative path. The EXPLORER band header gained a `filter` codicon beside `refresh` (S3E).
  - Rows live in @pierre/trees' shadow root, so `tree.css` cannot reach them — all row colors come from the theme bridge (`renderer/pierre/theme-bridge.ts`) via `themeToTreeStyles` + host `--trees-*` vars, and the git lane (letter, tint, folder aggregation) is the library's, not ours. Two library defaults are overridden through `unsafeCSS` (`tree/FileTree.tsx`): the deleted-file strikethrough, and the dirty-descendant dot, which ships at `opacity: .5` — a ~3.2:1 olive that would undercut the 9.1:1 badge letters it summarizes.
  - **Deviation from the round-0 spec:** folder icons are the material theme's **generic closed/open pair only**, painted into the icon lane by `unsafeCSS` (`tree/pierre-icons.ts`). @pierre/trees resolves per-path icons for the file slot alone, so the theme's 122 per-basename folder variants have no surface to attach to and stay out of the generated subset.

### S3E — File management in the explorer (round 2, Phase 12.9 items 2–4)

"No inline file ops in v1" above is superseded. The tree can now create, rename, duplicate, move and delete — assembled from @pierre/trees' own composition points, never hand-rolled, and with one rule underneath all of them: **main is the truth and the tree model is a projection.** The library mutates its store optimistically (a committed rename and a completed drop both move rows before we have asked main for anything), so every verb records the moves it is about to make, waits for the `fs:*` answer, and either rebases the fed path set or puts the rows back and says why (`tree/tree-ops.ts`).

- **The menu is the OS's.** Pierre's `composition.contextMenu` is wired through `onOpen`, not through its React `render`/`renderContextMenu` slot: that slot exists to mount a DOM surface DESIGN.md §3 forbids. The library keeps everything around the menu — right-click and the ⇧F10 / menu-key path, focusing the row first, measuring the anchor — and gmux supplies the surface, which is `Menu.popup`. `triggerMode: 'right-click'`, so no ⋯ action lane eats the 24px row's name.
- **Verbs, in order:** Open · Open in New Tab — New File… · New Folder… — Rename… (F2) · Duplicate — Move to Trash (⌫) — Reveal in Finder · Copy Path · Copy Relative Path. A FOLDER row drops the two Open rows and creates *inside* itself; the blank area below the rows is the project ROOT and offers the two create verbs plus Copy Path.
- **"Move to Trash", not "Delete".** `shell.trashItem` is the only deletion in gmux, so the label says where the file goes and the confirmation says it is reversible: *Delete "notes.md"?* / *It moves to the Trash, so you can put it back from Finder.* / **[Move to Trash]** destructive.
- **New File / New Folder are VS Code's gesture, not a modal**: the row appears first and is BORN in rename mode, seeded with `untitled` / `untitled folder` (Finder's words, uniquified against its siblings) and fully selected. Esc or an empty name takes the row back out and the disk was never touched (`removeIfCanceled`). A new FILE opens for keeps once it exists — a create that leaves you looking at the tree is half a gesture.
- **Selection follows Finder's rule**, the same one S3D states for the SCM list: the verbs apply to the whole selection when the clicked row is inside it, and to that row alone when it is not. Labels count — "Move 3 items to Trash", never a bare verb over a set. ⌫ deletes the selection from the keyboard; ⌘A, ⇧-click and ⌘-click are the library's.
- **Drag to move.** Drops land on folders, flattened folder segments, and the root. `canDrag` and `canDrop` both call the ONE shared `.git` predicate (`shared/fs-ops.ts`), so a protected path is never a source and never a destination; the library already freezes dragging while the filter is narrowing the tree. A move that would overwrite **prompts, naming every collision at once**, and a confirmed Replace still trashes the displaced entry first — an overwrite is not a destruction. The move affordance is the accent ring, not the library's default: `[data-item-drag-target]` ships with the selection background alone, which on a row that may also be selected says nothing.
  - **The root is the empty space below the rows.** Pierre only offers the project root through a top-level FILE row, which is not where anyone aims, so the viewport itself takes the same accent ring at a larger scale and performs that drop.
- **A rename carries the open editor tab.** Tab identity is path-keyed (`editor/tab-identity.ts`), so the tab's id, path, relPath and label are rewritten in place and the Monaco model and view state are rekeyed with them — the buffer, its dirty flag, its undo stack and the cursor all survive. The pre-rename path is recorded as the diff's LEFT side, because HEAD still holds the file under its old name until the change is staged. History tabs (`<sha>:<relPath>`) are never touched.
- **Every mutation reflects with no manual refresh.** The existing @parcel/watcher → `git:changed` path already repairs the tree within ~450 ms; each verb additionally re-lists only the directories it touched, so the row appears on the frame it was asked for. One `readDir` per affected directory, no locks and no full-tree rebuild — an agent writing into the same repo is never blocked and never blocks.

**The name filter (item 4) — mode and scope.**

- **Default `hide-non-matches`**, of the library's three. `expand-matches` and `collapse-non-matches` both leave non-matching siblings on screen, which turns a filter into a highlighter: you still have to read the tree to find the match. `hide-non-matches` shows matches with their ancestor folders and nothing else, which is the shape that answers "where is the file called X" in one glance. The trade it makes — losing the surrounding context — is the right one here precisely because the surrounding context is one Esc away.
- **It is a FILTER, and it says so.** The library's placeholder reads "Search…", which is the one word this field must not say: ⌘P fuzzy-open and ⌘⇧F content search are Phase 14 and live elsewhere. The placeholder is repainted through `unsafeCSS` as **"Filter files by name"** (a third documented override, alongside the strikethrough and the dirty dot), and the field is named for screen readers to match.
- **Discoverability:** typing on a focused tree opens it (the library's own gesture, and an invisible one), so the EXPLORER band header carries a `filter` codicon before `refresh` — the band's actions are always visible, and this one turns `--accent-text` while the filter is open, because a toggle that looks identical in both states is not a toggle. It is the ONE filter affordance in the app: FilesSection's own 28px header is hidden inside the sidebar (app.css), so the band owns the actions.
- **Honest limit.** The filter can only match rows the lazy listing has already produced, and the library shows the whole tree again when a query matches nothing. So a query with no matches prints one quiet line under the rows: *"No matches in the folders you have opened."* That is the scope boundary stated in the UI rather than in a doc nobody reads.

### S3F — One drag, two meanings (round 2, Phase 12.9 item 3 ↔ Phase 12.10 item 2)

A drag that STARTS in the file tree means **MOVE** when it lands on the tree and **ATTACH** when it lands on a terminal pane. The two families are mutually exclusive by construction, and the contract is written once in `renderer/terminal/drop/tree-drag.ts`.

| pointer is over | armed affordance | who owns it |
| --- | --- | --- |
| a tree row, folder, flattened segment | the row's accent ring (MOVE) | @pierre/trees, inside its shadow root |
| the empty space below the rows | the viewport's accent ring (MOVE to root) | `tree/FileTree.tsx`, on its own box |
| a session leaf `[data-split-leaf]` | the accent "Drop to attach" overlay (S4C) | the one window-level router |
| anywhere else | **nothing** — and never the "add a project" frame | — |

- **The exclusion is structural, not negotiated.** Pierre's drag handlers live on the tree's own root, so a pointer over a pane never reaches them, and its `dragleave` clears the move target on the way out. The router is the single window-level listener and refuses to arm unless `leafUnder()` finds a leaf; it calls `preventDefault()` ONLY over a leaf, so outside the two families an un-prevented dragover is Chromium's own way of saying "not a drop target", which is exactly true.
- **The cursor names the family**, natively and with no gmux chrome: 'move' over the tree, 'copy' over a pane (the file stays where it is; the pane gets a reference to it).
- **The one line that silently kills it**: the library stamps `effectAllowed = 'move'` on dragstart, and Chromium then nullifies the pane's `dropEffect = 'copy'` — the drop event never fires at all. The tree widens it to `'copyMove'` on the same bubbled dragstart where it arms the session. This is a dependency between the two halves, not an implementation detail of either.
- **Identity rides a custom MIME** (`application/x-gmux-tree-drag`) carrying no payload: `getData` is unreadable during dragover, but `types` is readable throughout, so the router can tell an internal drag from a Finder drag on every single dragover. The paths themselves ride a module singleton, because the overlay has to be able to promise "attach 3 files" while the drag is still in flight.
- **A refused drag arms neither.** `.git` and out-of-root fail `canDrag`, Pierre cancels the gesture by preventing the dragstart's default, and both halves read that as "nothing to arm".

## S4 — Terminal region & session surfaces

Sessions render on the terminal region in one of two user-selectable orientations (View menu radio "Sessions on top" / "Sessions on right"; persisted app-wide; default **top**). Same store, states, menus, and shortcuts in both. Shared behaviors (this is the canonical home of the round-0 session-row specs — project tabs' rename also points here):

- **Inline rename** (F2 / double-click on name): the name becomes an input at the same size, bg `--bg-surface`, border 1px `--accent`, select-all; ↩ commits, Esc reverts; empty name reverts; duplicate name gets a `-2` suffix silently.
- **End session** is confirm-gated everywhere (⋯ menu, context menu, tab/row ×): title "End 'claude-auth'?", body "Its process will stop and its scrollback will be discarded. This cannot be undone.", [Cancel] [End session] destructive.
- **Context menu** (native): Rename (F2), Restart, Copy directory path, End session….
- **Accessibility**: status via `aria-label="claude-auth, needs input"`; visible status text lives in tooltips (top mode) or the identity strip (right mode) per DESIGN.md §1.3.
- **Drag (round 2)**: press + 4px travel starts a drag on any single-session tab (top) or row (right). Staying inside the home strip/dock = **reorder** — same ghost/indicator/settle spec as S2's project tabs (indicator vertical between tabs, horizontal between rows); session order persists per project. Crossing into the terminal region = **drag-to-split** (S4A). Split headers have two destinations of their own (Phase 86): the strip or dock **pops the leaf out**, and another leaf of the same split **moves it** to that leaf's armed half without it leaving the group (S4A). Group tabs/rows (≥2 splits) reorder but never enter split mode. Esc cancels any drag.

### Orientation "top" (default) — session tab strip in the band

```
┌ HEADER BAND [h:36] = TAB STRIP · bg --bg-sidebar · shared hairline ────────────┐
│ ⟡ claude-auth ⎇ ● ×│⟡ codex-migrate ●│⌗ shell-1 ●│ »        (spacer)   [＋ ˅] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ xterm.js — bg --bg-canvas, padding 8px 12px, --font-terminal 13, lineHeight 1.25│
│ theme: DESIGN.md §1.6 · WebGL addon · scrollback cap 10000                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Tab** `[h:36]` (full band height), padding 0 10px, 6px gaps, 1px `--border` right separator per tab: agent icon 16 (`currentColor` logo per DESIGN.md §3; shell = codicon `terminal`) · name 13px · codicon `git-branch` 12 `--text-muted` when the session runs in a worktree (tooltip: worktree path) · status dot 8 (§1.3 vocabulary; attention pulses; saved adds codicon `history` 12 after the dot) · × codicon `close` 16 on active + hover.
- States — active: bg `--bg-canvas` (melts into the terminal below) + 2px `--accent` inset bar at the TOP, icon+name `--text-primary`; the band hairline is interrupted under the active tab (canvas runs through — VS Code tab behavior). Inactive: transparent, icon+name `--text-secondary`; hover `--bg-raised`. Needs-input: name 500 + `--text-primary` even when inactive. Exited: hollow dot, name `--text-muted`.
- Status text lives in tooltip + `aria-label` (tab = `tab` in a `tablist`); tooltip: "claude-auth — claude · needs input · 4m".
- **×** opens the End-session confirm — closing is never silent, and ⌘W never touches session tabs.
- Widths: natural up to max 200px, truncate middle; shrink evenly to min 120px; past that the strip scrolls horizontally (no visible scrollbar; trackpad / ⇧-wheel) and a **» overflow button** 24×24 pins before ＋: native menu of ALL sessions (agent icon · name · status text, ✓ on active); » carries the amber count pill when any scrolled-out session needs input.
- **＋ split button** pinned at the band's right end: ＋ 24×24 opens the ⌘T modal; ˅ 16×24 beside it opens a native quick-create menu — one row per registry agent with its icon (missing CLI → disabled, "not installed") + Shell; selecting creates `<agent>-<n>` in the repo root and focuses it (same path as §6.2 quick-create).
- Interactions: click = select (terminal swaps, no animation, terminal focused); double-click / F2 = inline rename (shared spec above); right-click = context menu (round 2 adds "Open in split" — S4A). Drag: shared spec above + S4A (round 1's deferral is closed).
- Zero sessions: strip shows only ＋˅; terminal region shows §6.2.

### Orientation "right" — identity strip + docked session list

```
┌ BAND: IDENTITY STRIP ──────────────────────────────┬ BAND: LIST TOOLBAR ───────┐
│ ⟡ claude-auth   needs input                    ⋯  │ SESSIONS 3          ＋ ˅  │
├────────────────────────────────────────────────────┼───────────────────────────┤
│ xterm.js (unchanged)                               │ ⟡ claude-auth  ⎇wt   ● × │
│                                                    │ ⟡ codex-migrate      ●   │
│                                                    │ ⌗ shell-1            ○   │
└────────────────────────────────────────────────────┴───────────────────────────┘
```

- **Right dock**: w:200 persisted (drag 160–320 on its left 1px `--border` divider), bg `--bg-sidebar`, own scroll, full height under the band.
- **List toolbar (band)** `[h:36]`, padding 0 12px: "SESSIONS" 11px/600 uppercase +0.04em `--text-muted` · count 11px `--text-muted` · spacer · the position toggle (below) · the same ＋˅ split button as top mode.
- **Row `[h:24]`**, padding 0 8px, r `--r-md` inset 4px: agent icon 16 · name 13px (needs-input 500) · `⎇wt` chip mono 10px on `--bg-raised` `[h:16]` (when in a worktree) · spacer · status dot 8 · × 16 on hover (End-session confirm). Selected: `--bg-active` + 2px `--accent` left inset. Hover: `--bg-raised`. Saved: codicon `history` 12 after the dot. Age + status text in tooltip (density mirrors VS Code's 22px terminal list, on our 4px grid). List is focusable: ↑↓ ↩, F2, context menu.
- **Identity strip (band over the terminal)** `[h:36]`, padding 0 12px — the visible status LABEL lives here in this orientation: agent icon 16 · session name 12px/500 `--text-primary` (F2 / double-click renames) · status label 11px ("working" `--text-muted` / "needs input" `--status-attention` / "idle" / "ended" / "failed (exit N)" / "saved") · spacer · ⋯ 20×20 (session menu).

### Both orientations

- **Position toggle (Phase 12.12 item 2)** — one 24×24 icon button in the SESSIONS header, immediately before the ＋˅ pair so that pair stays one object, present in BOTH orientations (`src/renderer/app/SessionsPositionButton.tsx`). It names and draws its DESTINATION, never its current state: on top → codicon `layout-sidebar-right`, "Move sessions to the right"; on right → `layout-menubar`, "Move sessions to the top". `--text-muted` at rest, `--text-primary` on hover, focus ring, real button so Enter/Space work. The ˅ menu carries the same verb as a row under a separator, from the same pure builder (`sessions-position.ts`) so the two cannot word it differently. **One store value** (`sessionOrientation`) behind this button, that menu row and the View menu's radio pair; the store's setter notifies main over `ui:sessionsPosition` so the radios follow a change the menu did not make.
- ⌥⌘↓/↑ cycles sessions regardless of focus; Enter on a row/tab focuses the terminal.
- Terminal focus signal: the band's bottom hairline under the CENTER region turns `--accent` (1px) when the terminal has focus (round-0 rule, carried to the band). With splits, the signal means "the surface's focused split has keyboard focus"; the per-split ring (S4A) says which one.
- **Restore-all bar** (DESIGN.md §3): `[h:32]`, full center width, docked directly under the band, bg `--bg-surface`, hairline bottom: "N saved sessions" 13px + [↺ Restore all] — replaces its round-0 home at the top of the removed Sessions section.
- Terminal: fit-addon on container resize (16ms debounce; refit on orientation change and dock drag). Never animate terminal content or opacity. Terminal owns keyboard when focused; ⌘-chords and F2 pass to the app.
- Banners (exited, restore-armed, agent-missing — DESIGN.md §6): `[h:36]` strip docked at the BOTTOM of the terminal region, full width, wash bg (`--warning-wash` / `--error-wash` / `--success-wash`), 13px text, inline text-buttons right, × dismiss where non-actionable. Banner never overlays scrollback (region shrinks by 36px). With splits, banners and empty states are pane-scoped: they dock at the bottom / center inside the owning split only (S4A).

### S4A — Split surfaces (round 2: drag-to-split; user ref media_UHETSdh05D)

**Model.** Every strip tab / dock row is a SURFACE: a binary split tree whose leaves are sessions. One leaf = today's full-bleed terminal, zero extra chrome. **Max 6 leaves per surface.** Each leaf stays its own tmux-backed session — create/rename/end/restore semantics untouched; the tree, ratios, order, and focused leaf are app-side presentation state persisted per project. Copy rule (DESIGN.md §7): the user-facing noun is "split" — "pane" never appears in a rendered string.

**Starting a drag** — shared S4 spec: a single-session tab/row dragged past the band into the terminal region enters split mode. Drag ghost: the tab/row at 90% opacity, `--shadow-2`, follows the pointer 1:1. Esc cancels; layouts and orders unchanged.

**Quadrant hit-testing.** For the split under the pointer, with normalized pointer position (u, v) in its box: the armed edge is `min(u, 1−u, v, 1−v)` → left / right / top / bottom (the box's diagonals cut the four zones). The corresponding HALF of that split shows the drop overlay: `--drop-wash` fill + 1px `--accent` inset border, snapped on/off with zero transition (never fade over a live terminal — DESIGN.md §5). Drop → that split divides 50/50 on the armed axis; the dragged session takes the lit half and focus; its own tab/row leaves the strip/dock (the surfaces merge into one group tab/row).

**No overlay = no drop.** Zones never arm when: the surface already holds 6 leaves; either resulting split would fall under min size (200w × 120h); the dragged tab IS the active surface's only leaf; or the dragged item is a group.

**Splits (≥2 leaves).**
- **Header** `[h:24]`, bg `--bg-sidebar`, hairline bottom, padding 0 8px: agent icon 14 · name 12px (F2 / double-click = shared inline rename) · codicon `git-branch` 12 when in a worktree · status dot 8 (full §1.3 vocabulary; saved adds `history` 12) · spacer · × 14 on hover (End-session confirm). The whole header is the drag handle (`grab`/`grabbing`); right-click = shared session context menu + "Move to its own tab". Headers exist only while the surface has ≥2 leaves.
- **Focus**: exactly one focused split per surface. Focused: header name `--text-primary` + 2px `--accent` left inset, plus a 1px `--accent` inset ring around the split's content box (static — no animation, drawn on the container, never over xterm pixels). Unfocused headers: `--text-secondary`. Click anywhere in a split focuses it.
- **Dividers**: 1px `--border`, 5px invisible hit area, hover `--border-strong`, cursor `col-resize`/`row-resize`; drag adjusts that tree node's ratio, clamped so no split goes under 200×120; double-click resets that node to 50/50. Ratios persist.
- **Keyboard**: ⌘⌥←→↑↓ move focus to the geometrically nearest split in that direction (greatest edge overlap with the focused split's projection; ties → topmost/leftmost). At the surface's edge, ⌘⌥↓/↑ fall through to next/previous surface — which is why unsplit surfaces behave exactly as round 1; ⌘⌥←/→ at an edge are no-ops. ⌥⌘-cycling, ⌘J, quick-create, and hotkey launches all target/produce surfaces.
- **Per-split states**: exited/failed banners `[h:36]` dock at the split's own bottom; Ready-to-restore renders centered in the split; xterm fit-addon refits each split on divider drag / structure change (16ms debounce).

**Pop out, and move within (Phase 86).**
- Drag a split's header onto the tab strip (top) or dock list (right): the S2-style insertion indicator appears; drop removes the leaf (its sibling absorbs the space), recreates the session as its own tab/row at that index, and focuses its terminal.
- Where the eye lands after that is the person's answer, in Settings → General under "After a session leaves a split". **Show me the session I moved** is the default and is what the app has always done. **Keep me on the split it came from** leaves the active session on a leaf that stayed, which is the group's remembered leaf when it is still there and the first remaining leaf otherwise. The header selects its leaf on the CLICK rather than on the press, so beginning a drag never moves the eye onto the leaf that is about to leave, and a right-click opens the menu without selecting.
- Drag a split's header onto ANOTHER leaf of the same split: the same quadrant hit-testing and the same `--drop-wash` overlay a create shows arm on the target's half, and the drop MOVES the leaf there without it ever leaving the group. No leaf is added, so the 6-leaf ceiling is not reached; a drop whose halves would go under 200×120 never arms; a drop back where the leaf already is writes nothing and moves nothing.
- Non-drag paths (native menus): split-header context menu — "Move to its own tab", which reads the same preference the drag does; single-session tab/row context menu — "Open in split ▸ Left / Right / Top / Bottom" (splits the active surface's focused split; disabled at 6 leaves or when the item is the active surface's only leaf).
- "Break up into tabs" pops every leaf out at once and moves focus under NEITHER answer, because there is no single session that was dragged out and no split left to keep looking at.
- A surface reduced to 1 leaf (pop-out or session end) drops its headers and reverts to a plain session tab/row.

**Group tab / row (surface with ≥2 leaves).**
- Tab (top): codicon `split-horizontal` 16 `--text-secondary` replaces the agent icon · focused leaf's name 13px · "+n" pill `[h:16]` mono 10 on `--bg-raised` (n = other leaves) · roll-up status dot 8 (attention > working > idle; pulses when any leaf needs input) · **no ×** — sessions end only from split headers, never as a group. Tooltip lists every member with its status ("claude-auth · needs input — codex-migrate · working — 3 splits"). F2 renames the focused leaf's session. Context menu (native): Rename, Break up into tabs (pops every leaf out, in layout order), End all sessions… (one confirm naming all).
- Dock row (right): same anatomy at row scale (`split-horizontal` 16 · name 13 · +n pill · dot 8, × hidden). Identity strip: `split-horizontal` 16 · focused leaf's name · focused leaf's status label; ⋯ acts on the focused leaf.
- A ⌘J jump to a session inside a group selects its surface AND focuses its split.

**Durability.** The manifest/tmux layer never learns about splits. Restore rebuilds the persisted layout; each saved leaf shows its own Ready-to-restore state in place; Restore-all counts leaves, not surfaces.

### S4B — Session context menu + capture (round 2, BACKLOG items 1 + 2)

Right-click anywhere in a session → the native `ui:popupMenu`, flat like every gmux menu:

```
New Session…            ⌘T
Split Session
────────────
Copy                    ⌘C      (needs a selection)
Copy as HTML                    (needs a selection)
Paste                   ⌘V
Select All              ⌘A
────────────
Capture Screen
Capture Selection               (needs a selection)
Capture Last 250 Lines          ┐ off in a full-screen app —
Capture Last 1,000 Lines        ┘ no history exists there
────────────
Clear                   ⌘K
```

- **gmux's nouns, not VS Code's.** "New Session… / Split Session", because PRODUCT.md's vocabulary is sessions and the app menu already ships "New Session… ⌘T"; two names for one thing would be the defect. Split inherits the agent you split from (VS Code's profile behavior).
- **⌘C is decided in the renderer, not by a menu role.** With a selection it copies; with none it sends `` — SIGINT, the thing a terminal's ⌘C must never stop being. This works because the renderer sees the keydown *before* the app menu's accelerator and `preventDefault()` suppresses it (measured; the two code comments claiming the opposite were wrong and are corrected). ⌘V is deliberately *not* intercepted so xterm's own bracketed-paste handler runs.
- **Everything unavailable is disabled with the reason, never hidden**: an ended or saved session leaves only New Session live; no selection greys Copy / Copy as HTML / Capture Selection; a full-screen app greys the two "Last N" items.
- **Capture** puts a PNG on the clipboard and raises a **sticky** success toast whose action is **Save…** — sticky because that toast is the only place Save… lives, and the bytes are cached in main so saving never re-shoots a terminal that has scrolled since. Selection highlight is cleared for a pixel capture and restored afterwards (otherwise `capturePage` composites a blue wash over the image). Clear = `term.clear()` **and** tmux `clear-history`, so "capture the last 250 lines" agrees with what the user just cleared.
- **Known fidelity deltas** (documented, not defects): scrollback captures re-render through xterm's public cell API, so Powerline/Nerd-Font private-use glyphs come out as tofu there (viewport capture is pixel-exact); curly and dotted underlines flatten to plain; the cursor, selection and link overlays are absent from HTML-path captures; captures cap at 1,000 rows. Copy as HTML uses the light rendition (black on white, ANSI colors kept) so it pastes into a document rather than a terminal.

### S4C — Drop a file onto a session (round 2, BACKLOG item 8)

- **One router owns every file drag in the window** (`terminal/drop/router.ts`), dispatching by hit-test, so the "add a project" frame and the "attach to this session" zone can never both arm. It replaced `useFolderDrop`, which read `File.path` — removed in Electron 32 — and had been silently degrading every folder drop to the picker.
- **Over a session leaf**: that leaf lights with the split drop-zone treatment and a promise that matches the outcome — "Drop to attach" for an agent that takes real attachments, "Drop to insert path" for everything else, "Session not running" when it cannot accept. Anywhere else: the §6.1 dashed whole-window frame, and a folder dropped there adds a project.
- **The mechanism is one bracket-paste of an absolute path**, which the agent's own paste parser turns into its native attachment (Claude Code's `[Image #N]`) — no clipboard write, no temp file, nothing of the user's pasteboard disturbed. Per-agent behavior is DATA in the main-process agent registry; anything unverified inserts a shell-quoted path, which every CLI can read. ⌘V of image bytes takes the same path.
- The pane focuses itself first if the drop landed on a pane that was not focused; insertion lands at the cursor because the agent's own line editor puts it there. Respects `prefers-reduced-motion`.

## S5 — Editor panel

```
┌ editor tabs [h:36] — lives in the HEADER BAND (S1) · bg --bg-sidebar ──────┐
│ auth.ts ●    db.ts ×                              [ Diff | File ]          │
├────────────────────────────────────────────────────────────────────────────┤
│ File mode: Monaco · bg --bg-canvas · font --font-editor 12 · minimap off  │
│ Diff mode: @pierre/diffs, read-only, virtualized (two columns ≥ 640px of  │
│ panel, one below) — same font ramp, colors and gutter weight              │
└────────────────────────────────────────────────────────────────────────────┘
```

- Tabs row `[h:36]` (round-0 32px is gone): in split mode its bottom hairline IS the band's shared hairline (S1); in overlay mode the row keeps the same 36px height inside the floating panel.
- Tab: padding 0 10px, filename 13px with its material-icon-theme file icon 14px before it, active tab bg `--bg-canvas` (melts into editor) with 2px `--accent` top inset; inactive `--text-secondary`. Dirty: 6px dot `--accent` replaces × until saved. Max 5 tabs, LRU-evict clean tabs; ⌘⇧]/[ cycles; ⌘W closes focused.
- Mode toggle (right, only for git-tracked modified files): segmented control `[h:22]`, 11px, options Diff/File; default Diff for modified files (P4), File otherwise. Diff title reads "auth.ts — changes vs HEAD" as the tab tooltip.
- ⌘S saves (File mode). Diff mode is read-only since Phase 11 — the toggle is the edit path; save errors → sticky toast.
- Diff mode renders through one Pierre `Virtualizer` bound to the panel's own scroll region (`editor/PierreDiff.tsx`), so a 10k-line diff materializes ~150 line elements instead of 40k and keeps ~17ms scroll steps. Gutter numbers: context `--text-disabled`, additions/deletions keep Pierre's green/red tint.
- Monaco lazy-loads on first file open; until loaded show the region bg with a 1-line 12px `--text-muted` centered "Opening editor…" (skeleton, not spinner, if longer than 300ms: 3 shimmer lines 60%/80%/40% width).
- Open behavior from SCM/tree click: split mode per S1; repeated clicks reuse the single preview tab (italic filename) until the file is edited — VS Code preview-tab behavior.

### S5A — Tabs accumulate (round 2, BACKLOG item 5)

- **Preview vs kept.** Single click = preview tab (italic, one at a time, recycled by the next single click). Double-click, ↩ on the row, the first edit, or "Keep Open" makes it permanent and the strip **accumulates**. Emitters say which through `OpenFileRequest.preview`; re-opening the same file within 500 ms also pins it, so a double-click works from an emitter that only fires clicks.
- Max **10** tabs (was 5), LRU-evicting the stalest tab that is neither dirty nor on screen. Strip scrolls horizontally; the active tab is always scrolled into view.
- Tab anatomy: material-icon-theme icon 14 · filename 13 · one 16px slot that carries **either** the 6px `--accent` dirty dot **or** the close ×, so hovering never reflows the strip. × shows on hover, and on the active tab when it is clean.
- Keys: ⌘W close · **⌘⌥← / ⌘⌥→** and ⌘⇧[ / ⌘⇧] walk the strip · **⌃Tab / ⌃⇧Tab** walk most-recently-used (only while focus is inside the panel — ⌃Tab is a real character to a terminal), committing the new order when ⌃ is released.
- Tab context menu (native, flat, `ui:popupMenu`): Close · Close Others · Close to the Right · Close Saved · Close All — Keep Open (preview tabs only) — Copy Path · Copy Relative Path · Reveal in Finder.
- Closing a dirty tab asks **Save / Don't Save / Cancel** (the only three-answer confirm in gmux; `ConfirmSpec.altLabel`). A multi-tab close prompts once per dirty tab and Cancel — or a failed write — stops the run.

### S5B — Markdown preview + minimap (round 2, BACKLOG item 6)

- `.md` tabs get a **Preview | Source | Split** radiogroup (plus a leading Diff when the file has tracked changes); the choice lives on the tab and the last one picked becomes the default for the next `.md` opened. Preview is the default for a clean `.md`; **Diff still wins** for one with changes.
- The control keeps text labels while they fit and drops to codicon glyphs below `300 + 65 × options` px of panel width. Split needs ≥ 480px of panel, the minimap ≥ 420px; below their floor both stay visible and **disabled with the reason**, never silently absent.
- Preview: rendered by react-markdown (never an HTML string), GFM tables/task lists/footnotes, fences highlighted by the **same Shiki instance and gmux-dark theme as the diff viewer**. Measure 68ch, body 13/1.65, h2 with a hairline rule. Preview imports nothing from Monaco; only Split subscribes to the unsaved buffer.
- Images resolve relative to the file through the privileged `gmux-asset:` scheme (`img-src` in the renderer CSP). **Remote `https:` images stay blocked** — a badge is the shape of a tracking pixel and gmux opens arbitrary repositories — and render as a dashed "not loaded" chip. Links: external → system browser, repo-relative → opens that file for keeps, `#anchor` → scrolls the pane.
- Minimap: ONE app-wide toggle (codicon `map`, persisted) beside the mode control. On an editing surface it is Monaco's built-in, themed by `GMUX_MONACO_THEME`'s `minimap*` entries; on Preview it is a 12px **heading ruler** — a tick per heading (10/7/4px wide, opacity 1/.7/.45 by depth) with a grabbable viewport block, re-measured on resize and on every image that decodes late. Diff mode has neither: `@pierre/diffs` ships no minimap or overview ruler, so the toggle is hidden there.
- **If Monaco is ever replaced**, only the editing surface loses its minimap: the toggle is store state, the ruler is independent, and Preview never touched Monaco. The replacement owes the edit surface a minimap; nothing else moves.

### S5C — Two kinds of diff tab, and who decides the layout (round 2 integration)

**A tab is either the working tree or a commit.** `commit === null` → LEFT is HEAD (`git:showHead`), RIGHT is the live buffer, editable, refreshed by the git watcher. `commit !== null` → both sides come from `git:commitFileDiff` (`<sha>^ → <sha>`, empty side for an add / a delete / a root commit) and the tab is **immutable**: read-only in Monaco, never saved by ⌘S, never touched by a `git:changed` refresh, never reading the worktree. Identity is `${sha}:${relPath}`, so the same file at two commits is two tabs and neither collides with the live file's tab. The strip shows the short SHA beside the filename (11px `--font-mono` `--text-muted`) — without it two tabs read as one file twice — and the tooltip is `<relPath> — <shortSha> · <subject>`.

**Renames diff against the old path.** The LEFT side of a rename lives at `origPath`, from `GitFileStatus.origPath` for the working tree and from the commit's `-M` name-status for history. Asking HEAD for the *new* path returns nothing and renders the whole file as an addition — the round-1 defect this closes. The old side is labelled with its old basename, which is the only place the rename is visible once two blobs are on screen.

**The panel owns the diff's layout.** The two-column threshold used to be 900px measured inside the diff component, which the panel could never reach: `MAX_FRACTION` capped the split at 65% of the center area, so at the 1440px default window the widest possible panel was ~754px and the two-column diff — the gesture this product is built around — was unreachable without an external monitor. (**Phase 18 deleted `MAX_FRACTION` entirely**; the ceiling is now `editorMaxWidth(workArea) = workArea − TERMINAL_FLOOR` from `chrome-geometry.ts`, which at 1440 with the default sidebar is 872px, and Fill mode reaches the whole work row. The 640px floor below is unaffected and still does the work.) Fixed three ways at once:
- **The floor is 640px of panel width, not 900.** Measured, not guessed: 12px `--font-mono` is 7.2px per character and Pierre spends ~34px a side on line numbers, so 640px leaves ~38 characters a side (754px leaves ~47). Below 640 the columns stop being readable and one column is genuinely better.
- **It is a user preference, not a hidden constant.** A `split-horizontal` icon-button sits beside the minimap toggle in diff mode, persisted app-wide, default on. Below the floor it stays visible and disabled with "drag the editor wider to use it" — the same treatment Split and the minimap already get, because a control that vanishes reads as a bug and its fix is invisible.
- **One number, one measurement.** The threshold and the control live in `EditorPanel`, which is the only thing that knows the panel's width; `PierreDiff` takes `sideBySide` as a prop. The 45% default open width is unchanged (DESIGN.md §2.2) — supervising the terminal is still the default posture; two columns are one drag away and the control says so.

### S5D — Image tabs (Phase 12.10 item 1)

Before this, an image tab said "gmux edits text files only" — the only file reader in the app was UTF-8-and-refuses-binary, so a repository's own screenshots, charts and icons were the one thing the editor could not open. Images now have their own reader and their own surface, and the two paths never meet.

**What opens.** png · jpg/jpeg · gif (animated) · webp · avif · bmp · ico · apng · svg. TIFF is deliberately absent: Chromium has no decoder, so listing it would trade an honest boundary for a broken-image icon. The list lives once, in `src/shared/image-types.ts`, and is shared by the viewer, the `fs:readImage` channel and the `gmux-asset:` protocol allowlist — "what gmux can display" and "what the scheme will serve" must be one answer.

**How the bytes arrive.** `fs:readImage` (new, append-only). The WORKING COPY comes back as a `gmux-asset:` URL and a size — a stat, not a read — so Chromium streams and caches it and a 20 MB animated GIF never becomes a base64 string in renderer memory. The HEAD side of a comparison has no file on disk, so that one really is a data URL, out of `git show HEAD:<path>` through the existing binary-safe `showAtRefBuffer`. Cap: **32 MB**, enforced before anything is decoded (it bounds Chromium's decode, which costs `w × h × 4` regardless of how well the file compressed); over it, a friendly state naming both numbers plus [Reveal in Finder].

**The viewer** (`imgv`): fit-to-panel by default and **fit never upscales** — a 16×16 favicon opens as a 16×16 favicon, not a wall. Wheel zooms, anchored under the pointer (a trackpad pinch arrives as ctrl+wheel and lands on the same path); drag pans, clamped so an image can never be flicked off the edge; ⌘+ / ⌘- walk a fixed ladder of round stops; ⌘0 refits; double-click swaps fit ↔ 100%. Past 200% a raster image renders `pixelated` — at that magnification the honest answer is its pixels. Sizing is done on the element (`width`/`height`), never `transform: scale`, so an SVG re-rasterizes crisply at every zoom. **No motion of its own** at any point: zoom and pan track the input frame by frame with no transition, and the only thing that ever animates is the image itself.

**Chrome**: a transparency checkerboard drawn from `--bg-canvas` + `--bg-raised` on the IMAGE element (so it marks the picture's own bounds and travels with pan/zoom while its squares stay 16px on screen — a bright checker would be the loudest object in a dark world, which belongs to the amber needs-input dot). Under it a 26px footer: `1920 × 1080 · 412 KB · PNG` on the left, the zoom readout and a `Fit | 1:1` pair on the right. The zoom controls live HERE, not in the tab strip's actions row, because that row holds app-wide persisted preferences (minimap, side-by-side) while zoom is ephemeral state belonging to one picture and needs its readout beside it.

**A modified image opens as a comparison**, because that is this product's editor gesture. `imgc`: LEFT is the blob at HEAD, RIGHT is the file on disk, captions "Before HEAD" / "After working tree", each with its own `dimensions · size · type`. It reuses S5C's `sideBySide` prop and its 640px floor verbatim — the same toggle the text diff uses drives it, and there is no second threshold to keep in step. An image that is new since HEAD says "Not in HEAD" rather than showing an empty pane. No zoom in the comparison: each side fits its half and the Image mode beside it is one click away with the full magnifier. **Deferred, and named as deferred:** a raster image opened from HISTORY keeps the existing "binary file — there is no text diff to show" state, because `fs:readImage` reads the working tree and HEAD only, and rendering that pair under a `<sha>` tab would show a comparison the user did not ask for.

**SVG is both.** It loads through the ORDINARY text reader, so Source mode, ⌘S and the text diff are the same code as every other file, and previews through the image viewer from a percent-encoded `data:` URL built from that text (percent-encoded, not base64: `btoa` corrupts the non-ASCII labels in a diagram). Its mode control is markdown's, unchanged — **Preview | Source | Split**, with Split's preview tracking the unsaved buffer so the picture redraws as you type. A tracked SVG with changes still opens as the TEXT diff, which is the more informative view of a changed path.

**Mode control.** A raster image with a HEAD version gets `Diff | Image`; one without gets no control at all (there is only one view). The minimap toggle is hidden on every image surface — there is nothing to summarize.

Tabs behave like any other: preview/pinned, ⌘W, LRU eviction, the strip. A watcher-driven `git:changed` re-reads the image and bumps a revision that appends `?v=n` to the asset URL — the URL is stable per path, so without it Chromium would keep serving the cached bitmap while an agent rewrites the chart underneath.

## S6 — New session modal (⌘T)

```
        ┌ modal w:480 bg --bg-surface r:--r-lg shadow:--shadow-3 ┐
        │ New session                              [h:28 title]  │  padding 20
        │                                                        │
        │ Agent                                                  │  label 11/600 muted
        │ [ ● Claude Code    ] [ Cursor          ]               │  the SHARED agent board
        │ [ Droid  not inst. ] [ DeepSeek        ]               │  (12.12) h:34 tiles
        │    Install claude:  npm install -g …   [copy]          │  (only when missing)
        │ Name                                                   │
        │ [ claude-1                                    ]        │  input h:28
        │ Directory                                              │
        │ [ ~/src/webapp                        ] [Choose…]      │  input h:28 mono 12
        │                                                        │
        │                          [ Cancel ]  [ Create  ↩ ]     │  buttons h:28
        └────────────────────────────────────────────────────────┘
```

- Centered horizontally; **top at 20vh is HEADROOM, not a fixed offset** (Phase 12.12): a shrinkable spacer above the sheet gives it 20vh whenever the window can afford it and yields the difference when it cannot, so a tall sheet slides UP rather than putting its primary button below the fold. Past that the sheet scrolls (`max-height: 100vh - 48px`) rather than clipping. Scrim `--bg-scrim`; fade+scale 0.98→1, 200ms. Esc cancels; ↩ creates from any field AND from a chosen agent tile (Phase 86). Before Phase 86, ↩ on a tile stopped at the button and created nothing, while the sheet's own comment still claimed that Enter creates from any field. Focus lands on the Name field, id `session-name`, which is why ⌘T ↩ still creates with the default agent. Reaching a tile costs one ⇧⇥. Tab order: each agent tile in board order, then Name, Directory, Choose, Options, Cancel, Create, with the capture checkbox between Options and Cancel when the sheet offers it.
- **Agent picker = the SHARED agent board** (Phase 12.12 item 1, `src/renderer/app/AgentGrid.tsx` + `agent-grid.css`) — the same component and the same tiles §6.2's fleet state shows, in `mode="select"`. There is exactly one definition of this board; a change to it lands on both surfaces by construction. Tile `[h:34]`, r-sm, padding 0 10px, gap 8 inside / 6 between: agent icon 16 (`currentColor` logo per DESIGN.md §3; Shell = codicon `terminal`) + label 13px + a right-hand status slot. **Status lives ON the tile** — "not installed", or "early" for a registry-unverified agent — never in a caption that can only describe one of them. Track floor `clamp(140px, 45%, 190px)`: 190px is what the longest "name · not installed" pair measures, so a tile can always hold both; 140px is the floor that keeps a narrow terminal region at two columns. In the 480px sheet that lands on two 217px tiles; in §6.2 on three 216px ones. Toggle semantics (Phase 86). The board is a `role="group"` of buttons carrying `aria-pressed`, not a radiogroup with a roving tabindex. Tab walks the tiles ONE AT A TIME in both modes, which is what the operator asked for, and the arrow keys still move the choice across the INSTALLED tiles for anyone who learned them. Exactly one tile is pressed; pressed tile: bg `--bg-active`, 1px `--accent` border; default selection = Settings → General "Default agent" (explicit claude out of the box — never alphabetical). **Focus and choice are the same thing on this board (Phase 86 fix round).** Landing on a tile that can run CHOOSES that agent, exactly as an arrow key does, so ⇥ moves the highlight rather than a focus ring and ↩ can only ever create the agent a person is looking at. There is one exception and it is the only one. Landing on a tile that cannot run leaves the choice where it was, because that agent cannot be started. Before this fix round the two could disagree. Measured with claude as the default agent, one ⇧⇥ from the Name field landed on the Shell tile and ↩ there created `claude-1`, and eight ⇥ landed on the Cursor tile with `aria-pressed="false"` and ↩ there created `claude-1` as well. A person acted on one tile and got another. **What this gives up, recorded rather than hidden.** A screen reader user loses the one-stop-per-group behaviour a radiogroup gives and gains one Tab stop per agent. Measured on this machine, that is 12 stops. The mitigation is the role itself: a toggle button that Tab reaches is the honest role for a control Tab walks. A tile that cannot run is marked `aria-disabled`, which describes it rather than removing it, so it is still a Tab stop. It carries no `data-enter-submits`, so ↩ on it runs the tile's own activation, which shows that agent's install caption, and creates nothing. Before Phase 86's fix round, ↩ on "Droid, not installed" closed the sheet and created a session with whichever agent was chosen: measured, 1 session became 2 and the new row was `shell-1`. A person acted on Droid and got a shell. Missing CLI → dashed recessive outline, no hover brightening (nothing happens on click). One row under the board carries the only thing the tile cannot: a copyable install command for the hovered/focused missing agent, in mono 11 + copy icon (DESIGN.md §6.5) — rendered only when some agent on this machine could fill it, and reserving its height when it is. New registry agents inherit their icon from the DESIGN.md §3 map automatically.
- Name prefills `<agent>-<n>` (next free ordinal per project). Duplicate → silent `-2` suffix on create. Directory prefills project root; [Choose…] = native dialog; non-existent path → inline error 12px `--error` "Directory not found", Create disabled.
- **Options (round 2)** — flag presets for the selected agent (registry `flagPresets`), between Directory and the buttons; the group is hidden when the agent has none (Shell always, others until Phase 10 #8 catalogs them). **The block starts COLLAPSED (Phase 86)**, so the sheet is the same height on every ⌘T whatever preset count the selected agent has. Its summary is a disclosure button, 11px/600 `--text-muted`, reading "Options, n on" beside a `chevron-right`/`chevron-down` codicon 12. The number is always drawn, including zero, so a summary reading a number means that number. It is a plain button rather than `<details>`/`<summary>`, because ↩ on a summary element would both toggle the block and reach Create. Preset row `[h:24]`: checkbox 14 · label 13px `--text-primary` · flag chip mono 10 `--text-secondary` on `--bg-raised` `[h:16]` r-sm padding 0 4px (never `--text-muted` on raised — DESIGN.md §1.1). Danger presets (`danger: true`): codicon `warning` 14 `--error` before the label; chip on `--error-wash` with `--error` text. Defaults: all unchecked, except presets enabled in Settings → Launch defaults (danger defaults pre-check too — the warning styling still renders). Checked flags append to the launch argv AND are recorded in the manifest so `resume_argv` keeps them (BACKLOG #8). Toggling here is per-session — it never writes back to Settings. **The count and the argv read the same list**, so a preset seeded ON from Settings → Launch defaults can never hide behind the collapse uncounted; when one of the flags that is on is a danger preset, the summary carries the `warning` codicon 14 `--error` and the sentence "One of the options that is on changes what the agent is allowed to do." The block is closed again on every opening and remembers nothing, deliberately: it never auto-expands for a seeded flag, because auto-expanding would put the variable height straight back. Expanding it grows the sheet; the 20vh headroom holds.
- Create → modal closes, session row appears selected, terminal focused, agent launches. Total flow: ⌘T ↩ = two keys.

### S6A — New project dialog (⇧⌘N) — Phase 12.9 item 1

```
        ┌ modal w:480 bg --bg-surface r:--r-lg shadow:--shadow-3 ┐
        │ New project                              [h:28 title]  │  padding 20
        │ NAME                                                   │  label 11/600 muted
        │ [ orbital-relay                               ]        │  input h:28
        │ CREATE IT IN                                           │
        │ [ /Users/me/src                       ] [Choose…]      │  input h:28 mono 12
        │ [x] Create a git repository                            │  preset-row, checked
        │ Creates ~/src/orbital-relay                            │  11px muted + mono path
        │                     [ Cancel ]  [ Create project  ↩ ]  │  buttons h:28
        └────────────────────────────────────────────────────────┘
```

- **The same dialog as S6, deliberately.** Scrim, 20vh anchor, field rhythm, ↩ creates from any field, Esc cancels, Tab trapped. This is the second dialog in the product; two dialogs that read as two products is how an app stops feeling native.
- **Name first, location second.** The name is the only unknown when a location can be guessed, and it can be: the dialog prefills the PARENT of the active project, because people keep their repos in one place. With no project open there is nothing to guess from, so the field stays empty, [Choose…] takes the focus, and Create stays disabled until a folder is picked. The location field is editable text as well as a picker — a path can be pasted.
- **`Create a git repository`, default ON.** A failed `git init` does NOT fail the creation: the folder exists and opens as a non-git project (§6.3 already renders that state and offers [Initialize repository] as the retry), with one sticky toast naming what went wrong. Nothing in this flow ever deletes anything.
- **The path preview is the safety line** and the one element S6 does not have: `Creates ~/src/orbital-relay`, middle-truncated in JS (a path clipped at the right hides the very thing being named), with the full path as the tooltip. Its height is reserved so the dialog does not jump the moment a name is typed.
- **Validation is one rule, shared** (`src/shared/project-create.ts`): the renderer runs it as you type so the disabled Create button can say why, and main runs it because a main process may never trust a renderer. Deliberately permissive — dotfiles, spaces, uppercase and emoji are legal folder names, and gmux has no business being stricter than the filesystem. Refused: empty, over 200 characters, `.`/`..`, anything with a slash, control characters. A name that already exists in that folder is refused by name ("'taken' already exists in that folder"), never by errno.
- **Then it hands off.** The new tab appears focused, which puts the §6.2 fleet on screen, and the dialog moves the keyboard onto its default agent tile — so nothing-to-running-agent is `⇧⌘N · name · ↩ · ↩`, and "offer to start a session immediately" is the empty state that already exists rather than a second modal.
- **Two entry points, one list** (`src/renderer/app/project-menu.ts`): the tab strip's **+** opens a native menu with `New Project… ⇧⌘N` and `Open Project… ⌘O` (Title Case, like every other native menu in the app; the empty state's BUTTONS stay sentence case per DESIGN.md §7), and the File menu carries the same pair. Without the `projects:create` bridge method both surfaces hide New Project… and + reverts to opening the picker directly — one verb is not a menu.

## S7 — Attention overlay (⌘J)

```
   ┌ panel w:560 bg --bg-surface r:--r-lg shadow:--shadow-3, top:46px centered ┐
   │ Needs your input (3)                                    [h:36 header]     │
   │ ● claude-auth   webapp    "Run npm test?"                       4m       │  row h:40
   │ ● codex-fix     webapp    "Overwrite tsconfig.json?"           12m       │
   │ ● claude-review infra     "Push to main?"                      40m       │
   │ ↩ jump to session · esc close                    [h:28 footer, 11px]     │
   └───────────────────────────────────────────────────────────────────────────┘
```

- Summoned by ⌘J or 🔔. Drops from under the titlebar (translateY -8→0 + fade, 200ms). Scrim-free (non-modal): click-away closes. `--z-attention`.
- Row `[h:40]`, padding 0 16px: pulsing attention dot 8px · agent icon 16px (`currentColor` logo, `--text-secondary`) · session name 13px/500 · project name 12px `--text-muted` · prompt excerpt mono 12px `--text-secondary` truncated (last non-empty terminal line, from the status detector) · age 11px `--text-muted` right. Sorted newest-blocked first.
- ↑↓ selects (bg `--bg-active`), ↩ or click jumps: switches project tab, selects session, focuses terminal, closes overlay (a session living inside a split group selects its surface and focuses its split — S4A). First row preselected.
- Empty state (count 0): single row 13px `--text-secondary`, copy DESIGN.md §6.9; bell opens it anyway.

## S8 — Shortcuts overlay (⌘/)

- Modal `min(600px, 100vw - 48px)`, same chrome as S6, laid out as a fixed HEADER, a scrolling BODY and a fixed FOOTER (Phase 86). Title "Keyboard shortcuts" with a count beside it. Measured on this machine it reads "61 shortcuts" unfiltered and "2 of 61 shortcuts" for the query "scroll", with `aria-live="polite"`. A search field sits under the header and takes focus on open, so the sheet is typed into rather than scrolled. Rows `[h:26]` in ONE column. Action 13px `--text-secondary` left, key chips right: mono 11px on `--bg-raised`, `[h:18]`, r-sm, padding 0 5px, 2px gaps, one chip per chord, e.g. "⌘T".
- **Why one column and not three.** `position: sticky` does nothing inside CSS multi-column fragmentation, so a sticky group title and a balanced multi-column map cannot both exist. The list passed 70 rows and stopped fitting on one screen either way. Measured at 61 rows: `scrollHeight` 1864 against `clientHeight` 619, so the old sheet overflowed by roughly three screens with no scroll affordance and no way to narrow it. The map became searchable instead. That is the trade, and it is what closed GitHub issue 7.
- **Body**: `max-height: 70vh`, `overflow-y: auto`; the body scrolls, not the sheet, so the footer is never clipped on a short window. Group titles are `position: sticky; top: 0` on `--bg-surface`, so a person 400px down always knows which group they are in.
- **Keyboard**: Up and Down move a highlight (`aria-current="true"`) over the VISIBLE rows, flat across group boundaries, and the highlighted row scrolls itself into view with `block: 'nearest'`. Escape clears a non-empty query and closes the sheet on the second press; that ladder lives in App.tsx's capture-phase Escape list, which asks `shortcutSearchTookEscape()` first. ⌘/ closes. Footer, 11px: "Up and Down move the highlight. Escape clears the search, and closes this list when the search is empty."
- **The highlighted row does NOT run its command on ↩, and the footer never mentions ↩.** Quick Open is where things are run. A cheat sheet that also executes would be a second palette with different contents and different rules, and advertising a key that does nothing is worse than a quiet key.
- **Matching is the Settings map's matcher, lifted, not a second one.** `filterForReading` and `nameOrChordMatches` moved from `src/renderer/settings/KeyboardSection.tsx` into `src/shared/keymap.ts` in Phase 86 and both surfaces call them. No new scorer was written. An empty result reads "Nothing matches “x”. Try the word you would use for the action, e.g. “scroll”.".
- **Content is DATA, not a list in this component (Phase 12.12 item 5).** Every row comes from `src/shared/keymap.ts` via `keymapSections()`, grouped under 11px/600 uppercase headers in the keymap's own six groups: Sessions · Projects · Terminal & scrolling · Editor & files · Git · Views & layout. The chips are the shared `Keycap` (`src/renderer/keys/`), so this surface, the Settings map (S13 → Keyboard) and the native menu accelerators cannot spell a chord three different ways. A row with no accelerator (End session…, Close project…) renders the token "menu" rather than an empty cell. The user's ASSIGNED per-agent hotkeys fold in as Sessions rows; unassigned ones do not — an empty recorder is a Settings affordance, not a shortcut.
- **This overlay is the fast reminder; the explanations live in Settings.** `KeymapEntry.action` is what appears here; `KeymapEntry.explain` is the plain-language sentence S13's Keyboard section has room to print.

## S9 — Empty & error states (geometry; copy from DESIGN.md §6 verbatim)

Shared pattern (S9 pattern): centered flex column in the owning region, max-width 420px, gap 8px; title 20px/600 `--text-primary`; body 13px/20 `--text-secondary` centered; actions row margin-top 16px, gap 8px; shortcut hints 11px `--text-muted` mono. No illustrations in v1 — type-only, quiet.

| State | Region | Extras |
|---|---|---|
| First run (§6.1) | full window | single primary [Open project…]; window accepts folder drop (drop target: 2px dashed `--accent` inset 12px while dragging) |
| No sessions (§6.2) | terminal region | the SHARED agent board (S6, `AgentGrid` in `mode="launch"`) — every launchable registry agent + Shell last, one click starts it; recorded hotkey / "not installed" / "early" in the tile's right slot; "or press ⌘T to name it and pick a directory" hint below |
| Non-git (§6.3) | Source Control view body | 12px body + [Initialize repository] secondary `[h:26]`, left-aligned within view padding 12px |
| No commits (§6.13) | History section body | single 12px `--text-muted` line at section padding; no button |
| tmux missing (§6.4) | full window, blocks S2 tabs too | code row: mono 12px on `--bg-surface` border 1px `--border-strong` r-sm `[h:32]` padding 0 10px + copy icon; [Check again] primary |
| Server stopped (§6.10) | every terminal region of every project | S9 pattern + [Restore sessions] primary [Not now] secondary |
| Session exited/failed (§6.6) | banner per S4 | banner + row/dot states per S3 |
| Restore-armed (§6.8) | banner per S4 + toast | ↺ chip: mono 10px "resume armed" on `--bg-raised` beside session name until resumed |

## S10 — Toasts

- Container: fixed bottom-right, 16px inset, `--z-toast`, stack gap 8px, max 3 (older collapse to a "+n" line).
- Toast: w:360, min-h:44, bg `--bg-surface`, border 1px `--border`, r:--r-md, `--shadow-2`, padding 10px 12px; icon 16px (success `--success` / error `--error` / info `--info`) + text 13px `--text-primary` (2-line max) + optional action text-button (13px `--accent-text`) + × 16px for sticky. Enter: translateY 8px + fade 160ms; auto-dismiss 5s (pause on hover); errors sticky.

## S11 — First-run happy path (must hold under 60 seconds, zero docs)

1. Launch → S9 first-run state. User hits ⌘O or drops a folder. (≤10s)
2. Tab appears + sidebar populates (git detected) → terminal region shows §6.2 with [Claude Code] [Codex] [Shell]. (≤5s)
3. One click on [Claude Code] → session `claude-1` created, selected, terminal focused, agent boots. (≤5s)
Every screen's primary action is the visually loudest element and carries its shortcut hint. No settings, no onboarding tour, no permissions detour in the happy path.

## S12 — Build acceptance checklist (every UI stream, before handoff)

1. Zero hardcoded colors/sizes/durations — tokens only (grep for `#` hexes outside tokens.css and the sanctioned theme consts: xterm, Monaco, material-icon-theme SVG palette).
2. Every interactive element: hover, `:focus-visible` ring, disabled state; every list keyboard-navigable (↑↓ ↩); full DESIGN.md §4 map wired and mirrored in the native menu.
3. All §6 states reachable and pixel-per-spec (mock the triggering conditions).
4. Text contrast ≥4.5:1 (spot-check `--text-muted` placements — never on `--bg-raised`/`--bg-active`).
5. `prefers-reduced-motion`: pulse disabled, transitions ≤ 1ms, badges intact.
6. No tmux vocabulary in any rendered string except the §6.4 screen.
7. Terminal region: no CSS transitions/opacity on the xterm container; WebGL only when visible.
8. Sentence case everywhere; button labels are verbs.
9. **Header band**: one 36px band, one hairline — screenshot-diff the hairline y across sidebar / center / editor / right list at multiple window widths; any 1px offset fails. Only sanctioned break: the gap under the active session tab.
10. **Icon discipline**: codicons only for UI chrome; agent logos only where a session/agent is identified (tabs, list rows, identity strip, ⌘T modal, quick-create menu, attention overlay); material-icon-theme only for file types (tree, editor tabs); zero Lucide remnants (`icons.tsx` round-0 strokes deleted, not orphaned).
11. **Orientations**: both reachable from the View menu, persisted across relaunch, and fully equivalent — create / select / rename / end / attention pulse / saved ↺ verified in each; xterm refits on toggle.
12. **Hover card**: appears at 600ms, interactive (copy + links reachable by pointer), flips instead of clipping at window edges, all text ≥4.5:1, Esc dismisses; reduced-motion renders it without fade.
13. **History**: context menu shows "Open on GitHub" only with a github.com remote; Copy Commit ID copies the full SHA; detached-HEAD state visible on the branch button after Checkout (Detached).
14. **Drag correctness (round 2)**: quadrant hit-testing arms the correct half in all four directions on every split; overlay = `--drop-wash` + 1px `--accent` with ZERO transition; no zone arms at 6 splits, under min split size (200×120), for group tabs, or for the active surface's only leaf; Esc cancels every drag kind (tab reorder, section drag, split drop, pop-out) with zero state change.
15. **Splits**: focus ring + header inset track the focused split; ⌘⌥ arrows navigate geometrically with the ↓/↑ edge fallthrough — verify unsplit surfaces behave key-for-key as round 1; pop-out works by drag AND by menu in BOTH orientations; layout, ratios, and focused split survive relaunch; banners and Ready-to-restore render split-scoped; no rendered string contains "pane" (extend the item-6 vocabulary grep).
16. **Order persistence**: project-tab order (app-wide), session order (per project), and sidebar section order (per view) survive relaunch; ⌘1–⌘9, ⌃Tab, and overflow menus follow visual order.
17. **Settings (S13)**: single instance via ⌘, and the activity-bar gear; every control keyboard-reachable with visible focus; the recorder rejects §4-map, cross-row, and macOS-reserved chords with the inline error; danger presets confirm on FIRST enable only; Re-scan updates paths/versions without relaunch; enabled launch defaults pre-check ⌘T Options and land in manifest argv + resume_argv.
18. **Branches**: current branch inert with ✓; local checkout and remote tracking-checkout run from click and ↩ with per-row busy spinners; fetch runs `--all --prune` with the spinner in the header; every failure → §6.11 sticky toast leaving state unchanged; "Manage branches" (branch menu) reveals + focuses the section.

## S13 — Settings window (⌘,) — round 2

**Decision: a dedicated window, not an in-app panel.** Settings outlive any one project, the main window's regions are all spoken for, and a second `BrowserWindow` costs nothing here (no terminals in it). Single instance: ⌘, or the activity-bar gear opens/focuses it; ⌘W closes it when focused (the main-window rule "⌘W never touches sessions" is unaffected). Native titled window — standard traffic lights, title "Settings" — w:760 h:560 default, min 640×480, resizable, position remembered. Same tokens, dark-only; changes apply immediately (no Save button).

```
┌ Settings ─────────────────────────────────────────────────────────────┐
│ NAV w:200                 │ CONTENT bg --bg-canvas · padding 24        │
│ bg --bg-sidebar           │ section title 20/600 · content max-w 560   │
│  ⚙ General                │ groups: bg --bg-surface · 1px --border ·   │
│  ⌂ Agents                 │ r --r-md · rows [h:36] padding 0 12px ·    │
│  ⌨ Keyboard               │ hairline-separated · group label 11/600    │
│  ⚑ Launch defaults        │ uppercase --text-muted above each card     │
└───────────────────────────┴────────────────────────────────────────────┘
```

- **Nav rail**: rows `[h:32]` padding 0 12px — codicon 16 (`settings-gear` / `hubot` / `keyboard` / `rocket`) + label 13px; active: `--bg-active` + 2px `--accent` left inset; hover `--bg-raised`; ↑↓ switches sections; 1px `--border` divider to content.
- **Row anatomy**: label 13px `--text-primary` left (optional caption 11px `--text-muted` below → row grows to 48); control right-aligned: Switch (DESIGN.md §3 component), dropdown `[h:24]` (native select styling per Inputs spec), size field `[h:24]` w:56 mono 12 with stepper arrows, or recorder chip. Every control: `:focus-visible` ring.

### General
- **Open at login** — Switch; registers the macOS login item. Caption: "gmux starts in the background so sessions are ready instantly."
- **Default agent** — dropdown of installed launchable agents + Shell; ships as Claude Code (explicit — never alphabetical; registry §1 quirk). Drives the ⌘T picker's initial selection.
- **Terminal font**. ~~size stepper~~ **The SIZE half was WITHDRAWN in Phase 12.11, not deferred again. The FAMILY half LANDED in Phase 78.** The size half is answered by per-region zoom (S14): ⌘+ / ⌘- change the terminal's font size for real and push the new geometry to tmux, and a Settings size field beside it would be a second answer to the same question fighting the first. The `--font-terminal` token ships and remains the family lever; nothing in the UI promises a control that does not exist. Phase 78 built the family picker this line sanctioned, and it sets that token. It lives in Settings, Appearance, in a Font group under Contrast, and it offers three presets. They are System, JetBrains Mono and Source Code Pro. System is the default and writes no override, so an install that never opens the section renders exactly what it rendered before. A bundled preset writes `--font-terminal` and the new `--font-editor`, which carries the same face into Monaco, the Pierre diffs and the code in the markdown preview. The sidebar and the rest of the chrome keep `--font-mono` and do not move. Zoom stays a multiplier over whatever base size the chosen face implies (DESIGN.md §10.1), and Settings still has no size field.

### Agents
- Content header row: "Last scanned 2m ago" 11px `--text-muted` + [Re-scan] secondary `[h:26]` ("Scanning…" + 12px spinner while probing `pathProbe` + `extraDirs` per the registry — same resolver as session create, single source of truth per BACKLOG Bug A).
- One row per launchable registry agent (the 10 `kind: cli` entries; IDE watchers are not listed in v1). Row `[h:48]`, two lines: agent icon 16 monochrome · name 13px/500; second line 11px — detected: path mono, truncate middle, + version chip `[h:16]` mono 10 on `--bg-raised`; missing: "Not installed" `--text-muted` + install command mono 11 + copy 14 where known. pi: registry marks launch UNVERIFIED — if detection can't confirm a runnable binary the row simply renders "Not installed".
- Chevron expands the row: **Custom command** input mono 12 (placeholder = detected path; overrides argv[0]; tokenized with quote/escape + tilde expansion; precedence per registry `sharedRules`) · "Launch defaults →" link 12px `--accent-text` (jumps to that agent's group in the Launch defaults section).
- Zero agents detected → §6.14 line + [Re-scan].

### Keyboard — Phase 12.12 item 5 (replaces "Hotkeys")
**Why it was renamed, and what that means for the nav rail.** S13 shipped "Hotkeys": two reference rows typed by hand ("New session ⌘T" · "Settings ⌘,") above the per-agent recorders. Those two rows were a second shortcut list, and a second list is how the ⇧↩ row went missing when 12.5 shipped it. The section is now **Keyboard** (codicon `keyboard`, third in the rail, between Agents and Launch defaults) and it holds NO list of its own — it renders `src/shared/keymap.ts` end to end, recorders folded into the rows they belong to. There is deliberately no fifth section: two shortcut surfaces in one window is the drift this phase exists to end.

**It is a reference people READ, so it is built as a document, not as the card-and-hairline rows the other three sections use.** Section caption, then a filter, then groups. Group heading 15px/600 with a hairline rule; rows are action 13px/500 + one plain-language sentence 12px `--text-secondary` below it, keycaps right-aligned on a stable rail. Tight inside a row (2px), loose between rows (24px): the eye takes the grouping from rhythm instead of from 55 hairlines.

- **Groups** are the keymap's six, in its order: Sessions · Projects · Terminal & scrolling · Editor & files · Git · Views & layout. The app-level chords (⌘/, ⌘,, Esc, ⌘Q) sit at the end of Views & layout rather than earning a seventh group.
- **Scope** (`KeymapScope` → `SCOPE_LABELS`) hangs on the GROUP heading when every row shares one ("in source control"), and on the row otherwise. It is not decoration: ⌃⇥ legitimately appears twice — Next project everywhere, Recent editor tabs inside the editor — and the scope is what makes the second one read as intent rather than as a bug. "Anywhere" is the default and is never printed.
- **Filter-as-you-type**, precision first: matches on action names and chords, and only falls back to searching the explanations when that finds nothing. Every per-agent row explains itself as "…in the project you are looking at", so an unranked search for "project" answered with eleven session rows before the Projects group. Esc clears; no match → a line naming the words that do work.
- **Keycaps** are the shared `Keycap` component (`src/renderer/keys/`), the same chips the ⌘/ overlay draws. Ranges collapse: ⌘1 … ⌘8, never eight chips. Deliberately unaccelerated verbs render "menu", matching S8.
- **Assignable rows stay editable in place.** One row per launchable agent, **recorder chip** (DESIGN.md §3 component): unassigned → "Record shortcut"; click → recording ("Type shortcut…", 1px `--accent` border + `--focus-ring`; Esc cancels, ⌫ clears); a valid chord commits instantly. The placeholder hint is spelled by `acceleratorToDisplay` from the registry `defaultHotkeyHint`'s letter ("e.g. ⇧⌘C"), so it cannot drift out of macOS glyph order. Nothing is pre-assigned. Built-ins are shown but not editable.
- **Conflicts are surfaced on the row, never resolved silently** (`./keyboard-conflicts.ts`): a recorded chord that a built-in already owns, that another agent row already holds, or that macOS reserves gets a 12px `--error` line under it with a codicon `warning` — "Already used by <action>". The reserved table is DERIVED from `KEYMAP` (plus the four native Edit-menu roles ⌘V/⌘X/⌘Z/⇧⌘Z), so a shortcut added to the keymap becomes un-recordable the same commit. A live recorder error takes precedence over the standing conflict note.
- No agents detected → a note under the Sessions group pointing at Agents → Re-scan, rather than a silently short list.
- Assigned chords register as accelerators on native Session-menu items ("New Claude Code session ⌘⇧C") — the menu stays the source of nativeness; pressing one creates `<agent>-<n>` in the ACTIVE project's root and focuses it (§6.2 quick-create path). Persisted app-wide.

### Launch defaults
- One group card per agent, detected agents first (icon + name as the card label; undetected collapsed at 50% opacity with "not installed"). Preset row `[h:44]`, two lines: Switch · label 13px + flag chip mono 10 on `--bg-raised` · description 12px `--text-muted` below. Danger presets (`danger: true`): codicon `warning` 14 `--error` before the label; chip on `--error-wash` with `--error` text.
- First enable of a danger preset → confirm modal (S6 chrome, w:420): title "Skip permission prompts for Codex?", body "codex --yolo lets the agent run commands without asking. Every new Codex session will start this way.", [Cancel] [Enable] destructive. Disabling never confirms; later re-enables don't re-confirm within the same install.
- Enabled defaults pre-check the matching ⌘T Options rows (S6) and apply to quick-create and hotkey launches; flags are recorded in manifest argv AND `resume_argv` so restores keep them (BACKLOG #8; per-CLI resume composition verified by the build, not this spec).

## S14 — Zoom (⌘+ / ⌘- / ⌘0 / ⌘⇧0) — Phase 12.11

Rationale and the three load-bearing decisions: DESIGN.md §10.1. This section is the build spec.

**Regions and what each one actually scales.** Five levels, each persisted independently (`gmux.zoomLevels`, localStorage — a per-window reading preference, not a synced setting):

| Region | Scaled surface | Mechanism |
|---|---|---|
| Session (`terminal`) | every attached xterm | `options.fontSize` = 13 × factor → re-fit → cols/rows to tmux |
| Explorer | `.sidebar-view[data-view=explorer] > .sidebar-rest` | CSS `zoom` |
| Source control | `.sidebar-view[data-view=scm] > .sidebar-rest` | CSS `zoom` |
| Sessions | `.session-dock .dock-list` (right orientation only) | CSS `zoom` |
| Editor | Monaco `fontSize` = 12 × factor · `.md-content` CSS `zoom` · `.ed-pierre` `--diffs-font-size` | per surface |

The three editor levers are deliberate rather than one container zoom: Monaco's cursor and selection geometry must be measured in the space it lays out in; the rendered markdown sizes its headings in px, so only a box scale keeps the type scale intact; and `.ed-pierre` is the diff virtualizer's scroll root, whose render window is computed against its own height.

**Ladder** 0.75 · 0.8 · 0.9 · 1 · 1.1 · 1.25 · 1.5 · 1.75 · 2. Chosen so no two stops collide once the terminal rounds them to a font size — a ⌘- that visibly does nothing reads as a broken key. A persisted level off the ladder snaps onto it.

**Scope.** The chord acts on the region the keyboard is in, resolved from the keydown target by `closest()` against the region roots — no second copy of focus. Focus nowhere in particular falls back to the session. Two exceptions: the image viewer (S5) keeps its own ⌘+ / ⌘- / ⌘0 magnifier, and in TOP orientation a focused session tab resolves to the session it points at, because the strip is the band and the band does not zoom.

**Readout** `[h:30]`, bottom centre, `--bg-surface` on 1px `--border`, `--r-md`, `--shadow-2`, `--text-sm`: region label `--text-secondary` + percentage `--text-primary` tabular. Fades in over `--dur-fast`, holds 1.1 s, replaces itself rather than stacking, `pointer-events: none`, its own lane so it never displaces a toast. At the ends of the ladder it appends "smallest" / "largest" in `--text-xs` `--text-muted` — that is the whole limit affordance; there is no toast. ⌘⇧0 reads "Zoom reset" with no percentage.

**What zoom must not break** (measured in the build, `src/renderer/zoom/shot-probe.ts` — run it again before touching any of this):

- tmux geometry follows: 13px → 19.5px took a pane from 118×42 to 77×27 and tmux reported the same 27 rows.
- 12.3's scrollbar re-measures instead of drifting: the pane's `refresh()` runs on the same tick as the font change.
- A scrolled pane keeps its place. tmux moves the copy-mode view with the reflow — measured A/B, a reader 40 lines back landed at 30 — so `ScrollSurface.holdPositionAcrossResize` re-asserts the position once the resize lands (drift 10 lines → 0).
- The resize is not activity. A repaint fakes both weak signals of Phase 13's inferred tier at once, so `activity.noteGeometryChange` discounts output and the screen hash for 2.5 s while leaving CPU, tool children and the dialog detector live.
- Pointer mapping survives CSS `zoom`: verified at 150 % and 75 % by hit-testing a rect's own centre back to itself — dock row, strip tab, split leaf, scrollbar track, and the sidebar's zoomed content all resolve correctly. A drag ghost lifted out of a zoomed region carries that region's `currentCSSZoom` so it is neither the wrong size nor twice as fast as the pointer.
