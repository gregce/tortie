# DESIGN.md — the Tortie visual world

Authority order: PRODUCT.md (product truth) → this file (visual world, durable rules) → docs/DESIGN-SPEC.md (per-screen build spec). UI agents implement DESIGN-SPEC.md verbatim and resolve anything it doesn't cover from this file. Mode: **OPERATE** — scanability, keyboard flow, and native-macOS expectations outrank expression.

## 0. The world in one paragraph

Scene: a developer at a dark desk at 11pm, six agents running, terminals filling the screen. gmux is **dark by default** and was dark-only until Phase 213 — a light chrome around dark terminals creates blinding contrast wells, and the terminal IS the page. That sentence still decides the shape of the light mode: when the scheme is light the TERMINAL GOES LIGHT TOO, and a light frame around a dark terminal is refused. The world is a quiet, slightly cool graphite in which the terminal canvas and the app chrome are the *same* material (identical background), so the app disappears into the work. Color is spent on exactly one thing: **state**. An amber dot that says "needs you" is the loudest object in the interface; everything else is neutral, dense, and native. Brand lives in precision — the restore moment, the status language, the exact weight of a session row — not in decoration. Token names are theme-neutral (`--bg-canvas`, not `--gray-900`) so a light theme can be added later without renaming.

## 1. Tokens

All tokens are CSS custom properties declared on `:root` in `src/renderer/styles/tokens.css`. Components must never hardcode a color, size, duration, or font — tokens only.

### 1.1 Neutrals (cool graphite ramp, hue ≈ 222°, low sat)

```css
--bg-canvas:   #131417;  /* window base AND xterm background — one material */
--bg-sidebar:  #0E0F13;  /* sidebar, tab bar, editor gutter zone (below the canvas) */
--bg-surface:  #191B20;  /* modals, overlays, toasts, inputs                */
--bg-raised:   #202329;  /* hover fills, chips, badges                      */
--bg-active:   #252931;  /* selected rows, active tab fill                  */
--bg-scrim:    rgba(9, 10, 12, 0.55);   /* behind modals/overlays           */

--border:        #25282E;  /* hairlines between regions, 1px always         */
--border-active: #2D3038;  /* the hairline where it sits ON --bg-active (1.105:1 there; research 75 C4) */
--border-strong: #353943;  /* input borders, resize handles on hover        */

--text-primary:   #C9CACD;  /* names, values, body        (11.24:1 on canvas, under the transcript) */
--text-secondary: #9CA1AB;  /* labels, metadata            (7.10:1 on canvas) */
--text-muted:     #838996;  /* ages, counts, hints         (≥4.5:1 on canvas/sidebar/surface) */
--text-disabled:  #565B66;  /* disabled controls only — exempt from contrast */
```

Contrast rule: `--text-muted` passes 4.5:1 only up to `--bg-surface`. On `--bg-raised` or `--bg-active`, secondary information steps up to `--text-secondary`. Never place muted text on raised/active fills.

The person may turn this ramp (Phase 207, Settings then Appearance then Frame). The eight neutrals above, the five fills and the three hairlines, rotate by one hue offset in OKLCH, so perceived lightness holds within 0.005 at every hue and every ratio above holds at all 360 degrees; the accent, the state hues and the categorical hues never turn. The four text tokens follow the ground they sit on: kept as shipped on any dark ground, and solved dark to the same ratios once the canvas passes the luminance where black and white text tie, which no hue reaches on its own. The terminal foreground and its palette, and the editor's, follow the same rule since they are the same material.

The person may also MOVE this ramp (Phase 210, the same group). Two stops: the SHADE slides every neutral together, seven stops of 0.025 in OKLCH lightness, and the DEPTH multiplies each neutral's distance from the canvas, seven stops from 0.50 to 1.75. The shipped ramp is the pair 0 and 0 and writes nothing. The map is affine in lightness with a positive slope, so THE ORDER OF THE EIGHT NEUTRALS CANNOT INVERT at any stop, and that is what keeps `--bg-sidebar` below `--bg-canvas` and the hairlines above `--bg-active` everywhere. The three hairline ratios above are pinned AT THE SHIPPED SHADE AND DEPTH, because they are exactly what the depth moves: `--border` on `--bg-sidebar` reads 1.130 at the narrowest stop, the pinned 1.297 at the shipped one and 1.673 at the widest. Across the two axes the floor is instead PHYSICAL: adjacent rungs must render at least two eight bit levels apart. That is a floor on a rung still being a rung and not the shipped spacing, which is five at its tightest over the whole circle: one level is the least difference eight bits can express, so a pair one level apart is where `--border` on `--bg-active` already sits at hue 44, which section 1.10 records as not existing at all.

Not every pair of stops is offered. The dark end runs out of eight bits before the ramp runs out of room, and the light end would put the git decorations under 3:1 on `--bg-active`, which nothing here moves. So the region is a table measured over every whole degree, all three contrast levels and all four highlight schemes, and a stop outside it is REFUSED AT THE CONTROL with a few words rather than accepted and quietly clamped. The canvas reaches #020204 at the darkest offered frame and #1e1f23 at the lightest at the shipped hue, #1d2123 at the lightest over the whole circle, so near black is reachable and BLACK IS NOT: a black frame cannot carry a legible ramp in eight bits. That also puts the text flip out of reach at every offered frame, canvas Y 0.0147 at its lightest over every whole degree and 0.0138 at the shipped hue, against a flip at Y 0.1791, so the flip rule stays proved on a synthetic ground and a light mode is what would deliver it.

`npm run conformance:hue` is what keeps these three paragraphs true.

### 1.1b The light base (Phase 213, research 80)

A SECOND BASE PALETTE for every colour token, keyed on `data-scheme='light'` on the root (Settings then Appearance then Scheme: Light, Dark or Match the Mac; Dark is the default and derives nothing). It is designed on a paper ground and not inverted: on paper elevation is shadow, `--bg-surface` is a sheet ABOVE the paper, and hover, chips and the selected row press INTO it. The neutrals keep the dark ramp's OKLCH hue (268) and about its chroma, so the eight starting colours, the shade, the depth, the highlight scheme and the contrast level compose on top of this base through the same applier, and the text is solved DARK to the dark palette's own pinned ratios in the same hue, which is the flip rule of section 1.1 firing for real.

```css
--bg-canvas:   #f5f7fa;  /* paper, OKLCH L 0.975, not white                                */
--bg-sidebar:  #edeff3;  /* the frame, one rung under the paper                            */
--bg-surface:  #fcfcfe;  /* a sheet above the paper; the shadow carries the lift           */
--bg-raised:   #e5e7ed;  /* hover, chips, badges press into the paper                      */
--bg-active:   #d9dce3;  /* the selected row, the deepest fill, where decoration is measured */
--bg-scrim:    rgba(20, 23, 30, 0.40);   /* darkens; #9b9da2 over paper                    */

--border:        #d1d3da;  /* 1.299:1 on the sidebar (1.297 pinned)                         */
--border-active: #c1c4cc;  /* 1.271:1 on the active fill                                    */
--border-strong: #adb1ba;

--text-primary:   #353639;  /* 11.26:1 on canvas (11.24 pinned), 8.8 on active             */
--text-secondary: #4f535c;  /* 7.18:1 (7.10 pinned)                                        */
--text-muted:     #626774;  /* 4.5:1 solved on the sidebar: 5.27 canvas, 4.91 sidebar, 5.52 surface, 4.12 active */
--text-disabled:  #9297a4;  /* 2.72:1, exempt                                              */
```

Ramp order in luminance: surface > canvas > sidebar > raised > active > border > border-active > border-strong, rendered steps 7, 8, 8, 12, 9, 16, 20. Accent `#2175bd` (4.5:1 on paper as text, hover `#106ab2` darkens, text `#326da8`, `--on-accent` is the paper). Status: working `#2175bd`, attention `#976900` (one amber for dot and badge, paper text on it 4.51:1, 3.53 on active), idle and exited `#6e7482` (3.41 on active), failed `#c74a46` (3.40); EVERY DOT CLEARS 3:1 ON THE ACTIVE ROW, which the dark base left open. Git: modified `#64522d`, added `#2c6a3b`, deleted `#b62926`, renamed `#00487f`, conflict `#823c00`, ignored `#9297a4`, each keeping its hue and clearing 3:1 on `--bg-active`. Lanes 3 and 5 `#004f4e` and `#613374`, min consecutive dE2000 39.2. THREE OF THE GIT COLOURS ARE ALSO GRAPH LANES, being lanes 2, 4 and 6, and Phase 214 re-solved them for that job: research 80 solved each to its own pinned ratio and never against the others, which left the brown and the green 12.4 apart under protanopia against the dark base's worst pair at 21.2, so at six live lanes in one row the graph drew two branches as one colour. Paper's worst pair is now 36.1, being lanes 3 and 5 under deuteranopia, and every pair clears the 32 the rest of the palette holds; that is the worst over EIGHT model and deficiency combinations drawn from three published models, and the phase first published it as six because one of the six it ran was not modelling what it named (`build/p214/cvd.mjs` has the arithmetic); the added green moved furthest, dE2000 9.5, and its ratio on the selected row went 6.82 to 4.73. Feedback the same families; washes at the same alphas; shadows `rgba(20, 23, 30)` at .12, .14, .18 and .10; scroll thumb the ink at .65, .71, .97 and 1 (3.14, 3.55, 6.64, 11.26). `--file-icon-dim` 0.72.

**Paper carries one shade, so the Appearance face has no Shade row on this base** (Phase 214). The ramp above was solved AT its floors, so the accent could be text and the status dots could clear the selected row, and that leaves it nowhere to go: one stop darker takes `--accent-text` under 4.5:1 and both dots under 3:1, and `--bg-surface` already sits at OKLCH L 0.992 so one stop lighter puts the sheet and the paper both at white. Phase 214 measured what buying stops would cost, being three rows reachable at `--accent-text` 4.69 to 5.57 on the sidebar and the status dots 3.40 to 4.1 on the active row for every person on light forever, and the operator chose the colours over the stops. A control that cannot move is not shown, so the row is absent rather than present and inert and its refusal sentence goes with it. Depth still moves on paper, four stops of it, and keeps its own sentence. **The cost of hiding it, recorded so a later round is not surprised by it:** Shade sits above Depth, so on paper the Depth row rises into the rectangle the Shade slider occupies on graphite, both at x 513 y 420 in Settings. The shade a person holds on dark is safe because there is nothing on paper that writes it, but a click there lands on Depth and moves it, and the depth carried from dark is what it moves. The rows are not reordered, because putting Depth first would change the dark face too and the dark face is byte identical on purpose. **And the promise is about the whole group and not the rows alone**, which is what the committer's round fixed: Reset is the one Frame control this phase deliberately kept on paper, and it wrote all three fields whatever base it was pressed on, so a person on paper who nudged Depth and then pressed Reset had the shade they chose on dark put back to the shipped stop. It now writes only the axes the base draws, composed from the same two booleans the rows are, which is one sentence for the group: what a base cannot move, it does not touch.

The terminal on paper (section 1.6b): background `#f5f7fa`, foreground `#282a30` (13.36:1 against 13.29 pinned), cursor `#1e1f22`, selection `rgba(33, 117, 189, 0.30)`. The normal eight clear 6.5:1 in the dark palette's own hues, the bright eight are the same hues lighter and 50 percent more saturated at exactly 4.5:1, because xterm draws bold in the bright slot and bold text is text; every bright pair is at least dE2000 9.2 from its normal, where the vendor palettes read 0 to 6.4:

```
black   #353639   red   #a72a2b   green   #006814   yellow   #715500
blue    #025b9e   magenta #7e3f8f cyan    #006464   white    #51545c
brBlack #6a707d   brRed #ca4141   brGreen #008422   brYellow #936b00
brBlue  #4075a9   brMagenta #9c52bc brCyan #007f7e  brWhite  #282a30
```

Plus xterm's `minimumContrastRatio` at 4.5 on the light theme ONLY (1 on dark, which keeps dark byte identical): nine of the twelve registry agents hard code their colours for a dark ground, and the floor lifts them at draw time (Claude Code's `#ffd700` to `#837122`) without touching a cell. Which colours each agent hard codes, and so which read differently on paper, is the per agent matrix in research 80 section 1.

The dark base is byte identical with the scheme at Dark, proved by `npm run conformance:hue`, which also walks every rule above over the light base, pins the light offered region for the shade and depth sliders, scans every stylesheet and theme object for a colour literal that is not a token, and proves the status dot floor. `npm run probe:p213` is the app run.

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
--status-idle:      #8B93A1;  /* solid dot; shell prompt / agent quiet          */
--status-exited:    #8B93A1;  /* HOLLOW dot (1.5px ring); process ended, exit 0 */
--status-failed:    #E5655E;  /* HOLLOW dot; process ended, exit ≠ 0            */
--status-attention-badge-bg: #F5B84A;   /* count badges: amber bg…             */
--status-attention-badge-fg: #131417;   /* …with dark text (≥8:1)              */
```

**The two greys moved in Phase 218, and the reason is a floor rather than a taste.** They shipped at `#6E7583`, which reads 3.149:1 on `--bg-active` — 0.149 over the 3:1 WCAG 1.4.11 asks of a non-text mark — and they were in no floor family at all, so the Appearance frame controls could move the ground out from under them while their own neighbours were held. Over the 35 frames a person can choose they fell to **2.591:1 at Normal** (shade 2, depth 0, hue 134) and **2.193:1 at High** (shade -2, depth 3, hue 63), with **7 of the 35 under the floor at Normal alone and 19 at some contrast level**, one of them a single stop from the default. It was not a Phase 210 defect: at shade 0 depth 0, all Phase 207's circle offers, the pair already reached 2.701:1 at High.

`#8B93A1` holds the shipped chroma (OKLCH C 0.023, so it is still the near-neutral grey the design asks for) at hue 262 against the shipped 264, and lifts lightness from L 0.561 to L 0.661: worst **3.281:1**, on `#424238`, the lightest active fill any offered frame reaches, and 4.712:1 on the shipped fill. It sits ΔE2000 3.44 from `--text-muted` and 17.1 from `--status-working`, so it reads as its own grey and not as either. **This paragraph called L 0.661 the smallest lift that clears the floor, and the fix round refuted that.** The smallest is L 0.639, `#858C9A`, which reads **3.005:1** on `#424238` and keeps the same 35 cells, so a smaller answer works and the minimality was never measured. What was measured is why it is not the one taken: its 0.005 of margin is a ninth of the **0.047** one eight-bit level of that fill is worth, so a ground one level lighter takes it under, and it sits **ΔE2000 1.13** from `--text-muted` `#838996` — about one just-noticeable difference — so the idle dot and the metadata beside it would read as the same grey. `#8B93A1` carries 0.281 of margin, about six levels of that ground, at ΔE2000 3.44. Where it stops between those two is a **judgement and not a solved minimum**: `#88909E` already clears the floor by 0.158 and the muted text by 2.48. The offered region did not move by one cell — all 35 stay reachable, the shipped default included — and no other token moved. **The price, stated rather than hidden:** a passing colour must sit at relative luminance ≥ 0.26021 to clear 3:1 on the lightest active fill any offered frame reaches, and `--text-muted` sits at 0.2492, so the idle dot is now marginally *louder* than the metadata beside it (5.95:1 against 5.25:1 on the canvas) where it used to be quieter. There is no darker answer; the arithmetic forbids one.

**IDLE and EXITED stay one colour, and the lift moved three marks and not two.** They are told apart by shape — a solid disc against a 1.5px ring — and the ring is the thinner mark, so it needs the lift more, not less; the third is the unknown ring `.dot-none` at `globals.css`, which a group roll-up draws in `--status-idle` and which moved with it. Both tokens are pinned at 3:1 on `--bg-active` on both bases now (`STATUS_PINS_DARK` and `STATUS_PINS_LIGHT` in `src/renderer/theme/presets.ts`), and `npm run conformance:hue` rule 32 walks that floor over every offered frame on both bases. `--status-failed` is deliberately NOT pinned and reads **3.013:1** at the same binding frame — that is the colour High contrast actually paints, `#F45450`, and the resting `#E5655E` would read 3.073 on the same fill, which is the reading the fix round was handed and re-measured — pinning it costs the region nothing today, but it would make a 0.013 margin load-bearing, so it is recorded here instead and the next palette change must not take it under.

Status is never color-alone: WORKING = solid blue, NEEDS_INPUT = solid amber **pulsing**, IDLE = solid gray, EXITED = hollow gray, FAILED = hollow red, SAVED = solid gray + ↺ — shape + motion + color, plus a text label ("working", "needs input", "idle", "ended", "failed (exit N)", "saved"). Where the label lives depends on density: the identity strip and the attention overlay show it as visible text; session tabs and right-list rows (too dense for a label) carry it via tooltip and `aria-label`, and needs-input additionally bumps the name to weight 500 so the state survives without color.

SAVED is the restorable state (post-reboot / background-server-gone): the process is not running, but the session's scrollback snapshot and resume command are recorded and one click brings it back. It renders with the idle gray dot (`--status-idle`, solid — the session is dormant, not dead) plus a small ↺ mark (codicon `history`, 12px) after the dot on tabs and list rows. The restore ACTIONS live in the terminal region — the "Ready to restore" state (§3) and the Restore-all bar — because tabs and 24px rows have no room for an inline button. Restoring is always user-initiated — nothing auto-runs.

### 1.4 Git decoration colors (VS Code/Primer-familiar — earned familiarity)

```css
--git-modified:  #AF9C74;   /* M, a colour rather than a yellow since Phase 196 */
--git-added:     #6BC46D;   /* A and untracked U */
--git-deleted:   #E5655E;   /* D  */
--git-renamed:   #6CB6FF;   /* R  */
--git-conflict:  #F0883E;   /* merge conflicts */
--git-ignored:   #565B66;   /* dimmed name, no badge */
```

### 1.4b Commit-graph lanes (SCM History gutter only)

Six categorical hues for the History graph's swimlanes. All six are colour the
app already owns — `--accent`, three §1.4 git decorations, and two chromatic
normals from the §1.6 terminal palette — so the graph reads as gmux rather than
as a charting library dropped into the sidebar.

```css
--graph-lane-1: var(--accent);       /* #4D9DE8  blue                        */
--graph-lane-2: var(--git-deleted);  /* #E5655E  red                         */
--graph-lane-3: #56C2C0;             /* terminal cyan (§1.6)                 */
--graph-lane-4: var(--git-conflict); /* #F0883E  orange                      */
--graph-lane-5: #D19FE8;             /* terminal brMagenta (§1.6)            */
--graph-lane-6: var(--git-added);    /* #6BC46D  green                       */
```

Four rules, and they are the whole policy:

1. **Six, then cycle.** Minimum pairwise ΔE2000 falls off a cliff at seven
   (19.5 → 12.2, two blues colliding). The order above maximises separation
   between *consecutive* indices — the columns that physically sit side by side
   — at ΔE2000 42.5 minimum including the 6→1 wrap. Two columns sharing a hue
   are therefore always six columns (72px) apart.
2. **No yellow, ever.** `--git-modified` is ΔE2000 4.5 from
   `--status-attention` and terminal brYellow is 6.0. A yellow lane in the
   sidebar would read as "needs you", which is the one meaning §1.3 reserves.
3. **Lane colour is identity, never state.** It says "this is the same line of
   history" and nothing else. Merge-ness and HEAD-ness are carried by dot
   shape, and sync state by dot fill strength, so the graph still reads with
   every hue stripped out — which matters, because no six-hue categorical ramp
   survives red-green CVD on a ground this dark.
4. **Three roles borrow from the ramp rather than extending it.** HEAD's branch
   → lane 1, its upstream → lane 3, the merge base → lane 4. Cyan against the
   accent measures 64/60 protan/deutan separation, where the violet that VS
   Code pairs with blue measures 21/27 — and those two lanes are the entire
   point of the divergence picture.

Every entry clears 4.1:1 on `--bg-active`, the worst row background, against
the 3:1 WCAG 1.4.11 floor for non-text UI.

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
--font-ui:   -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
--font-mono: ui-monospace, Menlo, monospace;
--font-terminal: ui-monospace, Menlo, monospace;  /* xterm ONLY — verified native stack (Bug C); never conflated with --font-mono */

--text-2xs:  10px/16px;   /* chips and pills only: SHA chip, machine badge, .chip-sm (Phase 195) */
--text-xs:   11px/16px;   /* section labels (uppercase +0.04em), badges, ages   */
--text-sm:   12px/18px;   /* dense rows (tree, SCM), branch names (mono)        */
--text-base: 13px/20px;   /* default: session names, controls, body, filenames  */
--text-md:   15px/22px;   /* modal body emphasis, empty-state body              */
--text-lg:   20px/28px;   /* modal titles, empty-state titles                   */

--weight-regular: 400;  --weight-medium: 500;  --weight-semibold: 600;
--track-caps: 0.04em;   /* every uppercase micro label (Phase 195)             */
--track-tight: -0.01em; /* the markdown preview h1, and nothing in the chrome  */
```

- `--font-ui` has no `"SF Pro Text"` entry. Phase 78 deleted it from `tokens.css` because nothing on macOS is registered under that name, so `-apple-system` always matched first. Phase 73.1 deleted the same dead name from this block, which had kept it two rounds longer than the code.
- One family (system sans) carries all UI. **Mono is for terminal-adjacent truth only**: branch names, paths shown as paths, SHAs, commands, exit codes, keyboard shortcuts in the ⌘/ overlay — never as a "technical" costume on labels.
- Counts and ages use `font-variant-numeric: tabular-nums`.
- Terminal: `--font-terminal` at 13px, xterm `lineHeight: 1.25`, `letterSpacing: 0`. The stack is macOS-native and **verified, not bundled** (Bug C resolution, Phase 9.2). Phase 73.1 deleted `"SF Mono"` from the head of this stack, from `--font-mono` and from `--font-editor`, the work-area token Phase 78 added. Nothing on this Mac is registered under that name. It was measured the way Phase 78 measured `"SF Pro Text"`, being that a string set in it is exactly as wide as a string set in a family name that does not exist. Chromium does not implement `ui-monospace` either, so the face that actually renders is **Menlo**, and it rendered before the deletion too. Menlo covers the prompt-glyph gauntlet (➜ ✗ ● λ) at exactly one cell advance. The historical underscores were tmux substituting `_` for non-ASCII under a locale-less launchd env (fixed at source in `src/main/tmux/env.ts` + `tmux -u`), not missing glyphs, so the once-planned bundled JetBrains Mono was dropped as unnecessary. `--font-mono` stays the UI-mono token and xterm reads only `--font-terminal` (`resolveTerminalFontFamily()`) — the two are never conflated. Family + size become user-configurable when the deferred Settings → General terminal-font control lands (DESIGN-SPEC S13); it retargets this token.
- No display faces anywhere. Scale ratio ≈ 1.18; contrast between steps comes from weight (500/600), not size jumps.

### 1.9 Radii, borders, shadows, z-layers

```css
--r-sm: 4px;   /* buttons, inputs, badges, chips */
--r-md: 6px;   /* rows' selection fill, toasts, menus */
--r-lg: 10px;  /* modals, overlays */
--r-bar: 1px;  /* a 2px accent bar or tick, half its width (Phase 195)     */
--r-xs: 2px;   /* an inline mark on text, a 4px bar                        */
--r-pill: 8px; /* a 16px badge or switch track, half its height            */
--r-scroll-thumb: 5px; /* the scrollbar thumb, 3px of it transparent       */

--icon-sm: 12px;  /* codicon in a row's accessories, chips, chevrons          */
--icon-md: 14px;  /* codicon in row leaders, buttons, section headers        */
--icon-lg: 16px;  /* codicon in view headers, and the default (Phase 195)    */

--shadow-1: 0 1px 3px rgba(0,0,0,0.40);                    /* chips, tooltips  */
--shadow-2: 0 4px 16px rgba(0,0,0,0.45);                   /* menus, toasts    */
--shadow-3: 0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35); /* modals, overlays */

--z-titlebar: 100;  --z-editor-overlay: 300;  --z-modal: 500;
--z-attention: 600; --z-toast: 700;           --z-tooltip: 800;
```

Shadows always carry offset + blur (no zero-offset halos). Hairline borders are 1px `--border`; regions are separated by hairlines, not shadows. A border drawn ON a selected, pressed or hovered `--bg-active` fill is `--border-active`, because `--border` reads 1.013:1 there and does not exist (research 75 C4, Phase 197).

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
- **Editor: right split; overlay under the threshold.** Decision + justification: the dominant gesture is reviewing an agent's diff *while the agent keeps working* — side-by-side preserves supervision, and the terminal keeps its sidebar adjacency. Clicking a file opens the editor as a right split at 45% of the center area. **Phase 18 replaced the old 65% cap**: the editor is draggable from 320px (`EDITOR_MIN`) up to `workArea − 240px`, where 240 is `TERMINAL_FLOOR` — the terminal yields everything except a floor it may never go below, because a terminal laid out at ~0 width would reflow live panes to 2 columns. Every limit lives in `src/renderer/state/chrome-geometry.ts`. A **Fill the window** toggle (⇧⌘B, `screen-full` icon in the editor's tab-row actions) puts the sidebar and session dock away and gives the file the whole work row; it is an override that writes nothing, so leaving it restores the exact prior layout. When `contentWidth < 1400px` (+ the right session list's width when visible), the editor opens as an **overlay** covering the terminal area (`--z-editor-overlay`, slides in 200ms from right, scrim over terminal at 25%); Esc closes. The mode is automatic and never a user setting. Editor tabs row is 36px; since Phase 18 it sits INSIDE the editor's own box, 36px below the shared header band, because the session strip now spans the whole work area (§2.2 above) — the strip is the top-level navigation and the file's chrome lives under it.
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
| **Tree row** | 24px: chevron 12px · file-type icon 16px (§3.1) · name 12 · right: badge letter in git color | modified files: name tinted by git color; folders with dirty descendants: 4px propagation dot `--text-muted`, no hue, because amber is reserved for needs input (§1.3); ignored: `--text-disabled` |
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
| **Context menus** | native macOS menus via Electron `Menu.popup` — never DOM-drawn | session row, tab, SCM row, tree row, search result and the code editor all have one. Monaco's own `contextmenu` option stays FALSE and the editor's menu is composed natively beside its siblings (Phase 241) |
| **Tooltip** | 11px on `--bg-raised`, `--shadow-1`, 600ms delay | shortcuts shown as keycap chips (⌘T) in the UI sans — mono letterforms make "⌘O" read as "⌘0" |
| **Split pane header** | 24px bar atop each pane when a surface has ≥2 splits: agent icon 14 · name 12 · ⎇ worktree 12 · status dot 8 · × 14 on hover; the whole bar is the drag handle (`grab`/`grabbing` cursor) | focused pane: name `--text-primary` + 2px `--accent` left inset + 1px `--accent` inset ring around the pane; unfocused: `--text-secondary`; drag to strip/dock = pop out; right-click = session context menu + "Move to its own tab" |
| **Drop-zone overlay** | the target half of a pane while a session is dragged over it: `--drop-wash` fill + 1px `--accent` inset border | appears/disappears instantly — never fades over live terminals; absent when the surface holds 6 splits or a resulting pane would fall under min size |
| **Sidebar section header** | 24px sticky row: ▸/▾ chevron · 11/600 uppercase label · count · hover accessories, incl. `gripper` 14 `--text-muted` at far right | drag vertically to reorder sections (ghost of the header + 2px `--accent` drop line); order persists per view; Esc cancels; collapse (▸/▾) is independent of order |
| **Branch row (Branches section)** | 24px: codicon `git-branch`/`cloud`/`check` 12 · name mono 12 · `↑n ↓n` 11 muted right | current: `check` in `--accent` + name 500, click inert; local click → checkout; remote click → tracking checkout; busy: 12px spinner replaces the icon; hover `--bg-raised` |
| **Switch** | 26×16 track, radius 8px, knob 12px `--text-primary` | on: `--accent` track; off: `--bg-raised` + 1px `--border-strong`; disabled 50%, no hover; `:focus-visible` ring |
| **Hotkey recorder** | chip `[h:22]` min-w 96 on `--bg-raised`, r-sm: "Record shortcut" 12px, or assigned chord mono 11 + × on hover | recording: 1px `--accent` border + `--focus-ring`, text "Type shortcut…"; Esc cancels, ⌫ clears; conflict → 12px `--error` line below, chord not saved |

Iconography (round-1 reversal — Lucide retired): **@vscode/codicons** is the single UI-chrome set — activity bar, view toolbars, section headers, menus, chevrons, close buttons — rendered 16px (24px in the activity bar), coloured by `currentColor` from the host: an icon button rests `--text-secondary` (globals.css `.icon-btn`), and the activity bar rests `--text-muted` and steps to `--text-secondary` on hover and `--text-primary` when active (the §3 row above), because a 24px glyph at 5.05:1 carries the weight of a 16px glyph at 7.88:1 and the bar needs a hover step. Those are the two hosts and there is no third. No emoji, no mixed sets: the Lucide strokes from round 0 are removed entirely, not blended. Two sanctioned exceptions carry meaning codicons cannot:

- **Agent identity logos** (round 0's "text chips, not logos" rule is reversed — sessions are now identified by icon everywhere: tabs, right-list rows, identity strip, ⌘T modal, quick-create menu, attention overlay). Vendored to `src/renderer/assets/agents/` and normalized to 24×24 viewBox, single-color `fill="currentColor"` SVGs rendered at 16px **monochrome** — the color budget stays with state, and monochrome sidesteps brand-color clutter next to the amber signal. Map (agent id → source asset from specstory-sync): claude → claude.svg · codex → openai.svg · gemini → gemini.svg · amp → amp.svg (strip hardcoded `#4d4d4d` fills) · cursor → cursor.svg (flatten gradients to a solid silhouette) · droid → droid.svg (extract the glyph from the dark disc) · copilot → githubcopilot.svg · deepseek → deepseek.svg. Wave-2 marks (Phase 10.1 — no specstory-sync asset existed; registry doc §3 called for commissioning them): antigravity → antigravity.svg (peak mark traced from the vendor's PNG) · pi → pi.svg (vendor's blocky π mark, normalized) · muse → muse.svg and qwen → qwen.svg (marks commissioned in-house — beamed notes; faceted pinwheel — swap for vendor art if official monochrome marks appear). Plain shell and any unknown agent id → the codicon `terminal` glyph. All 10 launchable registry agents now carry a mark, so registry growth needs zero design work.
- **File-type icons** (material-icon-theme) in the Explorer tree (and only there) — see §3.1.

### 3.1 Third-party icon assets & licensing (verified 2026-08-09)

- **@vscode/codicons** (npm dep, present): icons licensed **CC-BY-4.0**, code MIT. Attribution required — ship a `THIRD-PARTY-NOTICES.md` and credit in the About panel.
- **material-icon-theme — the chosen file-icon theme** (npm dep, **MIT**, © Material Extensions; LICENSE verified in `node_modules/material-icon-theme` 2026-08-22). The considered alternative was Seti (`microsoft/vscode` → `extensions/theme-seti`, MIT; upstream `jesseweed/seti-ui`, MIT), which is VS Code's *literal* default theme — but Seti ships only as a glyph font + JSON inside the vscode repo (no npm distribution, blurrier at 16px than real SVGs, brittle to vendor), while material-icon-theme is the most-installed file-icon theme on the marketplace (reads as "VS Code" to this audience on sight), distributes versioned per-type SVGs drawn on a 16 grid, and carries its own filename/extension alias maps. A curated subset is embedded at build time (`file-icons.generated.ts`); matching mirrors VS Code (exact filename → dotted-suffix chain → extension → default). Folders carry the theme's **generic closed/open pair**, not its 122 per-basename variants (`folder-src`, `folder-test`, …): the tree resolves per-path icons for the file slot only, so a per-folder icon has no surface to attach to — the closed/open distinction is the whole folder vocabulary the row can express (Phase 11). Its per-type colors are kept as-is (a sanctioned theme const, same standing as the xterm/Monaco palettes in the S12 hex grep). Used in the Explorer tree only.
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
- Phase 80.1 adds a second authored moment. Entering or leaving session focus flies a still copy of the session surface for `--dur-panel` with `--ease-out`. It is a state change rather than perpetual motion, it never runs on load, and it never animates the live terminal's layout box, which is why it runs on a copy. On the way in the chrome fades out under the copy over the same `--dur-panel`. On the way out the chrome cannot fade with it, because it is not drawn until the swap, so it fades in for one further `--dur-panel` after the copy lands. Giving it its widths back any earlier would resize live sessions mid gesture.

## 6. Every empty & error state (copy is final; sentence case; no exclamation marks)

1. **First run / no projects.** **Phase 18.6 replaced this state with the home screen** (`src/renderer/app/HomeScreen.tsx`, specified in `docs/research/35-home-screen.md` §1). It is no longer an empty state: it carries the product's name, its own data and its own three verbs. One 460 px column, centred, contents left aligned inside it, holding the TORTIE.sh lockup, the promise "Sessions you start keep running even when Tortie is closed.", three action rows (Open project… `⌘O`, New project… `⇧⌘N`, Clone repository… with no chord), up to five recent projects, and the line "Drop a folder anywhere in this window to open it." Folder drop onto the window is unchanged. No accent fill and no visual primary: the order and the initial keyboard focus carry the rank. The same three verbs, in the same order, are behind the tab strip's + as a native menu and in the File menu.
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

## 12. The Redline (Phase 251, research 113 + 114) — the surface, and the room it is in

The Redline shipped in Phase 191, became a whole-document view in Phase 194 and grew a
press, an accept, a chip and a durable baseline over six phases after that — and it
**appeared in neither this document nor DESIGN-SPEC**. It does now, because Phase 251
changed what a person sees the moment they open one and a phase that changes a surface
writes its section.

The operator asked for it on 2026-09-09: *"for our redline view, I feel like we could
have more space and affordance in it and make it much more beautiful."* Research 113
measured the five faults he was looking at off the running app, research 114 drew three
directions as a working page, and he chose **Direction B, the column with margins**, and
**Seam** over Ribbon, on 2026-09-09. Everything below is that choice.

### 12.1 What the surface is

A prose file, drawn once, marked against **the version Tortie last read** — the shadow
baseline of Phase 225, durable since Phase 243 — and not against HEAD. It draws the
file's **source** and renders no markdown; rendering markdown with marks inside it is a
different and much harder feature and the operator confirmed the decision. Deletions and
insertions are told apart by **colour and a strikethrough**, and the wash behind them is
decoration and nothing more: it reads **1.152:1** and **1.223:1** against the canvas,
which is below every floor in the product, so any design that leans on the wash to say
which is which is leaning on a difference that is not there. Making it taller does not
promote it.

**Nothing new goes inside `.ed-redline-doc`.** Four readers walk that element — the copy
handler's clone, the shot probe's `leavesOf` and the two projection tests' parsers — and
each would read an inserted label as a run of the person's text. The rail, the chip and
the bar all live outside it, and so does anything a later round adds.

### 12.2 The page: two tracks, and the measure is the text's

The document sits in a page of `[rail] [column]`, `width: fit-content` centred in the
scroller, with the reading column carrying **`--redline-measure: 84ch` and the 48px of
inline padding OUTSIDE it**. The shipped rule was `max-width: 68ch` with the padding
inside, which delivers **62.1 characters**: the number in the stylesheet had never meant
what it said.

**Two sets of numbers describe this and they are not the same reading.** Research 114 §2
measured the mock — a real page on the product's own tokens and the product's own composer,
but not `RedlineDocument` — at 58.42% of empty canvas going to 45.45%, the document 1033.04px
to 885.38px of height, and the band either side of his text 396.1 / 396.1px to
322.6 / 290.6px. `npm run probe:p249` re-read every row off the **running view** at the
parent commit and at HEAD over its own fixture, and that is the honest proof: at the pane he
works in the document box goes **556.81px → 735.83px**, the text column 508.81 → 687.83, the
characters **62.7 → 84.8**, the empty canvas **58.72% → 45.45%**, the document height
**2062.41px → 1676.40px**, and the free canvas either side **415.1 / 425.1 → 341.6 / 319.6px**.
DESIGN-SPEC S5E carries both tables side by side. **Where the two readings differ this
section names which one it is quoting**, because the mock and the app run draw different
fixtures and a number with no source is the thing this document exists not to be.

**Both bands shrink together, and that is the whole point.** The design's first version
centred the page *including a reserved 264px margin*, which pushed the column 122px left
of centre and made the band to the right of his text **bigger** — 428.59px against
396.09px — which answers the opposite of the complaint. The page is the rail and the
column and nothing else; the chip lives out of flow in the canvas beside it rather than
in a track reserved for it. The column ends up **16px right of the pane's centre**, being
half the rail's width plus its gutter, which errs towards less canvas on the right, which
is the side he was looking at.

**The cost is named rather than buried.** 84 characters is nine over the measure prose is
normally held to, and it is a judgement and not a solved optimum: research 113 swept 68,
76, 84, 92, 100, 120 and no cap, and 84 is the row with the fewest wrapped marks. Letting
the document fill the pane buys 42% less height and costs a 158-character line and a mean
row fill of 52.1%, which is not a reading measure at all, so it is refused.

### 12.3 The wash: the line pitch less a 2px seam, and it is taste

A mark paints its **font box, 15.00px**, on a line pitch of **21.45px**, so there is a
**6.45px band of unpainted canvas between every pair of stacked fragments**. That band is
what makes a wrapped change read as a stack of ragged tiles, and it is the only thing in
the reading that produces one: the corners are already sliced, and the fragments are
flush left and ragged right, which is the shape of a paragraph and is correct. Padding a
mark vertically until its painted height *is* the pitch closes it, and the run becomes one
continuous shape.

**Seam paints the pitch less 2px — 19.44px painted, a 2.01px seam — and Ribbon closes it
to 0.01px. THE CHOICE BETWEEN THEM IS TASTE AND IT IS THE OPERATOR'S**, made on
2026-09-09, and nobody may later dress it as a measurement. There is no measurement to
find: inline padding is uniform, so the gap between two fragments of one run and the gap
between two different marks are **the same number at every setting** — 2.01px in Seam,
6.45px in Tiles, 0.01px in Ribbon — and CSS offers no selector that can see that two
boxes are on different lines. The hairline is canvas at 1.15:1 besides, so it could not
carry meaning even if it could be made to appear.

Two things are refused with it. **A wrapped mark cannot be given one rounded outline
following its own ragged silhouette**: an inline box that breaks paints one background
box per fragment, and `box-decoration-break: clone` gives every fragment all four corners,
which is more tiles rather than fewer. A silhouette needs one positioned box per fragment
or an SVG path recomputed on every reflow, against a view that mounts its whole document.

**The height rests on a font metric and that is a stated limit.** `--redline-fontbox` is
`calc(var(--text-base) * 1.1539)`, right for `-apple-system` at 13px on this machine and
derivable from no CSS expression — `em`, `ex`, `cap` and `ch` are all glyph measures and
CSS exposes no unit for a line box's content area. The two failure modes are not
symmetric: too small and the band comes back, which `max(0px, …)` guards; too large and
the washes of adjacent lines **overlap**, which is the tiles defect inverted into ink over
the neighbouring line, and no arithmetic guards it. That side is guarded by a **reading
off the running app**, because a stylesheet reading cannot see a face substitution.

### 12.4 The current change is one bar in the rail

Chromium paints an outline once per inline **fragment**, so the ring Phase 227 drew on the
change's wrapper became a stack of boxes exactly where a wrapped change is widest, and both
readings below are driven over **every** change rather than over whichever one happened to
be current: **23 outlined boxes on one change at the pane he works in and 43 at the panel's
floor** on the mock, and **37 and 74** on `probe:p249`'s own fixture off the running app,
which is a longer document. Both go to **0**. It is now one
absolutely positioned **2px `--accent` bar in the rail**, from the change's first client
rect's top to its last one's bottom: one element while a change is current and **zero at
rest**. `--accent` on the canvas reads 6.406:1 on graphite and 4.504:1 on paper, both
clear of the 3:1 a non-text mark is held to.

**The rail never collapses.** The design's first version set it to zero at the panel's
floor and scoped the outline that would otherwise replace it to the old look, which left
the current change marked by **nothing at all** at the one width where the outline is
worst — Phase 239's shape 4 dropped. It narrows to a bar's own **3px** with a 4px gutter
instead. It costs the column seven pixels at the floor and keeps one mechanism at every
width.

### 12.5 The controls: a bar on the column's grid, and a chip with two arms

**`Accept all` was 419.1px from the column it acts on, and the button's placement was
never the fault.** The bar was justified against the *panel* while the column was centred
inside it, so the button's distance from the thing it acts on **was** the right-hand dead
space: 355.32px at 1349px, 30.32px at 699px, and at the floor it sat over the column
because there was no dead space left. The bar's inner box now takes **the page's own
tracks**, so both of its ends land on the column at every width — read off the running app,
**419.1px → 0.0px** at 1349, 94.1 → 0.0 at 699 and 28.0 → 0.0 at the floor, where the mock
predicted 414.1 → 0.0 —
and a `N of M changes` counter sits at the other end of the same cell. The two grids are
two copies of one fact, so `conformance:redline` rule 37 reads both out of the stylesheet
by matching braces and fails if they ever drift: a bar twelve pixels out of step with its
column still looks exactly like a bar.

The counter says **how many changes there are until a person goes to one, and where they
are once they have** — `13 changes`, then `1 of 13 changes`. Phase 236's rule is that the
resting face draws no control and names no change, and a counter that said "1 of 13"
before anybody had gone anywhere would be naming a place the person is not in.

**The chip has two arms and ONE decision between them, asked with ONE number.** It goes in
the free canvas beside the column **whenever that canvas holds the chip's own drawn
width** where the chip would be put. Read off the running view, it takes the band at 1349
on both bases and covers **0** rows of prose there, and the overlay at 699 and 319 covering
1 and 2, against 2 rows covered at every one of the six cells at the parent commit; the chip
says which arm it took on its own `data-arm`, because a chip placed perfectly in the band
covers 0 rows and so does a chip that was never drawn at all. The test and the placement are the same arithmetic —
ask for the width plus the gutter, then place at the gutter — so an accepted chip really
fits, and **a re-labelled button moves the answer by itself**: the product's chip is
258.28px and takes the band at a scroller of **1316.39px**, being a panel of about
1326px, while the same four buttons relabelled at 299.07px do not, at the same pixel. The
design's first version gated it on a `data-room` ladder at 1060px while the placement
asked whether a 264px track was at least 200px wide: two undeclared numbers and a 264px
cliff on one pixel of drag.

**The overlay arm is required and is not a fallback anybody may delete.** Research 96 and
research 113 each measured **0.00px** of free canvas at the editor panel's own floor, so
at 319px there is nowhere else for the controls to be, and the chip falls back to exactly
the placement Phase 236 shipped: above the change's first line box when there is room and
below it when there is not, clamped inside the page.

**The chip is a child of the page in BOTH arms**, which is why its `scroll` listener is
gone: it is inside the scroller now, so it scrolls with the document it belongs to and
nothing has to put it back on every scroll event. That makes `.ed-redline-page` the
containing block and `.ed-redline-view` no longer the only positioned box in the view — a
fact stated in `redline-chip.tsx`, `RedlineDocument.tsx` and `redline.css`, which move
together.

**Every one of Phase 236's four rulings stands.** The anchor is `getClientRects()[0]` and
never the bounding box, which would point 435.73px into empty margin at a wide pane. A
control per change in the flow is refused, at 45.12px of sideways push. A chip that takes
focus is refused, because `focusedChange` reads `document.activeElement`. And the chip is
out of flow, because that moved the document by 0.00px. **`Accept all` still has no
chord** (Phase 238's own ruling: nobody is ever one keystroke from accepting everything)
and the counter is not a menu item, so no native menu moved.

### 12.6 The leaf rules, none of which moves a byte

Four rules about what a mark **paints**, all of them read at the leaves, so both
projections — the drawn runs with the insertions dropped are the old file byte for byte,
and with the deletions dropped the new one — are unchanged:

1. **No wash on a mark with no letter and no digit** that is not whitespace, being a
   table's `|` and its `---`. It keeps its colour and its strikethrough.
2. **No wash on a whitespace mark that is not a spacing change**, which is a deleted
   line's own trailing newline riding along and painting a bar past the last glyph.
3. **A change must carry ink.** Rules 1 and 2 together drew one of the commonest prose
   edits there is — a blank line added or removed — as **nothing at all**, while the
   counter, the chip and ⌥↓ all still treated it as a change and offered Rewind and
   Accept on it. A whitespace mark whose change holds nothing a reader can read draws a
   **2px bar in its own colour, through a pseudo-element**, so it adds no node, no text
   node and no leaf, and the four readers of the document see what they see today.
4. **A deletion and an insertion of the same bytes collapse to one unchanged run**, which
   is exactly equivalent on both projections.

**Ruling 5 stands exactly and no wider.** A whitespace mark that *is* a spacing change
keeps its wash, because in a standalone document nothing else can say that a spacing
change happened; it loses only the strikethrough, which had no glyph to draw on.

### 12.7 A table is diffed row against row

7.7% of a file produced **52% of its changes and 39% of its mounted elements**, and a
reader was shown word-level edits between cells from different rows, because the composer
diffs one flat character stream and the tokeniser pairs words across row boundaries. A
change block whose every line is a table line is now aligned **row against row** by an
order-preserving resemblance LCS at 0.5, and each paired row is word-diffed on its own.

**Never by the first cell.** A renamed label column is the commonest table edit there is,
and a first-cell key cannot pair a row whose first cell is what changed, so it degrades
every row to a whole-row deletion beside a whole-row insertion — a *worse* picture than
the flat stream it replaces. **The word budget is the block's** and not the row's, which
is what `REDLINE_MAX_EDIT_LENGTH` promised. And `tableRuns` has a refusal of its own at
**60 rows a side**, because unlike the word differ it answers on every input there is.

**A redlined table cannot be made to line up**, and that is refused rather than deferred:
a drawn line carries both versions' characters and therefore neither version's grid. The
wider measure makes it more visible, not less — the spread of a table's closing pipes goes
**427.9px → 593.4px**, because at 62 characters the rows were wrapping and being clipped
by the wrap. That is the honest cost of the room.

### 12.8 The limits, said out loud

- **`--error` on its own wash falls under 4.5:1 at 8 of the 35 offered dark cells**, worst
  **4.135** at shade 2, depth −3, hue 73, with the shipped default and the whole light
  region clear. It is a pre-existing defect that this design makes more *visible* and not
  more wrong, and **the operator chose on 2026-09-09 not to pin it in this phase**: a pin
  is affordable, taking the dark region 35 → 27 with the default surviving, and the
  cheaper answer is to derive the wash from the canvas the way the neutrals are derived,
  which costs no cell. Both are palette decisions. §1.3's floors do not move.
- **A table over 4,000 characters is not fixed**, because the row path sits inside the
  character cap: it is skipped exactly as it is today and the note says so. That is
  **46 of the 1,951 markdown tables in this repository**, including one in this document
  at 8,231 bytes and one in `docs/BACKLOG.md` at 22,283 bytes.
- **Some rows are worse, and the app run corrected which ones.** Research 114 §2
  predicted, off the mock, that at the panel's floor five mark fragments would pass the
  column's content edge against three today and the document would be 42.89px taller.
  Read off the RUNNING app over `probe:p249`'s own fixture, the floor goes the other way —
  **5 crossings against 12** — and it is the **wide pane** that is worse, **4 against 2**,
  with the worst overhang 2.47px → 3.58px. Every one of the four ends on **whitespace**
  and not one on a visible character, which is research 113 §5.3's own mechanism
  re-derived rather than quoted: `pre-wrap` paints a preserved space or newline at a wrap
  point past the last glyph. What IS worse at the floor is the column, **261.00px →
  254.00px**, being 32.2 characters to 31.3, and the document **3392.02px → 3499.25px**,
  and both are the seven pixels the rail refuses to give up (§12.4). At the pane he works
  in the document is **2062.41px → 1676.40px**, which is 18.7% less to scroll.
- **The wash's height rests on a font metric** (§12.3) and a face substitution moves it.
- **A horizontal scroller for a wide block is not taken here**; it is Phase 248's ruling.
- **The view still mounts its whole document.** There is no virtualizer, so anything that
  adds DOM per change multiplies against every change in the file, which is why the bar
  is one element and the ink rule is a pseudo-element.
