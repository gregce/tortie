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
--on-accent:     #0D1117;  /* text on accent-filled controls                          */
```

Accent is used for: primary action per surface, current selection, focus ring, links. Never for decoration, headings, or icons at rest.

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

Status is never color-alone: WORKING = solid blue, NEEDS_INPUT = solid amber **pulsing**, IDLE = solid gray, EXITED = hollow gray, FAILED = hollow red — shape + motion + color, and rows carry a text label ("working", "needs input", "idle", "ended", "failed").

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

--text-xs:   11px/16px;   /* section labels (uppercase +0.04em), badges, ages   */
--text-sm:   12px/18px;   /* dense rows (tree, SCM), branch names (mono)        */
--text-base: 13px/20px;   /* default: session names, controls, body, filenames  */
--text-md:   15px/22px;   /* modal body emphasis, empty-state body              */
--text-lg:   20px/28px;   /* modal titles, empty-state titles                   */

--weight-regular: 400;  --weight-medium: 500;  --weight-semibold: 600;
```

- One family (system sans) carries all UI. **Mono is for terminal-adjacent truth only**: branch names, paths shown as paths, SHAs, commands, exit codes, keyboard shortcuts in the ⌘/ overlay — never as a "technical" costume on labels.
- Counts and ages use `font-variant-numeric: tabular-nums`.
- Terminal: SF Mono 13px, xterm `lineHeight: 1.25`, `letterSpacing: 0`.
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
┌ titlebar row, 38px: ○○○ · project tabs · spacer · 🔔 attention ────────────┐
├──────────────┬─────────────────────────────────┬───────────────────────────┤
│ SIDEBAR      │ TERMINAL (center)               │ EDITOR (right, when open) │
│ 280px        │ flex, min 640px                 │ 45% of center, min 480px  │
│ min 220      │ 28px session strip + xterm      │ tabs row + Monaco         │
│ max 400      │                                 │                           │
└──────────────┴─────────────────────────────────┴───────────────────────────┘
                                        status strip: none — no bottom bar in v1
```

- **Sidebar: STACKED, not segmented.** Three collapsible sections in one column: **Sessions**, **Changes**, **Files**. Decision + justification: the session list carries live NEEDS_INPUT state that must never hide behind a mode switch (Principle 3, "the glance answers who needs me"); the Changes list is a short working set; the Files tree flexes into remaining space. Segmenting (VS Code activity-bar style) would bury either the attention signal or the diff entry point — the two core gestures. Sessions gets its own scroll at max 40% of sidebar height; Changes auto-height up to 30%; Files takes the remainder. Section headers are sticky; ▸/▾ collapse persists per project.
- **Terminal is the center.** Exactly one session's terminal is visible per project tab (the selected session); switching sessions swaps the terminal (hidden sessions cost nothing — architecture). No splits in v1 (deferred per FINAL-REPORT v1 tail). Above the terminal, a 28px **session strip**: session name (F2/double-click renames in place), agent chip, status label, right-aligned ⋯ menu (Rename, Restart, End session…). The strip is the discoverable home for rename and the exited-state actions.
- **Editor: right split; overlay under 1400px.** Decision + justification: the dominant gesture is reviewing an agent's diff *while the agent keeps working* — side-by-side preserves supervision, and the terminal keeps its sidebar adjacency. Clicking a file opens the editor as a right split at 45% of the center area (draggable 320px–65%). When window width < 1400px (sidebar 280 + terminal-at-80-cols 640 + editor 480 no longer fit), the editor opens as an **overlay** covering the terminal area (`--z-editor-overlay`, slides in 200ms from right, scrim over terminal at 25%); Esc closes. The mode is automatic and never a user setting.
- Region dividers: 1px `--border`; drag handles are invisible 5px hit areas that show `--border-strong` on hover, `col-resize` cursor.

### 2.3 Project tabs (the spine)

In the titlebar row, left-aligned after traffic lights (76px inset). One tab = one repo. Tab anatomy: roll-up status dot · project name · amber count badge when NEEDS_INPUT > 0. Roll-up = max urgency across the tab's sessions (attention > working > idle). Branch and dirty count do NOT live on the tab (they live in the sidebar header) — tabs stay scannable. `+` button at the end opens a project (folder picker; opening an already-open project focuses its tab — idempotent open). Far right of the titlebar: the 🔔 attention button with global count; Dock badge mirrors the same number.

## 3. Component inventory

Every interactive component defines: default / hover / focus-visible / active / selected / disabled (+ loading, error where meaningful). All states use tokens; anything unlisted inherits this table. Precise px in DESIGN-SPEC.md.

| Component | Anatomy | Key states |
|---|---|---|
| **Project tab** | 28px pill in 38px bar: dot 8px · name 13/500 · badge | selected: `--bg-active` fill, `--text-primary`; unselected: transparent, `--text-secondary`, hover `--bg-raised`; attention badge always visible even unselected |
| **Session row** | 32px: dot 8px · name 13/400 · ⎇ worktree chip (if any) · right: age 11 muted → ⋯ on hover | selected: `--bg-active` + 2px `--accent` left inset bar; needs-input rows: name at `--text-primary` regardless of selection; exited: name `--text-muted`, hollow dot |
| **Status dot** | 8px circle; hollow = 1.5px ring | working solid `--status-working`; attention solid `--status-attention` + pulse (§5); idle solid `--status-idle`; ended hollow gray; failed hollow `--status-failed` |
| **SCM file row** | 24px: badge letter (mono 11, git color) · filename 12 · dimmed dir path · hover actions (stage ＋ / unstage － / discard ↩) | click = open diff (P4); staged rows sit in Staged group; hover `--bg-raised`; discard always confirms |
| **Tree row** | 24px: chevron 12px · name 12 · right: badge letter in git color | modified files: name tinted by git color; folders with dirty descendants: 4px propagation dot `--git-modified`; ignored: `--text-disabled` |
| **Editor tab** | 32px row above Monaco: filename 13 · mode chip `[Diff \| File]` · × close | dirty dot replaces × until saved; only one editor tab row (5 tabs max, LRU-evict clean tabs) |
| **Command modal (⌘T)** | 480px, `--r-lg`, `--shadow-3`, centered at 20vh | fields: Agent segmented control, Name (prefilled `<agent>-<n>`), Directory; Enter creates, Esc cancels; agent options show "not installed" disabled state |
| **Attention overlay (⌘J)** | 560px panel dropped from titlebar center, `--shadow-3` | rows: dot · session · project · one-line prompt excerpt (mono 12) · age; ↑↓ + Enter jumps to tab+session; Esc closes; empty state §6.9 |
| **Buttons** | primary: `--accent` fill, `--on-accent` text, 13/500, 28px, `--r-sm`; secondary: `--bg-raised` fill + 1px `--border-strong`; destructive: `--error` fill only inside confirms | hover lightens (`--accent-hover` / `--bg-active`); disabled: `--text-disabled` text, 50% fill, no hover |
| **Inputs** | 28px, `--bg-surface`, 1px `--border-strong`, `--r-sm`, 13px | focus: border `--accent` + `--focus-ring`; error: border `--error` + 12px message below in `--error` |
| **Commit box** | multiline input at Changes top, placeholder "Commit message (⌘↩ to commit)" | ⌘↩ commits staged (nothing staged → offers "Stage all & commit"); busy: button shows 12px spinner; error: toast + box keeps text |
| **Toast** | 360px bottom-right, `--bg-surface`, `--r-md`, `--shadow-2`, icon + 13px text + optional action | info/success auto-dismiss 5s; errors sticky with × ; max 3 stacked, oldest collapses |
| **Banner** | full-width 36px strip above terminal, wash bg + 13px text + inline actions | used for restore-armed, agent-missing, non-blocking session notices |
| **Empty state** | centered in owning region: 20/600 title, 13 `--text-secondary` body ≤ 2 lines, one primary action + shortcut hint | never bare "nothing here" — every empty state teaches the next step (§6) |
| **Context menus** | native macOS menus via Electron `Menu.popup` — never DOM-drawn | session row, tab, SCM row, tree row all have one |
| **Tooltip** | 11px on `--bg-raised`, `--shadow-1`, 600ms delay | shortcuts shown as mono chips (⌘T) |

Iconography: a single 16px stroke set (Lucide, 1.5px stroke, `--text-secondary` at rest) — no emoji, no mixed sets. Agent chips are text ("claude", "codex", "shell") in mono 11 on `--bg-raised`, not logos.

## 4. Interaction & keyboard map

Focus model: one focus zone at a time (sidebar list / terminal / editor / overlay). Terminal focus captures all keys EXCEPT ⌘-chords and F2; ⌘-chords always reach the app. Esc closes topmost layer (tooltip → menu → overlay → modal → editor-overlay); Esc reaches the terminal only when nothing is above it.

| Shortcut | Action |
|---|---|
| ⌘T | New session in current project (modal) |
| ⌘O | Open project… (new tab; idempotent — refocuses if already open) |
| ⌘1…⌘9 | Switch to project tab 1–9 |
| ⌃Tab / ⌃⇧Tab | Next / previous project tab |
| ⌥⌘↓ / ⌥⌘↑ | Next / previous session in project |
| ⌘J | Attention overlay (all NEEDS_INPUT sessions, all projects) |
| F2 | Rename focused item (session, project tab); in terminal focus, renames active session |
| ⌘S | Save file in editor |
| ⌘↩ | Commit staged (focus anywhere in Changes section or commit box) |
| ⌘E | Toggle editor panel (reopens last file) |
| ⌘B | Toggle sidebar |
| ⌘⇧] / ⌘⇧[ | Next / previous editor tab |
| ⌘W | Close focused editor tab (NEVER closes sessions/projects; no-op otherwise) |
| ⌘F | Find in editor (Monaco). Terminal search: v1 tail, reserved |
| ⌘/ | Shortcuts overlay |
| ⌘, | Settings |
| ⌘Q | Quit — sessions keep running; first quit shows a one-time toast saying so |
| ↑↓ + ↩ | Navigate any list/overlay; Enter activates (session → focus terminal; attention row → jump) |
| Esc | Close topmost layer |

Reserved, not in v1: ⌘K (command palette), ⌘⇧F (project search). Ending a session is deliberately menu-only (⋯ or context menu → "End session…", with confirm naming the session). Double-click renames wherever F2 works.

## 5. Motion rules

- Purpose only: state change, focus move, reveal. No entrance choreography, no hover theatrics, nothing on app load — the app opens straight into the work.
- Durations: hover/dot changes `--dur-fast`; selection/row state `--dur-base`; editor split, modal, overlay `--dur-panel`. All `--ease-out`. Nothing exceeds 250ms.
- The one authored moment: the **needs-input pulse** — dot opacity 1 → 0.45 → 1 over 1.6s, infinite, paired with the amber count badge (which does not pulse). It is the only perpetual motion in the app. `prefers-reduced-motion`: pulse off, badge alone carries the signal.
- Modal/overlay: fade+scale 0.98→1 in `--dur-panel`; editor split: width transition; toast: 8px slide-up + fade.
- Terminal region: zero animation ever (no fades over live output).

## 6. Every empty & error state (copy is final; sentence case; no exclamation marks)

1. **First run / no projects.** Full-window empty state. Title: "Open a project to get started". Body: "A project is any folder — a git repo gets the full sidebar. Sessions you start keep running even when gmux is closed." Primary: [Open project…] with `⌘O` hint. Folder drop onto the window also accepted.
2. **Project with no sessions.** Terminal region empty state. Title: "No sessions yet". Body: "A session is a named terminal that survives quits, crashes, and restarts." Three quick-create buttons: [Claude Code] [Codex] [Shell] (one click creates `claude-1` etc. in repo root and focuses it) + "or press ⌘T to customize". Buttons for missing CLIs render disabled with "not installed".
3. **Non-git folder.** Sidebar: Sessions works normally; Changes section body: "Not a git repository. Sessions and files work; diffs and commits need git." + [Initialize repository] (runs `git init`, then refreshes). Files tree renders without decorations. Editor opens files plain (no diff mode).
4. **tmux missing.** Blocking full-window state (sessions are impossible). Title: "gmux needs tmux to keep sessions alive". Body: "gmux runs sessions on a private tmux server so they survive quits and crashes. It never touches your own tmux setup." Code row: `brew install tmux` + [Copy]. Primary: [Check again]. This is the only UI surface where the word tmux may appear.
5. **Agent CLI missing.** (a) In ⌘T modal and quick-create: option disabled, caption "claude is not installed" with hover reveal: `npm install -g @anthropic-ai/claude-code` + copy icon. (b) At restore, a session whose agent is missing opens as a plain shell with a warning banner: "claude isn't installed — this session opened as a shell. Its conversation is safe and will resume once claude is back."
6. **Session exited.** Row: hollow dot, muted name. Terminal keeps full scrollback; a 36px banner docks at its bottom. Exit 0: "Session ended" [Restart] [Remove]. Non-zero: "Session ended unexpectedly (exit 1)" in `--error` wash [Restart] [Remove]. Remove confirms: "Remove 'claude-1'? Its scrollback will be discarded."
7. **Restored after app quit/crash (T1).** No modal, no friction — one toast: "Restored. Your sessions were never interrupted."
8. **Restored after reboot (T3, armed resume).** Each restored agent session shows its scrollback with the resume command pre-typed, plus a banner: "Restored after restart — press ↩ in the terminal to resume this conversation." Project-level toast when >1 armed: "3 sessions restored with their conversations ready to resume." [Resume all] executes each armed command. Sessions restore as idle dots with a small ↺ chip until resumed.
9. **Attention overlay, empty.** "Nothing needs you — all agents are working or idle."
10. **Background server stopped (T2, rare).** Terminal regions show a state, not a crash. Title: "Sessions were interrupted". Body: "The background server stopped. Your work is safe — restoring recreates each session with its history and an armed resume command." Primary: [Restore sessions] Secondary: [Not now].
11. **Git command failed** (commit hook rejection, lock, etc.). Sticky error toast: "Commit failed — {first line of git stderr}" [Show details] (expands mono log in a modal). Commit box retains the message.
12. **File deleted under an open editor tab.** Tab name struck through + tooltip "Deleted on disk"; editor read-only with a 36px warning banner: "This file was deleted on disk." [Close tab].

## 7. Voice & copy rules

Sentence case everywhere (buttons included). Verbs name the action ("Restore sessions", never "OK"). Errors name the problem and the recovery in one line each. Durability is always stated as a fact, calmly: "safe", "never interrupted", "keeps running". Banned in UI: tmux (except state 4), pane, window (multiplexer sense), attach, detach, socket, daemon, PTY, mux, prefix. The user's words: session, project, agent, restore, resume, needs input.
