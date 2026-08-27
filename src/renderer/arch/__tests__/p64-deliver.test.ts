/**
 * THE DELIVERY GUARD, AND THE NEGATIVE CONTROL (Phase 64).
 *
 * The charter owes a proof that removes the restriction to a session Tortie
 * launched and shows a foreign pane then accepts the block, so that the
 * refusal is demonstrably the guard rather than luck. That proof is here in
 * the only form a unit test can honestly give it: the SAME session, the SAME
 * status, the SAME agent, offered to the SAME function twice, differing in
 * exactly one thing, being whether it is in the sessions slice at all. It is
 * refused in one case and admitted in the other, and nothing else moved.
 *
 * Membership in that slice IS the launched-by-Tortie proof.
 * `src/main/manifest/reconstruct.ts` states the rule: a live session carrying
 * neither an `@gmux-id` nor a `GMUX_SESSION_ID` is not ours, it is reported as
 * foreign, and there is no decision, no option and no flag that turns it into
 * a row.
 *
 * The app run and the per agent matrix are what prove the delivery itself. A
 * test cannot paste into a real agent and this file does not pretend to.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';
import { archViewGapId, parseArchGapId } from '@shared/arch-ids';

const listeners = new Map<string, Set<(e: unknown) => void>>();

vi.stubGlobal('window', {
  addEventListener(type: string, fn: (e: unknown) => void) {
    const set = listeners.get(type) ?? new Set<(e: unknown) => void>();
    set.add(fn);
    listeners.set(type, set);
  },
  removeEventListener(type: string, fn: (e: unknown) => void) {
    listeners.get(type)?.delete(fn);
  },
  // A `term` member exists so `canInsert` can answer true. Nothing in this
  // file ever calls it: every test here stops at the guard.
  gmux: { term: { sendInput: () => undefined } }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  querySelector: () => null
});

const { useApp } = await import('../../state/store');
const { canDeliverTo, deliverPayload } = await import('../deliver');
const copy = await import('../aim-copy');

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    name: 'claude-1',
    tmuxName: 'claude-1',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'idle',
    createdAt: 0,
    ...over
  } as Session;
}

/** Put exactly these rows in the slice, and nothing else. */
function slice(rows: Session[]): void {
  useApp.setState({ sessions: rows });
}

beforeEach(() => {
  slice([]);
});

describe('the one guard', () => {
  it('refuses when nothing is aimed at', () => {
    const r = canDeliverTo(null);
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_NO_SESSION);
  });

  /**
   * THE NEGATIVE CONTROL, both halves in one test so the pair cannot drift.
   *
   * The first half is the refusal the phase claims. The second half removes
   * the ONE condition that produced it, by putting the very same session into
   * the slice, and the answer flips. If the guard were doing nothing, the
   * first half would already have been admitted.
   */
  it('refuses a session Tortie did not launch, and admits the same one when it did', () => {
    const foreign = session({ id: 'not-ours' });

    // Not in the slice: Tortie never adopted it, so it is not ours.
    const refused = canDeliverTo(foreign.id);
    expect(refused.ok).toBe(false);
    expect(refused.ok ? '' : refused.reason).toBe(copy.AIM_FOREIGN_SESSION);

    // The identical session, now a row Tortie holds. Nothing else changed.
    slice([foreign]);
    const admitted = canDeliverTo(foreign.id);
    expect(admitted.ok).toBe(true);
  });

  it('refuses a shell, which has no agent prompt to aim', () => {
    const shell = session({ id: 'sh', agent: 'shell' });
    slice([shell]);
    const r = canDeliverTo(shell.id);
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_SHELL_SESSION);
  });

  it('refuses a session that has ended', () => {
    const dead = session({ status: 'exited' });
    slice([dead]);
    const r = canDeliverTo(dead.id);
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_SESSION_NOT_RUNNING);
  });

  it('refuses a session that can be restored but is not running', () => {
    const saved = session({ status: 'restorable' });
    slice([saved]);
    expect(canDeliverTo(saved.id).ok).toBe(false);
  });

  /**
   * PHASE 67 IS WHY THIS ONE MATTERS MOST.
   *
   * While a session reads `unknown` the terminal's own `onData` handler drops
   * everything at the source, including the `noteTerminalInput` call. A paste
   * into that pane reaches nothing at all and still returns void, so a
   * composed block would be swallowed with no error anywhere. The guard reads
   * that status through `paneAccepts`, which is the one shared reading, and
   * refuses before composing.
   */
  it('refuses a session whose state Tortie cannot currently tell', () => {
    const unsure = session({ status: 'unknown' });
    slice([unsure]);
    const r = canDeliverTo(unsure.id);
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_SESSION_UNKNOWN);
  });
});

describe('the send', () => {
  /**
   * A native menu holds an OS mouse grab and can stay open across a session
   * ending, so the picker's answer is stale by exactly the width of the menu.
   * The write asks again.
   */
  it('asks the guard again at the moment of the write', () => {
    const s = session();
    slice([s]);
    expect(canDeliverTo(s.id).ok).toBe(true);
    // The session ends while the menu is open.
    slice([]);
    const r = deliverPayload(s.id, 'a scope');
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_FOREIGN_SESSION);
  });

  it('sends nothing for an empty payload', () => {
    const s = session();
    slice([s]);
    expect(deliverPayload(s.id, '').ok).toBe(false);
  });

  /**
   * No live terminal is registered in this environment, so the paste itself
   * cannot land. That is the RIGHT answer and it is asserted rather than
   * worked around: `insertBlock` refuses a pane with no registered terminal
   * instead of falling back to the bridge write, which would go around the
   * Phase 67 refusal above.
   */
  it('refuses rather than writing through the bridge when no terminal is live', () => {
    const s = session();
    slice([s]);
    const r = deliverPayload(s.id, 'a scope');
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.reason).toBe(copy.AIM_SESSION_NOT_RUNNING);
  });
});

describe('what the sentences promise', () => {
  it('says the person presses Return, on the surface that opens the picker', () => {
    expect(copy.AIM_PICKER_SUBLABEL).toContain('press Return');
    expect(copy.aimLanded('claude-1', 1)).toContain('press Return');
  });

  it('uses no tmux vocabulary anywhere', () => {
    const said: string[] = [];
    for (const value of Object.values(copy) as unknown[]) {
      if (typeof value === 'string') said.push(value);
    }
    said.push(copy.aimLanded('claude-1', 2), copy.aimBrokenTargetTitle(3));
    for (const line of said) {
      expect(line.toLowerCase()).not.toContain('pane');
      expect(line.toLowerCase()).not.toContain('tmux');
      expect(line.toLowerCase()).not.toContain('prefix');
      expect(line.toLowerCase()).not.toContain('paste');
    }
  });
});

// ---------------------------------------------------------------------------
// The picker's rows, read as data
// ---------------------------------------------------------------------------

/**
 * A real macOS popup cannot be read or photographed from outside the app, and
 * Phases 119, 152 and 153 each measured that separately. So the picker's rows
 * are asserted as the SPEC it hands to `setMenu`, which is the same thing the
 * bridge sends to `Menu.popup`, and the app run proves the menu actually
 * raises.
 */
const { buildAimMenu, buildBrokenTargetMenu } = await import('../picker');
const { useArch } = await import('../store');

function labels(items: readonly unknown[]): string[] {
  return items.map((i) =>
    i === 'sep' ? '—' : ((i as { label: string }).label)
  );
}

describe('the picker, as a menu spec', () => {
  beforeEach(() => {
    useArch.setState({
      load: null,
      lastCheck: null,
      selected: []
    });
  });

  it('says what to do when there is no contract, rather than opening empty', () => {
    const menu = buildAimMenu({ x: 1, y: 2 }, () => undefined);
    expect(labels(menu.items)).toContain(copy.AIM_NO_CONTRACT);
  });

  it('lists the parts, the broken promises and the gaps, each under its own heading', () => {
    useArch.setState({
      load: {
        present: true,
        contract: { subject: 'x' },
        components: [
          { id: 'core', name: 'Core', description: '', anchors: [], gaps: ['no tests'], provenance: 'ours' },
          { id: 'ui', name: 'UI', description: '', anchors: [], gaps: [], provenance: 'ours' }
        ],
        edges: [],
        problems: [],
        verdicts: [
          { subjectId: 'edge:core-ui', status: 'divergent', coverage: 'checked', checkedAtCommit: '0', generation: 1, firstCheck: false, reason: null, durationMs: 0 }
        ],
        counts: null,
        freshness: [],
        baseline: { accepted: [] }
      } as never
    });
    const menu = buildAimMenu({ x: 0, y: 0 }, () => undefined);
    const got = labels(menu.items);
    expect(got).toContain(copy.AIM_GROUP_PARTS);
    expect(got).toContain('Core');
    expect(got).toContain('UI');
    expect(got).toContain(copy.AIM_GROUP_BROKEN);
    expect(got).toContain('edge:core-ui');
    expect(got).toContain(copy.AIM_GROUP_GAPS);
    expect(got.some((l) => l.startsWith('Core: no tests'))).toBe(true);
  });

  it('hands the picked subject id back and composes nothing itself', () => {
    useArch.setState({
      load: {
        present: true,
        contract: { subject: 'x' },
        components: [
          { id: 'core', name: 'Core', description: '', anchors: [], gaps: [], provenance: 'ours' }
        ],
        edges: [],
        problems: [],
        verdicts: [],
        counts: null,
        freshness: [],
        baseline: { accepted: [] }
      } as never
    });
    let picked: readonly string[] = [];
    const menu = buildAimMenu({ x: 0, y: 0 }, (ids) => {
      picked = ids;
    });
    const row = menu.items.find(
      (i) => i !== 'sep' && (i as { label: string }).label === 'Core'
    );
    (row as { run: () => void }).run();
    expect(picked).toEqual(['component:core']);
  });

  it('asks once before aiming at something that matches no files', () => {
    let confirmed = false;
    const menu = buildBrokenTargetMenu({ x: 0, y: 0 }, 2, () => {
      confirmed = true;
    });
    const got = labels(menu.items);
    expect(got[0]).toBe(copy.aimBrokenTargetTitle(2));
    expect(got).toContain(copy.AIM_BROKEN_TARGET_SEND);
    expect(got).toContain(copy.AIM_BROKEN_TARGET_CANCEL);
    // The cancel row runs nothing at all.
    const cancel = menu.items.find(
      (i) => i !== 'sep' && (i as { label: string }).label === copy.AIM_BROKEN_TARGET_CANCEL
    );
    (cancel as { run: () => void }).run();
    expect(confirmed).toBe(false);
    const go = menu.items.find(
      (i) => i !== 'sep' && (i as { label: string }).label === copy.AIM_BROKEN_TARGET_SEND
    );
    (go as { run: () => void }).run();
    expect(confirmed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The seam between the view's subject ids and the channel's three lists
// ---------------------------------------------------------------------------

/**
 * TWO SPELLINGS OF A GAP EXIST AND THIS IS THE SEAM, so it is pinned here
 * rather than left to be discovered when a payload quietly loses every gap.
 *
 * The view has written `gap:<componentId>:<n>` since Phase 63. The composer
 * takes `component:<id>#gap:<n>`. `splitSubjects` is the one function that
 * crosses between them, and the composer reports an id it does not recognise
 * in `unknownIds` rather than failing, so a wrong spelling here would show up
 * as a payload with no gaps in it and no error anywhere.
 *
 * THE TRANSLATION ITSELF IS NO LONGER IN THE RENDERER. The integrator moved
 * both spellings and the one translation into `src/shared/arch-ids.ts`, which
 * both processes name, because the format had been written out by hand in five
 * places. `splitSubjects` still owns the sorting into three lists and calls
 * that file for the shape, and the last test below is what proves the two ends
 * agree rather than merely look alike.
 */
const { splitSubjects } = await import('../picker');

describe('subject ids across the channel', () => {
  it('sorts each kind into its own list and translates the gap spelling', () => {
    expect(
      splitSubjects([
        'component:core',
        'gap:core:2',
        'edge:core-ui',
        'component:ui'
      ])
    ).toEqual({
      componentIds: ['core', 'ui'],
      gapIds: ['component:core#gap:2'],
      verdictIds: ['edge:core-ui']
    });
  });

  /**
   * THE INTEGRATOR CHANGED THIS ANSWER, and the old one was wrong.
   *
   * The first version of this test pinned `gap:main:arch:0` as translating to
   * `component:main:arch#gap:0`, on the reasoning that a part id containing a
   * colon should be kept whole. A part id CANNOT contain a colon:
   * `ARCH_ID_PATTERN` in `src/shared/arch.ts` is `^[a-z][a-z0-9-]{0,63}$` and
   * `idField` in `src/main/arch/schema.ts` drops any row whose id fails it. So
   * that string names nothing, and the id the renderer used to manufacture out
   * of it was one the composer's own `parseArchGapId` rejects, which means the
   * gap vanished from the payload with no error anywhere. Both ends now read
   * the same pattern out of one file, so the string is refused at the seam
   * instead of being carried across it and dropped on the far side.
   */
  it('drops a gap id whose part id could never have been valid', () => {
    expect(splitSubjects(['gap:main:arch:0']).gapIds).toEqual([]);
  });

  it('drops a gap id whose index is not digits', () => {
    expect(splitSubjects(['gap:core:last']).gapIds).toEqual([]);
  });

  it('drops a gap id with no index rather than guessing at one', () => {
    expect(splitSubjects(['gap:core']).gapIds).toEqual([]);
  });

  it('answers with three empty lists for an empty selection', () => {
    expect(splitSubjects([])).toEqual({
      componentIds: [],
      gapIds: [],
      verdictIds: []
    });
  });

  /**
   * THE TWO ENDS, DRIVEN AGAINST EACH OTHER RATHER THAN READ.
   *
   * `parseArchGapId` is the composer's own reader, and it is what decides
   * whether a gap reaches the block or lands in `unknownIds`. Every id the
   * renderer emits is fed to it here, so a later round that loosens one
   * spelling and not the other fails on this line rather than on a payload
   * somebody notices is missing a paragraph.
   */
  it('emits only gap ids the composer itself accepts', () => {
    const emitted = [0, 1, 9, 42, 9999].map((i) => archViewGapId('core-ui', i));
    const { gapIds } = splitSubjects(emitted);
    expect(gapIds).toHaveLength(emitted.length);
    for (const [at, id] of gapIds.entries()) {
      expect(parseArchGapId(id)).toEqual({
        componentId: 'core-ui',
        index: [0, 1, 9, 42, 9999][at]
      });
    }
  });

  it('refuses at the seam every shape the composer would refuse', () => {
    const impossible = [
      'gap:core',
      'gap::0',
      'gap:Core:0',
      'gap:core:',
      'gap:core:00000',
      'gap:core:-1',
      'gap:main:arch:0'
    ];
    expect(splitSubjects(impossible).gapIds).toEqual([]);
    for (const id of impossible) {
      expect(parseArchGapId(id.replace(/^gap:/, 'component:'))).toBeNull();
    }
  });
});
