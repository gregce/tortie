/**
 * Phase 68. Add a machine, and the connection test view.
 *
 * What these tests hold:
 * - The confirm button is off until a connection test has come back `ok` with
 *   an absolute path the machine itself reported, and the reason is written
 *   under it for as long as it is off. A control that is off without saying
 *   why is a puzzle rather than a safeguard.
 * - The picker prints the pinned absolute path Tortie ran, before it runs
 *   anything.
 * - PHASE 79. The panel above the picker has three states and each one says
 *   what a person can do. A Mac with no Tailscale gets the install command in
 *   mono with a copy control beside it, which is what the agent scan already
 *   does for an agent that is not installed. The operator pressed the button,
 *   read one sentence saying no program was found, and had nowhere to go.
 * - PHASE 79. A device that cannot keep a session alive is marked and its
 *   button is off. It is never removed from the list, because a device a
 *   person can see in the Tailscale app and not in Tortie reads as Tortie
 *   being broken.
 * - PHASE 79. An outcome a person can act on carries what to do next, and an
 *   outcome that worked carries nothing.
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
import { AddMachineView, peerCanHost, peerDisplayName } from '../AddMachine';
import { ConnectionTestView } from '../ConnectionTestView';
import {
  MEASURED_VERSIONS,
  REMEDY,
  REMEDY_LABEL,
  TAILSCALE_INSTALL_COMMAND,
  TAILSCALE_NOT_INSTALLED,
  TAILSCALE_NOT_LOOKED,
  TAILSCALE_TITLE,
  TAILSCALE_WHY
} from '../machines-copy';
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
  tailscaleReadAt?: number | null;
}): string {
  return renderToStaticMarkup(
    <AddMachineView
      machines={machines()}
      form={state.form ?? emptyForm()}
      tailscale={state.tailscale ?? null}
      tailscaleBusy={false}
      tailscaleReadAt={state.tailscaleReadAt ?? null}
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

/** One peer row's opening tag, found by the address it carries. */
function peerButtonTag(html: string, host: string): string {
  const at = html.indexOf(`data-machines-peer="${host}"`);
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

describe('the Tailscale panel, before anything is pressed', () => {
  it('says what Tailscale is for and that Tortie has not looked yet', () => {
    const html = seed({});
    expect(html).toContain('data-tailscale-state="unlooked"');
    expect(html).toContain(TAILSCALE_TITLE);
    expect(html).toContain(TAILSCALE_NOT_LOOKED);
    expect(html).toContain(TAILSCALE_WHY);
    expect(html).toContain('Find machines on your tailnet');
  });

  it('says a person can type an address instead, so this is not the only path', () => {
    expect(TAILSCALE_WHY).toContain('typing its address');
  });

  it('offers the button once, and starts nothing by being drawn', () => {
    const html = seed({});
    expect(html.match(/data-machines-action="find-tailnet"/g) ?? []).toHaveLength(1);
    // No path, no count and no peer list until a person has pressed it.
    expect(html).not.toContain('Reading from:');
    expect(html).not.toContain('mach-peers');
  });
});

describe('the Tailscale panel on a Mac with no Tailscale', () => {
  const html = seed({
    tailscale: { binary: null, source: 'missing', peers: [], note: null },
    tailscaleReadAt: 1_760_000_000_000
  });

  it('says it is not installed and gives the command that installs it', () => {
    expect(html).toContain('data-tailscale-state="missing"');
    expect(html).toContain(TAILSCALE_NOT_INSTALLED);
    expect(html).toContain(
      `<code class="set-agent-cmd">${TAILSCALE_INSTALL_COMMAND}</code>`
    );
  });

  it('puts the copy control beside the command', () => {
    expect(html).toContain('Copy the install command');
    expect(html).toContain('set-copy');
  });

  it('still says what Tailscale is for, and offers the button again', () => {
    expect(html).toContain(TAILSCALE_WHY);
    expect(html).toContain('Look again');
  });

  it('draws no pinned path, because no program was found', () => {
    expect(html).not.toContain('Reading from:');
  });

  it('does not print the same sentence twice', () => {
    // Main sends its own note for this state and it says what the sentence
    // above the command says. Only one of them is drawn.
    const withNote = seed({
      tailscale: {
        binary: null,
        source: 'missing',
        peers: [],
        note:
          'Tortie found no Tailscale program on this Mac at the places it ' +
          'looks. Type the machine address yourself below.'
      },
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(withNote).not.toContain('Type the machine address yourself below.');
  });
});

describe('the Tailscale panel once it has looked', () => {
  const installed = (
    peers: TailscaleSourceResult['peers'],
    note: string | null = null
  ): TailscaleSourceResult => ({
    binary: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
    source: 'pinned',
    peers,
    note
  });

  it('prints the pinned path Tortie ran', () => {
    const html = seed({
      tailscale: installed([
        {
          host: 'pop-os.tail1a2b.ts.net',
          name: 'pop-os',
          os: 'linux',
          online: true,
          isThisMac: false,
          alreadyAdded: false
        }
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html).toContain('data-tailscale-state="installed"');
    expect(html).toContain('Reading from:');
    expect(html).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale');
    expect(html).toContain('pop-os.tail1a2b.ts.net');
  });

  it('counts the other machines it found', () => {
    const one = seed({
      tailscale: installed([
        {
          host: 'pop-os.tail1a2b.ts.net',
          name: 'pop-os',
          os: 'linux',
          online: true,
          isThisMac: false,
          alreadyAdded: false
        },
        {
          host: 'this-mac.tail1a2b.ts.net',
          name: 'this-mac',
          os: 'macOS',
          online: true,
          isThisMac: true,
          alreadyAdded: false
        }
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    // This Mac is not another machine, so one row of two is counted.
    expect(one).toContain('1 other machine found.');
  });

  it('says so plainly when the tailnet answered with nothing, once', () => {
    const html = seed({
      tailscale: installed(
        [],
        'Tailscale answered and listed no other machines. Type the machine ' +
          'address yourself below.'
      ),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html).toContain('No other machines found.');
    // Main's note, drawn once. The renderer used to keep a copy of the same
    // sentence and print both.
    expect(
      html.match(/Tailscale answered and listed no other machines\./g) ?? []
    ).toHaveLength(1);
  });

  it('marks this Mac, a machine already added, and a machine that is off', () => {
    const html = seed({
      tailscale: installed([
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
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html).toContain('This Mac');
    expect(html).toContain('Already added');
    expect(html).toContain('Offline');
    expect(html).toContain('data-peer-online="no"');
  });

  it('names a machine whose name Tailscale did not supply', () => {
    // Tailscale reports the HostName `localhost` for an iOS device and main
    // falls back to it, so two of the operator's four rows read localhost.
    // The first label of the address is the name Tailscale itself shows.
    const html = seed({
      tailscale: installed([
        {
          host: 'gregs-iphone.tail1a2b.ts.net',
          name: 'localhost',
          os: 'iOS',
          online: true,
          isThisMac: false,
          alreadyAdded: false
        }
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html).toContain('>gregs-iphone<');
    expect(html).toContain('data-peer-name-source="tailnet"');
    expect(html).not.toContain('localhost');
  });

  it('marks a device that cannot run a session, and turns its button off', () => {
    const html = seed({
      tailscale: installed([
        {
          host: 'gregs-iphone.tail1a2b.ts.net',
          name: 'gregs-iphone',
          os: 'iOS',
          online: true,
          isThisMac: false,
          alreadyAdded: false
        }
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    // Marked, never omitted. A device a person can see in the Tailscale app
    // and cannot see here reads as Tortie being broken.
    expect(html).toContain('gregs-iphone.tail1a2b.ts.net');
    expect(html).toContain('Cannot run a session');
    const tag = peerButtonTag(html, 'gregs-iphone.tail1a2b.ts.net');
    expect(tag).toContain('data-peer-can-host="no"');
    expect(tag).toContain('disabled');
  });

  it('says when Tortie last looked', () => {
    const html = seed({
      tailscale: installed([]),
      tailscaleReadAt: Date.now()
    });
    expect(html).toContain('Tortie looked just now.');
    expect(html).not.toContain('Tortie has not looked yet.');
  });

  it('leaves a machine it has never heard of alone', () => {
    const html = seed({
      tailscale: installed([
        {
          host: 'odd-box.tail1a2b.ts.net',
          name: 'odd-box',
          os: '',
          online: true,
          isThisMac: false,
          alreadyAdded: false
        }
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html).toContain('data-peer-can-host="yes"');
    expect(html).not.toContain('Cannot run a session');
  });
});

describe('the two judgements the peer list makes, on their own', () => {
  it('falls back to the tailnet label only when the name says nothing', () => {
    const peer = (name: string, host: string) => ({
      host,
      name,
      os: 'linux',
      online: true,
      isThisMac: false,
      alreadyAdded: false
    });
    expect(peerDisplayName(peer('pop-os', 'pop-os.tail1a2b.ts.net'))).toBe('pop-os');
    expect(peerDisplayName(peer('localhost', 'gregs-iphone.tail1a2b.ts.net'))).toBe(
      'gregs-iphone'
    );
    expect(peerDisplayName(peer('LocalHost', 'gregs-ipad.tail1a2b.ts.net'))).toBe(
      'gregs-ipad'
    );
    expect(
      peerDisplayName(peer('localhost.localdomain', 'box.tail1a2b.ts.net'))
    ).toBe('box');
    expect(peerDisplayName(peer('', 'box.tail1a2b.ts.net'))).toBe('box');
    // Nothing better to offer, so the name it was given stands.
    expect(peerDisplayName(peer('localhost', ''))).toBe('localhost');
  });

  it('refuses only the four systems that cannot keep a session alive', () => {
    for (const os of ['ios', 'iOS', 'iPadOS', 'android', 'Android', 'tvOS', ' ios ']) {
      expect(peerCanHost(os)).toBe(false);
    }
    // Everything else, including a value Tortie has never seen and an empty
    // one, is treated as able. Tortie must not refuse a machine on a string it
    // does not know.
    for (const os of ['macOS', 'linux', 'windows', 'freebsd', '', 'plan9']) {
      expect(peerCanHost(os)).toBe(true);
    }
  });
});

describe('the versions Tortie has measured, before any test runs', () => {
  it('is on screen with no test at all', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }) });
    expect(html).toContain('Versions Tortie has measured:');
    expect(html).toContain(MEASURED_VERSIONS.join(', '));
    expect(html).toContain(
      'Tortie only uses versions of that program it has measured.'
    );
    // Proven to be before the test rather than after it: nothing has run.
    expect(html).not.toContain('data-machines-transcript');
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

  it('says what to do next about an outcome a person can act on', () => {
    const html = draw(
      outcome({
        class: 'refused',
        alarm: false,
        headline: 'That machine answered and refused the connection.',
        detail:
          'Something is at that address and it is not accepting connections ' +
          'on this port.',
        resolvedPath: null,
        exitCode: 255,
        sheet: null
      })
    );
    expect(html).toContain(REMEDY_LABEL);
    expect(html).toContain('data-remedy-class="refused"');
    expect(html).toContain(REMEDY.refused);
    // The advice names the four places a person has to go, in order.
    expect(html).toContain('System Settings');
    expect(html).toContain('Remote Login');
  });

  it('says nothing at all about an outcome that worked', () => {
    const html = draw(outcome({}));
    expect(html).not.toContain(REMEDY_LABEL);
    expect(html).not.toContain('mach-remedy');
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
