# Phase 256 prototype — the deterministic half

**RESEARCH PROTOTYPE. Nothing here ships and nothing under `src/` was touched.** Findings are in
`build/p256/notes-deterministic.md`; the raw outputs this directory produced are in `measurements/`.

It spawns exactly one program, `git`, with a fixed argv and `GIT_OPTIONAL_LOCKS=0`. No field of any
repository it reads reaches any argv. It launches no Electron, starts no tmux server, opens no
keychain, makes no request, and reads nothing under the person's home.

## The parts

| file | what it is |
| --- | --- |
| `parse.mts` | the tree-sitter layer. Reuses Tortie's own `src/main/symbols/paths.ts` and `languages.ts`; ADDS a call-site, decorator and attribute reader per grammar, plus the one-hop wrapper resolution described in the notes §6. The node-type table was measured, not remembered. |
| `rules.mts` | the rule table — call sites and decorators to facts, plus `declarationSurfaces` for the surfaces that are declared rather than called |
| `textrules.mts` | the line rules: a program's main, a test function's own name |
| `manifests.mts` | the non-source half: package.json, Cargo, go.mod, pyproject, Procfile, Dockerfile, compose, CI workflows, SwiftPM, gradle, csproj, migrations |
| `run.mts` | the driver. `--out`, `--limit`, `--no-wrappers`, `--no-decls`, `P256_WRAPPER_HOPS` |
| `batch.mts` | the same over a directory of repositories |
| `corpus.sh` | the nine-repository corpus. Shallow, read-only clones, removed by its own trap on a failure and by `corpus.sh <dir> clean` afterwards |
| `sample.mts`, `score.mts` | the deterministic precision sampler and the score against `hand-precision.json` |
| `recall.mts` | the ten hand-enumerated recall scopes, each asserting the count it was recorded at |
| `show.mts` | read a fact file |
| `hand-precision.json` | 341 hand judgments, with the judging rule stated in the file. ONE moved in the revision round of 2026-09-10 and the file says which and why |
| `ladder.mts` | **the five evidence rungs of research 118 §7.2, COMPUTED**, using Tortie's own shipped resolver and `SymbolExtractor`. `--self-test` proves all five fire on planted graphs and launches nothing |

## Running it

```
build/p256/det/corpus.sh <scratch>
node_modules/.bin/tsx build/p256/det/batch.mts <scratch>/repos <scratch>/facts
node_modules/.bin/tsx build/p256/det/sample.mts <scratch>/facts 6 <scratch>/sample.json
node_modules/.bin/tsx build/p256/det/score.mts <scratch>/sample.json build/p256/det/hand-precision.json
node_modules/.bin/tsx build/p256/det/recall.mts <scratch>/repos <scratch>/facts
build/p256/det/corpus.sh <scratch> clean
```

The whole corpus is about 53 s in one process with the wrapper pass and about 18 s without — being
**2.94×**, which is the honest cost of the wrapper pass and not the 27% the fact file's own
`wrapperMs` field reports, because turning the pass off also removes the unwrap attempted at every
call site in the main pass.

## The ladder

```
node_modules/.bin/tsx build/p256/det/ladder.mts --self-test
node_modules/.bin/tsx build/p256/det/ladder.mts <repo> <facts.json> [pass.json] [--widen]
```

With a pass it reports the rung per component beside the word the pass carries; without one it uses
path-anchored parts, which is what a `docs/arch/` glob looks like. `measurements/ladder.txt` is what
it printed over four repositories. **Its most useful output is a refutation**: on the nine parts this
repository's hand pass names, eight of nine read `tested`, and widening each component's anchors from
its cited files to every tracked file under their directories changes not one of them.

`--widen` is that last clause RUN rather than asserted, and it was added by the committer's round
because the sentence had shipped with no arm behind it. It widens each component's anchors to every
tracked file under the directories of its cited files and prints both rungs side by side with a
`same?` column: **9 of 9 unchanged, 0 moved**, with `redline` going from 1 anchor to 56 and staying
`composed`. The tail of `measurements/ladder.txt` is what it printed.
