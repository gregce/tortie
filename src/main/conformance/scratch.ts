/**
 * The scratch sessions the resume-conformance harness owns: finding them,
 * killing them, waiting on their manifest row, and sweeping up after an
 * aborted run.
 *
 * THE SAFETY BOUNDARY LIVES HERE. This harness runs against the user's real
 * private tmux server, alongside ~15 sessions of real work, so exactly one
 * rule governs every destructive call in the file: a session is killable only
 * if its NAME begins with {@link CONF_PREFIX}. Not "the manifest says it is
 * ours" — the manifest is bookkeeping and bookkeeping can be wrong, and
 * research 21 §6 is the record of what happens when gmux acts on a weaker
 * claim than proof. {@link killOwnSession} throws rather than kill anything
 * else, and every caller goes through it.
 *
 * WHAT A HANG-UP LEAVES (Phase 323, build/p323/SPEC.md §4.4). Ending a tmux
 * session only hangs up its panes, and a created Gemini session survives that:
 * both of its processes keep running after the pane is gone. So every place in
 * this file that ends one of OUR sessions reads that session's process tree
 * FIRST, while its panes are still alive, and records it. Where this file sends
 * the hang-up itself, it then ends what the hang-up was aimed at and outlived
 * it, through the same module the product's End uses, and waits for that. That
 * is what makes step 5's simulated reboot end what a reboot ends before step 7
 * restores. Where the product's End sends it (`core.killSession`), the tree is
 * only recorded, because the product ends it. {@link leftBehind} is the run's
 * closing check: it waits for the product's Ends to finish ending what they
 * recorded, because since the fix round a quit no longer waits for them, and
 * then re-reads every recorded tree. Nothing that left the session's terminal
 * is ever signalled here, exactly as in the product.
 *
 * Ownership: src/main/conformance/**.
 */

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@shared/types';
import type { GmuxCore } from '../sessions';
import type { ManifestSessionRecord } from '../manifest';
import {
  basenameOf,
  defaultEndDeps,
  endHangupSurvivors,
  ENDING_WORST_MS,
  livePanesVia,
  parsePaneRoots,
  POLL_MS,
  READ_RETRY_MS,
  readSessionTree,
  sessionPanesArgv,
  stillTheSame,
  TREE_READ_TIMEOUT_MS,
  type EndDeps,
  type SessionTree,
  type TreeEntry,
  type TreeRow
} from '../proc/session-tree';
import { deleteSnapshot } from '../restore/snapshots';
import * as tmux from '../tmux';

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Root for the per-agent scratch working directories. Under a harness run,
 * GMUX_HARNESS_DIR is set before this process starts and the root sits inside
 * that run's own directory, so two conformance runs never share a working
 * directory and one run's sweep deletes only its own work (Phase 114, root 2
 * of Phase 112's list). Without a harness the old location under $TMPDIR is
 * kept.
 */
export const SCRATCH_ROOT = join(
  process.env['GMUX_HARNESS_DIR'] ?? tmpdir(),
  'gmux-conformance'
);

/**
 * Every session this harness creates starts with this. It is the ONLY thing
 * that authorises a kill: a session whose name does not begin with it is
 * somebody's real work, and the harness treats that as untouchable no matter
 * what its own bookkeeping says.
 */
export const CONF_PREFIX = 'zz-conf-';

/** The live tmux `$-id` for one of OUR sessions, or null. */
export async function tmuxIdFor(tmuxName: string): Promise<string | null> {
  const live = await tmux.listSessions().catch(() => []);
  return live.find((s) => s.tmuxName === tmuxName)?.sessionId ?? null;
}

// ---------------------------------------------------------------------------
// Phase 323: the trees this run read, and what they left behind
// ---------------------------------------------------------------------------

/**
 * Every process tree this run read before a hang-up, in the order it read
 * them. Module level on purpose: the closing check in ./resume reads it after
 * every case, the sweeps and the shutdown have finished, whichever of them did
 * the reading.
 */
const recordedTrees: SessionTree[] = [];

/**
 * When the last tree whose End the PRODUCT sends was recorded, on the ending's
 * own clock. The closing check gives that End {@link ENDING_WORST_MS} from here
 * to finish, because nothing else waits for it (the fix round).
 */
let productEndRecordedAt: number | null = null;

let endDepsHeld: EndDeps | null = null;

/**
 * The real `/bin/ps` reader and `process.kill`, made once for the run, with
 * the pane check asking the run's own server (the second fix round: a session
 * whose window another session still shows was never hung up).
 */
function endDeps(): EndDeps {
  endDepsHeld ??= defaultEndDeps(
    livePanesVia(
      (argv) => tmux.execTmux(argv, { timeoutMs: TREE_READ_TIMEOUT_MS }),
      (err) => tmux.serverProbeVerdict(err) === 'no-server'
    )
  );
  return endDepsHeld;
}

/**
 * Every session of this run whose tree could NOT be read before its hang-up,
 * each as `<tmux name>: <why>` (the tools round after his ruling of
 * 2026-09-30). The closing check can say nothing about such a session's
 * processes, so a run with one here must not read as a run whose check found
 * nothing: the reverify ran the capture with `/bin/ps` refused, logged seven
 * Ends whose tree "could not be read", and still printed "0 agent processes of
 * this run are still running", because an unread tree was simply not
 * recorded.
 */
const unreadSessions: string[] = [];

/**
 * What one read of a session's tree answered. `failed` is why the read could
 * not be made (tmux did not answer, or the process table could not be read);
 * a session that answered with no live pane is `tree: null, failed: null`,
 * because there was nothing under a pane to look at, which is exactly what the
 * product's own End finds for it too.
 */
interface TreeRead {
  tree: SessionTree | null;
  failed: string | null;
}

/**
 * Read the process tree under one live session, by its `$-id`, while its
 * panes are still alive. No tree when it has no live pane, when tmux could not
 * answer, or when the process table could not be read; no tree means only the
 * hang-up is sent, which is what happened before Phase 323. The last two are a
 * read that FAILED, and say so.
 *
 * The root is always a pane of THAT `$-id` whose process is the answering
 * server's own child (session-tree.ts checks the second half). Never a name,
 * never a pid from bookkeeping.
 */
async function readTreeOf(id: string): Promise<TreeRead> {
  let stdout: string;
  try {
    stdout = await tmux.execTmux(
      sessionPanesArgv(tmux.formatSessionTarget(id)),
      { timeoutMs: TREE_READ_TIMEOUT_MS }
    );
  } catch {
    return { tree: null, failed: 'its panes could not be read' };
  }
  const roots = parsePaneRoots(stdout);
  if (roots.length === 0) return { tree: null, failed: null };
  const table = await endDeps().readTable();
  if (table === null) {
    return { tree: null, failed: 'the process table could not be read' };
  }
  return { tree: readSessionTree(table, roots, process.pid), failed: null };
}

/**
 * Record the tree of one of OUR sessions whose End the PRODUCT is about to
 * send (`core.killSession`). Recorded only: the product's End reads its own
 * tree and ends its own survivors, and a second ending from here would be a
 * second implementation of the same promise. The recording is what lets the
 * closing check say whether the product kept it. A read that could not be
 * made is recorded as that, and never throws: its callers swallow a throw,
 * which is how an unread tree used to vanish.
 */
async function recordTreeOf(tmuxName: string): Promise<void> {
  if (!tmuxName.startsWith(CONF_PREFIX)) return;
  let read: TreeRead;
  try {
    // Not `tmuxIdFor`, which answers "not live" when tmux does not answer:
    // here that is a read that could not be made, and says so.
    const live = await tmux.listSessions();
    const id = live.find((s) => s.tmuxName === tmuxName)?.sessionId ?? null;
    if (id === null) return;
    read = await readTreeOf(id);
  } catch (err) {
    read = { tree: null, failed: `the read threw (${(err as Error).message})` };
  }
  if (read.failed !== null) unreadSessions.push(`${tmuxName}: ${read.failed}`);
  if (read.tree === null) return;
  recordedTrees.push(read.tree);
  productEndRecordedAt = endDeps().now();
}

/**
 * Hang up one of OUR sessions by its `$-id` and end what the hang-up was aimed
 * at and outlived it, waiting for that. The tree is read BEFORE the hang-up,
 * because after it the panes are gone and a survivor's parent is launchd. If
 * the hang-up itself throws, nothing is signalled and nothing is recorded: the
 * session is still alive and ending its processes then would be something
 * other than End. A tree that could not be read is recorded as that once the
 * hang-up has gone out.
 */
async function hangUpAndEnd(id: string, tmuxName: string): Promise<void> {
  const read = await readTreeOf(id);
  await tmux.killSession(id);
  if (read.failed !== null) unreadSessions.push(`${tmuxName}: ${read.failed}`);
  if (read.tree === null) return;
  recordedTrees.push(read.tree);
  await endHangupSurvivors(read.tree, endDeps());
}

/** One key per process as the tree read saw it, so a pid read twice counts once. */
function identityKey(e: TreeEntry): string {
  return `${String(e.pid)}\u0000${String(e.pgid)}\u0000${e.lstart}\u0000${e.command}`;
}

function uniqueEntries(entries: readonly TreeEntry[]): TreeEntry[] {
  const seen = new Map<string, TreeEntry>();
  for (const e of entries) seen.set(identityKey(e), e);
  return [...seen.values()];
}

/**
 * One re-read of these pids that ANSWERED, asked again every poll for up to
 * {@link READ_RETRY_MS}, or null when none did. A single slow `ps` on a loaded
 * Mac is not a closing check that could not look (the fix round measured two
 * pid reads at 1,334 ms under load).
 */
async function rereadAnswered(
  deps: EndDeps,
  pids: readonly number[]
): Promise<Map<number, TreeRow> | null> {
  const until = deps.now() + READ_RETRY_MS;
  for (;;) {
    const table = await deps.reread(pids);
    if (table !== null) return table;
    if (deps.now() >= until) return null;
    await deps.sleep(POLL_MS);
  }
}

/**
 * The run's closing check (Phase 323): which processes this run's trees
 * recorded are STILL the processes they were, by a re-read of the table
 * through `stillTheSame` (pid, group, start time and command line all equal).
 *
 * It first WAITS for the product's own Ends to finish, polling until every
 * hang-up target they recorded is gone or {@link ENDING_WORST_MS} has passed
 * since the last one was recorded. The quit no longer waits for an End's
 * ending (the fix round: joining it made a quit after an End seconds slower
 * than today), so without this wait the check would read an ending still in
 * its grace as something left behind.
 *
 * `targets` is the basenames of hang-up targets still running, and a count
 * above 0 is red. `outOfScope` is every other recorded process still running,
 * being what left the session's terminal (a `setsid` child, a background job
 * in a group of its own). Phase 323 spares those on purpose, in the product and
 * here, so they are reported and never red.
 *
 * `unread` is every session whose tree could not be read before its hang-up.
 * The check cannot say anything about those, and {@link closingVerdict} reads
 * any of them as a check that could not look, never as one that found nothing.
 * `recorded` is how many hang-up targets the trees it did read hold, so a
 * clean line says out of how many.
 *
 * Throws when no re-read answered, because a check that cannot look must not
 * read as a check that found nothing.
 */
export async function leftBehind(): Promise<LeftBehind> {
  const unread = [...unreadSessions];
  const all = uniqueEntries(recordedTrees.flatMap((t) => t.all));
  if (all.length === 0) {
    return { targets: [], outOfScope: [], unread, recorded: 0 };
  }
  const targetKeys = new Set(
    recordedTrees.flatMap((t) => t.targets).map(identityKey)
  );
  const recordedTargets = all.filter((e) => targetKeys.has(identityKey(e)));
  const deps = endDeps();
  if (productEndRecordedAt !== null && recordedTargets.length > 0) {
    const until = productEndRecordedAt + ENDING_WORST_MS;
    for (;;) {
      const table = await deps.reread(recordedTargets.map((e) => e.pid));
      if (table !== null && stillTheSame(recordedTargets, table).length === 0) {
        break;
      }
      if (deps.now() >= until) break;
      await deps.sleep(POLL_MS);
    }
  }
  const table = await rereadAnswered(
    deps,
    all.map((e) => e.pid)
  );
  if (table === null) {
    throw new Error('the process table could not be read');
  }
  const running = stillTheSame(all, table);
  const targets: string[] = [];
  const outOfScope: string[] = [];
  for (const e of running) {
    (targetKeys.has(identityKey(e)) ? targets : outOfScope).push(
      basenameOf(e.command)
    );
  }
  return { targets, outOfScope, unread, recorded: recordedTargets.length };
}

/** What the closing check found (see {@link leftBehind}). */
export interface LeftBehind {
  /** Basenames of the hang-up targets still running: red. */
  targets: string[];
  /** Basenames of what left the session's terminal, still running: spared by design. */
  outOfScope: string[];
  /** `<tmux name>: <why>` for every session whose tree could not be read: the check could not look. */
  unread: string[];
  /** How many hang-up targets the trees it did read hold. */
  recorded: number;
}

/**
 * The closing check's one line and the run's exit code for it, from what
 * {@link leftBehind} answered or the reason it threw. Kept here, beside what
 * it judges, so the rule that a check which could not look never reads as a
 * check that found nothing is driven by the unit rows and not only read.
 *
 * Red (1) when any hang-up target is still running, when any session's tree
 * could not be read, or when the re-read itself never answered. Only a run
 * whose every session was read and whose every target is gone prints the
 * clean line, and it says out of how many.
 */
export function closingVerdict(left: LeftBehind | { failed: string }): {
  code: 0 | 1;
  line: string;
} {
  if ('failed' in left) {
    return {
      code: 1,
      line:
        `[gmux-conf] FAIL: the closing check could not look for agent ` +
        `processes this run left running: ${left.failed}`
    };
  }
  const named = (list: readonly string[]): string =>
    list.length === 0 ? '' : ` (${list.join(', ')})`;
  const spared =
    `; ${String(left.outOfScope.length)} that left the session's terminal ` +
    `still running, spared by design${named(left.outOfScope)}`;
  if (left.unread.length > 0) {
    return {
      code: 1,
      line:
        `[gmux-conf] FAIL: the closing check could not look at ` +
        `${String(left.unread.length)} session(s) of this run, whose process ` +
        `tree could not be read before the hang-up (${left.unread.join('; ')}), ` +
        `so it cannot say what they left running; of the trees it did read, ` +
        `${String(left.targets.length)} of ${String(left.recorded)} agent ` +
        `process(es) are still running${named(left.targets)}${spared}`
    };
  }
  if (left.targets.length > 0) {
    return {
      code: 1,
      line:
        `[gmux-conf] FAIL: ${String(left.targets.length)} agent process(es) of ` +
        `this run are still running${named(left.targets)}${spared}`
    };
  }
  return {
    code: 0,
    line:
      `[gmux-conf] closing check: 0 of the ${String(left.recorded)} agent ` +
      `process(es) this run read are still running${spared}`
  };
}

/**
 * Kill a tmux session, but only if its name proves the harness made it.
 * This guard is the reason the harness can run against the user's live
 * server at all — research 21 §6's lesson, applied to our own bookkeeping.
 *
 * Since Phase 323 it also ends what the hang-up leaves, and waits for that,
 * so the simulated reboot at step 5 ends what a reboot ends.
 */
export async function killOwnSession(tmuxName: string): Promise<boolean> {
  if (!tmuxName.startsWith(CONF_PREFIX)) {
    throw new Error(
      `refusing to kill "${tmuxName}" — not a ${CONF_PREFIX} session`
    );
  }
  const id = await tmuxIdFor(tmuxName);
  if (id === null) return false;
  await hangUpAndEnd(id, tmuxName);
  return true;
}

/** Wait for the manifest row to carry BOTH an id and a non-empty resume argv. */
export async function pollManifest(
  core: GmuxCore,
  sessionId: string,
  maxMs: number
): Promise<ManifestSessionRecord | null> {
  const deadline = Date.now() + maxMs;
  for (;;) {
    const rec = core.listSessionRecords().find((r) => r.id === sessionId);
    if (
      rec !== undefined &&
      rec.agentSessionId !== undefined &&
      rec.agentSessionId.length > 0 &&
      (rec.resumeArgv?.length ?? 0) > 0
    ) {
      return rec;
    }
    if (Date.now() >= deadline) return null;
    await delay(1_000);
  }
}

/** Drive a reconcile until the row reaches `want` (or give up). */
export async function waitForStatus(
  core: GmuxCore,
  sessionId: string,
  want: string,
  maxMs: number
): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  for (;;) {
    await core.refresh().catch(() => undefined);
    const rec = core.listSessionRecords().find((r) => r.id === sessionId);
    if (rec?.status === want) return true;
    if (Date.now() >= deadline) return false;
    await delay(1_000);
  }
}

/** Kill + discard the session, drop its snapshot, remove the scratch dir. */
export async function cleanupCase(
  core: GmuxCore,
  session: Session | null,
  cwd: string
): Promise<void> {
  if (session !== null) {
    const rec = core.listSessionRecords().find((r) => r.id === session.id);
    if (rec !== undefined && rec.tmuxName.startsWith(CONF_PREFIX)) {
      if (rec.status !== 'exited' && rec.status !== 'restorable') {
        // Phase 323: recorded only, the product's End ends it.
        await recordTreeOf(rec.tmuxName).catch(() => undefined);
        await core.killSession(rec.id).catch(() => undefined);
      }
      // Belt and braces: a restore may have produced a deduped name.
      await killOwnSession(rec.tmuxName).catch(() => undefined);
      core.discardSession(rec.id);
    }
    await deleteSnapshot(session.id).catch(() => undefined);
  }
  // Same rule as killOwnSession, applied to the filesystem: delete only what
  // is provably ours. The prefix test alone is not enough — the harness
  // realpath()s its scratch dirs (qwen and pi key their stores on the
  // resolved cwd), and on macOS that turns /var/folders/… into
  // /private/var/folders/…, which no longer starts with SCRATCH_ROOT.
  if (cwd.startsWith(SCRATCH_ROOT) || cwd.includes('/gmux-conformance/')) {
    await rm(cwd, { recursive: true, force: true });
  }
}

/**
 * Clear leftovers from an aborted run — our own manifest rows and any
 * `zz-conf-` tmux session, whether or not this manifest remembers it.
 */
export async function sweepLeftovers(core: GmuxCore): Promise<number> {
  let n = 0;
  for (const rec of core.listSessionRecords()) {
    if (!rec.name.startsWith(CONF_PREFIX)) continue;
    if (rec.status !== 'exited' && rec.status !== 'restorable') {
      // Phase 323: recorded only, the product's End ends it.
      await recordTreeOf(rec.tmuxName).catch(() => undefined);
      await core.killSession(rec.id).catch(() => undefined);
    }
    core.discardSession(rec.id);
    await deleteSnapshot(rec.id).catch(() => undefined);
    n++;
  }
  for (const live of await tmux.listSessions().catch(() => [])) {
    if (!live.tmuxName.startsWith(CONF_PREFIX)) continue;
    // Phase 323: this hang-up is the sweep's own, so it reads, ends and
    // records exactly as killOwnSession does.
    await hangUpAndEnd(live.sessionId, live.tmuxName).catch(() => undefined);
    n++;
  }
  await rm(SCRATCH_ROOT, {
    recursive: true,
    force: true
  }).catch(() => undefined);
  return n;
}
