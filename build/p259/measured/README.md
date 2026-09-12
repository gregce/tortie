# The measurement records (Phase 259)

One file per agent, `<agentId>.json`, written by `build/p259/measure-semantic.mjs` in its LIVE mode
and by nothing else. `<agentId>.reading.json` beside it is what the shipped `arch:semantic` channel
answered after the asks, which is quality reading (a).

**This directory is what makes "measured or disabled" mechanical rather than remembered.**
`npm run conformance:semantic` rule 10a asserts that every row in the live semantic recipe table of
`src/main/overview/fold/recipes.ts` carries a `measuredOn` date AND a record here whose `agentId`,
`model` and `measuredOn` agree with the row; rule 10b asserts that a row with no record is not in the
table at all, so `archSemanticRecipeFor` answers null, Settings draws `not-measured`, and the runner
refuses `no-recipe` before anything can spawn.

**A dry run's record is refused.** `dryRun: true` fails rule 10a by name, because a dry run spends no
token and measures no model: it drives the same chain and reads the refusal back.

The live run is the INTEGRATOR'S and is the only step in this repository that spends a token, under
the operator's narrow lift of 2026-09-12. Nothing here ever carries a token byte: the harness writes
a closed key set per ask, proved by `node build/p259/measure-semantic.mjs --self-test`.
