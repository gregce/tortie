# How we built this

Session: `https://claude.ai/code/session_012PYAqFDkfSKXpwqMpYhySa` — empty directory to installed app, 17 phases, ~40 hours.

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

## Three rules learned the hard way

1. **Research before building anything unmeasured**, and write it to `docs/research/` so the next agent inherits it. Half the phases here have banked research; every one of them built faster and wrong less often.
2. **Re-baseline before consolidating.** A refactor plan written twelve phases ago describes a codebase that no longer exists. The re-baseline found a durability bug that would have survived the tidy-up.
3. **The verifier's job is to disprove.** The best findings came from agents told to refute: a wrong-by-default registry, a session that read "idle" for four hours while the UI said "working", a scroll that stalled the whole server for six seconds.
