/**
 * The mutation ledger — the fail closed durability gate Phase 116 built.
 *
 * Every asynchronous mutator on the session core runs inside {@link
 * MutationLedger.admit}. A call that arrives after shutdown began is refused
 * with the typed error before its body can insert a manifest row, spawn a
 * process or reach the exec plane. A call that arrives before is recorded, so
 * the quit path can join it ahead of the final snapshot.
 *
 * Phase 125 moved this out of `./core.ts` unchanged. The class holds one
 * instance and its three public verbs delegate in one line each, so the
 * behaviour, the refusal string and the ordering are what they were at
 * `8ce91a0`.
 *
 * This module imports nothing from `./core`, and it must never do so. It knows
 * about the core through {@link MutationLedgerDeps} and nothing else.
 */

/**
 * Phase 116. How long the quit path waits for admitted mutations to settle
 * before the final snapshot. Ten seconds covers a remote create over ssh,
 * which is the slowest admitted mutation, and the wait is spent only when a
 * mutation is actually in flight. The common quit pays zero.
 */
export const MUTATION_JOIN_DEADLINE_MS = 10_000;

/** What the ledger needs from the core it guards. */
export interface MutationLedgerDeps {
  /** True once the core has been disposed. */
  isDisposed(): boolean;
  /** The one typed refusal, built by the core so there is one copy of it. */
  refusalFor(entry: string): Error;
}

export class MutationLedger {
  private readonly deps: MutationLedgerDeps;

  /**
   * Phase 116, refusal site B. True from the moment `shutdownGmuxCore()` has
   * settled the boot, set through {@link beginShutdown}. Main-process code
   * that already holds a core reference, e.g. the tray or a timer, reaches
   * the mutators without passing `getGmuxCore()`, so the instance carries its
   * own flag rather than trusting the module gate alone.
   */
  private shuttingDownFlag = false;

  /**
   * Phase 116. Every mutation {@link admit} let in that has not settled yet.
   * `shutdownGmuxCore()` joins this set before the final snapshot, so work the
   * core accepted is landed rather than abandoned mid write. Entries are
   * settle-only wrappers, so the ledger can never turn a caller's handled
   * rejection into an unhandled one.
   */
  private readonly admitted = new Set<Promise<void>>();

  constructor(deps: MutationLedgerDeps) {
    this.deps = deps;
  }

  /** True once {@link beginShutdown} has been called. */
  get shuttingDown(): boolean {
    return this.shuttingDownFlag;
  }

  /** How many admitted mutations have not settled yet. */
  get size(): number {
    return this.admitted.size;
  }

  /**
   * Phase 116. Called once by `shutdownGmuxCore()` as soon as the boot has
   * settled. From this line on, every guarded mutator answers with the typed
   * `SHUTTING_DOWN` refusal instead of running against a core that is about
   * to be disposed.
   */
  beginShutdown(): void {
    this.shuttingDownFlag = true;
  }

  /**
   * Phase 116, the gate in front of every asynchronous mutator. A call that
   * arrives after shutdown began is refused with the typed error, before the
   * body can insert a manifest row, spawn a process or reach the exec plane.
   * A call that arrives before is recorded in {@link admitted}, so the quit
   * path can join it ahead of the final snapshot.
   *
   * The tracked copy swallows the settlement on purpose. The caller keeps
   * the original promise and its own error handling; the ledger only needs
   * to know when the work is over.
   */
  admit<T>(entry: string, work: () => Promise<T>): Promise<T> {
    if (this.shuttingDownFlag || this.deps.isDisposed()) {
      return Promise.reject(this.deps.refusalFor(entry));
    }
    const p = work();
    const tracked = p.then(
      () => undefined,
      () => undefined
    );
    this.admitted.add(tracked);
    void tracked.then(() => this.admitted.delete(tracked));
    return p;
  }

  /**
   * Phase 116. Wait for every admitted mutation to settle, bounded.
   *
   * The bound keeps the promise the quit path has always made: a sick call
   * can never wedge quit. The common quit pays nothing here, because the set
   * is empty unless a mutation is actually in flight.
   */
  async join(deadlineMs: number): Promise<void> {
    if (this.admitted.size === 0) return;
    await Promise.race([
      Promise.all([...this.admitted]),
      new Promise<void>((resolve) => setTimeout(resolve, deadlineMs))
    ]);
  }
}
