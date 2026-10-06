/**
 * Phase 68. Add a machine, and the check view. PHASE 340 rewrote both as pick,
 * check and add (build/p340/SPEC.md section 5.1, D8, D9, D17, D28).
 *
 * What these tests hold:
 * - No Add button exists until main has composed a sheet, which is every check
 *   that answered ok and nothing else. Before that there is nothing a person
 *   could meaningfully agree to: the lines name a program the machine itself
 *   reports at the end of the check.
 * - The Add step draws main's own lines, warning and sealing sentence under
 *   What it runs, beside the one press, and a version Tortie has not measured
 *   is one line on that press.
 * - PHASE 79. The tailnet list has three states and each says what a person
 *   can do. A Mac with no Tailscale gets the install command in mono with a
 *   copy control beside it, which Tortie never runs. Its head is two words;
 *   what Tailscale is for, where Tortie ran it from and when it last looked
 *   are its hover.
 * - PHASE 79. A device that cannot keep a session alive is marked and its
 *   button is off. It is never removed from the list.
 * - PHASE 79.1. A machine that turned the sign in down is offered a key on
 *   this sheet, before it has been added at all; the step itself is proven in
 *   key-install.test.tsx.
 * - A changed host key draws the alarm state. An unreachable machine does
 *   not. The two must never look the same.
 * - The renderer composes none of the outcome copy. Both sentences come from
 *   main on the outcome, so they are asserted as the fixture sent them.
 * - The id a new row will carry is derived and made unique, so a person never
 *   has to type one and two machines never share a confirmation.
 *
 * Each step's own shape, its words at rest and the store's chained actions are
 * in p340-add-steps.test.tsx.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server rather than a mounted DOM.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachineCheckView,
  MachineTestOutcome,
  MachineTestStarted,
  MachinesResult,
  TailscaleSourceResult
} from '@shared/ipc';
import {
  AddMachineView,
  peerCanHost,
  peerDisplayName,
  type AddMachineViewProps
} from '../AddMachine';
import { ConnectionTestView } from '../ConnectionTestView';
import {
  MEASURED_VERSIONS,
  PREPARE_SUPPORTED_LABEL,
  REMEDY,
  REMEDY_LABEL,
  TAILSCALE_EXPLAIN,
  TAILSCALE_INSTALL_COMMAND,
  TAILSCALE_NOT_INSTALLED,
  TAILSCALE_WHY
} from '../machines-copy';
import {
  emptyForm,
  machineIdFrom,
  portOf,
  sheetOf,
  type KeyInstallState,
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
 * The sheet main sends back at the end of a check that worked. These are
 * `describeMachine`'s own lines, so the fixture is what the surface actually
 * receives rather than something the renderer could have written for itself.
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
    'will run there with your files and your credentials.',
  // PHASE 101. Main answers this on every sheet. Null is the ordinary case.
  writeHonesty: null
};

/** What the check read, as main composes it from the one block. */
function check(over: Partial<MachineCheckView> = {}): MachineCheckView {
  return {
    signedInAs: 'greg',
    os: 'Darwin',
    loginRead: true,
    program: { path: '/usr/bin/tmux', source: 'path' },
    candidates: [{ path: '/usr/bin/tmux', source: 'path' }],
    typedMissing: false,
    version: '3.6a',
    versionKind: 'measured',
    ...over
  };
}

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
    check: check(),
    ...over
  };
}

/** One finished draft check, as the store holds it. */
function draftTest(over: Partial<LiveTest> = {}): LiveTest {
  return {
    started: STARTED,
    savedId: null,
    draftId: 'scratch-box',
    draft: { host: '127.0.0.1', user: null, port: 2_222, remoteTmuxPath: null },
    transcript: '',
    outcome: outcome({}),
    running: false,
    ask: null,
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
      'Confirming seals which program Tortie runs on that machine. It can ' +
      'never seal the bytes of that program.',
    warning:
      'This names a machine Tortie will sign in to as you, and a program it ' +
      'will run there with your files and your credentials.',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

function form(over: Partial<MachineFormState>): MachineFormState {
  return { ...emptyForm(), ...over };
}

const noop = (): undefined => undefined;

/** Every prop the view takes, with nothing pressed and nothing open. */
function props(over: Partial<AddMachineViewProps> = {}): AddMachineViewProps {
  return {
    machines: machines(),
    form: emptyForm(),
    tailscale: null,
    tailscaleBusy: false,
    tailscaleReadAt: null,
    test: null,
    keyInstall: null,
    addressOpen: false,
    advancedOpen: false,
    detailsOpen: false,
    added: null,
    busy: false,
    error: null,
    onSetForm: noop,
    onClose: noop,
    onFindTailnet: noop,
    onUsePeer: noop,
    onSetAddressOpen: noop,
    onSetAdvancedOpen: noop,
    onSetDetailsOpen: noop,
    onStartTest: noop,
    onCheckAgain: noop,
    onPickCandidate: noop,
    onAnswer: noop,
    onSendInput: noop,
    onCancelTest: noop,
    onInstallKey: noop,
    onAdd: noop,
    onAcceptVersion: noop,
    onOpenFolder: noop,
    onDone: noop,
    ...over
  };
}

function seed(state: {
  form?: MachineFormState;
  test?: LiveTest | null;
  tailscale?: TailscaleSourceResult | null;
  tailscaleReadAt?: number | null;
  keyInstall?: KeyInstallState | null;
}): string {
  return renderToStaticMarkup(
    <AddMachineView
      {...props({
        form: state.form ?? emptyForm(),
        test: state.test ?? null,
        tailscale: state.tailscale ?? null,
        tailscaleReadAt: state.tailscaleReadAt ?? null,
        keyInstall: state.keyInstall ?? null
      })}
    />
  );
}

/** One peer row's opening tag, found by the address it carries. */
function peerButtonTag(html: string, host: string): string {
  const at = html.indexOf(`data-machines-peer="${host}"`);
  expect(at).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', at);
  return html.slice(open, html.indexOf('>', at) + 1);
}

describe('the Add press waits for the machine to answer', () => {
  it('does not exist with no check at all', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }) });
    expect(html).not.toContain('data-machines-action="add-confirm"');
    expect(html).not.toContain('data-machines-step="add"');
  });

  it('does not exist while the check is running', () => {
    const html = seed({ test: draftTest({ outcome: null, running: true }) });
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('does not exist when the check came back with anything other than ok', () => {
    for (const cls of ['unreachable', 'no-program', 'program-choice', 'auth-refused'] as const) {
      const html = seed({
        test: draftTest({
          outcome: outcome({ class: cls, resolvedPath: null, sheet: null })
        })
      });
      expect({ cls, add: html.includes('data-machines-action="add-confirm"') }).toEqual({
        cls,
        add: false
      });
    }
  });

  it('does not exist when the check worked and main sent no sheet back', () => {
    const html = seed({ test: draftTest({ outcome: outcome({ sheet: null }) }) });
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('does not exist when the check was started with no id', () => {
    const html = seed({ test: draftTest({ draftId: null }) });
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('exists, enabled, once the machine answered ok and main sent the sheet', () => {
    const html = seed({ form: form({ label: 'Studio' }), test: draftTest() });
    const at = html.indexOf('data-machines-action="add-confirm"');
    expect(at).toBeGreaterThan(-1);
    const tag = html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1);
    expect(tag).not.toContain('disabled');
    expect(html).toContain('>Add Studio<');
  });

  it('draws main’s own sheet lines, warning and sealing sentence under What it runs', () => {
    const html = seed({ test: draftTest() });
    const what = html.indexOf('data-machines-what-it-runs="1"');
    expect(what).toBeGreaterThan(-1);
    for (const line of SHEET.lines) {
      expect(html.indexOf(line)).toBeGreaterThan(what);
    }
    expect(html).toContain(machines().warning);
    expect(html).toContain(machines().honesty);
  });

  it('keeps the measured list inside What it runs, where condition 100(e) reads it', () => {
    const html = seed({ test: draftTest() });
    expect(html).toContain(PREPARE_SUPPORTED_LABEL);
    expect(html).toContain(
      `<span class="mach-prepare-value" data-measured-versions="1">${MEASURED_VERSIONS.join(', ')}</span>`
    );
    expect(html.indexOf('data-measured-versions="1"')).toBeGreaterThan(
      html.indexOf('data-machines-what-it-runs="1"')
    );
  });

  it('draws no measured list before a check has answered', () => {
    expect(seed({ form: form({ host: '127.0.0.1' }) })).not.toContain(
      'data-measured-versions'
    );
  });
});

describe('the tailnet list before it has answered', () => {
  const html = seed({});

  it('heads the list with two words and carries why as its hover', () => {
    expect(html).toContain('data-tailscale-state="unlooked"');
    expect(html).toContain('>Your tailnet<');
    expect(html).toContain(TAILSCALE_WHY);
    expect(html).not.toContain('Find machines on your tailnet');
    expect(html).not.toContain('Tortie has not looked yet.');
  });

  it('says a person can type an address instead, so this is not the only path', () => {
    expect(TAILSCALE_WHY).toContain('type an address');
    expect(html).toContain('data-machines-action="type-address"');
  });

  it('offers Look again once, and starts nothing by being drawn', () => {
    expect(html.match(/data-machines-action="find-tailnet"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('mach-peers');
  });
});

describe('the tailnet list on a Mac with no Tailscale', () => {
  const html = seed({
    tailscale: { binary: null, source: 'missing', peers: [], note: null },
    tailscaleReadAt: 1_760_000_000_000
  });

  it('says it is not installed and gives the command that installs it', () => {
    expect(html).toContain('data-tailscale-state="missing"');
    expect(html).toContain(TAILSCALE_NOT_INSTALLED);
    expect(html).toContain(`<code class="set-agent-cmd">${TAILSCALE_INSTALL_COMMAND}</code>`);
  });

  it('puts the copy control beside the command', () => {
    expect(html).toContain('Copy the install command');
    expect(html).toContain('set-copy');
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

describe('the tailnet list once it has looked', () => {
  const installed = (
    peers: TailscaleSourceResult['peers'],
    note: string | null = null
  ): TailscaleSourceResult => ({
    binary: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
    source: 'pinned',
    peers,
    note
  });

  it('puts the pinned path Tortie ran, and when it looked, in the head’s hover', () => {
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
      tailscaleReadAt: Date.now()
    });
    expect(html).toContain('data-tailscale-state="installed"');
    const head = html.slice(html.indexOf('class="mach-scan-title"'));
    const title = head.slice(head.indexOf('title="'), head.indexOf('">'));
    expect(title).toContain('Reading from: /Applications/Tailscale.app/Contents/MacOS/Tailscale');
    expect(title).toContain(TAILSCALE_EXPLAIN);
    expect(title).toContain('Tortie looked just now.');
    expect(html).toContain('pop-os.tail1a2b.ts.net');
  });

  it('draws exactly the rows main sent, this Mac included and marked', () => {
    // Main leaves Tailscale's Funnel relays out of `peers` (Phase 339), and the
    // list draws `peers` and counts nothing.
    const peer = (name: string, isThisMac = false) => ({
      host: `${name}.fixture-p339.ts.net`,
      name,
      os: 'linux',
      online: true,
      isThisMac,
      alreadyAdded: false
    });
    const html = seed({
      tailscale: installed([
        peer('studio-mac', true),
        peer('attic'),
        peer('build-box'),
        peer('friends-server')
      ]),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect((html.match(/class="mach-peer"/g) ?? []).length).toBe(4);
    expect(html).not.toContain('other machines found');
  });

  it('draws main’s note once when the tailnet answered with nothing', () => {
    const html = seed({
      tailscale: installed(
        [],
        'Tailscale answered and listed no other machines. Type the machine ' +
          'address yourself below.'
      ),
      tailscaleReadAt: 1_760_000_000_000
    });
    expect(html.match(/Tailscale answered and listed no other machines\./g) ?? []).toHaveLength(1);
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
    expect(peerButtonTag(html, 'pop-os.tail1a2b.ts.net')).toContain('disabled');
  });

  it('names a machine whose name Tailscale did not supply', () => {
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
    expect(html).toContain('gregs-iphone.tail1a2b.ts.net');
    expect(html).toContain('Cannot run a session');
    const tag = peerButtonTag(html, 'gregs-iphone.tail1a2b.ts.net');
    expect(tag).toContain('data-peer-can-host="no"');
    expect(tag).toContain('disabled');
  });

  it('turns every peer off while a check runs, so a second pick waits', () => {
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
      test: draftTest({ outcome: null, running: true })
    });
    expect(peerButtonTag(html, 'pop-os.tail1a2b.ts.net')).toContain('disabled');
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
    expect(peerButtonTag(html, 'odd-box.tail1a2b.ts.net')).not.toContain('disabled');
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
    expect(peerDisplayName(peer('localhost.localdomain', 'box.tail1a2b.ts.net'))).toBe('box');
    expect(peerDisplayName(peer('', 'box.tail1a2b.ts.net'))).toBe('box');
    expect(peerDisplayName(peer('localhost', ''))).toBe('localhost');
  });

  it('refuses only the four systems that cannot keep a session alive', () => {
    for (const os of ['ios', 'iOS', 'iPadOS', 'android', 'Android', 'tvOS', ' ios ']) {
      expect(peerCanHost(os)).toBe(false);
    }
    for (const os of ['macOS', 'linux', 'windows', 'freebsd', '', 'plan9']) {
      expect(peerCanHost(os)).toBe(true);
    }
  });
});

describe('the check view', () => {
  const draw = (
    o: MachineTestOutcome | null,
    transcript = '',
    over: { running?: boolean; detailsOpen?: boolean } = {}
  ): string =>
    renderToStaticMarkup(
      <ConnectionTestView
        started={STARTED}
        transcript={transcript}
        outcome={o}
        running={over.running ?? false}
        detailsOpen={over.detailsOpen ?? false}
        host="127.0.0.1"
        port={2222}
        label="Studio"
        onSend={noop}
        onCancel={noop}
      />
    );

  it('writes exactly two lines of its own in Details, and marks what the rest is', () => {
    const html = draw(null, 'Warning: Permanently added ...');
    const details = html.slice(html.indexOf('data-machines-details="1"'));
    expect(details).toContain('Tortie is running:');
    expect(details).toContain('/usr/bin/ssh');
    expect(details).toContain(
      'Everything below this line comes from that program and from the ' +
        'machine. Tortie does not store it and does not answer it for you.'
    );
    expect(details).toContain('Warning: Permanently added ...');
  });

  it('draws the alarm state for a changed host key, as its one failed row', () => {
    const html = draw(
      outcome({
        class: 'host-key-changed',
        alarm: true,
        headline: 'The identity of this machine changed.',
        detail:
          'The program reports that the key this machine presented is not ' +
          'the key it presented before.',
        resolvedPath: null,
        exitCode: 255,
        sheet: null,
        check: null
      })
    );
    expect(html).toContain('data-alarm="yes"');
    expect(html).toContain('mach-check alarm');
    expect(html).toContain('data-check-tone="alarm"');
    expect(html).toContain('data-outcome-class="host-key-changed"');
    expect(html).toContain('The identity of this machine changed.');
    expect(html).not.toContain('data-machines-action="trust"');
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
        exitCode: 255,
        sheet: null,
        check: null
      })
    );
    expect(html).toContain('data-alarm="no"');
    expect(html).not.toContain('mach-check alarm');
    expect(html).not.toContain('data-check-tone="alarm"');
    expect(html).toContain('data-check-tone="failed"');
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
        sheet: null,
        check: null
      })
    );
    expect(html).toContain(REMEDY_LABEL);
    expect(html).toContain('data-remedy-class="refused"');
    expect(html).toContain(REMEDY.refused);
  });

  it('says nothing at all about an outcome that worked', () => {
    const html = draw(outcome({}));
    expect(html).not.toContain(REMEDY_LABEL);
    expect(html).not.toContain('mach-remedy');
  });

  it('keeps today’s answer field and Send in Details only while the program runs', () => {
    const running = draw(null, 'Are you sure you want to continue connecting?', {
      running: true
    });
    const details = running.slice(running.indexOf('data-machines-details="1"'));
    expect(details).toContain('data-machines-field="answer"');
    expect(details).toContain('data-machines-action="send"');
    expect(details).toContain(
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
    expect(machineIdFrom('', 'pop-os.tail1a2b.ts.net', new Set())).toBe('pop-os-tail1a2b-ts-net');
  });

  it('never hands a second row the id of the first', () => {
    expect(machineIdFrom('Pop OS', '', new Set(['pop-os']))).toBe('pop-os-2');
    expect(machineIdFrom('Pop OS', '', new Set(['pop-os', 'pop-os-2']))).toBe('pop-os-3');
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

  it('takes the sheet from main, and only from a finished draft check', () => {
    expect(sheetOf(draftTest())).toEqual(SHEET);
    expect(sheetOf(null)).toBeNull();
    // A saved row's check belongs to a row that already exists. It never feeds
    // the Add flow, whatever it came back with.
    expect(sheetOf(draftTest({ savedId: 'pop-os' }))).toBeNull();
    expect(sheetOf(draftTest({ draftId: null }))).toBeNull();
    expect(sheetOf(draftTest({ outcome: null, running: true }))).toBeNull();
    expect(sheetOf(draftTest({ outcome: outcome({ sheet: null }) }))).toBeNull();
    expect(
      sheetOf(draftTest({ outcome: outcome({ class: 'unreachable', resolvedPath: null }) }))
    ).toBeNull();
  });
});

describe('the key a machine can be given before it is added', () => {
  /** Main's key sheet, as a fixture. Main composes it beside the hash. */
  const KEY_SHEET = {
    hash: 'd7'.repeat(32),
    lines: [
      'Machine: 127.0.0.1',
      'Port: 2222',
      'Writes this file on that machine: ~/.ssh/authorized_keys',
      'Keeps the private half of the key on this Mac, at: /scratch/keys/machine-3f2a91c04d7b'
    ],
    warning: 'the warning main owns',
    notes: ['Turn on Remote Login on that machine first.']
  };

  const refused = (keySheet: typeof KEY_SHEET | null): LiveTest =>
    draftTest({
      outcome: outcome({
        class: 'auth-refused',
        headline: 'That machine turned the sign in down.',
        detail: 'The machine answered and would not let Tortie in.',
        resolvedPath: null,
        exitCode: 255,
        sheet: null,
        check: null,
        keySheet
      })
    });

  it('offers the key on this sheet, for a machine with no row yet', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }), test: refused(KEY_SHEET) });
    expect(html).toContain('data-machines-key="1"');
    expect(html).toContain('data-machines-field="machine-password"');
    for (const line of KEY_SHEET.lines) expect(html).toContain(line);
  });

  it('offers nothing when main sent no key sheet back', () => {
    const html = seed({ form: form({ host: '127.0.0.1' }), test: refused(null) });
    expect(html).not.toContain('data-machines-key="1"');
  });

  it('draws no Add press, because the machine has still not answered ok', () => {
    // A key on the machine is not the machine answering. The row is written
    // from a check that came back ok with a program path, and nothing else.
    const html = seed({
      form: form({ host: '127.0.0.1' }),
      test: refused(KEY_SHEET),
      keyInstall: { savedId: null, running: false, result: null }
    });
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });
});
