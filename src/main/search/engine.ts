/**
 * The ⌘⇧F engine: spawn ripgrep, parse its NDJSON on the MAIN thread, and
 * stream rows to the window that asked. Spec: docs/research/19-search.md §2.4.
 *
 * WHY THERE IS NO WORKER HERE. It looks wrong to JSON.parse hundreds of MB on
 * the main thread of an Electron app, so it was measured (research §3.1, 4 ms
 * sampling, 16.7 ms = one frame): with the 20,000-match cap the whole parse
 * costs p95 5.7 ms of event-loop lag and drops ZERO frames. Uncapped it drops
 * 9. The cap is the performance mechanism; a worker would only add an IPC hop
 * and a second copy of every 4 MB payload. So: no utilityProcess, no worker,
 * and the cap is not negotiable.
 *
 * WHAT MAKES CANCELLATION HONEST — four mechanisms, because one is not enough:
 *
 *  1. **SIGKILL, never SIGTERM.** Measured: SIGTERM kills in 2.6 ms and then
 *     lets 7,978 bytes of already-buffered pipe data land; SIGKILL kills in
 *     2.5 ms and lets zero. ripgrep holds no locks and writes nothing, so
 *     SIGKILL is safe.
 *  2. **The run is unregistered before the kill,** so any event that arrives
 *     from the dying child in the same tick is dropped rather than merged.
 *  3. **One live search per window.** Starting a search cancels the previous
 *     one for that window. A slow query cannot paint over a newer one's
 *     results even if the caller's debounce misbehaves — and the debounce
 *     itself can live here (`debounceMs`), where a superseded query is killed
 *     before a process ever exists.
 *  4. **Per-search channels.** A frame is addressed to searchResultsChannel
 *     (id), so a late frame from a superseded query cannot even be delivered
 *     to a listener for the new one.
 *
 * Everything the renderer receives is finished work: line clamped, offsets
 * converted to UTF-16, indentation trimmed. Nothing is left for the paint.
 */

import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import type {
  ContentSearchInput,
  SearchFileResult,
  SearchMatch,
  SearchProgress
} from '@shared/ipc';
import { buildContentSearchArgs, searchLimits } from './args';
import { LineSplitter, buildMatch, parseRgLine, relPathOf } from './parser';
import { rgBinaryPath } from './resolve';

/** stdin is 'ignore' — ripgrep is given a pattern, never fed one. */
type RgChild = ChildProcessByStdio<null, Readable, Readable>;

/** Where a search's frames go. One per window; the engine never imports it. */
export interface SearchSink {
  /** Stable identity of the destination — the "one live search per" key. */
  readonly key: string;
  /** False once the window is gone; the run is torn down on the next event. */
  alive(): boolean;
  send(searchId: string, progress: SearchProgress): void;
}

/** Flush cadence — one frame at 60 Hz. */
const FLUSH_MS = 16;
/** …unless this many matches pile up first, then flush immediately. */
const FLUSH_MATCHES = 200;
/**
 * Grace before the FIRST frame when the caller let main mint the search id:
 * they cannot subscribe until `search:start` resolves. Callers that mint
 * their own id subscribe first and get the first frame as soon as it exists.
 */
const LATE_SUBSCRIBER_GRACE_MS = 32;

interface FileBucket {
  relPath: string;
  matches: SearchMatch[];
  /** Matches found for this file since the last flush (clipped ones too). */
  found: number;
  clipped: boolean;
  binary: boolean;
}

interface Run {
  id: string;
  sink: SearchSink;
  child: RgChild | null;
  spawnTimer: NodeJS.Timeout | null;
  flushTimer: NodeJS.Timeout | null;
  splitter: LineSplitter;
  limits: ReturnType<typeof searchLimits>;
  eager: boolean;
  /** Per-file kept counts for the WHOLE search (the per-file cap). */
  keptPerFile: Map<string, number>;
  /** Files seen with at least one match, for totalFiles. */
  seenFiles: Set<string>;
  pending: Map<string, FileBucket>;
  pendingMatches: number;
  seq: number;
  totalMatches: number;
  capped: boolean;
  finished: boolean;
  firstFlushDone: boolean;
  startedAt: number;
  ttfrMs: number | null;
  ttfrReported: boolean;
  stderr: string[];
  stderrBytes: number;
}

const MAX_STDERR = 64 * 1024;

export class ContentSearchEngine {
  private readonly runs = new Map<string, Run>();

  /**
   * Begin a search. Returns as soon as the child is spawned (or queued behind
   * `debounceMs`) — never waits for a result, because on a big repo the first
   * result arrives in ~3 ms and the last one can be 4 seconds later.
   */
  start(input: ContentSearchInput, sink: SearchSink, searchId: string): void {
    // (3) one live search per window — plus, defensively, per id: a reused
    // searchId would otherwise orphan a running child that `cancel()` could
    // no longer reach.
    const collision = this.runs.get(searchId);
    if (collision !== undefined) this.finish(collision, { cancelled: true });
    for (const run of [...this.runs.values()]) {
      if (run.sink.key === sink.key) this.finish(run, { cancelled: true });
    }

    const limits = searchLimits(input);
    const run: Run = {
      id: searchId,
      sink,
      child: null,
      spawnTimer: null,
      flushTimer: null,
      splitter: new LineSplitter(),
      limits,
      eager: typeof input.searchId === 'string' && input.searchId.length > 0,
      keptPerFile: new Map(),
      seenFiles: new Set(),
      pending: new Map(),
      pendingMatches: 0,
      seq: 0,
      totalMatches: 0,
      capped: false,
      finished: false,
      firstFlushDone: false,
      startedAt: Date.now(),
      ttfrMs: null,
      ttfrReported: false,
      stderr: [],
      stderrBytes: 0
    };
    this.runs.set(searchId, run);

    // Fail fast and visibly on a bad query or a missing binary: the caller
    // has already been handed a searchId, so the failure belongs in the
    // stream rather than in a rejected invoke the UI may not be listening to.
    let args: string[];
    try {
      args = buildContentSearchArgs(input);
    } catch (err) {
      // Same grace as the first frame: a caller that let main mint the id has
      // not subscribed yet, and an error frame nobody hears is a hang.
      setTimeout(
        () => this.finish(run, { error: messageOf(err) }),
        run.eager ? 0 : LATE_SUBSCRIBER_GRACE_MS
      );
      return;
    }

    const delay = Math.max(0, Math.floor(input.debounceMs ?? 0));
    if (delay > 0) {
      run.spawnTimer = setTimeout(() => {
        run.spawnTimer = null;
        this.spawnFor(run, input.repoPath, args);
      }, delay);
    } else {
      this.spawnFor(run, input.repoPath, args);
    }
  }

  /** SIGKILL the child and close the stream as cancelled. Idempotent. */
  cancel(searchId: string): void {
    const run = this.runs.get(searchId);
    if (run !== undefined) this.finish(run, { cancelled: true });
  }

  /** Every search for one window (its BrowserWindow went away). */
  cancelForSink(key: string): void {
    for (const run of [...this.runs.values()]) {
      if (run.sink.key === key) this.finish(run, { cancelled: true });
    }
  }

  /** Quit-time teardown. */
  dispose(): void {
    for (const run of [...this.runs.values()]) {
      this.finish(run, { cancelled: true });
    }
  }

  // -------------------------------------------------------------------------

  private spawnFor(run: Run, repoPath: string, args: string[]): void {
    if (run.finished) return;

    let child: RgChild;
    try {
      child = spawn(rgBinaryPath(), args, {
        cwd: repoPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        // A user's RIPGREP_CONFIG_PATH is already neutralised by --no-config;
        // this stops a stray RIPGREP_* from reaching the child at all.
        env: { ...process.env, RIPGREP_CONFIG_PATH: '' }
      });
    } catch (err) {
      this.finish(run, { error: messageOf(err) });
      return;
    }

    run.child = child;
    run.startedAt = Date.now();

    child.stdout.on('data', (chunk: Buffer) => {
      if (run.finished) return;
      try {
        run.splitter.push(chunk, (line) => this.onLine(run, line));
      } catch (err) {
        this.finish(run, { error: messageOf(err) });
        return;
      }
      this.maybeFlush(run);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (run.stderrBytes >= MAX_STDERR) return;
      run.stderrBytes += chunk.byteLength;
      run.stderr.push(chunk.toString('utf8'));
    });

    child.on('error', (err: Error) => {
      this.finish(run, { error: spawnMessage(err) });
    });

    child.on('close', (code) => {
      if (run.finished) return;
      run.splitter.flush((line) => this.onLine(run, line));
      // Exit 1 means "no matches", which is an ANSWER, not a failure. Only a
      // code outside {0,1} WITH stderr text is something to show a user;
      // --no-messages keeps per-file read errors out of that channel.
      const text = run.stderr.join('').trim();
      const failed = code !== null && code !== 0 && code !== 1 && text !== '';
      this.finish(run, failed ? { error: friendlyRgError(text) } : {});
    });
  }

  private onLine(run: Run, line: string): void {
    // The cap can end the run mid-chunk; the splitter is still walking the
    // lines it already has. Everything after that belongs to a search that is
    // over.
    if (run.finished) return;
    const event = parseRgLine(line);
    if (event === null) return;

    if (event.type === 'match') {
      if (run.ttfrMs === null) run.ttfrMs = Date.now() - run.startedAt;
      this.onMatch(run, event.data);
      return;
    }

    if (event.type === 'end') {
      // A non-null binary_offset means ripgrep STOPPED at that byte: the rest
      // of the file was never searched. Saying so is the difference between a
      // result set and a lie.
      if (typeof event.data.binary_offset === 'number') {
        const rel = relPathOf(event.data.path);
        if (rel.length > 0 && run.seenFiles.has(rel)) {
          this.bucket(run, rel).binary = true;
        }
      }
    }
  }

  private onMatch(run: Run, data: Parameters<typeof buildMatch>[0]): void {
    const rel = relPathOf(data.path);
    if (rel.length === 0) return;

    const kept = run.keptPerFile.get(rel) ?? 0;
    const bucket = this.bucket(run, rel);
    bucket.found += 1;

    if (kept >= run.limits.maxPerFile) {
      // Over the per-file cap: count it (matchCount stays honest) but skip
      // the conversion work and the payload.
      bucket.clipped = true;
      return;
    }

    const match = buildMatch(data, run.limits.maxLineChars);
    if (match === null) return;

    bucket.matches.push(match);
    run.keptPerFile.set(rel, kept + 1);
    run.seenFiles.add(rel);
    run.pendingMatches += 1;
    run.totalMatches += 1;

    if (run.totalMatches >= run.limits.maxResults) {
      run.capped = true;
      this.finish(run, {});
    }
  }

  private bucket(run: Run, relPath: string): FileBucket {
    let bucket = run.pending.get(relPath);
    if (bucket === undefined) {
      bucket = { relPath, matches: [], found: 0, clipped: false, binary: false };
      run.pending.set(relPath, bucket);
    }
    return bucket;
  }

  private maybeFlush(run: Run): void {
    if (run.finished || run.pending.size === 0) return;
    if (run.pendingMatches >= FLUSH_MATCHES && run.firstFlushDone) {
      this.flush(run, false);
      return;
    }
    if (run.flushTimer !== null) return;
    const delay = run.firstFlushDone
      ? FLUSH_MS
      : run.eager
        ? 0
        : LATE_SUBSCRIBER_GRACE_MS;
    run.flushTimer = setTimeout(() => {
      run.flushTimer = null;
      this.flush(run, false);
    }, delay);
  }

  private flush(run: Run, done: boolean, extra: Partial<SearchProgress> = {}): void {
    if (run.flushTimer !== null) {
      clearTimeout(run.flushTimer);
      run.flushTimer = null;
    }
    if (!run.sink.alive()) {
      if (!done) this.finish(run, { cancelled: true });
      return;
    }
    if (run.pending.size === 0 && !done) return;

    const files: SearchFileResult[] = [];
    for (const bucket of run.pending.values()) {
      const file: SearchFileResult = {
        relPath: bucket.relPath,
        matchCount: bucket.found,
        matches: bucket.matches,
        clipped: bucket.clipped
      };
      if (bucket.binary) file.binary = true;
      files.push(file);
    }
    run.pending.clear();
    run.pendingMatches = 0;
    run.firstFlushDone = true;

    const progress: SearchProgress = {
      searchId: run.id,
      seq: run.seq++,
      files,
      totalMatches: run.totalMatches,
      totalFiles: run.seenFiles.size,
      done,
      capped: run.capped,
      ...extra
    };
    if (run.ttfrMs !== null && !run.ttfrReported) {
      progress.ttfrMs = run.ttfrMs;
      run.ttfrReported = true;
    }
    if (done) {
      progress.elapsedMs = Date.now() - run.startedAt;
      progress.maxFilesizeBytes = run.limits.maxFilesizeBytes;
    }
    run.sink.send(run.id, progress);
  }

  /**
   * Close a run exactly once: unregister FIRST (so a chunk arriving from the
   * dying child in this same tick finds no run to merge into), then SIGKILL,
   * then emit the last frame.
   */
  private finish(
    run: Run,
    outcome: { cancelled?: boolean; error?: string }
  ): void {
    if (run.finished) return;
    run.finished = true;
    this.runs.delete(run.id);

    if (run.spawnTimer !== null) {
      clearTimeout(run.spawnTimer);
      run.spawnTimer = null;
    }
    const child = run.child;
    run.child = null;
    if (child !== null && child.exitCode === null && child.signalCode === null) {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
    if (child !== null) {
      child.stdout.removeAllListeners('data');
      child.stderr.removeAllListeners('data');
    }

    // A cancelled run still gets one frame — the UI needs to know the
    // spinner is over and, crucially, that this result set is NOT the answer
    // to the question currently in the box.
    if (outcome.cancelled === true) run.pending.clear();
    const extra: Partial<SearchProgress> = {};
    if (outcome.cancelled === true) extra.cancelled = true;
    if (outcome.error !== undefined) extra.error = outcome.error;
    this.flush(run, true, extra);
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) {
    // Structured gmux errors carry JSON in `message`; show the friendly part.
    try {
      const payload = JSON.parse(err.message) as { message?: unknown };
      if (typeof payload.message === 'string') return payload.message;
    } catch {
      /* plain Error */
    }
    return err.message;
  }
  return String(err);
}

function spawnMessage(err: NodeJS.ErrnoException): string {
  if (err.code === 'ENOENT') {
    return 'Search is unavailable: the search engine could not be started.';
  }
  return `Could not start the search: ${err.message}`;
}

/**
 * ripgrep's own words, lightly framed. The user can act on "regex parse
 * error"; they cannot act on a stack trace, and they should never see one.
 */
function friendlyRgError(stderr: string): string {
  const first = stderr.split('\n').find((l) => l.trim().length > 0) ?? '';
  const text = first.replace(/^rg:\s*/, '').trim();
  if (/regex parse error|error parsing regex|unclosed|repetition/i.test(stderr)) {
    return `Invalid regular expression — ${text || 'ripgrep could not parse it'}`;
  }
  return text.length > 0 ? text : 'The search failed.';
}
