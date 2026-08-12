# How we built this

Session: `https://claude.ai/code/session_012PYAqFDkfSKXpwqMpYhySa` — empty directory to installed app, 17 phases, ~40 hours.

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

Agents drove the real application, not a mock. The techniques that produced the good findings, in rough order of how often they earned their keep:

- **Launch a real instance with an isolated `--user-data-dir`** and drive it over the Chrome DevTools Protocol (`--remote-debugging-port`). Isolation is what made it safe to run this against a machine with 45 live sessions of the operator's real work.
- **Dispatch real input**, not synthetic state changes: `Input.dispatchKeyEvent` at the focused element, real `PointerEvent` drags, actual `mouseWheel`. That is how Shift+Enter was proven on nine agents and how drag-to-split was checked at 150% and 75% zoom.
- **Read ground truth from outside the app.** The renderer can lie; `tmux capture-pane`, `display -p '#{pane_width}'`, `ps`, `git show`, and reading `~/.Trash/.DS_Store` for Finder's Put-Back records cannot.
- **Diff against an authority rather than eyeballing**: rendered git lanes against `git log --graph`, historical diffs against `git show <sha>^:path`, 898 of 898 parent edges, 16 of 16 file-views byte-identical.
- **Screenshot and then actually look at it.** `GMUX_SHOT` capture, crop with `sips`, read the PNG. Several defects were only visible that way — an icon sitting on a placeholder's first letter, a scrollbar measured at 1.96:1 contrast and genuinely unfindable at 1×.
- **Measure with numbers, before and after.** 23,000 ms → 567 ms on diffs; a 6,259 ms server stall → 37 ms; 3 ms time-to-first-search-result on an 83,000-file tree.
- **Build permanent harnesses for what will drift.** `smoke:t1` (restart survival), `smoke:t3` (reboot restore), `conformance:resume` (every agent's resume claim, executable). Agent CLIs change under you; a harness catches it the day it happens instead of the day you reboot.
- **A gotcha worth inheriting:** Chromium clamps timers to ~1 Hz in a non-frontmost window. One probe reported 996 ms for something that actually took 47 ms. Pass `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`.

Safety rules that made all of this survivable: private tmux socket only, `zz-`prefixed scratch sessions, never `pkill`, never touch a session the agent did not create, and list the operator's sessions before and after to prove nothing moved.

## Three rules learned the hard way

1. **Research before building anything unmeasured**, and write it to `docs/research/` so the next agent inherits it. Half the phases here have banked research; every one of them built faster and wrong less often.
2. **Re-baseline before consolidating.** A refactor plan written twelve phases ago describes a codebase that no longer exists. The re-baseline found a durability bug that would have survived the tidy-up.
3. **The verifier's job is to disprove.** The best findings came from agents told to refute: a wrong-by-default registry, a session that read "idle" for four hours while the UI said "working", a scroll that stalled the whole server for six seconds.
