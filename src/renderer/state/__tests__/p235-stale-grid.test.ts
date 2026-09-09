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
 *
 * AND THE HALF THAT IS NOT CLOSED IS PINNED AS A LIMIT, at the bottom of this
 * file. A machine THIS RUN never reached still offers every tile, because the
 * held answer is per process and there is no last known to offer; the charter's
 * own sentence for item 5 is that reading, and the fix round made it an
 * assertion on both sides so that closing it cannot happen in silence.
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

describe('a machine nobody has asked, which is the charter’s OTHER half', () => {
  /**
   * PHASE 235's FIX ROUND MADE THIS A STATED LIMIT rather than an answer.
   *
   * The charter's item 5 reads "disconnected, all 14 are offered", and this is
   * where that is still true: a machine THIS RUN never reached offers every
   * tile, where a connected one offers four. What the phase closed is the other
   * shape, being a board that HAD answered and then lost its connection, which
   * used to drop the whole answer and gain nine options at the moment the
   * machine got worse.
   *
   * It is not closed here for a reason rather than by omission. Research 58's
   * ruling is that only a POSITIVE absence may grey a tile, and the held answer
   * is per process, so a launch that never reached the machine holds no last
   * known to offer: closing it needs a durable record of what a machine last
   * said, which is a store this product does not have and a decision about how
   * old an absence may be before it stops greying a tile. That is a phase, not
   * a nit.
   *
   * So the limit is pinned from BOTH sides here and graded in
   * `build/probe-p235-nits.mjs` item 5, which fails the run the day either
   * number moves. A round that closes it edits this block, that reading and the
   * Phase 235 entry together.
   */
  it('greys nothing, because it has said nothing', () => {
    // Only a POSITIVE absent may grey a tile, and there is no last known to
    // offer instead. The invented empty view a machine with no row gets is
    // this same case.
    const invented = machineAgentsFor([], 'never-asked');
    expect(invented).toEqual({
      machineId: 'never-asked',
      askedAt: null,
      agents: []
    });
  });

  it('STATED LIMIT: it therefore offers MORE than a connected machine does', () => {
    const invented = machineAgentsFor([], 'never-asked');
    // 13 of 13 against 4 of 13. This is the charter reading this phase did not
    // move, and the assertion is here so that closing it cannot be silent.
    expect(offered(invented)).toBe(13);
    expect(offered(LIVE)).toBe(4);
    expect(offered(invented)).toBeGreaterThan(offered(LIVE));
    // And a machine that DID answer once is the half that is closed, so the
    // two shapes can never be confused for each other again.
    expect(offered(STALE)).toBe(offered(LIVE));
  });

  it('is still never this Mac’s own scan', () => {
    expect(machineAgentsFor([], 'never-asked')).not.toBeNull();
    expect(machineAgentsFor([], 'local')).toBeNull();
    expect(machineAgentsFor([], null)).toBeNull();
  });
});
