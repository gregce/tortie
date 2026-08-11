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
 * Ownership: src/main/conformance/**.
 */

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '@shared/types';
import type { GmuxCore } from '../ipc';
import type { ManifestSessionRecord } from '../manifest';
import { deleteSnapshot } from '../restore/snapshots';
import * as tmux from '../tmux';

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Root under $TMPDIR for the per-agent scratch working directories. */
export const SCRATCH_ROOT = join(tmpdir(), 'gmux-conformance');

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

/**
 * Kill a tmux session, but only if its name proves the harness made it.
 * This guard is the reason the harness can run against the user's live
 * server at all — research 21 §6's lesson, applied to our own bookkeeping.
 */
export async function killOwnSession(tmuxName: string): Promise<boolean> {
  if (!tmuxName.startsWith(CONF_PREFIX)) {
    throw new Error(
      `refusing to kill "${tmuxName}" — not a ${CONF_PREFIX} session`
    );
  }
  const id = await tmuxIdFor(tmuxName);
  if (id === null) return false;
  await tmux.killSession(id);
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
      await core.killSession(rec.id).catch(() => undefined);
    }
    core.discardSession(rec.id);
    await deleteSnapshot(rec.id).catch(() => undefined);
    n++;
  }
  for (const live of await tmux.listSessions().catch(() => [])) {
    if (!live.tmuxName.startsWith(CONF_PREFIX)) continue;
    await tmux.killSession(live.sessionId).catch(() => undefined);
    n++;
  }
  await rm(SCRATCH_ROOT, {
    recursive: true,
    force: true
  }).catch(() => undefined);
  return n;
}
