/**
 * The Context store decides what to read from a PAIR, being the machine and the
 * folder (Phase 90.1).
 *
 * The defect these tests exist for: `syncProject` compared a path string, so
 * switching between two tabs that hold the same path on two machines left the
 * skills, servers and hooks of the first machine on screen under the second
 * machine's name. Nothing errored and nothing looked broken.
 *
 * The same six transitions the search store is driven through. `L1` and `L2`
 * are two folders on this Mac. `R` is `L1`'s path on machine `p901`. `R2` is
 * the same path again on machine `p902`. The count that matters is the number
 * of configuration reads.
 *
 * One case here is about a person rather than about a machine: the storage key
 * for a project on this Mac is unchanged, so an agent choice made in an older
 * build is still found after the upgrade.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTarget } from '@shared/workspace-target';

/** Every folder the store asked to have read, in order. */
let scans: string[] = [];
/** A real map, so the agent key can be read back byte for byte. */
const storage = new Map<string, string>();

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    context: {
      scan: (input: { cwd: string }) => {
        scans.push(input.cwd);
        return Promise.resolve({
          entries: [],
          agents: [],
          problems: [],
          cwd: input.cwd,
          scannedAt: 0,
          durationMs: 0,
          truncated: false
        });
      }
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  }
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useContext } = await import('../store');

const L1: WorkspaceTarget = { machineId: 'local', path: '/l1' };
const L2: WorkspaceTarget = { machineId: 'local', path: '/l2' };
const R: WorkspaceTarget = { machineId: 'p901', path: '/l1' };
const R2: WorkspaceTarget = { machineId: 'p902', path: '/l1' };

function fresh(target: WorkspaceTarget): WorkspaceTarget {
  return { machineId: target.machineId, path: target.path };
}

const store = (): ReturnType<typeof useContext.getState> =>
  useContext.getState();

/** Switch, then let the read's promise settle. */
async function switchTo(target: WorkspaceTarget | null): Promise<void> {
  store().syncProject(target);
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  scans = [];
  storage.clear();
  useContext.setState({
    target: null,
    status: 'idle',
    scan: null,
    error: null,
    agentId: null,
    filter: '',
    mode: 'browse',
    sessionId: null,
    sessionName: null,
    pins: new Map(),
    epoch: 0
  });
});

describe('the six transitions', () => {
  it('1. none to L1 reads once, on L1', async () => {
    await switchTo(L1);
    expect(scans).toEqual(['/l1']);
    expect(store().status).toBe('ready');
  });

  it('2. L1 to L2 reads once more, on L2', async () => {
    await switchTo(L1);
    await switchTo(L2);
    expect(scans).toEqual(['/l1', '/l2']);
  });

  it('3. L1 to R re-targets, clears, and reads NOTHING. This is the defect', async () => {
    await switchTo(L1);
    scans = [];

    await switchTo(R);

    expect(store().target).toEqual(R);
    expect(scans).toEqual([]);
    expect(store().scan).toBeNull();
    expect(store().status).toBe('elsewhere');
  });

  it('4. R to L1 reads once, on L1', async () => {
    await switchTo(R);
    scans = [];
    await switchTo(L1);
    expect(scans).toEqual(['/l1']);
    expect(store().status).toBe('ready');
  });

  it('5. R to R2 re-targets and still reads nothing', async () => {
    await switchTo(R);
    scans = [];
    await switchTo(R2);
    expect(store().target).toEqual(R2);
    expect(scans).toEqual([]);
    expect(store().status).toBe('elsewhere');
  });

  it('6. L1 to L1, by a fresh but equal object, does nothing at all', async () => {
    await switchTo(L1);
    scans = [];
    let notifications = 0;
    const stop = useContext.subscribe(() => {
      notifications += 1;
    });

    for (let i = 0; i < 50; i += 1) store().syncProject(fresh(L1));
    await Promise.resolve();
    stop();

    expect(notifications).toBe(0);
    expect(scans).toEqual([]);
  });
});

describe('refresh', () => {
  it('reads again for a folder on this Mac', async () => {
    await switchTo(L1);
    scans = [];
    store().refresh();
    await Promise.resolve();
    expect(scans).toEqual(['/l1']);
  });

  it('reads nothing for a project on another machine', async () => {
    await switchTo(R);
    scans = [];
    store().refresh();
    await Promise.resolve();
    expect(scans).toEqual([]);
  });
});

describe('the remembered agent choice', () => {
  it('finds a choice an older build wrote, because the key did not move', async () => {
    // Exactly what a build before Phase 90.1 wrote for `/l1`.
    storage.set('gmux.context.agent./l1', 'claude');

    await switchTo(L1);

    expect(store().agentId).toBe('claude');
  });

  it('writes a project on this Mac back to that same key', async () => {
    await switchTo(L1);
    store().setAgent('codex');
    expect(storage.get('gmux.context.agent./l1')).toBe('codex');
  });

  it('keys a project on another machine apart from the one on this Mac', async () => {
    await switchTo(L1);
    store().setAgent('codex');
    await switchTo(R);
    store().setAgent('claude');

    expect(storage.get('gmux.context.agent./l1')).toBe('codex');
    expect(storage.get('gmux.context.agent.p901:/l1')).toBe('claude');
  });
});
