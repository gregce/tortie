/**
 * The ONE store watcher — the generic half of Phase 13.5's session-id capture
 * (docs/research/22-resume-audit.md §3.2). Every agent-specific fact it needs
 * (where to look, how to read an id out of a name, how to prove the record is
 * this pane's) arrives as a HarvestDescriptor from ./stores.ts, so adding an
 * agent never means adding a second harvester.
 *
 * Strategy, inherited from the shipped codex harvester and now shared:
 *  - @parcel/watcher (FSEvents) subscriptions on the descriptor's roots — the
 *    fast channel,
 *  - plus a readdir poll that BACKS OFF, because a native watcher can fail to
 *    initialize or drop events and the id is the whole point,
 *  - disambiguation by the descriptor's key: a confirmed candidate wins
 *    immediately; an unconfirmable one is accepted after `graceMs` only if no
 *    confirmed rival has appeared, and is flagged `viaGraceTimer` so nobody
 *    downstream mistakes "probably" for "proven".
 *
 * A TIMEOUT IS NOT A SUCCESS: the promise rejects with a message saying the
 * session is fine and the id was not recorded. See HARVEST_WINDOW_MS in
 * ./stores.ts for why that window is hours rather than the old two minutes.
 *
 * Ownership: src/main/manifest/**. Pure Node (no Electron import).
 */

import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as parcelWatcher from '@parcel/watcher';
import type { LaunchableAgentId } from '@shared/types';
import { getRegistryEntry } from '../../agents/registry';
import {
  DESCRIPTORS,
  type DescriptorEnv,
  type HarvestContext,
  type HarvestDescriptor,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './stores';

// ---------------------------------------------------------------------------
// The watcher
// ---------------------------------------------------------------------------

interface Candidate {
  path: string;
  sessionId: string;
  /** Filename timestamp when the name carries one, else first-seen. */
  orderTs: number;
  firstSeen: number;
  verdict: HarvestVerdict;
}

/** List candidate entries under `dir`, honouring the descriptor's filters. */
async function scan(
  dir: string,
  depth: number,
  d: HarvestDescriptor,
  out: string[]
): Promise<void> {
  if (depth > d.maxDepth) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // not created yet, or vanished — both fine
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (d.entry === 'dir' && depth === 0 && d.identify(full) !== null) {
        out.push(full);
      }
      if (d.recurse?.(e.name, depth, full) === true) {
        await scan(full, depth + 1, d, out);
      }
    } else if (d.entry === 'file' && d.identify(full) !== null) {
      out.push(full);
    }
  }
}

/**
 * Watch an agent's session store for the record created by the spawn at
 * `ctx.sinceTs` and extract its conversation id.
 *
 * Strategy (unchanged from the shipped codex harvester, now shared):
 *  - @parcel/watcher (FSEvents) subscriptions on the descriptor's roots,
 *  - plus a readdir poll, because a native watcher can fail to initialize or
 *    drop events and the id is the whole point,
 *  - disambiguation by the descriptor's key: a confirmed candidate wins
 *    immediately, an unconfirmable one is accepted after `graceMs` only if no
 *    confirmed rival has appeared.
 *
 * @throws (rejects) on timeout, with a message that says the SESSION is fine
 *         and the ID was not recorded — never silently resolves.
 */
export function watchForSessionId(
  agent: LaunchableAgentId,
  ctx: HarvestContext,
  options: HarvestOptions = {}
): SessionIdWatch {
  const d = DESCRIPTORS[agent];
  if (d === undefined) {
    // Asking a pre-assigning agent to harvest is a programming error, not a
    // runtime condition — say which mode it actually uses. pi is the trap
    // worth naming: its store stays EMPTY until the first turn, so a
    // codex-style watch would find nothing for exactly the panes nobody has
    // talked to yet.
    const refused: Promise<HarvestedSessionId> = Promise.reject(
      new Error(
        `Agent '${agent}' does not harvest its session id ` +
          `(idCapture: ${getRegistryEntry(agent).resume.idCapture.mode}).`
      )
    );
    refused.catch(() => undefined); // never an unhandled rejection
    return { promise: refused, cancel: () => undefined };
  }

  const de: DescriptorEnv = {
    home: options.home ?? homedir(),
    env: options.env ?? process.env
  };
  const roots = d.roots(ctx, de);
  const timeoutMs = options.timeoutMs ?? d.timeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? d.pollIntervalMs;
  const maxPollIntervalMs = Math.max(
    pollIntervalMs,
    options.maxPollIntervalMs ?? 10_000
  );
  const graceMs = options.graceMs ?? d.graceMs;
  // Slack for clock/fs-timestamp skew between our sinceTs and file times.
  const minTs = ctx.sinceTs - 2_000;

  const candidates = new Map<string, Candidate>();
  const subscriptions: parcelWatcher.AsyncSubscription[] = [];
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let pollDelay = pollIntervalMs;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  let resolveP!: (v: HarvestedSessionId) => void;
  let rejectP!: (e: Error) => void;
  const promise = new Promise<HarvestedSessionId>((resolve, reject) => {
    resolveP = resolve;
    rejectP = reject;
  });
  // A rejection that nobody has attached to yet must not crash main.
  promise.catch(() => undefined);

  const cleanup = (): void => {
    if (pollTimer !== undefined) clearTimeout(pollTimer);
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    for (const sub of subscriptions) {
      void sub.unsubscribe().catch(() => undefined);
    }
    subscriptions.length = 0;
  };

  const settle = (info: HarvestedSessionId | null, err?: Error): void => {
    if (settled) return;
    settled = true;
    cleanup();
    if (info) resolveP(info);
    else rejectP(err ?? new Error(`${agent} session-id harvest failed`));
  };

  const accept = (c: Candidate, viaGraceTimer: boolean): void => {
    settle({
      agent,
      sessionId: c.sessionId,
      storePath: c.path,
      key: d.key,
      confidence: d.confidence,
      viaGraceTimer
    });
  };

  /**
   * A watcher event for a dir-keyed store arrives as a path INSIDE the
   * session directory (`brain/<id>/.system_generated/…`); walk it back up to
   * the directory that carries the id.
   */
  const normalize = (path: string): string => {
    if (d.entry !== 'dir') return path;
    for (const root of roots) {
      const prefix = `${root}/`;
      if (!path.startsWith(prefix)) continue;
      const seg = path.slice(prefix.length).split('/')[0];
      if (seg !== undefined && seg.length > 0) return join(root, seg);
    }
    return path;
  };

  /** Register/refresh one path as a candidate; may settle the watch. */
  const consider = async (raw: string): Promise<void> => {
    if (settled) return;
    const path = normalize(raw);
    const parsed = d.identify(path);
    if (parsed === null) return;

    // Freshness: a filename timestamp OR the file's own times must be at or
    // after the spawn. Either passing is enough — stat can fail after an
    // archive move, and a filename time can lag the write.
    let fresh = parsed.nameTs !== undefined && parsed.nameTs >= minTs;
    let orderTs = parsed.nameTs ?? Date.now();
    if (!fresh) {
      try {
        const st = await stat(path);
        fresh = st.mtimeMs >= minTs || st.birthtimeMs >= minTs;
        if (parsed.nameTs === undefined) {
          orderTs = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
        }
      } catch {
        /* moved away — the name check already spoke */
      }
    }
    if (!fresh) return;

    const existing = candidates.get(parsed.sessionId);
    const cand: Candidate = existing ?? {
      path,
      sessionId: parsed.sessionId,
      orderTs,
      firstSeen: Date.now(),
      verdict: 'unknown'
    };
    cand.path = path; // follow archive moves
    if (cand.verdict === 'unknown') {
      cand.verdict = await d.confirm(path, ctx);
    }
    candidates.set(parsed.sessionId, cand);
    decide();
  };

  /** Pick a winner if one is ready. */
  const decide = (): void => {
    if (settled) return;
    const list = [...candidates.values()].filter((c) => c.verdict !== 'mismatch');
    if (list.length === 0) return;
    // Earliest record at/after spawn is most likely ours.
    list.sort((a, b) => a.orderTs - b.orderTs);
    const confirmed = list.find((c) => c.verdict === 'match');
    if (confirmed) {
      accept(confirmed, false);
      return;
    }
    // No confirmation possible yet: wait out the grace period in case a
    // confirmable rival shows up or the record gains its key.
    const first = list[0];
    if (first && Date.now() - first.firstSeen >= graceMs) accept(first, true);
  };

  const poll = async (): Promise<void> => {
    if (settled) return;
    const found: string[] = [];
    for (const root of roots) await scan(root, 0, d, found);
    for (const p of found) await consider(p);
    decide(); // re-evaluate grace timers even with no new entries
  };

  const onEvents: parcelWatcher.SubscribeCallback = (err, events) => {
    if (settled) return;
    if (err) return; // the poll is the guaranteed path
    for (const evt of events) {
      if (evt.type === 'delete') continue;
      void consider(evt.path);
    }
  };

  const subscribeTo = async (dir: string): Promise<void> => {
    try {
      if (!existsSync(dir)) return; // the poll picks it up once it exists
      const sub = await parcelWatcher.subscribe(dir, onEvents);
      if (settled) {
        void sub.unsubscribe().catch(() => undefined);
        return;
      }
      subscriptions.push(sub);
    } catch {
      // FSEvents unavailable or a dir race — polling covers us.
    }
  };
  for (const root of roots) void subscribeTo(root);

  /**
   * Self-rescheduling poll that BACKS OFF. The native watcher is the fast
   * channel; this is the guarantee, and the window is now hours long (a
   * trust prompt or an untouched pane), so a fixed 1 Hz readdir would be
   * paying full price for the whole tail.
   */
  const schedulePoll = (): void => {
    if (settled) return;
    pollTimer = setTimeout(() => {
      void poll().finally(() => {
        pollDelay = Math.min(Math.round(pollDelay * 1.5), maxPollIntervalMs);
        schedulePoll();
      });
    }, pollDelay);
  };
  void poll();
  schedulePoll();

  timeoutTimer = setTimeout(() => {
    settle(
      null,
      new Error(
        `Timed out after ${timeoutMs} ms waiting for a ${agent} session record in ` +
          `${roots.join(', ')} (cwd ${ctx.cwd}). The session runs fine, but gmux ` +
          'could not record its resume id.'
      )
    );
  }, timeoutMs);

  return {
    promise,
    cancel: () => settle(null, new Error(`${agent} session-id harvest cancelled`))
  };
}
