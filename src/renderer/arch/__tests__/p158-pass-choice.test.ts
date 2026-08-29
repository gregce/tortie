/**
 * The pane learns that an agent was picked (Phase 158, the fix round).
 *
 * The verifier's blocking finding: with the pane open, a person picked an
 * agent in Settings, main's status said chosen, and the face kept saying
 * "pick one in Settings" with no run control until a relaunch, because the
 * pass status was read once and held and nothing in arch listened to the
 * settings broadcast. This drives the store with a stood up bridge: the
 * status flips on the broadcast, and a started event marks the held status
 * chosen whatever it held before.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { localTarget } from '@shared/workspace-target';
import { useArch } from '../store';

type Cb<T> = (value: T) => void;

interface Stand {
  chosen: boolean;
  statusReads: number;
  settingsCb: Cb<unknown> | null;
  passCb: Cb<{ cwd: string; phase: 'started' | 'finished'; run: null }> | null;
}

const stand: Stand = { chosen: false, statusReads: 0, settingsCb: null, passCb: null };
const realWindow = (globalThis as { window?: unknown }).window;

function standUp(): void {
  (globalThis as { window?: unknown }).window = {
    gmux: {
      onSettingsChanged: (cb: Cb<unknown>) => {
        stand.settingsCb = cb;
        return () => {
          stand.settingsCb = null;
        };
      },
      arch: {
        load: () => Promise.reject(new Error('not read here')),
        enrich: () => Promise.resolve({ started: false, refusal: 'no-choice', run: null, seeded: [] }),
        passStatus: (input: { cwd: string }) => {
          stand.statusReads += 1;
          return Promise.resolve({
            cwd: input.cwd,
            running: false,
            suspended: null,
            chosen: stand.chosen,
            lastRun: null
          });
        },
        onChecked: () => () => undefined,
        onProgress: () => () => undefined,
        onMapUpdated: () => () => undefined,
        onPass: (cb: Stand['passCb']) => {
          stand.passCb = cb;
          return () => {
            stand.passCb = null;
          };
        }
      }
    }
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  stand.chosen = false;
  stand.statusReads = 0;
  stand.settingsCb = null;
  stand.passCb = null;
  standUp();
  useArch.setState({ target: localTarget('/repo'), passes: {} });
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = realWindow;
  useArch.setState({ target: null, passes: {} });
});

describe('the choice made in Settings reaches the pane', () => {
  it('reads the pass status again on the settings broadcast', async () => {
    const off = useArch.getState().subscribeEvents();
    await useArch.getState().loadPass('/repo');
    expect(useArch.getState().passFor('/repo')?.status?.chosen).toBe(false);
    expect(stand.statusReads).toBe(1);
    // A second loadPass is the held read, by design: nothing is asked twice
    // for one mount. That is the very thing that kept the face stale.
    await useArch.getState().loadPass('/repo');
    expect(stand.statusReads).toBe(1);

    // The person picks an agent in Settings. Main seals it and broadcasts.
    stand.chosen = true;
    expect(stand.settingsCb).not.toBeNull();
    stand.settingsCb?.({});
    await flush();
    expect(stand.statusReads).toBe(2);
    expect(useArch.getState().passFor('/repo')?.status?.chosen).toBe(true);
    off();
    expect(stand.settingsCb).toBeNull();
  });

  it('re-reads every held repository, and nothing that was never read', async () => {
    useArch.getState().subscribeEvents();
    await useArch.getState().loadPass('/repo');
    await useArch.getState().loadPass('/other');
    stand.statusReads = 0;
    stand.settingsCb?.({});
    await flush();
    expect(stand.statusReads).toBe(2);
    expect(Object.keys(useArch.getState().passes).sort()).toEqual(['/other', '/repo']);
  });

  it('marks a held status chosen when a pass starts, whatever it held', async () => {
    useArch.getState().subscribeEvents();
    await useArch.getState().loadPass('/repo');
    expect(useArch.getState().passFor('/repo')?.status?.chosen).toBe(false);
    // Main only starts a pass under a choice it gated on, so the started
    // event is proof of the choice even before any status read lands.
    stand.passCb?.({ cwd: '/repo', phase: 'started', run: null });
    const status = useArch.getState().passFor('/repo')?.status;
    expect(status?.running).toBe(true);
    expect(status?.chosen).toBe(true);
  });

  it('subscribes to nothing when the build has no pass half', () => {
    const w = (globalThis as { window: { gmux: { arch: Record<string, unknown> } } }).window;
    delete w.gmux.arch['enrich'];
    useArch.getState().subscribeEvents();
    expect(stand.settingsCb).toBeNull();
  });
});
