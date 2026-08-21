/**
 * PHASE 119 fix round — what a person is TOLD when a decline could not be
 * honoured.
 *
 * THE DEFECT THIS FILE EXISTS FOR. Main writes one sentence for the case it
 * cannot honour, being a recorded resume command it cannot separate from
 * SpecStory. It went to the main log and to the row's `restore.armFailure`
 * column, and no renderer file read either one. The person got the ordinary
 * success toast instead, which told them to press Enter to resume a
 * conversation that was never armed. A separate sticky toast from the restore
 * shortfall notice said the session came back without its agent, so two
 * messages were on screen at once and the first one was false.
 *
 * Three things are pinned below.
 *
 *  - The unhonoured decline shows main's sentence, and it is sticky, and it is
 *    an error rather than a success.
 *  - It never tells the person to press Enter, because nothing was armed.
 *  - The honoured decline and the ordinary restore are untouched, which is
 *    what keeps this fix from being a change to the normal path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

/** The sentence main writes. Copied, because a renderer cannot import main. */
const DECLINE_UNWRAP_FAILED =
  "Tortie could not separate this session's resume command from SpecStory, " +
  'so nothing was armed in the pane.';

/** What the fake bridge hands back from `sessions:restore`. */
let restoreReturns: Session;
/** Every option object the store sent to the bridge, in order. */
let restoreOptions: unknown[] = [];

const CAPTURE = {
  provider: 'claude',
  bin: '/Applications/Tortie.app/Contents/Resources/bin/specstory',
  exitCodeApproximate: true
} as const;

const SESSION: Session = {
  id: 'sess-1',
  name: 'auth',
  tmuxName: 'auth',
  projectPath: '/repo',
  cwd: '/repo/api',
  agent: 'claude',
  status: 'exited',
  createdAt: 0,
  resumeArgv: ['/bin/specstory', 'run', '--', 'claude', '-r', 'u'],
  capture: { ...CAPTURE }
};

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      sessions: {
        list: () => Promise.resolve([]),
        restore: (_id: string, options?: unknown) => {
          restoreOptions.push(options);
          return Promise.resolve(restoreReturns);
        }
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } }
  });
}

installGlobals();

const { useApp } = await import('../store');

/** Answer the confirm the declined restore puts up, and wait for the restore. */
async function confirmAndSettle(): Promise<void> {
  const spec = useApp.getState().confirm;
  expect(spec).not.toBeNull();
  spec?.onConfirm();
  // The confirm's handler starts the restore and does not await it. One turn
  // of the microtask queue is enough for a bridge that resolves immediately.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  restoreOptions = [];
  restoreReturns = { ...SESSION };
  useApp.setState({
    projects: [{ id: 'proj-1', name: 'repo', path: '/repo' }],
    activeProjectId: 'proj-1',
    sessions: [{ ...SESSION }],
    toasts: [],
    confirm: null,
    restoringIds: {}
  } as never);
});

describe('a decline main could not honour', () => {
  beforeEach(() => {
    // The row comes back STILL CAPTURED, which is main leaving the setting
    // alone, and it carries the sentence on its restore record.
    restoreReturns = {
      ...SESSION,
      capture: { ...CAPTURE },
      restore: {
        kind: 'transcript',
        at: 1,
        armFailure: DECLINE_UNWRAP_FAILED
      }
    };
  });

  it('shows the sentence main wrote, and shows only that', async () => {
    await useApp.getState().restoreSession('sess-1', { withoutCapture: true });
    await confirmAndSettle();
    const toasts = useApp.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.text).toBe(DECLINE_UNWRAP_FAILED);
  });

  it('says it as a sticky error, because nothing came of the request', async () => {
    await useApp.getState().restoreSession('sess-1', { withoutCapture: true });
    await confirmAndSettle();
    expect(useApp.getState().toasts[0]?.kind).toBe('error');
    expect(useApp.getState().toasts[0]?.sticky).toBe(true);
  });

  it('never tells the person to press Enter, because nothing was armed', async () => {
    await useApp.getState().restoreSession('sess-1', { withoutCapture: true });
    await confirmAndSettle();
    for (const t of useApp.getState().toasts) {
      expect(t.text).not.toContain('Press Enter');
      expect(t.text).not.toContain('press Enter');
    }
  });

  it('never claims the session stopped saving its history', async () => {
    await useApp.getState().restoreSession('sess-1', { withoutCapture: true });
    await confirmAndSettle();
    for (const t of useApp.getState().toasts) {
      expect(t.text).not.toContain('no longer saves');
    }
  });
});

describe('the two paths this fix does not touch', () => {
  it('a decline that took still reads as a success', async () => {
    const back: Session = {
      ...SESSION,
      resumeArgv: ['claude', '-r', 'u'],
      restore: { kind: 'armed', at: 1 }
    };
    delete back.capture;
    restoreReturns = back;
    await useApp.getState().restoreSession('sess-1', { withoutCapture: true });
    await confirmAndSettle();
    const toasts = useApp.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.kind).toBe('success');
    expect(toasts[0]?.text).toContain('no longer saves its history');
    expect(restoreOptions).toEqual([{ withoutCapture: true }]);
  });

  it('an ordinary restore of a captured row is unchanged, arm failure or not', async () => {
    // The gate is `withoutCapture`, so an arm failure on the ordinary path
    // takes exactly the path it took before this phase. Asserted here so a
    // later round cannot widen the read by accident and call it a cleanup.
    restoreReturns = {
      ...SESSION,
      capture: { ...CAPTURE },
      restore: { kind: 'transcript', at: 1, armFailure: 'send-keys: no such pane' }
    };
    await useApp.getState().restoreSession('sess-1');
    await Promise.resolve();
    await Promise.resolve();
    const toasts = useApp.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.kind).toBe('success');
    expect(toasts[0]?.text).toContain("'auth' restored");
    expect(restoreOptions).toEqual([undefined]);
  });
});
