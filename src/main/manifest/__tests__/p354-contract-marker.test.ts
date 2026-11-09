/**
 * Phase 353, entry Phase 354 mechanism 2 (build/p353/SPEC.md D354-4): the marker that tells a row this build created
 * from a row created before it.
 *
 * Nothing else on a row says whether its pane really started in its folder. Before this phase tmux read a folder
 * holding a `#` it expands, or ending in `;`, as another folder, so such a pane started in HOME and its agent filed
 * the conversation there; a restore that moves that row into its folder opens pi EMPTY under the same id. So every
 * row this build creates says, in its recovery contract, that its folder was held back (`folderHeld: true`), and a
 * restore reads the ABSENCE of it (`folderAsRecordedFor`, restore.ts; p354-folder-as-recorded.test.ts holds that).
 *
 * The contract rides the `agent_contract` JSON column, whose codec passes a field it does not know straight through
 * (./contract.ts), so the marker needs no migration and no version bump, and an older build that touches the row for
 * an unrelated reason keeps it. Held here: every launchable agent's contract and a shell's carry it, the far
 * create's row carries it, it survives the column both ways and an unrelated write, and a row written without it
 * reads back without it, never with one filled in.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchableAgentKind } from '@shared/types';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.0.0-p354' },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const { ManifestStore } = await import('../store');
const { buildRecoveryContract, SESSION_CONTRACT_VERSION } = await import('../agents');
const { parseAgentContract, serializeAgentContract } = await import('../contract');
const { LAUNCHABLE_AGENT_IDS } = await import('../../agents/registry');
const { setRemoteManifest, writeRemoteRow } = await import('../../machines/remote-record');

type Store = InstanceType<typeof ManifestStore>;

const INPUT = { bin: '/opt/p354/bin/agent', cwdReal: '/w/C#Tools', projectReal: '/w', agentVersion: null, at: 1 };

let dir = '';
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-p354-marker-'));
  userData = dir;
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function insert(id: string, contract: ReturnType<typeof buildRecoveryContract> | undefined): void {
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w/C#Tools',
    agent: 'pi' as never,
    status: 'running',
    createdAt: 1,
    lastSeen: 1,
    argv: ['/opt/p354/bin/pi'],
    ...(contract === undefined ? {} : { agentContract: contract })
  });
}

describe('every row this build creates says its folder was held back', () => {
  it('a plain shell and every launchable agent, compiled from the registry', () => {
    expect(buildRecoveryContract('shell', INPUT).folderHeld).toBe(true);
    expect(LAUNCHABLE_AGENT_IDS.length).toBeGreaterThan(10);
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const contract = buildRecoveryContract(id as LaunchableAgentKind, INPUT);
      expect(contract.folderHeld, id).toBe(true);
      // No version moved: the field rides the shape version 1 every reader already knows.
      expect(contract.v, id).toBe(SESSION_CONTRACT_VERSION);
    }
    expect(SESSION_CONTRACT_VERSION).toBe(1);
  });

  it("the far create's row, written before its create line", () => {
    setRemoteManifest(store);
    writeRemoteRow({
      sessionId: 'far-1',
      machineId: 'studio',
      name: 'far',
      tmuxName: 'far',
      projectPath: '/srv/w',
      cwd: '/srv/w/C#Tools',
      agent: 'claude',
      argv: ['/opt/homebrew/bin/claude'],
      bin: '/opt/homebrew/bin/claude',
      createdAt: 1
    });
    expect(store.getSession('far-1')?.agentContract?.folderHeld).toBe(true);
  });
});

describe('the marker rides the column every build passes through', () => {
  it('survives serialize and parse, and a row read back from the store', () => {
    const contract = buildRecoveryContract('pi', INPUT);
    const parsed = parseAgentContract(serializeAgentContract(contract));
    expect(parsed?.folderHeld).toBe(true);
    expect(parsed).toEqual(contract);
    insert('held', contract);
    store.close();
    store = new ManifestStore(join(dir, 'manifest.db'));
    expect(store.getSession('held')?.agentContract?.folderHeld).toBe(true);
  });

  it("survives an older build's pass-through: a codec that knows no such field keeps it, beside one it never saw", () => {
    const newer = { ...buildRecoveryContract('pi', INPUT), aFieldALaterBuildAdds: 7 };
    // The older codec is the same rule: it checks `v` and `requiresOriginalCwd` and hands the object back whole.
    const passed = parseAgentContract(JSON.stringify(newer)) as unknown as Record<string, unknown>;
    expect(passed['folderHeld']).toBe(true);
    expect(passed['aFieldALaterBuildAdds']).toBe(7);
    expect(serializeAgentContract(passed as never)).toBe(JSON.stringify(newer));
  });

  it('survives an unrelated write to the same row', () => {
    insert('renamed', buildRecoveryContract('pi', INPUT));
    store.renameSession('renamed', 'a new name', 'a-new-name');
    store.updateSession('renamed', { lastSeen: 2 });
    expect(store.getSession('renamed')?.agentContract?.folderHeld).toBe(true);
  });

  it('a row written before this phase reads back WITHOUT it, and nothing fills one in', () => {
    const before = { ...buildRecoveryContract('pi', INPUT) } as Record<string, unknown>;
    delete before['folderHeld'];
    insert('before', before as never);
    insert('no-contract', undefined);
    store.renameSession('before', 'renamed', 'renamed');
    expect(store.getSession('before')?.agentContract).toBeDefined();
    expect(store.getSession('before')?.agentContract?.folderHeld).toBeUndefined();
    expect(store.getSession('no-contract')?.agentContract).toBeUndefined();
  });
});
