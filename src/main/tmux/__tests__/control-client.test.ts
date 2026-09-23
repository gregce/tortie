/**
 * Unit tests for src/main/tmux/control-client.ts (Phase 71, M4).
 *
 * THERE WAS NO TEST FOR THIS CLASS BEFORE THIS RUNG, only one for the parser
 * beside it. Injecting the transport is what made one possible: the class used
 * to name `ensureServer()` and `tmuxArgs()` inside `start()`, so driving it
 * meant starting a real tmux server.
 *
 * NOTHING HERE SPAWNS A PROCESS. `node:child_process`'s `spawn` is replaced by a
 * fake child whose streams are in this file, so every property below is about
 * what the class DOES with the bytes rather than about tmux.
 *
 * What is checked, and each one is a property this rung depends on:
 *
 *  - the transport's precheck runs BEFORE the spawn, on the first start and on
 *    every reconnect, which is research 51 section 3's rule that a remote
 *    reconnect must never call a local `ensureServer()`
 *  - a precheck that rejects spawns nothing at all
 *  - the program and the argv come from the transport's plan and nowhere else
 *  - the FIVE line greeting the dialect probe measured leaves the client
 *    connected, with the three notifications after the block handled as
 *    notifications
 *  - a command sent before the greeting waits in the outbox and is written once
 *    the block closes
 *  - `%exit` fails every pending command with TMUX_UNREACHABLE and names the
 *    machine
 *  - PHASE 83. A child that is spawned and never greets is killed when the
 *    deadline passes, the `greeting-timeout` event fires before `disconnected`,
 *    and a child that greets in time is never killed at all.
 *  - PHASE 320, P5. `refresh-client -f no-output`'s empty block goes to a slot
 *    of its own, so a command sent the instant `connected` fires, or before
 *    the greeting, or after a reconnect, receives its own answer and no later
 *    answer is shifted by one. Five of these six cases fail at the parent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { GmuxError } from '../../errors';

// ---------------------------------------------------------------------------
// The fake child
// ---------------------------------------------------------------------------

class FakeStream extends EventEmitter {
  written: string[] = [];
  setEncoding(): void {
    /* the class calls it; nothing here needs it */
  }
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
}

class FakeChild extends EventEmitter {
  stdout = new FakeStream();
  stderr = new FakeStream();
  stdin = new FakeStream();
  killed = false;
  kill(): boolean {
    this.killed = true;
    return true;
  }
}

/** Every spawn this test file saw, in order. */
let spawns: { file: string; argv: string[]; env: NodeJS.ProcessEnv }[] = [];
let children: FakeChild[] = [];

vi.mock('node:child_process', () => ({
  spawn: (file: string, argv: string[], options: { env: NodeJS.ProcessEnv }) => {
    spawns.push({ file, argv: [...argv], env: options.env });
    const child = new FakeChild();
    children.push(child);
    return child;
  }
}));

// The local transport reaches the supervisor, which reaches Electron and the
// disk. No test here uses it, and replacing it keeps the import graph inert.
vi.mock('../supervisor', () => ({
  ensureServer: () => Promise.reject(new Error('the local transport is not used here')),
  tmuxArgs: () => []
}));

const { TmuxControlClient, CONTROL_ATTACH_ARGS, CONTROL_GREETING_DEADLINE_MS } =
  await import('../control-client');
type Client = InstanceType<typeof TmuxControlClient>;

/** What the transport recorded, so the ORDER of precheck and spawn is testable. */
let order: string[] = [];
let precheckFails: Error | null = null;

function transport(machineId = 'studio'): {
  machineId: string;
  precheck: () => Promise<void>;
  plan: () => Promise<{ file: string; argv: readonly string[] }>;
  env: () => NodeJS.ProcessEnv;
} {
  return {
    machineId,
    precheck(): Promise<void> {
      order.push('precheck');
      return precheckFails === null
        ? Promise.resolve()
        : Promise.reject(precheckFails);
    },
    plan(): Promise<{ file: string; argv: readonly string[] }> {
      order.push('plan');
      return Promise.resolve({
        file: '/usr/bin/ssh',
        argv: ['-o', 'BatchMode=yes', 'studio.example', 'tmux -C new-session']
      });
    },
    env(): NodeJS.ProcessEnv {
      return { GMUX_FAKE: '1' };
    }
  };
}

/** Feed one chunk of stdout to the client's line reader. */
function feed(index: number, text: string): void {
  children[index]?.stdout.emit('data', text);
}

/** The five line greeting `build/probe-control-dialect.mjs` measured. */
const GREETING =
  '%begin 1786998987 275 0\n' +
  '%end 1786998987 275 0\n' +
  '%window-add @0\n' +
  '%sessions-changed\n' +
  '%session-changed $0 gmux-control\n';

let client: Client | null = null;

beforeEach(() => {
  spawns = [];
  children = [];
  order = [];
  precheckFails = null;
});

afterEach(() => {
  client?.stop();
  client = null;
  vi.useRealTimers();
});

describe('the injected transport', () => {
  it('runs the precheck before the spawn and uses the plan it returns', async () => {
    client = new TmuxControlClient(transport());
    await client.start();

    expect(order).toEqual(['precheck', 'plan']);
    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.file).toBe('/usr/bin/ssh');
    expect(spawns[0]?.argv).toEqual([
      '-o',
      'BatchMode=yes',
      'studio.example',
      'tmux -C new-session'
    ]);
    expect(spawns[0]?.env).toEqual({ GMUX_FAKE: '1' });
  });

  it('names the machine, so a log line says which one', () => {
    client = new TmuxControlClient(transport('attic'));
    expect(client.machineId).toBe('attic');
  });

  it('spawns nothing when the precheck rejects', async () => {
    precheckFails = new Error('that machine did not answer');
    client = new TmuxControlClient(transport());
    await expect(client.start()).rejects.toThrow('that machine did not answer');
    expect(order).toEqual(['precheck']);
    expect(spawns).toHaveLength(0);
  });

  it('runs the precheck again on every reconnect', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport());
    await client.start();
    expect(order).toEqual(['precheck', 'plan']);

    // The child dies. The backoff is 500 ms for the first retry.
    children[0]?.emit('exit');
    await vi.advanceTimersByTimeAsync(600);

    expect(order).toEqual(['precheck', 'plan', 'precheck', 'plan']);
    expect(spawns).toHaveLength(2);
  });

  it('carries the same attach arguments for every machine', () => {
    expect([...CONTROL_ATTACH_ARGS]).toEqual([
      '-C',
      'new-session',
      '-A',
      '-s',
      'gmux-control'
    ]);
  });
});

describe('the greeting the dialect probe measured', () => {
  it('reaches connected on the guard pair and keeps the three notifications', async () => {
    client = new TmuxControlClient(transport());
    const seen: string[] = [];
    client.on('connected', () => seen.push('connected'));
    client.on('sessions-changed', () => seen.push('sessions-changed'));
    client.on('notification', (event) => seen.push(`notification:${event.kind}`));
    await client.start();

    expect(client.connected).toBe(false);
    feed(0, GREETING);

    expect(client.connected).toBe(true);
    expect(seen[0]).toBe('connected');
    // The three lines AFTER the block are notifications, not block body.
    expect(seen).toContain('sessions-changed');
    expect(seen).toContain('notification:other-notification');
    expect(seen).toContain('notification:session-changed');
  });

  it('holds the first command in the outbox until the block closes', async () => {
    client = new TmuxControlClient(transport());
    await client.start();

    // `refresh-client -f no-output` is enqueued inside start(), before any
    // greeting has arrived. Nothing may be written yet.
    expect(children[0]?.stdin.written).toEqual([]);

    feed(0, GREETING);
    expect(children[0]?.stdin.written).toEqual(['refresh-client -f no-output\n']);
  });
});

describe('death', () => {
  it('fails every pending command with TMUX_UNREACHABLE and names the machine', async () => {
    client = new TmuxControlClient(transport('studio'));
    await client.start();
    feed(0, GREETING);

    const pending = client.sendCommand('list-sessions');
    feed(0, '%exit\n');

    const err = await pending.catch((one: unknown) => one);
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.code).toBe('TMUX_UNREACHABLE');
    expect((err as GmuxError).payload.message).toContain('studio');
  });

  // -------------------------------------------------------------------------
  // Phase 83. The greeting deadline
  // -------------------------------------------------------------------------
  //
  // The clock is faked, so nothing here waits ten seconds. What is measured is
  // that the deadline exists, that it kills the child, and that a client which
  // greeted is never touched by it.

  it('kills a child that never greets, and says so before it says disconnected', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport('studio'));
    const seen: string[] = [];
    client.on('greeting-timeout', () => seen.push('greeting-timeout'));
    client.on('disconnected', () => seen.push('disconnected'));
    await client.start();
    expect(children[0]?.killed).toBe(false);

    await vi.advanceTimersByTimeAsync(CONTROL_GREETING_DEADLINE_MS + 1);

    expect(children[0]?.killed).toBe(true);
    // The event fires first, because the machines lane uses it to take the
    // client away before the ordinary disconnect handler runs.
    expect(seen[0]).toBe('greeting-timeout');
    expect(client.connected).toBe(false);
  });

  it('leaves a child that greeted in time alone', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport('studio'));
    let timeouts = 0;
    client.on('greeting-timeout', () => {
      timeouts += 1;
    });
    await client.start();
    feed(0, GREETING);
    expect(client.connected).toBe(true);

    await vi.advanceTimersByTimeAsync(CONTROL_GREETING_DEADLINE_MS * 3);

    expect(timeouts).toBe(0);
    expect(children[0]?.killed).toBe(false);
    expect(client.connected).toBe(true);
  });

  it('gives every spawn its own deadline, not only the first', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport('studio'));
    let timeouts = 0;
    client.on('greeting-timeout', () => {
      timeouts += 1;
    });
    await client.start();
    await vi.advanceTimersByTimeAsync(CONTROL_GREETING_DEADLINE_MS + 1);
    expect(timeouts).toBe(1);
    expect(spawns.length).toBe(1);

    // The reconnect backoff starts at 500 ms, so the second child exists well
    // before the second deadline could pass.
    await vi.advanceTimersByTimeAsync(600);
    expect(spawns.length).toBe(2);
    await vi.advanceTimersByTimeAsync(CONTROL_GREETING_DEADLINE_MS + 1);
    expect(timeouts).toBe(2);
    expect(children[1]?.killed).toBe(true);
  });

  it('refuses a command when there is no child, naming the machine', async () => {
    client = new TmuxControlClient(transport('attic'));
    const err = await client.sendCommand('list-sessions').catch((one: unknown) => one);
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.message).toContain('attic');
  });
});

// ---------------------------------------------------------------------------
// Phase 320, P5. `refresh-client -f no-output` answers into a slot of its own
// ---------------------------------------------------------------------------
//
// THE DEFECT, measured by research 130 §6 item 6 before this test existed:
// `start()` queued `refresh-client -f no-output` with no pending slot, and
// `closeBlock` hands every block after the greeting to the FIRST pending caller.
// So the first command sent once `connected` had fired, which is exactly what
// the local scroll runner's `this.control.connected` guard allows, was handed
// refresh-client's EMPTY block: 10 of 10 trials, the local shape included, and
// in 2 of 5 local trials every later answer stayed shifted by one. An empty
// answer to `readPaneScroll` parses as a live pane, so after a reconnect the
// renderer believed a parked pane was live and typed into copy mode.
//
// Every block below is what tmux writes: one `%begin`/`%end` pair per command,
// IN THE ORDER THE COMMANDS WERE WRITTEN, refresh-client's being empty.

/** One answer block as tmux writes it. `lines` is its body. */
function block(n: number, lines: string[] = [], ok = true): string {
  const guard = `${String(1_786_998_987 + n)} ${String(300 + n)} 1`;
  return (
    `%begin ${guard}\n` +
    lines.map((l) => `${l}\n`).join('') +
    `${ok ? '%end' : '%error'} ${guard}\n`
  );
}

/** refresh-client's own answer: tmux writes an empty block for it. */
const REFRESH_ANSWER = block(0);

describe('Phase 320 P5: refresh-client answers into its own slot', () => {
  it('hands a command sent the instant connected fires its OWN answer', async () => {
    client = new TmuxControlClient(transport());
    let first: Promise<string[]> | null = null;
    client.on('connected', () => {
      first = client?.sendCommand('display-message -p mode') ?? null;
    });
    await client.start();
    feed(0, GREETING);
    expect(first).not.toBeNull();
    // The order tmux writes them in: refresh-client first, the caller's second.
    expect(children[0]?.stdin.written).toEqual([
      'refresh-client -f no-output\n',
      'display-message -p mode\n'
    ]);

    feed(0, REFRESH_ANSWER);
    feed(0, block(1, ['0|4977|44|152|1|0|0|']));

    await expect(first).resolves.toEqual(['0|4977|44|152|1|0|0|']);
  });

  it('keeps every later answer on its own command, never shifted by one', async () => {
    client = new TmuxControlClient(transport());
    const answers: Promise<string[]>[] = [];
    client.on('connected', () => {
      if (client === null) return;
      answers.push(client.sendCommand('display-message -p one'));
      answers.push(client.sendCommand('display-message -p two'));
    });
    await client.start();
    feed(0, GREETING);
    answers.push(client.sendCommand('display-message -p three'));

    feed(0, REFRESH_ANSWER);
    feed(0, block(1, ['one']));
    feed(0, block(2, ['two']));
    feed(0, block(3, ['three']));

    await expect(Promise.all(answers)).resolves.toEqual([['one'], ['two'], ['three']]);
  });

  it('gives a command sent BEFORE the greeting its own answer too', async () => {
    client = new TmuxControlClient(transport());
    await client.start();
    // The child exists and has not greeted, so this waits in the outbox BEHIND
    // refresh-client, and its answer arrives second.
    const early = client.sendCommand('display-message -p early');
    feed(0, GREETING);
    expect(children[0]?.stdin.written).toEqual([
      'refresh-client -f no-output\n',
      'display-message -p early\n'
    ]);
    feed(0, REFRESH_ANSWER);
    feed(0, block(1, ['early']));
    await expect(early).resolves.toEqual(['early']);
  });

  it('does it again on every reconnect, where the misattribution used to recur', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport());
    await client.start();
    feed(0, GREETING);
    feed(0, REFRESH_ANSWER);

    const answers: Promise<string[]>[] = [];
    client.on('connected', () => {
      if (client !== null) answers.push(client.sendCommand('display-message -p again'));
    });
    feed(0, '%exit\n');
    await vi.advanceTimersByTimeAsync(600);
    expect(spawns).toHaveLength(2);

    feed(1, GREETING);
    expect(answers).toHaveLength(1);
    feed(1, REFRESH_ANSWER);
    feed(1, block(1, ['1|4977|44|152|1|1|0|']));
    await expect(answers[0]).resolves.toEqual(['1|4977|44|152|1|1|0|']);
  });

  it("surfaces refresh-client's own %error as an error event, never as a caller's rejection", async () => {
    client = new TmuxControlClient(transport('studio'));
    const errors: string[] = [];
    client.on('error', (err) => errors.push(err.message));
    let first: Promise<string[]> | null = null;
    client.on('connected', () => {
      first = client?.sendCommand('display-message -p mode') ?? null;
    });
    await client.start();
    feed(0, GREETING);

    feed(0, block(0, ['unknown flag -f'], false));
    feed(0, block(1, ['answer']));

    await expect(first).resolves.toEqual(['answer']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('studio');
    expect(errors[0]).toContain('refresh-client -f no-output');
    expect(errors[0]).toContain('unknown flag -f');
  });

  it('says nothing about its own slot when the connection drops', async () => {
    client = new TmuxControlClient(transport('studio'));
    const errors: string[] = [];
    client.on('error', (err) => errors.push(err.message));
    await client.start();
    feed(0, GREETING);
    // refresh-client never answered; the drop fails its slot with the rest.
    feed(0, '%exit\n');
    await Promise.resolve();
    expect(errors).toEqual([]);
  });
});
