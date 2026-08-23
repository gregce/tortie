/**
 * The probe half of `npm run conformance:overview` (Phase 137).
 *
 * It runs a reader over the 14 fixtures in docs/research/assets/63-fixtures/
 * and over derived fixtures it builds at run time, and prints ONE JSON object
 * with the facts. The checker beside it, build/conformance-overview.mjs,
 * asserts the facts and prints the tables a person reads.
 *
 * IT SPAWNS NO AGENT. It opens no manifest, launches no Electron, starts no
 * tmux server, makes no request, and reads nothing under the person's home.
 * Every file it opens is a committed fixture or a scratch file it wrote under
 * out/conformance-overview/, and the scratch directory is removed at the end.
 *
 * TWO READER SOURCES, chosen by OVERVIEW_READER.
 *
 *   product    (default) imports src/main/overview/reader and, where present,
 *              src/main/overview/store. This is the mode the gate runs in.
 *   reference  loads the research 63 reader from
 *              docs/research/assets/63-keep-map/read.js. That reader still
 *              carries the seven defects section 19 of the research names, so
 *              the checker INVERTS the defect assertions in this mode. The
 *              mode exists to prove the gate's own fixtures bite, and it is
 *              how the gate was proved before the product reader landed.
 *
 * The product modules are imported through a computed path on purpose. The
 * repository typecheck does not cover build/*.mts (tsconfig.node.json includes
 * only electron.vite.config.ts), and a computed import keeps this file
 * loadable in reference mode on a tree where the product reader is absent.
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);

const FIXTURES = join(root, 'docs', 'research', 'assets', '63-fixtures');
const REFERENCE = join(root, 'docs', 'research', 'assets', '63-keep-map');
const SCRATCH = join(root, 'out', 'conformance-overview');

const mode: 'product' | 'reference' =
  process.env['OVERVIEW_READER'] === 'reference' ? 'reference' : 'product';

// Adapter temp files land in the scratch directory too. os.tmpdir() reads
// TMPDIR on every call, so this covers lib/fixtures.js as well.
process.env['TMPDIR'] = SCRATCH;

// ---------------------------------------------------------------------------
// The two readers behind one shape
// ---------------------------------------------------------------------------

interface NormalTurn {
  askText: string;
  askAt: string | null;
  answerText: string | null;
  answerAt: string | null;
  closed: boolean;
}

interface NormalRead {
  ok: boolean;
  error: string | null;
  turns: NormalTurn[];
  keptBytes: number;
  size: number;
  work: string;
  bytesRead: number;
  prefilter: string;
  turnMode: string;
  joinSessionId: string | null;
  joinCwd: string | null;
  joinFile: string | null;
  watermark: unknown;
  honest: string | null;
  droppedTotal: number | null;
  droppedReasons: Record<string, number> | null;
  /** Product only. Project relative path mentions per turn, flattened. */
  paths: string[] | null;
}

interface ReadJob {
  provider: string;
  file: string;
  sessionId: string | null;
  cwd: string;
  projectPath: string;
  watermark: unknown;
}

type ReadFn = (job: ReadJob) => NormalRead;

function keptOf(turns: NormalTurn[]): number {
  let n = 0;
  for (const t of turns) {
    n += Buffer.byteLength(t.askText, 'utf8');
    if (t.answerText !== null) n += Buffer.byteLength(t.answerText, 'utf8');
  }
  return n;
}

function sumDropped(dropped: Record<string, number> | undefined): number | null {
  if (dropped === undefined || dropped === null) return null;
  let n = 0;
  for (const v of Object.values(dropped)) n += v;
  return n;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function referenceReader(): { read: ReadFn; map: any } {
  const lib = req(join(REFERENCE, 'read.js'));
  const read: ReadFn = (job) => {
    let r: any;
    try {
      r = lib.readSession({
        provider: job.provider,
        file: job.file,
        sessionId: job.sessionId,
        watermark: job.watermark ?? null
      });
    } catch (err) {
      return emptyRead(String((err as Error).message));
    }
    const turns: NormalTurn[] = (r.turns ?? []).map((t: any) => ({
      askText: String(t.ask.text),
      askAt: t.ask.at ?? null,
      answerText: t.answer ? String(t.answer.text) : null,
      answerAt: t.answer ? (t.answer.at ?? null) : null,
      closed: t.closed !== false
    }));
    return {
      ok: true,
      error: null,
      turns,
      keptBytes: keptOf(turns),
      size: r.acct ? Number(r.acct.size ?? 0) : 0,
      work: String(r.work ?? 'full'),
      bytesRead: r.acct ? Number(r.acct.bytesRead ?? 0) : 0,
      prefilter: '-',
      turnMode: '-',
      joinSessionId: r.join ? (r.join.sessionId ?? null) : null,
      joinCwd: r.join ? (r.join.cwd ?? null) : null,
      joinFile: r.join ? (r.join.file ?? null) : null,
      watermark: r.watermark ?? null,
      honest: r.honest ?? null,
      droppedTotal: sumDropped(r.stats?.dropped),
      droppedReasons: r.stats?.dropped ?? null,
      paths: null
    };
  };
  return { read, map: lib.MAP };
}

async function productReader(): Promise<{ read: ReadFn; map: any; mod: any }> {
  const entry = join(root, 'src', 'main', 'overview', 'reader', 'index.ts');
  if (!existsSync(entry)) {
    throw new Error(
      'product mode needs src/main/overview/reader/index.ts and it is not in the tree. ' +
        'Run the gate with --reference while the reader is being built.'
    );
  }
  const mod: any = await import(pathToFileURL(entry).href);
  const read: ReadFn = (job) => {
    let r: any;
    try {
      r = mod.readSessionLog({
        provider: job.provider,
        file: job.file,
        sessionId: job.sessionId,
        cwd: job.cwd,
        projectPath: job.projectPath,
        watermark: job.watermark ?? null
      });
    } catch (err) {
      return emptyRead(String((err as Error).message));
    }
    const turns: NormalTurn[] = (r.turns ?? []).map((t: any) => ({
      askText: String(t.ask.text),
      askAt: t.ask.at ?? null,
      answerText: t.answer ? String(t.answer.text) : null,
      answerAt: t.answer ? (t.answer.at ?? null) : null,
      closed: t.closed !== false
    }));
    const paths: string[] = [];
    for (const t of r.turns ?? []) {
      for (const p of t.paths ?? []) paths.push(String(p.path));
    }
    return {
      ok: true,
      error: null,
      turns,
      keptBytes: keptOf(turns),
      size: r.acct ? Number(r.acct.size ?? 0) : 0,
      work: String(r.work ?? 'full'),
      bytesRead: r.acct ? Number(r.acct.bytesRead ?? 0) : 0,
      prefilter: r.acct ? String(r.acct.prefilter ?? '-') : '-',
      turnMode: r.acct ? String(r.acct.turnMode ?? '-') : '-',
      joinSessionId: r.join ? (r.join.sessionId ?? null) : null,
      joinCwd: r.join ? (r.join.cwd ?? null) : null,
      joinFile: null,
      watermark: r.watermark ?? null,
      honest: r.honest ?? null,
      droppedTotal: sumDropped(r.stats?.dropped ?? r.acct?.dropped),
      droppedReasons: r.stats?.dropped ?? r.acct?.dropped ?? null,
      paths
    };
  };
  return { read, map: mod.KEEP_MAP, mod };
}

function emptyRead(error: string): NormalRead {
  return {
    ok: false,
    error,
    turns: [],
    keptBytes: 0,
    size: 0,
    work: 'failed',
    bytesRead: 0,
    prefilter: '-',
    turnMode: '-',
    joinSessionId: null,
    joinCwd: null,
    joinFile: null,
    watermark: null,
    honest: null,
    droppedTotal: null,
    droppedReasons: null,
    paths: null
  };
}

// ---------------------------------------------------------------------------
// Derived fixtures. Each one exists to make a named defect bite.
// ---------------------------------------------------------------------------

const PAD = 'x'.repeat(700);

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      out[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

/**
 * Defect 1. claude cli 2.1.178 sorts its keys, so the deciding byte strings
 * land past the prefilter head. The pads model the long content that sits
 * ahead of the role in a real sorted file. A thinking part is ignored by the
 * answer extraction and an unknown top level key is ignored everywhere, so
 * the turns must come out identical.
 */
function buildClaudeSorted(out: string): void {
  const lines = readFileSync(join(FIXTURES, 'claude-session.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const rebuilt = lines.map((line) => {
    const rec = JSON.parse(line) as any;
    if (rec.type === 'assistant' && rec.message && Array.isArray(rec.message.content)) {
      rec.message.content.unshift({ type: 'thinking', thinking: PAD });
    }
    if (rec.type === 'user') {
      rec.attachmentsPad = PAD;
    }
    return JSON.stringify(sortKeysDeep(rec));
  });
  writeFileSync(out, rebuilt.join('\n') + '\n', 'utf8');
}

/**
 * Defect 2 plus the two lab bugs. The inserted records are the three false
 * ask shapes the widened rules must drop, a task notification in both of its
 * shapes, and a compaction handover. The first genuine ask also gains a
 * teamName field, because a rule keyed on teamName would drop a real ask.
 */
function buildClaudeTraps(out: string): void {
  const lines = readFileSync(join(FIXTURES, 'claude-session.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const base = {
    isSidechain: false,
    sessionId: '11111111-2222-4333-8444-555555555555',
    cwd: '/Users/dev/demo-app',
    userType: 'external',
    entrypoint: 'cli'
  };
  const trap = (uuid: string, text: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      ...base,
      type: 'user',
      uuid,
      timestamp: '2026-08-20T09:05:00.000Z',
      message: { role: 'user', content: text },
      origin: { kind: 'human' },
      ...extra
    });
  const clusterA = [
    trap('trap-tn-1', '<task-notification>\n<task-id>zz1</task-id>\nThe background task finished.\n</task-notification>'),
    trap('trap-tn-2', 'A task you started has an update.', { origin: { kind: 'task-notification' } }),
    trap(
      'trap-compact',
      'This session is being continued from a previous conversation about the release script. Summary follows.',
      { isCompactSummary: true }
    )
  ];
  const clusterB = [
    trap('trap-int', '[Request interrupted by user for tool use]'),
    trap('trap-peer', '<teammate-message teamName="blue">please review the plan when you can</teammate-message>'),
    trap('trap-bash', '<bash-notification>background build finished</bash-notification>')
  ];
  const outLines: string[] = [];
  let firstAskSeen = false;
  for (const line of lines) {
    const rec = JSON.parse(line) as any;
    if (!firstAskSeen && rec.type === 'user' && rec.promptSource === 'typed') {
      firstAskSeen = true;
      rec.teamName = 'blue-team';
      outLines.push(JSON.stringify(rec));
      outLines.push(...clusterA);
      continue;
    }
    outLines.push(line);
  }
  outLines.push(...clusterB);
  writeFileSync(out, outLines.join('\n') + '\n', 'utf8');
}

/**
 * Defect 3. codex cli 0.139.0 writes payload first. The pad inside the
 * payload models the long content that sits ahead of the deciding strings.
 */
function buildCodexReordered(src: string, out: string): void {
  const lines = readFileSync(src, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const rebuilt = lines.map((line) => {
    const rec = JSON.parse(line) as any;
    if (rec.payload === undefined || rec.payload === null) return line;
    const front: Record<string, unknown> = {
      payload: { _pad: PAD, ...rec.payload }
    };
    for (const k of Object.keys(rec)) {
      if (k !== 'payload') front[k] = rec[k];
    }
    return JSON.stringify(front);
  });
  writeFileSync(out, rebuilt.join('\n') + '\n', 'utf8');
}

/** Defect 4. codex 0.87 writes no task_started and no task_complete. */
function buildCodexNoMarkers(src: string, out: string): void {
  const lines = readFileSync(src, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const rebuilt: string[] = [];
  for (const line of lines) {
    const rec = JSON.parse(line) as any;
    const pt = rec.payload?.type;
    if (pt === 'task_started' || pt === 'task_complete') continue;
    if (rec.type === 'session_meta' && rec.payload) {
      rec.payload.cli_version = '0.87.0';
      rebuilt.push(JSON.stringify(rec));
      continue;
    }
    rebuilt.push(line);
  }
  writeFileSync(out, rebuilt.join('\n') + '\n', 'utf8');
}

/**
 * Defect 5. The unwrap must not be gated on one heading, and a wrapper that
 * has no request marker is an attachment manifest and is dropped whole.
 */
function buildCodexInApp(src: string, out: string): void {
  const lines = readFileSync(src, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const wrapped = JSON.stringify({
    timestamp: '2026-08-19T14:20:00.000Z',
    ordinal: 90,
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message:
        '# In app browser:\n\nhttps://example.invalid/flags\n\n## My request for Codex:\nWhat does this page say the flag does?'
    }
  });
  const manifestOnly = JSON.stringify({
    timestamp: '2026-08-19T14:20:01.000Z',
    ordinal: 91,
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message:
        '# Files mentioned by the user:\n\n## Pasted a.txt: /Users/example/.codex/attachments/bbbb/a.txt\n'
    }
  });
  lines.push(wrapped, manifestOnly);
  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
}

/**
 * Defect 6. Every assistant blob is rebuilt so the word "assistant" with its
 * quotes closes at byte 30. A 24 byte probe cannot see it. A 32 byte probe
 * can.
 */
function buildCursorOffset(out: string): { markerEnd: number } {
  const d = JSON.parse(readFileSync(join(FIXTURES, 'cursor-store.json'), 'utf8')) as any;
  let markerEnd = 0;
  for (const [id, body] of Object.entries(d.blobs as Record<string, unknown>)) {
    const s = typeof body === 'string' ? body : JSON.stringify(body);
    let rec: any;
    try {
      rec = JSON.parse(s);
    } catch {
      continue;
    }
    if (rec === null || typeof rec !== 'object' || rec.role !== 'assistant') continue;
    const j = s.indexOf('"assistant"');
    // built = '{"p":"' + pad + '",' + body.slice(1)
    // index of "assistant" in built = 6 + padLen + 2 + (j - 1) = 7 + padLen + j
    const padLen = 12 - j;
    if (padLen < 0) throw new Error('the assistant marker sits too deep to pad');
    const built = '{"p":"' + 'x'.repeat(padLen) + '",' + s.slice(1);
    const at = built.indexOf('"assistant"');
    if (at + 11 !== 30) {
      throw new Error(`cursor offset fixture missed its byte, marker ends at ${String(at + 11)}`);
    }
    markerEnd = at + 11;
    d.blobs[id] = built;
  }
  if (markerEnd === 0) throw new Error('cursor offset fixture found no assistant blob');
  writeFileSync(out, JSON.stringify(d), 'utf8');
  return { markerEnd };
}

/**
 * Defect 7. Six bytes changed at equal length below the head, with the file
 * time moved. Returns null when no safe six byte window was found.
 */
function changeSixBytes(file: string): number | null {
  const buf = readFileSync(file);
  const at = buf.indexOf('release', 5000);
  if (at === -1) return null;
  buf.write('RELEASE', at, 'utf8');
  writeFileSync(file, buf);
  const late = new Date();
  utimesSync(file, late, late);
  return at;
}

// ---------------------------------------------------------------------------
// The base cases, in the shape verify.js proved
// ---------------------------------------------------------------------------

interface BaseCase {
  provider: string;
  file: string;
  sessionId?: string;
  adapter?: 'cursor' | 'cursoride' | 'copilotide';
  cwd: string;
}

const CODEX_FILE = 'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl';

const BASE: BaseCase[] = [
  { provider: 'claude', file: 'claude-session.jsonl', cwd: '/Users/dev/demo-app' },
  { provider: 'codex', file: CODEX_FILE, cwd: '/Users/example/rookery' },
  { provider: 'grok', file: 'grok-updates.jsonl', cwd: '/Users/dev/example' },
  { provider: 'antigravity', file: 'antigravity-transcript_full.jsonl', cwd: '/Users/example/rookery' },
  { provider: 'qwen', file: 'qwen-chat.jsonl', cwd: '/Users/dev/demo-project' },
  {
    provider: 'pi',
    file: 'pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl',
    cwd: '/Users/example/rookery'
  },
  {
    provider: 'muse',
    file: 'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl',
    sessionId: '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c',
    cwd: '/Users/example/rookery'
  },
  { provider: 'gemini', file: 'gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl', cwd: '/Users/example/rookery' },
  { provider: 'deepseek', file: 'deepseek-session.json', cwd: '/Users/example/demo-project' },
  { provider: 'cursor', file: 'cursor-store.json', adapter: 'cursor', cwd: '/Users/example/rookery' },
  { provider: 'cursoride', file: 'cursoride-composer.json', adapter: 'cursoride', cwd: '/Users/example/rookery' },
  { provider: 'copilotide', file: 'copilotide-chatsession.json', adapter: 'copilotide', cwd: '/Users/example/rookery' }
];

// ---------------------------------------------------------------------------
// Product only steps
// ---------------------------------------------------------------------------

/** qwen's encoding, copied from src/main/manifest/harvest/stores.ts. */
function sanitizeQwenCwd(realCwd: string): string {
  return realCwd.replace(/[^a-zA-Z0-9]/g, '-');
}

/** pi's encoding, copied from src/main/manifest/harvest/stores.ts. */
function sanitizePiCwd(cwd: string): string {
  return `--${cwd.replace(/^\//, '').replace(/[/\\:]/g, '-')}--`;
}

function md5hex(s: string): string {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

interface ResolverCase {
  provider: string;
  agentSessionId: string;
  want: string;
}

/**
 * Builds a scratch home holding one fixture per provider where the resolver
 * expects it, then asks the product resolver to find each one. Nothing under
 * the person's real home is read.
 */
function runResolverChecks(mod: any, scratch: string, adapters: Record<string, string>): any[] {
  const home = join(scratch, 'resolver-home');
  const cwd = join(scratch, 'resolver-project');
  mkdirSync(cwd, { recursive: true });
  const results: any[] = [];
  const place = (rel: string, src: string) => {
    const dst = join(home, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    return dst;
  };
  const fx = (name: string) => join(FIXTURES, name);
  const dash = cwd.replace(/\//g, '-');
  const cases: Array<ResolverCase & { placed: string }> = [];

  cases.push({
    provider: 'claude',
    agentSessionId: '11111111-2222-4333-8444-555555555555',
    placed: place(
      join('.claude', 'projects', dash, '11111111-2222-4333-8444-555555555555.jsonl'),
      fx('claude-session.jsonl')
    ),
    want: 'resolved'
  });
  // The committed fixture carries a codex- prefix for the fixtures directory.
  // The real store name has none, so the placement strips it.
  cases.push({
    provider: 'codex',
    agentSessionId: '0000aaaa-1111-7000-8000-222233334444',
    placed: place(
      join('.codex', 'sessions', '2026', '08', '19', CODEX_FILE.replace(/^codex-/, '')),
      fx(CODEX_FILE)
    ),
    want: 'resolved'
  });
  cases.push({
    provider: 'grok',
    agentSessionId: '0199aaaa-1111-7000-8000-abcdefabcdef',
    placed: place(
      join('.grok', 'sessions', encodeURIComponent(cwd), '0199aaaa-1111-7000-8000-abcdefabcdef', 'updates.jsonl'),
      fx('grok-updates.jsonl')
    ),
    want: 'resolved'
  });
  cases.push({
    provider: 'qwen',
    agentSessionId: '11111111-2222-4333-8444-555555555555',
    placed: place(
      join('.qwen', 'projects', sanitizeQwenCwd(cwd), 'chats', '11111111-2222-4333-8444-555555555555.jsonl'),
      fx('qwen-chat.jsonl')
    ),
    want: 'resolved'
  });
  cases.push({
    provider: 'pi',
    agentSessionId: '019eba31-566c-7911-bf09-14afe53d7c36',
    placed: place(
      join(
        '.pi',
        'agent',
        'sessions',
        sanitizePiCwd(cwd),
        '2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl'
      ),
      fx('pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl')
    ),
    want: 'resolved'
  });
  const dataHome = join(home, '.local', 'share');
  cases.push({
    provider: 'muse',
    agentSessionId: '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c',
    placed: place(
      join('.local', 'share', 'muse', 'sessions', '2026', '08', '18', '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c', 'session.jsonl'),
      fx('muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl')
    ),
    want: 'resolved'
  });
  const geminiDir = join('.gemini', 'tmp', 'scratchslug', 'chats');
  const geminiPlaced = place(
    join(geminiDir, 'session-2026-08-20T10-00-a1b2c3d4.jsonl'),
    fx('gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl')
  );
  writeFileSync(join(home, '.gemini', 'tmp', 'scratchslug', '.project_root'), cwd, 'utf8');
  cases.push({
    provider: 'gemini',
    agentSessionId: 'a1b2c3d4-0000-4000-8000-000000000000',
    placed: geminiPlaced,
    want: 'resolved'
  });
  cases.push({
    provider: 'deepseek',
    agentSessionId: '00000000-0000-4000-8000-000000000001',
    placed: place(
      join('.deepseek', 'sessions', '00000000-0000-4000-8000-000000000001.json'),
      fx('deepseek-session.json')
    ),
    want: 'resolved'
  });
  if (adapters['cursor'] !== undefined) {
    const dst = join(home, '.cursor', 'chats', md5hex(cwd), '11111111-2222-4333-8444-555555555555', 'store.db');
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(adapters['cursor'], dst);
    cases.push({
      provider: 'cursor',
      agentSessionId: '11111111-2222-4333-8444-555555555555',
      placed: dst,
      want: 'resolved'
    });
  }

  for (const c of cases) {
    try {
      const loc = mod.resolveSessionLog(
        {
          agent: c.provider,
          agentSessionId: c.agentSessionId,
          cwd,
          createdAt: Date.UTC(2026, 7, 19, 12, 0, 0),
          storePathHint: null
        },
        { home, env: { XDG_DATA_HOME: dataHome } }
      );
      results.push({
        provider: c.provider,
        want: c.want,
        state: loc.state,
        fileMatches: loc.state === 'resolved' ? loc.file === c.placed : null,
        file: loc.state === 'resolved' ? loc.file : null,
        placed: c.placed
      });
    } catch (err) {
      results.push({ provider: c.provider, want: c.want, state: 'threw', error: String((err as Error).message) });
    }
  }
  try {
    const loc = mod.resolveSessionLog(
      { agent: 'droid', agentSessionId: 'any', cwd, createdAt: Date.now(), storePathHint: null },
      { home, env: {} }
    );
    results.push({ provider: 'droid', want: 'no-store', state: loc.state });
  } catch (err) {
    results.push({ provider: 'droid', want: 'no-store', state: 'threw', error: String((err as Error).message) });
  }
  return results;
}

/** The eleven raw values, one per secret shape section 8 names. */
const SECRETS: Array<{ name: string; value: string }> = [
  { name: 'aws-key', value: 'AKIAIOSFODNN7EXAMPLE' },
  { name: 'github-token', value: 'ghp_aB3dEfGhIjKlMnOpQrStUvWxYz0123456789' },
  // The next two values are joined at runtime so the committed bytes hold no
  // key shaped literal, which the push protection on the repository refuses.
  { name: 'slack-token', value: ['xoxb', '1234567890', '1234567890123', 'AbCdEfGhIjKlMnOpQrStUvWx'].join('-') },
  { name: 'anthropic-key', value: 'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUvWxYz01234567' },
  { name: 'google-key', value: 'AIzaSyA1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1v' },
  {
    name: 'jwt',
    value:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c'
  },
  { name: 'bearer', value: 'Bearer AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
  { name: 'assignment', value: 'api_key = "supersecretassignmentvalue123"' },
  {
    name: 'private-key',
    value: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA7example7key7bytes7\n-----END RSA PRIVATE KEY-----'
  },
  { name: 'stripe-key', value: ['sk', 'live', 'AbCdEfGhIjKlMnOpQrStUvWx'].join('_') },
  { name: 'email', value: 'trap.person@example.com' }
];

const KEEP_PATH = '/Users/example/demo-app/src/index.ts';

function buildSecretsFixture(out: string): void {
  const askText =
    'Please rotate these before anyone sees them.\n' +
    SECRETS.map((s) => s.value).join('\n') +
    '\nAlso look at ' +
    KEEP_PATH;
  const answerText =
    'I found the same values in the log.\n' +
    SECRETS.map((s) => s.value).join('\n') +
    '\nThe file ' +
    KEEP_PATH +
    ' is unchanged.';
  const lines = [
    JSON.stringify({
      parentUuid: null,
      isSidechain: false,
      type: 'user',
      uuid: 'sec-ask',
      timestamp: '2026-08-20T09:00:00.000Z',
      cwd: '/Users/example/demo-app',
      sessionId: 'aaaa1111-2222-4333-8444-555555555555',
      promptSource: 'typed',
      origin: { kind: 'human' },
      message: { role: 'user', content: askText }
    }),
    JSON.stringify({
      parentUuid: 'sec-ask',
      isSidechain: false,
      type: 'assistant',
      uuid: 'sec-answer',
      timestamp: '2026-08-20T09:00:10.000Z',
      cwd: '/Users/example/demo-app',
      sessionId: 'aaaa1111-2222-4333-8444-555555555555',
      message: { role: 'assistant', model: 'claude-opus-5', content: [{ type: 'text', text: answerText }] }
    })
  ];
  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
}

async function runRedactionCheck(read: ReadFn, scratch: string): Promise<any> {
  const storeEntry = join(root, 'src', 'main', 'overview', 'store', 'index.ts');
  if (!existsSync(storeEntry)) {
    return { ran: false, why: 'src/main/overview/store/index.ts is not in the tree yet' };
  }
  const fixture = join(scratch, 'claude-secrets.jsonl');
  buildSecretsFixture(fixture);
  const r = read({
    provider: 'claude',
    file: fixture,
    sessionId: null,
    cwd: '/Users/example/demo-app',
    projectPath: '/Users/example/demo-app',
    watermark: null
  });
  if (!r.ok || r.turns.length !== 1) {
    return { ran: true, ok: false, why: `the secrets fixture read ${String(r.turns.length)} turns, wanted 1` };
  }
  const storeMod: any = await import(pathToFileURL(storeEntry).href);
  const readerEntry = join(root, 'src', 'main', 'overview', 'reader', 'index.ts');
  const readerMod: any = await import(pathToFileURL(readerEntry).href);
  const raw = readerMod.readSessionLog({
    provider: 'claude',
    file: fixture,
    sessionId: null,
    cwd: '/Users/example/demo-app',
    projectPath: '/Users/example/demo-app',
    watermark: null
  });
  const dbPath = join(scratch, 'overview-redaction.db');
  const store = storeMod.openOverviewStore(dbPath);
  try {
    store.upsertSession({
      sessionId: 'sec-1',
      agent: 'claude',
      provider: 'claude',
      agentSessionId: 'aaaa1111-2222-4333-8444-555555555555',
      logPath: fixture,
      watermark: null,
      mapVersionAtLastRead: null,
      lastReadAt: null,
      readState: 'ok',
      readDetail: null,
      lastTouchedAt: null,
      model: null,
      branch: null,
      honest: null
    });
    store.replaceTurnsFrom('sec-1', 0, raw.turns, raw.watermark, 1, Date.now());
  } finally {
    store.close();
  }
  let bytes = readFileSync(dbPath).toString('latin1');
  for (const side of ['-wal', '-shm']) {
    const p = dbPath + side;
    if (existsSync(p)) bytes += readFileSync(p).toString('latin1');
  }
  const leaked = SECRETS.filter((s) => bytes.includes(s.value)).map((s) => s.name);
  return {
    ran: true,
    ok: leaked.length === 0 && bytes.includes('[REDACTED:') && bytes.includes(KEEP_PATH),
    leaked,
    hasMarker: bytes.includes('[REDACTED:'),
    keepsProjectPath: bytes.includes(KEEP_PATH)
  };
}

/**
 * Kills a child mid write and reopens the file. The child writes turns in a
 * loop through the product store, so the kill lands inside a transaction
 * sooner or later.
 */
async function runCrashCheck(scratch: string): Promise<any> {
  const storeEntry = join(root, 'src', 'main', 'overview', 'store', 'index.ts');
  if (!existsSync(storeEntry)) {
    return { ran: false, why: 'src/main/overview/store/index.ts is not in the tree yet' };
  }
  const dbPath = join(scratch, 'overview-crash.db');
  const child = join(scratch, 'crash-child.mts');
  writeFileSync(
    child,
    [
      "import { pathToFileURL } from 'node:url';",
      `const mod: any = await import(pathToFileURL(${JSON.stringify(storeEntry)}).href);`,
      `const store = mod.openOverviewStore(${JSON.stringify(dbPath)});`,
      "store.upsertSession({ sessionId: 'c-1', agent: 'claude', provider: 'claude', agentSessionId: null, logPath: null, watermark: null, mapVersionAtLastRead: null, lastReadAt: null, readState: 'ok', readDetail: null, lastTouchedAt: null, model: null, branch: null, honest: null });",
      'const turns: any[] = [];',
      '// The cap is a backstop so an orphaned child ends on its own. The',
      '// parent SIGKILLs long before it is reached.',
      'for (let i = 0; i < 2000; i += 1) {',
      "  turns.push({ index: i, ask: { text: 'ask ' + String(i), at: null, queued: 1 }, answer: { text: 'answer ' + String(i), at: null }, closed: true, interrupted: false, notice: null, stopReason: null, durationMs: null, paths: [], pathSource: 'text-only' });",
      "  store.replaceTurnsFrom('c-1', 0, turns, null, 1, Date.now());",
      "  if (i === 0) console.log('first write done');",
      '}',
      'store.close();'
    ].join('\n'),
    'utf8'
  );
  // The probe itself runs under tsx, so the child reuses the same loader
  // through execArgv rather than resolving npx a second time.
  const proc = spawn(process.execPath, [...process.execArgv, child], { cwd: root });
  let sawFirst = false;
  let childErr = '';
  proc.stdout.on('data', (b: Buffer) => {
    if (b.toString().includes('first write done')) sawFirst = true;
  });
  proc.stderr.on('data', (b: Buffer) => {
    childErr += b.toString();
  });
  const started = Date.now();
  while (!sawFirst && Date.now() - started < 20_000) {
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 300));
  proc.kill('SIGKILL');
  await new Promise((r) => {
    proc.on('exit', r);
    setTimeout(r, 2_000);
  });
  if (!sawFirst) {
    return { ran: true, ok: false, why: `the child never finished its first write. ${childErr.slice(-400)}` };
  }
  const Database = req('better-sqlite3');
  const db = new Database(dbPath);
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    const rows = db.prepare('select turn_index from turn order by turn_index').all() as Array<{ turn_index: number }>;
    let contiguous = true;
    rows.forEach((row, i) => {
      if (row.turn_index !== i) contiguous = false;
    });
    return { ran: true, ok: integrity === 'ok' && contiguous, integrity, turnCount: rows.length, contiguous };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  const cleanupDirs: string[] = [];

  try {
    const fixturesLib = req(join(REFERENCE, 'lib', 'fixtures.js'));
    const source = mode === 'reference' ? referenceReader() : await productReader();
    const read = source.read;
    const map = source.map;

    const out: any = {
      mode,
      node: process.version,
      map: {
        blobProbeBytes: map?.providers?.cursor?.blobProbeBytes ?? null,
        mapHash:
          mode === 'product' && typeof (source as any).mod?.keepMapHash === 'function'
            ? (source as any).mod.keepMapHash()
            : null,
        providerVersions: Object.fromEntries(
          Object.entries((map?.providers ?? {}) as Record<string, any>).map(([p, cfg]) => [p, cfg.version ?? null])
        ),
        droidHonest: map?.providers?.droid?.honest ?? null,
        droidContainer: map?.providers?.droid?.container ?? null
      },
      cases: {} as Record<string, NormalRead>,
      product: null as any
    };

    // The one real-file mode, for the verifier. Reads one log read only,
    // prints its path index, writes nothing, and does nothing else.
    const realSpec = process.env['OVERVIEW_REAL'];
    if (realSpec !== undefined && realSpec !== '') {
      const spec = JSON.parse(realSpec) as { file: string; provider: string; repo: string };
      const r = read({
        provider: spec.provider,
        file: spec.file,
        sessionId: null,
        cwd: spec.repo,
        projectPath: spec.repo,
        watermark: null
      });
      process.stdout.write(
        JSON.stringify({
          mode,
          real: { file: spec.file, provider: spec.provider, turns: r.turns.length, paths: r.paths, error: r.error }
        })
      );
      return;
    }

    const adapterFiles: Record<string, string> = {};

    // Base cases, then a second read of the same file with the watermark the
    // first read returned. A file that has not moved must cost nothing.
    for (const c of BASE) {
      let file = join(FIXTURES, c.file);
      let sessionId = c.sessionId ?? null;
      if (c.adapter) {
        const a = fixturesLib[c.adapter](file);
        file = a.file;
        if (a.sessionId) sessionId = a.sessionId;
        cleanupDirs.push(a.dir);
        adapterFiles[c.provider] = a.file;
      }
      const job: ReadJob = {
        provider: c.provider,
        file,
        sessionId,
        cwd: c.cwd,
        projectPath: c.cwd,
        watermark: null
      };
      const first = read(job);
      out.cases[`base-${c.provider}`] = first;
      if (first.ok && first.watermark !== null) {
        out.cases[`second-${c.provider}`] = read({ ...job, watermark: first.watermark });
      }
    }

    // Derived fixtures. Each is a named defect from research 63 section 19.
    const sorted = join(SCRATCH, 'claude-sorted.jsonl');
    buildClaudeSorted(sorted);
    out.cases['claude-sorted'] = read({
      provider: 'claude',
      file: sorted,
      sessionId: null,
      cwd: '/Users/dev/demo-app',
      projectPath: '/Users/dev/demo-app',
      watermark: null
    });

    const traps = join(SCRATCH, 'claude-traps.jsonl');
    buildClaudeTraps(traps);
    out.cases['claude-traps'] = read({
      provider: 'claude',
      file: traps,
      sessionId: null,
      cwd: '/Users/dev/demo-app',
      projectPath: '/Users/dev/demo-app',
      watermark: null
    });

    const codexSrc = join(FIXTURES, CODEX_FILE);
    const reordered = join(SCRATCH, 'codex-reordered.jsonl');
    buildCodexReordered(codexSrc, reordered);
    out.cases['codex-reordered'] = read({
      provider: 'codex',
      file: reordered,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: null
    });

    const noMarkers = join(SCRATCH, 'codex-nomarkers.jsonl');
    buildCodexNoMarkers(codexSrc, noMarkers);
    out.cases['codex-nomarkers'] = read({
      provider: 'codex',
      file: noMarkers,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: null
    });

    const inApp = join(SCRATCH, 'codex-inapp.jsonl');
    buildCodexInApp(codexSrc, inApp);
    out.cases['codex-inapp'] = read({
      provider: 'codex',
      file: inApp,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: null
    });

    const offsetJson = join(SCRATCH, 'cursor-offset.json');
    buildCursorOffset(offsetJson);
    const offsetDb = fixturesLib.cursor(offsetJson);
    cleanupDirs.push(offsetDb.dir);
    out.cases['cursor-offset'] = read({
      provider: 'cursor',
      file: offsetDb.file,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: null
    });

    // Defect 7. A copy of the claude fixture, read once, changed at equal
    // length with the file time moved, read again with the first watermark.
    const changed = join(SCRATCH, 'claude-changed.jsonl');
    copyFileSync(join(FIXTURES, 'claude-session.jsonl'), changed);
    const firstOfChanged = read({
      provider: 'claude',
      file: changed,
      sessionId: null,
      cwd: '/Users/dev/demo-app',
      projectPath: '/Users/dev/demo-app',
      watermark: null
    });
    const changedAt = changeSixBytes(changed);
    out.cases['claude-changed'] =
      changedAt === null
        ? emptyRead('no six byte window was found past the head')
        : read({
            provider: 'claude',
            file: changed,
            sessionId: null,
            cwd: '/Users/dev/demo-app',
            projectPath: '/Users/dev/demo-app',
            watermark: firstOfChanged.watermark
          });
    out.changedByteOffset = changedAt;
    out.changedSizeEqual =
      changedAt !== null &&
      statSync(changed).size === statSync(join(FIXTURES, 'claude-session.jsonl')).size;

    if (mode === 'product') {
      const mod = (source as any).mod;
      out.product = {
        resolver: (() => {
          try {
            return runResolverChecks(mod, SCRATCH, adapterFiles);
          } catch (err) {
            return [{ provider: 'all', state: 'threw', error: String((err as Error).message) }];
          }
        })(),
        redaction: await runRedactionCheck(read, SCRATCH).catch((err) => ({
          ran: true,
          ok: false,
          why: String((err as Error).message)
        })),
        crash: await runCrashCheck(SCRATCH).catch((err) => ({
          ran: true,
          ok: false,
          why: String((err as Error).message)
        }))
      };
    }

    process.stdout.write(JSON.stringify(out));
  } finally {
    for (const d of cleanupDirs) rmSync(d, { recursive: true, force: true });
    rmSync(SCRATCH, { recursive: true, force: true });
  }
}

await main();
