# How we built this

Session: `https://claude.ai/code/session_012PYAqFDkfSKXpwqMpYhySa` — empty directory to installed app, 17 phases, ~40 hours.

This doc covers the phase loop. Its companions are [HOW-WE-DROVE-THIS.md](HOW-WE-DROVE-THIS.md), which covers how agents opened and verified the real app, and [HOW-WE-VERIFY-THIS.md](HOW-WE-VERIFY-THIS.md), which covers the fixed workflow shape and the harness that lets a phase verify itself.

## The mode

`/effort ultracode` — xhigh reasoning plus multi-agent orchestration, set once at the start and left on. That is what makes the Workflow tool the default rather than an exception: every phase fans out 4–15 agents, and token cost stops being the constraint. Model: Opus 5 (1M context), which matters because a phase brief carries the backlog, the research doc, `CLAUDE.md` and several screenshots.

Two supporting habits: `/impeccable` loaded before any UI work so design agents inherit a real doctrine rather than taste, and skills (`/run`, `artifact-design`) invoked by name when they fit.

## The machine

**One file is the queue.** `docs/BACKLOG.md` holds every phase, in execution order, with the order itself recorded at the top. Nothing lives only in conversation — context gets compacted, the file does not.

**A phase is one Workflow**, always the same shape: research (if the mechanism isn't measured) → parallel builders with disjoint file ownership → integrator → independent verifier → fix round if needed → one commit. Verifiers must produce evidence, not assurance: real app driving, byte-comparisons against ground truth, measured numbers.

**`/loop` keeps it moving.** A self-paced loop with the instruction *"chain the next batch immediately when one finishes, never leave the queue idle."* Each wake checks git log and workflow activity, then launches the next batch. Without the explicit chain instruction it will report status and wait — which is how a queue goes idle unnoticed.

**Rules go in `CLAUDE.md`, not in chat.** Scope guardrail, growth guardrails, verification tiers, the operating contract. Written down, they bind every future agent; said once in conversation, they evaporate.

## What you do as operator

**Use it while it's built.** Every serious bug came from you, not the fleet: dead panes, false "working", missing scrollback, wrong resume data. Screenshot what's wrong and say what you expected.

**Add items whenever they occur to you.** Say "add this as a phase after N" — it gets specced into the backlog with a root cause, not just a symptom, and slotted into the order. Interrupting mid-turn is fine.

**Push back on the plan.** "Don't use a hard line limit, use TypeScript best practices." "That verification isn't needed for every change." "Re-baseline before refactoring." Each of those changed the machine, not just one phase.

**Challenge conclusions.** "The diffs library should handle that well" and "why do we think pi can't resume?" were both right and both overturned agent findings. When a claim smells wrong, say so — it triggers a re-derivation.

**Ask for status in your terms.** "Where are we?", "what have we shipped?", "what's left?" — the answer should be what you can now do that you couldn't.

## How the app got verified live

Agents drove the **real** app — self-driving `GMUX_SMOKE` harness modes, `GMUX_SHOT` screenshots that were actually looked at, and live CDP driving with real input — always under an isolated `--user-data-dir`, always checking ground truth from outside the app (tmux, git, ps, the filesystem). Full detail, including the safety rules that made it survivable on a machine with 45 live sessions: **[HOW-WE-DROVE-THIS.md](HOW-WE-DROVE-THIS.md)**.

## The second run: phases 18 to 47

Session `session_012PYAqFDkfSKXpwqMpYhySa` continued from an installed app to a public,
signed, self updating product: 104 commits in 4 days, 26 new research documents, and 4
published releases (0.18.0, 0.19.0, 0.19.1, 0.20.2). The loop and the file stayed the same. Six
things were added to the machine, each because something went wrong without them.

**The version moves on every commit, the release waits for a breakpoint.** A phase commit bumps
the minor for a feat subject and the patch for a fix, and nothing at all for docs, chore, test,
refactor or ci. Work therefore accumulates on main with an honest version even when no release
is cut. See the release plan at the top of `docs/BACKLOG.md` for the rule that decides when to
cut one.

**A contract inventory makes a refactor provable.** Before the architecture cleanup moved a
line, `build/contract-inventory.mjs` captured every IPC channel name, the SQLite schema and its
compatibility numbers, the `gmux.*` keys, the `GMUX_*` names, the harness modes and the bundle
refusal counts into one deterministic file. Every stage then had to reproduce it byte for byte
or state in its own commit which line moved, why, and what proved behavior held. Nine stages
moved thousands of lines and the file never changed.

**Only the committer commits.** Builders and verifiers that commit will stage a neighbor phase's
half finished work, and two entries will claim to have shipped in a commit that holds none of
their code. Both happened. The rule now appears in every brief.

**Waves are grouped by file domain, three at a time.** Parallel phases that share files rebase
into each other's edits. Parallel phases with disjoint domains do not, and three is the number
where the machine stays busy without the test suite's wall clock budgets flapping under load.

**Prove a flake before you fix it.** A red gate is not evidence of a defect. Run the failing file
alone, compare against a green run of the same code, and only then touch anything. Two CI
failures this run were the runner, not the tree, and one was a genuine packaging defect that
looked identical from the summary line.

**Diagnose before you spec.** The strongest phases opened with an agent whose only job was to
reproduce the defect live and name the line that caused it, with the spec written afterward. That
is how the quit crash, the stolen conversation id and the vanishing split layout were each fixed
at the source rather than at the symptom.

## What the operator did in the second run

The pattern from the first run held exactly, and got sharper: **every defect worth a phase came
from the operator using the app.** A lid close that filed a hidden crash report, an update that
went silent, an agent session that showed no conversation id, a split group that forgot its shape,
untitled rows for files that did not exist, a right click that dropped a selection. In each case a
screenshot and one sentence of expectation was enough for the fleet to find a root cause the tests
had never looked for.

Two operator instincts changed the plan rather than a phase. Asking whether the id race applied to
other agents produced the audit that found the last time guessing harvest. Asking for a research
spike on a neighboring project produced a durability comparison that named the one place Tortie is
behind.

## What the third run cost, in five lessons

Phases 46.1 to 80.1 ran three at a time and paid for these five. Each one is a
thing that went wrong, and each row says what it cost. They are here rather than
in the backlog because the next agent reads this file and does not read a table
6,700 lines into a queue.

| The lesson | What it cost |
| --- | --- |
| An exit code is not a result. Read the rows a gate printed and its own PASS line | Two runs of the ten row fault matrix reported exit 0 while dying halfway through |
| `node --check` passes a module body that does not parse. Compile it inside an async wrapper against a known-good control | A broken escape survived the check |
| A fence must name every file the change reaches, not only the files the feature lives in | A build gate failed on a file no builder was allowed to edit |
| A number in a charter is checked against the thing it describes before a builder reads it | A charter said 335,296 bytes and the four files measure 340,472 |
| A user-facing copy defect belongs on one shared list | Two rungs fixed the same false sentence independently |

## Rules learned the hard way

1. **Research before building anything unmeasured**, and write it to `docs/research/` so the next
   agent inherits it. Half the phases here have banked research; every one of them built faster and
   wrong less often.
2. **Re-baseline before consolidating.** A refactor plan written twelve phases ago describes a
   codebase that no longer exists. The re-baseline found a durability bug that would have survived
   the tidy-up.
3. **The verifier's job is to disprove.** The best findings came from agents told to refute: a
   wrong-by-default registry, a session that read "idle" for four hours while the UI said "working",
   a scroll that stalled the whole server for six seconds.
4. **A workflow launched with unresolved arguments must refuse to run.** Three phases once spent
   agents building "Phase undefined" before a verifier noticed the template had never been filled
   in. The runner now throws before it spawns anything.
5. **Ship the recovery before the risk.** A fix to the update path only protects updates that come
   after the version carrying it, so the phase that heals a broken updater belongs in the release
   before the one that stresses it.
6. **Say plainly when the answer is nothing.** A research spike that finds the studied thing thinner
   than what already exists is a good spike. Writing that sentence is worth more than inventing a
   finding to justify the effort.


7. **Clean up when a phase lands.** Each phase leaves gigabytes behind: worktrees, parent builds,
   clones with their own `node_modules`, and an Xcode DerivedData folder per agent. On 2026-10-01 that
   had filled the disk to 99 percent. The landing is not done until the phase's worktree, parents,
   clones and scratch are gone (CLAUDE.md, "Machine discipline").

## What the phone round cost, in four lessons

Phases 316.6 to 320.2 ran from 30 September to 4 October 2026 and took about five days for one TestFlight build.
The operator asked why. These four are the answer, largest first, and rules 8 to 11 below are what they changed.

| The lesson | What it cost |
| --- | --- |
| A spend or usage limit stops every agent at once, and a verifier stopped partway leaves locks, booted Simulators and half-built parents | 316.7 and 318 sat half-verified for about a day; each restart began with a cleanup |
| A phone phase is verified live on two iOS versions, and only two app or Simulator runs may hold the lock at once | One `probe:p316` sessions run took 34 to 74 minutes; phases queued behind each other for the two slots |
| Building two phases in parallel on an unlanded snapshot moves the merge to landing, where it needs its own integration and check | 318 met 14 conflicted files and 316.7 met 31; the second needed a whole integrate, verify, fix and reverify round |
| Builders write the probes that drive the app, and a verifier spends rounds finding defects in the probe rather than in the product | Several majors were graders, not Tortie: an age compared too strictly, a scroll that gave up early, a null turned into a string, a relay that counted the wrong close |

8. **Build phone phases one after another, not stacked on a snapshot.** Parallel building saved hours
   in the build and cost them back at landing. Two phases that share the door's route table, the
   phone's screens or the same gates are sequenced; only phases with disjoint files run at once.
9. **A probe is checked before the verifier uses it.** A probe a builder wrote gets its own short
   review: its graders run against recorded honest and hostile fixtures (`--grader-self-test`), and
   one person who did not write it reads every clause that can say FAIL. A verifier who finds the
   probe wrong reports it as a tooling defect, and it never counts as the product's.
10. **Run the long live arms only for what the phase changed.** A phase that does not touch the
    Sessions tab does not run its 34-minute group; the fast gates (`conformance:*`, `test:ios`, the
    grader self-tests) cover the rest, and the brief names which arms the phase earns.
11. **Check the account before a long round, and restart cleanly after a stop.** Before a round that
    will run for hours, confirm the account has room. After a limit stops one, release its lock
    slots only with the owner's pid proven dead, delete its Simulators and parent worktrees, and say
    in the resumed briefs what the stopped run left behind.
