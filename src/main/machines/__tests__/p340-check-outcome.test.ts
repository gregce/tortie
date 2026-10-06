/**
 * Phase 340: what a finished check answers, and what a running one asks
 * (build/p340/SPEC.md D4, D7, D8, D9 and D15 as revised by §Attack).
 *
 * node-pty is replaced by a stand-in that RECORDS: it keeps the callbacks the
 * runner handed it, so a test feeds it the bytes a real ssh printed (the
 * adversary's capture over the loopback machine, or the revised script's own
 * block) and then its exit. Nothing is spawned and no machine is contacted.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineTestEvent, MachineTestOutcome } from '@shared/ipc';
import type { MachineExecutionFields } from '../confirm';

interface SpawnRecord {
  file: string;
  args: string[];
  written: string[];
  killed: boolean;
  data: ((chunk: string) => void) | null;
  exit: ((event: { exitCode: number }) => void) | null;
}

const spawned: SpawnRecord[] = [];

vi.mock('node-pty', () => ({
  spawn: (file: string, args: string[]) => {
    const record: SpawnRecord = {
      file,
      args,
      written: [],
      killed: false,
      data: null,
      exit: null
    };
    spawned.push(record);
    return {
      pid: 515151,
      onData: (cb: (chunk: string) => void) => {
        record.data = cb;
      },
      onExit: (cb: (event: { exitCode: number }) => void) => {
        record.exit = cb;
      },
      write: (data: string) => {
        record.written.push(data);
      },
      kill: () => {
        record.killed = true;
      }
    };
  }
}));

const {
  TEST_PROMPT_QUIET_MS,
  classifyCheckOutput,
  classifyProbeOutput,
  hostKeyQuestionOf,
  resetMachineTestForTests,
  startMachineTest,
  unfinishedLineOf
} = await import('../connection-test');
const { CHECK_MARKER } = await import('../check-script');
const { REMOTE_PATH_MARKER } = await import('../carriage');
const { describeMachine } = await import('../confirm');
const {
  MACHINE_CHECK_SIGNED_IN_TIMED_OUT,
  MACHINE_CHECK_UNREAD_DETAIL,
  MACHINE_CHECK_UNREAD_HEADLINE,
  MACHINE_VERSION_ACCEPT_OFFER
} = await import('../errors');

const C = CHECK_MARKER;
const P = REMOTE_PATH_MARKER;

const KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: '/Users/x/.ssh/known_hosts'
};

const DRAFT: MachineExecutionFields = {
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: null
};

function block(lines: readonly string[]): string {
  return [C, ...lines, C].join('\r\n') + '\r\n';
}

const BASE = ['user=greg', 'os=Darwin', 'login=read'];

const ONE_MEASURED = block([
  ...BASE,
  'cand=login /usr/local/bin/tmux',
  'count=1',
  'version=tmux 3.6a',
  `${P}/usr/local/bin/tmux${P}`
]);
const ONE_UNMEASURED = block([
  ...BASE,
  'cand=typed /odd/tmux',
  'count=1',
  'version=tmux 3.9z',
  `${P}/odd/tmux${P}`
]);
const ONE_INSTALL = block([
  ...BASE,
  'cand=install /opt/homebrew/bin/tmux',
  'count=1',
  'vskip=install',
  `${P}/opt/homebrew/bin/tmux${P}`
]);
const ONE_SILENT = block([
  ...BASE,
  'cand=path /usr/bin/tmux',
  'count=1',
  'version=',
  `${P}/usr/bin/tmux${P}`
]);
const ONE_ODD_WORDS = block([
  ...BASE,
  'cand=path /usr/bin/tmux',
  'count=1',
  'version=tmux 3.6a;rm -rf',
  `${P}/usr/bin/tmux${P}`
]);
const TWO = block([
  ...BASE,
  'cand=login /plant/tmux',
  'cand=install /opt/homebrew/bin/tmux',
  'count=2'
]);
const NONE = block([...BASE, 'count=0']);
const TYPED_MISSING = block([...BASE, 'typed=missing', 'count=0']);

/** Start one check against the stand-in, and collect what it pushes. */
function start(opts: {
  sheetId?: string | null;
  mode?: 'draft' | 'saved';
  fields?: MachineExecutionFields;
  hostKeys?: { tortie: string; user: string };
  /**
   * ssh's global record files for this run (the ruled round). Empty unless a
   * test names some, so nothing in `/etc` on the machine running this file can
   * change an answer here.
   */
  globalHostKeys?: readonly string[];
} = {}): { events: MachineTestEvent[]; pty: SpawnRecord; testId: string } {
  const events: MachineTestEvent[] = [];
  const started = startMachineTest({
    fields: opts.fields ?? DRAFT,
    sheetId: opts.sheetId === undefined ? 'studio' : opts.sheetId,
    keyPath: '/k/studio',
    packaged: false,
    env: {},
    hostKeys: opts.hostKeys ?? KEYS,
    globalHostKeys: opts.globalHostKeys ?? [],
    ...(opts.mode !== undefined ? { mode: opts.mode } : {}),
    emit: (event) => events.push(event)
  });
  const pty = spawned[spawned.length - 1] as SpawnRecord;
  return { events, pty, testId: started.testId };
}

function outcomeOf(events: MachineTestEvent[]): MachineTestOutcome {
  const end = events.find((e) => e.kind === 'end');
  if (end === undefined || end.kind !== 'end') throw new Error('no end event');
  return end.outcome;
}

function finishWith(text: string, exitCode = 0, opts?: Parameters<typeof start>[0]) {
  const run = start(opts);
  run.pty.data?.(text);
  run.pty.exit?.({ exitCode });
  return { ...run, outcome: outcomeOf(run.events) };
}

beforeEach(() => {
  spawned.length = 0;
  resetMachineTestForTests();
});

afterEach(() => {
  vi.useRealTimers();
  resetMachineTestForTests();
});

// ---------------------------------------------------------------------------
// The live decision
// ---------------------------------------------------------------------------

describe('classifyCheckOutput decides from the one block (D15)', () => {
  it('one program is ok, two are a choice, none is no-program', () => {
    expect(classifyCheckOutput(ONE_MEASURED, 0)).toBe('ok');
    expect(classifyCheckOutput(TWO, 0)).toBe('program-choice');
    expect(classifyCheckOutput(NONE, 0)).toBe('no-program');
    expect(classifyCheckOutput(TYPED_MISSING, 0)).toBe('no-program');
  });

  it('a block decides whatever the exit code', () => {
    expect(classifyCheckOutput(ONE_MEASURED, 7)).toBe('ok');
  });

  it('a malformed block is unknown, whatever else the buffer holds', () => {
    expect(classifyCheckOutput(ONE_MEASURED + ONE_MEASURED, 0)).toBe('unknown');
    expect(classifyCheckOutput(`Permission denied\r\n${C}\r\n`, 255)).toBe('unknown');
  });

  it('the legacy path pair alone no longer answers ok: the far side ran no check', () => {
    const legacy = `${P}/usr/bin/tmux${P}\n`;
    expect(classifyProbeOutput(legacy, 0)).toBe('ok');
    expect(classifyCheckOutput(legacy, 0)).toBe('unknown');
  });

  it('with no block, today’s order: the phrase table, the password, the exit code', () => {
    expect(classifyCheckOutput('Permission denied (publickey).\r\n', 255)).toBe(
      'auth-refused'
    );
    expect(classifyCheckOutput("greg@box's password: \r\n", -1)).toBe('password-required');
    expect(classifyCheckOutput('', 0)).toBe('no-program');
    expect(classifyCheckOutput('', 255)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// The outcome
// ---------------------------------------------------------------------------

describe('a finished check’s outcome (D8 as revised)', () => {
  it('measured: ok, the path, a sheet with no accepted version, today’s base hash', () => {
    const { outcome } = finishWith(ONE_MEASURED);
    expect(outcome.class).toBe('ok');
    expect(outcome.resolvedPath).toBe('/usr/local/bin/tmux');
    expect(outcome.check?.versionKind).toBe('measured');
    expect(outcome.check?.version).toBe('3.6a');
    expect(outcome.check?.program).toEqual({ path: '/usr/local/bin/tmux', source: 'login' });
    expect(outcome.check?.signedInAs).toBe('greg');
    expect(outcome.check?.os).toBe('Darwin');
    expect(outcome.check?.loginRead).toBe(true);
    const base = describeMachine('studio', { ...DRAFT, remoteTmuxPath: '/usr/local/bin/tmux' });
    expect(outcome.sheet?.hash).toBe(base.hash);
    expect(outcome.sheet?.lines).toEqual([...base.lines]);
    expect(outcome.sheet?.acceptedTmuxVersion).toBeNull();
    expect(outcome.sheet?.versionHonesty).toBeNull();
  });

  it('unmeasured: the sheet binds the version as accepted, with the fifth line and the offer', () => {
    const { outcome } = finishWith(ONE_UNMEASURED);
    expect(outcome.class).toBe('ok');
    expect(outcome.check?.versionKind).toBe('unmeasured');
    expect(outcome.check?.version).toBe('3.9z');
    const accepted = describeMachine('studio', {
      ...DRAFT,
      remoteTmuxPath: '/odd/tmux',
      acceptedTmuxVersion: '3.9z'
    });
    expect(outcome.sheet?.hash).toBe(accepted.hash);
    expect(outcome.sheet?.acceptedTmuxVersion).toBe('3.9z');
    expect(outcome.sheet?.versionHonesty).toBe(MACHINE_VERSION_ACCEPT_OFFER);
    expect(outcome.sheet?.lines).toContain(
      'Accepts this version of the program, which Tortie has not measured: 3.9z'
    );
    // And it is NOT the hash without the version.
    const bare = describeMachine('studio', { ...DRAFT, remoteTmuxPath: '/odd/tmux' });
    expect(outcome.sheet?.hash).not.toBe(bare.hash);
  });

  it('not read: a program found only in an install folder still gets a sheet, with no version', () => {
    const { outcome } = finishWith(ONE_INSTALL);
    expect(outcome.class).toBe('ok');
    expect(outcome.check?.versionKind).toBe('not-read');
    expect(outcome.check?.version).toBeNull();
    expect(outcome.sheet).not.toBeNull();
    expect(outcome.sheet?.acceptedTmuxVersion).toBeNull();
  });

  it('unreadable, empty or failing the pattern: still ok and a sheet, no accepted version', () => {
    for (const text of [ONE_SILENT, ONE_ODD_WORDS]) {
      resetMachineTestForTests();
      const { outcome } = finishWith(text);
      expect(outcome.class).toBe('ok');
      expect(outcome.check?.versionKind).toBe('unreadable');
      expect(outcome.check?.version).toBeNull();
      expect(outcome.sheet).not.toBeNull();
      expect(outcome.sheet?.acceptedTmuxVersion).toBeNull();
      expect(outcome.sheet?.versionHonesty).toBeNull();
    }
  });

  it('a saved row’s check binds no new version; its sheet names the row’s own', () => {
    const { outcome } = finishWith(ONE_UNMEASURED, 0, {
      mode: 'saved',
      fields: { ...DRAFT, remoteTmuxPath: '/odd/tmux', acceptedTmuxVersion: null }
    });
    expect(outcome.check?.versionKind).toBe('unmeasured');
    expect(outcome.sheet?.acceptedTmuxVersion).toBeNull();
    expect(outcome.sheet?.versionHonesty).toBeNull();
  });

  it('no id: ok and the view, but no sheet, because the hash covers the id', () => {
    const { outcome } = finishWith(ONE_MEASURED, 0, { sheetId: null });
    expect(outcome.class).toBe('ok');
    expect(outcome.check).not.toBeNull();
    expect(outcome.sheet).toBeNull();
  });

  it('a choice: every candidate, no path, no sheet', () => {
    const { outcome } = finishWith(TWO);
    expect(outcome.class).toBe('program-choice');
    expect(outcome.headline).toBe('Tortie found the program in more than one place.');
    expect(outcome.detail).toBe(
      'Choose the one Tortie should run. Tortie runs none of them until you do.'
    );
    expect(outcome.check?.candidates).toEqual([
      { path: '/plant/tmux', source: 'login' },
      { path: '/opt/homebrew/bin/tmux', source: 'install' }
    ]);
    expect(outcome.check?.program).toBeNull();
    expect(outcome.check?.versionKind).toBeNull();
    expect(outcome.resolvedPath).toBeNull();
    expect(outcome.sheet).toBeNull();
  });

  it('none found, and a typed path that holds nothing, named', () => {
    const none = finishWith(NONE).outcome;
    expect(none.class).toBe('no-program');
    expect(none.detail).toBe(
      'Install tmux on that machine, or type the full path under Advanced.'
    );
    resetMachineTestForTests();
    const typed = finishWith(TYPED_MISSING, 0, {
      fields: { ...DRAFT, remoteTmuxPath: '/usr/local/bin/tmux' }
    }).outcome;
    expect(typed.class).toBe('no-program');
    expect(typed.detail).toBe('Nothing that runs is at /usr/local/bin/tmux on that machine.');
    expect(typed.check?.typedMissing).toBe(true);
    expect(typed.sheet).toBeNull();
  });

  it('a malformed block: unknown, no path, no sheet and no view (M6′, T1)', () => {
    const fake = block([
      'cand=install /evil/tmux',
      'count=1',
      'version=tmux 3.6a',
      `${P}/evil/tmux${P}`
    ]);
    for (const text of [fake + ONE_MEASURED, ONE_MEASURED + fake]) {
      resetMachineTestForTests();
      const { outcome } = finishWith(text);
      expect(outcome.class).toBe('unknown');
      expect(outcome.resolvedPath).toBeNull();
      expect(outcome.sheet).toBeNull();
      expect(outcome.check).toBeNull();
      // THE FIX ROUND (the verifiers' finding). Tortie's marker came back, so
      // the machine was reached and signed in to: the copy says it could not
      // read the answer, never that it could not reach the machine, and it
      // quotes no marker of Tortie's as the program's last line.
      expect(outcome.signedIn).toBe(true);
      expect(outcome.headline).toBe(MACHINE_CHECK_UNREAD_HEADLINE);
      expect(outcome.detail).toBe(MACHINE_CHECK_UNREAD_DETAIL);
      expect(`${outcome.headline} ${outcome.detail}`).not.toContain('__TORTIE_');
      expect(outcome.headline).not.toMatch(/could not reach/);
    }
  });

  it('a typed path is read past a block something else printed, before or after (the fix round)', () => {
    const fake = block(['user=evil', 'os=Darwin', 'login=read', 'cand=login /evil/tmux', 'count=1', 'version=tmux 3.6a', `${P}/evil/tmux${P}`]);
    const typed = block([...BASE, 'cand=typed /odd/tmux', 'count=1', 'version=tmux 3.6a', `${P}/odd/tmux${P}`]);
    for (const text of [fake + typed, typed + fake]) {
      resetMachineTestForTests();
      const { outcome } = finishWith(text, 0, { fields: { ...DRAFT, remoteTmuxPath: '/odd/tmux' } });
      expect(outcome.class).toBe('ok');
      expect(outcome.resolvedPath).toBe('/odd/tmux');
      expect(outcome.check?.program).toEqual({ path: '/odd/tmux', source: 'typed' });
      expect(outcome.sheet).not.toBeNull();
      expect(classifyCheckOutput(text, 0, '/odd/tmux')).toBe('ok');
      expect(classifyCheckOutput(text, 0)).toBe('unknown');
    }
  });

  it('an unknown with no marker back keeps the plain copy and is not signed in', () => {
    const { outcome } = finishWith('kex_exchange_identification: read: Connection reset by peer\r\n', 255);
    // A reset before the two programs spoke is the far side declining (the
    // fix round's phrase), and nothing came back, so nothing signed in.
    expect(outcome.class).toBe('refused');
    expect(outcome.signedIn).toBe(false);
    resetMachineTestForTests();
    const odd = finishWith('something nobody has seen before\r\n', 255).outcome;
    expect(odd.class).toBe('unknown');
    expect(odd.signedIn).toBe(false);
    expect(odd.headline).not.toBe(MACHINE_CHECK_UNREAD_HEADLINE);
    resetMachineTestForTests();
    expect(finishWith(ONE_MEASURED).outcome.signedIn).toBe(true);
  });

  it('a check that signed in and did not finish names its login files (D9)', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.(`${C}\r\nuser=greg\r\nos=Darwin\r\n`);
    vi.advanceTimersByTime(60_000);
    const outcome = outcomeOf(run.events);
    expect(outcome.class).toBe('timed-out');
    expect(outcome.detail).toBe(MACHINE_CHECK_SIGNED_IN_TIMED_OUT);
    expect(MACHINE_CHECK_SIGNED_IN_TIMED_OUT).toBe(
      'It signed in, and its login files did not finish within a minute. Nothing was changed on either machine.'
    );
    expect(run.pty.killed).toBe(true);
  });

  it('a check that never signed in keeps the plain timed-out detail', () => {
    vi.useFakeTimers();
    const run = start();
    vi.advanceTimersByTime(60_000);
    const outcome = outcomeOf(run.events);
    expect(outcome.class).toBe('timed-out');
    expect(outcome.detail).not.toBe(MACHINE_CHECK_SIGNED_IN_TIMED_OUT);
  });

  it('the transcript shows neither marker, and the program’s own lines stay', () => {
    const run = start();
    run.pty.data?.(ONE_MEASURED);
    run.pty.exit?.({ exitCode: 0 });
    const shown = run.events
      .filter((e): e is Extract<MachineTestEvent, { kind: 'output' }> => e.kind === 'output')
      .map((e) => e.text)
      .join('');
    expect(shown).not.toContain('__TORTIE_');
    expect(shown).toContain('user=greg');
    expect(shown).toContain('/usr/local/bin/tmux');
  });
});

// ---------------------------------------------------------------------------
// The questions, over the real ssh bytes (D9 as revised)
// ---------------------------------------------------------------------------

interface Chunk {
  text: string;
}
const capture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'p340-ssh-capture.json'), 'utf8')
) as Record<string, { chunks: Chunk[] }>;
const R = '/private/tmp/p340-capture';
const chunksOf = (key: string): string[] =>
  (capture[key]?.chunks ?? []).map((c) => c.text.replaceAll('$R', R));
/** The bytes ssh printed BEFORE the person answered: the first two chunks. */
const QUESTION = chunksOf('firstSeenAnsweredYes').slice(0, 2);
const FINGERPRINT = 'SHA256:7O9lF4bhmRapXv/UV7IgsA9Y40MpO9jVsP95m757Mug';

describe('the first-seen question, over the captured bytes', () => {
  it('reads the fingerprint and the key type ssh named', () => {
    expect(hostKeyQuestionOf(QUESTION.join(''))).toEqual({
      fingerprint: FINGERPRINT,
      keyType: 'ED25519'
    });
  });

  it('is not a question once something follows it', () => {
    expect(hostKeyQuestionOf(QUESTION.join('') + 'yes\r\n')).toBeNull();
    expect(hostKeyQuestionOf('Are you sure you want to continue connecting (yes/no)? ')).toBeNull();
  });

  it('is raised once, as an ask, and the lone first \\r is no question', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.(QUESTION[0] ?? '');
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS + 50);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    run.pty.data?.(QUESTION[1] ?? '');
    const asks = run.events.filter((e) => e.kind === 'ask');
    expect(asks).toEqual([
      {
        testId: run.testId,
        kind: 'ask',
        ask: { kind: 'host-key', fingerprint: FINGERPRINT, keyType: 'ED25519' }
      }
    ]);
    // The quiet timer does not raise the same question again as a prompt.
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS + 50);
    expect(run.events.filter((e) => e.kind === 'ask')).toHaveLength(1);
    // The same bytes again do not ask a second time.
    run.pty.data?.('\r\n' + (QUESTION[1] ?? ''));
    expect(run.events.filter((e) => e.kind === 'ask')).toHaveLength(1);
    // An ask is never an end.
    expect(run.events.filter((e) => e.kind === 'end')).toEqual([]);
  });

  it('is never raised after the check’s first marker, even in ssh’s own words', () => {
    const run = start();
    run.pty.data?.(`${C}\r\nuser=greg\r\n` + (QUESTION[1] ?? ''));
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
  });

  it('is never raised for a machine already on record, even in ssh’s own words (the fix round)', () => {
    // The verifiers' spoof: on a machine ssh already knows, ssh asks nothing,
    // so the login files' bytes come first, and one that prints ssh's question
    // drew Tortie's own first-seen question over a fingerprint it chose. With
    // the machine on record in Tortie's own file, the same bytes raise no
    // host-key ask; after the quiet window they are quoted as a prompt.
    const dir = mkdtempSync(join(tmpdir(), 'tortie-p340-known-'));
    try {
      const tortie = join(dir, 'known-machines');
      writeFileSync(tortie, '[127.0.0.1]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n');
      vi.useFakeTimers();
      const run = start({ hostKeys: { tortie, user: join(dir, 'absent') } });
      for (const chunk of QUESTION) run.pty.data?.(chunk);
      expect(run.events.filter((e) => e.kind === 'ask' && e.ask.kind === 'host-key')).toEqual([]);
      vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS + 50);
      const asks = run.events.filter((e) => e.kind === 'ask');
      expect(asks).toHaveLength(1);
      const only = asks[0];
      expect(only?.kind === 'ask' && only.ask.kind).toBe('prompt');
      expect(only?.kind === 'ask' && only.ask.kind === 'prompt' ? only.ask.text : '').toContain(
        'Are you sure you want to continue connecting'
      );
      // A machine on record under another port is another machine, and ssh
      // asks about it: the same bytes then raise Tortie's own question.
      resetMachineTestForTests();
      const other = start({
        hostKeys: { tortie, user: join(dir, 'absent') },
        fields: { ...DRAFT, port: 2223 }
      });
      for (const chunk of QUESTION) other.pty.data?.(chunk);
      expect(other.events.filter((e) => e.kind === 'ask' && e.ask.kind === 'host-key')).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is never raised for a machine on record only in ssh’s global record (the ruled round)', () => {
    // The reverify's finding: ssh read the machine from its GLOBAL record
    // (`/etc/ssh/ssh_known_hosts` by default, a scratch file named through
    // ssh's own GlobalKnownHostsFile in the drive), asked nothing, and a login
    // file printed ssh's question with a fingerprint it chose. Neither file the
    // command line names holds the machine; the global one does.
    const dir = mkdtempSync(join(tmpdir(), 'tortie-p340-global-'));
    try {
      const named = { tortie: join(dir, 'absent-t'), user: join(dir, 'absent-u') };
      const global = join(dir, 'ssh_known_hosts');
      writeFileSync(global, '[127.0.0.1]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n');
      vi.useFakeTimers();
      const run = start({ hostKeys: named, globalHostKeys: [global] });
      for (const chunk of QUESTION) run.pty.data?.(chunk);
      expect(run.events.filter((e) => e.kind === 'ask' && e.ask.kind === 'host-key')).toEqual([]);
      vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS + 50);
      const asks = run.events.filter((e) => e.kind === 'ask');
      expect(asks).toHaveLength(1);
      const only = asks[0];
      expect(only?.kind === 'ask' && only.ask.kind).toBe('prompt');
      // The control: the same machine, the same bytes, with no global record
      // read, is a machine ssh would be asking about, and Tortie asks.
      resetMachineTestForTests();
      const bare = start({ hostKeys: named, globalHostKeys: [] });
      for (const chunk of QUESTION) bare.pty.data?.(chunk);
      expect(bare.events.filter((e) => e.kind === 'ask' && e.ask.kind === 'host-key')).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the whole real run: one ask, then the block, then ok', () => {
    const run = start();
    for (const chunk of chunksOf('firstSeenAnsweredYes')) run.pty.data?.(chunk);
    run.pty.exit?.({ exitCode: 0 });
    expect(run.events.filter((e) => e.kind === 'ask')).toHaveLength(1);
    const outcome = outcomeOf(run.events);
    expect(outcome.class).toBe('ok');
    expect(outcome.check?.versionKind).toBe('not-read');
    expect(outcome.resolvedPath).toBe(`${R}/inst/tmux`);
  });
});

describe('any other unfinished line, after 700 ms of quiet', () => {
  it('the quiet window is the spec’s 700 ms, and a line is not a question at 699', () => {
    expect(TEST_PROMPT_QUIET_MS).toBe(700);
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.('Verification code: ');
    vi.advanceTimersByTime(699);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(run.events.filter((e) => e.kind === 'ask')).toHaveLength(1);
  });

  it('raises a prompt with that line', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.("\rEnter passphrase for key '/Users/greg/.ssh/id_ed25519': ");
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS - 1);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    vi.advanceTimersByTime(2);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([
      {
        testId: run.testId,
        kind: 'ask',
        ask: {
          kind: 'prompt',
          text: "Enter passphrase for key '/Users/greg/.ssh/id_ed25519': "
        }
      }
    ]);
  });

  it('waits while bytes keep arriving, and asks nothing for a finished line', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.('Warning: something\r\n');
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS * 3);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    run.pty.data?.('Are you sure you want to continue connecting (yes/no)? ');
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS / 2);
    run.pty.data?.('');
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS / 2 + 10);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS);
    expect(run.events.filter((e) => e.kind === 'ask')).toHaveLength(1);
  });

  it('asks nothing after the check began, and nothing after the end', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.(`${C}\r\nuser=greg\r\nsomething unfinished`);
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS * 2);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    const other = start();
    other.pty.data?.('half a line');
    other.pty.exit?.({ exitCode: 255 });
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS * 2);
    expect(other.events.filter((e) => e.kind === 'ask')).toEqual([]);
  });

  it('a lone \\r, or a line of spaces, is never a question', () => {
    expect(unfinishedLineOf('\r')).toBeNull();
    expect(unfinishedLineOf('line\r\n\r')).toBeNull();
    expect(unfinishedLineOf('   ')).toBeNull();
    expect(unfinishedLineOf('a\r\nPassphrase: ')).toBe('Passphrase: ');
  });

  it('the password question keeps today’s stop and raises no ask', () => {
    vi.useFakeTimers();
    const run = start();
    run.pty.data?.("greg@127.0.0.1's password: ");
    vi.advanceTimersByTime(TEST_PROMPT_QUIET_MS * 2);
    expect(run.events.filter((e) => e.kind === 'ask')).toEqual([]);
    expect(outcomeOf(run.events).class).toBe('password-required');
    expect(run.pty.killed).toBe(true);
  });
});
