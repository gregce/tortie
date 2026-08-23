/**
 * The resolver, manifest row to log file, against a scratch home built from
 * the committed fixtures. Nothing here reads the real home directory.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveSessionLog } from '../reader';
import { FIXTURES, scratchDir } from './reader-helpers';

const home = scratchDir('resolve-home');

function put(rel: string, from: string): string {
  const dest = join(home, rel);
  fs.mkdirSync(join(dest, '..'), { recursive: true });
  fs.copyFileSync(join(FIXTURES, from), dest);
  return dest;
}

function resolveFor(
  agent: string,
  agentSessionId: string | null,
  cwd: string,
  extra?: { storePathHint?: string; createdAt?: number }
): ReturnType<typeof resolveSessionLog> {
  return resolveSessionLog(
    {
      agent,
      agentSessionId,
      cwd,
      createdAt: extra?.createdAt ?? Date.now(),
      storePathHint: extra?.storePathHint ?? null
    },
    { home, env: {} }
  );
}

afterAll(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

describe('resolveSessionLog', () => {
  it('claude, by the dash encoded cwd', () => {
    const p = put(
      '.claude/projects/-Users-dev-demo-app/11111111-2222-4333-8444-555555555555.jsonl',
      'claude-session.jsonl'
    );
    const r = resolveFor('claude', '11111111-2222-4333-8444-555555555555', '/Users/dev/demo-app');
    expect(r).toEqual({ state: 'resolved', provider: 'claude', file: p, sessionId: null });
  });

  it('claude, by the glob fallback when the cwd encoding does not match', () => {
    const p = put(
      '.claude/projects/-Users-dev-someplace-else/aaaaaaaa-2222-4333-8444-555555555555.jsonl',
      'claude-session.jsonl'
    );
    const r = resolveFor('claude', 'aaaaaaaa-2222-4333-8444-555555555555', '/Users/dev/demo-app');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('codex, by walking the day shards backward from today', () => {
    const p = put(
      '.codex/sessions/2026/08/19/rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl',
      'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl'
    );
    const r = resolveFor(
      'codex',
      '0000aaaa-1111-7000-8000-222233334444',
      '/Users/example/rookery',
      { createdAt: new Date('2026-08-19T10:05:03Z').getTime() }
    );
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('grok, by the url encoded cwd', () => {
    const dir = `.grok/sessions/${encodeURIComponent('/Users/dev/example')}/0199aaaa-1111-7000-8000-abcdefabcdef`;
    const p = put(`${dir}/updates.jsonl`, 'grok-updates.jsonl');
    put(`${dir}/summary.json`, 'grok-summary.json');
    const r = resolveFor('grok', '0199aaaa-1111-7000-8000-abcdefabcdef', '/Users/dev/example');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('qwen, by the character substituted cwd', () => {
    const p = put(
      '.qwen/projects/-Users-dev-demo-project/chats/11111111-2222-4333-8444-555555555555.jsonl',
      'qwen-chat.jsonl'
    );
    const r = resolveFor('qwen', '11111111-2222-4333-8444-555555555555', '/Users/dev/demo-project');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('pi, by the mangled cwd and the FILENAME uuid', () => {
    const p = put(
      '.pi/agent/sessions/--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl',
      'pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl'
    );
    const r = resolveFor('pi', '019eba31-566c-7911-bf09-14afe53d7c36', '/Users/example/rookery');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('muse, through the index database', () => {
    const p = put(
      '.local/share/muse/sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl',
      'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl'
    );
    const db = new Database(join(home, '.local/share/muse/session-index.db'));
    db.exec('create table sessions (session_id TEXT PRIMARY KEY, session_log_path TEXT)');
    db.prepare('insert into sessions values (?,?)').run('0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c', p);
    db.close();
    const r = resolveFor('muse', '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c', '/Users/example/painpoints');
    expect(r).toEqual({
      state: 'resolved',
      provider: 'muse',
      file: p,
      sessionId: '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c'
    });
  });

  it('muse, through the glob when the index has no row', () => {
    const p = put(
      '.local/share/muse/sessions/2026/08/18/1cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl',
      'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl'
    );
    const r = resolveFor('muse', '1cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c', '/Users/example/painpoints');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('gemini, by the directory whose .project_root names the folder, never a computed slug', () => {
    fs.mkdirSync(join(home, '.gemini/tmp/some-slug/chats'), { recursive: true });
    fs.writeFileSync(join(home, '.gemini/tmp/some-slug/.project_root'), '/home/example/widget-shop\n');
    const p = put(
      '.gemini/tmp/some-slug/chats/session-2026-08-20T10-00-a1b2c3d4.jsonl',
      'gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl'
    );
    const r = resolveFor(
      'gemini',
      'a1b2c3d4-1111-4222-8333-444455556666',
      '/home/example/widget-shop'
    );
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('deepseek, by the id alone', () => {
    const p = put('.deepseek/sessions/00000000-0000-4000-8000-000000000001.json', 'deepseek-session.json');
    const r = resolveFor('deepseek', '00000000-0000-4000-8000-000000000001', '/Users/example/demo-project');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('cursor, by the md5 of the cwd', () => {
    const key = createHash('md5').update('/Users/example/rookery').digest('hex');
    const dir = join(home, `.cursor/chats/${key}/11111111-2222-4333-8444-555555555555`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(join(dir, 'store.db'), 'placeholder');
    const r = resolveFor('cursor', '11111111-2222-4333-8444-555555555555', '/Users/example/rookery');
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(join(dir, 'store.db'));
  });

  it('antigravity, and wrong-conversation when the brain names another folder', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const p = put(
      `.gemini/antigravity-cli/brain/${id}/.system_generated/logs/transcript_full.jsonl`,
      'antigravity-transcript_full.jsonl'
    );
    const ok = resolveFor('antigravity', id, '/home/dev/demo-project');
    expect(ok).toEqual({ state: 'resolved', provider: 'antigravity', file: p, sessionId: null });

    const convDir = join(home, `.gemini/antigravity-cli/brain/${id}/conversations`);
    fs.mkdirSync(convDir, { recursive: true });
    const db = new Database(join(convDir, `${id}.db`));
    db.exec('create table trajectory_metadata_blob (id TEXT PRIMARY KEY, data BLOB)');
    db.prepare('insert into trajectory_metadata_blob values (?,?)').run(
      'main',
      Buffer.from('{"uri":"file:///Users/other/place"}', 'utf8')
    );
    db.close();
    const wrong = resolveFor('antigravity', id, '/home/dev/demo-project');
    expect(wrong.state).toBe('wrong-conversation');
    expect((wrong as { detail: string }).detail).toContain('/Users/other/place');
  });

  it('accepts a storePath hint that names a real file carrying the id', () => {
    const p = put(
      'hints/22222222-2222-4333-8444-555555555555.jsonl',
      'claude-session.jsonl'
    );
    const r = resolveFor('claude', '22222222-2222-4333-8444-555555555555', '/nowhere', {
      storePathHint: p
    });
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(p);
  });

  it('refuses a hint that does not carry the id', () => {
    const p = put('hints/unrelated.jsonl', 'claude-session.jsonl');
    const r = resolveFor('claude', '33333333-0000-4333-8444-555555555555', '/nowhere', {
      storePathHint: p
    });
    expect(r.state).toBe('no-file');
  });

  it('a row with no session id is no-file, and no-file is not an error', () => {
    expect(resolveFor('claude', null, '/Users/dev/demo-app').state).toBe('no-file');
    expect(resolveFor('qwen', 'ffffffff-0000-0000-0000-000000000000', '/x').state).toBe('no-file');
  });

  it('droid is no-store always', () => {
    expect(resolveFor('droid', 'anything', '/x')).toEqual({ state: 'no-store', provider: 'droid' });
  });

  it('the capture only pair and unknown agents are unsupported', () => {
    expect(resolveFor('cursoride', 'x', '/x').state).toBe('unsupported');
    expect(resolveFor('copilotide', 'x', '/x').state).toBe('unsupported');
    expect(resolveFor('shell', null, '/x').state).toBe('unsupported');
    expect(resolveFor('some-configured-agent', 'x', '/x').state).toBe('unsupported');
  });
});
