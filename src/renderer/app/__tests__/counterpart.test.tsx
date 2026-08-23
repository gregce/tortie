/**
 * Phase 90.2, items 2 and 3 — the counterpart block in the create sheet.
 *
 * WHAT THESE TESTS HOLD.
 *  - Every outcome draws MAIN'S sentences, in the order main sent them, and
 *    the block writes none of its own for what a machine said. One fact in one
 *    wording.
 *  - The `several` case fills nothing. It offers the folders as a choice and
 *    every one of them needs a press.
 *  - The copy button is offered in the `absent` case and in no other, and only
 *    when there is an address to copy from.
 *  - The confirm names the exact address and the exact destination, and it
 *    carries the three fixed sentences a person reads before the press.
 *  - The whole block makes no call on render. Nothing reaches any machine
 *    until a person presses something.
 *  - The renderer never chooses the address. The copy call sends back the
 *    address the sheet was drawn from as `expectUrl`, and main is the one that
 *    decides what crosses.
 *  - The sheet refuses Escape and the background while a copy is running, and
 *    the fill never overwrites something a person typed. Both are read out of
 *    the sheet's source, because the environment is node.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. Pressing the confirm against a real machine is the Tier 3
 * live drive in the phase report, not this file.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  RemoteCloneResult,
  RemoteProjectFindResult
} from '@shared/ipc';

// The block's module graph reaches machines/presentation and the shared contract,
// neither of which reads the bridge. The bare window is here for the stateful
// wrapper's one feature detection, and it is the shape a renderer has before
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

import { REMOTE_PROJECT_MATCH_MAX } from '@shared/ipc';
import {
  CLONE_CONFIRM_BUTTON,
  CLONE_ONLY_WRITE,
  CLONE_PLAIN,
  cloneDestLabel,
  cloneNoCredential,
  clonePlanLine,
  cloneRunningLine,
  cloneTitle,
  COUNTERPART_CLONE_BUTTON,
  COUNTERPART_USE_MATCH,
  counterpartLooking
} from '../../machines/presentation';
import {
  cloneOffered,
  copyLanded,
  CounterpartBlock,
  CounterpartBlockView
} from '../CounterpartBlock';
import {
  createSheetCopyIsRunning,
  escapeMayCloseCreateSheet,
  setCreateSheetCopyRunning
} from '../create-copy-running';

const MODAL_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../CreateSessionModal.tsx'),
  'utf8'
);
const BLOCK_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../CounterpartBlock.tsx'),
  'utf8'
);
// Phase 127 moved the Escape ladder out of App.tsx and into its own module.
// The ladder is the same code and this test reads it where it now lives.
const LADDER_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../keyboard.ts'),
  'utf8'
);

/** An answer with quiet defaults, overridden per case. */
function found(over: Partial<RemoteProjectFindResult>): RemoteProjectFindResult {
  return {
    outcome: 'found',
    originUrl: 'https://github.com/gregce/tortie.git',
    cloneUrl: 'https://github.com/gregce/tortie.git',
    translated: false,
    matches: [{ path: '/Users/gdc/gmux' }],
    matchTotal: 1,
    searched: 31,
    suggestedPath: '/Users/gdc/gmux',
    sentences: ['Found at /Users/gdc/gmux on Studio.'],
    tookMs: 412,
    ...over
  };
}

/** A copy answer with quiet defaults, overridden per case. */
function copied(over: Partial<RemoteCloneResult>): RemoteCloneResult {
  return {
    outcome: 'cloned',
    path: '/Users/gdc/gmux',
    url: 'https://github.com/gregce/tortie.git',
    detail: '',
    sentences: ['Copied into /Users/gdc/gmux on Studio. Nothing on this Mac changed.'],
    tookMs: 8200,
    ...over
  };
}

function draw(over: Partial<Parameters<typeof CounterpartBlockView>[0]>): string {
  return renderToStaticMarkup(
    <CounterpartBlockView
      machineLabel="Studio"
      find={found({})}
      looking={false}
      confirmOpen={false}
      dest="/Users/gdc/gmux"
      clone={null}
      cloning={false}
      elapsedSeconds={0}
      onUsePath={() => {}}
      onOpenConfirm={() => {}}
      onCancelConfirm={() => {}}
      onDestChange={() => {}}
      onConfirm={() => {}}
      {...over}
    />
  );
}

/** Press one control in an element tree, with no DOM to click in. */
function press(node: unknown, action: string): void {
  const el = node as {
    props?: { children?: unknown; onClick?: () => void } & Record<
      string,
      unknown
    >;
  };
  if (el?.props === undefined) return;
  if (el.props['data-cpart-action'] === action) {
    el.props.onClick?.();
    return;
  }
  const kids = el.props.children;
  if (Array.isArray(kids)) kids.forEach((kid) => press(kid, action));
  else if (kids !== undefined) press(kids, action);
}

describe('what the block says about the machine', () => {
  it('says it is looking while it is looking, and claims nothing else', () => {
    const html = draw({ looking: true, find: null });
    expect(html).toContain(counterpartLooking('Studio'));
    expect(html).not.toContain(COUNTERPART_CLONE_BUTTON);
  });

  it("draws main's sentences, in the order main sent them", () => {
    const html = draw({
      find: found({
        sentences: ['The first sentence.', 'The second sentence.']
      })
    });
    expect(html.indexOf('The first sentence.')).toBeGreaterThan(-1);
    expect(html.indexOf('The first sentence.')).toBeLessThan(
      html.indexOf('The second sentence.')
    );
  });

  it('writes no sentence of its own about what a machine said', () => {
    // Every string this file draws for an answer comes from main. The proof is
    // that a block given no sentences draws none, whatever the outcome is.
    const html = draw({ find: found({ outcome: 'unreachable', sentences: [] }) });
    expect(html).not.toContain('did not answer');
    expect(html).not.toContain('git remote');
  });
});

describe('the several case', () => {
  it('offers each folder with a press, and fills nothing on its own', () => {
    const html = draw({
      find: found({
        outcome: 'several',
        matches: [{ path: '/a/gmux' }, { path: '/b/gmux' }],
        matchTotal: 2,
        sentences: ['2 folders on Studio have the same git remote.']
      })
    });
    expect(html).toContain('/a/gmux');
    expect(html).toContain('/b/gmux');
    expect(html.split(COUNTERPART_USE_MATCH).length - 1).toBe(2);
  });

  it('draws at most five folders, however many main sent', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      path: `/p${String(i)}/gmux`
    }));
    const html = draw({
      find: found({ outcome: 'several', matches: many, matchTotal: 9 })
    });
    expect(html.split(COUNTERPART_USE_MATCH).length - 1).toBe(
      REMOTE_PROJECT_MATCH_MAX
    );
  });

  it('hands back the path the machine reported, and never one it composed', () => {
    let chosen: string | null = null;
    const view = CounterpartBlockView({
      machineLabel: 'Studio',
      find: found({
        outcome: 'several',
        matches: [{ path: '/opt/work/gmux' }],
        matchTotal: 2
      }),
      looking: false,
      confirmOpen: false,
      dest: '',
      clone: null,
      cloning: false,
      elapsedSeconds: 0,
      onUsePath: (p) => {
        chosen = p;
      },
      onOpenConfirm: () => {},
      onCancelConfirm: () => {},
      onDestChange: () => {},
      onConfirm: () => {}
    });
    press(view, 'use');
    expect(chosen).toBe('/opt/work/gmux');
  });

  it('offers no folder buttons in the found case, where the field is filled', () => {
    expect(draw({})).not.toContain(COUNTERPART_USE_MATCH);
  });
});

describe('when the copy is offered', () => {
  it('is offered for absent with an address, and for nothing else', () => {
    expect(cloneOffered(found({ outcome: 'absent', matches: [] }))).toBe(true);
    expect(cloneOffered(found({}))).toBe(false);
    expect(cloneOffered(found({ outcome: 'several' }))).toBe(false);
    expect(cloneOffered(found({ outcome: 'unreachable' }))).toBe(false);
    expect(cloneOffered(found({ outcome: 'noRemote', cloneUrl: null }))).toBe(
      false
    );
    expect(cloneOffered(null)).toBe(false);
  });

  it('is not offered when there is no address to copy from', () => {
    // A project whose remote is a folder on this Mac. That machine cannot
    // reach it, so there is nothing to copy from and no button to press.
    expect(
      cloneOffered(found({ outcome: 'absent', cloneUrl: null, matches: [] }))
    ).toBe(false);
  });

  it('draws the button in the absent case', () => {
    const html = draw({
      find: found({ outcome: 'absent', matches: [], matchTotal: 0 })
    });
    expect(html).toContain(COUNTERPART_CLONE_BUTTON);
  });

  it('takes the button away once the copy landed, and leaves it when it did not', () => {
    const absent = found({ outcome: 'absent', matches: [], matchTotal: 0 });
    expect(copyLanded(copied({}))).toBe(true);
    expect(copyLanded(copied({ outcome: 'existsSame' }))).toBe(true);
    expect(copyLanded(copied({ outcome: 'exists' }))).toBe(false);
    expect(copyLanded(null)).toBe(false);
    expect(draw({ find: absent, clone: copied({}) })).not.toContain(
      COUNTERPART_CLONE_BUTTON
    );
    expect(
      draw({ find: absent, clone: copied({ outcome: 'unreachable' }) })
    ).toContain(COUNTERPART_CLONE_BUTTON);
  });
});

describe('the confirm', () => {
  const absent = found({ outcome: 'absent', matches: [], matchTotal: 0 });

  it('names the exact address and the exact destination', () => {
    const html = draw({ find: absent, confirmOpen: true, dest: '/tmp/here' });
    expect(html).toContain(
      clonePlanLine(
        'https://github.com/gregce/tortie.git',
        '/tmp/here',
        'Studio'
      )
    );
    expect(html).toContain(cloneTitle('Studio'));
    expect(html).toContain(cloneDestLabel('Studio'));
  });

  it('carries the three fixed sentences a person reads before the press', () => {
    const html = draw({ find: absent, confirmOpen: true });
    expect(html).toContain(CLONE_ONLY_WRITE);
    expect(html).toContain(cloneNoCredential('Studio'));
    expect(html).toContain(CLONE_PLAIN);
  });

  it('cannot be pressed with an empty destination', () => {
    const html = draw({ find: absent, confirmOpen: true, dest: '   ' });
    expect(html).toContain(CLONE_CONFIRM_BUTTON);
    expect(html).toContain('disabled');
  });

  it('says how long the copy has been running, and says why it will not close', () => {
    const html = draw({
      find: absent,
      confirmOpen: true,
      dest: '/tmp/here',
      cloning: true,
      elapsedSeconds: 42
    });
    expect(html).toContain(cloneRunningLine('Studio', '/tmp/here', 42));
    expect(html).toContain('42 seconds so far');
  });
});

describe('what the machine reported', () => {
  it("draws main's sentences for the copy, and the machine's own words under them", () => {
    const html = draw({
      clone: copied({
        outcome: 'failed',
        detail: 'fatal: repository not found',
        sentences: ['Studio could not copy that address.']
      })
    });
    expect(html).toContain('Studio could not copy that address.');
    expect(html).toContain('fatal: repository not found');
  });

  it('draws no block of machine words when there are none', () => {
    expect(draw({ clone: copied({}) })).not.toContain('cpart-detail');
  });
});

describe('what the block does on its own', () => {
  it('makes no call on render', () => {
    let calls = 0;
    (globalThis as { window: { gmux?: unknown } }).window.gmux = {
      machines: {
        findProject: () => {
          calls += 1;
          return Promise.resolve(found({}));
        },
        cloneProject: () => {
          calls += 1;
          return Promise.resolve(copied({}));
        }
      }
    };
    renderToStaticMarkup(
      <CounterpartBlock
        machineId="studio"
        machineLabel="Studio"
        localPath="/Users/gdc/gmux"
        find={found({ outcome: 'absent', matches: [] })}
        looking={false}
        onUsePath={() => {}}
        onBusyChange={() => {}}
      />
    );
    expect(calls).toBe(0);
    (globalThis as { window: { gmux?: unknown } }).window.gmux = undefined;
  });

  it('sends the address the sheet was drawn from, and lets main decide', () => {
    // The renderer never chooses what crosses. It sends back what it drew, and
    // main re-reads the remote from the project folder and refuses when the
    // two disagree.
    expect(BLOCK_SOURCE).toContain('expectUrl: url');
    expect(BLOCK_SOURCE).toContain("find?.cloneUrl ?? null");
  });
});

describe('the two rules the create sheet owns', () => {
  it('never fills the Directory field over something a person typed', () => {
    expect(MODAL_SOURCE).toContain('fillDirectoryIfEmpty');
    expect(MODAL_SOURCE).toContain(
      "setCwd((current) => (current.trim().length === 0 ? path : current));"
    );
  });

  it('refuses Escape and the background while a copy is running', () => {
    // Two call sites, being the scrim's mouse handler and the dialog's close
    // handler. Both read the same flag, so neither can be relaxed alone.
    expect(MODAL_SOURCE.split('if (cloneBusy) return;').length - 1).toBe(2);
    expect(MODAL_SOURCE).toContain('dirError !== null || cloneBusy');
  });

  it('hands the same answer to the ladder that actually gets Escape', () => {
    // THE TWO GUARDS ABOVE ARE NOT ENOUGH AND THIS IS WHY. App.tsx's Escape
    // ladder is a capture-phase listener on `window`. It runs before the
    // dialog's own key handler and calls `stopPropagation`, so the dialog's
    // guard never sees Escape while the app shell is mounted. The sheet was
    // closed by the ladder during a real copy onto the operator's Mac Pro, and
    // this test exists because of that run.
    expect(MODAL_SOURCE).toContain('setCreateSheetCopyRunning(cloneBusy)');
    expect(MODAL_SOURCE).toContain("from './create-copy-running'");
  });

  it('asks one machine on the machine choice and never on a keystroke', () => {
    // One definition, and one call site inside the machine field's own
    // onChange. A second call site would be a second question per gesture.
    expect(MODAL_SOURCE).toContain('const startCounterpartLookup =');
    expect(MODAL_SOURCE.split('startCounterpartLookup(').length - 1).toBe(1);
  });
});

describe('Escape while a copy is running', () => {
  /**
   * THE FIX ROUND'S OWN TESTS, and the run that made them necessary is worth
   * writing down. During a real copy of a 76 MB project onto the operator's Mac
   * Pro one Escape was pressed. The sheet closed, the result panel never drew,
   * and the copy went on landing on his computer with nothing on screen. The
   * background click was refused correctly the whole time, because that guard
   * sits on a mousedown on an element and no ladder takes mouse events.
   *
   * WHAT THESE THREE HOLD. The answer the ladder reads moves with the state on
   * screen, the sheet is what moves it, and the ladder asks before it closes.
   *
   * WHAT THEY DO NOT HOLD. No key is pressed here. This test environment is
   * node and has no DOM at all, so there is no window to dispatch a key at and
   * no React tree to mount. The behavioural proof is the live drive named in
   * the phase report, which pressed Escape during a real copy and read the
   * sheet back still on screen.
   */
  beforeEach(() => {
    setCreateSheetCopyRunning(false);
  });

  it('refuses Escape while a copy is running and allows it otherwise', () => {
    expect(escapeMayCloseCreateSheet()).toBe(true);
    setCreateSheetCopyRunning(true);
    expect(createSheetCopyIsRunning()).toBe(true);
    expect(escapeMayCloseCreateSheet()).toBe(false);
    setCreateSheetCopyRunning(false);
    expect(escapeMayCloseCreateSheet()).toBe(true);
  });

  it('is the ladder that asks, because the ladder is what gets the key', () => {
    // One branch, and the guard is inside it. A ladder that closed the sheet
    // without asking is the defect this round fixed, so the unguarded line is
    // asserted absent rather than only the guarded one asserted present.
    expect(LADDER_SOURCE).toContain(
      'if (escapeMayCloseCreateSheet()) s.setCreateOpen(false);'
    );
    expect(LADDER_SOURCE).not.toContain('\n          s.setCreateOpen(false);');
  });

  it('says nothing at all while no sheet is open', () => {
    // The sheet clears the flag when it unmounts, so a stuck true cannot
    // survive one and refuse Escape for the rest of the session.
    expect(escapeMayCloseCreateSheet()).toBe(true);
  });
});
