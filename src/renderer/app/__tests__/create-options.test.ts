/**
 * PHASE 86 — the collapsed Options block cannot hide a flag it does not
 * count.
 *
 * The whole risk of collapsing this block is a launch default seeded from
 * Settings that is on, invisible behind the collapse, and left out of the
 * summary, so a person presses ⌘T and Return and starts an agent with
 * `--dangerously-skip-permissions` without ever being told. The design closes
 * that by construction rather than by care: `activePresets` is the one
 * expression behind both the summary's count and the argv `submit` sends, so
 * the two cannot disagree.
 *
 * These tests hold that identity, and they hold the summary's exact words.
 * The environment is node, so nothing is mounted here. What is proved is the
 * arithmetic, and a probe against the running sheet proves the pixels.
 */

import { describe, expect, it, vi } from 'vitest';

// The modal's module graph reaches the app store, which reads `window.gmux`
// while the store object is being built. Give the graph a bare window before
// any import runs. No bridge, which is the same shape a renderer has before
// its preload has answered.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});

import { presetArgvTokens, type AgentFlagPresetView } from '@shared/settings';
import {
  activePresets,
  optionsSummaryText,
  seededFlags
} from '../CreateSessionModal';

function preset(over: Partial<AgentFlagPresetView>): AgentFlagPresetView {
  return {
    flag: '--verbose',
    label: 'Verbose',
    description: 'Say more',
    danger: false,
    verified: true,
    ...over
  };
}

const VERBOSE = preset({ flag: '--verbose', label: 'Verbose' });
const YOLO = preset({
  flag: '--dangerously-skip-permissions',
  label: 'Skip permission prompts',
  danger: true
});
const SANDBOX = preset({ flag: '--sandbox workspace-write', label: 'Sandbox' });
const PRESETS = [VERBOSE, YOLO, SANDBOX];

/** A settings object with launch defaults and nothing else this code reads. */
function settingsWith(flags: string[]): { launchDefaults: Record<string, string[]> } {
  return { launchDefaults: { claude: flags } };
}

describe('one expression behind the count and the argv', () => {
  it('returns the presets that are on, in preset order', () => {
    const on = activePresets(PRESETS, [
      '--sandbox workspace-write',
      '--verbose'
    ]);
    expect(on.map((p) => p.flag)).toEqual([
      '--verbose',
      '--sandbox workspace-write'
    ]);
  });

  it('returns nothing when nothing is checked', () => {
    expect(activePresets(PRESETS, [])).toEqual([]);
  });

  it('ignores a checked flag the agent does not offer', () => {
    expect(activePresets(PRESETS, ['--not-a-real-flag'])).toEqual([]);
  });

  it('counts exactly what the create sends as argv', () => {
    const checked = seededFlags(
      'claude',
      settingsWith(['--dangerously-skip-permissions', '--sandbox workspace-write']),
      PRESETS
    );
    const on = activePresets(PRESETS, checked);
    const argv = on.flatMap((p) => presetArgvTokens(p.flag));
    expect(on.length).toBe(2);
    expect(argv).toEqual([
      '--dangerously-skip-permissions',
      '--sandbox',
      'workspace-write'
    ]);
    expect(optionsSummaryText(on.length)).toBe('Options, 2 on');
  });
});

describe('a seeded launch default is counted before anybody expands', () => {
  it('counts one seeded danger flag and names it as one', () => {
    const checked = seededFlags(
      'claude',
      settingsWith(['--dangerously-skip-permissions']),
      PRESETS
    );
    const on = activePresets(PRESETS, checked);
    expect(on.map((p) => p.flag)).toEqual(['--dangerously-skip-permissions']);
    expect(on.some((p) => p.danger)).toBe(true);
    expect(optionsSummaryText(on.length)).toBe('Options, 1 on');
  });

  it('drops a launch default the agent no longer offers, and the count drops with it', () => {
    const checked = seededFlags(
      'claude',
      settingsWith(['--verbose', '--gone-from-this-build']),
      PRESETS
    );
    expect(checked).toEqual(['--verbose']);
    expect(optionsSummaryText(activePresets(PRESETS, checked).length)).toBe(
      'Options, 1 on'
    );
  });

  it('reads no launch defaults for a different agent', () => {
    const checked = seededFlags('codex', settingsWith(['--verbose']), PRESETS);
    expect(checked).toEqual([]);
    expect(optionsSummaryText(activePresets(PRESETS, checked).length)).toBe(
      'Options, 0 on'
    );
  });
});

describe('the summary always says a number', () => {
  it('says zero rather than saying nothing', () => {
    expect(optionsSummaryText(0)).toBe('Options, 0 on');
  });

  it('says the number for every count it is given', () => {
    expect(optionsSummaryText(1)).toBe('Options, 1 on');
    expect(optionsSummaryText(3)).toBe('Options, 3 on');
  });
});

/**
 * PHASE 109 — the one action on the AGENT_NOT_ON_MACHINE block asks that
 * MACHINE again, and never this Mac. `tryAgain` above it in the sheet drops
 * this Mac's probe cache and rescans this Mac, and wiring that button to it
 * would answer a question about the wrong computer.
 */
describe('the ask-that-machine-again action', () => {
  it('asks the refusing machine with fresh true, then retries the create', async () => {
    const { askMachineAgainAction } = await import('../CreateSessionModal');
    const asked: Array<[string, boolean]> = [];
    let localProbes = 0;
    (window as unknown as { gmux: unknown }).gmux = {
      agentAvailability: () => {
        localProbes += 1;
        return Promise.resolve({ claude: true, codex: true });
      },
      machines: {
        agents: (id: string, fresh: boolean) => {
          asked.push([id, fresh]);
          return Promise.resolve([]);
        }
      }
    };
    const resubmits: number[] = [];
    const run = askMachineAgainAction('m-studio', () => resubmits.push(1));
    run();
    expect(asked).toEqual([['m-studio', true]]);
    expect(resubmits).toEqual([1]);
    expect(localProbes).toBe(0);
    (window as unknown as { gmux: unknown }).gmux = undefined;
  });

  it('still retries on a preload without the method, and starts nothing here', async () => {
    const { askMachineAgainAction } = await import('../CreateSessionModal');
    (window as unknown as { gmux: unknown }).gmux = {
      machines: {}
    };
    const resubmits: number[] = [];
    askMachineAgainAction('m-studio', () => resubmits.push(1))();
    expect(resubmits).toEqual([1]);
    (window as unknown as { gmux: unknown }).gmux = undefined;
  });

  it('is labelled with the machine and is not Try again', async () => {
    const { askMachineAgainLabel } = await import('../machine-copy');
    expect(askMachineAgainLabel('Studio')).toBe('Ask Studio again');
    expect(askMachineAgainLabel('Studio')).not.toContain('Try again');
  });
});
