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
