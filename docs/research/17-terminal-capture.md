# 17 — Terminal capture (screenshot) + copy-as-HTML

Research for **Phase 12 item 2** (terminal screenshot / CleanShot-style capture)
and the **Copy as HTML** half of **item 1**. Dimension A.

Verified live on **2026-08-10** against the npm registry, the published addon
bundle on unpkg, **Electron 43.3.0 executed on this machine**, **tmux 3.6a**,
and the packages actually installed in `/Users/gdc/gmux/node_modules`.
Every number tagged **measured** came out of a probe run in this session
(sources kept in the session scratchpad under `.../scratchpad/cap/`:
`main.js`, `test.html`, `probe2.{js,html}`, `probe3.{js,html}`). Nothing here
is recalled from memory.

---

## 0. Decisions at a glance

| Need | Decision | Marginal cost |
| --- | --- | --- |
| Capture **visible viewport** | `webContents.capturePage(rect)` in main, rect = `.xterm-screen` bounding box | **0 deps**, ~6–13 ms, pixel-exact |
| Capture **selection** (normal case: on screen) | Same `capturePage(rect)`, rect derived from `getSelectionPosition()` + cell metrics | 0 deps |
| Capture **N lines beyond the viewport** | `tmux capture-pane -e` → off-screen `Terminal` → `serializeAsHTML({range})` → SVG `foreignObject` → `<canvas>` → PNG | **1 dep**, ~200 LOC, ~200 ms for 300 lines |
| **Copy as HTML** (item 1) | `serializeAsHTML({ onlySelection: true })` → `clipboard.write({ text, html })` | same dep, ~20 LOC |
| New runtime dependency | **`@xterm/addon-serialize@0.14.0`** — MIT, 205,802 B unpacked, 8 files, published 2025-12-22 **in the same release train as the `@xterm/xterm@6.0.0` already in `package.json`**, no `peerDependencies` | 16 KB of shipped JS |
| Rejected | `html-to-image`, `modern-screenshot`, `satori`, `@xterm/addon-canvas`, `@xterm/addon-image`, `terminal-screenshot`, `webPreferences.offscreen`, tall hidden `BrowserWindow` (kept as fallback), direct WebGL canvas readback | see §4 |

**Verdict: build it.** Beyond-viewport capture is worth doing — but *not* the
way BACKLOG item 2 guesses. The offscreen-tall-window idea works and is
pixel-exact, yet it is the most expensive option and caps out at **442 rows**;
the serialize-to-HTML route needs one 16 KB addon, no second window, no second
renderer entry point, reaches **~1,700 rows**, and hands us Copy-as-HTML for
free. The single honest fidelity loss is **Powerline/Nerd-Font PUA glyphs
render as tofu** (§6.2) — xterm draws those itself, no font contains them.

**The one thing the BACKLOG assumes that is false:** the xterm.js scrollback is
*not* where gmux's scrollback lives. See §2 — this changes the design.

---

## 1. What the xterm.js API actually gives you

### 1.1 Buffer API (already in the tree, `@xterm/xterm@6.0.0`)

`typings/xterm.d.ts` (read from `node_modules`) exposes everything needed to
address an arbitrary line range:

```
IBuffer     : type ('normal'|'alternate'), cursorX/Y, viewportY, baseY,
              length, getLine(y), getNullCell()
IBufferLine : isWrapped, length, getCell(x, cell), translateToString(...)
IBufferCell : getChars/getCode/getWidth,
              getFgColor/getBgColor + isFgRGB/isFgPalette/isFgDefault (and bg),
              isBold/isItalic/isDim/isUnderline/isBlink/isInverse/
              isInvisible/isStrikethrough/isOverline
Terminal    : hasSelection(), getSelection(), getSelectionPosition(),
              select(col,row,len), selectLines(start,end), resize(cols,rows)
```

So a hand-rolled canvas renderer *is* possible (all cell state is public), but
it is ~300 LOC of glyph-positioning that will drift from xterm's own renderer.
Not recommended; the addon does it already.

`getSelectionPosition()` returns **absolute buffer coordinates**
(measured: `{start:{x:0,y:396}, end:{x:100,y:398}}` while `baseY` was 377), so
viewport row = `y - buffer.viewportY`.

### 1.2 `@xterm/addon-serialize@0.14.0` — the exact API

Fetched verbatim from `unpkg.com/@xterm/addon-serialize@0.14.0/typings/`:

```ts
serialize(options?: {
  range?: { start: IMarker | number; end: IMarker | number };
  scrollback?: number;
  excludeModes?: boolean;
  excludeAltBuffer?: boolean;
}): string;                       // ANSI, re-writable into a Terminal

serializeAsHTML(options?: Partial<{
  scrollback: number;
  onlySelection: boolean;
  includeGlobalBackground: boolean;
  range: { startLine: number; endLine: number; startCol: number };
}>): string;                      // inline-styled HTML
```

Both `range` options are **implemented in the shipped 0.14.0 bundle** (read
from `lib/addon-serialize.mjs`, not just the typings). `startLine`/`endLine`
are **absolute buffer line indices**; the HTML serializer forces `end.x = cols`,
so a ranged HTML capture is always full-width rows.

### 1.3 Two traps inside the addon (read from the minified source, then measured)

**Trap A — `serialize()` reads the WRONG buffer for a screenshot.**
`_serializeBufferByRange` is called with `this._terminal.buffer.normal`, and
when the alt buffer is active *and* `excludeAltBuffer` is falsy the **entire**
alt buffer is appended after it. `serializeAsHTML` uses `buffer.active`.

Measured (probe test 5, terminal in alt screen after `ESC[?1049h`):

| call | contains alt-screen text | contains normal-buffer text |
| --- | --- | --- |
| `serializeAsHTML({range})` | **yes** | no |
| `serialize({range})` | yes (appended whole) | **yes (wrong)** |

`serialize()` is a *restore stream*, not a snapshot. For rendering, use
`serializeAsHTML`; if you must use `serialize()` (e.g. to seed another
Terminal), pass `excludeAltBuffer: true, excludeModes: true`.

**Trap B — the palette comes from a private service that only exists after
`open()`.** The HTML serializer does
`terminal._core._themeService.colors.ansi`, falling back to xterm's built-in
default palette when that is missing.

Measured (probe 3): a `Terminal` that is constructed with the gmux `theme` but
**never opened** serializes green as `#4e9a06` (xterm default) instead of
`#6BC46D` (gmux `--terminal green`); `hasThemeService: false`.
→ **The off-screen capture Terminal must be `open()`ed** into a detached,
off-screen (`position:absolute; left:-99999px`, *not* `display:none`) div.
`display:none` also breaks xterm's font measurement.

### 1.4 What the emitted HTML looks like (verbatim shape)

```html
<html><body><!--StartFragment--><pre>
<div style='color: #D8DBE2; background-color: #131417;
            font-family: "SF Mono", ui-monospace, Menlo, monospace;
            font-size: 13px;'>
  <div><span></span><span style='color: #6BC46D;'>green</span>…</div>  ← one div per row
  …
</div></pre><!--EndFragment--></body></html>
```

* fully **inline-styled**; no external stylesheet, no webfont — so it needs no
  CSS-inlining library and no font embedding (Menlo is a system face).
* `includeGlobalBackground: false` (default) → `#000` on `#fff`, i.e. the
  light rendition you want when **pasting into a doc**. `true` → the live
  theme's fg/bg, i.e. what you want for a **screenshot**.
* `<!--StartFragment-->` / `<!--EndFragment-->` are the CF_HTML fragment
  markers clipboards expect.
* Styles emitted: color, background-color, bold, italic, dim (`opacity: .5`),
  underline / overline / line-through, blink, `visibility:hidden` for
  invisible, and a **hardcoded** `#000 on #BFBFBF` for inverse.
* **Not** emitted: `line-height` (see §5.1), underline *style* (SGR `4:3`
  curly and `4:4` dotted both flatten to a plain underline), cursor,
  selection highlight, link underlines.

Measured cost (100-col terminal): **300 rows → 3.4 ms / 182 KB of HTML**;
1,000 rows → 2.5 ms / 244 KB; a 3-row selection → 2 KB.

---

## 2. Where gmux's scrollback actually lives — read this before designing

`src/main/attach/attach-host.ts` attaches with
`tmux -L gmux … attach-session -t =<name>`. A tmux attach delivers **a redraw
of the current screen only** — no history. And `TerminalHost.tsx` mounts a
`TerminalPane` only for *visible* sessions, disposing the `Terminal` (and its
buffer) on hide; `TerminalPane`'s effect also re-creates the terminal on
`sessionId`/retry changes.

**Consequence: the renderer's 10,000-line xterm scrollback holds only the bytes
that streamed since the current attach.** Switch tabs and come back → zero
scrollback. "Capture the last 500 lines" sourced from `term.buffer` would
frequently return a nearly empty image.

The real scrollback is tmux's: `resources/gmux-tmux.conf` sets
`history-limit 50000`, and the restore path even `cat`s the saved snapshot back
into the pane so history survives reboots
(`src/main/restore/command.ts`, `buildSnapshotReplayCommand`).

### 2.1 `capture-pane` facts (measured on tmux 3.6a, private probe server)

```
tmux -L gmux capture-pane -p -e -S -<n> -t <paneTarget>
```

* `-e` keeps SGR colors/attributes; UTF-8 survives intact. **6 ms for 300
  lines**, 10 ms for a full history dump.
* **Range semantics (measured):** `-E -1` ends at the last *history* line and
  **excludes the visible screen** (`-S -300 -E -1` → exactly 300 lines, none of
  them on screen). Omitting `-E` (or `-E -`) ends at the bottom of the visible
  screen. So for "the last N lines ending at what I can see": `-S -(N - rows)`
  with **no** `-E`.
* Trailing blank rows are trimmed automatically — good for screenshots.
* **Do not pass `-J`.** The existing `tmux.capturePane()` helper hardcodes
  `-e -J`; `-J` joins wrapped lines, which destroys the on-screen wrapping a
  screenshot is supposed to reproduce. The capture feature needs a `join:
  false` variant of that helper (extend it with an options arg — do not add a
  second copy, guardrail 3).
* **Target addressing:** `capture-pane -t '=name'` **fails** with
  `can't find pane: =name` (measured) — the `=` exact-match prefix works for
  target-*session* but not target-*pane*. `=name:`, bare `name`, and `$<id>`
  all work. `src/main/restore/snapshots.ts` already documents this and works
  around it with a private `resolvePaneTarget()`; the capture feature must use
  the same resolution (promote `resolvePaneTarget` into `src/main/tmux/` and
  have both callers share it — guardrail 3/4).
* **Bonus:** this works for sessions that are not mounted or not visible, so
  "capture this session" can live on the session-tab context menu too.
* **Alt-screen caveat:** the alternate buffer has no history, in tmux or in
  xterm. For a full-screen TUI agent (codex's ratatui UI; anything that sent
  `ESC[?1049h`) "last N lines" cannot exist. Detect with
  `term.buffer.active.type === 'alternate'` and disable/grey the
  beyond-viewport items, leaving viewport capture (which works fine).

---

## 3. Electron capture paths — measured, not assumed

All numbers from Electron **43.3.0** on this Mac (`devicePixelRatio` 2).

### 3.1 `webContents.capturePage(rect)` — the winner for the viewport

* `rect` is in **DIP / CSS pixels**; the returned `NativeImage` is at the
  device scale. Measured: `rect {x:10,y:10,width:400,height:200}` →
  `800 × 400` image.
* Whole page: **13 ms**. Region: **6 ms**.
* Captures the composited result, so the WebGL glyphs, the DOM overlays and
  the selection highlight are all in it — WYSIWYG by construction.
* **Works on a hidden window** (`show:false` + the default
  `paintWhenInitiallyHidden:true`): measured non-empty 2000×1144 capture of a
  never-shown window rendering a WebGL xterm. Electron's docs put it as
  "the page is considered visible when its browser window is hidden and the
  capturer count is non-zero".
* gmux already uses this in the `GMUX_SHOT` harness (`src/main/index.ts:645`,
  `:680`) — the mechanism is proven in this app.

### 3.2 Tall hidden window — works, but hits a hard wall at ~8,000 CSS px

`BrowserWindow({show:false, paintWhenInitiallyHidden:true})` +
`setContentSize(1000, H)` + `capturePage()`:

| content height (CSS px) | result |
| --- | --- |
| 3,000 | OK — 2000×6000 image, 455 ms, bottom row painted |
| 8,000 | OK — 2000×16000 image, 959 ms, bottom row painted |
| 16,000 | **`Error: UnknownVizError`** |
| 20,000 | **`Error: UnknownVizError`** |

The wall is the compositor's 16,384-device-pixel texture limit →
**≈ 8,192 CSS px at dpr 2 ≈ 442 terminal rows per capture** (cell height 18.5).
Anything longer must be tiled and stitched anyway.

### 3.3 `webPreferences.offscreen: true` — do not use

Measured in an OSR window: `webgl2` is **false** (no GPU context) and
`devicePixelRatio` is forced to **1**. You would lose both the renderer xterm
uses and Retina resolution. The `paint` event delivered one frame at 900×2000;
`capturePage()` still returned a 2× image, but the page itself rendered at 1×.
Use a plain hidden window instead.

### 3.4 Reading the WebGL canvas directly — do not use

`WebglAddon`'s constructor takes `preserveDrawingBuffer` and forwards it to
`getContext('webgl2', {antialias:false, depth:false, preserveDrawingBuffer})`
(read from `node_modules/@xterm/addon-webgl/lib/addon-webgl.js`). gmux calls
`new WebglAddon()` → `false`.

Measured: `canvas.toDataURL()` on that canvas *did* return real content
(184,998 bright pixels) even with `preserveDrawingBuffer:false`, thanks to
Chromium's lazy-clear behaviour — but the spec says the buffer is undefined
after compositing, so this is luck, not a contract. Setting
`preserveDrawingBuffer:true` costs live-terminal performance for every frame.
Either way it only ever yields the **viewport**, and it misses the sibling
`xterm-link-layer` 2-D canvas (measured: `.xterm` contains three canvases —
`xterm-link-layer` 2d, the WebGL canvas, and a 64×45 atlas canvas).
`capturePage` gets all of that for free.

---

## 4. HTML→image libraries: verified unnecessary (and mostly harmful here)

### 4.1 The WebGL renderer emits no row DOM — measured

With the WebGL addon loaded, `document.querySelector('.xterm-rows')` is
**null** (`domRowsChildren: -1`) and `.xterm-screen`'s `innerHTML` is **864
characters** — the canvases and helpers, no text. A DOM-snapshot of a gmux
terminal captures an empty rectangle.

Nuance, so the claim is exact: `html-to-image` *does* special-case
`HTMLCanvasElement` and swaps it for `canvas.toDataURL()` (verified in
`html-to-image@1.11.13/dist/html-to-image.js`), so it could accidentally pick
up the WebGL viewport — subject to the same undefined-buffer caveat as §3.4,
and only the viewport. `modern-screenshot` works the same way. Neither can
reach a single line of scrollback.

### 4.2 Why no library is needed even for the HTML we generate

These libraries exist to **clone a live DOM node, inline every computed style,
and embed webfonts/images**. Our input is machine-generated, already fully
inline-styled, and uses a system font. What remains is 35 lines:

```
XMLSerializer → <svg><foreignObject> → data: URL → <img>.decode()
             → canvas.drawImage → canvas.toBlob('image/png')
```

Measured: not tainted (`toDataURL()` succeeded — an SVG from a `data:` URL is
same-origin and carries no external refs), 300 lines rendered in **18–168 ms**.

### 4.3 Scorecard

| Package | Latest / date | License | Verdict |
| --- | --- | --- | --- |
| `@xterm/addon-serialize` | **0.14.0** / 2025-12-22 | MIT | **ADOPT** — xterm-6 release train, no peer deps, 205 KB unpacked |
| `html-to-image` | 1.11.13 / 2025-02-14 | MIT | Reject — 18-month-old, solves a problem we don't have, viewport-only |
| `modern-screenshot` | 4.7.0 / 2026-04-16 | MIT | Reject — actively maintained but same story; 35 LOC replaces it |
| `dom-to-image-more` | 3.10.2 / 2026-07-10 | MIT | Reject — same class |
| `html2canvas` | 1.4.1 / 2022-01-22 | MIT | Reject — abandoned, re-implements layout |
| `satori` | 0.29.0 / 2026-07-23 | **MPL-2.0** | Reject — takes JSX objects not HTML strings; fonts must be supplied as ArrayBuffers (**no system fonts** → we'd bundle a mono TTF); flexbox subset only; emits SVG that still needs resvg to rasterize |
| `@xterm/addon-canvas` | 0.7.0 / **2024-04-05** | MIT | Reject — `peerDependencies: {"@xterm/xterm":"^5.0.0"}`, absent from the 6.0.0 train (its newest beta is 2024-07-14). Unmaintained |
| `@xterm/addon-image` | 0.9.0 / 2025-12-22 | MIT | Not applicable — it *displays* SIXEL/iTerm inline images inside the terminal. No export API. (Relevant only if gmux ever wants to render images *in* a pane.) |
| `terminal-screenshot` | 1.1.0 / 2024-02-07 | MIT | Reject — the right idea (xterm renders ANSI, then screenshot) but it ships `puppeteer@21` + `xterm@5.3`. We already *are* Chromium |

No purpose-built "xterm → PNG" addon exists as of 2026-08-10.

---

## 5. Recommended implementation

Three code paths, one menu.

```
Capture Visible      ──► main.capturePage(screenRect)                    [exact]
Capture Selection    ──► selection in viewport?  ──yes─► capturePage(selRect)
                                                 └──no──► HTML path
Capture Last N Lines ──► tmux capture-pane -e -S -(N-rows)
                          → off-screen Terminal(rows=N).open()
                          → serializeAsHTML({range: whole buffer})
                          → foreignObject → canvas → PNG
```

### 5.1 Cell metrics — read them, never compute them

Measured for the shipped stack (Menlo 13 px, `lineHeight: 1.25`):
**cell = 7.5 × 18.5 CSS px.** Note `13 × 1.25 = 16.25 ≠ 18.5` — xterm derives
the cell height from measured font metrics, so computing it from the options
is wrong and produces a visibly squashed image.

```ts
const screenEl = paneEl.querySelector('.xterm-screen') as HTMLElement;
const r = screenEl.getBoundingClientRect();
const cellH = r.height / term.rows;   // 18.5
const cellW = r.width  / term.cols;   // 7.5
```

Public DOM only — no `_core` access.

### 5.2 Viewport capture

```ts
// renderer
const r = paneEl.querySelector('.xterm-screen')!.getBoundingClientRect();
await gmux.capture.viewport(sessionId, {
  x: Math.round(r.x), y: Math.round(r.y),
  width: Math.round(r.width), height: Math.round(r.height)
}, { to: 'clipboard' | 'file' });

// main
const image = await win.webContents.capturePage(rect);   // NativeImage, 2×
to === 'clipboard' ? clipboard.writeImage(image)
                   : writeFile(await pickPath(), image.toPNG());
```

Intersect the rect with the pane's visible area first if any ancestor clips it.

### 5.3 Selection capture

```ts
const sel = term.getSelectionPosition();               // absolute buffer coords
const top = sel.start.y - term.buffer.active.viewportY;
const bot = sel.end.y   - term.buffer.active.viewportY;
if (top >= 0 && bot < term.rows) {
  // fully on screen → pixel-exact capturePage of the row band
  rect = { x: r.x, y: r.y + top * cellH,
           width: r.width, height: (bot - top + 1) * cellH };
} else {
  // scrolled out → HTML path with { range: {startLine: sel.start.y,
  //                                  endLine: sel.end.y, startCol: 0} }
}
```

Selecting a full-width band rather than the exact character columns is the
right call — it matches what CleanShot/iTerm produce and avoids ragged edges.

### 5.4 Beyond-viewport capture

```ts
// main: reuse the existing helper, extended with { join:false, escapes:true }
const paneTarget = await resolvePaneTarget(tmuxName);       // NOT `=name`
const ansi = await tmux.capturePane(paneTarget, n - rows, { join: false });

// renderer: one hidden host div, reused across captures
host.style.cssText = 'position:absolute;left:-99999px;top:0;' +
                     `width:${cols * cellW}px;height:${n * cellH}px`;
const t = new Terminal({ cols, rows: n, scrollback: 0, theme, fontFamily,
                         fontSize, lineHeight, allowProposedApi: true });
const ser = new SerializeAddon();
t.loadAddon(ser);
t.open(host);                       // REQUIRED — see §1.3 Trap B
await new Promise<void>(r => t.write(ansi.replace(/\n/g, '\r\n'), r));
const html = ser.serializeAsHTML({
  range: { startLine: 0, endLine: n - 1, startCol: 0 },
  includeGlobalBackground: true
});
const png = await rasterize(html, cols * cellW, n * cellH, cellH);
t.dispose();
```

Measured end-to-end for 300 lines × 100 cols (probe 3, real tmux capture):
tmux 6 ms → write 4.8 ms → serialize 3.9 ms → rasterize 168 ms →
**1540 × 11140 PNG**. Under a quarter of a second.

### 5.5 The rasterizer (~35 LOC, no dependency)

```ts
async function rasterize(html: string, wCss: number, hCss: number,
                         cellH: number, pad = 10): Promise<Blob> {
  const root = new DOMParser().parseFromString(html, 'text/html')
                              .querySelector('div')!;
  root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');   // XHTML in SVG
  Object.assign(root.style, {
    lineHeight: `${cellH}px`,     // xterm's REAL cell height, not fontSize*lh
    whiteSpace: 'pre', margin: '0', padding: `${pad}px`
  });
  const W = Math.ceil(wCss) + pad * 2, H = Math.ceil(hCss) + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
            + `<foreignObject width="100%" height="100%">`
            + new XMLSerializer().serializeToString(root)
            + `</foreignObject></svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const dpr = window.devicePixelRatio || 1;
  const cv = Object.assign(document.createElement('canvas'),
                           { width: W * dpr, height: H * dpr });
  const cx = cv.getContext('2d')!;
  cx.fillStyle = getComputedStyle(document.documentElement)
                   .getPropertyValue('--bg-canvas').trim() || '#131417';
  cx.fillRect(0, 0, cv.width, cv.height);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.drawImage(img, 0, 0, W, H);
  return await new Promise<Blob>(r => cv.toBlob(b => r(b!), 'image/png')!);
}
```

Two refinements worth the few lines:

* **Horizontal drift.** `<pre>` advances by the font's natural width while
  xterm snaps to `cellW`. Measured over 78 columns the HTML render sits ~9 px
  (≈1.5%) right of the live render. Fix with
  `root.style.letterSpacing = (cellW - naturalAdvance) + 'px'`, measuring
  `naturalAdvance` once with a canvas `measureText('M'.repeat(100)).width/100`
  in the same font. Wide (CJK) cells still drift by one letter-space each;
  accept it.
* **`img.decode()` can reject** on malformed XHTML. Wrap it and fall back to
  the viewport capture with a toast rather than throwing.

### 5.6 Delivery: clipboard and file

Do the I/O in main, via **`ArrayBuffer`, never a data URL** — the 2,000-line
data URL measured **79 MB** as a string (the PNG itself was 47 MB).

```ts
// preload/shared: append to the ONE channel map in src/shared/ipc.ts (guardrail 1)
'capture:viewport': { req: [{ sessionId: string; rect: Rect; to: Sink }];
                      res: { path?: string } };
'capture:image':    { req: [{ png: Uint8Array; to: Sink; suggestedName: string }];
                      res: { path?: string } };

// main
clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(png)));
// or dialog.showSaveDialog({ defaultPath: `~/Desktop/gmux-${name}-${stamp}.png` })
```

Verified working in main this session: `clipboard.write({ text, html })`
round-trips (`readHTML()` returns the fragment, Electron prepends
`<meta charset='utf-8'>`), and `clipboard.writeImage` takes a `NativeImage`
built from either a buffer or a data URL.

### 5.7 Menu wiring

`ui:popupMenu` renders a **flat** item list — `PopupMenuItem` has no submenu
field and `registerPopupMenuHandler` (`src/main/ipc.ts:960`) maps items 1:1
(the same limitation `split-menu.ts` already notes). So append flat items to
the terminal context menu:

```
Copy                     ⌘C
Copy as HTML
──────────
Capture Visible          ⇧⌘4        → clipboard (⌥ = save…)
Capture Selection                   → enabled only when hasSelection()
Capture Last 250 Lines              → disabled in the alternate buffer
Capture Last 1000 Lines
──────────
Clear                    ⌘K
```

Keep the line counts as fixed presets; a "Custom…" dialog can come later.
Grey the two "Last N" items with a hint when
`term.buffer.active.type === 'alternate'`.

### 5.8 Copy as HTML (BACKLOG item 1)

```ts
const html = ser.serializeAsHTML({ onlySelection: true });   // light rendition
gmux.clipboard.writeRich({ text: term.getSelection(), html });
// main: clipboard.write({ text, html })
```

Leave `includeGlobalBackground` **off** here: black-on-white is what people
want in Notion/Slack/Word. Offer the dark rendition only from the capture
items, which set it to `true`. This needs the serialize addon loaded on the
*live* terminal too (it is free — the addon does nothing until called).

---

## 6. Limits, fidelity, and the honest caveats

### 6.1 Hard caps (measured)

| Path | Cap | Cause |
| --- | --- | --- |
| Hidden-window `capturePage` | ~8,192 CSS px ≈ **442 rows** @dpr 2 | compositor 16,384 px texture; 16,000 CSS px → `UnknownVizError` |
| `foreignObject` → canvas | ~65,535 device px ≈ **1,770 rows** @dpr 2 | canvas max dimension |
| Practical recommendation | **cap the UI at 1,000 rows**, warn past 500 | a 2,000-row PNG measured 47 MB on disk and ~468 MB of canvas RAM |
| tmux source | 50,000 lines | `history-limit` in `resources/gmux-tmux.conf` |

### 6.2 Fidelity: HTML path vs. the live WebGL renderer

Side-by-side evidence, same content, same 1170×814 output, both committed next
to this doc:

* `assets/17-terminal-capture/P2-live-webgl.png` — `capturePage` of the live terminal
* `assets/17-terminal-capture/P2-html-foreignobject.png` — the HTML path

| Feature | HTML path | Note |
| --- | --- | --- |
| 16/256/24-bit colors, bg colors | ✅ exact | palette read from the live theme (requires `open()`, §1.3) |
| bold / italic / dim / strike / overline | ✅ | dim = `opacity:.5` |
| box drawing `┌ ─ ├ ┼ ╭ ═` | ✅ readable | xterm draws seamless joins itself; the font's glyphs leave hairline gaps at corners |
| block/shade `█ ▓ ░ ▌`, braille spinners | ✅ | |
| CJK / emoji | ✅ | |
| **Powerline + Nerd-Font PUA (U+E0B0…)** | ❌ **tofu** | xterm renders these with its own `customGlyphs`; no installed font has them. Nerd-Font icons are already tofu on screen, but the Powerline separators are not |
| underline *styles* (SGR `4:3` curly, `4:4` dotted) | ⚠️ flattened to plain underline | serializer emits only `text-decoration: underline` |
| inverse video | ⚠️ `#000` on `#BFBFBF` hardcoded | live renderer swaps the real theme colors |
| cursor, selection highlight, link underline | ❌ absent | arguably correct for a screenshot |
| horizontal position | ⚠️ ~1.5% drift | correctable, §5.5 |
| row height | ✅ exact once `cellH` is used | |

For gmux's default shell (robbyrussell: `➜`, `✗`) and for Claude Code's output,
everything above renders correctly. A user with a Powerline prompt gets tofu in
the separators of scrollback captures only — the viewport capture is always
pixel-exact.

### 6.3 Other pitfalls to design around

* **Alt screen** → no history anywhere; disable the "Last N" items (§2.1).
* **Terminal reflow.** `capture-pane` returns the pane at its *current* width;
  if the user resized after the output was produced, tmux has already reflowed
  it. Nothing to do — it matches what a scrollback view would show.
* **Off-screen Terminal cost.** 300 rows opened + written measured 36–41 ms.
  Dispose it after each capture; do not keep a 1,000-row terminal alive.
* **Fonts.** `await document.fonts.ready` before opening the capture terminal,
  exactly as `TerminalPane` already does — otherwise cell metrics are measured
  against a fallback face.
* **Save dialog path.** `~/Desktop/gmux-<session>-<YYYY-MM-DD-HHmmss>.png` is
  the CleanShot-ish default; remember the last directory.
* **Do not clobber the clipboard silently** — a toast ("Captured 250 lines →
  clipboard") is what makes this feel like CleanShot.

### 6.4 Acceptance / test plan

1. Unit (vitest, jsdom): range math — `linesToRange(n, rows, buffer)`,
   selection-in-viewport predicate, `letterSpacing` correction. Pure functions,
   no DOM canvas needed.
2. Unit: the tmux arg builder — asserts `-e`, no `-J`, `-S -(N-rows)`, no
   `-E`, and a `$id`/`name:`-shaped target (never `=name`).
3. Electron smoke (`GMUX_SMOKE=capture`): create a session, write 400 known
   lines, capture 300, assert PNG dimensions == `cols*cellW × 300*cellH` (±pad)
   and that the top-left and bottom-right sample pixels are non-background.
4. Manual: alt-screen agent → "Last N" items disabled; Powerline prompt →
   documented tofu; 1,000-line capture completes < 1 s and lands on the
   clipboard.

---

## 7. Fallback, and what to do if the fidelity gap ever matters

**Fallback A — tall hidden BrowserWindow (pixel-exact, ≤442 rows/tile).**
Proven working this session: a `show:false` window rendering a real xterm with
the WebGL addon captured correctly at dpr 2 (`A-hidden.png`). Seed it with
`serialize({ range, excludeAltBuffer: true, excludeModes: true })` or with the
raw `capture-pane -e` ANSI, size it to `rows = N`, `capturePage()`. Costs: a
second renderer entry in `electron.vite.config.ts`, a second copy of the xterm
bundle in the window, ~1 s per 8,000 px capture, window lifecycle management,
and tiling+stitching past 442 rows. Take this only if Powerline users complain.

**Fallback B — scroll-and-stitch on the live pane.** `term.scrollToLine()` +
`capturePage` per viewport + composite. Pixel-exact and needs zero new deps,
but it visibly scrolls the user's terminal and races live output. This is what
CleanShot does to other apps; inside our own app the HTML path is strictly
nicer.

**Rejected outright:** rendering the buffer by hand onto a 2-D canvas from
`IBufferCell` (all data is public, ~300 LOC, but it re-implements a renderer
that will drift), and `@xterm/addon-canvas` as a capture surface (unmaintained
since 2024, peer-pinned to xterm 5).

### Final verdict

Ship the three-path design in §5. One MIT dependency
(`@xterm/addon-serialize@0.14.0`), no new windows, no new build entries, about
200 LOC plus menu wiring, and it delivers *both* Phase 12 item 2 and the
Copy-as-HTML half of item 1. The beyond-viewport capture is genuinely worth
building — provided it is sourced from **tmux**, not from the xterm buffer,
which on this architecture is usually empty.
