/**
 * A session you cannot reach can still be reached (Phase 93, item 1).
 *
 * ## The defect these cases pin
 *
 * `jumpToSession` switched the project tab only when a tab already named the
 * session's folder, and it set the active session either way. So a row in the
 * ⌘J list whose folder had no tab answered Enter by changing a field nobody
 * could see. Nothing errored. The person kept looking at the tab they were
 * already on, and the operator had three agents in that state at once.
 *
 * ## What each case proves
 *
 *  1. A tab that already matches is switched to, and nothing is opened.
 *  2. A folder on this Mac with no tab is opened as one, and the session is
 *     landed in.
 *  3. A folder on another machine with no tab is opened as a tab on that
 *     machine, and the session is landed in.
 *  4. Every refusal draws its own sentence, says the session was not ended,
 *     and opens no tab.
 *  5. A tab this person closed comes back with no sentence. A folder that
 *     never had a tab gets exactly one sentence saying why a tab appeared.
 *
 * The store is the real one. `openTargetProject` is the store's own method and
 * the two add routes are the shipped ones, so what is faked here is the bridge
 * and nothing above it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';
import type { useApp as UseApp } from '../../state/store';
import {
  NO_SUCH_SESSION,
  cannotOpenOnMachine,
  couldNotReachMachine,
  folderGone,
  folderRefused,
  tabOpenedForSession
} from '../reach-copy';
import { addRemoteRefusal } from '../machine-copy';

const HERE = '/Users/gdc/scratch-93';
const SHOWN_HERE = '~/scratch-93';
const THERE = '/srv/work';
const LABEL = 'Studio';

const cell = new Map<string, string>();

/** One live row, on this Mac unless a machine is given. */
function sessionRow(over: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    name: 'claude-3',
    tmuxName: 'claude-3',
    projectPath: HERE,
    cwd: HERE,
    agent: 'claude',
    status: 'needs_input',
    createdAt: 0,
    ...over
  } as Session;
}

/** The same row, running on a machine. */
function remoteRow(over: Partial<Session> = {}): Session {
  return sessionRow({
    projectPath: THERE,
    cwd: THERE,
    machine: {
      id: 'macpro',
      label: LABEL,
      color: 'blue',
      answering: true,
      canRestore: false,
      restoreReason: null
    },
    ...over
  });
}

interface Bridge {
  add: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  addRemote?: ReturnType<typeof vi.fn>;
}

function installGlobals(bridge: Bridge): void {
  vi.stubGlobal('window', {
    innerWidth: 1440,
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      projects: {
        add: bridge.add,
        list: bridge.list,
        ...(bridge.addRemote === undefined
          ? {}
          : { addRemote: bridge.addRemote })
      },
      setSessionsPosition: () => Promise.resolve()
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => cell.get(k) ?? null,
    setItem: (k: string, v: string) => {
      cell.set(k, v);
    },
    removeItem: (k: string) => {
      cell.delete(k);
    }
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } },
    querySelector: () => null
  });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
}

async function boot(bridge: Bridge): Promise<{
  useApp: typeof UseApp;
  jumpToSession: (id: string) => Promise<
    { ok: true } | { ok: false; message: string }
  >;
}> {
  cell.clear();
  installGlobals(bridge);
  vi.resetModules();
  const store = await import('../../state/store');
  const focus = await import('../session-focus');
  return { useApp: store.useApp, jumpToSession: focus.jumpToSession };
}

/** The text of every toast raised in one run. */
function toastText(useApp: typeof UseApp): string[] {
  return useApp.getState().toasts.map((t) => t.text);
}

/** A rejection shaped the way main's ipc layer sends one. */
function mainError(code: string, message: string): Error {
  return new Error(
    `Error invoking remote method: ${JSON.stringify({ code, message })}`
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a session whose folder already has a tab', () => {
  it('switches to that tab and opens nothing', async () => {
    const bridge: Bridge = { add: vi.fn(), list: vi.fn() };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [{ id: 'p-1', path: HERE, name: 'scratch-93' }],
      activeProjectId: null,
      sessions: [sessionRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: true });
    expect(useApp.getState().activeProjectId).toBe('p-1');
    expect(useApp.getState().activeSessionByProject['p-1']).toBe('s-1');
    expect(bridge.add).not.toHaveBeenCalled();
    expect(toastText(useApp)).toEqual([]);
  });

  it('prefers the tab on the same machine over the same path here', async () => {
    const bridge: Bridge = { add: vi.fn(), list: vi.fn() };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [
        { id: 'p-here', path: THERE, name: 'work' },
        { id: 'p-there', path: THERE, name: 'work', machineId: 'macpro' }
      ],
      activeProjectId: 'p-here',
      sessions: [remoteRow()]
    } as never);

    await jumpToSession('s-1');

    expect(useApp.getState().activeProjectId).toBe('p-there');
    expect(bridge.add).not.toHaveBeenCalled();
  });
});

describe('a session with no record at all', () => {
  it('says so and opens nothing', async () => {
    const bridge: Bridge = { add: vi.fn(), list: vi.fn() };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({ projects: [], sessions: [] } as never);

    const result = await jumpToSession('nobody');

    expect(result).toEqual({ ok: false, message: NO_SUCH_SESSION });
    expect(toastText(useApp)).toEqual([NO_SUCH_SESSION]);
    expect(bridge.add).not.toHaveBeenCalled();
  });
});

describe('a folder on this Mac with no tab', () => {
  it('opens the folder, lands in the session and says why the tab is there', async () => {
    const made = { id: 'p-new', path: HERE, name: 'scratch-93' };
    const bridge: Bridge = {
      add: vi.fn().mockResolvedValue(made),
      list: vi.fn().mockResolvedValue([made])
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [sessionRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: true });
    expect(bridge.add).toHaveBeenCalledWith(HERE);
    expect(useApp.getState().activeProjectId).toBe('p-new');
    expect(useApp.getState().activeSessionByProject['p-new']).toBe('s-1');
    expect(toastText(useApp)).toEqual([
      tabOpenedForSession(SHOWN_HERE, 'claude-3')
    ]);
  });

  it('says nothing when this person closed that tab themselves', async () => {
    const made = { id: 'p-new', path: HERE, name: 'scratch-93' };
    const bridge: Bridge = {
      add: vi.fn().mockResolvedValue(made),
      list: vi.fn().mockResolvedValue([made])
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [
        sessionRow({
          closedProject: { name: 'scratch-93', path: HERE, closedAt: 1 }
        } as Partial<Session>)
      ]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: true });
    expect(useApp.getState().activeProjectId).toBe('p-new');
    expect(toastText(useApp)).toEqual([]);
  });

  it('says the folder is gone, and says the session was not ended', async () => {
    const bridge: Bridge = {
      add: vi
        .fn()
        .mockRejectedValue(
          mainError('INVALID_INPUT', 'That folder does not exist.')
        ),
      list: vi.fn()
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [sessionRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: false, message: folderGone(SHOWN_HERE) });
    expect(toastText(useApp)).toEqual([folderGone(SHOWN_HERE)]);
    expect(useApp.getState().projects).toEqual([]);
    expect(folderGone(SHOWN_HERE)).toContain('Tortie did not end it');
  });

  it('prints main own message for any other refusal', async () => {
    const bridge: Bridge = {
      add: vi
        .fn()
        .mockRejectedValue(mainError('FS_FAILED', 'That disk is read only.')),
      list: vi.fn()
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [sessionRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({
      ok: false,
      message: folderRefused(SHOWN_HERE, 'That disk is read only.')
    });
    expect(toastText(useApp)).toEqual([
      folderRefused(SHOWN_HERE, 'That disk is read only.')
    ]);
  });
});

describe('a folder on another machine with no tab', () => {
  it('opens the folder on that machine and lands in the session', async () => {
    const made = { id: 'p-far', path: THERE, name: 'work', machineId: 'macpro' };
    const bridge: Bridge = {
      add: vi.fn(),
      list: vi.fn().mockResolvedValue([made]),
      addRemote: vi
        .fn()
        .mockResolvedValue({ ok: true, project: made, alreadyOpen: false })
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [remoteRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: true });
    expect(bridge.addRemote).toHaveBeenCalledWith({
      machineId: 'macpro',
      path: THERE
    });
    expect(useApp.getState().activeProjectId).toBe('p-far');
    expect(useApp.getState().activeSessionByProject['p-far']).toBe('s-1');
    // The path on another machine is drawn exactly as that machine states it,
    // with no tilde, which is the Phase 90.3 rule `displayPath` already holds.
    expect(toastText(useApp)).toEqual([
      tabOpenedForSession(THERE, 'claude-3')
    ]);
  });

  it('draws the machine sentence for every refusal word', async () => {
    const words = [
      'missing',
      'notdir',
      'denied',
      'unreachable',
      'notConnected',
      'notAbsolute',
      'noSuchMachine'
    ] as const;
    for (const reason of words) {
      const bridge: Bridge = {
        add: vi.fn(),
        list: vi.fn().mockResolvedValue([]),
        addRemote: vi.fn().mockResolvedValue({ ok: false, reason })
      };
      const { useApp, jumpToSession } = await boot(bridge);
      useApp.setState({
        projects: [],
        activeProjectId: null,
        sessions: [remoteRow()]
      } as never);

      const expected = couldNotReachMachine(
        addRemoteRefusal(reason, THERE, LABEL)
      );
      const result = await jumpToSession('s-1');

      expect(result).toEqual({ ok: false, message: expected });
      expect(toastText(useApp)).toEqual([expected]);
      expect(expected).toContain('Tortie did not end the session.');
      expect(useApp.getState().projects).toEqual([]);
    }
  });

  it('names the quiet machine in the exact sentence the spec fixes', async () => {
    const bridge: Bridge = {
      add: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      addRemote: vi.fn().mockResolvedValue({ ok: false, reason: 'unreachable' })
    };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [remoteRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({
      ok: false,
      message:
        'Studio did not answer, so Tortie could not check that folder. ' +
        'Tortie did not end the session.'
    });
  });

  it('says so when this build cannot open a folder on a machine', async () => {
    const bridge: Bridge = { add: vi.fn(), list: vi.fn() };
    const { useApp, jumpToSession } = await boot(bridge);
    useApp.setState({
      projects: [],
      activeProjectId: null,
      sessions: [remoteRow()]
    } as never);

    const result = await jumpToSession('s-1');

    expect(result).toEqual({ ok: false, message: cannotOpenOnMachine(LABEL) });
    expect(toastText(useApp)).toEqual([cannotOpenOnMachine(LABEL)]);
  });
});

describe('the sentences themselves', () => {
  it('are the exact strings the spec fixes', () => {
    expect(NO_SUCH_SESSION).toBe(
      'Tortie no longer has a record of that session.'
    );
    expect(folderGone('~/old-thing')).toBe(
      'Tortie could not open ~/old-thing again, because there is no folder ' +
        'there now. The session is still running and Tortie did not end it.'
    );
    expect(folderRefused('~/old-thing', 'That folder does not exist.')).toBe(
      'Tortie could not open ~/old-thing again. That folder does not exist.'
    );
    expect(tabOpenedForSession('~/gmux', 'claude-3')).toBe(
      "Tortie opened ~/gmux as a tab, because 'claude-3' is running there " +
        'and had no tab.'
    );
    expect(cannotOpenOnMachine('Studio')).toBe(
      'This copy of Tortie cannot open a folder on Studio. The session is ' +
        'still running and Tortie did not end it.'
    );
  });

  it('never say a session ended', () => {
    const all = [
      NO_SUCH_SESSION,
      folderGone('~/x'),
      folderRefused('~/x', 'y'),
      cannotOpenOnMachine('Studio'),
      couldNotReachMachine(addRemoteRefusal('missing', '/srv/x', 'Studio')),
      tabOpenedForSession('~/x', 'a')
    ];
    for (const line of all) {
      expect(line).not.toMatch(/ended|stopped|killed/i);
    }
  });
});
