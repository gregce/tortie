/**
 * Phase 68. Settings → Machines, the section and one row.
 *
 * What these tests hold:
 * - An empty list draws the empty line and BOTH standing honesty lines, plus
 *   the third that arrives from main. A person must be told what this release
 *   cannot do before they add anything.
 * - A row that has never been confirmed draws `Not usable` and the sentence
 *   that says what to do about it. It does NOT draw `Confirmed`.
 * - A row whose details moved draws both lists, both list headings and both
 *   sets of lines, so a person reads the change rather than guessing at it.
 * - A confirmed row draws `Confirmed`.
 * - The dropped rows block names the field and the reason, and counts.
 * - The honesty sentence and the confirm warning appear exactly as main sent
 *   them. Neither is composed here, so a passing test proves this surface
 *   cannot reword them.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server rather than a mounted DOM. They render `MachinesView`
 * rather than `MachinesSection`, because zustand serves its INITIAL state to
 * a server render: a test that seeded the store and rendered the connected
 * component would read defaults and assert nothing at all.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineRowView, MachinesResult } from '@shared/ipc';
import { MachinesView } from '../MachinesSection';

/** The sentence main owns. The surface may draw it and may not touch it. */
const HONESTY =
  'Confirming seals which program Tortie runs on that machine. It cannot ' +
  'seal the bytes of that program. Anyone who can write to that machine can ' +
  'change it, and Tortie will not see that happen.';

/** The confirm warning main owns, carried on every row and on the result. */
const WARNING =
  'This names a machine Tortie will sign in to as you, and a program it ' +
  'will run there with your files and your credentials.';

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

describe('the empty section', () => {
  const html = draw(result({}));

  it('draws the empty line', () => {
    expect(html).toContain('No machines yet.');
  });

  it('draws both standing honesty lines', () => {
    expect(html).toContain(
      'Tortie never adopts work that is already running on your machines, ' +
        'and it never touches it. Anything Tortie runs there, it creates itself.'
    );
    // Rewritten in Phase 69, because this release now also sets a machine up so
    // that it is ready. The sentence that is still not true stays first.
    expect(html).toContain(
      'You cannot open a session on a machine yet. This release records the ' +
        'machine, proves Tortie can reach it, and sets it up so that it is ' +
        'ready. Opening sessions comes later.'
    );
  });

  it('draws the honesty sentence exactly as main sent it', () => {
    expect(html).toContain(HONESTY);
  });

  it('says where a machine’s identity is written down, and where it is not', () => {
    expect(html).toContain(
      'Tortie keeps its own record of which machines have answered, in a file ' +
        'it owns.'
    );
    expect(html).toContain('It never adds a line to that one.');
  });

  it('offers the one way to add a machine', () => {
    expect(html).toContain('Add a machine');
  });

  it('offers the way to read the file again with no row dropped at all', () => {
    // MEASURED: the live probe changed the address in machines.json from
    // outside the app. Main knew 429 ms later and the row on screen still read
    // Confirmed, because nothing pushes a file change to this window and the
    // only re-read button appeared when a row had failed a check. Nothing
    // unsafe happened, since the gate refuses on the connect path either way,
    // but the screen said one thing and Tortie would have done another.
    expect(html).toContain('data-machines-action="reload"');
    expect(html).toContain('Check the file again');
  });
});

describe('a row that has never been confirmed', () => {
  const html = draw(
    result({
      rows: [
        row({
          state: 'never',
          usable: false,
          confirmedHash: null,
          confirmedAt: null,
          confirmedLines: [],
          refusal:
            'Tortie will not connect to pop-os, because nobody has confirmed ' +
            'it. Read what it will run and confirm it in Tortie first. ' +
            'Nothing was started.'
        })
      ]
    })
  );

  it('draws the not usable chip and not the confirmed one', () => {
    expect(html).toContain('Not usable');
    expect(html).not.toContain('>Confirmed<');
  });

  it('draws the sentence that says what to do about it', () => {
    expect(html).toContain(
      'Tortie will not sign in to this machine until you read what it will ' +
        'run and confirm it.'
    );
  });

  it('draws the refusal sentence main sent, unchanged', () => {
    expect(html).toContain(
      'Tortie will not connect to pop-os, because nobody has confirmed it.'
    );
  });

  it('opens the lines by default, and offers the button that fixes it', () => {
    expect(html).toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).toContain('Confirm this machine');
    expect(html).toContain('Hide what it runs');
  });

  it('carries the confirm warning main sent with the row', () => {
    expect(html).toContain(WARNING);
  });

  it('offers the connection test and the two step removal', () => {
    expect(html).toContain('Test the connection again');
    expect(html).toContain('Remove this machine');
    // The second step is not on screen until the first is pressed.
    expect(html).not.toContain('Remove it');
  });
});

describe('a row whose details moved after it was confirmed', () => {
  const html = draw(
    result({
      rows: [
        row({
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
            'Tortie will not connect to pop-os, because its details changed ' +
            'after you confirmed them. Read the change and confirm it again ' +
            'if it is what you want. Nothing was started.'
        })
      ]
    })
  );

  it('draws both list headings', () => {
    expect(html).toContain('You confirmed:');
    expect(html).toContain('It now says:');
  });

  it('draws both sets of lines, so the change is readable', () => {
    expect(html).toContain('Machine: pop-os.tail1a2b.ts.net');
    expect(html).toContain('Machine: pop-os-2.tail1a2b.ts.net');
    expect(html).toContain('Runs this program on that machine: /usr/bin/tmux');
    expect(html).toContain(
      'Runs this program on that machine: /usr/local/bin/tmux'
    );
  });

  it('says the details changed, and offers the button that agrees again', () => {
    expect(html).toContain(
      'The details changed after you confirmed them, so Tortie will not sign ' +
        'in to this machine. Read what changed and confirm it again.'
    );
    expect(html).toContain('Confirm the new details');
  });
});

describe('a confirmed row', () => {
  const html = draw(result({ rows: [row({})] }));

  it('draws the confirmed chip and the sentence that goes with it', () => {
    expect(html).toContain('>Confirmed<');
    expect(html).toContain(
      'You confirmed this machine. Tortie may sign in to it when you ask it to.'
    );
  });

  it('keeps the lines shut until they are asked for', () => {
    expect(html).toContain('Show what it runs');
    expect(html).not.toContain('Runs this program on that machine:');
  });

  it('shows nothing that can start a process until the row is opened', () => {
    expect(html).not.toContain('Test the connection again');
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
    expect(html).toContain(
      'Tortie dropped 2 rows whole. Nothing from them was used.'
    );
  });

  it('names the field and the reason for each one', () => {
    expect(html).toContain('>host<');
    expect(html).toContain('A host may not begin with a dash.');
    expect(html).toContain('>port<');
    expect(html).toContain('A port must be a whole number from 1 to 65535.');
  });

  it('offers the one way to read the file again', () => {
    expect(html).toContain('Check the file again');
  });

  it('says one row in the singular', () => {
    const one = draw(
      result({
        errors: [
          { id: 'bad', field: 'id', reason: 'An id must be unique in the file.' }
        ]
      })
    );
    expect(one).toContain(
      'Tortie dropped 1 row whole. Nothing from it was used.'
    );
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
