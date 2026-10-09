/**
 * Phase 320.1, the second build: the two roads to a far pane, kept apart
 * (build/p3201/SPEC.md §6.2, D3, D6 to D10), driven against the SHIPPING
 * ../scroll-order.ts.
 *
 * The two facts it asks about a session, the address and the machine's
 * carriage, are answered here. The carriage's runner is the shipping
 * `guardedScrollRunner` over the shipping `TmuxControlClient`'s own
 * `sendCommand`, whose child is a recording stdin, which is the exact chain
 * `remoteScrollRunner` in ../control-plane.ts builds. So "written" below means
 * the bytes reached that client's stdin.
 *
 *  - D6's table, row by row: at rest a key takes the attach; parked, may be
 *    parked, or a sequence in flight, it takes the control connection; and
 *    the moment every sequence is answered, the attach again (the fix round,
 *    F1: an answer, not a clock);
 *  - on the control connection the whole typed sequence (cancel, the bytes,
 *    the read) is on the client's stdin BEFORE `routeKey` returns;
 *  - `é😀\r` crosses as `c3 a9 f0 9f 98 80 0d`, and 600 bytes are three `-H`
 *    commands in order;
 *  - a machine with no carriage this run, a row that ended or that no machine
 *    holds, an unreadable connection or a target the table refuses: the
 *    attach, with nothing written; a carriage that is waiting or a row not yet
 *    listed on it, over a pane that is or may be parked: HELD, then written
 *    behind one cancel when both are back, and a sequence the closed
 *    connection left unanswered sent again only when the pane still reads
 *    scrolled back (F4);
 *  - the park's wait, which a key typed during it DROPS (F2); D3's three
 *    outcomes; a raced park cancelled; a pane Tortie parked taken back to its
 *    program (F3);
 *  - a typed sequence that fails is not sent again and leaves the pane
 *    possibly parked, said once per connection with no keystroke in the line;
 *  - answers applied in write order, never handler order;
 *  - `forgetSession` forgets;
 *  - the ruled round (GONE): over a pane that is or may be scrolled back on a
 *    machine that missed its greeting, a key is HELD and asks that machine for
 *    its connection once (joined by every key typed while it is asked), the
 *    held keys go behind one cancel when it greets, and are dropped, said once
 *    with no byte, when it does not; a machine that may not be asked again,
 *    and a pane at rest, keep the attach;
 *  - his ruling of 2026-10-02, "Fall back to today": once that ask has failed
 *    (refused, or its own greeting missed), every key there takes the attach
 *    as today, a `q` included, nothing asks again and the core is told "no
 *    pane"; a connection seen again ends the fall back, and an ask a live
 *    connection answered is never the one a later miss waits on.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteScrollAddress } from '../remote-sessions';
import type { RemoteScrollCarriage } from '../scroll-shapes';
import type { PaneScrollState, TmuxScrollRunner } from '../../tmux/scroll';

let addresses = new Map<string, RemoteScrollAddress>();
let carriages = new Map<string, RemoteScrollCarriage>();
/** The ruled round: machines that missed their greeting, and every ask made of one. */
let missed = new Set<string>();
let reopenAsks: { machineId: string; keystroke: boolean; resolve: (opened: boolean) => void }[] = [];

vi.mock('../remote-sessions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-sessions')>()),
  remoteScrollAddress: (sessionId: string): RemoteScrollAddress =>
    addresses.get(sessionId) ?? { kind: 'unknown' }
}));

vi.mock('../control-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../control-plane')>()),
  remoteScrollRunner: (machineId: string): RemoteScrollCarriage =>
    carriages.get(machineId) ?? { kind: 'waiting' },
  missedGreetingThisRun: (machineId: string): boolean => missed.has(machineId),
  openControlPlane: (machineId: string, ask: { keystroke?: boolean } = {}): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      reopenAsks.push({ machineId, keystroke: ask.keystroke === true, resolve });
    })
}));

const order = await import('../scroll-order');
const { guardedScrollRunner } = await import('../scroll-shapes');
const { TmuxControlClient } = await import('../../tmux/control-client');
const { REMOTE_STATE_FORMAT } = await import('../../tmux/scroll');
const { gmuxError } = await import('../../errors');

const {
  ROAD_QUIET_MS,
  TYPED_BYTES_PER_COMMAND,
  awaitRoadQuiet,
  forgetSession,
  noteAnswer,
  noteSettled,
  noteUnreadableConnection,
  noteWritten,
  readBeforePark,
  resetScrollOrderForTests,
  roadFacts,
  routeKey,
  stampedRunner,
  undoRacedPark
} = order;

const READ = `display-message -p -t $7 -F '${REMOTE_STATE_FORMAT}'`;
const CANCEL = 'send-keys -t $7 -X cancel';

/** A pane's read, in `REMOTE_STATE_FORMAT`'s places. */
function fields(pane: { inMode?: boolean; alt?: boolean; mouse?: boolean; position?: number }): string {
  const inMode = pane.inMode === true;
  return [
    inMode ? '1' : '0',
    inMode ? String(pane.position ?? 0) : '',
    '900',
    '40',
    pane.alt === true ? '1' : '0',
    pane.mouse === true ? '1' : '0',
    '120',
    ''
  ].join(' ');
}

const LIVE = fields({});

/**
 * The shipping control client with a recording child: `stdin` is what reached
 * the far side, and each block is answered by `answer` when `pump` runs.
 */
function recordingClient(answer: (command: string) => { ok: boolean; lines: string[] } = () => ({ ok: true, lines: [LIVE] })): {
  stdin: string[];
  pump: () => void;
  carriage: (generation?: number) => RemoteScrollCarriage;
} {
  const client = new TmuxControlClient({
    machineId: 'far',
    precheck: () => Promise.resolve(),
    plan: () => Promise.resolve({ file: '/bin/false', argv: [] }),
    env: () => ({})
  } as never);
  const stdin: string[] = [];
  let answered = 0;
  const inner = client as unknown as {
    child: { stdin: { write(chunk: string): boolean } } | null;
    greetingConsumed: boolean;
    handleLine(line: string): void;
  };
  inner.child = {
    stdin: {
      write: (chunk: string) => {
        stdin.push(chunk.replace(/\n$/, ''));
        return true;
      }
    }
  };
  inner.greetingConsumed = true;
  const pump = (): void => {
    while (answered < stdin.length) {
      const command = stdin[answered] ?? '';
      answered += 1;
      const reply = answer(command);
      inner.handleLine(`%begin 1 ${String(answered)} 1`);
      for (const line of reply.lines) inner.handleLine(line);
      inner.handleLine(`${reply.ok ? '%end' : '%error'} 1 ${String(answered)} 1`);
    }
  };
  return {
    stdin,
    pump,
    carriage: (generation = 1) => ({
      kind: 'live',
      generation,
      run: guardedScrollRunner({
        send: (line) => client.sendCommand(line),
        isCurrent: () => true,
        server: 'machine:far'
      })
    })
  };
}

/** Let every pending promise chain run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function parkedState(extra: Partial<PaneScrollState> = {}): PaneScrollState {
  return {
    position: 10,
    history: 900,
    rows: 40,
    cols: 120,
    frameHistory: null,
    inMode: true,
    innerAlt: false,
    innerMouse: false,
    ...extra
  };
}

function manualClock(start = 10_000): {
  clock: { now(): number; sleep(ms: number): Promise<void> };
  set(at: number): void;
  sleepers: { ms: number; wake: () => void }[];
} {
  let at = start;
  const sleepers: { ms: number; wake: () => void }[] = [];
  return {
    clock: {
      now: () => at,
      sleep: (ms) =>
        new Promise<void>((resolve) => {
          sleepers.push({ ms, wake: resolve });
        })
    },
    set: (next) => {
      at = next;
    },
    sleepers
  };
}

beforeEach(() => {
  addresses = new Map();
  carriages = new Map();
  missed = new Set();
  reopenAsks = [];
  resetScrollOrderForTests();
  addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('D6, which road a key takes, row by row', () => {
  it('the constants', () => {
    expect(ROAD_QUIET_MS).toBe(200);
    expect(TYPED_BYTES_PER_COMMAND).toBe(256);
  });

  it('at rest: the attach, and nothing is written', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    expect(routeKey('sess', 'a', 1_000)).toBe('attach');
    expect(far.stdin).toEqual([]);
    expect(roadFacts('sess').lastAttachKeyAt).toBe(1_000);
  });

  const rows: [string, () => void][] = [
    ['parked', () => noteAnswer('sess', parkedState())],
    ['may be parked', () => noteAnswer('sess', 'failed')],
    ['a sequence in flight', () => noteWritten('sess')]
  ];
  for (const [label, arrange] of rows) {
    it(`${label}: the control connection, the whole sequence on the client's stdin before routeKey returns`, () => {
      const far = recordingClient();
      carriages.set('far', far.carriage());
      arrange();
      const before = roadFacts('sess').lastAttachKeyAt;
      expect(routeKey('sess', 'q', 1_000)).toBe('carriage');
      // No await between the call and this line.
      expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 71', READ]);
      expect(roadFacts('sess').lastAttachKeyAt).toBe(before);
    });
  }

  it('F1: once nothing is in flight, the attach again at once, whatever the clock says', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteWritten('sess');
    noteSettled('sess', 1_000);
    expect(routeKey('sess', 'q', 1_001)).toBe('attach');
    expect(far.stdin).toEqual([]);
  });

  it('F1: a typed sequence keeps keys on the control connection until it is answered, and not a moment after', async () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    const time = manualClock(1_000);
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('carriage');
    expect(roadFacts('sess').inFlight).toBe(1);
    // Unanswered: the next key follows it on the same connection.
    expect(routeKey('sess', 'b')).toBe('carriage');
    far.pump();
    await settle();
    // Every sequence answered, the read said live: the far server ran them
    // all before it answered, so the attach cannot overtake any of them.
    expect(roadFacts('sess')).toMatchObject({ parked: false, mayBeParked: false, inFlight: 0 });
    expect(routeKey('sess', 'c')).toBe('attach');
    expect(far.stdin.filter((line) => line.includes(' -H '))).toEqual([
      'send-keys -t $7 -H 61',
      'send-keys -t $7 -H 62'
    ]);
  });
});

describe('the bytes a key carries (D7)', () => {
  it('é😀\\r crosses as c3 a9 f0 9f 98 80 0d', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'é😀\r')).toBe('carriage');
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H c3 a9 f0 9f 98 80 0d', READ]);
  });

  it('a 600 byte chunk is three -H commands, in order, between the cancel and the read', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    const text = 'abcdefghij'.repeat(60);
    expect(routeKey('sess', text)).toBe('carriage');
    expect(far.stdin).toHaveLength(5);
    expect(far.stdin[0]).toBe(CANCEL);
    expect(far.stdin[4]).toBe(READ);
    const counts = far.stdin.slice(1, 4).map((line) => line.split(' ').length - 4);
    expect(counts).toEqual([256, 256, 88]);
    const hex = far.stdin
      .slice(1, 4)
      .map((line) => line.split(' ').slice(4).join(''))
      .join('');
    expect(Buffer.from(hex, 'hex').toString('utf8')).toBe(text);
  });

  it('a 16 KB paste is 64 commands, every byte in order', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    const text = Array.from({ length: 16 * 1024 }, (_, i) => String.fromCharCode(0x21 + (i % 90))).join('');
    expect(routeKey('sess', text)).toBe('carriage');
    expect(far.stdin).toHaveLength(66);
    const hex = far.stdin
      .slice(1, -1)
      .map((line) => line.split(' ').slice(4).join(''))
      .join('');
    expect(Buffer.from(hex, 'hex').toString('utf8')).toBe(text);
  });
});

describe('the attach whenever the carriage cannot take it (D9)', () => {
  const cases: [string, () => void][] = [
    ['the machine has no carriage this run', () => carriages.set('far', { kind: 'none' })],
    ['the row ended', () => addresses.set('sess', { kind: 'ended' })],
    ['no machine holds the row', () => addresses.delete('sess')],
    ['the connection\'s first read could not be read', () => noteUnreadableConnection('far', 1)],
    ['the target is not a session id', () => addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '%7' })]
  ];
  for (const [label, arrange] of cases) {
    it(`${label}: the attach, with nothing written`, () => {
      const far = recordingClient();
      carriages.set('far', far.carriage());
      noteAnswer('sess', parkedState());
      arrange();
      expect(routeKey('sess', 'x', 5_000)).toBe('attach');
      expect(far.stdin).toEqual([]);
      expect(roadFacts('sess')).toMatchObject({ inFlight: 0, lastAttachKeyAt: 5_000 });
    });
  }

  it('an unreadable connection still carries keys while the carriage is busy with ones typed before its read came back, in order', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteUnreadableConnection('far', 1);
    noteAnswer('sess', 'failed');
    noteWritten('sess');
    expect(routeKey('sess', 'x', 1_000)).toBe('carriage');
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 78', READ]);
    // Nothing in flight, and only feared parked: the attach, as today.
    far.stdin.length = 0;
    resetScrollOrderForTests();
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    noteUnreadableConnection('far', 1);
    noteAnswer('sess', 'failed');
    expect(routeKey('sess', 'y', 5_000)).toBe('attach');
    expect(far.stdin).toEqual([]);
  });

  it('a withdrawn sequence uncounts itself', () => {
    noteWritten('sess');
    expect(roadFacts('sess').inFlight).toBe(1);
    order.noteWithdrawn('sess');
    expect(roadFacts('sess').inFlight).toBe(0);
  });

  it('an unreadable connection of an EARLIER generation does not stop a newer one', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage(2));
    noteUnreadableConnection('far', 1);
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'x')).toBe('carriage');
  });

  it('something that throws before the first write: the attach', () => {
    carriages.set('far', {
      kind: 'live',
      generation: 1,
      get run(): TmuxScrollRunner {
        throw new Error('no runner');
      }
    } as unknown as RemoteScrollCarriage);
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'x')).toBe('attach');
  });
});

describe('a typed sequence that fails (D9)', () => {
  it('is not sent again, leaves the pane possibly parked, and is said once per connection without the keystroke', async () => {
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const far = recordingClient((command) =>
      command.includes(' -H ') ? { ok: false, lines: ['secret far text'] } : { ok: true, lines: [LIVE] }
    );
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'hunter2')).toBe('carriage');
    far.pump();
    await settle();
    expect(far.stdin.filter((line) => line.includes(' -H '))).toHaveLength(1);
    expect(roadFacts('sess')).toMatchObject({ mayBeParked: true, inFlight: 0 });
    // The next key still goes the carriage's way, behind a cancel.
    expect(routeKey('sess', 'x')).toBe('carriage');
    far.pump();
    await settle();
    const lines = said.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .filter((line: string) => line.includes('far') && line.includes('typed'));
    expect(lines).toHaveLength(1);
    for (const forbidden of ['hunter2', '68 75 6e', 'secret far text', '-H', '$7']) {
      expect(lines[0]?.includes(forbidden)).toBe(false);
    }
  });

  it('a read that cannot be read leaves the pane possibly parked', async () => {
    const far = recordingClient((command) =>
      command.startsWith('display-message') ? { ok: true, lines: ['0__900_40_0_0_120_'] } : { ok: true, lines: [] }
    );
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    routeKey('sess', 'x');
    far.pump();
    await settle();
    expect(roadFacts('sess')).toMatchObject({ mayBeParked: true, inFlight: 0 });
  });
});

describe('the park\'s wait (D6) and the drop (F2)', () => {
  it('returns true at once when the attach has been quiet, true after the wait when nothing is typed, and FALSE when a key is typed while it waits', async () => {
    const time = manualClock(10_000);
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    carriages.set('far', recordingClient().carriage());
    expect(await awaitRoadQuiet('sess')).toBe(true);
    expect(time.sleepers).toEqual([]);
    // A key before the scroll began only delays it.
    expect(routeKey('sess', 'a')).toBe('attach');
    time.set(10_050);
    let quiet: boolean | null = null;
    const waited = awaitRoadQuiet('sess').then((answer) => {
      quiet = answer;
    });
    await settle();
    expect(time.sleepers.map((one) => one.ms)).toEqual([150]);
    time.set(10_200);
    time.sleepers[0]?.wake();
    await waited;
    expect(quiet).toBe(true);
    // A key typed while it waits drops the park.
    time.set(20_000);
    expect(routeKey('sess', 'b')).toBe('attach');
    quiet = null;
    const dropped = awaitRoadQuiet('sess').then((answer) => {
      quiet = answer;
    });
    await settle();
    time.set(20_120);
    expect(routeKey('sess', 'c')).toBe('attach');
    time.set(20_200);
    time.sleepers[1]?.wake();
    await dropped;
    expect(quiet).toBe(false);
    // It did not wait again.
    expect(time.sleepers).toHaveLength(2);
  });

  it('a report the pane sends does not drop a park', async () => {
    const time = manualClock(10_000);
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    expect(routeKey('sess', 'a')).toBe('attach');
    const waited = awaitRoadQuiet('sess');
    await settle();
    expect(routeKey('sess', '\u001b[I')).toBe('attach');
    time.set(10_200);
    time.sleepers[0]?.wake();
    expect(await waited).toBe(true);
  });
});

describe('D3, the read before a park', () => {
  function scripted(reads: string[]): { run: TmuxScrollRunner; calls: string[][] } {
    const calls: string[][] = [];
    const run = Object.assign(
      (args: readonly string[]): Promise<string> => {
        calls.push([...args]);
        return Promise.resolve(args[0] === 'display-message' ? (reads.shift() ?? LIVE) : '');
      },
      { ordered: true as const, server: 'machine:far' }
    );
    return { run, calls };
  }
  const park = async (run: TmuxScrollRunner, target: string): Promise<PaneScrollState> => {
    await run(['copy-mode', '-e', '-H', '-t', target]);
    return parkedState();
  };

  it('a program with the mouse, or on its alternate screen: that read, and nothing else written', async () => {
    for (const read of [fields({ mouse: true }), fields({ alt: true }), fields({ alt: true, mouse: true })]) {
      const { run, calls } = scripted([read]);
      const attempt = await readBeforePark(run, '$7', park);
      expect(attempt.outcome).toBe('refused');
      expect(calls.map((argv) => argv[0])).toEqual(['display-message']);
      expect(await undoRacedPark(run, '$7', attempt)).toBe(attempt.state);
      expect(calls).toHaveLength(1);
    }
  });

  it('already in copy mode: the operation, as today, and never undone', async () => {
    const { run, calls } = scripted([fields({ inMode: true, mouse: true, alt: true })]);
    const attempt = await readBeforePark(run, '$7', async (r, t) => {
      await r(['copy-mode', '-e', '-H', '-t', t]);
      return parkedState({ innerAlt: true, innerMouse: true });
    });
    expect(attempt.outcome).toBe('already');
    expect(calls.map((argv) => argv[0])).toEqual(['display-message', 'copy-mode']);
    await undoRacedPark(run, '$7', attempt);
    expect(calls).toHaveLength(2);
  });

  it('live with neither: the read, then the operation', async () => {
    const { run, calls } = scripted([LIVE]);
    const attempt = await readBeforePark(run, '$7', park);
    expect(attempt).toEqual({ outcome: 'parked', state: parkedState() });
    expect(calls.map((argv) => argv[0])).toEqual(['display-message', 'copy-mode']);
    expect(await undoRacedPark(run, '$7', attempt)).toEqual(parkedState());
    expect(calls).toHaveLength(2);
  });

  it('a park the program raced is cancelled, and the read after the cancel is the answer', async () => {
    const { run, calls } = scripted([LIVE, fields({})]);
    const attempt = await readBeforePark(run, '$7', async (r, t) => {
      await r(['copy-mode', '-e', '-H', '-t', t]);
      return parkedState({ innerMouse: true });
    });
    expect(attempt.outcome).toBe('parked');
    const answer = await undoRacedPark(run, '$7', attempt);
    expect(answer.inMode).toBe(false);
    expect(calls.slice(2)).toEqual([
      ['send-keys', '-t', '$7', '-X', 'cancel'],
      ['display-message', '-p', '-t', '$7', '-F', REMOTE_STATE_FORMAT]
    ]);
  });

  it('a key typed during the read before the park is written after that read and before copy-mode', async () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    const carriage = far.carriage();
    if (carriage.kind !== 'live') throw new Error('unreachable');
    noteWritten('sess');
    const run = stampedRunner('sess', carriage.run);
    const parked = readBeforePark(run, '$7', async (r, t) => {
      await r(['copy-mode', '-e', '-H', '-t', t]);
      return parkedState();
    });
    expect(far.stdin).toEqual([READ]);
    expect(routeKey('sess', 'k')).toBe('carriage');
    far.pump();
    await settle();
    far.pump();
    await parked;
    expect(far.stdin).toEqual([READ, CANCEL, 'send-keys -t $7 -H 6b', READ, 'copy-mode -e -H -t $7']);
  });
});

describe('answers in write order', () => {
  it('an older read\'s answer applied after a newer one is ignored', () => {
    const calls: string[] = [];
    const run = stampedRunner(
      'sess',
      Object.assign((args: readonly string[]) => {
        calls.push(args.join(' '));
        return Promise.resolve('');
      }, { ordered: true as const, server: 'machine:far' })
    );
    void run(['display-message', '-p', '-t', '$7', '-F', REMOTE_STATE_FORMAT]);
    const older = run.lastStamp();
    void run(['display-message', '-p', '-t', '$7', '-F', REMOTE_STATE_FORMAT]);
    const newer = run.lastStamp();
    expect(newer).toBeGreaterThan(older);
    noteAnswer('sess', parkedState(), newer);
    noteAnswer('sess', parkedState({ inMode: false }), older);
    expect(roadFacts('sess').parked).toBe(true);
    noteAnswer('sess', 'failed', older);
    expect(roadFacts('sess').mayBeParked).toBe(false);
  });

  it('a park written marks the pane parked at once, and a read written before it cannot undo that', () => {
    const run = stampedRunner(
      'sess',
      Object.assign(() => Promise.resolve(''), { ordered: true as const, server: 'machine:far' })
    );
    void run(['display-message', '-p', '-t', '$7', '-F', REMOTE_STATE_FORMAT]);
    const before = run.lastStamp();
    void run(['copy-mode', '-e', '-H', '-t', '$7']);
    expect(roadFacts('sess').parked).toBe(true);
    noteAnswer('sess', parkedState({ inMode: false }), before);
    expect(roadFacts('sess').parked).toBe(true);
    expect(run.ordered).toBe(true);
    expect(run.server).toBe('machine:far');
  });
});

describe('the carriage source seam', () => {
  it('a rig\'s own source is asked instead of the machine layer, and reset puts the shipping one back', () => {
    const far = recordingClient();
    const asked: string[] = [];
    resetScrollOrderForTests(undefined, {
      address: (id) => {
        asked.push(`address:${id}`);
        return { kind: 'live', machineId: 'rig', tmuxId: '$7' };
      },
      carriage: (machineId) => {
        asked.push(`carriage:${machineId}`);
        return far.carriage();
      }
    });
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'r')).toBe('carriage');
    expect(asked).toEqual(['address:sess', 'carriage:rig']);
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 72', READ]);
    resetScrollOrderForTests();
    // Back on the shipping source, which this file answers through its mocks.
    carriages.set('far', { kind: 'none' });
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'r')).toBe('attach');
  });
});

describe('a report the pane sends about itself (the integrator\'s round)', () => {
  // What xterm hands the app on its own, byte for byte (src/shared/pane-report.ts):
  // the focus reports, the two colour answers and the two device answers.
  const REPORTS: [string, string][] = [
    ['focus in', '\u001b[I'],
    ['focus out', '\u001b[O'],
    ['the foreground colour', '\u001b]10;rgb:d8d8/dbdb/e2e2\u001b\\'],
    ['the background colour', '\u001b]11;rgb:1313/1414/1717\u001b\\'],
    ['DA1', '\u001b[?1;2c'],
    ['DA2', '\u001b[>0;276;0c']
  ];
  for (const [label, bytes] of REPORTS) {
    it(`${label} over a parked pane takes the attach, writes nothing, cancels nothing and is not counted as a key`, () => {
      const far = recordingClient();
      carriages.set('far', far.carriage());
      noteAnswer('sess', parkedState());
      noteWritten('sess');
      expect(routeKey('sess', bytes, 3_000)).toBe('attach');
      expect(far.stdin).toEqual([]);
      expect(roadFacts('sess')).toMatchObject({
        parked: true,
        inFlight: 1,
        lastAttachKeyAt: Number.NEGATIVE_INFINITY
      });
    });
  }

  it('a keystroke that only looks like one still takes the control connection over a parked pane', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    // An arrow key, and a report with something typed after it in the same chunk.
    expect(routeKey('sess', '\u001b[A')).toBe('carriage');
    expect(routeKey('sess', '\u001b[Ix')).toBe('carriage');
    expect(far.stdin.filter((line) => line.includes(' -H '))).toEqual([
      'send-keys -t $7 -H 1b 5b 41',
      'send-keys -t $7 -H 1b 5b 49 78'
    ]);
  });
});

describe('a cancel written marks the pane live at once (the integrator\'s round)', () => {
  it('a key over a parked pane leaves it believed live before its read answers, and an older read cannot park it again', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    const carriage = far.carriage();
    if (carriage.kind !== 'live') throw new Error('unreachable');
    const poll = stampedRunner('sess', carriage.run);
    void poll(['display-message', '-p', '-t', '$7', '-F', REMOTE_STATE_FORMAT]).catch(() => undefined);
    const older = poll.lastStamp();
    noteAnswer('sess', 'failed');
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'k')).toBe('carriage');
    // Nothing has answered yet: the cancel alone says so.
    expect(roadFacts('sess')).toMatchObject({ parked: false, mayBeParked: false, inFlight: 1 });
    // The poll's read was written before the cancel, so what it says is older.
    noteAnswer('sess', parkedState(), older);
    expect(roadFacts('sess').parked).toBe(false);
    // The key is still on the control connection while its sequence is in flight.
    expect(routeKey('sess', 'l')).toBe('carriage');
  });

  it('so the session core\'s gate reads the pane before the next park (D3), and a park written after re-parks', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    routeKey('sess', 'k');
    // core.ts: `const gated = kind === 'park' && !road.parked`.
    expect(roadFacts('sess').parked).toBe(false);
    const carriage = far.carriage();
    if (carriage.kind !== 'live') throw new Error('unreachable');
    void stampedRunner('sess', carriage.run)(['copy-mode', '-e', '-H', '-t', '$7']).catch(() => undefined);
    expect(roadFacts('sess').parked).toBe(true);
  });
});

describe('forgetSession', () => {
  it('forgets everything about one session and nothing about another', () => {
    noteAnswer('sess', parkedState());
    noteWritten('sess');
    noteAnswer('other', parkedState());
    forgetSession('sess');
    expect(roadFacts('sess')).toEqual({
      parked: false,
      mayBeParked: false,
      inFlight: 0,
      lastAttachKeyAt: Number.NEGATIVE_INFINITY,
      ours: false,
      keys: 0,
      held: 0,
      unanswered: 0
    });
    expect(roadFacts('other').parked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// THE FIX ROUND (build/p3201/SPEC.md §As built, fixer): the clauses the attack
// verifier's own ablations found unowned (x11, x13 in the core's suite, x14 in
// the read's, x15, x17), and F1 to F4.
// ---------------------------------------------------------------------------

describe('a cancel that answers "not in a mode" is an answer (x11)', () => {
  it('a key over a pane that was already live leaves it known live, not possibly parked, and says nothing', async () => {
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const far = recordingClient((command) =>
      command.endsWith('-X cancel') ? { ok: false, lines: ['not in a mode'] } : { ok: true, lines: [LIVE] }
    );
    carriages.set('far', far.carriage());
    noteWritten('sess');
    expect(routeKey('sess', 'k')).toBe('carriage');
    far.pump();
    await settle();
    noteSettled('sess');
    expect(roadFacts('sess')).toMatchObject({ parked: false, mayBeParked: false, inFlight: 0 });
    expect(routeKey('sess', 'l')).toBe('attach');
    expect(said.mock.calls.map((args: unknown[]) => String(args[0])).filter((line) => line.includes('typed'))).toEqual([]);
  });
});

describe('a device answer with a key typed after it is a keystroke (x15)', () => {
  it('DA1 then a letter, in one chunk, over a parked pane, takes the control connection', () => {
    const far = recordingClient();
    carriages.set('far', far.carriage());
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', '\u001b[?1;2cx')).toBe('carriage');
    expect(far.stdin.filter((line) => line.includes(' -H '))).toEqual(['send-keys -t $7 -H 1b 5b 3f 31 3b 32 63 78']);
  });
});

describe('a park or a cancel written clears "may be parked" at once (x17)', () => {
  const runner = (): ReturnType<typeof stampedRunner> =>
    stampedRunner('sess', Object.assign(() => Promise.resolve(''), { ordered: true as const, server: 'machine:far' }));
  it('a park written over a pane that may be parked: parked, and no longer only feared', () => {
    noteAnswer('sess', 'failed');
    void runner()(['copy-mode', '-e', '-H', '-t', '$7']);
    expect(roadFacts('sess')).toMatchObject({ parked: true, mayBeParked: false });
  });
  it('a cancel written over a pane that may be parked: live, and no longer feared', () => {
    noteAnswer('sess', 'failed');
    void runner()(['send-keys', '-t', '$7', '-X', 'cancel']);
    expect(roadFacts('sess')).toMatchObject({ parked: false, mayBeParked: false });
  });
});

describe('F2 and F3, the read before a park, with the core\'s hooks', () => {
  function scripted(reads: string[]): { run: TmuxScrollRunner; calls: string[][] } {
    const calls: string[][] = [];
    const run = Object.assign(
      (args: readonly string[]): Promise<string> => {
        calls.push([...args]);
        return Promise.resolve(args[0] === 'display-message' ? (reads.shift() ?? LIVE) : '');
      },
      { ordered: true as const, server: 'machine:far' }
    );
    return { run, calls };
  }
  const park = async (run: TmuxScrollRunner, target: string): Promise<PaneScrollState> => {
    await run(['copy-mode', '-e', '-H', '-t', target]);
    return parkedState();
  };

  it('a key typed since the scroll began: the read, nothing else, outcome dropped, and the pane is not called ours', async () => {
    const { run, calls } = scripted([LIVE]);
    let parking = 0;
    const attempt = await readBeforePark(run, '$7', park, { stillWanted: () => false, parking: () => (parking += 1) });
    expect(attempt.outcome).toBe('dropped');
    expect(calls.map((argv) => argv[0])).toEqual(['display-message']);
    expect(parking).toBe(0);
    expect(await undoRacedPark(run, '$7', attempt)).toBe(attempt.state);
  });

  it('wanted, live, neither: the parking hook is called once, just before the park', async () => {
    const { run, calls } = scripted([LIVE]);
    let seen = -1;
    await readBeforePark(run, '$7', park, { stillWanted: () => true, parking: () => (seen = calls.length) });
    expect(seen).toBe(1);
    expect(calls.map((argv) => argv[0])).toEqual(['display-message', 'copy-mode']);
  });

  it('refused and already never call it', async () => {
    for (const read of [fields({ mouse: true }), fields({ alt: true }), fields({ inMode: true })]) {
      const { run } = scripted([read]);
      let parking = 0;
      await readBeforePark(run, '$7', park, { parking: () => (parking += 1) });
      expect(parking).toBe(0);
    }
  });
});

describe('F3, a pane Tortie parked goes back to its program', () => {
  function recorder(answer: string): { run: TmuxScrollRunner; calls: string[] } {
    const calls: string[] = [];
    const run = Object.assign(
      (args: readonly string[]): Promise<string> => {
        calls.push(args.join(' '));
        return Promise.resolve(args[0] === 'display-message' ? answer : '');
      },
      { ordered: true as const, server: 'machine:far' }
    );
    return { run, calls };
  }

  it('ours, in copy mode, and the program took the mouse or the screen: cancel, then the read after it', async () => {
    for (const took of [{ innerMouse: true }, { innerAlt: true }, { innerAlt: true, innerMouse: true }]) {
      resetScrollOrderForTests();
      order.noteParkedByUs('sess');
      noteAnswer('sess', parkedState());
      const { run, calls } = recorder(fields({ mouse: took.innerMouse === true, alt: took.innerAlt === true }));
      const state = await order.leaveForProgram('sess', stampedRunner('sess', run), '$7', parkedState(took));
      expect(calls).toEqual(['send-keys -t $7 -X cancel', `display-message -p -t $7 -F ${REMOTE_STATE_FORMAT}`]);
      expect(state.inMode).toBe(false);
      expect(roadFacts('sess').ours).toBe(false);
    }
  });

  it('not ours (the person\'s own copy mode, or one found already there): left alone', async () => {
    noteAnswer('sess', parkedState());
    const { run, calls } = recorder(LIVE);
    const parked = parkedState({ innerAlt: true, innerMouse: true });
    expect(await order.leaveForProgram('sess', run, '$7', parked)).toBe(parked);
    expect(calls).toEqual([]);
  });

  it('ours, and the program has neither: left parked', async () => {
    order.noteParkedByUs('sess');
    const { run, calls } = recorder(LIVE);
    const parked = parkedState();
    expect(await order.leaveForProgram('sess', run, '$7', parked)).toBe(parked);
    expect(calls).toEqual([]);
  });

  it('a live answer and a cancel written each end Tortie\'s own park', () => {
    order.noteParkedByUs('sess');
    noteAnswer('sess', parkedState({ inMode: false, position: 0 }));
    expect(roadFacts('sess').ours).toBe(false);
    order.noteParkedByUs('sess');
    const run = stampedRunner('sess', Object.assign(() => Promise.resolve(''), { ordered: true as const, server: 'machine:far' }));
    void run(['send-keys', '-t', '$7', '-X', 'cancel']);
    expect(roadFacts('sess').ours).toBe(false);
  });
});

describe('F4, keys over a parked pane while its connection is down', () => {
  const HELD_TIME = (): ReturnType<typeof manualClock> => {
    const time = manualClock(1_000);
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    return time;
  };

  it('the carriage waiting: held, nothing written anywhere; back: every held key behind ONE cancel, in order', async () => {
    const time = HELD_TIME();
    noteAnswer('sess', parkedState());
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'f')).toBe('held');
    expect(routeKey('sess', 'i')).toBe('held');
    expect(roadFacts('sess')).toMatchObject({ held: 2, lastAttachKeyAt: Number.NEGATIVE_INFINITY });
    // Still down at the first look.
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(2);
    const far = recordingClient();
    carriages.set('far', far.carriage(2));
    // A key typed now, before the loop looks again, queues behind them.
    expect(routeKey('sess', 'x')).toBe('held');
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 66 69 78', READ]);
    far.pump();
    await settle();
    expect(roadFacts('sess')).toMatchObject({ held: 0, parked: false, mayBeParked: false, inFlight: 0 });
    expect(routeKey('sess', 'y')).toBe('attach');
  });

  it('the row not yet listed on the new connection: held until it is', async () => {
    const time = HELD_TIME();
    noteAnswer('sess', parkedState());
    const far = recordingClient();
    carriages.set('far', far.carriage());
    addresses.set('sess', { kind: 'waiting', machineId: 'far' });
    expect(routeKey('sess', 'q')).toBe('held');
    expect(far.stdin).toEqual([]);
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 71', READ]);
  });

  it('a row that ended drops them; a machine with no connection for the rest of the run drops them, said once without a byte', async () => {
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    let time = HELD_TIME();
    noteAnswer('sess', parkedState());
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'secret1')).toBe('held');
    addresses.set('sess', { kind: 'ended' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(0);
    time = HELD_TIME();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'secret2')).toBe('held');
    carriages.set('far', { kind: 'none' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(0);
    const lines = said.mock.calls.map((args: unknown[]) => String(args[0])).filter((line) => line.includes('were not kept'));
    expect(lines).toHaveLength(1);
    expect(lines.join('').includes('secret')).toBe(false);
  });

  it('a pane that is live while its connection is down: the attach, as today', () => {
    HELD_TIME();
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'a')).toBe('attach');
  });

  /** A carriage whose every write waits until the test settles it. */
  function pendingCarriage(generation = 1): {
    carriage: RemoteScrollCarriage;
    calls: { line: string; resolve: (out: string) => void; reject: (err: Error) => void }[];
  } {
    const calls: { line: string; resolve: (out: string) => void; reject: (err: Error) => void }[] = [];
    const run = Object.assign(
      (args: readonly string[]): Promise<string> =>
        new Promise<string>((resolve, reject) => {
          calls.push({ line: args.join(' '), resolve, reject });
        }),
      { ordered: true as const, server: 'machine:far' }
    );
    return { calls, carriage: { kind: 'live', generation, run } };
  }

  async function closeMidSequence(cancelAnswered: boolean): Promise<ReturnType<typeof manualClock>> {
    const time = HELD_TIME();
    noteAnswer('sess', parkedState());
    const old = pendingCarriage(1);
    carriages.set('far', old.carriage);
    expect(routeKey('sess', 'x')).toBe('carriage');
    expect(old.calls.map((one) => one.line)).toEqual([
      'send-keys -t $7 -X cancel',
      'send-keys -t $7 -H 78',
      `display-message -p -t $7 -F ${REMOTE_STATE_FORMAT}`
    ]);
    // The connection closes: the client marks itself down, then fails every pending command.
    carriages.set('far', { kind: 'waiting' });
    const gone = gmuxError('TMUX_UNREACHABLE', 'the control client for far disconnected');
    old.calls.forEach((one, i) => {
      if (i === 0 && cancelAnswered) one.resolve('');
      else one.reject(gone);
    });
    await settle();
    expect(routeKey('sess', 'y')).toBe('held');
    return time;
  }

  it('a sequence whose connection closed before its cancel answered: sent again ONCE, behind a cancel, when the pane still reads scrolled back', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = await closeMidSequence(false);
    expect(roadFacts('sess')).toMatchObject({ unanswered: 1, held: 1, mayBeParked: true });
    const far = recordingClient(() => ({ ok: true, lines: [fields({ inMode: true, position: 100 })] }));
    carriages.set('far', far.carriage(2));
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([READ]);
    far.pump();
    await settle();
    expect(far.stdin).toEqual([READ, CANCEL, 'send-keys -t $7 -H 78 79', READ]);
    expect(roadFacts('sess')).toMatchObject({ unanswered: 0, held: 0 });
  });

  it('the same, when the pane reads live on the new connection: the old key may have run, so only the held one is sent', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = await closeMidSequence(false);
    const far = recordingClient(() => ({ ok: true, lines: [LIVE] }));
    carriages.set('far', far.carriage(2));
    time.sleepers.shift()?.wake();
    await settle();
    far.pump();
    await settle();
    expect(far.stdin).toEqual([READ, CANCEL, 'send-keys -t $7 -H 79', READ]);
  });

  it('a park written after the lost sequence: the pane scrolled back proves nothing, so it is not sent again', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = await closeMidSequence(false);
    const far = recordingClient(() => ({ ok: true, lines: [fields({ inMode: true, position: 5 })] }));
    carriages.set('far', far.carriage(2));
    const fresh = far.carriage(2);
    if (fresh.kind !== 'live') throw new Error('unreachable');
    void stampedRunner('sess', fresh.run)(['copy-mode', '-e', '-H', '-t', '$7']).catch(() => undefined);
    const from = far.stdin.length;
    time.sleepers.shift()?.wake();
    await settle();
    far.pump();
    await settle();
    expect(far.stdin.slice(from)).toEqual([READ, CANCEL, 'send-keys -t $7 -H 79', READ]);
  });

  it('a cancel that answered before the connection closed: the bytes behind it are not kept (they may have run)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await closeMidSequence(true);
    expect(roadFacts('sess')).toMatchObject({ unanswered: 0, held: 1 });
  });

  it('a sequence that timed out on a connection that is still the current one is not kept (it may still run there)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    HELD_TIME();
    noteAnswer('sess', parkedState());
    const old = pendingCarriage(1);
    carriages.set('far', old.carriage);
    expect(routeKey('sess', 'x')).toBe('carriage');
    const late = gmuxError('TMUX_UNREACHABLE', 'That machine did not answer a scroll in time.');
    for (const one of old.calls) one.reject(late);
    await settle();
    expect(roadFacts('sess')).toMatchObject({ unanswered: 0, mayBeParked: true });
    // The next key goes the same way, behind a cancel, on the same connection.
    expect(routeKey('sess', 'y')).toBe('carriage');
  });
});

describe('the ruled round (GONE): a key over a scrolled-back pane on a machine that missed its greeting', () => {
  // The reverifier's GONE row, in the app on loopback: the pane scrolled back,
  // the machine's reconnect missed Phase 83's 10 s greeting deadline, and every
  // key typed afterwards went down the attach into copy mode, 0 of 3 by the
  // keyboard and 0 of 3 by the bridge, where the parent delivered 3 of 3 each.
  const GONE = (): ReturnType<typeof manualClock> => {
    const time = manualClock(1_000);
    resetScrollOrderForTests(time.clock);
    addresses.set('sess', { kind: 'waiting', machineId: 'far' });
    carriages.set('far', { kind: 'none' });
    missed.add('far');
    return time;
  };

  it('the key is held, nothing is written anywhere, and the machine is asked ONCE for every key typed while it is asked', () => {
    GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('held');
    expect(routeKey('sess', 'b')).toBe('held');
    expect(reopenAsks.map((one) => [one.machineId, one.keystroke])).toEqual([['far', true]]);
    expect(roadFacts('sess')).toMatchObject({ held: 2, lastAttachKeyAt: Number.NEGATIVE_INFINITY });
  });

  it('when that connection greets and lists the row, every held key goes behind ONE cancel, in order', async () => {
    const time = GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('held');
    expect(routeKey('sess', 'b')).toBe('held');
    // The ask is handed over: the new client waits for its greeting.
    reopenAsks[0]?.resolve(true);
    carriages.set('far', { kind: 'waiting' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(2);
    // It greets, and the feed lists the row on it.
    const far = recordingClient();
    carriages.set('far', far.carriage(2));
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 61 62', READ]);
    far.pump();
    await settle();
    expect(roadFacts('sess')).toMatchObject({ held: 0, parked: false, inFlight: 0 });
    expect(reopenAsks).toHaveLength(1);
  });

  it('when it does not open, the keys are dropped, said once without a byte, and the next key takes the attach, as today, with nothing asked (his ruling of 2026-10-02)', async () => {
    const said = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'secret3')).toBe('held');
    reopenAsks[0]?.resolve(false);
    await settle();
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(0);
    const printed = said.mock.calls.map((args: unknown[]) => String(args[0]));
    const lines = printed.filter((line) => line.includes('were not kept'));
    expect(lines).toHaveLength(1);
    const fell = printed.filter((line) => line.includes('go down the attach again'));
    expect(fell).toHaveLength(1);
    expect([...lines, ...fell].join('').includes('secret')).toBe(false);
    // "Fall back to today": the q a person types to leave the scrolled-back
    // view goes down the attach, where copy mode's own key table takes it,
    // and so does every key after it; the machine is not asked again.
    expect(routeKey('sess', 'q', 9_000)).toBe('attach');
    expect(routeKey('sess', 'x', 9_100)).toBe('attach');
    expect(roadFacts('sess')).toMatchObject({ held: 0, lastAttachKeyAt: 9_100 });
    expect(reopenAsks).toHaveLength(1);
    expect(order.awaitsReopen('sess', 'far')).toBe(false);
  });

  it('when the connection it asked for misses its greeting too, the held keys are dropped and the next key takes the attach, as today', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('held');
    // Handed over: its client waits for its greeting, and a key typed now waits with the rest.
    reopenAsks[0]?.resolve(true);
    carriages.set('far', { kind: 'waiting' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(routeKey('sess', 'b')).toBe('held');
    expect(order.awaitsReopen('sess', 'far')).toBe(true);
    // Its greeting is missed: Phase 83 puts the machine back on its set.
    carriages.set('far', { kind: 'none' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(roadFacts('sess').held).toBe(0);
    expect(routeKey('sess', 'q', 20_000)).toBe('attach');
    expect(reopenAsks).toHaveLength(1);
    expect(order.awaitsReopen('sess', 'far')).toBe(false);
  });

  it('a fall back ends when a connection to that machine is seen again, and a later miss asks once more', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const time = GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('held');
    reopenAsks[0]?.resolve(false);
    await settle();
    time.sleepers.shift()?.wake();
    await settle();
    expect(routeKey('sess', 'q', 9_000)).toBe('attach');
    // He prepares the machine again: its connection is being opened, so a key
    // over the pane Tortie still believes scrolled back waits for it (F4).
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'c', 9_100)).toBe('held');
    // That open misses its greeting too: this miss is a new one, and the keys
    // held for it ask the machine once, as the ruled round does.
    carriages.set('far', { kind: 'none' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(reopenAsks).toHaveLength(2);
    expect(roadFacts('sess').held).toBe(1);
  });

  it('an ask that was answered by a live connection is not the one a later miss waits on: that miss asks again', async () => {
    const time = GONE();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a')).toBe('held');
    // Handed over (the spawn answers before any greeting can), then it greets.
    reopenAsks[0]?.resolve(true);
    await settle();
    const far = recordingClient();
    carriages.set('far', far.carriage(2));
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 61', READ]);
    far.pump();
    await settle();
    // Scrolled back again, then that connection drops and its reconnect misses its greeting.
    noteAnswer('sess', parkedState());
    carriages.set('far', { kind: 'waiting' });
    expect(routeKey('sess', 'b')).toBe('held');
    carriages.set('far', { kind: 'none' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(reopenAsks).toHaveLength(2);
    expect(roadFacts('sess').held).toBe(1);
  });

  it('keys held while the connection was reconnecting ask once more when that reconnect misses its greeting', async () => {
    const time = GONE();
    carriages.set('far', { kind: 'waiting' });
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'f')).toBe('held');
    expect(reopenAsks).toHaveLength(0);
    // The reconnect misses its greeting.
    carriages.set('far', { kind: 'none' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(reopenAsks.map((one) => one.machineId)).toEqual(['far']);
    expect(roadFacts('sess').held).toBe(1);
    reopenAsks[0]?.resolve(true);
    const far = recordingClient();
    carriages.set('far', far.carriage(2));
    addresses.set('sess', { kind: 'live', machineId: 'far', tmuxId: '$7' });
    time.sleepers.shift()?.wake();
    await settle();
    expect(far.stdin).toEqual([CANCEL, 'send-keys -t $7 -H 66', READ]);
  });

  it('a machine that may not be asked again (its tmux was refused): the attach, as today, and nothing is asked', () => {
    GONE();
    missed.clear();
    noteAnswer('sess', parkedState());
    expect(routeKey('sess', 'a', 5_000)).toBe('attach');
    expect(reopenAsks).toHaveLength(0);
  });

  it('a pane at rest on such a machine: the attach, as today, and nothing is asked', () => {
    GONE();
    expect(routeKey('sess', 'a', 5_000)).toBe('attach');
    expect(reopenAsks).toHaveLength(0);
  });

  it('awaitsReopen: a pane only that connection can return, on a machine a key may ask again', () => {
    GONE();
    expect(order.awaitsReopen('sess', 'far')).toBe(false);
    noteAnswer('sess', parkedState());
    expect(order.awaitsReopen('sess', 'far')).toBe(true);
    missed.clear();
    expect(order.awaitsReopen('sess', 'far')).toBe(false);
    missed.add('far');
    noteAnswer('sess', parkedState({ inMode: false, position: 0 }));
    expect(order.awaitsReopen('sess', 'far')).toBe(false);
    noteAnswer('sess', 'failed');
    expect(order.awaitsReopen('sess', 'far')).toBe(true);
  });
});
