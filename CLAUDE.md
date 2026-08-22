# Tortie — agent conventions

Electron + tmux shell for agentic coding. Product philosophy + name: docs/ZEN-OF-TORTIE.md. Architecture authority: docs/audits/2026-08-20-electron-typescript-architecture.md. Design authority: DESIGN.md + docs/DESIGN-SPEC.md. Work queue: docs/BACKLOG.md.

## The name (Phase 16.5, bundle id changed again in Phase 27)
The product is **Tortie** (`com.itavero.tortie` since Phase 27, `com.specstory.tortie` before that, `~/Library/Application Support/Tortie`). Tortie belongs to Ita Vero, LLC, the operator's company; the SpecStory INTEGRATION (the bundled specstory binary, src/main/specstory, the capture surfaces) keeps its name because it is a separate product Tortie talks to — never "finish off" that rename. The data directory follows `app.setName`, not the bundle id, so the Phase 27 id change moved no data. It was `gmux` until Phase 16.5, and much of the codebase's PROSE still says so — that is fine and deliberate. What is NOT prose, and must never be "finished off" by a later cleanup, is the set of identifiers live data is bound to: the tmux socket `-L gmux`, `resources/gmux-tmux.conf`, the `@gmux-*` session options, the `GMUX_SESSION_ID`/`GMUX_MANAGED` pane env, the inner `<userData>/gmux/` directory, the `window.gmux` bridge, the `gmux-asset:` scheme, `gmux.*` localStorage keys and `gmux-*` CSS classes. Renaming any of the first five strands sessions that are running right now. DEVELOPMENT.md has the full table and the reasons (README.md is product-facing). **User-visible copy is the only place the name may appear, and there it is always "Tortie".**

## Architecture invariants
- Sessions live in the PRIVATE tmux server (socket `-L gmux`, config resources/gmux-tmux.conf). The app is a disposable client. Never move durability-critical state into the app.
- Address live tmux sessions by immutable `$-id` (or `=`-exact name match), never bare names.
- The manifest (SQLite, main/manifest) is the source of truth for restore: argv + resume_argv always use ABSOLUTE binary paths. Agents are nonetheless LAUNCHED by bare name (Phase 12.7 F3): an absolute argv[0] made every durable gmux agent the one process on the machine that `pkill -f "$(command -v claude)"` matches. tmux's execvp finds the binary because the login-shell PATH is injected into the server env.
- Sessions are addressed by IDENTITY, never by name: `@gmux-id` (plus the `GMUX_SESSION_ID` pane-env stamp as the second source). A live session that carries neither is NOT OURS — never adopt it, never kill it.
- tmux SAFETY: only ever `tmux -L gmux`. Never touch the user's default tmux server, ~/.tmux.conf, or kill sessions you didn't create.

## Tortie never loads third party code (Phase 23) — the permanent refusals
These bind every future round the way the tmux safety rules above do. They are the outcome of docs/research/31-extensions.md, which examined bb, Zed and pi, wrote four competing architectures and had three adversaries attack each one. Eleven of the twelve reviews came back fatal. The single line that ended all of them is the first refusal.

The boundary, and it is the whole design:
> Configuration selects from choices the compiled world already contains, or names an executable the user has personally confirmed.

1. **No third-party JavaScript, TypeScript, WebAssembly or native code executes in any Tortie process.** Not main, not the renderers, not the preload, not a worker, not a `utilityProcess`.
2. **No `tortie.d.ts`, no SDK package, no contribution-point registry.** If a proposal begins "we will expose an interface so extensions can…", it is this refusal. bb froze 65 component prop types into a public contract and deleted it the next day.
3. **No marketplace, no store UI, no in-app browse-and-install, no update badge, no extension count on the activity rail.**
4. **No configuration mechanism may implement, replace, decorate or intercept** Explorer, SCM, search, the terminal, the tab spine, the manifest, the tmux layer, or Context's own data.
5. **No configuration mechanism may set a session's status.** Status semantics are in the UI rules below and they do not move.
6. **No third-party native code inside the signed bundle.** It would need `com.apple.security.cs.disable-library-validation` app-wide and permanently, against a configuration whose note reads "ZERO entitlements are needed".
7. **The main renderer's CSP is never relaxed.** Third-party HTML, if ever hosted, gets its own `session` partition and its own served CSP. `build/assert-preview-containment.mjs` asserts this at build time.
8. **Nothing may cause a process to start on a configuration change alone.** A human confirms the bytes, out of band of any agent turn, and the agreement is bound to a hash of the fields that decide what runs.

**Why refusal 8 is not theatre, stated so a later round does not remove it for convenience.** Every product cited as precedent for trusting configuration has a human as the only routine writer of that configuration, being Obsidian Restricted Mode, VS Code Workspace Trust, Zed, Raycast and pi. Tortie runs many agent processes at once under one user account, several deliberately launchable with their safeguards off, all with write access to the home directory. A configuration directory Tortie reads and an agent can write is an increase in privilege rather than a convenience. The gate has exactly one surface, being Settings then Agents, and removing that surface makes every configured agent unusable rather than making it convenient.

Two mechanical rules follow. The overlay type is hand written and narrow, and the internal registry type is never re-exported to it. An invalid row is dropped whole and surfaces as a visible error naming the field and the reason, never partially merged, never silently dropped, never a crash.

## Scope guardrail — gmux is not a VS Code reimplementation
gmux exists for what VS Code cannot do: durable named agent sessions (survive quit/crash/reboot with conversation resume), multi-project tabs in ONE window (VS Code refused this upstream — vscode#322745), and the agent layer (registry, per-agent icons/hotkeys/launch flags, agent-native status oracles, image drop, SpecStory capture). IDE furniture — git sidebar, decorated tree, editor tabs, markdown preview, minimap, search — is the price of admission, not the product.
Two rules follow, and they bind every future round:
1. **Justify parity work.** Before building any feature because "an IDE has it", answer in the proposal: *does this serve the agentic-coding workflow, or does it exist because IDEs have it?* If the latter, don't build it. (Passes: project-wide search — you must find things across repos agents are rewriting. Fails, and are explicitly deferred: structural/AST search, replace-in-files, LSP integration, debugging, task runners, extensions.)
2. **Assemble, never reimplement.** Prefer a maintained library or a vendored MIT extract over new code: Pierre for diffs/trees, Monaco for editing, ripgrep for search, VS Code's own git parsers and fuzzyScorer copied rather than reinvented, codicons + material-icon-theme for iconography. The code gmux owns should be glue and the differentiators above.
**Parity scope is capped after Phase 14 (search).** Everything after that goes to durability, the agent layer, correctness, and consolidation unless the user explicitly asks otherwise.

## The backlog is scanned from the bottom (operator's rule, 2026-08-21)

docs/BACKLOG.md ends with a section headed THE RUNNING LOG. **Append there, newest last, and never
reorder it.** Every phase that starts, every phase that lands and every new entry queued gets ONE
line, being the date, what happened, and the hash and version when it landed. The operator reads
this file by tailing it, so the end of the file must say where the queue is. It had drifted to a
research phase from four days earlier while six phases landed above it, which is what caused this
rule.

**The one exception he named.** An entry that was written down earlier but never queued MAY be
edited in place when it is finally queued, because its reasoning belongs beside the entries it
relates to. That is an edit to something that already exists. Anything NEW goes at the bottom.

**The log is an index, not a replacement.** Every phase still gets a FULL SECTION in the house
shape that the hundred phases above it use, and a one line entry is never enough to build from: the
`## Phase N` heading in the operator's words, the Subject, the First body line, the Semver, the Tier
with the reason for it, the Charter naming the entry and any research that binds it, the mechanism
written with real file paths read from the tree, the proof the phase must produce run rather than
read, and a **What is NOT in this phase** section, because the refusals are what stop a later round
widening the work. A phase entered as a single line has not been queued, it has been mentioned.

That new section is appended at the END of the file too, immediately above the running log, so the
file grows downward and the log stays last.

## Growth guardrails (enforced at every commit)
- One typed preload bridge derived from the shared contract in src/shared/ipc/ (domain files behind the index.ts facade, split in Phase 42) — never add a parallel wrapper "generation".
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
- **Commit per phase, conventional subject.** The subject is `type(scope): summary` (feat, fix, docs, refactor, test, chore, build, ci, perf, style; scope is one lowercase kebab word). The phase label is the FIRST BODY LINE, e.g. `Phase 24: self update`, and the build story stays in the body. No trailers of any kind.
- **Never leave the queue idle.** When a phase's workflow completes, immediately launch the next batch in the order recorded at the top of docs/BACKLOG.md. Do not wait to be asked. If a verdict blocks, fix it and continue.
- **Report to the user in their terms** when a phase lands: what they can now do that they could not before, and what is still not true.

## Machine discipline when running phases (learned the hard way, 2026-08-22)

Two phase workflows ran at once, the operator's machine ran out of memory and crashed, `/private/tmp`
was wiped, every worktree was destroyed and 163 files of uncommitted builder work were lost. Nothing
committed was lost, because everything committed was already on `origin/main`. These rules follow
from that and they bind every future round.

- **ONE phase workflow in flight at a time**, unless the phases are provably light and neither drives
  Electron. Two workflows can put more than thirty agents on the machine at once.
- **ONE Electron instance at a time inside a workflow.** It measures about 451 MB resident. Close it
  before starting the next one. Never run a build or a test suite while a probe is up.
- **Every probe kills its own Electron and ends its own scratch tmux server in a `finally` block**,
  whatever happened. After a probe run, check `ps aux | grep -c Electron` and report the number.
- **Check `vm_stat` before launching a workflow.** Under 3 GB free, do not launch. Under 2 GB free
  inside a run, stop, clean up and say so rather than pressing on.
- **A crash means RESTART FRESH, not resume.** `resumeFromRunId` replays an agent's TEXT and not the
  files it wrote. If the worktree was wiped, the cached builder reports describe changes that no
  longer exist and the integrator would build on a fiction. Only resume when the worktree survived
  intact, and check that it did before deciding.
- **`/private/tmp` does not survive a reboot.** Rebuilding a worktree means `git worktree prune`,
  `git worktree add --detach`, then `cp -Rc node_modules` and `cp -Rc build/vendor` from the
  operator's checkout. Confirm `build/vendor/specstory/bin/specstory --version` before starting, or
  the specstory provider test fails for a reason that is not a product defect.
- **The exposure is structural and it is the price of committing once per phase.** The committer is
  the last agent, so a crash at any earlier point loses the whole phase. That trade is deliberate,
  because it keeps main clean and keeps the gates meaningful. Know the cost when a phase is long.

## How to write to the operator (every report, not only when a phase lands)
The operator gave these rules directly. They are requirements, not preferences. They apply to chat replies, commit messages, backlog entries and research documents.

**Words and sentences**
- Use simple, everyday words. Prefer the common word over the fancy one. Write "use" rather than "leverage". Short familiar words are faster to read.
- Write complete sentences. Each sentence states one clear thing and has a subject and a verb. Do not write fragments. Do not stitch several ideas into one dense line. If a sentence is doing two jobs, split it into two.
- Do not use em dashes or en dashes anywhere, including in number ranges. Join clauses with a period, or with a word such as "and". Write ranges with the word "to", e.g., "0.94 to 0.96".
- Use a colon only to introduce a list. Do not use a colon to join two clauses. Do not use a colon to set up a point.
- Do not use jargon. If a technical term is needed, say it once and explain it in plain words. Avoid a word such as "calibrated" unless you define it simply.
- Do not use analogies, metaphors or imagery. Do not explain one thing by comparing it to a different thing. Describe the actual thing in literal terms.
- Cut filler. Drop a phrase such as "it is worth noting that". Every sentence should add something the reader needs.
- Do not give inanimate things human actions. Name the person who acts. Write "the authors argue" rather than "the paper argues". A plain factual verb for an inanimate subject is fine, e.g., "the table shows the scores".
- Do not invent hyphenated adjectives. A common compound that people already use is fine, e.g., "well-crafted". If you catch yourself coining one, write it out in plain words instead.
- Do not pad with empty emphasis. Drop "really" and "real". Do not say that something "matters" or "carries weight". State the actual point, or cut the sentence.
- Do not write a three-part series inside a sentence. It sounds practiced. When you have items to list, use a bullet list. Do not pad a list to three for rhythm.
- When you use an example, give one example and introduce it with "e.g.". Do not stack several examples for the same point.

**Length**
- Plain does not mean terse. If an idea is compressed into one cramped sentence, expand it so each point gets its own sentence and the reader can follow it.
- When you have several distinct things to list, give each one its own sentence or its own bullet. Do not run them together in one long line.
- Clarity comes before shortness. Clarity also comes before length.

**Shape of a report**
- Lead with the answer. State the verdict, the number or the decision in the first sentence. Put the reasoning after it.
- Use a table when there are three or more of anything, e.g., a set of options with a verdict on each.
- When you recommend one option, show the rejected options in the same table, with the deciding reason on each row.
- Draw a diagram when the thing has a shape, e.g., how data moves between two processes. Use plain text drawings, because they survive in a terminal.
- Say what is not true. Name what did not land. Name what is unverified. Name what you assumed.
- Use numbers rather than adjectives. Write "0.57 s, from 23 s" rather than "much faster".

## Verification tiers — match the check to the risk, do not default to maximum
Heavyweight verification (driving the real app with synthetic input, screenshot reads, per-agent matrices) is expensive in wall clock and tokens. Spend it where a wrong answer costs the user their work; do not spend it on cosmetics.
- **Tier 1 — gates only** (`typecheck`, `build`, `test`, `smoke:t1`): icons and assets, CSS/spacing, copy and labels, tooltips, menu items, additive UI with no new state, doc changes. A screenshot only if the change is visual and cheap to capture.
- **Tier 2 — gates + one targeted probe + one screenshot read**: ordinary features touching a single subsystem (a new SCM verb, an editor affordance, a settings field). Probe the thing you changed and its nearest neighbour; do not sweep the app.
- **Tier 3 — full treatment** (live-app driving, adversarial verifier pair, exhaustive matrix, before/after measurements): anything touching **durability** (tmux, manifest, restore, session lifecycle), anything claimed to work **universally across agents**, anything that can **lose or destroy user data**, **performance regressions with a number attached**, and **any bug the user personally reported** (they get proof, not assurance).
When a round mixes tiers, verify per item at its own tier rather than promoting the whole round to Tier 3. State the tier chosen in the phase brief so the choice is deliberate and reviewable.

## Gates before any commit
`npm run typecheck && npm run build && npm run smoke:t1` minimum; integrators run the full battery (test, smoke, smoke:t3, package). Commit with a conventional subject `type(scope): summary`; the phase label goes on the first body line as `Phase N[.x]: summary`; no trailers.
**Touching the Context view's substrate table?** Add `npm run conformance:context` (about 1 s, spawns nothing, makes no request) for any commit under `src/main/context/agent-context.ts` or `src/renderer/context/groups.ts`. It prints the per-agent precedence matrix the panel actually draws from and fails when a row loses its model, its scope order or its reload answer. It is what keeps research 29 §2 executable rather than documented, and it is the gate that would have caught the panel stating Claude Code's ordering rule for every agent.
**Touching resume?** Add `npm run conformance:resume:capture` (~16 s, no turns, no tokens spent) to that list for any commit under `agents/registry.ts`, `manifest/harvest/**`, `manifest/agents.ts` or `restore/**` — it is the cheap gate that makes every registry resume claim executable, and it caught a one-word `availableAt` error that the whole battery above was blind to. The full `npm run conformance:resume` roundtrip (~3 min, real turns) runs once per phase and after any agent-CLI upgrade. `smoke:t3` covers a claude AND a non-claude restore shape; neither is a substitute for the other.
**Touching the agent table?** Add `npm run conformance:agents` (~2 s, spawns nothing, opens no manifest, launches no Electron) for any commit under `agents/registry.ts`, `manifest/agents.ts`, `main/config/**` or `renderer/state/agents.ts`. It proves four things the unit tests do not: the create path composes an absolute argv, a resume argv built from the parsed manifest row alone equals the registry's byte for byte, the renderer's seed list agrees with the registry, and the confirm hash moves for every execution bearing field and for none of the presentation ones.
**Touching the install map?** Add `npm run conformance:installs` (about 1 s, spawns no agent, makes no request) for any commit under `src/main/agents/registry.ts`. It asserts the six shape rules from research 47 §10, and it is what keeps the map's promise, that nothing in it can run, checkable instead of asserted.
**Touching machines?** Add `npm run conformance:machines` (about 1 s, starts no ssh, opens no file under the person's home, launches no Electron) for any commit under `src/main/machines/**`. It proves the confirm hash moves for `host`, `user`, `port` and `remoteTmuxPath` and for neither presentation field, that a machine and a configured agent with the same bare id cannot share one agreement, that an invalid row is dropped whole with the field named, that `BatchMode=no` exists at exactly one call site, and that the connection test argv names Tortie's own host key file FIRST and the person's second. The last one replaced a weaker rule that passed while the product added three lines to the operator's `~/.ssh/known_hosts`, measured at 932 bytes before a probe run and 1229 bytes after.

## UI rules
- All colors via tokens (src/renderer/styles/tokens.css); no hardcoded literals outside theme constant files.
- No tmux vocabulary in user-facing UI (no "pane"/"window"/"prefix" — sessions have names).
- Native macOS menus via the ui:popupMenu bridge — never DOM-drawn context menus.
- A phase that adds, renames or removes a user-facing surface updates the native menus in the same commit, and the phase brief says what changed in the menus.
- Status semantics: "needs input" may only be triggered by session behavior, never by the user's own input to that session.
