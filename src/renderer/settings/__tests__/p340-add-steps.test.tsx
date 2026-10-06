/**
 * PHASE 340. Add a machine in three steps: pick, check, add, then ready
 * (build/p340/SPEC.md section 5.1, 5.3 and 5.5, D4, D6 to D10, D12, D19, D28).
 *
 * TWO HALVES, and the second is the one Phase 68 learned to write.
 *
 * The first half draws each step and reads it: the words at rest, which step
 * is on screen, which tick a check draws for each of the four version kinds,
 * the one line on the Add press and only for an unmeasured version, the
 * questions a running check asks and the fields that answer them.
 *
 * The second half drives the store's own actions over a fake bridge and reads
 * what crossed it. The first build of Phase 68 passed every component test and
 * could not add one machine, because the payload was wrong and nothing read
 * the payload. So: the Add press sends the version the SHEET bound and then
 * prepares with the id the add returned, once; Confirm prepares nothing; a
 * second pick is checked under the second machine's name; the check after a
 * key install carries the first check's id; an `ask` event is never written as
 * an outcome.
 *
 * Words are counted as a person reads them: the text of the markup, with a
 * shut `<details>` read as its summary alone and a select as its one chosen
 * option, which is what `innerText` gives in the running app.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachineAddInput,
  MachineAgentsView,
  MachineCheckView,
  MachineConfirmInput,
  MachineConfirmSheet,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachinePrepareResult,
  MachineRowView,
  MachineTestEvent,
  MachineTestInput,
  MachineTestOutcome,
  MachineTestStarted,
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult
} from '@shared/ipc';
import { AddMachineView, type AddMachineViewProps } from '../AddMachine';
import { ConnectionTestView } from '../ConnectionTestView';
import {
  ADD_NEEDS_CHECK,
  CHECK_UNREAD_REMEDY,
  CHECK_UNREAD_REMEDY_TYPED,
  OPEN_FOLDER_NEEDS_CONFIRM,
  PREPARING,
  REMEDY
} from '../machines-copy';
import {
  emptyForm,
  useMachinesStore,
  type LiveTest,
  type MachineFormState
} from '../machines-store';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STARTED: MachineTestStarted = {
  testId: 't-1',
  commandLine: '/usr/bin/ssh -o BatchMode=no 127.0.0.1 /bin/sh -c ...',
  sshPath: '/usr/bin/ssh'
};

const PATH = '/opt/homebrew/bin/tmux';

const SHEET: MachineConfirmSheet = {
  hash: 'c0ffee'.repeat(10) + 'c0ff',
  lines: [
    'Machine: 127.0.0.1',
    'Port: 2222',
    `Runs this program on that machine: ${PATH}`
  ],
  warning: 'the warning main owns',
  writeHonesty: null
};

const OFFER =
  'Accepts this version of the program, which Tortie has not measured: 3.9z';

/** A sheet that binds an accepted version, as main composes it for `unmeasured`. */
const SHEET_ACCEPTING: MachineConfirmSheet = {
  ...SHEET,
  hash: 'beef'.repeat(16),
  lines: [...SHEET.lines, OFFER],
  versionHonesty: 'the version offer main owns',
  acceptedTmuxVersion: '3.9z'
};

function check(over: Partial<MachineCheckView> = {}): MachineCheckView {
  return {
    signedInAs: 'greg',
    os: 'Darwin',
    loginRead: true,
    program: { path: PATH, source: 'install' },
    candidates: [{ path: PATH, source: 'install' }],
    typedMissing: false,
    version: '3.6a',
    versionKind: 'measured',
    ...over
  };
}

function outcome(over: Partial<MachineTestOutcome> = {}): MachineTestOutcome {
  return {
    testId: 't-1',
    class: 'ok',
    alarm: false,
    headline: 'This machine answered.',
    detail: 'the detail main composed',
    resolvedPath: PATH,
    exitCode: 0,
    durationMs: 900,
    sheet: SHEET,
    check: check(),
    ...over
  };
}

function liveTest(over: Partial<LiveTest> = {}): LiveTest {
  return {
    started: STARTED,
    savedId: null,
    draftId: 'studio',
    draft: { host: '127.0.0.1', user: null, port: 2_222, remoteTmuxPath: null },
    transcript: '',
    outcome: outcome(),
    running: false,
    ask: null,
    ...over
  };
}

function peer(name: string, host = '127.0.0.1'): TailscalePeerView {
  return { host, name, os: 'macOS', online: true, isThisMac: false, alreadyAdded: false };
}

const TAILNET: TailscaleSourceResult = {
  binary: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
  source: 'pinned',
  peers: [peer('studio', 'studio.tail1a2b.ts.net'), peer('attic', 'attic.tail1a2b.ts.net')],
  note: null
};

function machines(rows: MachineRowView[] = []): MachinesResult {
  return {
    rows,
    errors: [],
    directory: '/scratch/config',
    path: '/scratch/config/machines.json',
    present: true,
    honesty: 'the sealing sentence main owns',
    warning: 'the warning main owns',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

const noop = (): undefined => undefined;

function props(over: Partial<AddMachineViewProps> = {}): AddMachineViewProps {
  return {
    machines: machines(),
    form: emptyForm(),
    tailscale: TAILNET,
    tailscaleBusy: false,
    tailscaleReadAt: 1_760_000_000_000,
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

function view(over: Partial<AddMachineViewProps> = {}): string {
  return renderToStaticMarkup(<AddMachineView {...props(over)} />);
}

function form(over: Partial<MachineFormState>): MachineFormState {
  return { ...emptyForm(), ...over };
}

/** What a person reads: a shut disclosure is its summary, a select its choice. */
function visible(html: string): string {
  let out = html;
  // A shut <details>: keep the summary, drop the rest. None of these nest.
  out = out.replace(/<details(?![^>]*\sopen)[^>]*>([\s\S]*?)<\/details>/g, (_m, body: string) => {
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(body);
    return summary === null ? '' : ` ${summary[1] ?? ''} `;
  });
  // A select shows its chosen option.
  out = out.replace(/<select[\s\S]*?<\/select>/g, ' Blue ');
  return out
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The tailnet's own rows and main's note, which the spec counts apart. */
function withoutPeersAndNote(html: string): string {
  return html
    .replace(/<div class="mach-peers">[\s\S]*?<\/div>/, '')
    .replace(/<div class="mach-note">[\s\S]*?<\/div>/, '');
}

function words(text: string): number {
  return text.split(' ').filter((one) => /[A-Za-z0-9]/.test(one)).length;
}

/** The words Tortie's own copy may never say (the renderer audit's list). */
const FORBIDDEN = /\b(pane|panes|window|windows|prefix|tmux|ssh|socket)\b/i;

// ---------------------------------------------------------------------------
// The first half: each step, drawn
// ---------------------------------------------------------------------------

describe('step one, pick, at rest', () => {
  const html = view();
  const text = visible(withoutPeersAndNote(html));

  it('reads twelve words besides the tailnet’s own rows, at most fifteen', () => {
    // Add a machine 3, Cancel 1, Your tailnet 2, Look again 2, Type an
    // address… 3, Advanced 1 (build/p340/SPEC.md section 8.1). The parent read
    // 114 words here before a person pressed anything.
    expect(text).toBe('Add a machine Cancel Your tailnet Look again Type an address… Advanced');
    expect(words(text)).toBe(12);
    expect(words(text)).toBeLessThanOrEqual(15);
  });

  it('draws the pick step and nothing after it', () => {
    expect(html).toContain('data-machines-step="pick"');
    expect(html).not.toContain('data-machines-step="check"');
    expect(html).not.toContain('data-machines-step="add"');
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('holds Advanced shut, with the account, the port and the short path hint inside', () => {
    expect(html).toContain('data-machines-advanced="1"');
    const advanced = html.slice(html.indexOf('data-machines-advanced="1"'));
    expect(advanced).toContain('data-machines-field="user"');
    expect(advanced).toContain('data-machines-field="port"');
    expect(advanced).toContain('data-machines-field="remoteTmuxPath"');
    expect(advanced).toContain('Leave this empty and Tortie finds it.');
  });

  it('says no word the renderer may never say', () => {
    expect(visible(html)).not.toMatch(FORBIDDEN);
  });

  it('reads eleven words while the tailnet look is still running', () => {
    const looking = visible(withoutPeersAndNote(view({ tailscale: null, tailscaleBusy: true })));
    expect(words(looking)).toBe(11);
    expect(looking).toContain('Looking');
  });
});

describe('step one, an address a person types', () => {
  it('reveals the field and Check, which is off until there is an address', () => {
    const empty = view({ addressOpen: true });
    expect(empty).toContain('data-machines-field="host"');
    const at = empty.indexOf('data-machines-action="test-draft"');
    expect(at).toBeGreaterThan(-1);
    expect(empty.slice(empty.lastIndexOf('<button', at), empty.indexOf('>', at))).toContain(
      'disabled'
    );
    const typed = view({ addressOpen: true, form: form({ host: '10.0.0.4' }) });
    const at2 = typed.indexOf('data-machines-action="test-draft"');
    expect(typed.slice(typed.lastIndexOf('<button', at2), typed.indexOf('>', at2))).not.toContain(
      'disabled'
    );
    expect(typed).not.toContain('data-machines-action="type-address"');
  });
});

describe('step two, the check, while it runs', () => {
  const running = liveTest({ outcome: null, running: true, transcript: 'greg@studio' });
  const html = view({ test: running, form: form({ host: '127.0.0.1', label: 'Studio' }) });

  it('draws one row, Checking <name>…, and Stop', () => {
    expect(html).toContain('data-machines-step="check"');
    expect(html).toContain('>Checking Studio…<');
    expect(html).toContain('data-machines-action="cancel-test"');
    expect(html).toContain('>Stop<');
  });

  it('draws no Add press while it runs', () => {
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('keeps today’s answer field and Send inside Details while it runs (D9)', () => {
    const details = html.slice(html.indexOf('data-machines-details="1"'));
    expect(details).toContain('data-machines-field="answer"');
    expect(details).toContain('data-machines-action="send"');
    expect(details).toContain('greg@studio');
  });

  it('turns the peer rows off, so a second pick waits for this one', () => {
    const at = html.indexOf('data-machines-peer="studio.tail1a2b.ts.net"');
    expect(html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at))).toContain('disabled');
  });
});

describe('the questions a running check asks (D9)', () => {
  const hostKey = liveTest({
    outcome: null,
    running: true,
    ask: { kind: 'host-key', fingerprint: 'SHA256:abc123', keyType: 'ED25519' }
  });

  it('asks a first-seen machine one question, with its fingerprint and Trust it', () => {
    const html = view({ test: hostKey });
    expect(html).toContain('data-machines-ask="host-key"');
    expect(html).toContain('Tortie has not met this machine before.');
    expect(html).toContain('Fingerprint SHA256:abc123');
    expect(html).toContain('data-machines-action="trust"');
    expect(html).toContain('>Trust it<');
  });

  it('draws no Trust it once the check has ended, whatever the store still holds', () => {
    const ended = view({ test: { ...hostKey, running: false, outcome: outcome({ class: 'cancelled', sheet: null, check: null, resolvedPath: null }) } });
    expect(ended).not.toContain('data-machines-action="trust"');
    expect(ended).not.toContain('data-machines-ask=');
  });

  it('draws a prompt it does not recognise as the program’s own line and a password field', () => {
    const html = view({
      test: liveTest({
        outcome: null,
        running: true,
        ask: { kind: 'prompt', text: "Enter passphrase for key '/x/id':" }
      }),
      detailsOpen: true
    });
    expect(html).toContain('data-machines-ask="prompt"');
    expect(html).toContain('Enter passphrase for key');
    const at = html.indexOf('data-machines-field="ask-answer"');
    const tag = html.slice(html.lastIndexOf('<input', at), html.indexOf('>', at) + 1);
    expect(tag).toContain('type="password"');
    expect(tag).toContain('autoComplete="off"');
    expect(html).toContain('data-machines-action="ask-send"');
    expect(html).not.toContain('data-machines-action="trust"');
    // The store opens Details with a prompt, and the view draws it open.
    const details = html.slice(html.lastIndexOf('<details', html.indexOf('data-machines-details="1"')));
    expect(details.slice(0, details.indexOf('>'))).toContain('open');
  });
});

describe('step two, a check that answered ok, by its version', () => {
  const draw = (c: MachineCheckView, sheet: MachineConfirmSheet = SHEET): string =>
    view({
      form: form({ host: '127.0.0.1', label: 'Studio' }),
      test: liveTest({ outcome: outcome({ check: c, sheet }) })
    });

  it('ticks the address and port, the account, the program with its source, and a measured version', () => {
    const html = draw(check());
    expect(html).toContain('data-machines-check-row="reached"');
    expect(html).toContain('>Reached 127.0.0.1:2222<');
    expect(html).toContain('>Signed in as greg<');
    expect(html).toContain(`>Found ${PATH}<`);
    expect(html).toContain('title="Found in a usual install folder."');
    expect(html).toContain('>Version 3.6a<');
    // Measured: no line on the press, and the press binds no version.
    expect(html).not.toContain('data-machines-accepts');
    expect(html).toContain('>Add Studio<');
  });

  it('draws the one line on the press for an unmeasured version, from the sheet', () => {
    const html = draw(check({ version: '3.9z', versionKind: 'unmeasured' }), SHEET_ACCEPTING);
    expect(html).toContain('>Version 3.9z, not yet measured<');
    expect(html).toContain('data-machines-accepts="3.9z"');
    expect(html).toContain('>Accepts version 3.9z<');
    // What the press binds, one press away: the fifth line and main's offer.
    expect(html).toContain(OFFER);
    expect(html).toContain('the version offer main owns');
  });

  it('draws no line on the press when the sheet binds no version, whatever the check read', () => {
    // One source decides it: the sheet. A line the press would not send is a
    // line a person could agree to without it being true.
    const html = draw(check({ version: '3.9z', versionKind: 'unmeasured' }), SHEET);
    expect(html).not.toContain('data-machines-accepts');
  });

  it('draws no line on the press for a measured version even if a sheet carried one', () => {
    const html = draw(check(), SHEET_ACCEPTING);
    expect(html).not.toContain('data-machines-accepts');
  });

  it('draws Add, and no line, for a version it did not read before Add (not-read)', () => {
    const html = draw(check({ version: null, versionKind: 'not-read' }));
    expect(html).toContain('>Version: read when it is added<');
    expect(html).toContain('data-machines-action="add-confirm"');
    expect(html).not.toContain('data-machines-accepts');
  });

  it('draws Add, and no line, for a version it could not read (unreadable)', () => {
    const html = draw(check({ version: null, versionKind: 'unreadable' }));
    expect(html).toContain('>It did not say its version.<');
    expect(html).toContain('data-machines-action="add-confirm"');
    expect(html).not.toContain('data-machines-accepts');
  });

  it('reads a handful of words when Add can be pressed, and every hashed fact is on its face', () => {
    const html = draw(check());
    const text = visible(withoutPeersAndNote(html));
    // Step one's twelve, four ticks, Details, Name, Color, Add Studio and
    // What it runs (section 8.1).
    expect(words(text)).toBeLessThanOrEqual(40);
    for (const fact of ['Reached 127.0.0.1:2222', 'Signed in as greg', `Found ${PATH}`, 'Version 3.6a']) {
      expect(text).toContain(fact);
    }
    expect(text.replaceAll(PATH, 'the path')).not.toMatch(FORBIDDEN);
  });
});

describe('step two, the questions a finished check asks', () => {
  const choice = outcome({
    class: 'program-choice',
    headline: 'Tortie found the program in more than one place.',
    detail: 'Choose the one Tortie should run. Tortie runs none of them until you do.',
    resolvedPath: null,
    sheet: null,
    check: check({
      program: null,
      version: null,
      versionKind: null,
      candidates: [
        { path: '/Users/greg/loginbin/tmux', source: 'login' },
        { path: PATH, source: 'install' }
      ]
    })
  });

  it('asks which of two programs to run, one button each, and draws no Add (D4)', () => {
    const html = view({ test: liveTest({ outcome: choice }) });
    expect(html).toContain('Which one should Tortie run?');
    expect(html).toContain('data-machines-candidate="/Users/greg/loginbin/tmux"');
    expect(html).toContain(`data-machines-candidate="${PATH}"`);
    expect(html).toContain('title="Found by its login shell."');
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('lists them as text with no button in a saved row’s check (D4 as revised)', () => {
    // A saved row's path is a hashed field that only Remove and add again
    // changes, so its check offers nothing to press.
    const html = renderToStaticMarkup(
      <ConnectionTestView
        started={STARTED}
        transcript=""
        outcome={choice}
        running={false}
        mode="saved"
        onSend={noop}
        onCancel={noop}
        onPickCandidate={noop}
        onTypePath={noop}
      />
    );
    expect(html).toContain(`data-machines-candidate-text="${PATH}"`);
    expect(html).not.toContain('data-machines-candidate="');
    expect(html).not.toContain('data-machines-action="type-path"');
  });

  it('offers Type its path… and Check again when it found none, and no Add', () => {
    const none = outcome({
      class: 'no-program',
      headline: 'Tortie found no program on that machine.',
      detail: 'the detail main composed',
      resolvedPath: null,
      sheet: null,
      check: check({ program: null, candidates: [], version: null, versionKind: null })
    });
    const html = view({ test: liveTest({ outcome: none }) });
    expect(html).toContain('>Signed in as greg<');
    expect(html).toContain('data-machines-action="type-path"');
    expect(html).toContain('>Type its path…<');
    expect(html).toContain('data-machines-action="check-again"');
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });
});

describe('a check that signed in and whose answer could not be read (the fix round)', () => {
  // The verifiers read "Tortie could not reach this machine" over a machine
  // Tortie had signed in to, and the advice to read the last line, which was
  // Tortie's own marker. Main now marks the outcome signed in and says it
  // could not read the answer; the view says it reached the machine.
  const unread = outcome({
    class: 'unknown',
    headline: 'Tortie signed in to this machine and could not read its answer.',
    detail: 'the detail main composed',
    resolvedPath: null,
    sheet: null,
    check: null,
    signedIn: true
  });

  it('ticks Reached, draws main’s headline as the failed row, offers Type its path… and no Add', () => {
    const html = view({
      test: liveTest({ outcome: unread }),
      form: form({ host: '127.0.0.1', port: '2222' })
    });
    expect(html).toContain('data-machines-check-row="reached"');
    expect(html).toContain('>Tortie signed in to this machine and could not read its answer.<');
    expect(html).toContain(CHECK_UNREAD_REMEDY.replace("'", '&#x27;'));
    expect(html).not.toContain(REMEDY.unknown ?? 'no unknown remedy');
    // A check run with a typed path reads the one answer naming that path, so
    // typing it is the way past (the verifiers' S10, which the parent added
    // the same way).
    expect(html).toContain('data-machines-action="type-path"');
    expect(html).toContain('data-machines-action="check-again"');
    expect(html).not.toContain('data-machines-action="add-confirm"');
  });

  it('offers no Type its path… when the check already carried a path, and says only to quiet the file', () => {
    const html = view({
      test: liveTest({
        outcome: unread,
        draft: { host: '127.0.0.1', user: null, port: 2_222, remoteTmuxPath: '/opt/homebrew/bin/tmux' }
      }),
      form: form({ host: '127.0.0.1', port: '2222', remoteTmuxPath: '/opt/homebrew/bin/tmux' })
    });
    expect(html).not.toContain('data-machines-action="type-path"');
    expect(html).toContain(CHECK_UNREAD_REMEDY_TYPED);
  });

  it('keeps the plain advice, and no Reached, for an unknown that never signed in', () => {
    const html = view({
      test: liveTest({
        outcome: outcome({
          class: 'unknown',
          headline: 'Tortie could not reach this machine, and it does not recognise the reason.',
          resolvedPath: null,
          sheet: null,
          check: null,
          signedIn: false
        })
      }),
      form: form({ host: '127.0.0.1' })
    });
    expect(html).not.toContain('data-machines-check-row="reached"');
    expect(html).toContain(REMEDY.unknown ?? 'no unknown remedy');
    expect(html).not.toContain(CHECK_UNREAD_REMEDY);
  });
});

describe('the ready step', () => {
  const prepared: MachinePrepareResult = {
    id: 'studio',
    class: 'prepared',
    alarm: false,
    headline: 'This machine is ready.',
    detail: 'the detail main composed',
    version: '3.6a',
    supported: ['3.6a'],
    serverBorn: true,
    options: [],
    pathCaptured: true,
    durationMs: 400
  };

  it('says the machine is ready, names its agents, and offers Open a folder on it… and Done', () => {
    const html = view({
      added: { id: 'studio', label: 'Studio' },
      addedResult: prepared,
      addedAgents: ['Claude Code', 'Codex']
    });
    expect(html).toContain('data-machines-step="ready"');
    expect(html).toContain('>Studio is ready.<');
    expect(html).toContain('>Agents on it:<');
    expect(html).toContain('>Claude Code, Codex<');
    expect(html).toContain('data-machines-action="open-folder"');
    expect(html).toContain('>Open a folder on it…<');
    expect(html).toContain('data-machines-action="add-done"');
    // The pick and the check are gone: the flow moved on.
    expect(html).not.toContain('data-machines-step="pick"');
  });

  it('draws no agents line before the scan has answered (D19)', () => {
    const html = view({ added: { id: 'studio', label: 'Studio' }, addedResult: prepared });
    expect(html).not.toContain('Agents on it:');
  });

  it('says it is preparing while the prepare after the add runs', () => {
    const html = view({ added: { id: 'studio', label: 'Studio' }, preparing: true });
    expect(html).toContain(PREPARING);
    expect(html).not.toContain('is ready.');
  });

  it('draws main’s answer and Phase 83’s sheet when Prepare refused a new version', () => {
    const html = view({
      added: { id: 'studio', label: 'Studio' },
      addedResult: {
        ...prepared,
        class: 'version-unmeasured',
        headline: 'Tortie has not measured the version that machine runs.',
        version: '3.9z',
        acceptSheet: { ...SHEET, lines: [...SHEET.lines, OFFER] }
      }
    });
    expect(html).toContain('Tortie has not measured the version that machine runs.');
    expect(html).toContain('data-machines-action="accept-version"');
    expect(html).not.toContain('data-machines-action="open-folder"');
  });
});

// ---------------------------------------------------------------------------
// The second half: the store's chained actions, over a fake bridge
// ---------------------------------------------------------------------------

interface Calls {
  tailscale: number;
  tests: MachineTestInput[];
  inputs: { testId: string; data: string }[];
  adds: MachineAddInput[];
  confirms: MachineConfirmInput[];
  prepares: string[];
  installs: MachineKeyInstallInput[];
  openFolders: string[];
  rowReads: number;
  order: string[];
}

let calls: Calls;
let nextTest = 0;
let rows: MachineRowView[] = [];
let addAnswer: (input: MachineAddInput) => MachineRowView = (input) => rowView({ id: input.id });
let installAnswer: () => MachineKeyInstallResult = () => installed();
let openAnswer = true;
const pushes: {
  test: ((e: MachineTestEvent) => void)[];
  state: ((s: never[]) => void)[];
  agents: ((v: MachineAgentsView[]) => void)[];
} = { test: [], state: [], agents: [] };

function rowView(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'blue',
    host: '127.0.0.1',
    user: null,
    port: 2222,
    remoteTmuxPath: PATH,
    state: 'confirmed',
    usable: true,
    hash: 'a'.repeat(64),
    confirmedHash: 'a'.repeat(64),
    confirmedAt: 1,
    confirmedLines: [],
    lines: [],
    refusal: null,
    warning: 'the warning main owns',
    ...over
  };
}

function installed(over: Partial<MachineKeyInstallResult> = {}): MachineKeyInstallResult {
  return {
    id: 'studio',
    class: 'key-installed',
    alarm: false,
    headline: 'The key is on that machine.',
    detail: 'detail',
    wrote: 'added',
    keyMade: true,
    fingerprint: 'SHA256:aaaa',
    transcript: '',
    durationMs: 1,
    ...over
  };
}

const PREPARED: MachinePrepareResult = {
  id: 'studio',
  class: 'prepared',
  alarm: false,
  headline: 'This machine is ready.',
  detail: 'detail',
  version: '3.6a',
  supported: ['3.6a'],
  serverBorn: true,
  options: [],
  pathCaptured: true,
  durationMs: 1
};

function installBridge(): void {
  calls = {
    tailscale: 0,
    tests: [],
    inputs: [],
    adds: [],
    confirms: [],
    prepares: [],
    installs: [],
    openFolders: [],
    rowReads: 0,
    order: []
  };
  nextTest = 0;
  rows = [];
  addAnswer = (input) => rowView({ id: input.id });
  installAnswer = () => installed();
  openAnswer = true;
  pushes.test = [];
  pushes.state = [];
  pushes.agents = [];
  const api = {
    rows: async () => {
      calls.rowReads += 1;
      return machines(rows);
    },
    reload: async () => machines(rows),
    tailscaleNames: async () => {
      calls.tailscale += 1;
      return TAILNET;
    },
    test: async (input: MachineTestInput): Promise<MachineTestStarted> => {
      calls.tests.push(input);
      calls.order.push('test');
      nextTest += 1;
      return { ...STARTED, testId: `t-${String(nextTest)}` };
    },
    testInput: async (input: { testId: string; data: string }) => {
      calls.inputs.push(input);
    },
    testCancel: async () => undefined,
    add: async (input: MachineAddInput) => {
      calls.adds.push(input);
      calls.order.push('add');
      return addAnswer(input);
    },
    confirm: async (input: MachineConfirmInput) => {
      calls.confirms.push(input);
      calls.order.push('confirm');
      return rowView({ id: input.id });
    },
    forget: async (id: string) => rowView({ id }),
    remove: async () => machines(rows),
    prepare: async (id: string) => {
      calls.prepares.push(id);
      calls.order.push(`prepare:${id}`);
      return { ...PREPARED, id };
    },
    installKey: async (input: MachineKeyInstallInput) => {
      calls.installs.push(input);
      return installAnswer();
    },
    acceptVersion: async () => rowView(),
    openFolder: async (id: string) => {
      calls.openFolders.push(id);
      return openAnswer;
    },
    onTestEvent: (cb: (e: MachineTestEvent) => void) => {
      pushes.test.push(cb);
      return () => undefined;
    },
    state: async () => [],
    onStateChanged: (cb: (s: never[]) => void) => {
      pushes.state.push(cb);
      return () => undefined;
    },
    agents: async () => [],
    onAgentsChanged: (cb: (v: MachineAgentsView[]) => void) => {
      pushes.agents.push(cb);
      return () => undefined;
    }
  };
  (globalThis as { window?: unknown }).window = { gmux: { machines: api } };
}

function reset(): void {
  useMachinesStore.setState({
    machines: null,
    busy: null,
    adding: false,
    form: emptyForm(),
    addressOpen: false,
    advancedOpen: false,
    detailsOpen: false,
    pickedLabel: null,
    pickedHost: null,
    advancedHost: null,
    added: null,
    tailscale: null,
    tailscaleBusy: false,
    tailscaleReadAt: null,
    test: null,
    prepared: {},
    preparing: null,
    accepting: null,
    keyInstall: null,
    panels: {},
    rowErrors: {}
  });
}

/** The end of the open check, as main sends it, through the store's one door. */
function end(over: Partial<MachineTestOutcome> = {}): void {
  const live = useMachinesStore.getState().test;
  if (live === null) throw new Error('there is no open check to end');
  useMachinesStore.getState().receiveTestEvent({
    testId: live.started.testId,
    kind: 'end',
    outcome: { ...outcome(over), testId: live.started.testId }
  });
}

const draftOfTest = (one: MachineTestInput | undefined) =>
  one !== undefined && one.mode === 'draft' ? one.draft : null;

describe('opening the flow looks at the tailnet once (D6)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('asks Tailscale once on the Add a machine press, and checks nothing', async () => {
    useMachinesStore.getState().openAdd();
    await vi.waitFor(() => expect(useMachinesStore.getState().tailscale).not.toBeNull());
    expect(calls.tailscale).toBe(1);
    expect(calls.tests).toEqual([]);
    expect(useMachinesStore.getState().adding).toBe(true);
  });
});

describe('a pick names the machine it picks (D28)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('fills the address and the name from the peer and starts the check under that name', async () => {
    await useMachinesStore.getState().usePeer(peer('p340-loop'));
    expect(calls.tests).toHaveLength(1);
    expect(draftOfTest(calls.tests[0])).toMatchObject({ host: '127.0.0.1', id: 'p340-loop' });
    expect(useMachinesStore.getState().form.label).toBe('p340-loop');
    expect(useMachinesStore.getState().test?.draftId).toBe('p340-loop');
  });

  it('checks the second of two picks in a row under the second machine’s name and id', async () => {
    await useMachinesStore.getState().usePeer(peer('p340-loop'));
    await useMachinesStore.getState().usePeer(peer('p340-loop2'));
    expect(calls.tests).toHaveLength(2);
    expect(draftOfTest(calls.tests[1])?.id).toBe('p340-loop2');
    expect(useMachinesStore.getState().form.label).toBe('p340-loop2');
    expect(useMachinesStore.getState().test?.draftId).toBe('p340-loop2');
  });

  it('replaces a name an earlier pick left, after that check ended', async () => {
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    end();
    await useMachinesStore.getState().usePeer(peer('macpro', 'macpro.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[1])).toMatchObject({ host: 'macpro.tail1a2b.ts.net', id: 'macpro' });
  });

  it('drops a picked name when a person types another address and checks it', async () => {
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    end();
    useMachinesStore.getState().setForm({ host: '10.0.0.9' });
    await useMachinesStore.getState().startDraftTest();
    expect(draftOfTest(calls.tests[1])).toMatchObject({ host: '10.0.0.9', id: 'machine' });
    expect(useMachinesStore.getState().form.label).toBe('');
  });

  it('keeps the id the check ran under when the Name field is edited before Add', async () => {
    await useMachinesStore.getState().usePeer(peer('studio'));
    end();
    useMachinesStore.getState().setForm({ label: 'My studio' });
    expect(useMachinesStore.getState().test?.draftId).toBe('studio');
    await useMachinesStore.getState().addMachine();
    expect(calls.adds[0]).toMatchObject({ id: 'studio', label: 'My studio' });
  });
});

describe('a pick carries nothing typed for another address under Advanced (the fix round)', () => {
  // The verifiers drove the shipping store: after an account, a port and a
  // program path were typed for 10.0.0.5, a pick of studio started its check
  // at once with all three, so it signed in to studio as that account on that
  // port and ran that path's -V there, with Advanced possibly shut. At the
  // parent a pick only filled the address.
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('clears an account, a port and a path typed for another address before it checks the pick', async () => {
    useMachinesStore.getState().setForm({
      host: '10.0.0.5',
      user: 'builder',
      port: '2222',
      remoteTmuxPath: '/home/builder/bin/tmux'
    });
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[0])).toEqual({
      host: 'studio.tail1a2b.ts.net',
      user: null,
      port: null,
      remoteTmuxPath: null,
      id: 'studio'
    });
    expect(useMachinesStore.getState().form).toMatchObject({ user: '', port: '', remoteTmuxPath: '' });
  });

  it('clears values typed before an address once an address was typed for them', async () => {
    useMachinesStore.getState().setForm({ user: 'builder' });
    useMachinesStore.getState().setForm({ host: '10.0.0.5' });
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[0])).toMatchObject({ user: null });
  });

  it('keeps what was typed under Advanced before any address, for the machine picked', async () => {
    useMachinesStore.getState().setForm({ user: 'builder', port: '2200' });
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[0])).toMatchObject({ user: 'builder', port: 2200 });
  });

  it('keeps what was typed for the same address the pick names', async () => {
    useMachinesStore.getState().setForm({ host: 'studio.tail1a2b.ts.net', port: '2200' });
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[0])).toMatchObject({ port: 2200 });
  });

  it('does not carry a path chosen from one machine’s programs to the next pick', async () => {
    await useMachinesStore.getState().usePeer(peer('studio', 'studio.tail1a2b.ts.net'));
    end({
      class: 'program-choice',
      resolvedPath: null,
      sheet: null,
      check: check({
        program: null,
        candidates: [
          { path: '/plant/tmux', source: 'login' },
          { path: PATH, source: 'install' }
        ],
        version: null,
        versionKind: null
      })
    });
    await useMachinesStore.getState().pickCandidate(PATH);
    expect(draftOfTest(calls.tests[1])).toMatchObject({ remoteTmuxPath: PATH });
    end();
    await useMachinesStore.getState().usePeer(peer('attic', 'attic.tail1a2b.ts.net'));
    expect(draftOfTest(calls.tests[2])).toMatchObject({ host: 'attic.tail1a2b.ts.net', remoteTmuxPath: null });
  });
});

describe('the test stream branches three ways (section 5.3)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('writes an ask as the open question and never as an outcome', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore.getState().receiveTestEvent({
      testId: id,
      kind: 'ask',
      ask: { kind: 'host-key', fingerprint: 'SHA256:abc', keyType: 'ED25519' }
    });
    const live = useMachinesStore.getState().test;
    expect(live?.outcome).toBeNull();
    expect(live?.running).toBe(true);
    expect(live?.ask).toEqual({ kind: 'host-key', fingerprint: 'SHA256:abc', keyType: 'ED25519' });
    // A first-seen question does not open Details; it is drawn on the face.
    expect(useMachinesStore.getState().detailsOpen).toBe(false);
  });

  it('opens Details for a prompt, because its reason is on the lines above it', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore.getState().receiveTestEvent({
      testId: id,
      kind: 'ask',
      ask: { kind: 'prompt', text: 'Enter passphrase:' }
    });
    expect(useMachinesStore.getState().detailsOpen).toBe(true);
    expect(useMachinesStore.getState().test?.outcome).toBeNull();
  });

  it('closes the question when the program prints anything after it, and on the end', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    const ask = (): void =>
      useMachinesStore.getState().receiveTestEvent({
        testId: id,
        kind: 'ask',
        ask: { kind: 'prompt', text: 'Code:' }
      });
    ask();
    useMachinesStore.getState().receiveTestEvent({ testId: id, kind: 'output', text: '\r' });
    expect(useMachinesStore.getState().test?.ask).not.toBeNull();
    useMachinesStore.getState().receiveTestEvent({ testId: id, kind: 'output', text: 'ok\r\n' });
    expect(useMachinesStore.getState().test?.ask).toBeNull();
    ask();
    end();
    expect(useMachinesStore.getState().test?.ask).toBeNull();
    expect(useMachinesStore.getState().test?.outcome?.class).toBe('ok');
  });

  it('writes nothing from a check that is no longer the open one', async () => {
    await useMachinesStore.getState().startDraftTest();
    useMachinesStore.getState().receiveTestEvent({
      testId: 't-old',
      kind: 'ask',
      ask: { kind: 'host-key', fingerprint: 'x', keyType: 'y' }
    });
    useMachinesStore.getState().receiveTestEvent({
      testId: 't-old',
      kind: 'end',
      outcome: outcome()
    });
    expect(useMachinesStore.getState().test?.ask).toBeNull();
    expect(useMachinesStore.getState().test?.outcome).toBeNull();
  });

  it('writes no outcome for an event kind this build does not know', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore
      .getState()
      .receiveTestEvent({ testId: id, kind: 'later', outcome: outcome() } as unknown as MachineTestEvent);
    expect(useMachinesStore.getState().test?.outcome).toBeNull();
    expect(useMachinesStore.getState().test?.running).toBe(true);
  });
});

describe('answering the open question', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('sends yes and nothing else to the live check for Trust it, once', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore.getState().receiveTestEvent({
      testId: id,
      kind: 'ask',
      ask: { kind: 'host-key', fingerprint: 'SHA256:abc', keyType: 'ED25519' }
    });
    await useMachinesStore.getState().answerAsk('ignored');
    expect(calls.inputs).toEqual([{ testId: id, data: 'yes\n' }]);
    expect(useMachinesStore.getState().test?.ask).toBeNull();
    // A second press has no open question to answer.
    await useMachinesStore.getState().answerAsk();
    expect(calls.inputs).toHaveLength(1);
  });

  it('sends a prompt’s line with its line ending, and keeps none of it', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore.getState().receiveTestEvent({
      testId: id,
      kind: 'ask',
      ask: { kind: 'prompt', text: 'Enter passphrase:' }
    });
    await useMachinesStore.getState().answerAsk('hunter2-secret');
    expect(calls.inputs).toEqual([{ testId: id, data: 'hunter2-secret\n' }]);
    expect(JSON.stringify(useMachinesStore.getState())).not.toContain('hunter2-secret');
  });

  it('sends nothing to a check that has ended', async () => {
    await useMachinesStore.getState().startDraftTest();
    const id = useMachinesStore.getState().test?.started.testId ?? '';
    useMachinesStore.getState().receiveTestEvent({
      testId: id,
      kind: 'ask',
      ask: { kind: 'host-key', fingerprint: 'x', keyType: 'y' }
    });
    end({ class: 'cancelled', sheet: null, check: null, resolvedPath: null });
    await useMachinesStore.getState().answerAsk();
    expect(calls.inputs).toEqual([]);
  });
});

describe('the Add press: the same hash, then Prepare (D7)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  async function checkedOk(sheet: MachineConfirmSheet): Promise<void> {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Studio', port: '2222' });
    await useMachinesStore.getState().startDraftTest();
    end({ sheet });
  }

  it('sends main’s hash and lines, then prepares the id the add returned, once, after it', async () => {
    addAnswer = () => rowView({ id: 'returned-id' });
    await checkedOk(SHEET);
    const said = await useMachinesStore.getState().addMachine();
    expect(said).toBeNull();
    expect(calls.adds).toHaveLength(1);
    expect(calls.adds[0]).toMatchObject({
      id: 'studio',
      hashRead: SHEET.hash,
      linesRead: SHEET.lines,
      remoteTmuxPath: PATH,
      host: '127.0.0.1',
      port: 2222
    });
    expect(calls.prepares).toEqual(['returned-id']);
    expect(calls.order.slice(-2)).toEqual(['add', 'prepare:returned-id']);
    expect(useMachinesStore.getState().added).toEqual({ id: 'returned-id', label: 'Studio' });
    expect(useMachinesStore.getState().prepared['returned-id']?.class).toBe('prepared');
  });

  it('sends no accepted version when the sheet binds none', async () => {
    await checkedOk(SHEET);
    await useMachinesStore.getState().addMachine();
    expect('acceptedTmuxVersion' in (calls.adds[0] ?? {})).toBe(false);
  });

  it('echoes the version the SHEET bound, and nothing derived from the check', async () => {
    await checkedOk(SHEET_ACCEPTING);
    // The check view says something else on purpose: the sheet decides.
    const live = useMachinesStore.getState().test;
    if (live?.outcome?.check !== undefined && live.outcome.check !== null) {
      useMachinesStore.setState({
        test: { ...live, outcome: { ...live.outcome, check: { ...live.outcome.check, version: '9.9' } } }
      });
    }
    await useMachinesStore.getState().addMachine();
    expect(calls.adds[0]?.acceptedTmuxVersion).toBe('3.9z');
    expect(calls.adds[0]?.hashRead).toBe(SHEET_ACCEPTING.hash);
    expect(calls.adds[0]?.linesRead).toEqual(SHEET_ACCEPTING.lines);
  });

  it('prepares nothing when main refused the add, and says main’s sentence', async () => {
    addAnswer = () => {
      throw new Error('Tortie did not add studio, because the machine changed after it was shown.');
    };
    await checkedOk(SHEET);
    const said = await useMachinesStore.getState().addMachine();
    expect(said).toContain('because the machine changed');
    expect(calls.prepares).toEqual([]);
    expect(useMachinesStore.getState().added).toBeNull();
  });

  it('sends nothing at all with no finished check', async () => {
    const said = await useMachinesStore.getState().addMachine();
    expect(said).toBe(ADD_NEEDS_CHECK);
    expect(calls.adds).toEqual([]);
    expect(calls.prepares).toEqual([]);
  });
});

describe('Confirm confirms only (D12)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('calls prepare zero times', async () => {
    const one = rowView({ state: 'never', usable: false });
    useMachinesStore.setState({ machines: machines([one]) });
    const said = await useMachinesStore.getState().confirmMachine('studio');
    expect(said).toBeNull();
    expect(calls.confirms).toEqual([{ id: 'studio', hashRead: one.hash, linesRead: one.lines }]);
    expect(calls.prepares).toEqual([]);
    expect(calls.tests).toEqual([]);
  });
});

describe('the check after a key install (D10 as revised, D27)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  const KEY_SHEET = {
    hash: 'd7'.repeat(32),
    lines: ['Machine: 127.0.0.1'],
    warning: 'the warning main owns',
    notes: ['a note']
  };

  it('reuses the open draft and its id, never a new id from the form', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Studio' });
    await useMachinesStore.getState().startDraftTest();
    end({ class: 'password-required', sheet: null, check: null, resolvedPath: null, keySheet: KEY_SHEET });
    // A name typed meanwhile, and a row now taking the id the form would derive.
    useMachinesStore.getState().setForm({ label: 'Renamed' });
    useMachinesStore.setState({ machines: machines([rowView({ id: 'renamed' })]) });
    await useMachinesStore.getState().installKey('pw');
    expect(calls.installs[0]?.target).toEqual({
      mode: 'draft',
      draft: { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null, id: 'studio' }
    });
    expect(calls.tests).toHaveLength(2);
    expect(calls.tests[1]).toEqual(calls.tests[0]);
    expect(useMachinesStore.getState().test?.draftId).toBe('studio');
    // A draft's check ends at the Add step; the Add press decides.
    expect(calls.prepares).toEqual([]);
  });

  it('prepares a CONFIRMED saved row once its re-check answers ok', async () => {
    useMachinesStore.setState({ machines: machines([rowView()]) });
    await useMachinesStore.getState().setUpSignIn('studio');
    expect(useMachinesStore.getState().panels.studio).toBe('test');
    expect(calls.tests).toEqual([{ mode: 'saved', id: 'studio' }]);
    end({ class: 'auth-refused', sheet: null, check: null, resolvedPath: null, keySheet: KEY_SHEET });
    const pending = useMachinesStore.getState().installKey('pw');
    await vi.waitFor(() => expect(calls.tests).toHaveLength(2));
    expect(calls.tests[1]).toEqual({ mode: 'saved', id: 'studio' });
    expect(calls.prepares).toEqual([]);
    end({ sheet: null });
    expect(await pending).toBeNull();
    expect(calls.prepares).toEqual(['studio']);
  });

  it('prepares nothing when the re-check does not answer ok', async () => {
    useMachinesStore.setState({ machines: machines([rowView()]) });
    await useMachinesStore.getState().startSavedTest('studio');
    end({ class: 'auth-refused', sheet: null, check: null, resolvedPath: null, keySheet: KEY_SHEET });
    const pending = useMachinesStore.getState().installKey('pw');
    await vi.waitFor(() => expect(calls.tests).toHaveLength(2));
    end({ class: 'password-required', sheet: null, check: null, resolvedPath: null });
    await pending;
    expect(calls.prepares).toEqual([]);
  });

  it('prepares nothing for a saved row nobody confirmed, even when it answers ok', async () => {
    useMachinesStore.setState({ machines: machines([rowView({ state: 'changed', usable: false })]) });
    await useMachinesStore.getState().startSavedTest('studio');
    end({ class: 'auth-refused', sheet: null, check: null, resolvedPath: null, keySheet: KEY_SHEET });
    const pending = useMachinesStore.getState().installKey('pw');
    await vi.waitFor(() => expect(calls.tests).toHaveLength(2));
    end({ sheet: null });
    await pending;
    expect(calls.prepares).toEqual([]);
  });

  it('starts no check when the key did not go on', async () => {
    installAnswer = () => installed({ class: 'auth-refused', wrote: null, keyMade: false });
    await useMachinesStore.getState().startDraftTest();
    end({ class: 'auth-refused', sheet: null, check: null, resolvedPath: null, keySheet: KEY_SHEET });
    await useMachinesStore.getState().installKey('pw');
    expect(calls.tests).toHaveLength(1);
  });
});

describe('a candidate press and Check again', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  const CHOICE = {
    class: 'program-choice' as const,
    sheet: null,
    resolvedPath: null,
    check: check({
      program: null,
      version: null,
      versionKind: null,
      candidates: [
        { path: '/a/tmux', source: 'login' as const },
        { path: PATH, source: 'install' as const }
      ]
    })
  };

  it('checks again with the picked path typed, under the same id (D4)', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Studio' });
    await useMachinesStore.getState().startDraftTest();
    end(CHOICE);
    await useMachinesStore.getState().pickCandidate(PATH);
    expect(calls.tests).toHaveLength(2);
    expect(draftOfTest(calls.tests[1])).toMatchObject({ remoteTmuxPath: PATH, id: 'studio' });
    expect(useMachinesStore.getState().form.remoteTmuxPath).toBe(PATH);
  });

  it('refuses a path the check did not name, and a saved row’s check', async () => {
    await useMachinesStore.getState().startDraftTest();
    end(CHOICE);
    expect(await useMachinesStore.getState().pickCandidate('/evil/tmux')).toBeNull();
    useMachinesStore.setState({ machines: machines([rowView()]) });
    await useMachinesStore.getState().startSavedTest('studio');
    end(CHOICE);
    await useMachinesStore.getState().pickCandidate(PATH);
    expect(calls.tests).toHaveLength(2);
  });

  it('runs Check again against the same machine and the same id', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Studio' });
    await useMachinesStore.getState().startDraftTest();
    end({ class: 'unreachable', sheet: null, check: null, resolvedPath: null });
    await useMachinesStore.getState().checkAgain();
    expect(calls.tests[1]).toEqual(calls.tests[0]);
  });
});

describe('Open a folder on it…', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('asks main to open the folder sheet on that machine, and says so when main refused', async () => {
    expect(await useMachinesStore.getState().openFolder('studio')).toBeNull();
    openAnswer = false;
    expect(await useMachinesStore.getState().openFolder('studio')).toBe(OPEN_FOLDER_NEEDS_CONFIRM);
    expect(calls.openFolders).toEqual(['studio', 'studio']);
    expect(calls.tests).toEqual([]);
    expect(calls.prepares).toEqual([]);
  });
});

describe('nothing starts from a push (refusal 8, D24)', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('re-reads the rows on a link push and on an agents push, and starts nothing', async () => {
    vi.resetModules();
    const { useMachinesStore: fresh } = await import('../machines-store');
    fresh.getState().init();
    await vi.waitFor(() => expect(pushes.agents).toHaveLength(1));
    const before = calls.rowReads;
    pushes.state[0]?.([]);
    pushes.agents[0]?.([]);
    await vi.waitFor(() => expect(calls.rowReads).toBe(before + 2));
    pushes.test[0]?.({ testId: 't-x', kind: 'end', outcome: outcome() });
    expect(calls.tests).toEqual([]);
    expect(calls.prepares).toEqual([]);
    expect(calls.tailscale).toBe(0);
    expect(calls.adds).toEqual([]);
    expect(calls.inputs).toEqual([]);
  });
});
