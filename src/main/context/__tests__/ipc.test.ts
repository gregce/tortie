/**
 * The `context:*` registrar.
 *
 * The channels are thin, and the thinness is the point, so these cases are
 * about the two things a thin registrar can still get wrong: letting the
 * renderer decide what gets spawned, and turning a bad input into a crash
 * instead of a sentence.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { IpcMain } from 'electron';
// Phase 42 stage 1: handlers registered through typed-ipc refuse untrusted
// senders, so driving one takes a trusted fake event instead of `null`.
import { trustedInvokeEvent } from '../../security/__tests__/trusted-test-sender';

const planSkillsCommand = vi.fn();
const executeSkillsPlan = vi.fn();
const scanContext = vi.fn();
const skillsCapability = vi.fn();
const hashDirectory = vi.fn();

vi.mock('../../skills/run', () => ({
  planSkillsCommand: (...args: unknown[]) => planSkillsCommand(...args),
  executeSkillsPlan: (...args: unknown[]) => executeSkillsPlan(...args)
}));
vi.mock('../../skills', () => ({
  skillsCapability: (...args: unknown[]) => skillsCapability(...args)
}));
vi.mock('../scan', () => ({
  scanContext: (...args: unknown[]) => scanContext(...args)
}));
vi.mock('../hash', () => ({
  HASH_ALGORITHM: { head: 'sha256-file-v1', full: 'sha256-dir-v1' },
  hashDirectory: (...args: unknown[]) => hashDirectory(...args)
}));
vi.mock('../port', () => ({ createNodeContextFs: () => ({}) }));

const { registerContextIpc } = await import('../ipc');

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

function fakeIpc(): { ipc: IpcMain; handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>();
  const ipc = {
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    },
    removeHandler: () => undefined
  } as unknown as IpcMain;
  return { ipc, handlers };
}

function install(): Map<string, Handler> {
  const { ipc, handlers } = fakeIpc();
  registerContextIpc(ipc, async () => null);
  return handlers;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the registrar registers one domain, not two', () => {
  /**
   * Eleven channels, and exactly ONE of them can change anything on the
   * machine. The split is the safety story of this phase, so the list is
   * asserted whole rather than by counting: a twelfth channel added to
   * whichever file somebody happened to open fails here.
   */
  it('carries the launch snapshot channel as well as its own ten', () => {
    const handlers = install();
    expect([...handlers.keys()].sort()).toEqual([
      'context:hashSkill',
      'context:scan',
      'context:sessionSnapshot',
      'context:skillPinForget',
      'context:skillPinRecord',
      'context:skillPins',
      'context:skillsAudit',
      'context:skillsCapability',
      'context:skillsPlan',
      'context:skillsPreview',
      'context:skillsRun',
      'context:skillsSearch'
    ]);
  });
});

describe('context:skillsRun never runs what the renderer sent', () => {
  it('rebuilds the plan from the operation and runs the rebuilt one', async () => {
    const rebuilt = { commandLine: 'the one main built', operation: { kind: 'update' } };
    planSkillsCommand.mockResolvedValue({ refused: false, plan: rebuilt });
    executeSkillsPlan.mockResolvedValue({ ok: true });

    const handlers = install();
    // A forged plan riding along on the input must have no effect at all: the
    // channel does not take a plan, so there is nothing for a caller to forge.
    await handlers.get('context:skillsRun')?.(trustedInvokeEvent(), {
      operation: { kind: 'update', skill: null },
      plan: { commandLine: 'rm -rf /' }
    });

    expect(executeSkillsPlan).toHaveBeenCalledTimes(1);
    expect(executeSkillsPlan.mock.calls[0]?.[0]).toBe(rebuilt);
  });

  it('turns a refusal into a result row rather than throwing at the renderer', async () => {
    planSkillsCommand.mockResolvedValue({
      refused: true,
      reason: 'lock-guard',
      message: 'Tortie did not run this.'
    });
    const handlers = install();
    const result = (await handlers.get('context:skillsRun')?.(trustedInvokeEvent(), {
      operation: { kind: 'update', skill: null }
    })) as { ok: boolean; failure: string | null };

    expect(executeSkillsPlan).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('Tortie did not run this.');
  });

  it('refuses an input with no operation instead of spawning anything', async () => {
    const handlers = install();
    await expect(
      handlers.get('context:skillsRun')?.(trustedInvokeEvent(), { projectRoot: '/tmp' })
    ).rejects.toThrow(/no operation/);
    expect(planSkillsCommand).not.toHaveBeenCalled();
    expect(executeSkillsPlan).not.toHaveBeenCalled();
  });

  it('passes a project root through, and omits it when there is none', async () => {
    planSkillsCommand.mockResolvedValue({ refused: false, plan: { commandLine: 'x' } });
    executeSkillsPlan.mockResolvedValue({ ok: true });
    const handlers = install();

    await handlers.get('context:skillsPlan')?.(trustedInvokeEvent(), {
      operation: { kind: 'restoreProject' },
      projectRoot: '/repo'
    });
    expect(planSkillsCommand.mock.calls[0]?.[1]).toEqual({ projectRoot: '/repo' });

    await handlers.get('context:skillsPlan')?.(trustedInvokeEvent(), {
      operation: { kind: 'update', skill: null },
      projectRoot: ''
    });
    // Empty is not a root. Falling back to a directory here would write skills
    // into whatever the app's inherited cwd happens to be, which under a GUI
    // launch is `/` and from a terminal is plausibly a live repository.
    expect(planSkillsCommand.mock.calls[1]?.[1]).toEqual({});
  });
});

describe('context:hashSkill answers, and never agrees by accident', () => {
  it('names the algorithm beside the hash', async () => {
    hashDirectory.mockResolvedValue('abc123');
    const handlers = install();
    const out = (await handlers.get('context:hashSkill')?.(trustedInvokeEvent(), '/skills/lore')) as {
      hash: string | null;
      algorithm: string;
      problem: string | null;
    };
    expect(out.hash).toBe('abc123');
    expect(out.algorithm).toBe('sha256-dir-v1');
    expect(out.problem).toBeNull();
  });

  it('reports a null hash with a sentence, so a re-check cannot read it as agreement', async () => {
    hashDirectory.mockResolvedValue(null);
    const handlers = install();
    const out = (await handlers.get('context:hashSkill')?.(trustedInvokeEvent(), '/gone')) as {
      hash: string | null;
      problem: string | null;
    };
    expect(out.hash).toBeNull();
    expect(out.problem).toContain('/gone');
  });

  it('turns a thrown read into the same shape rather than a rejection', async () => {
    hashDirectory.mockRejectedValue(new Error('EACCES'));
    const handlers = install();
    const out = (await handlers.get('context:hashSkill')?.(trustedInvokeEvent(), '/locked')) as {
      hash: string | null;
      problem: string | null;
    };
    expect(out.hash).toBeNull();
    expect(out.problem).toContain('EACCES');
  });
});

describe('context:scan', () => {
  it('passes the input straight through', async () => {
    scanContext.mockResolvedValue({ entries: [] });
    const handlers = install();
    await handlers.get('context:scan')?.(trustedInvokeEvent(), { cwd: '/repo', hash: 'head' });
    expect(scanContext.mock.calls[0]?.[0]).toEqual({ cwd: '/repo', hash: 'head' });
  });

  it('refuses a non-object input rather than walking from nowhere', async () => {
    const handlers = install();
    await expect(handlers.get('context:scan')?.(trustedInvokeEvent(), null)).rejects.toThrow(
      /no project/
    );
    expect(scanContext).not.toHaveBeenCalled();
  });
});
