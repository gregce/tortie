# Phase 261 — the sixth nits round, and the harness rule two rounds failed to keep

**Subject** `fix(nits): the small things, and the harness that refuses`
**First body line** `Phase 261: the sixth nits round`
**Semver** patch. Item 3 changes WHEN a selection lands and never what the sheet does, so
nothing a person can name as a new behaviour ships; if the builder finds otherwise, minor.
**Parent** `fb4b8a4f`. Worktree `/private/tmp/wt-p261`. The operator's checkout is never written.

This spec is the answer to the charter's ten items. Every item below was read **at its source in
this tree** rather than from the entry's summary, and where the source is a verdict that lives in
no file — items 4, 5, 6, 7, 8 — the claim was **re-derived by running the shipping code**, which is
stronger than a quotation. Every re-derivation printed in this document was produced in this
worktree on 2026-09-12 and the command that produced it is named.

**THE ROUND INVENTS NOTHING.** Three things this spec noticed and deliberately does NOT queue are
listed in §12, so a later round finds them written down rather than rediscovers them.

---

## 0. The safety rules this phase runs under, restated because item 1 IS one of them

- Every Electron goes through `build/electron-run.mjs`, with a harness term set AND a scratch
  socket named `gmux-p261-<pid>`, ended in a `finally` with the socket unlinked.
- Before and after **every** app run: `tmux -L gmux list-sessions` (list only, never attach, never
  kill), both numbers reported. **They were 42 when this spec was written.** If they differ, stop.
- No machine, no ssh, no keychain, no token. `~/.ssh`, `~/.claude`, `~/.codex` read only.
- No version bump, no tag, no release, no GitHub post, no package installed.
- Commits: `type(scope): summary`, `Phase 261: the sixth nits round` as the first body line, no
  trailers.

---

## 1. The harness must refuse a launch whose socket override was ignored — **Tier 3**

### Its source, quoted

Phase 86.1's table, row 3 (docs/BACKLOG.md:11881ff, the row credited to Phase 87):

> The written instruction in the row above has now failed a second time, and the next round that
> touches `build/` must make the harness refuse to drive an app whose socket override was ignored.
> … It created two sessions there, being `shell-1-6` at 22:19:53 and `claude-1-4` at 22:20:20 on
> 2026-08-19 … The app logged "GMUX_TMUX_SOCKET is set but this is not a harness launch, so it is
> ignored" three times and nobody read it. … So the harness itself must read that line from the app
> log, or assert which socket the app actually used, and stop the run rather than continue. Relying
> on a person to remember has now been measured at 0 of 2.

### Where it lives today

- `src/main/tmux/resolve.ts:1181-1198` — `activeTmuxSocket`. Line 1183 asks `isHarnessLaunch(env)`;
  lines 1184-1189 warn and return `TMUX_SOCKET` when it answers false.
- `src/main/harness/launch-gate.ts:37-44` — `isHarnessLaunch`: `GMUX_SMOKE`, `GMUX_SHOT`,
  `GMUX_UPDATE_REHEARSAL`, `GMUX_PROBES` at any value.
- `build/electron-run.mjs` — `withElectron` at line 560 composes the child env as
  `{ ...process.env, ...(options.env ?? {}) }` at line 610 and spawns at line 608. It refuses a
  profile (`refuseProfileReason`) and a socket NAME (`refuseSocketReason`) and asks **nothing at all**
  about the pair (socket, harness term).
- `build/harness-socket.mjs:248-257` — spawns the harness command with `GMUX_TMUX_SOCKET: socket`
  and `GMUX_HARNESS_DIR: runDir` **and no harness term at all**.

### THE MEASUREMENT THAT DECIDES THE DESIGN, taken in this worktree today

The defect is not historical. `build/harness-socket.mjs` hands every wrapped run a socket and no
term, so any wrapped script that launches the app with its own environment inherited and no term of
its own runs against `-L gmux`. Two live instances are in the tree at `fb4b8a4f`:

| File | What it does | What the app therefore uses |
| --- | --- | --- |
| `build/p134-about-shot.mjs:136` | re-runs itself through `harness-socket.mjs` (line 85-94), then `withElectron({ …, env: { ...process.env } })`. The file names no harness term anywhere. | `-L gmux`, his live server |
| `build/p256/probe-explorers.mjs:29-30` | `env: { HOME, GMUX_HARNESS_DIR, P256_FILES }`, `tmuxSocket: 'gmux-p256-<pid>'` — a scratch socket named for the TEARDOWN with nothing in the child's env pointing the app at it | `-L gmux` (`entry:false`, so it is not Tortie main; the declared socket is a server nothing creates) |

Scanned with a walk over the 396 `.mjs/.mts/.js` files under `build/`: 137 files that call
`withElectron`/`runElectron` name `GMUX_TMUX_SOCKET`, 137 name a harness term, 1 names the socket
and no term (`p134-about-shot.mjs`), 2 pass a `tmuxSocket` option with no `GMUX_TMUX_SOCKET` in the
file at all (`p249/measure-mock.mjs`, whose value is `null` and is therefore fine, and
`p256/probe-explorers.mjs`).

**That file-level scan is exactly the kind of check that failed twice**, because a script that
spreads `process.env` inherits the socket without ever naming it. So the guard is NOT a scanner.

### THE DECISION: the refusal lives in FOUR places, and three of them are mechanical

A guard a probe author has to remember is the thing that failed twice. Each layer below is reached
without anybody writing a line in a new probe.

**Layer 1 — the source is cured.** `build/harness-socket.mjs` adds
`GMUX_PROBES: process.env['GMUX_PROBES'] ?? '0'` to the child env beside `GMUX_TMUX_SOCKET`. That
one line makes every wrapped run a harness launch, so the socket it was given is honoured.
`GMUX_PROBES='0'` is the documented pair (`launch-gate.ts:53-58`): `isHarnessLaunch` is true, so the
socket moves; `probesRequested` needs exactly `'1'`, so no renderer drive is armed; `isIsolatedLaunch`
is untouched, so the single-instance lock and `use-mock-keychain` behave exactly as before. An
inherited value is preserved rather than clobbered, so `GMUX_PROBES=1` runs are unchanged.
**Two other things follow and both are safety improvements, not side effects:**
`src/main/credentials/index.ts:294` gives a harness launch the FILE vault instead of his keychain,
and `src/main/credentials/migrate.ts:125` refuses the vault migration on a harness launch. A wrapped
run that used to reach his real keychain now cannot.

**Layer 2 — the pre-launch refusal, in the one helper every launch goes through.**
`withElectron` reads the **composed** child env (`{...process.env, ...options.env}`) before it
spawns anything, and throws when:

  2a. `GMUX_TMUX_SOCKET` is non-empty and no `isHarnessLaunch` term is set. The message names the
      variable, the four terms, and `GMUX_PROBES: '0'` as the minimal fix.
  2b. `options.tmuxSocket` is a string and the composed env's `GMUX_TMUX_SOCKET` is not that exact
      name. The teardown would otherwise end a scratch server the app never used while the app used
      `-L gmux` — which is `p256/probe-explorers.mjs`'s shape exactly.

  The two refusals are placed **first in `withElectron`, above `refuseProfileReason` and above the
  program-existence check**, so the gate can drive them with no Electron on disk and nothing is
  created on the way to the throw (`mkdirSync` and `installNet` both run later).

  Layer 2 does NOT refuse a launch that names neither a socket nor a `tmuxSocket`. It prints one
  warning line saying the app will use `-L gmux`. Refusing would break launches that legitimately
  start no tmux, and the effect those launches could have is what layer 4 catches.

**Layer 3 — the app is ASKED which socket it used, and the helper judges the answer.**
`src/main/machines/context.ts`'s `localMachineContext()` is the one place in the product that
decides the local socket (line 321, `socket: activeTmuxSocket()`), and it caches, so it prints
exactly once per launch. It emits one raw line immediately after the context is composed:

```
[gmux-socket] local tmux socket: <socket> (GMUX_TMUX_SOCKET=<raw or "unset">, harness launch: yes|no)
```

Raw `console.log` rather than a scoped log, for the reason the harness protocol families in
`src/main/log/index.ts:17` are raw: the line must read identically in every launch shape, packaged
or not, with or without `GMUX_LOG_FILE`.

`withElectron` watches the child's output — it already accumulates every byte of stdout and stderr
in `onText` — for `/^\[gmux-socket\] local tmux socket: (\S+)/m`. When the announced socket is not
the one the launch asked for, it ends the launch through the existing teardown and throws, naming
both. **This is the half that asserts rather than trusts**: it reads the app's own answer, so a
variable that never reached the child, a term spelled wrongly, and a future change to
`isHarnessLaunch` are all caught by the same reading. A launch that prints no such line asserts
nothing (a launch that resolved no tmux context), and that is a stated limit in the helper's header.

**Layer 4 — the census, which is the operator's own ritual made mechanical.**
When a launch asks for a scratch socket, `withElectron` reads the SESSION NAMES on `-L gmux` with
`tmux -L gmux list-sessions -F '#{session_name}'` immediately before the spawn and immediately after
the teardown, and fails the run when a name appears that was not there before, printing the new
names the way the two incidents printed `shell-1-5`, `cursor-1-2`, `claude-1-4`, `shell-1-6`.
`list-sessions` is the ONLY verb this file may ever aim at `-L gmux`, and the gate asserts that.
A census failure is **thrown when the body returned normally** and **printed as an error line when
the body already threw**, so it can never mask the body's own error. A server that is not running
answers zero rather than failing. Stated limit, in the header: the operator creating a session by
hand during a probe run fails that run, loudly and by name; that is the safe direction.

### What changes

| File | Change |
| --- | --- |
| `build/electron-run.mjs` | layers 2, 3, 4; exported pure helpers `socketRefusalReason(env, tmuxSocket)`, `socketFromAnnouncement(text)`, `announcementFinding({ wanted, announced })`, `censusFinding(before, after)`, and `liveSessionNames(socket)` as the one `-L gmux` reader; header section for each |
| `build/harness-socket.mjs` | layer 1, with the reason in the header |
| `src/main/machines/context.ts` | the announcement line and its comment, and nothing else |
| `build/p134-about-shot.mjs` | nothing — layer 1 cures it. The builder RE-RUNS the scan and reports it |
| `build/p256/probe-explorers.mjs` | `tmuxSocket: null`, because it starts no tmux at all (`entry:false`, its own app directory). One line and one comment |

### How it is proved

**Gate, in the commit battery: `npm run gate:electron` gains rule 5.** It still spawns nothing,
opens no profile and launches no Electron, and the header says so with the new arms named.

- 5a `withElectron` is really CALLED with a composed env naming a socket and no term, with the
  process's own harness terms scrubbed. It must reject; the message must name `GMUX_PROBES`; a
  sentinel proves the body never ran and `refuseProfileReason` never got the chance to speak.
- 5b the same call with `GMUX_PROBES: '0'` added and `program: '/nonexistent/p261'` must reject with
  the PROGRAM message, which is how the gate proves the socket refusal passed without launching
  anything.
- 5c `tmuxSocket` named while the composed env names a different socket, and while it names none:
  both rejected, both messages naming the pair.
- 5d `socketFromAnnouncement` over six fixture texts (absent, present, present twice, leading noise,
  a line in the middle of a chunk boundary, a line inside quoted output) and `announcementFinding`
  over its four combinations.
- 5e `harness-socket.mjs` names a harness term inside the argument object of the same `spawn(` call
  that names `GMUX_TMUX_SOCKET`, read by matching braces with `build/scan-source.mjs`, proved on
  three planted texts of which two must fail (one with no term, one with the term in a comment).
- 5f every `-L gmux` argv composed anywhere in `electron-run.mjs` is a `list-sessions`, proved on
  two plants (a `kill-server` and a `new-session`).
- **Ablations, one clause each, every one must turn a named arm red**: the 2a clause removed, the 2b
  clause removed, the announcement comparison removed, the census comparison removed, and the
  harness-socket term removed. A copy of the helper that fails to LOAD fails the gate for the wrong
  reason, so each ablated copy is required to load and answer before its arm is judged — the Phase
  219 rule.

**Driven, not read: `node build/p261/probe-p261-socket.mjs`**, registered in package.json as
`probe:p261socket` and classified `electron(...)` in `build/verification-checks.mjs`. ONE Electron
at a time, never two, on a scratch profile with a scratch `HOME` under `GMUX_HARNESS_DIR`, socket
`gmux-p261-<pid>`, no agent, no token, no keychain, no request, `-L gmux` read twice and never
written. Arms:

- **A. the positive.** The real app, `GMUX_PROBES='0'` and the scratch socket. Read the announcement
  off the live output; it must name the scratch socket. `tmux -L gmux-p261-<pid> list-sessions` must
  answer, so a server really exists there. His `-L gmux` names identical before and after.
- **B. the pre-launch refusal, live.** The same options with the term removed. `withElectron` must
  throw; nothing may be spawned; his server is untouched because nothing ran.
- **C. the in-flight assertion, with no Electron and no contact with his server.** `program` is
  `process.execPath` and `entry:false`, pointed at a six-line script the probe writes that prints
  `[gmux-socket] local tmux socket: gmux` and then sleeps. The helper must end it and throw naming
  the mismatch, and the fake app's pid must be gone afterwards. **This is the arm that proves the
  assertion fires against the answer `gmux` without ever putting the real app on his server.**
- **D. the ablation, live.** A copy of `electron-run.mjs` in a scratch directory with the 2a clause
  removed, imported by the probe; arm B's call must then get past the refusal (and fail on the
  nonexistent program), so the arm is shown able to read the other answer.
- **E. the census, pure.** `censusFinding` over four fixtures: unchanged, a name added, a name
  removed, both. The live half is arm A's own before/after reading.
- `--self-test` proves the graders on fixtures and launches nothing.
- The probe writes its result through the item 2 convention.

**`HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` moves 129 → 131** in this same commit,
because this round adds two probes that reach the helper (`build/p261/probe-p261-socket.mjs` and
`build/p261/probe-p261-cmdt.mjs`), and a probe added without raising the floor is one that could be
deleted again in silence. `node build/assert-electron-teardown.mjs --list | wc -l` read **129** at
the parent; it must read **131** at HEAD. **Builder A owns that constant for BOTH probes**, so no
two builders edit it.

---

## 2. A drive script writes its result to a file — **Tier 1**

### Its source, quoted

Phase 86.1's table, row 4 (from Phase 90.2):

> A drive script prints its answer to a console and nobody saves it, so the evidence is gone the
> moment the transcript is. This round lost the numbers for its own Escape re-drive that way.
> `p902rv/p90.2-rv-escape.mjs` ends in three `console.log` calls and holds no write, so the phase
> entry has to say the fix was not measured. Phase 87 lost a whole study the same way. The rule the
> next round writes into `build/` is that a drive script writes its result to a file under the
> scratchpad and the verifier reads that file, rather than relying on console output surviving.

`p902rv/p90.2-rv-escape.mjs` is not in this tree; it was a scratch script in the Phase 90.2
worktree, which is the defect itself. The charter is explicit: **state the convention, retrofit
nothing.**

### What changes

`build/drive-result.mjs`, new, ~60 lines, importing only `node:fs`, `node:os` and `node:path`:

```js
export function driveResultPath(name)            // where this run's result goes
export function writeDriveResult(name, value)    // writes it, prints the path, returns the path
export function readDriveResult(path)            // the verifier's half
```

Destination, first that is set: `GMUX_DRIVE_RESULTS`, then `GMUX_HARNESS_DIR`, then
`${TMPDIR:-/tmp}/tortie-drive-results`. File name `<name>-<pid>.json`, pretty printed, with
`{ name, pid, cwd, startedAt, finishedAt, value }`. It prints exactly one line,
`[drive-result] wrote <absolute path>`, so the transcript names the file even when the transcript is
all that survives. The header carries the whole rule and the two losses (Phase 87's study, Phase
90.2's Escape re-drive) as the reason, because a convention with no reason on it is one a later
round deletes as ceremony.

`DEVELOPMENT.md` gains one short paragraph under `### Scripts` naming the module and the rule, and
one row in the environment-variable table for `GMUX_DRIVE_RESULTS`. That is the whole documentation
change.

**Both probes this round adds use it**, which is what stops the convention being a file nobody
imports.

### How it is proved

`node build/drive-result.mjs --self-test` writes into a scratch directory it removes in a `finally`,
reads the file back, proves the three destinations in priority order and that a missing
`GMUX_HARNESS_DIR` falls through. It launches nothing and spawns nothing. It runs in the builder's
own check and is named in the commit body; it is NOT added to the commit battery, because a
convention module with one self-test does not earn a gate. `gate:checks` and `gate:background` must
stay green over the new file, and `gate:electron`'s forward rule must read nothing in it.

---

## 3. The ⌘T name selection race — **Tier 2** (the operator reported it; the parent measurement is mandatory)

### Its source, quoted

Phase 86.1's table, row 1 (from Phase 86):

> The prefilled name in the Cmd-T sheet is selected on some opens and not on others, so pressing
> Cmd-T and typing a letter replaces the name most of the time and appends to it some of the time.
> The cause is `requestAnimationFrame(() => nameRef.current?.select())` at
> `src/renderer/app/CreateSessionModal.tsx:408` racing React's commit of the prefilled name, which
> the same effect sets. … the whole name was selected on 6 of 6 opens under no load … Under load
> average 13.5 the same build gave the opposite answer on 1 of 3 opens, reading 0 of 262 frames
> selected and settling at caret 8. … **The 6 of 6 figure is optimistic and a later reader should
> not treat it as reproducible.** A second person measured the same build twice and read 5 of 6
> opens selected at load average 3.38 to 3.59, and in both runs the open that lost was the first one
> after a burst of create and kill work.

### Where it lives today

`src/renderer/app/CreateSessionModal.tsx:723`, inside the `useEffect` keyed on `[open]` that starts
at line 689: the same effect calls `setName(...)` at line 704 and then
`requestAnimationFrame(() => nameRef.current?.select())` at line 723. The input is
`#session-name` at lines 1319-1329, controlled by `value={name}`, with no `autoFocus`. The only
`focus()` in the file is line 994, in `submit`, on the empty-name refusal.

The race, stated exactly, because the fix has to be a claim about ORDER: the passive effect runs
after the commit in which `open` became true, and the DOM input then still holds the PREVIOUS
value. `setName` schedules a second render. The `requestAnimationFrame` callback is scheduled from
inside the passive effect and fires at the next frame, which may be before or after the second
commit mutates the DOM. When it is before, `select()` runs against the old value and the committed
prefill is never selected.

### What changes

A **layout effect keyed on the committed value**, replacing the frame callback:

```tsx
/**
 * Exported pure so a test can prove the rule without a DOM: this tree's vitest
 * environment is `node`.
 *
 * `domValue === name` is the whole fix. It is not a tidiness check — it IS the
 * question "has React committed the prefilled name yet", asked of the DOM
 * rather than assumed by a frame callback.
 */
export function shouldSelectName(
  open: boolean, touched: boolean, domValue: string, name: string
): boolean {
  return open && !touched && name !== '' && domValue === name;
}

useLayoutEffect(() => {
  const el = nameRef.current;
  if (el === null) return;
  if (!shouldSelectName(open, nameTouched, el.value, name)) return;
  el.select();
}, [open, nameTouched, name]);
```

Why this shape and not a `once` ref: a layout effect runs after the DOM mutation and before paint,
so on the commit that carries the prefill the guard is true and the selection is in place in the
same frame the value first appears — **no painted frame can ever show the prefilled name
unselected**, which is the property the app run measures. On the earlier commit the DOM still holds
the stale value and the guard is false. When a reopen computes the SAME name the stale value already
equals it and the selection lands on the first commit, which is equally correct — the guard is about
the value, not about identity, and that is why no `once` ref is needed. `nameTouched` is what stops
a re-select after the person types; the Phase 48 settle hop, which rewrites the name while it is
untouched, re-selects, and that is the right answer for the same reason ⌘T selects at all.

**The focus behaviour must not move.** The fix calls the same method on the same element, so
whatever `select()` does about focus today it does after it. The builder adds no `focus()` and
removes none, and the app run reads `document.activeElement` on both sides and requires the same
answer. If the two sides disagree the item is a needs_work and not a nit.

The `requestAnimationFrame` line is deleted from the `[open]` effect, and a one-line comment there
points at the layout effect so a later reader does not put a frame callback back.

### How it is measured — the honest instrument, and the answer to "how many opens"

`node build/p261/probe-p261-cmdt.mjs`, `probe:p261cmdt`, classified `electron(...)`. ONE Electron on
a scratch profile, a scratch `HOME`, socket `gmux-p261-<pid>`, `GMUX_PROBES='1'` so
`window.__gmuxShotDrive` is armed, over a scratch project directory it makes itself. **No session is
ever created**: the sheet is opened and Escaped, Create is never pressed, no agent is spawned and no
token is spent.

**The reading is a property of PAINTED FRAMES, not a settled state**, because a settled state cannot
tell the fix from a race that happened to win. Per open the probe:

1. evaluates a snippet installing a `requestAnimationFrame` loop that pushes, every frame,
   `{ present, value, selStart, selEnd, activeId }` read off `#session-name`;
2. presses the real chord with `Input.dispatchKeyEvent` (`key: 't'`, `metaKey`), which is a renderer
   keydown at `src/renderer/app/keyboard.ts:432` and not a native menu accelerator, so CDP reaches
   it;
3. samples ~400 ms, which is ≥ 20 frames at 60 Hz and far more under the throttle;
4. reads the array back and stops the loop;
5. presses Escape and waits for the sheet to be gone.

Per open it computes `committed` = frames whose `value` is the prefill (`/^[a-z-]+-\d+$/`), and
`unselectedCommitted` = those of them where `selStart !== 0 || selEnd !== value.length`. **An open
fails when `unselectedCommitted > 0.**

**How load is induced.** Not by shell burners — the 2026-09-02 incident (six loops, two hours at
about 550% of his CPU) is why this round starts no load generator at all. The window is widened with
`Emulation.setCPUThrottlingRate`, which is the instrument `probe:p167` already uses and which spawns
nothing. Half the opens run at rate 1 and half at rate 20, and the probe prints both halves
separately, because the no-throttle half is the shape he actually uses and the throttled half is the
one that reaches the race.

**How many opens.** **20 at rate 1 and 20 at rate 20 on each side, 40 per side, 80 in total.** The
charter asks for at least twenty each side; the throttle axis doubles it because a reading taken
only on an idle machine is the 6-of-6 reading this item exists to distrust.

**The parent measurement is mandatory and is the only arm that can tell the fix from the race.** The
probe runs twice: at HEAD, and over a build with `src/renderer/app/CreateSessionModal.tsx` put back
to `fb4b8a4f`'s bytes and rebuilt — the `probe:p238u` and `probe:p240` precedent.

- HEAD must read **0 of 40** opens with an unselected committed frame, at both rates.
- The parent reads whatever it reads and the number is published as it is.
- **If the parent also reads 0 of 40, the probe prints INCONCLUSIVE and the phase says so** rather
  than claiming the fix was proved. The property argument and the unit test still carry the change;
  what is not claimed is a measured difference. An arm that can only pass is not an arm.

`--self-test` proves the grader on fixture frame arrays (all-selected, none-selected,
selected-from-frame-3, a run with no committed frame at all) and launches nothing.

**Under `npm test`**, `src/renderer/app/__tests__/p261-name-selection.test.tsx` pins
`shouldSelectName`'s truth table, including the exact race case (`domValue` is the stale name →
false; `domValue === name` → true; touched → false; empty name → false), and asserts over the file's
own text that the selection is inside a `useLayoutEffect` and that no `requestAnimationFrame` names
`nameRef` anywhere in the file. There is no jsdom in this tree, so a rendered-DOM test is not
available and the app run is the DOM evidence — that limit is stated in the test's header.

---

## 4. `surface.http.handlefunc` accepts an absolute URL — **Tier 1**

### Its source, and the re-derivation

The verdict is not in the tree. The claim was re-derived by running the SHIPPING reader over a
planted Go fixture through `build/p257/facts-driver.mts` (the same driver `conformance:facts` uses):

```
srv/routes.go:4  surface.http.handlefunc  ::  HTTP GET https://evil.example.com/abs
srv/routes.go:5  surface.http.handlefunc  ::  HTTP https://evil.example.com/plain
srv/routes.go:5  network.client           ::  talks to https://evil.example.com/plain
srv/routes.go:6  surface.http.handlefunc  ::  HTTP GET /v1/ok
```

**The entry named the pattern branch and the plain branch is affected too**, which the summary does
not say: `pathish('https://evil.example.com/abs')` is true because the token carries a slash and no
character outside `[a-z0-9_\-/:{}*.<>=]` (`src/main/arch/facts/predicates.ts:68-74`).

### Where it lives today

`src/main/arch/facts/rules-surface.ts:64-81`, `surface.http.handlefunc`. Its sibling
`surface.http.method-call` carries the refusal at line 59: `if (/^(https?|wss?):\/\//.test(p)) return null;`

### What changes

Inside `handlefunc`, after the method pattern is split and before `pathish` is asked, one refusal
over the resolved target, so both branches are covered by one clause:

```ts
const target = method !== null ? (method[2] as string) : p;
if (/^(https?|wss?):\/\//.test(target)) return null;
```

**The `method-call` line 59 is NOT touched and no shared constant is extracted.** That line is the
exact `from` text of the gate's H3 ablation (`build/conformance-facts.mjs:402-408`); rewriting it
would make the ablation fail with "found nothing to edit", which is a gate that dies rather than a
gate that fails. Two spellings of one two-word regex is the cheaper mistake.

### How it is proved

`npm run conformance:facts`. Two decoy lines in `build/fixtures/facts/go/` — a `HandleFunc` with an
absolute URL in the Go 1.22 pattern and one with a bare absolute URL — with
`build/fixtures/facts/expected.json` updated in the same commit, and a control line
(`mux.HandleFunc("GET /v1/ok", h)`) that must still read a route so a rule that refused everything
cannot pass. One new ablation, `rule 1, the absolute-URL refusal removed from
surface.http.handlefunc`, which must go red.

---

## 5. A concatenated path reads its first literal — **Tier 1, and it is the one item with a refusal condition attached**

### Its source, and the re-derivation

Re-derived over the shipping reader:

```
srv/app.ts:2  surface.http.method-call  ::  HTTP GET /              // app.get('/' + 'a', h)
srv/app.ts:5  network.client            ::  talks to https://a.example.com   // fetch('https://a.example.com' + '/y')
```

`app.get('/' + 'a', h)` declares `/a` and is reported as `/`. **A route rule cannot tell this from a
real root route**, because `app.get('/', h)` is a legitimate declaration, so the refusal cannot live
in a rule: the rule is handed the string `/` and nothing else.

### Where it lives today

`src/main/symbols/calls.ts:177-190`, `argString`. Its last loop returns the first string child of
any node with at most two named children, which is there to unwrap a ruby `to: "a#b"` pair and a
swift `value_argument` (the comment at lines 172-176). A `binary_expression` is also a two-child node
whose first child is a string, so a concatenation is read as its first half.

### What changes, and the condition that can refuse it

`calls.ts`'s own header states the refusal this item runs into:

> Where this file could have improved on the prototype it did not, on purpose: the numbers were
> measured with exactly these shapes, and a change here moves them without anybody re-judging a row.

So the change is the **narrowest closed one available**, and it ships only if it is measured to move
nothing else:

```ts
/**
 * The nodes that JOIN two values. Measured off the shipped grammars rather than
 * remembered, the way every other node name in this file was.
 */
const JOINING_NODES: ReadonlySet<string> = new Set([...]);   // e.g. binary_expression, binary_operator, binary
```

asked at the top of `argString`: a node of a joining type has no string value, because half of a
concatenation is not the value the call holds. Python's `concatenated_string` is a genuine adjacent
literal and stays in `strings`, untouched.

**Which half is closed is the whole argument.** The wrapper half (pairs, keyword arguments, labelled
arguments) is OPEN and an allowlist of it would silently lose real facts — `requests.get(url="…")`
is a two-child `keyword_argument` whose string is the URL. The joining half in these six grammars is
CLOSED and can be read off the grammars. This is `CLIENT_RECV`'s own reasoning
(`predicates.ts:28-35`) applied to the other side.

**THE MEASUREMENT THAT DECIDES.** The builder runs the shipping reader with and without the change
over (a) the eight committed fixtures and (b) this checkout's own `src/`, and diffs the fact sets.
**The change ships only when every difference is a planted decoy.** If any other fact moves, the
change is **refused and the class becomes a stated limit** in `calls.ts`'s header beside the
sentence quoted above, naming `app.get('/' + 'a', h)` and saying that the reader takes the first
literal. The node names must be READ off `rootNode.toString()` against the shipped wasm, not
remembered — that is this file's own standing rule.

**What is NOT claimed either way**: the ten-repository corpus of research 118 is not in the tree
(`build/p257/corpus.sh` re-clones it), so no corpus number is re-measured in this round and none is
quoted as having moved. Precision cannot fall, because the rows removed are rows whose subject was
never the value the code holds; recall on a repository that writes a route as a concatenation falls,
and that sentence goes in the header whichever way the measurement lands.

### How it is proved

`npm run conformance:facts`: two decoys (a concatenated route, a concatenated URL) with a control
(`app.get('/plain', h)` which must still read), `expected.json` updated, and one ablation, `rule 1,
the joining-node refusal removed from argString`, which must go red.

---

## 6. The remaining network false classes — **Tier 1, and this is where the charter's third question is answered**

### Its source, and the re-derivation

Three classes, each re-derived over the shipping reader:

```
srv/mock.ts:3    network.client :: talks to https://api.example.com/u   // msw  http.get(...)
srv/mock.ts:4    network.client :: HTTP client call                     // msw  http.post('/local', ...)
srv/mock.ts:6    network.client :: talks to https://x.example.com       // requests.Request('GET', url)
srv/urlarg.py:2  network.client :: talks to https://picked.example.com/p // anything("https://…")
```

### Where they live today

`src/main/arch/facts/rules-network.ts:61-82`, `network.client`. Line 70 is the URL-argument branch
(`s.args.find(reachableUrl)`), line 72 the bare `fetch` branch, lines 73-75 the receiver branch.

### The answer, class by class

**Class 1, msw mock handlers — FIXED.** A refusal at the TOP of the rule, because the URL-argument
branch fires before the receiver branch and would otherwise keep answering for the same site:

```ts
// An msw handler DECLARES a route a test will answer; it reaches nothing. The
// test is the FILE, the way `NAMES_CLAP` is in rules-surface.ts, because these
// live in `src/mocks/handlers.ts` rather than under a test path — which is why
// the test-path refusal never caught them.
if (/^(http|https|graphql)$/.test(s.recv) && NAMES_MSW.test(c.text)) return null;
```

with `NAMES_MSW = /\bfrom\s+['"]msw(\/\w+)?['"]|require\(['"]msw(\/\w+)?['"]\)/`. Precision rises;
the cost is a real `http.get` in a file that also imports msw, which is stated in the header.

**Class 2, `requests.Request(...)` by call rather than `new` — FIXED on the receiver branch, and
the honest half is that it changes nothing when the URL is a literal.** The receiver branch's verb
test is case-insensitive, so `Request` matches `request`. A capital `Request` is a CONSTRUCTION and
reaches nothing until something sends it, which is exactly the refusal Phase 257 already made for
Go's `&http.Request{}` — the header calls it "a CONSTRUCTION on the receiver branch". So:

```ts
if (s.last === 'Request' || s.last === 'HttpRequest') return null;   // case sensitive, above the verb test
```

Case sensitivity is load bearing: `requests.request('GET', url)` is a real reach and must keep
firing. **Where the URL is a literal the site is still answered by the URL-argument branch**, which
is class 3, and the header says so rather than claiming the class is closed.

**Class 3, the URL-argument branch firing on any callee — REFUSED, and it stays a stated limit.**
`anything("https://x")` reads as a reach. It cannot be refused without lowering a published number:

- A callee ALLOWLIST is the wrong way round for an open set, which this domain has already written
  down and paid for once (`predicates.ts:28-35`: an allowlist of router names found 7 of gotify's
  41 routes).
- The literal-URL branch is the rule's recall engine. `rules-network.ts:5-12` records that the
  branch is what finds `stub_request(:get, "https://…")` and `URL(string: "https://…")`, and the
  48% the header publishes was measured WITH it. Narrowing it moves that number with nobody
  re-judging a row, and the corpus is not in the tree.
- Telling "the code reaches this URL" from "this string happens to be a URL" needs data flow, which
  means types or a model, and this base has neither by charter.

So the rule's header gains a paragraph naming the class, the example, why each mechanical answer was
refused, and what it would take to close it. **That is the charter's instruction for an item a
builder cannot fix: reported as a stated limit with its reason, never dropped in silence.**

### How it is proved

`npm run conformance:facts`: decoys for classes 1 and 2 with controls beside them (a real
`http.get` in a file that does NOT name msw, and a lower-case `requests.request`), `expected.json`
updated, and two ablations — the msw refusal removed, the `Request` refusal removed — each red.
Class 3 gets no ablation because it gets no clause; its decoy is the existing behaviour, pinned as
it is, so a later round that changes it moves a pinned line.

---

## 7. A `main` spelled with `..` under-seeds a unit — **Tier 1, header only by default**

### Its source, quoted (Phase 258's verifier, item 3, as the charter records it)

> `beside()` folds only `./`, so `../victim/src/index.ts` is dropped and the unit reads `composed`.
> It errs safe. **One clause in `evidence.ts`'s header, not a code change**, unless the builder
> measures that fixing it moves no other rung.

### Where it lives today

`src/main/arch/evidence.ts:269-272`, `beside`, folding `^\./` and `/\.\//` and nothing else. Its
caller `declaredEntries` (lines 285-315) keeps a composed path only when `tracked.has(path)`, and a
path carrying `..` is never in `tracked`, so the seed is dropped and the unit falls from `reached`
to `composed`.

### What changes

**The default is the header clause**, in the `declaredEntries` docblock beside the existing limit
about built artefacts and python console scripts:

> A relative entry spelled with `..`, e.g. `"main": "../dist/index.js"` in a workspace member, is
> folded by nothing here and is therefore never tracked, so it seeds nothing and the unit reads
> `composed` rather than `reached`. It errs on the safe side — a missing seed lowers a rung and
> never raises one — and it is written down rather than fixed because raising a rung is a claim
> about somebody's code.

The code change is OPTIONAL and permitted only on a measurement: `..` folded with any path that
climbs above the repository root dropped whole, shipped only if `npm run conformance:evidence` and a
run over this checkout show **no rung moving anywhere**. If a rung moves, the change is refused and
the header clause is what ships. The header clause ships either way.

### How it is proved

`npm run conformance:evidence` (its rung pins are the check), plus `npm run conformance:reading`,
whose rule 9 owns this module's purity. Comments are blanked by that gate's scanners, so a header
clause is safe by construction.

---

## 8. `unitsOf` dedupes a directory on the first fact by filename order — **Tier 1, header**

### Its source, quoted (Phase 258's verifier, as the charter records it)

> Honest but arbitrary — `Dockerfile` sorts before `package.json`, so a root region can be labelled
> `container`. State the rule in the header or make the order deliberate; do not leave it accidental.

### Where it lives today

`src/main/arch/skeleton.ts:786-843`, `unitsOf`. `add` at line 790 is first-writer-wins
(`if (byDir.has(dir)) return;`); the facts are sorted by file path then line at lines 805-807; the
entrypoint loop at lines 820-831 assigns the kind. `D` (0x44) sorts before `p` (0x70), so at one
directory `Dockerfile` decides the kind and `package.json` does not.

### What changes

**The rule is stated in the header**, in the Q1 block that already describes the dedupe (line 708,
"Units are deduped on directory and the root '' is allowed"), with the consequence named:

> Deduped on DIRECTORY, and the winner is the first fact in this order: declared workspaces, then
> declared crates, then `boundary` libraries, then entrypoints, then source `main`s, each group
> sorted by file path and then by line. The path sort is what decides between two entrypoints in one
> directory, so a root holding both `Dockerfile` and `package.json` reads `container`, because `D`
> sorts before `p`. That is arbitrary and it is written down here rather than left to be
> rediscovered; it is not changed, because a kind precedence would move the drawn label of every
> repository that has both and this round moves no measured number.

**The order is NOT made deliberate in this round.** A precedence constant would change what the map
draws for a real shape, which is a judgement about a picture and belongs to a phase that can re-judge
it, not to a nits round whose charter forbids moving a measured number. The header says so in those
words, so the next round inherits the decision rather than the accident.

### How it is proved

`npm run conformance:arch` and `npm run conformance:evidence` — both pin the skeleton and the
regions, and both must be byte identical, which is the proof that a comment is all that moved.

---

## 9. The multi-dot dotfile comment — **Tier 1, and the comment is what changes**

### Its source, quoted (Phase 253's verifier, as the charter records it)

> The grammar's comment says a dotfile stays refused, which holds only for single-dot names:
> `.env.local` and `.eslintrc.json` pass `bareFileShaped`. Behaviour is safe — `.env.local` is
> caught at the door as a secret — so **the comment is what changes**, because a sentence wider than
> its code is the class this repository's own conventions forbid.

### Where it lives today, and the re-derivation

`src/shared/path-spans.ts:249-257`, the docblock above `BARE_SPECIALS`:

> A version (`1.2.3`, `v0.102.0`), an all-digit shape, a plain word and **a dotfile** all stay
> refused

`bareFileShaped` is at lines 268-281. Driven over the shipping logic:

```
.env            false     .env.local      true
.gitignore      false     .eslintrc.json  true
.npmrc          false     .claude.json    true
.DS_Store       false     README.md       true
```

The cause is line 274: `if (dot <= 0 …) return false;` — `lastIndexOf('.')` is 0 for a single-dot
dotfile and positive for a multi-dot one. The behaviour is safe for the named case:
`src/shared/path-doors.ts:287-289` refuses `secret-name` through `looksLikeSecretPath`, and
`src/shared/preview-types.ts:166` matches `.env` and anything starting `.env.`.

### What changes

The comment, to say exactly what the code does:

> A version (`1.2.3`, `v0.102.0`), an all-digit shape, a plain word and a SINGLE-DOT dotfile
> (`.env`, `.gitignore`, `.npmrc`) all stay refused, because `lastIndexOf('.')` is 0 for those and
> the extension test needs a stem. A MULTI-DOT dotfile passes the shape test — `.env.local`,
> `.eslintrc.json` — and that is deliberate for the second and harmless for the first:
> `decidePathDoor` refuses `.env.local` at step 5 as `secret-name`, before any door, and
> `.eslintrc.json` is a file a person clicking it means to open.

### How it is proved

`npm run conformance:pathdoors` must stay green, and the corrected sentence is made **executable**
rather than left as prose: `src/shared/__tests__/p247-path-spans.test.ts` gains four cases beside the
existing `.env` one — `.env.local` and `.eslintrc.json` true, `.gitignore` and `.DS_Store` false —
and one case asserting `decidePathDoor` still refuses `.env.local` with `secret-name`. A sentence
wider than its code is the class this repository forbids; a sentence no test can contradict is the
same class one step later.

---

## 10. Re-homing onto a full strip is not asked the cap — **Tier 1, header**

### Its source, quoted (Phase 260's fix commit `a4c4a6c9`, last paragraph)

> The re-verifier recorded one observation that is not a defect of this commit and is not changed
> here: re-homing a tab onto a strip already at the cap is not asked the cap, so a strip can briefly
> hold eleven, at the parent as well as HEAD. It is a stated limit for the store header rather than
> a fix.

### Where it lives today

`src/renderer/editor/store.ts:589-606`, `rehome`, which maps the tab's `projectId` and asks no cap.
`MAX_TABS = 10` is at line 165 and the only eviction is at lines 916-930, inside the NEW-tab path
(`own.length + 1 > MAX_TABS`). The header already names the two ways a tab's project moves after the
open, at lines 98-101.

### What changes

One clause, in the store header beside "The preview slot and the cap are per project" (line 105):

> **AND THE CAP IS ASKED ON THE OPEN PATH ONLY.** `rehome` moves a tab onto another project's strip
> without asking `MAX_TABS`, and `switchProject` gives a tab of no project to the first active one
> the same way, so a strip can hold eleven until the next open evicts down to ten. It was true at
> Phase 260's parent as well as at its HEAD. It is stated rather than fixed because the two movers
> dispose nothing, and evicting somebody's tab as a side effect of a project being ADDED is a worse
> answer than a strip that is briefly one over.

### How it is proved

`npm test` and `npm run conformance:save` stay green; nothing but a comment moved. The store's own
Phase 260 tests already pin the ten-tab behaviour on the open path and must be unchanged.

---

## 11. Ownership — three builders, no overlapping file

**Builder A — the harness and the drive-script convention (items 1 and 2).**

```
build/electron-run.mjs
build/harness-socket.mjs
build/assert-electron-teardown.mjs          (rule 5, its ablations, HELPER_USER_FLOOR 129 -> 131)
build/drive-result.mjs                      (new)
build/p261/probe-p261-socket.mjs            (new)
build/p256/probe-explorers.mjs              (tmuxSocket: null, one line)
build/verification-checks.mjs               (electron('probe:p261socket') AND electron('probe:p261cmdt'))
package.json                                (probe:p261socket AND probe:p261cmdt — A adds BOTH)
src/main/machines/context.ts                (the announcement line and its comment, nothing else)
src/main/machines/__tests__/p261-socket-announcement.test.ts   (new)
DEVELOPMENT.md                              (the drive-result paragraph, the GMUX_DRIVE_RESULTS row)
```

A adds **both** package.json script entries and **both** `verification-checks.mjs` rows, with these
exact names, so builder B never opens either file:

```json
"probe:p261socket": "npm run build && node build/p261/probe-p261-socket.mjs",
"probe:p261cmdt":   "npm run build && node build/p261/probe-p261-cmdt.mjs"
```

**Builder B — the renderer race and its app run (item 3).**

```
src/renderer/app/CreateSessionModal.tsx
src/renderer/app/__tests__/p261-name-selection.test.tsx   (new)
build/p261/probe-p261-cmdt.mjs                            (new)
```

B touches no gate, no package.json and no shared module. B's probe imports
`build/electron-run.mjs` and `build/drive-result.mjs` and changes neither.

**Builder C — the fact rules and the headers (items 4 to 10).**

```
src/main/arch/facts/rules-surface.ts        (item 4)
src/main/arch/facts/rules-network.ts        (item 6, and item 5's header cross-reference)
src/main/symbols/calls.ts                   (item 5, code or header depending on the measurement)
src/main/arch/evidence.ts                   (item 7)
src/main/arch/skeleton.ts                   (item 8)
src/shared/path-spans.ts                    (item 9)
src/shared/__tests__/p247-path-spans.test.ts(item 9)
src/renderer/editor/store.ts                (item 10, header only)
build/fixtures/facts/**  incl. expected.json(the decoys)
build/conformance-facts.mjs                 (the new ablations)
build/p261/spec-probe.mts                   (written by the spec step; see below)
src/main/symbols/__tests__/**, src/main/arch/__tests__/**  (only files C creates)
```

`build/p261/spec-probe.mts` is the throwaway the spec step used to re-derive items 4, 5 and 6 over
the shipping driver. **C either gives it a real header and keeps it as the measurement tool item 5's
decision procedure needs, or deletes it before the integrator commits.** It must not be committed as
it stands.

**Shared, and nobody edits it after this**: `build/p261/SPEC.md`.

**The integrator** reconciles, raises nothing else, and runs the battery. No builder edits
`docs/BACKLOG.md`; the integrator empties Phase 86.1's table (§13) and appends the running-log lines.

---

## 12. What this spec noticed and does NOT queue

The charter is that a nit is in this round only if it is already written down. These three are
written down HERE and in no verdict, so they are observations for the operator and not items:

1. `.claude.json` passes `bareFileShaped` and is not in `CREDENTIAL_FILE_NAMES`
   (`src/shared/preview-types.ts:111-120`), so a `.claude.json` printed in a transcript opens in an
   editor tab. It holds an account address and a project list rather than a token, and opening it in
   Tortie executes nothing, so it is low stakes. Not changed here.
2. `build/p249/measure-mock.mjs:402-405` launches Tortie main with `HOME` redirected, `tmuxSocket:
   null` and no harness term, so it reads `-L gmux`. Layer 2's warning will name it; it is not
   refused and not changed, because it opens no project and creates nothing.
3. `network.client`'s receiver branch answers `HTTP client call` for `http.get(PREFIX + '/z', h)`
   even after item 5, because the receiver decides and no literal is read. That is correct for a
   client and wrong for a route; it is the same ambiguity `rules-network.ts`'s header already
   publishes as the residual 48%, and nothing is changed for it.

---

## 13. The round also empties Phase 86.1's table

`docs/BACKLOG.md:11881` — Phase 86.1's four rows are removed and the entry says, the way Phase 73.1
said it, that Phase 261 took them on 2026-09-12 and where each landed. The heading already carries
`ITS TABLE TAKEN BY PHASE 261 (2026-09-12)`; the body becomes the empty table with the sentence that
a new nit goes here. **Every item names its origin in the commit body**, one line each.

---

## 14. The proof, run rather than read

**The commit battery, every gate in the foreground, never piped to `tail`:**

```
npm run typecheck
npm run build                 (gate:electron, gate:background, gate:checks, gate:knownhosts,
                               gate:cache-policy, gate:contract all run inside it)
npm test
npm run smoke:t1
npm run conformance:facts     (items 4, 5, 6)
npm run conformance:evidence  (item 7)
npm run conformance:arch      (item 8)
npm run conformance:reading   (item 7's purity rule 9)
npm run conformance:pathdoors (item 9)
npm run conformance:save      (item 10)
npm run conformance:machines  (the announcement line lives under src/main/machines/)
```

`docs/audits/contract-baseline.txt` must come back **byte identical**: this round adds no IPC
channel, no `GMUX_*` env name that the inventory tracks, no storage key and no smoke mode. If
`GMUX_DRIVE_RESULTS` is inventoried, the baseline is regenerated in the same commit with
`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` and the moved line is
named in the commit body.

**Driven:**

```
node build/p261/probe-p261-socket.mjs        (item 1, Tier 3: A, B, C, D, E and the self-test)
node build/p261/probe-p261-cmdt.mjs          (item 3, Tier 2, at HEAD)
node build/p261/probe-p261-cmdt.mjs          (item 3, at the PARENT: CreateSessionModal.tsx put
                                              back to fb4b8a4f and rebuilt — mandatory)
node build/drive-result.mjs --self-test      (item 2)
node build/assert-electron-teardown.mjs --list | wc -l     (129 at the parent, 131 at HEAD)
```

**His `-L gmux` session count is read before and after every one of those runs and both numbers go
in the commit body. It was 42 when this spec was written. If the two numbers ever differ, the phase
stops and says so.**

**The verifier's independent step**, because a verdict whose evidence is only the builder's own
checks re-run is not a verification. At least two, one of which is an attack, since item 1 is
Tier 3:

- **Attack the refusal, do not confirm it.** Write hostile launch shapes the builder did not: the
  socket in `process.env` and the term in `options.env`; the term in `process.env` and the socket in
  `options.env`; `GMUX_PROBES=''` (empty, which `set()` reads as unset); a socket name with a
  newline; `tmuxSocket` named and the env socket differing by one character; an app that prints the
  announcement line twice with two different sockets; an app that prints it inside a quoted string
  from its own child. Every one must be refused or asserted, and the one that walks past it is the
  finding.
- **Re-derive the fact-rule claims by a different method.** Drive the shipping rules over planted
  inputs the builder never wrote, rather than reading the decoys, and check that class 3 of item 6
  still behaves exactly as the header now says it does.
- **Measure the parent** for item 3, independently of the builder's own run.

---

## 15. What is NOT in this phase

- No item that is not already written down. No sweep for new nits, no refactor, no tidying. §12 is
  the list of what was noticed and left alone.
- No retrofit of existing drive scripts to item 2's convention. The convention is stated and the two
  new probes follow it.
- **No precision regression in the fact rules.** Item 5 ships only on a measured no-move and is
  otherwise a stated limit; item 6's class 3 is a stated limit outright.
- No kind precedence in `unitsOf`, no `..` folding unless measured, no change to
  `surface.http.method-call`'s existing refusal line, no shared constant extracted into
  `predicates.ts`.
- No corpus re-clone, no network, no machine, no keychain, no token.
- Nothing from the audits. F6 and F5b are the audit's own open findings and are not nits.
- No release cut, no CHANGELOG entry unless item 3 is judged person-visible, and no GitHub post.
  All three are his word.
