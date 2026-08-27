/**
 * THE AIMING VERB, DRIVEN (Phase 64, fix round).
 *
 * ## The hole this file closes
 *
 * `p64-deliver.test.ts` beside it asserts the guard, and it asserts the rows
 * `buildBrokenTargetMenu` composes. Nothing asserted the ONE LINE that decides
 * whether a block whose target no longer exists reaches an agent before the
 * question is asked or after it. That line is:
 *
 *     if (payload.brokenTarget) { app.setMenu(buildBrokenTargetMenu(…)); return; }
 *
 * and the `return` is the whole gate. A later edit that dropped it would send
 * the block FIRST and ask afterwards, and every gate, every conformance run and
 * every test in this repository would still have been green. This is Tier 3
 * code: the text reaches a running agent that will act on it.
 *
 * ## It drives the shipped path rather than a seam opened for it
 *
 * `aim` is not exported and this file does not export it. It is reached through
 * `aimSelection`, which is what the Architecture view's own control calls, so
 * what is measured here is the sequence a person actually causes. The composer
 * is a stub on the bridge, because the composer is proved byte for byte in
 * `npm run conformance:arch` and re-proving it here would measure nothing new.
 * The terminal is a fake registered under the session's own id, so the paste
 * has somewhere real to land and "it did not send" cannot be an accident of the
 * environment. That was the defect in the first build's negative control and it
 * is not repeated here.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

const composePayload = vi.fn();
const pasted: string[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  gmux: {
    term: { sendInput: () => undefined },
    arch: { load: () => Promise.resolve(null), composePayload }
  }
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
const { installShellOps, resetShellOps } = await import('../../state/shell-ops');
const { useArch } = await import('../store');
const { registerTerminal } = await import('../../terminal/drop/registry');
const { aimSelection } = await import('../picker');
const copy = await import('../aim-copy');

/** A terminal that is live enough to accept a paste and to record it. */
const fakeTerm = {
  focus: () => undefined,
  paste: (text: string) => {
    pasted.push(text);
  }
} as unknown as Parameters<typeof registerTerminal>[1];

const SESSION: Session = {
  id: 'sess-1',
  name: 'claude-1',
  tmuxName: 'claude-1',
  projectPath: '/repo',
  cwd: '/repo',
  agent: 'claude',
  status: 'idle',
  createdAt: 0
} as Session;

const BLOCK = 'THE SCOPE BLOCK\nwith a second line';

/** Everything a person has to have done before the verb can run at all. */
function stage(): void {
  useApp.setState({
    sessions: [SESSION],
    projects: [{ id: 'p1', name: 'repo', path: '/repo' }] as never,
    activeProjectId: 'p1',
    activeSessionByProject: { p1: 'sess-1' },
    menu: null,
    toasts: []
  } as never);
  useArch.setState({ selected: ['component:core'] } as never);
}

/**
 * The menus the verb raised, caught at the seam the store hands them to.
 *
 * `setMenu` keeps nothing in state: it calls `shellOps().showNativeMenu`,
 * which is the one door on to `ui:popupMenu` and `Menu.popup`. Catching it
 * here is therefore the closest a test can stand to the real popup, and it is
 * also a standing proof that the picker draws no DOM: there is no other
 * surface for a menu to arrive on.
 */
const raised: { items: unknown[] }[] = [];

/** The rows of the LAST menu raised. */
function menuLabels(): string[] {
  const menu = raised[raised.length - 1];
  if (menu === undefined) return [];
  return menu.items.map((i) =>
    i === 'sep' ? '—' : (i as { label: string }).label
  );
}

function runRow(label: string): void {
  const menu = raised[raised.length - 1];
  const row = menu?.items.find(
    (i) => i !== 'sep' && (i as { label: string }).label === label
  );
  (row as { run: () => void }).run();
}

beforeEach(() => {
  pasted.length = 0;
  raised.length = 0;
  composePayload.mockReset();
  resetShellOps();
  installShellOps({
    showNativeMenu(menu) {
      raised.push(menu as unknown as { items: unknown[] });
    },
    cancelPointerDrag() {},
    focusFleetPrimary() {},
    ensureEditorSubscribed() {}
  });
  registerTerminal(SESSION.id, fakeTerm);
  stage();
});

describe('the gate for a target that no longer exists', () => {
  /** The whole point. Nothing may be written before the question is answered. */
  it('asks first and sends nothing, when the selection matches no files', async () => {
    composePayload.mockResolvedValue({
      text: BLOCK,
      brokenTarget: true,
      brokenTargetIds: ['core'],
      deadAnchors: [{ componentId: 'core', anchor: 'src/gone/**' }],
      unknownIds: [],
      proseWithheld: []
    });

    await aimSelection();

    expect(composePayload).toHaveBeenCalledTimes(1);
    // NOT ONE BYTE. This is the assertion the missing `return` would break.
    expect(pasted).toEqual([]);
    const rows = menuLabels();
    expect(rows[0]).toBe(copy.aimBrokenTargetTitle(1));
    expect(rows).toContain(copy.AIM_BROKEN_TARGET_SEND);
    expect(rows).toContain(copy.AIM_BROKEN_TARGET_CANCEL);
  });

  it('sends the block once when the person confirms, and never presses Return', async () => {
    composePayload.mockResolvedValue({
      text: BLOCK,
      brokenTarget: true,
      brokenTargetIds: ['core'],
      deadAnchors: [],
      unknownIds: [],
      proseWithheld: []
    });

    await aimSelection();
    expect(pasted).toEqual([]);
    runRow(copy.AIM_BROKEN_TARGET_SEND);

    expect(pasted).toEqual([BLOCK]);
    // One paste, and nothing after it. `insertBlock` is the only write and it
    // presses no key, so a Return would have to be a second entry here.
    expect(pasted).toHaveLength(1);
  });

  it('sends nothing at all when the person cancels', async () => {
    composePayload.mockResolvedValue({
      text: BLOCK,
      brokenTarget: true,
      brokenTargetIds: ['core', 'ui'],
      deadAnchors: [],
      unknownIds: [],
      proseWithheld: []
    });

    await aimSelection();
    runRow(copy.AIM_BROKEN_TARGET_CANCEL);
    expect(pasted).toEqual([]);
  });

  /**
   * THE COUNT IS WHAT MAIN FOUND BROKEN, not what the person selected. Two
   * parts picked and one of them dead must say one, or the sentence tells a
   * person something false about their own repository.
   */
  it('names how many parts main found broken, not how many were picked', async () => {
    useArch.setState({ selected: ['component:core', 'component:ui'] } as never);
    composePayload.mockResolvedValue({
      text: BLOCK,
      brokenTarget: true,
      brokenTargetIds: ['core'],
      deadAnchors: [],
      unknownIds: [],
      proseWithheld: []
    });
    await aimSelection();
    expect(menuLabels()[0]).toBe(copy.aimBrokenTargetTitle(1));
  });
});

describe('the ordinary path', () => {
  it('sends straight away when nothing is broken, and raises no question', async () => {
    composePayload.mockResolvedValue({
      text: BLOCK,
      brokenTarget: false,
      brokenTargetIds: [],
      deadAnchors: [],
      unknownIds: [],
      proseWithheld: []
    });

    await aimSelection();

    expect(pasted).toEqual([BLOCK]);
    expect(menuLabels()).toEqual([]);
  });

  it('sends nothing when the composer answers with no text', async () => {
    composePayload.mockResolvedValue({
      text: '',
      brokenTarget: false,
      brokenTargetIds: [],
      deadAnchors: [],
      unknownIds: [],
      proseWithheld: []
    });
    await aimSelection();
    expect(pasted).toEqual([]);
  });

  it('sends nothing when the composer throws', async () => {
    composePayload.mockRejectedValue(new Error('no contract here'));
    await aimSelection();
    expect(pasted).toEqual([]);
  });

  it('composes nothing at all when nothing is selected', async () => {
    useArch.setState({ selected: [] } as never);
    await aimSelection();
    expect(composePayload).not.toHaveBeenCalled();
    expect(pasted).toEqual([]);
  });

  /**
   * The guard is asked before the composer runs, so a session Tortie did not
   * launch never even causes a composition, let alone a write.
   */
  it('composes nothing for a session Tortie did not launch', async () => {
    useApp.setState({ sessions: [] } as never);
    await aimSelection();
    expect(composePayload).not.toHaveBeenCalled();
    expect(pasted).toEqual([]);
  });
});
