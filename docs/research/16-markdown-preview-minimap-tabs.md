# 16 — Markdown preview, minimap, and the editor-tab contract

Research for **Phase 12 items 6 and 5** (BACKLOG.md "dogfood round 2").
Dimension C. Verified live on **2026-08-10** against the npm registry, GitHub,
the Electron v43.3.0 docs, and the packages actually installed in this tree.
Everything in "Verified in tree" was read from `/Users/gdc/gmux/node_modules`,
not recalled.

---

## 0. Decisions at a glance

| Question | Decision | Marginal cost |
| --- | --- | --- |
| Markdown → React | **react-markdown 10.1.0** (MIT) + remark-gfm 4.0.1 (MIT) | 141 KB min / 43 KB gzip |
| Code fences | **Reuse the Shiki already in the tree** via `@shikijs/rehype@4.4.3/core` + `getSharedHighlighter` from `@pierre/diffs` | ~5 KB; **zero** new highlighter, zero new theme |
| Sanitization | **rehype-sanitize 6.0.0** (MIT), *not* DOMPurify | 8 KB min / 3 KB gzip |
| Raw HTML in markdown | **rehype-raw 7.0.0** (MIT), sanitize immediately after | 188 KB min / 59 KB gzip — the one expensive piece; see §1.6 |
| Relative images | New `gmux-asset:` privileged protocol in main + one CSP line | ~40 LOC main |
| External links | Reuse the existing `setWindowOpenHandler` via `window.open(href,'_blank')` | 0 new IPC |
| Minimap, Monaco stays | **Monaco built-in** — flip `minimap.enabled`, add 4 theme keys | ~15 LOC |
| Minimap, Monaco gone | **Custom canvas minimap fed by Shiki tokens** — not `@replit/codemirror-minimap` | ~180 LOC, no dependency |
| Preview-pane scroll indicator | **Heading overview ruler**, not a character minimap | ~120 LOC |
| Editor tabs | VS Code contract, verified from VS Code source; gmux needs 6 specific deltas (§3.3) | — |

**Total new runtime dependency weight: ~340 KB minified / ~105 KB gzipped**,
against a `monaco-impl` chunk that is **25 MB** and a `ts.worker` chunk that is
**13 MB** in `out/renderer/assets` today. The markdown stack is noise.

---

## 1. Markdown preview (BACKLOG item 6, first half)

### 1.1 What is already in the tree (verified)

```
shiki                       4.4.3   MIT   (via @pierre/diffs AND @pierre/theming)
@shikijs/core               4.4.3   MIT
@shikijs/langs              4.4.3   MIT   (11 MB source → 419 lazy chunks in out/)
@shikijs/themes             4.4.3   MIT
@shikijs/vscode-textmate   10.0.2   MIT
@shikijs/transformers       4.4.3   MIT   (dep of @pierre/diffs)
hast-util-to-html           9.0.5   MIT   (dep of @pierre/diffs)
mdast-util-to-hast         13.2.1   MIT   (dep of hast-util-to-html)
micromark-util-*                    MIT   (partial, transitive)
marked                     14.0.0   MIT   (monaco-editor only — dies with Monaco)
dompurify                   3.4.8   MPL-2.0 OR Apache-2.0 (monaco-editor only — dies with Monaco)
```

So **Shiki is confirmed present**, at the exact version `@shikijs/rehype@4.4.3`
depends on (`"shiki": "4.4.3"`, pinned, so it dedupes to the installed copy).
`mdast-util-to-hast` — the core of the mdast→hast bridge react-markdown uses —
is already installed too.

Do **not** plan on `marked` or `dompurify`: both are Monaco's private
transitive deps and vanish the day Monaco is deleted. `dompurify` is also
`MPL-2.0 OR Apache-2.0`, not MIT.

### 1.2 The big finding: `@pierre/diffs` re-exports the shared Shiki highlighter

`@pierre/diffs@1.3.5` exports, from its main entry:

```ts
getSharedHighlighter({ themes, langs, preferredHighlighter })  // Promise<DiffsHighlighter>
getHighlighterIfLoaded(): DiffsHighlighter | undefined
preloadHighlighter(options): Promise<void>
codeToHtml            // literally re-exported from "shiki"
registerCustomTheme   // already used by src/renderer/pierre/theme-bridge.ts
getFiletypeFromFileName(name)  // filename → Shiki lang id
```

and `type DiffsHighlighter = HighlighterGeneric<SupportedLanguages, DiffsThemeNames>`
— i.e. a plain Shiki highlighter.

Reading `node_modules/@pierre/diffs/dist/highlighter/shared_highlighter.js`
confirms the behaviour that makes this work:

- It holds **one module-level singleton**, created with
  `createHighlighter({ themes: [], langs: ['text'], engine: createJavaScriptRegexEngine() })`.
- Every subsequent `getSharedHighlighter({ themes, langs })` call **attaches**
  the requested themes and languages to that same instance and returns it.

**Consequence:** the markdown preview can call

```ts
const hl = await getSharedHighlighter({
  themes: [GMUX_THEME_NAME],       // already registered by theme-bridge.ts
  langs: fenceLanguagesFoundInThisFile
});
```

and get code fences highlighted **by the same engine, with the same theme
object, as the diff viewer** — no second highlighter, no second WASM/regex
engine, no second theme registration, no drift between "code in a diff" and
"code in a README". This is the single most important architectural point in
this document.

Two supporting facts, verified:

- The default engine is `shiki-js` (`createJavaScriptRegexEngine`), so there is
  **no oniguruma WASM** in the picture. Shiki's own compatibility report
  (`docs/references/engine-js-compat.md`, generated 2026-07-31 for 4.3.1)
  states **237 of 238 built-in grammars are supported** by the JS engine, with
  `markdown`, `mdx`, `typescript`, `tsx`, `json`, `python`, `go`, `rust`,
  `yaml`, `toml`, `bash` all `✅ OK`. The single unsupported grammar is `ahk2`.
- Languages are already code-split: `out/renderer/assets/` contains 419 chunks
  including `markdown-*.js`, `typescript-*.js`, `python-*.js`. Loading a fence
  language costs one small chunk, on demand.

### 1.3 Recommended stack — exact packages

Add to `dependencies`:

| Package | Version | License | Published | Why |
| --- | --- | --- | --- | --- |
| `react-markdown` | `10.1.0` | MIT | 2025-03-07 | mdast→React without `dangerouslySetInnerHTML` |
| `remark-gfm` | `4.0.1` | MIT | 2025-02-10 | tables, task lists, strikethrough, autolinks, **footnotes** |
| `rehype-sanitize` | `6.0.0` | MIT | 2023-08-26 | GitHub-equivalent allowlist, tree-level (no DOM round-trip) |
| `rehype-raw` | `7.0.0` | MIT | 2023-08-26 | raw HTML blocks in READMEs (badges, `<p align="center">`) |
| `@shikijs/rehype` | `4.4.3` | MIT | **2026-08-10** | `/core` entry: sync transformer over an existing highlighter |

`remark-gfm@4.0.1` → `mdast-util-gfm@3.1.0` → `mdast-util-gfm-footnote@^2`, so
**GFM footnotes are covered** by remark-gfm alone; no extra plugin.

Optional, only if dogfooding demands it:

| Package | Version | License | For |
| --- | --- | --- | --- |
| `remark-frontmatter` | `5.0.0` | MIT | swallow the leading `---` YAML block (otherwise it renders as `<hr>` + text) |
| `remark-math` + `rehype-katex` | `6.0.0` / `7.0.1` | MIT | LaTeX — defer, KaTeX pulls fonts and breaks the `font-src 'self'` CSP |

**Not recommended:** `rehype-slug` (6.0.0) and `rehype-autolink-headings`
(7.1.0). react-markdown passes the hast `node` to every custom component
(`passNode: true`, verified in `lib/index.js` line 355), so heading ids and
anchor links are ~15 lines in a custom `h1..h6` component, with an id scheme we
control (`md-<slug>`) instead of sanitize's `user-content-` clobber prefix.

### 1.4 Why react-markdown, not markdown-it or marked

| | react-markdown 10.1.0 | markdown-it 15.0.0 | marked 18.0.9 |
| --- | --- | --- | --- |
| License | MIT | MIT | MIT |
| Output | **React elements** | HTML string | HTML string |
| Needs `dangerouslySetInnerHTML` | **No** | Yes | Yes |
| Needs a DOM sanitizer | No (tree-level `rehype-sanitize`) | Yes (DOMPurify, MPL/Apache) | Yes |
| Per-node component override | **Yes, typed, with `node`** | Renderer-rule hacking | Renderer overrides |
| Shiki integration | `@shikijs/rehype/core`, hast-native | `@shikijs/markdown-it` | manual |
| CommonMark + GFM | micromark, spec-tested | spec-tested | spec-tested |
| Size (min / gzip) | 111 / 33 KB | 109 / 46 KB | 42 / 12 KB |
| Last release | 2025-03-07 | 2026-07-30 | 2026-08-04 |
| Repo health | 15.8k ★, 5 open issues, last commit 2025-04-21 | active | active |

**Pick react-markdown.** Three reasons that matter for gmux specifically:

1. **No HTML string ever exists.** markdown-it and marked both produce an HTML
   string that must be injected with `dangerouslySetInnerHTML`, which means
   sanitization becomes a load-bearing security control in an Electron renderer
   that has a preload bridge to the filesystem and to tmux. react-markdown
   builds React elements from a hast tree — the escape hatch is never opened.
   The sanitizer is defence in depth, not the only wall.
2. **Component overrides are the feature list.** Item 6 needs: `a` → open
   externally / open a sibling `.md` in a new tab; `img` → rewrite to the asset
   protocol and handle load failure; `input[type=checkbox]` → task-list styling;
   `h1..h6` → anchor ids and minimap section marks; `table` → an
   `overflow-x:auto` wrapper. All five are one-liners in `components`, all five
   are renderer-rule surgery in markdown-it.
3. **hast is the same currency Shiki speaks.** `rehypeShikiFromHighlighter`
   returns a `Transformer<Root, Root>` that rewrites `<pre><code>` nodes in
   place. No serialize/reparse round trip.

**The honest counter-argument:** react-markdown's last release is 2025-03-07
and its last commit 2025-04-21 — ~16 months quiet as of today. This is the
unified ecosystem's normal end-state (5 open issues on 15.8k stars, the
maintainer treats it as finished), not abandonment, and the API is frozen. But
it is a real difference from markdown-it/marked, which both shipped within the
last two weeks. Mitigation: the remark/rehype layer is swappable behind one
`MarkdownPreview.tsx` module; nothing else in gmux should import it.

React 19 compatibility: peer is `react: ">=18"`, and rendering goes through
`react/jsx-runtime` via `hast-util-to-jsx-runtime`. Fine with the installed
React 19.2.8.

### 1.5 Pipeline — the order is load-bearing

```ts
<Markdown
  remarkPlugins={[remarkGfm /*, remarkFrontmatter */]}
  rehypePlugins={[
    rehypeRaw,                                   // 1. raw HTML → real hast nodes
    [rehypeSanitize, gmuxSchema],                // 2. THEN drop everything unsafe
    [rehypeShikiFromHighlighter, shikiOptions]   // 3. THEN add trusted styled spans
  ]}
  urlTransform={gmuxUrlTransform}
  components={gmuxComponents}
>
  {source}
</Markdown>
```

Three ordering rules, each of which is a bug if broken:

1. **`rehypeRaw` before `rehypeSanitize`.** Raw parses untrusted markup; sanitize
   must see the result. Reversed, sanitize inspects an opaque `raw` node and
   raw then injects unsanitized markup.
2. **`rehypeShikiFromHighlighter` *after* `rehypeSanitize`.** I read
   `hast-util-sanitize@5.0.2`'s `defaultSchema`: the `'*'` attribute allowlist
   contains 60+ entries and **`style` is not one of them**. Shiki emits
   `<span style="color:#82bfff">`. Highlight before sanitize and every colour
   is stripped — you get a monochrome fence and no error. Highlight *after*
   sanitize and the styles survive, because we generated them.
3. **`code[className=/^language-./]` must survive sanitize** for Shiki to know
   the fence language. It does — the default schema explicitly allows it
   (with the source comment "Note: this class is not normally allowed by GH…
   We can't do that, so we have to allow it").

`rehypeShikiFromHighlighter` signature, read from
`@shikijs/rehype@4.4.3/dist/core.d.mts`:

```ts
declare function rehypeShikiFromHighlighter(
  highlighter: HighlighterGeneric<any, any>,
  options: RehypeShikiCoreOptions
): Transformer<Root, Root>;
```

`DiffsHighlighter` satisfies `HighlighterGeneric<any, any>` — pass the shared
one straight in. Relevant options, from `dist/types-*.d.mts`:

```ts
{
  theme: GMUX_THEME_NAME,        // resolved by name off the shared highlighter
  fallbackLanguage: 'text',      // unknown fence lang → plain, never a throw
  onError: (e) => console.warn('[md] shiki', e),
  addLanguageClass: true,        // keep language-* for CSS hooks
  stripEndNewline: true,         // default; kills mdast-util-to-hast's trailing \n
  lazy: false,                   // MUST stay false — see below
  cache: new Map()               // memoise codeToHast across re-renders
}
```

**`lazy` must stay `false`.** Its own doc comment: *"When enable, this would
make requires the unified pipeline to be async."* `<Markdown>` is synchronous.
So languages must already be attached before render.

Two ways to satisfy that; **recommend (a)**:

- **(a) Scan-then-render.** Regex the source for fence infostrings
  (`/^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*([A-Za-z0-9_+#.-]+)/gm`), map through
  Shiki's language aliases, `await getSharedHighlighter({ themes:[GMUX_THEME_NAME], langs })`,
  then render synchronously. Deterministic, one await per file open, no
  flash-of-unstyled-code, and only the languages this document actually uses
  get loaded.
- **(b) `MarkdownHooks` with `lazy: true`.** react-markdown 10 exports
  `MarkdownHooks(options: HooksOptions): ReactNode` for exactly this — it runs
  the pipeline in `useEffect` and accepts a `fallback` node. It works, but the
  first paint is the fallback and every re-render re-runs an async pipeline.
  Keep it as the escape hatch, not the default.

### 1.6 Raw HTML — the one judgement call

react-markdown's default (no `rehypeRaw`, `skipHtml: false`) turns raw HTML
into a **literal text node** — `<p align="center">` renders as visible angle
brackets. Verified in `lib/index.js`'s `transform()`.

That is safe and cheap, and it is also wrong for the actual corpus gmux
displays: repository READMEs. Shields.io badge rows, `<p align="center">` logo
headers, `<details><summary>` blocks and `<br>` are everywhere.

`rehype-raw` is 188 KB min / **59 KB gzip** — it embeds a full parse5-class HTML
parser, and it is 56% of this whole proposal's weight. Still: 59 KB in an app
that ships a 25 MB Monaco chunk is not a real cost, and "the README looks like
GitHub" is the entire point of item 6.

**Recommendation: include `rehype-raw`, sanitize immediately after it, and put
the preview behind the existing lazy-chunk pattern** (`markdown-impl.ts`,
dynamic-imported on first `.md` open, mirroring `monaco-loader.ts`). If the
integrator wants to cut it, the fallback is `skipHtml: true` (drop raw HTML
silently) rather than the default literal-text rendering, which looks broken.

Sanitize schema — start from `defaultSchema` and make exactly these edits:

```ts
const gmuxSchema: Schema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, 'kbd', 'details', 'summary', 'picture', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    img:  [...(defaultSchema.attributes.img ?? []), 'width', 'height', 'loading', 'align'],
    code: [['className', /^language-./]],
    a:    [...(defaultSchema.attributes.a ?? []), 'title']
  },
  protocols: {
    ...defaultSchema.protocols,
    // the asset protocol from §1.7 — WITHOUT this, every local image is stripped
    src:  ['http', 'https', 'gmux-asset'],
    href: [...(defaultSchema.protocols?.href ?? []), 'gmux-asset']
  }
};
```

Note `details`/`summary`/`kbd`/`picture`/`source` are *already* in
`defaultSchema.tagNames` — re-listing them is harmless, but the ones you
genuinely need to check for are whatever your corpus uses. **Never** add
`style` or `script` to the allowlist.

### 1.7 Relative images — the protocol, not a data URI

Verified constraints:

- `src/renderer/index.html` CSP is
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src 'self' blob:`.
- `hast-util-sanitize`'s default `protocols.src` is `['http','https']` — a
  `file:` URL is stripped, silently.
- react-markdown's `defaultUrlTransform` allows relative URLs through, so
  `![x](./img/a.png)` reaches the DOM as a relative URL, which in production
  resolves against `file:///…/out/renderer/index.html` — the wrong directory.
- `fs:readFile` in `src/main/fs/ipc.ts` is **UTF-8 text only, capped**. It
  cannot serve a PNG, and base64 data URIs for screenshots in a README are a
  memory and re-render disaster.

**Do this instead.** Register a privileged scheme in main and serve files from
it. Pattern taken verbatim from the Electron **v43.3.0** `docs/api/protocol.md`
(the exact version in `devDependencies`):

```ts
// main, BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: 'gmux-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

// main, after ready
protocol.handle('gmux-asset', (req) => {
  const { host, pathname } = new URL(req.url);          // gmux-asset://<projectId>/<relpath>
  const root = projectRootFor(host);                    // registered project roots ONLY
  if (root === null) return new Response('bad', { status: 400 });
  const target = path.resolve(root, decodeURIComponent(pathname).replace(/^\/+/, ''));
  const rel = path.relative(root, target);
  const isSafe = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (!isSafe) return new Response('bad', { status: 400 });   // ../../secret guard
  return net.fetch(pathToFileURL(target).toString());
});
```

Then in the preview, `urlTransform` rewrites relative `src` values against the
markdown file's own directory:

```ts
const gmuxUrlTransform: UrlTransform = (url, key, node) => {
  if (key === 'src' && node.tagName === 'img' && !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//')) {
    return assetUrl(projectId, resolveRelative(mdDirRelToRoot, url));
  }
  return defaultUrlTransform(url);   // exported by react-markdown
};
```

`UrlTransform` is `(url, key, node) => string | null | undefined` and runs on
every url-bearing attribute — verified in `react-markdown@10.1.0/lib/index.js`.

**Required CSP amendment** in `src/renderer/index.html`:

```
img-src 'self' data: gmux-asset:;
```

**Remote images stay blocked.** `img-src` has no `https:`, so a
`![](https://tracker.example/pixel.png)` in an untrusted repo cannot phone home
or leak the user's IP. That is the right default for a tool that opens
arbitrary checked-out repositories. Render a small inline placeholder chip
("remote image blocked") via the `img` component's `onError`, with an optional
per-project "allow remote images" toggle later. Do **not** silently add
`https:` to `img-src` to make badges work — badges are the exact shape of a
tracking pixel.

Also: `style-src` already carries `'unsafe-inline'`, and CSP's `style-src-attr`
falls back to `style-src`, so Shiki's inline `style="color:…"` attributes are
permitted as-is. No CSP change needed for highlighting.

### 1.8 External links

`src/main/index.ts:131` already has:

```ts
win.webContents.setWindowOpenHandler(({ url }) => {
  if (/^https?:/i.test(url)) void shell.openExternal(url);
  return { action: 'deny' };
});
```

So a renderer-side `window.open(href, '_blank', 'noopener')` **already** opens
the system browser with scheme validation in main, and there is no
`ui:openExternal` channel to add. Reuse it; that is the zero-new-surface path
and it respects guardrail 1 (no new preload generation).

Link click handling belongs in one delegated handler on the preview root:

| href shape | Behaviour |
| --- | --- |
| `http(s)://…` | `window.open(href,'_blank','noopener')` → system browser |
| `#anchor` | `preventDefault`, scroll the preview container to `#md-<slug>` |
| `./other.md`, `../docs/x.md` | `preventDefault`, `requestOpenFile({… mode:'file', preview:true})` — README navigation, the thing that makes docs browsable |
| any other relative path | `preventDefault`, open in the editor as a file (or reveal in Finder for binaries) |
| `mailto:` / other | `window.open` (main denies non-http, so it is inert) |

**Separately — a real hardening gap this research surfaced:** there is no
`will-navigate` guard on `win.webContents`. `setWindowOpenHandler` only covers
`window.open`/`target=_blank`. A plain in-page `<a href="https://…">` click
navigates the *renderer itself* away from the app — the window becomes a
browser and every tmux attachment in the renderer dies. Rendering
user-authored markdown makes that reachable for the first time. Add:

```ts
win.webContents.on('will-navigate', (e, url) => {
  const here = win.webContents.getURL();
  if (url !== here) { e.preventDefault(); if (/^https?:/i.test(url)) void shell.openExternal(url); }
});
```

This should land with item 6 regardless of how the preview is built.

### 1.9 GFM coverage, and what still needs CSS

`remark-gfm` gives the parse; the **rendering is all yours**:

- **Tables** — hast gives bare `<table>`. Wrap in `overflow-x:auto` (page body
  must never scroll horizontally) via a `table` component override.
- **Task lists** — emit `<li class="task-list-item"><input type=checkbox disabled>`.
  `defaultSchema` forces `disabled: true` and `type: 'checkbox'` via its
  `required` map, so they are inert by construction. Style with `--accent`
  when checked. A future "click to toggle and write back" is possible but is
  a source-edit, not a preview concern.
- **Footnotes** — emit `<section data-footnotes class="footnotes">` plus
  `<a data-footnote-ref>` / `<a data-footnote-backref>`. All four attributes are
  in `defaultSchema` already. Style the section with a top hairline
  (`--border`) and `--text-sm`.
- **Autolinks / strikethrough** — free.

Typography should come off the existing tokens, no new scale:
body `--text-base` (13px), h1 `--text-lg` (20px), h2 15px, h3–h6 13px/600,
code `--font-mono` at 12px on `--bg-raised`, blockquote left border 2px
`--border-strong` with `--text-secondary`, `hr` = 1px `--border`,
max content width ~72ch centred so prose does not stretch to a 900px pane.

### 1.10 Performance

- `<Markdown>` re-parses the entire document on every render. Bind it to
  `tab.savedContents` (or a **250 ms-debounced** working-model snapshot in
  side-by-side mode), and memoise the `components`, `remarkPlugins`,
  `rehypePlugins` and `urlTransform` object identities with `useMemo` —
  react-markdown warns and re-runs when plugin arrays change identity.
- Pass a module-level `Map` as Shiki's `cache` so identical fences across
  re-renders skip `codeToHast`.
- For very large markdown (the `truncated` flag already exists on `EditorTab`),
  keep the existing read cap; above ~5k lines prefer source mode by default.

### 1.11 Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| react-markdown quiet since 2025-04 | Medium | Frozen API, 5 open issues; isolate behind one module |
| `rehype-raw` 59 KB gzip | Low | Lazy chunk; or `skipHtml:true` fallback |
| Sanitize-after-Shiki mistake strips all colour, silently | **High if made** | Encode the plugin order in a unit test that asserts a `style` attribute survives |
| Missing `gmux-asset` in `protocols.src` strips every image, silently | **High if made** | Same test file: assert an `img[src^=gmux-asset]` survives |
| Adding ~30 remark/rehype packages grows the electron-builder denylist strays | Medium | Reinforces Phase 14's "`files` should become an allowlist" item — flag it, do not fix it here |
| CSP not amended → images 404 with a console CSP error | Medium | Ship the `index.html` edit in the same commit |

---

## 2. Minimap (BACKLOG item 6, second half)

### 2.1 Monaco's built-in minimap — confirmed, and how to theme it

Read from `monaco-editor@0.56.0/monaco.d.ts:4787` (`IEditorMinimapOptions`):

```ts
enabled?: boolean;                              // default true
autohide?: 'none' | 'mouseover' | 'scroll';
side?: 'right' | 'left';                        // default 'right'
size?: 'proportional' | 'fill' | 'fit';         // default 'actual' per docstring
showSlider?: 'always' | 'mouseover';            // default 'mouseover'
renderCharacters?: boolean;                     // default true (false = colour blocks)
maxColumn?: number;                             // default 120
scale?: number;                                 // default 1
showRegionSectionHeaders?: boolean;             // default true
showMarkSectionHeaders?: boolean;               // default true — "MARK:" comments
markSectionHeaderRegex?: string;                // needs a (?<label>.+) group
sectionHeaderFontSize?: number;                 // default 9
sectionHeaderLetterSpacing?: number;            // default 1
```

Current gmux state: `src/renderer/editor/MonacoHost.tsx:34` hard-codes
`minimap: { enabled: false }`, matching DESIGN-SPEC S5's "minimap off". Making
it togglable is `editor.updateOptions({ minimap: { enabled } })` on an existing
editor instance — **no re-create, no model churn, no scroll loss**. Persist the
flag the way `LS_EDITOR_WIDTH` is persisted in `EditorPanel.tsx`.

**Can it be themed to gmux tokens? Yes, and mostly it already is.** From
`monaco-editor/esm/vs/platform/theme/common/colors/minimapColors.js`, the
complete standalone-Monaco minimap colour registry is:

| Key | Default | Under `gmux-dark` today |
| --- | --- | --- |
| `minimap.background` | `null` → falls back to `editor.background` | `#131417` ✅ already right |
| `minimap.foregroundOpacity` | `#000f` (opaque) | inherited |
| `minimap.selectionHighlight` | ← `editor.selectionBackground` | `#4D9DE84D` ✅ already on-brand |
| `minimap.findMatchHighlight` | ← `editor.findMatchHighlight` | vs-dark default ⚠️ |
| `minimap.selectionOccurrenceHighlight` | ← `editor.selectionHighlight` | vs-dark default ⚠️ |
| `minimap.errorHighlight` | `rgba(255,18,18,.7)` | vs-dark default ⚠️ |
| `minimap.warningHighlight` | ← `editorWarningForeground` | vs-dark default ⚠️ |
| `minimap.infoHighlight` | ← `editorInfoForeground` | vs-dark default ⚠️ |
| `minimapSlider.background` | `transparent(scrollbarSlider.background, 0.5)` | gmux sets `#22252B99` → derives to ~α .30 — **too faint** |
| `minimapSlider.hoverBackground` | `transparent(scrollbarSlider.hoverBackground, .5)` | ~α .40 |
| `minimapSlider.activeBackground` | `transparent(scrollbarSlider.activeBackground, .5)` | ~α .40 |

Because `defineTheme` in `monaco-impl.ts` uses `inherit: true`, everything
unset falls through to vs-dark. Add exactly these to the `colors` block of
`GMUX_MONACO_THEME`:

```ts
'minimap.background': '#131417',              // --bg-canvas, explicit
'minimapSlider.background': '#3A3E4859',      // --border-strong @ .35 — visible
'minimapSlider.hoverBackground': '#3A3E4880',
'minimapSlider.activeBackground': '#4D9DE866',// --accent @ .40 while dragging
'minimap.selectionHighlight': '#4D9DE84D',    // --accent-wash-equivalent, explicit
'minimap.findMatchHighlight': '#E2B34066',    // --git-modified @ .40
'minimap.errorHighlight': '#E5655EB3',        // --git-deleted @ .70
'minimap.warningHighlight': '#F5B84AB3'       // --warning @ .70
```

**There is no `minimapGutter.*` in standalone Monaco** — I grepped the whole
`esm/` tree, the git added/modified/deleted minimap gutter stripes are a VS Code
workbench contribution, not part of the editor. Do not promise them.

The *character* rendering (`renderCharacters: true`) draws text using the
theme's TextMate token colours — so the minimap inherits `gmux-dark`'s syntax
palette automatically and needs no separate work. Recommended gmux defaults:

```ts
minimap: {
  enabled: minimapOn,        // persisted toggle, default OFF (S5's current look)
  renderCharacters: true,    // the screenshot's look — tiny readable text
  showSlider: 'always',      // gmux is a supervision tool; hidden affordances are worse
  size: 'proportional',
  maxColumn: 100,            // narrower than VS Code's 120 — the pane is 480–65% wide
  scale: 1,
  autohide: 'none',
  renderSideBySide: undefined
}
```

Caveat worth writing into DESIGN-SPEC: at the panel's `MIN_DRAG_PX` of 320px, a
120-column minimap eats a third of the pane. Either drop `maxColumn` to ~80 or
auto-disable the minimap below ~560px pane width (same reflex as the existing
`SIDE_BY_SIDE_MIN_PX` and `OVERLAY_BREAKPOINT_PX` rules).

### 2.2 Where Monaco's minimap does *not* reach

Three of gmux's four content surfaces are not Monaco:

| Surface | Renderer | Minimap available |
| --- | --- | --- |
| File mode (edit) | Monaco | ✅ built-in |
| Diff mode | `@pierre/diffs` `MultiFileDiff` | ❌ — I grepped `@pierre/diffs/dist`: **zero** occurrences of `minimap` or `overviewRuler` |
| Markdown preview | new, DOM | ❌ by nature |
| Terminal | xterm.js | n/a |

So "ALL files get a togglable minimap" (item 6) is, strictly, only achievable
today for File mode. Recommend scoping the acceptance criterion to **"every
*text-editing* surface"** and giving preview its own overview ruler (§2.5).

### 2.3 Monaco-independent option A — `@replit/codemirror-minimap`

| | |
| --- | --- |
| Version | `0.5.2`, MIT |
| Published | **2023-12-12** |
| Last commit | **2024-01-16** ("Allow autohiding of minimap") |
| Repo | replit/codemirror-minimap — 71 ★, 10 open issues, not archived |
| Downloads | ~16.1k/week (2026-08-03 → 08-09) |
| Deps | `crelt` only; peers `@codemirror/{view,state,language,lint} ^6`, `@lezer/*` |
| Unpacked | 104 KB |

Peer ranges still satisfy current CodeMirror (`@codemirror/view` 6.43.8,
`@codemirror/state` 6.7.1, both released within the last month), so it *would*
install. But the open issues are the honest picture: **"Bug: Support line
wrapping"**, **"Bug: Support inline widgets"**, **"Poor performance for
drawLine"**, and a 2026-07-17 issue asking it to use the editor's syntax tree
instead of re-parsing. Two and a half years without a release.

**Verdict: do not adopt.** It only matters in a world where gmux has already
swapped to CodeMirror 6 (which is not on any backlog — Phase 11 listed a CM6
swap only as one of two unblockers for deleting Monaco). Betting the minimap on
an unmaintained 0.5.x package that cannot render wrapped lines is worse than
writing our own, which is the next option.

For completeness: I searched npm for a **generic DOM/text minimap** and there
is none. Every hit is editor-bound (`@replit/codemirror-minimap`,
`@ckeditor/ckeditor5-minimap`) or graph-bound (`@reactflow/minimap`,
`diagram-js-minimap`, `@vue-flow/minimap`, `rete-minimap-plugin`,
`@react-sigma/minimap`). There is no off-the-shelf answer.

### 2.4 Monaco-independent option B (**recommended**) — canvas minimap over Shiki tokens

Because gmux already owns a Shiki highlighter that returns per-line, per-token
`{ content, color }`, a faithful minimap is a small, dependency-free component:

```
tokens = highlighter.codeToTokens(text, { lang, theme: GMUX_THEME_NAME }).tokens
         → ThemedToken[][]   // [line][token] with .content and .color
```

Render contract:

- Canvas at `devicePixelRatio`, CSS width 64–100px, height = pane height.
- **Block mode** (`renderCharacters:false` equivalent): per line, walk tokens and
  `fillRect(xOfColumn, lineY, tokenWidth, 2)` in `token.color`, skipping runs of
  whitespace. Two device px per line, 1 px gap. This is exactly what VS Code
  does below `scale` thresholds and it is cheap.
- **Character mode**: pre-render a 2×4-px glyph atlas once per colour, blit per
  character. Only worth it if the user asks; block mode reads fine at this size.
- Slider: an absolutely-positioned div, `top = scrollTop/scrollHeight`,
  `height = clientHeight/scrollHeight`, background `--border-strong` at .35,
  `--accent` at .40 while dragging. Click = jump, drag = scroll, wheel-over =
  forward to the container.
- Redraw only on content change (debounced 100 ms) and on resize
  (`ResizeObserver`). Cache the token array; it is already memoised by Shiki's
  `cache`.
- Cap: above ~20k lines, downsample to one row per N lines rather than refusing.

Cost: ~180 LOC, zero dependencies, **theme-correct by construction** (same
theme object as the diffs and the fences), and it works over *any* surface that
can produce text + a scroll container — Monaco today, CodeMirror tomorrow,
`@pierre/diffs` if Pierre ever exposes a scroll API.

**This is the answer to the deferred-Monaco-deletion question.** Build the
minimap as a standalone `src/renderer/editor/minimap/` module with a tiny
adapter interface, and wire the Monaco adapter to Monaco's *built-in* minimap
for now:

```ts
interface MinimapSource {
  text(): string;
  lang(): string;
  scroll(): { top: number; height: number; viewport: number };
  scrollTo(top: number): void;
  onChange(cb: () => void): () => void;
}
```

Phase 12 ships **only** the Monaco built-in behind a `minimapEnabled` store
flag plus this interface sketch in the module header. If Monaco is deleted in
Phase 14+, the canvas implementation slots in behind the same flag and the same
toggle UI, and no call site changes. That is the documented interaction the
BACKLOG asks for: *Monaco stays → use its minimap; Monaco goes → the canvas
minimap over Shiki tokens is the replacement, already specified.*

### 2.5 What a non-Monaco **preview pane** needs for its own scroll indicator

A character minimap over rendered prose is meaningless — headings, images and
tables are not lines of code. The correct analogue is a **document overview
ruler**: a 12px strip on the right showing where the sections are.

Concrete requirements, in build order:

1. **A single scroll container.** The preview root owns `overflow-y:auto`; the
   ruler is `position:absolute; right:0; top:0; bottom:0` inside the same
   positioned wrapper. Nothing else may scroll.
2. **A position map.** Custom `h1..h6` components already receive the hast
   `node`; give each heading a `ref` and build
   `{ depth, text, id, offsetTop }[]`. Normalise `offsetTop / scrollHeight`
   → `y ∈ [0,1]`. Draw a tick per heading: width 10/7/4px and opacity
   1.0/.7/.45 for depth 1/2/3+, colour `--text-muted`, active section
   `--accent-text`.
3. **A viewport rect.** `top = scrollTop/scrollHeight`,
   `height = max(clientHeight/scrollHeight, 0.04)` (floor it so it stays
   grabbable on long documents), background `--border-strong` at .35.
4. **Re-measure on late layout — this is the gotcha.** Rendered markdown
   changes height *after* first paint: images finish decoding, fonts settle,
   `<details>` toggles. Without re-measuring, every tick is wrong on any README
   with a screenshot. Wire a `ResizeObserver` on the content root **and** an
   `img.decode().then(remeasure)` (or `onLoad`) per image, both debounced into
   one `requestAnimationFrame` pass.
5. **Pointer contract.** Click → `scrollTo` proportional, `behavior:'smooth'`
   unless `prefers-reduced-motion`. Drag → continuous, with pointer capture
   (same pattern as `EditorPanel`'s divider). Wheel over the ruler → forward
   `deltaY` to the container.
6. **Scroll-sync with the source pane** (side-by-side mode only). VS Code's
   markdown preview does this by tagging elements with their source line;
   gmux gets it free because `passNode: true` means every custom component can
   read `node.position.start.line`. Set `data-line` in the component, then map
   source line → nearest tagged element for source→preview, and reverse for
   preview→source. Guard with an `isSyncing` flag so the two scroll listeners
   do not fight.
7. **Accessibility.** Either give the ruler
   `role="scrollbar" aria-orientation="vertical" aria-controls=… aria-valuenow=…`
   with keyboard support, or mark it `aria-hidden="true"` and keep the native
   scrollbar visible underneath. Do not ship a bare div that is the only way to
   navigate.
8. **A sticky current-heading breadcrumb** at the top of the preview is a
   cheaper 80% of the same value and should be built first if time is short.

### 2.6 Preview / source / side-by-side toggle

Item 6's toggle sits naturally next to the existing `Diff | File` segmented
control in `EditorPanel.tsx`, which today is `role="radiogroup"` with two
options. For `.md` tabs the mode set becomes `Preview | Source | Split` (and
`Diff` remains available when `canDiff`). Suggested store shape:

```ts
export type EditorMode = 'diff' | 'file' | 'preview' | 'split';
```

with `preview` the **default for `.md` files opened clean** (matching the ref
screenshot's intent) and `diff` still winning for `.md` files with tracked
changes, per the existing `openModeFor` rule. `split` renders Monaco left,
preview right inside `.ed-host`, below `SIDE_BY_SIDE_MIN_PX` collapsing to
`preview` — same responsive reflex `PierreDiff` already uses.

**The preview must not import Monaco** (BACKLOG: "Preview should NOT depend on
Monaco"). It reads `tab.savedContents` from the editor store; only `split` mode
subscribes to the working model, and it does so through the existing
`getWorkingModel()` accessor exactly as `PierreDiff.tsx` does, so the dependency
stays one-directional and dies cleanly with Monaco.

---

## 3. Editor tabs (BACKLOG item 5)

### 3.1 The standard contract, verified from VS Code source

Read from `microsoft/vscode@main`:
`src/vs/workbench/browser/parts/editor/{editorActions,editorCommands,editor.contribution}.ts`
and `src/vs/workbench/browser/workbench.contribution.ts`.

**Two distinct concepts that the BACKLOG's phrase "preview-vs-pinned" conflates:**

| Concept | VS Code name | Visual | Promoted by |
| --- | --- | --- | --- |
| **Preview** | *preview* editor; the opposite state is confusingly called "pinned" (`ActiveEditorPinnedContext`) | **italic** tab label | double-click the tab, double-click the source row, any edit, or **⌘K Enter** ("Keep Open" / `workbench.action.keepEditor`) |
| **Sticky** | *pinned* editor (`ActiveEditorStickyContext`) | pin glyph, tab **moves to the far left**, survives "Close Others"/"Close All" | **⌘K ⇧Enter** (`workbench.action.pinEditor`); unpin = same chord or context menu |

Only one preview tab exists per group at a time, and the next preview open
replaces it in place.

**Keybindings (macOS, from source, not memory):**

| Action | Binding |
| --- | --- |
| Close editor | **⌘W** |
| Next editor (tab order) | **⌘⌥→**, secondary **⌘⇧]** |
| Previous editor (tab order) | **⌘⌥←**, secondary **⌘⇧[** |
| Next/previous in MRU order | ⌃Tab / ⌃⇧Tab (holds a quick-pick overlay) |
| Keep Open (preview → permanent) | **⌘K Enter** |
| Pin / Unpin (sticky) | **⌘K ⇧Enter** |

**Defaults (from `workbench.contribution.ts`):**
`enablePreview: true`, `tabSizing: 'fit'`, `wrapTabs: false`,
`limit.enabled: false`, `limit.value: 10`, `limit.excludeDirty: false`.

**Dirty semantics.** A dot replaces the × in the tab; hovering the tab swaps the
dot back to a × so it is always closable in one gesture. Closing a dirty editor
raises a modal with three buttons — Save / Don't Save / Cancel — never a
two-button destructive confirm.

**Tab context menu** (`MenuId.EditorTitleContext`, group order from source):
Close · Close Others · Close to the Right · Close Saved · Close All ·
**Keep Open** (only while preview and `enablePreview` is on) · **Pin** / **Unpin** ·
Split Up/Down/Left/Right · Copy Path · Reveal in Finder.

**Other invariants worth copying:** middle-click closes; drag reorders within
the strip and drags out to split; overflow scrolls horizontally (VS Code's
`tabSizing: 'fit'` + a scrollable strip, `wrapTabs` off by default); an active
tab always scrolls itself into view.

### 3.2 What gmux already has (verified)

`src/renderer/editor/store.ts` + `EditorPanel.tsx` are further along than the
BACKLOG text implies:

- ✅ `tabs: EditorTab[]` — genuinely a multi-tab store, not a single file.
- ✅ `preview: boolean` per tab, italic via `.ed-tab-name.preview`.
- ✅ Preview reuse: `openFromRequest` finds `tabs.find(t => t.preview && !t.dirty)`
  and replaces it in place.
- ✅ Promotion on edit: `markDirty` sets `preview: false`.
- ✅ Promotion on tab double-click: `TabButton`'s `onDoubleClick` → `pin(path)`.
- ✅ Dirty dot replacing ×; dirty-close confirm (2-button).
- ✅ `MAX_TABS = 5` with LRU eviction of clean tabs — i.e. VS Code's
  `limit.enabled: true, limit.value: 5, limit.excludeDirty: true`.
- ✅ ⌘W close, ⌘⇧] / ⌘⇧[ cycle, ⌘E toggle panel, ⌘S save.
- ✅ Middle-click close (`onAuxClick`, button 1).
- ✅ Per-tab Monaco view-state save/restore across switches.
- ✅ Horizontally scrollable `.ed-tabs-list` (`overflow-x:auto`, scrollbar hidden).

Two small pre-existing nits the item-5 builder will be standing on anyway:
`.ed-tabs` is `height: 32px` in `editor.css` while DESIGN-SPEC S5 specifies
36px ("round-0 32px is gone"), and there is no `scrollIntoView` on the active
tab — with more than ~5 tabs, ⌘⌥→ can move focus to a tab that is scrolled out
of sight.

**So why does the user perceive "clicking files replaces the single open file"?**
Because *every* open request is a preview open. `OpenFileRequest` in
`src/renderer/state/open-file.ts` has no `preview` field, and the three emitters
— `FileTree.tsx:321`, `ScmSection.tsx:529`, `HistorySection.tsx:336` — all fire
on single click. The preview tab is therefore recycled forever and the strip
never grows past one tab unless the user edits something. The store is right;
the **bus is missing the pin signal**.

### 3.3 The six deltas item 5 actually needs

1. **Add `preview?: boolean` to `OpenFileRequest`** (default `true`), and have
   the tree / SCM / history rows emit `preview: false` on **double-click** and
   on **Enter**. One field, three call sites, and the accumulation complaint
   disappears with correct VS Code semantics intact.
2. **Bind ⌘⌥← / ⌘⌥→** as the primary cycle keys, keeping ⌘⇧[ / ⌘⇧] as
   secondaries (this is exactly VS Code's mac mapping). `cycleTab(delta)`
   already exists. Optionally add ⌃Tab as MRU order — `lastUsed` is already on
   the tab, so MRU is a sort, not new state.
3. **Raise `MAX_TABS`.** 5 is tight for "accumulate files"; VS Code's shipped
   default is unlimited and its opt-in limit is 10. Recommend 10 with the same
   dirty-excluding LRU, or make it a Settings value.
4. **Tab context menu** through the existing `ui:popupMenu` native bridge
   (item 1 of this same phase is adding a terminal one — share the plumbing):
   Close · Close Others · Close to the Right · Close Saved · Close All ·
   Keep Open · Copy Path · Reveal in Finder. `forceCloseTab` and `closeTab`
   already exist; the bulk operations are three new store actions.
5. **Three-way dirty-close dialog.** `closeTab` currently raises a
   destructive 2-button confirm ("Close tab" / cancel) that can only lose work.
   VS Code offers Save / Don't Save / Cancel, and `save()` already exists in the
   store — this is a small `setConfirm` variant, and it is the difference
   between a tool you trust with unsaved edits and one you do not.
6. **Sticky pins are optional and should be deferred.** With a 10-tab LRU cap
   and dirty-exclusion, the pin's main job (protect a tab from eviction and from
   Close All) is largely covered. If it is wanted: one `sticky: boolean`, sort
   sticky tabs first, exclude them from LRU and from Close Others/All, add
   ⌘K ⇧Enter and a pin glyph. Keep the *vocabulary* straight in the code —
   `preview` and `sticky`, never "pinned" for both.

**Item 5 also says "applies to both file and diff views" — it already does.**
`mode` lives on the tab, so each tab independently remembers Diff vs File
(and, after §2.6, Preview vs Source vs Split). No work needed beyond making
sure the new markdown modes are per-tab too.

**Drag-to-reorder** is not in the BACKLOG text for item 5, but Phase 10 items 4–6
built drag-reorder machinery for project tabs and sidebar sections. Check
`app/split/surface-dnd.ts` before writing a third copy — Phase 14's dup-scan
already flags that file for self-duplication.

---

## 4. Verification log

Everything below was fetched or read on **2026-08-10**.

| Claim | Source |
| --- | --- |
| shiki 4.4.3 MIT, present via `@pierre/diffs` + `@pierre/theming` | `npm ls shiki` in `/Users/gdc/gmux` |
| `@pierre/diffs` 1.3.5 is Apache-2.0 and re-exports `getSharedHighlighter`, `codeToHtml`, `preloadHighlighter` | `node_modules/@pierre/diffs/{package.json,dist/index.d.ts,dist/index.js}` |
| Shared highlighter is a singleton that *attaches* langs/themes incrementally, JS regex engine by default | `node_modules/@pierre/diffs/dist/highlighter/shared_highlighter.js` |
| No minimap/overviewRuler anywhere in `@pierre/diffs` | `grep -rli minimap node_modules/@pierre/diffs/dist` → no hits |
| react-markdown 10.1.0 MIT, published 2025-03-07, peer `react >=18`; `MarkdownHooks`, `urlTransform`, `defaultUrlTransform`, `passNode: true` | registry.npmjs.org; `unpkg.com/react-markdown@10.1.0/lib/index.{d.ts,js}` |
| react-markdown repo: 15,846 ★, 5 open issues, last commit 2025-04-21 | api.github.com/repos/remarkjs/react-markdown |
| remark-gfm 4.0.1 MIT → mdast-util-gfm 3.1.0 → mdast-util-gfm-footnote ^2 | registry.npmjs.org |
| rehype-sanitize 6.0.0 MIT; default schema allows `code[className=/^language-./]`, `input[type=checkbox][disabled]`, `li.task-list-item`, footnote attrs; **`style` not allowed**; `protocols.src = ['http','https']` | `unpkg.com/hast-util-sanitize@5.0.2/lib/schema.js` |
| rehype-raw 7.0.0 MIT, 188 KB min / 59 KB gzip | registry.npmjs.org; bundlephobia |
| `@shikijs/rehype` 4.4.3 MIT published 2026-08-10, pins `shiki: 4.4.3`; `/core` exports a **sync** `rehypeShikiFromHighlighter`; `lazy` forces an async pipeline | registry.npmjs.org; `unpkg.com/@shikijs/rehype@4.4.3/{package.json,dist/core.d.mts,dist/types-*.d.mts}` |
| Bundle sizes: react-markdown 111/33 KB, remark-gfm 30/10, rehype-sanitize 8/3, rehype-raw 188/59, markdown-it 109/46, marked 42/12 | bundlephobia.com/api/size |
| markdown-it 15.0.0 (2026-07-30), marked 18.0.9 (2026-08-04), dompurify 3.4.13 `MPL-2.0 OR Apache-2.0` (2026-08-03) | registry.npmjs.org |
| Shiki JS engine: 237/238 grammars supported, only `ahk2` unsupported; `markdown` ✅ | `raw.githubusercontent.com/shikijs/shiki/main/docs/references/engine-js-compat.md` (generated 2026-07-31) |
| Monaco 0.56 `IEditorMinimapOptions` full field list | `node_modules/monaco-editor/monaco.d.ts:4787` |
| Complete minimap colour registry + fallbacks; **no `minimapGutter.*`** in standalone Monaco | `node_modules/monaco-editor/esm/vs/platform/theme/common/colors/minimapColors.js` |
| Monaco currently forced off at `minimap: { enabled: false }` | `src/renderer/editor/MonacoHost.tsx:34` |
| `@replit/codemirror-minimap` 0.5.2 MIT, published 2023-12-12, last commit 2024-01-16, 71 ★, 16.1k weekly downloads, open bugs for line wrapping / inline widgets / drawLine perf | registry.npmjs.org; api.npmjs.org/downloads; api.github.com/repos/replit/codemirror-minimap |
| No generic DOM/text minimap package exists on npm | registry.npmjs.org search: "codemirror minimap", "minimap scrollbar dom", "react minimap overview scroll" |
| VS Code mac bindings: ⌘W close, ⌘⌥→/← next/prev (secondary ⌘⇧]/[), ⌘K Enter keepEditor, ⌘K ⇧Enter pinEditor | `microsoft/vscode@main` `editorActions.ts:1235,1283`, `editorCommands.ts:835,1325,1401` |
| VS Code tab context menu groups; preview vs sticky context keys | `microsoft/vscode@main` `editor.contribution.ts:400-402,697-706` |
| VS Code defaults: `enablePreview: true`, `tabSizing: 'fit'`, `wrapTabs: false`, `limit.enabled: false`, `limit.value: 10` | `microsoft/vscode@main` `workbench.contribution.ts:90,225,315,444-457` |
| `protocol.handle` + `registerSchemesAsPrivileged` + `net.fetch(pathToFileURL(...))` + path-escape guard | `raw.githubusercontent.com/electron/electron/v43.3.0/docs/api/protocol.md` |
| CSP is `img-src 'self' data:`; `style-src` has `'unsafe-inline'` | `src/renderer/index.html` |
| `setWindowOpenHandler` routes https → `shell.openExternal`; **no `will-navigate` guard** | `src/main/index.ts:131` |
| `fs:readFile` is UTF-8 text only, capped | `src/main/fs/ipc.ts:130`; `src/shared/ipc.ts:61` |
| `OpenFileRequest` has no `preview` field; all three emitters fire on single click | `src/renderer/state/open-file.ts`; `FileTree.tsx:321`, `ScmSection.tsx:529`, `HistorySection.tsx:336` |
| Built asset sizes: `monaco-impl` 25 MB, `ts.worker` 13 MB, 419 lazy Shiki lang chunks | `du -h out/renderer/assets/*` |
