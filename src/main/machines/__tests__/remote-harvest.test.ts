/**
 * Phase 73 — the pass that reads an agent's own store on a machine.
 *
 * The door, the feed, the manifest and the connection are all replaced here, so
 * what these tests hold is the SHAPE of the pass rather than the behaviour of
 * ssh: one pass in flight per machine, at most six sessions in a pass, at most
 * three record reads per session, nothing at all while the link is down, and a
 * pass that stops between sessions when the connection is replaced.
 *
 * THE TWO CLAIMS A READER SHOULD LOOK FOR HERE, because they are the two the
 * whole rung rests on:
 *
 *  1. A pass over a link that is down produces no claim, and it produces no
 *     read either. The test counts the reads rather than the claims, because
 *     "no claim" is also what a pass that read everything and found nothing
 *     produces, and those are different things.
 *  2. A claim read under one connection is dropped the moment the connection
 *     generation moves, in the same tick, and nothing is written after that.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, that
 * a real store parses, or that the wall clock of a pass is what the numbers in
 * the module say it is. `build/probe-remote-harvest.mjs` measures all three
 * against a scratch sign in server.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

interface FakeRow {
  id: string;
  machineId: string;
  tmuxId: string;
  agent: string;
  cwd: string;
  createdAt: number;
  status: SessionStatus;
}

let rows: FakeRow[] = [];
let connected = new Set<string>();
let generations = new Map<string, number>();
let focused = true;
/** Every script this run sent, in order, as `<id> <args joined by |>`. */
let sent: string[] = [];
let answers = new Map<string, string>();
/** Rows the fake manifest holds, by session id. */
let records = new Map<
  string,
  { agentSessionId?: string; status: SessionStatus; argv: string[] }
>();
let written: {
  sessionId: string;
  conversationId: string;
  key: string;
  keyConfidence: string;
  rivals: number;
  storePath: string;
}[] = [];
/** Runs before every read answers, so a test can cut the link mid pass. */
let beforeRead: (scriptId: string) => void = () => undefined;

// PARTIAL, because `../log` reaches the tmux supervisor, which re-exports
// `localMachineContext` from this same module at load time. Replacing the whole
// module would leave that export undefined and the test file would not load.
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
    beforeRead(scriptId);
    const key = `${scriptId} ${args.join('|')}`;
    const payload = answers.get(key) ?? answers.get(scriptId) ?? 'none';
    return Promise.resolve({ payload, generation: 1, bytes: payload.length });
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => ({
    kind: 'remote',
    machineId,
    sshBin: '/usr/bin/ssh'
  }),
  remotePollIsFocused: () => focused,
  remoteSessions: (): Session[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.id,
      tmuxName: row.id,
      projectPath: row.cwd,
      cwd: row.cwd,
      agent: row.agent as Session['agent'],
      status: row.status,
      createdAt: row.createdAt,
      machine: {
        id: row.machineId,
        label: row.machineId,
        color: 'blue',
        answering: true,
        canRestore: false,
        restoreReason: null
      }
    })),
  remoteSessionRow: (id: string) => rows.find((row) => row.id === id) ?? null
}));

vi.mock('../remote-record', () => ({
  remoteRecordOf: (id: string) => records.get(id) ?? null,
  writeRemoteHarvest: (input: {
    sessionId: string;
    conversationId: string;
    key: string;
    keyConfidence: string;
    rivals: number;
    storePath: string;
  }) => {
    written.push({ ...input });
    return { id: input.sessionId };
  }
}));

import {
  chooseHarvestTargets,
  dropClaimsOfMovedConnections,
  harvestEveryMachine,
  harvestMachineOnce,
  remoteHarvestClaims,
  remoteHarvestFacts,
  resetRemoteHarvestForTests,
  setRemoteHarvestFactsForHarness,
  REMOTE_HARVEST_PER_PASS
} from '../remote-harvest';

const HOME = '/home/greg';
const MUSE_ROOT = `${HOME}/.local/share/muse/sessions`;
const UUID = '11111111-2222-4333-8444-555555555555';
const MUSE_RECORD = `${MUSE_ROOT}/2026/08/18/${UUID}/session.jsonl`;

function museHead(pane: string): string {
  const text = [
    JSON.stringify({ payload_type: 'session.open' }),
    JSON.stringify({
      payload_type: 'runtime.session.route_facts',
      payload: { record: { tmux_pane: pane } }
    })
  ].join('\n');
  return Buffer.from(text, 'utf8').toString('base64');
}

function listingLine(path: string, at = Date.now()): string {
  return `${String(Math.floor(at / 1000))} 4096 ${path}`;
}

/** A machine with one muse session on it, ready to answer with one record. */
function oneMuseSession(): void {
  rows = [
    {
      id: 'sess-1',
      machineId: 'attic',
      tmuxId: '$4',
      agent: 'muse',
      cwd: '/work/proj',
      createdAt: Date.now(),
      status: 'running'
    }
  ];
  records.set('sess-1', { status: 'running', argv: ['/usr/local/bin/muse'] });
  connected.add('attic');
  setRemoteHarvestFactsForHarness('attic', {
    home: HOME,
    env: {},
    platform: 'Linux'
  });
  answers.set('machine-facts', `home=${HOME}\nuname=Linux`);
  answers.set(`store-list ${MUSE_ROOT}|5|${floorSeconds()}`, listingLine(MUSE_RECORD));
  answers.set('store-head', museHead('$4:@4.%5'));
}

function floorSeconds(): string {
  const row = rows[0];
  const since = Math.max(0, (row?.createdAt ?? 0) - 8 * 24 * 60 * 60 * 1_000);
  return String(Math.floor(since / 1_000));
}

beforeEach(() => {
  resetRemoteHarvestForTests();
  rows = [];
  connected = new Set();
  generations = new Map();
  focused = true;
  sent = [];
  answers = new Map();
  records = new Map();
  written = [];
  beforeRead = () => undefined;
});

describe('the pass, end to end against a replaced door', () => {
  it('reads one muse record and writes the conversation id', async () => {
    oneMuseSession();
    const count = await harvestMachineOnce('attic');
    expect(count).toBe(1);
    expect(written).toHaveLength(1);
    expect(written[0]?.conversationId).toBe(UUID);
    expect(written[0]?.key).toBe('tmux-pane');
    expect(written[0]?.keyConfidence).toBe('exact');
    expect(written[0]?.rivals).toBe(1);
    expect(written[0]?.storePath).toBe(MUSE_RECORD);
  });

  it('sends a listing then one head read, and nothing else', async () => {
    oneMuseSession();
    await harvestMachineOnce('attic');
    expect(sent.map((one) => one.split(' ')[0])).toEqual([
      'store-list',
      'store-head'
    ]);
  });

  it('writes nothing when the record names another pane', async () => {
    oneMuseSession();
    answers.set('store-head', museHead('$99:@99.%99'));
    expect(await harvestMachineOnce('attic')).toBe(0);
    expect(written).toEqual([]);
    expect(remoteHarvestClaims()).toEqual([]);
  });

  it('writes nothing when the machine has no such store', async () => {
    oneMuseSession();
    answers.delete(`store-list ${MUSE_ROOT}|5|${floorSeconds()}`);
    expect(await harvestMachineOnce('attic')).toBe(0);
    expect(written).toEqual([]);
  });
});

describe('connected only', () => {
  it('sends NOTHING at all while the link is down', async () => {
    oneMuseSession();
    connected.delete('attic');
    expect(await harvestMachineOnce('attic')).toBe(0);
    // The count of READS is what this test holds. "No claim" is also what a
    // pass that read everything and found nothing produces.
    expect(sent).toEqual([]);
    expect(written).toEqual([]);
  });

  it('stops between sessions when the link drops mid pass', async () => {
    oneMuseSession();
    rows.push({
      id: 'sess-2',
      machineId: 'attic',
      tmuxId: '$5',
      agent: 'muse',
      cwd: '/work/proj',
      createdAt: Date.now(),
      status: 'running'
    });
    records.set('sess-2', { status: 'running', argv: ['/usr/local/bin/muse'] });
    beforeRead = () => {
      if (sent.length >= 2) connected.delete('attic');
    };
    await harvestMachineOnce('attic');
    // The first session sent its listing and its one record read. The second
    // session sent nothing, because the link is asked again before each one.
    expect(sent).toEqual([
      `store-list ${MUSE_ROOT}|5|${floorSeconds()}`,
      `store-head ${MUSE_RECORD}|8192`
    ]);
    expect(written.map((one) => one.sessionId)).toEqual(['sess-1']);
  });

  it('drops a claim whose connection generation moved, in the same call', async () => {
    oneMuseSession();
    generations.set('attic', 1);
    await harvestMachineOnce('attic');
    expect(remoteHarvestFacts().claims).toBe(1);
    generations.set('attic', 2);
    expect(dropClaimsOfMovedConnections()).toBe(1);
    expect(remoteHarvestFacts().claims).toBe(0);
  });

  it('writes nothing when the generation moves while a read is in flight', async () => {
    oneMuseSession();
    generations.set('attic', 1);
    beforeRead = (scriptId) => {
      if (scriptId === 'store-head') generations.set('attic', 2);
    };
    expect(await harvestMachineOnce('attic')).toBe(0);
    expect(written).toEqual([]);
    expect(remoteHarvestClaims()).toEqual([]);
  });
});

describe('which sessions a pass asks about', () => {
  function manyRows(count: number, agent = 'muse'): void {
    rows = [];
    for (let i = 0; i < count; i += 1) {
      const id = `sess-${String(i)}`;
      rows.push({
        id,
        machineId: 'attic',
        tmuxId: `$${String(i)}`,
        agent,
        cwd: '/work',
        createdAt: Date.now(),
        status: 'running'
      });
      records.set(id, { status: 'running', argv: ['/usr/local/bin/muse'] });
    }
    connected.add('attic');
  }

  it('asks about at most six in one pass', () => {
    manyRows(10);
    expect(chooseHarvestTargets('attic')).toHaveLength(REMOTE_HARVEST_PER_PASS);
  });

  it('skips a row whose conversation id is already recorded', () => {
    manyRows(3);
    records.set('sess-1', {
      status: 'running',
      agentSessionId: 'already-known',
      argv: ['/usr/local/bin/muse']
    });
    expect(chooseHarvestTargets('attic').map((one) => one.id)).toEqual([
      'sess-0',
      'sess-2'
    ]);
  });

  it('skips a row the machine list no longer holds', () => {
    manyRows(2);
    rows[1] = { ...(rows[1] as FakeRow), status: 'restorable' };
    expect(chooseHarvestTargets('attic').map((one) => one.id)).toEqual(['sess-0']);
  });

  it('skips a tombstoned row', () => {
    manyRows(2);
    records.set('sess-1', { status: 'discarded', argv: [] });
    expect(chooseHarvestTargets('attic').map((one) => one.id)).toEqual(['sess-0']);
  });

  it('skips a row with no record on this Mac', () => {
    manyRows(2);
    records.delete('sess-1');
    expect(chooseHarvestTargets('attic').map((one) => one.id)).toEqual(['sess-0']);
  });

  it('skips every agent a connection cannot read', () => {
    manyRows(2, 'qwen');
    expect(chooseHarvestTargets('attic')).toEqual([]);
    manyRows(2, 'claude');
    expect(chooseHarvestTargets('attic')).toEqual([]);
    manyRows(2, 'shell');
    expect(chooseHarvestTargets('attic')).toEqual([]);
  });
});

describe('the cadence', () => {
  it('does not ask the same machine twice inside one window', async () => {
    oneMuseSession();
    await harvestEveryMachine();
    const after = sent.length;
    await harvestEveryMachine();
    expect(sent.length).toBe(after);
  });

  it('reports what it has done', async () => {
    oneMuseSession();
    await harvestMachineOnce('attic');
    const facts = remoteHarvestFacts();
    expect(facts.machines).toBe(1);
    expect(facts.claims).toBe(1);
    expect(facts.commandsSent).toBe(2);
    expect(facts.bytesRead).toBeGreaterThan(0);
    expect(facts.running).toBe(false);
  });
});
