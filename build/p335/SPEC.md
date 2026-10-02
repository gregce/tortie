# Phase 335 — a smoke run starts `agy --version`, which no run may start — SPEC

Written at `fd03ef1c` in `/private/tmp/wt-p335` (origin/main). The charter is the Phase 335 entry
(`docs/BACKLOG.md:39245`) and the operator's standing rule of 2026-09-29: Gemini, Qwen, Antigravity and Grok are never
started by any run, not even `--version`, because each updates itself on start; Droid is hidden the same way
(`build/hidden-agents.mjs`, `HIDDEN_AGENT_IDS`). Every file the entry cites was re-read at this head. Nothing was run to
write this file: no smoke, no Electron, no agent.

| | |
| --- | --- |
| Subject | `fix(harness): a harness launch never version-probes an agent the probes may not start` |
| First body line | `Phase 335: the harness launch honours the hidden agents` |
| Semver | Patch, unreleased. Invisible to a person |
| Lane | Build: Spec → Build (ONE builder) → Verify → [Fix → Reverify] → Commit |
| Tier | **2**: invisible to a person, so the gates are the evidence; the one independent method is **the parent measured under a process sampler** (§11) |
| Menus | **No change.** No user-facing surface is added, renamed or removed |
| Contract | **No change.** No env name, no smoke mode, no channel; `docs/audits/contract-baseline.txt` does not move |
| `HELPER_USER_FLOOR` | **Stays 161.** No script reaching `build/electron-run.mjs` is added |
| CHANGELOG | **No item.** Nothing a person sees or hits |

## 1. The answer first

1. **Mechanism 1, held in the app.** In a launch where `isIsolatedLaunch(process.env)` is true (`GMUX_SMOKE` or
   `GMUX_SHOT` set, `src/main/harness/launch-gate.ts:89`), the detection scan still resolves every binary, reads every
   store and every interpreter line, but **starts no version probe** for any agent, unless the running harness mode
   NAMED that agent before the scan. One predicate, `versionProbeHeld`, is asked in front of every spawn detection makes
   (the primary probe with its fallback and identity, and every shadowed copy). In every other launch it answers `false`
   as its first statement, so an ordinary launch's detection runs exactly the probes it runs today.
2. **Two modes name agents, because two modes read a version.** The shadow smoke names `droid` **inside its own
   profile only** (its two planted copies; a real `droid` installed later stays unprobed); the resume conformance names
   the agents it was asked for (`cfg.agents`), before the core boots, as it already restricts the table. Nothing else
   names anything, so the create smoke, the verify smoke, the T3 smokes, the basic smoke and every `GMUX_SHOT` launch
   probe no agent at all.
3. **A gate, `conformance:harnessprobes`, inside `npm run build`.** It reads the source with comments blanked and holds
   the predicate, the hold in front of every spawn, the empty default, the two callers and their order, and that no
   harness or conformance file spawns a version flag of its own. It runs its own ablations on every invocation. Because
   every smoke script starts with `npm run build`, no smoke can run on a tree where a harness mode slipped past it.
4. **No change to boot order, the overlay, `dispatchHarness`, the runners, the registry or the hidden list.**

## 2. The tree at this head, re-read

| What | Where, at `fd03ef1c` |
| --- | --- |
| The harness door | `src/main/index.ts:508` `if (await dispatchHarness({ createWindow })) return;` |
| The overlay's boot read | `src/main/index.ts:543` `void initAgentOverlay()`, below the door, so no `GMUX_SMOKE` mode ever installs it |
| The overlay in a SHOT launch | `src/main/harness/index.ts:649-653`: the `GMUX_SHOT` branch AWAITS `initAgentOverlay()` before `runShot` (Phase 23 fix round) |
| The table source | `src/main/agents/detection.ts:94-116` `setAgentTableSource` / `COMPILED_TABLE`; the overlay pushes its merged table at `src/main/config/store.ts:378` |
| The one spawn | `detection.ts:261` `execProbe` → `runGuarded` (`:267`), counted by `probeCount` (`:254`, `versionProbeCount()` `:257`) |
| The primary probe | `detection.ts:318` `runVersionProbe` (args, then `fallbackArgs`, then the `identitySubstring` judgment) |
| Where both are called | `detection.ts:431` `detectOne`: `const versionP =` at `:500-503`, the shadowed copies at `:507-517` |
| The scan | `detection.ts:553` `scanAgents`, memoised by `listDetectedAgents` (`:587`); `rescanAgents` `:618` |
| The boot warm | `detection.ts:609` `warmDetectionAtBoot`, called at `src/main/sessions/core.ts:1397` with the manifest's rows; it scans only when no row a person would see exists |
| The demand path | `src/main/agents/index.ts:120-121` `agents:list` / `agents:rescan`; renderer `ensureScan` (`src/renderer/settings/settings-store.ts:374`) from `NoSessions` (`src/renderer/app/EmptyStates.tsx:213`), Settings, Create Session, the quick menu, the shortcuts overlay |
| Core boot from a window | `src/main/ipc.ts:122` `sessions:list` awaits `getGmuxCore()`, so any harness that loads the app's own renderer boots the core and reaches the warm |
| Restore's read | `src/main/restore/restore.ts:617` `liveAgentVersion`, called at `:1153` only when the row recorded an `agentVersion` |
| The field | `src/main/agents/registry.ts:497` `versionProbe: VersionProbe | null` |
| The predicates | `src/main/harness/launch-gate.ts:37` `isHarnessLaunch` (four terms), `:67` `probesRequested`, `:89` `isIsolatedLaunch` (exactly `GMUX_SMOKE` and `GMUX_SHOT`, pinned "must stay two terms" by `src/main/harness/__tests__/launch-gate.test.ts:104-133`) |
| Shadow smoke | `src/main/harness/shadow.ts`: `userData` `:90`, `writeShim` x2 `:106-107`, `getGmuxCore` `:131`, `rescanAgents` `:224`, the version assertion `:235` (`'0.0.0-shadow'`) |
| Resume conformance | `src/main/conformance/resume.ts:865` `setAgentTableSource(() => conformanceDetectionTable(cfg.agents));`, `:870` `getGmuxCore()`, `:884` `listDetectedAgents()` for the report's versions |
| p331's pins on that line | `src/main/conformance/__tests__/p331-harness.test.ts:221-244` (set before boot, exactly one `setAgentTableSource(`); `build/p331/ablation.mjs:257` deletes that exact line (arm H3) |
| Hidden ids | `build/hidden-agents.mjs` `HIDDEN_AGENT_IDS` = gemini, qwen, antigravity, grok, droid; binaries `gemini`, `qwen`, `agy`, `grok`, `droid` |
| Registry binaries | claude `claude`; cursor `cursor-agent`; codex `codex`; gemini `gemini`; droid `droid`; deepseek `codewhale`, `codew`, `deepseek`; antigravity `agy`; muse `muse`; qwen `qwen`; pi `pi`; omp `omp`; grok `grok`; opencode `opencode`; cursoride and copilotide carry `versionProbe: null` |
| Runners | `build/harness-socket.mjs`, `build/smoke-standalone.mjs`, `build/electron-run.mjs`: none writes an `agents.json` into a smoke profile |
| `HELPER_USER_FLOOR` | `build/assert-electron-teardown.mjs:382`, 161 |

## 3. Where the entry is wrong or stale at this head

1. **"`dispatchHarness` returns before the configuration overlay store is installed."** True for every `GMUX_SMOKE`
   mode. Not for `GMUX_SHOT`: its branch awaits `initAgentOverlay()` before the window (`harness/index.ts:649`), so a
   SHOT profile's `agents.json` is honoured today. What a SHOT launch lacks is the file: 85 scripts under `build/` name
   `GMUX_SHOT` and almost all predate the rule of 2026-09-29, so each probes every installed agent. The hold covers SHOT
   too (the entry's Semver line names it).
2. **"Although the quiet-agents file had been written into the harness profile."** A `GMUX_SMOKE` launch never reads
   it, and the battery's runners write none (`harness-socket.mjs`, `smoke-standalone.mjs`). So mechanism 2 alone would
   NOT stop `npm run smoke:t1`: every runner would also have to write the file, which the entry rules out ("the guard
   lives in the app"). This is the deciding reason in §5.
3. **"Whether `smoke` and `smoke:t3` do the same is the spec's first measurement."** This spec ran nothing. §4 predicts
   from the code; the verifier measures it at the parent (§11).
4. **"Unless a smoke mode names the agent it needs."** From the code, exactly two modes read an agent's version: the
   shadow smoke (`shadow.ts:235`) and the resume conformance (`resume.ts:884-888`). No mode in the landing battery needs
   one. §6 names both and no other.
5. **The first body line says "honours the hidden agents".** Under mechanism 1 the app learns no list of hidden agents
   (the entry forbids a new agent rule); it honours them by probing none in a harness launch. The words are the entry's
   and stay.

## 4. Which harness launches reach detection and its version probe, from the code

Three doors lead to a scan, and every scan at the parent spawns `--version` for each resolved agent with a
`versionProbe` (and for up to four shadowed copies of each):

- **The boot warm**: any mode that calls `getGmuxCore()` while the profile holds no row a person would see. A fresh
  harness directory always does, so the first leg of almost every mode scans.
- **The app's own window**: a mode that loads the renderer (`createWindow`, `runShot`) gets `sessions:list` (boots the
  core, so the warm) and, when `NoSessions`, Settings or Create Session mounts, `ensureScan` → `agents:list`.
- **By name**: `capture-remote.ts:280` (`listDetectedAgents`), `shadow.ts:224` (`rescanAgents`), `resume.ts:884`
  (`listDetectedAgents`, over its restricted table), and restore's `liveAgentVersion` for a row that recorded a version.

| Mode (`GMUX_SMOKE=`) | npm script(s) | Door(s) at the parent | Needs a version? |
| --- | --- | --- | --- |
| `basic` | `smoke`; also the packaged-app check in `durability.yml` | window → `sessions:list` → warm (empty profile); `ensureScan` only if `NoSessions` mounts. Exits at `app.exit(0)` within seconds, so whether a probe SPAWNS first is timing: **predicted likely, measured in §11** | no |
| `create` | `smoke:create`, `smoke:t1` | warm (fresh profile) → **one round of probes** (the 316.6 finding: one `agy --version`) | no (creates `shell`) |
| `verify` | `smoke:verify`, `smoke:t1` | none: the `smoke-keeper` row is `running`, so no warm; no app window (`receiveTermBytes` opens a blank hidden window) | no |
| `t3-prep` | `smoke:t3` | warm (fresh profile) → **one round** | no |
| `t3-verify` | `smoke:t3` | none: rows exist; restore skips `liveAgentVersion` because both rows were created as `shell` (not a registry row), so `agentVersion` is absent (`codecs.ts:798`) | no |
| `quit`, `shutdown-refusal`, `identity`, `agent`, `capture`, `p269-env`, `restore-bare`, `reconstruct`, `power`, `fault-work`, `remote-sessions`, `p93-remote-clear`, `p117-prep`, `p118-prep`, `remote-matrix` | `smoke:quit`, `smoke:shutdown`, `smoke:identity`, …, `smoke:matrix` | warm on a fresh profile (first leg); the verify legs (`p117-verify`, `p118-verify`, `fault-survey`) boot with rows and skip it | no |
| `quit-doors`, `p163-capture`, `partition` | `smoke:quitdoors`, `probe:p163`, `smoke:partition` | warm, plus the app window for the first two | no |
| `capture-remote` | `smoke:capture:remote` | warm, window, and `listDetectedAgents` by name (it reads `installed`, not `version`) | no |
| `p64-paste-matrix` | `probe:p64` | warm; and it STARTS every launchable agent as a session unless `GMUX_P64_AGENTS` narrows it (§15) | no |
| `shadow` | `smoke:t3:shadow` | warm and `rescanAgents` → every agent probed, its two `droid` copies among them | **yes**: `droid`'s shadowed copy must read `0.0.0-shadow` |
| `conformance-resume` | `conformance:resume`, `:capture`, `:specstory`, `smoke:t3:agent` | warm and `listDetectedAgents`, over `cfg.agents` only since Phase 331 | **yes**: the report's `versions` line |
| `migrate`, `refusal`, `config`, `machines`, `exec-plane`, `procid`, `shim`, `p156-menus` | `smoke:migrate`, … | no core boot found in the mode's file; no app window. Reach no scan | no |
| `GMUX_SHOT` (any) | `shot` and the photograph probes | overlay installed first, then the seeds (some boot the core) and the app window → warm and `ensureScan` | no probe found that reads a version (searched `build/` for agent-version reads in SHOT launches: `p275`/`p276` stand-ins answer `--version` only "so a card draws", and with no probe the card still draws, `installed` being the resolved binary) |

**Prediction for the battery at the parent:** `smoke:t1` one round (from `create`), `smoke:t3` one round (from
`t3-prep`), `smoke` zero or one round depending on whether the warm's PATH capture finishes before `app.exit(0)`.
**At HEAD:** every one of those scans still runs and resolves binaries, and spawns no agent at all.

## 5. The choice: mechanism 1, with the reasons

1. **Only mechanism 1 fixes the battery as the battery runs.** The smoke profiles carry no `agents.json` (§3.2), so
   installing the overlay earlier would honour a file that is not there. Making it work would mean every runner writes
   the hidden-agents file, which moves the guard out of the app and into every script that will ever launch one.
2. **Mechanism 1 changes no ordinary launch.** Its only new branch is reachable when `isIsolatedLaunch` is true, and a
   person's launch never sets `GMUX_SMOKE` or `GMUX_SHOT` (a launch that does is dispatched into a harness, takes the
   mock keychain and skips the single-instance lock already). Mechanism 2 moves boot order: `initAgentOverlay` creates
   the config directory, seeds the guide and arms a watcher, and running it above `dispatchHarness` would either put it
   above the manifest refusal screen for every person (a boot-order change) or run it for harness modes that measure
   exactly that watcher themselves (`quit` proves the `agents.json` watcher live; `config` and `machines` drive the
   confirm gates with `GMUX_CONFIG_ROOT`).
3. **Mechanism 1 adds no contract name.** No env variable, no mode, no channel. The naming is a function call in the
   two modes that need it, and the predicate is the existing `isIsolatedLaunch`.
4. **Default-deny is what stops a future mode.** A mode written next year gets no version probe unless it names one,
   and the gate (§8) turns red the moment a third caller names anything.

Why `isIsolatedLaunch` and not `isHarnessLaunch`: the entry names `GMUX_SMOKE` and `GMUX_SHOT`, which are exactly the
two launches `dispatchHarness` owns. `GMUX_PROBES` and `GMUX_UPDATE_REHEARSAL` launches go through normal startup with
the overlay installed, so the hidden-agents file every recent probe writes already guards them; `GMUX_PROBES=1` is also
what a person driving the dev app by hand sets (`launch-gate.ts:63-65`). They are left as they are.

## 6. The mechanism

**M1 — the predicate.** In `src/main/agents/detection.ts`, beside `versionProbeCount`:

```ts
import { isIsolatedLaunch } from '../harness/launch-gate';

export interface HarnessVersionProbes {
  /** Registry ids this harness mode reads a version of. */
  readonly agents: readonly string[];
  /** When set, a named agent is probed only for a copy whose REAL path lies under this directory. */
  readonly within?: string;
}

export function nameHarnessVersionProbes(named: HarnessVersionProbes): void   // M3
export function versionProbeHeld(agentId: string, path: string, env: NodeJS.ProcessEnv = process.env): boolean
```

`versionProbeHeld` answers, in this order:
1. `if (!isIsolatedLaunch(env)) return false;` — the FIRST statement, so an ordinary launch reads nothing else.
2. `true` when `agentId` is not among the named agents.
3. `false` when the naming has no `within`.
4. Otherwise `true` unless `realOf(path)` lies strictly under the real path of `within` (computed once, in
   `nameHarnessVersionProbes`, with the module's own `realOf`). "Strictly under" is the `realpath-under` idiom already in
   `signatureMatches` (`detection.ts`, `startsWith(dir.endsWith('/') ? dir : dir + '/')`); extract it into one local
   helper both use rather than writing it twice. No case folding, no `.normalize()`. A symlink inside `within` that
   points outside it is held.

**M2 — the hold in front of every spawn.** In `detectOne`:

- `const versionP = probe === null || versionProbeHeld(entry.id, binPath) ? Promise.resolve({ version: null,
  identityFailed: false }) : runVersionProbe(binPath, probe, userPath);` — the held answer is exactly today's answer for
  a row with no probe.
- In the `shadowPaths.map(` callback: `if (probe === null || versionProbeHeld(entry.id, path)) return { path, version:
  null };` before `execProbe(`.
- Nothing else in `detectOne` moves: `storeDetected`, `binPath`, `realPath`, the shadowed PATHS, `checkAgentBinary`,
  `runtime`, `installKind`, `overridden`, the parallelism and the order of the three awaits. A held row answers
  `installed: true` with a resolved binary, `version: null`, its shadowed copies listed with `version: null`.
- `execProbe` and `runVersionProbe` are not changed and gain no caller.

**M3 — the naming.** A module-level binding initialised to `{ agents: [], within: none }`. `nameHarnessVersionProbes`
is the only assignment to it after its declaration; it copies the array and stores the real path of `within`.
`resetDetectionCache` does not touch it (narrowing back to the default is `nameHarnessVersionProbes({ agents: [] })`,
which is what the tests do). Calling it in an ordinary launch has no effect, because step 1 answers first. Re-export
`nameHarnessVersionProbes`, `versionProbeHeld` and the type from `src/main/agents/index.ts` beside
`warmDetectionAtBoot`.

**M4 — the shadow smoke names its own copies.** In `src/main/harness/shadow.ts`, on its own statement immediately after
the two `writeShim(` lines (`:106-107`) and before `getGmuxCore()` (`:131`):
`nameHarnessVersionProbes({ agents: ['droid'], within: userData });` — imported through `'../agents'` as
`rescanAgents` already is. The boot warm and the step 7 rescan then probe `d1/droid` and `d2/droid` and nothing else;
every other agent this Mac has is held.

**M5 — the resume conformance names what it was asked for.** In `src/main/conformance/resume.ts`, on a NEW line directly
after `:865`, leaving `    setAgentTableSource(() => conformanceDetectionTable(cfg.agents));` byte for byte as it is
(p331's test reads it as text and `ablation:p331` H3 deletes exactly that line):
`nameHarnessVersionProbes({ agents: cfg.agents });` — before `stampInstalls` and `getGmuxCore()` (`:870`), because the
boot warm is the first scan and its result is the memo `:884` reads. Imported from `'../agents/detection'` beside
`setAgentTableSource`. The run's versions line is then what it is today.

**M6 — comments that would become false.** The `detection.ts` header gains a short "Phase 335" section (which launches
probe, who may name, why). `warmDetectionAtBoot`'s and `listDetectedAgents`' comments say "version probes" where they
would now be false in a harness launch: add one clause each. `build/hidden-agents.mjs`'s header paragraph "The app
version-probes every agent its detection scan resolves" gains one sentence: since Phase 335 a `GMUX_SMOKE` or
`GMUX_SHOT` launch probes none, and this file is what still guards a `GMUX_PROBES` launch. Comments only; no new
`GMUX_*` token anywhere (the contract inventory sweeps `src/` and `build/` for them, comments included).

## 7. Unit tests, and the clause each owns

All in ONE new file, `src/main/agents/__tests__/p335-harness-probes.test.ts`, in the hermetic lane (it spawns `/bin/sh`
shims through the real `runGuarded`, as `detection-identity.test.ts` does). It mocks `../../tmux/resolve`'s
`getUserPath` and `extraBinDirs` to a scratch directory exactly as `p164-boot-warm.test.ts` does, so no real agent on
this Mac can ever answer. Each shim appends one line (`$0 $*`) to a marker file before answering, so "nothing ran" is
read from the disk, not from a counter. Environment through `vi.stubEnv` with `vi.unstubAllEnvs()` in `afterEach`;
naming reset to `{ agents: [] }`, `resetDetectionCache()` and `resetAgentTableSource()` in `afterEach`. Titles start
with the clause id so an ablation can name the row.

| Id | Clause | What it drives |
| --- | --- | --- |
| T1 | M1 step 1 | `versionProbeHeld(id, p, env)` over every `AGENT_REGISTRY` id: `false` for env `{}`, for each of `GMUX_PROBES=1` and `GMUX_UPDATE_REHEARSAL=1` alone, and for `GMUX_SMOKE=''` / `GMUX_SHOT=''`, whatever is named; `true` for `GMUX_SMOKE=create` and for `GMUX_SHOT=/x.png` with nothing named |
| T2 | M1 steps 2-4 | named `['pi']` holds every id but pi; `within` admits a real path strictly under it, refuses the directory itself, a sibling-prefix decoy (`<w>-b/x` against `<w>`), a path outside, and a symlink planted inside `within` that points outside |
| T3 | M2 | under `GMUX_SMOKE=create`, a scan over a scratch table of three shim agents (one with `identitySubstring`, one with `fallbackArgs` whose primary prints nothing, one found twice so it has a shadowed copy): the marker file is EMPTY, `versionProbeCount()` is 0, every row `installed: true` with `binPath` and `realPath` set, `version: null`, the shadowed path listed with `version: null`. Repeated under `GMUX_SHOT` |
| T4 | M2, the control | the SAME table with all four harness terms unset: every shim ran with its exact args (the fallback after the empty primary), versions as printed, the impostor refused as today, the shadowed copy's version read, `versionProbeCount()` equal to the marker's line count. This is "an ordinary launch's detection does not change" as a test |
| T5 | M1 | `GMUX_PROBES=1` alone: probes run (the overlay guards that class, not this phase) |
| T6 | M3, M4's shape | `GMUX_SMOKE=shadow` with `nameHarnessVersionProbes({ agents: [<id>], within: <dir> })`: the copy inside `<dir>` and its shadowed copy inside `<dir>` are probed, a third copy of the same name OUTSIDE `<dir>` is listed as shadowed with `version: null` and its marker line is absent, and an unnamed agent beside it is not probed |
| T7 | the warm | `warmDetectionAtBoot([])` under `GMUX_SMOKE=create` starts one scan (`detectionScanCount()` 1) and zero probes; the scan's rows carry resolved binaries |
| T8 | M3 | with the default naming every id is held under `GMUX_SMOKE`, and `resetDetectionCache()` leaves a naming exactly as it was (it neither widens nor clears it) |

Kept green and unedited: `detection.test.ts`, `detection-identity.test.ts`, `detection-installs.test.ts`,
`p164-boot-warm.test.ts`, `src/main/harness/__tests__/launch-gate.test.ts`, and
`src/main/conformance/__tests__/p331-harness.test.ts` (its `setAgentTableSource` order and count assertions must still
hold with M5's new line).

## 8. The gate: `conformance:harnessprobes`

`build/conformance-harnessprobes.mjs`, `"conformance:harnessprobes": "node build/conformance-harnessprobes.mjs"`,
classified `pure(...)` in `build/verification-checks.mjs` with a comment in the house shape, and appended to `npm run
build` immediately before `node build/contract-inventory.mjs --check`. Plain node, no tsx, **spawns nothing**, writes
nothing, reads only the tree it sits in. Target well under a second. It reads files with comments blanked
(`stripComments`, `functionBodyOf`, `callArguments`, `blockAt`, `statementEnd` from `build/scan-source.mjs`, as
`build/conformance-farattach.mjs` does); the builder may use the `typescript` parser instead if a clause needs it, as
long as the cost stays under a second. Every failure line names its clause and a sentence that says what to do.

| Clause | What it holds |
| --- | --- |
| **HP1 the predicate** | `detection.ts` imports `isIsolatedLaunch` by value from `'../harness/launch-gate'` and declares no binding of that name itself; names neither `isHarnessLaunch` nor `probesRequested`; the first statement of `versionProbeHeld` is `if (!isIsolatedLaunch(env)) return false;` (whitespace-insensitive). `launch-gate.ts`'s `isIsolatedLaunch` body names exactly two `set(env, '…')` terms, `GMUX_SMOKE` and `GMUX_SHOT` |
| **HP2 one spawn, always behind the hold** | In `detection.ts`: `runGuarded(` exactly once, inside `execProbe`; `execProbe(` called exactly three times, twice inside `runVersionProbe` and once inside `detectOne`; `runVersionProbe(` called exactly once, inside `detectOne`. In `detectOne`, the statement declaring `versionP` names `versionProbeHeld(` before `runVersionProbe(`, and the callback handed to `shadowPaths.map(` names `versionProbeHeld(` and a `return` before `execProbe(` |
| **HP3 the default names nothing** | The naming binding is initialised with an empty `agents` array, and its only assignment after the declaration is inside `nameHarnessVersionProbes`. `resetDetectionCache` does not assign it |
| **HP4 who may name, and what** | Walking every non-test `.ts` under `src/main` (discovered, floor 600 files read; 651 today): calls of `nameHarnessVersionProbes(` (its declaration in `detection.ts`, imports and the barrel's re-export aside; an import that renames it fails by itself) number EXACTLY two. One in `src/main/harness/shadow.ts` whose argument is an object literal with `agents: ['droid']` and a `within:` key; one in `src/main/conformance/resume.ts` whose argument is `{ agents: cfg.agents }`. A literal id from `HIDDEN_AGENT_IDS` (imported from `build/hidden-agents.mjs`) in any call without `within:` fails. A third caller fails with: "a harness mode that needs an agent's version is added to this gate's table, with its reason, in the same commit" |
| **HP5 the order** | In `runResumeConformance`: `nameHarnessVersionProbes(` after `setAgentTableSource(() => conformanceDetectionTable(cfg.agents));` and before `const core = await getGmuxCore();`. In `runSmokeShadow`: after both `writeShim(` calls and before `getGmuxCore(`, with `within: userData` where `userData` is the binding assigned from `app.getPath('userData')` |
| **HP6 no harness spawns a version of its own** | No non-test `.ts` under `src/main/harness/` or `src/main/conformance/` (discovered, floors 40 and 6; 42 and 8 today) reads the property `.versionProbe` or names `runVersionProbe` or `execProbe`, or hands an argument list containing `'--version'`, `'-V'` or `'-v'` to `runGuarded(`, `execFile(`, `execFileSync(`, `spawn(` or `spawnSync(`. The shadow shim's `--version` lives inside a script string written to disk and is not a spawn argument |

**Ablations, run on every invocation, in memory.** The gate judges the unedited tree (must be green), then each
mutated copy below (each must be red ON THE CLAUSE THAT OWNS IT, by id), and exits 1 if any ablation stays green or
lands on the wrong clause. Nothing is written to disk.

| Arm | Mutation | Must redden |
| --- | --- | --- |
| A1 | `versionProbeHeld`'s first statement deleted | HP1 |
| A2 | `isIsolatedLaunch` replaced by `isHarnessLaunch` (import and call) | HP1 |
| A3 | `set(env, 'GMUX_SHOT')` removed from `isIsolatedLaunch` | HP1 |
| A4 | the primary's hold removed (`const versionP = probe === null ? … : runVersionProbe(…)`) | HP2 |
| A5 | the shadow callback's hold removed | HP2 |
| A6 | a second `runGuarded(` added to `detection.ts` | HP2 |
| A7 | the default naming given `agents: ['gemini']` | HP3 |
| A8 | `resetDetectionCache` assigns the naming | HP3 |
| A9 | a third caller in a planted `src/main/harness/p999.ts` naming `['claude']` | HP4 |
| A10 | shadow's call loses `within` | HP4 |
| A11 | shadow names `['droid', 'grok']` | HP4 |
| A12 | resume's naming moved below `getGmuxCore()` | HP5 |
| A13 | shadow's naming moved below `getGmuxCore(` | HP5 |
| A14 | a planted harness file calling `runGuarded(bin, ['--version'])` | HP6 |
| A15 | a planted harness file reading `entry.versionProbe` | HP6 |

**CLAUDE.md.** One row in the path-triggered table, beside `conformance:agents`, in the table's one-line shape:
touching `src/main/agents/detection.ts`, `src/main/harness/**`, `src/main/conformance/resume.ts` or
`isIsolatedLaunch` in `src/main/harness/launch-gate.ts` → `conformance:harnessprobes`, "~0.2 s, inside `npm run
build`, spawns nothing", "A harness launch (`GMUX_SMOKE` or `GMUX_SHOT`) version-probes no agent unless its mode names
it (Phase 335): the hold is `isIsolatedLaunch`, asked before every spawn detection makes; the default names nothing;
exactly two modes name agents, the shadow smoke its own `droid` copies inside its profile and the resume conformance the
agents it was asked for, before the core boots. Its fifteen ablations run on every invocation." And the sentence "Some
gates run inside `npm run build`…" gains `conformance:harnessprobes`.

## 9. Files, and the one builder

**One builder, `b1`, owns every file below.** Nothing else is edited. `docs/BACKLOG.md` belongs to no builder (the
landing commits write it). `CHANGELOG.md` is not edited (§14).

| File | Change |
| --- | --- |
| `src/main/agents/detection.ts` | M1, M2, M3, M6 |
| `src/main/agents/index.ts` | re-export M3's three names beside `warmDetectionAtBoot` |
| `src/main/harness/shadow.ts` | M4, one import and one statement |
| `src/main/conformance/resume.ts` | M5, one import name and one new line |
| `src/main/agents/__tests__/p335-harness-probes.test.ts` | NEW, §7 |
| `build/conformance-harnessprobes.mjs` | NEW, §8 |
| `build/hidden-agents.mjs` | header comment only (M6) |
| `package.json` | the `conformance:harnessprobes` script; the gate appended to `build` |
| `build/verification-checks.mjs` | `pure('conformance:harnessprobes')` with its comment |
| `CLAUDE.md` | the table row and the build-gates sentence (§8) |
| `build/p335/SPEC.md` | the builder appends "§As built" at the end: every file, every decision that moved, every command with exit code and timing |

Not touched, and the builder says so in "§As built": `src/main/index.ts`, `src/main/harness/index.ts`,
`src/main/harness/launch-gate.ts`, `src/main/config/**`, `src/main/agents/registry.ts`, `src/main/sessions/core.ts`,
`build/harness-socket.mjs`, `build/smoke-standalone.mjs`, `build/electron-run.mjs`, `build/assert-electron-teardown.mjs`,
`docs/audits/contract-baseline.txt`, every `build/p*/probe-*.mjs`.

## 10. What the builder runs (no Electron, no smoke, no agent)

Builders and the integrator launch no Electron and run NO smoke (the parent's smokes start `agy --version`; HEAD's are
the verifier's). Record each exit code and wall time in "§As built".

1. `npm run typecheck` → 0 (includes the import-boundary and cycle gates; `detection.ts` → `launch-gate.ts`, which
   imports nothing, adds no cycle).
2. `npm run build` → 0. It now runs the new gate, and `gate:contract` must report no diff (the contract does not move;
   if it moves, a `GMUX_*` token was introduced somewhere and must be removed, not baselined).
3. `npm run conformance:harnessprobes` → 0, printing six clauses green and fifteen ablations red on their owners.
4. `npm run test:hermetic -- src/main/agents src/main/harness/__tests__/launch-gate.test.ts
   src/main/conformance/__tests__/p331-harness.test.ts` → 0; then `npm test` once, whole → 0.
5. `npm run conformance:agents` → 0 (the overlay is read; nothing it reads moved).
6. `npm run gate:checks` → 0 (the new script classified both ways).
7. `npm run ablation:p331` → 0 (about a minute, no Electron): its H3 arm still finds its line and still reddens.
8. `grep -c "setAgentTableSource(() => conformanceDetectionTable(cfg.agents));" src/main/conformance/resume.ts` → 1.
9. A ten-line duplicated-block scan over the touched files, and a check that no new `GMUX_` token appears in the diff
   (`git diff | grep -o 'GMUX_[A-Z0-9_]*' | sort -u` lists only names already in the baseline).

## 11. Verification: Tier 2, the parent measured under a process sampler

**The independent method** is the verifier's own sampler over the battery's own smokes at the parent and at HEAD. The
builder writes no sampler and runs no smoke, so this is something the builder did not do.

**The lock.** Phone phases go first: while `<scratchpad>/electron.phone-wait` holds any file, do not take it. Then
`mkdir <scratchpad>/electron.lock && echo p335 > <scratchpad>/electron.lock/owner`; if `mkdir` fails, wait 60 s and
retry in a new command, for up to 300 minutes; release with `rm -rf <scratchpad>/electron.lock` on the same command
line as the work it guards.

**The parent copy.** A detached worktree of `fd03ef1c` under `/private/tmp` (e.g. `/private/tmp/wt-p335-parent`, as
earlier phases made `wt-p334-parent`), with `node_modules` and `build/vendor` copied by `cp -Rc` from
`/private/tmp/wt-p335`; nothing inside `/Users/gdc/gmux`'s working tree is touched. HEAD is `/private/tmp/wt-p335` with
the builder's (and any fixer's) changes.

**The sampler**, written by the verifier in its own scratch directory, never under the tree:

- Before each run, the names to watch: every binary of every registry row with a `versionProbe` (§2), and the HIDDEN
  ones (`gemini`, `qwen`, `agy`, `grok`, `droid`), read from the checkout's own `src/main/agents/registry.ts` and
  `build/hidden-agents.mjs` (or from §2's table, stating which).
- A tick at most every 250 ms, aiming at 100 ms; record the largest gap actually achieved. Each tick is one
  `execFileSync('/bin/ps', ['-Aww', '-o', 'pid=,ppid=,lstart=,command='])` (`-ww`, or long command lines are cut).
- A line is an AGENT line when its first token, or its second when the first is an interpreter (`node`, `bun`, `sh`,
  `bash`, `zsh`, `env`, `python3`), has a basename among the names. An agent line is a VERSION PROBE when a later token
  is `--version`, `-V` or `-v`. Distinct by `(pid, lstart)`. Print every hidden agent line and every version probe of
  any agent, with its first-seen time.
- The smoke is the sampler's one child: `spawn('npm', ['run', <script>], { cwd: <checkout> })`, stdout and stderr kept
  to a file. In a `finally`, whatever happened: if it is still alive, SIGTERM by its pid, wait, then SIGKILL its
  descendants by pid read from `ps`. Never a negative pid, never `pkill`, `killall` or a `pgrep` pattern, never
  `-L gmux`.

**The runs, each exactly once, interleaved so load is alike:** parent `smoke:t1`, HEAD `smoke:t1`, parent `smoke`,
HEAD `smoke`, parent `smoke:t3`, HEAD `smoke:t3`. **The three parent runs WILL start `agy --version` (and any other
installed hidden agent's); that is the defect being measured, and the verdict says so.** No parent run is repeated. Do
not run `smoke:t3:shadow` (it reads `-L gmux` by design and at the parent it probes every agent), any
`conformance:resume` (it starts agent sessions), `probe:p64`, or `npm run shot` (forbidden).

**Grading.**

| Row | Parent | HEAD |
| --- | --- | --- |
| R1 hidden version probes | `smoke:t1` ≥ 1 (reproduces 316.6); `smoke` and `smoke:t3` recorded as measured (the entry's first measurement) | 0 in all three |
| R2 any agent's version probe | recorded | 0 in all three |
| R3 any hidden agent line at all | recorded | 0 in all three |
| R4 the smokes themselves | exit codes and every `[gmux-smoke]` line | exit 0 each, and the same `[gmux-smoke]` lines as the parent once ids, pids, byte counts, paths and times are replaced by placeholders |
| R5 a scan ran and was held, not skipped | the `[gmux] agent detection: N/M installed […]` line(s) | the same line present in at least `smoke:t1`'s output, naming the installed agents (antigravity among them if `agy` is installed), so the binary was resolved and not run. If it appears nowhere at HEAD, R5 is UNREADABLE and T3/T7 stand for it |

If the parent's `smoke:t1` shows no hidden probe, R1 is UNREADABLE (not a pass) and the verdict says what the sampler
did see. A 250 ms sampler can miss a probe shorter than its period; the HEAD zero rests on the sampler together with T3
and T7, which read the disk.

**Then, once each:** `npm run typecheck`, `npm run build`, `npm test`, `npm run conformance:harnessprobes`, `npm run
conformance:agents`, `npm run gate:checks`; `git diff --stat docs/audits/contract-baseline.txt` empty; `HELPER_USER_FLOOR`
still 161. Optional second method, if time allows: in a `cp -Rc` clone, delete M2's primary hold and show T3 red and
the gate red on HP2 (no Electron).

**At the end, once:** `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`
must list nothing this run started; no `gmux-smoke-*` tmux socket of this run left under `/private/tmp/tmux-501/`; the
sampler's children all gone. The verdict is typed: `verdict`, `evidence`, `problems`.

## 12. Stated limits

1. **A harness launch reads no agent's version.** Settings → Agents in a `GMUX_SHOT` photograph draws no version
   number; a harness create records no `agent_version` (the column has always taken NULL, `flagsVerifiedAgainst` reads
   `unknown`); restore's drift sentence cannot fire inside a harness (`agentDriftSentence` answers null on a null live
   version, `restore.ts:580`).
2. **No identity judgment in a harness launch.** claude (`(Claude Code)`), grok (`grok `) and omp (`omp/`) carry an
   identity substring; held, a binary wearing the name reads installed on the strength of being found.
3. **`smoke:t3:shadow` and the resume conformance are not run live by this phase.** Their naming is held by T6, HP4,
   HP5 and p331's harness test. The shadow smoke is not in the landing battery.
4. **A `GMUX_SMOKE` value naming no mode** falls through to normal startup and is still isolated, so it too probes
   nothing.
5. **A vitest run with `GMUX_SMOKE` or `GMUX_SHOT` exported** holds the probes the existing detection tests expect;
   they fail loudly rather than pass.
6. **The hold covers `GMUX_SMOKE` and `GMUX_SHOT` only.** A `GMUX_PROBES` or `GMUX_UPDATE_REHEARSAL` launch still
   probes, and is guarded by the hidden-agents file its probe writes, as today.

## 13. What is NOT in this phase

- **No change to detection in an ordinary launch**: a person's app still probes every installed agent's version, with
  the same arguments, the same identity rule and the same shadowed copies.
- **No new agent rule**: the app learns no list of agents to avoid, and `HIDDEN_AGENT_IDS` does not change.
- **No overlay install before `dispatchHarness`, no boot-order change, no edit to `dispatchHarness`.**
- **No change to the runners** (`harness-socket.mjs`, `smoke-standalone.mjs`, `electron-run.mjs`) and no new script
  reaching `electron-run.mjs`.
- **No new env name, smoke mode or channel; the contract baseline does not move.**
- **No change to what a harness STARTS as a session** (§15).
- **No committed sampler or probe.** The measurement is the verifier's.
- **No CHANGELOG item, no release.**

## 14. CHANGELOG, menus, contract, floors, commit

- **CHANGELOG: no item.** The rules at the top of `CHANGELOG.md` keep out anything a person will not hit, and a person
  never launches with `GMUX_SMOKE` or `GMUX_SHOT`. The follow-up docs commit adds no link.
- **Menus: no change.**
- **Contract: no change.** `gate:contract` must pass with the baseline untouched.
- **Floors:** `HELPER_USER_FLOOR` 161, unchanged. The new gate's own floors are 600 / 40 / 6 files (§8).
- **Commit:** the subject and first body line in the table at the top; the body says the mechanism, the two named
  modes, the gate, the parent and HEAD sampler counts, and §12's limits. No trailers.

## 15. Found, not this phase's, owed an entry

Two runs still START the hidden agents as sessions (not a version probe, so outside this entry and its "no new agent
rule"):

- `probe:p64` (`GMUX_SMOKE=p64-paste-matrix`) creates a session for every launchable agent unless `GMUX_P64_AGENTS`
  narrows it (`src/main/harness/p64-paste-matrix.ts:169-177`).
- `conformance:resume` with `GMUX_CONF_AGENTS` unset creates a session for every launchable agent
  (`src/main/conformance/resume.ts:74`, `:221`); `conformance:resume:specstory`'s default list includes `antigravity`
  (`package.json:263`).

Both are the operator's to queue; this phase changes neither.

## §As built — 335 (the builder, 2026-10-01)

Built by b1 in `/private/tmp/wt-p335` at `fd03ef1c`. No Electron launched, no smoke run, no `npm run shot`, no agent
started, nothing committed, staged or stashed. The only processes started were `tsc`, `electron-vite build` (a bundler, not
the app), the build's node gates, vitest with its `/bin/sh` shims, `ablation:p331`'s clone and my own scratch scripts.

### Files changed

| File | Change |
| --- | --- |
| `src/main/agents/detection.ts` | M1 `versionProbeHeld` (first statement `if (!isIsolatedLaunch(env)) return false;`), M2 the hold in `detectOne` (primary and shadow callback), M3 `harnessNaming` + `nameHarnessVersionProbes` + `HarnessVersionProbes`, `liesUnder` extracted from `signatureMatches`, M6 header section and one clause each on `listDetectedAgents`, `warmDetectionAtBoot` and `rescanAgents` |
| `src/main/agents/index.ts` | re-exports `nameHarnessVersionProbes`, `versionProbeHeld`, `type HarnessVersionProbes` beside `warmDetectionAtBoot` |
| `src/main/harness/shadow.ts` | M4: import through `'../agents'`, `nameHarnessVersionProbes({ agents: ['droid'], within: userData });` right after the two `writeShim(` lines; the watchdog comment that said the scan "probes every agent" now says it probes only the two shims |
| `src/main/conformance/resume.ts` | M5: import beside `setAgentTableSource`, `nameHarnessVersionProbes({ agents: cfg.agents });` on a NEW line after the pinned line (byte for byte unchanged), before `stampInstalls` and `getGmuxCore()`; one sentence added to the comment above (it names no `setAgentTableSource(`, so p331's count of 1 holds) |
| `src/main/agents/__tests__/p335-harness-probes.test.ts` | NEW, T1-T8 (nine cases: T3 twice, SMOKE and SHOT) |
| `build/conformance-harnessprobes.mjs` | NEW, HP1-HP6 and A1-A15 in memory on every run; `--root`, `--json` |
| `build/hidden-agents.mjs` | header sentence only (M6) |
| `package.json` | `conformance:harnessprobes` script beside `conformance:agents`; `node build/conformance-harnessprobes.mjs` in `build` immediately before `node build/contract-inventory.mjs --check` |
| `build/verification-checks.mjs` | `pure('conformance:harnessprobes')` after `pure('conformance:agents')`, with a house-style comment |
| `CLAUDE.md` | the path-table row after `conformance:agents`; the build-gates sentence gains `conformance:harnessprobes` and "is Phase 335's" |
| `build/p335/SPEC.md` | this section |

### Decisions that moved from the spec, and why

1. **HP2 pins both hold statements exactly, spaces aside**, rather than the order of substrings §8 describes. My own attack
   `probe === null || !versionProbeHeld(entry.id, binPath)` (the hold inverted) passed an order-only reading. The primary
   statement must read `const versionP = probe === null || versionProbeHeld(entry.id, binPath) ? Promise.resolve<VersionProbeResult>({ version: null, identityFailed: false }) : runVersionProbe(binPath, probe, userPath);`
   and the callback must hold `if (probe === null || versionProbeHeld(entry.id, <its parameter>)) return { <its parameter>, version: null };`
   before its `execProbe(`. HP2 also requires `runGuarded`, `execProbe` and `runVersionProbe` be named in detection.ts only
   to declare, import or call them (an alias `const g = runGuarded` passed the call count), that the one `runVersionProbe(`
   be the one inside the `versionP` statement and that `detectOne`'s one `execProbe(` be the one inside the callback.
2. **HP1 also pins `env: NodeJS.ProcessEnv = process.env`** as `versionProbeHeld`'s last parameter: an emptied default
   (`= {}`) makes every launch read as ordinary, so a harness launch would probe again with the first statement intact.
3. **HP3 holds every other reference to the naming read-only**: outside its declaration and `nameHarnessVersionProbes`, the
   binding may only be followed by `.agents.includes(` or `.withinReal`. `(harnessNaming.agents as string[]).push('gemini')`
   passed the property-mutation regex alone.
4. **HP4 also fails a reference that is neither a call nor an import** (the naming function passed as a callback), and
   counts the declaration (exactly one, in detection.ts).
5. **`within:` is split between HP4 and HP5**: HP4 owns its presence, HP5 its value (`userData`, the one binding assigned from
   `app.getPath('userData')` before the call). Otherwise A10 reddened HP4 and HP5 both. HP5 also requires each naming be a
   statement of its own at the same brace depth as the boot it precedes (my attack `if (…) nameHarnessVersionProbes(…)` is
   red on HP5).
6. **An ablation passes only when it is red on its owner and on no other clause**, stricter than "red on the owner". All
   fifteen are.
7. **The binding is `harnessNaming: { agents, withinReal }`**, the stored directory being the real path of `within`
   (computed once in `nameHarnessVersionProbes` with the module's `realOf`), hence the field name.
8. **M6 reached one more comment than it named**: `rescanAgents`' "re-probe everything" was also false in a harness launch
   and gained a clause; `shadow.ts`'s watchdog comment likewise. Comments only.
9. **The tests**: `extraBinDirs` is mocked to an EMPTY scratch directory (p164 used its PATH directory; an empty one keeps
   every hit on the PATH the case chose). T8 reads the module's OWN default from a fresh instance (`vi.resetModules()`),
   because every case narrows back in `beforeEach` and would otherwise never see the initialiser, and it also proves the
   naming COPIES its list (M3). T2 adds an alias of `within` (a symlink to it) so a comparison made as written cannot pass.
10. **The CLAUDE.md row says ~0.3 s**, measured (0.34, 0.20 and 0.27 s real over three runs), not the spec's ~0.2 s.

### Commands, in §10's order

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 24 s; import boundaries 0 violations over 1384 files, no runtime cycles over 1381 files. Re-run after the last test edit: 0, 5 s |
| 2 | `npm run build` | 0 | 36 s; the gate inside PASS in 171 ms; `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte`; classification "71 pure contract or state test". Final re-run: 0, 35 s, gate 156 ms, inventory OK |
| 3 | `npm run conformance:harnessprobes` | 0 | 0.33 s real; HP1-HP6 ok; A1-A3 red on HP1, A4-A6 on HP2, A7-A8 on HP3, A9-A11 on HP4, A12-A13 on HP5, A14-A15 on HP6, each on that clause alone; 651 files walked (harness 42, conformance 8) |
| 4a | `npm run test:hermetic -- src/main/agents src/main/harness/__tests__/launch-gate.test.ts src/main/conformance/__tests__/p331-harness.test.ts` | 0 | 10 files, 151 tests, about 1 s; re-run after the T8 edit: 0, 151 tests, 2 s. (A first look at the new file alone was `npx vitest run <file>` from the shell, the local binary: 9 passed) |
| 4b | `npm test` | 0 | 1032 files passed, 1 skipped; 18093 tests passed, 7 skipped; 64 s. Final re-run after the T8 edit: identical counts, 65 s |
| 5 | `npm run conformance:agents` | 0 | 2 s, PASS |
| 6 | `npm run gate:checks` | 0 | under 1 s |
| 7 | `npm run ablation:p331` | 0 | 37 s; X3 "the run no longer restricts its detection scan" red on H3 (owner red), 26 of 26 arms |
| 8 | `grep -c "setAgentTableSource(() => conformanceDetectionTable(cfg.agents));" src/main/conformance/resume.ts` | 0 | 1 (and `setAgentTableSource(` appears once in the file) |
| 9a | ten-line duplicated-block scan (scratch script over every window of 10 non-blank trimmed lines in the 8 touched source files, against 2932 files under `src/` and `build/`) | 0 | 1 window: the test's `node:fs` import list shares 10 specifier lines with `src/main/env/__tests__/p276-watch.test.ts:28`. An import list, not logic; nothing to extract |
| 9b | `GMUX_` tokens in the diff and the new files | 0 | `GMUX_CONF_AGENTS`, `GMUX_HARNESS_DIR` (a context line of package.json's diff), `GMUX_PROBES`, `GMUX_SHOT`, `GMUX_SMOKE`, `GMUX_UPDATE_REHEARSAL`: every one already in the baseline. `git diff --stat docs/audits/contract-baseline.txt` empty. `HELPER_USER_FLOOR` still 161 |

### Tests that fail when each clause is removed (a `cp -Rc` clone, once per clause, restored by sha256)

The clone held `src/`, `build/`, `package.json`, `vitest.config.ts` and the tsconfigs, with `node_modules` a symlink; each
clause was broken, the p335 file run under `VITEST_LANE=hermetic` with the JSON reporter, the gate run with `--root`, and the
file restored and compared by sha256 before the next. Control before and after: vitest green, gate green.

| Clause broken | Red tests | Gate |
| --- | --- | --- |
| M1 step 1, the first statement deleted | T1, T4, T5 | HP1 |
| M1 step 2, unnamed agents not held | T1, T2, T3, T6, T7, T8 | green (owned by the tests) |
| M1 step 3, a named agent with no `within` held | T2, T8 | green |
| M1 step 4a, the copy not realpathed | T2, T6, T8 | green |
| M1 step 4b, no trailing slash (the prefix decoy admitted) | T2 | green |
| M1 step 4c, `within` not realpathed | T2, T6, T8 | green |
| M2, the primary hold removed | T3, T6, T7 | HP2 |
| M2, the shadow callback's hold removed | T3, T6, T7 | HP2 |
| M3, the default names `pi` | T8 | HP3 |
| M3, `resetDetectionCache` clears the naming | T8 | HP3 |
| M3, the list not copied | T8 | green |
| M4, shadow names nothing | none (a smoke, not a unit) | HP4, HP5 |
| M5, resume names nothing | none (p331's harness test stays green by design) | HP4, HP5 |

### Attacks on the gate beyond its fifteen arms (in memory, scratch script)

Each is red: the hold negated (HP2), `runGuarded` aliased (HP2), `env` default emptied (HP1), the hold asking a constant id
(HP2), the naming cast and pushed (HP3), resume's naming behind a condition (HP5), resume naming `['gemini']` (HP4),
shadow's `within: d1` (HP5), `userData` taken from `app.getPath('temp')` (HP5), a renamed-import caller (HP4), `'-V'`
handed to `execFile(` through a name (HP6), a destructured `versionProbe` in a conformance file (HP6), the naming function
passed as a value (HP4), `spawnSync(bin, ["--version"])` in a conformance file (HP6).

### Deliberately not touched

`src/main/index.ts`, `src/main/harness/index.ts`, `src/main/harness/launch-gate.ts`, `src/main/config/**`,
`src/main/agents/registry.ts`, `src/main/sessions/core.ts`, `build/harness-socket.mjs`, `build/smoke-standalone.mjs`,
`build/electron-run.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 161), `docs/audits/contract-baseline.txt`,
every `build/p*/probe-*.mjs`, `docs/BACKLOG.md`, `CHANGELOG.md`, and the existing detection, launch-gate and p331 tests.

### At the end

`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct` lists 19 lines on the machine
and none carries `wt-p335` in its command line: none is this builder's, which launched no Electron. The scratch clone was
removed. The parent's and HEAD's smokes under a sampler are the verifier's (§11).

## §As built — 335 (the integrator, 2026-10-01)

Integrated in `/private/tmp/wt-p335` at `fd03ef1c` over the builder's tree. One builder, so nothing to merge; the work
was re-deriving the builder's claims a different way and attacking the new gate. No Electron, no smoke, no `npm run shot`,
no agent, no model turn. Nothing committed, staged or stashed. Every scratch file is under
`<scratchpad>/p335/integrator/`; the scratch clone is removed.

### What the integrator changed (in the builder's own files, nothing outside §9)

| File | Change |
| --- | --- |
| `build/conformance-harnessprobes.mjs` | HP2 gains one rule: `versionProbeHeld` is named exactly three times in `detection.ts` with comments blanked, its one declaration and the two holds inside `detectOne`'s body. New arm **A16** (owner HP2): a local `const versionProbeHeld = (): boolean => false;` placed in `detectOne`. The header's HP2 paragraph and its ablation count now say sixteen |
| `build/verification-checks.mjs` | the gate's comment says sixteen ablations, not fifteen |
| `CLAUDE.md` | the `conformance:harnessprobes` row adds "with no binding of the hold's name to shadow it" and says sixteen ablations |
| `build/p335/SPEC.md` | this section |

**Why A16 was needed.** My attack I1 put a local binding named `versionProbeHeld` inside `detectOne` that always answers
no. Both of HP2's pinned statements still read exactly right but now asked the local instead of the hold, and the gate
stayed GREEN on all six clauses (T3, T6 and T7 would still have gone red). With the rule in place, I1 is red on HP2 only,
and so are I10 (a `detectOne` parameter with that name) and I11 (a module-level wrapper that calls the hold with `{}`).
After the change, all 16 arms are red on their own clause alone.

### Re-derived: an ordinary launch's detection is the parent's

1. **Text.** I compared `detection.ts` at `fd03ef1c` against HEAD with comments blanked by `build/scan-source.mjs`'s
   `stripComments` and blank lines dropped. The whole executable diff is:
   - one `import { isIsolatedLaunch }`;
   - `signatureMatches`' `realpath-under` arm now calls `liesUnder(realPath, dir)`, whose body is the old expression
     character for character;
   - the new `liesUnder`, `HarnessVersionProbes`, `harnessNaming`, `nameHarnessVersionProbes` and `versionProbeHeld`;
   - the two guards, `probe === null` becoming `probe === null || versionProbeHeld(entry.id, …)`.

   `versionProbeHeld`'s first statement returns `false` whenever `isIsolatedLaunch(process.env)` is false, and that
   predicate only reads `env`. In an ordinary launch, then, both guards reduce to `probe === null`, the parent's
   condition, with no extra side effect. `launch-gate.ts` imports nothing, and `harnessNaming`'s initialiser does no work.
2. **Executable differential (independent of T4).** In a `cp -Rc` clone I placed the PARENT's `detection.ts` beside
   HEAD's as `detection-parent.ts`. One vitest file then ran both over the SAME compiled `AGENT_REGISTRY` rows. Each
   row's `extraProbeDirs` and `storeDirs` were emptied, and every binary was a scratch `/bin/sh` shim that logs `$0 $*`.
   Five binaries had a second copy, `agy` among them. The login PATH and the extra bin directories were mocked to
   scratch, and a pre-check refused to scan if any binary resolved outside the scratch root, so no real agent could run.
   - **Six ordinary environments** (`{}`, `GMUX_PROBES=1`, `GMUX_PROBES=0`, `GMUX_UPDATE_REHEARSAL=1`, `GMUX_SMOKE=''`,
     `GMUX_SHOT=''`). In each, HEAD's scan rows were deep-equal to the parent's. Both made the same 19 spawns, compared as
     sorted `$0 $*` lines, and `versionProbeCount()` was 19 for both.
   - **Three harness environments** (`GMUX_SMOKE=create`, `GMUX_SMOKE=basic`, `GMUX_SHOT=/x.png`):
     - The parent made 19 spawns: `agy --version` twice, plus `gemini`, `qwen`, `grok` (twice) and `droid --version`.
     - HEAD made 0, with `versionProbeCount()` 0.
     - `binPath`, `realPath`, `runtime`, `installKind` and the shadowed paths were the same on every row, and every
       version was null.
     - Two rows flipped `installed`: `claude` and `grok`, whose shims fail the identity substring. The parent refused
       them; HEAD reads them as installed. That is §12.2's stated limit, now measured.
   - 9 of 9 cases passed, in 0.74 s.
3. **The built artifact.** After `npm run build`, `out/main/index.js` holds one copy of `versionProbeHeld`, with
   `if (!isIsolatedLaunch(env)) return false;` as its first line. Both holds are in `detectOne` (lines 7235 and 7238).
   `isIsolatedLaunch` reads only `GMUX_SMOKE` and `GMUX_SHOT`. There are exactly two namings: line 92476
   `{ agents: cfg.agents }` and line 102885 `{ agents: ["droid"], within: userData }`.

### Re-derived: every harness mode is covered

- **Every mode is keyed on the two variables.** Every branch of `dispatchHarness` (`src/main/harness/index.ts:374`)
  is keyed on `process.env['GMUX_SMOKE']` or `process.env['GMUX_SHOT']`. The seed `if`s at `:665-691` sit inside the
  SHOT branch.
- **Neither variable is cleared.** No file under `src/main` deletes or reassigns either variable. The only writes to
  `process.env` set `GMUX_SPECSTORY_NO_CLOUD`, `SHELL`, `PATH`, `LANG`, and the resume run's self-update holds. So
  `isIsolatedLaunch(process.env)`, which is read at each probe, stays true for the whole harness process.
- **Detection is the only version probe.** It is the only module that reads `versionProbe` to spawn, and no worker or
  utility process imports it: the quickopen worker, the symbols pool and the door process don't. The other
  `--version` spawns in `src/main` are SpecStory's and skills', not agents'.
- **Only two harness reads of an agent version exist:** `shadow.ts:240` and `resume.ts:891`, and both modes name their
  agents. Every other `.version` read in `harness/` or `conformance/` is SpecStory's, tmux's or a summary's.

### Commands (exit code, wall time)

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `npm run -s typecheck` | 0 | 2.33 s (incremental); boundaries 0 violations over 1384 files, no runtime cycles over 1381 |
| 2 | `npm run -s test:hermetic -- src/main/agents src/main/harness/__tests__/launch-gate.test.ts src/main/conformance/__tests__/p331-harness.test.ts` | 0 | 10 files, 151 tests, 1.08 s |
| 3 | `npm run -s test:hermetic -- src/main/harness src/main/conformance src/main/manifest/__tests__/agent-contract.test.ts src/main/restore/__tests__/recovery-contract.test.ts` | 0 | 22 files, 331 tests, 2.09 s |
| 4 | `npm run -s conformance:agents` | 0 | 1.57 s, PASS |
| 5 | `npm run -s conformance:installs` | 0 | 0.38 s, PASS, 15 rows |
| 6 | `npm run -s conformance:harnessprobes` (builder's 15 arms) | 0 | 0.33 s; 6 clauses ok, A1-A15 each red on its owner alone |
| 7 | `npm run -s gate:contract` | 0 | 1.21 s; byte for byte |
| 8 | `npm run -s gate:checks` | 0 | 0.50 s |
| 9 | `npm run -s gate:simulator` | 0 | 0.25 s |
| 10 | `npm run -s gate:electron` | 0 | 0.81 s; 161 reach the helper, floor 161 |
| 11 | `npm run -s gate:background` | 0 | 0.70 s; 19 of 19 fixtures |
| 12 | integrator attack script over the gate's exported `judge` (I1-I9) | 0 | Before A16: I1 GREEN, I4 GREEN (tests own it), I6 GREEN, I9 GREEN (out of scope). I2 HP2, I3 HP4, I5 HP1, I7 HP4, I8 HP5 |
| 13 | `node build/conformance-harnessprobes.mjs` after A16 | 0 | 0.34 s; 6 clauses ok, A1-A16 each red on its owner alone |
| 14 | the attack script again, plus I10 and I11 | 0 | I1, I10 and I11 red on HP2; the rest as before |
| 15 | comment-blanked diff of `detection.ts`, parent vs HEAD | diff 1 | only the lines in "Re-derived" item 1 |
| 16 | the differential vitest in the clone (`VITEST_LANE=hermetic`) | 0 | 9 of 9; numbers in "Re-derived" item 2 |
| 17 | `npm run -s build` (once) | 0 | 33.45 s; the gate PASS with 16 arms in 196 ms; contract inventory byte for byte; 71 pure checks; electron floor 161 |
| 18 | `git diff --stat docs/audits/contract-baseline.txt` | 0 | empty |
| 19 | `grep -c` of the pinned `setAgentTableSource(...)` line in `resume.ts` | 0 | 1 |
| 20 | `GMUX_` tokens in the diff and both new files | 0 | `GMUX_CONF_AGENTS`, `GMUX_HARNESS_DIR`, `GMUX_PROBES`, `GMUX_SHOT`, `GMUX_SMOKE`, `GMUX_UPDATE_REHEARSAL`, every one already in the baseline |

### Open, for the verifier and the operator

1. **The sampler measurement (§11) has not been run.** It is the verifier's job: the parent's three smokes start
   `agy --version`. R1 to R5 are still owed.
2. **HP6 is a text heuristic.** It misses a version flag handed through a spread, `spawn(bin, [...FLAGS])` (I6). I left
   it alone, because widening the name resolution risks false positives across 50 harness files. The hold itself is in
   detection, which is the only module that spawns an agent's version, so HP6 is defence in depth.
3. **M1 steps 2 to 4 are owned by the tests and not by the gate,** as the builder's table records. I4 (unnamed agents
   probed) leaves the gate green; T1, T2, T3, T6, T7 and T8 go red.
4. **No identity judgment in a harness launch (§12.2), measured.** An impostor `claude` or `grok` reads as installed
   under `GMUX_SMOKE` and `GMUX_SHOT`. I found no smoke that depends on an impostor being refused.
5. **SPEC §8's table still lists A1 to A15.** A16 is recorded here and in the gate's header. The landing commit body
   should say sixteen.
