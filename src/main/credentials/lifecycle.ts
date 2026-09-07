/**
 * THE ONE OWNER OF THIS DOMAIN'S SHUTDOWN (Phase 220, item 2).
 *
 * Until this phase the whole of the credentials domain's quit was one line in
 * `../capabilities.ts`, being `stopLoginsWatch()`. That line is right and it
 * stays: it releases the `fs.watch` handles and the keychain backstop interval
 * and it cannot throw. It is also the only thing that was owned. Measured at
 * `b5cc017` and written up in research 82 section 3, everything else outlived
 * the disposer:
 *
 *  - the `security` children, spawned by a raw `execFile` with a ten second
 *    timeout, in no registry at all;
 *  - the observation in flight, and worse the observation a change REPLACED,
 *    which `forgetObservation()` sets to null while the pass it names goes on
 *    running with nobody holding it;
 *  - the boot chain, being a one second wait and then an observe and then the
 *    watcher, none of it awaited by anything;
 *  - THE LATE WATCH START, which is the shape the audit did not name: a quit
 *    landing inside that one second wait runs `stopLoginsWatch()` against
 *    `watch === null`, and the chain then installs `fs.watch` handles and an
 *    interval AFTER the ordered disposer has finished with this domain.
 *    Reproduced in three lines: at quit the watcher had `[]`, and after the
 *    held dependency landed it had `["watch"]`;
 *  - the vault migration, once per process, in front of the first observe;
 *  - nine seconds of jittered lock waits;
 *  - and the activation itself.
 *
 * ## THE WORKING SIBLING IS `../usage/service.ts` AND THIS COPIES ITS SHAPE
 *
 * `shutdown(deadlineMs)` there closes admission on its FIRST LINE, before any
 * await, collects every operation in flight, aborts each one's controller,
 * cancels the domain's children, and joins with a bounded race that reports
 * whether it actually joined. Its children go through `../proc/guarded`, which
 * is the registry every other guarded child of Tortie's is in. All of that
 * transfers here unchanged.
 *
 * ## WHERE IT DOES NOT TRANSFER, AND THIS IS THE PART THAT IS WRITTEN FIRST
 *
 * A usage read is a `security find-generic-password`; cancelling it loses
 * nothing at all. A credential WRITE is `security -i` over stdin, or a staged
 * file and a rename inside `./nofollow.ts`, held under the vendor's own locks.
 * So the interruption points are defined here BEFORE any cancellation is
 * wired, and the cancel only ever reaches them:
 *
 *  1. BEFORE THE VENDOR'S LOCKS ARE TAKEN. `./locks.ts`'s wait loop asks
 *     {@link credentialsAreOpen} at the top of every turn and refuses with a
 *     `LockHeld` naming the lock. Nothing has been read and nothing written,
 *     the outgoing account is untouched, and a lock the vendor holds is never
 *     taken and so never stolen. This is the ONLY point at which a write is
 *     cancelled on purpose.
 *  2. INSIDE `./swap.ts`, AT ANY OF ITS FOUR STEPS, and reached only because a
 *     `security` child of this process was ended. Stage fails and nothing
 *     changed; the check fails and nothing changed; the commit fails and the
 *     store holds the old credential or the new one, because the commit IS the
 *     smallest durable step each backend has; the confirmation fails and the
 *     caller refuses. Every one of those is a refusal `./keep.ts` already
 *     answers, and every one leaves a store holding a credential.
 *  3. NEVER BETWEEN THE KEEP AND THE WRITE. `liftStore` promotes the account a
 *     store is about to lose BEFORE a byte moves and refuses the write when it
 *     could not, so a cancel landing there refuses rather than proceeding.
 *
 * So at every point the cancel can reach, the store holds a valid credential
 * and Tortie's own slot still holds what it kept, which is what "recovery
 * survives" means here. A write that is already past its lock is NOT cancelled
 * by a stop flag; it is cancelled only by its child being ended, and that lands
 * on 2 above.
 *
 * ## WHAT THIS FILE MAY NOT DO
 *
 * It writes no log line, for the reason the whole domain does not: there is no
 * line here for a token to reach. `../capabilities.ts` reads the report and
 * writes the one sentence a quit records, and the report carries counts and
 * booleans and nothing else.
 */

/**
 * How long the join waits for what it cancelled before it says it did not
 * join.
 *
 * It is a wedge guard rather than an expected wait, the same way
 * `USAGE_SHUTDOWN_JOIN_MS` is: a cancelled `security` child settles on the next
 * tick, and a quit with nothing in flight never reaches the race at all. It is
 * twice the usage bound because a write that is already inside the vendor's
 * locks is deliberately allowed to finish rather than be cut in half, and the
 * whole of that is one staged write, one read back and one rename.
 */
export const CREDENTIAL_SHUTDOWN_JOIN_MS = 2_000;

/** What one join did, for the quit log and for the tests. */
export interface CredentialShutdownReport {
  /** True when the join had already run, so this call did nothing. */
  already: boolean;
  /** Operations that were still running when admission closed. */
  tracked: number;
  /** `security` children of this process that were ended. */
  children: number;
  /** True only when everything tracked settled inside the bound. */
  joined: boolean;
  waitedMs: number;
}

/**
 * Admission. Every entry point in this domain asks it, and it closes
 * SYNCHRONOUSLY, before the first await of the quit.
 */
let open = true;

/**
 * Everything accepted and not yet settled.
 *
 * The promises here never reject: what is held is a settled-either-way mirror
 * of the caller's own work, so a rejection in the domain cannot become an
 * unhandled rejection just because the quit joined it.
 */
const tracked = new Set<Promise<void>>();

/** The abort controller of every `security` child this process has running. */
const children = new Set<AbortController>();

/** The join, held so a second call answers the first one's report. */
let joining: Promise<CredentialShutdownReport> | null = null;

/** Is this domain still accepting work? */
export function credentialsAreOpen(): boolean {
  return open;
}

/**
 * Close admission and nothing else.
 *
 * It is the first line of the ordered disposer, before any await, so no entry
 * point can start a new operation while the rest of the quit runs. It is
 * synchronous, it cannot throw, and calling it twice is calling it once.
 */
export function beginCredentialShutdown(): void {
  open = false;
}

/**
 * Own one accepted operation until it settles.
 *
 * It returns the SAME promise it was handed, so a caller can keep comparing
 * identities the way `../logins/ipc.ts` compares the observation in flight
 * with the one it started. That is the point of the shape: a change that
 * replaces the visible cached promise gives up the CACHE and not the
 * OWNERSHIP, which is the finding this closes.
 */
export function trackCredentialWork<T>(work: Promise<T>): Promise<T> {
  const held = work.then(
    () => undefined,
    () => undefined
  );
  tracked.add(held);
  void held.then(() => {
    tracked.delete(held);
  });
  return work;
}

/**
 * Take a cancel for one `security` child, and release it when the child is
 * gone.
 *
 * The child itself goes through `../proc/guarded`, so it is in the same
 * registry every other guarded child is in and a quit that never reaches this
 * domain still reaps it. The controller is what lets THIS domain end it at its
 * own point instead, which is what a disposer that must not resolve while its
 * own child runs needs.
 */
export function ownCredentialChild(): { signal: AbortSignal; done(): void } {
  const ending = new AbortController();
  children.add(ending);
  return {
    signal: ending.signal,
    done: () => {
      children.delete(ending);
    }
  };
}

/** How many `security` children this domain is holding. For the tests. */
export function credentialChildCount(): number {
  return children.size;
}

/** How many accepted operations this domain is holding. For the tests. */
export function credentialWorkCount(): number {
  return tracked.size;
}

/**
 * Close admission, end this domain's children, and join what was accepted.
 *
 * The order is the whole of it, and it is the sibling's:
 *
 *  1. ADMISSION CLOSES, synchronously, before any await. From this line a list,
 *     a choose, the boot observe and a watch start all begin nothing.
 *  2. EVERY `security` CHILD OF THIS PROCESS IS ENDED, by the handle that
 *     spawned it and never by name, so nothing reaches another program's
 *     `security`. A lock the vendor holds is not touched: `./locks.ts` refuses
 *     to TAKE one while this is closed and never steals one.
 *  3. WHAT WAS ACCEPTED IS JOINED, bounded, and the report says whether it
 *     really joined rather than assuming it.
 *
 * A quit with nothing in flight walks two empty sets and resolves in the same
 * tick, so the idle quit pays nothing and starts no process. A second call
 * answers the first one's report and does nothing again.
 */
export function joinCredentialShutdown(
  deadlineMs: number = CREDENTIAL_SHUTDOWN_JOIN_MS
): Promise<CredentialShutdownReport> {
  if (joining !== null) {
    return joining.then((report) => ({ ...report, already: true }));
  }
  // ADMISSION CLOSES HERE TOO, so a caller that reaches the join without the
  // disposer's first line still cannot admit work while it runs.
  open = false;
  const startedAt = Date.now();
  const waits = [...tracked];
  let ended = 0;
  for (const one of children) {
    one.abort();
    ended += 1;
  }
  children.clear();
  joining =
    waits.length === 0
      ? Promise.resolve({
          already: false,
          tracked: 0,
          children: ended,
          joined: true,
          waitedMs: 0
        })
      : (async (): Promise<CredentialShutdownReport> => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const expired = new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), deadlineMs);
            timer.unref?.();
          });
          const joined = await Promise.race([
            Promise.allSettled(waits).then(() => true),
            expired
          ]);
          if (timer !== undefined) clearTimeout(timer);
          return {
            already: false,
            tracked: waits.length,
            children: ended,
            joined,
            waitedMs: Date.now() - startedAt
          };
        })();
  return joining;
}

/**
 * Put this module back the way a fresh process finds it.
 *
 * THE TEST AND HARNESS SEAM, and it exists for the same reason `setKeepDeps`
 * does: this is process state by design, and a suite that drives a quit has to
 * be able to drive the next one. Nothing in the product calls it.
 */
export function resetCredentialLifecycle(): void {
  open = true;
  tracked.clear();
  children.clear();
  joining = null;
}
