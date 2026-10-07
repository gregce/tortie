/**
 * What a link in a folder listing points at, read through ONE bounded lane
 * (Phase 343).
 *
 * ## What it is for
 *
 * `fs:readDir` reports a link as `kind: 'symlink'` whatever it points at, so
 * the Explorer drew a link to a folder as a file of unknown type (issue 36).
 * This module answers, for the links in one listing and for nothing else,
 * whether each points at a folder, a file, something else (a FIFO, a socket, a
 * device) or nothing (any `stat` error: ENOENT, ELOOP, EACCES, ENOTDIR). The
 * listing carries the answer in one optional field, `FsDirEntry.link`, and
 * `kind` does not move, so every other reader of a listing reads what it read.
 *
 * ## Why it is bounded, and how
 *
 * Before Phase 343 no listing statted through a link. A `stat` through a link
 * into a network mount that has stopped answering does not come back, and
 * nothing can cancel it: libuv has no way to cancel a filesystem request a
 * threadpool thread is already inside, so it holds one of main's four file
 * threads until the mount answers. `src/main/agents/health.ts` records the same
 * hazard for its own `open` and the dose response a verifier measured there:
 * once the pool is gone every file read and write in main stops. Phase 343
 * measured it again (build/p343/SPEC.md S4, a blocked FIFO `open` standing in
 * for such a `stat`): with 0 to 3 requests stuck in a pool of four another
 * `stat` answered in 0.1 to 0.2 ms, and with 4 stuck it had not answered after
 * 2,000 ms. A folder holding four links into a dead mount, statted all at once,
 * would stop main.
 *
 * So this takes `health.ts`'s answer, rule for rule:
 *
 *  1. ONE LANE. At most one link `stat` is in flight in main at any moment,
 *     whatever the number of listings or links. Measured cost (S3): a folder of
 *     1,000 links to folders (pnpm's `node_modules`) lists in 12.33 ms median
 *     against 0.34 ms with no stat; a folder of 5,000 files and 50 links costs
 *     nothing measurable.
 *  2. A WAIT OF {@link LINK_STAT_WAIT_MS}, `health.ts`'s own 250 ms. A listing
 *     waits for its links at most that long, and every link not answered by
 *     then is left ABSENT, which every reader treats as before Phase 343.
 *  3. ONE STRANDED STAT CLOSES THE GATE. A stat still running when a listing's
 *     wait ends is stranded. While one is stranded, every listing starts no
 *     link stat and reads its links absent at once, so links can hold at most
 *     one of the four pool threads however many dead mounts a project links to.
 *     The gate opens again when that stat returns.
 *  4. A PATH IN FLIGHT IS SHARED. A link already queued or being statted is not
 *     statted a second time; a second listing waits for the same answer.
 *  5. A STAT A LISTING GAVE UP ON BEFORE IT STARTED IS NEVER STARTED, unless a
 *     listing still waiting asked for the same path.
 *
 * WHAT IS STILL NOT TRUE, said as `health.ts` says it. The one stranded thread
 * is not recovered. It is returned only if the mount answers.
 *
 * ## What it does not do
 *
 * It names no `realpath`, no `lstat` and nothing from `./paths.ts`: it decides
 * nothing about containment or about any write, and a link's target is never
 * resolved to a path. It spawns nothing and imports nothing from electron, so
 * it is tested under plain vitest.
 */

import { stat as statThroughLink } from 'node:fs/promises';
import type { FsDirEntry, FsLinkTarget } from '@shared/types';

/** How long one listing waits for its links. `health.ts`'s 250 ms. */
export const LINK_STAT_WAIT_MS = 250;

/** How many link stats may be in flight at once in main. ONE. */
export const LINK_STAT_LANES = 1;

/** How many stranded stats are tolerated before the gate closes. ONE. */
const MAX_STRANDED = 1;

/** What a stat answers that this module reads. */
export interface LinkStat {
  isDirectory(): boolean;
  isFile(): boolean;
}

/** A clock a test can hold still. */
export interface LinkTimer {
  set(fire: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface LinkTargetDeps {
  /** A stat THROUGH the link (it follows it). */
  stat(path: string): Promise<LinkStat>;
  /** Omitted means {@link LINK_STAT_WAIT_MS}. */
  waitMs?: number;
  /** Omitted means the real `setTimeout`. */
  timer?: LinkTimer;
}

/** The links of one listing, by name, to what each points at. */
export type LinkTargetsOf = (
  dir: string,
  names: readonly string[]
) => Promise<Map<string, FsLinkTarget>>;

const REAL_TIMER: LinkTimer = {
  set: (fire, ms) => setTimeout(fire, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
};

/** One stat's answer, read. PURE. */
export function targetOf(answer: LinkStat): FsLinkTarget {
  if (answer.isDirectory()) return 'dir';
  if (answer.isFile()) return 'file';
  return 'other';
}

/** One link's stat, queued or running. */
interface Job {
  readonly path: string;
  readonly answer: Promise<void>;
  readonly done: () => void;
  /** Listings still waiting on it. */
  waiters: number;
  started: boolean;
  result: FsLinkTarget | null;
  stranded: boolean;
}

/**
 * The lane, the wait and the gate, over one `stat`. Production builds ONE of
 * these, below, so the lane is main's whole lane.
 */
export function createLinkTargets(deps: LinkTargetDeps): LinkTargetsOf {
  const waitMs = deps.waitMs ?? LINK_STAT_WAIT_MS;
  const timer = deps.timer ?? REAL_TIMER;
  /** Every job queued or running, by path, so a path in flight is shared. */
  const jobs = new Map<string, Job>();
  /** Jobs not yet started, oldest first. */
  let queue: Job[] = [];
  let inFlight = 0;
  let stranded = 0;

  function start(job: Job): void {
    job.started = true;
    inFlight += 1;
    let asked: Promise<LinkStat>;
    try {
      asked = deps.stat(job.path);
    } catch (err) {
      asked = Promise.reject(err);
    }
    void asked
      .then(targetOf)
      .catch((): FsLinkTarget => 'none')
      .then((result) => {
        job.result = result;
        inFlight -= 1;
        if (job.stranded) stranded -= 1;
        jobs.delete(job.path);
        job.done();
        pump();
      });
  }

  function pump(): void {
    while (inFlight < LINK_STAT_LANES) {
      const next = queue.shift();
      if (next === undefined) return;
      start(next);
    }
  }

  function jobFor(path: string): Job {
    const shared = jobs.get(path);
    if (shared !== undefined) return shared;
    let done = (): void => undefined;
    const answer = new Promise<void>((resolve) => {
      done = resolve;
    });
    const job: Job = {
      path,
      answer,
      done: () => done(),
      waiters: 0,
      started: false,
      result: null,
      stranded: false
    };
    jobs.set(path, job);
    queue.push(job);
    return job;
  }

  return async (dir, names) => {
    const out = new Map<string, FsLinkTarget>();
    if (names.length === 0) return out;
    // THE GATE. A stat that has not come back closes it.
    if (stranded >= MAX_STRANDED) return out;
    const mine: Array<readonly [string, Job]> = [];
    for (const name of names) {
      const job = jobFor(`${dir}/${name}`);
      job.waiters += 1;
      mine.push([name, job]);
    }
    pump();
    let handle: unknown = null;
    const waited = new Promise<void>((resolve) => {
      handle = timer.set(resolve, waitMs);
    });
    await Promise.race([Promise.all(mine.map(([, job]) => job.answer)), waited]);
    timer.clear(handle);
    const dropped = new Set<Job>();
    for (const [name, job] of mine) {
      job.waiters -= 1;
      if (job.result !== null) {
        out.set(name, job.result);
      } else if (job.started) {
        // STRANDED: still running after this listing stopped waiting.
        if (!job.stranded) {
          job.stranded = true;
          stranded += 1;
        }
      } else if (job.waiters === 0) {
        // Given up on before it started, and nobody else is waiting: it is
        // never started.
        dropped.add(job);
      }
    }
    if (dropped.size > 0) {
      queue = queue.filter((job) => !dropped.has(job));
      for (const job of dropped) jobs.delete(job.path);
    }
    return out;
  };
}

/**
 * One listing's entries, with the link field on every link that answered.
 * PURE. `kind` is what the entry itself is and is never changed by what a link
 * points at.
 */
export function entriesOf(
  abs: string,
  dirents: readonly { readonly name: string; readonly kind: FsDirEntry['kind'] }[],
  links: ReadonlyMap<string, FsLinkTarget>
): FsDirEntry[] {
  return dirents.map((d) => {
    const entry: FsDirEntry = { name: d.name, path: `${abs}/${d.name}`, kind: d.kind };
    const link = d.kind === 'symlink' ? links.get(d.name) : undefined;
    if (link !== undefined) entry.link = link;
    return entry;
  });
}

/** Main's one lane, over the real `stat`. */
export const linkTargetsOf: LinkTargetsOf = createLinkTargets({
  stat: (path) => statThroughLink(path)
});
