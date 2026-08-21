/**
 * Which agents one machine has, held per connection (Phase 109).
 *
 * The chunking and the parse are pure and are tested against the REAL script
 * and the REAL command composer, because the claim that every composed
 * command fits the far side's one argument cap is byte arithmetic and byte
 * arithmetic over a stand in proves the stand in. The scan itself crosses to
 * another computer, so its read door is replaced by a seam that answers with
 * what a real machine printed, which is the instrument ./prepare.test.ts uses
 * and for the same reason. The end to end read is watched by the phase's own
 * live evidence against a real machine.
 *
 * The rules these tests hold:
 *
 *  - ONLY a positive absent is stored as absent. A failed home read, a failed
 *    chunk and an unreadable folder all leave `unknown`, which draws as
 *    selectable.
 *  - An answer is bound to the connection generation that produced it. A
 *    generation that moves mid scan drops the answer whole.
 *  - The fold back from a real create teaches the map on both arms.
 *  - A forgotten machine leaves nothing behind.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** One launchable row of the kind the merged table holds. */
function tableRow(
  id: string,
  argv0: string,
  probeDirs: string[] = [],
  launchable = true
): {
  id: string;
  launchable: boolean;
  extraProbeDirs: string[];
  launch: { argv: string[] } | null;
} {
  return {
    id,
    launchable,
    extraProbeDirs: probeDirs,
    launch: launchable ? { argv: [argv0] } : null
  };
}

const seam = vi.hoisted(() => ({
  generation: 1,
  remotePath: '/usr/bin:/bin' as string | null,
  registered: true,
  connected: true,
  homeAnswer: { asked: true, home: '/Users/gdc' } as
    | { asked: true; home: string }
    | { asked: false },
  /** One payload per agents-find call, shifted in order. */
  payloads: [] as string[],
  /** Every read that reached the seam: [scriptId, ...args]. */
  reads: [] as string[][],
  /** When true, the generation bumps while a read is in flight. */
  bumpDuringRead: false,
  /** Rows the mocked merged table answers with. */
  table: [] as ReturnType<typeof tableRow>[],
  /** Rows the mocked machines file answers with. */
  machines: [] as { id: string }[]
}));

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: (machineId: string) => {
    if (!seam.registered) {
      throw new Error(`Tortie has not signed in to ${machineId} in this session`);
    }
    return { kind: 'remote', machineId };
  },
  machineGeneration: () => ({
    generation: seam.generation,
    remotePath: seam.remotePath
  })
}));

vi.mock('../remote-image', () => ({
  remoteMachineHomeAnswer: () => Promise.resolve(seam.homeAnswer),
  forgetRemoteMachineHome: () => {}
}));

vi.mock('../../config/store', () => ({
  currentAgentTable: () => seam.table
}));

vi.mock('../store', () => ({
  currentMachines: () => ({ rows: seam.machines })
}));

vi.mock('../remote-run', async (importOriginal) => ({
  // The REAL composer, so every byte the chunker counts is a byte the door
  // would send. Only the wire and the connected gate are replaced.
  ...(await importOriginal<typeof import('../remote-run')>()),
  assertMachineIsConnected: (machineId: string, what: string) => {
    if (!seam.connected) {
      throw new Error(`refused "${what}" for machine ${machineId}`);
    }
  },
  runRemoteRead: (
    _ctx: unknown,
    scriptId: string,
    args: readonly string[]
  ) => {
    seam.reads.push([scriptId, ...args]);
    if (seam.bumpDuringRead) seam.generation += 1;
    const payload = seam.payloads.shift();
    if (payload === undefined) {
      return Promise.reject(new Error(`no payload staged for ${scriptId}`));
    }
    return Promise.resolve({
      payload,
      generation: seam.generation,
      bytes: payload.length
    });
  }
}));

const {
  REMOTE_AGENTS_TIMEOUT_MS,
  chunkAgentRecords,
  composeAgentRecord,
  forgetMachineAgents,
  machineAgentsView,
  allMachineAgentsViews,
  noteMachineAgent,
  onMachineAgentsChanged,
  parseAgentsFind,
  scanMachineAgents
} = await import('../machine-agents');
const { REMOTE_SCRIPT_MAX_BYTES, remoteScript } = await import(
  '../remote-scripts'
);
// The REAL bump, through the partial mock's importOriginal spread, so the
// fix round's rule that a bump pushes a change is proven against the real
// listener wiring rather than a stand in.
const { bumpMachineGeneration } = await import('../context');
const { composeRemoteScriptCommand } = await import('../remote-run');
const { AGENT_REGISTRY } = await import('../../agents/registry');

const SCRIPT = ((): NonNullable<ReturnType<typeof remoteScript>> => {
  const found = remoteScript('agents-find');
  if (found === null) throw new Error('agents-find is not in the catalogue');
  return found;
})();

/** What one composed command really measures, in bytes. */
function composedBytes(
  records: readonly string[],
  loginPath: string,
  shared: string
): number {
  return Buffer.byteLength(
    composeRemoteScriptCommand(SCRIPT, [loginPath, shared, records.join('\n')]),
    'utf8'
  );
}

beforeEach(() => {
  seam.generation = 1;
  seam.remotePath = '/usr/bin:/bin';
  seam.registered = true;
  seam.connected = true;
  seam.homeAnswer = { asked: true, home: '/Users/gdc' };
  seam.payloads = [];
  seam.reads = [];
  seam.bumpDuringRead = false;
  seam.table = [
    tableRow('claude', 'claude', ['~/.claude/local']),
    tableRow('codex', 'codex', ['$NVM_BIN', '~/.nvm/versions/node/*/bin']),
    tableRow('cursoride', 'cursor', [], false),
    tableRow('homegrown', '/opt/tools/homegrown')
  ];
  seam.machines = [{ id: 'm1' }];
  forgetMachineAgents('m1');
  forgetMachineAgents('m2');
});

// ---------------------------------------------------------------------------
// The record and the chunking, pure and against the real composer
// ---------------------------------------------------------------------------

describe('composeAgentRecord', () => {
  it('is the name, one space, and the rebased folders joined with colons', () => {
    expect(
      composeAgentRecord('claude', ['~/.claude/local', '/opt/x'], '/Users/gdc')
    ).toBe('claude /Users/gdc/.claude/local:/opt/x');
  });

  it('is the bare name when no folder survives the plain folder rules', () => {
    expect(
      composeAgentRecord('codex', ['$NVM_BIN', '~/.nvm/versions/node/*/bin'], '/u')
    ).toBe('codex');
  });

  it('drops a folder holding a colon, because colons join the list', () => {
    expect(composeAgentRecord('grok', ['/opt/a:b', '/opt/c'], '/u')).toBe(
      'grok /opt/c'
    );
  });

  it('names one folder once, however many entries hold it', () => {
    expect(
      composeAgentRecord('pi', ['~/.local/bin', '~/.local/bin'], '/Users/gdc')
    ).toBe('pi /Users/gdc/.local/bin');
  });
});

describe('chunkAgentRecords', () => {
  /** A login list the size a real machine states. */
  const LOGIN = ['/usr/bin', '/bin', '/usr/sbin', '/sbin', '/opt/homebrew/bin']
    .join(':');
  const SHARED = '/Users/gdc/.local/bin:/opt/homebrew/bin:/usr/local/bin';

  it('packs the whole compiled table into ONE chunk, measured in bytes', () => {
    // The real registry, the real script, the real composer. Research 58
    // measured 1,703 bytes for this shape, being 1.3 % of the cap, so the
    // loop must never split it.
    const launchable = AGENT_REGISTRY.filter(
      (entry) => entry.launchable && entry.launch !== null
    );
    expect(launchable.length).toBe(11);
    const records = launchable.map((entry) =>
      composeAgentRecord(
        entry.launch?.argv[0] ?? '',
        entry.extraProbeDirs,
        '/Users/gdc'
      )
    );
    const { chunks, oversize } = chunkAgentRecords(SCRIPT, records, LOGIN, SHARED);
    expect(oversize).toEqual([]);
    expect(chunks).toHaveLength(1);
    const bytes = composedBytes(chunks[0] ?? [], LOGIN, SHARED);
    expect(bytes).toBeLessThan(8192);
    expect(bytes).toBeLessThanOrEqual(REMOTE_SCRIPT_MAX_BYTES);
  });

  it('splits a full overlay into more than one chunk, each under the cap', () => {
    // OVERLAY_LIMITS allows 32 rows with 16 folders of 512 characters, whose
    // file cap of 262,144 bytes exceeds the 131,072 byte command cap. The
    // loop exists for exactly this configuration.
    const records: string[] = [];
    for (let row = 0; row < 32; row += 1) {
      const dirs: string[] = [];
      for (let dir = 0; dir < 16; dir += 1) {
        const stem = `/overlay-${String(row)}-${String(dir)}-`;
        dirs.push(stem + 'x'.repeat(512 - stem.length));
      }
      records.push(`agent-${String(row)} ${dirs.join(':')}`);
    }
    const { chunks, oversize } = chunkAgentRecords(SCRIPT, records, LOGIN, SHARED);
    expect(oversize).toEqual([]);
    expect(chunks.length).toBeGreaterThan(1);
    let carried = 0;
    for (const chunk of chunks) {
      expect(composedBytes([...chunk], LOGIN, SHARED)).toBeLessThanOrEqual(
        REMOTE_SCRIPT_MAX_BYTES
      );
      carried += chunk.length;
    }
    expect(carried).toBe(32);
  });

  it('sets aside a record that alone exceeds the cap rather than sending it', () => {
    const monster = `big ${'/x'.repeat(REMOTE_SCRIPT_MAX_BYTES)}`;
    const { chunks, oversize } = chunkAgentRecords(
      SCRIPT,
      ['claude /Users/gdc/.claude/local', monster],
      LOGIN,
      SHARED
    );
    expect(oversize).toEqual([monster]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(['claude /Users/gdc/.claude/local']);
  });
});

// ---------------------------------------------------------------------------
// The parse, pure
// ---------------------------------------------------------------------------

describe('parseAgentsFind', () => {
  const ASKED = new Set(['claude', 'cursor-agent', 'codex', 'grok']);

  it('reads all four sources', () => {
    const parsed = parseAgentsFind(
      [
        'path claude /usr/local/bin/claude',
        'agent cursor-agent /Users/gdc/.cursor/bin/cursor-agent',
        'install codex /Users/gdc/.local/bin/codex',
        'none grok none'
      ].join('\n'),
      ASKED
    );
    expect(parsed.byName.get('claude')).toEqual({
      presence: 'present',
      path: '/usr/local/bin/claude'
    });
    expect(parsed.byName.get('cursor-agent')).toEqual({
      presence: 'present',
      path: '/Users/gdc/.cursor/bin/cursor-agent'
    });
    expect(parsed.byName.get('codex')).toEqual({
      presence: 'present',
      path: '/Users/gdc/.local/bin/codex'
    });
    expect(parsed.byName.get('grok')).toEqual({ presence: 'absent', path: null });
    expect(parsed.downgraded).toBe(0);
  });

  it('keeps a path that holds a space whole', () => {
    // The source and the name are the first two fields; the path is THE REST
    // OF THE LINE, because a folder on another computer can hold a space.
    const parsed = parseAgentsFind(
      'path claude /Users/gdc/my tools/claude',
      ASKED
    );
    expect(parsed.byName.get('claude')?.path).toBe('/Users/gdc/my tools/claude');
  });

  it('downgrades every none to unknown when any folder was unreadable', () => {
    // An absent computed while a folder on the search list could not be read
    // is not a positive absent. A found path stays present, because a find is
    // its own proof.
    const parsed = parseAgentsFind(
      [
        'path claude /usr/local/bin/claude',
        'none codex none',
        'none grok none',
        'unreadable',
        '/Users/gdc/.local/bin'
      ].join('\n'),
      ASKED
    );
    expect(parsed.unreadable).toEqual(['/Users/gdc/.local/bin']);
    expect(parsed.downgraded).toBe(2);
    expect(parsed.byName.get('claude')?.presence).toBe('present');
    expect(parsed.byName.has('codex')).toBe(false);
    expect(parsed.byName.has('grok')).toBe(false);
  });

  it('drops a name that was not asked rather than believing it', () => {
    const parsed = parseAgentsFind('path rm /usr/bin/rm', ASKED);
    expect(parsed.byName.size).toBe(0);
  });

  it('drops a present whose path is not absolute', () => {
    const parsed = parseAgentsFind('path claude claude', ASKED);
    expect(parsed.byName.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The scan, over the seam
// ---------------------------------------------------------------------------

describe('scanMachineAgents', () => {
  it('stores the machine answer and the view reads it back per agent id', async () => {
    seam.payloads = ['path claude /usr/local/bin/claude\nnone codex none\n'];
    await scanMachineAgents('m1');
    const view = machineAgentsView('m1');
    expect(view.machineId).toBe('m1');
    expect(view.askedAt).not.toBeNull();
    const byId = new Map(view.agents.map((one) => [one.agentId, one]));
    expect(byId.get('claude')).toEqual({
      agentId: 'claude',
      presence: 'present',
      path: '/usr/local/bin/claude'
    });
    expect(byId.get('codex')).toEqual({
      agentId: 'codex',
      presence: 'absent',
      path: null
    });
    // The configured agent with an absolute path was skipped, never asked.
    expect(byId.get('homegrown')?.presence).toBe('unknown');
    // The watcher row is not launchable and is not in the view at all.
    expect(byId.has('cursoride')).toBe(false);
  });

  it('asks with one batched read and the timeout every short read gets', async () => {
    seam.payloads = ['none claude none\nnone codex none\n'];
    await scanMachineAgents('m1');
    expect(seam.reads).toHaveLength(1);
    expect(seam.reads[0]?.[0]).toBe('agents-find');
    // The records: claude with its rebased folder, codex bare because both
    // of its entries are refused by the plain folder rules.
    expect(seam.reads[0]?.[3]).toBe('claude /Users/gdc/.claude/local\ncodex');
    expect(REMOTE_AGENTS_TIMEOUT_MS).toBe(10_000);
  });

  it('writes NOTHING when the home could not be asked, and asks no further', async () => {
    // Fix 3's teeth. A failed facts read used to narrow the search to two
    // folders and report absent for agents installed under the home.
    seam.homeAnswer = { asked: false };
    const view = await scanMachineAgents('m1');
    expect(seam.reads).toHaveLength(0);
    for (const one of view.agents) expect(one.presence).toBe('unknown');
    expect(view.askedAt).toBeNull();
  });

  it('drops the whole answer when the generation moves mid scan', async () => {
    // A Prepare landed while the scan ran. The fresh Prepare starts its own
    // scan, and an answer from a connection Tortie no longer has says nothing
    // about the one it has now.
    seam.payloads = ['path claude /usr/local/bin/claude\nnone codex none\n'];
    seam.bumpDuringRead = true;
    const view = await scanMachineAgents('m1');
    for (const one of view.agents) expect(one.presence).toBe('unknown');
    expect(view.askedAt).toBeNull();
  });

  it('refuses a machine that is not answering, so Rescan reads a sentence', async () => {
    seam.connected = false;
    await expect(scanMachineAgents('m1')).rejects.toThrow(/refused "agents-find"/);
    expect(seam.reads).toHaveLength(0);
  });

  it('refuses this Mac and a machine with no captured program list', async () => {
    await expect(scanMachineAgents('local')).rejects.toThrow(/not signed in/);
    seam.remotePath = null;
    await expect(scanMachineAgents('m1')).rejects.toThrow(/not signed in/);
    expect(seam.reads).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The fold back, the staleness rule and the forget
// ---------------------------------------------------------------------------

describe('noteMachineAgent', () => {
  it('teaches the map a found path, with no scan having run', () => {
    noteMachineAgent('m1', 'claude', { path: '/opt/homebrew/bin/claude' });
    const byId = new Map(
      machineAgentsView('m1').agents.map((one) => [one.agentId, one])
    );
    expect(byId.get('claude')).toEqual({
      agentId: 'claude',
      presence: 'present',
      path: '/opt/homebrew/bin/claude'
    });
    expect(byId.get('codex')?.presence).toBe('unknown');
  });

  it('teaches the map a positive absent on the refusal arm', () => {
    noteMachineAgent('m1', 'codex', null);
    const byId = new Map(
      machineAgentsView('m1').agents.map((one) => [one.agentId, one])
    );
    expect(byId.get('codex')).toEqual({
      agentId: 'codex',
      presence: 'absent',
      path: null
    });
  });

  it('overwrites a scan answer, because what ran is stronger evidence', async () => {
    seam.payloads = ['none claude none\nnone codex none\n'];
    await scanMachineAgents('m1');
    noteMachineAgent('m1', 'claude', { path: '/usr/local/bin/claude' });
    const byId = new Map(
      machineAgentsView('m1').agents.map((one) => [one.agentId, one])
    );
    expect(byId.get('claude')?.presence).toBe('present');
    expect(byId.get('codex')?.presence).toBe('absent');
  });

  it('notifies its listeners, the way the overlay registry does', () => {
    let pushed = 0;
    const off = onMachineAgentsChanged(() => {
      pushed += 1;
    });
    noteMachineAgent('m1', 'claude', null);
    off();
    noteMachineAgent('m1', 'claude', null);
    expect(pushed).toBe(1);
  });
});

describe('the generation rule on the held answer', () => {
  it('reads a held answer as unknown once the generation moved', async () => {
    seam.payloads = ['path claude /usr/local/bin/claude\nnone codex none\n'];
    await scanMachineAgents('m1');
    expect(
      machineAgentsView('m1').agents.find((one) => one.agentId === 'claude')
        ?.presence
    ).toBe('present');
    seam.generation += 1;
    const stale = machineAgentsView('m1');
    for (const one of stale.agents) expect(one.presence).toBe('unknown');
    expect(stale.askedAt).toBeNull();
  });

  it('pushes a change on the bump itself, so an open sheet drops the dead answer', () => {
    // Phase 109 fix round. MEASURED before the fix: after a failed Prepare,
    // main answered all unknown while the open create sheet still greyed
    // tiles from the dead connection's answer, because nothing pushed
    // machines:agentsChanged at the bump. The bump is the moment the held
    // answer stops being true, so it must notify.
    let pushed = 0;
    const off = onMachineAgentsChanged(() => {
      pushed += 1;
    });
    bumpMachineGeneration('m1');
    off();
    bumpMachineGeneration('m1');
    expect(pushed).toBe(1);
  });
});

describe('forgetMachineAgents', () => {
  it('leaves nothing behind for a removed machine', () => {
    noteMachineAgent('m1', 'claude', { path: '/usr/local/bin/claude' });
    forgetMachineAgents('m1');
    const view = machineAgentsView('m1');
    expect(view.askedAt).toBeNull();
    for (const one of view.agents) expect(one.presence).toBe('unknown');
  });

  it('is what the whole map view stops naming after a removal', () => {
    noteMachineAgent('m1', 'claude', null);
    seam.machines = [];
    expect(allMachineAgentsViews()).toEqual([]);
  });
});
