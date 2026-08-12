/**
 * Pure helpers behind the ⌘T agent picker (Phase 10 create-modal stream):
 * scan-driven options, optimistic fallback, and the explicit (never
 * alphabetical) default-agent choice.
 */

import { describe, expect, it } from 'vitest';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import { buildAgentOptions, defaultAgentChoice } from '../agents';
import { LAUNCHABLE_AGENT_IDS } from '../../../main/agents/registry';

function row(over: Partial<DetectedAgent> & Pick<DetectedAgent, 'id'>): DetectedAgent {
  return {
    displayName: over.id,
    kind: 'cli',
    launchable: true,
    installed: true,
    binPath: `/usr/local/bin/${over.id}`,
    version: '1.0.0',
    storeDetected: false,
    iconKey: over.id,
    unverified: false,
    ...over
  };
}

function scanOf(agents: DetectedAgent[]): AgentsScanResult {
  return { agents, scannedAt: Date.now() };
}

const BOTH = { claude: true, codex: true };

describe('buildAgentOptions', () => {
  it('falls back to the static launchable list + Shell when no scan exists', () => {
    const options = buildAgentOptions(null, BOTH);
    expect(options).toHaveLength(11); // 10 launchable registry agents + shell
    expect(options[0]?.id).toBe('claude');
    expect(options.at(-1)?.id).toBe('shell');
    expect(options.at(-1)?.installed).toBe(true);
  });

  it('is optimistic in fallback: only a positive claude/codex miss disables', () => {
    const options = buildAgentOptions(null, { claude: false, codex: true });
    expect(options.find((o) => o.id === 'claude')?.installed).toBe(false);
    expect(options.find((o) => o.id === 'codex')?.installed).toBe(true);
    // No probe exists for the rest — never block creation on an unknown.
    expect(options.find((o) => o.id === 'gemini')?.installed).toBe(true);
  });

  it('drives options from the scan, excluding capture-only IDE rows', () => {
    const scan = scanOf([
      row({ id: 'claude' }),
      row({ id: 'cursor', installed: false, binPath: null, version: null }),
      row({ id: 'cursoride', kind: 'ide', launchable: false }),
      row({ id: 'pi', unverified: true })
    ]);
    const options = buildAgentOptions(scan, BOTH);
    expect(options.map((o) => o.id)).toEqual(['claude', 'cursor', 'pi', 'shell']);
    expect(options.find((o) => o.id === 'cursor')?.installed).toBe(false);
    expect(options.find((o) => o.id === 'pi')?.unverified).toBe(true);
  });

  it('prefers the short chip label over the registry display name', () => {
    const scan = scanOf([row({ id: 'droid', displayName: 'Factory Droid CLI' })]);
    const options = buildAgentOptions(scan, BOTH);
    expect(options[0]?.label).toBe('Droid');
  });
});

describe('the static picker list mirrors main', () => {
  /**
   * `LAUNCHABLE_OPTIONS` in state/agents.ts is a hand-written copy of main's
   * launchable registry — ids AND order — that nothing type-checks, so an
   * eleventh agent added to the registry would silently never appear in ⌘T
   * until someone edited the renderer too (research 25 §3, Tier 3). The
   * labels are a DELIBERATE difference ("Cursor" vs the registry's "Cursor
   * CLI"), so what is asserted here is the part that must not differ.
   */
  it('offers exactly main\'s launchable agents, in registry order', () => {
    const ids = buildAgentOptions(null, BOTH)
      .map((o) => o.id)
      .filter((id) => id !== 'shell');
    expect(ids).toEqual([...LAUNCHABLE_AGENT_IDS]);
  });
});

describe('defaultAgentChoice', () => {
  it('honors the Settings default agent when installed', () => {
    const options = buildAgentOptions(null, BOTH);
    expect(defaultAgentChoice(options, 'gemini')).toBe('gemini');
  });

  it('falls back to claude when the preferred agent is missing', () => {
    const scan = scanOf([
      row({ id: 'claude' }),
      row({ id: 'gemini', installed: false, binPath: null })
    ]);
    const options = buildAgentOptions(scan, BOTH);
    expect(defaultAgentChoice(options, 'gemini')).toBe('claude');
  });

  it('picks the first installed launchable when claude is missing too', () => {
    const scan = scanOf([
      row({ id: 'claude', installed: false, binPath: null }),
      row({ id: 'cursor', installed: false, binPath: null }),
      row({ id: 'codex' })
    ]);
    const options = buildAgentOptions(scan, BOTH);
    expect(defaultAgentChoice(options, 'claude')).toBe('codex');
  });

  it('lands on shell when nothing is installed', () => {
    const scan = scanOf([
      row({ id: 'claude', installed: false, binPath: null })
    ]);
    const options = buildAgentOptions(scan, BOTH);
    expect(defaultAgentChoice(options, 'claude')).toBe('shell');
  });
});
