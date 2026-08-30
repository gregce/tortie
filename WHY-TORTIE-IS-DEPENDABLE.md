# Tortie keeps agent work safe and recoverable

Tortie's most important job is to keep your agent work connected to the right project, session and machine.

Starting an agent is easy. Keeping its work available after a restart, connection failure or long-running task is harder. Tortie is designed around that harder problem.

This means you can close Tortie without treating every running session as disposable. When you return, Tortie reconnects the interface to work that continued outside its window.

## Your sessions do not depend on the window

Tortie runs its sessions in a private tmux server. That server is separate from Electron's main and renderer processes.

The renderer draws terminal output through xterm.js. It does not own the shell or agent process. Tortie can replace or restart the window without making the session disposable.

This separation provides 3 practical benefits:

- closing Tortie does not stop an agent that is still working
- reopening Tortie reconnects you to the same named session
- a problem in the interface does not automatically destroy the process behind it

Tortie stores session identity and recovery facts in a SQLite manifest. It also captures terminal scrollback. After a restart, it restores the project and prepares the agent's own resume command. You decide when to run it.

## Tortie records durable work before it starts

Tortie records important operations in SQLite before it starts the child process that performs them. The code calls this manifest before spawn.

This order matters. If the app closes at the wrong moment, Tortie has a durable record that the operation began. It can then explain what happened instead of silently forgetting the work.

The same rule protects session creation and remote operations. Each operation has an immutable identity that does not change when you rename its visible session.

Remote writes also use an execution journal. A failed journal write stops the child from spawning. Tortie does not start durable work that it cannot later account for.

## Tortie reports uncertainty instead of guessing

A lost connection does not prove that remote work failed. The remote machine may have completed the operation after the local connection disappeared.

Tortie keeps this uncertainty visible in the remote execution journal. It does not report success or failure when the evidence supports neither answer.

This reduces 2 serious risks:

- repeating an operation that already completed
- trusting a success message for work that never happened

An unfinished journal row becomes a cut-off operation during recovery. Tortie can then show a durability notice when the app starts again.

This behaviour can feel more cautious than a green or red status. It matters when an operation changes files or creates durable work.

## Tortie stops accepting work before it shuts down

Tortie's main process moves to one monotonic quitting state before it awaits cleanup. The state cannot move back to running.

The shared typed inter-process communication handler reads that state. This is the IPC handler. It refuses every new renderer request after shutdown starts.

Ordered disposal then snapshots sessions, cancels and joins remote operations, closes databases, drains watchers and stops workers. A final child-process owner reaps anything that remains.

This order reduces the chance that new work starts after Tortie has saved its final state. It also reduces shutdown crashes and incomplete writes.

## Tortie limits work that can slow the interface

Tortie uses code splitting so it does not load every feature when the window opens. Secondary views use lazy imports and load when you open them.

Hidden projects do not run Git status checks during startup. Agent discovery waits until a screen needs the result.

Measurements from the August 2026 performance work showed:

- warm `DOMContentLoaded` improved by 29% at the middle measurement and 44% at the slower end
- first terminal attachment improved by 16% at the middle measurement and 31% at the slower end
- the eager JavaScript loaded at startup fell by more than half

Tortie also limits unusually large results. In a deliberate test with about 96,000 changed files, the old Source Control view created about 100,000 interface elements. It used 1.3 GB to 1.8 GB of renderer memory and recorded 53 long tasks.

The current view renders at most 200 rows in each Source Control group. The same test stayed near 90 MB to 135 MB and recorded no long tasks.

This was an extreme test, not normal use. It proves that one exceptional repository is less likely to make the whole interface unusable.

## The interface receives limited system access

The renderer does not receive unrestricted access to Electron, Node.js, files or processes. Electron context isolation separates it from the preload code. Node integration remains disabled.

The preload installs one typed `window.gmux` bridge. Shared TypeScript maps define each request and result. The main process checks the sender and owns the operating system work.

This design reduces the damage that a mistake in the interface can cause. It also gives every system operation a place where Tortie can check the sender, refuse work during shutdown and report failure.

## Automated checks protect user promises

Tortie checks more than whether its TypeScript compiles.

Its automated checks cover:

- process and import boundaries
- runtime dependency cycles, excluding test and type-only imports
- the connection between each shared request, preload method and main handler
- shutdown admission and cleanup
- database recovery and durable operation order
- local and remote session behaviour
- renderer bundle size, lazy loading and shipped test-probe containment
- cache policy and durable data exclusions
- large repositories, dropped file events and failure conditions

The architecture review on 30 August 2026 measured 1,056 production TypeScript files. Its graph found no strongly connected runtime components across 3,572 import edges.

The IPC closure suite checked 213 invoke channels across the shared contracts, preload and main process. The full test run passed 10,815 tests.

These checks make changes safer. A developer can improve an internal owner while the repository verifies that the user-facing promise still holds.

## Tortie can explain its own resource use

Tortie includes an on-demand diagnostics report. It separates the Electron app from the agents and commands running inside your sessions.

This distinction matters. An agent may use substantial memory while it compiles, searches or runs tests. That does not mean the Tortie window has a memory leak.

The report uses Electron process metrics, V8 heap data and Blink memory data. It also reports startup marks, cache size, watcher activity, IPC rates and long renderer tasks.

Tortie classifies tmux, SSH and agent processes separately from the Electron shell. It collects this information when requested rather than running a permanent monitor.

## Tortie's design is notable for its combined protections

Several mature Electron applications have excellent lifecycle, security or storage design. Tortie is notable because it combines these protections in one smaller product:

- tmux sessions outlive Electron's renderer and main process
- SQLite records durable intent before a child process starts
- the remote journal preserves uncertain outcomes after connection loss
- one monotonic shutdown state closes all typed IPC admission
- one context-isolated bridge controls renderer authority
- import, cycle, IPC, bundle and durability rules run as automated checks

Many applications rely on developer convention for some of these rules. Tortie turns many of them into tests or build failures.

This does not make defects impossible. It makes important promises visible and gives the project a way to detect when a change breaks them.

## Reviews from 30 August still record the gaps

The reviews do not give Tortie a perfect score.

The architecture review scored its 30 August source snapshot at 32 out of 36. This is a strict boundary score, not a percentage or product rating. It recorded 4 local gaps:

- one remote failure test still needs an evidence-based ruling
- one test lane and one performance observer need repair
- the new Architecture feature needs clearer internal seams
- the recorded request inventory needs updating and adding to a required build check

The performance review scored the same snapshot's evidence at 21 out of 24. Startup, idle efficiency and long-session repeatability each needed one stronger proof.

Publishing these gaps matters. It prevents a good design from becoming a reason to stop checking the code.

## What this provides when you use Tortie

The result should be straightforward:

- your sessions survive the window
- your projects return to the right state
- remote failures do not produce false certainty
- quitting is less likely to corrupt or strand work
- large projects are less likely to freeze the interface
- new features are less likely to break established behaviour
- diagnostics can replace guesswork when something feels slow

Tortie's design is valuable because it supports trust. You can spend more time directing the work and less time protecting the tool from its own failures.

## Evidence behind these claims

- [Architecture reassessment from 30 August 2026](docs/audits/2026-08-30-electron-typescript-architecture.md)
- [Code quality, memory and performance audit from 26 August 2026](docs/audits/2026-08-26-code-quality-memory-and-performance.md)
- [Tortie's durability and recovery documentation](https://tortie.sh/docs/durability-and-recovery/)
- [Tortie's design philosophy](docs/ZEN-OF-TORTIE.md)
