# Phase 256 prototype — the semantic pass and its checker

**RESEARCH PROTOTYPE. Nothing here ships.**

`tortie.pass.json` is a semantic description of this repository **written by the researcher by hand
on 2026-09-10** — nine components with the full contract, three journeys, six gates, 41 citations. It
is not the output of any agent; no agent CLI was launched and no token was spent. It is not a
proposal for `docs/arch/`: research 66's pinned key set and refusal 8 are untouched.

`check.mts` bounds it against the deterministic fact base:

```
node_modules/.bin/tsx build/p256/semantic/check.mts \
  build/p256/semantic/tortie.pass.json <scratch>/facts/tortie.json <scratch>/repos/tortie
```

It exits 1 when there is any finding, and prints a per-claim ledger saying which citations are BACKED
by a fact, which RESOLVE but are unbacked, and which are BROKEN. The two runs the phase reports are
in `../det/measurements/check-calls-only.txt` (22.0% backed) and `../det/measurements/check-with-decls.txt` (58.5%).

## What the revision round added, and why each one exists

Three of the reviewer's findings were that a published claim had no instrument behind it. These are
the instruments, and their output is `measurements-revision.txt`.

### `plant.mts` — how many lies the checker refuses

```
node_modules/.bin/tsx build/p256/semantic/plant.mts \
  build/p256/semantic/tortie.pass.json <facts.json> "$PWD"
```

It makes one deliberately false copy of the pass per shape a writer really gets wrong, runs the
SHIPPING checker over each, and counts only findings the honest pass does not already raise. **It
catches 2 of 7.** The five it misses are a false job on true citations, an invented component citing
real files, an unrelated test justifying `component-tested`, a reversed journey, and an invented gate
whose cited line really does carry a `gate.refusal`. A checker of citations is not a checker of
sentences, and the number is here so nobody has to take that on trust.

### `null-model.mts` — the floor under a backing rate

```
node_modules/.bin/tsx build/p256/semantic/null-model.mts <facts.json> <repo> [pass.json]
```

A citation is BACKED when SOME fact sits within three lines, so the share of lines that are within
three of some fact anyway is what a rate has to beat. Over the nineteen files this pass cites it is
**23.8%** with declarations in the base and **2.3%** without, so the two published rates read

| fact base | backed | floor | lift |
| --- | --- | --- | --- |
| call sites only | 22.0% | 2.3% | **9.6×** |
| plus declarations | 58.5% | 23.8% | **2.46×** |

— which says the call-site base is the sharper instrument and the declaration base the more generous
one, and that the chip on a face has to say which KIND of fact backed a claim. It also prints the
floor per category, where `gate` is 0.1% against `decl` at 21.9%.

### `check.mts` asks a SHAPE now, and asks it of the whole span

`checkClaim` took a `want` predicate and passed `() => true` at all three call sites, so §7.3's "a
fact of the wanted shape" described a rule the code did not implement, and rule 7 read
`near.find(() => true)` — the first fact in the span in array order — and then asked whether THAT was
a gate. Measured: `build/assert-css-order.mjs:295` IS a `gate.refusal` and the old code answered with
the `effect.fs.write` at line 298. Rule 2 is now honestly named PROXIMITY and the shape is asked
where a shape is wanted. The honest reading is worse than the one that shipped: **0 of this pass's 6
gates cite a gate-shaped fact**, where the buggy version reported 4.

### `layout` moved out of the mock's builder and into `tortie.pass.json`

The regions, the node labels and the transport names are the researcher's and nothing measures them.
They were constants inside `../mock/build-mock.mts`, so it drew these nine Tortie components out of
gotify's fact file and refused nothing. They live in the pass now and the builder refuses a fact file
whose repository does not track the files this pass cites.
