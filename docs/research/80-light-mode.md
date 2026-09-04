# Research 80: light mode

Written 2026-09-04 for Phase 213 (docs/BACKLOG.md, "light mode, and the whole app follows it"). It is the
research the entry asks for before anything is built: six measured sections, the designed light palette
with a reason per token, the sixteen ANSI slots, three named references, and a mock photographed from the
real app with the palette injected through the existing probe seams. No production code was written. The
harness that produced every number lives beside this file under `docs/research/assets/80-light-mode/`.

A first research agent ran for 28 minutes and died on a network error. Its palette (`palette.mjs`), its
vendor table (`vendor.mjs`) and its first two photographs were read first and kept where they were right;
every correction below says why. Its measurements for sections 3 to 6 were never written to disk, so
they were taken again here.

**How it was measured.** Every app run went through `build/electron-run.mjs` on a scratch profile and a
scratch tmux socket (`gmux-p213`, `gmux-v213`), ending its tree in a `finally`, never more than two
Electrons at once, photographed through CDP from the harness and never with `npm run shot`. The palette was
injected into a real launch by writing the tokens inline on the document root, handing xterm a theme
object, defining a Monaco theme, and switching Pierre the way Pierre takes a light theme (section 3),
which is the same set of writes the build will make. Agents ran on the default login, each taking at most
one short turn, exactly as `npm run conformance:resume` does; nothing read, copied or moved a credential.
At the end the process table held the same 38 Electron family pids it held at the start.

The eager renderer budget after this work is unchanged, because no production file changed:
1,534,694 raw and 387,461 gzip, under 2,000,000 and 500,000 by 465,306 and 112,539.

## 0. The answer in one page

1. **Every registry agent is readable on paper if the terminal enforces a floor, and only then.** Of the
   twelve, nine draw their interface in hard coded colours that ignore the sixteen slots (Claude Code
   entirely in 256 colour codes, Gemini, pi, omp, muse, Qwen, grok, DeepSeek and most of Codex in
   true colour). Two follow the palette (Cursor and Antigravity, plus half of Codex). Two paint their own
   dark ground over every cell (grok and DeepSeek) and are the contrast well DESIGN.md section 0 warns
   about, made by the agent. On the raw light ground Claude Code draws its bullets in `#ffffff` at
   1.07:1 and its warnings in `#ffd700` at 1.31:1; pi draws its warnings in `#ffff00` at 1.00:1.
2. **xterm's `minimumContrastRatio` is the mechanism the entry did not name, and it is measured.** Set to
   4.5 on the light theme it lifts Claude Code's `#ffd700` to `#837122` (4.50), its `#949494` to `#6b6b6b`
   (4.97) and its `#afd7ff` to `#5f7084` (4.73), at draw time, changing no cell. On the dark ground with
   the same 4.5 every colour that already cleared 4.5 is drawn byte for byte as before, but colours that
   did not (Claude Code's `#4e4e4e` on `#3a3a3a`) would move, so the option belongs to the LIGHT theme
   only and the dark theme keeps xterm's default of 1, which is what keeps dark byte identical. This is
   the same rule `hue.ts` already states for the text tokens: keep what clears, lift what does not.
3. **No agent can learn the ground.** In ten launches with xterm answering OSC 10 and OSC 11, no query
   reached xterm, and a detached tmux 3.6a pane that asked was answered with nothing. An agent that wants
   to know whether it is on paper cannot find out through Tortie, so Claude Code stays in its own dark
   theme until the person runs its `/theme`, and Codex draws its diff rows on its own dark green.
4. **Pierre already takes two themes.** `theme: { dark, light }` renders every token span with both
   `--diffs-token-dark` and `--diffs-token-light` and picks by the host's `color-scheme` through
   `light-dark()`. A second `registerCustomTheme('gmux-light', ...)` and `color-scheme: light` on the
   root is the whole switch; the mock did exactly that and the diff went light in the same frame.
5. **Monaco and xterm swap live**: `defineTheme` + `setTheme` in 3.2 to 5.5 ms, `options.theme` in 1.4 ms,
   both painted in the next frame. The whole switch is one frame; no frame paints a half palette.
6. **The first frame is the compositor fill until the document paints, and the document's inline
   `#131417` overpaints it 109 ms later.** With the literal removed the paper fill shows through
   (measured), and a root attribute a preload stamps from its own argv lands before first paint
   (measured), so the stylesheet can key its palette on it and no script runs inline.
7. **Match the Mac is eight milliseconds.** `nativeTheme.themeSource` flips fire `updated` in 8 ms and
   the renderer's `prefers-color-scheme` answers on the next read; ten flips in a second fire ten events.
   The title bar is hidden inset, so there is no native strip: the traffic lights sit on Tortie's own
   paper titlebar, photographed by `screencapture`.
8. **The crossfade costs 22 ms to decode a still and 200 ms to fade**, and under reduced motion
   `transition-property` computes to `none` and the switch is one frame.

## 1. Every registry agent on the light terminal ground

### 1.1 How each cell was read

The reading is not a pixel guess. For every photograph the harness walked the live xterm buffer cell by
cell (`buffer.active.getLine(y).getCell(x)`) and classified the foreground and background of every
character as **default** (follows the theme's foreground and background), **sixteen** (ANSI 0 to 15,
follows the palette), **256** (a 256 colour index, resolved through xterm's own cube and grey ramp), or
**RGB** (a true colour escape). The lowest contrast pair per photograph is WCAG contrast of the resolved
foreground over the resolved background, with `dim` modelled as xterm draws it (50 percent alpha over the
ground) and bold on a normal slot drawn in the bright slot as xterm's `drawBoldTextInBrightColors`
default does. Box drawing and braille cells were excluded because they are marks. Every count below is
one screen of that agent, so "522 of 534" means 522 of the 534 text cells on screen.

The pane the agents ran in carried `TERM=tmux-256color` (the server option `default-terminal` in
`resources/gmux-tmux.conf`) and no `COLORTERM`, which is why Claude Code, an Ink app, emits 256 colour
codes rather than the true colour its theme holds; the values are the same colours quantised. Tortie's
own launch inherits the login shell's environment, so a person whose profile exports `COLORTERM` will
see the true colour form. Either way the colour is the agent's and not the palette's.

The turn was "Append one line reading p213 to the end of README.md. Do nothing else." in a scratch
repository. Trust questions were answered (Down then Enter where the agent highlights No first) because a
trust answer records a scratch path in the agent's config and nothing else; Antigravity's first screen
is a Terms of Service page with a pre checked consent to data collection, which this run does not accept
on his behalf, and DeepSeek's wants `1/Y`, which the drive did not press.

### 1.2 The matrix

Photographs are under `docs/research/assets/80-light-mode/agents/`, named `<agent>-<state>.png`; the
terminal host at 612 by 812 CSS pixels, reduced to 1x for the repository (the 2x originals were read).
The `*-osc.png` set is run D (section 1.3 and the ground query), the `mcr-*.png` set is run C. "hard" is the share of text cells whose colour ignores the
palette. The per photograph worst pair is the lowest contrast text on screen.

| Agent, version | At rest | Mid turn | Permission prompt | Diff on screen | Colours |
| --- | --- | --- | --- | --- | --- |
| Claude Code 2.1.260 | trust screen then the banner; worst `#ffd700` on paper **1.31** (MCP warning), `#949494` 2.83 (version line), `#ff87af` 2.10 (mode line), `#87d787` 1.62 | "Puttering" in `#d78787` 2.54, response bullets `#ffffff` **1.07**, user echo row `#3a3a3a` with its chevron `#4e4e4e` at 1.37 | NOT SHOWN: his default permission mode is "don't ask on", so the edit applied without a prompt, and the one turn allowed was spent | not drawn ("Read 1 file (ctrl+o to expand)") | 522 of 534 cells 256 colour, 0 sixteen; hard 98 percent |
| Codex 0.153.0 | boxed header in default ink; footer `#f6e2b7` **1.19**, `#abdfa7` 1.41, `#f2b590` 1.66; dim ink 2.98 | default ink and sixteen (cyan, yellow) plus the same footer | NOT SHOWN: applied in his configured approval mode | drawn after the turn: added row on its own `#213a2b` with the dim line number at **1.08** and slot green at 2.49, context line `#cdd6f4` 1.35 | 79 of 583 sixteen, 104 RGB, rest default; hard 18 percent |
| Gemini CLI (his install) | every cell RGB; 1,619 cells of skill warnings in `#fff783` **1.04**, input box `#6272a4` on `#363b50` 2.35, grey `#a3afb7` 2.09 | the turn failed at the vendor API ("API key not valid", whatever his gemini config holds; nothing of his was touched), error text `#ff5555` 2.93 | UNMEASURED, the turn never reached a tool | UNMEASURED | 2,283 of 2,283 RGB; hard 100 percent |
| Cursor CLI 2026.08.25 | trust box in slot yellow, text default ink, input box on its own `#ebedef` with dim ink 2.91 | "Reading README.md, then appending"; user echo on `#dddee0` | NOT SHOWN: ran in its default mode without asking | not drawn in the window | 414 of 771 sixteen, rest default, 2 RGB fills; hard under 1 percent |
| Qwen Code 0.22.0 (turn taken in run D) | RGB throughout: tips `#97a0b0` 2.45, blue `#3b82f6` 3.68, violet `#8b5cf6` | "Thought briefly", Read and Edit rows | NOT SHOWN, Auto mode | drawn: `+ p213` in `#86b300` on a light green wash; the queued input box ink on `#3a3a3a` 1.26 | 856 of 942 RGB; hard 91 percent |
| pi 0.84.2 | RGB: body `#666666` 5.7, warnings `#ffff00` **1.00** (invisible), lavender `#b294bb`, cyan `#8abeb7` 1.93, `[Skills]` `#f0c674` 1.50 | reasoning transcript in italic `#808080` 3.3 and olive `#b5bd68` 1.87 (an `od` dump), user echo `#d4d4d4` on `#343541` | NOT SHOWN: pi applies without asking | not drawn as a diff | 1,625 of 1,729 RGB, 104 sixteen (yellow); hard 94 percent |
| Oh My Pi 18.1.7 | RGB but light aware: body `#767676` 4.0, gold `#9a7326` 4.6, status strip on `#e0e0e0` with `#808080` 2.99 and `#af8700` 2.53; progress bar `#e0e0e0` **1.23** on paper | same plus a spinner | NOT SHOWN, applied | drawn: an Edit box on `#e8f0e8` with dark ink and green `+5` | 1,504 of 1,525 RGB; hard 99 percent, and the only hard coded set that was designed for a light ground |
| Muse Code 1.0.2 | RGB: body `#676c74` 4.6, version `#ccd3db` **1.41**, links `#5aa0ff` 2.47, trust yellow `#ffe14a` 1.21 | "Thinking" in `#9aa0a8` and `#bdc4cc` 1.64, user echo on `#263854` | SHOWN: "Would you like to run the following command?" with `1. Allow this stage once (y)`, options in `#8a9098` 3.0, "Ran command" in `#a6e3a1` **1.39** | no diff, it proposes a shell command | 396 of 396 RGB; hard 100 percent |
| Grok | paints `#141414` over every cell: its own dark window inside the light one; `#585858` 2.59 path, `#e1e1e1` body | "Thinking" `#3f3f3f` on `#141414` **1.75** | NOT SHOWN, applied | drawn inside its dark box, green row | 6,192 of 6,192 backgrounds RGB; hard 100 percent |
| Antigravity CLI (agy) | Terms of Service page with a pre checked data consent; slots brightBlack, brightBlue, brightGreen, red, green, white, yellow, magenta, blue; worst dim ink 2.98 | UNMEASURED: the page is not accepted for him | UNMEASURED | UNMEASURED | 434 of 756 sixteen, 44 in 256 colour; the best palette follower of the twelve |
| CodeWhale (deepseek-tui) | paints `#121c2e` over every cell; trust box `#3578e5` 4.04, body `#b1becf`; self consistent on its own ground | UNMEASURED: its trust dialog wants `1/Y`, the drive answered Enter and the pane was gone by the turn | UNMEASURED | UNMEASURED | 502 of 502 RGB on an RGB ground; hard 100 percent |
| Factory Droid | UNMEASURED: not installed on this machine (`AGENT_NOT_FOUND` from the app) | | | | |

Two things the table says that the entry did not expect. First, "with a permission prompt up" is a state
most agents on his machine never enter, because his defaults are permissive (Claude Code "don't ask on",
Cursor and Codex auto approving, pi and omp applying); Muse alone asked. Second, the lowest contrast on
nearly every screen is not a coloured word but a **pale grey the agent chose for a dark ground**:
`#949494`, `#ccd3db`, `#97a0b0`, `#a3afb7`, `#e0e0e0`. On paper these are the hints and version lines.

### 1.3 What the floor does to them (run C, Claude Code, no turn)

| Cell | Asked for | Drawn at ratio 1 (shipped) | Drawn at ratio 3 | Drawn at ratio 4.5 |
| --- | --- | --- | --- | --- |
| "Accessing workspace:" `p220` bold | `#ffd700` 1.31 | `#f9d949` 1.30 | `#a28c2c` 3.09 | `#837122` 4.50 |
| "Security guide" `p246` | `#949494` 2.83 | `#949494` 2.83 | `#858585` 3.44 | `#6b6b6b` 4.97 |
| "❯ No, exit" `p153` | `#afd7ff` 1.40 | `#b7d6fc` 1.39 | `#768aa4` 3.29 | `#5f7084` 4.73 |
| MCP warning `p220` | `#ffd700` 1.31 | `#f9d949` 1.30 | | `#837122` 4.50 |
| "don't ask on" `p211` | `#ff87af` 2.10 | `#f08daf` 2.14 | | `#9c5b71` 4.72 |
| "/rc" `p114` | `#87d787` 1.62 | `#9ad58f` 1.59 | | `#506f4a` 5.27 |
| the same six on the DARK ground at 4.5 | | | | byte for byte what ratio 1 draws, because all six already clear it there |

The pixel is read from the glyph itself (the pixel in the cell farthest from the ground), so the ratio 1
column is one or two levels off the asked value by antialiasing and nothing else. Changing the option on
a live terminal costs one frame. **This is the only mechanism that makes Claude Code readable on paper
without Claude Code changing**, and it is the terminal's own rule, not a change to what the agent wrote.
The cost, stated: an agent that dims a separator on purpose gets it lifted too, and a colour the agent
chose for meaning (Codex's green on its dark diff row) is moved toward the ground's opposite rather than
kept. The dark ground must keep ratio 1, because at 4.5 Claude Code's `#4e4e4e` on `#3a3a3a` would move
and dark would no longer be byte identical.

### 1.4 What xterm's dim does to the ink

xterm draws `dim` at 50 percent alpha. The dark transcript ink `#d8dbe2` dims to about 4.0:1 on
`#131417`; the light ink `#282a30` dims to 2.98:1 on paper, and a black ink would dim to 3.9. Every "dim
ink 2.98" in the table is that rule and not a colour choice, and the floor in 1.3 applies after the dim,
which is the other reason to set it on the light theme.

### 1.5 The limits, per agent, so the build states them rather than finds them

- **Claude Code** draws its own theme and never asks the terminal; the person must run `/theme` and pick
  light. With the floor at 4.5 its dark theme reads on paper; without it, its bullets are invisible.
- **Codex** follows the slots for half its text and hard codes the footer and its diff rows; the diff rows
  keep their dark green on paper.
- **Gemini**, **pi**, **Qwen**, **Muse** hard code everything; readable only under the floor.
- **grok** and **CodeWhale** paint their own ground; they are a dark box in a light window by their own
  choice, and the floor does not apply inside a box the agent owns.
- **Oh My Pi** is the one hard coded set that reads on paper unaided, bar its status strip.
- **Cursor** and **Antigravity** follow the palette and need nothing.
- **Droid** is not installed and is unmeasured.

## 2. The six vendor light palettes

Read from their sources, not from memory: Apple System Colors Light, GitHub Light Default, Builtin Light
and Builtin Solarized Light from the Ghostty 1.x bundle at
`/Applications/Ghostty.app/Contents/Resources/ghostty/themes/`; VS Code 1.135.0's light defaults from
`workbench.desktop.main.js`'s terminal colour registry (Light Modern sets `terminal.foreground` `#3B3B3B`
and no `terminal.ansi*` key, so the registry defaults are the palette); Warp's Snowy from
`github.com/warpdotdev/themes/warp_bundled/snowy.yaml` (its compiled in Light base is not in the
repository; Snowy and Marble carry the same sixteen); GitHub's from `@primer/primitives` 7.10.0
`dist/json/colors/light.json` `ansi`, which the Ghostty file matches value for value. Ratio is against
each vendor's own ground. The previous agent's table was right on every value but VS Code's foreground,
which is `#3b3b3b` under Light Modern, not the registry's `#333333`.

| slot | Apple Terminal | Warp Snowy | Ghostty Builtin Light | VS Code Light Modern | GitHub Light Default | Solarized Light |
| --- | --- | --- | --- | --- | --- | --- |
| black | #1a1a1a 17.37 | #212121 16.1 | #000000 21 | #000000 21 | #24292f 14.65 | #073642 12.05 |
| red | #cc372e 5.05 | #c30771 5.85 | #bb0000 6.75 | #cd3131 5.15 | #cf222e 5.36 | #dc322f 4.29 |
| green | #26a439 3.25 | #10a778 3.08 | #00bb00 2.59 | #107c10 5.37 | #116329 7.39 | #859900 2.97 |
| yellow | #cdac08 2.21 | #a89c14 2.83 | #bbbb00 2.05 | #949800 3.11 | #4d2d00 12.42 | #b58900 2.98 |
| blue | #0869cb 5.38 | #008ec4 3.71 | #0000bb 12.23 | #0451a5 7.71 | #0969da 5.19 | #268bd2 3.41 |
| magenta | #9647bf 5.31 | #523c79 9.21 | #bb00bb 5.48 | #bc05bc 5.4 | #8250df 5.05 | #d33682 4.21 |
| cyan | #479ec2 3.02 | #20a5ba 2.94 | #00bbbb 2.38 | #0598bc 3.37 | #1b7c83 4.93 | #2aa198 2.93 |
| white | #98989d 2.87 | #e0e0e0 1.32 | #bbbbbb 1.92 | #555555 7.46 | #6e7781 4.55 | #bbb5a2 1.9 |
| brBlack | #464646 9.42 | #212121 16.1 | #555555 7.46 | #666666 5.74 | #57606a 6.39 | #002b36 13.92 |
| brRed | #ff453a 3.4 | #fb007a 3.9 | #ff5555 3.14 | #cd3131 5.15 | #a40e26 7.87 | #cb4b16 4.27 |
| brGreen | #32d74b 1.91 | #5fd7af 1.78 | #2fd92f 1.89 | #14ce14 2.13 | #1a7f37 5.08 | #586e75 4.99 |
| brYellow | #edbb00 1.79 | #f3e430 1.32 | #bfbf15 1.97 | #b5ba00 2.1 | #633c01 9.64 | #657b83 4.13 |
| brBlue | #0a84ff 3.64 | #20bbfc 2.19 | #5555ff 5.09 | #0451a5 7.71 | #218bff 3.39 | #839496 2.93 |
| brMagenta | #bf5af2 3.52 | #6855de 5.33 | #ff55ff 2.63 | #bc05bc 5.4 | #a475f9 3.24 | #6c71c4 4.06 |
| brCyan | #3accf7 1.88 | #4fb8cc 2.32 | #22cccc 1.99 | #0598bc 3.37 | #3192aa 3.61 | #93a1a1 2.48 |
| brWhite | #ffffff 1 | #f1f1f1 1.13 | #ffffff 1 | #a5a5a5 2.46 | #8c959f 3.04 | #fdf6e3 1 |
| ground | #feffff | #ffffff | #ffffff | #ffffff | #ffffff | #fdf6e3 |
| foreground | #000000 20.96 | #000000 21 | #000000 21 | #3b3b3b 11.2 | #1f2328 15.8 | #657b83 4.13 |
| slots under 3:1 | 6 | 8 | 9 | 3 | **none** | 7 |
| slots under 4.5:1 | 11 | 11 | 10 | 6 | 4 | 13 |
| bright vs normal, min dE2000 | 6.4 at yellow | 0 at black | 1.12 at yellow | 0 at red | 6.17 at yellow | 3.4 at black |
| bright pairs identical | none | black | none | red, blue, magenta, cyan | none | none |

What the table decides. Five of the six fail the 3:1 floor in at least three slots, and the failure is
always the same one: bright yellow, bright green and bright cyan kept as light colours from the dark
palette. GitHub Light is the only one that clears 3:1 in all sixteen, and it does it by making the bright
eight DARKER and more saturated rather than lighter, which is also the only table where bright and
normal are never identical. VS Code keeps four bright slots identical to their normals, so bold text
changes nothing there. The design in section 7 takes GitHub's rule (every slot clears 3:1, the bright
eight distinct) and goes past it (every slot clears 4.5:1, because xterm draws bold in the bright slot
and bold text is text).

## 3. How each non token surface takes a second theme

**Pierre diffs 1.3.5.** Tortie passes `theme: { dark: 'gmux-dark', light: 'gmux-dark' }`
(`src/renderer/pierre/theme-bridge.ts` line 213, `diffTheme`). That is Pierre's DUAL form: `getThemes`
resolves both names in the shared highlighter, `renderDiffWithHighlighter` runs Shiki with
`defaultColor: false` and `cssVariablePrefix: '--diffs-token-'`, so every token span carries
`--diffs-token-dark: #6cb6ff; --diffs-token-light: #6cb6ff;` inline (measured: 154 spans on the mock's
diff), and the stylesheet reads `light-dark(var(--diffs-token-light, var(--diffs-light)),
var(--diffs-token-dark, var(--diffs-dark)))`. The host's theme block, written into the shadow root by
`applyThemeState` under `@layer rendered`, carries `--diffs-dark`, `--diffs-dark-bg`,
`--diffs-dark-addition-color` and the `--diffs-light*` set from the second theme's `bg`, `fg` and
`gitDecoration.*` keys. Which branch of every `light-dark()` wins is the host's `color-scheme`:
`themeType` defaults to `'system'`, which writes no `color-scheme` on the host, so the document's own
`color-scheme` (`globals.css` line 20, dark) inherits in; `setThemeType('light')` on a FileDiff writes it
explicitly. `registerCustomTheme` throws `DuplicateThemeError` only for the same NAME (caught and logged
upstream), so a second registration under `gmux-light` is one call, made at import beside the first, and
no re registration and no remount is needed; both themes are resolved once when the highlighter loads.
The mock lifted the limit Phases 207 and 210 stated by writing the `--diffs-light*` host variables and
`color-scheme: light` under `@layer unsafe` and mapping every span's `--diffs-token-light` slot for slot to
the light syntax ramp, 0.6 ms for 154 spans, and the diff panel read `#f5f7fa` in the first frame after
the switch. A registered `gmux-light` theme writes exactly those bytes itself. The worker pool
(`highlight-pool-impl.ts`) takes `DIFF_RENDER_OPTIONS` whole, so the pair goes there unchanged.

**Monaco 0.56.0.** `installMonacoTheme` already redefines `gmux-dark` on every chrome theme publish and
calls `setTheme`. Measured on the live editor: `defineTheme('gmux-light', ...)` plus `setTheme` took
3.2 ms and 5.5 ms across two runs, and the editor background read `rgb(245, 247, 250)`, the line
numbers `rgb(79, 83, 92)` and the first token `rgb(106, 112, 125)` two frames later (13 to 17 ms). A
light theme registers with `base: 'vs'`, which is what makes Monaco's own widgets (find, suggest, hover)
light where the theme does not name a key.

**xterm 6.0.0.** `term.options.theme = {...}` on a running terminal repainted it in the next frame,
1.4 ms for the write, no reattach, which is what `refreshLiveTerminalThemes` in `theme/apply.ts` already
assumes. `term.options.minimumContrastRatio` is live the same way (section 1.3).

**The Architecture map.** It is SVG, and `src/renderer/arch/map/map.css` paints every fill and stroke from
a token (`var(--bg-surface)`, `var(--border-strong)`, `var(--accent)`, `var(--success)`, `var(--error)`,
`var(--text-muted)` and so on). `ArchMap.tsx` writes `fill="none"` and nothing else; `transitions.ts`
reads `--ease-out` off the root at run time. The one literal is `MAP_BOX_R` in `geometry.ts`, a radius.
So the map follows the tokens at draw time already and needs no work beyond the tokens.

**The Pierre tree.** `treeStyles` maps every neutral to `var(--token)` since Phase 207 and pins
`colorScheme: 'dark'` (test `tree-styles-follow.test.ts`). The value only decides the `light-dark()`
fallbacks in Pierre's tree stylesheet and the native scrollbar; with the host's `colorScheme` set to
`light` in the mock the rows read `rgb(237, 239, 243)` on `rgb(53, 54, 57)`, all from the tokens. The
test's pin becomes "follows the scheme".

**material-icon-theme 5.37.0.** It ships a `light` map: 31 extensions, 179 file names, 25 folder names
and 54 `*_light.svg` files, for icons whose dark art is too pale on white (toml, jinja, vercel, deno,
bun, cursor and the like). Tortie's generator (`src/renderer/icons/generate-file-icons.mjs`) reads
`fileExtensions`, `fileNames` and `folderNames` only, so no light variant is bundled today. The default
`file` and `folder` icons have no light variant. `--file-icon-dim` (0.55 on dark) exists for the opposite
reason, the art being the most saturated thing on the dark frame; on paper the mock used 0.72 and the
icons read as icons. Bundling the 54 light variants is a generator change of a few lines and about 54
small SVGs, and it is optional: the mock's Explorer is readable without them.

## 4. The Mac's own setting, and the window on a light fill

Electron 43.3.0 (Chromium 150.0.7871.212). On his machine `nativeTheme.shouldUseDarkColors` is `true`,
`themeSource` is `'system'`, high contrast, reduced transparency and forced colours are all false.
Nothing in the tree reads `nativeTheme` or `prefers-color-scheme` (grep over `src/`, only the two
`color-scheme: dark` declarations in the HTML files and `globals.css`).

Following it live, measured through main's inspector: setting `nativeTheme.themeSource = 'light'` fired
`updated` **8 ms** later, `shouldUseDarkColors` read false, and the renderer's
`matchMedia('(prefers-color-scheme: light)')` matched on the first read after it (0 ms of polling), with
the document's computed `color-scheme` reading `light`. Ten flips at 100 ms intervals fired ten `updated`
events in 1,270 ms and the renderer agreed at the end. So "Match the Mac" is one listener on `updated`
in main that rewrites the persisted scheme's effective value and broadcasts, and the entry's one second
bound is met by three orders of magnitude. The renderer never needs to read the media query itself,
because main is the one writer of settings and the window fill has to move in main anyway.

The window fill: `win.setBackgroundColor('#f5f7fa')` took 0 ms and read back `#F5F7FA`. The title bar is
`titleBarStyle: 'hiddenInset'` with no `trafficLightPosition`, no `titleBarOverlay` and no vibrancy, so
there is no native strip to turn dark or light; the traffic lights are macOS buttons drawn over Tortie's
own `.titlebar` element, which is `--bg-sidebar`. A `screencapture -l` of the window on the paper fill
(`mock-light-window.png`) shows the three lights on `#eeeff3` with nothing dark around them; the window
was not key at the time, so they are the inactive grey ones. On a light fill macOS draws the same
buttons it draws on any light window. Nothing here needs `titleBarOverlay`.

## 5. The first frame, at boot and at window open

Screencast from the first frame, dominant colour of the whole frame.

**Boot, shipped shape.** The first frame arrived 962 ms after spawn and was `#131417` over 100 percent of
2880 by 1772 pixels; the frames after it stayed `#131417` dominant while the chrome painted in. The
compositor fill main composes and the document's inline `html { background: #131417 }` are the same
bytes, so nothing is visible at boot today.

**Window open with a paper fill, the shipped settings document.** A BrowserWindow made with
`backgroundColor: '#f5f7fa'`, shown empty, then `loadFile(settings/index.html)`: the first frame after
the load, 115 ms in, was `#131417` over 100 percent of the window, then `#191b20` (the settings surface)
at 135 ms. So a paper fill from main is overpainted by the document's own literal at first paint, then by
the dark stylesheet: paper, graphite, dark chrome, three colours in 135 ms. That is the flash the entry
predicted and it is now a measurement.

**What it takes for the first frame to carry the scheme (run E, three scratch documents in scratch
windows of the running app, a paper fill on each).**

| Document | First frame after load | Read |
| --- | --- | --- |
| A: the shipped inline `html { background: #131417 }` | `#131417`, 100 percent, at 109 ms | the literal wins over the fill |
| B: no inline background at all | `#f6f7fa`, 100 percent, at 85 ms | the compositor fill shows through until a stylesheet paints |
| C: `html { background: #131417 } html[data-scheme=light] { background: #f5f7fa }` and a preload that stamps `data-scheme` from `process.argv` (`additionalArguments: ['--gmux-scheme=light']`) | `#f6f7fa`, 100 percent, at 83 ms | the attribute landed before first paint |

Two facts from C. The preload ran with `document.documentElement` absent and `readyState` `loading`, so
it cannot stamp the root at once; a `readystatechange` listener stamped it at `interactive`, and the
first frame still carried the paper, because the document is tiny and parsing finishes before the
compositor paints it. The main document is the same shape (`<div id="root">` and one deferred module
script). No inline script is needed, which matters because the CSP is `script-src 'self'` and is never
relaxed. So the build's shape is: main knows the scheme (it holds the settings before the first window),
passes it in `additionalArguments`, the preload stamps the root, the HTML's inline rule and
`tokens.css` both key on the attribute, and the compositor fill is composed from the scheme the way
Phase 207 composes it from the hue. The persisted scheme, not `nativeTheme`, is what the preload gets,
and under Match the Mac main resolves it first.

The screencast pipeline reads one level off in some channels (`#f6f7fa` for a fill set to `#f5f7fa`,
`#0e0f12` for `#0e0f13`), on both grounds; the build's comparison by colour should allow one level.

## 6. The switch, frame by frame

**Today, every token at once.** With screencast running, the mock wrote 67 tokens inline, one xterm theme,
one Monaco theme and the Pierre host block in 6.3 ms (1.4 ms xterm, 3.9 ms Monaco, 0.6 ms Pierre), and two
`requestAnimationFrame`s later (24.5 ms) every rectangle read the light value. The first screencast frame
after the write, 38 ms in, showed the sidebar `#eeeff3`, the terminal `#f6f7fa`, the editor `#f6f7fa`, the
diff `#f6f7fa`, the titlebar and the tabs `#eeeff3`, and every later frame the same. **No frame painted a
half palette.** The reason is structural: every write is synchronous inside one task, and Chromium
paints once after it.

**A crossfade** (a still of the old frame decoded into an `<img>` fixed over the window, the palette
swapped beneath it, the image faded out over 200 ms): the still decoded in 22 ms (12 to 22 across runs),
`transition-property` computed to `opacity`, one CSS transition was running, and the frames read a
blend from `#131417` at 54 ms through `#1b1c1f`, `#26272a`, `#393a3d`, `#4c4d50`, `#5f6063`, `#68696c` to
paper by about 260 ms, sidebar and terminal and diff moving together. Total cost about 300 ms of which
the swap itself is 1.5 ms. Under emulated `prefers-reduced-motion: reduce` the still decoded in 0.3 ms,
`transition-property` computed to `none` under the Phase 200 rule in `tokens.css`, zero transitions were
running, and the frames went from `#131417` at 22 ms to `#f6f7fa` at 33 ms with nothing between. The
same still over the window is what Phase 80.1's focus photograph already does, so the shape is in the
house.

## 7. The palette

Designed on a paper ground, not inverted. The eight neutrals keep the dark ramp's OKLCH hue (268, between
the shipped 264 and 274) and about its chroma (0.004 to 0.014), so the eight named starting colours of
Phase 210 turn the light ramp exactly as they turn the dark one, and the text is solved DARK to the dark
palette's own pinned ratio in the same hue and chroma, which is what `followGround` does above the flip.
The full arithmetic is `palette.mjs`; `node palette.mjs --report` prints every number below. The one
name it needs is the previous agent's, corrected in four places: the badge's dark text read 2.88 on the
darkened amber, the ANSI bright eight sat at 3.4 while xterm draws bold in them, slot 7 was the same grey
as slot 8, and the scroll thumb cleared 1.8 where the token pins 3.1.

### 7.1 Every colour token

| token | dark | light | why |
| --- | --- | --- | --- |
| `--bg-canvas` | #131417 | **#f5f7fa** | paper, OKLCH L 0.975, not white: white beside a photograph or a dark agent box is the contrast well |
| `--bg-sidebar` | #0e0f13 | **#edeff3** | the frame steps under the work, one rung below the paper, 8 levels apart |
| `--bg-surface` | #191b20 | **#fcfcfe** | a sheet: modals, toasts and inputs sit one rung ABOVE the paper and the shadow carries the lift |
| `--bg-raised` | #202329 | **#e5e7ed** | hover, chips and badges press INTO the paper; darker, not lighter |
| `--bg-active` | #252931 | **#d9dce3** | the selected row, the deepest fill, where every decoration is measured |
| `--bg-scrim` | rgba(9,10,12,.55) | **rgba(20,23,30,.40)** | darkens; over paper it reads #9b9da2 |
| `--border` | #25282e | **#d1d3da** | the hairline between regions, 1.299 on the sidebar against 1.297 pinned |
| `--border-active` | #2d3038 | **#c1c4cc** | the hairline on the selected fill, 1.271 there |
| `--border-strong` | #353943 | **#adb1ba** | inputs and hovered handles |
| `--text-primary` | #c9cacd | **#353639** | solved to the pinned 11.24, reads 11.26 on canvas, 8.8 on active |
| `--text-secondary` | #9ca1ab | **#4f535c** | pinned 7.10, reads 7.18, 5.61 on active |
| `--text-muted` | #838996 | **#626774** | the canvas solve read 4.4 on the sidebar, so it is solved to 4.5 on the sidebar and reads 5.27 canvas, 4.91 sidebar, 5.52 surface, 4.12 active, the same shape as dark |
| `--text-disabled` | #565b66 | **#9297a4** | pinned 2.70, reads 2.72; exempt |
| `--file-icon-dim` | 0.55 | **0.72** | the art was drawn for dark and is quieter on paper |
| `--accent` | #4d9de8 | **#2175bd** | the same hue and chroma, solved to 4.5 on paper so it can be text; 3.52 on active as a fill |
| `--accent-hover` | #63acf0 | **#106ab2** | hover DARKENS on paper, 5.25 |
| `--accent-text` | #82bfff | **#326da8** | 5.03 canvas, 4.69 sidebar |
| `--accent-wash` | rgba(77,157,232,.14) | **rgba(33,117,189,.14)** | the accent at the same alpha; #d7e5f1 over paper |
| `--drop-wash` | .25 | **rgba(33,117,189,.25)** | same rule |
| `--accent-soft` | .6 | **rgba(33,117,189,.6)** | same rule |
| `--on-accent` | #0d1117 | **#f5f7fa** | the paper itself on the accent, 4.5 on accent and 5.25 on hover |
| `--terminal-selection` | rgba(77,157,232,.3) | **rgba(33,117,189,.3)** | #b5d0e8 over paper, the ink on it 8.98 |
| `--focus-ring` | 0 0 0 2px rgba(77,157,232,.6) | **0 0 0 2px rgba(33,117,189,.6)** | same rule |
| `--status-working` | #4d9de8 | **#2175bd** | the accent |
| `--status-attention` | #f5b84a | **#976900** | solved so PAPER text clears 4.5 on it, which keeps the badge and the dot one amber; 3.53 on the active row, 3.91 canvas |
| `--status-idle` | #6e7583 | **#6e7482** | 3.41 on active |
| `--status-exited` | #6e7583 | **#6e7482** | same |
| `--status-failed` | #e5655e | **#c74a46** | 3.40 on active |
| `--status-attention-badge-bg` | #f5b84a | **#976900** | the attention amber |
| `--status-attention-badge-fg` | #131417 | **#f5f7fa** | paper on amber, 4.51, the mirror of graphite on amber |
| `--git-modified` | #af9c74 | **#64522d** | hue kept (84 against 85), 5.49 on active against 5.44 dark |
| `--git-added` | #6bc46d | **#00530e** | hue 144, 6.82 on active |
| `--git-deleted` | #e5655e | **#b23534** | hue 25, 4.43 on active |
| `--git-renamed` | #6cb6ff | **#00487f** | hue 250, 6.85 on active |
| `--git-conflict` | #f0883e | **#833e00** | hue 53, 5.76 on active |
| `--git-ignored` | #565b66 | **#9297a4** | the disabled grey, exempt as on dark |
| `--graph-lane-3` | #56c2c0 | **#004f4e** | cyan, hue 193, 6.86 on active |
| `--graph-lane-5` | #d19fe8 | **#613374** | violet, hue 315, 6.85 on active |
| lanes 1, 2, 4, 6 and `--graph-bundle` | var() | **unchanged var()** | they alias the accent and the git colours |
| `--error` `--warning` `--success` `--info` | | **#b23534 #976900 #00530e #00487f** | the same families as the git and status colours, as on dark |
| `--error-wash` etc | .12 | **rgba(178,53,52,.12) rgba(151,105,0,.12) rgba(0,83,14,.12)** | same alpha |
| `--focus-wash-attention` | | **rgba(151,105,0,.14)** | the attention amber |
| `--focus-wash-working` | | **rgba(33,117,189,.14)** | the accent wash |
| `--focus-wash-idle` | rgba(32,35,41,.5) | **rgba(229,231,237,.5)** | raised, low |
| `--scroll-thumb` family | grey at .52 .58 .72 .88 | **#4f535c at .65 .71 .97 and #353639 at 1** | the ink at the alpha that clears the four pinned ratios: 3.14, 3.55, 6.64, 11.26 |
| `--shadow-1/2/3` | black at .4 .45 .55 | **rgba(20,23,30) at .12, .14, .18 and .10** | shadow is the elevation on paper; lighter, because a shadow on white at .45 is a hole |

Measured over the whole set: ramp order in luminance is surface > canvas > sidebar > raised > active >
border > border-active > border-strong with rendered steps of 7, 8, 8, 12, 9, 16 and 20 levels (floor 2);
graph lanes keep a minimum consecutive dE2000 of 39.2 (dark 42.5); attention is 15.9 from
`--git-modified` (dark 17.4) and 10.3 from terminal yellow (dark 6.0); `--text-muted` on `--bg-active`
reads 4.12, as on dark it reads 4.15, and stays forbidden there.

### 7.2 The sixteen, and the terminal

The normal eight are text and clear 6.5:1 on paper in the dark palette's own hues; the bright eight are
the same hues lighter and 50 percent more saturated at exactly 4.5:1, so **bold text, which xterm draws in
the bright slot, is still text**, and every bright pair is at least dE2000 9.2 from its normal, where the
vendor tables read 0 to 6.4. Slot 0 is the ink, slot 7 is body text a rung under it, slot 8 is the dim grey,
slot 15 is the transcript ink, so a TUI that asks for "white on black" gets ink on paper.

| slot | dark | light | on paper | dE2000 to bright |
| --- | --- | --- | --- | --- |
| black | #1b1d22 | **#353639** | 11.26 | 20.7 |
| red | #e5655e | **#a72a2b** | 6.50 | 9.2 |
| green | #6bc46d | **#006814** | 6.54 | 9.5 |
| yellow | #e2b340 | **#715500** | 6.52 | 9.8 |
| blue | #6cb6ff | **#025b9e** | 6.54 | 9.5 |
| magenta | #c583d8 | **#7e3f8f** | 6.53 | 10.1 |
| cyan | #56c2c0 | **#006464** | 6.51 | 9.4 |
| white | #c9cdd6 | **#51545c** | 7.06 | 13.8 |
| brightBlack | #4a505c | **#6a707d** | 4.63 | |
| brightRed | #f07e78 | **#ca4141** | 4.50 | |
| brightGreen | #85d488 | **#008422** | 4.53 | |
| brightYellow | #f0c674 | **#936b00** | 4.50 | |
| brightBlue | #8fc7ff | **#4075a9** | 4.51 | |
| brightMagenta | #d19fe8 | **#9c52bc** | 4.50 | |
| brightCyan | #6fd6d4 | **#007f7e** | 4.51 | |
| brightWhite | #e8eaed | **#282a30** | 13.36 | |
| foreground | #d8dbe2 | **#282a30** | 13.36 (pinned 13.29) | |
| cursor | #e8eaed | **#1e1f22** | 15.36 | |
| background, cursorAccent | #131417 | **#f5f7fa** | | |
| selectionBackground | rgba(77,157,232,.3) | **rgba(33,117,189,.3)** | | |
| minimumContrastRatio | 1 | **4.5** | section 1.3 | |

The Monaco syntax ramp maps onto the same slots as `monaco-theme.ts` maps them today (comment
brightBlack, string green, escape brightGreen, keyword blue, number yellow, regexp brightRed, type cyan,
function brightBlue, constant brightYellow, punctuation white), and the Pierre light theme takes the same
eleven, which is what the mock drew.

## 8. Three references, judged

**GitHub Light Default (Primer 7.10).** Canvas `#ffffff`, inset `#f6f8fa`, border `#d0d7de`, text
`#24292f`, muted `#57606a`, accent `#0969da`, attention `#9a6700`, and the only vendor whose sixteen all
clear 3:1. The Tortie light palette agrees with it on the three decisions that matter: the sidebar is a
step off the canvas rather than a different material (`#f6f8fa` on white; `#edeff3` on `#f5f7fa`), the
accent is a blue dark enough to be text (4.5 and 5.19), and the attention colour is a dark gold, not a
yellow (`#976900` against `#9a6700`, dE2000 under 3). It differs on the ground: GitHub is pure white and
Tortie is paper at L 0.975, because a white canvas beside an agent that paints `#141414` over its cells
(section 1) is a hole, and because the transcript is the page. GitHub's bright eight are darker than the
normal eight; Tortie's are lighter and kept at 4.5 so bold stays text, which is the one place the two
disagree on purpose.

**VS Code Light Modern (1.135.0).** Editor `#ffffff`, sidebar and title bar `#f8f8f8`, borders
`#e5e5e5`, focus and buttons `#005fb8`, text `#3b3b3b`, active list row `#e8e8e8`, hover `#f2f2f2`, line
numbers `#6e7681`. Its hierarchy is the one Tortie's chrome already has on dark, and the light ramp reads
the same way: the work area lightest, the frame one step down, the selected row the deepest fill
(`#d9dce3` against `#e8e8e8`), the hairline visible on both. Tortie's ink is a rung darker (`#353639`,
11.26) than VS Code's `#3b3b3b` (10.2) because the pinned ratio is 11.24, and its neutrals are cool where
VS Code's are pure grey, because the dark ramp is cool and the eight named colours have to turn the light
one the same way. The terminal is where VS Code is the cautionary reference: Light Modern's terminal keeps
four bright slots identical to their normals and three under 3:1, and it is only readable through
`terminal.integrated.minimumContrastRatio`, which defaults to 4.5. That default is the precedent for
section 1.3.

**Solarized Light.** Base3 `#fdf6e3` is the canonical "paper, not white" and the reason the canvas here is
off white at all. It is also the reference for what not to do next: its body text `#657b83` reads 4.13 on
its own ground and seven of its sixteen sit under 3:1, because its accents were tuned once for both
grounds and its light mode inherits the dark mode's lightness. Tortie's palette is the opposite
construction, a second base solved to the dark palette's RATIOS rather than to its lightness, and its
paper is cool (hue 268) where Solarized's is warm, because the product's chrome is cool graphite and the
person who switches must recognise the app.

## 9. The mock

`docs/research/assets/80-light-mode/mock-light.png` is the full window at 1440 by 886 CSS pixels, 2x, with
the Explorer open on a scratch repository, a shell session showing the sixteen slots, a coloured
`git diff`, a decorated `git log`, `ls -G` and the bold, dim, italic, underline, inverse, 256 and RGB
attributes, and the editor panel showing `src/app.ts` as a Pierre diff against HEAD. `mock-dark.png` is
the same window a second earlier at the shipped bytes. `mock-light-editor.png` and `mock-dark-editor.png`
show the same window with `palette.ts` open in Monaco instead of the diff, because the panel shows one
tab at a time. `mock-light-window.png` is the macOS window capture with its traffic lights.

The rectangles and colours the build must match, read off the DOM at the light palette (CSS pixels;
photographs may read one level off per section 5):

| Surface | Rectangle | Background | Text |
| --- | --- | --- | --- |
| body | 0, 0, 1440, 886 | rgb(245, 247, 250) | rgb(53, 54, 57) |
| titlebar | 0, 0, 1440, 38 | rgb(237, 239, 243) | rgb(53, 54, 57) |
| sidebar | 48, 38, 280, 848 | rgb(237, 239, 243) | rgb(53, 54, 57) |
| Pierre tree host and its rows | 52, 82, 271, 800 | rgb(237, 239, 243) | rgb(53, 54, 57) |
| terminal host and pane | 328, 74, 612, 812 | rgb(245, 247, 250), xterm theme `#f5f7fa` and `#282a30` | |
| editor panel | 940, 74, 500, 812 | rgb(245, 247, 250) | |
| editor tabs | 941, 74, 499, 36 | rgb(237, 239, 243) | rgb(53, 54, 57) |
| Pierre diff host | 941, 140, 499, 746 | rgb(245, 247, 250), host `color-scheme` light, `--diffs-light-bg #f5f7fa`, `--diffs-dark-bg #131417` still present | rgb(40, 42, 48); a keyword span `--diffs-token-light: #2773b8` beside `--diffs-token-dark: #6CB6FF` |
| Monaco (editor mock) | the same panel | rgb(245, 247, 250) | line numbers rgb(79, 83, 92), comment rgb(106, 112, 125) |
| `html` | | rgb(245, 247, 250), `color-scheme` light | |

Dominant colours by photograph: sidebar, titlebar and tabs `#eeeff3`; terminal, editor and diff
`#f6f7fa`; the dark control reads `#0e0f12` and `#131417`.

Judged against the three references above: the ground is paper and the frame steps under the work as in
GitHub and VS Code; the hierarchy is canvas, frame, raised, active and the hairlines all read; the accent
holds its identity as the blue tab underline, the selected row's inset bar and the SCM badge. The one
thing the mock does not show is a light Explorer icon set, which section 3 leaves optional.

## 10. What the build takes from this, in order

1. A second base palette in `tokens.css` under one root attribute (section 7), with the shadows and
   washes rewritten and the dark block byte identical.
2. `minimumContrastRatio: 4.5` on the light terminal theme and 1 on the dark (section 1.3); the same
   sixteen in the terminal, Monaco's ramp and Pierre's light theme (section 7.2).
3. `registerCustomTheme('gmux-light')` beside the dark one, `diffTheme` as the real pair, the tree's
   `colorScheme` following the scheme (section 3).
4. Main composes the fill from the scheme, passes the scheme in `additionalArguments`, the preload stamps
   the root, and the inline literal keys on the attribute (section 5).
5. A `nativeTheme.updated` listener in main for Match the Mac (section 4).
6. The crossfade as a still over the window, off under reduced motion (section 6).
7. The limits of section 1.5 stated in the release note, and Claude Code's `/theme` named there.

## What is NOT answered here

- Whether the 54 light icon variants are worth bundling; the mock reads without them.
- Antigravity, CodeWhale and Droid past their first screen, for the reasons in the matrix.
- The permission prompt for agents whose defaults on this machine never show one.
