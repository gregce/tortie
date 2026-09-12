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

**A NARROWED REPEAT is filed beside a reading and never as one.** `--only part|journeys` runs one
kind of ask and `--out <name>` writes that run to `<name>.json` and `<name>.reading.json`, because a
profile that only ran the journeys ask answers a reading holding only journeys and filing it as
`codex.reading.json` would destroy the full one. `codex.journeys.json` is the fix round's own repeat
of 2026-09-12, one ask, and it is the measured proof of the journey block's defect: at the parent the
journeys ask was refused `no-row-stood` because the block it was handed carried no citable `path:line`
anywhere in it, and with the block carrying sampled fact lines the SAME ask over the SAME repository
came back kept in 10,621 ms with a three step journey whose every citation graded `call-site`.

**A dry run's record is refused.** `dryRun: true` fails rule 10a by name, because a dry run spends no
token and measures no model: it drives the same chain and reads the refusal back.

The live run is the INTEGRATOR'S and is the only step in this repository that spends a token, under
the operator's narrow lift of 2026-09-12. Nothing here ever carries a token byte: the harness writes
a closed key set per ask, proved by `node build/p259/measure-semantic.mjs --self-test`.
