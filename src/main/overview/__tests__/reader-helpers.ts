/**
 * Shared helpers for the reader tests. The two SQLite fixtures are committed
 * as descriptions of the store's rows, because a SQLite file is not
 * reviewable. These builders turn them back into real files so the SAME
 * product reader runs against them, the way
 * docs/research/assets/63-keep-map/lib/fixtures.js did for the reference.
 * Callers delete the temp directory they get back.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { readSessionLog } from '../reader';
import type { ReadResult, Watermark } from '../reader';

export const FIXTURES = resolve(__dirname, '../../../../docs/research/assets/63-fixtures');

export function scratchDir(name: string): string {
  return fs.mkdtempSync(join(os.tmpdir(), `p137-${name}-`));
}

export interface FixtureCase {
  provider: string;
  file: string;
  sessionId?: string;
  cwd: string;
}

export const JSONL_CASES: Record<string, FixtureCase> = {
  claude: { provider: 'claude', file: 'claude-session.jsonl', cwd: '/Users/dev/demo-app' },
  codex: {
    provider: 'codex',
    file: 'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl',
    cwd: '/Users/example/rookery'
  },
  grok: { provider: 'grok', file: 'grok-updates.jsonl', cwd: '/Users/dev/example' },
  antigravity: {
    provider: 'antigravity',
    file: 'antigravity-transcript_full.jsonl',
    cwd: '/home/dev/demo-project'
  },
  qwen: { provider: 'qwen', file: 'qwen-chat.jsonl', cwd: '/Users/dev/demo-project' },
  pi: {
    provider: 'pi',
    file: 'pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl',
    cwd: '/Users/example/rookery'
  },
  muse: {
    provider: 'muse',
    file: 'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl',
    sessionId: '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c',
    cwd: '/Users/example/painpoints'
  },
  gemini: {
    provider: 'gemini',
    file: 'gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl',
    cwd: '/home/example/widget-shop'
  },
  deepseek: { provider: 'deepseek', file: 'deepseek-session.json', cwd: '/Users/example/demo-project' }
};

export function readFixture(
  c: FixtureCase,
  opts?: { file?: string; watermark?: Watermark | null }
): ReadResult {
  return readSessionLog({
    provider: c.provider as never,
    file: opts?.file ?? join(FIXTURES, c.file),
    sessionId: c.sessionId ?? null,
    cwd: c.cwd,
    projectPath: c.cwd,
    watermark: opts?.watermark ?? null
  });
}

/** Every kept ask and answer, joined, for the banned string checks. */
export function keptText(r: ReadResult): string {
  return r.turns.map((t) => t.ask.text + '\n' + (t.answer ? t.answer.text : '')).join('\n');
}

interface CursorFixtureDoc {
  meta_table: Array<{ key: string; value_hex?: string; value?: string }>;
  root_blob_id: string;
  root_blob_hex: string;
  blobs: Record<string, unknown>;
}

/** Build a real cursor CLI store.db from the descriptive fixture. */
export function buildCursorStore(dir: string): string {
  const d = JSON.parse(
    fs.readFileSync(join(FIXTURES, 'cursor-store.json'), 'utf8')
  ) as CursorFixtureDoc;
  const out = join(dir, 'store.db');
  const db = new Database(out);
  db.exec(
    'create table blobs (id TEXT PRIMARY KEY, data BLOB); create table meta (key TEXT PRIMARY KEY, value TEXT);'
  );
  const ib = db.prepare('insert into blobs (id,data) values (?,?)');
  ib.run(d.root_blob_id, Buffer.from(d.root_blob_hex, 'hex'));
  for (const [id, body] of Object.entries(d.blobs)) {
    if (id === d.root_blob_id) continue;
    ib.run(id, Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8'));
  }
  const im = db.prepare('insert into meta (key,value) values (?,?)');
  for (const r of d.meta_table) im.run(r.key, r.value_hex ?? r.value ?? '');
  db.close();
  return out;
}

interface CursorideFixtureDoc {
  composerHeaders_row: Record<string, unknown>;
  cursorDiskKV: Record<string, unknown>;
}

/** Build a real cursoride state.vscdb from the descriptive fixture. */
export function buildCursorideStore(
  dir: string,
  mutate?: (kv: Record<string, unknown>) => void
): { file: string; sessionId: string } {
  const d = JSON.parse(
    fs.readFileSync(join(FIXTURES, 'cursoride-composer.json'), 'utf8')
  ) as CursorideFixtureDoc;
  if (mutate) mutate(d.cursorDiskKV);
  const out = join(dir, 'state.vscdb');
  const db = new Database(out);
  db.exec(
    'create table cursorDiskKV (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB); create table composerHeaders (composerId TEXT PRIMARY KEY, workspaceId TEXT, createdAt INTEGER, lastUpdatedAt INTEGER, isArchived INTEGER, isSubagent INTEGER, recency INTEGER, checkpointAt INTEGER, value TEXT);'
  );
  const ins = db.prepare('insert into cursorDiskKV (key,value) values (?,?)');
  let composerId: string | null = null;
  for (const [k, v] of Object.entries(d.cursorDiskKV)) {
    if (k.startsWith('composerData:')) composerId = k.slice('composerData:'.length);
    ins.run(k, v === null ? null : typeof v === 'string' ? v : JSON.stringify(v));
  }
  const h = d.composerHeaders_row;
  db.prepare(
    'insert into composerHeaders (composerId,workspaceId,createdAt,lastUpdatedAt,isArchived,isSubagent,recency,checkpointAt,value) values (?,?,?,?,?,?,?,?,?)'
  ).run(
    h['composerId'],
    h['workspaceId'] ?? null,
    h['createdAt'] ?? null,
    h['lastUpdatedAt'] ?? null,
    Number(h['isArchived'] ?? 0),
    Number(h['isSubagent'] ?? 0),
    h['recency'] ?? null,
    h['checkpointAt'] ?? null,
    typeof h['value'] === 'string' ? h['value'] : JSON.stringify(h['value'] ?? null)
  );
  db.close();
  return { file: out, sessionId: composerId ?? String(h['composerId']) };
}

/** Unwrap the copilotide fixture's document into a real chat session file. */
export function buildCopilotideFile(dir: string): string {
  const d = JSON.parse(fs.readFileSync(join(FIXTURES, 'copilotide-chatsession.json'), 'utf8')) as {
    document: unknown;
  };
  const out = join(dir, 'chatsession.json');
  fs.writeFileSync(out, JSON.stringify(d.document));
  return out;
}

/** Recursively sort every object's keys, the claude cli 2.1.178 vintage. */
export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v != null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      out[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

export function fixtureLines(file: string): string[] {
  return fs.readFileSync(join(FIXTURES, file), 'utf8').trim().split('\n');
}
