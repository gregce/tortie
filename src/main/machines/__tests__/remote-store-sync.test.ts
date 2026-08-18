/**
 * Phase 73 — copying a conversation home while connected, and saying when.
 *
 * The promise this file exists to hold is one sentence: Tortie never says a
 * conversation is current, it says when it last copied it. So the tests are
 * about the RECORD as much as about the bytes.
 *
 * Three of them are the honest half:
 *
 *  1. A file over the cap is not copied and the record says it was not, so no
 *     piece of a conversation ever sits on disk reading as a whole one.
 *  2. A refusal answers null to `conversationSyncedAt`, so nothing can print
 *     "last copied" over something that was never copied.
 *  3. The instant does not move when the machine stops answering. The pass runs
 *     twice with the link cut in between and the number is the same both times.
 *
 * The door and the connection are replaced. The FILE SYSTEM is not: every copy
 * below is written into a real scratch directory and read back off it, because
 * the record beside the bytes is the whole mechanism and a replaced disk would
 * prove the test rather than the product.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let connected = new Set<string>();
let generations = new Map<string, number>();
let sent: string[] = [];
let answer: (path: string) => string = () => 'none none none';
let claims: {
  sessionId: string;
  machineId: string;
  generation: number;
  agent: string;
  conversationId: string;
  storePath: string;
  storeRoot: string;
  at: number;
}[] = [];

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineGeneration: (machineId: string) => ({
    generation: generations.get(machineId) ?? 1,
    remotePath: '/usr/bin'
  })
}));

vi.mock('../control-plane', () => ({
  onMachineLinkChanged: () => () => undefined
}));

vi.mock('../remote-run', () => ({
  machineIsConnected: (machineId: string) => connected.has(machineId),
  runRemoteRead: (
    _ctx: unknown,
    scriptId: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    sent.push(`${scriptId} ${args.join('|')}`);
    const payload = answer(args[0] ?? '');
    return Promise.resolve({ payload, generation: 1, bytes: payload.length });
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => ({
    kind: 'remote',
    machineId,
    sshBin: '/usr/bin/ssh'
  })
}));

vi.mock('../remote-harvest', () => ({
  remoteHarvestClaims: () => claims
}));

import { conversationSyncedAt, remoteStoreRecordOf } from '../remote-record';
import {
  chooseSyncTargets,
  parseStoreCopy,
  pruneMachine,
  remoteStoreSessionDir,
  remoteStoreSyncFacts,
  resetRemoteStoreSyncForTests,
  setRemoteStoreRootForHarness,
  syncMachineOnce,
  REMOTE_STORE_MAX_FILE_BYTES,
  REMOTE_STORE_SYNC_PER_PASS
} from '../remote-store-sync';

let root = '';

/** The three field answer the `store-copy` script prints. */
function copyAnswer(body: string, size?: number, sum?: string | null): string {
  const bytes = Buffer.from(body, 'utf8');
  const checksum =
    sum === null ? 'nosum' : (sum ?? createHash('sha256').update(bytes).digest('hex'));
  return `${String(size ?? bytes.byteLength)} ${checksum} ${bytes.toString('base64')}`;
}

function oneClaim(sessionId = 'sess-1'): void {
  claims = [
    {
      sessionId,
      machineId: 'attic',
      generation: 1,
      agent: 'muse',
      conversationId: 'conv-1',
      storePath: '/home/greg/.local/share/muse/sessions/x/session.jsonl',
      storeRoot: '/home/greg/.local/share/muse/sessions',
      at: Date.now()
    }
  ];
  connected.add('attic');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p73-sync-'));
  setRemoteStoreRootForHarness(root);
  resetRemoteStoreSyncForTests();
  setRemoteStoreRootForHarness(root);
  connected = new Set();
  generations = new Map();
  sent = [];
  claims = [];
  answer = () => 'none none none';
});

afterEach(() => {
  setRemoteStoreRootForHarness(null);
  rmSync(root, { recursive: true, force: true });
});

describe('parseStoreCopy', () => {
  it('reads the size, the checksum and the bytes', () => {
    const parsed = parseStoreCopy(copyAnswer('hello'));
    expect(parsed?.bytes).toBe(5);
    expect(parsed?.body.toString('utf8')).toBe('hello');
    expect(parsed?.sha256).toHaveLength(64);
  });

  it('reads a machine with no checksum tool as no checksum', () => {
    expect(parseStoreCopy(copyAnswer('hello', 5, null))?.sha256).toBeNull();
  });

  it('refuses an answer about a file that is not there', () => {
    expect(parseStoreCopy('none none none')).toBeNull();
    expect(parseStoreCopy('')).toBeNull();
    expect(parseStoreCopy('12 abc')).toBeNull();
  });
});

describe('the copy', () => {
  it('writes the bytes and records when it did', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation');
    expect(await syncMachineOnce('attic')).toBe(1);
    const dir = remoteStoreSessionDir('attic', 'sess-1');
    expect(readFileSync(join(dir, 'session.jsonl'), 'utf8')).toBe('a conversation');
    const record = remoteStoreRecordOf('sess-1');
    expect(record?.outcome).toBe('copied');
    expect(record?.localBytes).toBe(14);
    expect(record?.localSha256).toBe(record?.remoteSha256);
    expect(conversationSyncedAt('sess-1')).toBe(record?.at);
  });

  it('leaves the record on disk beside the bytes', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation');
    await syncMachineOnce('attic');
    const written: unknown = JSON.parse(
      readFileSync(join(remoteStoreSessionDir('attic', 'sess-1'), 'sync.json'), 'utf8')
    );
    expect((written as { outcome: string }).outcome).toBe('copied');
  });

  it('leaves no part file behind', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation');
    await syncMachineOnce('attic');
    const dir = remoteStoreSessionDir('attic', 'sess-1');
    expect(existsSync(join(dir, 'session.jsonl.part'))).toBe(false);
  });
});

describe('the caps, and what a refusal says', () => {
  it('does not copy a file over the per file cap', async () => {
    oneClaim();
    // The machine says the whole file is bigger than the cap and sends the
    // first part of it. None of it is kept.
    answer = () => copyAnswer('the first part', REMOTE_STORE_MAX_FILE_BYTES + 1);
    expect(await syncMachineOnce('attic')).toBe(0);
    const record = remoteStoreRecordOf('sess-1');
    expect(record?.outcome).toBe('too-large');
    expect(record?.localBytes).toBe(0);
    expect(existsSync(join(remoteStoreSessionDir('attic', 'sess-1'), 'session.jsonl'))).toBe(
      false
    );
  });

  it('answers null for a refusal, because a refusal is not a copy', async () => {
    oneClaim();
    answer = () => copyAnswer('the first part', REMOTE_STORE_MAX_FILE_BYTES + 1);
    await syncMachineOnce('attic');
    expect(conversationSyncedAt('sess-1')).toBeNull();
    // The record is still there, so a surface can say what happened.
    expect(remoteStoreRecordOf('sess-1')?.outcome).toBe('too-large');
  });

  it('keeps nothing when the checksum does not match', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation', 14, 'f'.repeat(64));
    expect(await syncMachineOnce('attic')).toBe(0);
    expect(remoteStoreRecordOf('sess-1')?.outcome).toBe('not-whole');
    expect(conversationSyncedAt('sess-1')).toBeNull();
  });

  it('keeps nothing when fewer bytes arrived than the machine said', async () => {
    oneClaim();
    answer = () => copyAnswer('short', 400, null);
    expect(await syncMachineOnce('attic')).toBe(0);
    expect(remoteStoreRecordOf('sess-1')?.outcome).toBe('not-whole');
  });
});

describe('the staleness promise', () => {
  it('does not move the instant when the machine stops answering', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation');
    await syncMachineOnce('attic');
    const first = conversationSyncedAt('sess-1');
    expect(first).not.toBeNull();

    // The machine goes away. Nothing is sent, and the instant a person reads is
    // the same instant it was before.
    connected.delete('attic');
    sent = [];
    expect(await syncMachineOnce('attic')).toBe(0);
    expect(sent).toEqual([]);
    expect(conversationSyncedAt('sess-1')).toBe(first);
  });

  it('sends nothing at all while the link is down', async () => {
    oneClaim();
    connected.delete('attic');
    expect(await syncMachineOnce('attic')).toBe(0);
    expect(sent).toEqual([]);
    expect(remoteStoreRecordOf('sess-1')).toBeNull();
  });
});

describe('which sessions a pass copies', () => {
  it('copies at most two in one pass', () => {
    claims = [];
    for (let i = 0; i < 5; i += 1) {
      claims.push({
        sessionId: `sess-${String(i)}`,
        machineId: 'attic',
        generation: 1,
        agent: 'muse',
        conversationId: `conv-${String(i)}`,
        storePath: `/store/${String(i)}/session.jsonl`,
        storeRoot: '/store',
        at: Date.now()
      });
    }
    expect(chooseSyncTargets('attic')).toHaveLength(REMOTE_STORE_SYNC_PER_PASS);
  });

  it('copies only sessions on the machine being asked', () => {
    oneClaim();
    claims.push({ ...(claims[0] as (typeof claims)[0]), sessionId: 'other', machineId: 'loft' });
    expect(chooseSyncTargets('attic').map((one) => one.sessionId)).toEqual(['sess-1']);
  });

  it('puts the oldest copy first', async () => {
    oneClaim('sess-a');
    answer = () => copyAnswer('a');
    await syncMachineOnce('attic');
    claims.push({ ...(claims[0] as (typeof claims)[0]), sessionId: 'sess-b' });
    // sess-b has never been copied, and zero is older than any instant.
    expect(chooseSyncTargets('attic').map((one) => one.sessionId)).toEqual([
      'sess-b',
      'sess-a'
    ]);
  });
});

describe('pruning', () => {
  it('removes nothing while the machine is under its cap', async () => {
    oneClaim();
    answer = () => copyAnswer('small');
    await syncMachineOnce('attic');
    expect(pruneMachine('attic')).toBe(0);
    expect(conversationSyncedAt('sess-1')).not.toBeNull();
  });

  it('reports what it holds', async () => {
    oneClaim();
    answer = () => copyAnswer('a conversation');
    await syncMachineOnce('attic');
    const facts = remoteStoreSyncFacts();
    expect(facts.records).toBe(1);
    expect(facts.copied).toBe(1);
    expect(facts.commandsSent).toBe(1);
    expect(facts.running).toBe(false);
  });
});
