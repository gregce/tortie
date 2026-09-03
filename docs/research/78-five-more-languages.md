# Research 78: how Java, PHP, C, C++ and C sharp declare where their code lives

Answers the measurement step the Phase 184 entry in `docs/BACKLOG.md` puts first. Ten public
repositories were cloned into a scratch directory and read from bytes on disk. **No toolchain ran.**
No javac, no gradle, no maven, no cmake, no make, no bazel, no dotnet, no msbuild, no composer, no
php, no clang. The only programs used were `git clone`, `curl` for one release asset that is
measured and then refused, and plain node reading files and, in four places, loading a tree-sitter
wasm grammar to parse text already on disk. No Electron ran. Nothing under the operator's home was
read or written. Nothing in his checkout was touched.

Every path and symbol the Phase 184 entry cites was confirmed against this tree at `3d4c081`.
Section 10 says what agreed and what drifted.

## 1. The corpus, and why each repository is in it

| Language | Repository | Declaration style it was chosen for |
| --- | --- | --- |
| Java | `google/gson` | Maven, 8 `pom.xml`, standard `src/main/java` |
| Java | `square/retrofit` | Gradle, 30 build files, one version catalog, a source root computed by Groovy |
| PHP | `guzzle/guzzle` | Composer PSR-4, one prefix, one directory |
| PHP | `laravel/framework` | Composer PSR-4, 40 manifests, a prefix mapping to four directories |
| PHP | `WordPress/WordPress` | No `composer.json` at all |
| C | `redis/redis` | Makefile, include paths as `-I` on a variable |
| C | `libgit2/libgit2` | CMake, include paths held in CMake variables |
| C++ | `fmtlib/fmt` | CMake, include path in a generator expression |
| C++ | `abseil/abseil-cpp` | Bazel plus CMake, repository root include convention |
| C sharp | `serilog/serilog` | Modern SDK style csproj, implicit glob |
| C sharp | `NancyFx/Nancy` | 38 SDK style and 20 older csproj in one tree |
| C sharp | `SignalR/SignalR` | 27 SDK style and 4 older, namespaces spanning assemblies |

## 2. The grammars, read off disk on 2026-09-03

`@vscode/tree-sitter-wasm` 0.3.1 is in `node_modules` and its `wasm/` directory holds sixteen
grammars plus the runtime. The four this phase would use are there and are unused today:

| Grammar file | Bytes | Size |
| --- | --- | --- |
| `tree-sitter-java.wasm` | 414,641 | 405 KiB |
| `tree-sitter-php.wasm` | 1,058,041 | 1.01 MiB |
| `tree-sitter-c-sharp.wasm` | 5,103,332 | 4.87 MiB |
| `tree-sitter-cpp.wasm` | 5,394,393 | 5.14 MiB |
| **Total** | **11,970,407** | **11.42 MiB** |

**There is no `tree-sitter-c.wasm` in that package.** A C grammar is not something the bundle
already carries, which is what makes C the one language in this phase with a byte decision to make,
and section 6.4 makes it with a measurement.

**THE ENTRY'S ZERO IS WRONG AND THIS IS THE FIRST THING A BUILDER MUST KNOW.** The entry says four of
the five languages cost zero new bundle bytes. That is true of the PACKAGE and false of the APP.
`electron-builder.yml` lines 209 to 219 copy the grammars out of that package **by exact filename**,
seven of them, and the vendored three by exact filename at lines 228 to 233. Nothing is copied by
directory. So every grammar this phase turns on adds its bytes to the signed app, and the honest
sentence is: **zero new package, zero new download, zero new sha256 pin, and 11.42 MiB of signed
bundle if all four are admitted.** For comparison the three Phase 180 vendored, read from
`resources/tree-sitter/`, are swift 3,825,025, kotlin 4,052,625 and objc 5,317,155 bytes, being
13,194,805 bytes or 12.58 MiB, which the tree calls 12.6 MB and which is correct.

`src/main/symbols/languages.ts` already says the package carries "cpp (5.1 MB), c-sharp (4.9 MB),
bash, java, php, powershell, css, ini and regex, which is about 12 MB", so the FACT was recorded and
the CONCLUSION drawn from it in the entry was not.

### 2.1 What each grammar's import node looks like, parsed rather than remembered

Each shape below was produced by loading the grammar and printing the tree for a small source file.

- **Java.** `(import_declaration (scoped_identifier) @import.path)`. `import static a.b.C.m;`
  carries a `static` token; `import a.b.*;` carries a sibling `asterisk` node and the captured
  identifier is `a.b` with no star, exactly as the Kotlin query already handles a wildcard. A
  `package_declaration (scoped_identifier)` is available in the same file and section 3.3 explains
  why the arm does not need it.
- **PHP.** `(namespace_use_declaration (namespace_use_clause (qualified_name) @import.path))` for the
  plain and `function`/`const` forms; the group form `use App\{A, B};` is
  `namespace_use_declaration` holding a `namespace_name` and a `namespace_use_group` of clauses, so
  the head has to be joined onto each clause. `require`, `require_once` and `include` are
  `require_expression`, `require_once_expression` and `include_expression`, and the argument is a
  `string`, an `encapsed_string` or, for the `__DIR__ . '/x.php'` shape, a `binary_expression`.
- **C sharp.** `(using_directive (qualified_name) @import.path)`, with `static`, the alias form
  `using Alias = P.Q;` and `global using G.H;` all reaching the same node type.
- **C++.** `(preproc_include path: (string_literal (string_content) @import.path))` and
  `(preproc_include path: (system_lib_string) @import.path)`, which is **byte for byte the first two
  patterns of the shipped `OBJC_QUERY`** at `src/main/symbols/queries.ts:478`. C++20 modules arrive
  as `import_declaration (module_name)` as a bonus.

## 3. Java

### 3.1 What the projects declare

gson is Maven: 8 `pom.xml`, a root `<packaging>pom</packaging>` listing 7 `<module>` names, and
coordinates as `<groupId>` and `<artifactId>` element pairs. retrofit is Gradle: 30 build and
settings files plus `gradle/libs.versions.toml`, and the dependency lines are aliases into the
catalog (`api libs.okhttp.client`) whose rows carry `module = "com.squareup.okhttp3:okhttp"`. The
Phase 180 reader at `src/main/arch/resolver/gradle.ts` already reads both of those shapes; a Maven
reader is new and is two regular expressions over element text.

retrofit also proves the build file is a program. `retrofit/build.gradle` adds source roots with
`sourceSet.java.srcDir("src/main/java$version")` inside a Groovy function called twice. Nothing
reads that without running Gradle, and nothing has to: see 3.3.

### 3.2 The convention holds, at 567 of 567

Every `.java` file was read and its `package` declaration compared with its directory.

| Repository | `.java` files | Declare a package | Directory matches the package | Mismatches |
| --- | --- | --- | --- | --- |
| gson | 264 | 261 | 261 | 0 |
| retrofit | 306 | 306 | 306 | 0 |

Three gson files are in the default package. **Not one file in either repository puts a package
somewhere its directory does not spell**, including retrofit's computed `src/main/java14` and
`src/main/java16` roots, because the match is a SUFFIX match and the computed part is above the
package path. This is the difference between Java and Kotlin that the Kotlin arm's header already
names: Kotlin's convention is a convention, and Java's is what every build in the corpus enforces.

### 3.3 The reuse ruling, and it is not the one the entry assumed

The entry says Java is a query plus reuse of Phase 180's Kotlin apparatus. The query is right. The
reuse needs one deletion, and the deletion is the finding.

Two candidate indexes were run over all 5,625 imports in the two repositories:

- **A truth index**, built by reading every file's real `package` declaration and keying
  `package.Stem` to the path.
- **A path tail index**, the Kotlin arm's own mechanism at `src/main/arch/resolver/kotlin.ts`, being
  every tracked path keyed by every one of its slash suffixes, with the main over test tie break and
  ambiguity answering unresolved.

With the tail index restricted to FILES, the two agree on **5,625 of 5,625**: no disagreement on a
path, nothing the tail found that the truth did not, nothing the truth found that the tail did not.

With the Kotlin arm's **DIRECTORY fallback left in**, the tail index invents 31 answers the truth
does not have, 20 in gson and 11 in retrofit, and they are wrong edges rather than extra ones:
`import scala.concurrent.Future` lands on `retrofit-adapters/scala/src/main/java/retrofit2/adapter/scala`
because the repository has a directory literally named `scala`. That is exactly the two worlds hazard
the Kotlin arm's header describes with `android/app` shadowing `android.app`, and in Java it fires on
a real corpus.

**So the Java arm reuses the Kotlin suffix index with the directory fallback removed, and needs no
new per file fact.** It resolves `import a.b.C`, `import a.b.C.Nested` and `import static a.b.C.m` by
trying `a/b/C.java`, then dropping trailing segments, as a path tail; unique wins, main beats test,
anything else is unresolved.

A wildcard `import a.b.*;` names a PACKAGE, which is a directory, and the file only rule therefore
answers unresolved for it automatically. That is deliberate: answering the directory would drag Java
into the grain hazard of section 8 for a form that appears **0 times in 5,625 imports** in this
corpus. The limit goes on the arm's face.

### 3.4 What resolves

Admission rules for `external` were the Kotlin arm's four, unchanged, plus the JVM platform heads
`java`, `javax`, `jdk`, `sun`, `com.sun`, `org.w3c`, `org.xml`, `org.ietf`.

| Repository | Imports | First party | External | Unresolved |
| --- | --- | --- | --- | --- |
| gson | 2,671 | 1,085 (40.6%) | 1,374 (51.4%) | 212 (7.9%) |
| retrofit | 2,954 | 629 (21.3%) | 1,999 (67.7%) | 326 (11.0%) |

Every unresolved specifier was inspected and each falls into one of three honest buckets.

1. **The Kotlin arm's stated rule 2 and rule 3 limit, which is most of it.** Guava is declared as
   `com.google.guava:guava` and its package is `com.google.common`, so 182 of gson's 212 are that one
   coordinate. Truth is `com.google.truth:truth` with package `com.google.common.truth`, 101 of
   retrofit's 326. RxJava 1 is `io.reactivex:rxjava` with package `rx`, 21 more. These stay grey by
   the arm's own design rather than being guessed, and the limit already sits on the Kotlin arm's
   face where a Java arm inherits it.
2. **A transitive dependency nobody declared.** okio, 17 in retrofit, arrives through okhttp and is
   named in no manifest. Unresolved is the correct answer under the standing rule.
3. **A generated source that is genuinely not on disk.** `com.google.gson.protobuf.generated.*`, 6
   in gson, is protoc output. Nothing found it because nothing is there.

## 4. PHP

### 4.1 What the projects declare

Composer's `autoload.psr-4` names the prefix to directory mapping outright, and it is the most
explicit declaration any language in this phase makes.

- guzzle: `"GuzzleHttp\\": "src/"` and, under `autoload-dev`, `"GuzzleHttp\\Tests\\": "tests/"`.
- laravel: 40 `composer.json` in the tree and 43 PSR-4 rules, including
  `"Illuminate\\Support\\"` mapping to a LIST of four directories and a shorter
  `"Illuminate\\": "src/Illuminate/"` that overlaps every longer one. PSR-4 resolves longest prefix
  first and tries each listed directory in order, **which is the rule
  `resolveAlias` in `src/main/arch/resolver/index.ts` already implements** for tsconfig `paths`,
  including the ordered target list and the honest unresolved when the rule matched and no file
  exists.
- WordPress: no `composer.json` anywhere in the checkout.

### 4.2 What resolves

| Repository | `.php` | `use` statements | First party | External | Unresolved |
| --- | --- | --- | --- | --- | --- |
| guzzle | 137 | 842 | 369 | 469 | 4 (0.5%) |
| laravel | 3,046 | 13,939 | 8,675 | 5,231 | 33 (0.2%) |
| WordPress | 1,900 | 790 | 0 | 60 | 730 (92.4%) |

PSR-4 is also a self check. Of guzzle's 135 namespaced files, 133 resolve through the repository's
own PSR-4 map and **all 133 land on themselves**. Laravel: 2,723 of 2,772 resolve and 2,722 land on
themselves.

### 4.3 The convention fallback is measured and refused

A Kotlin style "namespace path as a unique tail of a tracked path" fallback was run to see whether it
rescues the manifest-less case:

| Repository | `use` total | PSR-4 first party | Unique tail match | Ambiguous tail |
| --- | --- | --- | --- | --- |
| WordPress | 790 | 0 | 84 | 7 |
| laravel | 13,939 | 8,675 | 8,739 | 141 |
| guzzle | 842 | 369 | 21 | 0 |

It adds 84 of WordPress's 790, being 10.6 percent, because WordPress's bundled namespaces
(`WpOrg\Requests\` under `wp-includes/Requests/src/`) need a prefix STRIP that a tail match cannot
do. Where PSR-4 exists it is redundant and brings 141 new ambiguities with it. **The PHP arm reads
PSR-4, PSR-0 and classmap and adds no convention fallback**, and a repository with no Composer
autoload map resolves nothing first party and says so on its face.

### 4.4 `require` and `include`, and the one shape worth reading

WordPress writes 1,966 require or include sites and their argument shapes are:

| Shape | WordPress | laravel | guzzle |
| --- | --- | --- | --- |
| `CONSTANT . 'literal'` | 1,142 | 0 | 0 |
| `__DIR__ . 'literal'` | 147 | 16 | 1 |
| `dirname(...) . 'literal'` | 42 | 0 | 0 |
| a variable | 45 | 26 | 0 |
| everything else | 590 | 69 | 30 |

Two rulings come out of this.

**`__DIR__ . 'literal'` is decidable from bytes and is worth reading.** It names the including file's
own directory, which the arm already knows. Over the three repositories, 163 of WordPress's 166 sites
and 12 of laravel's 16 land on a tracked file; the misses are expressions that continue past the
first literal, and an expression that is not wholly literal must answer unresolved.

**`ABSPATH . 'literal'` must be refused, and the number is why it is tempting.** Treating ABSPATH as
the repository root resolves 495 of WordPress's 658 constant prefixed sites. ABSPATH is defined at
runtime in `wp-load.php` from `dirname(__FILE__)` and nothing declares it as a root. Resolving
through it is inventing an edge, which is what this phase and Phase 180 both refuse. The arm answers
unresolved and the limit goes on its face.

## 5. C and C++

### 5.1 The include path is a program's variable, not a literal

This is the project decides shape and the numbers say how badly.

| Repository | Build system | Include path arguments | Literal | A variable, a generator expression or absolute |
| --- | --- | --- | --- | --- |
| libgit2 | CMake | 69 | 19 | 50 |
| redis | Makefile | 53 | 34 | 19 |
| fmt | CMake | 23 | 14 | 9 |
| abseil | Bazel and CMake | 16 | 0 | 16 |

libgit2 writes `target_include_directories(util PRIVATE ${UTIL_INCLUDES} ...)`; the value is assembled
by CMake code. redis writes
`FINAL_CFLAGS+= -I../deps/hiredis -I../deps/linenoise -I../deps/lua/src ...` on one line of `src/Makefile`,
conditionally, relative to the directory make runs in. abseil declares zero literal include
directories and every one of its 16 is a variable. **A reader that only takes literals gets 19, 34, 14
and 0 of them, and it must never run the build to get the rest.**

### 5.2 The ladder, and what it resolves

The Objective-C arm's own recipe was run over the four repositories, with one addition: a literal
include directory from CMake, a Makefile `-I` or a Bazel `includes`, joined relative to the file that
declared it. Order asked: beside the including file, then from the repository root, then through a
literal declared directory, then a unique path tail, with an ambiguous tail answering unresolved.

| Repository | Quoted includes | Beside | From root | Literal dir | Unique tail | Ambiguous | None |
| --- | --- | --- | --- | --- | --- | --- | --- |
| libgit2 | 4,236 | 1,839 | 0 | 0 | 1,795 | 592 | 10 |
| redis | 1,859 | 944 | 0 | 677 | 33 | 0 | 205 |
| fmt | 169 | 61 | 0 | 20 | 80 | 0 | 8 |
| abseil | 4,748 | 0 | 4,277 | 0 | 0 | 0 | 471 |

Resolved first party: **85.8 percent on libgit2, 89.0 on redis, 95.3 on fmt, 90.1 on abseil.**

Three things this shows.

- **The repository root rule is not optional.** abseil writes `#include "absl/strings/str_cat.h"` and
  resolves 4,277 of 4,748 that way and nothing else at all. That is the Bazel convention and it is
  the whole of abseil's answer.
- **The literal `-I` earns its reader.** redis resolves 677 through `-I../deps/hiredis` and friends,
  which is 36 percent of its quoted includes. One line of one Makefile.
- **The ambiguous tail is real and it must stay grey.** libgit2 has 592 quoted includes, 14 percent,
  whose tail matches more than one tracked file, because it vendors zlib, pcre2, ntlmclient and
  http_parser beside its own headers. Those answer unresolved. Picking one would be the wrong edge.

The 471 abseil misses are `gtest/gtest.h` (271), `gmock/gmock.h` (146) and `benchmark/benchmark.h`
(50), which are genuinely external and are declared in Bazel dependency rules rather than as include
paths; the 205 redis misses are jemalloc's own internal tree, which has its own build.

Angle bracket includes behave as the Objective-C arm already rules. libgit2 550, of which 430 are
outside, 113 are shadowed by a tracked file and answer unresolved, and 7 reach a literal include
directory. abseil 3,949, of which 3,933 are the C++ standard library and 16 are shadowed. The
`external` on form alone is the same ruling, with the same shadow rule in front of it, and the same
cost recorded in `objc.ts`.

### 5.3 Which grammar reads C, measured rather than assumed

For IMPORTS the grammar does not matter at all. The number of `#include` directives extracted by the
query `(preproc_include path: (_) @path)` was compared against a regular expression ground truth:

| Corpus | Files | Includes by regex | objc | cpp | c |
| --- | --- | --- | --- | --- | --- |
| libgit2 `.c` and `.h` | 400 | 1,545 | 1,545 | 1,545 | not run |
| redis `.c` and `.h` | 400 | 1,134 | 1,135 | 1,135 | 1,135 |
| abseil `.cc` and `.h` | 400 | 3,636 | 3,637 | 3,637 | not run |

**Zero files lost an include under any grammar**, including files whose bodies parse badly. A
tree-sitter parse recovers a preprocessor directive whatever the surrounding macro soup does.

For SYMBOLS the grammar does matter, and here is the whole file clean parse rate, counting a file
clean when it holds no `ERROR` and no missing node:

| Corpus | Files | c | objc | cpp |
| --- | --- | --- | --- | --- |
| redis `.c` and `.h` | 300 | 171 | 173 | 163 |
| libgit2 `.c` and `.h` | 300 | 148 | 147 | 131 |
| abseil `.cc` and `.h` | 200 | not run | 11 | 40 |

### 5.4 The C decision

**C needs no new grammar and the separate C grammar is refused.** `tree-sitter/tree-sitter-c` v0.24.2
publishes `tree-sitter-c.wasm` at 645,157 bytes, sha256
`83e8d7902b9d7f8c7c5cd4bd9acb5c7eb5faf42c09f85546b183964d3b5f48f9`. It was downloaded to a scratch
directory and run against the corpus purely to measure it. Against the objc grammar the bundle
already vendors it wins by 1 clean file on libgit2 and loses by 2 on redis, and it extracts exactly
the same includes. **645 KB for minus one file.** `.c` reads with the objc grammar, the way `.h`
already does since Phase 180, and the entry's `.h` limit stands with a number behind it now.

**C++ is where a grammar admission has to be argued**, because objc reads C++ badly: 11 clean files of
200 against cpp's 40 on abseil. The 5.14 MiB buys SYMBOLS in `.cpp`, `.cc` and `.hpp` files and buys
nothing for imports. It is a real cost for a real but partial gain, since even cpp leaves 160 of 200
abseil files carrying an error node; abseil is template heavy and that number will be better in
ordinary C++. **`.h` stays on objc**, because objc reads C headers better than cpp does and is the
only one of the three that reads an Objective-C header at all, and the honest limit is that a C++
template heavy `.h` gives partial symbols.

## 6. C sharp

### 6.1 A namespace is not a directory, and this is the measurement that decides the arm

| Repository | Files with a namespace | Directory matches the namespace tail |
| --- | --- | --- |
| serilog | 208 | 121 (58%) |
| Nancy | 953 | 416 (44%) |
| SignalR | 656 | **2 (0.3%)** |

The Java and Kotlin convention does not exist in C sharp. Any arm built on it would resolve almost
nothing in SignalR and would be wrong about the rest.

### 6.2 A namespace IS a project

| Repository | Distinct namespaces | Inside exactly one csproj | Spanning several |
| --- | --- | --- | --- |
| serilog | 44 | 44 | 0 |
| Nancy | 153 | 149 | 4 |
| SignalR | 97 | 86 | 10 |

This is the Swift target grain case again, arrived at from the other direction: `using` names a
namespace, files in the same namespace see each other with no `using` at all, and the unit the
namespace really belongs to is the assembly, which is one csproj, which is one directory.

### 6.3 What a csproj declares, without MSBuild

- **SDK style**, `<Project Sdk="Microsoft.NET.Sdk">`, compiles every `.cs` under its own directory by
  an implicit glob, minus `bin` and `obj`. serilog 6 of 6, Nancy 38 of 58, SignalR 27 of 31.
- **Older style** lists files as `<Compile Include="Foo.cs" />`. Nancy has 20 such projects with 121
  entries, SignalR 4 with 158. Both are literals a reader takes as written, and the older style is
  the Swift pbxproj case: an explicit membership table.
- `<PackageReference Include="x" />`, `<Reference Include="System.Xml" />` and
  `<ProjectReference Include="..." />` are the declared dependencies, all literals.
- `<RootNamespace>` appears in 20 Nancy and 5 SignalR projects and in 0 serilog ones.

### 6.4 What resolves

A `using` resolves first party when some tracked `.cs` file declares that namespace; the answer is the
DIRECTORY of the csproj those files belong to.

| Repository | `using` | First party, one project | First party, several projects | External | Unresolved |
| --- | --- | --- | --- | --- | --- |
| serilog | 106 | 60 | 0 | 45 | 1 (0.9%) |
| Nancy | 3,129 | 932 | 2 | 2,089 | 106 (3.4%) |
| SignalR | 2,813 | 789 | 196 | 1,828 | 0 |

Two rules had to be added to reach those numbers and both are worth writing down.

- **NuGet ids are case insensitive and namespaces are Pascal case.** `using Xunit;` against a
  `<PackageReference Include="xunit" />` fails a byte compare. It accounted for 210 of Nancy's and 100
  of SignalR's apparent misses. The compare is lower cased.
- **An unqualified `using` resolves against each ENCLOSING namespace.** `using Configuration;` inside
  `namespace Nancy` means `Nancy.Configuration`. 47 of Nancy's first party answers are found only
  this way.

The 196 SignalR usings naming a namespace that several projects declare should answer **unresolved**,
following the Swift arm's ambiguity rule, which puts SignalR at 789 first party, 196 unresolved, 1,828
external and still zero genuine misses.

## 7. The grain each arm can honestly hold

| Language | Grain | Why that grain and no finer |
| --- | --- | --- |
| Java | **FILE** | An import names a type, a type is a file, and the package to directory match held 567 of 567 |
| PHP | **FILE** | PSR-4 names the prefix to directory mapping outright and 133 of 133 guzzle files land on themselves |
| C | **FILE** | An include names a header file and 85.8 to 89.0 percent of quoted ones are found |
| C++ | **FILE** | The same, 90.1 to 95.3 percent |
| C sharp | **PROJECT** | A namespace matches a directory 0.3 percent of the time in SignalR and matches a csproj 86 to 100 percent of the time |

**Every one of the five can answer without inventing an edge, so none is left out.** Each carries a
limit that goes on its face: Java's wildcard import, PHP's missing autoload map and its ABSPATH
shaped requires, C and C++'s ambiguous tail among vendored copies and their include paths held in
build variables, and C sharp's namespace spanning several assemblies.

## 8. The Phase 180 hazard, and exactly which arm inherits it

Phase 180's verifier found a blocking false green: every Swift answer was a target DIRECTORY, and
`buildImportGraph` in `src/main/arch/checkers/imports.ts` looked a `toPath` up in a map keyed only by
tracked FILES, so a must-not crossed by 33 real imports printed convergent with zero offending. The
fix is `ownersOfDirectory` in that same function, which lands a directory answer on every component
owning a tracked file under it.

**Four of this phase's five arms answer with a FILE and never touch that path. Only the C sharp arm
answers with a directory.** So:

- The conformance fixture row for a directory grain answer is owed by **the C sharp arm alone**, and
  it must be a real row in the `conformance:arch` fixture the way Phase 201 pinned the Swift and Go
  ones at `build/conformance-arch.mjs:553` to `:565`.
- The verifier's false green attack must drive a **C sharp** must-not that IS violated, through the
  real checker, end to end, and see it report violated with the offending imports listed. Proving it
  at the resolver edge is not the proof, because the resolver was right in Phase 180 too.
- Nothing else in this phase changes the checker, and the phase should say so.

## 9. What each arm reads, in one line each

- **Java**: `pom.xml` groupId and artifactId elements; Gradle build files and version catalogs
  through the existing `readKotlinManifest` in `src/main/arch/resolver/gradle.ts`. Resolution is the
  Kotlin suffix index with the directory fallback removed.
- **PHP**: every `composer.json` in the tree, `autoload` and `autoload-dev`, `psr-4`, `psr-0` and
  `classmap`, plus `require` and `require-dev` names for the external justification. Resolution is
  longest prefix first over an ordered target list, which is `resolveAlias`'s shape.
- **C and C++**: literal `include_directories` and `target_include_directories` arguments from
  CMakeLists and `.cmake`, literal `-I` from Makefiles, literal `includes` and
  `strip_include_prefix` from BUILD and BUILD.bazel. Resolution is the Objective-C ladder with a
  repository root step and a literal declared directory step added.
- **C sharp**: every `.csproj`, its SDK attribute, its `<Compile Include>` entries when it has them,
  `<PackageReference>`, `<Reference>`, `<ProjectReference>` and `<RootNamespace>`. Resolution is
  namespace to project directory.

None of these values ever reaches an argv, which is the same promise every existing reader makes and
which `conformance:arch` already asserts over every call a whole run composes.

## 10. Drift found against the Phase 184 entry

Everything else the entry cites was confirmed at `3d4c081`.

1. **"four of the five languages cost ZERO new bundle bytes" is wrong.** They cost 11,970,407 bytes,
   11.42 MiB, because `electron-builder.yml` copies grammars by exact filename at lines 212 to 218.
   Zero new package, zero new download, zero new sha256 pin, and the size argument is still different
   from Phase 180's; it is just not zero. Section 2.
2. **"Java is a query plus reuse" is half right.** The reuse must DROP the Kotlin arm's directory
   fallback, or it invents 31 wrong first party edges across the two Java repositories. Section 3.3.
3. **The C decision is settled and it is no.** No separate C grammar; `.c` joins `.h` on the objc
   grammar, measured at plus one clean file on libgit2 and minus two on redis for 645 KB. Section 5.4.
4. **Confirmed as written**: ten grammars ship, seven inside `@vscode/tree-sitter-wasm` being
   typescript, tsx, javascript, go, python, rust and ruby, and three vendored under
   `resources/tree-sitter/` pinned by sha256 in `GRAMMAR-PINS.json` being swift, kotlin and objc at
   13,194,805 bytes. `.h` reads with objc as a C superset,
   `src/main/symbols/languages.ts` `BY_EXTENSION`. The JVM apparatus exists at
   `src/main/arch/resolver/gradle.ts` with the coordinate scrape, and the package to directory index
   with the main over test tie break at `src/main/arch/resolver/kotlin.ts`, `TEST_ROOTS` and
   `pickOne`. The imports checker fix is `ownersOfDirectory` in
   `src/main/arch/checkers/imports.ts`, and its comment records the 33.

## 11. What this document does not do

- It builds nothing. No production file was changed.
- It ran no toolchain and no build system, and it generated no compilation database.
- It measured two repositories per language and no more, and it says so rather than claiming
  universality. The Android case the entry names, a Kotlin app carrying Java files, was NOT measured
  here because the operator's own repositories are read only in this phase and no public Android app
  was cloned; the Java arm's file grain answer does not depend on it.
- The 645 KB C grammar downloaded for section 5.4 lives only in the scratch directory. Nothing was
  added to `resources/tree-sitter/` and nothing was pinned.

## 12. What the fix round measured, 2026-09-03

The verifier found two blocking false greens, one wrong edge and one coverage limit. Everything in
this section was measured against real repositories at the parent commit and again at the fix, with
the harness driving the SHIPPING extractor and the SHIPPING resolver and then the SHIPPING
`checkImports`, so the numbers are the product's own answers rather than a model of them.

### 12.1 PHP, and it is the finding this document was most wrong about

Section 4 said the Composer autoload map is the most explicit declaration any of these languages
makes, and it is. What it did not say is what happens when the map MISSES. A PHP library's own
namespace head is almost always also the vendor half of a package it declares, so falling through
from a missed autoload lookup to the vendor head compare calls the repository's own classes
somebody else's dependency.

| repository | `use` statements | own classes answered `external`, parent | at the fix |
| --- | --- | --- | --- |
| sebastianbergmann/phpunit | 11,638 | 7,418, being 63.7 percent | 0 |
| laravel/framework | 13,439 | 86 | 0 |
| guzzle/guzzle | 820 | 5 | 0 |

phpunit is the extreme case because its whole autoload is `classmap: ["src/"]`, which section 4.6
recorded as unreadable and which this round proves is not merely unreadable but ACTIVELY DANGEROUS:
with no psr rule to match, every one of its names fell to the head compare, and the head `phpunit`
came from the real `phpunit/php-code-coverage`. Through the real checker, a `must-not` from
`tests/_files/Metadata` to `src` that 132 real `use` statements cross reported convergent, checked,
zero offending, with zero unresolved imports out of the source part to withhold it.

Two rules fix it and the second one is the one section 4 could not have predicted. A declared
prefix that matched and found no file is grey. And a manifest declaring `classmap` or `files` has
its OWN `name` halves removed from the vendor heads, because a repository is never its own
dependency and a head it publishes under can no longer tell one world from the other.

The price, measured, and where it is paid:

| repository | first party | external, parent -> fix | unresolved, parent -> fix |
| --- | --- | --- | --- |
| phpunit | 194, unmoved | 8,747 -> 825 | 2,895 -> 10,817 |
| laravel/framework | 8,707, unmoved | 4,639 -> 4,524 | 93 -> 208 |
| guzzle | 369, unmoved | 446 -> 389 | 5 -> 62 |
| monolog | 433, unmoved | 164, unmoved | 30, unmoved |
| WordPress | 158, unmoved | 45, unmoved | 2,031, unmoved |

The reason the guzzle and laravel columns move by so little is a third rule measured here. A name
whose FIRST TWO SEGMENTS spell a declared package in full, both halves, is still external:
`GuzzleHttp\Psr7\Request` is `guzzlehttp/psr7`. Over guzzle and laravel that keeps 302 answers
definite, and an independent scan of every class those two repositories declare in a tracked file
found NOT ONE of the 302 among them. Over phpunit it takes back zero, so the headline fix is
untouched by it. A head alone can never do this, because `phpunit` is the vendor of five declared
packages and also the head of the repository itself.

### 12.2 C sharp, and the boundary section 8 named but did not reach

Section 8 said any arm answering with a DIRECTORY inherits the Phase 180 hazard. It does, and the
hazard has a boundary nobody drove: a `.csproj` at the repository ROOT has the EMPTY STRING for its
directory. `owners.get('')` misses because no tracked path is empty, and the directory fall back
built the prefix `/`, which no repository relative path begins with, so the answer vanished from
both sides of the ledger exactly as a Swift target directory used to. On a three file fixture with a
root project, a must-not a real `using` crosses reported convergent, checked, zero offending. A one
project repository with its csproj at the root is an ordinary C sharp shape.

The answer is grey at both ends. The arm refuses the empty directory, because an edge to the whole
tree is not an edge, and the checker refuses an empty first party path a second time, because a fix
in one arm is a fix that one arm has. Counting it as a crossing into every component would be the
other lie.

Two more things section 6 got wrong about ownership, both about which project owns a file:

- A `<Compile Include>` path whose `..` walked above the repository root was CLAMPED back inside it
  rather than refused, so a project at `a/b/c/deep/` claiming
  `..\..\..\..\..\..\..\src\Real.cs` came back as `src/Real.cs`.
- A file was owned by the FIRST project whose explicit list held it, so the ordinary MSBuild linked
  file pattern `<Compile Include="..\Shared\Foo.cs" Link="Foo.cs" />` handed the namespace to one
  assembly and hid the other.

The second is not hypothetical and it is the only real data proof in this section. SignalR's
`src/Common/AssemblyMetadataAttribute.cs` declares `namespace System.Reflection` and TWO projects
link it with exactly that pattern. At the parent, 29 real `using System.Reflection;` statements
resolved FIRST PARTY to `src/Microsoft.AspNet.SignalR.Client`. Every claimant is returned now, the
namespace spans two directories, and the ambiguity rule answers grey. Nothing else moved:

| repository | first party, parent -> fix | unresolved, parent -> fix |
| --- | --- | --- |
| SignalR | 806 -> 777 | 227 -> 256 |
| Nancy | 893, unmoved | 156, unmoved |
| serilog | 60, unmoved | 3, unmoved |
| AutoMapper | 74, unmoved | 19, unmoved |
| Newtonsoft.Json | 1,060, unmoved | 334, unmoved |

Newtonsoft.Json matters because it is where the project grain pin was shown to bite on real data: a
must-not from `Src/Newtonsoft.Json.Tests` to `Src/Newtonsoft.Json` reports divergent with 605
offending, and that is unchanged.

### 12.3 Java, and the identity the `<dependency>` fence threw away

Section 3.4 recorded the fence that keeps a pom's own `<groupId>` out of the coordinate list. The
fence is right and it is not enough: a real dependency then puts the same value straight back in,
because a Maven project's own group is usually the group of the sibling libraries it depends on.

| repository | imports | first party, parent -> fix | what claimed them |
| --- | --- | --- | --- |
| apache/commons-lang | 4,275 | 0 -> 756 | `org.apache.commons:commons-text` |
| gson | 2,671 | 1,085, unmoved | |
| retrofit | 2,954 | 629, unmoved | |
| junit4 | 3,215 | 2,111, unmoved | |

The identity is read into `ownGroups` now, being a pom's own `<groupId>` and its `<parent>`'s, taken
from what is left when every `<dependency>`, `<plugin>` and `<extension>` block has been removed. It
costs exactly one external over commons-lang, being `org.apache.commons.text.TextStringBuilder`,
which goes grey.

**One attribution in the verifier's report is refuted by measurement.** square/okio's 335 Java
imports were said to land 0 first party for this same reason. They do not. okio declares
`com.squareup.okio` nowhere the resolver reads, its coordinate list holds no group that claims
`okio.*`, and the 87 grey `okio.*` imports are grey because this arm indexes `.java` files while
`okio.Buffer` is declared in `Buffer.kt`. That is the cross language limit, it is now on the Java
arm's face, and no groupId fix could have reached it.

### 12.4 The nine existing arms, re-proved after the fix

The same ten corpora the verifier used, being curl, googletest, libuv, nlohmann/json, gin, fd,
sinatra, okio, swift-argument-parser and a copy of the parent tree itself, produce 16,849 import
rows across the nine arms that existed before this phase. File for file, specifier for specifier,
answer for answer and target for target, the fix round differs from the parent in ZERO of them:
typescript 10,348, kotlin 2,182, objc 1,113, javascript 1,096, python 884, go 518, swift 273, ruby
240, rust 195.

## 13. What the committer's round measured, 2026-09-03

The verification of the fix round came back needs_work with two blocking false greens, both of the
class Phase 180 found and this phase was told not to repeat: an arm calling the repository's OWN
code somebody else's. An `external` is dropped from BOTH sides of the ledger in
`src/main/arch/checkers/imports.ts`, so every one of those answers is a `must-not` promise printed
green about something nobody checked. Both were re-derived here before anything was changed, over
repositories the fix round never touched, and both are closed.

### 13.1 How they were found, which is the method rather than the report

An independent checker per language, written against BYTES rather than against the resolver: for
Java a fully qualified type index built from every `.java` file's own `package` declaration, for
C sharp a namespace index built from every tracked `.cs` file with the byte order mark stripped, for
PHP a class index built from every `namespace` and `class` declaration, and for C a tail index over
every tracked path. Then one question of every `external` answer the shipped resolver gave: does
this name something this repository itself declares? Run over 29 repositories at `378624a`:

| language | repositories | externals that name the repository's own code |
| --- | --- | --- |
| java | gson, retrofit, commons-lang, commons-collections, jsoup, junit4, okio, moshi | 0 by the `.java` index, and 137 by hand on moshi, whose types are Kotlin |
| php | guzzle, laravel/framework, monolog, phpunit, symfony/console, nikic/PHP-Parser | 4, all of them a vendored copy of `Composer\Autoload\ClassLoader` that IS a dependency |
| c, cpp, objc | curl, libuv, fmt, googletest | 0 |
| csharp | Nancy, SignalR, serilog, AutoMapper, Newtonsoft.Json, RestSharp, Polly, efcore | **397**, being efcore 358 and Polly 39 |

### 13.2 The C sharp one, being 397 answers over two repositories

`readCsharpManifest` read a `.cs` file's namespace only when some project OWNED that file, and a
real repository keeps source no `.csproj` claims in a literal this reader can take: efcore's
`src/Shared` and Polly's `src/LegacySupport`, both pulled into several assemblies by an MSBuild glob.
Their namespaces reached no map at all, so the platform list and the package list claimed the names:
181 `using System.Text;` and 177 `using System.Reflection;` on efcore, 30
`using System.Diagnostics.CodeAnalysis;` and 8 `using System.Runtime.CompilerServices;` on Polly.

Every tracked `.cs` file is read now, whatever owns it, into `declaredNames`, and the arm answers
`unresolved` for a name that set holds. It names no directory on purpose: a file no project owns is
in no assembly, so there is no edge to draw. The bill is 397 answers turning grey and NOT ONE first
party answer moving, measured file for file: efcore 1,780 first party before and after, Polly 171
before and after.

### 13.3 The Java one, being 137 answers over moshi

moshi writes `group = "com.squareup.moshi"` at the root of its `build.gradle.kts` and names
`com.squareup.moshi:moshi` as its own japicmp baseline, so the coordinate read as somebody else's and
137 real `com.squareup.moshi.*` imports answered `external`. The fix round read Maven's declaration
of identity and not Gradle's, which is what section 12.3 left open; `readKotlinManifest` reads it now
from a literal `group` assignment and from a `gradle.properties` `GROUP` row, and `readJavaManifest`
joins it. Skipping the matching coordinate was not enough on its own: moshi's build files also carry
the bare `com.squareup`, so rule 1 claimed the name through the shorter coordinate. A specifier UNDER
a group the repository declares for itself is refused whatever else claims it.

moshi moves 137 answers from `external` to `unresolved` and 32 from `unresolved` to `first-party`,
and all 33 of its first party answers agree with the independent package index. Over the other seven
Java repositories the change moves NOTHING: retrofit and okio gain an identity
(`com.squareup.retrofit2`, `com.squareup.okio`) and not one answer moves, because nothing in either
build names their own coordinate.

Only a LITERAL is read. retrofit's `build.gradle` writes `group = JavaBasePlugin.DOCUMENTATION_GROUP`,
which is a value Gradle would compute, and it is not seen. The Kotlin arm never reads the field, so
its answers do not move.

### 13.4 The false green, end to end through the shipping checker, on real repositories

The arm's answer is not the finding. The verdict is.

| repository | promise | at `378624a` | with the fix |
| --- | --- | --- | --- |
| Polly | `bench/Polly.Core.Benchmarks/GenericOverheadBenchmark.cs` must-not `src/LegacySupport/**` | convergent, checked, 0 offending | unverifiable, 1 unresolved |
| moshi | `examples/.../FromJsonWithoutStrings.java` must-not `moshi/src/main/**` | convergent, checked, 0 offending | unverifiable, 4 unresolved |

Both source parts were chosen because every other import out of them resolves definitely, so the
verdict turns on the answer under test and on nothing else. The controls, run through the same
shipping `checkImports` over the same real rows, prove the judge can still go red at both grains:
jsoup's `parser` must-not `nodes` reads divergent, checked, over 49 crossing imports at FILE grain,
and efcore's `benchmark/.../ColdStartSandbox.cs` must-not `src/Microsoft.Data.Sqlite.Core/**` reads
divergent, checked, over 1 crossing import at PROJECT DIRECTORY grain, which is the Phase 180 hazard
class itself.

### 13.5 The blast radius, measured rather than argued

29 repositories, 92,000 import rows, compared row for row between `378624a` and this round: the only
answers that move are efcore's 358, Polly's 39 and moshi's 169. Nothing moves in Nancy, SignalR,
serilog, AutoMapper, Newtonsoft.Json, RestSharp, guzzle, laravel/framework, monolog, phpunit,
symfony/console, PHP-Parser, gson, retrofit, junit4, okio, commons-lang, commons-collections, jsoup,
curl, libuv, fmt, googletest, cobra, sinatra or Alamofire. Over the eleven repositories that carry
them, the nine arms that existed before this phase produce 3,618 rows and differ from the PHASE
parent `3d4c081` in zero of them.

### 13.6 What is still not answered, and is on the arms' faces

A Java type whose file's path does not spell its package, being generated source outside any source
root, is not found by the convention index, and if a coordinate claims the name it still answers
`external`. It fires on none of the eight Java repositories measured here. The same shape in PHP is a
class outside every declared `psr-4` and `psr-0` prefix, and it fires on none of the six PHP
repositories measured here. Both are the arms' stated limits rather than new ones, and both are the
reason the ARM never invents a path: an answer no declaration explains is refused.
