/**
 * Phase 68. Settings → Machines, the section and one row. PHASE 340 rewrote the
 * row half (build/p340/SPEC.md D11 as revised, D12, D17, D20, section 5.5).
 *
 * What these tests hold:
 * - An empty list draws a heading, one sentence and one button, and nothing
 *   else at all. Phase 79 counts the buttons, because the screen the operator
 *   photographed put four sentences of small print between a person and the
 *   only thing there was to do.
 * - The two background sentences sit behind the section's one disclosure.
 * - PHASE 340. A row at rest is a name, a status chip, one line of facts and
 *   one button for the next thing, beside a ⋯ button. Nothing a person agrees
 *   to stands on its face: the lines, main's warning, main's sealing sentence
 *   and main's refusal are in the review panel a row nobody confirmed opens
 *   with its one button, and in the panel the menu row What Tortie runs there…
 *   opens. A row whose details moved draws both lists and both headings there.
 * - PHASE 79.1. No row asks for another machine's password until a check has
 *   come back asking for one.
 * - PHASE 83 and 324. A version a person accepted is named in What Tortie runs
 *   there…, and only while Tortie has not measured it; a measured one reads as
 *   a row with no acceptance at all. Withdrawing it is the menu row Stop
 *   trusting this machine, whose sub-line says so (p340-machine-menu.test.ts).
 * - PHASE 131. Prepare's settings, the program list note, the fingerprint of
 *   what was confirmed and the promise to adopt nothing are in What Tortie runs
 *   there…. A Prepare answer that is not `prepared` is the prepare panel, with
 *   Phase 83's sheet under it.
 * - The dropped rows block names the field and the reason, and counts.
 * - The honesty sentence and the confirm warning appear exactly as main sent
 *   them. Neither is composed here, so a passing test proves this surface
 *   cannot reword them.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server rather than a mounted DOM. They render `MachinesView`
 * rather than `MachinesSection`, because zustand serves its INITIAL state to a
 * server render: a test that seeded the store and rendered the connected
 * component would read defaults and assert nothing at all. The row reads the
 * store for the panel open under it and for what Prepare answered, so those
 * are seeded through the replacement below.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachinePrepareResult,
  MachineRowView,
  MachinesResult
} from '@shared/ipc';

import { MachinesView } from '../MachinesSection';
import {
  ACCEPTED_VERSION_LABEL,
  DISCLOSURE_LABEL,
  HONESTY_NO_ADOPTION,
  HONESTY_OWN_RECORD,
  MEASURED_VERSIONS,
  PREPARE_EXPLAIN,
  ROW_HASH_LABEL,
  SECTION_CAPTION,
  SECTION_CONFIRM_LINE,
  STATE_SENTENCE
} from '../machines-copy';
import type { MachinesStoreState } from '../machines-store';

/**
 * What the row reads from the store, seeded.
 *
 * The store is zustand 5, and a server render reads `getInitialState` rather
 * than the live state, so seeding the real store would change nothing on the
 * page. This replacement runs the same selector against the same initial
 * state with the seeded fields overridden, which is what the real hook returns
 * on a server render. A test that seeds nothing reads the initial state.
 */
let seed: Partial<MachinesStoreState> = {};

vi.mock('../machines-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../machines-store')>();
  const real = actual.useMachinesStore;
  const hook = (selector: (state: unknown) => unknown): unknown =>
    selector({ ...real.getInitialState(), ...seed });
  return { ...actual, useMachinesStore: Object.assign(hook, real) };
});

/** The sentence main owns. The surface may draw it and may not touch it. */
const HONESTY =
  'Confirming seals which program Tortie runs on that machine. It can never ' +
  'seal the bytes of that program.';

/** The confirm warning main owns, carried on every row and on the result. */
const WARNING =
  'This names a machine Tortie will sign in to as you, and a program it ' +
  'will run there with your files and your credentials.';

const NEVER_REFUSAL =
  'Tortie will not connect to pop-os, because nobody has confirmed it. Read ' +
  'what it will run and confirm it in Tortie first. Nothing was started.';

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
    confirmedLines: [
      'Machine: pop-os.tail1a2b.ts.net',
      'Signs in as: greg',
      'Runs this program on that machine: /usr/bin/tmux'
    ],
    lines: [
      'Machine: pop-os.tail1a2b.ts.net',
      'Signs in as: greg',
      'Runs this program on that machine: /usr/bin/tmux'
    ],
    refusal: null,
    warning: WARNING,
    ...over
  };
}

/** A row nobody has confirmed, with main's refusal. */
function never(over: Partial<MachineRowView> = {}): MachineRowView {
  return row({
    state: 'never',
    usable: false,
    confirmedHash: null,
    confirmedAt: null,
    confirmedLines: [],
    refusal: NEVER_REFUSAL,
    ...over
  });
}

/** The one row element, so what is inside it can be read alone. */
function machineRow(html: string): string {
  const at = html.indexOf('<div class="mach-row"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(at);
}

/** The row's head, being everything a person reads at rest. */
function rowHead(html: string): string {
  const inRow = machineRow(html);
  const at = inRow.indexOf('<div class="mach-head"');
  const panel = inRow.indexOf('data-machines-panel=');
  return panel === -1 ? inRow.slice(at) : inRow.slice(at, panel);
}

/** The one disclosure element, so what is inside it can be read alone. */
function disclosure(html: string): string {
  const at = html.indexOf('<details class="mach-disclosure"');
  expect(at).toBeGreaterThan(-1);
  const end = html.indexOf('</details>', at);
  expect(end).toBeGreaterThan(at);
  return html.slice(at, end + '</details>'.length);
}

function result(over: Partial<MachinesResult>): MachinesResult {
  return {
    rows: [],
    errors: [],
    directory: '/Users/x/Library/Application Support/Tortie/gmux/config',
    path: '/Users/x/Library/Application Support/Tortie/gmux/config/machines.json',
    present: true,
    honesty: HONESTY,
    warning: WARNING,
    ssh: { path: '/usr/bin/ssh', source: 'pinned' },
    ...over
  };
}

function draw(machines: MachinesResult | null): string {
  return renderToStaticMarkup(
    <MachinesView
      machines={machines}
      supported={true}
      adding={false}
      onOpenAdd={() => undefined}
      onReload={() => undefined}
    />
  );
}

/** One row, drawn with the store fields seeded, and the seed put back. */
function drawRow(one: MachineRowView, seeded: Partial<MachinesStoreState> = {}): string {
  seed = seeded;
  try {
    return draw(result({ rows: [one] }));
  } finally {
    seed = {};
  }
}

/** One row with one panel open under it. */
function drawPanel(
  one: MachineRowView,
  panel: 'review' | 'what' | 'remove' | 'prepare',
  seeded: Partial<MachinesStoreState> = {}
): string {
  return drawRow(one, { ...seeded, panels: { [one.id]: panel } });
}

describe('the empty section', () => {
  const html = draw(result({}));

  it('draws the heading, one sentence and one button', () => {
    expect(html).toContain('>Machines<');
    expect(html).toContain(SECTION_CAPTION);
    expect(html).toContain('Add a machine');
  });

  it('draws exactly one button, and it is the one thing there is to do', () => {
    // The operator photographed this screen. It carried four sentences of
    // small print, an empty card and a second button about a file that does
    // not exist yet, above the one button a person came here for.
    expect(html.match(/<button/g) ?? []).toHaveLength(1);
    expect(html).toContain('data-machines-action="open-add"');
  });

  it('offers no file to check, because nothing has been added', () => {
    expect(html).not.toContain('data-machines-action="reload"');
    expect(html).not.toContain('Check the file again');
  });

  it('draws no empty card and no empty line', () => {
    expect(html).not.toContain('No machines yet.');
    expect(html).not.toContain('set-empty-line');
  });

  it('draws no disclosure and no honesty sentence at all', () => {
    expect(html).not.toContain('<details');
    expect(html).not.toContain(DISCLOSURE_LABEL);
    expect(html).not.toContain(HONESTY_NO_ADOPTION);
    expect(html).not.toContain(HONESTY_OWN_RECORD);
    expect(html).not.toContain(SECTION_CONFIRM_LINE);
    expect(html).not.toContain(HONESTY);
  });

  it('no longer says a session cannot be opened on a machine', () => {
    // Phase 70 shipped remote sessions on 2026-08-17 at 0.34.0. The sentence
    // was false from the day it landed and nobody re-read the block.
    expect(html).not.toContain('You cannot open a session on a machine yet.');
    expect(html).not.toContain('Opening sessions comes later.');
  });
});

describe('the section once there is a machine', () => {
  const html = draw(result({ rows: [row({})] }));

  it('offers the way to read the file again', () => {
    // MEASURED: the live probe changed the address in machines.json from
    // outside the app. Main knew 429 ms later and the row on screen still read
    // Confirmed, because nothing pushed a file change to this window and the
    // only re-read button appeared when a row had failed a check.
    expect(html).toContain('data-machines-action="reload"');
    expect(html).toContain('Check the file again');
  });

  it('draws the disclosure, shut', () => {
    expect(html).toContain(DISCLOSURE_LABEL);
    expect(disclosure(html)).not.toContain('open');
  });

  it('puts exactly the two background sentences behind it', () => {
    const inside = disclosure(html);
    expect(inside).toContain(SECTION_CONFIRM_LINE);
    expect(inside).toContain(HONESTY_OWN_RECORD);
    // The other two are in the row's own panels, where each decides something.
    expect(inside).not.toContain(HONESTY_NO_ADOPTION);
    expect(inside).not.toContain(HONESTY);
  });

  it('keeps the caption to one sentence', () => {
    expect(html).toContain(SECTION_CAPTION);
    expect(SECTION_CAPTION).not.toContain('confirm it once');
  });
});

// ---------------------------------------------------------------------------
// PHASE 340. A row at rest
// ---------------------------------------------------------------------------

describe('a row nobody has confirmed, at rest', () => {
  const html = drawRow(never());
  const head = rowHead(html);

  it('wears the Not confirmed chip, with the sentence that explains it as its hover', () => {
    expect(head).toContain('data-machine-chip="not-confirmed"');
    expect(head).toContain('>Not confirmed<');
    expect(head).toContain(`title="${STATE_SENTENCE.never}"`);
    // The sentence is a hover now, never a paragraph on the face.
    expect(head).not.toContain(`>${STATE_SENTENCE.never}<`);
  });

  it('offers Review… as its one next step, shut, with the attribute old probes press', () => {
    // D22. Five setup helpers press `toggle-lines` when its aria-expanded is
    // not `true`, then press `confirm`.
    expect(head).toContain('data-machines-next="review"');
    expect(head).toContain('data-machines-action="toggle-lines"');
    expect(head).toContain('aria-expanded="false"');
    expect(head).toContain('>Review…<');
  });

  it('draws no line, no warning and no refusal until Review… is pressed', () => {
    expect(html).not.toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).not.toContain(WARNING);
    expect(html).not.toContain(NEVER_REFUSAL);
    expect(html).not.toContain('data-machines-action="confirm"');
  });

  it('asks for no password until a check has come back asking for one', () => {
    // PHASE 79.1. The key step hangs off a finished check, and a row with no
    // check has none.
    expect(html).not.toContain('data-machines-key="1"');
    expect(html).not.toContain('data-machines-field="machine-password"');
    expect(html).not.toContain("Put Tortie's key on it");
  });
});

describe('a confirmed row, at rest', () => {
  const html = drawRow(row({}));
  const head = rowHead(html);

  it('reads Not ready with Prepare this machine when nothing has prepared it in this run', () => {
    expect(head).toContain('data-machine-chip="not-ready"');
    expect(head).toContain('>Not ready<');
    expect(head).toContain(`title="${PREPARE_EXPLAIN}"`);
    expect(head).toContain('data-machines-next="prepare"');
    expect(head).toContain('data-machines-action="prepare"');
    expect(head).toContain('>Prepare this machine<');
  });

  it('keeps the lines, the test and the removal off its face', () => {
    expect(html).not.toContain('Runs this program on that machine:');
    expect(html).not.toContain('Test the connection');
    expect(html).not.toContain('Remove');
    expect(html).not.toContain('Withdraw');
    expect(html).not.toContain('Stop trusting this machine');
  });

  it('draws its address as the line of facts, and nothing it does not know', () => {
    expect(head).toContain('data-machine-facts="pop-os"');
    expect(head).toContain('>pop-os.tail1a2b.ts.net<');
  });

  it('reads Ready only while it answers, with Open a folder on it…', () => {
    const ready = rowHead(
      drawRow(
        row({
          ready: true,
          link: 'connected',
          os: 'Darwin',
          signIn: {
            class: 'prepared',
            at: 1,
            version: '3.6a',
            headline: 'This machine is ready.',
            detail: 'detail'
          }
        })
      )
    );
    expect(ready).toContain('data-machine-chip="ready"');
    expect(ready).toContain('>pop-os.tail1a2b.ts.net · macOS · 3.6a<');
    expect(ready).toContain('data-machines-action="open-folder"');
    const asleep = rowHead(drawRow(row({ ready: true, link: 'quiet' })));
    expect(asleep).toContain('data-machine-chip="offline"');
    expect(asleep).not.toContain('data-machine-chip="ready"');
  });
});

// ---------------------------------------------------------------------------
// PHASE 340. The review panel, where a person agrees
// ---------------------------------------------------------------------------

describe('the review panel of a row nobody has confirmed', () => {
  const html = drawPanel(never(), 'review');

  it('draws the lines main composed, unchanged', () => {
    expect(html).toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).toContain('Signs in as: greg');
  });

  it('carries the confirm warning and the refusal main sent with the row', () => {
    expect(html).toContain(WARNING);
    expect(html).toContain(NEVER_REFUSAL);
  });

  it('draws main’s sealing sentence before the button a person confirms with', () => {
    // It arrives on the result and is handed to the row as a prop, so a passing
    // test proves this surface can neither drop it nor reword it.
    const sealing = html.indexOf(HONESTY);
    const confirm = html.indexOf('data-machines-action="confirm"');
    expect(sealing).toBeGreaterThan(-1);
    expect(confirm).toBeGreaterThan(sealing);
    expect(html).toContain('>Confirm this machine<');
  });

  it('marks the next step open', () => {
    expect(rowHead(html)).toContain('aria-expanded="true"');
  });

  it('draws the sealing sentence nowhere before the first read has answered', () => {
    const before = renderToStaticMarkup(
      <MachinesView
        machines={null}
        supported={true}
        adding={false}
        onOpenAdd={() => undefined}
        onReload={() => undefined}
      />
    );
    expect(before).not.toContain(HONESTY);
  });
});

describe('the review panel of a row whose details moved after it was confirmed', () => {
  const changed = row({
    state: 'changed',
    usable: false,
    host: 'pop-os-2.tail1a2b.ts.net',
    hash: 'ffffffffffffffffffff',
    confirmedLines: [
      'Machine: pop-os.tail1a2b.ts.net',
      'Runs this program on that machine: /usr/bin/tmux'
    ],
    lines: [
      'Machine: pop-os-2.tail1a2b.ts.net',
      'Runs this program on that machine: /usr/local/bin/tmux'
    ],
    refusal:
      'Tortie will not connect to pop-os, because its details changed after ' +
      'you confirmed them. Read the change and confirm it again if it is what ' +
      'you want. Nothing was started.'
  });
  const html = drawPanel(changed, 'review');

  it('wears the Changed chip, with the sentence that explains it as its hover', () => {
    expect(rowHead(html)).toContain('data-machine-chip="changed"');
    expect(rowHead(html)).toContain(`title="${STATE_SENTENCE.changed}"`);
  });

  it('draws both list headings', () => {
    expect(html).toContain('You confirmed:');
    expect(html).toContain('It now says:');
  });

  it('draws both sets of lines, so the change is readable', () => {
    expect(html).toContain('Machine: pop-os.tail1a2b.ts.net');
    expect(html).toContain('Machine: pop-os-2.tail1a2b.ts.net');
    expect(html).toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).toContain('Runs this program on that machine: /usr/local/bin/tmux');
  });

  it('offers the button that agrees again', () => {
    expect(html).toContain('>Confirm the new details<');
    expect(html).toContain('data-machines-action="confirm"');
  });
});

describe('a confirmed row draws no review panel, whatever the store says', () => {
  it('because there is nothing to agree to again', () => {
    const html = drawPanel(row({}), 'review');
    expect(html).not.toContain('data-machines-panel="review"');
    expect(html).not.toContain('data-machines-action="confirm"');
  });
});

// ---------------------------------------------------------------------------
// PHASE 340. What Tortie runs there…, the panel a menu row opens
// ---------------------------------------------------------------------------

/** What Prepare answered for a machine that works. */
function preparedResult(over: Partial<MachinePrepareResult> = {}): MachinePrepareResult {
  return {
    id: 'pop-os',
    class: 'prepared',
    alarm: false,
    headline: 'This machine is ready.',
    detail:
      'Tortie started the program at /usr/bin/tmux on this machine and set ' +
      'it up the way it needs.',
    version: '3.5a',
    supported: ['3.4', '3.5a'],
    serverBorn: true,
    options: [
      { name: 'escape-time', wanted: '0', observed: '0', agrees: true },
      { name: 'history-limit', wanted: '50000', observed: '2000', agrees: false }
    ],
    pathCaptured: true,
    durationMs: 412,
    ...over
  };
}

describe('What Tortie runs there…', () => {
  const html = drawPanel(row({ keyFile: 'machine-a1b2c3d4e5f6' }), 'what');

  it('holds the lines, the warning and main’s sealing sentence', () => {
    expect(html).toContain('data-machines-panel="what"');
    expect(html).toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).toContain(WARNING);
    expect(html).toContain(HONESTY);
  });

  it('holds the key line, the fingerprint under its label, the promise and the id', () => {
    expect(html).toContain('data-machine-key-line');
    expect(html).toContain('machine-a1b2c3d4e5f6');
    expect(html).toContain(ROW_HASH_LABEL);
    expect(html.indexOf(ROW_HASH_LABEL)).toBeLessThan(html.indexOf('>a1b2c3d4e5f6<'));
    expect(html).toContain(HONESTY_NO_ADOPTION);
    expect(html).toContain('>pop-os<');
  });

  it('draws no settings and no program list note before Prepare has answered', () => {
    expect(html).not.toContain('data-prepare-option');
    expect(html).not.toContain('mach-prepare-note');
  });

  it('draws Prepare’s settings once Prepare has answered', () => {
    const answered = drawPanel(row({}), 'what', { prepared: { 'pop-os': preparedResult() } });
    expect(answered).toContain('data-prepare-option="escape-time"');
    expect(answered).toContain('data-prepare-agrees="no"');
  });

  it('draws neither key sentence when main did not say which key it uses', () => {
    const silent = drawPanel(row({}), 'what');
    expect(silent).not.toContain('data-machine-key-line');
  });

  it('is shut by a Close button that starts nothing', () => {
    expect(html).toContain('data-machines-action="close-panel"');
    expect(html).toContain('>Close<');
  });
});

describe('a version a person accepted, in What Tortie runs there…', () => {
  it('names a version Tortie has not measured, under a label that says what it is', () => {
    // PHASE 342 measured 3.5a, so 3.1c stands in its place here.
    for (const version of ['3.9a', '3.1c', '3.6c', '3.6A']) {
      const html = drawPanel(row({ acceptedTmuxVersion: version }), 'what');
      expect(html).toContain(ACCEPTED_VERSION_LABEL);
      expect(html).toContain(`>${version}<`);
      expect(html).toContain('data-machines-accepted="pop-os"');
    }
  });

  // PHASE 324, the ruled round. A measured version needs no acceptance, so a
  // row carrying one reads exactly as a row carrying none.
  for (const version of MEASURED_VERSIONS) {
    it(`draws nothing about accepting ${version}, exactly as a row with no acceptance`, () => {
      const accepted = drawPanel(row({ acceptedTmuxVersion: version }), 'what');
      const none = drawPanel(row({}), 'what');
      expect(accepted).not.toContain(ACCEPTED_VERSION_LABEL);
      expect(accepted).not.toContain('data-machines-accepted=');
      expect(accepted).toBe(none);
    });
  }

  it('draws no accept button, because Prepare has not answered', () => {
    const html = drawPanel(row({ acceptedTmuxVersion: '3.9a' }), 'what');
    expect(html).not.toContain('data-machines-action="accept-version"');
  });
});

// ---------------------------------------------------------------------------
// The prepare panel, and Phase 83's sheet under it
// ---------------------------------------------------------------------------

describe('the prepare panel of a row whose Prepare refused a version nobody measured', () => {
  const refused = preparedResult({
    class: 'version-unmeasured',
    alarm: true,
    headline: 'Tortie has not measured the version that machine runs.',
    detail:
      'The program at /usr/bin/tmux reports version 3.6a. This release has ' +
      'measured 3.4 and 3.5a, so nothing was started.',
    version: '3.6a',
    serverBorn: false,
    options: [],
    pathCaptured: false,
    acceptSheet: {
      hash: 'a1b2c3d4e5f6a7b8c9d0',
      lines: [
        'Machine: pop-os.tail1a2b.ts.net',
        'Runs this program on that machine: /usr/bin/tmux',
        'Accepts this version of the program, which Tortie has not measured: 3.6a'
      ],
      warning: WARNING,
      writeHonesty: null
    }
  });
  const html = drawPanel(row({}), 'prepare', { prepared: { 'pop-os': refused } });

  it('draws main’s refusal, then the sheet and the accept button under it', () => {
    const state = html.indexOf('class="mach-prepare-result"');
    const sheet = html.indexOf('data-machines-accept="pop-os"');
    expect(html).toContain('Tortie has not measured the version that machine runs.');
    expect(state).toBeGreaterThan(-1);
    expect(sheet).toBeGreaterThan(state);
    expect(html).toContain('data-machines-action="accept-version"');
  });

  it('says it is preparing over an earlier answer while a new Prepare runs', () => {
    const busy = drawPanel(row({}), 'prepare', {
      prepared: { 'pop-os': refused },
      preparing: 'pop-os'
    });
    expect(busy).toContain('data-machines-panel="preparing"');
    expect(busy).not.toContain('data-machines-accept="pop-os"');
    expect(busy).not.toContain('Tortie has not measured the version that machine runs.');
  });

  it('draws nothing for an answer that is prepared, because the chip says it', () => {
    const fine = drawPanel(row({}), 'prepare', { prepared: { 'pop-os': preparedResult() } });
    expect(fine).not.toContain('data-machines-panel="prepare"');
  });
});

describe('the removal question', () => {
  it('is asked under the row, in two steps, and removes nothing by being drawn', () => {
    const html = drawPanel(row({ sessions: 2 }), 'remove');
    expect(html).toContain('data-machines-panel="remove"');
    expect(html).toContain('Remove Pop OS?');
    expect(html).toContain('data-machines-action="remove-confirm"');
    expect(html).toContain('data-machines-action="remove-keep"');
  });
});

describe('the rows Tortie dropped', () => {
  const html = draw(
    result({
      errors: [
        {
          id: 'bad-one',
          field: 'host',
          reason: 'A host may not begin with a dash.'
        },
        {
          id: 'bad-two',
          field: 'port',
          reason: 'A port must be a whole number from 1 to 65535.'
        }
      ]
    })
  );

  it('counts them and says nothing from them was used', () => {
    expect(html).toContain('Tortie dropped 2 rows whole. Nothing from them was used.');
  });

  it('names the field and the reason for each one', () => {
    expect(html).toContain('>host<');
    expect(html).toContain('A host may not begin with a dash.');
    expect(html).toContain('>port<');
    expect(html).toContain('A port must be a whole number from 1 to 65535.');
  });

  it('offers the one way to read the file again', () => {
    // The toolbar's copy of this button is gone when there is no row, but a
    // row that failed a check means there IS a file worth looking at again.
    expect(html).toContain('Check the file again');
    expect(html).toContain('data-machines-action="reload-after-errors"');
  });

  it('says one row in the singular', () => {
    const one = draw(
      result({
        errors: [{ id: 'bad', field: 'id', reason: 'An id must be unique in the file.' }]
      })
    );
    expect(one).toContain('Tortie dropped 1 row whole. Nothing from it was used.');
  });
});

describe('a build whose preload has no machines surface', () => {
  it('says so plainly and draws no list', () => {
    const html = renderToStaticMarkup(
      <MachinesView
        machines={null}
        supported={false}
        adding={false}
        onOpenAdd={() => undefined}
        onReload={() => undefined}
      />
    );
    expect(html).toContain('Machines are not available in this build.');
    expect(html).not.toContain('No machines yet.');
  });
});
