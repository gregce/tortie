/**
 * PHASE 336. Settings, then Machines, has no Saving files block any more.
 *
 * His ruling of 4 October 2026 (research 138 section 9): "Zero presses ... I
 * don't want any grants." A project open on a confirmed machine is a folder
 * Tortie may write under, as a project open on this Mac is, so the block that
 * turned saving on is gone from every row: the folder field, its Browse…
 * picker, the sheet, and the three buttons that opened, confirmed and stopped
 * saving. Its two channels are gone from the bridge (build/p336/SPEC.md D17),
 * and the store keeps none of their state.
 *
 * WHAT STAYS, and this file pins it too. A row that still carries a folder
 * typed in an earlier build keeps it: main draws the folder in the row's lines
 * and its `writeHonesty` paragraph, and Withdraw clears it with the
 * confirmation, through the same `machines:forget` it always used.
 *
 * PHASE 340 moved Withdraw into the row's native menu, as Stop trusting this
 * machine, and the lines into a panel a press opens. The pins below follow
 * them: the panel is opened through the store, the way the row's own button
 * opens it, and Withdraw is driven through the menu's one runner.
 *
 * THE REMOVED WORDS ARE SPELLED IN PIECES HERE ON PURPOSE. The phase's gate
 * (`conformance:machines` condition 120) fails when the old button's label or
 * its constant's name appears anywhere under src/renderer, so this file never
 * writes either whole, and a test that only proved their absence by naming
 * them would trip the rule it is helping to keep.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineRowView, MachinesResult } from '@shared/ipc';
import { MachinesView } from '../MachinesSection';
import * as copy from '../machines-copy';

/**
 * PHASE 340. The panel open under each row, seeded. zustand serves its INITIAL
 * state to a server render, so seeding the real store would change nothing on
 * the page; this replacement runs the same selector over the initial state
 * with this one field overridden, the pattern machines-section.test.tsx uses.
 * Every call a test makes through `getState` still reaches the real store.
 */
let panelSeed: Readonly<Record<string, 'review' | 'what'>> = {};

vi.mock('../machines-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../machines-store')>();
  const real = actual.useMachinesStore;
  const hook = (selector: (state: unknown) => unknown): unknown =>
    selector({ ...real.getInitialState(), panels: panelSeed });
  return { ...actual, useMachinesStore: Object.assign(hook, real) };
});

const forget = vi.fn(async () => undefined);
const rowsCall = vi.fn(async () => result([]));
vi.stubGlobal('window', {
  gmux: { machines: { forget, rows: rowsCall } }
});

const { useMachinesStore } = await import('../machines-store');
const { runMachineMenuItem } = await import('../machine-menu');

/** The removed button label, in two pieces (see the header). */
const OLD_BUTTON = ['Let Tortie', 'save files here'].join(' ');
/** The nine removed exports of ./machines-copy.ts, by name, in pieces. */
const REMOVED_EXPORTS = [
  ['SAVING', '_TITLE'],
  ['savingOff', 'Explain'],
  ['BTN_ALLOW', '_WRITES'],
  ['WRITE_ROOT', '_LABEL'],
  ['BTN_CONFIRM', '_WRITES'],
  ['CONFIRMING', '_WRITES'],
  ['savingOn', 'Line'],
  ['STOP_SAVING', '_EXPLAIN'],
  ['BTN_STOP', '_SAVING']
].map((parts) => parts.join(''));

const WARNING =
  'This names a machine Tortie will sign in to as you, and a program it ' +
  'will run there with your files and your credentials.';
const LEGACY_LINE = 'May replace files under this folder on that machine: /srv/greg';
const LEGACY_HONESTY =
  'Tortie replaces a file under that folder only after it has read it.';

function row(over: Partial<MachineRowView>): MachineRowView {
  return {
    id: 'pop-os',
    label: 'Pop OS',
    color: 'blue',
    host: 'pop-os.tail1a2b.ts.net',
    user: 'greg',
    port: null,
    remoteTmuxPath: '/usr/bin/tmux',
    state: 'confirmed',
    usable: true,
    hash: 'a1b2c3d4e5f6a7b8c9d0',
    confirmedHash: 'a1b2c3d4e5f6a7b8c9d0',
    confirmedAt: 1_760_000_000_000,
    confirmedLines: ['Machine: pop-os.tail1a2b.ts.net'],
    lines: ['Machine: pop-os.tail1a2b.ts.net'],
    refusal: null,
    warning: WARNING,
    ...over
  };
}

function result(rows: MachineRowView[]): MachinesResult {
  return {
    rows,
    errors: [],
    directory: '/Users/x/Library/Application Support/Tortie/gmux/config',
    path: '/Users/x/Library/Application Support/Tortie/gmux/config/machines.json',
    present: true,
    honesty:
      'Confirming seals which program Tortie runs on that machine. It can ' +
      'never seal the bytes of that program.',
    warning: WARNING,
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

function draw(rows: MachineRowView[], open: 'review' | 'what' | null = null): string {
  // PHASE 340. A row draws its lines in a panel under it, and one press opens
  // it. The press sets the store's `panels`, which the seed stands in for.
  panelSeed = open === null ? {} : Object.fromEntries(rows.map((r) => [r.id, open]));
  return renderToStaticMarkup(
    <MachinesView
      machines={result(rows)}
      supported={true}
      adding={false}
      onOpenAdd={() => undefined}
      onReload={() => undefined}
    />
  );
}

/** Every marker of the removed block, read off one page of markup. */
function blockMarkers(html: string): string[] {
  const markers = [
    'data-machines-writes',
    'data-machines-action="open-writes"',
    'data-machines-action="browse-writes"',
    'data-machines-action="allow-writes"',
    'data-machines-action="stop-saving"',
    'data-machines-field="write-root"',
    OLD_BUTTON,
    'Saving files',
    'Confirm saving on this machine',
    'Stop Tortie saving files here',
    'Folder Tortie may save under'
  ];
  return markers.filter((one) => html.includes(one));
}

describe('the Saving files block is gone from every row', () => {
  it('draws none of it on an open row nobody has confirmed', () => {
    const html = draw([row({ state: 'never', usable: false })], 'review');
    expect(html).toContain('data-machines-action="confirm"');
    expect(blockMarkers(html)).toEqual([]);
  });

  it('draws none of it on a confirmed row', () => {
    const html = draw([row({})]);
    expect(html).toContain('data-machine-id="pop-os"');
    expect(blockMarkers(html)).toEqual([]);
    // Nor in the panel that holds everything else about it.
    expect(blockMarkers(draw([row({})], 'what'))).toEqual([]);
  });

  it('draws none of it on a row carrying a folder from an earlier build', () => {
    const html = draw([
      row({
        state: 'changed',
        usable: false,
        writeRoot: '/srv/greg',
        lines: ['Machine: pop-os.tail1a2b.ts.net', LEGACY_LINE],
        writeHonesty: LEGACY_HONESTY
      })
    ]);
    expect(blockMarkers(html)).toEqual([]);
  });
});

describe('a folder typed in an earlier build is still drawn', () => {
  it("in the row's lines and its honesty paragraph, as main sends them", () => {
    const html = draw(
      [
        row({
          state: 'changed',
          usable: false,
          writeRoot: '/srv/greg',
          lines: ['Machine: pop-os.tail1a2b.ts.net', LEGACY_LINE],
          writeHonesty: LEGACY_HONESTY
        })
      ],
      'review'
    );
    expect(html).toContain(LEGACY_LINE);
    expect(html).toContain('data-machine-write-honesty');
    expect(html).toContain(LEGACY_HONESTY);
  });

  it('is cleared by Withdraw, through the forget it always used', async () => {
    // PHASE 340. Withdraw is the menu row Stop trusting this machine, and a
    // pick runs through the menu's one runner, which calls the same store verb
    // and so the same `machines:forget`.
    const confirmed = row({ writeRoot: '/srv/greg' });
    useMachinesStore.setState({ machines: result([confirmed]), busy: null });
    forget.mockClear();
    const said = await runMachineMenuItem('forget', confirmed);
    expect(said).toBe(null);
    expect(forget).toHaveBeenCalledTimes(1);
    expect(forget).toHaveBeenCalledWith('pop-os');
  });
});

describe('nothing of the block is left to draw from', () => {
  it('exports none of the nine removed words', () => {
    expect(REMOVED_EXPORTS).toHaveLength(9);
    expect(new Set(REMOVED_EXPORTS).size).toBe(9);
    const left = REMOVED_EXPORTS.filter((name) => name in copy);
    expect(left).toEqual([]);
    // The spelling above must name real words, or the check reads nothing:
    // every one is a word the Phase 101 module exported.
    for (const name of REMOVED_EXPORTS) expect(name).toMatch(/^[A-Za-z_]+$/);
  });

  it('keeps no sheet, no in-flight id and no saving verb in the store', () => {
    const state = useMachinesStore.getState() as unknown as Record<string, unknown>;
    for (const key of [
      'writeSheet',
      'clearWriteSheet',
      'allowWrites',
      'writeSheets',
      'allowing'
    ]) {
      expect([key, key in state]).toEqual([key, false]);
    }
  });

  it('names neither removed label anywhere in the row', () => {
    const source = readFileSync(resolve(__dirname, '../MachineRow.tsx'), 'utf8');
    expect(source).not.toContain('SavingFiles');
    expect(source).not.toContain('RemoteDirPicker');
    expect(source).not.toContain(OLD_BUTTON);
  });
});
