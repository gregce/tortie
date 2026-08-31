/**
 * The switch is the whole of the consent, so the face must follow it at once
 * (Phase 181 fix round).
 *
 * The verification of 2026-08-31 measured the defect in the running app: with
 * both switches flipped on through Settings, the DOM held zero meter elements
 * at every one of twelve marks across a minute, and a renderer reload drew all
 * of it immediately; with both flipped off, the numbers were still on screen at
 * all twelve. The cause was in this store. The cadence was started once, its
 * tick re-asked only after fifteen minutes and only while the window was in
 * front, and nothing at all subscribed to settings.
 *
 * So these hold the rule rather than the timer: WHAT IS DRAWN AGREES WITH THE
 * SWITCH. A provider whose switch is off is absent from the snapshot, which is
 * how this store can compare the two without keeping a second copy of settings.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval: () => 1,
    clearInterval: () => {}
  };
  (globalThis as { document?: unknown }).document = {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

import type { GmuxSettings, UsageSettings } from '@shared/settings';
import type { UsageSnapshot } from '@shared/usage';
import { USAGE_PROVIDERS, emptyUsageProvider } from '@shared/usage';
import { resetUsagePolling, useUsage } from '../usage';

/** A fake main: it answers from the same settings the fake Settings page holds. */
function install(): {
  on: UsageSettings;
  reads: number;
  emit(): void;
} {
  const state = { on: { claude: false, codex: false }, reads: 0, emit: () => {} };
  let listener: ((s: GmuxSettings) => void) | null = null;
  const answer = (): UsageSnapshot => ({
    at: 1,
    providers: USAGE_PROVIDERS.map((p) =>
      state.on[p]
        ? {
            ...emptyUsageProvider(p, 'ok'),
            fiveHour: { percent: 7, resetsAt: null },
            readAt: 1
          }
        : emptyUsageProvider(p)
    )
  });
  (globalThis as { window: { gmux: unknown } }).window.gmux = {
    usage: {
      read: () => {
        state.reads += 1;
        return Promise.resolve(answer());
      },
      refresh: () => {
        state.reads += 1;
        return Promise.resolve(answer());
      }
    },
    onSettingsChanged: (cb: (s: GmuxSettings) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }
  };
  state.emit = () => {
    listener?.({ usage: { ...state.on } } as GmuxSettings);
  };
  return state;
}

const settle = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
};

function drawn(): string[] {
  return useUsage
    .getState()
    .snapshot.providers.filter((p) => p.state !== 'off')
    .map((p) => p.provider);
}

describe('the meter follows its switch', () => {
  beforeEach(() => {
    resetUsagePolling();
    useUsage.setState({
      snapshot: { at: 0, providers: USAGE_PROVIDERS.map((p) => emptyUsageProvider(p)) },
      askedAt: 0,
      refreshing: false,
      available: true
    });
  });

  it('draws a meter turned on without waiting for the interval or a reload', async () => {
    const main = install();
    useUsage.getState().ensurePolling();
    await settle();
    expect(main.reads).toBe(1);
    expect(drawn()).toEqual([]);

    main.on.claude = true;
    main.emit();
    await settle();

    expect(drawn()).toEqual(['claude']);
    expect(main.reads).toBe(2);
  });

  it('takes the numbers off the face the moment a switch goes off', async () => {
    const main = install();
    main.on.claude = true;
    main.on.codex = true;
    useUsage.getState().ensurePolling();
    await settle();
    expect(drawn()).toEqual(['claude', 'codex']);

    main.on.codex = false;
    main.emit();
    // Synchronously, before the round trip that will say the same thing.
    expect(drawn()).toEqual(['claude']);
    await settle();
    expect(drawn()).toEqual(['claude']);
  });

  it('asks for nothing when a settings change did not touch the switches', async () => {
    const main = install();
    main.on.claude = true;
    useUsage.getState().ensurePolling();
    await settle();
    const before = main.reads;

    main.emit();
    main.emit();
    await settle();

    expect(main.reads).toBe(before);
  });
});
