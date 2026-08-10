/**
 * Tier 0 for Claude Code — its own session registry (research 18 §2.1).
 *
 * Claude writes `~/.claude/sessions/<pid>.json` for every interactive session
 * and keeps it current from a React effect on every state change, publishing
 * `status: busy | shell | idle | waiting` plus a free-text `waitingFor`.
 * Measured latency 26–40 ms; the file is deleted on exit, including
 * `tmux kill-session`. Zero injection, works for detached panes, and survives
 * a gmux restart. It is the reason claude needs no hooks to be correct.
 *
 * THREE MAPPING TRAPS, all found live on this machine — every naive
 * implementation gets at least one of them wrong:
 *
 *  1. The `tmux` field's session NAME goes stale after a rename; the pane id
 *     does not. `81487.json` said `"tmux":"claude-1:@126.%126"` while pane
 *     %126 was by then session `greg`. ⇒ Parse ONLY the `%N` pane id.
 *  2. Older builds write no `status` field at all (a 2.1.220 VS Code
 *     extension host). ⇒ Ignore entries without one; missing is NOT idle.
 *  3. Entries with `"tmux": null` exist (claudes outside tmux). ⇒ Ignore
 *     them — they are not gmux sessions. The pid path below is the fallback
 *     that still covers gmux's RESTORE shape, where the pane runs $SHELL and
 *     claude is a child of it.
 *
 * On any parse failure the reader simply publishes nothing and the session
 * falls through to tiers 1–3, which already resolve claude at 1.3 % FN. This
 * file is claude's internal state, not a documented API.
 */

import { readdir, readFile } from 'node:fs/promises';
import { watch, type FSWatcher } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ClaudeSessionStatus = 'busy' | 'shell' | 'idle' | 'waiting';

export interface ClaudeSessionEntry {
  pid: number;
  status: ClaudeSessionStatus;
  /** Only present while `waiting` ("permission prompt", "input needed", …). */
  waitingFor?: string;
  /** `%N` parsed out of the `tmux` field; absent for non-tmux claudes. */
  paneId?: string;
  /** Epoch ms of the last status write. */
  statusUpdatedAt: number;
  version?: string;
}

const STATUSES = new Set(['busy', 'shell', 'idle', 'waiting']);

/**
 * The watch fires for EVERY claude on the machine, not just gmux's, and
 * claude rewrites its file on every state change. Coalescing at this interval
 * caps the re-read rate while still beating the 1 Hz poll by a wide margin.
 */
const WATCH_DEBOUNCE_MS = 150;

/** Extract the immutable pane id from `"<name>:@<win>.%<pane>"`. */
export function parsePaneIdFromTmuxField(field: unknown): string | undefined {
  if (typeof field !== 'string') return undefined;
  const m = /(%\d+)/.exec(field);
  return m?.[1];
}

/** Parse one registry file's contents; null when it is not usable. */
export function parseClaudeSessionFile(json: string): ClaudeSessionEntry | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj['kind'] !== 'interactive') return null;
  const status = obj['status'];
  // Trap 2: an entry with no status is an older build, not an idle session.
  if (typeof status !== 'string' || !STATUSES.has(status)) return null;
  const pid = obj['pid'];
  if (typeof pid !== 'number' || !Number.isInteger(pid)) return null;
  const paneId = parsePaneIdFromTmuxField(obj['tmux']); // trap 1 + trap 3
  const waitingFor = obj['waitingFor'];
  const updated = obj['statusUpdatedAt'];
  const version = obj['version'];
  return {
    pid,
    status: status as ClaudeSessionStatus,
    ...(typeof waitingFor === 'string' && waitingFor.length > 0
      ? { waitingFor }
      : {}),
    ...(paneId !== undefined ? { paneId } : {}),
    statusUpdatedAt: typeof updated === 'number' ? updated : 0,
    ...(typeof version === 'string' ? { version } : {})
  };
}

/**
 * Reads (and watches) `~/.claude/sessions`. The watch is a latency upgrade
 * only: every tick re-reads the directory anyway, which measured well under a
 * millisecond for the handful of files that live there.
 */
export class ClaudeSessionRegistry {
  private readonly dir: string;
  private byPaneId = new Map<string, ClaudeSessionEntry>();
  private byPid = new Map<number, ClaudeSessionEntry>();
  private watcher: FSWatcher | null = null;
  private debounce: NodeJS.Timeout | null = null;
  private reading = false;

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), '.claude', 'sessions');
  }

  /** `onChange` fires (debounced) when claude rewrote any registry file. */
  start(onChange: () => void): void {
    if (this.watcher !== null) return;
    try {
      this.watcher = watch(this.dir, { persistent: false }, () => {
        if (this.debounce !== null) return;
        this.debounce = setTimeout(() => {
          this.debounce = null;
          void this.refresh().then(onChange);
        }, WATCH_DEBOUNCE_MS);
        this.debounce.unref?.();
      });
      this.watcher.on('error', () => {
        this.watcher?.close();
        this.watcher = null; // per-tick refresh still covers us
      });
    } catch {
      // Directory absent (claude never run here) — refresh() no-ops until it
      // appears, and start() is retried on the next boot.
      this.watcher = null;
    }
  }

  stop(): void {
    if (this.debounce !== null) clearTimeout(this.debounce);
    this.debounce = null;
    this.watcher?.close();
    this.watcher = null;
  }

  /** Re-read the whole directory. Never throws. */
  async refresh(): Promise<void> {
    if (this.reading) return;
    this.reading = true;
    try {
      const names = await readdir(this.dir).catch(() => [] as string[]);
      const byPaneId = new Map<string, ClaudeSessionEntry>();
      const byPid = new Map<number, ClaudeSessionEntry>();
      await Promise.all(
        names
          .filter((n) => n.endsWith('.json'))
          .map(async (name) => {
            const text = await readFile(join(this.dir, name), 'utf8').catch(
              () => null
            );
            if (text === null) return;
            const entry = parseClaudeSessionFile(text);
            if (entry === null) return;
            byPid.set(entry.pid, entry);
            if (entry.paneId !== undefined) byPaneId.set(entry.paneId, entry);
          })
      );
      this.byPaneId = byPaneId;
      this.byPid = byPid;
    } finally {
      this.reading = false;
    }
  }

  forPane(paneId: string): ClaudeSessionEntry | undefined {
    return this.byPaneId.get(paneId);
  }

  /** Entries with no pane id — candidates for the pid/subtree fallback. */
  unmapped(): ClaudeSessionEntry[] {
    return [...this.byPid.values()].filter((e) => e.paneId === undefined);
  }
}
