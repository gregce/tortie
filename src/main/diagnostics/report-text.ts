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
  DiagnosticsCachePolicy,
  DiagnosticsDisk,
  DiagnosticsGlanceColumn,
  DiagnosticsMemory,
  DiagnosticsReport,
  DiagnosticsSessionWorkload,
  DiagnosticsShellProcess
} from '@shared/ipc';
import { CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES } from '../cache/policy';
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

/**
 * PHASE 188. Whose work a session row is, on the line a person pastes into an
 * issue. The face shows the project name and the path on hover; the text has
 * no hover, so it carries both, and the path arrived already folded to `~`.
 */
function projectText(s: DiagnosticsSessionWorkload): string {
  if (s.projectName === null) return 'project unknown';
  if (s.projectPath === null) return oneLine(s.projectName);
  return `${oneLine(s.projectName)} (${oneLine(s.projectPath)})`;
}

/**
 * PHASE 197 ITEM 18, a Phase 188 known limit. A session name and a project
 * name are the person's own strings, and a newline in either split the row a
 * person pastes into an issue across two lines, so the second half read as a
 * row with no name. Every line break folds to one space; nothing else moves.
 */
function oneLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ');
}

/**
 * PHASE 188.1. The largest instant a `Date` can hold, and its negative is the
 * smallest. Past either end `toISOString` throws a `RangeError` instead of
 * answering. The number is ECMA-262's own, not a guess.
 */
const MAX_TIME_MS = 8.64e15;

/**
 * PHASE 188. The face draws these two as an age, because an age is what a
 * person reads at a glance while the numbers are moving. The pasted text is
 * read later and somewhere else, so it carries the instant itself, in the same
 * ISO form as the report's own `generatedAt` line above.
 *
 * PHASE 188.1. A value that cannot be a time is not drawn as one. It answers
 * `unknown`, which is the same word null already takes, so a row a person
 * cannot align with the others never appears.
 *
 * WHY THE GUARD IS HERE AND NOT IN THE ROW READER. `readSessionFacts` in
 * ./report.ts has no other consumer that builds a `Date`, and the one place
 * elsewhere in the tree that does (src/main/overview/git-mark.ts, reached from
 * ../overview/service.ts) does not read through it, so guarding the reader
 * would protect neither. The only reader that would cover both is
 * `rowToRecord` in ../manifest/codecs.ts, and a check there makes `createdAt`
 * and `lastSeen` nullable across the shared Session projection, restore,
 * reconstruct and every renderer that sorts on them. That is a breaking change
 * to carry a one clause fix.
 *
 * IT IS NOT A CLAMP AND IT IS NOT A REPAIR. Nothing is guessed, and nothing is
 * written back: the manifest is read and rendered honestly. A `lastSeen` in the
 * future is a legal instant and still renders as itself.
 *
 * `Number.isFinite` is the type check as well as the range check, because it
 * answers false for anything that is not a number. The column is declared
 * `INTEGER NOT NULL` (../manifest/schema.ts) and SQLite still hands back the
 * text a hand edit put there, so the declared `number` is a promise the file
 * cannot keep.
 *
 * THE TWO TERMS CANNOT BE REORDERED (Phase 188.1's verifier, written down by
 * Phase 197 item 23). `Math.abs` of a BigInt throws a TypeError, and the
 * driver can hand one back for an INTEGER column too wide for a double, so
 * `Number.isFinite` must stay first: it answers false for a BigInt and the
 * `&&` never reaches the call that would throw.
 */
function stampText(label: string, epochMs: number | null): string {
  const renderable =
    epochMs !== null &&
    Number.isFinite(epochMs) &&
    Math.abs(epochMs) <= MAX_TIME_MS;
  return `${label} ${renderable ? new Date(epochMs).toISOString() : 'unknown'}`;
}

/**
 * Phase 166. The ceiling line. A number when this launch set one, otherwise
 * Chromium's own default, which is 1,280 MiB on a volume with room and lower
 * when the volume has under about 32 GB free, so it is stated as an upper
 * bound rather than a figure.
 */
function cacheCeilingText(d: DiagnosticsDisk): string {
  if (d.httpCacheCeilingBytes !== null) {
    return `${mb(d.httpCacheCeilingBytes)} (${d.cachePolicy.mode})`;
  }
  return `Chromium default, up to ${mb(CHROMIUM_DEFAULT_HTTP_CACHE_CEILING_BYTES)} (${d.cachePolicy.mode})`;
}

/**
 * Phase 166. What the http cache can hold in this shape, measured in the
 * Phase 166 attribution over thirty launches and five document opens: in the
 * shipped shape nothing Tortie serves is stored, and only the dev shape writes.
 */
function cacheHoldsText(mode: DiagnosticsCachePolicy['mode']): string {
  return mode === 'dev-ceiling'
    ? 'dev server modules and hot updates only'
    : 'nothing Tortie serves; file:, gmux-asset: and gmux-preview: resources bypass it';
}

/** The report without its own `text`, which this function produces. */
export type DiagnosticsReportBody = Omit<DiagnosticsReport, 'text'>;

export function buildDiagnosticsReportText(
  r: DiagnosticsReportBody,
  homeDir: string
): string {
  // Phase 168: the summary before the detail. The Together line is the one
  // place the two totals are added, and it says what it sums. The machine
  // line carries the rank and NEVER an app name: the names are on the face
  // alone, so a pasted report never describes the rest of the machine.
  const glanceLine = (label: string, c: DiagnosticsGlanceColumn): string =>
    `${label}  ${c.processCount} processes, private ${mb(c.privateBytes)}, rss ${mb(c.rssBytes)}, ${
      c.cpuPercent === null ? 'cpu not read' : `cpu ${c.cpuPercent.toFixed(1)}% sampled`
    }`;
  const g = r.glance;
  const lines: string[] = [
    `Tortie ${r.appVersion} diagnostics, generated ${r.generatedAt}`,
    `sampling window ${r.windowMs} ms`,
    '',
    '[At a glance]',
    glanceLine('Tortie itself', g.tortie),
    glanceLine('Your agents', g.agents),
    glanceLine('Together, Tortie plus your agents', g.together),
    g.energyImpact === null
      ? 'energy impact unavailable'
      : `energy impact ${g.energyImpact.toFixed(1)}, the power score top reports, not watts`,
    ...(r.machine === null
      ? []
      : [
          `machine rank ${r.machine.rank} of ${r.machine.appCount} apps by resident memory, app names stay in the app and are not copied`
        ]),
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
      `${oneLine(s.name)}  ${projectText(s)}  ${s.agent}  ${s.processCount} processes  ${memText(s.memory)}  ${cpuText(s.cpuPercent, 'lifetime')}  ${stampText('started', s.createdAt)}  ${stampText('last seen', s.lastSeen)}`
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
    `durable data ${mb(d.durableBytes)}`,
    // Phase 166. Three facts beside the sizes: the ceiling in force, what the
    // http cache can hold in this shape, and the policy's own sentence. The
    // sentence is the policy module's, so the log and the report say one thing.
    `http cache ceiling ${cacheCeilingText(d)}`,
    `http cache holds ${cacheHoldsText(d.cachePolicy.mode)}`,
    `cache policy ${d.cachePolicy.mode}: ${d.cachePolicy.reason}`
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
