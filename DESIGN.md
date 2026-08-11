# DESIGN.md — the gmux visual world

Authority order: PRODUCT.md (product truth) → this file (visual world, durable rules) → docs/DESIGN-SPEC.md (per-screen build spec). UI agents implement DESIGN-SPEC.md verbatim and resolve anything it doesn't cover from this file. Mode: **OPERATE** — scanability, keyboard flow, and native-macOS expectations outrank expression.

## 0. The world in one paragraph

Scene: a developer at a dark desk at 11pm, six agents running, terminals filling the screen. gmux is **dark-only in v1** — a light chrome around dark terminals creates blinding contrast wells, and the terminal IS the page. The world is a quiet, slightly cool graphite in which the terminal canvas and the app chrome are the *same* material (identical background), so the app disappears into the work. Color is spent on exactly one thing: **state**. An amber dot that says "needs you" is the loudest object in the interface; everything else is neutral, dense, and native. Brand lives in precision — the restore moment, the status language, the exact weight of a session row — not in decoration. Token names are theme-neutral (`--bg-canvas`, not `--gray-900`) so a light theme can be added later without renaming.

## 1. Tokens

All tokens are CSS custom properties declared on `:root` in `src/renderer/styles/tokens.css`. Components must never hardcode a color, size, duration, or font — tokens only.

### 1.1 Neutrals (cool graphite ramp, hue ≈ 222°, low sat)

```css
--bg-canvas:   #131417;  /* window base AND xterm background — one material */
--bg-sidebar:  #17181C;  /* sidebar, tab bar, editor gutter zone            */
--bg-surface:  #1B1D22;  /* modals, overlays, toasts, inputs                */
--bg-raised:   #22252B;  /* hover fills, chips, badges                      */
--bg-active:   #2A2E36;  /* selected rows, active tab fill                  */
--bg-scrim:    rgba(9, 10, 12, 0.55);   /* behind modals/overlays           */

--border:        #2A2D34;  /* hairlines between regions, 1px always         */
--border-strong: #3A3E48;  /* input borders, resize handles on hover        */

--text-primary:   #E8EAED;  /* names, values, body        (≥12:1 on canvas) */
--text-secondary: #A8ADB8;  /* labels, metadata            (≥7:1 on canvas) */
--text-muted:     #838996;  /* ages, counts, hints         (≥4.5:1 on canvas/sidebar/surface) */
--text-disabled:  #565B66;  /* disabled controls only — exempt from contrast */
```

Contrast rule: `--text-muted` passes 4.5:1 only up to `--bg-surface`. On `--bg-raised` or `--bg-active`, secondary information steps up to `--text-secondary`. Never place muted text on raised/active fills.

### 1.2 Accent (one accent — Restrained strategy)

```css
--accent:        #4D9DE8;  /* primary buttons, selection bars, focus, links' hover   */
--accent-hover:  #63ACF0;
--accent-text:   #82BFFF;  /* accent-colored text/links on dark (≥4.5:1 on canvas)   */
--accent-wash:   rgba(77, 157, 232, 0.14);  /* selected-row fill, editor selection    */
--drop-wash:     rgba(77, 157, 232, 0.25);  /* drag drop-target fill (split halves)   */
--on-accent:     #0D1117;  /* text on accent-filled controls                          */
```

Accent is used for: primary action per surface, current selection, focus ring, links, and drag affordances — drop-zone halves fill with `--drop-wash` behind a 1px `--accent` border, and every insertion indicator / section drop line is 2px `--accent`. Never for decoration, headings, or icons at rest. (`--drop-wash` is deliberately stronger than `--accent-wash`: it must read over a live terminal, not a sidebar row.)

### 1.3 Session status (the semantic heart of the app)

```css
--status-working:   #4D9DE8;  /* solid dot; agent producing output              */
--status-attention: #F5B84A;  /* solid dot + pulse; NEEDS_INPUT — loudest color */
--status-idle:      #6E7583;  /* solid dot; shell prompt / agent quiet          */
--status-exited:    #6E7583;  /* HOLLOW dot (1.5px ring); process ended, exit 0 */
--status-failed:    #E5655E;  /* HOLLOW dot; process ended, exit ≠ 0            */
--status-attention-badge-bg: #F5B84A;   /* count badges: amber bg…             */
--status-attention-badge-fg: #131417;   /* …with dark text (≥8:1)              */
```

Status is never color-alone: WORKING = solid blue, NEEDS_INPUT = solid amber **pulsing**, IDLE = solid gray, EXITED = hollow gray, FAILED = hollow red, SAVED = solid gray + ↺ — shape + motion + color, plus a text label ("working", "needs input", "idle", "ended", "failed (exit N)", "saved"). Where the label lives depends on density: the identity strip and the attention overlay show it as visible text; session tabs and right-list rows (too dense for a label) carry it via tooltip and `aria-label`, and needs-input additionally bumps the name to weight 500 so the state survives without color.

SAVED is the restorable state (post-reboot / background-server-gone): the process is not running, but the session's scrollback snapshot and resume command are recorded and one click brings it back. It renders with the idle gray dot (`--status-idle`, solid — the session is dormant, not dead) plus a small ↺ mark (codicon `history`, 12px) after the dot on tabs and list rows. The restore ACTIONS live in the terminal region — the "Ready to restore" state (§3) and the Restore-all bar — because tabs and 24px rows have no room for an inline button. Restoring is always user-initiated — nothing auto-runs.

### 1.4 Git decoration colors (VS Code/Primer-familiar — earned familiarity)

```css
--git-modified:  #E2B340;   /* M  */
--git-added:     #6BC46D;   /* A and untracked U */
--git-deleted:   #E5655E;   /* D  */
--git-renamed:   #6CB6FF;   /* R  */
--git-conflict:  #F0883E;   /* merge conflicts */
--git-ignored:   #565B66;   /* dimmed name, no badge */
```

### 1.5 Feedback (reuses the same families — one color vocabulary app-wide)

```css
--error:   #E5655E;   --warning: #F5B84A;   --success: #6BC46D;   --info: #6CB6FF;
--error-wash:   rgba(229, 101, 94, 0.12);
--warning-wash: rgba(245, 184, 74, 0.12);
--success-wash: rgba(107, 196, 109, 0.12);
```

### 1.6 Terminal palette (xterm.js theme — ships as `terminalTheme` const)

```
background #131417   foreground #D8DBE2   cursor #E8EAED   cursorAccent #131417
selectionBackground rgba(77,157,232,0.30)
black   #1B1D22   red   #E5655E   green   #6BC46D   yellow   #E2B340
blue    #6CB6FF   magenta #C583D8 cyan    #56C2C0   white    #C9CDD6
brBlack #4A505C   brRed #F07E78   brGreen #85D488   brYellow #F0C674
brBlue  #8FC7FF   brMagenta #D19FE8 brCyan #6FD6D4  brWhite  #E8EAED
```

### 1.7 Spacing (4px grid)

```css
--space-1: 2px;  --space-2: 4px;  --space-3: 6px;  --space-4: 8px;
--space-5: 12px; --space-6: 16px; --space-7: 20px; --space-8: 24px;
--space-9: 32px; --space-10: 48px;
```

Rhythm rules: tight inside a group (2–8px), generous between groups (16–24px); more space above a section heading than below it (16 above / 6 below).

### 1.8 Type

```css
--font-ui:   -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
--font-mono: "SF Mono", ui-monospace, Menlo, monospace;
--font-terminal: "SF Mono", ui-monospace, Menlo, monospace;  /* xterm ONLY — verified native stack (Bug C); never conflated with --font-mono */

--text-xs:   11px/16px;   /* section labels (uppercase +0.04em), badges, ages   */
--text-sm:   12px/18px;   /* dense rows (tree, SCM), branch names (mono)        */
--text-base: 13px/20px;   /* default: session names, controls, body, filenames  */
--text-md:   15px/22px;   /* modal body emphasis, empty-state body              */
--text-lg:   20px/28px;   /* modal titles, empty-state titles                   */

--weight-regular: 400;  --weight-medium: 500;  --weight-semibold: 600;
```

- One family (system sans) carries all UI. **Mono is for terminal-adjacent truth only**: branch names, paths shown as paths, SHAs, commands, exit codes, keyboard shortcuts in the ⌘/ overlay — never as a "technical" costume on labels.
- Counts and ages use `font-variant-numeric: tabular-nums`.
- Terminal: `--font-terminal` at 13px, xterm `lineHeight: 1.25`, `letterSpacing: 0`. The stack is macOS-native and **verified, not bundled** (Bug C resolution, Phase 9.2): "SF Mono" is Terminal.app-private and Chromium lacks `ui-monospace`, so the face that actually renders is **Menlo** — which covers the prompt-glyph gauntlet (➜ ✗ ● λ) at exactly one cell advance. The historical underscores were tmux substituting `_` for non-ASCII under a locale-less launchd env (fixed at source in `src/main/tmux/env.ts` + `tmux -u`), not missing glyphs, so the once-planned bundled JetBrains Mono was dropped as unnecessary. `--font-mono` stays the UI-mono token and xterm reads only `--font-terminal` (`resolveTerminalFontFamily()`) — the two are never conflated. Family + size become user-configurable when the deferred Settings → General terminal-font control lands (DESIGN-SPEC S13); it retargets this token.
- No display faces anywhere. Scale ratio ≈ 1.18; contrast between steps comes from weight (500/600), not size jumps.

### 1.9 Radii, borders, shadows, z-layers

```css
--r-sm: 4px;   /* buttons, inputs, badges, chips */
--r-md: 6px;   /* rows' selection fill, toasts, menus */
--r-lg: 10px;  /* modals, overlays */

--shadow-1: 0 1px 3px rgba(0,0,0,0.40);                    /* chips, tooltips  */
--shadow-2: 0 4px 16px rgba(0,0,0,0.45);                   /* menus, toasts    */
--shadow-3: 0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35); /* modals, overlays */

--z-titlebar: 100;  --z-editor-overlay: 300;  --z-modal: 500;
--z-attention: 600; --z-toast: 700;           --z-tooltip: 800;
```

Shadows always carry offset + blur (no zero-offset halos). Hairline borders are 1px `--border`; regions are separated by hairlines, not shadows.

### 1.10 Focus & motion tokens

```css
--focus-ring: 0 0 0 2px rgba(77, 157, 232, 0.60);  /* on :focus-visible, every interactive */
--dur-fast:  120ms;   /* hover fills, dot changes            */
--dur-base:  160ms;   /* selection moves, row state          */
--dur-panel: 200ms;   /* editor split open/close, overlays   */
--ease-out:  cubic-bezier(0.2, 0, 0, 1);
```

## 2. Layout

### 2.1 Window

- One `BrowserWindow`, `titleBarStyle: 'hiddenInset'`, `trafficLightPosition: {x:12, y:12}`. Min window 960×600. Default 1440×900.
- Native macOS menu bar (gmux / File / Edit / Session / Project / View / Window / Help) mirrors every shortcut — shortcuts must exist in the menu to be native.

### 2.2 Regions (left → right)

```
┌ titlebar row, 38px: ○○○ · project tabs · spacer · 🔔 attention ──────────────────┐
├───┬────────────┬──────────────────────────────────┬──────────────┬───────────────┤
│ A │ SIDEBAR    │ CENTER (terminal)                │ EDITOR       │ SESSION LIST  │
│ C │ 280px      │ flex, min 640px                  │ (when open)  │ (only in      │
│ T │ min 220    │ header band 36px:                │ 45% of ctr   │ "right"       │
│ B │ max 400    │  session tab strip (default)     │ min 480      │ orientation)  │
│ A │ one view:  │  or identity strip ("right")     │ tabs 36px    │ 200px         │
│ R │ SCM or     │ + xterm below                    │ + Monaco     │ min 160       │
│ 48│ Explorer   │                                  │              │ max 320       │
└───┴────────────┴──────────────────────────────────┴──────────────┴───────────────┘
                                          status strip: none — no bottom bar in v1
```

- **The header band (round-1 fix).** Directly under the titlebar, one continuous 36px band crosses every region except the activity bar: the sidebar view header, the terminal-region header (session tab strip by default, identity strip in "right" orientation), the editor tabs row (32px in round 0 — now 36px), and the right session list's toolbar when present. All are exactly 36px tall on `--bg-sidebar` and share a **single unbroken 1px `--border` bottom hairline** from the sidebar's left edge to the window's right edge; vertical region dividers cross it, and nothing else may sit at that y. This kills the round-0 misalignment where the 36px branch header and the 28px session strip drew two different lines.
- **Activity bar (decision reversed from round 0).** A 48px VS Code-style icon rail at the far left, full height below the titlebar: **Explorer** (⌘⇧E) and **Source Control** (⌃⇧G) views, Settings gear at the bottom, 2px accent bar marking the active view. Round 0 rejected segmenting because it would hide the sessions' NEEDS_INPUT state behind a mode switch; sessions no longer live in the sidebar (next bullet), so that objection is dissolved and the sidebar adopts the single-view VS Code pattern — earned familiarity, and full sidebar height for both SCM and the tree.
- **Sessions live on the terminal region, always visible.** Default: a **session tab strip** in the header band across the top of the terminal — one row of tabs (agent logo · name · status dot · close). Alternate: a VS Code-terminal-style **vertical session list docked at the right edge** (200px), with the band above the terminal showing the active session's identity strip instead. Orientation is a View-menu choice ("Sessions on top" / "Sessions on right"), persisted app-wide; both surfaces render the same store, states, and menus. The attention signal is therefore never behind a mode switch in either orientation.
- **Sidebar: one view at a time.** Source Control view = branch menu (list + checkout + create), commit box, Merge/Staged/Changes/Untracked groups, and History (commit list with refs badges, context menu, hover card). Explorer view = the git-decorated file tree with VS Code-style file-type icons (§3.1). ⌘B collapses/expands the sidebar; the activity bar never hides.
- **Terminal is the center.** The region shows one *surface* per project at a time: a surface is one session full-bleed or — round 2 — a drag-built **split group of up to 6 sessions** (DESIGN-SPEC S4A; reverses round 1's "no splits"). Every split stays its own durable tmux-backed session — layout is app-side presentation only. Switching surfaces swaps the region (hidden sessions cost nothing — architecture). Rename lives on the tab / list row / identity strip / split header (F2 or double-click); the ⋯ session menu lives on the identity strip and on tab/row context menus.
- **Editor: right split; overlay under the threshold.** Decision + justification: the dominant gesture is reviewing an agent's diff *while the agent keeps working* — side-by-side preserves supervision, and the terminal keeps its sidebar adjacency. Clicking a file opens the editor as a right split at 45% of the center area (draggable 320px–65%). When `contentWidth < 1400px` (+ the right session list's width when visible), the editor opens as an **overlay** covering the terminal area (`--z-editor-overlay`, slides in 200ms from right, scrim over terminal at 25%); Esc closes. The mode is automatic and never a user setting. Editor tabs row is 36px and belongs to the header band.
- Region dividers: 1px `--border`; drag handles are invisible 5px hit areas that show `--border-strong` on hover, `col-resize` cursor.

### 2.3 Project tabs (the spine)

In the titlebar row, left-aligned after traffic lights (76px inset). One tab = one repo. Tab anatomy: roll-up status dot · project name · amber count badge when NEEDS_INPUT > 0. Roll-up = max urgency across the tab's sessions (attention > working > idle). Branch and dirty count do NOT live on the tab (branch lives in the Source Control view header; dirty count on the activity-bar SCM badge) — tabs stay scannable. `+` button at the end opens a project (folder picker; opening an already-open project focuses its tab — idempotent open). Tabs reorder by drag along the bar (spec S2): 2px `--accent` insertion indicator, 160ms settle; order persists app-wide and ⌘1…⌘9 always follow the visual order. Far right of the titlebar: the 🔔 attention button with global count; Dock badge mirrors the same number.

## 3. Component inventory

Every interactive component defines: default / hover / focus-visible / active / selected / disabled (+ loading, error where meaningful). All states use tokens; anything unlisted inherits this table. Precise px in DESIGN-SPEC.md.

| Component | Anatomy | Key states |
|---|---|---|
| **Project tab** | 28px pill in 38px bar: dot 8px · name 13/500 · badge | selected: `--bg-active` fill, `--text-primary`; unselected: transparent, `--text-secondary`, hover `--bg-raised`; attention badge always visible even unselected |
| **Session tab (strip)** | full-band-height tab in the 36px band: agent icon 16 · name 13 · ⎇ worktree mark 12 (if any) · status dot 8 · × 16; min-w 120, max-w 200; 1px `--border` separators | active: `--bg-canvas` fill + 2px `--accent` top inset (melts into terminal); inactive: transparent, `--text-secondary`, hover `--bg-raised`; needs-input: name 500 + pulsing dot even when inactive; exited: hollow dot, name `--text-muted`; saved: ↺ 12 after dot; × shows on active/hover and ALWAYS opens the End-session confirm |
| **Session list row (right dock)** | 24px: agent icon 16 · name 13 · ⎇wt chip · right: status dot 8, × 16 on hover | selected: `--bg-active` + 2px `--accent` left inset; hover `--bg-raised`; same status vocabulary as tabs; age + status text in tooltip; density mirrors VS Code's terminal list |
| **Activity bar item** | 48×48 hit area, codicon 24 centered; SCM item carries a dirty-count badge (accent bg, never amber) | active: icon `--text-primary` + 2px `--accent` left inset bar; inactive `--text-muted`; hover `--text-secondary`; click active view = collapse sidebar (= ⌘B); tooltip carries name + shortcut |
| **Branch menu button** | in SCM view header: codicon git-branch 14 · branch name mono 12 · chevron 12; h:24 pill | hover `--bg-raised`; click → native menu (branch list w/ ✓ current, checkout on pick, Create branch…); detached HEAD: codicon git-commit + short SHA in `--warning` |
| **Commit row (History)** | 24px: rail col (1px rail + dot 8) · message 12 · author 11 muted (only when ≠ you) · refs badges right | HEAD dot `--accent`, merge dots hollow; hover `--bg-raised` + hover card after 600ms; click expands the commit's files inline; full context menu per DESIGN-SPEC S3A |
| **Commit hover card** | 520px card: author + relative/absolute date · formatted full message · stat line · SHA row w/ copy | `--bg-surface`, `--r-lg`, 1px `--border`, `--shadow-3`; interactive (copy, links); Esc or pointer-out dismisses; never clips offscreen |
| **Status dot** | 8px circle; hollow = 1.5px ring | working solid `--status-working`; attention solid `--status-attention` + pulse (§5); idle solid `--status-idle`; ended hollow gray; failed hollow `--status-failed` |
| **SCM file row** | 24px: badge letter (mono 11, git color) · filename 12 · dimmed dir path · hover actions (stage ＋ / unstage － / discard ↩) | click = open diff (P4); staged rows sit in Staged group; hover `--bg-raised`; discard always confirms |
| **Tree row** | 24px: chevron 12px · file-type icon 16px (§3.1) · name 12 · right: badge letter in git color | modified files: name tinted by git color; folders with dirty descendants: 4px propagation dot `--git-modified`; ignored: `--text-disabled` |
| **Editor tab** | 36px row (lives in the header band) above Monaco: filename 13 · mode chip `[Diff \| File]` · × close | dirty dot replaces × until saved; only one editor tab row (5 tabs max, LRU-evict clean tabs) |
| **Command modal (⌘T)** | 480px, `--r-lg`, `--shadow-3`, centered at 20vh | fields: Agent chip grid (registry-driven, round 2), Name (prefilled `<agent>-<n>`), Directory, Options (flag presets; danger-styled) ; Enter creates, Esc cancels; agent chips show "not installed" disabled state |
| **Attention overlay (⌘J)** | 560px panel dropped from titlebar center, `--shadow-3` | rows: dot · agent icon 16 · session · project · one-line prompt excerpt (mono 12) · age; ↑↓ + Enter jumps to tab+session; Esc closes; empty state §6.9 |
| **Buttons** | primary: `--accent` fill, `--on-accent` text, 13/500, 28px, `--r-sm`; secondary: `--bg-raised` fill + 1px `--border-strong`; destructive: `--error` fill only inside confirms | hover lightens (`--accent-hover` / `--bg-active`); disabled: `--text-disabled` text, 50% fill, no hover |
| **Inputs** | 28px, `--bg-surface`, 1px `--border-strong`, `--r-sm`, 13px | focus: border `--accent` + `--focus-ring`; error: border `--error` + 12px message below in `--error` |
| **Commit box** | multiline input at Changes top, placeholder "Commit message (⌘↩ to commit)" | ⌘↩ commits staged (nothing staged → offers "Stage all & commit"); busy: button shows 12px spinner; error: toast + box keeps text |
| **Toast** | 360px bottom-right, `--bg-surface`, `--r-md`, `--shadow-2`, icon + 13px text + optional action | info/success auto-dismiss 5s; errors sticky with × ; max 3 stacked, oldest collapses |
| **Banner** | full-width 36px strip above terminal, wash bg + 13px text + inline actions | used for restore-armed, agent-missing, non-blocking session notices |
| **Restore-all bar** | quiet 32px bar docked directly under the header band at the top of the terminal region: "N saved sessions" + [↺ Restore all] | shown only when ≥2 sessions in the project are saved and restore is available; button reads "Restoring…" while any restore is in flight; sessions restore sequentially, each with its resume command armed (typed, never run) |
| **Ready-to-restore state** | terminal-region empty state when the selected session is saved: title "Ready to restore", body explains that restore replays the saved scrollback and types (never runs) the resume command; [Restore] primary + [Remove] secondary | the terminal shows this state instead of §6.8's banner until the session is restored (scrollback exists again only after restore); [Restore] reads "Restoring…" while in flight; restore-unavailable fallback offers [Restart] |
| **Empty state** | centered in owning region: 20/600 title, 13 `--text-secondary` body ≤ 2 lines, one primary action + shortcut hint | never bare "nothing here" — every empty state teaches the next step (§6) |
| **Context menus** | native macOS menus via Electron `Menu.popup` — never DOM-drawn | session row, tab, SCM row, tree row all have one |
| **Tooltip** | 11px on `--bg-raised`, `--shadow-1`, 600ms delay | shortcuts shown as keycap chips (⌘T) in the UI sans — mono letterforms make "⌘O" read as "⌘0" |
| **Split pane header** | 24px bar atop each pane when a surface has ≥2 splits: agent icon 14 · name 12 · ⎇ worktree 12 · status dot 8 · × 14 on hover; the whole bar is the drag handle (`grab`/`grabbing` cursor) | focused pane: name `--text-primary` + 2px `--accent` left inset + 1px `--accent` inset ring around the pane; unfocused: `--text-secondary`; drag to strip/dock = pop out; right-click = session context menu + "Move to its own tab" |
| **Drop-zone overlay** | the target half of a pane while a session is dragged over it: `--drop-wash` fill + 1px `--accent` inset border | appears/disappears instantly — never fades over live terminals; absent when the surface holds 6 splits or a resulting pane would fall under min size |
| **Sidebar section header** | 24px sticky row: ▸/▾ chevron · 11/600 uppercase label · count · hover accessories, incl. `gripper` 14 `--text-muted` at far right | drag vertically to reorder sections (ghost of the header + 2px `--accent` drop line); order persists per view; Esc cancels; collapse (▸/▾) is independent of order |
| **Branch row (Branches section)** | 24px: codicon `git-branch`/`cloud`/`check` 12 · name mono 12 · `↑n ↓n` 11 muted right | current: `check` in `--accent` + name 500, click inert; local click → checkout; remote click → tracking checkout; busy: 12px spinner replaces the icon; hover `--bg-raised` |
| **Switch** | 26×16 track, radius 8px, knob 12px `--text-primary` | on: `--accent` track; off: `--bg-raised` + 1px `--border-strong`; disabled 50%, no hover; `:focus-visible` ring |
| **Hotkey recorder** | chip `[h:22]` min-w 96 on `--bg-raised`, r-sm: "Record shortcut" 12px, or assigned chord mono 11 + × on hover | recording: 1px `--accent` border + `--focus-ring`, text "Type shortcut…"; Esc cancels, ⌫ clears; conflict → 12px `--error` line below, chord not saved |

Iconography (round-1 reversal — Lucide retired): **@vscode/codicons** is the single UI-chrome set — activity bar, view toolbars, section headers, menus, chevrons, close buttons — rendered 16px (24px in the activity bar), `--text-secondary` at rest via `currentColor`. No emoji, no mixed sets: the Lucide strokes from round 0 are removed entirely, not blended. Two sanctioned exceptions carry meaning codicons cannot:

- **Agent identity logos** (round 0's "text chips, not logos" rule is reversed — sessions are now identified by icon everywhere: tabs, right-list rows, identity strip, ⌘T modal, quick-create menu, attention overlay). Vendored to `src/renderer/assets/agents/` and normalized to 24×24 viewBox, single-color `fill="currentColor"` SVGs rendered at 16px **monochrome** — the color budget stays with state, and monochrome sidesteps brand-color clutter next to the amber signal. Map (agent id → source asset from specstory-sync): claude → claude.svg · codex → openai.svg · gemini → gemini.svg · amp → amp.svg (strip hardcoded `#4d4d4d` fills) · cursor → cursor.svg (flatten gradients to a solid silhouette) · droid → droid.svg (extract the glyph from the dark disc) · copilot → githubcopilot.svg · deepseek → deepseek.svg. Wave-2 marks (Phase 10.1 — no specstory-sync asset existed; registry doc §3 called for commissioning them): antigravity → antigravity.svg (peak mark traced from the vendor's PNG) · pi → pi.svg (vendor's blocky π mark, normalized) · muse → muse.svg and qwen → qwen.svg (marks commissioned in-house — beamed notes; faceted pinwheel — swap for vendor art if official monochrome marks appear). Plain shell and any unknown agent id → the codicon `terminal` glyph. All 10 launchable registry agents now carry a mark, so registry growth needs zero design work.
- **File-type icons** (material-icon-theme) in the Explorer tree (and only there) — see §3.1.

### 3.1 Third-party icon assets & licensing (verified 2026-08-09)

- **@vscode/codicons** (npm dep, present): icons licensed **CC-BY-4.0**, code MIT. Attribution required — ship a `THIRD-PARTY-NOTICES.md` and credit in the About panel.
- **material-icon-theme — the chosen file-icon theme** (npm dep, **MIT**, © Philipp Kief; LICENSE verified in `node_modules/material-icon-theme` 2026-08-09). The considered alternative was Seti (`microsoft/vscode` → `extensions/theme-seti`, MIT; upstream `jesseweed/seti-ui`, MIT), which is VS Code's *literal* default theme — but Seti ships only as a glyph font + JSON inside the vscode repo (no npm distribution, blurrier at 16px than real SVGs, brittle to vendor), while material-icon-theme is the most-installed file-icon theme on the marketplace (reads as "VS Code" to this audience on sight), distributes versioned per-type SVGs drawn on a 16 grid, and carries its own filename/extension alias maps. A curated subset is embedded at build time (`file-icons.generated.ts`); matching mirrors VS Code (exact filename → dotted-suffix chain → extension → default). Folders carry the theme's **generic closed/open pair**, not its 122 per-basename variants (`folder-src`, `folder-test`, …): the tree resolves per-path icons for the file slot only, so a per-folder icon has no surface to attach to — the closed/open distinction is the whole folder vocabulary the row can express (Phase 11). Its per-type colors are kept as-is (a sanctioned theme const, same standing as the xterm/Monaco palettes in the S12 hex grep). Used in the Explorer tree only.
- **Agent logos**: third-party trademarks used nominatively (identifying which agent a session runs). Monochrome normalization avoids implying endorsement; strip embedded `<title>` elements (consumers set `aria-label`).

## 4. Interaction & keyboard map

Focus model: one focus zone at a time (sidebar view / session strip or list / terminal / editor / overlay). Terminal focus captures all keys EXCEPT ⌘-chords and F2; ⌘-chords always reach the app. Esc closes topmost layer (tooltip → menu → overlay → modal → editor-overlay); Esc reaches the terminal only when nothing is above it.

**Since Phase 12.12 this table has an executable twin: `src/shared/keymap.ts`.** The ⌘/ overlay, Settings → Keyboard, every tooltip that names a chord, and the native menu accelerators all render from that module — so adding a shortcut is a one-line data change there, and this table is the prose account of the same facts. If the two ever disagree, the module is what the user's keyboard actually does; fix the table. (§11.4.)

| Shortcut | Action |
|---|---|
| ⌘T | New session in current project (modal) |
| ⌘O | Open project… (new tab; idempotent — refocuses if already open) |
| ⇧⌘N | New project… (Phase 12.9: pick a parent folder + name, optional `git init`, opens and focuses the new tab) |
| ⌘1…⌘8 | Switch to project tab 1–8, by position in the strip |
| ⌘9 | The LAST project tab, however many are open (Phase 12.12 — the browser convention; "the ninth" left the tail of a long strip unreachable). Hold ⌘ alone and each tab reveals its digit |
| ⌃Tab / ⌃⇧Tab | Next / previous project tab |
| ⌘⌥← → ↑ ↓ | Move focus across splits (geometric nearest pane); at the surface's top/bottom edge, ⌘⌥↓/↑ continue to the next / previous session — so on unsplit surfaces they cycle sessions exactly as before. ⌘⌥←/→ at an edge: no-op |
| ⌘J | Attention overlay (all NEEDS_INPUT sessions, all projects) |
| F2 | Rename focused item (session, project tab); in terminal focus, renames active session |
| ⌘S | Save file in editor |
| ⌘↩ | Commit staged (focus anywhere in Changes section or commit box) |
| ⌘E | Toggle editor panel (reopens last file) |
| ⌘⇧E | Show Explorer view (opens sidebar if collapsed, focuses the tree; press again while focused → focus returns to terminal) |
| ⌃⇧G | Show Source Control view (same open/focus behavior) |
| ⌘B | Toggle sidebar (activity bar never hides) |
| ⌘⇧] / ⌘⇧[ | Next / previous editor tab |
| ⌘W | Close focused editor tab (NEVER closes sessions/projects; no-op otherwise) |
| ⌘F | Find in editor (Monaco). Terminal search: v1 tail, reserved |
| ⌘+ / ⌘- | Zoom the FOCUSED region — the session's terminal, the Explorer, Source Control, the right-hand session dock, or the editor. Ladder 75 %…200 %; the readout names the region it moved (S14) |
| ⌘0 / ⌘⇧0 | Reset the focused region / every region to 100 % |
| ⌘/ | Shortcuts overlay |
| ⌘, | Settings — dedicated window, single instance (S13); ⌘W closes it when focused |
| user-recorded | New `<agent>` session in the active project (Settings → Keyboard, e.g. ⇧⌘C → Claude Code); registered as native Session-menu accelerators |
| ⌘Q | Quit — sessions keep running; first quit shows a one-time toast saying so |
| ↑↓ + ↩ | Navigate any list/overlay; Enter activates (session → focus terminal; attention row → jump) |
| Esc | Close topmost layer |

User-recorded per-agent hotkeys (Settings → Keyboard, S13) must include ⌘ or ⌃; the recorder rejects any chord already in this map, used by another row, or reserved by macOS — nothing in this table is ever silently shadowed. Since 12.12 the rejection list is DERIVED from `src/shared/keymap.ts` rather than retyped, so a shortcut added to the map becomes un-recordable the same commit.

Reserved, not in v1: ⌘K (command palette), ⌘⇧F (project search). Ending a session is deliberately confirm-gated everywhere it exists (⋯ menu, tab/row context menu, or the tab/row × — all open the same "End session…" confirm naming the session; nothing ends silently, and ⌘W still never touches sessions). Double-click renames wherever F2 works — session tabs, right-list rows, the identity strip, and project tabs.

View menu (native, mirrors §2.2): "Sessions on top" / "Sessions on right" — a radio pair choosing the session-surface orientation, persisted app-wide, no default chord; plus Explorer ⌘⇧E, Source control ⌃⇧G, Toggle sidebar ⌘B, Toggle editor ⌘E.

## 5. Motion rules

- Purpose only: state change, focus move, reveal. No entrance choreography, no hover theatrics, nothing on app load — the app opens straight into the work.
- Durations: hover/dot changes `--dur-fast`; selection/row state `--dur-base`; editor split, modal, overlay `--dur-panel`. All `--ease-out`. Nothing exceeds 250ms.
- The one authored moment: the **needs-input pulse** — dot opacity 1 → 0.45 → 1 over 1.6s, infinite, paired with the amber count badge (which does not pulse). It is the only perpetual motion in the app. `prefers-reduced-motion`: pulse off, badge alone carries the signal.
- Modal/overlay: fade+scale 0.98→1 in `--dur-panel`; editor split: width transition; toast: 8px slide-up + fade.
- Drag: lifted ghosts track the pointer 1:1 (no easing); insertion indicators, drop lines, and drop-zone overlays appear/disappear instantly; displaced tabs settle in `--dur-base` on drop; Esc cancels any drag with zero motion.
- Terminal region: zero animation ever (no fades over live output) — this includes the drop-zone overlay, which snaps on/off with no transition.

## 6. Every empty & error state (copy is final; sentence case; no exclamation marks)

1. **First run / no projects.** Full-window empty state. Title: "Open a project to get started". Body: "A project is any folder — a git repo gets the full sidebar. Sessions you start keep running even when gmux is closed." Primary: [Open project…] with `⌘O` hint. Folder drop onto the window also accepted. **Phase 12.9 adds a secondary [New project…]** beside it (and the same pair behind the tab strip's +, as a native menu): opening a folder that exists was the only way in, which made "start something new" a trip outside the app.
2. **Project with no sessions.** Terminal region empty state. Title: "No sessions yet". Body: "A session is a named terminal that survives quits, crashes, and restarts." Three quick-create buttons: [Claude Code] [Codex] [Shell] (one click creates `claude-1` etc. in repo root and focuses it) + "or press ⌘T to customize". Buttons for missing CLIs render disabled with "not installed".
3. **Non-git folder.** Sessions work normally (the strip/list never needs git); Source Control view body: "Not a git repository. Sessions and files work; diffs and commits need git." + [Initialize repository] (runs `git init`, then refreshes). Explorer tree renders without decorations. Editor opens files plain (no diff mode).
4. **tmux missing.** Blocking full-window state (sessions are impossible). Title: "gmux needs tmux to keep sessions alive". Body: "gmux runs sessions on a private tmux server so they survive quits and crashes. It never touches your own tmux setup." Code row: `brew install tmux` + [Copy]. Primary: [Check again]. This is the only UI surface where the word tmux may appear.
5. **Agent CLI missing.** (a) In ⌘T modal and quick-create: option disabled, caption "claude is not installed" with hover reveal: `npm install -g @anthropic-ai/claude-code` + copy icon. (b) At restore, a session whose agent is missing opens as a plain shell with a warning banner: "claude isn't installed — this session opened as a shell. Its conversation is safe and will resume once claude is back."
6. **Session exited.** Row: hollow dot, muted name. Terminal keeps full scrollback; a 36px banner docks at its bottom. Exit 0: "Session ended" [Restart] [Remove]. Non-zero: "Session ended unexpectedly (exit 1)" in `--error` wash [Restart] [Remove]. Remove confirms: "Remove 'claude-1'? Its scrollback will be discarded."
7. **Restored after app quit/crash (T1).** No modal, no friction — one toast: "Restored. Your sessions were never interrupted."
8. **Restored after reboot (T3, armed resume).** Before restoring, saved sessions announce themselves calmly: a boot toast ("2 sessions are saved and ready to restore."), the "saved" row state (§1.3), the Restore-all bar when ≥2 are saved (§3), and the "Ready to restore" terminal state (§3) on the selected saved session. After [Restore] (or [↺ Restore all]), each restored agent session shows its replayed scrollback with the resume command pre-typed — armed, never executed — and a per-session toast: "'claude-1' restored — press Enter in the terminal to resume the conversation." Sessions restore as idle dots until resumed.
9. **Attention overlay, empty.** "Nothing needs you — all agents are working or idle."
10. **Background server stopped (T2, rare).** Terminal regions show a state, not a crash. Title: "Sessions were interrupted". Body: "The background server stopped. Your work is safe — restoring recreates each session with its history and an armed resume command." Primary: [Restore sessions] Secondary: [Not now].
11. **Git command failed** (commit hook rejection, lock, etc.). Sticky error toast: "Commit failed — {first line of git stderr}" [Show details] (expands mono log in a modal). Commit box retains the message.
12. **File deleted under an open editor tab.** Tab name struck through + tooltip "Deleted on disk"; editor read-only with a 36px warning banner: "This file was deleted on disk." [Close tab].
13. **History, no commits yet.** History section shows one quiet line: "No commits yet — your first commit starts the history."
14. **Settings — no agents detected.** Agents section shows one line: "No agent CLIs found. Install one and re-scan — sessions can always run a plain shell." + [Re-scan].
15. **Branches — no remotes.** Not an error: the Remotes group and the fetch accessory are simply hidden. Local-only repos get the Local group alone, no explanatory copy.

## 7. Voice & copy rules

Sentence case everywhere (buttons included). Verbs name the action ("Restore sessions", never "OK"). Errors name the problem and the recovery in one line each. Durability is always stated as a fact, calmly: "safe", "never interrupted", "keeps running". Banned in UI: tmux (except state 4), pane, window (multiplexer sense), attach, detach, socket, daemon, PTY, mux, prefix. The user's words: session, project, agent, restore, resume, needs input, split (splits are always "split(s)" in copy — "pane" stays banned even now that splits exist).

## 8. Round-1 revisions (dogfood, 2026-08-09) — decisions reversed or added

The token system (§1) is untouched. Everything below extends or reverses layout/component decisions after first real use:

1. **Header band** — sidebar header (36px) and terminal strip (28px) drew two misaligned lines; now one continuous 36px band with a single shared hairline across sidebar, center, editor, and right list (§2.2). Editor tabs 32 → 36 as a consequence.
2. **Sessions out of the sidebar** — session tab strip on top of the terminal (default) or VS Code-style right-docked list (alternate); View-menu radio, persisted app-wide. Both render the same store.
3. **"Stacked, not segmented" reversed** — with sessions always visible on the terminal region, the round-0 objection to an activity bar dissolved; sidebar is now activity bar (48px) + one view at a time (Source Control ⌃⇧G / Explorer ⌘⇧E).
4. **Agent logos replace text chips** — monochrome `currentColor` brand icons everywhere a session appears; icon map covers eight agents + shell (§3).
5. **History reaches the VS Code bar** — branch menu in the SCM header (list/checkout/create), commit list with refs badges, full per-commit context menu, rich hover card (§3, DESIGN-SPEC S3A).
6. **Icon system** — codicons replace Lucide wholesale for UI chrome; material-icon-theme (over Seti — rationale §3.1) for the Explorer tree; licensing documented in §3.1.
7. **Explicitly deferred, not forgotten**: session-tab drag-reorder; multi-lane commit graph (v1 history is a single topo-ordered lane with hollow merge dots).

## 9. Round-2 revisions (Phase 10, 2026-08-09) — the drag round

The token system gains exactly two entries (`--drop-wash` §1.2, `--font-terminal` §1.8); nothing else in §1 changes. Decisions reversed or added, from the user's reference screenshots (drag-to-split, draggable project tabs, VS Code section drag):

1. **Splits arrive** (reverses §2.2's round-1 "no splits"): the terminal region shows a *surface* — one session, or a drag-built split group of up to 6. Creation is drag-only plus native-menu equivalents; quadrant hit-testing lights the target half in `--drop-wash`; dragging a split's header back to the strip/dock pops it out. Every split remains its own tmux-backed session — durability untouched. Spec: DESIGN-SPEC S4A.
2. **Session-tab drag un-deferred** (closes §8.7's first deferral): within the strip/dock = reorder; into the terminal = drag-to-split. One gesture, two destinations.
3. **Project tabs reorder by drag**; order persists app-wide; ⌘1…⌘9 follow the visual order (S2).
4. **Sidebar sections reorder by header drag** (Changes / History / Branches; VS Code-style ghost + drop line); order persists per view. The changes area gains its own "CHANGES" section header to become a draggable unit (S3/S3A).
5. **Branch management graduates from menu to section**: a BRANCHES section in Source Control — Local + Remotes groups, ✓ current, ahead/behind, one-click checkout, remote tracking-checkout, fetch. The branch menu stays for one-keystroke switching and gains "Manage branches" (S3A).
6. **Settings gets a real surface**: a dedicated single-instance window on ⌘, (not an in-app panel — settings outlive any one project and the main window's regions are all spoken for). Sections: General (login item, default agent, terminal font), Agents (detected CLIs: path/version/re-scan/custom command), Hotkeys (per-agent recorder → native menu accelerators), Launch defaults (flag presets, danger-styled) (S13). *(Hotkeys became **Keyboard** in Phase 12.12 — §11.4.)*
7. **Terminal font becomes `--font-terminal`** — a dedicated xterm-only token, distinct from the UI-mono `--font-mono` (§1.8). Bug C's underscores turned out to be a locale bug, not font coverage: the shipped fix is the UTF-8 locale guard (`src/main/tmux/env.ts` + `tmux -u`) plus the verified native stack (Menlo actually renders and covers ➜ ✗ ● λ), and the once-planned bundled JetBrains Mono was dropped as unnecessary. **The Settings → General family/size control does not exist and this document no longer promises one** (superseded by §10.1 — the size question is answered by zoom, and a second control would fight it).
8. **⌘⌥arrows = split navigation** with edge fallthrough to session cycling — unsplit surfaces keep round-1 behavior key-for-key (§4).
9. **⌘T agent picker scales**: the 3-option segmented control becomes a wrapping chip grid driven by the 10-agent registry; per-agent flag presets appear as an Options group, danger flags styled and confirm-gated via Settings (S6, S13).

## 10. Round-3 revisions (Phase 12.11, 2026-08-11) — the zoom round

### 10.1 Zoom is per region, and the header band never moves

⌘+ / ⌘- enlarge the text where the user is working, not the window. Five regions —
the terminal, the Explorer, Source Control, the right-hand session dock, and the
editor — each hold their own level, persisted, on a 75 %…200 % ladder. ⌘0 resets
the focused region; ⌘⇧0 resets all five. Spec: DESIGN-SPEC S14.

Three decisions carry the design, and each one is load-bearing:

1. **A terminal zooms by its FONT, a panel by CSS `zoom`.** Scaling a terminal in
   CSS resamples the WebGL glyph atlas (soft text) and lies to every piece of cell
   arithmetic in the app. So xterm's `fontSize` changes, the pane re-fits, and the
   new cols/rows go to tmux down the same path a window resize uses — the agent's
   viewport genuinely changes and it redraws, which is what every terminal does.
   Panels take CSS `zoom` rather than `transform: scale()`, which would leave the
   layout box at its old size and break every hit-test in the region.
2. **The 36px header band (S1) is not zoomable.** One hairline crosses the window,
   and a region that grew its own band slice would break that line for all the
   others. Zoom applies to what you read — the tree, the changes list, the session
   rows, the file, the terminal — never to the chrome that labels it. Consequence,
   stated so it reads as a decision rather than a gap: in TOP orientation the
   session tab strip IS the band, so ⌘+ with a tab focused enlarges the session
   that tab points at.
3. **Zoom is a MULTIPLIER over one base size, never a competing setting.** The
   terminal's base is the §1.8 13px; the editor's is Monaco's 12px. §9.7's
   deferred Settings → General terminal size control is withdrawn, not postponed:
   it would be a second answer to the same question, and the promise had already
   outlived two phases without a control behind it. If a base-size control ever
   ships it changes the base and every zoomed surface follows.

## 11. Round-4 revisions (Phase 12.12, 2026-08-11) — the keyboard round

### 11.1 One agent board, not two

The ⌘T sheet had grown its own copy of §6.2's fleet tiles, and the copy was the worse
one: cramped rows, and a single caption under the grid that could only describe one
agent ("Droid not found") while three others had their own story. Both surfaces now
render **one component** — `src/renderer/app/AgentGrid.tsx` — parameterized by mode
(`select` in the sheet, `launch` in the empty state) and nothing else. Status moved ON
to the tile ("not installed", "early"), which is the change that made one component
possible: a caption can only speak for the grid, a tile speaks for itself. Spec:
DESIGN-SPEC S6. The rule this encodes is the guardrail's, stated for UI: **two surfaces
showing the same object share the component, or they will drift** — and the drift is
never symmetric, one copy always rots.

### 11.2 A layout switch belongs where the layout is

Moving sessions between the top strip and the right dock was a View-menu-only verb, which
means it was invisible to anyone who did not already know it existed. A single icon
button now sits in the SESSIONS header in **both** orientations, naming its destination
rather than its state ("Move sessions to the top"), and the verb is also in the chevron
menu for discoverability. **One truth in the store**, not a second piece of state: the
button, the chevron item and the View menu's radio pair all read and write the same
field, so the menu's checkmark can never disagree with the layout on screen.

### 11.3 ⌘9 is the last tab, and ⌘ reveals the numbers

⌘1…⌘9 shipped in round 1 as literal positions, so a tenth project made the tail of the
strip unreachable by keyboard — and nobody had ever discovered the shortcut anyway.
Both halves are fixed, and both come from one module (`project-shortcuts.ts`) because a
tab that shows a number the keystroke will not honour is worse than no number at all:
⌘1-⌘8 are positions, **⌘9 is always the last tab**, and the middle of a long strip
honestly shows nothing. Discovery is the Arc gesture — hold ⌘ alone for 220ms and each
tab reveals its digit, release and they go. No permanent numbers: the hint appears
exactly when the hand is already on the key, which is what §7's voice asks of any
affordance that is not always needed. Details that make it feel built rather than
bolted on are in DESIGN-SPEC S2.

### 11.4 The keymap is data, and every surface renders it

Shortcuts lived in three hand-maintained places — the ⌘/ overlay's array, the recorder's
reserved-chord table, and the accelerator literals in the native menu — which is how the
⇧↩ row went missing the same phase that shipped it, and how ⇧⌘N never became a chord the
recorder would refuse. **`src/shared/keymap.ts` is now the only list.** Every entry
carries its chords, a short `action` label, a plain-language `explain` sentence, a group,
a scope, and whether the user may re-record it; the ⌘/ overlay, Settings → Keyboard, the
native menus, the recorder's conflict table and every tooltip that names a chord all
render from it.

Three consequences worth stating as rules, because they are what keep it true:

1. **Adding a shortcut is a one-line change to that file and nothing else.** If you find
   yourself typing a chord into a component, a menu template or a `title=`, you are
   creating the next drift — add the row and read it back with `accelerator()` /
   `keyDisplay()`. The one legitimate exception is copy that names the CLASS of
   modifiers rather than a shortcut ("a shortcut needs ⌘ or ⌃"). This is **enforced,
   not asked for**: `src/shared/__tests__/keymap-single-source.test.ts` fails the build
   on a ⌘⌥⇧⌃ glyph anywhere in executable source outside the keymap, with a short
   allow-list of mechanisms (the formatter's inverse at the native-menu boundary, the
   two modifier-class validation strings). Widening that list is never the fix.
2. **Conflicts are surfaced, never resolved silently.** The reserved table is derived
   from the keymap, so a new built-in makes a colliding user chord un-recordable the
   same commit, and an already-recorded one grows a note on its row.
3. **Settings → Keyboard is a reference people READ, not a table.** It is set as a
   document — a sentence under every action, scope hung on the heading where a whole
   group shares one, filter-as-you-type — because the shortcuts nobody discovers are
   exactly the ones that need a sentence, not a denser grid. §9's item 6 "Hotkeys"
   section, whose first two rows were a hand-typed shortcut list, is replaced by it.
