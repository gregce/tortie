# gmux — agent conventions

Electron + tmux shell for agentic coding. Architecture authority: docs/FINAL-REPORT.md §2. Design authority: DESIGN.md + docs/DESIGN-SPEC.md. Work queue: docs/BACKLOG.md.

## Architecture invariants
- Sessions live in the PRIVATE tmux server (socket `-L gmux`, config resources/gmux-tmux.conf). The app is a disposable client. Never move durability-critical state into the app.
- Address live tmux sessions by immutable `$-id` (or `=`-exact name match), never bare names.
- The manifest (SQLite, main/manifest) is the source of truth for restore: argv + resume_argv always use ABSOLUTE binary paths.
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

## Gates before any commit
`npm run typecheck && npm run build && npm run smoke:t1` minimum; integrators run the full battery (test, smoke, smoke:t3, package). Commit as "Phase N[.x]: summary" with the session trailers.

## UI rules
- All colors via tokens (src/renderer/styles/tokens.css); no hardcoded literals outside theme constant files.
- No tmux vocabulary in user-facing UI (no "pane"/"window"/"prefix" — sessions have names).
- Native macOS menus via the ui:popupMenu bridge — never DOM-drawn context menus.
- Status semantics: "needs input" may only be triggered by session behavior, never by the user's own input to that session.
