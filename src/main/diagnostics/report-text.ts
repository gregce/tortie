/**
 * The plain text of a diagnostics report (Phase 163), one fact per line, in
 * the style of src/main/log/diagnostics.ts. This is what the Copy button
 * carries, so it is built once here and the JSON report carries it.
 *
 * Every line passes through `redactString`, which folds the home directory
 * to `~`. The report shapes already carry no command line and no environment
 * value, so the redaction here is the second fence rather than the first.
 *
 * Pure over its input, so the unit test reads the exact text and the
 * verifier's secret scan runs over the same bytes a person would copy.
 */

import type {
  DiagnosticsMemory,
  DiagnosticsReport,
  DiagnosticsShellProcess
} from '@shared/ipc';
import { redactString } from '../log/redact';

function mb(bytes: number | null): string {
  if (bytes === null) return 'unknown';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function memText(m: DiagnosticsMemory): string {
  const priv =
    m.privateBytes === null
      ? 'private unknown'
      : `private ${mb(m.privateBytes)} (${m.privateSource})`;
  return `${priv}, rss ${mb(m.rssBytes)}`;
}

function cpuText(percent: number, source: 'sampled' | 'lifetime'): string {
  return `cpu ${percent.toFixed(1)}% ${source}`;
}

/** The report without its own `text`, which this function produces. */
export type DiagnosticsReportBody = Omit<DiagnosticsReport, 'text'>;

export function buildDiagnosticsReportText(
  r: DiagnosticsReportBody,
  homeDir: string
): string {
  const lines: string[] = [
    `Tortie ${r.appVersion} diagnostics, generated ${r.generatedAt}`,
    `sampling window ${r.windowMs} ms`,
    '',
    '[Tortie]',
    `${r.shellTotal.processCount} processes, private ${mb(r.shellTotal.privateBytes)}, rss ${mb(r.shellTotal.rssBytes)}`
  ];
  const shellLine = (p: DiagnosticsShellProcess): string => {
    const detail = p.detail !== undefined ? ` (${p.detail})` : '';
    return `${p.name}${detail}  pid ${p.pid}  ${memText(p.memory)}  ${cpuText(p.cpuPercent, p.cpuSource)}`;
  };
  for (const p of r.shell) if (p.kind !== 'orphan') lines.push(shellLine(p));
  // Strays an earlier launch left running: listed so they can be seen, under
  // their own heading and their own total, never inside the one above.
  if (r.leftoverTotal.processCount > 0) {
    lines.push(
      '',
      '[Left over from earlier launches, not counted above]',
      `${r.leftoverTotal.processCount} processes, private ${mb(r.leftoverTotal.privateBytes)}, rss ${mb(r.leftoverTotal.rssBytes)}`
    );
    for (const p of r.shell) if (p.kind === 'orphan') lines.push(shellLine(p));
  }
  lines.push(
    '',
    '[Your sessions]',
    r.sessions.length === 0
      ? 'none running on this Mac'
      : `${r.sessions.length} sessions, ${r.sessionsTotal.processCount} processes, private ${mb(r.sessionsTotal.privateBytes)}, rss ${mb(r.sessionsTotal.rssBytes)}`
  );
  for (const s of r.sessions) {
    lines.push(
      `${s.name}  ${s.agent}  ${s.processCount} processes  ${memText(s.memory)}  ${cpuText(s.cpuPercent, 'lifetime')}`
    );
  }

  lines.push(
    '',
    '[main]',
    `private ${mb(r.main.privateBytes)}, shared ${mb(r.main.sharedBytes)}`,
    `heap used ${mb(r.main.heapUsedBytes)} of ${mb(r.main.heapTotalBytes)}, limit ${mb(r.main.heapLimitBytes)}, malloced ${mb(r.main.mallocedBytes)}`,
    '',
    '[renderer]'
  );
  const rm = r.renderer.memory;
  if (rm === null) {
    lines.push('memory not reported');
  } else {
    lines.push(
      `private ${mb(rm.privateBytes)}, shared ${mb(rm.sharedBytes)}`,
      `heap used ${mb(rm.heapUsedBytes)} of ${mb(rm.heapTotalBytes)}, limit ${mb(rm.heapLimitBytes)}, malloced ${mb(rm.mallocedBytes)}`,
      `blink allocated ${mb(rm.blinkAllocatedBytes)} of ${mb(rm.blinkTotalBytes)}`
    );
  }
  const lt = r.renderer.longTasks;
  lines.push(
    lt === null
      ? 'long tasks not reported'
      : `long tasks ${lt.count}, total ${lt.totalMs.toFixed(0)} ms, longest ${lt.maxMs.toFixed(0)} ms${lt.buffered ? ', including before the capture' : ', during the capture'}`
  );

  const c = r.counts;
  lines.push(
    '',
    '[live]',
    `sessions ${c.sessions} (${c.localSessions} here, ${c.remoteSessions} on machines)`,
    `terminal surfaces mounted ${c.mountedSurfaces === null ? 'not reported' : c.mountedSurfaces}`,
    `windows ${c.windows}`,
    `watched repositories ${c.watchers}, watcher closes pending ${c.pendingWatcherCloses}`,
    `machine feeds ${c.remoteFeeds}`,
    `open: ${c.listeners.length === 0 ? 'nothing' : c.listeners.join(', ')}`,
    `ipc over ${r.ipc.windowMs} ms: ${r.ipc.invokes} requests, ${r.ipc.events} pushes`
  );

  lines.push('', '[watchers]');
  if (r.watchers.length === 0) lines.push('none');
  for (const w of r.watchers) {
    lines.push(
      `${w.repo}  drops ${w.drops}, re-reads scheduled ${w.rescansScheduled}, completed ${w.rescansCompleted}`
    );
  }

  const d = r.disk;
  lines.push(
    '',
    '[disk]',
    `profile ${d.profilePath}, ${mb(d.profileBytes)} total, ${mb(d.freeBytes)} free on the volume`,
    `http cache ${mb(d.httpCacheBytes)}`,
    `code cache ${mb(d.codeCacheBytes)}`,
    `durable data ${mb(d.durableBytes)}`
  );

  lines.push('', '[milestones, ms after launch]');
  if (r.milestones.length === 0) lines.push('none recorded');
  for (const m of r.milestones) lines.push(`${m.name}  ${m.atMs.toFixed(0)}`);

  lines.push('', '[electron processes]');
  for (const e of r.electronPids) {
    lines.push(`pid ${e.pid}  ${e.type}  ${e.named ? 'named' : 'NOT NAMED'}`);
  }
  lines.push('');

  return lines.map((line) => redactString(line, homeDir)).join('\n');
}
