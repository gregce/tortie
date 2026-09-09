# Phase 244's three measurement drivers

These are the drivers the measure step wrote for findings the audit's own four fixtures do not
cover. They are `.fixture` files for the same reason the audit's are: two of them assert the LOSS
they measured, so they must not sit in the ordinary suite, and one of them reaches the operator's Mac
Pro. Copy each to the location named below, dropping only the suffix, run it, and remove the copy.

| Driver | Copy to | What it answers |
| --- | --- | --- |
| `f1-inherited-undo.test.ts.fixture` | `src/renderer/editor/__tests__/p244-f1-inherited-undo.test.ts` | F1's byte question: what an inherited undo does to a real file |
| `f2-remote-mirror.test.ts.fixture` | `src/main/machines/__tests__/p244-f2-remote-mirror.test.ts` | F2 over the REAL link to the Mac Pro, not a local `/bin/sh` |
| `f4-read-cap-bytes.test.ts.fixture` | `src/main/fs/__tests__/p244-f4-read-cap-bytes.test.ts` | F4's byte count taken a second way, and the peak buffer |

Then `npx vitest run <that path>`.

**The F2 driver reaches a real machine.** It makes one scratch git repository at
`~/tortie-p244-scratch-<pid>` over there and removes it in a `finally`, counts his `-L gmux` sessions
before and after and asserts they did not move, never attaches to one, routes every ssh through
`build/ssh-run.mjs` with a record file it owns so neither `~/.ssh/known_hosts` is written, and sets a
git identity with `git config --local` inside the scratch repository only. Do not widen it.

**The F1 and F4 drivers assert what is wrong today.** A repair turns them red, which is the point:
the repair round replaces each with the assertion the audit's own fixture states. Findings and
readings are in [research 108](../../docs/research/108-phase-244-audit-findings.md).
