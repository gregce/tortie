# Research 39. File preview, part 2. Which file types earn a viewer

Date: 2026-08-12. Measured on this machine against 233 git repositories under `/Users/gdc`.

Part 1 of this research is `39-file-preview.md`, which answers where untrusted HTML runs.
This part answers the operator's second question, which is what other file types deserve
preview rendering. Nothing here is recalled. Every count came from the repositories on
this machine and every library fact came from the npm registry today.

Section 8 of this document hands part 1 a number it needs.

---

## 1. The answer

Three things earn a viewer, and only one of them is a new file type.

| Rank | Item | Reach in the corpus | Cost | Verdict |
|---|---|---|---|---|
| 1 | Mermaid diagrams inside markdown | 289 diagrams, 132 files, 41 of 233 repos | 107 transitive packages, 0.90 MB gzipped, lazy | Build it. Highest reach of anything unbuilt. |
| 2 | PDF | 82 files, 17 of 233 repos | Zero dependencies. One CSP token. | Build it. It is close to free. |
| 3 | CSV and TSV | 101 files, 17 of 233 repos | 7 KB gzipped, zero dependencies | Build it if the round has room. |
| 4 | Quarto `.qmd` | 179 files, 7 of 233 repos | One line | Optional. Fidelity is partial. |
| — | SVG | 1,548 files, 102 of 233 repos | Already shipped | Nothing to do. See section 3. |
| — | Markdown and MDX | 25,676 files, 229 of 233 repos | Already shipped | Nothing to do. |
| Reject | Jupyter notebooks | 7 unique files, 8 repos | Would be a large viewer | Do not build. |
| Reject | JSON and YAML | 8,553 and 2,766 files | Monaco already folds and highlights them | Do not build. |
| Reject | Log files | 159 files, 11 repos | — | Do not build. |
| Reject | Lock files | 127 files, 55 repos | — | Do not build. |
| Reject | Excalidraw and draw.io | 0 files, 0 repos | — | Nothing to build against. |
| Reject | Office documents, RST, AsciiDoc | 5, 17 and 1 files | — | Do not build. |
| Never | `.env`, private keys, certificates | 35 files across the corpus | — | See section 9. |

The ranking is deliberately short. The scope guardrail in `CLAUDE.md` asks of every feature
whether it serves the agentic coding workflow or exists because IDEs have it. Mermaid, PDF
and CSV each pass on the same ground, which is that an agent writes or fetches these files
and the operator has to read them to check the agent's work. Everything in the reject rows
fails, either because Monaco already answers the question or because there is almost
nothing in the corpus to look at.

---

## 2. How this was measured

The file counts come from `git ls-files` run in every repository found under `/Users/gdc`
to a depth of four. Using the git index rather than a directory walk excludes
`node_modules` and build output by construction, because those are not tracked.

- Repositories scanned: 233.
- Tracked files counted: 161,368.
- Of those, modified within the last 180 days: 107,754.

Recency was checked separately because a vendored clone can dominate a raw count. It did
not change the ordering. Among recently touched files the counts were 833 HTML and 923
SVG, against 1,051 and 1,548 overall.

Two metrics are reported for every candidate. The file count says how much of the type
exists. The repository count says how many of the 233 repositories contain at least one.
The second number is the better signal, because a type concentrated in one vendored clone
is not a type the operator opens.

Library facts were fetched from `registry.npmjs.org` today. Bundle sizes were measured by
installing each package into a scratchpad `package.json` and bundling it with esbuild at
`--minify`, then gzipping the result. Nothing was installed into `/Users/gdc/gmux`.

Rendering and security behaviour was measured by running code, not by reading docs. The
Electron probes used the repository's own `node_modules/electron` binary at 43.3.0, in a
scratchpad application with its own `package.json`. The browser probes ran in Playwright's
Chromium.

---

## 3. SVG is already done, and it is already safe

The brief expected SVG to be the strongest candidate. It is already built, and it is built
correctly, so there is nothing to add.

`src/renderer/editor/EditorPanel.tsx:203-227` gives an SVG tab the same three-way control
markdown has. The comment there says it plainly, that an SVG "takes markdown's control
unchanged". `src/renderer/editor/image/source.ts:43-45` turns the markup into a
`data:image/svg+xml` URL and `ImageView` puts it in an `<img>`.

That choice is what makes it safe. An SVG loaded through an `<img>` element is rendered in
a mode where script does not run. I verified this rather than assuming it. A file
containing a `<script>` element, an `<image onerror=...>` handler and an
`<a xlink:href="javascript:...">` link was loaded through the same
`data:image/svg+xml` path the app uses.

```
IMG LOADED | naturalWidth=160 | PWNED=[]
```

The picture drew at its full 160 pixel width and none of the three payloads fired. The
test page and the malicious file are `svgtest.html` and `evil.svg` in the scratchpad, and
the screenshot is `svg-img-safety.png`.

The corpus agrees that this is not a live problem anyway. Of 1,548 SVG files, the number
containing a `<script>` element or an inline event handler is zero. One file references an
external URL and three use `<foreignObject>`. Two thirds of them, 1,056 files, are under
2 KB, which means they are icons.

One gap is worth noting and it is small. The SVG preview refuses any file that hits the
5 MB text read cap in `src/main/fs/ipc.ts:53`, because truncated markup would draw a
half-finished picture. No SVG in the corpus is over 5 MB, so this refusal never fires
today.

---

## 4. Mermaid is the highest-value thing that is not built

Mermaid is not a new file type. It is a hole in a preview that already ships, and it has
wider reach than every genuinely new candidate put together.

`rg -il mermaid src/ package.json` returns nothing. There is no mermaid renderer in the
application. A mermaid fence in a README therefore renders as a plain code block, which is
the diagram's source text rather than the diagram.

The corpus numbers are the argument.

| Measure | Count |
|---|---|
| Markdown files containing a mermaid fence | 132 |
| Repositories containing at least one | 41 of 233 |
| Mermaid blocks in total | 289 |
| Tortie's own `docs/` files containing one | 3 |

Forty one repositories is more than double the seventeen that contain a PDF, and it is
three times the seven that contain a unique notebook. The operator writes mermaid in
Tortie's own documentation, so three diagrams in this repository render as raw text right
now.

Three diagram types cover almost all of it.

| Diagram type | Blocks | Share |
|---|---|---|
| `flowchart` and `graph` | 225 | 78% |
| `sequenceDiagram` | 43 | 15% |
| everything else | 21 | 7% |

### What mermaid costs, measured

| Measure | Value |
|---|---|
| Latest version | 11.16.1 |
| Licence | MIT |
| Published | 2026-08-04, eight days ago |
| Direct dependencies | 21 |
| Transitive packages installed | 107 |
| Bundled and minified | 3.29 MB |
| Bundled, minified and gzipped | 0.90 MB |

This is the one candidate where the dependency argument is genuinely hard, and it should
be stated rather than smoothed over. The repository's `package-lock.json` holds 643
packages today, so mermaid adds about 17% to the dependency tree for one feature.

Two facts pull the other way. The application already has the pattern for keeping a heavy
renderer off the startup path, in `src/renderer/editor/markdown/markdown-loader.ts`, which
is a lazy `import()` that the shell never pays for until a markdown file is previewed. A
second loader of the same shape, loaded only when a mermaid fence is actually present in a
document, means the 0.90 MB is paid by the 41 repositories that use mermaid and by nobody
else. The second fact is that "assemble, never reimplement" in `CLAUDE.md` points at
mermaid directly. There is no smaller library that renders mermaid, because mermaid is the
format.

### Mermaid renders correctly and safely, measured

Diagram source arrives from a checked out repository, so it is untrusted in exactly the way
a README is. Mermaid's `securityLevel: 'strict'` setting was tested against three real
diagram shapes and one attack.

```
flowchart:  OK 40ms  svgBytes=16645  hasScript=false hasOn=false hasJsUrl=false
sequence:   OK 14ms  svgBytes=23046  hasScript=false hasOn=false hasJsUrl=false
state:      OK 20ms  svgBytes=27880  hasScript=false hasOn=false hasJsUrl=false
injection:  OK 14ms  svgBytes=11786  hasScript=false hasOn=false hasJsUrl=false
PWNED=[]
```

The injection case put an `<img onerror>` in one node label, a `<script>` element in
another, and a `javascript:` URL on a `click` directive. All three were stripped from the
output and none executed. Render time was 14 ms to 40 ms per diagram. The test page is
`mermaidtest.html` in the scratchpad and the screenshot is `mermaid-strict.png`.

One thing this does not prove. I tested mermaid's own sanitiser at `securityLevel:
'strict'`. I did not test what happens if a builder sets `securityLevel` to `'loose'`,
which enables `click` handlers and raw HTML in labels. The phase brief should say that
`'strict'` is required and a test should hold it there, in the same way
`pipeline.test.ts` holds the markdown plugin order.

---

## 5. PDF costs zero dependencies

PDF has modest reach, at 82 files across 17 of 233 repositories. It earns its place
because Electron already contains the viewer and the integration is small.

The measurement is unambiguous. Chromium's own PDF viewer extension is present in Electron
43.3.0 and it activates for both a top level navigation and an `<iframe>`. It does so with
`webPreferences.plugins` at its default of `false`, which was the open question.

```
plugins=false, direct navigation → chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html
plugins=true,  direct navigation → chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html
plugins=false, inside <embed>    → chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html
plugins=true,  inside <embed>    → chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html
```

That extension identifier is Chromium's built-in PDF viewer. A 4.3 MB, 22 page PDF from the
corpus was then loaded into a window carrying the byte-identical CSP string from
`src/renderer/index.html:8`. It rendered fully, with the page thumbnail rail, the page
counter reading 1 of 22, zoom controls and selectable text. There were zero CSP violations.
The screenshot is `etest/shot-csphost_html.png` in the scratchpad.

### The one CSP change PDF needs

That first test served the file from the same `file://` origin as the host page, which is
why `default-src 'self'` allowed it. In the real application the renderer is loaded by
`loadFile` at `src/main/index.ts:333`, so its origin is `file://`, and a project PDF would
be served over the `gmux-asset:` scheme registered in `src/main/assets/protocol.ts`. That
is a different scheme, so the existing policy blocks it. Measured, with the exact message
Chromium produced.

```
Framing 'gmux-asset://local/' violates the following Content Security Policy directive:
"default-src 'self'". The request has been blocked. Note that 'frame-src' was not
explicitly set, so 'default-src' is used as a fallback.
```

Adding `frame-src gmux-asset:` to the policy fixes it, and the PDF viewer then loads. This
is one token, and it is narrower than what part 1 needs for HTML.

A `blob:` URL was tested as an alternative and it is worse. Building the blob requires the
renderer to `fetch()` the asset scheme, which the policy also blocks, so that route needs
`connect-src gmux-asset:` on top of `frame-src blob:`. Two tokens instead of one, and
`connect-src` is the directive research 37 leans on. Use the scheme iframe.

```
scheme iframe, frame-src added   → PDF viewer loaded, page 1 of 22 rendered
blob iframe,   frame-src added   → empty. "Fetch API cannot load gmux-asset://local/big.pdf.
                                    Refused to connect because it violates the document's
                                    Content Security Policy."
```

### What PDF does not give you

Three things are not true and the phase brief should say so.

- The viewer is Chromium's, so its toolbar is Chromium's. It will not carry Tortie's
  tokens and it cannot be themed from `tokens.css`. It has its own download and print
  buttons.
- A link inside a PDF can point at an external URL. The window will need a
  `setWindowOpenHandler` so that a click opens the system browser rather than navigating
  inside the application.
- I did not measure what a 19 MB PDF does to memory or to first paint. The largest in the
  corpus is 18,966,883 bytes. The 4.3 MB case rendered inside the probe's 4 second wait,
  which is a ceiling rather than a measurement.

The alternative, `pdfjs-dist`, is Apache-2.0, at 6.2.108, published 2026-07-28, with zero
dependencies and 32.90 MB unpacked. It is well maintained and it would give a themeable
viewer. It is not worth 32.90 MB when the engine already ships one.

---

## 6. CSV and TSV, if the round has room

CSV has 84 files in 14 repositories and TSV has 17 files in 6, which is 101 files across 17
repositories once the overlap is removed. That is thin, so the case rests on what the files
are rather than how many there are.

They are wide. The corpus contains a 9.2 MB file with 410 columns, and several exports in
the 1 MB to 1.7 MB range with 13 to 28 columns. A 410 column row in Monaco is a single line
that scrolls off the screen many times over, and the header row is not visible while you
read row 4,000. A table answers "what is in column 300 of this row" and the text view does
not.

There is a second reason, which is that the text path cannot open the largest one at all.
`READ_CAP_BYTES` in `src/main/fs/ipc.ts:53` is 5 MB, so the 9.2 MB file opens truncated
today. One file in the corpus is over that cap.

The library is papaparse and it is close to free.

| Measure | Value |
|---|---|
| Latest version | 5.5.4 |
| Licence | MIT |
| Published | 2026-06-19 |
| Dependencies | 0 |
| Bundled, minified | 19 KB |
| Bundled, minified and gzipped | 7 KB |

Parse times on the corpus files themselves, in Node, with headers.

| File | Size | Rows | Columns | Parse time |
|---|---|---|---|---|
| `rhfspuf2024.csv` | 9.2 MB | 4,425 | 410 | 244 ms |
| `clerk-users-june11-2026.csv` | 1.6 MB | 9,530 | 14 | 18 ms |
| `logs_result.csv` | 0.8 MB | 1,000 | 28 | 5 ms |

Zero parse errors on all three. A table view needs row virtualisation to draw 9,530 rows
without stalling, and that is the part of the work that is not free. Rank this third and
drop it if the round is full.

---

## 7. The rejections, with the reason on each

| Type | Files | Repos | Why not |
|---|---|---|---|
| Jupyter notebooks | 12, of which 7 are unique by checksum | 8 | The reach is a rounding error. Of the 12, three are copies of one file, two are copies of another, and two are empty checkpoint stubs. A notebook viewer has to render markdown cells, code cells, stream output, HTML output and base64 images, which is a large surface for seven files. |
| JSON | 8,553 | 198 | Monaco already folds, highlights and validates JSON. A tree view answers the same question the folding already answers. The one case that differs is a single line minified JSON blob, and the fix for that is a format command rather than a viewer. |
| YAML | 2,766 | 117 | Same as JSON, and more strongly. YAML's indentation is its structure, so the text view is the tree view. |
| Log files | 159 | 11 | Concentrated in two repositories. A log viewer wants filtering and level colouring, which is a real feature, and the corpus does not justify it. Project wide search already finds lines across them. |
| Lock files | 127 | 55 | Wide reach and no reading value. Nobody reads `Cargo.lock` top to bottom. The question people ask of a lock file is "which version of X", and search answers it. |
| Excalidraw and draw.io | 0 | 0 | There is nothing in the corpus. `.excalidraw`, `.drawio` and `.dio` all return zero files across all 233 repositories. |
| PlantUML and Graphviz | 0 `.puml`, 4 `.dot` | 3 | Below the noise floor. Mermaid absorbed this niche. |
| RST and AsciiDoc | 17 and 1 | 4 and 1 | Below the noise floor, and each needs its own parser. |
| Office documents | 3 `.xlsx`, 3 `.docx`, 1 `.pptx` | 2 | Seven files, and every one of them needs a large parser. macOS Quick Look already opens these. |
| `.mmd` standalone mermaid files | 2 | 1 | Not worth a file type route of its own. If mermaid ships for markdown fences, wiring `.mmd` to the same renderer is nearly free, so treat it as a footnote to section 4 rather than an item. |

One near miss is worth recording. Quarto `.qmd` has 179 files across 7 repositories, which
is more reach than PDF by file count. Quarto is markdown with YAML frontmatter, and
`MARKDOWN_EXTENSIONS` in `src/renderer/editor/markdown/markdown-path.ts` would accept it
with a one word change. The reason it is ranked fourth and not second is fidelity. Quarto
uses Pandoc fenced div syntax, so a real file contains blocks like `::: {.hero-banner}`,
and react-markdown renders those as literal text. The reader would get a mostly correct
document with visible markup scattered through it. That is better than raw source but it is
not a clean preview, so it is the operator's call rather than an obvious yes.

MDX needed no work. `markdown-path.ts:9` already includes `mdx`, which covers 1,170 files
across 19 repositories.

---

## 8. A number part 1 needs

Part 1 concludes that the HTML preview should run no script at all, and states that a page
whose content is produced by JavaScript will render empty. This is how often that happens
in these repositories.

Every one of the 1,052 HTML files was stripped of its `<head>`, `<script>` and `<style>`
content, then of its tags, and what remained was measured.

| Static text remaining | Files | Share |
|---|---|---|
| Under 40 characters, so effectively blank | 379 | 36% |
| 40 to 400 characters, so a heading and little else | 281 | 27% |
| Over 400 characters, so a readable document | 392 | 37% |

A script free render produces a blank or nearly blank page for 63% of the HTML in these
repositories. That is the ceiling stated as a number, and it is the honest thing to put in
front of the operator before the feature is built.

Three supporting counts, from the same scan.

- 884 of 1,052 files contain a `<script>` element, which is 84%.
- 535 of 1,052 files reference an external `http` or `https` URL, which is 51%. Every one
  of those is a request that a network enabled preview would make and a script free
  preview will not. It is also the reason the layout of half these pages will look wrong,
  because the missing requests include CDN stylesheets and fonts.
- 61 files contain template syntax such as `{{ }}` or `<% %>`, and 182 files are fragments
  with no `<html>` element or doctype. Rendering a Go template or a partial produces
  something that looks like a rendering bug rather than a page.

Two design consequences follow, and they are cheap.

- The preview should not be the default mode for an HTML tab. Source should be. A reader
  who opens `base.html` in a templates directory wants the template, and a reader who
  opens a fetched design mockup wants the page. Only the second reader is served by
  defaulting to Preview, and the first is actively harmed.
- The preview needs a visible, plain statement when it renders nearly nothing, so that an
  empty pane reads as "this page builds itself with JavaScript, which does not run here"
  rather than as a broken feature. That message will be shown often, because it applies to
  63% of the corpus.

---

## 9. What must never get a preview

The rule is that a preview must be granted by an allowlist of file types, never inferred
from content, and secret bearing files must not be offered the toggle at all.

The corpus explains why this is not hypothetical. These files are tracked in git, in
repositories on this machine.

| Pattern | Files tracked |
|---|---|
| `.env.*` | 79 |
| `.env` | 10 |
| `.key` | 8 |
| `id_rsa` | 8 |
| `.pem` | 6 |
| `.cer` | 2 |
| `.keystore` | 1 |

There are eight files named `id_rsa` committed to repositories on this machine.

The reason to refuse these is not that rendering is technically dangerous. It is that a
preview changes what is displayed by default, and it changes it in the direction of being
easier to read at a glance. A `.env` file rendered as a two column table of names and
values is a screenshot of someone's credentials, laid out neatly, produced by the act of
clicking a file. Monospace text in an editor is the correct presentation for a secret,
because reading it takes deliberate effort and nothing about it invites a screenshot.

Three specific rules follow.

- Never add a table view for `.env`, `.properties`, `.netrc`, `.htpasswd`, or any file
  whose name matches a credential pattern, even though the key equals value shape parses
  as trivially as a CSV does.
- Never let content sniffing grant a preview. A `.pem` file is base64 text and a key file
  can be valid JSON. If preview eligibility is decided by looking at bytes rather than at
  an extension allowlist, a private key in JSON Web Key form gets a pretty tree view.
- Never preview any file the user has not opened. Whatever renderer is added, it runs when
  a tab is opened, never during indexing, never on hover in the tree, and never as part of
  search results.

One more, which is about a feature this application already has. Tortie captures sessions
through SpecStory. Any rendered view of a file is a candidate for appearing in a capture or
a screenshot in a way the raw file would not. That is another reason the allowlist should
be short and the secret patterns should be excluded explicitly rather than by omission.

---

## 10. What is not verified

Named plainly, so the next agent does not inherit these as settled.

- I did not measure mermaid inside the application. The 14 ms to 40 ms figures come from a
  standalone page loading a mermaid bundle in Playwright's Chromium, not from Tortie's
  renderer with its CSP. Mermaid injects styles, and `style-src 'self' 'unsafe-inline'`
  should allow that, but it was not tested. The interaction between mermaid's output and
  the existing `rehype-sanitize` schema in `pipeline.ts` was also not tested, and that
  order dependency is exactly the trap the comment at the top of that file warns about.
- I did not measure a large PDF. The largest in the corpus is 18.9 MB and I tested 4.3 MB.
- I did not test papaparse in the renderer, only in Node. The 244 ms figure has no React
  rendering attached to it, and drawing 9,530 rows is the harder half of that feature.
- The SVG safety result came from Playwright's Chromium, not from Electron 43.3.0. Both are
  Chromium and the behaviour is specified, but the two versions were not compared.
- I did not check whether any repository in the corpus is one the operator does not trust.
  The counts treat all 233 equally, including vendored clones such as `vscode`, `flutter`
  and `zed`, which inflate raw file counts. This is why every claim above is also given as
  a repository count.
- The `.qmd` fidelity claim is based on reading one file, `specflow/website/index.qmd`. I
  did not render a Quarto file through the existing markdown pipeline to see how bad the
  Pandoc div syntax looks in practice.
