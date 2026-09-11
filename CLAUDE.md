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
| `src/main/machines/remote-sessions.ts`, `src/main/sessions/core.ts`'s remove path | `conformance:remoteclose` | ~0.6 s, spawns nothing | A machine's `rows` and `gone` maps are disjoint, a session drawn once is drawn once, and one Remove clears the row whatever holds it |
| `src/main/overview/**` | `conformance:overview` | ~3 s, no Electron | The per-provider slot matrix, the keep ratio, the trap count, redaction on both sides, and the store surviving a kill mid-write |
| `src/main/manifest/harvest/derived.ts`, `codex-state.ts`, `stores.ts`, `watch.ts`, `remote.ts`, `src/main/sessions/codex-repair.ts` | `conformance:derived` | ~2.6 s, reads nothing under his home | A resume id names a session and never one of its sub-agents; every descriptor declares `derivedStream`; the repair empties no row on any path |
| `src/main/watcher/` | `conformance:watcher` | ~1 s, opens no FSEvents stream | The exclusion planner never exceeds the FSEvents cap of 8 and never loses a root. `conformance:watcher:cap` (~25 s, macOS) is the measurement behind the 8 and is deliberately not in the battery |
| `src/main/credentials/`, `src/main/capabilities.ts`'s ordered disposer, `src/main/logins/ipc.ts`'s choose handler, `src/main/proc/guarded.ts` | `conformance:credentials` | ~30 s, opens no keychain | The one domain that writes a person's credential: capture, promotion, round trips, interrupted writes leaving old-or-new, the vendor's own locks, the shutdown owner, and no token byte in any answer, file or argv |
| `src/main/logins/`, `src/shared/logins.ts`, the login layer in `src/main/sessions/launch-plan.ts`, `src/main/usage/login-accounts.ts`, `src/shared/login-copy.ts` | `conformance:logins` | ~4 s, no Electron | No file in the domain may name a vendor location or a home directory; exactly two deletion call sites, each guarded first; presence, account and `-w` never passed |
| `src/renderer/editor/redline*`, `Redline*`, `rewind.ts`, `baseline*` (rule 9's file set is DERIVED, floor 22), `src/main/baselines/`, `src/shared/baselines.ts`, `src/shared/prose-paths.ts`, the clipboard knob in `src/main/harness/shot.ts` | `conformance:redline` | ~20 s, no Electron | The redline's rulings, executably: both projections, the caps, the anchors, one write channel at one call site, the accept, the durable baseline, and the block slide |
| `src/main/fs/guarded-write.ts`, the `fs:writeGuarded` registration in `src/main/fs/ipc.ts`, `FsGuardedWriteInput`/`FsGuardedWriteResult`/`READ_CAP_BYTES` in `src/shared/fs-ops.ts` | `conformance:redline-write` | ~25 s, no Electron | The channel that rewrites a person's file: four refusals, three protections, the read cap held inside the loop, and 17 ablations that must each move a reading |
| `src/renderer/editor/tab-io.ts`'s save, `save-write.ts`, `save-sentences.ts`, the `fs:writeFile` and `fs:writeGuarded` registrations in `src/main/fs/ipc.ts` | `conformance:save` | ~0.3 s, writes nothing | ⌘S never writes over a file that changed on disk: every door reads first, Overwrite is never the default and is re-checked, and every refusal word has a sentence |
| `src/shared/path-doors.ts`, `path-spans.ts`, `src/main/fs/path-door.ts`, `path-open.ts`, `src/renderer/terminal/path-links.ts`, the provider registration in `TerminalPane.tsx`, the classify arm of `src/main/drop/prepare.ts`, `CREDENTIAL_FILE_NAMES` in `src/shared/preview-types.ts`, `build/p250/funnel.mts` | `conformance:pathdoors` | ~12 s, no Electron | Opening is not executing: an allowlist of kinds with the mode checked before the extension, a denylist refused by charter, the underline drawn in CELLS not string indices, and one spelling of the relative rule. Phase 253's rule 16 runs VS Code's own test rows against OUR grammar — the delimited suffix clauses (grep `path:12:text`, ranges, tsc `path(12,34)`, brackets), `[` `]` in a segment with the tokenizer balance rule, and the bare FILE-SHAPED name — attributed by upstream file and commit, one ablation per adopted clause, with the door half asserted UNCHANGED: every new spelling still ends at `decidePathDoor` |
| `src/main/arch/skeleton.ts`'s rule P, `reading.ts`, `sentence.ts`, `tree-facts.ts`, the reading fields `map.ts` composes, `src/main/machines/remote-arch.ts`, `arch-cksum.ts` | `conformance:reading` | ~1.2 s, one plain node | The box set, rule R and every rule S sentence byte for byte, over committed fixtures; and that every module on the Architecture import allowlist is pure |
| `src/main/git/service.ts`'s `walk`, `src/main/git/parse.ts`'s `readNameStatusChunk`, `src/main/git/graph-parse.ts` | `conformance:filehistory` | ~3 s, no Electron | Every row's status, path and old path over a fixture holding a copy, a rename, a rewrite, a delete and a merge — and that a followed walk drops `--topo-order` |
| `src/renderer/scm/history-search.ts`, `src/main/git/search-args.ts`, `src/main/git/exec.ts`, the search branch of `service.ts`'s `graphLog` and `walk` | `conformance:historysearch` | ~2 s, no Electron | Every value is ONE argv element in its attached form, `--` before the pathspec and `--end-of-options` before the name, over 30 attack shapes |
| `src/main/cache/` and anything importing it | `gate:cache-policy` | ~0.1 s, spawns nothing | The policy module touches no filesystem module and names no durable path; nothing reading it calls a deletion API. `<userData>/gmux` is durable state and is never a target |
| `src/main/arch/`, `src/shared/arch.ts`, `src/shared/ipc/arch.ts` | `conformance:arch` | ~0.3 s, starts no git | No field of a contract file ever reaches a spawned argv, and an invalid row is dropped whole with the file, field and reason named |
| `src/main/arch/modules.ts`, `src/shared/ipc/arch-modules.ts`, `src/renderer/arch/ArchModules.tsx`, `arch-modules.css` | `conformance:arch:modules` | ~0.3 s, starts no git | Both caps driven exactly — 30 files draw boxes and 31 do not, 200 draw a matrix and 201 do not — and no count badge on any node |
| `src/shared/chrome-hue.ts`, `chrome-ramp.ts`, `src/renderer/theme/*`, `src/renderer/settings/AppearanceSection.tsx`, `src/renderer/terminal/theme.ts` and `capture/contrast.ts` and `capture/serialize.ts`, `src/renderer/editor/monaco-theme.ts`, `src/renderer/pierre/theme-bridge.ts`, `src/shared/window-chrome.ts`, `src/main/settings/chrome.ts`, `src/renderer/scm/graph/colors.ts`, `src/renderer/styles/tokens.css` | `conformance:hue` | **~13 min — budget for it** | Every contrast floor at every offered frame on both bases, the offered region, the text flip, the lane separations under eight CVD models, and that dark is byte identical to its pinned parent |
| `src/renderer/editor/markdown/markdown.css`, the `--space-8` and neutral values `tokens.css` hands it | `conformance:wideblocks` | ~0.3 s, no Electron | A wide block takes what its CONTENT needs — floored at the prose column, capped at twice the measure, centred on the column's axis at any used width (Phase 252) — gets the pane and not the window, the break-out reaches a direct child only, and the pane term is divided by the editor zoom; rules 14 and 15 judge the committed probe:p252 readings |
| `src/renderer/editor/markdown/window-scan.ts`, `chunk-parse.ts`, `pipeline.ts`, `large-prose.ts`, the windowed half of `markdown-impl.tsx`, `build/p254/twins.mjs` | `conformance:preview` | ~110 s, no Electron | The windowed preview draws the page the old renderer drew: the chunked render equals the whole render over this repository's markdown, both twins and one fixture per clause of the scanner's model of parse5's open elements and per way a reference definition was misread, with three documents a cut must still reach; every file that differs from the old react-markdown render sits in a pinned class, the parity shims, the `www.` residual and a 17-shape page battery taken from the Phase 255 verifier's corpus and 788 real files are pinned by name; the sanitizer still runs before Shiki; the window caps, the re-derived deferral guard (a footnote inside a quote or a list item included), the memo's own question over a changed definition and the fragment shape are pinned; a window is parsed in one task and drawn in the next — and 47 ablations, one clause each, go red on the rule that owns them. **Definitions are markdown-it's own table, never text prepended to a chunk**: the Phase 255 build prepended them, drew a lookalike line at the top of every chunk and read 160 MB of input for a 1.15 MB changelog |
| `build/` — any script that starts an Electron | `gate:electron` | ~0.1 s, launches no Electron | Only `build/electron-run.mjs` hands an Electron to a spawn, its kill is inside a `finally` read by matching braces, and the population reaching it is not shrinking |
| `build/` — any script that starts a process it does not wait for | `gate:background` | ~0.1 s, spawns nothing | Every long-lived child is killed inside a `finally` that names it. Asked per START, not per file; call names are discovered per file, never listed |
| `build/` — any script that runs ssh | `gate:knownhosts` | ~0.4 s, starts no ssh | Only `build/ssh-run.mjs` hands ssh, scp, sftp or ssh-keyscan to a spawn, and `-o UserKnownHostsFile=` is emitted from one place, prepended, with Tortie's own file first |
| A `*.test.ts` added or moved under `src/`; `package.json`'s check scripts; `build/verification-checks.mjs` | `gate:checks` | ~0.1 s, spawns nothing | No `npx` on any spawn, `tsx` pinned with an integrity hash, every check script classified both ways, and no test resolving a home through the passwd entry |
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
