# Phase 256 — the mock

**RESEARCH MOCK. Nothing here ships and nothing under `src/` was touched.** The design it draws is
direction B of `docs/research/118-phase-256-the-architecture-that-explains-itself.md` §8.

## Open it

From the repository root:

```
open build/p256/mock/mock.html
```

It `<link>`s `../../../src/renderer/styles/tokens.css` **itself** rather than copying a value out of
it, so it must stay where it is and it follows the palette the day a token moves. Measured on the
file: **0 hex literals, 0 `rgb()`/`rgba()` literals, 51 distinct tokens referenced.**

## Rebuild it

```
node_modules/.bin/tsx build/p256/det/run.mts . --out /tmp/p256-facts.json
node_modules/.bin/tsx build/p256/mock/build-mock.mts /tmp/p256-facts.json
```

`build-mock.mts` spawns nothing, makes no request and writes exactly one file.

## Where every word in it comes from

| on the page | source |
| --- | --- |
| every component, journey step and gate | read verbatim from `../semantic/tortie.pass.json`, **written by the researcher by hand on 2026-09-10**. No agent wrote it and no token was spent. |
| the green chip beside a citation | recomputed by the builder from the deterministic prototype's fact file, by the same three-line rule `../semantic/check.mts` applies |
| the amber `prose` chip | the link resolves to a real tracked line and the deterministic half found nothing of the wanted shape near it |
| the counts in the masthead and the footer | read out of that fact file |
| **which region a part sits in, its three-to-five word label, and the name on each transport** | **the researcher's, and not measured.** The page's own footer says so. |

## What it reads off its own DOM

`out-mock-dom.json`, taken in the same scratch Electron at 1440×900 that read the three explorers
(`../probe-explorers.mjs`, one Electron through `build/electron-run.mjs`, ended in its `finally`):
3 tabs, 4 regions, 3 named transports, 9 nodes, **278 words above the fold**, 521 in the body —
against the three explorers' 253 / 285 / 288 above the fold and 488 / 639 / 392 in the body.
