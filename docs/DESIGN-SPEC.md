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
- States — selected: bg `--bg-active`, text `--text-primary`; unselected: transparent, text `--text-secondary`, dot at 80% opacity; hover (unselected): `--bg-raised`; drag-reorder allowed (HTML5 DnD, 160ms settle).
- Max tab width 200px, name truncates middle (keep suffix). ≥10 tabs: overflow into a native dropdown at the strip end (chevron button); ⌘1–9 map to the first nine.
- `+` button: 24×24, icon 16px `--text-secondary`; opens folder picker (⌘O). Opening an already-open project focuses its tab.
- 🔔 attention button: 28×28, right margin 12px; shows global NEEDS_INPUT count as the same amber badge; count 0 → bell at `--text-muted`, no badge. Click = ⌘J overlay. Dock badge mirrors this count via IPC.
- F2 / double-click on a tab → inline rename (S4 rename spec). Context menu (native): Rename, Close project (confirm: "Close 'webapp'? Its sessions keep running and reappear when you reopen it.").

## S3 — Activity bar & sidebar views

Sessions no longer live in the sidebar (S4). The sidebar shows ONE view at a time — Source Control (S3A) or Explorer (S3B) — selected from a VS Code-style activity bar. Active view persists per project.

### Activity bar `[w:48]`

Full height below the titlebar, bg `--bg-sidebar`, 1px `--border` right hairline. No horizontal hairline crosses it at the band's y.

- Items 48×48 hit area, codicon 24px centered: `files` (Explorer, ⌘⇧E) then `source-control` (⌃⇧G), top-aligned; `settings-gear` pinned at the bottom (opens Settings, ⌘,).
- States: active — icon `--text-primary` + 2px `--accent` inset bar on the item's LEFT edge, full 48px item height; inactive — `--text-muted`; hover — `--text-secondary` (color change only, no fill); `:focus-visible` — `--focus-ring` inset.
- SCM badge: dirty-file count on the `source-control` item — pill `[h:16]` min-w:16, bg `--accent`, text 11px/600 `--on-accent` tabular-nums, anchored bottom-right of the icon (overlapping 2px); hidden at 0. Never amber — amber is attention-only.
- Tooltips (right side, 600ms): "Explorer ⌘⇧E" / "Source control ⌃⇧G" / "Settings ⌘," with keycap chips per DESIGN.md §3.
- Click inactive item → switch view. Click ACTIVE item → toggle sidebar collapse (= ⌘B), VS Code behavior. ⌘⇧E/⌃⇧G: show + focus the view; pressed again while focused → focus returns to the terminal.

### Sidebar view header (in the band, `[h:36]`)

Padding 0 12px, bg `--bg-sidebar`, shared band hairline below. Content per view (below). Right accessories are icon-buttons 20×20, codicon 16px, `--text-secondary`, hover `--bg-raised` r-sm.

### S3A — Source Control view

```
┌ band: [⎇ feat/auth ˅]  ↑2 ↓1                ↻ │  view header [h:36]
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
└─────────────────────────────────────────────────┘
```

**View header (band):** branch menu button (left) · ahead/behind `↑n ↓n` mono 11px `--text-muted` tabular-nums (hidden at 0/0) · spacer · `refresh` codicon 16 (re-runs status + log). Non-git: folder name 12px `--text-muted` + the §6.3 body below.

**Branch menu button** `[h:24]`, r-sm, padding 0 6px, hover `--bg-raised`: codicon `git-branch` 14 `--text-secondary` · branch name mono 12px `--text-primary`, truncate middle, max-w 140px · codicon `chevron-down` 12 `--text-muted`. Click / ↩ → NATIVE menu:
- Local branches, current ✓-checked; selecting one runs checkout (failure — dirty tree etc. → §6.11 sticky toast, branch unchanged).
- Separator, then "Create branch…" → mini-modal (below), creates from HEAD and checks out.
- Detached HEAD state: button renders codicon `git-commit` + short SHA mono 12 in `--warning`.
- Context menu on the button (native): "Copy branch name" (toast "Branch name copied") — replaces round-0 click-to-copy (click now opens the menu).

**Commit box, group rows, SCM file rows: unchanged from round 0.** Commit box: textarea auto-grow 1–5 lines, 13px `--font-ui`, bg `--bg-surface`, border 1px `--border-strong`, r-sm, padding 6px 8px; [Commit] primary full-width `[h:28]` ("Committing…" + 12px spinner while running); ⌘↩ commits staged; nothing staged → "Stage all & commit". Group rows `[h:24]`: label 11px/600 `--text-secondary` + count 11px `--text-muted`; order Merge (when present), Staged, Changes, Untracked. SCM file row `[h:24]`, padding-left 20px: status letter mono 11px/600 in git color (M/A/U/D + strikethrough/R/`!` conflict) · filename 12px `--text-primary` · dir path 11px `--text-muted` truncated left; hover `--bg-raised` + stage ＋ / discard ↩ / unstage － icons 16px right; discard confirms per file; click → diff-vs-HEAD (S5); untracked → plain file.

**Space budget:** commit box fixed at top; file groups scroll together, max-height 45% of the view; HISTORY fills the remainder (min 160px), own scroll; both section states (▸/▾, sticky headers `[h:24]`) persist per project.

**HISTORY section** — source: `git log --topo-order -n 50` (single lane in v1; multi-lane graph explicitly deferred); "Load 50 more" row at the bottom `[h:24]`, 12px `--accent-text`, left-aligned to message x.

**Commit row `[h:24]`**, padding-right 8px:
- Rail column w:20: continuous 1px vertical rail `--border-strong` behind centered dots. Dot 8px filled `--text-muted`; HEAD commit: filled `--accent`; merge commits (2+ parents): hollow (1.5px ring `--text-muted`).
- Chevron slot w:12 after the rail: codicon `chevron-right` 12 on hover, `chevron-down` while expanded, else empty.
- Message 12px `--text-primary`, truncate · author name 11px `--text-muted` (rendered ONLY when commit author ≠ `git config user.name` — matches VS Code; truncates before the message does) · right: refs badges.
- Refs badges: pill `[h:16]` r-sm padding 0 5px, gap 3px, max 2 + a `+n` overflow pill (tooltip lists all): local branch = codicon `git-branch` 10 + name mono 10; the HEAD branch pill: bg `--accent-wash`, text `--accent-text`; other pills: bg `--bg-raised`, 1px `--border-strong`, `--text-secondary`; remote branch = codicon `cloud` 10, name in tooltip only; tag = codicon `tag` 10 + name.
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
Behaviors: Open Changes = expand the row + open the first file's diff. Open on GitHub = `https://github.com/<owner>/<repo>/commit/<sha>` in the browser (parse any remote whose URL host is github.com; prefer `origin`). Checkout (Detached) = `git checkout <sha>` (failure → §6.11 toast; success → branch button enters detached state). Create Branch… = mini-modal, caption "from a1b2c3d", runs `git branch <name> <sha>` + checkout. Create Tag… = mini-modal with name + optional message → `git tag`. Cherry Pick = `git cherry-pick <sha>` (conflict → sticky toast + Merge group appears). Copy Commit ID = full SHA, toast "Commit ID copied". Copy Commit Message = full message, toast "Commit message copied".

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

### S3B — Explorer view

- View header (band): "EXPLORER" 11px/600 uppercase tracking +0.04em `--text-muted` · spacer · `collapse-all` codicon 16 · `refresh` on hover.
- **Tree row `[h:24]`** (react-arborist, indent 12px/level): chevron 12px (folders) · **file-type icon 16px** (material-icon-theme via `fileIcon.ts` — DESIGN.md §3.1; folders get closed/open variants; unmatched → theme default; icons keep their own colors) · name 12px · right: status letter as SCM row. File with git state: name tinted to the git color (letter badge is the redundant channel). Folder with dirty descendants: 4px dot `--git-modified` after the name. Ignored: name `--text-disabled`, no badge, icon at 50% opacity. Click file → modified → diff, clean → plain file (S5). No inline file ops in v1 (context menu: Reveal in Finder, Copy path).

## S4 — Terminal region & session surfaces

Sessions render on the terminal region in one of two user-selectable orientations (View menu radio "Sessions on top" / "Sessions on right"; persisted app-wide; default **top**). Same store, states, menus, and shortcuts in both. Shared behaviors (this is the canonical home of the round-0 session-row specs — project tabs' rename also points here):

- **Inline rename** (F2 / double-click on name): the name becomes an input at the same size, bg `--bg-surface`, border 1px `--accent`, select-all; ↩ commits, Esc reverts; empty name reverts; duplicate name gets a `-2` suffix silently.
- **End session** is confirm-gated everywhere (⋯ menu, context menu, tab/row ×): title "End 'claude-auth'?", body "Its process will stop and its scrollback will be discarded. This cannot be undone.", [Cancel] [End session] destructive.
- **Context menu** (native): Rename (F2), Restart, Copy directory path, End session….
- **Accessibility**: status via `aria-label="claude-auth, needs input"`; visible status text lives in tooltips (top mode) or the identity strip (right mode) per DESIGN.md §1.3.

### Orientation "top" (default) — session tab strip in the band

```
┌ HEADER BAND [h:36] = TAB STRIP · bg --bg-sidebar · shared hairline ────────────┐
│ ⟡ claude-auth ⎇ ● ×│⟡ codex-migrate ●│⌗ shell-1 ●│ »        (spacer)   [＋ ˅] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ xterm.js — bg --bg-canvas, padding 8px 12px, SF Mono 13, lineHeight 1.25       │
│ theme: DESIGN.md §1.6 · WebGL addon · scrollback cap 10000                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Tab** `[h:36]` (full band height), padding 0 10px, 6px gaps, 1px `--border` right separator per tab: agent icon 16 (`currentColor` logo per DESIGN.md §3; shell = codicon `terminal`) · name 13px · codicon `git-branch` 12 `--text-muted` when the session runs in a worktree (tooltip: worktree path) · status dot 8 (§1.3 vocabulary; attention pulses; saved adds codicon `history` 12 after the dot) · × codicon `close` 16 on active + hover.
- States — active: bg `--bg-canvas` (melts into the terminal below) + 2px `--accent` inset bar at the TOP, icon+name `--text-primary`; the band hairline is interrupted under the active tab (canvas runs through — VS Code tab behavior). Inactive: transparent, icon+name `--text-secondary`; hover `--bg-raised`. Needs-input: name 500 + `--text-primary` even when inactive. Exited: hollow dot, name `--text-muted`.
- Status text lives in tooltip + `aria-label` (tab = `tab` in a `tablist`); tooltip: "claude-auth — claude · needs input · 4m".
- **×** opens the End-session confirm — closing is never silent, and ⌘W never touches session tabs.
- Widths: natural up to max 200px, truncate middle; shrink evenly to min 120px; past that the strip scrolls horizontally (no visible scrollbar; trackpad / ⇧-wheel) and a **» overflow button** 24×24 pins before ＋: native menu of ALL sessions (agent icon · name · status text, ✓ on active); » carries the amber count pill when any scrolled-out session needs input.
- **＋ split button** pinned at the band's right end: ＋ 24×24 opens the ⌘T modal; ˅ 16×24 beside it opens a native quick-create menu — one row per registry agent with its icon (missing CLI → disabled, "not installed") + Shell; selecting creates `<agent>-<n>` in the repo root and focuses it (same path as §6.2 quick-create).
- Interactions: click = select (terminal swaps, no animation, terminal focused); double-click / F2 = inline rename (shared spec above); right-click = context menu. **Drag-reorder: deferred — explicitly out of round 1.**
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
- **List toolbar (band)** `[h:36]`, padding 0 12px: "SESSIONS" 11px/600 uppercase +0.04em `--text-muted` · count 11px `--text-muted` · spacer · the same ＋˅ split button as top mode.
- **Row `[h:24]`**, padding 0 8px, r `--r-md` inset 4px: agent icon 16 · name 13px (needs-input 500) · `⎇wt` chip mono 10px on `--bg-raised` `[h:16]` (when in a worktree) · spacer · status dot 8 · × 16 on hover (End-session confirm). Selected: `--bg-active` + 2px `--accent` left inset. Hover: `--bg-raised`. Saved: codicon `history` 12 after the dot. Age + status text in tooltip (density mirrors VS Code's 22px terminal list, on our 4px grid). List is focusable: ↑↓ ↩, F2, context menu.
- **Identity strip (band over the terminal)** `[h:36]`, padding 0 12px — the visible status LABEL lives here in this orientation: agent icon 16 · session name 12px/500 `--text-primary` (F2 / double-click renames) · status label 11px ("working" `--text-muted` / "needs input" `--status-attention` / "idle" / "ended" / "failed (exit N)" / "saved") · spacer · ⋯ 20×20 (session menu).

### Both orientations

- ⌥⌘↓/↑ cycles sessions regardless of focus; Enter on a row/tab focuses the terminal.
- Terminal focus signal: the band's bottom hairline under the CENTER region turns `--accent` (1px) when the terminal has focus (round-0 rule, carried to the band).
- **Restore-all bar** (DESIGN.md §3): `[h:32]`, full center width, docked directly under the band, bg `--bg-surface`, hairline bottom: "N saved sessions" 13px + [↺ Restore all] — replaces its round-0 home at the top of the removed Sessions section.
- Terminal: fit-addon on container resize (16ms debounce; refit on orientation change and dock drag). Never animate terminal content or opacity. Terminal owns keyboard when focused; ⌘-chords and F2 pass to the app.
- Banners (exited, restore-armed, agent-missing — DESIGN.md §6): `[h:36]` strip docked at the BOTTOM of the terminal region, full width, wash bg (`--warning-wash` / `--error-wash` / `--success-wash`), 13px text, inline text-buttons right, × dismiss where non-actionable. Banner never overlays scrollback (region shrinks by 36px).

## S5 — Editor panel

```
┌ editor tabs [h:36] — lives in the HEADER BAND (S1) · bg --bg-sidebar ──────┐
│ auth.ts ●    db.ts ×                              [ Diff | File ]          │
├────────────────────────────────────────────────────────────────────────────┤
│ Monaco · bg --bg-canvas · font SF Mono 12 · minimap off · Monaco built-in │
│ diff renderer (side-by-side ≥ 900px wide, inline below)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

- Tabs row `[h:36]` (round-0 32px is gone): in split mode its bottom hairline IS the band's shared hairline (S1); in overlay mode the row keeps the same 36px height inside the floating panel.
- Tab: padding 0 10px, filename 13px with its material-icon-theme file icon 14px before it, active tab bg `--bg-canvas` (melts into editor) with 2px `--accent` top inset; inactive `--text-secondary`. Dirty: 6px dot `--accent` replaces × until saved. Max 5 tabs, LRU-evict clean tabs; ⌘⇧]/[ cycles; ⌘W closes focused.
- Mode toggle (right, only for git-tracked modified files): segmented control `[h:22]`, 11px, options Diff/File; default Diff for modified files (P4), File otherwise. Diff title reads "auth.ts — changes vs HEAD" as the tab tooltip.
- ⌘S saves (File mode; in Diff mode the modified side is editable and ⌘S saves it). Save errors → sticky toast.
- Monaco lazy-loads on first file open; until loaded show the region bg with a 1-line 12px `--text-muted` centered "Opening editor…" (skeleton, not spinner, if longer than 300ms: 3 shimmer lines 60%/80%/40% width).
- Open behavior from SCM/tree click: split mode per S1; repeated clicks reuse the single preview tab (italic filename) until the file is edited — VS Code preview-tab behavior.

## S6 — New session modal (⌘T)

```
        ┌ modal w:480 bg --bg-surface r:--r-lg shadow:--shadow-3 ┐
        │ New session                              [h:28 title]  │  padding 20
        │                                                        │
        │ Agent                                                  │  label 11/600 muted
        │ [ ● Claude Code ] [ Codex ] [ Shell ]                  │  segmented h:32
        │    claude is not installed — hover for install command │  (only when missing)
        │ Name                                                   │
        │ [ claude-1                                    ]        │  input h:28
        │ Directory                                              │
        │ [ ~/src/webapp                        ] [Choose…]      │  input h:28 mono 12
        │                                                        │
        │                          [ Cancel ]  [ Create  ↩ ]     │  buttons h:28
        └────────────────────────────────────────────────────────┘
```

- Centered horizontally, top at 20vh; scrim `--bg-scrim`; fade+scale 0.98→1, 200ms. Esc cancels; ↩ creates from any field. Focus lands on Agent control; Tab order: Agent → Name → Directory → Choose → Cancel → Create.
- Agent segmented control: options from the agent registry (Claude Code, Codex, Shell), each rendered as agent icon 16 (`currentColor` logo per DESIGN.md §3; Shell = codicon `terminal`) + label 13px, gap 6px; missing CLI → option disabled at 50% + caption row 11px `--text-muted` with the install command in mono 11 + copy icon (DESIGN.md §6.5). New registry agents inherit their icon from the DESIGN.md §3 map automatically.
- Name prefills `<agent>-<n>` (next free ordinal per project), select-all on focus. Duplicate → silent `-2` suffix on create. Directory prefills project root; [Choose…] = native dialog; non-existent path → inline error 12px `--error` "Directory not found", Create disabled.
- Create → modal closes, session row appears selected, terminal focused, agent launches. Total flow: ⌘T ↩ = two keys.

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
- ↑↓ selects (bg `--bg-active`), ↩ or click jumps: switches project tab, selects session, focuses terminal, closes overlay. First row preselected.
- Empty state (count 0): single row 13px `--text-secondary`, copy DESIGN.md §6.9; bell opens it anyway.

## S8 — Shortcuts overlay (⌘/)

- Modal 640×auto (max-height 70vh, scroll), same chrome as S6. Title "Keyboard shortcuts". Two-column grid (24px column gap): rows `[h:26]` — action 13px `--text-secondary` left, key chips right: mono 11px on `--bg-raised`, `[h:18]`, r-sm, padding 0 5px, 2px gaps (⌘ T rendered as separate chips? No — one chip per chord: "⌘T"). Content = DESIGN.md §4 table, grouped under 11px/600 uppercase headers: Sessions, Projects, Views (⌘⇧E, ⌃⇧G, ⌘B, orientation note "View menu: Sessions on top / right"), Git, Editor, App. Esc/⌘/ closes.

## S9 — Empty & error states (geometry; copy from DESIGN.md §6 verbatim)

Shared pattern (S9 pattern): centered flex column in the owning region, max-width 420px, gap 8px; title 20px/600 `--text-primary`; body 13px/20 `--text-secondary` centered; actions row margin-top 16px, gap 8px; shortcut hints 11px `--text-muted` mono. No illustrations in v1 — type-only, quiet.

| State | Region | Extras |
|---|---|---|
| First run (§6.1) | full window | single primary [Open project…]; window accepts folder drop (drop target: 2px dashed `--accent` inset 12px while dragging) |
| No sessions (§6.2) | terminal region | three quick-create secondary buttons in a row `[h:32]` w:140 each, agent icon 16 + label + "or press ⌘T to customize" hint below |
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
