/**
 * Manifest row to log file, section 6.2 of the Phase 137 spec.
 *
 * The order for every provider is the same. First the manifest's own
 * storePath hint, accepted only when it names a real file that carries the
 * session id. Then path arithmetic from the resolved cwd. Then the glob
 * fallback where one is named. Synchronous. Stats and globs. Opens at most
 * one small SQLite file read only, for muse's index and antigravity's
 * conversation record. Never writes.
 *
 * A row with no agentSessionId is `no-file`. A path that does not exist is
 * `no-file`. `no-file` is not an error. It is the state of a claude session
 * before its first turn.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { AgentRegistryId } from '@shared/types';
import {
  DATE_SHARD_WINDOW_MS,
  sanitizeOmpCwd,
  sanitizePiCwd,
  sanitizeQwenCwd
} from '../../manifest/harvest/stores';

export type OverviewProvider = AgentRegistryId;

export interface ResolveInput {
  agent: string;
  agentSessionId: string | null;
  cwd: string;
  createdAt: number;
  /** resume_provenance.storePath from the manifest row, when present. */
  storePathHint: string | null;
}

export interface ResolveEnv {
  home: string;
  env: NodeJS.ProcessEnv;
}

export type LogLocation =
  | { state: 'resolved'; provider: OverviewProvider; file: string; sessionId: string | null }
  | { state: 'no-file'; provider: OverviewProvider }
  | { state: 'no-store'; provider: OverviewProvider }
  | { state: 'wrong-conversation'; provider: OverviewProvider; file: string; detail: string }
  | { state: 'unsupported'; provider: string };

const PATH_ARITHMETIC_PROVIDERS = new Set<string>([
  'claude',
  'codex',
  'grok',
  'antigravity',
  'muse',
  'qwen',
  'pi',
  'omp',
  'gemini',
  'deepseek',
  'cursor'
]);

function realCwdOf(cwd: string): string {
  try {
    return fs.realpathSync(cwd);
  } catch {
    return cwd;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function listDir(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

/** The claude project directory encoding, measured in research 63 section 21 for `/` only. */
export function dashEncodeClaudeCwd(realCwd: string): string {
  return realCwd.replace(/\//g, '-');
}

function md5hex(s: string): string {
  return createHash('md5').update(s).digest('hex');
}

export function resolveSessionLog(input: ResolveInput, env?: Partial<ResolveEnv>): LogLocation {
  const home = env?.home ?? os.homedir();
  const penv = env?.env ?? process.env;
  const agent = input.agent;

  if (agent === 'droid') return { state: 'no-store', provider: 'droid' };
  if (!PATH_ARITHMETIC_PROVIDERS.has(agent)) return { state: 'unsupported', provider: agent };
  const provider = agent as OverviewProvider;
  const id = input.agentSessionId;
  if (id == null || id === '') return { state: 'no-file', provider };

  const sessionIdOut = provider === 'muse' ? id : null;

  // The manifest's own hint wins when it still names the right file.
  const hint = input.storePathHint;
  if (hint != null && isFile(hint)) {
    const base = hint.split('/').pop() ?? '';
    const parent = hint.split('/').slice(-2, -1)[0] ?? '';
    if (base.includes(id) || parent.includes(id)) {
      if (provider === 'antigravity') {
        const wrong = antigravityWrongConversation(home, id, realCwdOf(input.cwd));
        if (wrong) return { state: 'wrong-conversation', provider, file: hint, detail: wrong };
      }
      return { state: 'resolved', provider, file: hint, sessionId: sessionIdOut };
    }
  }

  const realCwd = realCwdOf(input.cwd);

  switch (provider) {
    case 'claude': {
      const projects = join(home, '.claude', 'projects');
      const direct = join(projects, dashEncodeClaudeCwd(realCwd), `${id}.jsonl`);
      if (isFile(direct)) return { state: 'resolved', provider, file: direct, sessionId: null };
      for (const dir of listDir(projects)) {
        const p = join(projects, dir, `${id}.jsonl`);
        if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      }
      return { state: 'no-file', provider };
    }
    case 'codex': {
      const codexHome = penv['CODEX_HOME'] ?? join(home, '.codex');
      const sessions = join(codexHome, 'sessions');
      const now = Date.now();
      const startAt = input.createdAt - DATE_SHARD_WINDOW_MS;
      const dayMs = 24 * 60 * 60 * 1000;
      // Newest day first, so the found file is the freshest match.
      for (let t = now; t >= startAt; t -= dayMs) {
        const d = new Date(t);
        const dir = join(
          sessions,
          String(d.getFullYear()),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0')
        );
        for (const name of listDir(dir)) {
          if (name.startsWith('rollout-') && name.endsWith(`-${id}.jsonl`)) {
            const p = join(dir, name);
            if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
          }
        }
      }
      return { state: 'no-file', provider };
    }
    case 'grok': {
      const sessions = join(home, '.grok', 'sessions');
      const direct = join(sessions, encodeURIComponent(realCwd), id, 'updates.jsonl');
      if (isFile(direct)) return { state: 'resolved', provider, file: direct, sessionId: null };
      for (const dir of listDir(sessions)) {
        const p = join(sessions, dir, id, 'updates.jsonl');
        if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      }
      return { state: 'no-file', provider };
    }
    case 'antigravity': {
      const brain = join(home, '.gemini', 'antigravity-cli', 'brain', id);
      const file = join(brain, '.system_generated', 'logs', 'transcript_full.jsonl');
      if (!isFile(file)) return { state: 'no-file', provider };
      const wrong = antigravityWrongConversation(home, id, realCwd);
      if (wrong) return { state: 'wrong-conversation', provider, file, detail: wrong };
      return { state: 'resolved', provider, file, sessionId: null };
    }
    case 'muse': {
      const xdg = penv['XDG_DATA_HOME'];
      const root = xdg != null && xdg !== '' ? join(xdg, 'muse') : join(home, '.local', 'share', 'muse');
      const index = join(root, 'session-index.db');
      if (isFile(index)) {
        try {
          const db = new Database(index, { readonly: true, fileMustExist: true });
          try {
            const row = db
              .prepare('select session_log_path from sessions where session_id = ?')
              .get(id) as { session_log_path: unknown } | undefined;
            const p = typeof row?.session_log_path === 'string' ? row.session_log_path : null;
            if (p != null && isFile(p)) {
              return { state: 'resolved', provider, file: p, sessionId: id };
            }
          } finally {
            db.close();
          }
        } catch {
          // The index is a convenience. The glob below is the truth on disk.
        }
      }
      const sessions = join(root, 'sessions');
      for (const y of listDir(sessions)) {
        if (!/^\d{4}$/.test(y)) continue;
        for (const m of listDir(join(sessions, y))) {
          if (!/^\d{2}$/.test(m)) continue;
          for (const d of listDir(join(sessions, y, m))) {
            if (!/^\d{2}$/.test(d)) continue;
            const p = join(sessions, y, m, d, id, 'session.jsonl');
            if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: id };
          }
        }
      }
      return { state: 'no-file', provider };
    }
    case 'qwen': {
      const p = join(home, '.qwen', 'projects', sanitizeQwenCwd(realCwd), 'chats', `${id}.jsonl`);
      if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      return { state: 'no-file', provider };
    }
    case 'pi': {
      const dir = join(home, '.pi', 'agent', 'sessions', sanitizePiCwd(realCwd));
      // Match on the FILENAME uuid. It differs from the line 1 id in 6 of 55 files.
      for (const name of listDir(dir)) {
        if (name.endsWith(`_${id}.jsonl`)) {
          const p = join(dir, name);
          if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
        }
      }
      return { state: 'no-file', provider };
    }
    case 'omp': {
      // The pi store moved (~/.pi/agent -> ~/.omp/agent) and the per-cwd DIR
      // KEY moved with it: omp buckets the realpathed cwd by HOME and tmpdir
      // (sanitizeOmpCwd), and only a cwd outside both keeps pi's flat wrap.
      // Only the _<uuid>.jsonl filename grammar is unchanged. Using pi's
      // sanitizePiCwd here read a directory omp never writes for any project
      // under the home directory, which is nearly every project.
      const dir = join(
        home,
        '.omp',
        'agent',
        'sessions',
        sanitizeOmpCwd(realCwd, home, os.tmpdir())
      );
      for (const name of listDir(dir)) {
        if (name.endsWith(`_${id}.jsonl`)) {
          const p = join(dir, name);
          if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
        }
      }
      return { state: 'no-file', provider };
    }
    case 'gemini': {
      const tmp = join(home, '.gemini', 'tmp');
      const first8 = id.slice(0, 8);
      // The slug is never computed. The directory whose .project_root names
      // this folder is the right one.
      for (const dir of listDir(tmp)) {
        const rootFile = join(tmp, dir, '.project_root');
        let recorded: string | null = null;
        try {
          recorded = fs.readFileSync(rootFile, 'utf8').trim();
        } catch {
          continue;
        }
        if (recorded !== realCwd) continue;
        const chats = join(tmp, dir, 'chats');
        const matches = listDir(chats)
          .filter((n) => n.startsWith('session-') && n.endsWith(`-${first8}.jsonl`))
          .sort();
        const last = matches[matches.length - 1];
        if (last !== undefined) {
          const p = join(chats, last);
          if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
        }
      }
      return { state: 'no-file', provider };
    }
    case 'deepseek': {
      const p = join(home, '.deepseek', 'sessions', `${id}.json`);
      if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      return { state: 'no-file', provider };
    }
    case 'cursor': {
      const chats = join(home, '.cursor', 'chats');
      for (const key of [md5hex(input.cwd), md5hex(realCwd)]) {
        const p = join(chats, key, id, 'store.db');
        if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      }
      for (const dir of listDir(chats)) {
        const p = join(chats, dir, id, 'store.db');
        if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
      }
      return { state: 'no-file', provider };
    }
    default:
      return { state: 'unsupported', provider };
  }
}

/**
 * antigravity can bind a brain directory to a different folder than the one
 * the session ran in. 2 of 4 live rows on the operator's machine do. The
 * conversation record names the folder as a file:// uri, and when that
 * folder is not this session's, the page says so instead of narrating a
 * stranger's conversation.
 */
function antigravityWrongConversation(home: string, id: string, realCwd: string): string | null {
  const dbPath = join(home, '.gemini', 'antigravity-cli', 'brain', id, 'conversations', `${id}.db`);
  if (!isFile(dbPath)) return null;
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const row = db
        .prepare("select * from trajectory_metadata_blob where id = 'main'")
        .get() as Record<string, unknown> | undefined;
      if (!row) return null;
      let uri: string | null = null;
      for (const v of Object.values(row)) {
        const s = Buffer.isBuffer(v) ? v.toString('utf8') : typeof v === 'string' ? v : null;
        if (s == null) continue;
        const m = /file:\/\/[^\s"'\\)\]}]+/.exec(s);
        if (m) {
          uri = m[0];
          break;
        }
      }
      if (uri == null) return null;
      let folder = uri.slice('file://'.length);
      try {
        folder = decodeURIComponent(folder);
      } catch {
        // A malformed escape keeps the raw form.
      }
      folder = folder.replace(/\/+$/, '');
      const want = realCwd.replace(/\/+$/, '');
      if (folder === '' || folder === want) return null;
      return `The record names ${folder} and this session's folder is ${want}.`;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}
