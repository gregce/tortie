/**
 * Phase 337, D8: the shared control client ends a block only on ITS OWN guard
 * (build/p337/SPEC.md §5.7, D8, §14 M2, M3, M16).
 *
 * THE DEFECT. tmux writes what a command prints raw inside its block, so a row a
 * session draws can look like `%end …` or `%begin …`, and before this phase any
 * `%end` or `%error` inside an open block closed it. The spec step drove the
 * SHIPPING client at `aebb4ce9` against a scratch server: a pane drawing two
 * guard-shaped rows, read pipelined beside three others, handed the next pane's
 * answer to the wrong command 20 of 20 times on 3.7b and on 3.6a (§14 M3).
 *
 * THE FIXTURE is a RECORDED stream, `build/fixtures/screen/forged-guards.ctl`:
 * one scratch tmux 3.7b server (`-L p337k-<pid>`, never `-L gmux`), four panes
 * of 40x6, a control client that sent `refresh-client -f no-output` and then
 * FIVE commands in one write, `capture-pane -p -t %1` to `%4` and
 * `capture-pane -p -t %9999`. Pane `%1` draws two guard-shaped rows carrying the
 * SAME second as the capture's own guards and command number 1, so only the
 * number tells them apart. The recording is the keys builder's
 * (`…/scratchpad/p337/keys/record-guards.mjs`), sha256 `23175ece…`.
 *
 * NOTHING HERE SPAWNS A PROCESS: `spawn` is replaced by a fake child, as
 * `control-client.test.ts` does, and the stream is fed to it.
 *
 * At the parent every case below that feeds a forged row fails: A's answer is cut
 * at the forged `%end`, B is handed the forged block, C B's, D C's, and the
 * failing fifth command is RESOLVED with D's rows instead of rejecting.
 */

import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

let children: FakeChild[] = [];

vi.mock('node:child_process', () => ({
  spawn: () => {
    const child = new FakeChild();
    children.push(child);
    return child;
  }
}));

vi.mock('../supervisor', () => ({
  ensureServer: () => Promise.reject(new Error('the local transport is not used here')),
  tmuxArgs: () => []
}));

const { TmuxControlClient } = await import('../control-client');
type Client = InstanceType<typeof TmuxControlClient>;

const REPO = join(__dirname, '../../../..');
const STREAM = readFileSync(join(REPO, 'build/fixtures/screen/forged-guards.ctl'), 'utf8');

/** The five commands the recording wrote, in the order it wrote them. */
const COMMANDS = [
  'capture-pane -p -t %1',
  'capture-pane -p -t %2',
  'capture-pane -p -t %3',
  'capture-pane -p -t %4',
  'capture-pane -p -t %9999'
];

function transport(): {
  machineId: string;
  precheck: () => Promise<void>;
  plan: () => Promise<{ file: string; argv: readonly string[] }>;
  env: () => NodeJS.ProcessEnv;
} {
  return {
    machineId: 'p337-guards',
    precheck: () => Promise.resolve(),
    plan: () => Promise.resolve({ file: '/usr/bin/false', argv: [] }),
    env: () => ({})
  };
}

function feed(index: number, text: string): void {
  children[index]?.stdout.emit('data', text);
}

/** A promise's outcome, never thrown: so five answers can be compared at once. */
async function outcomeOf(answer: Promise<string[]>): Promise<{ ok: string[] } | { error: string }> {
  try {
    return { ok: await answer };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

let client: Client | null = null;

beforeEach(() => {
  children = [];
});

afterEach(() => {
  client?.stop();
  client = null;
  vi.useRealTimers();
});

describe('the recorded stream, as tmux 3.7b wrote it', () => {
  it('holds two guard-shaped rows inside the first capture, in that capture\'s own second', () => {
    const lines = STREAM.split('\n');
    const begins = lines.filter((l) => l.startsWith('%begin '));
    // The greeting, refresh-client, five commands, and ONE forged row.
    expect(begins).toHaveLength(8);
    const forgedEnd = lines.findIndex((l) => /^%end \d+ 1 1$/.test(l));
    const forgedBegin = lines.findIndex((l) => /^%begin \d+ 1 1$/.test(l));
    expect(forgedEnd).toBeGreaterThan(0);
    expect(forgedBegin).toBe(forgedEnd + 1);
    // The capture's real guard, just above, carries the same second.
    const realBegin = lines[forgedEnd - 2] ?? '';
    expect(realBegin).toMatch(/^%begin \d+ \d+ 1$/);
    expect(realBegin.split(' ')[1]).toBe((lines[forgedEnd] ?? '').split(' ')[1]);
    expect(realBegin.split(' ')[2]).not.toBe('1');
    // Printable ASCII and line feeds only: no raw control byte is committed.
    expect(/^[\n\x20-\x7e]*$/.test(STREAM)).toBe(true);
  });
});

describe('every answer goes to the command that asked for it (D8)', () => {
  /** Start a client, send the five commands, then feed `chunks` of the recording. */
  async function replay(
    chunks: readonly string[]
  ): Promise<Promise<{ ok: string[] } | { error: string }>[]> {
    client = new TmuxControlClient(transport());
    await client.start();
    const answers = COMMANDS.map((command) => outcomeOf((client as Client).sendCommand(command)));
    for (const chunk of chunks) feed(0, chunk);
    return answers;
  }

  const WANT = [
    { ok: ['pane a', expect.stringMatching(/^%end \d+ 1 1$/), expect.stringMatching(/^%begin \d+ 1 1$/), 'inside a forged block', 'last of a', ''] },
    { ok: ['PANE-B', '', '', '', '', ''] },
    { ok: ['PANE-C', '', '', '', '', ''] },
    { ok: ['PANE-D', '', '', '', '', ''] },
    { error: "can't find pane: %9999" }
  ];

  it('fed whole: A keeps its forged rows as body, B, C and D their own rows, and the fifth rejects', async () => {
    const answers = await replay([STREAM]);
    expect(await Promise.all(answers)).toEqual(WANT);
    // What the client wrote: its own command, then the five, in order.
    expect(children[0]?.stdin.written).toEqual([
      'refresh-client -f no-output\n',
      ...COMMANDS.map((c) => `${c}\n`)
    ]);
  });

  it('fed one character at a time: the same five answers', async () => {
    const answers = await replay([...STREAM]);
    expect(await Promise.all(answers)).toEqual(WANT);
  });

  it('and the next command after the stream is answered with its own block, not shifted', async () => {
    const answers = await replay([STREAM]);
    await Promise.all(answers);
    const next = (client as Client).sendCommand('display-message -p next');
    feed(0, '%begin 1791240206 329 1\nnext\n%end 1791240206 329 1\n');
    await expect(next).resolves.toEqual(['next']);
  });
});

describe('the close rule, clause by clause', () => {
  async function connected(): Promise<Client> {
    const one = new TmuxControlClient(transport());
    client = one;
    await one.start();
    feed(0, '%begin 1791240000 100 0\n%end 1791240000 100 0\n');
    // refresh-client's own empty block.
    feed(0, '%begin 1791240000 101 1\n%end 1791240000 101 1\n');
    expect(one.connected).toBe(true);
    return one;
  }

  it('an %end with the block\'s number but another second is body', async () => {
    const one = await connected();
    const answer = one.sendCommand('capture-pane -p -t %1');
    feed(0, '%begin 1791240001 102 1\nrow\n%end 1791240002 102 1\nafter\n%end 1791240001 102 1\n');
    await expect(answer).resolves.toEqual(['row', '%end 1791240002 102 1', 'after']);
  });

  it('an %end with the block\'s second but another number is body', async () => {
    const one = await connected();
    const answer = one.sendCommand('capture-pane -p -t %1');
    feed(0, '%begin 1791240001 102 1\nrow\n%end 1791240001 103 1\nafter\n%end 1791240001 102 1\n');
    await expect(answer).resolves.toEqual(['row', '%end 1791240001 103 1', 'after']);
  });

  it('a forged %error inside a block is body, and the block still SUCCEEDS on its own %end', async () => {
    const one = await connected();
    const answer = one.sendCommand('capture-pane -p -t %1');
    feed(0, '%begin 1791240001 102 1\n%error 1791240001 999 1\nrow\n%end 1791240001 102 1\n');
    await expect(answer).resolves.toEqual(['%error 1791240001 999 1', 'row']);
  });

  it('a forged %begin inside a block opens nothing: the next block is the next command\'s', async () => {
    const one = await connected();
    const first = one.sendCommand('capture-pane -p -t %1');
    const second = one.sendCommand('capture-pane -p -t %2');
    feed(0, '%begin 1791240001 102 1\n%begin 1791240001 102 1\nx\n%end 1791240001 102 1\n');
    feed(0, '%begin 1791240001 103 1\ny\n%end 1791240001 103 1\n');
    await expect(first).resolves.toEqual(['%begin 1791240001 102 1', 'x']);
    await expect(second).resolves.toEqual(['y']);
  });

  it('a real %error carrying the block\'s own number and second rejects its own command, and only it', async () => {
    const one = await connected();
    const failing = outcomeOf(one.sendCommand('capture-pane -p -t %9'));
    const after = one.sendCommand('capture-pane -p -t %2');
    feed(0, "%begin 1791240001 102 1\ncan't find pane: %9\n%error 1791240001 102 1\n");
    feed(0, '%begin 1791240001 103 1\nPANE-2\n%end 1791240001 103 1\n');
    expect(await failing).toEqual({ error: "can't find pane: %9" });
    await expect(after).resolves.toEqual(['PANE-2']);
  });

  it('flags are not compared: tmux writes them alike, and a guard is its number and its second', async () => {
    const one = await connected();
    const answer = one.sendCommand('display-message -p x');
    feed(0, '%begin 1791240001 102 1\nx\n%end 1791240001 102 0\n');
    await expect(answer).resolves.toEqual(['x']);
  });

  it('a block left open by a drop is forgotten, so the next connection greets on its own guards', async () => {
    vi.useFakeTimers();
    const one = await connected();
    void one.sendCommand('capture-pane -p -t %1').catch(() => undefined);
    // A block opens and the child dies inside it.
    feed(0, '%begin 1791240001 102 1\npartial\n');
    children[0]?.emit('exit');
    expect(one.connected).toBe(false);
    await vi.advanceTimersByTimeAsync(600);
    expect(children).toHaveLength(2);
    // The new child's greeting carries other numbers. Kept as the old block's
    // body, it would never connect.
    feed(1, '%begin 1791240009 7 0\n%end 1791240009 7 0\n');
    expect(one.connected).toBe(true);
  });
});
