/**
 * The disconnected new-session grid never offers more than a connected one
 * (Phase 235, item 5).
 *
 * ## The defect, measured on one machine in one profile
 *
 * MEASURED at 1bbcd7c1 on the operator's Mac Pro. Connected, the grid drew 13
 * tiles with **9 unavailable**, each `aria-disabled="true"` and reading
 * "<agent>, not on Greg’s Mac Pro", over an answer of 3 `present` and 9
 * `absent`. On the same machine in a run where the sign in never succeeded,
 * the same 13 tiles were drawn with **0 unavailable** and every one reading
 * "Start <agent>", over twelve `unknown` with `askedAt: null`. The board
 * GAINED nine options at the moment the machine got worse, and the empty
 * state under it then offered nine agents that machine does not have.
 *
 * The Phase 109 fix round measured the same shape from the other side and read
 * it as healing: after a failed Prepare, main answered 11 unknown and 0 absent
 * where the connection that had just died had said 9 were not there.
 *
 * ## What this file pins
 *
 * The RULE, over the shipping composer, as a count rather than a description:
 * the tiles a stale view leaves selectable are never more than the tiles the
 * live view left selectable. `machineAgentsView`'s own half of it, being that
 * a stale absence is kept and a stale presence and its path are dropped, is
 * pinned in src/main/machines/__tests__/machine-agents.test.ts over the real
 * held map and a real generation bump.
 *
 * `buildAgentOptions` DOES NOT MOVE. "Only a positive absent may grey a tile"
 * is research 58's ruling and this phase is not the round that changes it;
 * what changed is what main states, and this file reads the composer to prove
 * the statement reaches the grid.
 */

import { describe, expect, it } from 'vitest';
import type { MachineAgentsView } from '@shared/ipc';
import { buildAgentOptions } from '../agents';
import { machineAgentsFor } from '../machines-slice';

const BOTH = { claude: true, codex: true };

/** How many tiles a person could press. */
const offered = (view: MachineAgentsView | null): number =>
  buildAgentOptions(null, BOTH, view).filter((one) => one.installed).length;

const reading = (
  agentId: string,
  presence: MachineAgentsView['agents'][number]['presence'],
  path: string | null = null
): MachineAgentsView['agents'][number] => ({ agentId, presence, path });

/** The answer his Mac Pro really gave, in shape: 3 found and 9 not. */
const LIVE: MachineAgentsView = {
  machineId: 'mac-pro',
  askedAt: 1_757_000_000_000,
  agents: [
    reading('claude', 'present', '/Users/gdc/.local/bin/claude'),
    reading('cursor', 'present', '/Users/gdc/.local/bin/cursor-agent'),
    reading('codex', 'present', '/Users/gdc/.local/bin/codex'),
    reading('gemini', 'absent'),
    reading('droid', 'absent'),
    reading('deepseek', 'absent'),
    reading('antigravity', 'absent'),
    reading('muse', 'absent'),
    reading('qwen', 'absent'),
    reading('pi', 'absent'),
    reading('omp', 'absent'),
    reading('grok', 'absent')
  ]
};

/**
 * The same machine after its connection went, as `machineAgentsView` now
 * answers it: every absence kept, every presence and its path gone.
 */
const STALE: MachineAgentsView = {
  ...LIVE,
  agents: LIVE.agents.map((one) =>
    one.presence === 'present' ? reading(one.agentId, 'unknown') : one
  )
};

/** What it answered before this phase: the whole answer dropped. */
const PARENT: MachineAgentsView = {
  machineId: 'mac-pro',
  askedAt: null,
  agents: LIVE.agents.map((one) => reading(one.agentId, 'unknown'))
};

describe('the grid never grows when the machine goes away', () => {
  it('is the parent’s defect, stated as the two counts', () => {
    // 13 tiles, being 12 agents and Shell. Connected, 4 could be pressed.
    expect(buildAgentOptions(null, BOTH, LIVE)).toHaveLength(13);
    expect(offered(LIVE)).toBe(4);
    // At the parent, losing the machine made every one of the 13 pressable.
    expect(offered(PARENT)).toBe(13);
  });

  it('offers what was last known, and never more', () => {
    expect(offered(STALE)).toBe(offered(LIVE));
    expect(offered(STALE)).toBeLessThanOrEqual(offered(LIVE));
  });

  it('greys exactly the agents that machine said it did not have', () => {
    const greyed = buildAgentOptions(null, BOTH, STALE)
      .filter((one) => !one.installed)
      .map((one) => String(one.id))
      .sort();
    const said = LIVE.agents
      .filter((one) => one.presence === 'absent')
      .map((one) => one.agentId)
      .sort();
    expect(greyed).toEqual(said);
    expect(greyed).toHaveLength(9);
  });

  it('states no path from a connection that is gone', () => {
    expect(STALE.agents.every((one) => one.path === null)).toBe(true);
  });

  it('offers no install command on any machine, before or after', () => {
    for (const view of [LIVE, STALE, PARENT]) {
      for (const option of buildAgentOptions(null, BOTH, view)) {
        expect(option.install).toBeNull();
      }
    }
  });
});

describe('a machine nobody has asked', () => {
  it('greys nothing, because it has said nothing', () => {
    // Research 58's rule stands: only a POSITIVE absent may grey a tile, and
    // there is no last known to offer instead. The invented empty view a
    // machine with no row gets is this same case.
    const invented = machineAgentsFor([], 'never-asked');
    expect(invented).toEqual({
      machineId: 'never-asked',
      askedAt: null,
      agents: []
    });
    expect(offered(invented)).toBe(13);
  });

  it('is still never this Mac’s own scan', () => {
    expect(machineAgentsFor([], 'never-asked')).not.toBeNull();
    expect(machineAgentsFor([], 'local')).toBeNull();
    expect(machineAgentsFor([], null)).toBeNull();
  });
});
