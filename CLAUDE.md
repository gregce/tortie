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
**Read `docs/method/` before authoring any phase workflow**: `HOW-WE-VERIFY-THIS.md` section 1 is the fixed shape and the seven roles, `HOW-WE-BUILT-THIS.md` is the phase loop, `HOW-WE-DROVE-THIS.md` is how the real app is driven. A phase is one of two lanes, and neither may drop a step:

```
Build lane     Spec -> Build (n builders, disjoint files) -> [Integrate] -> Verify -> [Fix -> Reverify] -> Commit
Research lane  Investigate -> Attack (adversaries) -> Judge or Synthesize -> Write (one doc) -> Commit
```

Each phase runs as ONE Workflow with the same shape that produced Phases 1-13: **spec -> parallel builders with disjoint file ownership -> integrator -> independent verifier(s) at the phase's tier -> a fix round if any verdict is needs_work -> AN INDEPENDENT REVERIFY OF THAT FIX -> commit per phase**. Non-negotiables:
- **Research before building** anything whose mechanism is not already measured, and write it to docs/research/ so the next agent inherits it instead of re-deriving. Several phases (13.5, 13.7, 14, 15) already have their research banked — use it.
- **Verifiers are independent of builders** and must produce EVIDENCE, not assurance: real app driving, measured numbers, byte-comparisons against ground truth, per-agent matrices where universality is claimed. A verifier that only reads code has not verified.
- **Fix rounds are part of the phase**, not follow-up. A phase is not done at needs_work.
- **A fix is never its own proof: Fix -> Reverify, always.** The reverifier is independent of the fixer, re-runs the FAILED ITEMS LIVE plus anything the fix touched, and never accepts a fix report or a green gate as proof. The fix runs ONCE; if the reverify still answers needs_work the workflow stops and the verdict goes to the operator, because a second needs_work on the same problem means the spec is wrong (`docs/method/HOW-WE-VERIFY-THIS.md` section 1 records why the three-round loop was removed). A verifier that returns nothing counts as needs_work, and verdicts are typed (`verdict`, `evidence`, `problems`), never prose. Re-running the battery after a fix round is the main session's job and is NOT the reverify. On 2026-09-17 five phases (277, 278, 279, 281, 282) landed with the step dropped, because the phase had been split into a build workflow and a verify workflow so the main session could run the long gates between them, and the second workflow was written to end at its fix round; in Phase 282 the BUILD round's own fixes had introduced two major defects with every gate green, which is exactly what this step exists to catch. **Splitting a phase across workflows never removes a step from its lane.**
- **A research phase attacks BEFORE it writes.** Investigators, then adversaries who try to refute the findings, then a judge or a synthesis, then ONE document. A document written first and attacked afterwards has to be rewritten, which is what Phase 280 did.
- **Tier the verification** per the section below — do not default to maximum, do not skip Tier 3 where it is earned.
- **Commit per phase, conventional subject.** The subject is `type(scope): summary` (feat, fix, docs, refactor, test, chore, build, ci, perf, style; scope is one lowercase kebab word). The phase label is the FIRST BODY LINE, e.g. `Phase 24: self update`, and the build story stays in the body. No trailers of any kind.
- **Never leave the queue idle.** When a phase's workflow completes, immediately launch the next batch in the order recorded at the top of docs/BACKLOG.md. Do not wait to be asked. If a verdict blocks, fix it and continue.
- **Report to the user in their terms** when a phase lands: what they can now do that they could not before, and what is still not true.

## Machine discipline when running phases (rewritten 2026-08-23 with real numbers)

On 2026-08-22 the machine ran out of memory and crashed, `/private/tmp` was wiped and 163 files of
uncommitted builder work were lost. The rule written that day blamed concurrency and was wrong. The
numbers, measured on 2026-08-23: the machine has **48 GB**, one probe's Electron holds **241 MB**, and
the operator's entire running Tortie with all its sessions holds **1,524 MB across 18 processes**. Four
probes at once is under 1 GB. That was never the crash.

**The crash was a leak, not concurrency.** Of the 51 scripts under `build/` that started an Electron,
8 ended it in a `finally` block and the other 43 ended it only on the happy path. Any assertion that
threw left one running, and a retried or sequenced probe stacked them. Sixty stacked instances is
15 GB or more, and that is the machine. Phase 140 fixed it at the source. One helper,
`build/electron-run.mjs`, owns every launch and ends the tree it started in a `finally` block, and
`npm run gate:electron` is what keeps it there.

An earlier version of this section claimed Electron costs 451 MB per instance. That number was taken
from research 62, where it measures a MODEL SPAWN rather than Electron, and it should never have been
written here. Measure before writing a number into this file.

- **Probes may run concurrently, up to four at once.** Beyond four, queue them. This is a headroom
  rule rather than a safety rule, and the safety is the `finally` block.
- **Every probe that launches Electron kills it in a `finally` block**, and ends its own scratch tmux
  server there too, whatever happened. A probe that kills only on the happy path is a defect and the
  verifier names it. This is the rule that actually prevents the crash.
- **Every process a script starts, it ends in a `finally` block**, being a shell, a server, a
  sleeper or a load generator, whatever happened. A script that kills only on the happy path is a
  defect and the verifier names it. Phase 206 extended the Electron rule above to this in the same
  words, because on 2026-09-02 the Phase 200 verifier started six shell loops to load the machine
  for an attack, ran its probe, then tried to kill them; the kill did not reach them, the parent
  exited, they reparented to launchd and ran for two hours and three minutes at about 550 percent of
  his CPU until he noticed his fans. The conventions did not forbid it because they named Electron
  alone. `npm run gate:background` is what keeps it there, and it is described in the gates section
  below.
- **Count what is left after a probe run, once, at the end.** The command everybody reaches for,
  `ps aux | grep -c "[E]lectron"`, misses the largest process in the leak. Electron's main process
  renames itself to `Tortie`, and its command line is the single word `Tortie` with no arguments at
  all, so neither that grep nor a search for the profile path finds it. A deliberate leak measured on
  2026-08-23 held six processes and 521,520 KB, and the process both of those searches missed was
  179,984 KB of it. Count with
  `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`.
  Every line except the bare `Tortie` one carries a `--user-data-dir` you can read under
  `ps -p <pid> -o command=`. The bare `Tortie` line is identified by its parent pid instead, which is
  the `node_modules/.bin/electron` shim your own run started. An entry marked `<defunct>` holds no
  memory and is not a leak. Do not count between every step. That bookkeeping cost 18 shell calls in
  one phase and prevented nothing.
- **Never send SIGKILL to the `node_modules/.bin/electron` shim.** That shim is a nine line Node
  forwarder. It passes SIGINT, SIGTERM and SIGUSR2 to the app it started, and nothing can forward
  SIGKILL. A SIGKILL to the shim kills the shim, the app reparents to launchd, and the app runs on.
  That was measured on 2026-08-23. The shim died and 482 MB of Tortie stayed up. Send SIGTERM first,
  wait for the pid to go, then SIGKILL the descendants by pid. Do not treat SIGTERM as enough on its
  own. On 2026-08-23 a leaked app was still up 16 seconds after one, and only the SIGKILL of the tree
  ended it. `build/electron-run.mjs` already does the whole sequence, so a probe should launch
  through `withElectron` rather than signal anything itself.
- **Two phase workflows may run at once** when the machine is quiet. Three or more only when none of
  them photographs.
- **Stop on swap AND pressure together, never on free pages.** macOS keeps free pages near zero on
  purpose, so that number is meaningless. Swap in use is not enough on its own either: on 2026-08-23
  swap read 5,039 MB while `memory_pressure` read 77 percent free, and every one of the top consumers
  was the operator's own work, being a Virtualization.framework VM at 2,662 MB, `tessl mcp` at
  1,995 MB, a node process at 1,724 MB and Chrome at about 3,300 MB. The alarm is
  `memory_pressure | grep percentage` under 20 percent free, and swap in use is the second signal that
  confirms it. Before stopping anything, read the top consumers by RSS and say whether they are yours.
  Never stop a phase for pressure another program caused.
- **A crash means RESTART FRESH, not resume.** `resumeFromRunId` replays an agent's TEXT and not the
  files it wrote, so a wiped or half-written worktree makes the cached reports a fiction. Reset the
  worktree to origin/main's tip before any resume.
- **NEVER `git reset --keep origin/main` in his checkout without checking for local commits first.**
  On 2026-08-23 that command discarded his own commit `a3bbd45`, "docs(audit): restore the
  architecture 36 plan", 517 lines he had just written. `--keep` protects uncommitted changes and does
  NOT protect a local commit that is not on the remote. The correct sync is
  `git -C /Users/gdc/gmux log --oneline origin/main..HEAD` first, and if it prints anything, stop and
  tell him rather than resetting. `git merge --ff-only origin/main` is the safe form, because it
  refuses instead of discarding. The file was recovered from the reflog at `13393f2`, and the reflog
  is the only reason it survived.
- **`/private/tmp` does not survive a reboot.** Rebuilding a worktree means `git worktree prune`,
  `git worktree add --detach`, then `cp -Rc node_modules` and `cp -Rc build/vendor` from the
  operator's checkout. Confirm `build/vendor/specstory/bin/specstory --version` before starting.
- **The exposure is structural and it is the price of committing once per phase.** The committer is
  the last agent, so a crash at any earlier point loses the whole phase. That trade is deliberate.

## Release notes (the operator set the style on 2026-08-23)

He rewrote every CHANGELOG entry by hand and said future release writing follows that style. The
rules are at the top of CHANGELOG.md and they bind every entry after. In short: one or two sentences
per item, what a person can now do or what no longer goes wrong, a limit a person will hit in one
clause in the same item, nothing a person will not hit, no numbers unless the number is the point, no
build story, no file names, no gate names. The lead paragraph says what the release is about in two
or three sentences and lists nothing. The long form with every measurement and every admission
belongs in the commit body, where it already is. Release pages carry the CHANGELOG entry verbatim,
and when CHANGELOG.md changes the release pages are synced to match.

**Every item ends with its commit link, and a contributor is named on the item.** The shape is
` ([`1a2b3c4d`](https://github.com/gregce/tortie/commit/1a2b3c4d))` after the last word, with no full
stop before it, several commits as `(...), (...)`; tortie.sh draws its commit marks from exactly that,
and an item without one is drawn with no way to reach the change. A commit cannot name its own hash, so
the phase commit writes the item under `## Unreleased` and the FOLLOW-UP docs commit that writes the
running-log line adds the link. An outside contribution ends `Contributed by [Name](https://github.com/login)
in [#N](https://github.com/gregce/tortie/pull/N)` before the link, which is what the site reads to draw
its Contributors row. On 2026-09-18 the operator found 0.105.0 through 0.108.0 published with no commit
links at all, 33 items, and John Berryman unnamed on his own pull request; both were repaired after the
release was out. Before a release commit, count: every `- ` line in the entry must match
`tortie/commit/`.

## Verification (rewritten 2026-08-23 from what actually caught defects)

The old section said how MUCH to verify and never said what KIND. That is why a five item polish round
spent 64 minutes and ten app launches while a one line ruling caught the most important finding of the
day. Both axes are here now, and the second one is the governing rule.

### What actually caught something, measured over one day of phases

| What the verifier did | Where | What it caught |
| --- | --- | --- |
| Wrote its OWN detector by a different method | 123 | A second cycle detector, hand lexer and Kosaraju against the phase's AST and Tarjan. Disagreed by 3 edges, found the bug was ITS OWN, then agreed exactly |
| Attacked the ruling instead of confirming it | 128 | Refuted the stop question outright. The phase had judged the two COLDEST large files and never looked at the one with 30 commits in 6 days |
| Wrote its OWN hostile fixture | 137.1 | Twelve attack shapes the builder never tried, being svg onload, data: URIs, srcdoc, case mangled javascript: |
| Drove its own harness over REAL data | 137 | 35 real sessions across twelve providers, and one trap that leaked |
| Measured before and after on the PARENT commit | 139 | Minus 26px before and 0px after, and a rest photograph byte identical by md5 |
| Re-ran the builder's gates | 131 | npm test red, and an existing probe this phase broke and left broken |
| Read the code and reasoned about it | everywhere | Nothing, all day |

**The pattern is independence, not repetition.** Every finding above came from the verifier doing
something the builder did NOT do. Re-running the builder's own checks the builder's own way found red
gates and nothing else, which is worth its two minutes and no more.

### THE GOVERNING RULE

**The verifier must do at least one thing the builder did not.** Name it in the verdict. A verdict
whose evidence is only the builder's own checks re-run is not a verification, and a verifier that
reports approved without naming its independent step has not done the job.

The five independent methods, and pick the ones the risk earns:

| Method | Use it when | Cost |
| --- | --- | --- |
| **Re-derive independently** | A claim is computed, e.g. a count, a graph, a ratio, a parse | High, and it is the highest yield thing in this table |
| **Attack, do not confirm** | The phase concluded something, especially that it is finished or that something is impossible | Low, and it caught the biggest finding of the day |
| **Write a hostile fixture** | Anything that renders, parses or sanitizes bytes somebody else wrote | Medium |
| **Run over real data** | Anything claimed to work across agents, machines or providers | Medium, and it is the only proof of universality |
| **Measure the parent commit** | The operator reported it, or a number is claimed | Low, and it is the only honest proof a defect is fixed |

### The tier sets the BUDGET, and risk sets the tier

Answer these about the phase. Any yes takes the tier named.

- Can it lose or corrupt the person's work, being tmux, the manifest, restore or session lifecycle? **Tier 3.**
- Does it claim to work across every agent, machine or provider? **Tier 3**, and the evidence is a per row matrix over real data.
- Did the operator personally report it? **Tier 2 at least**, and the parent commit measurement is mandatory whatever the tier.
- Does it spawn a process, hold his credentials, or send his words anywhere? **Tier 3.**
- Is it invisible to a person? **Tier 2**, and the gates ARE the evidence, so the verifier re-derives rather than photographs.
- Is it a rendered surface with no new state? **Tier 2**, one app run.
- Is it copy, an icon, a token or a document? **Tier 1.**

| Tier | Budget |
| --- | --- |
| **Tier 1** | The gates. One photograph if the change is visual and cheap. No probe. |
| **Tier 2** | The gates, plus ONE app run that drives every claim in that one session, plus one independent method from the table above. |
| **Tier 3** | The gates, plus real data or a per row matrix, plus TWO independent methods, one of which is an attack, plus a fix round if any verdict is needs_work. |

### The four rules that stop the waste

1. **One app run per phase, not one per claim.** A probe launches the app once, drives every item, reads every rectangle and photograph it needs, and exits. Phase 137.2 used ten launches for five items and bought nothing a single session would have missed.
2. **Do not re-run a gate the same way twice.** Re-run the battery once to catch a red one. After that, spend the time on an independent method.
3. **Count Electrons once, at the end.** Not between every step. That bookkeeping cost 18 shell calls in one phase and prevented nothing.
4. **Mixed rounds verify per item at its own tier.** Do not promote a whole round to Tier 3 because one item earns it, and do not demote the item that earns it.

State the tier AND the independent methods in the phase brief, so the choice is deliberate and
reviewable before the work starts rather than after.

## Gates before any commit

`npm run typecheck && npm run build && npm run smoke:t1` minimum; integrators run the full battery (test,
smoke, smoke:t3, package). Commit with a conventional subject `type(scope): summary`; the phase label goes
on the first body line as `Phase N[.x]: summary`; no trailers.

Some gates run inside `npm run build` and so cannot be skipped by anything that builds: `gate:electron`,
`gate:background`, `gate:knownhosts`, `gate:checks` and `gate:contract`.

### The path-triggered gates — add the gate when the commit touches the paths

| Touching | Add | Cost | What it proves |
| --- | --- | --- | --- |
| `src/main/context/agent-context.ts`, `src/renderer/context/groups.ts` | `conformance:context` | ~1 s, spawns nothing | The per-agent precedence matrix the panel draws from, and that no row loses its model, its scope order or its reload answer |
| `agents/registry.ts`, `manifest/harvest/**`, `manifest/agents.ts`, `sessions/codex-repair.ts`, `sessions/resume-argv.ts`, `restore/**` | `conformance:resume:capture` | ~16 s, no turns, no tokens | Every registry resume claim, executably. The full `conformance:resume` roundtrip (~3 min, real turns) runs once per phase and after any agent-CLI upgrade |
| `agents/registry.ts`, `manifest/agents.ts`, `main/config/**`, `renderer/state/agents.ts` | `conformance:agents` | ~2 s, spawns nothing | An absolute create argv, a resume argv equal to the registry's byte for byte, the renderer's seed list agreeing, and the confirm hash moving for execution fields only |
| `src/main/agents/registry.ts` | `conformance:installs` | ~1 s, spawns no agent | The six shape rules of research 47 §10 — the install map's promise that nothing in it can run |
| `src/main/machines/**` | `conformance:machines` | ~2 s, no ssh, no tmux, no Electron | The confirm hash's fields, one agreement per identity, an invalid row dropped whole with the field named, `BatchMode=no` at one call site, and Tortie's own host key file named FIRST |
| `src/main/env/**`, the Phase 276 cache in `src/main/tmux/resolve.ts`, the two call sites `src/main/sessions/create-local.ts` and `src/main/restore/restore.ts`, `src/main/harness/env-watch-seed.ts` | `conformance:shellenv` | ~2 s, no Electron, no tmux, no ssh and NO SHELL | The login shell is asked once, not once per session, and the cache is OFF until the watcher is armed. Coverage as the key, the projection's fresh objects and the caller's argv order, the widening and the 256 cap, the in-flight join and its refusal, the generation stamp a drop must beat, a failed probe never cached as success and a partial answer that is; the `$SHELL` table with `??` and never `||` for `ZDOTDIR`, both watch arms, nothing recursive and nothing outside the home, the drop immediate while the re-warm is debounced and floored, and an unrelated settings write that starts no shell. It also asserts the refusals as text: the `-i` is still on the spawn, `remote-env-probe.ts` still names no cache with `REMOTE_ENV_ALLOWED` at exactly two, and no door hands a VALUE out of the slot. `ablation:p276` is the attack beside it, 32 clauses each red on the rule that owns it; `probe:p276` is the app run |
| `src/main/machines/remote-sessions.ts`, `src/main/sessions/core.ts`'s remove path | `conformance:remoteclose` | ~0.6 s, spawns nothing | A machine's `rows` and `gone` maps are disjoint, a session drawn once is drawn once, and one Remove clears the row whatever holds it |
| `src/renderer/session-manager/**`, `sessionActionGates` and the lifecycle `*Now` verbs in `src/renderer/state/resume.ts` and `sessions-slice.ts`, `src/renderer/state/session-manager-slice.ts`, `sessionMenuItems` in `src/renderer/app/session-actions.tsx`, `src/main/sessions/lifecycle-gate.ts`, `src/main/overview/activity-map.ts` | `conformance:manager` | ~1 s, one plain node, no Electron, no tmux, no ssh, no agent | The session manager never acts on a session it did not name: a batch's targets are the ids named at open, re-checked and looked up by id before each call, never grown; every press re-reads its row by id through the verb's own gate; the second click of a double click presses nothing; no DOM menu, no `setConfirm(`, no `data-session-id`, and the hard delete reached only through `removeSessionNow`; a null count is never drawn as zero and one clock never as another; a group is a folder AND its machine; the Past tab is ONE list in main's removal order and every row names the FOLDER it ran in, never its project's label, because two projects can be named alike (the operator's ruling of 2026-09-19 and the reverify that followed it). `ablation:p293` is the attack beside it, 60 ablations each red on the rule that owns it |
| `src/main/menu.ts`, `MenuActionId` in `src/shared/ipc/app.ts`, the handback unions in `src/shared/ipc/sessions.ts`, `src/renderer/state/resume.ts`, `src/main/activity/state-machine.ts` and `monitor.ts`, `src/main/restore/restore.ts`, `src/main/manifest/codecs.ts`, the `session.*` ids in `src/shared/keymap.ts` | `conformance:handback` | ~1 s, spawning only the pinned tsx | Getting back into an agent that left its shell running: one channel declared, exposed and registered once, the states and the landings agreeing in both places each is written down, no status member and no manifest column for the drop, a restore that records no witness, a rule that reads no screen, and every sentence saying what is true. The Session menu row is read BY ITS ACTION ID, comments blanked and nothing after it read, because this gate was RED FROM 25 AUGUST 2026 UNTIL PHASE 296: Phase 156 gave every row a fourth argument for its mark, the needle `'end-session')` stopped matching any line, and for 1,156 commits the gate said the menu no longer held its rows together while no row had moved — and nobody saw it, because this table had no row for the gate. `ablation:p296` is the attack beside it, 11 arms, 7 red on the sentence of the clause each breaks and 4 green, including the three shapes that broke it on 25 August |
| `src/main/activity/screen.ts`, `question.ts`, the choice half of `src/main/activity/monitor.ts`, the `choice`/`question` fields in `src/shared/ipc/sessions.ts`, `src/renderer/choice.ts`, `src/renderer/overview/ChoiceBlock.tsx` | `conformance:choices` | ~1 s, spawns NOTHING, not even tsx | Whether a blocked session is waiting on a NUMBERED CHOICE or on prose, which is what decides buttons or a text box. The detector's verdict is the ONLY screen-derived route to `needs_input` and for every agent with no hook it is the only route at all, so its own loop is pinned byte for byte with `OPT1`, `OPT2`, `HINT`, `QUEST` and the 24-row window, and the collector's generalised `OPT_ANY` may never become the verdict's clause — a tidy-up there rests the most important status in the product on something nobody has measured. Then: one spelling of the predicate with one production call site, every carried string redacted BEFORE it is clipped, the three caps and the ink bound each at one definition and one call site and none of them in the renderer, no new `SessionStatus` member, the channel's fields optional with an option's halves required, ONE composer for the question so the hook's words beat a reading of the screen, and ONE draw site all three Catch Me Up levels use, holding no button, no `role` and no `<ol>`. Comments are blanked, because three clauses read FALSE on the shipping tree until they were. The behaviour is DRIVEN in six vitest files over thirteen committed captures; `ablation:p312` is the attack beside it, 23 arms, every one red on the check that owns it, the entry's own arm first |
| `src/main/overview/**` | `conformance:overview` | ~3 s, no Electron | The per-provider slot matrix, the keep ratio, the trap count, redaction on both sides, and the store surviving a kill mid-write |
| `src/main/manifest/harvest/derived.ts`, `codex-state.ts`, `stores.ts`, `watch.ts`, `remote.ts`, `src/main/sessions/codex-repair.ts` | `conformance:derived` | ~2.6 s, reads nothing under his home | A resume id names a session and never one of its sub-agents; every descriptor declares `derivedStream`; the repair empties no row on any path |
| `src/main/watcher/` | `conformance:watcher` | ~1 s, opens no FSEvents stream | The exclusion planner never exceeds the FSEvents cap of 8 and never loses a root. `conformance:watcher:cap` (~25 s, macOS) is the measurement behind the 8 and is deliberately not in the battery |
| `src/main/credentials/`, `src/main/capabilities.ts`'s ordered disposer, `src/main/logins/ipc.ts`'s choose handler, `src/main/proc/guarded.ts` | `conformance:credentials` | ~40 s, opens no keychain | The one domain that writes a person's credential: capture, promotion, round trips, interrupted writes leaving old-or-new, the vendor's own locks, the shutdown owner, and no token byte in any answer, file or argv. Since Phase 281 its `security` is research 126's first-match model with a stray under another account planted FIRST under every vendor name, and every read, attribute read, stage, commit, discard, delete and fingerprint aimed at Claude Code's item must carry `-a` with the vendor rule's account, a login with no scoped item must commit under that account and never the stray's, a vendor name with no account must reach the runner zero times, and the 9 vendor call sites are pinned in source with each account traced back to `claudeStoreAddress`. Since Phase 304 Tortie's own vault is ONE backend on every platform, a `safeStorage`-sealed file under `<userData>/gmux/logins/kept/`, driven here over an injected seal: rule 22 round trips 4,193 bytes, 64 KB and 1 MB byte exact by sha256 with the file's bytes never the payload and no `security` argv on a put, `vault.ts` names no keychain write and `keychainWrite` has one caller outside `security.ts`, and rule 17 is the read-once legacy arm, a keychain item read through on a miss, written sealed, read back and only then deleted, with a kill or a refused delete at any step leaving at least one copy and the boot pass sweeping a duplicate; rule 21 is narrowed to the vendor's own item, the one store left that can refuse for size |
| `src/main/logins/`, `src/shared/logins.ts`, the login layer in `src/main/sessions/launch-plan.ts`, `src/main/usage/login-accounts.ts`, `src/shared/login-copy.ts` | `conformance:logins` | ~10 s, no Electron, no keychain | No file in the domain may name a vendor location or a home directory; exactly two deletion call sites, each guarded first; presence, account and `-w` never passed. Since Phase 281 presence and the meter's reader ask Claude Code's ONE item with `-a` and the vendor account and never a plain name after a scoped one, branch B answers missing, exit 44 alone is absent (driven through the shipping `keychainReader` over `/bin/sh` stand-ins for `security` the probe writes and waits for), a decomposed directory names the NFC item, and every ablation runs over sibling copies under `src/main/` whose unedited twin must read what the tree reads, because the temporary-directory copies had died on import and counted red since Phase 200. Since Phase 304 rule 19 keeps the named reason a refused switch carries out of `logins:choose` on both arms and NO ROW CARRIES A SIZE, driven over an ask that answers one: the row-label family is gone from the words file, `swap.ts` alone names the sentence, and the only store that can refuse for size is the agent's own keychain entry |
| `src/renderer/editor/redline*`, `Redline*`, `rewind.ts`, `baseline*` (rule 9's file set is DERIVED, floor 22), `src/renderer/editor/live-text.ts`, `src/main/baselines/`, `src/shared/baselines.ts`, `src/shared/prose-paths.ts`, the clipboard knob in `src/main/harness/shot.ts` | `conformance:redline` | ~33 s, no Electron | The redline's rulings, executably: both projections, the caps, the anchors, one write channel at one call site, the accept, the durable baseline, the block slide, and (rule 40, Phase 282) the press that moves on — the follower carried by IDENTITY with the index only as `landingAfterPress`'s fallback, one press at a time, the host taking the keyboard BEFORE the adoption and the hold landing after it, a key repeat that runs only `next` and `prev`, and no working model read on `live-text.ts`'s render path |
| `src/main/fs/guarded-write.ts`, the `fs:writeGuarded` registration in `src/main/fs/ipc.ts`, `FsGuardedWriteInput`/`FsGuardedWriteResult`/`READ_CAP_BYTES` in `src/shared/fs-ops.ts` | `conformance:redline-write` | ~25 s, no Electron | The channel that rewrites a person's file: four refusals, three protections, the read cap held inside the loop, and 17 ablations that must each move a reading |
| `src/renderer/editor/tab-io.ts`'s save, `adoptWritten` and `refreshRepo`, `save-write.ts`, `save-sentences.ts`, `auto-save.ts`, the typing effect in `src/renderer/editor/redline-edits.ts`, the `markDirty`/`patchTab`/eviction seam in `src/renderer/editor/store.ts`, the `fs:writeFile` and `fs:writeGuarded` registrations in `src/main/fs/ipc.ts`, the containment catch in `src/main/fs/guarded-write.ts` | `conformance:save` | ~0.4 s, writes nothing | ⌘S never writes over a file that changed on disk: every door reads first, Overwrite is never the default and is re-checked, and every refusal word has a sentence. Phase 268's rules 10 to 13 add the TIMER: auto save's module names no write and no plain door and reaches disk through `deps.save` alone, `save` and `saveInProject`'s `unguarded` arm each refuse the plain door for the auto reason BEFORE naming it (rule 11b is the symlink hole, and rule 11b asks about the ARM rather than the body, because an earlier arm testing the reason made a body-wide question answer yes over a real hole), the stop is recorded before the sentence so it is said once, the stop composes from the sentences a ⌘S already says, and rule 14 pins the ORDER in `markDirty` — the timer is armed AFTER the tab is patched dirty, because `probe:p268` measured the other order shipping a build where a burst of characters saved and a SINGLE character never did. `ablation:p268` is the attack beside it, 27 ablations each red on the rule that owns it, and since Phase 282 its restore is compared by sha256 rather than assumed. **Phase 273's rules 15 to 17 are why this gate now reads two MAIN-side files**: a sentence map that is honest above a catch that is not has separated nothing. The closed-project sentence moved to `projectClosed` BYTE FOR BYTE, is said under no other word, and `outside` stops claiming a project is closed (15); the containment catch in `guarded-write.ts` reads the stamp `paths.ts` writes and defaults to `projectsUnknown` with no literal list of causes, because a list rots the first time a cause grows a sixth failure (16); and the `fs:writeGuarded` handler's log line carries exactly `why`, `reason`, `root` and `path` and names neither `contents` nor `expect` (17). `ablation:p273` is the attack beside it, five ablations each red on the rule that owns it. **Phase 282's rules 25 to 27c are the first round in which something OTHER than a save moves `savedContents`**, which is ⌘S's own precondition: `adoptWritten`, the rewind's adoption of the bytes it just wrote, is read by matching braces and must refuse a dirty tab and a baseline that is no longer the `was` the write expected BEFORE it patches `savedContents` or replaces the buffer (25 — taking either clause out left this gate and `conformance:redline` both green at PR 28's head, and reddened only its own vitest); `refreshRepo`'s clean reload also requires `savedContents` to be what it was before that read began, beside rule 22's model identity, because a read whose descriptor was opened before the guarded write's `renameSync` answers the OLD inode and rolled a rewind back in 37 of 500 interleavings (26); and the Redline typing path marks the tab dirty synchronously BEFORE the await that loads Monaco's chunk, builds its model from a function the loader calls after it, and never applies a text typed on a picture the view has since replaced (27 to 27c) — rule 14's question asked one caller out, because a keystroke that is still React state is invisible to every refusal above it |
| `src/main/fs/folder-identity.ts`, `addProject` and the duplicate log in `src/main/sessions/core.ts`, `src/main/manifest/projects-repository.ts`, `entry()` and the root pair in `src/main/fs/file-ops.ts`, `src/main/overview/reader/paths.ts`, and every bare `realpathSync(` under `src/main/{fs,manifest,sessions,watcher,shell,overview}` | `conformance:samefolder` | ~5-7 s (4.96, 5.61 and 6.60 s measured), no Electron, no agent — but it DOES mount a case-sensitive APFS image with `hdiutil` (no sudo), detached and deleted in a `finally` | One folder is one project however it is spelled. It asks the filesystem what a folder IS — `st.dev` and `st.ino` — and never what it is called, and it drives the §8 fixture table on BOTH KINDS OF VOLUME, because case sensitivity belongs to the volume rather than to the machine and a gate that only ever sees the operator's case-insensitive boot disk cannot catch the merge danger: on a separating volume `RealName` and `realname` are two REAL folders. Rows 1 and 4 are the pair that proves the design — from one volume in one run, case reads `different` and NFC-against-NFD reads `same`, because a case-SENSITIVE APFS volume still folds normalisation and any design that asked the volume one question and inferred the other gets row 4 wrong. **NEVER CASE-FOLD A COMPARISON AND NEVER `.normalize()` A PATH** is rule 23, over a derived file set with a floor and a table of named exceptions that must each still match something. Nine ablations of the identity module, one clause each, all red, and `ablation:p274` beside it breaks the SHIPPING source thirteen ways and restores every file by sha256 in a `finally` — that second script is what caught rule 18 asserting nothing, green at the parent. `measure:p274-volumes` is the measurement and the ATTACK beside it and is deliberately not in the battery |
| `src/shared/path-doors.ts`, `path-spans.ts`, `src/main/fs/path-door.ts`, `path-open.ts`, `src/renderer/terminal/path-links.ts`, the provider registration in `TerminalPane.tsx`, the classify arm of `src/main/drop/prepare.ts`, `CREDENTIAL_FILE_NAMES` in `src/shared/preview-types.ts`, `build/p250/funnel.mts` | `conformance:pathdoors` | ~12 s, no Electron | Opening is not executing: an allowlist of kinds with the mode checked before the extension, a denylist refused by charter, the underline drawn in CELLS not string indices, and one spelling of the relative rule. Phase 253's rule 16 runs VS Code's own test rows against OUR grammar — the delimited suffix clauses (grep `path:12:text`, ranges, tsc `path(12,34)`, brackets), `[` `]` in a segment with the tokenizer balance rule, and the bare FILE-SHAPED name — attributed by upstream file and commit, one ablation per adopted clause, with the door half asserted UNCHANGED: every new spelling still ends at `decidePathDoor` |
| `src/main/fs/paths.ts` | `conformance:containment` | ~5 s, no Electron | The one containment gate every fs mutation asks, driven rather than read: the phase's whole escape checklist over a fixture holding the alias, eight symlinks, a prefix-sibling decoy, a `.git` tree, a dangling link, a loop, a mode-000 directory and a real `..notes.md`. Phase 273 splits the gate into PLACING and RESOLVING: an ABSOLUTE input that fails the lexical test is placed by `hasAncestorInsideRoot`, which climbs to the first ancestor that resolves and compares THAT to the real root, and only then takes the same walk a relative spelling has always taken — so a project opened through a symlink saves, which is issue 25. The gate pins the bound: a relative input gets no second chance, the placing block resolves nothing and reads no errno so the gate never becomes an oracle for the disk outside the project, `resolveInsideRoot` calls no `realpath` of its own and names the walk exactly once, and the leaf is still never resolved. It also pins the STAMP — one factory, every throw through it, one word per refusal — and ten ablations, each naming the rows it owns |
| `src/main/arch/skeleton.ts`'s rule P, `reading.ts`, `sentence.ts`, `tree-facts.ts`, the reading fields `map.ts` composes, `src/main/machines/remote-arch.ts`, `arch-cksum.ts` | `conformance:reading` | ~1.2 s, one plain node | The box set, rule R and every rule S sentence byte for byte, over committed fixtures; and that every module on the Architecture import allowlist is pure |
| `src/main/arch/facts/`, `src/main/arch/tree-facts.ts`, `src/main/arch/fact-parser.ts`, `src/main/symbols/{queries,calls,wrappers,extract,worker,pool,oid}.ts`, the `arch_fact*` half of `src/main/arch/db.ts`, the fact types in `src/shared/arch.ts` | `conformance:facts` | ~46 s, no Electron, no git, reads nothing under his home | The fact base's reader pinned over eight committed fixtures byte for byte, every `[ipc.invoke.channels]` entry of the contract baseline read as `IPC serves` with the wrapper pass on (231 of 231, 0 extras, the count read from the baseline), the wrapper pass's three clauses, the dedupe, the vendor filter, the domain's purity, the closed kind sets and the boundary split, and 52 ablations that must each go red. **Since Phase 263 it also drives PUBLICATION**, which no arm reached before and whose guards were therefore ablatable with this gate green: a path under the fact pass is read three times and only the outer two were compared, so a change followed by a REVERT around the parser's read left them agreeing while the parser had seen something else. Rules F1 to F4 pin the extractor's second spelling of the blob name against the fact domain's own, that `extractFile` names the buffer it parsed and `IndexedFile` carries it REQUIRED, and both publication windows driven ONE AT A TIME with a control each — ablating the base guard alone reddens only the worker window and ablating the third read alone reddens only the reader window, which is what proves the two comparisons are not redundant. `probe:p257` is the corpus run (Phase 257) |
| `src/main/arch/evidence.ts`, rule Q and `draftSkeleton` in `src/main/arch/skeleton.ts`, the regions, transports, rungs and counts in `src/main/arch/map.ts`, `factsOf`/`factFiles`/`linkCountsUnder` in `src/main/arch/db.ts`, `ARCH_EVIDENCE_RUNGS` in `src/shared/arch.ts`, `RUNG_PINS` in `src/renderer/theme/presets.ts`, `src/renderer/arch/rung.ts` | `conformance:evidence` | ~4 s, no Electron, no git, reads nothing under his home; its one write is a scratch `arch.db` under `.p258-conformance-*` at the root, removed in a `finally` | The five rungs and no sixth, the seed rule G, rule Q's regions, the transports and counts re-derived by the gate itself, the worksheet through the store's own readers, contract independence, determinism over reversed facts, purity, and `--success` on `--bg-active` at 3 on both bases, over six fixture trees and eight planted graphs WHOSE EVERY EXPECTED VALUE WAS DERIVED BY HAND FROM `build/p258/SPEC.md` rather than from the code, then 20 ablations that must each go red. `conformance:reading` rules 11 to 13 pin rule Q over the reading fixtures, the F1 draft painting every non-fold box (0 of 8 at the parent) and the eleventh hover line after the ten; `conformance:arch` pins the drafted bytes by sha256 (`--write-skeleton-pin` regenerates on purpose). `probe:p258` is the app run (Phase 258): one Electron with `agentId: null`, two `git clone --local` copies removed in a `finally`, a second Electron from `P258_PARENT_CHECKOUT` one after the other and never at once, PASS at 0 findings on every arm at HEAD and 5 at the parent. **THE INTEGRATOR'S ROUND, three things a later round will undo.** `Reading` in `ArchDrill.tsx` calls every hook ABOVE its early return: a hook placed after it made the render that has the model count one more than the render that had none, which is React #310, and the boundary above the Sidebar took the whole Architecture pane down 303 ms after it mounted in the running app while every unit suite stayed green, because each renders a face once; `src/renderer/arch/__tests__/p258-hooks-before-return.test.ts` reads the rule as text over every component under `src/renderer/arch` and is proved on the shape that shipped. The starts line has ONE composer, `archStartsLine` in `src/shared/ipc/arch-map.ts`, read by the face and the gate, and on this repository it reads `starts 7 workers, 2 threads, 1 process, 4 compose services, …` and never `starts 2 workers`, because Q5 counts this repository's own test files and the Phase 257 fixtures on purpose, so the probe holds the line against arch.db's `boundary` facts by kind and never against a literal. And F1 at the parent paints 3 of 8 boxes on the live clone, not the 0 of 8 research 118 read over the reading FIXTURE; the P arm pins fewer than every non-fold box against HEAD's 7 of 8 |
| `src/main/arch/semantic/**`, the semantic half of `src/main/arch/enrich/compose.ts` and `validate.ts`, `src/main/overview/fold/recipes.ts`'s semantic rows, `src/main/settings/store.ts`'s `sanitizeArch`, `src/renderer/arch/cite.ts`, `ArchJourneys.tsx`, `ArchClaim.tsx`, `arch-semantic.css` | `conformance:semantic` | ~1 s, spawns no agent, spends NO TOKEN | That a model's sentence is BOUNDED: every claim cites, the citation grammar refuses twelve hostile shapes, the ladder answers the rarest kind within three lines, a rung word written as a field VALUE refuses the answer whole while the same word inside an honest sentence is kept, a broken citation drops its ROW and an answer with no row left is refused, the digit rule asks for a TOKEN of the block (3 of 3 against the substring form's 1 of 3), every rate is stored and drawn beside the floor computed over the same files, a call site and a declaration are never drawn alike, no drawn string says anything stronger than a fact was found, the refresh spawns nothing, and the seven planted lies are run against the SHIPPING refusals with the CAUGHT number MEASURED into `build/fixtures/semantic/caught.json` rather than assumed — 3 of 7 today, and a build that moves it moves that file and the face in the same commit. 13 ablations, one clause each, all red. `measure:semantic` is the measurement beside it and is the ONE check in this repository that spends a token. **THE PANE HAS TWO RECIPE TABLES AND ONE CHOICE SINCE PHASE 259, and `sanitizeArch` admits a pair EITHER table names**: it asked the CONTRACT table alone, so choosing `codex`/`gpt-6-astra` through the app's own settings door read back `null/null`, every semantic ask refused `no-choice` before it reached the runner, and the codex row this phase adds could not be selected by anybody. `arch-seal.test.ts` pins it both ways, a pair only the semantic table has being kept and a model neither table gives that agent still dropped whole |
| `src/main/git/service.ts`'s `walk`, `src/main/git/parse.ts`'s `readNameStatusChunk`, `src/main/git/graph-parse.ts` | `conformance:filehistory` | ~3 s, no Electron | Every row's status, path and old path over a fixture holding a copy, a rename, a rewrite, a delete and a merge — and that a followed walk drops `--topo-order` |
| `src/renderer/scm/history-search.ts`, `src/main/git/search-args.ts`, `src/main/git/exec.ts`, the search branch of `service.ts`'s `graphLog` and `walk` | `conformance:historysearch` | ~2 s, no Electron | Every value is ONE argv element in its attached form, `--` before the pathspec and `--end-of-options` before the name, over 30 attack shapes |
| `src/main/cache/` and anything importing it | `gate:cache-policy` | ~0.1 s, spawns nothing | The policy module touches no filesystem module and names no durable path; nothing reading it calls a deletion API. `<userData>/gmux` is durable state and is never a target |
| `src/main/arch/`, `src/shared/arch.ts`, `src/shared/ipc/arch.ts` | `conformance:arch` | ~0.3 s, starts no git | No field of a contract file ever reaches a spawned argv, and an invalid row is dropped whole with the file, field and reason named |
| `src/main/arch/modules.ts`, `src/shared/ipc/arch-modules.ts`, `src/renderer/arch/ArchModules.tsx`, `arch-modules.css` | `conformance:arch:modules` | ~0.3 s, starts no git | Both caps driven exactly — 30 files draw boxes and 31 do not, 200 draw a matrix and 201 do not — and no count badge on any node |
| `src/shared/chrome-hue.ts`, `chrome-ramp.ts`, `src/renderer/theme/*`, `src/renderer/settings/AppearanceSection.tsx`, `src/renderer/terminal/theme.ts` and `capture/contrast.ts` and `capture/serialize.ts`, `src/renderer/editor/monaco-theme.ts`, `src/renderer/pierre/theme-bridge.ts`, `src/shared/window-chrome.ts`, `src/main/settings/chrome.ts`, `src/renderer/scm/graph/colors.ts`, `src/renderer/styles/tokens.css` | `conformance:hue` | **~13 min — budget for it** | Every contrast floor at every offered frame on both bases, the offered region, the text flip, the lane separations under eight CVD models, and that dark is byte identical to its pinned parent |
| `src/renderer/editor/markdown/markdown.css`, the `--space-8` and neutral values `tokens.css` hands it | `conformance:wideblocks` | ~0.3 s, no Electron | A wide block takes what its CONTENT needs — floored at the prose column, capped at twice the measure, centred on the column's axis at any used width (Phase 252) — gets the pane and not the window, the break-out reaches a direct child only, and the pane term is divided by the editor zoom; rules 14 and 15 judge the committed probe:p252 readings |
| `src/renderer/editor/markdown/window-scan.ts`, `chunk-parse.ts`, `pipeline.ts`, `large-prose.ts`, the windowed half of `markdown-impl.tsx`, `build/p254/twins.mjs` | `conformance:preview` | ~110 s, no Electron | The windowed preview draws the page the old renderer drew: the chunked render equals the whole render over this repository's markdown, both twins and one fixture per clause of the scanner's model of parse5's open elements and per way a reference definition was misread, with three documents a cut must still reach; every file that differs from the old react-markdown render sits in a pinned class, the parity shims, the `www.` residual and a 17-shape page battery taken from the Phase 255 verifier's corpus and 788 real files are pinned by name; the sanitizer still runs before Shiki; the window caps, the re-derived deferral guard (a footnote inside a quote or a list item included), the memo's own question over a changed definition and the fragment shape are pinned; a window is parsed in one task and drawn in the next — and 47 ablations, one clause each, go red on the rule that owns them. **Definitions are markdown-it's own table, never text prepended to a chunk**: the Phase 255 build prepended them, drew a lookalike line at the top of every chunk and read 160 MB of input for a 1.15 MB changelog |
| `docs/design/phone/**`, `src/main/activity/**`, `src/renderer/app/AttentionOverlay.tsx`, `src/renderer/app/status.ts`, `src/renderer/app/ConfirmDialog.tsx`, `src/renderer/overview/copy.ts`, `src/renderer/session-manager/copy.ts`, the confirm titles in `src/renderer/state/resume.ts`, `displayName` in `src/main/agents/registry.ts`, `src/main/settings/window.ts` | `conformance:phonecopy` | ~1 s, spawns nothing | Two rules in one script. **The mock may not invent a word Tortie does not say**: every user-visible string the screens draw is split at Tortie's own ` · ` and judged three ways — owned by a named module and compared byte for byte, data with its reason, or owed by a named later phase and PRINTED on every run. A segment no rule covers fails by name, and an owed string the tree has since grown fails too, so the exception list cannot rot; a ledger rule that matches nothing fails, and an owned-rule floor stops the ledger quietly emptying. It was red on its first run for real, on two drifts nobody planted: `End ‘nightly-tests’?` with curly quotes where the confirm writes ASCII, and `Grok CLI` where the registry says `Grok`. **And no line of payload in any log, ever** (Phase 311 mechanism 6): no file under `src/main/activity/` may name a log call whose arguments reach the hook body, the composed question or a capture, and `question.ts` may name no log call at all — discovered rather than listed, with a floor so the finder cannot silently stop finding. `--self-test` re-judges in-memory mutations — a curly quote straightened, a letter dropped, a status word swapped, an undeclared sentence added, an agent name the registry does not carry, a log call naming the body, a log call in the leaf, a log call naming the question — and each must go red, beside a CONTROL log call carrying a fixed reason word that must stay green, or the rule would be a ban on logging rather than a ban on logging the person's words. `P311_MOCK_DIR` points the copy half at a copy of the mock, which is how a proposed one-line screen fix is proved before the committed file is edited |
| `src/main/pocket/**`, `src/shared/ipc/pocket.ts`, `src/preload/pocket.ts`, `src/preload/index.ts` | `conformance:pocket`, `conformance:pocket:hostile` | ~0.8 s and ~3 s; no Electron, no tmux, no ssh, no agent, no token, and NOT ONE REAL INTERFACE | The first thing in Tortie anything outside this Mac can ask a question, held to its promises two different ways because neither is the other's proof. **Read**: exactly one `listen` in the domain; the host from the allowlist function alone with `0.0.0.0` nowhere and `100.64.0.0/10` named in one module; a taken port REFUSES rather than moving, which is deliberately the opposite of `hooks.ts:230-243` because a phone was told a number; the route table frozen with every path an exact string and every row a read, so the phase's zero write routes is a property of the object; no write verb, no status setter, no spawn and no credential import, which is CLAUDE.md refusals 5 and 8 read into one domain; no `Authorization` and no cookie; nothing secret in a path, because every value rides in the query; `/pair` dead outside its window; `Referrer-Policy: no-referrer` from ONE place, because a signature that leaves by `Referer` cannot be taken back; the self-origin socket destroyed BEFORE a header is read (research 127 §7 item 10: a local process of his own user sends whatever header it likes); admission closed on the first line of the stop before any await, `hooks.ts:256-316`'s shape; and no token, body or conversation line reachable from a log call. **Driven**: the hostile client stands up a door on loopback and proves every refusal answers for the RIGHT one-word reason, with the honest arms in the same table so a door that is merely off fails. **THERE WAS A THIRD CHECK AND A PAGE, AND BOTH ARE GONE ON HIS RULING OF 2026-09-22** — "lets skip the web app". `src/main/pocket/page/` was built and could not be reached under the phase's own mechanism 5, which refuses a script, a cookie, a bearer and a URL token by name, so nothing a browser can do satisfies it; the page, `conformance:pocket:page`, three rules here and five ablation arms went with it, and the seven screens it implemented stay at `docs/design/phone/` as Phase 316's to build in Swift. **Five rules were added by the fix round of 2026-09-22 and every one of them was a hole a live build walked through**: `R4` pins the table's MEMBERSHIP by sha256, because R1 pins its shape and R2 pins each row's fields and neither reads which paths exist — a fourth GET under an existing route id was green everywhere, `gate:contract` included; `R5` requires the turn limit to be clamped AT THE DOOR against the overview store's own `MAX_TURN_LIMIT`, because `listTurns` puts its limit into a SQL `LIMIT ?` with no clamp and `?limit=999999999` was measured going straight through on the one route that answers a person's conversation; `S4` reads WHICH WAY `isSelfOrigin`'s comparison points, because S2 reads only where the destroy is and inverting one `===` admitted the local socket with every gate green; `W1` requires every write and mkdir in the domain to name an owner-only mode, because the two sealed files sat at 0o600 and 0o644 and dropping the stricter one was green; and `B1` holds the bridge and the registrar together in both directions, because the preload installed a `pocket` member whose eight invokes all rejected with 'No handler registered' in the running app and the existing ipc-invoke-closure check cannot see it — it counts `handle(` calls inside a function nobody calls. **`H1` holds his ruling as a property of the tree**: no module in the domain composes an HTML document or names `text/html`, so a page cannot come back under a green gate; a round that wants one asks him for an admission a browser can satisfy first. `ablation:p313` is the attack beside both, 28 arms, one clause each, every arm red on the rule that owns it |
| `build/` — any script that starts an Electron | `gate:electron` | ~0.1 s, launches no Electron | Only `build/electron-run.mjs` hands an Electron to a spawn, its kill is inside a `finally` read by matching braces, and the population reaching it is not shrinking |
| `build/` — any script that starts a process it does not wait for | `gate:background` | ~0.1 s, spawns nothing | Every long-lived child is killed inside a `finally` that names it. Asked per START, not per file; call names are discovered per file, never listed |
| `build/` — any script that runs ssh | `gate:knownhosts` | ~0.4 s, starts no ssh | Only `build/ssh-run.mjs` hands ssh, scp, sftp or ssh-keyscan to a spawn, and `-o UserKnownHostsFile=` is emitted from one place, prepended, with Tortie's own file first |
| A `*.test.ts` added or moved under `src/`; `package.json`'s check scripts; `build/verification-checks.mjs` | `gate:checks` | ~0.1 s, spawns nothing | No `npx` on any spawn, `tsx` pinned with an integrity hash, every check script classified both ways, no test resolving a home through the passwd entry, and (Phase 262) the runtime range said once — `engines.node`, `SUPPORTED_NODE` and `.nvmrc` agreeing, with the preflight called inside `tsxCli()` |
| `package.json`'s `engines`, `.nvmrc`, `build/ts-runner.mjs`, `build/verification-checks.mjs`'s runtime table | `conformance:runtime` | ~4 s, no Electron, no tmux, no ssh | The TypeScript runner loads each module ONCE: the registry fixture reports one registration identity on every Node line found on the machine, and the declared range predicts each one's outcome. The range in `engines`, in `.nvmrc` and in the preflight is one range. `SUPPORTED_NODE` is tsx's own table, so a tsx upgrade re-measures here |
| The shared IPC contract, the manifest schema, a `gmux.*` storage key, a `GMUX_*` env name, a harness smoke mode | `gate:contract` | ~0.8 s, opens no live manifest | The emitted inventory byte-compares against `docs/audits/contract-baseline.txt` |

### Probes and app runs — none of these is in the commit battery

They cost minutes and an Electron, so they run once per phase rather than once per commit. Each takes one
scratch profile, a scratch `HOME` and its own tmux socket, ended and unlinked in a `finally`.

| Run | When | Cost |
| --- | --- | --- |
| `probe:p167` | Changed how sessions attach, split or close, or how a surface mounts or unmounts | 10–20 min |
| `probe:controldeadline` | `src/main/tmux/control-client.ts`, `src/main/machines/context.ts`, `src/main/machines/control-plane.ts` | ~37 s |
| `conformance:resume` | Once per phase and after any agent-CLI upgrade | ~3 min, real turns |
| `conformance:watcher:cap` | The FSEvents exclusion cap itself | ~25 s, macOS only |
| `probe:p260` | `src/renderer/editor/store.ts`'s project scoping, `projects-slice.ts`'s `closeProject`, the shell seam's `editorCloseProjectTabs`, or `MAX_TABS` eviction | minutes, one Electron over three scratch projects |
| `probe:p268` | `src/renderer/editor/auto-save.ts`, the `reason` arms of `tab-io.ts`, or the auto-save seam in `store.ts` | minutes, one Electron over one scratch project, with a `/bin/sh` writing the file underneath the buffer |
| `probe:p276` | `src/main/env/**`, the cache in `src/main/tmux/resolve.ts`, or `src/main/harness/env-watch-seed.ts` | ~80 s app arm, ~125 s boot arm; one Electron at a time, a scratch HOME whose `.zshrc` sleeps 900 ms, and `$SHELL` pointed at a wrapper that counts login shells from OUTSIDE the app. `P276_BOOT_ONLY=1` is the interleaved boot arm, `P276_PARENT_CHECKOUT` points either arm at a parent build |
| `probe:p292` | `src/renderer/terminal/scroll/**`, `src/renderer/terminal/keys/pane-report.ts`, `src/main/tmux/scroll.ts`, and AFTER ANY XTERM UPGRADE with `P292_ARMS=d,f`: a resize and a return to a session must leave a scrolled-back reader where they were, and a report the new xterm sends that `pane-report.ts` does not recognise goes out as typing and throws them to the bottom | ~65 s, one Electron and a scratch tmux socket; `GMUX_TMUX_BIN` runs it on another tmux, `P292_CHECKOUT` against a parent build |
| `probe:p311` | `src/main/activity/question.ts`, `noteHookEvent`/`uiUpdate`/`questionOnWire` in `src/main/activity/monitor.ts`, the `question` field on `SessionActivityInfo`, `AttentionRowBody` and `attentionRowLabel`, or the `needs_input` arm of `src/renderer/overview/line.ts` | ~2 min, ONE Electron, its own scratch profile, HOME and tmux socket, ended in the helper's `finally`. The `claude` on that HOME's PATH is a nine line `/bin/sh` printing the two COMMITTED dialog fixtures, so NO VENDOR PROCESS RUNS and NO TOKEN IS SPENT; the hook half is real, POSTed to the app's own loopback route with the 128-bit token read out of the settings file the app itself wrote. It reads what a blocked row SAYS before and after the hook, the drawn rectangle and the row's own label, the Catch Me Up line and the question under it, the 200 cap, redaction on the drawn row, a second committed dialog that fires no hook, a control shell row, and `app.log` afterwards, which must hold no byte of any body. `P311_CHECKOUT` points it at a parent build |
| `measure:semantic` | Phase 259's measurement. `--dry-run` is what a builder and a verifier run: one Electron, the SHIPPED `arch:enrich` channel over a scratch clone, the refusal read back, NO agent and no token. Its live mode is the integrator's and is the only step in this repository that spends one, under the operator's narrow lift of 2026-09-12 | minutes, one Electron |
| `probe:p<N>` | The app run named in phase N's own entry | minutes |

Every probe is declared in `package.json` and carries its own header saying what it drives, what it
refuses, and which environment variables it needs — read that header before running one. Most also have an
account in their phase's backlog entry: `grep -n "probe:p<N>" docs/BACKLOG.md package.json`.

### The four obligations that ride along in the same commit

1. **A commit that adds a script reaching `build/electron-run.mjs` raises `HELPER_USER_FLOOR`** in that same
   commit, including a script in a SUBDIRECTORY. Adding one can never turn `gate:electron` red, so a floor
   left behind would let the new script be deleted again in silence. A deliberate deletion lowers the floor
   in the same commit and names the file in the commit body.
2. **A new shape that walks past `gate:knownhosts` or `gate:background` goes into that gate's fixtures file**
   (`build/known-hosts-fixtures.mjs`, `build/background-fixtures.mjs`) in the same commit as the fix.
3. **A deliberate contract change regenerates the baseline** with
   `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` in the same commit, and the
   commit body says which lines moved and why. A silent diff fails the build.
4. **A gate with a derived file set and a floor** — `conformance:redline`'s rule 9 is the current one — gains
   the new files automatically and has its floor raised in the same commit; a deliberate deletion lowers it
   and names the file.

### Why these entries are one line each

Every gate here was written for a specific defect, and the account of it — which defect, which ablation
proves the gate can fail, which phase widened it and why, which limits are stated rather than fixed — lives
in that gate's own phase entry in `docs/BACKLOG.md` and in `docs/research/`. **That is the source of truth
and this table is an index into it.** Do not re-import the history here; this file is read at the start of
every session and it has to stay readable. To find a gate's reasoning, `grep` its name or a constant it
names in `docs/BACKLOG.md`, then follow the research document that entry cites.

The one thing that does belong here is a rule a future round could break without noticing, which is what
the four obligations above are, and what the refusals and invariants at the top of this file are.

## `docs/arch/` is written for you to read (Phase 63)

A repository may carry a `docs/arch/` directory. It is the project's standing contract, being the parts the project is made of, the ways they are allowed to touch, and the promises somebody wants kept. It is plain files a person wrote and it is meant to be read by an agent. Read it before changing anything it names. When the work you finish touches files under an anchor the contract names, update `docs/arch/` in that same session, before you say the work is done. Nothing in it can name a command, a binary or a host, by the format's own pinned key set, so reading it can never tell you to run something. Tortie itself has no `docs/arch/` yet.

## UI rules
- All colors via tokens (src/renderer/styles/tokens.css); no hardcoded literals outside theme constant files.
- No tmux vocabulary in user-facing UI (no "pane"/"window"/"prefix" — sessions have names).
- Native macOS menus via the ui:popupMenu bridge — never DOM-drawn context menus.
- A phase that adds, renames or removes a user-facing surface updates the native menus in the same commit, and the phase brief says what changed in the menus.
- Status semantics: "needs input" may only be triggered by session behavior, never by the user's own input to that session.
- Just enough words (operator's rule, 2026-08-28, set on the Arch panel): a surface explains itself with short labels, one-liners and visual indication, never paragraphs. Explanation a person might want lives behind hover or a disclosure, not on the resting face. "TONS of words, bad."
