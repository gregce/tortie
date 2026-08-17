/**
 * Phase 68. Add a machine, and the connection test view.
 *
 * What these tests hold:
 * - The confirm button is off until a connection test has come back `ok` with
 *   an absolute path the machine itself reported, and the reason is written
 *   under it for as long as it is off. A control that is off without saying
 *   why is a puzzle rather than a safeguard.
 * - The picker prints the pinned absolute path Tortie ran, before it runs
 *   anything, and prints the plain sentence when there is no such program.
 * - A changed host key draws the alarm state. An unreachable machine does
 *   not. The two must never look the same, because three ordinary events
 *   wearing the alarm colour teach a person to ignore the one that is not.
 * - The renderer composes none of the outcome copy. Both sentences come from
 *   main on the outcome, so they are asserted as the fixture sent them.
 * - The id a new row will carry is derived and made unique, so a person never
 *   has to type one and two machines never share a confirmation.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server rather than a mounted DOM.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachineTestOutcome,
  MachineTestStarted,
  MachinesResult,
  TailscaleSourceResult
} from '@shared/ipc';
import { AddMachineView } from '../AddMachine';
import { ConnectionTestView } from '../ConnectionTestView';
import {
  emptyForm,
  machineIdFrom,
  portOf,
  sheetOf,
  type LiveTest,
  type MachineFormState
} from '../machines-store';

const STARTED: MachineTestStarted = {
  testId: 't-1',
  commandLine:
    '/usr/bin/ssh -o BatchMode=no -o ConnectTimeout=10 ' +
    '-o StrictHostKeyChecking=ask 127.0.0.1 ...',
  sshPath: '/usr/bin/ssh'
};

/**
 * The sheet main sends back at the end of a test that worked. These are
 * `describeMachine`'s own lines, copied from src/main/machines/confirm.ts, so
 * the fixture is what the surface actually receives rather than something the
 * renderer could have written for itself.
 */
const SHEET = {
  hash: 'f'.repeat(64),
  lines: [
    'Machine: 127.0.0.1',
    'Port: 2222',
    'Runs this program on that machine: /usr/bin/tmux'
  ],
  warning:
    'This names a machine Tortie will sign in to as you, and a program it ' +
    'will run there with your files and your credentials.'
};

function outcome(over: Partial<MachineTestOutcome>): MachineTestOutcome {
  return {
    testId: 't-1',
    class: 'ok',
    alarm: false,
    headline: 'This machine answered.',
    detail: 'Tortie will run /usr/bin/tmux on it.',
    resolvedPath: '/usr/bin/tmux',
    exitCode: 0,
    durationMs: 1_240,
    sheet: SHEET,
    ...over
  };
}

/** One finished draft test, as the store holds it. */
function draftTest(over: Partial<LiveTest> = {}): LiveTest {
  return {
    started: STARTED,
    savedId: null,
    draftId: 'scratch-box',
    draft: { host: '127.0.0.1', user: null, port: 2_222, remoteTmuxPath: null },
    transcript: '',
    outcome: outcome({}),
    running: false,
    ...over
  };
}

function machines(): MachinesResult {
  return {
    rows: [],
    errors: [],
    directory: '/Users/x/Library/Application Support/Tortie/gmux/config',
    path: '/Users/x/Library/Application Support/Tortie/gmux/config/machines.json',
    present: true,
    honesty:
      'Confirming seals which program Tortie runs on that machine. It cannot ' +
      'seal the bytes of that program. Anyone who can write to that machine ' +
      'can change it, and Tortie will not see that happen.',
    warning:
      'This names a machine Tortie will sign in to as you, and a program it ' +
      'will run there with your files and your credentials.',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

function form(over: Partial<MachineFormState>): MachineFormState {
  return { ...emptyForm(), ...over };
}

function seed(state: {
  form?: MachineFormState;
  test?: LiveTest | null;
  tailscale?: TailscaleSourceResult | null;
}): string {
  return renderToStaticMarkup(
    <AddMachineView
      machines={machines()}
      form={state.form ?? emptyForm()}
      tailscale={state.tailscale ?? null}
      tailscaleBusy={false}
      test={state.test ?? null}
      busy={false}
      error={null}
      onSetForm={() => undefined}
      onClose={() => undefined}
      onFindTailnet={() => undefined}
      onUsePeer={() => undefined}
      onStartTest={() => undefined}
      onSendInput={() => undefined}
      onCancelTest={() => undefined}
      onAdd={() => undefined}
    />
  );
}

/** The one button's opening tag, so `disabled` can be read off it alone. */
function addButtonTag(html: string): string {
  const at = html.indexOf('data-machines-action="add-confirm"');
  expect(at).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', at);
  return html.slice(open, html.indexOf('>', at) + 1);
}

describe('the confirm button waits for the machine to answer', () => {
  it('is off with no test at all, and says why', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }) });
    expect(addButtonTag(html)).toContain('disabled');
    expect(html).toContain(
      'Run the connection test first. Tortie needs to see the machine ' +
        'answer, and it needs the program path the machine reports.'
    );
  });

  it('is still off while the test is running', () => {
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: draftTest({ outcome: null, running: true })
    });
    expect(addButtonTag(html)).toContain('disabled');
  });

  it('is still off when the test came back with anything other than ok', () => {
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: draftTest({
        outcome: outcome({
          class: 'refused',
          headline: 'That machine answered and refused the connection.',
          detail:
            'Something is at that address and it is not accepting ' +
            'connections on this port.',
          resolvedPath: null,
          exitCode: 255,
          sheet: null
        })
      })
    });
    expect(addButtonTag(html)).toContain('disabled');
  });

  it('is still off when the test worked and main sent no sheet back', () => {
    // This is the shape the first build shipped in. The test succeeded, the
    // path came back, and there was no hash for the agreement to bind to, so
    // every add was refused by main as stale. The button must be off rather
    // than send a hash the renderer made up.
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: draftTest({ outcome: outcome({ sheet: null }) })
    });
    expect(addButtonTag(html)).toContain('disabled');
  });

  it('is still off when the test was started before the machine was named', () => {
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: draftTest({ draftId: null })
    });
    expect(addButtonTag(html)).toContain('disabled');
  });

  it('comes on once the machine answered and main sent the sheet, and drops the reason', () => {
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: draftTest()
    });
    expect(addButtonTag(html)).not.toContain('disabled');
    expect(html).not.toContain('Run the connection test first.');
  });

  it('draws main’s own sheet lines, and no name and no colour', () => {
    const html = seed({
      form: form({ host: '127.0.0.1', label: 'Scratch box', color: 'green', port: '2222' }),
      test: draftTest()
    });
    for (const line of SHEET.lines) expect(html).toContain(line);
    // The name and the colour are presentation. They are not in the hash, so
    // they are never in the lines a person agrees to.
    expect(html).not.toContain('Machine: Scratch box');
    expect(html).not.toContain('Colour: ');
  });

  it('carries both sentences main sent on the result', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }) });
    expect(html).toContain(
      'This names a machine Tortie will sign in to as you, and a program it ' +
        'will run there with your files and your credentials.'
    );
    expect(html).toContain(
      'Confirming seals which program Tortie runs on that machine. It cannot ' +
        'seal the bytes of that program.'
    );
  });
});

describe('the tailnet picker', () => {
  it('prints the pinned path Tortie ran', () => {
    const html = seed({
      tailscale: {
        binary: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
        source: 'pinned',
        peers: [
          {
            host: 'pop-os.tail1a2b.ts.net',
            name: 'pop-os',
            os: 'linux',
            online: true,
            isThisMac: false,
            alreadyAdded: false
          }
        ],
        note: null
      }
    });
    expect(html).toContain('Reading from:');
    expect(html).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale');
    expect(html).toContain('pop-os.tail1a2b.ts.net');
  });

  it('says plainly when there is no Tailscale program to run', () => {
    const html = seed({
      tailscale: { binary: null, source: 'missing', peers: [], note: null }
    });
    expect(html).toContain(
      'Tortie found no Tailscale program on this Mac at the places it looks. ' +
        'Type the machine address yourself below.'
    );
    expect(html).not.toContain('Reading from:');
  });

  it('tells an empty tailnet apart from a missing program', () => {
    const html = seed({
      tailscale: {
        binary: '/usr/local/bin/tailscale',
        source: 'pinned',
        peers: [],
        note: null
      }
    });
    expect(html).toContain(
      'Tailscale answered and listed no other machines. Type the machine ' +
        'address yourself below.'
    );
  });

  it('marks this Mac and a machine that is already added', () => {
    const html = seed({
      tailscale: {
        binary: '/usr/local/bin/tailscale',
        source: 'pinned',
        peers: [
          {
            host: 'this-mac.tail1a2b.ts.net',
            name: 'this-mac',
            os: 'macOS',
            online: true,
            isThisMac: true,
            alreadyAdded: false
          },
          {
            host: 'pop-os.tail1a2b.ts.net',
            name: 'pop-os',
            os: 'linux',
            online: false,
            isThisMac: false,
            alreadyAdded: true
          }
        ],
        note: null
      }
    });
    expect(html).toContain('This Mac');
    expect(html).toContain('Already added');
    expect(html).toContain('Offline');
  });
});

describe('the connection test view', () => {
  const draw = (o: MachineTestOutcome | null, transcript = ''): string =>
    renderToStaticMarkup(
      <ConnectionTestView
        started={STARTED}
        transcript={transcript}
        outcome={o}
        running={false}
        onSend={() => undefined}
        onCancel={() => undefined}
      />
    );

  it('writes exactly two lines of its own, and marks what the rest is', () => {
    const html = draw(null, 'Warning: Permanently added ...');
    expect(html).toContain('Tortie is running:');
    expect(html).toContain('/usr/bin/ssh');
    expect(html).toContain(
      'Everything below this line comes from that program and from the ' +
        'machine. Tortie does not change it, does not store it, and does not ' +
        'answer it for you.'
    );
    expect(html).toContain('Warning: Permanently added ...');
  });

  it('draws the alarm state for a changed host key', () => {
    const html = draw(
      outcome({
        class: 'host-key-changed',
        alarm: true,
        headline: 'The identity of this machine changed.',
        detail:
          'The program reports that the key this machine presented is not ' +
          'the key it presented before.',
        resolvedPath: null,
        exitCode: 255
      })
    );
    expect(html).toContain('data-alarm="yes"');
    expect(html).toContain('mach-outcome alarm');
    expect(html).toContain('data-outcome-class="host-key-changed"');
    expect(html).toContain('The identity of this machine changed.');
  });

  it('draws an unreachable machine calmly, and never as the alarm', () => {
    const html = draw(
      outcome({
        class: 'unreachable',
        alarm: false,
        headline: 'Tortie could not reach this machine.',
        detail:
          'Nothing was changed on either machine. The machine may be off, ' +
          'asleep, or off the network.',
        resolvedPath: null,
        exitCode: 255
      })
    );
    expect(html).toContain('data-alarm="no"');
    expect(html).not.toContain('mach-outcome alarm');
    expect(html).toContain('Tortie could not reach this machine.');
  });

  it('offers the answer field only while the program is still running', () => {
    const running = renderToStaticMarkup(
      <ConnectionTestView
        started={STARTED}
        transcript="Are you sure you want to continue connecting?"
        outcome={null}
        running={true}
        onSend={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(running).toContain('data-machines-field="answer"');
    expect(running).toContain(
      'What you type here goes straight to the program above and nowhere else.'
    );
    expect(draw(null)).not.toContain('data-machines-field="answer"');
  });
});

describe('the values a new row is written from', () => {
  it('derives an id from the name a person typed', () => {
    expect(machineIdFrom('Pop OS', '10.0.0.4', new Set())).toBe('pop-os');
  });

  it('falls back to the address when there is no name', () => {
    expect(machineIdFrom('', 'pop-os.tail1a2b.ts.net', new Set())).toBe(
      'pop-os-tail1a2b-ts-net'
    );
  });

  it('never hands a second row the id of the first', () => {
    expect(machineIdFrom('Pop OS', '', new Set(['pop-os']))).toBe('pop-os-2');
    expect(machineIdFrom('Pop OS', '', new Set(['pop-os', 'pop-os-2']))).toBe(
      'pop-os-3'
    );
  });

  it('always answers with something the id rule accepts', () => {
    const pattern = /^[a-z][a-z0-9-]{0,31}$/;
    for (const name of ['9 lives', '   ', '...', 'A', 'Ä Ö Ü']) {
      expect(pattern.test(machineIdFrom(name, '', new Set()))).toBe(true);
    }
  });

  it('reads a port a person typed, and refuses one that is not a port', () => {
    expect(portOf('2222')).toBe(2_222);
    expect(portOf('  22 ')).toBe(22);
    expect(portOf('')).toBeNull();
    expect(portOf('0')).toBeNull();
    expect(portOf('65536')).toBeNull();
    expect(portOf('22a')).toBeNull();
  });

  it('takes the sheet from main, and only from a finished draft test', () => {
    expect(sheetOf(draftTest())).toEqual(SHEET);
    expect(sheetOf(null)).toBeNull();
    // A saved row's test belongs to a row that already exists. It never feeds
    // the Add flow, whatever it came back with.
    expect(sheetOf(draftTest({ savedId: 'pop-os' }))).toBeNull();
    // Started before the machine was named, so main had no id to hash.
    expect(sheetOf(draftTest({ draftId: null }))).toBeNull();
    expect(sheetOf(draftTest({ outcome: null, running: true }))).toBeNull();
    expect(sheetOf(draftTest({ outcome: outcome({ sheet: null }) }))).toBeNull();
    expect(
      sheetOf(
        draftTest({ outcome: outcome({ class: 'unreachable', resolvedPath: null }) })
      )
    ).toBeNull();
  });
});
