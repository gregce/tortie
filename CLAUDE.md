# gmux — agent conventions

Electron + tmux shell for agentic coding. Architecture authority: docs/FINAL-REPORT.md §2. Design authority: DESIGN.md + docs/DESIGN-SPEC.md. Work queue: docs/BACKLOG.md.

## Architecture invariants
- Sessions live in the PRIVATE tmux server (socket `-L gmux`, config resources/gmux-tmux.conf). The app is a disposable client. Never move durability-critical state into the app.
- Address live tmux sessions by immutable `$-id` (or `=`-exact name match), never bare names.
- The manifest (SQLite, main/manifest) is the source of truth for restore: argv + resume_argv always use ABSOLUTE binary paths. Agents are nonetheless LAUNCHED by bare name (Phase 12.7 F3): an absolute argv[0] made every durable gmux agent the one process on the machine that `pkill -f "$(command -v claude)"` matches. tmux's execvp finds the binary because the login-shell PATH is injected into the server env.
- Sessions are addressed by IDENTITY, never by name: `@gmux-id` (plus the `GMUX_SESSION_ID` pane-env stamp as the second source). A live session that carries neither is NOT OURS — never adopt it, never kill it.
- tmux SAFETY: only ever `tmux -L gmux`. Never touch the user's default tmux server, ~/.tmux.conf, or kill sessions you didn't create.

## Scope guardrail — gmux is not a VS Code reimplementation
gmux exists for what VS Code cannot do: durable named agent sessions (survive quit/crash/reboot with conversation resume), multi-project tabs in ONE window (VS Code refused this upstream — vscode#322745), and the agent layer (registry, per-agent icons/hotkeys/launch flags, agent-native status oracles, image drop, SpecStory capture). IDE furniture — git sidebar, decorated tree, editor tabs, markdown preview, minimap, search — is the price of admission, not the product.
Two rules follow, and they bind every future round:
1. **Justify parity work.** Before building any feature because "an IDE has it", answer in the proposal: *does this serve the agentic-coding workflow, or does it exist because IDEs have it?* If the latter, don't build it. (Passes: project-wide search — you must find things across repos agents are rewriting. Fails, and are explicitly deferred: structural/AST search, replace-in-files, LSP integration, debugging, task runners, extensions.)
2. **Assemble, never reimplement.** Prefer a maintained library or a vendored MIT extract over new code: Pierre for diffs/trees, Monaco for editing, ripgrep for search, VS Code's own git parsers and fuzzyScorer copied rather than reinvented, codicons + material-icon-theme for iconography. The code gmux owns should be glue and the differentiators above.
**Parity scope is capped after Phase 14 (search).** Everything after that goes to durability, the agent layer, correctness, and consolidation unless the user explicitly asks otherwise.

## Growth guardrails (enforced at every commit)
- One typed preload bridge derived from src/shared/ipc.ts — never add a parallel wrapper "generation".
- Organize by domain, not by accretion — TypeScript best practices over line-count rules: one module = one responsibility with a small, deliberate export surface; split when a file accumulates unrelated domains or its internal sections need comments to navigate (per-domain store slices, per-domain ipc registrars, colocated component CSS), not because it crossed an arbitrary length.
- Grep for an existing helper before writing one. tmux binary/config resolution lives in exactly one module shared by supervisor and attach host.
- src/shared/* is append-only during parallel builds; integrators reconcile.
- After parallel work: scan for duplicated 10+ line blocks and extract.

## How every remaining phase gets built (the operating contract — do not lower this bar)
Each phase runs as ONE Workflow with the same shape that produced Phases 1-13: **spec -> parallel builders with disjoint file ownership -> integrator -> independent verifier(s) at the phase's tier -> a fix round if any verdict is needs_work -> commit per phase**. Non-negotiables:
- **Research before building** anything whose mechanism is not already measured, and write it to docs/research/ so the next agent inherits it instead of re-deriving. Several phases (13.5, 13.7, 14, 15) already have their research banked — use it.
- **Verifiers are independent of builders** and must produce EVIDENCE, not assurance: real app driving, measured numbers, byte-comparisons against ground truth, per-agent matrices where universality is claimed. A verifier that only reads code has not verified.
- **Fix rounds are part of the phase**, not follow-up. A phase is not done at needs_work.
- **Tier the verification** per the section below — do not default to maximum, do not skip Tier 3 where it is earned.
- **Commit per phase** with the standard trailers, so the history stays a readable build story.
- **Never leave the queue idle.** When a phase's workflow completes, immediately launch the next batch in the order recorded at the top of docs/BACKLOG.md. Do not wait to be asked. If a verdict blocks, fix it and continue.
- **Report to the user in their terms** when a phase lands: what they can now do that they could not before, and what is still not true.

## Verification tiers — match the check to the risk, do not default to maximum
Heavyweight verification (driving the real app with synthetic input, screenshot reads, per-agent matrices) is expensive in wall clock and tokens. Spend it where a wrong answer costs the user their work; do not spend it on cosmetics.
- **Tier 1 — gates only** (`typecheck`, `build`, `test`, `smoke:t1`): icons and assets, CSS/spacing, copy and labels, tooltips, menu items, additive UI with no new state, doc changes. A screenshot only if the change is visual and cheap to capture.
- **Tier 2 — gates + one targeted probe + one screenshot read**: ordinary features touching a single subsystem (a new SCM verb, an editor affordance, a settings field). Probe the thing you changed and its nearest neighbour; do not sweep the app.
- **Tier 3 — full treatment** (live-app driving, adversarial verifier pair, exhaustive matrix, before/after measurements): anything touching **durability** (tmux, manifest, restore, session lifecycle), anything claimed to work **universally across agents**, anything that can **lose or destroy user data**, **performance regressions with a number attached**, and **any bug the user personally reported** (they get proof, not assurance).
When a round mixes tiers, verify per item at its own tier rather than promoting the whole round to Tier 3. State the tier chosen in the phase brief so the choice is deliberate and reviewable.

## Gates before any commit
`npm run typecheck && npm run build && npm run smoke:t1` minimum; integrators run the full battery (test, smoke, smoke:t3, package). Commit as "Phase N[.x]: summary" with the session trailers.

## UI rules
- All colors via tokens (src/renderer/styles/tokens.css); no hardcoded literals outside theme constant files.
- No tmux vocabulary in user-facing UI (no "pane"/"window"/"prefix" — sessions have names).
- Native macOS menus via the ui:popupMenu bridge — never DOM-drawn context menus.
- Status semantics: "needs input" may only be triggered by session behavior, never by the user's own input to that session.
