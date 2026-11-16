/**
 * Phase 368 (build/p368/SPEC.md D2, D3): a session on another machine is made
 * at the size it will be shown, by `-x` and `-y` on that machine's own
 * `new-session` line, on a create and on a restore.
 *
 * WHAT WAS WRONG. The far create passed no size, so a session there was made
 * at that machine's tmux default of 80 by 24, and its first attach was one size
 * change for the program in it, as on this Mac (research 145 section 3.2).
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a recorder that
 * answers with text a machine printed, in `p342-far-names.test.ts`'s shape and
 * for its reason: every property below is about what Tortie SENDS. Every
 * expected argv is written by hand from D3: `-x <cols> -y <rows>` directly
 * after `-s <name>`, and nothing without a size, so a create or restore with
 * none sends what it sent at the parent.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

const MACHINE = 'p368-far';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: MACHINE,
  sshBin: '/usr/bin/ssh',
  host: 'p368-far.example.invalid',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p368-unit',
  controlPath: '/tmp/tortie-501/m-p368far',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

const world = vi.hoisted(() => ({
  /** Every argv the exec plane was handed, in order. */
  sent: [] as string[][],
  /** What a verb answers. A function sees the argv. */
  answers: {} as Record<string, string | ((args: readonly string[]) => string)>,
  /** The uuid the last create put on its own new-session line. */
  createdUuid: '',
  /** The manifest rows the record module answers with. */
  rows: new Map<string, Record<string, unknown>>()
}));

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../exec-plane')>()),
  execOn: (_ctx: unknown, args: readonly string[]) => {
    world.sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      world.createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    const answer = world.answers[args[0] ?? ''];
    if (typeof answer === 'function') return Promise.resolve(answer(args));
    return Promise.resolve(answer ?? '');
  },
  execRemoteShell: () => Promise.resolve('__TORTIE_PATH__/usr/bin:/bin__TORTIE_PATH__')
}));

/** The control client, replaced so nothing spawns. */
class FakeControlClient extends EventEmitter {
  connected = false;
  constructor(readonly transport: { machineId: string }) {
    super();
  }
  start(): Promise<void> {
    return Promise.resolve();
  }
  stop(): void {
    this.connected = false;
  }
}

vi.mock('../../tmux/control-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/control-client')>()),
  TmuxControlClient: FakeControlClient
}));

vi.mock('../control-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../control-plane')>()),
  isControlPlaneLive: () => false
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => false,
  noteRemoteRowSeen: () => undefined,
  writeRemoteRow: (input: Record<string, unknown>) => {
    world.rows.set(String(input['sessionId']), {
      ...input,
      id: input['sessionId'],
      status: 'running'
    });
    return null;
  },
  remoteRecordOf: (id: string) => world.rows.get(id) ?? null,
  remoteRecordsForMachine: (machineId: string) =>
    [...world.rows.values()].filter((one) => one['machineId'] === machineId),
  unconfirmedRemoteRecords: () => [],
  markRemoteCreateUnconfirmed: () => undefined,
  remoteManifest: () => ({
    deleteSession: (id: string) => world.rows.delete(id),
    renameSession: () => undefined,
    updateSession: () => undefined
  })
}));

vi.mock('../../restore/snapshots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../restore/snapshots')>()),
  readCapsules: () => [],
  savedSnapshotLines: () => 10_000,
  savedOutputAt: () => null,
  storeCapsuleText: () => Promise.resolve(true)
}));

// The restore's gate offers every restore here, and its feed start is a no-op.
vi.mock('../remote-sessions', async (importOriginal) => {
  const original = await importOriginal<typeof import('../remote-sessions')>();
  return {
    ...original,
    remoteRestoreVerdictFor: () => ({ offered: true, reason: null, refusal: null }),
    startMachineFeed: () => Promise.resolve()
  };
});

const { remoteCreate, remoteCreateArgs, resetRemoteSessionsForTests } = await import(
  '../remote-sessions'
);
const { resetControlPlanesForTests } = await import('../control-plane');
const { resetRescueForTests } = await import('../pane-env-rescue');
const { restoreRemoteSession } = await import('../remote-restore');
const { resetFarTmuxForTests } = await import('../far-tmux');

const SID = '00000000-0000-4000-8000-000000000368';

beforeEach(() => {
  world.sent = [];
  world.answers = {};
  world.createdUuid = '';
  world.rows = new Map();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetFarTmuxForTests();
});

afterEach(() => {
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetFarTmuxForTests();
});

/** tmux's own `#{q:...}` quoting, as `./remote-sessions.test.ts` measured it on 3.6a. */
function quoteField(value: string): string {
  return value.replace(/([ \\"'$;])/g, '\\$1');
}

/** One list line in the shipped format, for the session the create stamped. */
function listedBack(gmuxId: string): string {
  return ['$4', '1700000000', '1700000100', '0', gmuxId, 'shell', 'work', '/srv/repo', '/srv/repo', 'work']
    .map(quoteField)
    .join(' ');
}

/** The pair after `-s <name>`, or the two elements there when there is none. */
function afterName(args: readonly string[]): string[] {
  const at = args.indexOf('-s');
  return args.slice(at, at + 6);
}

// ---------------------------------------------------------------------------
// 1. The pure composition
// ---------------------------------------------------------------------------

describe('remoteCreateArgs puts -x and -y directly after the name (D3)', () => {
  const base = { tmuxName: 'work', cwd: '/srv/repo', sessionId: SID, argv: ['/usr/bin/zsh'] };

  it('with a size', () => {
    const args = remoteCreateArgs({ ...base, size: { cols: 124, rows: 39 } });
    expect(afterName(args)).toEqual(['-s', 'work', '-x', '124', '-y', '39']);
    expect(args[args.indexOf('-y') + 2]).toBe('-c');
  });

  it('without one: byte for byte the parent’s line', () => {
    const without = remoteCreateArgs(base);
    expect(without).not.toContain('-x');
    expect(without).not.toContain('-y');
    // The line with a size is the line without one plus exactly the four.
    const with4 = remoteCreateArgs({ ...base, size: { cols: 124, rows: 39 } });
    const at = with4.indexOf('-x');
    expect([...with4.slice(0, at), ...with4.slice(at + 4)]).toEqual(without);
  });

  it('both bounds are sizes, and anything past them sends neither', () => {
    expect(afterName(remoteCreateArgs({ ...base, size: { cols: 2, rows: 1 } }))).toEqual([
      '-s', 'work', '-x', '2', '-y', '1'
    ]);
    expect(afterName(remoteCreateArgs({ ...base, size: { cols: 1000, rows: 500 } }))).toEqual([
      '-s', 'work', '-x', '1000', '-y', '500'
    ]);
    for (const bad of [
      { cols: 1, rows: 1 },
      { cols: 1001, rows: 1 },
      { cols: 2, rows: 0 },
      { cols: 2, rows: 501 },
      { cols: 80.5, rows: 24 }
    ]) {
      const args = remoteCreateArgs({ ...base, size: bad });
      expect([bad, args.includes('-x') || args.includes('-y')]).toEqual([bad, false]);
    }
  });

  it('a size rides beside every other field, the shell variable slot included', () => {
    const args = remoteCreateArgs({
      ...base,
      envNames: ['ANTHROPIC_API_KEY'],
      size: { cols: 97, rows: 39 }
    });
    expect(afterName(args)).toEqual(['-s', 'work', '-x', '97', '-y', '39']);
    expect(args.slice(-2)).toEqual(['--', '/usr/bin/zsh']);
  });
});

// ---------------------------------------------------------------------------
// 2. The create, driven
// ---------------------------------------------------------------------------

describe('the far create sends the size it was handed', () => {
  async function createOne(size?: { cols: number; rows: number }): Promise<string[]> {
    world.answers['new-session'] = '$4\n';
    // The machine lists back the session the create just stamped, as in
    // `p342-far-names.test.ts`, so the create completes.
    world.answers['list-sessions'] = (args) =>
      args.includes('#{session_id}') || world.createdUuid === '' ? '' : listedBack(world.createdUuid);
    await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      ...(size !== undefined ? { size } : {})
    });
    return world.sent.find((argv) => argv[0] === 'new-session') ?? [];
  }

  it('with a size: -x and -y after the name', async () => {
    expect(afterName(await createOne({ cols: 124, rows: 39 }))).toEqual([
      '-s', 'work', '-x', '124', '-y', '39'
    ]);
  });

  it('without one: neither', async () => {
    const args = await createOne();
    expect(args[0]).toBe('new-session');
    expect(args).not.toContain('-x');
    expect(args).not.toContain('-y');
  });
});

// ---------------------------------------------------------------------------
// 3. The restore, driven
// ---------------------------------------------------------------------------

describe('the far restore sends the size it was handed', () => {
  const ID = 'sess-368';

  function recordRow(): void {
    world.rows.set(ID, {
      id: ID,
      machineId: MACHINE,
      name: 'work',
      tmuxName: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'restorable',
      createdAt: 1_700_000_000_000,
      argv: [],
      lastSeen: 1_700_000_000_000
    });
  }

  function warmMachine(): void {
    world.answers['list-sessions'] = '';
    world.answers['display-message'] = (args) => (args.includes('#{version}') ? '3.6b\n' : '');
    world.answers['new-session'] = '$9\n';
  }

  it('with a size: -x and -y after the name', async () => {
    recordRow();
    warmMachine();
    const outcome = await restoreRemoteSession(ID, { cols: 124, rows: 39 });
    expect(outcome.tmuxId).toBe('$9');
    const create = world.sent.find((argv) => argv[0] === 'new-session') ?? [];
    expect(afterName(create)).toEqual(['-s', 'work', '-x', '124', '-y', '39']);
  });

  it('null, and no second argument at all, which is every caller before this phase: neither', async () => {
    for (const run of [
      () => restoreRemoteSession(ID, null),
      () => restoreRemoteSession(ID)
    ]) {
      world.sent = [];
      recordRow();
      warmMachine();
      await run();
      const create = world.sent.find((argv) => argv[0] === 'new-session') ?? [];
      expect(create[0]).toBe('new-session');
      expect(create).not.toContain('-x');
      expect(create).not.toContain('-y');
    }
  });
});
