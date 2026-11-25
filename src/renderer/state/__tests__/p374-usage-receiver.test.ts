/**
 * The third switch and the push, in the meter's own store (Phase 374).
 *
 * The store has no rule of its own about Antigravity, and that is what is held
 * here: what is DRAWN agrees with the SWITCH for the third provider exactly as
 * it does for the two before it, and a row that arrives by the push is drawn
 * without this window asking for anything.
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

function install(): {
  on: UsageSettings;
  reads: number;
  emit(): void;
  push(snapshot: UsageSnapshot): void;
} {
  const state = {
    on: {
      claude: false,
      codex: false,
      antigravity: false,
      bar: 'five-hour'
    } as UsageSettings,
    reads: 0,
    emit: () => {},
    push: (_: UsageSnapshot) => {}
  };
  let settingsTo: ((s: GmuxSettings) => void) | null = null;
  let usageTo: ((s: UsageSnapshot) => void) | null = null;
  const answer = (): UsageSnapshot => ({
    at: 1,
    providers: USAGE_PROVIDERS.map((p) =>
      state.on[p]
        ? { ...emptyUsageProvider(p, p === 'antigravity' ? 'waiting' : 'ok') }
        : emptyUsageProvider(p)
    )
  });
  (globalThis as { window: { gmux: unknown } }).window.gmux = {
    usage: {
      read: () => {
        state.reads += 1;
        return Promise.resolve(answer());
      },
      refresh: () => Promise.resolve(answer()),
      onChanged: (cb: (s: UsageSnapshot) => void) => {
        usageTo = cb;
        return () => {
          usageTo = null;
        };
      }
    },
    onSettingsChanged: (cb: (s: GmuxSettings) => void) => {
      settingsTo = cb;
      return () => {
        settingsTo = null;
      };
    }
  };
  state.emit = () => settingsTo?.({ usage: { ...state.on } } as GmuxSettings);
  state.push = (snapshot) => usageTo?.(snapshot);
  return state;
}

const settle = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
};

const drawn = (): string[] =>
  useUsage
    .getState()
    .snapshot.providers.filter((p) => p.state !== 'off')
    .map((p) => p.provider);

describe('the third meter follows its switch', () => {
  beforeEach(() => {
    resetUsagePolling();
    useUsage.setState({
      snapshot: { at: 0, providers: USAGE_PROVIDERS.map((p) => emptyUsageProvider(p)) },
      askedAt: 0,
      refreshing: false,
      available: true,
      barWindow: 'five-hour'
    });
  });

  it('holds three rows, in one order', () => {
    expect(USAGE_PROVIDERS).toEqual(['claude', 'codex', 'antigravity']);
    expect(
      useUsage.getInitialState().snapshot.providers.map((p) => p.provider)
    ).toEqual(['claude', 'codex', 'antigravity']);
  });

  it('is drawn at once when turned on, waiting, beside the two it did not move', async () => {
    const main = install();
    main.on.claude = true;
    main.on.codex = true;
    useUsage.getState().ensurePolling();
    await settle();
    expect(drawn()).toEqual(['claude', 'codex']);

    main.on.antigravity = true;
    main.emit();
    await settle();
    expect(drawn()).toEqual(['claude', 'codex', 'antigravity']);
    expect(main.reads).toBe(2);

    // Waiting is drawn, so the same broadcast again asks for nothing.
    main.emit();
    await settle();
    expect(main.reads).toBe(2);
  });

  it('goes the moment it is turned off', async () => {
    const main = install();
    main.on.antigravity = true;
    useUsage.getState().ensurePolling();
    await settle();
    expect(drawn()).toEqual(['antigravity']);
    main.on.antigravity = false;
    main.emit();
    expect(drawn()).toEqual([]);
  });

  it('takes a pushed row without asking for anything', async () => {
    const main = install();
    main.on.antigravity = true;
    useUsage.getState().ensurePolling();
    await settle();
    const asked = useUsage.getState().askedAt;
    const reads = main.reads;
    main.push({
      at: 2,
      providers: USAGE_PROVIDERS.map((p) =>
        p === 'antigravity'
          ? {
              ...emptyUsageProvider(p, 'ok'),
              fiveHour: { percent: 4, resetsAt: null },
              readAt: 2
            }
          : emptyUsageProvider(p)
      )
    });
    const row = useUsage
      .getState()
      .snapshot.providers.find((p) => p.provider === 'antigravity');
    expect(row?.fiveHour?.percent).toBe(4);
    expect(useUsage.getState().askedAt).toBe(asked);
    expect(main.reads).toBe(reads);
  });
});
