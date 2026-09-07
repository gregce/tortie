# 82 — Phase 220's starting measurements at `b5cc017`

Date: 7 September 2026

Who this is for: the Phase 220 builders and its verifier. It is the phase's **measure step** and it
builds nothing. Its job is the one the operator's brief gives it — *measure the current code before
applying the old findings* — so every later round works from what is true today rather than from the
0.99.0 audit's list.

## The commit this measured

| Fact | Value |
| --- | --- |
| Starting commit | `b5cc0176` (`docs(backlog): the fifth nits round`) |
| Worktree | `/private/tmp/wt-p220`, detached, clean apart from an untracked scratch directory |
| Package version | 0.100.0 |
| node / npm | v22.23.1 / 10.9.8 |
| tsx | 4.23.12, resolved from `node_modules` by `build/ts-runner.mjs` |
| The operator's own tree | untouched. His `-L gmux` server held 12 sessions before and 12 after every probe here. |

The brief was written against `bd16e36`. **Phase 219 landed at `b5cc017` after that**, so the credit
section below is not optional bookkeeping: it is the difference between the brief's snapshot and the
tree the builders will edit.

Nothing under the person's home was written. No keychain was opened with `-g` or `-w`, the keychain
search list was not touched, and no personal credential was read, hashed or copied. Every credential
reading below is over fixtures on a scratch root.

## The scoreboard this replaces

The 0.99.0 audit scored 33 of 36 at `84a281d`, with Lifecycle, Failure flow and Test seam each at 2.
Five findings carried into this phase, plus one on the build boundary. **One of the five does not
reproduce and its stated cause is refuted, one reproduces with its consequence inverted, three
reproduce, and the build-boundary one is superseded by 450 KB.**

| # | 0.99.0 finding | At `b5cc017` | Category |
| --- | --- | --- | --- |
| 1 | A failed live-session query becomes `[]` before a safety decision | **Reproduced, with the consequence inverted.** See §1. | Failure flow |
| 2 | An unexpected activation exception still records the choice | **Reproduced exactly.** See §2. | Failure flow |
| 3 | Credential children and observation are not joined at quit | **Reproduced.** Phase 211's `stopLoginsWatch()` is credited; everything else stands. See §3. | Lifecycle |
| 4 | `probe:controldeadline` cannot reach its subject | **NOT reproduced, and its stated cause is refuted.** See §4. | Test seam |
| 5 | Split churn grows the renderer heap | **Reproduced, 2 runs of 3**, at 5.0 MB and 1,020 DOM nodes a block. The third run passed because its workload recorded nothing, which the probe cannot currently see. See §5. | Lifecycle |
| — | Eager renderer headroom is 2,232 bytes | **Superseded.** The current build reports 450,366 raw and 108,476 gzip of headroom. | Build boundary |

---

## §1 Failure flow — the live-session answer

### What the code does

`src/main/credentials/keep.ts:1049`

```ts
const running = await d.liveSessions().catch((): LiveSession[] => []);
if (running.some((s) => s.provider === provider && isDefaultLogin(s.login))) {
```

### How this was reproduced

The shipping `activateLogin` was driven under `vitest` over the injected seams the domain already
takes — a fixture vault, a map-backed store, in-memory locks and a scratch logins root. Two codex
accounts were made the way a person makes them, by observing a store that changes under a `/login`.
Then `activateLogin` was asked for the promoted account under three live-session answers. The
measured output:

```
A working query, default session running: ok=true says="one.example is signed in again." defaultStoreHasChosen=true
B rejected query, default session running: ok=true says="one.example is signed in again." defaultStoreHasChosen=false
C working query, no sessions:             ok=true says="one.example is signed in again."
```

### The finding, stated correctly

**The 0.99.0 sentence is superseded.** It said an unavailable answer becomes *permission to write*.
Since Phase 211 the default lift is guarded by `running.some(...)`, so an unavailable answer is
`[]`, `some` is false, and the lift is **skipped**. The failure mode today is not an unsafe write.
It is an **untruthful outcome**: rows B and C are byte-identical, and in B the person's running
agent still holds the account they just switched away from, with no sentence saying so.

That matters because Phase 220's own success condition is the operator's: *"An account switch
reports what actually happened, including when a running session could not be checked or reached."*
The product already has the sentence for the case where the running session was reached and refused
— `"… is signed in again, but the running session was not reached. <reason>"` — and it is not
reachable when the evidence itself is unavailable.

**The repair is not the old refusal.** The brief and the backlog both forbid restoring the blanket
ban, and rows A and C must keep answering exactly as they do. What must change is that an
unavailable answer is a third state, asked before the writes that depend on it, and reported.

Note for the builder: the *login's own* store is lifted at step 1, **before** `liveSessions()` is
asked. The brief's "perform the session preflight before the first activation write that depends on
its result" is satisfiable by moving the ask above step 1, or by leaving step 1 where it is and
proving it does not depend on the answer. The second reading is the one the current code holds and
is the smaller change; the phase should say which it chose and why.

## §2 Failure flow — the unexpected activation exception

### What the code does

`src/main/logins/ipc.ts:372`

```ts
  } catch {
    // A store Tortie could not reach leaves the choice to the person: the
    // name is still recorded and the login runs on whatever is in it.
    log.info('logins.activate', { provider: id, ok: false });
  }
  const change = chooseLogin(loginsRoot(), id, name);
```

### How this was reproduced

The **real registered handler** was driven, not a mock of its answer: `registerLoginsIpc` was called
with a captured `handle`, two claude logins were made in a scratch root, `activateLogin` was made to
reject with `new Error('the keychain fell over')`, and `logins:choose` was invoked for `bob`.

```
activateLogin threw: Error("the keychain fell over")
handler result.ok = true
result.snapshot: claude/bob  chosen: true
logins.json after: {"v":1,"chosen":{"claude":"bob"}, …}
```

**Reproduced exactly.** A step that failed for a reason nobody classified is recorded as an ordinary
successful choice: the person is told nothing, the file records `bob`, and every new session under
that login launches with whatever bytes happen to be in the store.

This is distinct from the two branches that already behave. `put.ok === false` returns
`{ ok: false, reason }` and forgets the observation, and Phase 211's lock refusals arrive that way,
typed and named. Only the unclassified throw falls through. A repair must not collapse the three.

## §3 Lifecycle — credential work has no shutdown owner

`disposeMainCapabilities()` in `src/main/capabilities.ts:412` calls exactly one credential-domain
line, `stopLoginsWatch()`, and it is the first statement in the disposer. **That is credited**: it
releases the `fs.watch` handles and the backstop interval, and it cannot throw.

Everything else the 0.99.0 audit named is still true, and the trace found two shapes the audit did
not name.

| Entry | Owner today | What quit does |
| --- | --- | --- |
| `security` children | `defaultSecurityRunner` in `credentials/security.ts:110`, raw `execFile`, `SECURITY_TIMEOUT_MS` 10 s, no `AbortSignal`, not in `proc/guarded`'s registry | nothing |
| the held observation | `observeInFlight` in `logins/ipc.ts:152` | nothing |
| **a replaced observation** | `forgetObservation()` sets `observeInFlight = null` (`ipc.ts:160`), so the previous pass is unowned while still running | nothing |
| the boot observe | `void getGmuxCore().then(1 s delay).then(observeLoginsAtBoot).then(startLoginsWatch)`, `index.ts:576-585`, fire and forget | nothing |
| **late watch startup** | `startLoginsWatch()` is the last link of that chain and `stopLoginsWatch()` sets no flag, so a quit landing in the 1 s delay or inside the boot observe runs the disposer's stop against `watch === null` and the chain then installs the watcher AFTER the disposer | nothing stops it |
| the vault migration | `migration` promise in `credentials/index.ts`, run once per process in front of the first observe | nothing |
| lock waits | `DEFAULT_LOCK_TIMEOUT_MS` 9 s of 250–500 ms jittered sleeps in `credentials/locks.ts` | nothing |
| activation | `activateLogin` from the `logins:choose` handler | nothing |

### The late watch startup, reproduced

The row above marked **late watch startup** is not a reading of the source alone. The shipping
`startLoginsWatch` and `stopLoginsWatch` were driven under `vitest` with `readyKeepDeps` held open,
which is exactly the quit that lands inside the 1 s boot delay or inside the boot observe:

```
at quit the watcher had: []
after the awaited dependency landed: ["watch"]
a watcher exists that nothing will stop: true
```

`stopLoginsWatch()` ran, found `watch === null`, and returned. The chain then resumed and installed
`fs.watch` handles and the keychain backstop interval, after the ordered disposer had finished with
this domain. Nothing sets a stopped flag, so nothing refuses the late start. This is the brief's
`late_watch_start_cannot_rearm_after_shutdown` and it reproduces in three lines.

**The working sibling is exact and should be copied rather than re-invented.** `src/main/usage/`
already has the shape the brief asks for: `service.ts`'s `shutdown(deadlineMs)` sets `stopped` on
its first line (admission closes **before** the first await), collects every `inFlight`, aborts each
`AbortController`, calls `deps.credentials.cancel?.()` for its children, and joins with
`Promise.race` against a bounded timer, returning a report that says whether it actually joined. Its
children go through `runGuarded` from `src/main/proc/guarded`, which is the registry every other
guarded child of Tortie's is in, and `keychainReader` in `usage/credentials.ts` holds a live set of
`AbortController`s so its cancel returns how many it ended. `p200-shutdown.test.ts` is the test
shape.

**The one place the sibling does not transfer, and the brief says so.** A usage read is a `security
find-generic-password`; cancelling it loses nothing. A credential write is `security -i` over stdin,
or a staged file rename inside `nofollow.ts`, under the vendor's three locks. Killing that child at
an arbitrary point is exactly what Phase 204's interrupted-write arms exist to survive, and Phase
211's `liftStore` promotes the outgoing account *before* a byte moves for the same reason. So the
ordering in the brief is load-bearing: **define where a write may safely be interrupted before any
cancellation is wired**, and prove that a released lock at each of those points leaves the old
credential or the new one and a usable recovery copy — never neither. Ending this domain's own
`security` child must also not reach another program's, and must not steal a lock the vendor holds.

## §4 Test seam — the deadline probe reaches its subject, and the module-identity story is wrong

### What was run

`npm run probe:controldeadline`, twice, cleanly, at `b5cc017`. **Both runs passed, exit 0.**

```
1    the deadline this build carries, in ms               10000
1    ssh children before the connection was opened        0
1    ssh children while the child was hanging             1
1    the connection was live while it hung                false
1    ms from spawn to the fallback                        10003   (10002 on the second run)
1    the sentence the feed was given is the deadline one  true
1    the child was still alive afterwards                 false
1    the machine's link reads                             polling
1    the machine is held off a connection for this run    true
2    a second open answered                               false
3    a healthy far side greeted in ms                     25      (15 on the second run)
3    the healthy connection reached live                  true
4    a far side printing %exit produced disconnects       3
5    the local client greeted in ms                       12
```

The operator's server read 12 sessions before and 12 after, both runs.

### The source is byte-identical to the audited commit

```
git diff --stat 84a281d..b5cc017 -- build/probe-control-deadline.mjs build/ts-runner.mjs \
  src/main/machines/context.ts src/main/machines/control-plane.ts \
  src/main/tmux/control-client.ts tsconfig.node.json
(empty)
```

So nothing repaired this between the audit and today. Either the audit's environment differed, or
its diagnosis was of a symptom whose cause was elsewhere.

### The module-identity hypothesis is refuted, by a method the probe does not use

The probe passing is already evidence — `openControlPlane` spawned the held SSH child, and it can
only do that after `remoteContextFor` finds the registration. But that is indirect, so the claim was
attacked directly with a nine-line `tsx` driver that imports **the same two modules the same two
ways** and does nothing else:

```ts
import { registerRemoteMachineContext } from '<repo>/src/main/machines/context';  // absolute, as the driver does
import { remoteContextFor } from '<repo>/src/main/machines/control-plane';        // which imports './context' relatively
registerRemoteMachineContext(ctx);
remoteContextFor('idprobe');
```

It threw — **but not the identity error**:

```
{"crossGraphRead":"THREW","message":"{\"code\":\"INVALID_INPUT\",\"message\":
 \"no program search list is recorded for idprobe's current connection\"}"}
```

That is the *second* gate, `setMachineRemotePath`, which the probe's `arm()` supplies and this
driver deliberately did not. The registration written through the absolute-path import **was read
by the control-plane's own graph**. One module instance, not two.

There is also a wording trap that probably produced the audit's diagnosis. Two different sentences
in this area read almost the same:

- `context.ts` `machineContext()` throws `"Tortie has not signed in to <id> in this session…"`;
- `control-plane.ts` `machineLinkFacts()` answers a *default* record whose reason is
  `"has not been signed in to in this run"` for any machine whose link has not been noted yet.

The second is not an error and says nothing about the context registry. A driver that read link
facts before opening would print it on a perfectly healthy graph.

### What this leaves for the phase

The finding is **dropped as stated**. What is *not* proved, and is what the brief actually asks for,
is that this probe would go red if the thing it measures broke: there is no ablation arm that
removes the greeting timer, and no arm that proves teardown after a failed assertion. Those are
additions, and the phase should say plainly that it added a guard rather than that it repaired a
break. The independent-method requirement for this item should be *plant the defect*, since the
defect the audit named does not exist to reproduce.

## §5 Lifecycle — the split profile

### What was run

Three runs at `b5cc017`, on the same build, one after another and never at once: one full default
run (`npm run probe:p167`, profiles b, c, d) and two focused split runs
(`P167_PROFILES=d npm run probe:p167`). Every run is 3 blocks of 6 cycles, and each cycle creates a
four-pane grid of real shell sessions and kills all four, so **a block discards 24 real sessions.**

| Run | Profile | Heap after each block, MB | Block-to-block heap | DOM nodes | Verdict |
| --- | --- | --- | --- | --- | --- |
| 2, full | b | 7.8, 7.8, 7.9 | +0.1 worst | 451 flat | pass |
| 2, full | c | 24.1, 25.5, 25.7 | +1.3 worst | 1169 → 1367 → 1565 | pass, 18 diff opens with `transition-property: none` and 0 transitions running |
| 2, full | **d** | **31.4, 36.5, 41.5** | **+5.1, +5.0** | 2109 → 3129 → 4149 | **FAIL — slope** |
| 3, focused | **d** | **12.2, 16.9, 22.2** | **+4.8, +5.3** | 788 → 1808 → 2828 | **FAIL — slope** |
| 4, focused | d | 10.5, 10.5, 11.1 | +0.6 worst | **448 → 448 → 448** | pass |

`/dev/ptmx` and `/dev/ttys` were **0 before the first block and 0 after the last in all three runs**,
so Phase 167 finding 1 has not come back and this is not the native descriptor leak. Event listeners
were flat or fell in every run. The operator's `-L gmux` server read 12 sessions before and after
every run.

### The slope reproduces, and it is not subtle

Two of three runs fail, and they fail the same way: **almost exactly 5 MB and exactly 1,020 DOM
nodes per block, in both runs, after the first.** Per discarded session that is

- **42.5 DOM nodes**, identical to three significant figures across two independent runs, which is
  the signature of a deterministic per-session record rather than a race; and
- **about 210 KB of renderer heap** (5.1 MB ÷ 24 in run 2, 5.3 MB ÷ 24 in run 3).

The node figure is the one the profile deliberately does not assert, because Past Sessions grows by
design. **The heap figure is the one that has to be split.** 210 KB is a large record for a row of
history; a retired terminal buffer, an attachment record or a cache keyed by session id is the size
of thing that would explain it. That split is item 5's work and this measurement does not guess at
it: no heap snapshot was taken and no retaining path was walked here.

### The intermittency has an explanation, and it is a defect in the ruler

Phase 200 recorded this profile "failing one run in two at both commits, and nobody knows why". At
this commit the difference between a failing run and a passing one is visible in the readings and it
is not the heap.

**In the passing run the DOM did not grow at all.** 448 nodes after block 1, 448 after block 2, 448
after block 3, against +1,020 per block in both failing runs. The 24 sessions a block that the
failing runs recorded as history left nothing behind in run 4 — and the heap consequently had
nothing to hold either.

**The probe could not tell the difference.** Run 4 recorded zero open misses, zero close misses, zero
page exceptions and block times of 154, 178 and 178 seconds, against run 3's 173, 191 and 197. Its
`.xterm >= 4` liveness check passed on every cycle and `settleSessions` reported no remains. Then it
printed `every driven profile plateaued and main holds the descriptors it started with` and exited 0.

So the ruler currently cannot distinguish *"the app retained nothing"* from *"the workload produced
nothing to retain"*, and only the second reading is safe to call a plateau. **A green profile-d run
is therefore not yet evidence of anything**, which matters directly to this phase, because the
brief's closing proof for item 5 is one full run plus two focused ones and the grader passing.

This is a finding about `build/probe-p167-scale.mjs`, not about the renderer, and it is separable
from the repair:

1. profile d must assert that the workload landed — a floor on sessions created and discarded per
   block, or on Past Sessions records added, read from the app rather than inferred from a node
   count; and
2. a run in which that floor is not met must fail as *inconclusive*, naming the reading, rather than
   pass as a plateau.

Doing (1) and (2) first is what makes the eventual repair provable. The brief already forbids
lowering the workload or discarding a failing sample; this is the same rule pointed at the ruler.

**One caution about causation.** What is measured is a correlation: the run whose DOM did not grow
is the run whose heap did not grow. Why run 4's cycles recorded no history when runs 2 and 3's did
is **not** established here and must not be assumed — the grid opened and the sessions were killed
in all three. Establishing it is the first step of item 5, and it should be done before any renderer
file is edited, because the answer decides whether the 210 KB is a leak or a record.

### What the grader is, for the builder who has to keep it honest

`node build/probe-p167-scale.mjs --self-test` passes 12 of 12 fixtures at this commit: every red
fixture is rejected and every green one accepted. Budgets are heap 8 MB, nodes 400, listeners 200,
judged over the **worst** block pair in all three dimensions, plus a slope rule — three or more
blocks whose every heap delta exceeds half the budget. Profile d asserts heap and descriptors only.
Both failing runs above were caught by the slope rule and not by the 8 MB budget, which the 5 MB
deltas stay under; that rule is doing the work and must not be weakened.

## §6 The gates that already pass at this commit

| Command | Result |
| --- | --- |
| `npm run build` | exit 0. Every build gate green, contract inventory byte-identical to the baseline. |
| `npm run conformance:credentials` | PASS. 53 of 53 ablations red, 22 of 22 scanner fixtures, 6 ordered pairs, 4 interrupted arms, 6 attack shapes, no payload on any of 21 keychain calls. |
| `npm run conformance:logins` | PASS. 16 of 16 ablations red, 14 of 14 scanner fixtures, 13 ownership shapes, 6 rows dropped whole. |
| `npm run conformance:machines` | PASS. |
| `node build/probe-p167-scale.mjs --self-test` | PASS, 12 fixtures: the grader fails every red one and passes every green one. Budgets are heap 8 MB, nodes 400, listeners 200, judged over the **worst** block pair in all three dimensions; profile `d` asserts heap only. |
| `npm run probe:controldeadline` | PASS, twice. |
| `npm run typecheck` | exit 0. 1,186 production files, 6,651 imports, 0 boundary violations; 1,184 files, 4,028 runtime edges, 0 strongly connected components. |
| `npm run probe:p167` | **1 failure**, profile d. See §5. |

**The eager-size finding is superseded outright.** The current build reports the eager set at
**1,549,634 raw and 391,524 gzip in 2 chunks**, under the 2,000,000 / 500,000 budgets by **450,366
and 108,476 bytes**. The 0.99.0 figure of 2,232 bytes of headroom is stale by 450 KB. The brief
already refuses a bundle refactor built on it; this is the measurement that closes it.

## §7 What Phase 219 repaired, and what it did not

Range `49d5913..b5cc017`, 18 commits. Over this phase's owners it changed 12 files, 711 insertions.

| Phase 219 change | Effect on a Phase 220 finding |
| --- | --- |
| `b3c3a80` — `keychainDelete` answers `boolean` instead of `void`, so a migration counts deletes that happened rather than deletes it asked for; the boot line carries the migration's **reason** for a refusal | **Touches `credentials/security.ts` and `credentials/index.ts`, and repairs neither §1 nor §3.** It is a truthfulness repair in the *migration*, which is the same family as §1 but not the same site. Credit it; do not redo it. |
| `ce86380` — the ancestor rule is asked where the delete is (`logins/dirs.ts`) | Unrelated to §1–§5. Credit. |
| `9a94ff9` — a record row Tortie did not write authorises no sweep | Unrelated. Credit. |
| `4a4823d` — add login refuses a folder reached through a link | Unrelated. Credit. |
| `21da259` — a domain with no migration is a finding, not a stack | Unrelated. Credit. |
| — | **`logins/ipc.ts`'s `catch` (§2) was not touched.** Its only 219 edit is six lines of comment about the boot line. |
| — | **`keep.ts` was not touched at all** in the range, so §1 stands as written. |
| — | **`capabilities.ts` was not touched**, so §3's disposer is unchanged. |
| — | **The two probes were not touched**, so §4 and §5 are measured against the same scripts the audit ran. |

Superseded requirements, recorded explicitly so no builder implements them twice:

1. *"Refuse the credential write when the live-session answer is unavailable"* — superseded. Phase
   211 already skips the dependent write; the work is to **report** the unavailability, not to add a
   refusal that is already there by accident.
2. *"Make the control-deadline probe use one module identity"* — superseded. One identity is already
   the case, proved in §4. The remaining work is an ablation arm and a teardown-on-failure proof.
3. *"Restore eager renderer headroom before the next feature"* — superseded by the current build
   report; 450 KB of raw headroom.
4. *"Give `keychainDelete` a truthful answer"* — landed in Phase 219 `b3c3a80`.

## §8 The build order this measurement supports

The constraint is the operator's and it is a file constraint, not a taste one: **credential failure
handling and credential lifecycle share owners and must be integrated sequentially, and no
concurrent writers may be assigned to credential, login or main shutdown files.**

The overlap is real and this is what it is: item 1 edits `credentials/keep.ts` and
`logins/ipc.ts`; item 2 edits `credentials/security.ts`, `watch.ts`, `locks.ts`, `index.ts`,
`logins/ipc.ts` and `capabilities.ts`. **`logins/ipc.ts` is written by both.** Item 2 also needs to
know what item 1's activation path settled on, because "settle an activation before quit" is a
statement about the function item 1 is rewriting.

| Slot | Work | Files | May run beside |
| --- | --- | ---: | --- |
| 1 | §4, the deadline probe's ablation and teardown proof | `build/probe-control-deadline.mjs` only | anything |
| 1 | §5, the split-profile diagnosis | `build/probe-p167-scale.mjs`, plus renderer files once the snapshots name an owner | anything, **until** it names a renderer owner |
| 2 | §1, truthful activation outcomes | `credentials/keep.ts`, `logins/ipc.ts`, their tests | slot 1 |
| 3 | §3, one shutdown owner | `credentials/security.ts`, `watch.ts`, `locks.ts`, `index.ts`, `logins/ipc.ts`, `capabilities.ts` | slot 1 |
| 4 | the closing audit, Tier 1 | `docs/audits/` | nothing; it is last by definition |

So: **items 4 and 5 are the parallel pair**, because one owns a probe under `build/` and the other
owns a probe plus, later, a renderer file — and neither touches a credential, login or shutdown
file. **Items 1 and 2 are strictly sequential in that order**, 1 before 2, because item 2's join has
to own the function item 1 leaves behind rather than a function it is about to replace. The audit is
written last, at one commit, after every repair is integrated.

Two cautions for whoever runs the memory item. Its diagnosis phase touches only `build/`, but the
moment it names a repair target in `src/renderer/` it stops being free of the others' concerns only
if that target is a credential or shutdown file, which it will not be — `TerminalPane.tsx` and
`sessions-slice.ts` are the brief's starting points. And its final proof is three probe runs on the
**candidate** commit, so it cannot be scheduled before integration.

## §9 What this measurement did not do

- It ran no app-level credential drive. `npm run probe:p202`, `p203` and `p211` were not run; the
  credential findings here are proved under `vitest` over the shipping modules and their injected
  seams, which is enough to reproduce them and is not enough to close them.
- It did not run `npm test`, `npm run test:hermetic`, `npm run test:native`, `smoke:t1` or
  `smoke:t3`. Those belong to the integrator's battery.
- It captured no heap snapshot and no retaining path. That is item 5's own work and the brief is
  explicit that a diagnosis without retaining paths is a guess.
- It measured nothing on the operator's own machine state beyond reading his session count. His
  `-L gmux` server held 12 sessions before and after every probe. No Electron of this measurement's
  survived any run; the census after the last one found only his own running Tortie and other
  applications' helpers. Two dead socket FILES, `gmux-p83-deadline-13026` and
  `gmux-p83-deadline-90952`, remain in `/private/tmp/tmux-501/` after the deadline probe killed
  their servers; they were deliberately left rather than removed, because socket `gmux` lives in
  that directory and no removal is worth running beside it.
- **`out/p167/report.json` is overwritten by each run**, so only run 4's structured report survives.
  Runs 2 and 3 are preserved as their full console logs, which carry every number quoted in §5. A
  builder repeating this should set `P167_OUT_DIR` per run.

---

## §10 The split profile, investigated. What it refutes, and what is still open

Added 7 September 2026 by the builder of the phase's two probe items, after §5's
own instruction that causation "must not be assumed" and must be established
before any renderer file is edited. It was, and the answer changes what §5 says.

### The subject did not move between the failing runs and these ones

```
git diff --stat b5cc017 <the commit the probe repairs were built on> \
  -- src/renderer src/shared src/preload
(empty)
```

So every run below drives the same renderer bundle the two failing runs drove.
Only `src/main`'s credential domain and two files under `build/` moved. A run
here is a run at the parent for this profile, which is why no separate parent
build was made.

### Seven runs, none of them reproduced it

| Run | Shape | Heap a block | Nodes | Detached elements | Verdict |
| --- | --- | --- | --- | --- | --- |
| A | d, 2 blocks x 3 cycles | 10.0, 10.0 | 448 flat | not yet read | pass |
| B | d, 3 x 6 | 10.3, 10.0, 10.0 | 448 flat | 0, 0, 0 | pass |
| C | d, 3 x 6, at a quarter CPU speed | 10.3, 10.0, 10.0 | 448 flat | 0, 0, 0 | pass |
| D | b, c, d, beside another app doing the same work | 28.5, 28.4, 28.5 | 502 flat | 13, 13, 13 | pass |
| E | d, 2 x 6, one heap snapshot a block | 10.3, 10.0 | 448 flat | 0, 0 | pass |
| F | b, c, d, the phase's own final full run | 28.4, 28.4, 28.5 | 502 flat | 13, 13, 13 | pass |
| G | d, 3 x 6, the first focused final run | 10.3, 10.0, 10.0 | 448 flat | 0, 0, 0 | pass |
| H | d, 3 x 6, the second focused final run | 10.3, 9.9, 9.9 | 448 flat | 0, 0, 0 | pass |

Neither of the two levers Phase 200 used on the surface profile reproduced it:
not the CPU throttle, which run C drove at 4x on this profile for the first
time, and not contention, which run D drove beside a second app doing the same
work. **No owner was named and no renderer file was changed on a guess.**

### §5's inference about the passing run is REFUTED

§5 read run 4's flat DOM node count as "its workload recorded nothing", and
built on that a requirement for a floor on work landed. The floor is a good
requirement and it is now in the probe. The inference behind it is wrong, and it
matters because it points the next round at the wrong thing.

**Profile d draws no Past Sessions rows at all.** The panel is a modal
(`src/renderer/app/PastSessionsModal.tsx`, behind `lazy-modals.tsx`) and this
profile never opens it. The probe's header says the opposite, that the profile's
node budget is off "because the Past Sessions data that leaves behind grows the
DOM by design", and that sentence is stale.

The workload in the flat runs landed in full, read three ways:

- block times of 153 to 177 seconds for six cycles, which is real session
  creation and not a skipped loop;
- `.xterm >= 4` seen on every cycle, so zero open misses, and `settleSessions`
  reporting nothing left;
- and, now that the probe asks the app rather than the DOM,
  **`sessions.listRemoved` reading 0, then 24, then 48, then 72** — exactly the
  four sessions each of six cycles creates and kills, recorded as history, in
  every one of the three final runs.

So a flat node count in this profile is the HEALTHY reading, not an absent
workload. The +1,020 nodes a block in the failing runs were entirely DETACHED,
which is why the elements reachable from the document stayed flat beside them,
and detached elements are never Past Sessions and never drawn. That is the
discriminator this profile lacked and now has.

### The retaining paths, which is what the brief asked for

`build/heap-retainers.mjs` reads a `.heapsnapshot`, walks breadth first from the
root so every node carries its shortest retaining path, never lets a `weak` edge
be a retainer, and reads V8's own `detachedness` field. Over run E's two
snapshots, taken a block apart with 24 more sessions discarded in between:

| Reading | block 1 | block 2 |
| --- | ---: | ---: |
| nodes in the snapshot | 268,088 | 261,029 |
| objects marked detached | 0 | 0 |
| Terminal-shaped objects | 74 | 74 |
| ScrollSurface objects | 5 | 5 |
| objects named `xterm...` | 56 | 56 |

Every session-shaped count is identical and the total FELL. **There is no
per-session retention in this tree to attribute**, which is the positive
statement a slope alone cannot make.

One constant remnant is worth writing down because a later run will see it: when
the surface profile runs first, one `div.xterm-scrollable-element.mac` of nine
nodes is left detached and stays detached for the rest of the run. It does not
grow, it is 9 nodes against the 1,020 the finding is about, and it is under the
census budget. It is a curiosity, not this finding.

### What this leaves for the phase, and for Lifecycle's score

The brief's rule is explicit: until the split half is repaired or independently
explained with retaining paths, **Lifecycle stays at 2**. It is not repaired and
it is not explained. Seven green runs are not proof that an intermittent slope
ended, and this section is not asking anyone to read them that way.

What changed is that the ruler can now name an owner the day it comes back: the
detached census in every reading with its own budget, the workload floor under
it so an empty run is inconclusive rather than green, a heap snapshot a block
behind `P167_SNAPSHOT=1`, and a planted leak at the end of every run that proves
the census sees 1,032 planted detached elements, that the grader goes red on
them, and that the page let all of them go.
