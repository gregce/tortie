# How we built this

Session: `https://claude.ai/code/session_012PYAqFDkfSKXpwqMpYhySa` — empty directory to installed app, 17 phases, ~40 hours.

This doc covers the phase loop. Its companion [HOW-WE-DROVE-THIS.md](HOW-WE-DROVE-THIS.md) covers how agents opened and verified the real app.

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
