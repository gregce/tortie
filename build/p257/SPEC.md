# Phase 257 — the fact base. SPEC.

Subject `feat(arch): the fact base`. First body line `Phase 257: the fact base`. Semver minor. Tier 3.
Charter: docs/BACKLOG.md "Phase 257" entry, which is research 118 §10 Phase 1 verbatim plus the
revision round's four additions (wrapper pass as a SETTING; `boundary.path.module-root` kept apart
from the build-and-start boundary rules IN THE SCHEMA; `entrypoint.composition` at 38% and
`store.orm` at 8% fixed or dropped before anything seeds from them; eight categories with
`network` its own). The reference implementation is `build/p256/det/` (rules.mts, textrules.mts,
manifests.mts, parse.mts, run.mts, score.mts, recall.mts, sample.mts, hand-precision.json,
corpus.sh). It is ported, never imported: it was written to measure and it has one process, one
reader and one file of everything; the product version follows the house's module and export
discipline (CLAUDE.md growth guardrails) and the neighbours in `src/main/arch/`.

What this spec settles, in order: §1 the port plan (every rule, its fate, its measured number);
§2 the module shape of `src/main/arch/facts/`; §3 the schema and the migration; §4 the symbols
captures per grammar; §5 the gate `conformance:facts`, rule by rule with its ablation, and the
committed fixtures; §6 ownership for three builders with no overlap and every interface pinned by
name; §7 the app run (the corpus probe) and the verifier's independent methods; §8 refusals and
stated limits. Nothing is drawn in this phase.

Numbers quoted below are research 118 §6.1 and `build/p256/det/measurements/{precision,recall,
corpus-table}.txt`, measured 2026-09-10 over the nine-repository corpus. A rule with no row in the
"WORST RULES" table had every sampled instance judged true or was sampled fewer than three times;
the table below says which.

---------------------------------------------------------------------------------------------------

## 0. Five decisions the builders inherit rather than re-decide

**D1. The parse happens in the shared worker pool, never on main's thread, and never twice for the
same reason.** `src/main/arch/scan.ts` already parses every changed source file in
`sharedSymbolPool()` (`pool.run(batch, { imports: true })`, "no second pool and no second parse").
The fact pass asks the SAME pool for call sites (`{ calls: true, wrappers: <setting> }`) from inside
`readArchTreeFacts`, which already owns the per-file freshness loop and the bytes. That IS a second
parse of the files the import scan parsed in the same run, and it is the stated cost of this phase
(§8), because the alternative couples `scan.ts` to the rule table and puts a second responsibility
into the module whose header refuses one. The parse happens in the workers, so main's event loop is
not held by tree-sitter; the prototype's single-process numbers (§6.1: tortie 5,599 ms without the
wrapper pass, 17,619 ms with) are an upper bound on wall time, not on main-thread time.

**D2. Facts are a function of (bytes, path), and the blob oid is the freshness token, not the whole
identity.** Three rule families read the PATH: the test-path refusal on every surface rule
(`isTestPath`), the path conventions (`entrypoint.path.*`, `boundary.path.module-root`,
`store.path.migration`, the Next/Svelte declaration surfaces), and the manifest rules, which key on
the basename. A row keyed on oid alone would say that `app.get('/x')` in `src/server.ts` and the
same bytes in `test/server.test.ts` have the same facts, and they do not. So `arch_fact` is keyed
on `(oid, rel_path, seq)`: a file whose stamp moved but whose bytes did not (a branch switch, a
`touch`, a fresh clone) is hashed and LINKED without a parse, which is what the oid buys, and a
rename costs one parse, which is rare and cheap. The oid is git's own: sha1 over `blob <len>\0`
plus the bytes, computed in process with `node:crypto`, so no new word joins `ARCH_ARGV_WORDS`
and the mirror (Phase 244, cksum content tokens) needs nothing new from the far side.

**D3. Wrapper-only facts cannot be keyed on the file's own bytes, so they have a table of their own.**
A `+wrap` fact on `src/main/arch/ipc.ts` exists because `src/main/typed-ipc.ts` declares `handle`;
change the declaration and the fact must move although `ipc.ts`'s oid did not. So the wrapper pass
writes `arch_fact_wrap` keyed on `(repo_key, rel_path)` under a DIGEST of the closed wrapper map,
stored on `arch_fact_file.wrap_digest`; when the digest moves, every file in a wrapper grammar is
re-read for its wrapper arm alone. Wrapper DECLARATIONS are a function of one file's bytes and are
cached by oid in `arch_fact_wrapper`, so pass 1 (build the map) parses nothing that did not change.

**D4. No captures, no rules and no fixtures for java, php, c-sharp, kotlin or objc.** The charter
refuses a rule for a grammar the corpus does not exercise; a capture with no rule behind it would be
dead parse cost and a temptation. Those five grammars keep their `QUERY_TEXT` byte for byte, answer
`calls: []` and are counted in `arch_fact_file.lang` so the denominator is honest. The wrapper pass
is narrower still: `WRAPPER_GRAMMARS = ['typescript', 'tsx', 'javascript']`, because §6.3 measured
735 wrapper-only facts on Tortie and 2 across the other eight repositories, and every one of the
three clauses it needs (bare call, import alias, caller-local shadow) was measured on this
repository's own TypeScript.

**D5. The setting is a field with no drawn control in this phase.** `ArchSettings.wrapperPass`,
default false, sanitized as literal `true` and nothing else, NOT sealed (it decides what one existing
worker pool parses, never what runs, the same posture as `enabled`). Phase 258 draws the row when
there is a face on which its effect can be seen. Until then it is a hand-editable key in
`settings.json`, the probe pre-writes it, and this spec says so rather than leaving a person to
find it.

---------------------------------------------------------------------------------------------------

## 1. The port plan — every rule, one row

Fates: **PORT** (as measured, with the grammar list narrowed to exercised grammars where the
prototype named more); **FIX FIRST** (a named fix, pinned on fixture decoys taken from the hand
sample's own false rows, and re-measured by the corpus probe); **DROP** (with the reason and the
re-entry condition). "Grammar / convention" names what the rule needs from §4 or from the path.
"Measured" is the rule's own row in `precision.txt` where it has one, else the category's number
with the sample size, else `fixture-only` (an exercised grammar the corpus happens not to reach).

### 1.1 Call-shaped rules (`rules.mts` → `facts/rules-*.ts`)

| id (product) | category / kind | grammar or convention | measured | fate |
| --- | --- | --- | --- | --- |
| `surface.http.method-call` | surface / http-route | `*` calls; `CLIENT_RECV` denylist; test-path refusal; UPPERCASE verb licenses a bare mount word | no row (all sampled true); recall gotify 40/44, fastapi 23/23 | PORT |
| `surface.http.handlefunc` | surface / http-route | go `HandleFunc`/`Handle` | in surface 75% (91% ex-vendor) | PORT |
| `surface.http.decorator` | surface / http-route | python decorators `@x.get('/p')`; Java/C#/PHP/Kotlin mapping names | fastapi 6/6 | PORT narrowed to `['python']`; the `*Mapping`, `Http*`, `Route`/`Path` branches DROP (D4) |
| `surface.http.django-urls` | surface / http-route | python, basename `urls.py`, `path|re_path|url` | fixture-only | PORT |
| `surface.http.rails-routes` | surface / http-route | ruby, `config/routes.rb` + `config/routes/**`; `simple_symbol` read as a literal | mastodon 450/450 | PORT |
| `surface.ipc.electron` | surface / ipc-channel | ts/tsx/js `ipcMain|ipcRenderer|ipc . handle|on|invoke|send…` | tortie 229/229 (with wrappers) | PORT |
| `surface.ipc.bridge` | surface / ipc-channel | `exposeInMainWorld` | tortie 6/6 surface | PORT |
| `surface.ipc.webcontents` | surface / ipc-channel | `webContents|win|port|worker|self . send|postMessage` | tortie 6/6 surface | PORT |
| `surface.handler.on` | surface / handler | `*` `on|once|addEventListener|subscribe|consume|listen` | **44% (7/16)** | **DROP.** Every emitter event in a codebase answers to `on`, and `sock.on('data')` is not an exposed surface; the true half is transport handlers (`ws.on('message')`) that a name rule cannot tell from the rest. No recall scope depends on it. Re-entry: a rule keyed on a closed TRANSPORT receiver set, measured on a corpus repository that has one, in its own commit. |
| `surface.cli.command` | surface / cli-command | `*` `command|subcommand|add_parser|addCommand|add_command|register|SubCommand` | no row | PORT |
| `surface.cli.arg` | surface / cli-flag | `*` `add_argument|addOption|option|arg|flag|StringVar|BoolVar|IntVar` | **25% (1/4)** | **FIX FIRST.** Fire only when (a) some string argument begins with `-`, OR (b) the receiver is in the closed parser set `parser|subparser|subparsers|argparser|program|cmd|command|cli|app|flag|flags|pflag|opts|options|yargs|commander|Arg`. A bare `x.flag(1)` or `map.option('k')` answers nothing. Decoys from the sample's three false rows. |
| `surface.cli.clap` | surface / cli-command | rust `Command|App|SubCommand :: new("name")` | ripgrep surface 2/6 | **FIX FIRST.** `Command::new` is BOTH clap's and `std::process::Command`'s. The clap rule requires `ctx.text` to match `/\buse\s+clap\b|\bclap::/`; the spawn rule (below) requires `/\bstd::process\b|process::Command/`. A file naming neither answers nothing for either. |
| `surface.cli.click` | surface / cli-command | python decorator `@click.command|group` | fixture-only | PORT |
| `surface.job.schedule` | surface / job | `*` schedule verbs; `every|repeat` only on a named scheduler receiver; `@Scheduled|task|periodic_task|shared_task` | no row | PORT |
| `surface.job.interval` | surface / job | ts/tsx/js `setInterval(fn, ms)` | no row | PORT |
| `boundary.worker` | boundary / worker | `*` `new Worker|SharedWorker|Thread|NSThread|ThreadPoolExecutor|ProcessPoolExecutor`; `threading.Thread`; `multiprocessing.Process` | 15/15 build-and-start | PORT |
| `boundary.spawn-thread` | boundary / thread | `thread|tokio|task|rayon|async_std . spawn` | 15/15 | PORT narrowed to `['rust','go','swift']` |
| `boundary.utilityprocess` | boundary / process | ts/tsx/js `utilityProcess.fork` | 15/15 | PORT |
| `effect.spawn.node` | effect / spawn | ts/tsx/js `spawn|exec|execFile|fork…` bare or on `child_process|cp|childProcess|proc` | effect 65% (68% ex-vendor); tortie 5/6 | PORT |
| `effect.spawn.python` | effect / spawn | python `subprocess.run|Popen|…`, `os.system|popen|execv|spawnv` | fastapi 1/1 | PORT |
| `effect.spawn.other` | effect / spawn | go `exec.Command`; rust `Command::new` (see clap); ruby `system|popen|backtick`; swift `Process.run|launch`, `NSTask` | gotify 4/6, ripgrep 5/6 | PORT narrowed to `['go','rust','ruby','swift']`; the `Runtime.exec`, `ProcessBuilder`, `passthru|shell_exec|proc_open` branches DROP (D4) |
| `effect.net.client` | **network / client** | `*` literal `https?|wss?|grpc://` arg; bare `fetch`; client receivers; `WebSocket`; `net|grpc|tls|amqp|redis . Dial|connect`; `http.ListenAndServe` moves to `network.listen` | **48% (14/29)**; mastodon effect 0/6 (4 `t`) | **FIX FIRST**, and RENAMED: category `network`, kind `client`. The literal-URL branch and the bare-`fetch` branch refuse a test path (`isTestPath`), because `stub_request(:get, "https://…")` in a spec is a fixture and every `t` in the sample is that shape; the client-receiver branch is unchanged, because the hand method counts a test that CALLS `requests.get` as the repository's own code and the recall zero on `requests` (0/5) is a different question the model half answers. `ListenAndServe|Serve` move to `network.listen`. |
| `effect.net.listen` | **network / listen** | `app|server|srv|http|net|httpd|uvicorn|listener . listen|Listen|bind|run|serve|Serve` with an argument | no row | PORT, renamed |
| `effect.fs.write` | effect / fs-write | `*` write verbs on `fs|fsp|promises|os|shutil|pathlib|Path|ioutil|File|std|NSFileManager|FileManager|Files|f` or bare `*Sync` | 87% (13/15) | PORT |
| `store.sql` | store / store-write | `*` anchored `INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE` in a string argument | 80% (8/10) | PORT |
| `store.kv` | store / store-write | `localStorage|sessionStorage|store|cache|redis|kv . setItem|set|del|hset|put|save` | no row | PORT |
| `store.orm` | store / store-write | `*` `save|create|update|…` on a capitalised or db-like receiver | **8% (1/13)** | **DROP** (charter). Every ORM verb has a non-ORM homonym and a name rule has no types. Rails' bang forms (`save!`, `create!`) are the one unambiguous idiom and are NOT added here because nothing measured them; re-entry is a `store.orm.rails-bang` rule with a mastodon-scoped recall count in its own commit. The store category keeps `store.sql`, `store.kv`, `store.path.migration`, `store.sql.file`, `store.rails.schema`, `store.prisma.model`. |
| `test.case.call` | test / test-case | `*` `it|test|describe|context|Describe|Context|It|scenario|given` in a test path | 96% (52/54) | PORT |
| `test.case.attribute` | test / test-case | decorators `test|Test|Fact|Theory|TestMethod|pytest|parametrize|tokio::test` | in test 96% | PORT narrowed to swift `@Test` only. Rust moves to the line rule below (look-back), python `pytest|parametrize` DROPPED because `test.python.def` already counts the function and the decorator made it two facts for one test. One fact per test is the rule. |
| `gate.auth` | gate / auth | `*` callee contains `authenticate|authoriz|requireAuth|login_required|…` | **54% (7/13)** | **FIX FIRST.** The word is matched against `s.last` and against `s.recv` separately, never against the whole callee text; a callee whose receiver is an assertion or mocking chain (`expect|assert|should|mock|stub|spy|sinon|jest|vi|t`) answers nothing; a decorator form (`@login_required`) counts. Decoys from the sample's `t` rows. |
| `gate.flag` | gate / flag | `*` `featureFlag|isEnabled|isFeatureEnabled|flagEnabled|getFlag|variation|checkFlag|toggles?.` | no row | PORT |
| `gate.refusal` | gate / refusal | `*` `new Error|TypeError|…` with a message; `panic|fatal|Fatalf|abort|invariant|raise|throwError`; `errors.New` with a message | **57% (16/28)** | **FIX FIRST.** Refuse a test path outright: a `raise` or `new Error` in a test is a fixture or an assertion, never a refusal the product makes, and the sample's eight `t` rows in `gate` are that. The vendor filter (§2, `vendored.ts`) takes the six `v`. |
| `gate.guard-name` | gate / guard | decorators `guard|Guard|RequiresRole|PreAuthorize|Secured|RolesAllowed|Authorize`; `middleware|use` with an auth-ish string | no row | PORT |
| `entrypoint.composition` | entrypoint / composition-root | `*` name list `createApp|express|Flask|FastAPI|Application|Sinatra|Gin|Default|NewRouter|createServer|BrowserWindow|whenReady|…` | **38% (3/8)**; gotify entrypoint **1/6**, all five `m` | **FIX FIRST** (charter). The open name list becomes the closed PAIR table `COMPOSITION_ROOTS: readonly { recv: RegExp \| ''; last: string; form: CallForm; langs }[]`: js `express()` bare, `createApp` bare, `http|https|net . createServer`, `new BrowserWindow`, `app.whenReady`, `bootstrapApplication` bare, `new Koa`, `Fastify()` bare; python `Flask(` bare or `flask.Flask`, `FastAPI(` bare or `fastapi.FastAPI`, `uvicorn.run`, `Celery(`; go `gin.Default`, `gin.New`, `mux.NewRouter`, `echo.New`, `fiber.New`, `chi.NewRouter`, `http.NewServeMux`; rust `HttpServer::new`, `Router::new`, `App::new` only with `ctx.text` matching `actix|axum`; swift `UIApplicationMain`, `NSApplicationMain`. Bare `Default`, `Application`, `run`, `NewRouter` without a receiver answer nothing. Decoys: `viper.Default()`, `cfg.Default()`, `x.Default()` from gotify's shape. |

### 1.2 Line rules (`textrules.mts` → `facts/line-rules.ts`)

| id | category / kind | grammar | measured | fate |
| --- | --- | --- | --- | --- |
| `entrypoint.go.main` | entrypoint / main | go `^func main()` | entrypoint 49/54 | PORT |
| `entrypoint.rust.main` | entrypoint / main | rust `fn main(` | 6/6 ripgrep | PORT |
| `entrypoint.python.dunder-main` | entrypoint / main | python `if __name__ == '__main__'` | 6/6 | PORT |
| `entrypoint.jvm.main` | entrypoint / main | java, kotlin | unmeasured | DROP (D4) |
| `entrypoint.swift.main` | entrypoint / main | swift `@main` | 6/6 alamofire | PORT |
| `entrypoint.objc.main` | entrypoint / main | objc | 0 judged | DROP (D4) |
| `entrypoint.php.main` | entrypoint / main | php | unmeasured | DROP (D4) |
| `entrypoint.rails.application` (NEW) | entrypoint / composition-root | ruby `^\s*class \w+ < Rails::Application` | fixture-only; mastodon has exactly one | PORT (it is the Rails composition root the pair table cannot express as a call) |
| `test.go.func` | test / test-case | go `^func (Test|Benchmark|Fuzz|Example)X(` | 6/6 | PORT |
| `test.python.def` | test / test-case | python `def test_x(` | 78% (7/9) | PORT (the two misses are helpers named `test_` inside a fixture module; no fix that is not a guess) |
| `test.rust.fn` | test / test-case | rust `fn name(` whose nearest preceding non-blank line, up to two lines back, is `#[test]`, `#[tokio::test]` or `#[cfg(test)]`-adjacent `#[…test…]` | ripgrep 6/6 | PORT with the LOOK-BACK replacing the path test, so a test fn is one fact carrying its own name (was: any zero-arg fn under a `tests` path plus the attribute fact — two per test) |
| `test.jvm.class` | test | java, kotlin | — | DROP (D4) |
| `test.swift.xctest` | test / test-case | swift `class X: XCTestCase` | alamofire 735/761 | PORT |
| `test.swift.func` | test / test-case | swift `func testX(` | 735/761 | PORT |
| `test.ruby.def` | test / test-case | ruby `def test_x` | in test 96% | PORT |
| `test.php.method` | test | php | — | DROP (D4) |
| `gate.env-read` | gate / flag | `*` `process.env.X`, `os.environ[…]`, `std::env::var("X")`, `os.Getenv("X")`, `ENV['X']`, `getenv("X")` | 83% (5/6) | PORT |
| `gate.refusal-guard` | gate / guard | — | "measured as unusable" (prototype's own note) | DROP |

### 1.3 Path rules and declaration surfaces (`textrules.mts pathFacts`, `rules.mts declarationSurfaces` → `facts/path-rules.ts`)

| id | category / kind | convention | measured | fate |
| --- | --- | --- | --- | --- |
| `entrypoint.path.by-name` | entrypoint / by-name | `^(src/)?(main\|index\|app\|server\|cli\|bin\|__main__)\.(ts\|tsx\|js\|mjs\|cjs\|py\|rs\|go\|rb\|swift)$` plus `config.ru` | entrypoint 91% | PORT (extensions narrowed to exercised grammars; `config.ru` added for Rails) |
| `entrypoint.path.cmd-dir` | entrypoint / by-name | `^(cmd\|bin)/` with a source extension | 91% | PORT |
| `boundary.path.module-root` | boundary / **module-root** | basename `lib.rs\|mod.rs\|__init__.py\|index.ts` | 30/30, five of them test packages; 75 of 80 on this repository are barrels | PORT, kept apart in the schema (§3.3) |
| `store.path.migration` | store / migration | `(^\|/)(migrations?\|db/migrate)/` | 88% (7/8) | PORT |
| `surface.http.next-export` | surface / http-route | `(app\|src/app\|pages/api)/…/route.(ts\|tsx\|js\|mjs)` with `export (async )?(function\|const) GET\|POST\|…` | stoa 362/362 | PORT |
| `surface.http.svelte-export` | surface / http-route | `src/routes/…/+server.(ts\|js)` | fixture-only | PORT |

### 1.4 Manifest rules (`manifests.mts` → `facts/manifests.ts`)

| id | category / kind | file | measured | fate |
| --- | --- | --- | --- | --- |
| `entrypoint.pkg.main` | entrypoint / package-main | package.json `main` | entrypoint 91% | PORT |
| `entrypoint.pkg.bin` | entrypoint / bin | package.json `bin` string or object | babel 4/4 | PORT |
| `boundary.pkg.workspaces` | boundary / workspace | package.json `workspaces` | 15/15 | PORT |
| `entrypoint.pkg.script` | entrypoint / script | package.json scripts `test\|test:*\|lint\|build\|start\|dev\|serve` | 91% | PORT |
| `entrypoint.cargo.bin` | entrypoint / bin | Cargo.toml `[[bin]]` | 91% | PORT with a small fix: the subject reads the `name = "…"` on the lines that follow inside the table rather than "(see name below)" |
| `boundary.cargo.lib` | boundary / library | `[lib]` | 15/15 | PORT |
| `boundary.cargo.workspace` | boundary / workspace | `members =` | 15/15 | PORT |
| `entrypoint.cargo.name` | entrypoint / package | `name = "…"` in the first 12 lines | 91% | PORT |
| `entrypoint.go.module` | entrypoint / package | go.mod `module` | 91% | PORT |
| `entrypoint.py.scripts` | entrypoint / bin | pyproject `[project.scripts]` etc. | 91% | PORT |
| `entrypoint.py.script` | entrypoint / bin | `name = "mod:fn"` | 91% | PORT with a fix: only while a section flag says the scan is inside `[project.scripts]`, `[project.gui-scripts]`, `[project.entry-points.*]` or `[tool.poetry.scripts]` — the CI-jobs lesson applied, because `x = "a:b"` under `[tool.something]` is not a console script |
| `entrypoint.ruby.project` | entrypoint / package | Gemfile, *.gemspec, Rakefile | 91% | PORT |
| `entrypoint.procfile` | entrypoint / process | Procfile lines | fixture-only | PORT |
| `entrypoint.docker.cmd` | entrypoint / container | Dockerfile `CMD\|ENTRYPOINT` | 91% | PORT |
| `surface.docker.expose` | surface / port | `EXPOSE` | in surface | PORT |
| `boundary.compose.service` | boundary / service | compose files, two-space keys inside `services:` | 15/15 | PORT |
| `surface.ci.schedule`, `surface.ci.cron` | surface / job | `.github/workflows/*.yml` | in surface | PORT |
| `entrypoint.ci.job` | entrypoint / ci-job | two-space keys inside `jobs:` only | 91% (the `on:` fix is already in) | PORT |
| `entrypoint.swiftpm.target` | entrypoint / bin (executable) and **`boundary.swiftpm.target`** boundary / library (target, library) | Package.swift | alamofire 3/3 boundary | PORT, the id split so a library target does not carry an `entrypoint.*` rule id |
| `test.swiftpm.target` | test / test-target | `.testTarget(` | alamofire 6/6 | PORT |
| `entrypoint.android.*`, `entrypoint.jvm.mainclass`, `entrypoint.dotnet.exe` | — | AndroidManifest, gradle/pom, csproj | unmeasured | DROP (D4) |
| `surface.crontab` | surface / job | crontab | fixture-only | PORT |
| `store.sql.file` | store / store-def | `*.sql`, migration dirs | mastodon 116/116 (via schema) | PORT |
| `store.rails.schema` | store / store-def | `schema.rb create_table` | 116/116 | PORT |
| `store.prisma.model` | store / store-def | `*.prisma model X {` | in store | PORT |

### 1.5 What the prototype did that is NOT ported

- `decl.symbol` (run.mts, the ninth category the researcher tried): NOT a fact category. Declarations
  already live in the symbols store and, by kind count, in `arch_import_file` (Phase 201). Phase 259's
  citation grading joins the symbols store for a declaration; the fact base never duplicates it.
- The `--limit`, `--no-decls` and `P256_WRAPPER_HOPS` knobs: none. `maxHops` is the constant
  `WRAPPER_MAX_HOPS = 3` in `facts/wrappers.ts`, the number the 229/229 was measured with.
- `git ls-files --cached --others --exclude-standard`: the product's tracked list is the coordinator's
  own `lsFilesCall()` (`git ls-files -z`, tracked only), handed in as `trackedFiles`. So the product
  never reads an untracked file, and the corpus probe's counts differ from §6.1 by the untracked
  non-ignored files the prototype counted; the probe prints both denominators.

---------------------------------------------------------------------------------------------------

## 2. The module shape — `src/main/arch/facts/`

One responsibility per file, a small deliberate export surface, and the whole directory is PURE in
the sense `conformance:reading` rule 9 uses: it names no `node:fs`, no `node:child_process`, no
`electron`, no `worker_threads`, no `runGit`, no `ArchGitCall`, no `../db`. Its only Node import is
`node:crypto` in `oid.ts`. Everything that reads a byte or writes a row is in `tree-facts.ts` (B)
and `db.ts` (C). `assert-import-boundaries.mjs` gains a door: `main/arch/facts/` is imported only
from `main/arch/` and only through `main/arch/facts/index`.

| file | responsibility | exports (the whole surface) |
| --- | --- | --- |
| `index.ts` | the door. Re-exports below and nothing else is imported from outside the directory | `readFacts`, `readWrapFacts`, `closeWrappers`, `wrapperDigest`, `blobOid`, `vendoredReason`, `isManifestPath`, `wrapperPassOn`, `WRAPPER_GRAMMARS`, `WRAPPER_MAX_HOPS`, `FACT_LIMITS`, types `FactReadInput`, `FactRule`, `LineRule` |
| `types.ts` | the rule shapes | `FactRule { id; category; kind; langs: readonly GrammarId[] \| '*'; match(site: ExtractedCall, ctx: RuleContext): string \| null }`, `LineRule { id; category; kind; langs; re: RegExp; subject(m, ctx, lines, index): string \| null }`, `RuleContext { file; lang; base; dir; text }` (`text` is the whole file text, for the two rules that ask whether a crate is named — §1.1 clap) |
| `limits.ts` | every bound in one place | `FACT_LIMITS = { maxSubject: 160, maxEvidence: 200, maxCallee: 160, maxArg: 400, maxArgs: 12, maxLine: 600, maxManifestBytes: 2 MiB, maxCallsPerFile: 20_000 }` (the last is the worker's; re-exported from `symbols/calls.ts` so one number exists) |
| `predicates.ts` | the shared tests | `isTestPath`, `pathish`, `firstPath`, `channelish`, `HTTP_VERBS`, `CLIENT_RECV`, `ASSERTION_RECV` |
| `rules-surface.ts` | §1.1 surface rows | `SURFACE_RULES: readonly FactRule[]` |
| `rules-boundary.ts` | worker, thread, utility process | `BOUNDARY_RULES` |
| `rules-effect.ts` | spawn (three rules) and fs-write | `EFFECT_RULES` |
| `rules-network.ts` | client and listen | `NETWORK_RULES` |
| `rules-store.ts` | sql and kv | `STORE_RULES` |
| `rules-gate.ts` | auth, flag, refusal, guard | `GATE_RULES` |
| `rules-entrypoint.ts` | the composition pair table | `ENTRYPOINT_RULES`, `COMPOSITION_ROOTS` |
| `rules-test.ts` | case call, swift attribute | `TEST_RULES` |
| `rules.ts` | the closed table and the cross-rule dedupe | `CALL_RULES = [...all eight]`, `applyCallRules(sites, ctx, lines): ArchFactDraft[]` keyed on `${category}\|${kind}\|${subject}\|${line}` (the 41-for-23 lesson) |
| `line-rules.ts` | §1.2 | `LINE_RULES`, `applyLineRules(ctx, lines)` |
| `path-rules.ts` | §1.3 | `pathFacts(relPath)`, `declarationSurfaces(relPath, lines)` |
| `manifests.ts` | §1.4 | `isManifestPath(relPath)`, `readManifestFacts(relPath, text)` |
| `vendored.ts` | the vendor filter, two halves | `vendoredReason(relPath, buf): string \| null` — PATH half: a segment in the closed set `vendor, vendors, third_party, third-party, node_modules, .yarn, dist, build/vendor, bower_components, Pods, Carthage/Checkouts, .venv, site-packages` or a basename matching `\.min\.(js\|css)$` or `-min\.js$`; BYTES half: any line ≥ 2,000 bytes, or a first non-blank line beginning `/*!` with a line ≥ 500 bytes anywhere, or a `//# sourceMappingURL=` line with a line ≥ 500 bytes. The reason names the half and the test that fired. |
| `oid.ts` | git's own blob name, in process | `blobOid(buf: Buffer): string` = sha1(`blob ${buf.length}\0` + buf), 40 hex |
| `wrappers.ts` | the one-hop pass over declarations the worker captured | `ANCHORS`, `closeWrappers(candidates, maxHops, own)`, `unwrapSite(site, map)`, `wrapperDigest(map)` (sha256 over the sorted `name\|innerCallee\|paramIndex\|innerIndex\|hops` lines; the empty map's digest is a constant the gate pins), `WRAPPER_GRAMMARS`, `WRAPPER_MAX_HOPS` |
| `wrapper-setting.ts` | the ONE place the setting is read | `wrapperPassOn(arch: ArchSettings): boolean` — `arch.wrapperPass === true`. Pure; the coordinator hands it `getSettings().arch` |
| `read.ts` | the per-file orchestration | `readFacts(input: FactReadInput): ArchFactDraft[]` — path rules; then, when `text` is not null: manifest rules if `isManifestPath`, else when `lang` is not null: `applyCallRules` over `input.calls`, `applyLineRules`, `declarationSurfaces`; deduped on the same key; subjects capped at `maxSubject`, evidence at `maxEvidence`. `readWrapFacts(input, map, own, base)` — `unwrapSite` over `input.calls`, `applyCallRules` over what unwrapped, rule ids suffixed `+wrap`, minus any key already in `base` (so `+wrap` means "only reachable through a wrapper") |
| `__tests__/` | unit tests per module, vitest | — |

`FactReadInput`:
```ts
export interface FactReadInput {
  relPath: string;
  /** The grammar the file parses with, or null for a non-source file. */
  lang: GrammarId | null;
  /** The file's text, or null when it was not read (binary, over cap, vendored, symlink). */
  text: string | null;
  /** Call sites the worker captured for this file. Empty for a non-grammar file. */
  calls: readonly ExtractedCall[];
}
```

Ordering inside `readFacts` is fixed and the output is sorted `(line, rule, subject)` before it is
returned, so `seq` in the store is deterministic and the gate's "composed twice, same bytes" arm holds.

---------------------------------------------------------------------------------------------------

## 3. The schema — migration `010-arch-facts` in `src/main/arch/db.ts`

The current last migration is `009-arch-scan-incomplete`; this one is `010-arch-facts`, appended to
`MIGRATIONS`, `CREATE TABLE IF NOT EXISTS` throughout, nothing dropped, nothing altered. The contract
baseline (`docs/audits/contract-baseline.txt`) inventories the MANIFEST database's migrations and
schema, not `arch.db`'s, so `gate:contract` stays byte identical; the committer confirms that by
running `npm run build` (which runs `contract-inventory.mjs --check`) rather than by asserting it.

### 3.1 Tables

```sql
-- A fact is a function of (bytes, path). D2 says why the path is in the key.
CREATE TABLE IF NOT EXISTS arch_fact (
  oid       TEXT    NOT NULL,   -- git blob object name of the bytes, 40 hex, computed in process
  rel_path  TEXT    NOT NULL,   -- repository relative path the bytes were read at
  seq       INTEGER NOT NULL,   -- position in the file's sorted fact list; deterministic
  category  TEXT    NOT NULL,   -- one of the eight; refused whole by the store otherwise
  kind      TEXT    NOT NULL,   -- one of ARCH_FACT_KINDS[category]; refused whole otherwise
  subject   TEXT    NOT NULL,   -- ≤ 160 chars
  line      INTEGER NOT NULL,   -- 1 based
  rule      TEXT    NOT NULL,   -- the rule id, e.g. surface.ipc.electron
  evidence  TEXT    NOT NULL,   -- the cited line, trimmed, ≤ 200 chars
  PRIMARY KEY (oid, rel_path, seq)
);
CREATE INDEX IF NOT EXISTS idx_arch_fact_category ON arch_fact (oid, rel_path, category);

-- One row per tracked file the fact pass has seen: the link from a repository's file to its facts,
-- plus the freshness stamp, plus the denominators a face will need.
CREATE TABLE IF NOT EXISTS arch_fact_file (
  repo_key    TEXT    NOT NULL,
  rel_path    TEXT    NOT NULL,
  oid         TEXT    NOT NULL,
  mtime_ms    REAL    NOT NULL,
  size        INTEGER NOT NULL,
  lang        TEXT,             -- grammar id, 'manifest', 'path', or NULL for a file no rule reads
  vendored    TEXT,             -- vendoredReason(), or NULL when the file was rule-read
  truncated   INTEGER NOT NULL DEFAULT 0,  -- 1 when the worker hit maxCallsPerFile
  wrap_digest TEXT,             -- the wrapper map digest arch_fact_wrap rows were computed under; NULL = pass off
  PRIMARY KEY (repo_key, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_arch_fact_file_oid ON arch_fact_file (oid, rel_path);

-- Wrapper DECLARATIONS are a function of one file's bytes (D3), cached by oid so pass 1 never
-- re-parses an unchanged file. inner_last is already alias-resolved by the worker.
CREATE TABLE IF NOT EXISTS arch_fact_wrapper (
  oid          TEXT    NOT NULL,
  rel_path     TEXT    NOT NULL,
  seq          INTEGER NOT NULL,
  name         TEXT    NOT NULL,
  inner_callee TEXT    NOT NULL,
  inner_last   TEXT    NOT NULL,
  param_index  INTEGER NOT NULL,
  inner_index  INTEGER NOT NULL,
  hops         INTEGER NOT NULL,  -- 1 when the inner callee is an anchor, else 0 (unresolved candidate)
  line         INTEGER NOT NULL,
  PRIMARY KEY (oid, rel_path, seq)
);

-- Facts that exist ONLY through a wrapper. Keyed on the file, not its bytes (D3); the digest on
-- arch_fact_file says which map they were computed under.
CREATE TABLE IF NOT EXISTS arch_fact_wrap (
  repo_key  TEXT    NOT NULL,
  rel_path  TEXT    NOT NULL,
  seq       INTEGER NOT NULL,
  category  TEXT    NOT NULL,
  kind      TEXT    NOT NULL,
  subject   TEXT    NOT NULL,
  line      INTEGER NOT NULL,
  rule      TEXT    NOT NULL,   -- always ends in '+wrap'
  evidence  TEXT    NOT NULL,
  PRIMARY KEY (repo_key, rel_path, seq)
);
```

The charter names `arch_fact` and `arch_fact_file`; the two wrapper tables exist because D3 is a
fact about identity and not a preference, and the spec says so here so a later round does not fold
`arch_fact_wrap` back into `arch_fact` "for tidiness" and put a repo-dependent row under a
bytes-keyed primary key.

### 3.2 Store methods (`ArchStore`, C owns)

```ts
/** Freshness for every file the fact pass has seen. */
factStamps(repoKey: string): Map<string, { mtimeMs: number; size: number; oid: string; wrapDigest: string | null; lang: string | null }>;
/** Does the store already hold the facts (and wrapper declarations) for these bytes at this path? */
hasFactsFor(oid: string, relPath: string): boolean;
/** Replace the sorted fact list for (oid, relPath), in ONE transaction. A row whose category or kind is outside the closed sets makes the WHOLE call throw with the field named; nothing is written. */
saveFacts(oid: string, relPath: string, facts: readonly ArchFactDraft[]): void;
saveWrapperDecls(oid: string, relPath: string, decls: readonly ExtractedWrapper[]): void;
/** Every cached wrapper declaration for the files listed, keyed by relPath. */
wrapperDecls(files: readonly { oid: string; relPath: string }[]): Map<string, ExtractedWrapper[]>;
/** Link or re-link files to their facts, in ONE transaction. */
linkFactFiles(repoKey: string, rows: readonly { relPath: string; oid: string; mtimeMs: number; size: number; lang: string | null; vendored: string | null; truncated: boolean; wrapDigest: string | null }[]): void;
/** Replace one file's wrapper-only facts. */
saveWrapFacts(repoKey: string, relPath: string, facts: readonly ArchFactDraft[]): void;
/** Forget files the tree no longer tracks (link, wrap facts), then prune every (oid, rel_path) no repository links. */
forgetFactFiles(repoKey: string, relPaths: readonly string[]): void;
pruneUnlinkedFacts(): number;
/** Every fact of a repository, joined through the links and the wrap table, sorted (file, line, rule, subject). */
facts(repoKey: string): ArchFact[];
/** Per category and per rule, plus the denominators: files linked, vendored, truncated, unread. */
factCounts(repoKey: string): ArchFactCounts;
/** The two boundary readers (§3.3). There is deliberately no third. */
boundaryStarts(repoKey: string): ArchFact[];   // kind IN ('worker','thread','process','service','workspace','library')
moduleRoots(repoKey: string): ArchFact[];      // kind = 'module-root'
```

### 3.3 How `boundary.path.module-root` stays a separate thing in the schema

Both are `category = 'boundary'` (the charter's eight categories stand), and the separation is
STRUCTURAL rather than a comment:

1. `kind` is a closed set per category, pinned as `ARCH_FACT_KINDS` in `src/shared/arch.ts` and
   refused whole by `saveFacts`. For `boundary` it is exactly
   `['worker', 'thread', 'process', 'service', 'workspace', 'library', 'module-root']`.
2. `ArchStore` exposes `boundaryStarts()` and `moduleRoots()` and NO reader that returns the union.
   `facts()` returns everything, and it is the general reader Phase 258 groups by category; the
   gate scans `db.ts` for any SQL that names `'boundary'` without a `kind` predicate and fails on one.
3. `src/shared/arch.ts` exports `ARCH_BOUNDARY_START_KINDS` (the six) and
   `ARCH_MODULE_ROOT_KIND = 'module-root'`, so a later phase that draws a process partition names the
   six and cannot spell the union without writing it out.

§7.6's numbers are the reason: 15/15 judged for the six, 30/30 for module roots, and 75 of this
repository's 80 boundary facts are `index.ts` barrels that a union would draw as processes.

### 3.4 Derived types (`src/shared/arch.ts`, C owns; DERIVED types only, no `docs/arch/` key moves)

```ts
export const ARCH_FACT_CATEGORIES = ['entrypoint','boundary','surface','store','effect','network','gate','test'] as const;
export type ArchFactCategory = (typeof ARCH_FACT_CATEGORIES)[number];
export const ARCH_FACT_KINDS: Readonly<Record<ArchFactCategory, readonly string[]>> = {
  entrypoint: ['main','by-name','composition-root','package-main','bin','script','package','process','container','ci-job'],
  boundary:   ['worker','thread','process','service','workspace','library','module-root'],
  surface:    ['http-route','ipc-channel','cli-command','cli-flag','job','port'],
  store:      ['store-write','store-def','migration'],
  effect:     ['spawn','fs-write'],
  network:    ['client','listen'],
  gate:       ['auth','flag','refusal','guard'],
  test:       ['test-case','test-target']
};
export const ARCH_BOUNDARY_START_KINDS = ['worker','thread','process','service','workspace','library'] as const;
export const ARCH_MODULE_ROOT_KIND = 'module-root' as const;
export interface ArchFactDraft { category: ArchFactCategory; kind: string; subject: string; line: number; rule: string; evidence: string; }
export interface ArchFact extends ArchFactDraft { file: string; viaWrapper: boolean; }
export interface ArchFactCounts { byCategory: Record<ArchFactCategory, number>; byRule: Record<string, number>; files: number; vendored: number; truncated: number; unread: number; wrapFacts: number; wrapDigest: string | null; }
export const ARCH_FACT_LIMITS = { maxSubject: 160, maxEvidence: 200 } as const;
```
`ARCH_ROW_KEYS` and everything `conformance:arch` rule 12 pins do not move.

### 3.5 The setting (`src/shared/settings.ts`, `src/main/settings/store.ts`; A owns)

`ArchSettings` gains `wrapperPass: boolean` with the doc comment from D5; `noArchChosen()` returns
`wrapperPass: false`; `sanitizeArchSettings` reads `obj['wrapperPass'] === true` beside `enabled`
and carries it through both early returns the way `enabled` is carried; `dangerStateOf` is untouched
so the seal does not cover it. `arch-seal.test.ts` gains the three cases: absent reads false, `"yes"`
reads false, `true` reads true and moves no seal.

---------------------------------------------------------------------------------------------------

## 4. The symbols captures (`src/main/symbols/queries.ts`, B owns)

Two of the file's own rules govern every addition: `JS_QUERY` is compiled against the plain
JavaScript grammar too, so it names no TypeScript-only node; and every new capture name appears in a
capture table or it is silently dropped. `extract.test.ts`'s "compiles against every grammar" loop is
the gate on node names (a wrong name throws `Bad node name`), and B adds one probe per grammar below
asserting one call, one construction and one decorator (where the grammar has one) come back with
the expected `callee`, `recv`, `last`, `args` and `argc`.

Captures per grammar, node types as measured by the prototype's `_probe-nodes.mts` on 2026-09-10
(`parse.mts` `SHAPES`); B re-measures any name the compile test rejects rather than guessing:

| grammar | call | construction | decorator / attribute / macro | argument list node | string literal nodes |
| --- | --- | --- | --- | --- | --- |
| javascript, typescript, tsx | `(call_expression function: (_) @call.callee arguments: (arguments) @call.args) @call.site` | `(new_expression constructor: (_) @call.callee arguments: (arguments)? @call.args) @call.new` | `(decorator) @call.decorator` | `arguments` | `string`, `template_string` |
| python | `(call function: (_) @call.callee arguments: (argument_list) @call.args) @call.site` | — | `(decorator) @call.decorator` | `argument_list` | `string`, `concatenated_string` |
| go | `(call_expression function: (_) @call.callee arguments: (argument_list) @call.args) @call.site` | `(composite_literal) @call.new` | — | `argument_list` | `interpreted_string_literal`, `raw_string_literal` |
| rust | `(call_expression function: (_) @call.callee arguments: (arguments) @call.args) @call.site` | — | `(attribute_item) @call.attribute`, `(inner_attribute_item) @call.attribute`, `(macro_invocation) @call.macro` | `arguments`, `token_tree` | `string_literal`, `raw_string_literal` |
| ruby | `(call) @call.site` (fields `receiver:`, `method:`, `arguments:`) | — | — | `argument_list` | `string`, **`simple_symbol`** (Rails' `get :activity`; 116 of the 121 missed routes carried a symbol) |
| swift | `(call_expression) @call.site` (callee is the first named child that is not the `call_suffix`; arguments inside `call_suffix > value_arguments`) | — | `(attribute) @call.attribute` | `value_arguments` | `line_string_literal`, `multi_line_string_literal` |
| java, php, c-sharp, kotlin, objc | **none** (D4) | — | — | — | — |

The capture table is `CALL_BY_CAPTURE: Readonly<Record<string, CallForm>>` =
`{ 'call.site': 'call', 'call.new': 'new', 'call.decorator': 'decorator', 'call.attribute': 'attribute', 'call.macro': 'macro' }`,
beside `KIND_BY_CAPTURE` and `IMPORT_BY_CAPTURE`, with the same rule 2 wording.

The node-to-record work is a new module `src/main/symbols/calls.ts` (B): `describeCall(node, grammar, form): ExtractedCall | null`
porting `calleeOf`, `splitCallee`, `readArgs`, `argString`, `unquote` and `findArgList` from `parse.mts`
with the per-grammar string and argument-list node sets as a `Readonly<Record<GrammarId, CallShape>>`
(the five unexercised grammars present with empty sets so the record type is total). Decorators read
whichever the decorator wraps, a call or a bare name, exactly as `describe()` does. Ruby's
`simple_symbol` arrives with its leading colon; the Rails rule strips it, nothing else does.

`extract.ts` gains: `extractAll(relPath, source, options?: { calls?: boolean; wrappers?: boolean })`
returning `{ symbols, imports, calls: ExtractedCall[], wrappers: ExtractedWrapper[], callsTruncated: boolean }`
— the call captures ride the SAME `matches()` stream (a match carrying `@call.site` carries no `@name`
and no `@import.path`, so the three families never contend); `calls` is `[]` unless asked, `wrappers`
is `[]` unless asked and unless the grammar is in `WRAPPER_GRAMMARS`; `maxCallsPerFile = 20_000`
truncates with the flag set. `worker.ts`'s `SymbolWorkerRequest` gains `calls?: boolean; wrappers?: boolean`,
`IndexedFile` gains `calls?`, `wrappers?`, `callsTruncated?`, and `pool.ts`'s `run(files, { imports?, calls?, wrappers? })`
forwards both; ⌘⇧O never asks for either and never pays for them, the same sentence the imports flag
carries today.

The wrapper declaration walk is `src/main/symbols/wrappers.ts` (B): `readWrapperDecls(root, grammar, text): ExtractedWrapper[]`
porting `readWrappers`, `paramNames`, `declName` for the JS family's `decls`
(`function_declaration`, `method_definition`, `function_expression`, `arrow_function`, `variable_declarator`)
and `params` (`formal_parameters`), plus `importAliases(text)` applied to `innerLast` AT EXTRACTION
so the declaration arrives alias-resolved (§6.3's second clause lives here; the gate ablates it here).
`ANCHORS` is exported by `facts/wrappers.ts` and imported by this module as the one table — direction
symbols → arch/facts is a TYPE-AND-CONST import only and B confirms `assert-import-boundaries.mjs`
allows it; if it does not, `ANCHORS` moves to `src/shared/arch.ts` as a derived const and both import
it from there.

```ts
export type CallForm = 'call' | 'new' | 'decorator' | 'attribute' | 'macro';
export interface ExtractedCall { callee: string; last: string; recv: string; args: string[]; argc: number; line: number; form: CallForm; }
export interface ExtractedWrapper { name: string; innerCallee: string; innerLast: string; paramIndex: number; innerIndex: number; hops: number; line: number; }
```

---------------------------------------------------------------------------------------------------

## 5. The gate — `npm run conformance:facts` (`build/conformance-facts.mjs` + `build/facts-conformance-probe.mts`, C owns)

Classified `pure` in `build/verification-checks.mjs`. It spawns the pinned tsx (through
`build/ts-runner.mjs`) and, for rule 11, one plain `node build/conformance-watcher.mjs`. No git, no
Electron, no tmux, no agent, no request; it reads THIS checkout's own `src/` for rule 3 and nothing
under the person's home. The probe loads the SHIPPING modules — `src/main/symbols/extract.ts` with
`runtimeWasmPath()`/`grammarPath` from `src/main/symbols/paths.ts` (in process, the way `ladder.mts`
did) and `src/main/arch/facts/index.ts` — and writes ablated copies of `src/main/arch/facts/` and
`src/main/symbols/` into a temp tree that preserves `src/main/…` shape (so `../../symbols` resolves
inside the copy and `@shared/*` resolves to the real shared through `tsconfig.node.json`), removed
in a `finally`. Budget: about 60–90 s, of which rule 3 is most (the prototype read this repository
in 17.6 s with wrappers, single process).

Every arm below prints what it read; every ablation must turn at least one pin RED and the gate
names the clause, and an ablation whose edit finds nothing to edit FAILS rather than passes
(`conformance-reading`'s `ablatedCopy` shape).

| # | rule | what it asserts | ablation (one clause each; must go red) |
| --- | --- | --- | --- |
| 1 | the per-language table | Over the committed fixtures (§5.1) the shipping reader's facts equal `build/fixtures/facts/expected.json` byte for byte — category, kind, subject, file, line, rule, evidence — and the per-fixture count table (tracked, rule-read, vendored, per category) is printed and pinned. | (covered by every ablation below; a moved byte anywhere is red here) |
| 2 | the precision sample and its judging rule | `build/p256/det/hand-precision.json` and `measurements/precision-sample.json` are pinned by sha256; the `_method` sentence is printed. Every rule marked FIX FIRST in §1 has ≥ 2 DECOYS in the fixtures whose lines are the sample's own false rows (`t`, `m`) for that rule, marked `decoy: true` with the sample id in `expected.json`, and no decoy yields any fact. Every rule marked DROP has no rule id in `CALL_RULES ∪ LINE_RULES` and its sample rows' evidence, planted in the fixtures, yields nothing. | `store.orm` put back (planted rule) → the `Object.create(null)` decoy fires; `surface.handler.on` put back → `sock.on('data')` fires |
| 3 | the recall scope that runs here | The shipping reader over THIS checkout's tracked `src/**` (walked with `node:fs`, no git) with the wrapper pass ON reads every channel in `docs/audits/contract-baseline.txt` `[ipc.invoke.channels]` as `IPC serves <channel>` — **229 of 229 today, and the count is read from the baseline rather than pinned here**, so a channel added with the baseline regenerated is asked for in the same commit — with 0 extras in scope. | (rule 4's three ablations are this rule going red three ways) |
| 4 | the wrapper pass's three clauses | Each ablated alone turns rule 3 red with the measured direction: **bare call** (`if (site.recv !== '') return null;` removed) → extras > 0 (the 41 emitter events); **import alias** (`importAliases` application in `symbols/wrappers.ts` removed) → found < 229 (the 26 behind `handleTyped`); **caller-local shadow** (`own` loop in `closeWrappers` removed) → found < 229 (the 26 behind the second `handle`). Printed as three rows with found/extras. | the three edits ARE the arm |
| 5 | the pass buys nothing where there is nothing | Over the `go`, `python` and `ruby` fixtures and over this checkout's `src/main/symbols/**` (a TypeScript tree with no anchor wrapper): the fact set with the pass ON equals the set with it OFF, `arch_fact_wrap` would hold zero rows, and `wrapperDigest(new Map())` equals the pinned constant. | `readWrapFacts`'s "minus base" filter removed → the `ts-electron` fixture's `+wrap` count doubles (the arm asserts the fixture's pinned `+wrap` count too) |
| 6 | the cross-rule dedupe | The `python` fixture's N `@router.get` routes read N facts; with the dedupe key changed to include the rule id, 2N. | `applyCallRules`'s key gains `${r.id}` → red |
| 7 | the vendor filter on planted bytes | `vendor/lib.js`, `.yarn/releases/x.cjs`, `docs/jquery.min.js` (path half) and `assets/app.js` whose bytes are one 2,400-byte line (bytes half) each carry a live `app.get('/x', h)` and yield NO fact and a `vendored` reason naming the half; the CONTROL, the same source un-minified at `src/app.js`, yields the route. | path half's set emptied → red; the 2,000-byte line test removed → red |
| 8 | purity and the argv claim | Scan: no file under `src/main/arch/facts/` names `node:fs`, `child_process`, `electron`, `worker_threads`, `runGit`, `ArchGitCall`, `argv`, `require(`; `tree-facts.ts` names no `child_process` and no `runGit`; `ARCH_ARGV_WORDS` in `argv-guard.ts` is byte identical to the twelve `conformance:arch` rule 4 pins. Behaviour: a fixture file whose route path is `--upload-pack=/x` and whose IPC channel is `$(touch /tmp/p)` yields facts whose `subject` holds those bytes verbatim and nothing else happens (the scan is the argv proof; there is no argv to record). The scanner is proved on 6 planted texts of which 4 must fail. | a planted `import { spawn } from 'node:child_process'` in a copy of `oid.ts` → red |
| 9 | identity | `readFacts` over the same bytes at the same path, composed twice with `calls` reversed, gives the same bytes; the same bytes at `src/x.ts` and `test/x.test.ts` differ exactly by the test-path refusals (the fixture pins both lists); `blobOid` of a planted buffer equals the value `git hash-object` printed for it on 2026-09-11 (pinned as a hex constant; no git runs). | the sort in `readFacts` removed → reversed-calls bytes move |
| 10 | the closed sets and the boundary split | `ARCH_FACT_CATEGORIES` and `ARCH_FACT_KINDS` pinned byte for byte; a `saveFacts` with kind `barrel` throws naming the field and writes nothing (over a scratch `ArchStore`); `db.ts` holds no SQL naming `'boundary'` without a `kind` predicate (scanner proved on 3 plants); `boundaryStarts()` and `moduleRoots()` over the `ts-electron` fixture's rows are disjoint and their union is every boundary row. | the `kind` predicate removed from `boundaryStarts` → red |
| 11 | no new watcher subscription | `node build/conformance-watcher.mjs` runs and PASSES; `src/main/arch/facts/**` and `tree-facts.ts` name no `subscribe(`. | (the watcher gate's own ablations) |
| 12 | the setting | The shipping `sanitizeArchSettings` reads absent → false, `"yes"` → false, `true` → true; `dangerStateOf` over a settings object with `wrapperPass: true` equals the one with `false` (the seal does not cover it); `wrapperPassOn` is the only reader (scan: `wrapperPass` appears in facts/ only in `wrapper-setting.ts`). | `=== true` → `!== false` in the sanitizer → `"yes"` reads true → red |
| 13 | the network category | The `ts-electron` fixture's `fetch('https://…')` in `src/` lands in `network/client`, not `effect`; the same call in `__tests__/` lands nowhere; `effect` holds spawn and fs-write only. | test-path refusal on the URL branch removed → the spec's `stub_request` decoy fires |
| 14 | the fixed rules, each on its own decoys | composition: `gin.Default()` → one fact, `viper.Default()`/`cfg.Default()`/`x.Default()` → none; cli.arg: `p.add_argument('--x')` → one, `arr.flag(1)` → none; clap vs spawn: the rust fixture's two `Command::new` files land one in `surface/cli-command` and one in `effect/spawn`; gate.auth: `authenticate(req)` → one, `expect(authenticate).toHaveBeenCalled()` → none; gate.refusal: `throw new Error('no key')` in `src/` → one, in `__tests__/` → none; test: `#[test] fn a()` → exactly one fact, `@pytest.mark.parametrize` + `def test_b` → exactly one. | bare `Default` re-added to the pair table → red; the `-` requirement removed → red; the `use clap` requirement removed → the spawn file grows a cli-command → red; the assertion-receiver refusal removed → red; the test-path refusal in gate.refusal removed → red; the rust look-back replaced by the path test → two facts → red |
| 15 | limits | A generated file with 20,001 `f('x')` calls answers `callsTruncated: true` and the reader's result carries it; a manifest over 2 MiB answers no manifest facts; a subject longer than 160 is cut at 160. | `maxCallsPerFile` doubled → not truncated → red |
| 16 | the store round trip | Over a scratch `ArchStore` (a temp path): save, link under two repo keys, forget one, prune → rows kept; forget the other, prune → rows gone; `factStamps` round-trips every column; `facts()` is sorted; `saveWrapFacts` replaces rather than appends. | the prune's link-count condition removed → red |
| 17 | registration | `package.json` names `conformance:facts`; `build/verification-checks.mjs` classifies it `pure`; `HELPER_USER_FLOOR` in `assert-electron-teardown.mjs` was raised for `build/p257/probe-p257-facts.mjs` (read: the probe reaches `withElectron`). | — |

Seventeen rules, about twenty-two ablations. Rule 3's cost is the reason the gate is not in the
per-commit battery for the whole tree; it IS required for any commit under `src/main/arch/facts/`,
`src/main/arch/tree-facts.ts`, `src/main/symbols/{queries,calls,wrappers,extract,worker,pool}.ts`,
the `arch_fact*` half of `src/main/arch/db.ts`, or the fact types in `src/shared/arch.ts`, and the
CLAUDE.md gates paragraph the integrator writes says so.

### 5.1 The committed fixtures — `build/fixtures/facts/`

SMALL, one directory per language family the corpus exercises, ≤ 30 files each, a few KB, hand
written so every planted line is a known true, a known decoy (from the sample's false rows), or a
control. Each is a plain directory of files (no `.git`); the probe walks it with `node:fs` and hands
the list in as `trackedFiles`. `expected.json` holds, per fixture: the full fact list, the counts
table, and the decoy list with sample ids.

| fixture | what it plants |
| --- | --- |
| `ts-electron/` | `src/main/typed-ipc.ts` `handle(ipc, channel, fn)`; `src/main/ipc.ts` `import { handle as handleTyped }` + a second `handle(channel, fn)` + call sites through both (the three clauses); `ipcMain.handle('a:b')` direct; `sock.on('data', …)` (bare-call decoy); `preload.ts` `exposeInMainWorld`; `webContents.send('push:x')`; `child_process.spawn('git', …)`; `fs.writeFileSync`; `new Worker`; `utilityProcess.fork`; `setInterval`; `process.env.GMUX_X`; `throw new Error('no key')` in src and in `__tests__/`; `fetch('https://api.example')` in src and in `__tests__/`; `expect(authenticate).toHaveBeenCalled()`; `Object.create(null)`; `[].every(...)`; a route `app.get('--upload-pack=/x', h)`; a channel `ipcMain.handle('$(touch /tmp/p)', …)`; `index.ts` barrels; `package.json` (main, bin object, workspaces, scripts incl. `test:unit`); `.github/workflows/ci.yml` (`on: push/pull_request` decoys, `jobs:` two, one `cron`); `Dockerfile` (CMD, EXPOSE); `docker-compose.yml` (two services); `vendor/lib.js`, `.yarn/releases/x.cjs`, `docs/jquery.min.js`, `assets/app.js` (2,400-byte line), each with `app.get('/x', h)`; `src/app.js` the control |
| `ts-next/` | `app/api/items/route.ts` GET/POST; `app/api/[id]/route.ts` DELETE; `src/routes/x/+server.ts` GET; `prisma/schema.prisma` two models; `migrations/001_init.sql` CREATE TABLE ×2 |
| `python/` | `backend/app/api/routes/items.py` five `@router.get/post/…`; `main.py` `FastAPI()`, `uvicorn.run`, `if __name__`; `flask_app.py` `Flask(__name__)`; `tests/test_items.py` `def test_x` ×3, `@pytest.mark.parametrize` on one, `requests.get('https://…')`; `src/client.py` `requests.get('https://…')` (true); `subprocess.run(['ls'])`; `os.environ['X']`; `cli.py` `@click.command()`, `p.add_argument('--x')`, `p.add_argument('name')` (no dash, parser receiver → true), `arr.flag(1)` decoy; `site/urls.py` three `path(`; `pyproject.toml` `[project.scripts]` one, `[tool.x] y = "a:b"` decoy; `migrations/0001_initial.py` |
| `go/` | `main.go` `func main`, `gin.Default()`, `viper.Default()`, `cfg.Default()`, `http.ListenAndServe`; `router/router.go` modelled on gotify: `oidcGroup.GET("/x", h)`, `g.GET("version", h)`, `g.POST("", h)`, `http.HandleFunc("/h", h)`, eleven routes in all, one `client.Get(url)` decoy; `run.go` `exec.Command("git")`, `os.Getenv("X")`, `errors.New("not found")`, `panic("…")`; `router_test.go` `func TestX` ×2, `t.Fatal("…")` (test-path refusal); `go.mod` |
| `rust/` | `src/main.rs` `fn main`, `std::process::Command::new("git")`; `src/cli.rs` `use clap::Command; Command::new("rg")`, `Arg::new("--x")`; `src/lib.rs`; `src/net.rs` `reqwest::get("https://…")`, `thread::spawn`, `tokio::spawn`, `std::env::var("X")`; `tests/a.rs` `#[test] fn one()`, `#[tokio::test] async fn two()`, a plain `fn helper()` (must NOT count); `Cargo.toml` `[[bin]] name = "rg"`, `[lib]`, `[workspace] members` |
| `ruby/` | `config/routes.rb` `get :activity`, `post "/x"`, `resources :users`, `root "home#index"`, `match "/m"`, one `get` inside a `namespace` block; `config/application.rb` `class Application < Rails::Application`; `config.ru`; `db/schema.rb` `create_table` ×3; `db/migrate/20260911_x.rb`; `spec/x_spec.rb` `describe/it` ×3, `stub_request(:get, "https://…")`; `test/x_test.rb` `def test_a`; `lib/run.rb` `system("ls")`, `ENV['X']`, `raise "no"`; `app/models/u.rb` `Model.create!(…)` (nothing; orm dropped); `Gemfile` |
| `swift/` | `Package.swift` executableTarget, target, testTarget; `Sources/App/main.swift` `@main`; `Sources/Kit/Net.swift` `URLSession.shared.dataTask(with: url)`, `Process()`, `Thread {}`; `Tests/KitTests/KitTests.swift` `class KitTests: XCTestCase`, `func testA()`, `func testB()`, `@Test func c()` |
| `manifests/` | `Procfile` (web, worker), `crontab` (two lines), `compose.yaml` (services + a top-level `volumes:` decoy), `Dockerfile.dev`, `setup.cfg` console_scripts, `Rakefile`, a `package.json` with a string `bin` |

Decoy lines are the sample's own evidence lines re-typed (with the sample id in `expected.json`) so
rule 2 is a measurement of the fixes against the rows that were judged false, not an invented
decoy set.

---------------------------------------------------------------------------------------------------

## 6. Ownership — three builders, no overlap, and the interfaces pinned by name

### Builder A — the rule table, the manifest rules, the wrapper pass, the setting
Owns, exclusively:
- `src/main/arch/facts/**` (every file in §2, including `__tests__/`).
- `src/shared/settings.ts` (the `wrapperPass` field and its comment), `src/main/settings/store.ts`
  (`noArchChosen`, `sanitizeArchSettings`), `src/main/settings/__tests__/arch-seal.test.ts` (cases added).
Reads but never edits: `src/main/symbols/extract.ts` (types), `src/main/symbols/languages.ts`,
`src/shared/arch.ts` (C's types; A codes against the names in §3.4 from day one, importing them as
if present; the integrator reconciles if C's file lands later).
Proof A runs: `npm test -- src/main/arch/facts src/main/settings`, `npm run typecheck`.

### Builder B — the captures, the extractor, the worker message, the second pass
Owns, exclusively:
- `src/main/symbols/queries.ts`, `src/main/symbols/calls.ts` (new), `src/main/symbols/wrappers.ts` (new),
  `src/main/symbols/extract.ts`, `src/main/symbols/worker.ts`, `src/main/symbols/pool.ts`,
  `src/main/symbols/__tests__/extract.test.ts` (grammar probes added), `src/main/symbols/__tests__/calls.test.ts` (new).
- `src/main/arch/tree-facts.ts` (the second pass), `src/main/arch/__tests__/tree-facts.test.ts`,
  `src/main/arch/check-coordinator.ts` (ONLY the two `readArchTreeFacts({...})` call sites gain
  `wrapperPass: wrapperPassOn(getSettings().arch)`; `getSettings` from `../settings/store` — B checks
  the coordinator already imports settings for the enrich gate and follows that import).
Proof B runs: `npm test -- src/main/symbols src/main/arch/__tests__/tree-facts`, `npm run typecheck`,
`npm run conformance:reading` (tree-facts is on its scan list), `npm run conformance:arch`.

### Builder C — the migration, the shared types, the gate, the fixtures, the probe
Owns, exclusively:
- `src/main/arch/db.ts` (migration `010-arch-facts`, the §3.2 methods, the row types),
  `src/main/arch/__tests__/arch-store.test.ts` (cases added).
- `src/shared/arch.ts` (§3.4 additions only; nothing existing moves).
- `build/conformance-facts.mjs`, `build/facts-conformance-probe.mts`, `build/fixtures/facts/**`,
  `build/verification-checks.mjs` (one `pure('conformance:facts')` line), `package.json` (the
  `conformance:facts` and `probe:p257` script lines only), `build/assert-import-boundaries.mjs`
  (the `main/arch/facts/` door entry), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 124 → 125).
- `build/p257/probe-p257-facts.mjs`, `build/p257/facts-corpus.mts`, `build/p257/facts-recall.mts`,
  `build/p257/facts-score.mts`, `build/p257/corpus.sh` (§7).
Proof C runs: `npm test -- src/main/arch/__tests__/arch-store`, `npm run conformance:facts`
(against A's and B's trees once integrated; before that, against the probe's `--self-test`, which
proves every scanner and grader on planted texts and launches nothing).

### The interfaces, written down so a name cannot drift

| between | name | declared in | shape |
| --- | --- | --- | --- |
| B → A | `ExtractedCall`, `CallForm`, `ExtractedWrapper` | `src/main/symbols/extract.ts` | §4, verbatim |
| B → A | `extractAll(relPath, source, { calls, wrappers })` result | `src/main/symbols/extract.ts` | `{ symbols; imports; calls; wrappers; callsTruncated }` |
| B → B (pool) | `SymbolPool.run(files, { imports?, calls?, wrappers? })`, `IndexedFile.calls? / wrappers? / callsTruncated?` | `pool.ts`, `worker.ts` | §4 |
| A → B | `readFacts`, `readWrapFacts`, `closeWrappers`, `wrapperDigest`, `blobOid`, `vendoredReason`, `isManifestPath`, `wrapperPassOn`, `WRAPPER_GRAMMARS`, `WRAPPER_MAX_HOPS`, `FactReadInput` | `src/main/arch/facts/index.ts` | §2 |
| A ↔ B (const) | `ANCHORS: Readonly<Record<string, number>>` | `src/main/arch/facts/wrappers.ts` (fallback `src/shared/arch.ts`, §4) | the prototype's 24 entries |
| C → A, B | `ARCH_FACT_CATEGORIES`, `ArchFactCategory`, `ARCH_FACT_KINDS`, `ARCH_BOUNDARY_START_KINDS`, `ARCH_MODULE_ROOT_KIND`, `ArchFactDraft`, `ArchFact`, `ArchFactCounts`, `ARCH_FACT_LIMITS` | `src/shared/arch.ts` | §3.4, verbatim |
| C → B | the §3.2 `ArchStore` methods | `src/main/arch/db.ts` | §3.2, verbatim signatures |
| A → A | `ArchSettings.wrapperPass: boolean` | `src/shared/settings.ts` | §3.5 |
| B → coordinator | `ArchTreeFactsInput.wrapperPass: boolean` (required), `ArchTreeFactsResult.facts: { read: number; reused: number; wrapFacts: number; wrapDigest: string \| null; overBudget: string \| null }` | `src/main/arch/tree-facts.ts` | below |

### The second pass in `readArchTreeFacts` (B), stated so A and C build to it

For every tracked file, in the existing loop: `lstat`, stamp check against `store.factStamps` AS WELL
AS `treeStamps` (a file fresh for lines but stale for facts, which is every file on the first run
after this migration, goes to the facts side only). For a stale-for-facts file with the buffer in
hand: `oid = blobOid(buf)`; `vendored = vendoredReason(relPath, buf)`; if `vendored !== null` → link
with `lang = null`, no facts; else if `store.hasFactsFor(oid, relPath)` → link (parse nothing); else
if `grammarFor(relPath) === null` → `readFacts({ relPath, lang: null, text: isManifestPath ? text : null, calls: [] })`,
save, link with `lang = 'manifest' | 'path'`; else queue `{ relPath, absPath, text }` for the pool.
Queued files go to `sharedSymbolPool().run(batch, { calls: true, wrappers: wrapperPass })` in
`BATCH_SIZE` batches under the `signal`, at most `ARCH_SCAN_FILE_CEILING` per run with the same
sentence shape `scan.ts` uses in `overBudget`; per answered file: `readFacts({…, calls: file.calls })`,
`store.saveFacts`, `store.saveWrapperDecls` (when the pass is on), link with `truncated`.
When `wrapperPass` is on and the grammar is in `WRAPPER_GRAMMARS`: after the batches, gather
declarations for EVERY wrapper-grammar tracked file (`store.wrapperDecls` over the linked oids, plus
this run's fresh ones), `closeWrappers(all, WRAPPER_MAX_HOPS)`, `digest = wrapperDigest(map)`; for
each file just parsed, `readWrapFacts(input, closeWrappers(all, WRAPPER_MAX_HOPS, own), own, base)`
→ `saveWrapFacts`; for each file NOT parsed this run whose stored `wrap_digest !== digest`, re-ask
the pool `{ calls: true }` in batches and do the same; write `wrap_digest = digest` on every
wrapper-grammar link. When the pass is off: `wrap_digest = null` and every `arch_fact_wrap` row of the
repository is deleted once (a setting turned off leaves no stale `+wrap` rows). At the end:
`store.forgetFactFiles(repoKey, gone)` with the same `gone` list the tree rows use, then
`store.pruneUnlinkedFacts()`. The result's `facts` block carries the counts.

The remote arm changes nothing: `repoPath` is the mirror and the workers read `join(repoPath, rel)`
exactly as `scan.ts` does today, so the fact pass runs LOCALLY over mirrored bytes and the far side's
two fixed scripts are untouched (research 118 §7.7).

### The integrator
Reconciles `src/shared/*` (append-only during the build), runs the full battery — `npm run typecheck && npm run build && npm test && npm run smoke:t1 && npm run smoke:t3 && npm run conformance:facts && npm run conformance:arch && npm run conformance:reading && npm run conformance:watcher && npm run conformance:arch:modules && npm run gate:checks && npm run gate:electron && npm run gate:background` — scans for duplicated 10+ line blocks (the prototype's `unquote` exists in `extract.ts` already; B's `calls.ts` reuses it or the two are merged), writes the CLAUDE.md gates paragraph ("Touching the fact base?"), appends the BACKLOG running-log line, and does NOT bump the version or tag.

---------------------------------------------------------------------------------------------------

## 7. The app run and the verifier — Tier 3

### 7.1 `npm run probe:p257` — `build/p257/probe-p257-facts.mjs` (C writes; the verifier runs)

`npm run build && node build/harness-socket.mjs --fresh gmux-p257 'node build/probe-p257-facts.mjs'`.
Refuses without `GMUX_TMUX_SOCKET`/`GMUX_HARNESS_DIR`, refuses the checkout it runs from as a project.
Scratch: `<harness>/p257/{home,profile,repos,facts}`; `HOME` set to the scratch home for the Electron.

**The corpus.** `build/p257/corpus.sh <scratch>` — a copy of `build/p256/det/corpus.sh` plus two
`copy_local` lines: this worktree (`git clone --no-hardlinks --local`) as `tortie`, and
`/Users/gdc/stoa` as `stoa`. `/Users/gdc/stoa` is READ ONLY and is only ever a clone source.
**`/Users/gdc/runstory` and `/Users/gdc/specfactory` are never read**; the script refuses by name if
either is passed. Clones are shallow and removed by the script's own trap and by `corpus.sh <scratch> clean`
in the probe's `finally`. After each public clone the probe prints the 8-hex HEAD beside the one
`measurements/corpus-summary.json` recorded and marks the repository `moved` when they differ.

**Arm A — the reference driver, in process, no Electron.** `build/p257/facts-corpus.mts` is
`run.mts`'s shape over the SHIPPING modules (`SymbolExtractor` with `{ calls: true, wrappers }` and
`facts/index.ts`), once with the wrapper pass and once without, over every clone; it prints the
§6.1 table (tracked, parsed, manifests, unparsed, vendored, MB, ms, facts, per category) beside the
research's numbers, and the wrapper table (wrappers resolved, `+wrap` facts, ms with / without).
`facts-recall.mts` is `recall.mts`'s ten scopes over HEAD's facts, published as the same table with
"enumeration still agrees" per row. `facts-score.mts` re-reads the 341 hand judgments: for each row,
by `at` (file:line) when the repository has not moved and by its `evidence` text found in the file
when it has, it asks whether HEAD's reader still emits a fact at that line under a PORTED rule id
(the `+wrap` suffix and the `network.*` rename mapped), and prints: of the 269 rows judged true, N
kept; of the 72 judged false, M removed, split by code (`v`, `t`, `m`, `0`) and by rule. That is the
before/after against the hand sample, and the honest zeroes (ripgrep flags 0/108, requests network
0/5) are printed as zeroes.

**Arm B — ONE Electron, the product's own pass.** Pre-writes `<profile>/settings.json` with
`{"arch":{"enabled":true,"agentId":null,"model":null,"wrapperPass":true}}`; launches through
`withElectron` on the scratch profile, scratch HOME and the run's socket; opens the `tortie` clone
and the `stoa` clone as projects the way `probe-p201-reading.mjs` opens `P201_PROJECT`; triggers the
arch check for each and waits for `arch:checked`; ends the app in `withElectron`'s `finally`. Then
opens `<profile>/gmux/arch.db` READ ONLY with better-sqlite3 and reads: per-category counts per
repository, `wrap_digest` non-null, `arch_fact_wrap` count, the 229 `IPC serves` subjects, the
vendored and truncated denominators — and asserts they EQUAL Arm A's in-process numbers for the same
two clones (the product's pass is the reference driver's; any difference is a finding). It also
records the check's `durationMs` at HEAD and, in a second launch at the PARENT build if the verifier
asks for it (`P257_PARENT=1`, two Electrons one after the other, never at once), the same number
without the second pass, so the cost D1 states is measured on the operator's machine rather than
extrapolated. The operator's `-L gmux` server is counted with `tmux -L gmux list-sessions` before
and after and must be unchanged; Electrons are counted once at the end with the CLAUDE.md `ps` line.

`--self-test` proves the graders (the table diff, the score's evidence-line locator, the DB reader)
on planted fixtures and launches nothing.

### 7.2 The verifier's independent methods (named in the brief, per CLAUDE.md's governing rule)

1. **Attack the rule table with a hostile fixture the builder never saw** — a tree of the shapes a
   name rule gets wrong: `get` on a receiver called `router` that is a Map, an `ipcMain.handle`
   inside a comment and inside a template string, a route path with a newline in it, a `Command::new`
   in a file that mentions both clap and std::process, a `describe(` in a non-test path, a wrapper
   with two hops through an object property (a stated limit), a symlinked source file, a 4 MB file,
   a file with a NUL at byte 9,000. Every answer is judged against §7.1's own claims.
2. **Re-derive the 229 independently**: grep this checkout for `handle(ipc, '` and `handleTyped('`
   and `ipcMain.handle('` by hand, compare with the baseline's list and with `facts()`'s answer.
3. **Run over real data**: Arm A and Arm B of the probe, with the per-repository matrix published.
4. **Measure the parent commit**: the check's duration with and without the second pass (Arm B's
   `P257_PARENT=1`), and `npm run conformance:reading` and `conformance:arch` at both.

---------------------------------------------------------------------------------------------------

## 8. Refusals and stated limits

Refused, from the charter and from this spec: no surface (the pane looks exactly as today; the
Settings page draws no new row); no model call, no agent turn, no token; no new package; no new
watcher subscription; no fact naming a command reaching any argv (there is no argv in the domain);
nothing written into `docs/arch/` and no pinned key moved; no rule, capture or fixture for java, php,
c-sharp, kotlin or objc; no `accepted-live` anywhere; no `decl` category; no `store.orm`; no
`surface.handler.on`; no wrapper pass outside the JS family; no new `GMUX_*` env name, no new IPC
channel, no new localStorage key, no new smoke mode (the contract baseline does not move).

Stated limits, written into the module headers by the builder that owns each:
- **The second parse (D1).** A changed source file is parsed twice per check, once by the import scan
  and once by the fact pass, both in the shared pool. The probe measures it on this repository; the
  prototype's single-process bound is 5.6 s without the wrapper pass and 17.6 s with it (§6.3), and a
  later phase may carry `calls` on the import scan's own message if the number earns it.
- **The wrapper pass is 1.57–3.81× the read** (§6.3) and finds nothing outside conventions like this
  repository's; it is off by default and hand-enabled until Phase 258 draws its control.
- **A digest move re-reads every wrapper-grammar file** for its wrapper arm alone. It moves only when
  a wrapper declaration changes.
- **Precision is what §6.1 measured**, 79% overall and 84% excluding vendored bytes, with the four
  worst rules dropped or fixed; the probe's score is the number that replaces it and it is published,
  not promised. A rule that is precise can still answer the wrong question (requests: 216 network
  facts, 0 of 5 real reaches); that gap is Phase 259's and no rule-table work closes it.
- **Recall zeroes stay zeroes**: ripgrep's 108 flags declared as `impl Flag for X` and requests' five
  network lines are invisible to a universal name rule, and the surface will say `0 found` rather
  than inventing.
- **The mirror ceiling** (Phase 244: 20,000 files, 64 MiB) bounds the fact base on a machine exactly
  as it bounds the import scan; above it the base is partial and the existing sentence applies.
- **The vendor filter's bytes half is a heuristic**: a generated file with short lines and no banner
  is read as first-party. The path half is a closed list.
- **`isTestPath` is a path convention**: a test in a file named without `test`/`spec` is read as
  product code, and a helper under `tests/` named `test_x` is read as a test.
