# DESIGN-SPEC.md — per-screen build spec

Implement verbatim. Tokens (`--bg-canvas` etc.) come from DESIGN.md §1 and live in `src/renderer/styles/tokens.css`. Any measurement not given here resolves from DESIGN.md; any conflict: DESIGN.md wins on rules, this file wins on px. All copy strings in DESIGN.md §6 are final. UI streams code against the frozen mocks (session API, status-map store, event bus enum WORKING / NEEDS_INPUT / IDLE + `exited`).

Conventions: `[h:28]` = height 28px. Hairlines are 1px `--border`. Every interactive element gets `:focus-visible → box-shadow: var(--focus-ring)`. Hover fills use `--bg-raised` unless stated.

---

## S1 — App shell geometry

```
1440×900 default · min 960×600 · titleBarStyle hiddenInset · trafficLightPosition {12,12}

┌─ TITLEBAR [h:38] bg --bg-sidebar, hairline bottom ──────────────────────────────┐
│ ○○○ ·76px· [tab][tab][tab] [+]                 (spacer)              [🔔 3] ·12·│
├────────────┬————————————————————————————————————————————┬───────────────────————┤
│ SIDEBAR    │ CENTER (terminal)                          │ EDITOR (when open)    │
│ w:280      │ flex:1, min-w:640                          │ w:45% of center       │
│ min:220    │ ┌ session strip [h:28] ──────────────────┐ │ min-w:480, max:65%    │
│ max:400    │ │ claude-auth  [claude]  working      ⋯  │ │ ┌ editor tabs [h:32] ┐│
│ bg:        │ ├─────────────────────────────────────────┤ │ ├────────────────────┤│
│ --bg-      │ │                                         │ │ │  Monaco            ││
│ sidebar    │ │  xterm.js  bg --bg-canvas               │ │ │  bg --bg-canvas    ││
│            │ │  padding 8px 12px                       │ │ │                    ││
│            │ │                                         │ │ │                    ││
└────────────┴─────────────────────────────────────────────┴────────────────────────┘
```

- Region dividers: 1px `--border`. Drag handles: 5px invisible hit area centered on the divider; hover shows the divider at `--border-strong`; cursor `col-resize`. Sidebar and editor widths persist per project in local state.
- Editor closed → center takes everything. Window `contentWidth < 1400` → editor opens as OVERLAY instead of split: absolute, right-anchored, width `min(720px, 85% of center)`, `--z-editor-overlay`, `--shadow-3`, slides in 200ms `--ease-out`; 25% black scrim over the terminal (click scrim or Esc closes). Mode is automatic on open; a split editor converts to overlay live if the window shrinks past 1400.
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

## S3 — Sidebar (stacked sections)

```
┌ SIDEBAR w:280 bg --bg-sidebar ─────────────────┐
│ ⎇ feat/auth  ↑2 ↓1                 ● 7        │  branch header [h:36]
│─────────────────────────────────────────────────│
│ ▾ SESSIONS                              ＋     │  section header [h:28]
│ │● claude-auth        ⎇wt          4m         │  session row [h:32]
│ │● codex-migrate                   1m         │
│ │○ shell                           2h         │
│ ▾ CHANGES                            3         │
│ │ [ Commit message (⌘↩ to commit)          ] │  commit box
│ │ [        Commit  (primary, full-w)        ] │
│ │ Staged (1)                                  │  group row [h:24]
│ │  M  auth.ts        src/routes               │  scm row [h:24]
│ │ Changes (2)                                 │
│ │  M  db.ts          src/lib                  │
│ │  U  new.sql        migrations               │
│ ▾ FILES                                        │
│ │ ▸ src ·                                     │  tree row [h:24]
│ │ ▾ migrations ·                              │
│ │    003_users.sql                     U      │
└─────────────────────────────────────────────────┘
```

**Branch header `[h:36]`**, padding 0 12px: ⎇ icon 14px + branch name mono 12px `--text-secondary` (truncate middle) · ahead/behind `↑n ↓n` mono 11px `--text-muted` · right: dirty count `● n` 11px in `--git-modified` (hidden at 0). Non-git: shows folder name 12px `--text-muted` instead. Click branch name → copies it, toast "Branch name copied".

**Section headers `[h:28]`**, sticky within sidebar scroll, bg `--bg-sidebar`: ▸/▾ chevron 12px · label 11px/600 uppercase tracking +0.04em `--text-muted` · right accessory (Sessions: ＋ new-session icon-button 20×20 = ⌘T; Changes: count 11px; Files: refresh icon on hover). Collapse state persists per project.

**Space budget:** Sessions section `max-height: 40%` of sidebar (own scroll); Changes `max-height: 30%` (own scroll, commit box sticky at its top); Files takes the remainder (react-arborist virtualized). Collapsed sections release their space downward.

**Session row `[h:32]`**, padding 0 12px 0 10px, radius `--r-md` inset 4px horizontally:
- dot 8px (DESIGN.md §1.3; attention pulses) · name 13px `--text-primary` (400) · optional worktree chip `⎇wt` mono 10px on `--bg-raised` `[h:16]` r-sm padding 0 4px · right: age 11px `--text-muted` tabular-nums, replaced by ⋯ button 20×20 on hover/focus.
- Selected: bg `--bg-active` + 2px `--accent` inset bar on the left edge (radius follows row). Hover: `--bg-raised`. Needs-input: name weight 500 (even unselected). Exited: hollow dot, name `--text-muted`; failed: hollow `--status-failed` dot.
- Click / ↩ → select session, terminal swaps (no animation), focus terminal. F2 / double-click name → inline rename: name becomes input (same 13px, bg `--bg-surface`, border 1px `--accent`, select-all); ↩ commits, Esc reverts; empty name reverts; duplicate name gets `-2` suffix silently.
- ⋯ / context menu (native): Rename (F2), Restart, Copy directory path, End session… (confirm modal: title "End 'claude-auth'?", body "Its process will stop and its scrollback will be discarded. This cannot be undone.", buttons [Cancel] [End session] destructive).
- Status text is exposed to screen readers via `aria-label="claude-auth, needs input"`.

**SCM group row `[h:24]`**: label 11px/600 `--text-secondary` + count 11px `--text-muted`. Groups in order: Merge (only when present), Staged, Changes, Untracked.

**SCM file row `[h:24]`**, padding-left 20px: status letter mono 11px/600 in its git color (M `--git-modified`, A/U `--git-added`, D `--git-deleted` + name strikethrough, R `--git-renamed`, conflict `!` `--git-conflict`) · filename 12px `--text-primary` · dir path 11px `--text-muted` truncated left. Hover: `--bg-raised` + action icons 16px right-aligned (Changes/Untracked: stage ＋, discard ↩; Staged: unstage －). Discard confirms per file ("Discard changes to auth.ts? This cannot be undone."). Click row → opens diff-vs-HEAD in editor (S5). Untracked click → opens file plain.

**Commit box**: textarea auto-grow 1–5 lines, 12px mono? — no: 13px `--font-ui`, bg `--bg-surface`, border 1px `--border-strong`, r-sm, padding 6px 8px, placeholder `--text-muted`. Below it [Commit] primary button full-width `[h:28]` (label "Commit" / while running: spinner 12px + "Committing…"). ⌘↩ anywhere in the section commits staged; nothing staged → button label "Stage all & commit" (VS Code behavior).

**Tree row `[h:24]`** (react-arborist, indent 12px/level): chevron 12px (folders) · name 12px · right: status letter as SCM row. File with git state: name tinted to the git color (A11Y: letter badge is the redundant channel). Folder with dirty descendants: 4px dot `--git-modified` after the name. Ignored: name `--text-disabled`, no badge. Click file → same diff-default behavior as SCM row (modified → diff, clean → plain file). No inline file ops in v1 (context menu: Reveal in Finder, Copy path).

## S4 — Terminal region & session strip

```
┌ session strip [h:28] bg --bg-sidebar, hairline bottom ─────────────────────┐
│ claude-auth   [claude]   working                                       ⋯  │
├────────────────────────────────────────────────────────────────────────────┤
│ xterm.js — bg --bg-canvas, padding 8px 12px, SF Mono 13, lineHeight 1.25  │
│ theme: DESIGN.md §1.6 · WebGL addon · scrollback cap 10000               │
└────────────────────────────────────────────────────────────────────────────┘
```

- Strip anatomy, padding 0 12px: session name 12px/500 `--text-primary` (F2/double-click renames — same inline pattern as S3) · agent chip mono 11px on `--bg-raised` `[h:18]` padding 0 6px r-sm ("claude" / "codex" / "shell") · status label 11px `--text-muted` ("working" / "needs input" in `--status-attention` / "idle" / "ended" / "failed") · right ⋯ 20×20 (same menu as session row).
- Terminal owns keyboard when focused; ⌘-chords and F2 pass to the app (DESIGN.md §4). Focus ring: none on the terminal itself; the strip bottom hairline turns `--accent` when terminal has focus (subtle, 1px).
- fit-addon on container resize (16ms debounce). Never animate terminal content or opacity.
- Banners (exited, restore-armed, agent-missing — DESIGN.md §6): `[h:36]` strip docked at the BOTTOM of the terminal region, full width, wash bg (`--warning-wash` / `--error-wash` / `--success-wash`), 13px text, inline text-buttons on the right, × dismiss where non-actionable. Banner never overlays scrollback (region shrinks by 36px).

## S5 — Editor panel

```
┌ editor tabs [h:32] bg --bg-sidebar ────────────────────────────────────────┐
│ auth.ts ●    db.ts ×                              [ Diff | File ]          │
├────────────────────────────────────────────────────────────────────────────┤
│ Monaco · bg --bg-canvas · font SF Mono 12 · minimap off · Monaco built-in │
│ diff renderer (side-by-side ≥ 900px wide, inline below)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

- Tab: padding 0 10px, filename 13px, active tab bg `--bg-canvas` (melts into editor) with 2px `--accent` top inset; inactive `--text-secondary`. Dirty: 6px dot `--accent` replaces × until saved. Max 5 tabs, LRU-evict clean tabs; ⌘⇧]/[ cycles; ⌘W closes focused.
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
- Agent segmented control: options from the agent registry (Claude Code, Codex, Shell); missing CLI → option disabled at 50% + caption row 11px `--text-muted` with the install command in mono 11 + copy icon (DESIGN.md §6.5).
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
- Row `[h:40]`, padding 0 16px: pulsing attention dot 8px · session name 13px/500 · project name 12px `--text-muted` · prompt excerpt mono 12px `--text-secondary` truncated (last non-empty terminal line, from the status detector) · age 11px `--text-muted` right. Sorted newest-blocked first.
- ↑↓ selects (bg `--bg-active`), ↩ or click jumps: switches project tab, selects session, focuses terminal, closes overlay. First row preselected.
- Empty state (count 0): single row 13px `--text-secondary`, copy DESIGN.md §6.9; bell opens it anyway.

## S8 — Shortcuts overlay (⌘/)

- Modal 640×auto (max-height 70vh, scroll), same chrome as S6. Title "Keyboard shortcuts". Two-column grid (24px column gap): rows `[h:26]` — action 13px `--text-secondary` left, key chips right: mono 11px on `--bg-raised`, `[h:18]`, r-sm, padding 0 5px, 2px gaps (⌘ T rendered as separate chips? No — one chip per chord: "⌘T"). Content = DESIGN.md §4 table, grouped under 11px/600 uppercase headers: Sessions, Projects, Git, Editor, App. Esc/⌘/ closes.

## S9 — Empty & error states (geometry; copy from DESIGN.md §6 verbatim)

Shared pattern (S9 pattern): centered flex column in the owning region, max-width 420px, gap 8px; title 20px/600 `--text-primary`; body 13px/20 `--text-secondary` centered; actions row margin-top 16px, gap 8px; shortcut hints 11px `--text-muted` mono. No illustrations in v1 — type-only, quiet.

| State | Region | Extras |
|---|---|---|
| First run (§6.1) | full window | single primary [Open project…]; window accepts folder drop (drop target: 2px dashed `--accent` inset 12px while dragging) |
| No sessions (§6.2) | terminal region | three quick-create secondary buttons in a row `[h:32]` w:140 each + "or press ⌘T to customize" hint below |
| Non-git (§6.3) | Changes section body | 12px body + [Initialize repository] secondary `[h:26]`, left-aligned within section padding 12px |
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

1. Zero hardcoded colors/sizes/durations — tokens only (grep for `#` hexes outside tokens.css and the xterm/Monaco theme consts).
2. Every interactive element: hover, `:focus-visible` ring, disabled state; every list keyboard-navigable (↑↓ ↩); full DESIGN.md §4 map wired and mirrored in the native menu.
3. All §6 states reachable and pixel-per-spec (mock the triggering conditions).
4. Text contrast ≥4.5:1 (spot-check `--text-muted` placements — never on `--bg-raised`/`--bg-active`).
5. `prefers-reduced-motion`: pulse disabled, transitions ≤ 1ms, badges intact.
6. No tmux vocabulary in any rendered string except the §6.4 screen.
7. Terminal region: no CSS transitions/opacity on the xterm container; WebGL only when visible.
8. Sentence case everywhere; button labels are verbs.
