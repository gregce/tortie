# Phase 14 dimension 3 — code-aware search and the UX contract

Research for `docs/BACKLOG.md` "Phase 14 — deep file + code search", items 2–4.

**Companions**: `19-search-d1-content-engine.md` (the ⌘⇧F engine) and
`19-search-d2-fuzzy-file-path.md` (the ⌘P ranker). Both independently land on
`@vscode/ripgrep@1.18.0`, which is the same package this document assumes; where
the three overlap, **D1 owns the engine flags, caps and cancellation, D2 owns the
fuzzy scorer, and this document owns the surfaces they feed.** §7 lists the
reconciliations. This one answers four questions:

- (a) how gmux gets **symbol search** ("go to symbol in project") for TS/JS/Go/Python/Rust
- (b) whether **structural search** (ast-grep, Comby) earns its weight here
- (c) the **UX and interaction contract** an implementer builds from
- (d) whether **replace-in-files** is cheap and safe enough for v1

Everything with a number in it was measured on this machine (Apple M4 Pro, 12
cores / 8 performance, 51 GB, macOS 24.6.0) against the three real repos on
disk. The harness is kept at
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/p14/`
— see the appendix for how to re-run it.

---

## 0. Verification ledger (checked 2026-08-10)

Every library claim below was verified live against the npm registry, the
GitHub API, or by installing and running the thing. Nothing here is from memory.

| Thing | Verified fact | How checked |
|---|---|---|
| `web-tree-sitter` | **0.26.12**, MIT, published **2026-08-08** (2 days ago), 70 versions since 2019 | npm registry JSON |
| `tree-sitter/tree-sitter` | MIT, 26,598 stars, last commit 2026-08-09, release v0.26.12 2026-08-08 | GitHub API |
| `@vscode/tree-sitter-wasm` | **0.3.1**, MIT, published 2026-04-07; ships prebuilt `.wasm` for bash, c-sharp, cpp, css, go, ini, java, javascript, php, powershell, python, regex, ruby, rust, tsx, typescript | tarball extracted and listed |
| `@ast-grep/napi` | **0.45.1**, MIT, published 2026-08-07; repo 15,468 stars, commit on 2026-08-10 | npm + GitHub API |
| ast-grep built-in languages | **only** Html, JavaScript, Tsx, Css, TypeScript (`types/lang.d.ts`) | tarball `index.d.ts` read |
| `@ast-grep/lang-go` etc. | 0.0.6, ISC, ships **prebuilt `parser.so` shared libraries** for 5 platforms (3.0 MB), loaded via `registerDynamicLanguage` which is marked `@experimental` | installed, `find` over the package |
| `universal-ctags/ctags` | **GPL-2.0**, 7,262 stars, active (commit 2026-07-30, release v6.2.1 2025-10-25) | GitHub API |
| ctags on macOS | `/usr/bin/ctags` is **BSD ctags**, rejects `--version`; universal-ctags is **not installed** | ran it |
| `comby-tools/comby` | Apache-2.0, 2,668 stars, **last release 1.8.1 on 2022-06-28**; last commit 2026-06-08 is `"ocaml 5 readme"` | GitHub API |
| Comby on npm | no binding exists — the `comby` package is an unrelated 2016 squat (v1.0.0, one version); `comby-js` and `@comby/comby` 404 | npm registry |
| `@vscode/ripgrep` | **1.18.0**, MIT, 2026-05-07; **no postinstall download any more** — per-platform npm packages, exports `rgPath`; darwin-arm64 binary is **ripgrep 15.0.0 with PCRE2, 4.5 MB** | installed and ran `rg --version` |
| `typescript-language-server` | 5.3.0, Apache-2.0, 2026-05-21 (exists and is healthy — but see §2.4) | npm registry |
| **Shiki is not tree-sitter** | gmux's Shiki 4.4.3 stack uses `@shikijs/vscode-textmate` + `@shikijs/engine-oniguruma` + `oniguruma-to-es`. There is **no tree-sitter anywhere in `node_modules`** | `ls node_modules` |
| web-tree-sitter in Electron 43 | loads via plain CJS `require` (the package ships both ESM and CJS conditions); runtime + grammar + query compile + parse of a 584-line file = **37 ms cold** | ran it inside `electron 43.3.0` (Node 24.18.1, N-API 10) |
| ast-grep napi in Electron 43 | prebuilt `.node` loads with **no electron-rebuild** (N-API is ABI-stable): 116 files / 501 matches in 75 ms | ran it inside Electron 43.3.0 |

**Correction to the brief:** tree-sitter is *not* already in the tree via Shiki.
Shiki is a TextMate-grammar highlighter. Adopting tree-sitter is a genuinely new
dependency, and this document prices it accordingly.

---

## 1. What is already in the tree that changes the design

Five findings from reading `src/**` (read-only) that an implementer must know
before writing a line.

### 1.1 `@pierre/trees` already ships a search session API — and gmux has it turned off

`node_modules/@pierre/trees/dist/model/publicTypes.d.ts:120` and
`render/FileTree.d.ts:36-43`:

```ts
type FileTreeSearchMode = 'expand-matches' | 'collapse-non-matches' | 'hide-non-matches';
type FileTreeSearchBlurBehavior = 'close' | 'retain';
interface FileTreeSearchSessionHandle {
  openSearch(initialValue?: string): void;
  setSearch(value: string | null): void;
  closeSearch(): void;
  isSearchOpen(): boolean;
  getSearchValue(): string;
  getSearchMatchingPaths(): readonly FileTreePublicId[];
  focusNextSearchMatch(): void;
  focusPreviousSearchMatch(): void;
}
// and, separately:
scrollToPath(path: FileTreePublicId, options?: { focus?: boolean; offset?: 'top'|'center'|'nearest' }): void;
```

`src/renderer/tree/FileTree.tsx:366` says "Pierre leaves Enter unhandled outside
search/rename, **both of which are disabled here**". So two things are free:

- **Type-to-filter inside the Explorer** (VS Code's tree find widget) is one
  option plus a keybinding, not a feature build.
- **`scrollToPath`** is the "Reveal in Explorer" primitive that every search
  result row and quick-open pick should use.

The limit to state plainly: gmux loads directories lazily through `fs:readDir`
(`src/renderer/tree/store.ts`), so the tree only knows the paths it has expanded.
Tree filter is a filter over *what is on screen*. Deep file search is ⌘P's job
over the full file list. Do not let one masquerade as the other in the UI.

### 1.2 The open-file bus cannot express "open at line 412" — this is the one required contract change

`src/renderer/state/open-file.ts` is the single canonical bus (both the SCM and
tree streams re-export it). `OpenFileRequest` carries `repoPath`, `relPath`,
`path`, `origPath`, `mode`, `source`, `preview`, `commit`. There is **no line, no
column, no selection**. Every search result, every symbol hit and every `⌘P
file:123` pick needs one. §4.7 gives the exact append-only change.

### 1.3 The keyboard map has room, but three VS Code chords are already taken

From `src/renderer/app/App.tsx:95-267`, `src/main/menu.ts` and
`src/renderer/app/ShortcutsOverlay.tsx`:

| Chord | gmux today | Consequence for search |
|---|---|---|
| `⌘P` | free | quick open — take it |
| `⌘⇧F` | free | Search view — take it |
| `⌘⇧O` | free | symbols — take it |
| `⌘⇧H` | free | replace in files — take it |
| `F4` / `⇧F4` | free (`F2` is rename) | next / previous result — take it |
| `⌘F` | **Find in editor** (Monaco's widget) | must not be repurposed |
| `⌘T` | **New session** | VS Code's "go to symbol in workspace" chord is *not available*. Project symbols live behind `#` in the palette and behind ⌘⇧O when no file is open. |
| `⌘J` | **Attention overlay** | VS Code's "toggle search details" chord is *not available*. Use a disclosure chevron in the view instead. |
| `⌘B`, `⌘E`, `⌘W`, `⌘1-9`, `⌘⌥←/→`, `⌃Tab` | taken | no conflict with the above |

Two mechanical rules from the same file, both load-bearing:

- The renderer's capture-phase `keydown` runs **first**, ~5 ms before the native
  menu accelerator. A branch that calls `preventDefault()` suppresses its menu
  item. So a chord handled in both places must not do its work twice.
- The guard at line 182 (`inEditable`) is why ⌘-chords do not fire while a text
  field is being edited. The search box is a text field: ⌘⇧F pressed *inside*
  the search box must still work (it re-focuses and selects all, VS Code
  behavior), so it belongs above that guard alongside ⌘⇧E.

### 1.4 The palette already has a visual precedent

`AttentionOverlay.tsx` (⌘J) is a backdrop + floating panel + `role="listbox"` /
`role="option"` rows + ↑↓/↩/Esc + a footer key-hint strip. The quick-open palette
should be the same chrome family, not a new invention. Its `jump()` also shows
the established pattern for "switch project, then act".

### 1.5 Packaging: `asarUnpack` covers `**/*.node` only

`electron-builder.yml:99-100`. A ripgrep binary at
`node_modules/@vscode/ripgrep-darwin-arm64/bin/rg` is **not** a `.node` file and
will be trapped inside the asar, where it cannot be executed. Whichever
dimension lands ripgrep must add it to `asarUnpack` (or `extraResources`), and
the packaged-app smoke must exercise a real search — `out/` will pass without it.

The same section is a live argument for the Phase 16 allowlist item: `.wasm`
grammars are renderer/main assets that electron-vite will not inline, so they
need `extraResources` too.

---

## 2. (a) Symbol search — recommendation

> **Recommendation: `web-tree-sitter` (WASM) + `@vscode/tree-sitter-wasm`
> grammars + five gmux-owned tags queries, running in a `worker_threads` pool in
> main, behind a lazily built per-project index.**
>
> Reject universal-ctags (licence + not present on macOS). Reject `@ast-grep/napi`
> *for symbols* (native `.so` per language, experimental loader, macOS signing).
> Put LSP out of scope, deliberately and permanently for this app.

### 2.1 The four candidates, priced

| | web-tree-sitter + wasm | @ast-grep/napi | universal-ctags | LSP (`workspace/symbol`) |
|---|---|---|---|---|
| Licence | MIT | MIT | **GPL-2.0** | varies per server |
| Health (2026-08-10) | release 2 days ago | release 3 days ago, commit today | active, v6.2.1 Oct 2025 | active |
| On this Mac already? | no | no | **no** — `/usr/bin/ctags` is BSD ctags | no |
| TS/JS/Go/Py/Rust coverage | all five, one runtime | TS/TSX/JS built in; **Go/Py/Rust need a per-language `parser.so`** | all five | one server per language |
| Native code in the bundle | **none** (pure wasm) | `.node` + N × `.so` | one Mach-O binary | N binaries, often not bundleable |
| macOS hardened-runtime cost | none | must sign every nested `.so`, or ship `com.apple.security.cs.disable-library-validation` | must sign the binary | n/a |
| Electron 43 verified | yes, CJS require, 37 ms cold | yes, no rebuild, 75 ms first call | n/a | n/a |
| Raw speed | 213 files in 351 ms (1 thread) | 116 files in 16 ms | fastest | n/a (server indexes) |
| Battery / RAM at rest | zero | zero | zero | **a resident indexing daemon per language** |

Speed is the only column ast-grep wins, and §2.5 shows why the tree-sitter number
is fast enough after the index exists.

### 2.2 Why not universal-ctags

Three independent blockers, any one of which is sufficient:

1. **GPL-2.0.** Phase 14's constraint in the backlog is "MIT/Apache licensing".
   Shelling out to a separately-distributed GPL binary is legally defensible as
   mere aggregation, but bundling it inside `gmux.app` puts a GPL obligation on
   the shipped artefact. Not a fight worth having for a symbol picker.
2. **It is not on macOS.** Verified: `/usr/bin/ctags` is the Xcode BSD ctags
   which does not even accept `--version`. So "just use the system one" is not
   an option; gmux would have to bundle and sign it.
3. It answers a smaller question than tree-sitter does — a flat tags file with no
   containers, no nesting, and per-language regexes of varying quality — while
   costing more to ship.

### 2.3 Why not `@ast-grep/napi` for symbols

ast-grep is an excellent project and it is *fast*: 116 files / 501
`function_declaration` matches in **16 ms** in Node, 75 ms on first call inside
Electron 43 (verified, no rebuild needed — N-API 10 is ABI-stable). The problem
is language coverage and how it is delivered.

`@ast-grep/napi@0.45.1` `types/lang.d.ts` declares exactly:

```ts
export enum Lang { Html, JavaScript, Tsx, Css, TypeScript }
```

Go, Python and Rust arrive through `registerDynamicLanguage()`, whose own type
definition says:

```ts
/** @experimental  Register dynamic languages. This function should be called exactly once in the program. */
```

and whose `libraryPath` points at a **prebuilt shared library**: `@ast-grep/lang-go@0.0.6`
ships `prebuilds/prebuild-macOS-ARM64/parser.so` (3.0 MB for the package,
5 platforms). That means gmux would `dlopen` third-party unsigned Mach-O objects
at runtime. `electron-builder.yml:1-9` already records that Developer ID signing,
hardened runtime, entitlements and notarization are a deferred packaging pass;
under the hardened runtime that `dlopen` fails unless every `.so` is re-signed
with the app's Team ID or the app ships
`com.apple.security.cs.disable-library-validation`. Buying that for a symbol
picker is a bad trade when a pure-wasm option exists.

Keep ast-grep in mind for §3. Do not put it on the symbol path.

### 2.4 Why LSP is out of scope — and what to say when someone asks again

Running `typescript-language-server` (5.3.0, Apache-2.0, healthy) or `gopls` or
`rust-analyzer` would give *correct* symbols with real semantics. It is still the
wrong choice for this app:

- Each server is a resident process that indexes the whole project and holds
  hundreds of MB. Phase 14's own constraint is "no indexing daemon that burns
  battery unless it clearly wins". A tsserver-class daemon per open project, per
  language, on a laptop, next to several running agents, does not clearly win.
- gmux would own detection, install guidance, version drift, crash-restart and
  per-language configuration for N servers. That is an IDE's job description.
- gmux is a shell around agents that already have their own code intelligence.
  The user's ask is "find things fast from the file explorer", not "give me
  rename-symbol".

Leave the door open honestly: if gmux ever wants precise go-to-definition,
find-all-references or rename, LSP is the only correct answer and nothing here
blocks it. The `SymbolHit` shape in §4.6 is deliberately LSP-shaped (name, kind,
container, file, range) so a future LSP provider can fill the same interface.

### 2.5 The measurements that decide the architecture

**Cold whole-project symbol extraction, single-threaded** (web-tree-sitter
0.26.12 + `@vscode/tree-sitter-wasm` 0.3.1, Node 22.23.1, gmux queries from §2.7):

| repo | files | MB | wall | files/s | MB/s | symbols | index as JSON |
|---|---|---|---|---|---|---|---|
| `/Users/gdc/gmux` (TS/TSX) | 213 | 1.59 | **351 ms** | 607 | 4.5 | 1,793 | 178 KB |
| `/Users/gdc/getspecstory` (Go) | 285 | 3.15 | **453 ms** | 654 | 7.2 | 4,814 | 596 KB |
| `/Users/gdc/specstory-sync` (TS/TSX) | 645 | 7.18 | **806 ms** | 801 | 8.9 | 16,518 | 2.0 MB |

**With a `worker_threads` pool** (specstory-sync, same queries; worker boot
including grammar load and query compile is 39–94 ms and is included):

| workers | wall | files/s | MB/s |
|---|---|---|---|
| 1 | 823 ms | 784 | 8.7 |
| 2 | 474 ms | 1,360 | 15.1 |
| 4 | 407 ms | 1,586 | 17.6 |
| **6** | **300 ms** | **2,148** | **23.8** |
| 8 | 313 ms | 2,061 | 22.8 |

Six workers is the knee. Extrapolating: **a 50,000-file repo costs roughly 23 s
of six-core CPU to index cold.** That is affordable once, per project, in the
background — and unaffordable per keystroke, which kills the tempting no-index
design (§2.6).

**Query latency once the index exists.** Symbol names should go through the
same ranker D2 chose for paths (§4.6) rather than a second scorer. The numbers
below establish the floor — they are a deliberately naive scan, so any real
ranker only has to beat them — and they settle the memory question. Fuzzy
scoring over a columnar table
(all names concatenated into one string plus an `Int32Array` of offsets, so N
symbols cost one allocation rather than N objects):

| symbols | build | blob | `"op"` | `"openf"` | `"openFromRequest"` | `"sess"` |
|---|---|---|---|---|---|---|
| 20,000 | 3 ms | 0.7 MB | 5.2 ms | 2.3 ms | 1.5 ms | 1.8 ms |
| 100,000 | 21 ms | 3.6 MB | 6.5 ms | 4.0 ms | 5.7 ms | 7.9 ms |
| 500,000 | 76 ms | 18.5 MB | 49.8 ms | 28.4 ms | 26.7 ms | 46.5 ms |
| 1,000,000 | 245 ms | 37.6 MB | 79.2 ms | 52.5 ms | 53.6 ms | 84.2 ms |

A realistic repo (≤ 5k files → ~100k symbols) answers in **4–8 ms**. Even a
pathological 1M-symbol monorepo answers in under 100 ms off the render thread.
Plain JavaScript, no index structure beyond the blob. Do not reach for a trie.

**Incremental cost.** One file re-parsed and re-queried is 806 ms / 645 files ≈
**1.25 ms**. A file save is free.

### 2.6 The design that looks clever and does not work

It is tempting to skip the index: ripgrep narrows to the files that could contain
the symbol, tree-sitter parses only those. Measured on specstory-sync (645
source files — 1/77th of the target 50k):

| fragment | prefilter | candidate files | end-to-end |
|---|---|---|---|
| `Session` | substring | 325 | **652 ms** |
| `Session` | definition-shaped regex | 150 | **493 ms** |
| `Tab` | substring | 187 | 531 ms |
| `Tab` | definition-shaped regex | 36 | **340 ms** |
| `handle` | definition-shaped regex | 106 | 419 ms |
| `openFrom` (no hits) | either | 0 | 12 ms |

The definition-shaped regex — requiring the fragment to sit next to a
declaration keyword — halves the candidate *files* and loses no recall (hit
counts identical for all four fragments). It still lands at 340–500 ms, because
the surviving candidates include a handful of very large files, and it scales
linearly with repo size. Three-letter fragments are exactly what people type
first. **Rejected.** Keep the definition-shaped regex anyway: it is the right
prefilter for the *cold-index* fallback (§4.6, "before the index is warm").

### 2.7 Ship gmux's own tags queries — upstream's are not fit for purpose

`tree-sitter-*/queries/tags.scm` exists for every language here, compiles cleanly
against the `@vscode/tree-sitter-wasm` grammars, and is the obvious starting
point. It is also, for TypeScript, close to useless on its own, because
`tree-sitter-typescript`'s `tags.scm` is a *supplement* to the JavaScript one and
covers only ambient/declaration constructs.

Probing 17 real gmux symbols against the stock queries (JS + TS layered):

```
FOUND requestOpenFile   FOUND tabIdFor        FOUND openFromRequest   FOUND EditorTab
MISS  useEditor         MISS  EditorMode      MISS  SidebarViewId     FOUND OpenFileRequest
MISS  MAX_TABS          MISS  MARKDOWN_MODES  FOUND startSurfaceDrag  FOUND registerFsIpc
FOUND GmuxSettingsExtras FOUND ActivityBar    FOUND Sidebar           FOUND App
```

Five misses out of seventeen, and they are not exotic: **every `type` alias,
every `enum`, and every top-level `const`** — including `const useEditor =
create(...)`, which is how every store in this codebase is declared. Stock
queries found 1,303 distinct names in gmux; the queries below find 1,638 and
**17/17** of the probe set (20/20 on an extended probe).

Ship these five files as `src/main/search/queries/*.scm` (or inline them as
string constants — they must be readable at runtime in the packaged app, so if
they stay as files they need `extraResources`). Licence note: they are
gmux-authored, seeded from the MIT-licensed upstream `tags.scm`; keep the
attribution comment.

**`javascript.scm`** — the base layer, also loaded for TS and TSX:

```scheme
; gmux symbol query — JavaScript base (also the base layer for TS/TSX).
; DEFINITIONS ONLY: a symbol picker never shows references, and dropping the
; reference patterns is most of the query cost.

(function_declaration name: (identifier) @name) @definition.function
(generator_function_declaration name: (identifier) @name) @definition.function

(class_declaration name: (_) @name) @definition.class

(class_declaration
  name: (_) @container
  body: (class_body
    (method_definition name: (property_identifier) @name) @definition.method))

; const foo = () => …  /  const foo = function () {}  (at any depth)
(lexical_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)
(variable_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)

; Top-level `const X = <anything>` — the store/registry/constant idiom
; (`const useEditor = create(...)`, `const MAX_TABS = 10`). Upstream tags.scm
; drops these entirely. Overlaps the arrow-function rules above; the indexer
; keeps the most specific kind per (line, column, name).
(program
  (lexical_declaration
    "const"
    (variable_declarator name: (identifier) @name) @definition.constant))
(program
  (export_statement
    declaration: (lexical_declaration
      "const"
      (variable_declarator name: (identifier) @name) @definition.constant)))
```

**`typescript.scm`** — layered *after* `javascript.scm`, and used for both the
`typescript` and `tsx` grammars (same node names, one query text):

```scheme
(interface_declaration name: (type_identifier) @name) @definition.interface
(type_alias_declaration name: (type_identifier) @name) @definition.type
(enum_declaration name: (identifier) @name) @definition.enum
(enum_declaration
  name: (identifier) @container
  body: (enum_body
    [(property_identifier) @name
     (enum_assignment name: (property_identifier) @name)]) @definition.enum-member)

(abstract_class_declaration name: (type_identifier) @name) @definition.class
(internal_module name: (identifier) @name) @definition.module
(module name: [(identifier) (string)] @name) @definition.module

; .d.ts / ambient declarations
(function_signature name: (identifier) @name) @definition.function
(method_signature name: (property_identifier) @name) @definition.method
(abstract_method_signature name: (property_identifier) @name) @definition.method

; class fields holding an arrow function read as methods to a human
(public_field_definition
  name: (property_identifier) @name
  value: (arrow_function)) @definition.method
```

Do **not** put TypeScript-only node types (`as_expression`, `satisfies_expression`)
into `javascript.scm`: the same text is compiled against the plain JavaScript
grammar and `new Query()` throws `Bad node name 'as_expression'`. (Hit during
this research; the query alternation was replaced with the `value`-less
top-level rule above.)

**`go.scm`**:

```scheme
(function_declaration name: (identifier) @name) @definition.function

(method_declaration
  receiver: (parameter_list
    (parameter_declaration
      type: [(type_identifier) @container
             (pointer_type (type_identifier) @container)]))
  name: (field_identifier) @name) @definition.method

(type_declaration
  (type_spec name: (type_identifier) @name type: (struct_type))) @definition.struct
(type_declaration
  (type_spec name: (type_identifier) @name type: (interface_type))) @definition.interface
(type_declaration
  (type_spec name: (type_identifier) @name
    type: [(qualified_type) (pointer_type) (map_type) (slice_type)
           (array_type) (function_type) (channel_type) (generic_type)])) @definition.type
(type_alias name: (type_identifier) @name) @definition.type

; Package-level only. Without the `source_file` anchor these also match every
; function-local `var x = …`, which floods the picker with locals
; (measured: 926 → 83 on a 285-file Go repo).
(source_file
  (const_declaration (const_spec name: (identifier) @name)) @definition.constant)
(source_file
  (var_declaration (var_spec name: (identifier) @name)) @definition.variable)

; struct fields are what people actually search for in DTO-heavy Go
(type_declaration
  (type_spec
    name: (type_identifier) @container
    type: (struct_type
      (field_declaration_list
        (field_declaration name: (field_identifier) @name) @definition.field))))
```

**`python.scm`**:

```scheme
(module (function_definition name: (identifier) @name) @definition.function)
(module (decorated_definition
  definition: (function_definition name: (identifier) @name)) @definition.function)

(class_definition name: (identifier) @name) @definition.class

(class_definition
  name: (identifier) @container
  body: (block
    [(function_definition name: (identifier) @name)
     (decorated_definition
       definition: (function_definition name: (identifier) @name))] @definition.method))

(module
  (expression_statement
    (assignment left: (identifier) @name)) @definition.constant)
```

**`rust.scm`**:

```scheme
(struct_item name: (type_identifier) @name) @definition.struct
(enum_item name: (type_identifier) @name) @definition.enum
(enum_item
  name: (type_identifier) @container
  body: (enum_variant_list
    (enum_variant name: (identifier) @name) @definition.enum-member))
(union_item name: (type_identifier) @name) @definition.struct
(type_item name: (type_identifier) @name) @definition.type
(trait_item name: (type_identifier) @name) @definition.interface
(mod_item name: (identifier) @name) @definition.module
(macro_definition name: (identifier) @name) @definition.macro
(const_item name: (identifier) @name) @definition.constant
(static_item name: (identifier) @name) @definition.constant

(source_file (function_item name: (identifier) @name) @definition.function)
(mod_item (declaration_list (function_item name: (identifier) @name) @definition.function))

(impl_item
  type: (type_identifier) @container
  body: (declaration_list
    (function_item name: (identifier) @name) @definition.method))
(impl_item
  type: (generic_type type: (type_identifier) @container)
  body: (declaration_list
    (function_item name: (identifier) @name) @definition.method))

(trait_item
  name: (type_identifier) @container
  body: (declaration_list
    (function_signature_item name: (identifier) @name) @definition.method))

(struct_item
  name: (type_identifier) @container
  body: (field_declaration_list
    (field_declaration name: (field_identifier) @name) @definition.field))
```

Validated output on representative samples (verbatim from the harness):

```
════ python (8) ════                 ════ rust (18) ════
constant    MAX_RETRIES  L2          constant    MAX  L1        method  Client.new  L11
constant    DEFAULT_NAME L3          constant    NAME L2        method  Client.helper L12
class       Client       L5          struct      Client L4      method  Client.fetch  L16
method      Client.__init__ L7       field       Client.base L4 type    Alias  L19
method      Client.fetch L9          field       Client.timeout L4  module inner L21
method      Client.name  L12         enum        Mode L6        function nested L22
function    top_level    L15         enum-member Mode.Fast L6    macro   shout  L25
function    decorated    L21         enum-member Mode.Slow L6    function free_fn L27
                                     interface   Fetch L8
                                     method      Fetch.fetch L8
```

Note what is *not* there: Python's nested `inner()` and Go's function-local
`var`s. A symbol picker that lists locals is noise.

**Two query-engine rules the implementer will otherwise rediscover the hard way:**

- Several definition patterns can claim the same `(line, column, name)` —
  `const f = () => {}` matches both the arrow rule and the top-level-const rule.
  Dedupe per file with "most specific kind wins" (`constant` and `variable` rank
  lowest).
- The upstream Go and JS queries contain `#strip!` and `#select-adjacent!`
  directives for doc-comment capture. They compile fine in web-tree-sitter and
  are simply not applied. The gmux queries drop the `(comment)* @doc` capture
  entirely, which is also a measurable saving — capturing comments makes the
  query match far more nodes than it needs to.

### 2.8 Where the index lives and when it is built

```
main process
├── src/main/search/index.ts          registerSearchIpc()
├── src/main/search/symbols/
│   ├── pool.ts                       worker_threads pool (min(6, cpus-2) workers)
│   ├── worker.ts                     web-tree-sitter + queries + parse loop
│   ├── store.ts                      columnar table + fuzzy scorer (§2.5)
│   ├── persist.ts                    better-sqlite3 table, keyed by mtime+size
│   └── queries/*.scm
└── src/main/search/content/          ripgrep driver (dimension 2 owns this)
```

Main, not the renderer, for three reasons: main already owns `fs` and
`@parcel/watcher` (`src/main/watcher/repo-watcher.ts`); the renderer must never
be the thing that blocks; and `worker_threads` in main is a plain Node pool with
no Electron-specific packaging.

Lifecycle:

1. **Never on project open.** Building an index nobody asked for is exactly the
   battery burn the constraint forbids.
2. **First ⌘⇧O (or first `#` in ⌘P) for a project** triggers the build. The
   palette opens immediately, shows a thin indeterminate progress line and
   answers from the definition-shaped ripgrep fallback (§2.6, 340–500 ms) until
   the index lands. On the three repos here that is 300–800 ms; the fallback is
   never seen. On a 50k-file monorepo the fallback carries the first ~23 s.
3. **Persist** to the existing better-sqlite3 database (a new
   `symbol_index` table; `src/main/manifest/store.ts` shows the house pattern),
   keyed by `(repoPath, relPath, mtimeMs, size)`. On the next launch, re-`stat`
   the file list and re-parse only the drifted files. Do not persist the columnar
   blob; rebuild it from rows at load — 245 ms for a million rows.
4. **Incremental update** from the repo watcher: one changed file is 1.25 ms.
   Debounce 300 ms like `src/renderer/editor/store.ts:216` does.
5. **Evict** a project's in-memory table when its last window closes or after
   30 minutes of no symbol query. The SQLite copy survives.

**Bundle cost**, measured on disk: runtime `web-tree-sitter.wasm` **196 KB** plus
`web-tree-sitter.cjs` 162 KB, and grammars typescript 1,381 KB, tsx 1,412 KB,
rust 1,088 KB, python 447 KB, javascript 402 KB, go 212 KB — **4.8 MB for the
six**, 5.2 MB all in. Ship only these six in v1: `@vscode/tree-sitter-wasm` also
carries cpp (5.1 MB), c-sharp (4.9 MB), ruby (2.0 MB), bash, java, php,
powershell, css, ini and regex, and shipping the lot would add ~14 MB for
languages nobody in these repos writes. Copy the six via `extraResources`; do not
`files`-include the whole package (and note `electron-builder.yml`'s `asarUnpack`
covers `**/*.node` only — `.wasm` is not covered, §1.5).

---

## 3. (b) Structural search — defer, and say why in one line

> **Recommendation: not in v1, and probably not ever as a bundled engine. Comby
> is rejected outright. ast-grep gets a zero-cost escape hatch instead.**

**Comby: reject.** Apache-2.0 and a genuinely nice matcher, but the last release
is **1.8.1 on 2022-06-28** — four years — and the only commit this year is a
README touch. There is **no Node binding**: `comby` on npm is an unrelated 2016
package with one version, `comby-js` and `@comby/comby` do not exist. Using it
means bundling and signing an OCaml Mach-O binary and shelling out to it, for a
matcher whose job overlaps a tool the user can already run.

**ast-grep: healthy, and still not worth bundling *for this app*.** 15,468 stars,
0.45.1 three days ago, MIT, and the fastest thing measured here. The costs are
the ones in §2.3 (native `.node`, per-language `.so`, `@experimental` dynamic
registration, hardened-runtime signing) and they buy a feature whose audience is
small: people who want `$A.map($B => $C)` are power users, and power users of
*this* app have a terminal one keystroke away.

That is the punchline worth putting in the UI. gmux is a terminal multiplexer.
The structural-search story is:

- **Escape hatch, ~30 lines, zero bundle cost.** If `sg` (or `ast-grep`) is
  found by the Phase 10 detection resolver
  (`src/main/agents/detection.ts` — reuse it, do not write a second PATH probe),
  the Search view's overflow menu gains **"Search structurally with ast-grep…"**,
  which opens a new gmux session in the project root pre-typed with
  `sg run -p '' -l ts` and the cursor inside the quotes. Not detected → the item
  is absent (no nag, no installer).
- Revisit bundling only if two things become true: ast-grep publishes wasm or
  statically-linked language support that removes the per-language `.so`, **and**
  telemetry or user requests show the escape hatch getting real use.

Record the decision in `docs/BACKLOG.md` so it does not get relitigated every
phase.

---

## 4. (c) The UX and interaction contract

Modelled on VS Code, fitted to gmux's existing chrome, tokens and buses. Section
references are to `DESIGN.md` / `docs/DESIGN-SPEC.md`.

### 4.1 Keyboard map (the complete delta)

| Chord | Action | Where handled |
|---|---|---|
| `⌘P` | Quick open palette (files). Empty query → recently opened files. | `useKeyboardMap`, above the `inEditable` guard |
| `⌘⇧F` | Show + focus the **Search** view. If the Monaco or terminal selection is non-empty and single-line, seed the query with it and select-all. Pressed again while the box is focused: select-all (does not toggle away). | same |
| `⌘⇧H` | Show + focus Search with the Replace field open and focused. | same |
| `⌘⇧O` | Palette in symbol mode: `@` (current file) when a tab is active, `#` (project) otherwise. | same |
| `F4` / `⇧F4` | Next / previous **search result** — works from anywhere, opens each in the preview tab. | `useKeyboardMap` |
| `⌘G` / `⌘⇧G` | Reserved — **do not take.** `⌃⇧G` is Source Control; a `⌘G` "find next" would read as its sibling and confuse. | — |
| `Esc` | Palette open → close it. Search box focused → clear query if non-empty, else return focus to the results list, else to the terminal. Extends the existing Esc ladder in `App.tsx:114`. | `useKeyboardMap` |
| `⌥⌘C` / `⌥⌘W` / `⌥⌘R` | Toggle case / whole word / regex — **only while focus is inside the Search view**. | Search view's own `onKeyDown` |
| `↑` `↓` | Move selection in palette / results. Does **not** open. | component |
| `↩` | Open into the **preview** tab; focus stays in the list. | component |
| `⌘↩` or double-click | Open **pinned** and move focus to the editor. | component |
| `⌘⌫` (results) | Dismiss the selected result / file group from the list. | component |
| `⌘C` (results) | Copy the selected match line (or the file path on a file row). | component |
| `⇥` (palette) | Move between the mode chip and the input. Never traps focus (reuse `src/renderer/app/focus-trap.ts`). | component |

Registration rules, from `src/main/menu.ts` and `App.tsx:9-17`:

- Every chord above also gets a **native menu item** so it is discoverable:
  a new **Find** menu between Edit and Session, with *Quick Open ⌘P*, *Go to
  Symbol ⌘⇧O*, *Find in Files ⌘⇧F*, *Replace in Files ⌘⇧H*, *Find Next Result F4*,
  *Find Previous Result ⇧F4*, and *Undo Replace in Files* (§5).
- The renderer branch runs first and calls `preventDefault()`, so each menu item
  must be a pure mirror that performs the same action exactly once — the same
  discipline the file already documents for `show-scm` / `show-explorer`.
- Add all of them to `ShortcutsOverlay.tsx` (⌘/) under a new "Search" group.

### 4.2 The Search view

New `SidebarViewId`: `'scm' | 'explorer' | 'search'` (`src/renderer/state/store.ts:112`).
New activity-bar item between Explorer and Source Control, icon `search`, label
"Search", shortcut hint `⌘⇧F`, badge = result-file count while a search is live
(accent, never amber — amber is attention-only, `ActivityBar.tsx:167`). The
existing click-the-active-icon-to-collapse behaviour comes for free.

Anatomy, top to bottom, inside the standard 36 px header band (S1) plus a body:

```
┌ view-header (36px) ─────────────────────────────────────────────┐
│ SEARCH                      [⟳ refresh] [⌫ clear] [⇱ collapse]  │
├─ query block ───────────────────────────────────────────────────┤
│ ▸ ┌───────────────────────────────────┐  Aa  ab|  .*            │   ▸ = replace disclosure
│   │ query                             │                         │
│   └───────────────────────────────────┘                         │
│   ┌───────────────────────────────────┐  ⇄  ⇄⇄                  │   (only when ▾ open)
│   │ replace                           │                         │
│   └───────────────────────────────────┘                         │
│                                              …  ← details toggle│
│   files to include  [ src/**, *.ts            ]                 │   (only when details open)
│   files to exclude  [ **/dist/**              ]  [⊘] use ignore │
├─ summary row ───────────────────────────────────────────────────┤
│ 412 results in 37 files                     ⚠ 3 files changed   │
├─ results (virtualized) ─────────────────────────────────────────┤
│ ▾ ⟨icon⟩ store.ts   src/renderer/editor            12           │
│      118   const MAX_TABS = 10;                                 │
│      389   if (tabs.length > MAX_TABS) {                        │
│ ▾ ⟨icon⟩ EditorTabs.tsx   src/renderer/editor       3           │
└─────────────────────────────────────────────────────────────────┘
```

Concrete rules:

- **Toggles** use real codicons, all verified present in the installed
  `@vscode/codicons@0.0.46-24`: `case-sensitive`, `whole-word`, `regex`,
  `replace`, `replace-all`, `preserve-case`, `search-stop`, `clear-all`,
  `collapse-all`, `exclude`, `filter`, `ellipsis`. Each is a 20×20 icon button
  with `aria-pressed`, `--bg-active` fill when on, and a tooltip carrying its
  chord.
- **Row height 22 px** for both file and match rows (denser than the tree's 24 px
  because a match row is one line of code); `--text-sm` / `--font-mono` for match
  text, `--text-base` / `--font-ui` for file names.
- **File row**: file icon (reuse `src/renderer/icons/FileIcon.tsx`), basename in
  `--text-primary`, dirname relative to the repo root in `--text-muted`,
  right-aligned match-count badge in `--bg-raised`. Chevron toggles the group.
- **Match row**: line number in `--text-muted` (tabular, `.num`), then the line
  text with leading whitespace trimmed (remember how much you trimmed and shift
  the highlight offsets by the same amount), matched span wrapped in
  `<mark class="search-hit">` filled `--accent-wash` with `--accent-text`.
  Lines longer than 500 characters are windowed around the first match with a
  leading `…`. **This is load-bearing, not cosmetic**: D1 found that
  `--max-columns` is *silently ignored by ripgrep's `--json` printer*, and one
  minified file in these repos produced a single **6.95 MB JSON line**. Main must
  therefore clamp `SearchMatch.text` to `maxLineChars` (windowed around the first
  match, offsets shifted) **before** the row crosses IPC — the renderer must never
  be handed a 7 MB string.
- **Sticky file header** while scrolling inside a group, matching the tree's
  `stickyFolders` behaviour so the two views feel like one app.
- **Virtualization is mandatory.** 10,000 match rows will be routine. Either
  reuse the `Virtualizer` already exported by `@pierre/diffs` (it is in the
  bundle already — see `node_modules/@pierre/diffs/dist/index.d.ts`) or write
  ~60 lines of fixed-height windowing. Do not render 10,000 DOM rows.
- **Stale badge, not auto-rerun.** This is where gmux must depart from VS Code.
  Agents are writing files in the background all the time; a search that re-runs
  itself on every watcher event would thrash and would move rows out from under
  the user's cursor. So: subscribe to `git:changed` / the watcher, count files
  that changed since the search ran, and show `⚠ N files changed · Refresh` in
  the summary row. Only the user's click re-runs it. The **symbol** index, by
  contrast, does update itself silently — it has no visible cursor to disturb.

### 4.3 The search protocol

Append to `src/shared/ipc.ts` (append-only, per the growth guardrail — new
channels, no edits to existing declarations):

```ts
export interface ContentSearchInput {
  repoPath: string;
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
  /** Comma-separated globs, VS Code syntax; empty = everything. */
  includes: string;
  excludes: string;
  /** false → pass --no-ignore-vcs (VS Code's "use ignore files" toggle). */
  useIgnoreFiles: boolean;
  /** Context lines either side of a match. 0 = VS Code's default view. */
  contextLines: number;
  /** Replacement text; set only to get a replace PREVIEW in the same stream. */
  replace?: string;
  /** D1's measured cap; see §7. */
  maxResults: number;      // default 20_000
  maxPerFile: number;      // default 1_000
  /** Hard clamp on a single line's text BEFORE it crosses IPC — see §7. */
  maxLineChars: number;    // default 2_000
}

export interface SearchMatch {
  /** 1-based. */
  line: number;
  /** The whole line, newline stripped. */
  text: string;
  /** Leading whitespace removed from `text` before display, in UTF-16 units. */
  trimmed: number;
  /** [startUtf16, endUtf16] per match on this line, already converted. */
  ranges: [number, number][];
  /** Replacement text per range; present only when `replace` was set. */
  replacements?: string[];
  /** Byte offset of the line start in the file — the replace path needs it. */
  byteOffset: number;
}

export interface SearchFileResult {
  relPath: string;
  matchCount: number;
  matches: SearchMatch[];
  /** matchCount was clipped by maxPerFile. */
  clipped: boolean;
}

export interface SearchProgress {
  searchId: string;
  files: SearchFileResult[];
  totalMatches: number;
  totalFiles: number;
  done: boolean;
  /** Hit maxResults; the tree shows "showing first N". */
  capped: boolean;
  /** rg exited non-zero for a reason worth showing (bad regex…). */
  error?: string;
}

// InvokeChannelMap additions
'search:start':  { req: [input: ContentSearchInput]; res: { searchId: string } };
'search:cancel': { req: [searchId: string]; res: void };

// Per-search result stream, mirroring termDataChannel's convention.
export const searchResultsChannel = (searchId: string): string =>
  `search:results:${searchId}`;
```

Behaviour:

- **Debounce 150 ms** after the last keystroke, and require ≥ 2 characters
  unless regex mode is on (a 1-character regex is a legitimate query).
- **Cancel on retype**: `search:cancel` **SIGKILLs** the in-flight `rg` and bumps
  a query epoch; the renderer discards any late frames whose `searchId` is not
  current. A stale frame arriving after a new search started must never paint.
  D1 measured that `SIGTERM` lets ~8 KB of already-buffered pipe data land after
  you thought you had stopped, while `SIGKILL` lets none — and ripgrep holds no
  locks and writes nothing, so it is safe.
- **Batch** result frames: flush every 16 ms or every 200 matches, whichever
  comes first. Streaming exists so the first rows paint in one frame, not so the
  renderer receives 81,000 messages.
- **Caps**: `maxResults` **20,000** (D1's number, matching VS Code) with a
  "showing first 20,000 results" banner and a *Show more* action that re-runs with
  a higher cap; `maxPerFile` 1,000 with a "+N more in this file" row;
  `--max-filesize 10M`. D1 shows the cap is not a safety valve but the primary
  performance mechanism: it turns a 2,496 ms worst case into 72 ms and drops peak
  RSS from 164 MB to 19 MB.

**Why these numbers.** Full pipeline — ripgrep 15.0.0 (from `@vscode/ripgrep`
1.18.0) over `/Users/gdc/specstory-sync` (986 files), then split + `JSON.parse` +
row construction + the offset conversion of §4.4. The harness applied a
10,000-result cap (the shipped cap is 20,000, which only moves the `the` row):

| query | rg wall | matches | files | JSON stream | parse + rows + offsets | rows to IPC |
|---|---|---|---|---|---|---|
| `session`, ctx 0 | 16.6 ms | 6,365 | 451 | 4.0 MB | 17.9 ms | 2.84 MB |
| `session`, ctx 2 | 19.8 ms | 6,365 | 451 | 7.3 MB | 28.8 ms | 2.84 MB |
| `import`, ctx 2 | 17.0 ms | 3,092 | 608 | 3.7 MB | 15.0 ms | 2.21 MB |
| `the`, ctx 2 | 35.4 ms | 22,312 | 682 | 22 MB | 81.5 ms | 3.96 MB |
| `the`, ctx 2, `--max-count 200` | 25.8 ms | 12,279 | 682 | 12.8 MB | 44.2 ms | 2.20 MB |

So a typical query is **~40 ms end to end** and the pathological one-letter-ish
query is **~117 ms** — both comfortably inside the 150 ms debounce, which means
the user never sees a search start. ripgrep itself is never the bottleneck. The
stream volume and the resulting IPC payload are: 10,000 kept matches serialise to
**2–4 MB** of row JSON (double it at the shipped 20,000 cap), and context lines roughly double the stream (4.0 → 7.3 MB)
for a third more build time. That is what the caps, the per-file cap and the
batching are protecting.

### 4.4 The byte-offset trap, and the 41× fix

`rg --json` gives `submatches[].start/end` as **byte offsets into the line**, not
JavaScript string indices. Demonstrated on a line containing `café`:

```
byteStart 6 byteEnd 11
  naive text.slice(6, 11)  →  'café '      ← wrong
  byte-correct             →  'café'
```

The obvious fix — `Buffer.from(text).subarray(0, start).toString().length` per
submatch — is correct and *very* expensive. Cumulative stages over the `session`
result set (23,144 rg events, 6,365 match lines, 9,705 submatches, 719 of the
lines non-ASCII), median of five runs after warm-up:

| cumulative stage | median |
|---|---|
| split + `JSON.parse` only | 17.3 ms |
| + read `lines.text` | 17.5 ms |
| + build row objects | 17.7 ms |
| + `subarray().toString().length` conversion | **204.2 ms** |

Isolating the conversion alone over the same 9,705 submatches: **184.8 ms** for
the `subarray` version versus **4.5 ms** for the single walk below — 41× — with
**0 mismatches** between the two. (The end-to-end 28.8 ms in §4.3 for this same
query is the 17.7 ms of row building plus this conversion.) Use this:

```ts
/** rg byte offsets → UTF-16 offsets. One pass, ASCII short-circuit. */
function toUtf16(text: string, pairs: [number, number][]): [number, number][] {
  if (Buffer.byteLength(text, 'utf8') === text.length) return pairs; // pure ASCII
  const wanted = pairs.flat().sort((a, b) => a - b);
  const map = new Map<number, number>();
  let b = 0;
  let k = 0;
  for (let i = 0; i < text.length && k < wanted.length; ) {
    while (k < wanted.length && wanted[k] === b) map.set(wanted[k++], i);
    const cp = text.codePointAt(i)!;
    b += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    i += cp >= 0x10000 ? 2 : 1;
  }
  while (k < wanted.length) map.set(wanted[k++], text.length);
  return pairs.map(([s, e]) => [map.get(s) ?? s, map.get(e) ?? e]);
}
```

Gating the `subarray` version behind an ASCII check does **not** help on its own
(201.8 ms vs 204.2 ms), and the reason is worth knowing because it is not
intuition: in this corpus the 719 non-ASCII lines average **2,447 characters**
(longest: 306,438) against 69 for the 5,646 ASCII lines, so they hold 1.76 MB of
the 2.15 MB of match text. `subarray(0, start).toString()` re-decodes the whole
prefix of one of those lines **twice per submatch**. The single walk decodes each
line at most once and short-circuits the common ASCII case, which is why it wins
on both. Detecting ASCII is free either way (0.3–0.7 ms for all 6,365 lines).
Convert in main, once, before the row crosses IPC.

### 4.5 Quick open (⌘P)

Chrome: the `AttentionOverlay` family — backdrop, floating panel anchored under
the titlebar, `role="listbox"`, ↑↓/↩/Esc, footer key hints. `--z-modal`.

Query grammar, VS Code-compatible:

| Input | Mode |
|---|---|
| `foo/bar` | fuzzy file path in the active project |
| *(empty)* | recently opened editors (from `useEditor` tab history), then recent files |
| `:412` | go to line in the **active editor** |
| `foo.ts:412` | open `foo.ts` at line 412 |
| `@` | symbols in the **active file** |
| `#` | symbols in the **project** |
| `>` | reserved for a future command palette — show "Commands are not available yet" rather than silently searching for `>` |

Rows: file icon, basename (`--text-primary`, matched characters in
`--accent-text` and `--weight-medium`), dirname relative to the repo root
(`--text-muted`), and a right-aligned dimmed project name when the palette is
searching across all open projects. Fuzzy-match highlighting is per-character;
the scorer must return the matched index array, not just a score.

Scope: the **active project** by default. `⌘P` twice, or a chip in the palette
header, widens to all open projects — gmux is multi-project and this is the one
place that difference matters. Persist the last choice per window.

Ranking is **D2's** decision, not this document's: `19-search-d2-fuzzy-file-path.md`
lands on a two-stage gate-and-rerank (`fuzzysort@4` over a snapshot of the full
path list down to 512 candidates, then `fzf@0.5.2` with the `byLengthAsc`
tiebreaker) scoring MRR 0.918 on a labelled query set. Consume it; do not write a
second scorer. What this document requires of it is only the interface: it must
return the **matched character indices**, not just a score, because the palette
highlights per character. Recency of open (from `useEditor`'s tab history) is
applied as a tiebreak on top. `.gitignore` and the standard excludes are folded
into the file list at the source (D2's `rg --files`), never into the scorer.

### 4.6 Go to symbol (⌘⇧O)

Same palette, mode chip reading `@ current file` or `# project`. Rows: symbol
codicon, name (with fuzzy highlight), container in `--text-muted` after a `·`,
then the file path right-aligned and dimmed in project mode.

Kind → codicon, all verified present:

| kind | codicon | | kind | codicon |
|---|---|---|---|---|
| `function` | `symbol-method` | | `enum` | `symbol-enum` |
| `method` | `symbol-method` | | `enum-member` | `symbol-enum-member` |
| `class` | `symbol-class` | | `constant` | `symbol-constant` |
| `interface` | `symbol-interface` | | `variable` | `symbol-variable` |
| `struct` | `symbol-structure` | | `field` | `symbol-field` |
| `type` | `symbol-interface` | | `module` | `symbol-namespace` |
| `property` | `symbol-property` | | `macro` | `symbol-keyword` |

(`symbol-function` does **not** exist in the codicon font — `symbol-method` is
the glyph VS Code itself uses for functions. Anything unmapped falls back to
`symbol-misc`.)

In-file mode (`@`) sorts by position by default with a "sort by name" toggle,
and groups by container when containers exist. Project mode (`#`) sorts by
fuzzy score.

**Before the index is warm:** the palette opens instantly, shows a 2 px
indeterminate accent line under the input, and answers from the
definition-shaped ripgrep prefilter (§2.6) — the regex union is worth keeping in
the codebase for exactly this. Rows found that way carry no `container` and are
replaced wholesale when the index lands. Never make the user wait on a
progress bar to type.

```ts
export interface SymbolHit {
  name: string;
  kind: 'function' | 'method' | 'class' | 'interface' | 'struct' | 'type'
      | 'enum' | 'enum-member' | 'constant' | 'variable' | 'field'
      | 'module' | 'macro' | 'property';
  container: string | null;
  relPath: string;
  line: number;    // 1-based
  column: number;  // 0-based, UTF-16
  endColumn: number;
}
'search:symbols': { req: [input: { repoPath: string; query: string; relPath?: string; limit: number }];
                    res: { hits: SymbolHit[]; indexing: boolean } };
```

### 4.7 Opening a result — the bus change

Append to `src/renderer/state/open-file.ts`:

```ts
/**
 * Where in the file to land (Phase 14). A request that carries one is a
 * NAVIGATION: reveal the range, select it, and flash it once.
 * `line` is 1-based; columns are 0-based UTF-16 offsets, matching Monaco.
 */
export interface OpenFileSelection {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  /** Flash the range after revealing. Default true. */
  highlight?: boolean;
}

export interface OpenFileRequest {
  // …existing fields unchanged…
  source: 'worktree' | 'index' | 'untracked' | 'merge' | 'history' | 'tree'
        | 'search' | 'symbol' | 'quickopen';
  /** Phase 14. Present ⇒ the tab must open in a surface that has lines. */
  selection?: OpenFileSelection;
}
```

Three rules that fall out of it, all of which must be implemented or the feature
is subtly broken:

1. **A request with a `selection` never opens as a diff or a rendered preview.**
   `openFromRequest` (`src/renderer/editor/store.ts:324`) currently picks `diff`
   for changed files and `preview` for markdown. Both are line-less surfaces for
   this purpose. When `selection` is present, force `mode: 'file'` and leave
   `canDiff` true so the mode chip still offers the diff. (A later refinement can
   use `@pierre/diffs`' `CodeViewLineScrollTarget` to reveal a line inside a
   diff; out of scope for v1.)
2. **Re-opening an already-open tab must still apply the selection.** The current
   early return at `store.ts:331-336` only activates and pins. Add a
   `pendingSelection: OpenFileSelection | null` field to `EditorTab`, set it on
   both paths, and have `MonacoHost` consume-and-clear it.
3. **Order matters in `MonacoHost`.** The mount effect restores saved view state
   at `MonacoHost.tsx:160`. A reveal issued before that will be overwritten.
   Apply the pending selection **after** `restoreViewState`:

```ts
const state = takeViewState(tab.id);
if (state !== null) ce.restoreViewState(state);

const sel = tab.pendingSelection;
if (sel) {
  const range = new m.Range(
    sel.line, (sel.column ?? 0) + 1,
    sel.endLine ?? sel.line, (sel.endColumn ?? sel.column ?? 0) + 1
  );
  ce.setSelection(range);
  ce.revealRangeInCenterIfOutsideViewport(range, m.editor.ScrollType.Immediate);
  if (sel.highlight !== false) flashRange(ce, range);   // 1 decoration, ~600 ms
  clearPendingSelection(tab.id);
}
```

`flashRange` adds one decoration with `className: 'gmux-match-flash'`
(`background: var(--accent-wash)`, fading out over `--dur-panel`) and removes it
on a timer. It must be a no-op under `prefers-reduced-motion` — leave the
decoration in place for 600 ms without the transition.

Note the existing focus rule at `MonacoHost.tsx:191`: opening a file focuses the
editor. That is wrong for search-result scanning, where focus must stay in the
results list so ↑↓ keep working. Gate it: focus the editor only when the request
is pinned (`preview === false`) or its `source` is not `'search'`.

### 4.8 Preview versus pinned, exactly

The store already implements VS Code's semantics (`store.ts:113-127, 324-413`):
one preview tab, reused until edited or pinned; `preview: false` means "for
keeps"; a second open of the same tab within 500 ms pins it. Search inherits it
unchanged:

| Gesture | Request | Focus afterwards |
|---|---|---|
| Single click on a match | `preview: true, selection` | stays in the results list |
| `↩` on a match | `preview: true, selection` | stays in the results list |
| Double-click on a match | `preview: false, selection` | moves to the editor |
| `⌘↩` on a match | `preview: false, selection` | moves to the editor |
| `F4` / `⇧F4` from anywhere | `preview: true, selection` | wherever it was |
| `↑` `↓` in the list | nothing opens | list |
| Quick-open / symbol pick with `↩` | `preview: false` | editor |

Arrowing does **not** open. VS Code opens on single click but not on arrow, and
with 10,000 results the difference between "arrow through 40 rows" and "load 40
files" is the difference between a usable list and a stuttering one.

The tree already uses the same `openRel(rel, keep)` shape with `keep` true on
double-click (`FileTree.tsx:358-364`) — search must not invent a second
convention.

### 4.9 States

| State | Treatment |
|---|---|
| Idle (no query) | Body shows the hint "Search across `<project name>`" plus the three toggle meanings, in `--text-muted`. No spinner. |
| Searching | 2 px indeterminate accent line under the query block; summary reads "Searching…" with a live count; the `search-stop` icon replaces `refresh`. |
| No results | "No results found." plus, when include/exclude are non-empty, "3 include and 1 exclude filter are active — clear filters" as a link. VS Code's most common support question. |
| Invalid regex | Red hairline on the input, `--error` message under it with rg's own message. Do not run the search. |
| Capped | Sticky footer row: "Showing the first 20,000 results. Show more". |
| Stale | Summary-row chip: `⚠ 3 files changed · Refresh`. Never auto-rerun. |
| Not a git repo | Search still works (rg walks the tree); the "use ignore files" toggle is disabled with a tooltip. |
| Symbol index building | Palette line indicator + "indexing 1,240 / 4,900 files" in the footer. Fallback results shown meanwhile. |
| Unsupported language for symbols | Silent — the file simply contributes no symbols. Never show "language not supported". |

Accessibility: the results list is `role="tree"` with `role="treeitem"` rows and
`aria-expanded` on file rows; the summary row is `aria-live="polite"` and
announces the final count once, not during streaming; every icon button has an
`aria-label` including its chord; the match highlight uses `<mark>` so it
survives high-contrast mode.

### 4.10 Context menus

Native only, through the existing `ui:popupMenu` bridge (`CLAUDE.md` UI rules —
no DOM-drawn menus).

- **Match row**: Open, Open to the Side *(disabled in v1)*, ─, Copy, Copy Path,
  Copy All Matches in File, ─, Dismiss, ─, Replace *(when replace is open)*.
- **File row**: Open File, Reveal in Explorer (`FileTree.scrollToPath(rel,
  { focus: true, offset: 'center' })`), Reveal in Finder (`fs:reveal`), ─, Copy
  Path, Copy Relative Path, ─, Dismiss All Matches, Replace All in File.
- **Search box**: standard edit menu.

---

## 5. (d) Replace-in-files — in for v1, scoped

> **Recommendation: in.** The preview is *free* from the engine already chosen,
> and the apply step is one well-understood primitive. Ship preview + replace
> single / file / all + a one-shot undo. Do not ship live tree mutation.

### 5.1 Why the preview is free

`rg --json -r <replacement>` emits, for every submatch, both the original and the
replacement, while `lines.text` stays the original line. Verified:

```json
{"type":"match","data":{"lines":{"text":"const café = \"naïve\"; // café\n"},
  "line_number":1,"absolute_offset":0,
  "submatches":[{"match":{"text":"café"},"replacement":{"text":"coffee"},"start":6,"end":11},
                {"match":{"text":"café"},"replacement":{"text":"coffee"},"start":27,"end":32}]}}
```

So the same stream that paints the results tree paints the preview: original
span struck through in `--git-deleted`, replacement inserted after it in
`--git-added`, exactly VS Code's treatment. No second engine, no second pass,
no diffing. That is the whole argument for "in".

### 5.2 The apply primitive

```ts
'search:replace': { req: [input: {
    repoPath: string;
    /** Everything needed to re-derive the edits; the SAME input the preview ran. */
    search: ContentSearchInput;
    /** Empty = every match in scope. Otherwise the exact edits the user picked. */
    scope: { relPath: string; lines: number[] }[] | 'all';
  }];
  res: { token: string; filesChanged: number; matchesReplaced: number; skipped: { relPath: string; reason: string }[] } };
'search:undoReplace': { req: [token: string]; res: { restored: number; refused: string[] } };
```

Per file:

1. `stat` it. If `mtimeMs`/`size` differ from what the search saw, **skip it** and
   report `"changed on disk since the search"`. Agents are writing files in this
   app; this check is not optional.
2. If an editor tab for that path is **dirty**, skip it and report
   `"unsaved changes in the editor"`. (A later refinement can apply into the
   Monaco model instead; v1 refuses, which is always safe.)
3. Read the file as a `Buffer`. Compute absolute byte ranges as
   `line.byteOffset + submatch.start … line.byteOffset + submatch.end`, using
   `absolute_offset` from the rg stream. Apply **from the last range to the
   first**, so earlier offsets stay valid.
4. Keep the pre-image `Buffer`.
5. Write via temp-file-plus-`rename` in the same directory, preserving mode.

Refuse the whole operation, with a count in the message, when: the query is
empty; the search was capped (you would silently replace only the first 20,000);
or any path escapes `repoPath`.

**Confirmation.** Always, through the existing three-answer `ConfirmDialog`
(`useApp.setConfirm`, which already supports Confirm / Alt / Cancel):
*"Replace 412 occurrences across 37 files?"* with **Replace All** / **Preview
Changes** / Cancel. There is no undo stack in a file system; a modal is cheap.

### 5.3 Undo that is honest about its limits

- Pre-images live in a `Map<string, Buffer>` under one `token`, capped at 64 MB
  total; past the cap they spill to `app.getPath('userData')/replace-undo/<token>/`.
- Exactly **one** token is retained (the last replace). A second replace discards
  the first token's pre-images and says so in the toast.
- The affordance: a **sticky** toast — "Replaced 412 occurrences in 37 files"
  with an **Undo** action — plus **Find ▸ Undo Replace in Files** in the native
  menu, enabled only while a token exists.
- Undo restores a file only if its current `mtimeMs`/`size` match what the
  replace wrote. Anything touched since is **refused by name**, not clobbered.
- The token is dropped on quit. Say so in the toast's tooltip.
- The real safety net is one panel to the left: the Source Control view lights up
  with every changed file, and `git checkout --` is already a right-click away.
  Mention it in the confirm dialog body — "Changes will appear in Source
  Control" — rather than pretending the in-app undo is a transaction log.

### 5.4 What is explicitly out of v1

- **Live tree mutation after apply.** Keeping 10,000 rows consistent while files
  change underneath is where this feature gets expensive and wrong. After any
  apply, re-run the search and repaint. It costs 40 ms.
- **Preserve-case** (`preserve-case` codicon exists; the transform does not).
  Ship the toggle disabled with a "not yet" tooltip, or omit it. Do not fake it.
- **Regex capture groups in the replacement** beyond what ripgrep's `-r` already
  does (`$1`, `${name}`) — that is free, so it is in; anything beyond it is not.
- **Multi-project replace.** Active project only.

---

## 6. Build order and acceptance

Suggested sequence, each step independently shippable:

1. **Bus + reveal.** `OpenFileSelection`, `pendingSelection`, the `MonacoHost`
   reveal/flash, the focus gate. Provable with a unit test and one manual jump.
2. **Search view shell** — activity-bar item, `SidebarViewId`, header band,
   query block, toggles, empty state. No engine yet.
3. **Content search** — `search:start` / `searchResultsChannel` / cancel, the
   `toUtf16` converter, batching, caps; virtualized results tree; open
   semantics; F4/⇧F4.
4. **Quick open** — palette chrome, file scorer, `:line`, recents.
5. **Symbols** — worker pool, queries, columnar store, SQLite persistence,
   watcher invalidation, `@`/`#` palette modes, ⌘⇧O; ripgrep fallback while
   indexing.
6. **Replace** — disclosure, preview from `-r`, confirm, apply, one-shot undo.
7. **Explorer type-to-filter** — wire `@pierre/trees`' `openSearch()`; ~20 lines.

Acceptance checks, phrased so the operator can run them:

- ⌘P on `/Users/gdc/gmux`, type `openfil` — `state/open-file.ts` is the top hit
  in under 100 ms; ↩ opens it; the tab is pinned; the Explorer reveals it.
- ⌘⇧F, type `MAX_TABS` — results paint in one frame; the count reads
  "N results in M files"; ↩ opens `store.ts` in an italic preview tab scrolled to
  line 118 with the match flashed; focus is still in the results list; ↓ then ↩
  reuses the same preview tab.
- ⌘⇧F, type `e` then keep typing to `editor` — no frozen frame at any point, and
  no results from an abandoned query ever appear.
- ⌘⇧F with a regex containing a non-ASCII literal (`caf.`) against a UTF-8 file —
  the highlight lands exactly on the match, not one character to the left.
- ⌘⇧O in `store.ts` — `useEditor`, `EditorMode`, `MAX_TABS`, `MARKDOWN_MODES`
  and `openFromRequest` are all present with correct kinds. (These are precisely
  the symbols the upstream queries miss; they are the regression test.)
- ⌘⇧O with `#` on `/Users/gdc/getspecstory` — Go methods appear as
  `StatisticsCollector.AddSessionStats`, struct fields appear, and function-local
  `var`s do **not**.
- Type in the Search box while an agent session is writing files — results do not
  jump; the stale chip appears; clicking Refresh re-runs.
- Replace `MAX_TABS` → `TAB_LIMIT` in gmux: preview shows strike-through plus
  insertion; confirm reports the counts; Source Control shows the changed files;
  Undo restores them; a second Undo is unavailable.
- Package the app (`npm run package`) and repeat two of the above **in the
  packaged build** — this is where a missing `asarUnpack` entry for `rg` or a
  missing `extraResources` entry for the `.wasm` grammars will surface, and
  `out/` will not catch it.

Unit tests worth writing: `toUtf16` against a table of UTF-8 fixtures; the
kind-precedence dedupe; the glob translation for include/exclude; the
"most-specific-kind wins" rule; `tabIdFor` unchanged with a selection present;
the replace splice applied back-to-front.

---

## 7. Reconciliation with dimensions 1 and 2

The three documents were researched independently and agree on the engine. Five
places where they touch, and who wins:

| Overlap | Decision |
|---|---|
| Content engine | `@vscode/ripgrep@1.18.0` / ripgrep 15.0.0. All three agree; **D1 owns the flags.** |
| Result cap | **20,000 submatches (D1)**, not the 10,000 this document first assumed. D1 measured that the cap is the primary performance mechanism, not a safety valve: 2,496 ms → 72 ms, peak RSS 164 MB → 19 MB. §4.3 and §4.9 updated. |
| Cancellation | **`SIGKILL` plus a query epoch (D1)**, not `SIGTERM`. D1 measured `SIGTERM` letting ~8 KB of buffered pipe data land after the kill; `SIGKILL` lets none, in 2.5 ms, and ripgrep holds no locks. |
| Long lines | D1's finding that **`--max-columns` is silently ignored by the `--json` printer** (a 6.95 MB single line in these repos) promotes §4.2's line-windowing rule from cosmetic to mandatory, and moves the clamp into main, before IPC. |
| Where parsing runs | D1 shows the capped stream costs ≤5.7 ms of main-thread lag and drops zero frames, so content search parses **in main with no worker and no `utilityProcess`**. That is compatible with — and separate from — the `worker_threads` pool this document specifies for the **symbol** index (§2.8), which is a different workload: seconds of CPU, not milliseconds. |
| Fuzzy ranking | **D2's two-stage `fuzzysort` → `fzf` gate-and-rerank** serves both ⌘P paths and ⌘⇧O symbol names. The only requirement this document adds is that it return matched character indices for highlighting. |

One thing none of the three had to decide separately, so it is recorded here:
`.gitignore` handling is done once, by ripgrep, for all three features — file
enumeration (D2), content search (D1) and the symbol index's file list (§2.8 uses
`rg --files` for exactly this reason). There must not be a second ignore
implementation anywhere in `src/main/search/**`.

---

## 8. Summary of recommendations

| Question | Answer |
|---|---|
| Symbol engine | `web-tree-sitter@0.26.12` + `@vscode/tree-sitter-wasm@0.3.1` (six grammars, ~5.2 MB) + five gmux-owned tags queries, in a 6-worker pool in main, lazily indexed and persisted to the existing SQLite database. |
| universal-ctags | No. GPL-2.0, absent from macOS, must be bundled and signed. |
| ast-grep for symbols | No. Native `.so` per language, `@experimental` loader, macOS library-validation cost. |
| LSP | Out of scope, deliberately. The `SymbolHit` shape leaves the door open. |
| Structural search | Defer. Comby is rejected outright (no binding, no release since 2022). Give ast-grep a detected-binary escape hatch that opens `sg` in a gmux session — 30 lines, zero bundle. |
| Search UX | VS Code's model, fitted: new `search` sidebar view, ⌘P / ⌘⇧F / ⌘⇧O / ⌘⇧H / F4, streaming batched results with hard caps, virtualized grouped tree, `⚠ files changed` instead of auto-rerun. |
| Opening results | Through the one existing open-file bus, extended once with `OpenFileSelection`; preview on click/↩ with focus retained, pinned on double-click/⌘↩. |
| Caps and cancellation | Deferred to D1: 20,000-result cap, `SIGKILL` plus a query epoch, and a main-side clamp on line length because `--max-columns` does not work under `--json`. |
| Replace-in-files | In, scoped. The preview is free from `rg --json -r`; apply is a back-to-front byte splice with an mtime guard; one-shot undo plus the Source Control safety net. |

---

## Appendix — the harness

`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/p14/`

| File | What it measures |
|---|---|
| `probe.mjs` | grammar load + query compile against `@vscode/tree-sitter-wasm` |
| `bench-symbols.mjs <repo> --query stock\|gmux` | cold single-thread index: time, symbols, kinds, index size |
| `bench-pool.mjs <repo> <workers>` | worker-pool scaling |
| `bench-hybrid.mjs` / `bench-prefilter.mjs` | the rejected no-index designs |
| `bench-fuzzy.mjs` | fuzzy scoring over 20k–1M symbols, columnar table |
| `bench-rgparse.mjs`, `bench-ctx.mjs`, `bench-stages.mjs`, `bench-conv.mjs` | ripgrep stream volume, parse cost, and the 41× offset-conversion fix |
| `probe-lang.mjs` + `samples/` | Python and Rust query validation |
| `tags/` vs `tags-gmux/` | upstream tags.scm versus the queries in §2.7 |
| `etest/` | Electron 43 load checks for web-tree-sitter and `@ast-grep/napi` |

Two environment notes for whoever re-runs it: this sandbox blocks **asynchronous**
child processes from Node (`spawn`, `promisify(execFile)` hang; `execFileSync`
works), which is why the harness is synchronous — it is not a constraint on the
app. And `@vscode/tree-sitter-wasm` bundles its own older `tree-sitter.wasm`
runtime; ignore it and let `Parser.init()` load the runtime from
`web-tree-sitter` itself, or you get `ENOENT: web-tree-sitter.wasm`.
