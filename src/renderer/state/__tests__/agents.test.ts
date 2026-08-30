/**
 * Pure helpers behind the ⌘T agent picker (Phase 10 create-modal stream):
 * scan-driven options, optimistic fallback, and the explicit (never
 * alphabetical) default-agent choice.
 */

import { describe, expect, it } from 'vitest';
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import {
  agentBlockedReason,
  agentShortLabel,
  agentsGreyedByMachine,
  buildAgentOptions,
  defaultAgentChoice
} from '../agents';
import { AGENT_REGISTRY, LAUNCHABLE_AGENT_IDS } from '../../../main/agents/registry';

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
    expect(options).toHaveLength(13); // 12 launchable registry agents + shell
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

describe('the pre-scan seed agrees with main', () => {
  /**
   * `SEED_AGENTS` in state/agents.ts is a hand-written copy of main's
   * launchable registry — ids AND order — that nothing type-checks, so a
   * twelfth agent added to the registry would silently never appear in ⌘T
   * until someone edited the renderer too (research 25 §3, Tier 3). The
   * labels are a DELIBERATE difference ("Cursor" vs the registry's "Cursor
   * CLI"), so what is asserted here is the part that must not differ.
   *
   * These two run again inside `npm run conformance:agents`, alongside the
   * checks that need the create and restore paths. They are duplicated here
   * because `npm run test` is in the commit battery and catches the drift a
   * few seconds sooner.
   */
  it('offers exactly main\'s launchable agents, in registry order', () => {
    const ids = buildAgentOptions(null, BOTH)
      .map((o) => o.id)
      .filter((id) => id !== 'shell');
    expect(ids).toEqual([...LAUNCHABLE_AGENT_IDS]);
  });

  /**
   * Phase 23 C2. The seed used to compute this as `unverified: id === 'pi'`,
   * and both halves of that were wrong: droid is the unverified row and pi
   * has not been one since the Phase 13.5 audit. The picker labelled the
   * wrong agent "early" every time it drew before the scan landed.
   */
  it('marks the same agents unverified that the registry does', () => {
    const seeded = new Map(
      buildAgentOptions(null, BOTH)
        .filter((o) => o.id !== 'shell')
        .map((o) => [String(o.id), o.unverified])
    );
    for (const entry of AGENT_REGISTRY) {
      if (!entry.launchable) continue;
      expect([entry.id, seeded.get(entry.id)]).toEqual([
        entry.id,
        entry.unverified === true
      ]);
    }
  });
});

describe('an agent main compiled in nowhere', () => {
  /**
   * The Phase 23 case. A user-added agent exists only at run time, in main,
   * and reaches the renderer inside the `agents:list` scan. Nothing in this
   * module may filter it out, and its name has to survive into the copy that
   * puts an agent in a sentence.
   */
  const overlayRow = row({
    id: 'tortie-conformance-agent',
    displayName: 'Tortie Conformance Agent',
    iconKey: 'terminal'
  });

  it('becomes a picker chip with no edit to the renderer', () => {
    const options = buildAgentOptions(scanOf([row({ id: 'claude' }), overlayRow]), BOTH);
    const chip = options.find((o) => String(o.id) === 'tortie-conformance-agent');
    expect(chip?.label).toBe('Tortie Conformance Agent');
    expect(chip?.iconKey).toBe('terminal');
  });

  it('reads as its own name once a scan has carried it', () => {
    expect(agentShortLabel('never-scanned-agent')).toBe('never-scanned-agent');
    buildAgentOptions(scanOf([overlayRow]), BOTH);
    expect(agentShortLabel('tortie-conformance-agent')).toBe('Tortie Conformance Agent');
    // A scan must not overwrite the chosen chip copy for a compiled agent.
    expect(agentShortLabel('cursor')).toBe('Cursor');
  });
});

/**
 * PHASE 23 FIX ROUND. A verifier drove the real app and found the picker
 * offering an unconfirmed configured agent beside Claude Code, with the same
 * chip and the same enabled state. A person picked it, typed a name, pressed
 * Create and got a modal error. The scan says what is INSTALLED. The gate says
 * what may START. The picker has to read both.
 */
describe('a configured agent the confirm gate will refuse', () => {
  const configured = (state: DetectedAgent['configState']): DetectedAgent =>
    row({ id: 'owl', displayName: 'Owl', configState: state });

  /**
   * `AgentPickerOption.id` is still the closed `LaunchableAgentKind` union, so
   * a configured id is compared through `String` here exactly as the test
   * above does. Widening that union is a separate change with 130 call sites
   * behind it, and the option is built by a cast today, which is what the
   * re-baseline decided: the WIRE row carries any id, the compiled tables keep
   * their twelve literals.
   */
  const pick = (options: ReturnType<typeof buildAgentOptions>, id: string) =>
    options.find((o) => String(o.id) === id)!;

  it('carries the gate state onto the option', () => {
    const options = buildAgentOptions(scanOf([configured('never')]), BOTH);
    expect(pick(options, 'owl').configState).toBe('never');
  });

  it('leaves every compiled agent with no state at all', () => {
    const options = buildAgentOptions(scanOf([row({ id: 'claude' })]), BOTH);
    const claude = options.find((o) => o.id === 'claude');
    expect(claude?.configState).toBeNull();
    expect(agentBlockedReason(claude!)).toBeNull();
    // …and so does Shell, which is appended rather than scanned.
    expect(agentBlockedReason(options.find((o) => o.id === 'shell')!)).toBeNull();
  });

  it('gives a reason for each state that cannot start, and names where to fix it', () => {
    for (const state of ['never', 'changed', 'unknown'] as const) {
      const options = buildAgentOptions(scanOf([configured(state)]), BOTH);
      const reason = agentBlockedReason(pick(options, 'owl'));
      expect(reason).not.toBeNull();
      expect(reason).toContain('Owl');
    }
    const confirmed = buildAgentOptions(scanOf([configured('confirmed')]), BOTH);
    expect(agentBlockedReason(pick(confirmed, 'owl'))).toBeNull();
  });

  it('is never chosen as the default, even when it is the only agent installed', () => {
    const scan = scanOf([
      row({ id: 'claude', installed: false, binPath: null }),
      configured('never')
    ]);
    expect(defaultAgentChoice(buildAgentOptions(scan, BOTH), 'claude')).toBe('shell');
  });

  it('IS chosen once it has been confirmed', () => {
    const scan = scanOf([
      row({ id: 'claude', installed: false, binPath: null }),
      configured('confirmed')
    ]);
    expect(String(defaultAgentChoice(buildAgentOptions(scan, BOTH), 'claude'))).toBe('owl');
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

/**
 * PHASE 109 — the third input. On a tab whose files are on a machine, that
 * machine's own answer decides which tiles are selectable, and this Mac's
 * scan stops deciding it. Research 58 §8 rows 1 and 2 are the defects these
 * cases hold shut: a local `installed` bit greying a tile over there, and a
 * failed scan being read as absent.
 */
describe('the machine answer decides (Phase 109)', () => {
  const reading = (
    agentId: string,
    presence: 'present' | 'absent' | 'unknown'
  ) => ({
    agentId,
    presence,
    path: presence === 'present' ? `/usr/local/bin/${agentId}` : null
  });

  const view = (
    agents: ReturnType<typeof reading>[]
  ): import('@shared/ipc').MachineAgentsView => ({
    machineId: 'studio',
    askedAt: 1,
    agents
  });

  it('greys a tile only on a positive absent', () => {
    const scan = scanOf([row({ id: 'claude' }), row({ id: 'codex' })]);
    const options = buildAgentOptions(
      scan,
      BOTH,
      view([reading('claude', 'absent'), reading('codex', 'present')])
    );
    expect(options.find((o) => o.id === 'claude')?.installed).toBe(false);
    expect(options.find((o) => o.id === 'codex')?.installed).toBe(true);
  });

  it('does not consult the local installed bit at all', () => {
    // Installed there and NOT here: the tile draws on. This is defect row 1.
    const scan = scanOf([
      row({ id: 'droid', installed: false, binPath: null, version: null })
    ]);
    const options = buildAgentOptions(scan, BOTH, view([reading('droid', 'present')]));
    expect(options.find((o) => o.id === 'droid')?.installed).toBe(true);
    // Installed here and not there: the tile is greyed.
    const other = buildAgentOptions(
      scanOf([row({ id: 'droid' })]),
      BOTH,
      view([reading('droid', 'absent')])
    );
    expect(other.find((o) => o.id === 'droid')?.installed).toBe(false);
  });

  it('draws unknown on, and an agent the answer does not name on', () => {
    const scan = scanOf([
      row({ id: 'gemini', installed: false, binPath: null, version: null }),
      row({ id: 'qwen', installed: false, binPath: null, version: null })
    ]);
    const options = buildAgentOptions(scan, BOTH, view([reading('gemini', 'unknown')]));
    expect(options.find((o) => o.id === 'gemini')?.installed).toBe(true);
    expect(options.find((o) => o.id === 'qwen')?.installed).toBe(true);
  });

  it('draws every tile on when nothing is held, the all-unknown view', () => {
    const options = buildAgentOptions(null, BOTH, view([]));
    for (const one of options) expect(one.installed).toBe(true);
    expect(options).toHaveLength(13);
  });

  it('forces install to null on every option', () => {
    const withInstall = row({ id: 'claude' });
    withInstall.install = {
      command: 'npm install -g x',
      docUrl: 'https://example.com',
      readOn: '2026-08-01',
      canonicalIsPackageManager: true
    } as NonNullable<DetectedAgent['install']>;
    const options = buildAgentOptions(
      scanOf([withInstall]),
      BOTH,
      view([reading('claude', 'absent')])
    );
    for (const one of options) expect(one.install).toBeNull();
  });

  it('leaves shell selectable, because the far side is never asked about it', () => {
    const options = buildAgentOptions(null, BOTH, view([reading('claude', 'absent')]));
    const shell = options.find((o) => o.id === 'shell');
    expect(shell?.installed).toBe(true);
  });

  it('changes nothing on this Mac: the two-argument form and null agree', () => {
    const scan = scanOf([
      row({ id: 'claude' }),
      row({ id: 'droid', installed: false, binPath: null, version: null })
    ]);
    expect(buildAgentOptions(scan, BOTH, null)).toEqual(
      buildAgentOptions(scan, BOTH)
    );
  });
});

describe('agentsGreyedByMachine (Phase 109)', () => {
  const view: import('@shared/ipc').MachineAgentsView = {
    machineId: 'studio',
    askedAt: 1,
    agents: [{ agentId: 'claude', presence: 'absent', path: null }]
  };

  it('is true when that machine greyed at least one tile', () => {
    const options = buildAgentOptions(null, BOTH, view);
    expect(agentsGreyedByMachine(options, view)).toBe(true);
  });

  it('is false for this Mac even with a tile greyed by the local probe', () => {
    const options = buildAgentOptions(null, { claude: false, codex: true });
    expect(options.find((o) => o.id === 'claude')?.installed).toBe(false);
    expect(agentsGreyedByMachine(options, null)).toBe(false);
  });

  it('is false when the answer greyed nothing', () => {
    const allOn: import('@shared/ipc').MachineAgentsView = {
      machineId: 'studio',
      askedAt: null,
      agents: []
    };
    expect(agentsGreyedByMachine(buildAgentOptions(null, BOTH, allOn), allOn)).toBe(
      false
    );
  });
});
