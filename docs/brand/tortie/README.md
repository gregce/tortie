# Tortie icon exploration

These are exploratory Tortie brand assets. They do not replace the shipping
gmux icon until a direction is selected and redrawn as a production master.

## App and Dock icons

On macOS, the application icon is also the normal Dock icon. A separate Dock
asset is only needed if the application changes its icon at runtime.

All four concepts are 1024×1024 PNGs:

1. `app-icons/01-topographic-shell.png` — concentric shell plates, a blue
   continuity path and one amber attention node. The clearest expression of the
   Zen, but the most detailed at small sizes.
2. `app-icons/02-continuity-loop.png` — one illuminated path moving through the
   shell. The most ownable abstract mark, with some risk of reading as a maze or
   fingerprint.
3. `app-icons/03-sentinel-shell.png` — a low, faceted shell with one amber
   session plate. Strong and stable, but it can drift toward armour.
4. `app-icons/04-terminal-shell.png` — a simpler vertical shell whose seams
   imply a prompt and stacked sessions. The strongest starting point for a
   production icon because its silhouette survives reduction.

## Menu-bar template icons

macOS menu-bar art is a separate monochrome template image. Each direction has:

- `*Template.png` — 18×18, 1×
- `*Template@2x.png` — 36×36, 2×
- `*-template-source.png` — transparent high-resolution source
- `*-source-keyed.png` — original generated source on a magenta removal key

Directions 01–03 preserve more of the corresponding app-icon shell. Directions
04–06 deliberately test more aggressive reductions:

1. topographic shell
2. continuity shell
3. terminal shell
4. radial shell
5. continuity spiral
6. stacked shell

The generated template PNGs contain black artwork and transparency. In Electron,
load the selected pair as template images so macOS can tint them correctly for
light, dark and highlighted menu-bar states.

## Generation notes

The concepts were generated with the built-in GPT Image workflow. The prompts
held these constraints constant while changing the shell construction:

- premium, modern macOS developer-tool icon
- graphite `#131417` / `#1b1d22`
- restrained blue `#4d9de8`
- exactly one amber `#f5b84a` attention detail
- shell as the hero; no face, limbs, mascot treatment, text or terminal window
- calm, durable, watchful and legible at small sizes

Menu-bar sources were generated as flat black marks on `#ff00ff`, keyed to
transparency locally, then resized with Lanczos filtering. Before release, the
selected direction should be manually redrawn on a pixel grid and tested in
both menu-bar appearances at 1× and 2×.
