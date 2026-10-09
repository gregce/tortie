/**
 * Phase 342 (build/p342/SPEC.md D4b, D12, D13, D14): the far names and the two
 * read quirks of the tmux an ordinary Linux machine ships, driven.
 *
 * What is pinned, and what each test breaks on:
 *
 *  - `farTmuxName` (D12): a far tmux name holds no `$`, it becomes `_`, never
 *    `-`, and a name with no `$` is composed exactly as it was before. The
 *    create and the rename send it; the restore maps the record's far name the
 *    same way; the display name keeps every character.
 *  - `undoDollarEscape` (D13): over the list lines tmux 3.4 REALLY printed for
 *    the eighteen values of SPEC §14 M9 (and 3.2a's and 3.3a's beside them),
 *    through the shipping `parseRemoteListLine`, and in the feed's pass behind
 *    the 3.4 row's `dollarOnRead` quirk alone.
 *  - `stripJoinedPadding` (D14): over the joined capture tmux 3.2a REALLY
 *    printed, and at exactly the capsule's two captures and the joined history
 *    copy, behind the 3.2a row's `joinedCapturePads` quirk alone.
 *  - the pair (D4b): a create and a restore on a machine whose tmux was
 *    updated under its running server send no `new-session`, and the restore
 *    asks AFTER its `ensureRemoteServer`, whose re-read of a server it just
 *    started clears a verdict recorded against the server that is gone.
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * records the argv it was handed and answers with text a machine printed, the
 * way `./remote-sessions.test.ts` does it and for its reason.
 *
 * WHERE THE MEASURED BYTES COME FROM. Builder "far" of Phase 342, 2026-10-07,
 * in three throwaway containers in his Docker made from images already in the
 * before list (`ubuntu:22.04` with tmux 3.2a, `debian:bookworm-slim` with 3.3a,
 * `ubuntu:24.04` with 3.4, each the distribution's own package), as the account
 * `tortie`, `LANG=C`: the shipping `REMOTE_LIST_FORMAT` read from the tree, a
 * session in `~/cost $d/sub`, each value set as `@gmux-name` and
 * `@gmux-project`, the answer of `list-sessions -F` kept byte for byte. The
 * lines below are those bytes. `$é` came back `$_` on every version, which is
 * the far locale class SPEC §11 item 1 a hands to its own entry, not this
 * reader's: it is kept here as measured.
 */

import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GmuxError, gmuxError } from '../../errors';
import { dedupeSessionName, sanitizeSessionName } from '../../tmux/names';
import type { RemoteMachineContext } from '../context';
import type { RemoteScrollAddress } from '../remote-sessions';

const MACHINE = 'p342-far';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: MACHINE,
  sshBin: '/usr/bin/ssh',
  host: 'p342-far.example.invalid',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p342-unit',
  controlPath: '/tmp/tortie-501/m-p342far',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Everything the replaced edges read and write, in one place. */
const world = vi.hoisted(() => ({
  /** Every argv the exec plane was handed, in order. */
  sent: [] as string[][],
  /** What a verb answers. A function sees the argv. */
  answers: {} as Record<string, string | Error | ((args: readonly string[]) => string)>,
  /** The uuid the last create put on its own new-session line. */
  createdUuid: '',
  /** Machines whose live connection the capsule's pass may read over. */
  controlLive: new Set<string>(),
  /** Live scroll addresses the history read is handed, by session id. */
  addresses: new Map<string, unknown>(),
  /** Every capsule text kept, in order. */
  stored: [] as { sessionId: string; text: string }[],
  /** The manifest rows the record module answers with. */
  rows: new Map<string, Record<string, unknown>>(),
  /** Every patch `updateSession` was handed, in order. */
  updates: [] as { id: string; patch: Record<string, unknown> }[],
  /** Whether the restore gate offers every restore (the restore tests). */
  offered: false,
  /**
   * PHASE 342'S SECOND FIX ROUND. True when the machine's search list was
   * never captured, as after a set-up the boot line stopped.
   */
  notReady: false
}));

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: world.notReady ? null : '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../exec-plane')>()),
  execOn: (_ctx: unknown, args: readonly string[]) => {
    world.sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      world.createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    const answer = world.answers[args[0] ?? ''];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') {
      try {
        return Promise.resolve(answer(args));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.resolve(answer ?? '');
  },
  // `ensureRemoteServer` captures the machine's PATH through the login-shell
  // door. The marker pair is `../carriage.ts`'s.
  execRemoteShell: () => Promise.resolve('__TORTIE_PATH__/usr/bin:/bin__TORTIE_PATH__')
}));

/** The control client, replaced so nothing spawns. */
class FakeControlClient extends EventEmitter {
  connected = false;
  constructor(readonly transport: { machineId: string }) {
    super();
  }
  start(): Promise<void> {
    return Promise.resolve();
  }
  stop(): void {
    this.connected = false;
  }
}

vi.mock('../../tmux/control-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/control-client')>()),
  TmuxControlClient: FakeControlClient
}));

// The capsule's pass reads over a live connection only. Nothing here opens
// one, so a test says when the machine's connection counts as live.
vi.mock('../control-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../control-plane')>()),
  isControlPlaneLive: (machineId: string) => world.controlLive.has(machineId)
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => false,
  noteRemoteRowSeen: () => undefined,
  writeRemoteRow: (input: Record<string, unknown>) => {
    world.rows.set(String(input['sessionId']), {
      ...input,
      id: input['sessionId'],
      status: 'running'
    });
    return null;
  },
  remoteRecordOf: (id: string) => world.rows.get(id) ?? null,
  remoteRecordsForMachine: (machineId: string) =>
    [...world.rows.values()].filter((one) => one['machineId'] === machineId),
  unconfirmedRemoteRecords: () => [],
  markRemoteCreateUnconfirmed: () => undefined,
  remoteManifest: () => ({
    deleteSession: (id: string) => world.rows.delete(id),
    renameSession: () => undefined,
    updateSession: (id: string, patch: Record<string, unknown>) => {
      world.updates.push({ id, patch });
    }
  })
}));

vi.mock('../../restore/snapshots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../restore/snapshots')>()),
  readCapsules: () => [],
  savedSnapshotLines: () => 10_000,
  savedOutputAt: () => null,
  storeCapsuleText: (input: { sessionId: string; text: string }) => {
    world.stored.push({ sessionId: input.sessionId, text: input.text });
    return Promise.resolve(true);
  }
}));

// Three importers' doors, and only theirs: the history read's live address,
// and the restore's gate and its feed start. Everything else is the module.
vi.mock('../remote-sessions', async (importOriginal) => {
  const original = await importOriginal<typeof import('../remote-sessions')>();
  return {
    ...original,
    remoteScrollAddress: (id: string): RemoteScrollAddress =>
      (world.addresses.get(id) as RemoteScrollAddress | undefined) ??
      original.remoteScrollAddress(id),
    remoteRestoreVerdictFor: (id: string, machineId?: string) =>
      world.offered
        ? { offered: true, reason: null, refusal: null }
        : original.remoteRestoreVerdictFor(id, machineId),
    startMachineFeed: () => Promise.resolve()
  };
});

const {
  farTmuxName,
  parseRemoteListLine,
  pollRemoteMachine,
  remoteCreate,
  remoteRename,
  remoteSessions,
  resetRemoteSessionsForTests,
  undoDollarEscape
} = await import('../remote-sessions');
const { resetControlPlanesForTests } = await import('../control-plane');
const { resetRescueForTests } = await import('../pane-env-rescue');
const {
  captureMachineOnce,
  captureRemoteSessionNow,
  resetRemoteCapsulesForTests,
  stripJoinedPadding
} = await import('../remote-capsule');
const { readRemoteHistoryRange } = await import('../remote-pane-history');
const { restoreRemoteSession } = await import('../remote-restore');
const {
  noteFarDisagreement,
  noteFarPair,
  noteFarServerVersion,
  noteFarSettingsRefused,
  resetFarTmuxForTests
} = await import('../far-tmux');
const { MACHINE_TMUX_UPDATED_HEADLINE } = await import('../errors');
const { MACHINE_NOT_READY } = await import('../remote-copy');

const HERE = dirname(fileURLToPath(import.meta.url));

/** tmux's own `#{q:...}` quoting, as `./remote-sessions.test.ts` measured it on 3.6a. */
function quoteField(value: string): string {
  return value.replace(/([ \\"'$;])/g, '\\$1');
}

/** One list line in the shipped format. */
function line(row: {
  tmuxId: string;
  gmuxId?: string;
  tmuxName?: string;
  project?: string;
  cwd?: string;
  name?: string;
}): string {
  return [
    row.tmuxId,
    '1700000000',
    '1700000100',
    '0',
    row.gmuxId ?? '',
    'shell',
    row.tmuxName ?? 'work',
    row.project ?? '/srv/repo',
    row.cwd ?? '/srv/repo',
    row.name ?? 'work'
  ]
    .map(quoteField)
    .join(' ');
}

beforeEach(() => {
  world.sent = [];
  world.answers = {};
  world.createdUuid = '';
  world.controlLive = new Set();
  world.addresses = new Map();
  world.stored = [];
  world.rows = new Map();
  world.updates = [];
  world.offered = false;
  world.notReady = false;
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCapsulesForTests();
  resetFarTmuxForTests();
});

afterEach(() => {
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCapsulesForTests();
  resetFarTmuxForTests();
});

/** The refusal a call produced, or null when it did not refuse. */
async function refusalOf(work: () => Promise<unknown>): Promise<GmuxError['payload'] | null> {
  try {
    await work();
    return null;
  } catch (err) {
    return err instanceof GmuxError ? err.payload : null;
  }
}

// ---------------------------------------------------------------------------
// D12. The far name
// ---------------------------------------------------------------------------

describe('farTmuxName, the far tmux name (D12)', () => {
  const NONE = new Set<string>();

  it('turns every $ into _, and keeps everything else of the sanitized name', () => {
    expect(farTmuxName('cost $HOME', NONE)).toBe('cost _HOME');
    expect(farTmuxName('$HOME notes', NONE)).toBe('_HOME notes');
    expect(farTmuxName('$', NONE)).toBe('_');
    expect(farTmuxName('$$', NONE)).toBe('__');
    expect(farTmuxName('a$b$c', NONE)).toBe('a_b_c');
    expect(farTmuxName('pay $5', NONE)).toBe('pay _5');
    expect(farTmuxName('x ${y}', NONE)).toBe('x _{y}');
    // The sanitizer still runs first, so `.`, `:` and `/` are still `-`.
    expect(farTmuxName('$a.b:c/d', NONE)).toBe('_a-b-c-d');
  });

  it('never begins with -, which rename-session reads as flags on every version', () => {
    // MEASURED (SPEC §Attack M-A4, and again by this builder on 3.2a, 3.3a and
    // 3.4): `rename-session -t $N -HOME notes` fails with "unknown flag -H"
    // ("unknown option -- H" on 3.2a), and `_HOME notes` renames and matches.
    for (const display of ['$HOME notes', '$HOME', '$-', '$ x', '$$HOME', '${HOME}', '$_a']) {
      const name = farTmuxName(display, NONE);
      expect(name.startsWith('-'), display).toBe(false);
      expect(name.includes('$'), display).toBe(false);
    }
  });

  it('composes a name with no $ exactly as the create always did, byte for byte', () => {
    const taken = new Set(['work', 'work-2', 'a-b']);
    for (const display of [
      'work',
      'café ünïcode',
      'a.b',
      '  spaced   out  ',
      'tab\there',
      '#{host}',
      'a\\b',
      '-lead',
      'x'.repeat(300),
      ''
    ]) {
      expect(farTmuxName(display, taken), display).toBe(
        dedupeSessionName(sanitizeSessionName(display), taken)
      );
    }
  });

  it('dedupes after the mapping, against the names the machine already holds', () => {
    expect(farTmuxName('cost $HOME', new Set(['cost _HOME']))).toBe('cost _HOME-2');
    // A far name that still holds a `$` is not the same name, and is not taken.
    expect(farTmuxName('cost $HOME', new Set(['cost $HOME']))).toBe('cost _HOME');
  });
});

// ---------------------------------------------------------------------------
// D13. 3.4's dollar on read, over the bytes tmux printed
// ---------------------------------------------------------------------------

/**
 * `[value, 3.2a's line, 3.3a's line, 3.4's line]`, as `list-sessions -F
 * REMOTE_LIST_FORMAT` printed them (see the header). The session is `$0` named
 * `plain`, in `/home/tortie/cost $d/sub`, with no `@gmux-id` and no agent, and
 * the value stands as both `@gmux-project` (field 8) and `@gmux-name` (10).
 */
const MEASURED_LISTS: readonly (readonly [string, string, string, string])[] = [
  ['a $HOME b', '\\$0 1791415413 1791415413 0   plain a\\ \\$HOME\\ b /home/tortie/cost\\ \\$d/sub a\\ \\$HOME\\ b', '\\$0 1791415418 1791415418 0   plain a\\ \\$HOME\\ b /home/tortie/cost\\ \\$d/sub a\\ \\$HOME\\ b', '\\$0 1791415425 1791415425 0   plain a\\ \\\\$HOME\\ b /home/tortie/cost\\ \\\\$d/sub a\\ \\\\$HOME\\ b'],
  ['cost $5', '\\$0 1791415413 1791415413 0   plain cost\\ \\$5 /home/tortie/cost\\ \\$d/sub cost\\ \\$5', '\\$0 1791415418 1791415418 0   plain cost\\ \\$5 /home/tortie/cost\\ \\$d/sub cost\\ \\$5', '\\$0 1791415425 1791415425 0   plain cost\\ \\$5 /home/tortie/cost\\ \\\\$d/sub cost\\ \\$5'],
  ['$', '\\$0 1791415413 1791415413 0   plain \\$ /home/tortie/cost\\ \\$d/sub \\$', '\\$0 1791415418 1791415418 0   plain \\$ /home/tortie/cost\\ \\$d/sub \\$', '\\$0 1791415425 1791415425 0   plain \\$ /home/tortie/cost\\ \\\\$d/sub \\$'],
  ['\\$x', '\\$0 1791415413 1791415413 0   plain \\\\\\$x /home/tortie/cost\\ \\$d/sub \\\\\\$x', '\\$0 1791415418 1791415418 0   plain \\\\\\$x /home/tortie/cost\\ \\$d/sub \\\\\\$x', '\\$0 1791415425 1791415425 0   plain \\\\\\\\$x /home/tortie/cost\\ \\\\$d/sub \\\\\\\\$x'],
  ['a\\b', '\\$0 1791415413 1791415413 0   plain a\\\\b /home/tortie/cost\\ \\$d/sub a\\\\b', '\\$0 1791415418 1791415418 0   plain a\\\\b /home/tortie/cost\\ \\$d/sub a\\\\b', '\\$0 1791415425 1791415425 0   plain a\\\\b /home/tortie/cost\\ \\\\$d/sub a\\\\b'],
  ['${x}', '\\$0 1791415413 1791415413 0   plain \\${x} /home/tortie/cost\\ \\$d/sub \\${x}', '\\$0 1791415418 1791415418 0   plain \\${x} /home/tortie/cost\\ \\$d/sub \\${x}', '\\$0 1791415425 1791415425 0   plain \\\\${x} /home/tortie/cost\\ \\\\$d/sub \\\\${x}'],
  ['$_a', '\\$0 1791415413 1791415413 0   plain \\$_a /home/tortie/cost\\ \\$d/sub \\$_a', '\\$0 1791415418 1791415418 0   plain \\$_a /home/tortie/cost\\ \\$d/sub \\$_a', '\\$0 1791415425 1791415425 0   plain \\\\$_a /home/tortie/cost\\ \\\\$d/sub \\\\$_a'],
  ['$1', '\\$0 1791415413 1791415413 0   plain \\$1 /home/tortie/cost\\ \\$d/sub \\$1', '\\$0 1791415418 1791415418 0   plain \\$1 /home/tortie/cost\\ \\$d/sub \\$1', '\\$0 1791415425 1791415425 0   plain \\$1 /home/tortie/cost\\ \\\\$d/sub \\$1'],
  ['$-', '\\$0 1791415413 1791415413 0   plain \\$- /home/tortie/cost\\ \\$d/sub \\$-', '\\$0 1791415418 1791415418 0   plain \\$- /home/tortie/cost\\ \\$d/sub \\$-', '\\$0 1791415425 1791415425 0   plain \\$- /home/tortie/cost\\ \\\\$d/sub \\$-'],
  ['$ab$cd', '\\$0 1791415413 1791415413 0   plain \\$ab\\$cd /home/tortie/cost\\ \\$d/sub \\$ab\\$cd', '\\$0 1791415418 1791415418 0   plain \\$ab\\$cd /home/tortie/cost\\ \\$d/sub \\$ab\\$cd', '\\$0 1791415425 1791415425 0   plain \\\\$ab\\\\$cd /home/tortie/cost\\ \\\\$d/sub \\\\$ab\\\\$cd'],
  ['\\\\$x', '\\$0 1791415413 1791415413 0   plain \\\\\\\\\\$x /home/tortie/cost\\ \\$d/sub \\\\\\\\\\$x', '\\$0 1791415418 1791415418 0   plain \\\\\\\\\\$x /home/tortie/cost\\ \\$d/sub \\\\\\\\\\$x', '\\$0 1791415425 1791415425 0   plain \\\\\\\\\\\\$x /home/tortie/cost\\ \\\\$d/sub \\\\\\\\\\\\$x'],
  ['x$', '\\$0 1791415413 1791415413 0   plain x\\$ /home/tortie/cost\\ \\$d/sub x\\$', '\\$0 1791415418 1791415418 0   plain x\\$ /home/tortie/cost\\ \\$d/sub x\\$', '\\$0 1791415425 1791415425 0   plain x\\$ /home/tortie/cost\\ \\\\$d/sub x\\$'],
  ['$$', '\\$0 1791415413 1791415413 0   plain \\$\\$ /home/tortie/cost\\ \\$d/sub \\$\\$', '\\$0 1791415418 1791415418 0   plain \\$\\$ /home/tortie/cost\\ \\$d/sub \\$\\$', '\\$0 1791415425 1791415425 0   plain \\$\\$ /home/tortie/cost\\ \\\\$d/sub \\$\\$'],
  ['$a b$c', '\\$0 1791415413 1791415413 0   plain \\$a\\ b\\$c /home/tortie/cost\\ \\$d/sub \\$a\\ b\\$c', '\\$0 1791415418 1791415418 0   plain \\$a\\ b\\$c /home/tortie/cost\\ \\$d/sub \\$a\\ b\\$c', '\\$0 1791415425 1791415425 0   plain \\\\$a\\ b\\\\$c /home/tortie/cost\\ \\\\$d/sub \\\\$a\\ b\\\\$c'],
  ['$\u00e9', '\\$0 1791415413 1791415413 0   plain \\$_ /home/tortie/cost\\ \\$d/sub \\$_', '\\$0 1791415418 1791415418 0   plain \\$_ /home/tortie/cost\\ \\$d/sub \\$_', '\\$0 1791415425 1791415425 0   plain \\$_ /home/tortie/cost\\ \\\\$d/sub \\$_'],
  ['$#', '\\$0 1791415413 1791415413 0   plain \\$\\# /home/tortie/cost\\ \\$d/sub \\$\\#', '\\$0 1791415418 1791415418 0   plain \\$\\# /home/tortie/cost\\ \\$d/sub \\$\\#', '\\$0 1791415425 1791415425 0   plain \\$\\# /home/tortie/cost\\ \\\\$d/sub \\$\\#'],
  ['$}', '\\$0 1791415413 1791415413 0   plain \\$} /home/tortie/cost\\ \\$d/sub \\$}', '\\$0 1791415418 1791415418 0   plain \\$} /home/tortie/cost\\ \\$d/sub \\$}', '\\$0 1791415425 1791415425 0   plain \\$} /home/tortie/cost\\ \\\\$d/sub \\$}'],
  ['a$Bc', '\\$0 1791415413 1791415413 0   plain a\\$Bc /home/tortie/cost\\ \\$d/sub a\\$Bc', '\\$0 1791415418 1791415418 0   plain a\\$Bc /home/tortie/cost\\ \\$d/sub a\\$Bc', '\\$0 1791415425 1791415425 0   plain a\\\\$Bc /home/tortie/cost\\ \\\\$d/sub a\\\\$Bc']
];

/** The folder every measured session was made in. */
const MEASURED_CWD = '/home/tortie/cost $d/sub';

/** What a value reads back as when the far locale is not UTF-8 (SPEC §11 item 1 a). */
const asLocaleReads = (value: string): string => value.replace(/[^\x20-\x7e]/g, '_');

describe('undoDollarEscape over the list lines tmux printed (D13)', () => {
  it('holds every value of SPEC §14 M9, eighteen of them', () => {
    expect(MEASURED_LISTS).toHaveLength(18);
    expect(new Set(MEASURED_LISTS.map(([value]) => value)).size).toBe(18);
  });

  it('3.4 printed a backslash before $ and a letter, _ or {, and nowhere else', () => {
    // The 3.3a line and the 3.4 line differ exactly where the value holds
    // `$[A-Za-z_{]`, and on 3.2a and 3.3a they are the same bytes.
    for (const [value, l32, l33, l34] of MEASURED_LISTS) {
      expect(l32.split(' ').slice(3), value).toEqual(l33.split(' ').slice(3));
      const affected = /\$[A-Za-z_{]/.test(value);
      const name33 = parseRemoteListLine(l33)?.name;
      const name34 = parseRemoteListLine(l34)?.name;
      expect(name33 === name34, value).toBe(!affected);
    }
  });

  it('gives every value back through the shipping reader on 3.4', () => {
    for (const [value, , , l34] of MEASURED_LISTS) {
      const row = parseRemoteListLine(l34);
      expect(row, value).not.toBeNull();
      const want = asLocaleReads(value);
      expect(undoDollarEscape(row?.name ?? ''), value).toBe(want);
      expect(undoDollarEscape(row?.projectPath ?? ''), value).toBe(want);
      expect(undoDollarEscape(row?.cwd ?? ''), value).toBe(MEASURED_CWD);
      // Without the undo the backslash shows, in the name, the tab it groups
      // under and the folder: the defect this reader is for.
      if (/\$[A-Za-z_{]/.test(value)) expect(row?.name, value).not.toBe(want);
      expect(row?.cwd).toBe('/home/tortie/cost \\$d/sub');
    }
  });

  it('is not needed on 3.2a or 3.3a, and would be wrong there', () => {
    for (const [value, l32, l33] of MEASURED_LISTS) {
      for (const one of [l32, l33]) {
        const row = parseRemoteListLine(one);
        expect(row?.name, value).toBe(asLocaleReads(value));
        expect(row?.cwd, value).toBe(MEASURED_CWD);
      }
    }
    // `\$x` is a backslash a person typed. Read through the undo on a version
    // that printed it as typed, it would lose that backslash, which is why the
    // undo stands behind the 3.4 row's quirk and nothing else.
    const typed = parseRemoteListLine(MEASURED_LISTS[3]?.[2] ?? '');
    expect(typed?.name).toBe('\\$x');
    expect(undoDollarEscape(typed?.name ?? '')).not.toBe('\\$x');
  });

  it('removes exactly one backslash, and only before $ and a letter, _ or {', () => {
    expect(undoDollarEscape('a \\$HOME b')).toBe('a $HOME b');
    expect(undoDollarEscape('\\\\$x')).toBe('\\$x');
    expect(undoDollarEscape('\\${x}')).toBe('${x}');
    expect(undoDollarEscape('\\$_a')).toBe('$_a');
    expect(undoDollarEscape('\\$ab\\$cd')).toBe('$ab$cd');
    for (const kept of ['cost \\$5', '\\$', '\\$1', '\\$-', '\\$$', '\\$#', '\\$}', 'x\\$', 'a\\b', 'plain']) {
      expect(undoDollarEscape(kept), kept).toBe(kept);
    }
  });
});

describe('the feed reads 3.4 through the undo, and no other version (D13)', () => {
  /** The real 3.4 line for `a $HOME b`, carrying an id so the pass shows it. */
  const ours = (measured: string): string => measured.replace('0   plain ', '0 ours-1 shell plain ');

  it('shows the name, the tab and the folder a person gave on 3.4', async () => {
    noteFarServerVersion(MACHINE, '3.4');
    world.answers['list-sessions'] = ours(MEASURED_LISTS[0]?.[3] ?? '');
    await pollRemoteMachine(MACHINE);
    const [row] = remoteSessions();
    expect(row?.id).toBe('ours-1');
    expect(row?.name).toBe('a $HOME b');
    expect(row?.projectPath).toBe('a $HOME b');
    expect(row?.cwd).toBe(MEASURED_CWD);
    // The far tmux name is the machine's own, never rewritten.
    expect(row?.tmuxName).toBe('plain');
  });

  it('reads the same bytes as printed on a machine whose server is any other version', async () => {
    for (const version of ['3.3a', '3.5a', '3.6', null] as const) {
      resetRemoteSessionsForTests();
      resetFarTmuxForTests();
      if (version !== null) noteFarServerVersion(MACHINE, version);
      world.answers['list-sessions'] = ours(MEASURED_LISTS[0]?.[3] ?? '');
      await pollRemoteMachine(MACHINE);
      const [row] = remoteSessions();
      expect(row?.name, String(version)).toBe('a \\$HOME b');
      expect(row?.cwd, String(version)).toBe('/home/tortie/cost \\$d/sub');
    }
  });

  it('reads 3.3a as printed, which is already the value', async () => {
    noteFarServerVersion(MACHINE, '3.3a');
    world.answers['list-sessions'] = ours(MEASURED_LISTS[3]?.[2] ?? '');
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions()[0]?.name).toBe('\\$x');
  });
});

// ---------------------------------------------------------------------------
// D12 and D4b, driven through the create and the rename
// ---------------------------------------------------------------------------

describe('the create and the rename send no $ in the far name (D12)', () => {
  async function createOne(name: string): Promise<string> {
    world.answers['new-session'] = '$4\n';
    world.answers['list-sessions'] = (args) =>
      args.includes('#{session_id}') || world.createdUuid === ''
        ? ''
        : line({ tmuxId: '$4', gmuxId: world.createdUuid, tmuxName: farTmuxName(name, new Set()), name });
    const session = await remoteCreate({
      machineId: MACHINE,
      name,
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
    return session.id;
  }

  it('creates `cost $HOME` as `cost _HOME`, and stamps the name a person typed', async () => {
    await createOne('cost $HOME');
    const create = world.sent.find((argv) => argv[0] === 'new-session') ?? [];
    expect(create[create.indexOf('-s') + 1]).toBe('cost _HOME');
    expect(create.join(' ')).not.toContain('$HOME');
    const stamp = world.sent.find((argv) => argv[0] === 'set-option' && argv[3] === '@gmux-name');
    expect(stamp?.[4]).toBe('cost $HOME');
    expect(remoteSessions()[0]?.name).toBe('cost $HOME');
  });

  it('creates a name with no $ exactly as before', async () => {
    await createOne('api work');
    const create = world.sent.find((argv) => argv[0] === 'new-session') ?? [];
    expect(create[create.indexOf('-s') + 1]).toBe('api work');
  });

  it('renames to `$HOME notes` as `_HOME notes`, never as a name beginning with -', async () => {
    world.answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1', tmuxName: 'work' });
    await pollRemoteMachine(MACHINE);
    world.sent = [];
    await remoteRename('ours-1', '$HOME notes');
    expect(world.sent.find((argv) => argv[0] === 'rename-session')).toEqual([
      'rename-session',
      '-t',
      '$1',
      '_HOME notes'
    ]);
    const stamp = world.sent.find((argv) => argv[0] === 'set-option' && argv[3] === '@gmux-name');
    expect(stamp?.[4]).toBe('$HOME notes');
  });
});

describe('a machine whose tmux was updated under its running server gets no new session (D4b)', () => {
  async function tryCreate(): Promise<GmuxError['payload'] | null> {
    world.answers['new-session'] = '$4\n';
    world.answers['list-sessions'] = (args) =>
      args.includes('#{session_id}') || world.createdUuid === ''
        ? ''
        : line({ tmuxId: '$4', gmuxId: world.createdUuid });
    return refusalOf(() =>
      remoteCreate({
        machineId: MACHINE,
        name: 'work',
        projectPath: '/srv/repo',
        cwd: '/srv/repo',
        agent: 'shell'
      })
    );
  }

  it('refuses with the pair sentence and sends no new-session', async () => {
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarPair(MACHINE, '3.5a', '3.6b');
    const refusal = await tryCreate();
    expect(refusal?.code).toBe('INVALID_INPUT');
    expect(refusal?.message).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    expect(world.sent.some((argv) => argv[0] === 'new-session')).toBe(false);
    // Nothing was written for a session that was never started.
    expect(world.rows.size).toBe(0);
  });

  it('creates across a pair that was measured working (3.5a under a 3.3a server)', async () => {
    noteFarServerVersion(MACHINE, '3.3a');
    noteFarPair(MACHINE, '3.3a', '3.5a');
    expect(await tryCreate()).toBeNull();
    expect(world.sent.some((argv) => argv[0] === 'new-session')).toBe(true);
  });

  it('creates once the server the verdict was read against is gone', async () => {
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarPair(MACHINE, '3.5a', '3.6b');
    // The machine restarted, and a read noted the new server.
    noteFarServerVersion(MACHINE, '3.6b');
    expect(await tryCreate()).toBeNull();
  });
});

/**
 * PHASE 342'S SECOND FIX ROUND. A tmux that refuses `exit-empty` on the boot
 * line stops the set-up BEFORE the PATH capture, so the machine's search list
 * is never captured and the create's context is refused as not signed in. The
 * verifier measured the create answering "Tortie has not signed in to that
 * machine yet … prepare it", which is untrue and sends the person back to a
 * Prepare that repeats the refusal. The create and the restore start through
 * `readyContextToStart`, which answers the recorded sentence (1) instead.
 */
describe('a machine whose set-up the boot line stopped before it signed in (the second fix round)', () => {
  const SENTENCE =
    'tmux 3.5a would not keep running with no session open, so Tortie will not start sessions there.';

  function createWork(): Promise<unknown> {
    return remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
  }

  it('a create answers sentence (1), never "has not signed in", and sends nothing', async () => {
    world.notReady = true;
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarSettingsRefused(MACHINE, { server: '3.5a', name: 'exit-empty', sentence: SENTENCE });
    const refusal = await refusalOf(createWork);
    expect(refusal?.code).toBe('INVALID_INPUT');
    expect(refusal?.message).toBe(SENTENCE);
    expect(world.sent).toEqual([]);
    expect(world.rows.size).toBe(0);
  });

  it('a machine that is simply not signed in still reads the sentence it always did', async () => {
    world.notReady = true;
    const refusal = await refusalOf(createWork);
    expect(refusal?.message).toBe(MACHINE_NOT_READY);
    expect(world.sent).toEqual([]);
  });

  it('a create after a server Tortie started ran as another version than its program said answers sentence (4)', async () => {
    world.notReady = true;
    noteFarServerVersion(MACHINE, '3.2a');
    noteFarDisagreement(MACHINE, '3.7c', '3.2a');
    const refusal = await refusalOf(createWork);
    expect(refusal?.code).toBe('INVALID_INPUT');
    expect(refusal?.message).toBe("This machine's tmux is not the version it says.");
    expect(world.sent).toEqual([]);
  });

  it('a refusal recorded against a server that has since restarted at another version is not said', async () => {
    world.notReady = true;
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarSettingsRefused(MACHINE, { server: '3.5a', name: 'exit-empty', sentence: SENTENCE });
    noteFarServerVersion(MACHINE, '3.6b');
    expect((await refusalOf(createWork))?.message).toBe(MACHINE_NOT_READY);
  });

  it('a restore answers sentence (1) too, and creates nothing', async () => {
    world.notReady = true;
    world.offered = true;
    world.rows.set('sess-boot', {
      id: 'sess-boot',
      machineId: MACHINE,
      name: 'work',
      tmuxName: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'restorable',
      createdAt: 1_700_000_000_000,
      argv: [],
      lastSeen: 1_700_000_000_000
    });
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarSettingsRefused(MACHINE, { server: '3.5a', name: 'exit-empty', sentence: SENTENCE });
    const refusal = await refusalOf(() => restoreRemoteSession('sess-boot'));
    expect(refusal?.message).toBe(SENTENCE);
    expect(world.sent.some((argv) => argv[0] === 'new-session')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D14. 3.2a's joined capture, over the bytes tmux printed
// ---------------------------------------------------------------------------

/**
 * `capture-pane -p -e -J -S -50` of an 80-column pane that ran a script
 * printing a red word, a green-background phrase with its own two trailing
 * spaces, `plain` with its own three, 100 x's (which wrap and are joined) and
 * `end`, as tmux 3.2a and 3.3a printed it (see the header for where). Every
 * 3.2a line is padded with spaces after its last escape; 3.3a keeps only a
 * line's own.
 */
const CAPJ_32A = [
  '$ sh /tmp/printer.sh',
  '\x1b[31mred\x1b[39m                 ',
  '\x1b[42mgreen bg  \x1b[49m          ',
  'plain               ',
  `${'x'.repeat(100)}                    `,
  'end                 ',
  '$                   ',
  ''
].join('\n');
const CAPJ_33A = [
  '$ sh /tmp/printer.sh',
  '\x1b[31mred',
  '\x1b[39m\x1b[42mgreen bg  ',
  '\x1b[49mplain   ',
  'x'.repeat(100),
  'end',
  '$ ',
  ''
].join('\n');

/** What a person sees of a line: its escapes taken out. */
const seen = (text: string): string[] => text.split('\n').map((l) => l.replace(/\x1b\[[0-9;]*m/g, ''));

describe('stripJoinedPadding over the capture tmux printed (D14)', () => {
  it('takes 3.2a padding off every line after its last escape, and nothing else', () => {
    expect(stripJoinedPadding(CAPJ_32A)).toBe(
      [
        '$ sh /tmp/printer.sh',
        '\x1b[31mred\x1b[39m',
        '\x1b[42mgreen bg  \x1b[49m',
        'plain',
        'x'.repeat(100),
        'end',
        '$',
        ''
      ].join('\n')
    );
  });

  it('then reads as 3.3a reads, but for a line\'s own trailing spaces, and is never wider', () => {
    // 3.2a keeps a line's own trailing spaces only where an escape follows
    // them (`green bg  ` then its reset); 3.3a keeps them all. Past that, the
    // two read the same, and no stripped line is wider than 3.3a's.
    const a = seen(stripJoinedPadding(CAPJ_32A));
    const b = seen(CAPJ_33A);
    expect(a).toHaveLength(b.length);
    for (let i = 0; i < a.length; i += 1) {
      const mine = a[i] ?? '';
      const theirs = b[i] ?? '';
      expect(mine.replace(/ +$/, ''), String(i)).toBe(theirs.replace(/ +$/, ''));
      expect(mine.length, String(i)).toBeLessThanOrEqual(theirs.length);
    }
    expect(seen(CAPJ_32A).some((l, i) => l.length > (b[i] ?? '').length)).toBe(true);
    // What came off is exactly the padding: 98 spaces over these seven lines,
    // where 3.3a's same lines carry 6 of their own.
    const trailing = (text: string): number =>
      text.split('\n').reduce((n, l) => n + l.length - l.replace(/ +$/, '').length, 0);
    expect(trailing(CAPJ_32A)).toBe(98);
    expect(trailing(CAPJ_33A)).toBe(6);
    expect(CAPJ_32A.length - stripJoinedPadding(CAPJ_32A).length).toBe(98);
  });

  it('keeps tabs, carriage returns, inner spaces, escapes, empty lines and the count', () => {
    expect(stripJoinedPadding('a \tb\t  \nc\r  \n\n  \n')).toBe('a \tb\t\nc\r\n\n\n');
    expect(stripJoinedPadding('')).toBe('');
    expect(stripJoinedPadding('\x1b[0m  x  \x1b[0m  ')).toBe('\x1b[0m  x  \x1b[0m');
    const once = stripJoinedPadding(CAPJ_32A);
    expect(stripJoinedPadding(once)).toBe(once);
    expect(once.split('\n')).toHaveLength(CAPJ_32A.split('\n').length);
  });
});

describe('the strip stands at the two captures and the joined history copy, behind the 3.2a quirk (D14)', () => {
  async function listOne(): Promise<void> {
    world.answers['list-sessions'] = line({ tmuxId: '$5', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
  }

  it('keeps the End capture stripped on 3.2a and as printed on 3.3a', async () => {
    for (const [version, want] of [
      ['3.2a', stripJoinedPadding(CAPJ_32A)],
      ['3.3a', CAPJ_32A]
    ] as const) {
      resetRemoteSessionsForTests();
      resetFarTmuxForTests();
      world.stored = [];
      noteFarServerVersion(MACHINE, version);
      await listOne();
      world.answers['capture-pane'] = CAPJ_32A;
      expect(await captureRemoteSessionNow('ours-1')).toBe(true);
      expect(world.stored.map((one) => one.text), version).toEqual([want]);
    }
  });

  it('keeps the pass capture stripped on 3.2a and as printed on 3.3a', async () => {
    for (const [version, want] of [
      ['3.2a', stripJoinedPadding(CAPJ_32A)],
      ['3.3a', CAPJ_32A]
    ] as const) {
      resetRemoteSessionsForTests();
      resetRemoteCapsulesForTests();
      resetFarTmuxForTests();
      world.stored = [];
      noteFarServerVersion(MACHINE, version);
      await listOne();
      world.controlLive.add(MACHINE);
      world.answers['capture-pane'] = CAPJ_32A;
      expect(await captureMachineOnce(MACHINE)).toBe(1);
      expect(world.stored.map((one) => one.text), version).toEqual([want]);
    }
  });

  it('answers a joined history copy stripped on 3.2a, and every other copy as printed', async () => {
    world.addresses.set('ours-1', { kind: 'live', machineId: MACHINE, tmuxId: '$5' });
    world.answers['display-message'] = '100 24\n';
    world.answers['capture-pane'] = CAPJ_32A;
    const range = { start: 0, end: 20 };
    noteFarServerVersion(MACHINE, '3.2a');
    expect((await readRemoteHistoryRange('ours-1', range, true)).ansi).toBe(stripJoinedPadding(CAPJ_32A));
    expect((await readRemoteHistoryRange('ours-1', range, false)).ansi).toBe(CAPJ_32A);
    noteFarServerVersion(MACHINE, '3.3a');
    expect((await readRemoteHistoryRange('ours-1', range, true)).ansi).toBe(CAPJ_32A);
  });

  it('is not asked by the armed resume\'s read, whose counter takes every space out', () => {
    const arm = readFileSync(join(HERE, '..', 'remote-arm.ts'), 'utf8');
    expect(arm).not.toContain('stripJoinedPadding');
    expect(arm).not.toContain('joinedCapturePads');
  });
});

// ---------------------------------------------------------------------------
// The restore: the far name, and the pair asked after its server (D12, D4b)
// ---------------------------------------------------------------------------

describe('the restore of a session on another machine (D12, D4b)', () => {
  const ID = 'sess-342';

  function recordRow(tmuxName: string): void {
    world.rows.set(ID, {
      id: ID,
      machineId: MACHINE,
      name: 'cost $HOME',
      tmuxName,
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'restorable',
      createdAt: 1_700_000_000_000,
      argv: [],
      lastSeen: 1_700_000_000_000
    });
  }

  /** A machine whose server answers: warm, or none until the boot starts one. */
  function machine(server: 'warm' | 'none', bornVersion = '3.6b'): void {
    let booted = server === 'warm';
    world.answers['start-server'] = () => {
      booted = true;
      return '';
    };
    world.answers['list-sessions'] = (args) => {
      if (!booted) {
        throw gmuxError(
          'TMUX_UNREACHABLE',
          'The machine has no session server.',
          'no server running on /tmp/tmux-1000/gmux-p342-unit'
        );
      }
      return args.includes('#{session_id}') ? '' : '';
    };
    world.answers['display-message'] = (args) => (args.includes('#{version}') ? `${bornVersion}\n` : '');
    world.answers['new-session'] = '$9\n';
  }

  it('creates the record\'s `cost $HOME` as `cost _HOME`, and keeps that name', async () => {
    world.offered = true;
    recordRow('cost $HOME');
    machine('warm');
    const outcome = await restoreRemoteSession(ID);
    expect(outcome.tmuxId).toBe('$9');
    const create = world.sent.find((argv) => argv[0] === 'new-session') ?? [];
    expect(create[create.indexOf('-s') + 1]).toBe('cost _HOME');
    expect(world.updates.find((one) => one.id === ID)?.patch['tmuxName']).toBe('cost _HOME');
  });

  it('refuses on a warm server whose pair was refused, after its set-up and before any create', async () => {
    world.offered = true;
    recordRow('work');
    machine('warm');
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarPair(MACHINE, '3.5a', '3.6b');
    const refusal = await refusalOf(() => restoreRemoteSession(ID));
    expect(refusal?.message).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    expect(world.sent.some((argv) => argv[0] === 'new-session')).toBe(false);
    // The server was set up first, as for any measured version (D3).
    expect(world.sent.some((argv) => argv[0] === 'set-environment')).toBe(true);
  });

  // PHASE 342'S FIX ROUND. A restore whose set-up meets a server that would
  // not keep a setting Tortie cannot do without stops before anything is
  // created, with the STRUCTURED error whose message is sentence (1): a plain
  // error reached the person as "Error invoking remote method
  // 'sessions:restore': RemoteTmuxRefused: …".
  it('refuses with sentence (1) as the structured error when its set-up meets a required refusal', async () => {
    world.offered = true;
    recordRow('work');
    machine('warm');
    noteFarServerVersion(MACHINE, '3.7c');
    world.answers['set-option'] = (args) => {
      if (args.includes('remain-on-exit')) {
        throw gmuxError('TMUX_UNREACHABLE', 'set-option failed', 'unknown value: failed');
      }
      return '';
    };
    const refusal = await refusalOf(() => restoreRemoteSession(ID));
    expect(refusal?.code).toBe('INVALID_INPUT');
    expect(refusal?.message).toBe(
      "tmux 3.7c would not keep a session's screen when its program fails, so Tortie will not start sessions there."
    );
    expect(world.sent.some((argv) => argv[0] === 'new-session')).toBe(false);
    // history-limit was written first, and nothing was sent after the refused row.
    const sets = world.sent.filter((argv) => argv[0] === 'set-option');
    expect(sets[0]).toContain('history-limit');
    expect(sets[sets.length - 1]).toContain('remain-on-exit');
  });

  it('restores once a server it started reports another version, which clears the old verdict', async () => {
    // A restore after the machine restarted: the verdict names the 3.5a server
    // that is gone, the restore's own `ensureRemoteServer` starts a server and
    // reads it as 3.6b, and only THEN is the pair asked. Asked before the boot,
    // this would have refused a machine that is fine.
    world.offered = true;
    recordRow('work');
    machine('none', '3.6b');
    noteFarServerVersion(MACHINE, '3.5a');
    noteFarPair(MACHINE, '3.5a', '3.6b');
    const outcome = await restoreRemoteSession(ID);
    expect(outcome.serverWasBorn).toBe(true);
    expect(outcome.tmuxId).toBe('$9');
    const boot = world.sent.findIndex((argv) => argv[0] === 'start-server');
    const read = world.sent.findIndex((argv) => argv[0] === 'display-message' && argv.includes('#{version}'));
    const create = world.sent.findIndex((argv) => argv[0] === 'new-session');
    expect(boot).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(boot);
    expect(create).toBeGreaterThan(read);
  });
});
