# Research 75: the chrome's visual language, and what premium would actually mean here

Written 2026-09-01 against the tree at `bd68cf4`. The ask, in the operator's words, is to make the
full app chrome more premium, being the lines, the typography, the weights of the icons, slight
fades and colouring, and the edges, which he likes and wants kept. He said plainly that nothing
moves. He named VS Code's recent repaint and a Ghostty terminal window as references and said he
particularly likes the Ghostty one. He asked for the best interfaces to be studied rather than
guessed at, for three options with mocks, and for it to be thought about deeply.

Everything below is measured. The colour arithmetic in this document is a hand written sRGB to XYZ
to Lab to OKLCH implementation with CIEDE2000, no library, and it is checked before it is used: it
reproduces the four figures `src/renderer/styles/tokens.css` already records for itself, being the
terminal foreground at 13.29:1, the solid accent at 6.41:1, `--git-modified` at ΔE2000 4.5 from
`--status-attention`, and xterm brYellow at 6.0. So when a number here disagrees with a number an
earlier draft carried, the disagreement is the finding.

The four mocks exist and were driven in a real browser, not described:

| File | Renders | Frame | Self contained |
| --- | --- | --- | --- |
| `docs/research/assets/75-chrome/control.html` | yes | 1400 x 880 exactly | 0 external references, 53 inline SVG icons |
| `docs/research/assets/75-chrome/option-a.html` | yes | 1400 x 880 exactly | 0 external references, 66 inline SVG icons |
| `docs/research/assets/75-chrome/option-b.html` | yes | 1400 x 880 exactly | 0 external references, carries a before and after toggle |
| `docs/research/assets/75-chrome/option-c.html` | yes | 1400 x 880 exactly | 0 external references, 24 inline SVG icons |

No mock reaches the network, no mock depends on the codicon font, and each one's computed custom
properties were read out of the live document and matched against the token diff its plan claims.
All three matched.

---

## 1. The rule that decides whether any of this is good

A visual language that could belong to any editor is decoration, and decoration fails here. The
test is `docs/ZEN-OF-TORTIE.md`. Four of its beliefs can be stated as a look, and the useful thing
about them is that three of the four are measurable rather than a matter of taste.

**B1, the work is the page and the app is not.** "Keep the work alive. Keep the machinery
invisible." (Zen 3 to 5.) DESIGN.md:7 says the terminal is the page and that the terminal canvas and
the app chrome are the same material with an identical background, "so the app disappears into the
work". The measurable form: the brightest thing on screen is the session transcript, and every piece
of chrome sits below it.

**B2, the glance answers one question.** "The interface should answer one question at a glance: What
needs me now?" (Zen 39 to 41.) DESIGN.md:7: colour is spent on exactly one thing, being state, and
"an amber dot that says 'needs you' is the loudest object in the interface". The measurable form:
amber has the top of the loudness ladder to itself, and the minimum ΔE2000 between
`--status-attention` and every other hue that can appear on a resting screen is large.

**B3, one animal in several colours.** "The patches stay distinct" and "not one of them is a separate
cat." (Zen 51 to 52.) DESIGN.md:181: "regions are separated by hairlines, not shadows." The
measurable form: division is carried by one hairline value and by a material step, and the hairline
is actually visible against every plane it can divide.

**B4, not clever where it could be dull.** "Anything durability critical should be boring,
inspectable and older than this product." (Zen 168.) The form here is not measurable and it is the
one that decides the feel: premium is consistency, being one icon rest value, one radius family, one
tracking rule, one type scale, aligned optical columns. Nothing that shimmers, sweeps, lifts or
breathes.

Two more that only forbid. **B5, not a dashboard**, so no ornament that implies measurement, which
rules out Ghostty's chevron status segments carrying accents of colour. **B6, borrow the shape**, so
a practiced VS Code hand must still find the rail, the tree row and the selected pill, because the
Zen prices attention as the scarcest thing in the product.

---

## 2. The chrome as it is today, and the eleven places it contradicts itself

These are ordered by how much they cost. The first two are the same defect wearing two hats, and
between them they are the reason a person can look at Tortie beside Ghostty and feel the difference
without being able to name it.

### C1. The chrome's text is brighter than the agent's output

| | hex | relative luminance | contrast on `--bg-canvas` |
| --- | --- | --- | --- |
| chrome `--text-primary` | `#e8eaed` | 0.8212 | 15.28:1 |
| terminal foreground | `#d8dbe2` | 0.7075 | 13.29:1 |

The machinery is 16.1 percent brighter in luminance than the work. A session name, a filename and a
commit subject all outshine the thing the window exists to show. This is the direct inverse of
DESIGN.md:7.

It gets sharper. `--text-primary` is `#e8eaed` and the terminal's own `brightWhite` in
`src/renderer/terminal/theme.ts` is `#E8EAED`. They are the same bytes. The top of the luminance
ladder currently has two occupants and one of them is the sidebar. 185 rules across 43 files read
that token.

An earlier draft of this study put the figure at luminance 0.9326 and 17.0:1 and called the gap 32
percent. 0.9326 is the OKLCH lightness of that colour, which is a different quantity, and the
contrast figure derived from it is wrong. The direction survives and the magnitude does not, which
matters, because a 16 percent step is a small safe correction rather than a dramatic one.

### C2. The chrome's ground is brighter than the canvas, so the active tab is a well

`--bg-sidebar` `#17181c` has relative luminance 0.00919 against `--bg-canvas` `#131417` at 0.00701.
The frame is 31.2 percent brighter than the page. In OKLCH lightness the ramp runs
canvas 0.1915, sidebar 0.2097, surface 0.2308, raised 0.2640, active 0.3006, and every plane in the
app sits above the page.

The consequence nobody had stated: the active session tab is filled with `--bg-canvas` on purpose so
it melts into the session below it (DESIGN-SPEC:318), and because the band around it is lighter, the
active tab reads as a hole rather than as a tab. Ghostty's active tab is the one thing lifted off
its bar. Tortie's is the one thing sunk into it. Same geometry, opposite sign. This is the single
finding that best explains the reference gap, and it is one token.

### C3. Amber is not alone at the top

ΔE2000 from `--status-attention` `#f5b84a` to every hue that can sit on a resting screen:

| token | ΔE2000 to amber |
| --- | --- |
| `--git-modified` `#e2b340` | **4.45** |
| `--git-conflict` `#f0883e` | 17.41 |
| `--git-added` `#6bc46d` | 34.59 |
| `--git-deleted` `#e5655e` | 35.47 |
| `--git-renamed` `#6cb6ff` | 49.65 |
| `--accent` `#4d9de8` | 51.48 |

The minimum is 4.45 and the runner up is 17.41, so one token is the whole problem. tokens.css
already knows: lines 76 to 80 refuse a yellow commit graph lane because "`--git-modified` is ΔE2000
4.5 from `--status-attention`" and "a yellow lane in the sidebar would read as 'needs you'". The
Architecture view forbids amber outright.

And then the Explorer draws it at full strength anyway. `src/renderer/tree/use-tree-model.ts:243` to
`:245` forces the dirty descendant dot to `opacity: 1` with the comment "DESIGN.md §3 asks for the
amber itself". So at rest, with no agent needing anything, a full strength amber dot appears in the
sidebar meaning "a file under here changed", four ΔE from the one colour reserved for "an agent needs
you". This is the sharpest self contradiction in the product and it is worth fixing whatever look he
picks.

### C4. The hairline he likes is invisible on a selected row

`--border` `#2a2d34` measured against each plane it can divide:

| plane | contrast |
| --- | --- |
| `--bg-canvas` | 1.336:1 |
| `--bg-sidebar` | 1.287:1 |
| `--bg-surface` | 1.223:1 |
| `--bg-raised` | 1.114:1 |
| `--bg-active` | **1.013:1** |

At 1.013:1 the hairline does not exist. DESIGN.md:181 says regions are separated by hairlines and
not shadows, and on the app's own selected fill the hairline has nothing left. Two shipped call
sites already work around it by switching to accent, being `.ctx-row.selected` in
`src/renderer/context/context.css:333` and `.agent-tile.selected` in
`src/renderer/app/agent-grid.css:149`.

### C5. Two rest values for one icon set, and DESIGN.md states both

DESIGN.md:264 says codicons render at "`--text-secondary` at rest via `currentColor`". DESIGN.md:237
says an activity bar item is "inactive `--text-muted`; hover `--text-secondary`". The shipped code
follows both: `.ab-item` rests `--text-muted` at `src/renderer/styles/app.css:258`, and `.icon-btn`
rests `--text-secondary` at `src/renderer/styles/globals.css:183`. On the sidebar that is 5.05:1 and
7.88:1, which is a visible difference in weight between two icons in the same window. He asked
specifically about the weights of the icons, and this is the answer: they have two.

### C6. Twenty six unnamed radii beside a three step family

141 declarations read the family, being 100 `--r-sm`, 36 `--r-md` and 5 `--r-lg`. Beside them sit 26
pixel literals across six values, being 1px x9, 2px x5, 8px x4, 4px x4, 6px x3 and 5px x1. Three of
those duplicate a token exactly and one, the 5px, matches nothing.

### C7. Thirty three unnamed font sizes, one of which is a real sixth step

521 `font-size` declarations in the renderer. 488 go through the scale and 33 are pixel literals: 10px
x10, 12px x6, 11px x5, 13px x4, 15px x3, and one each of 9, 14, 16, 19 and 24. The 12, 11, 13 and 15
literals equal a token already. The 10px group is different: it is used ten times, always on a chip
or a pill, and it is a real sixth step of the scale living under an assumed name.

### C8. Thirty two tracking declarations across nine values, none of them named

`0.04em` x19, `0` x4, `0.08em` x2, `0.02em` x2, and one each of `normal`, `inherit`, `0.12em`,
`0.06em` and `-0.01em`. Uppercase micro labels are set at `0.04em`, which is tight for caps at 11px.

### C9. Seven icon sizes for one glyph set

186 `<Codicon>` instances: `size={14}` x68, `size={12}` x59, `size={16}` x37 plus 15 more taking the
16 default, `size={24}` x3, `size={11}` x2, `size={18}` x1, `size={10}` x1. Four outliers, and each
of the four would move a box by a pixel or two if changed, so they are a separate decision.

### C10. A chrome token colours the terminal's cursor

`resolveTerminalTheme()` in `src/renderer/terminal/theme.ts` overrides the cursor with
`--text-primary`. The cursor belongs to the work, so if the chrome ramp ever steps down, the cursor
follows it down for no reason. `theme.ts` already holds its own `#E8EAED` constant for the cursor.

### C11. `--text-muted` on `--bg-active` is 3.88:1

Below the 4.5:1 floor. tokens.css already records that muted "passes 4.5:1 only up to
`--bg-surface`", and there is a rule forbidding it above that, so this is a documented limit rather
than a live bug. It is listed because two of the three options change it and one of them makes it
worse.

### What today already does right, and no option may lose

Verified in the control mock and in the tree. The one material claim holds at the band, the sidebar
and the tab row. There is one 36px band, one hairline and exactly one sanctioned interruption
(DESIGN-SPEC:29). The focused band line turning accent is a quiet focus signal that costs no
element. Nothing floats: `grep` for `backdrop-filter`, `vibrancy` and `visualEffectState` across
`src/` returns **zero** hits, so no translucency exists to remove. State survives greyscale, because
ended is a hollow ring, needs input bumps the name to weight 500 as well as pulsing, and saved
carries a glyph. And the selected row is already the VS Code move, being `--bg-active` with no
border and a 2px accent inset.

---

## 3. What "premium" is made of, measured

Four mechanics, and only the first two are colour.

**The luminance order.** The eye reads whatever is brightest as the subject. Ghostty reads expensive
because its monospace content is the brightest thing in the window by a wide margin and everything
else is far below it. This is the only mechanic that can be fixed with a single token, and it is
currently inverted twice, at C1 and C2.

**The chroma budget at rest.** Ghostty's icons are uniformly low contrast and its colour appears in
small accents. Tortie's resting field can carry, at once, git tints on filenames, git status letters,
up to six commit graph lane hues, ref pill colours, the accent on the active tab and the SCM badge,
and eight agent marks. The budget has one legitimate holder and the count of everything else should
fall.

**The uniform stroke.** One icon rest value and one optical size across the whole chrome is the
loudest single tell in the Ghostty reference, and it costs nothing in a codicon only set. Tortie has
two rest values (C5) and seven sizes (C9).

**Consistency of the small decisions.** One radius family meaning one thing, tabular numerals on
every number, aligned optical columns, one tracking rule for caps. Invisible when right, cheap
looking when wrong. 26 stray radii and 32 unnamed tracking values are the current state.

### What must be refused, and the first one he will ask for by name

**The vignette cannot be taken.** In Ghostty the window is one terminal, so a soft radial vignette
shades the edge of content that is uniformly bright. In Tortie the ground **is** the terminal
background: `--bg-canvas` is the xterm background by the one material rule and is mirrored in
`src/shared/window-chrome.ts` and `src/renderer/terminal/theme.ts`. A vignette therefore either sits
under live output, which makes the same glyph two different colours depending where the pane is, or
it sits over the work as a decoration layer, which "hide the machinery" forbids. It could only live
on a surface that never carries terminal output, being the home screen or the settings window, and
it buys very little there.

**Vibrancy, translucency and a blurred chrome are all refused.** None is used today. Any of them
makes the chrome a different material from the terminal, puts the person's wallpaper behind the
amber dot so the loudest object's contrast becomes unpredictable, and costs compositing on a window
that may run six WebGL terminals.

**The lifted active tab is refused, and this is the important one.** Tortie must take Ghostty's
flatness of the *inactive* tab, which it can adopt exactly, and must not take the lift of the
*active* one. Tortie's active tab melts into the canvas so the tab and the session below it are one
material, which is a stronger statement of Ghostty's own idea than Ghostty makes. Fixing C2 is what
makes that statement legible; lifting the tab would throw it away.

---

## 4. The three options

All three are token diffs. None moves a pixel, adds a surface, adds a package or renames a
`gmux-*` class.

### The test that separates them

Every candidate `--text-primary` was pushed through the real derivation. `src/renderer/theme/derive.ts:178`
lifts text as `L' = L + (1 - L) * t`, with `t` of 0, 0.08 and 0.16 at the three contrast levels.
`src/renderer/theme/derive.ts:175` spreads backgrounds as `canvas.l + (color.l - canvas.l) * k`, with
`k` of 1.0, 1.22 and 1.45. The transcript's foreground is never lifted at all, because it is a
constant in `theme.ts` and no scheme or contrast level touches it, so its luminance is fixed at
0.7075 in every one of the twelve palettes. That fixes a hard ceiling.

| `--text-primary` candidate | normal | raised | high | stays under the transcript |
| --- | --- | --- | --- | --- |
| today `#e8eaed` | 0.8212 | 0.8372 | 0.8452 | **no, at all three levels** |
| A `#c9cacd` | 0.5907 | 0.6173 | 0.6445 | yes |
| C `#d0d2d5` | 0.6431 | 0.6710 | 0.6924 | yes |
| B `#cfd3da` | 0.6492 | 0.6707 | 0.6988 | yes, and it is the ceiling |
| one step above B, `#d3d7de` | 0.6772 | 0.6988 | 0.7207 | **no, it passes at high** |

B's value is genuinely the brightest chrome ink that survives the contrast lift, and I found the
same boundary independently. That is a real piece of engineering in B's plan.

The twelve palettes reduce to three cases and not twelve, and the reason is structural rather than
lucky. `SCHEME_TOKENS` in `src/renderer/theme/presets.ts` is the eight accent family tokens only, so
no highlight scheme can touch a neutral, a text step or a git decoration. Every value all three
options change is already a member of `CONTRAST_BG`, `CONTRAST_BORDER`, `CONTRAST_TEXT` or
`CONTRAST_CHROMA`, so no option needs to add a name to those lists. This holds for all three.

### Option A, the quiet frame

**Zen belief:** B1, the work is the page. It is the only option that answers both halves of it.

**The diff.** Eleven values changed, one added. Only lightness moves on the neutrals, so hue and
chroma are untouched and the ramp stays one family.

| token | before | after | why |
| --- | --- | --- | --- |
| `--bg-sidebar` | `#17181c` | `#0e0f13` | the move: from OKLCH L 0.2097 above the canvas anchor to 0.1692 below it |
| `--bg-surface` | `#1b1d22` | `#191b20` | follows down, so a modal still reads as opened rather than as a pale island |
| `--bg-raised` | `#22252b` | `#1d2026` | hover keeps its step on the new ground |
| `--bg-active` | `#2a2e36` | `#252931` | selection softens so the accent inset carries the signal |
| `--border` | `#2a2d34` | `#25282e` | the band hairline held at its exact current strength against a ground that moved |
| `--border-strong` | `#3a3e48` | `#353943` | same treatment |
| `--text-primary` | `#e8eaed` | `#c9cacd` | 15.28:1 to 11.24:1, one clear rung under the transcript |
| `--text-secondary` | `#a8adb8` | `#9ca1ab` | 8.19:1 to 7.10:1, so the token's own documented 7:1 stays true |
| `--text-muted` | frozen | frozen | it holds the 4.5:1 floor and has 303 users |
| `--git-modified` | `#e2b340` | `#af9c74` | ΔE2000 to amber goes 4.45 to 17.36 |
| `--focus-wash-idle` | `rgba(34,37,43,.5)` | `rgba(29,32,38,.5)` | it is `--bg-raised` sampled by hand, so it follows its source |
| `--file-icon-dim` | new | `0.55` | an opacity, outside the colour machinery entirely |

Rule changes, no tokens: one icon rest value everywhere (fixes C5); hue leaves the filename and lives
on the badge letter; the dirty descendant dot loses its hue and the shadow root override at
`use-tree-model.ts:243` is deleted with it (fixes C3); the terminal cursor stops reading
`--text-primary` and keeps `theme.ts`'s own constant (fixes C10); the scroll thumb ramp does not move,
because re-sampling it from the new text ramp would put rest at 2.76:1, under a 3:1 floor that
tokens.css already fixed once.

**What I verified.** Every claim in A's plan reproduced. The hairline preservation is exact: 1.287:1
on the old sidebar and 1.297:1 on the new one. The sidebar's own steps grow rather than shrink,
being hover 1.155:1 to 1.174:1 and selection 1.303:1 to 1.314:1. The retuned `--git-modified` holds
ΔE 17.36, 18.02 and 18.85 across the three chroma lifts, clears 7.14:1 on the new sidebar, 6.08:1 on
raised and 5.44:1 on a selected row, and stays ΔE 21.88 from `--text-secondary`, so it is still
visibly a colour rather than grey. The plane ramp stays monotone above the canvas: sidebar 0.169,
canvas 0.191, surface 0.222, raised 0.243, active 0.280.

**Cost against the photograph probes.** Every screenshot diff of the band, the tab strip, the tree
and the SCM panel changes, because the ground under all of them changes. `smoke:t1` and `smoke:t3`
are unaffected structurally, since no geometry moves, but any committed reference photograph has to
be regenerated in the same commit. Nothing else in the battery cares.

**What it will not fix.** C6, C7, C8 and C9 are untouched, being the radii, the unnamed sizes, the
tracking and the seven icon sizes. C4, the invisible hairline on a selected row, stays at 1.013:1.
And one cost A does not name in its own plan: the hover step on `--bg-surface` shrinks from 1.098:1
to 1.056:1, so an agent tile answering the pointer becomes about a third quieter. That is a real
regression and it is fixable inside the option by taking `--bg-raised` up two or three values.

### Option B, the printed page

**Zen belief:** B1 again, but only its text half, paid for out of DESIGN.md:164, which already says
"contrast between steps comes from weight (500/600), not size jumps". B does to colour exactly what
that line does to size.

**The diff.** Three colour values, and nine new names for values the chrome already draws.
`--text-primary` to `#cfd3da`, `--text-secondary` to `#9ba1ad`, `--text-muted` unchanged. Then
`--text-2xs: 10px` and `--lh-2xs: 16px` for the ten unnamed 10px chip sites; `--weight-book: 450` and
`--weight-strong: 560` to widen the weight range; `--track-caps: 0.07em` and `--track-tight: -0.006em`
for the 32 unnamed tracking declarations; and `--icon-sm/md/lg` for the three icon sizes that already
match. No existing size value changes. The four outlier icon sizes are deliberately left alone
because each would move a box.

The load bearing rule change is one line: `body { font-weight: var(--weight-book) }` in
`globals.css`, plus `font-synthesis-weight: none`. Every label that never states a weight gets a half
step heavier at once, and anything that states 500 or 600 is untouched.

**What I verified.** The whole option depends on the system face having a live weight axis, so I
measured it myself with `canvas.measureText` at 13px on the real `--font-ui` stack, and my numbers
came back byte identical to B's: 400 at 237.904, 450 at 240.706, 500 at 243.501, 560 at 246.824, 600
at 249.080. Every step is distinct and monotonic, so 450 is a real face and not a rounded 400. It is
also live in layout and not just in canvas: 241 elements in B's own mock compute to
`font-weight: 450`. B's counts are close to mine, being 33 pixel literals against my 33, and 303
`--text-muted` uses against my 303.

**Cost against the photograph probes.** The lowest of the three. No plane moves, so backgrounds are
byte identical and only glyph coverage changes. Any text heavy reference photograph still has to be
regenerated.

**What it will not fix.** It does not touch C2 at all. The sidebar stays 31 percent brighter than the
canvas and the active tab stays a well, so the single finding that best explains the Ghostty gap is
left standing. It does not touch C3, so amber keeps its 4.45 ΔE neighbour and the Explorer keeps
drawing the amber dot. It does not touch C4 or C5. It is the cleanest typography work of the three
and it answers about a third of the ask.

### Option C, the lit edge

**Zen belief:** B1 and B3 together, and the second is what makes it a material direction. C inverts
the plane order like A does, and then adds a light: `--edge-lit`, a derived
`color-mix(in srgb, var(--text-primary) 8%, transparent)`, drawn on the top edge of an object that
genuinely sits above its own host plane and nowhere else, plus `--edge-fade: 20px` for content that
continues past a boundary. It also opens `--r-md` from 6 to 8 and `--r-lg` from 10 to 14, and
deepens both shadows.

**What I verified, and it is where C breaks.** Three findings, and the first two are serious.

*The plane ramp stops being monotone in the wrong place.* C's order is sidebar 0.174, canvas 0.191,
raised 0.222, surface 0.231, active 0.252. `--bg-raised` ends up **below** `--bg-surface`. That is
not abstract. `.agent-tile` rests at `--bg-surface` (`src/renderer/app/agent-grid.css:44`) and
hovers to `--bg-raised` (`agent-grid.css:56`), so under C an agent tile gets **darker** when the
pointer lands on it, by ΔL of minus 0.009. The same inversion puts `.set-chip`, which is
`--bg-raised` at `src/renderer/settings/settings.css:276`, darker than the card it sits inside.

*The git answer deletes the signal instead of moving it.* C sets `--git-modified` to `#a5abb7`, which
is ΔE2000 33.11 from amber, and that half is right. But it is ΔE2000 **0.81** from `--text-secondary`
`#a8adb8`, which is below the just noticeable difference. The M badge on a modified file would be
visually indistinguishable from ordinary label text. A's `#af9c74` is 17.36 from amber and 21.88 from
secondary, which is the shape the constraint actually asks for: far from amber, still a colour.

*The one thing C fixes that nothing else does.* C is the only option that repairs C4. Its `--border`
reads 1.183:1 on its own `--bg-active` where today's reads 1.013:1, and 1.415:1 on its sidebar where
today's reads 1.287:1. That is worth extracting whatever he picks.

**Cost against the photograph probes.** The highest. Planes move, radii move and shadows move, so
every reference photograph changes and the two radius changes alter the silhouette of menus, modals
and toasts. The radius change is also the one part of any option that is arguably a move rather than
a repaint, since a 14px corner on a sheet changes what the sheet covers at its edges.

**What it will not fix, and what it risks.** The lit edge is the only proposal that adds a new visual
mechanic rather than retuning an existing one. DESIGN.md:181 permits it, narrowly, because it is
drawn on objects rather than on regions, and C's plan is careful about that. But it is a mechanic a
later round will widen, and at 1.14 to 1.17:1 against the fill it sits on it is close enough to
nothing that the discipline it requires may cost more than the effect returns. It also does not touch
C6 through C9.

### Side by side

| | A, quiet frame | B, printed page | C, lit edge |
| --- | --- | --- | --- |
| Fixes C1, chrome text above the work | yes, to 11.24:1 | yes, to 12.26:1 | yes, to 12.16:1 |
| Fixes C2, the inverted ground | **yes** | no | yes |
| Fixes C3, amber's neighbour | yes, ΔE 17.36 | no | overshoots, badge goes grey |
| Fixes C4, invisible hairline | no | no | **yes** |
| Fixes C5, two icon rest values | yes, by rule | no | no |
| Fixes C6 to C9, the unnamed values | no | **yes, most of them** | no |
| Fixes C10, the cursor | yes | no | no |
| Plane ramp stays coherent | yes | yes, untouched | **no, hover inverts** |
| New visual mechanic introduced | none | none | one |
| Photograph cost | medium | low | high |
| Values changed | 11 changed, 1 added | 3 changed, 9 added | 9 changed, 2 added, 4 retuned |

---

## 5. What a repaint costs generally

Not large, and worth stating so the number is not imagined. No option changes a `gmux-*` class name,
a `GMUX_*` env name, an IPC channel, a manifest field or a smoke mode, so `gate:contract` is
untouched. No option adds a package. No option changes geometry, so `smoke:t1` and `smoke:t3` pass or
fail on the same grounds they do today.

The real cost is three things. Every committed reference photograph that shows chrome has to be
regenerated in the same commit, and the phase brief has to say which and why. `--bg-canvas` is frozen
in all three options, which is what keeps `src/shared/window-chrome.ts`, `src/renderer/terminal/theme.ts`
and the capture path out of the diff entirely; any proposal that touches it costs far more than the
three here. And the tokens.css comments carrying measured ratios, being the `>=12:1` and `>=7:1`
annotations and the scroll thumb ramp's four figures, are load bearing documentation that has to be
re-measured and rewritten rather than left stale, because a stale measurement in that file is exactly
the "map that goes quietly stale" the Zen refuses.

Verification tier: this is a rendered surface with no new state, so Tier 2 by the CLAUDE.md table,
being the gates plus one app run that drives every claim in one session, plus one independent method.
The independent method should be the one used here, being re-deriving the ratios by a second
implementation and pushing every proposed value through `deriveOverrides` at all three contrast
levels. The one item that earns Tier 3 on its own is the `--git-modified` change, because it touches
the status colour language, and the evidence there is a per row ΔE matrix over every hue that can
appear at rest.

---

## 6. What was not verified

Stated plainly, because the last two research rounds were corrected at cost for exactly this.

- **No option was rendered in the real app.** Every measurement here is arithmetic over token values
  plus four static HTML mocks driven in a browser. Nobody launched Electron and applied a token diff
  to a running window with live terminals in it. What a person actually perceives when six WebGL
  panes are drawing beside a darker frame is not measured, and it is the one thing a photograph
  probe would settle.
- **No photograph was taken.** The mocks were driven and measured through the DOM, being frame size,
  computed custom properties, element counts and text metrics. No image was captured or compared.
- **The Explorer's file type icons were not measured.** Option A proposes `--file-icon-dim: 0.55` for
  them. `material-icon-theme` icons are full colour SVG inside `@pierre/trees`' shadow root, and I did
  not verify that an opacity applied there composites the way A assumes, nor what the resulting
  contrast is.
- **The commit graph lane hues were not re-derived under any option.** tokens.css claims minimum
  ΔE2000 42.5 between neighbouring lanes and 4.1:1 on `--bg-active`. Two of the three options move
  `--bg-active`, so the 4.1:1 figure moves with it and I did not recompute the six lane matrix.
- **The four contrast level interactions with `--file-icon-dim` and `--edge-lit` were not measured.**
  Both are new names. `--edge-lit` derives from `--text-primary` and so follows the text lift, but I
  did not check whether its composited result stays perceptible at contrast level high on every fill
  it can sit on.
- **B's 10px chip census counted CSS only.** Ten literal `font-size: 10px` declarations in
  `src/renderer/**/*.css`. B's plan says eleven sites; if there is an eleventh it is inline in a
  `.tsx` and I did not find it.
- **The Ghostty and VS Code reference images were not seen.** They were described to me. Everything
  here reasons from that description plus the control mock, and no pixel of either reference was
  compared to anything.
- **Nothing was tested on a second display or at a different scale factor.** Every figure assumes 1x
  and the mocks were measured at 1x.

---

## 7. Recommendation

**Build Option A. It is the faithful reading of the Ghostty reference and the other two are not.**

The reason is one measurement. What makes the Ghostty window read as expensive is not its vignette,
not its capsule and not its chevrons. It is that the monospace content is the brightest thing on
screen by a wide margin and every piece of frame around it sits below. Tortie has that relationship
inverted twice, at the text (C1) and at the ground (C2), and Option A is the only one of the three
that turns both the right way up. B fixes the text and leaves the ground, so the active tab stays a
well and the frame stays the lit surface. C fixes both and then breaks the plane ramp doing it, so a
shipped hover runs backwards.

The deeper reason is that A is the only option whose whole content is a claim the product already
makes about itself. DESIGN.md:7 has said since round one that the chrome and the canvas are the same
material and that the app disappears into the work. The tokens have never shipped that. A is not a
new visual language, it is the existing one finally being true, which is exactly what
"not clever where it could be dull" asks for. B is good typography that answers a third of the ask.
C is the only one that invents a mechanic, and a lit edge at 1.15:1 is a discipline to maintain
forever in exchange for something close to nothing.

Take two things out of the losers and put them in A. From C, take the `--border` retune, because
1.013:1 on a selected row is a hairline that does not exist and he specifically likes the edges. From
B, take the naming work, being `--text-2xs`, `--track-caps` and the three icon size names, because it
costs zero pixels and it is the difference between a consistent system and a system with 33 unnamed
sizes and 32 unnamed tracking values. Do not take B's `#cfd3da` over A's `#c9cacd`: B's value is the
computed ceiling, which is the right answer if the ground never moves, and A's is the right answer
once it does.

**And yes, fix the self contradictions first, in their own commit, whatever look he picks.** C3, C5,
C6, C7, C8, C9 and C10 are all consistency defects rather than design decisions. Between them they
are two icon rest values, seven icon sizes, 26 stray radii, 33 unnamed font sizes, 32 unnamed
tracking values, a chrome token colouring the terminal's cursor, and a full strength amber dot in the
sidebar sitting four ΔE from the one colour reserved for "an agent needs you". Every one of those is
a thing a person feels as cheapness without being able to name. Fixing them alone, with no token
value changed at all, is most of the distance to premium, and it makes whichever option he picks a
small clean diff on top of a consistent base instead of a repaint over an inconsistent one.
