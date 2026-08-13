/**
 * Scrollback facts, read ON DEMAND (Phase 13.7).
 *
 * WHY EVERYTHING HERE IS PULL, NEVER PUSH
 *
 * docs/ZEN-OF-TORTIE.md refuses a dashboard: "No counters, no activity feeds,
 * no progress theatre. A number that rises on its own is not a signal, it is
 * noise in a nicer font." Nothing in this module is broadcast, subscribed to,
 * or cached for display. It runs when a human opens Settings, right-clicks a
 * session, or clicks Copy details — and it costs nothing the rest of the time.
 *
 * AND THE DASHBOARD NUMBERS ARE NOT EVEN TRUE, which settles it independently
 * of philosophy. Measured on the user's live server, 2026-08-10:
 *
 *     scrollback the server actually holds (Σ #{history_bytes})   6.99 MB
 *     tmux server RSS (`ps`, after 1 d 3 h uptime)               164.8 MB
 *     overstatement                                                 23.6×
 *
 * RSS is a high-water mark: 4.58 GB of history was watched clearing down to
 * 141 MB physical while RSS stayed elevated. An ambient "gmux is using N MB"
 * readout would be wrong by more than an order of magnitude, in the alarming
 * direction, and unactionable besides. So RSS is CUT from every visible
 * surface and survives in exactly one place — the Copy details block, where
 * it is labelled as the high-water mark it is.
 *
 * `#{history_bytes}` is the only honest source: exact (within 2% of `vmmap`
 * ALLOCATED), live, per-pane, and free to read.
 *
 * Ownership: src/main/scrollback/**.
 */

import { app } from 'electron';
import { readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import type { GmuxProcess } from '../diagnostics/owned-processes';
import { classifySnapshotFile } from '../restore/snapshots';
import type {
  PaneScrollbackFacts,
  SavedScrollbackFacts,
  ScrollbackStats,
  SessionScrollbackFacts
} from '@shared/scrollback';
import { bytesPerLine } from '@shared/scrollback';
import type { GmuxSettings } from '@shared/settings';

/**
 * One `list-panes` reads the whole fleet. Deliberately its OWN format rather
 * than three more fields on the 1 Hz poll's `PANE_FORMAT`: that format parses
 * by tab INDEX with `#{pane_title}` last, so every insertion is a chance to
 * silently corrupt agent-state detection for a diagnostics number.
 */
const STATS_FORMAT = [
  '#{session_id}',
  '#{history_size}',
  '#{history_limit}',
  '#{history_bytes}',
  '#{pane_height}'
].join('\t');

/** Per-session read, for the one session the user right-clicked. */
const SESSION_FORMAT = ['#{history_size}', '#{history_limit}', '#{history_bytes}'].join(
  '\t'
);

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

interface PaneRow extends PaneScrollbackFacts {
  tmuxId: string;
}

export function parseStatsLines(out: string): PaneRow[] {
  const rows: PaneRow[] = [];
  for (const line of out.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split('\t');
    const tmuxId = f[0];
    if (tmuxId === undefined || tmuxId.length === 0) continue;
    rows.push({
      tmuxId,
      lines: num(f[1]),
      limit: num(f[2]),
      bytes: num(f[3]),
      rows: num(f[4])
    });
  }
  return rows;
}

export interface ScrollbackServiceDeps {
  /** Runs one tmux command — the control-client-preferring runner. */
  run: (args: readonly string[]) => Promise<string>;
  /** Live tmux `$-id` for a gmux session id, or null when not running. */
  tmuxIdOf(sessionId: string): string | null;
  /** Display name for a live tmux `$-id`, or null when it is not ours. */
  nameOf(tmuxId: string): string | null;
  /** Directory holding the saved-scrollback files. */
  snapshotsDir(): string;
  settings(): GmuxSettings;
}

// ---------------------------------------------------------------------------
// Tier 2 samples — lazy, on open only
// ---------------------------------------------------------------------------

/** Saved scrollback on disk. `readdir` + `stat`; 14 files measured at <2 ms. */
export async function readSavedFacts(dir: string): Promise<SavedScrollbackFacts> {
  const empty: SavedScrollbackFacts = { files: 0, bytes: 0, largestBytes: 0 };
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return empty; // no snapshots yet is not an error
  }
  const out = { ...empty };
  for (const name of names) {
    // Phase 19 item 3: a body is `<id>.txt.000003` and no body ends in `.txt`
    // any more, so the old suffix test would total zero. Counting every body
    // also makes the number honest, because the card now reports the whole
    // ring rather than one file per session. Staged `.part` writes, the
    // capsule records and anything else are left out.
    const kind = classifySnapshotFile(name).kind;
    if (kind !== 'body' && kind !== 'legacy') continue;
    try {
      const s = await stat(join(dir, name));
      if (!s.isFile()) continue;
      out.files += 1;
      out.bytes += s.size;
      out.largestBytes = Math.max(out.largestBytes, s.size);
    } catch {
      /* raced with a delete — it simply is not there */
    }
  }
  return out;
}

/** Free bytes on the volume holding userData. `statfs`, sub-millisecond. */
export async function readFreeDiskBytes(dir: string): Promise<number> {
  try {
    const fs = await statfs(dir);
    return fs.bsize * fs.bavail;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// The three on-demand reads
// ---------------------------------------------------------------------------

/**
 * Everything the Settings card shows: one `list-panes`, one directory stat,
 * one `statfs`. Nothing here runs while Settings is closed.
 */
export async function readScrollbackStats(
  deps: ScrollbackServiceDeps
): Promise<ScrollbackStats> {
  let rows: PaneRow[] = [];
  try {
    rows = parseStatsLines(await deps.run(['list-panes', '-a', '-F', STATS_FORMAT]));
  } catch {
    // No server, or it just went away. An empty fleet is the honest answer.
  }
  // Only sessions gmux owns — a foreign session on the private socket is not
  // the user's scrollback bill.
  const ours = rows.filter((r) => deps.nameOf(r.tmuxId) !== null);

  let lines = 0;
  let bytes = 0;
  let deepest: ScrollbackStats['deepest'] = null;
  for (const r of ours) {
    lines += r.lines;
    bytes += r.bytes;
    if (deepest === null || r.lines > deepest.lines) {
      deepest = {
        name: deps.nameOf(r.tmuxId) ?? '',
        lines: r.lines,
        limit: r.limit
      };
    }
  }

  const dir = deps.snapshotsDir();
  const [saved, diskFreeBytes] = await Promise.all([
    readSavedFacts(dir),
    readFreeDiskBytes(app.getPath('userData'))
  ]);

  return {
    sessions: ours.length,
    lines,
    bytes,
    perLine: bytesPerLine(ours),
    deepest,
    saved,
    diskFreeBytes
  };
}

/** What ONE session is holding. Read only when its menu is opened. */
export async function readSessionScrollback(
  deps: ScrollbackServiceDeps,
  sessionId: string
): Promise<SessionScrollbackFacts | null> {
  const target = deps.tmuxIdOf(sessionId);
  if (target === null) return null;
  let out: string;
  try {
    out = await deps.run(['display-message', '-p', '-t', target, '-F', SESSION_FORMAT]);
  } catch {
    return null;
  }
  const line = out.split('\n').find((l) => l.length > 0);
  if (line === undefined) return null;
  const f = line.split('\t');
  return {
    sessionId,
    lines: num(f[0]),
    limit: num(f[1]),
    bytes: num(f[2])
  };
}

// ---------------------------------------------------------------------------
// Copy details — the bug-report escape hatch, and the only home RSS gets
// ---------------------------------------------------------------------------

function mb(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Resident memory of the private tmux server, for the report only. */
async function tmuxServerRssBytes(
  run: ScrollbackServiceDeps['run']
): Promise<number | null> {
  try {
    const pid = Number((await run(['display-message', '-p', '#{pid}'])).trim());
    if (!Number.isFinite(pid) || pid <= 0) return null;
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const { stdout } = await promisify(execFile)('/bin/ps', [
      '-o',
      'rss=',
      '-p',
      String(pid)
    ]);
    const kb = Number(stdout.trim());
    return Number.isFinite(kb) ? kb * 1024 : null;
  } catch {
    return null;
  }
}

/** Long argv would wrap the report into unreadability; the head identifies. */
function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * One line per gmux-owned process. Pure, so the shape is testable without a
 * `ps` or a tmux server.
 *
 * The header earns its words: these rows come from OWNERSHIP (gmux's pid
 * tree, the private server, and what descends from a session in it), not from
 * matching a process name — because Phase 12.7 launches agents by BARE NAME
 * on purpose, and a `claude` in Activity Monitor tells you nothing about
 * whose it is. That is exactly the readability this list gives back.
 */
export function formatOwnedProcessLines(rows: readonly GmuxProcess[]): string[] {
  if (rows.length === 0) return [];
  const out: string[] = [
    `processes: ${rows.length} owned by Tortie — by OWNERSHIP, not by name ` +
      `(agents launch bare, so their command line never says Tortie)`
  ];
  for (const r of rows) {
    const where =
      r.sessionName !== undefined && r.sessionName.length > 0
        ? ` [${r.sessionName}]`
        : '';
    out.push(
      `  ${String(r.pid).padStart(7)} ${r.role.padEnd(15)}` +
        `${mb(r.rssBytes).padStart(9)} ${r.cpuPercent.toFixed(1).padStart(5)}%` +
        `${where}  ${clip(r.command, 120)}`
    );
  }
  return out;
}

/**
 * A plain-text block for a bug report. This is where the numbers cut from
 * every visible surface still live — with the caveat attached, because a
 * figure that overstates reality by 23× must never travel unlabelled.
 *
 * It is also the "supported way to see gmux-owned pids" that Phase 13.8
 * item 2 asks 13.7's diagnostics surface to provide (the compensation for
 * 12.7's bare-name launch). The process list belongs HERE rather than on a
 * visible surface for the same reason RSS does: it answers a bug report, not
 * a question the user has while choosing a scrollback depth.
 */
export async function buildScrollbackReport(
  deps: ScrollbackServiceDeps
): Promise<string> {
  const stats = await readScrollbackStats(deps);
  const settings = deps.settings();
  const rss = await tmuxServerRssBytes(deps.run);

  const lines: string[] = [];
  lines.push(`Tortie scrollback report — ${new Date().toISOString()}`);
  lines.push(
    `settings: depth ${settings.scrollbackLines.toLocaleString()} lines · ` +
      `saved ${settings.savedScrollbackLines.toLocaleString()} lines`
  );
  lines.push(
    `sessions: ${stats.sessions} · scrollback held ${mb(stats.bytes)} · ` +
      `${stats.lines.toLocaleString()} lines · ` +
      `~${Math.round(stats.perLine.bytes)} bytes/line` +
      (stats.perLine.estimated ? ' (assumed — no session deep enough yet)' : '')
  );
  if (stats.deepest !== null && stats.deepest.lines > 0) {
    const pct =
      stats.deepest.limit > 0
        ? ` (${Math.round((stats.deepest.lines / stats.deepest.limit) * 100)}% of its depth)`
        : '';
    lines.push(
      `deepest:  "${stats.deepest.name}" ${stats.deepest.lines.toLocaleString()} lines${pct}`
    );
  }
  lines.push(
    `saved:    ${stats.saved.files} files, ${mb(stats.saved.bytes)} ` +
      `(largest ${mb(stats.saved.largestBytes)})`
  );
  lines.push(`disk:     ${mb(stats.diskFreeBytes)} free`);
  if (rss !== null) {
    lines.push(
      `tmux server rss ${mb(rss)} (high-water mark, not current usage — ` +
        `it overstated held scrollback by 23x when measured)`
    );
  }
  for (const m of app.getAppMetrics()) {
    if (m.type !== 'Browser' && m.type !== 'Tab') continue;
    lines.push(
      `Tortie ${m.type === 'Browser' ? 'main' : 'renderer'} rss ` +
        `${mb((m.memory?.workingSetSize ?? 0) * 1024)}`
    );
  }

  // Phase 19 item 12. Every line above this one describes copies of the user's
  // work that live on THIS machine. The obvious next question is whether
  // anything else holds one, and Tortie must answer it by checking rather than
  // by assuming. It is here rather than on a visible surface for the same
  // reason RSS is: it answers a bug report, not a question somebody has while
  // choosing a scrollback depth. Lazy for the same reason as the process list,
  // and it cannot claim protection it did not observe.
  try {
    const { readOffDeviceProtection, offDeviceReportLines } = await import(
      '../diagnostics/off-device'
    );
    lines.push(...offDeviceReportLines(await readOffDeviceProtection()));
  } catch {
    // The check refused. Saying nothing is the honest outcome, because the
    // one thing that must never appear here is an unearned reassurance.
  }

  // Imported lazily for the same reason `ps` is: nothing about the process
  // tree should be loaded, let alone read, until a human asks for details.
  try {
    const { listGmuxProcesses } = await import('../diagnostics/owned-processes');
    lines.push(...formatOwnedProcessLines(await listGmuxProcesses()));
  } catch {
    // `ps` refused, or tmux went away mid-read. Every line above still holds.
  }

  return `${lines.join('\n')}\n`;
}
