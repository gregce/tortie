/**
 * PHASE 340. One machine row: a name, a status chip, one line of facts, one
 * button for the next thing and a ⋯ button whose menu is native
 * (build/p340/SPEC.md D11 as revised, D12, D17, D20, D22, D23, section 5.2).
 *
 * What these tests hold:
 * - A Ready row at rest reads at most sixteen words (the label `studio`). The
 *   parent's row read 25 shut and 163 to 200 open.
 * - No element on the row, in any state or with any panel open, carries a menu
 *   role, and no row of the ⋯ menu is drawn in the DOM: the menu is the OS's,
 *   through `ui:popupMenu`.
 * - The ⋯ press hands `popupMenu` the rows `machineMenuItems` composes, from
 *   the button's own corner, and runs the pick through the one runner. With no
 *   `popupMenu` on the bridge it does nothing and draws nothing.
 * - Each of the five panels opens under the row, one at a time.
 * - Phase 131's transition is kept, and it only opens the review panel.
 *
 * The row reads the store, and zustand serves its INITIAL state to a server
 * render, so the fields the row reads are seeded through the replacement below
 * (the machines-section.test.tsx pattern). Calls a test makes through
 * `getState` reach the real store.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachinePrepareResult,
  MachineRowView,
  MachineTestOutcome,
  PopupMenuInput
} from '@shared/ipc';
import { MachineRow, pressMachineMore } from '../MachineRow';
import { machineMenuItems } from '../machine-menu';
import type { MachinesStoreState } from '../machines-store';

let seed: Partial<MachinesStoreState> = {};

vi.mock('../machines-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../machines-store')>();
  const real = actual.useMachinesStore;
  const hook = (selector: (state: unknown) => unknown): unknown =>
    selector({ ...real.getInitialState(), ...seed });
  return { ...actual, useMachinesStore: Object.assign(hook, real) };
});

const { useMachinesStore } = await import('../machines-store');

const WARNING = 'the warning main owns';
const HONESTY = 'the sealing sentence main owns';

function row(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'studio',
    label: 'studio',
    color: 'blue',
    host: 'studio.tail1a2b.ts.net',
    user: null,
    port: null,
    remoteTmuxPath: '/opt/homebrew/bin/tmux',
    state: 'confirmed',
    usable: true,
    hash: 'a1b2c3d4e5f6a7b8c9d0',
    confirmedHash: 'a1b2c3d4e5f6a7b8c9d0',
    confirmedAt: 1,
    confirmedLines: ['Machine: studio.tail1a2b.ts.net'],
    lines: ['Machine: studio.tail1a2b.ts.net'],
    refusal: null,
    warning: WARNING,
    ...over
  };
}

const READY = row({
  ready: true,
  link: 'connected',
  linkDetail: 'Tortie is connected to studio.',
  os: 'Darwin',
  signIn: { class: 'prepared', at: 1, version: '3.6a', headline: 'h', detail: 'd' }
});

function draw(one: MachineRowView, seeded: Partial<MachinesStoreState> = {}): string {
  seed = seeded;
  try {
    return renderToStaticMarkup(<MachineRow row={one} honesty={HONESTY} />);
  } finally {
    seed = {};
  }
}

/** What a person reads: tags gone, a shut disclosure as its summary. */
function visible(html: string): string {
  return html
    .replace(/<details(?![^>]*\sopen)[^>]*>([\s\S]*?)<\/details>/g, (_m, body: string) => {
      const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(body);
      return summary === null ? '' : ` ${summary[1] ?? ''} `;
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): number {
  return text.split(' ').filter((one) => /[A-Za-z0-9]/.test(one)).length;
}

/** The rows of the ⋯ menu that exist only there. */
const MENU_ONLY = [
  'Test the connection',
  'What Tortie runs there…',
  'Stop trusting this machine',
  'Remove…'
];

const MENU_ROLES = /role="(menu|menuitem|menuitemcheckbox|menuitemradio|menubar)"/;

describe('a Ready row at rest', () => {
  const html = draw(READY);
  const text = visible(html);

  it('reads at most sixteen words with the label studio', () => {
    // studio, Ready, the address, macOS, 3.6a, Open a folder on it…
    expect(text).toBe('studio Ready studio.tail1a2b.ts.net · macOS · 3.6a Open a folder on it…');
    expect(words(text)).toBeLessThanOrEqual(16);
  });

  it('wears the Ready chip with main’s link sentence as its hover', () => {
    expect(html).toContain('data-machine-chip="ready"');
    expect(html).toContain('title="Tortie is connected to studio."');
    expect(html).toContain('data-machine-status="ready"');
  });

  it('offers one next step, Open a folder on it…', () => {
    expect(html.match(/data-machines-next=/g) ?? []).toHaveLength(1);
    expect(html).toContain('data-machines-next="open-folder"');
    expect(html).toContain('data-machines-action="open-folder"');
  });

  it('draws the ⋯ button with a label naming the machine, and no words of its own', () => {
    const at = html.indexOf('data-machines-more="studio"');
    expect(at).toBeGreaterThan(-1);
    const open = html.lastIndexOf('<button', at);
    const tag = html.slice(open, html.indexOf('>', at) + 1);
    expect(tag).toContain('aria-haspopup="true"');
    expect(tag).toContain('aria-label="More for studio"');
    const close = html.indexOf('</button>', at);
    expect(visible(html.slice(open, close + '</button>'.length))).toBe('');
  });

  it('draws no row of the menu on its face', () => {
    for (const label of MENU_ONLY) expect(text).not.toContain(label);
  });
});

describe('the row draws no menu of its own, in any state, with any panel open', () => {
  const finished: MachineTestOutcome = {
    testId: 't-1',
    class: 'unreachable',
    alarm: false,
    headline: 'Tortie could not reach this machine.',
    detail: 'detail',
    resolvedPath: null,
    exitCode: 255,
    durationMs: 1,
    sheet: null
  };
  const refused: MachinePrepareResult = {
    id: 'studio',
    class: 'no-server',
    alarm: false,
    headline: 'Prepare did not start it.',
    detail: 'detail',
    version: null,
    supported: [],
    serverBorn: false,
    options: [],
    pathCaptured: false,
    durationMs: 1
  };
  const states: MachineRowView[] = [
    READY,
    row({ state: 'never', usable: false }),
    row({ state: 'changed', usable: false }),
    row({ state: 'unknown', usable: false }),
    row({ signIn: { class: 'host-key-changed', at: 1, version: null, headline: 'h', detail: 'd' } })
  ];
  const panels = ['review', 'what', 'test', 'remove', 'prepare'] as const;

  for (const one of states) {
    for (const panel of panels) {
      it(`${one.state} ${one.signIn?.class ?? ''} with ${panel} open`, () => {
        const html = draw(one, {
          panels: { studio: panel },
          prepared: { studio: refused },
          test: {
            started: { testId: 't-1', commandLine: 'c', sshPath: '/usr/bin/x' },
            savedId: 'studio',
            draftId: null,
            draft: null,
            transcript: '',
            outcome: finished,
            running: false,
            ask: null
          }
        });
        expect(html).not.toMatch(MENU_ROLES);
        // A disabled menu row drawn as a DOM list would carry these words.
        for (const label of ['Stop trusting this machine', 'What Tortie runs there…', 'Remove…']) {
          expect(html).not.toContain(`>${label}<`);
        }
      });
    }
  }
});

describe('each panel, one at a time', () => {
  it('review: the lines, the warning, the sealing sentence and Confirm', () => {
    const html = draw(row({ state: 'never', usable: false }), { panels: { studio: 'review' } });
    expect(html).toContain('data-machines-panel="review"');
    expect(html).toContain('Machine: studio.tail1a2b.ts.net');
    expect(html).toContain(WARNING);
    expect(html).toContain(HONESTY);
    expect(html).toContain('data-machines-action="confirm"');
    expect(html).not.toContain('data-machines-panel="what"');
  });

  it('what: the lines and everything that used to stand on the row', () => {
    const html = draw(row({ keyFile: null }), { panels: { studio: 'what' } });
    expect(html).toContain('data-machines-panel="what"');
    expect(html).toContain('data-machine-key-line');
    expect(html).toContain('data-machine-hash="a1b2c3d4e5f6a7b8c9d0"');
    expect(html).not.toContain('data-machines-panel="review"');
  });

  it('test: the saved check, with no candidate button and no path field', () => {
    const html = draw(row(), {
      panels: { studio: 'test' },
      test: {
        started: { testId: 't-1', commandLine: 'c', sshPath: '/usr/bin/x' },
        savedId: 'studio',
        draftId: null,
        draft: null,
        transcript: '',
        outcome: null,
        running: true,
        ask: null
      }
    });
    expect(html).toContain('data-machines-panel="test"');
    expect(html).toContain('>Checking studio…<');
    expect(html).not.toContain('data-machines-action="type-path"');
    // While it runs there is nothing to close: Stop is the way out.
    expect(html).not.toContain('data-machines-action="close-panel"');
  });

  it('test: draws nothing for a check that belongs to another row', () => {
    const html = draw(row(), {
      panels: { studio: 'test' },
      test: {
        started: { testId: 't-1', commandLine: 'c', sshPath: '/usr/bin/x' },
        savedId: 'attic',
        draftId: null,
        draft: null,
        transcript: '',
        outcome: null,
        running: true,
        ask: null
      }
    });
    expect(html).not.toContain('data-machines-panel="test"');
  });

  it('remove: the two step question, inline', () => {
    const html = draw(row(), { panels: { studio: 'remove' } });
    expect(html).toContain('data-machines-panel="remove"');
    expect(html).toContain('data-machines-action="remove-confirm"');
    expect(html).toContain('data-machines-action="remove-keep"');
  });
});

describe('the one alarm', () => {
  it('is worn by Identity changed and by no other chip', () => {
    const alarm = draw(
      row({ signIn: { class: 'host-key-changed', at: 1, version: null, headline: 'h', detail: 'd' } })
    );
    expect(alarm).toContain('class="set-chip mach-chip alarm"');
    expect(alarm).not.toContain('data-machines-next=');
    for (const calm of [READY, row(), row({ state: 'never', usable: false }), row({ link: 'quiet' })]) {
      expect(draw(calm)).not.toContain('mach-chip alarm');
    }
  });
});

describe('the next step after a key problem was fixed some other way (the fix round)', () => {
  // The verifiers restored the key elsewhere, pressed Check again, read ok,
  // and the row still offered Set up sign-in…, which only checks again. A
  // finished ok check of this row, received after that sign-in, moves it on to
  // Prepare this machine, one press from Ready as at the parent.
  const needsKey = row({
    link: 'connected',
    signIn: { class: 'auth-refused', at: 1_000, version: null, headline: 'h', detail: 'd' }
  });
  const okCheck = (endedAt: number | null) => ({
    started: { testId: 't-9', commandLine: 'c', sshPath: '/usr/bin/x' },
    savedId: 'studio',
    draftId: null,
    draft: null,
    transcript: '',
    outcome: {
      testId: 't-9',
      class: 'ok' as const,
      alarm: false,
      headline: 'This machine answered.',
      detail: 'd',
      resolvedPath: null,
      exitCode: 0,
      durationMs: 1,
      sheet: null
    },
    running: false,
    ask: null,
    endedAt
  });

  it('reads Needs a key with Set up sign-in… before any check', () => {
    expect(draw(needsKey)).toContain('data-machines-next="set-up-sign-in"');
  });

  it('reads Not ready with Prepare this machine once a later check answered ok', () => {
    const html = draw(needsKey, { test: okCheck(2_000) });
    expect(html).toContain('data-machine-chip="not-ready"');
    expect(html).toContain('data-machines-next="prepare"');
  });

  it('keeps Needs a key when the sign-in was refused after that check', () => {
    expect(draw(needsKey, { test: okCheck(500) })).toContain('data-machines-next="set-up-sign-in"');
  });

  it('keeps Needs a key when the ok check was another row’s', () => {
    expect(draw(needsKey, { test: { ...okCheck(2_000), savedId: 'attic' } })).toContain(
      'data-machines-next="set-up-sign-in"'
    );
  });

  it('never reads Offline beside the check that answered, over a quiet link (the ruled round)', () => {
    // The reverify's row: the key fixed elsewhere, the check ok and shown,
    // and the link still quiet from before it. The chip read Offline, "did
    // not answer", beside "This machine answered".
    const quietKey = row({
      link: 'quiet',
      linkDetail: 'studio did not answer the last time Tortie asked.',
      signIn: { class: 'auth-refused', at: 1_000, version: null, headline: 'h', detail: 'd' }
    });
    const html = draw(quietKey, { test: okCheck(2_000), panels: { studio: 'test' } });
    expect(html).toContain('This machine answered.');
    expect(html).toContain('data-machine-chip="not-ready"');
    expect(html).not.toContain('data-machine-chip="offline"');
    expect(html).toContain('data-machines-next="prepare"');
    // With no check shown, the same quiet row is Needs a key, and a quiet row
    // with no sign-in is Offline: the link is read as before.
    expect(draw(quietKey)).toContain('data-machine-chip="needs-key"');
    expect(draw(row({ link: 'quiet', linkDetail: 'studio did not answer.' }))).toContain(
      'data-machine-chip="offline"'
    );
  });
});

describe('Review… opens the agreement and never shuts it (the fix round)', () => {
  it('stays drawn as the next step while the panel is open, and the panel has its own Close', () => {
    const html = draw(row({ state: 'never', usable: false }), { panels: { studio: 'review' } });
    expect(html).toContain('data-machines-next="review"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-machines-action="confirm"');
    expect(html).toContain('data-machines-action="close-panel"');
  });

  it('its press sets the panel open and never toggles it, so a second press leaves it open', () => {
    const source = readFileSync(resolve(__dirname, '..', 'MachineRow.tsx'), 'utf8');
    expect(source).toMatch(/if \(next === 'review'\) \{[\s\S]*?setPanel\(row\.id, 'review'\);/);
    expect(source).not.toMatch(/togglePanel\(row\.id, 'review'\)/);
  });
});

describe('the ⋯ press', () => {
  let asked: PopupMenuInput[] = [];
  let pick: string | null = null;
  let forgot: string[] = [];

  beforeEach(() => {
    asked = [];
    pick = null;
    forgot = [];
    useMachinesStore.setState({
      machines: {
        rows: [READY],
        errors: [],
        directory: '/x',
        path: '/x/machines.json',
        present: true,
        honesty: HONESTY,
        warning: WARNING,
        ssh: { path: '/usr/bin/ssh', source: 'pinned' }
      },
      panels: {},
      preparing: null,
      busy: null,
      test: null
    });
    (globalThis as { window?: unknown }).window = {
      gmux: {
        popupMenu: async (input: PopupMenuInput) => {
          asked.push(input);
          return pick;
        },
        machines: {
          forget: async (id: string) => {
            forgot.push(id);
            return READY;
          },
          rows: async () => useMachinesStore.getState().machines
        }
      }
    };
  });

  it('hands popupMenu the rows machineMenuItems composes, at the button’s corner', async () => {
    await pressMachineMore(READY, { x: 12.4, y: 30.6 });
    expect(asked).toHaveLength(1);
    expect(asked[0]).toEqual({
      x: 12,
      y: 31,
      items: machineMenuItems(READY, { preparing: false, testing: false, busy: false })
    });
  });

  it('runs the row a person picked through the one runner', async () => {
    pick = 'what';
    await pressMachineMore(READY, { x: 0, y: 0 });
    expect(useMachinesStore.getState().panels.studio).toBe('what');
    pick = 'forget';
    await pressMachineMore(READY, { x: 0, y: 0 });
    expect(forgot).toEqual(['studio']);
  });

  it('does nothing when the menu was dismissed', async () => {
    pick = null;
    await pressMachineMore(READY, { x: 0, y: 0 });
    expect(useMachinesStore.getState().panels).toEqual({});
    expect(forgot).toEqual([]);
  });

  it('does nothing and draws nothing when the bridge has no popupMenu (D20)', async () => {
    (globalThis as { window?: unknown }).window = {
      gmux: { machines: (globalThis as { window: { gmux: { machines: unknown } } }).window.gmux.machines }
    };
    await pressMachineMore(READY, { x: 0, y: 0 });
    expect(asked).toEqual([]);
    expect(useMachinesStore.getState().panels).toEqual({});
    expect(useMachinesStore.getState().rowErrors).toEqual({});
  });
});

describe('the row’s source', () => {
  const source = readFileSync(resolve(__dirname, '../MachineRow.tsx'), 'utf8');

  it('keeps Phase 131’s transition, which opens the review panel and starts nothing', () => {
    const at = source.indexOf('useEffect(() => {');
    expect(at).toBeGreaterThan(-1);
    const body = source.slice(at, source.indexOf('}, [', at));
    expect(body).toContain("setPanel(row.id, 'review')");
    for (const starter of ['prepare(', 'confirm(', 'checkAgain(', 'setUpSignIn(', 'installKey(', 'openFolder(', 'Test(']) {
      expect({ starter, inEffect: body.includes(starter) }).toEqual({ starter, inEffect: false });
    }
  });

  it('calls machineMenuItems once, in the ⋯ press, and never draws a menu role', () => {
    expect(source.match(/\bmachineMenuItems\(/g) ?? []).toHaveLength(1);
    expect(source).not.toMatch(/role=["{']/);
  });
});
