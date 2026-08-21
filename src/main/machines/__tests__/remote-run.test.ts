/**
 * Phase 73 — the second door, and what it refuses before it sends anything.
 *
 * The whole point of this module is a set of refusals that happen in an order,
 * so the tests are written as "what was sent" rather than as "what came back".
 * `execRemoteShell` is replaced and every call to it is recorded, so a refusal
 * that fires with an empty record is a refusal that sent nothing, which is the
 * claim each of them makes.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine runs any of
 * this, that the bytes come back whole, or that the connection generation moves
 * when a real link drops. That is `node build/probe-remote-image.mjs`, which
 * kills a real sign in server by recorded pid mid-command and prints the
 * refusal firing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every command the door tried to send, in order. */
let sent: string[] = [];
/** Phase 118. Every options object the spawn seam was handed, in order. */
let handed: { timeoutMs?: number; execution?: unknown }[] = [];
/** What the far side answers next. */
let answer: (command: string) => string | Promise<string> = () => '';
/** The link state per machine. */
let link = 'connected';
/** The connection number, and what it becomes while a command is in flight. */
let generation = 7;
let generationAfterSend: number | null = null;

vi.mock('../exec-plane', () => ({
  execRemoteShell: async (
    _ctx: unknown,
    command: string,
    options?: { timeoutMs?: number; execution?: unknown }
  ): Promise<string> => {
    sent.push(command);
    handed.push(options ?? {});
    const out = await answer(command);
    if (generationAfterSend !== null) generation = generationAfterSend;
    return out;
  }
}));

vi.mock('../control-plane', () => ({
  machineLinkFacts: (machineId: string) => ({
    machineId,
    link,
    everAnswered: true,
    lastAnsweredAt: 1,
    reason: null
  })
}));

vi.mock('../context', async () => ({
  machineGeneration: () => ({ generation, remotePath: '/usr/bin' })
}));

const {
  REMOTE_RUN_TIMEOUT_MS,
  assertMachineIsConnected,
  composeRemoteScriptCommand,
  machineIsConnected,
  parseRemoteScriptAnswer,
  remoteScriptName,
  runRemoteRead,
  runRemoteWrite
} = await import('../remote-run');
const { REMOTE_SCRIPT_MARKER, remoteScript } = await import('../remote-scripts');
const { shellQuoteArgv } = await import('../../restore/command');

const ctx = {
  kind: 'remote',
  machineId: 'pop',
  host: '10.0.0.4',
  socket: 'gmux',
  bin: '/usr/bin/tmux',
  sshBin: '/usr/bin/ssh'
} as unknown as RemoteMachineContext;

/** What a machine printed, with a chatty login file around it. */
function printed(payload: string, noise = ''): string {
  return `${noise}${REMOTE_SCRIPT_MARKER}${payload}${REMOTE_SCRIPT_MARKER}\n`;
}

beforeEach(() => {
  sent = [];
  handed = [];
  link = 'connected';
  generation = 7;
  generationAfterSend = null;
  answer = () => printed('ok');
});

describe('the command it composes', () => {
  it('is ONE quoted argument, from one quoting call', () => {
    const script = remoteScript('store-head');
    const command = composeRemoteScriptCommand(script!, ['/a/b', '512']);
    expect(command).toBe(
      shellQuoteArgv([
        '/bin/sh',
        '-c',
        script!.text,
        'tortie-store-head',
        '/a/b',
        '512'
      ])
    );
  });

  it('names Tortie and the script as $0, so an error there names Tortie', () => {
    expect(remoteScriptName('review-list')).toBe('tortie-review-list');
    const command = composeRemoteScriptCommand(remoteScript('review-list')!, ['/w']);
    expect(command).toContain('tortie-review-list');
  });

  it('carries a hostile value once, in the tail, and never as script', () => {
    const hostile = "'; rm -rf ~; echo '";
    const script = remoteScript('store-head')!;
    const command = composeRemoteScriptCommand(script, [hostile, '10']);
    expect(script.text).not.toContain(hostile);
    // It is present exactly once, and it is quoted, so the far side's shell
    // reads it as one value rather than as three commands.
    expect(command.split(hostile).length - 1).toBe(1);
    expect(command).toContain(shellQuoteArgv([hostile]));
    // The value is in the TAIL, after the script text, and never inside it.
    expect(command.indexOf(hostile)).toBeGreaterThan(
      command.indexOf('__TORTIE_RUN__')
    );
  });
});

describe('the answer it reads', () => {
  it('reads what is between the markers', () => {
    expect(parseRemoteScriptAnswer(printed('home=/home/greg'))).toBe(
      'home=/home/greg'
    );
  });

  it('ignores everything a login file printed around it', () => {
    expect(parseRemoteScriptAnswer(printed('added 10 abc', 'Welcome\nmail\n'))).toBe(
      'added 10 abc'
    );
  });

  it('treats no markers as no answer', () => {
    expect(parseRemoteScriptAnswer('sh: command not found\n')).toBeNull();
  });

  it('treats empty markers as no answer', () => {
    expect(parseRemoteScriptAnswer(printed(''))).toBeNull();
  });
});

describe('the refusals, in the order they fire', () => {
  it('refuses a name nobody wrote down, and sends nothing', async () => {
    await expect(runRemoteRead(ctx, 'rm-rf', [])).rejects.toThrow(
      /not on that list/
    );
    expect(sent).toEqual([]);
  });

  it('refuses a write through the read door, and sends nothing', async () => {
    await expect(
      runRemoteRead(ctx, 'image-put', ['a.png', 'AAA'])
    ).rejects.toThrow(/wrong door/);
    expect(sent).toEqual([]);
  });

  it('refuses a read through the write door, and sends nothing', async () => {
    await expect(runRemoteWrite(ctx, 'store-head', ['/a', '1'])).rejects.toThrow(
      /wrong door/
    );
    expect(sent).toEqual([]);
  });

  it('treats a wrong argument count as a programming error', async () => {
    // It carries no sentence for a person, because no person did this.
    await expect(runRemoteRead(ctx, 'store-head', ['/a'])).rejects.toThrow(
      /reads 2 value\(s\) and was given 1/
    );
    expect(sent).toEqual([]);
  });

  it('refuses every machine that is not answering, and sends nothing', async () => {
    for (const state of ['connecting', 'quiet', 'refused']) {
      link = state;
      sent = [];
      await expect(runRemoteRead(ctx, 'machine-facts', [])).rejects.toThrow(
        /not connected to that machine/
      );
      expect(sent, state).toEqual([]);
    }
  });

  it('allows the two states that mean the machine answered', async () => {
    for (const state of ['connected', 'polling']) {
      link = state;
      sent = [];
      await expect(runRemoteRead(ctx, 'machine-facts', [])).resolves.toEqual(
        expect.objectContaining({ payload: 'ok', generation: 7 })
      );
      expect(sent, state).toHaveLength(1);
    }
  });

  it('refuses an answer with nothing usable in it', async () => {
    answer = () => 'bash: git: command not found\n';
    await expect(runRemoteRead(ctx, 'review-list', ['/w'])).rejects.toThrow(
      /not connected to that machine/
    );
  });

  it('discards an answer whose connection moved while it was in flight', async () => {
    // This is the second half of connected-only. The far side answered, and by
    // the time it did, the connection that answer belongs to was not the
    // connection Tortie has. Reading it would be a claim about a machine
    // through a link that no longer exists.
    generationAfterSend = 8;
    await expect(runRemoteRead(ctx, 'machine-facts', [])).rejects.toThrow(
      /not connected to that machine/
    );
    expect(sent).toHaveLength(1);
  });

  it('keeps an answer whose connection did not move', async () => {
    generationAfterSend = 7;
    const out = await runRemoteRead(ctx, 'machine-facts', []);
    expect(out.generation).toBe(7);
  });
});

describe('what the door is for other callers', () => {
  it('answers whether a machine is connected without sending anything', () => {
    link = 'polling';
    expect(machineIsConnected('pop')).toBe(true);
    link = 'quiet';
    expect(machineIsConnected('pop')).toBe(false);
    expect(sent).toEqual([]);
  });

  it('lets a caller ask the same question before it does the work', () => {
    link = 'quiet';
    expect(() => assertMachineIsConnected('pop', 'a harvest pass')).toThrow(
      /not connected to that machine/
    );
    link = 'connected';
    expect(() => assertMachineIsConnected('pop', 'a harvest pass')).not.toThrow();
  });

  it('gives one command 15 s unless the caller says otherwise', () => {
    expect(REMOTE_RUN_TIMEOUT_MS).toBe(15_000);
  });
});

describe('the size guard', () => {
  it('counts UTF-8 bytes rather than UTF-16 code units', async () => {
    // Phase 96, and this case is the whole of that defect. The guard is the one
    // bound on every command this product sends to another computer, and the
    // limit it compares against is a count of bytes. It used to compare
    // `command.length`, which counts UTF-16 code units. The two counts agree
    // for ASCII and they do not agree for anything else.
    //
    // One `漢` is 1 UTF-16 code unit and 3 UTF-8 bytes. Fifty thousand of them
    // make a command whose code unit count is under the limit and whose byte
    // count is roughly three times it, so the old count let it through and the
    // fixed count refuses it.
    const value = '漢'.repeat(50_000);
    const command = composeRemoteScriptCommand(remoteScript('review-list')!, [
      value
    ]);
    expect(command.length).toBeLessThan(131_072);
    expect(Buffer.byteLength(command, 'utf8')).toBeGreaterThan(131_072);

    await expect(runRemoteRead(ctx, 'review-list', [value])).rejects.toThrow(
      /composed \d+ bytes and the limit is 131072/
    );
    // The number the sentence names is the byte count, not the code unit count.
    let message = '';
    try {
      await runRemoteRead(ctx, 'review-list', [value]);
    } catch (error) {
      message = (error as Error).message;
    }
    const named = Number(/composed (\d+) bytes/.exec(message)?.[1]);
    expect(named).toBeGreaterThan(131_072);
    expect(named).toBe(Buffer.byteLength(command, 'utf8'));
    // Nothing left this Mac.
    expect(sent).toEqual([]);
  });

  it('still sends an ordinary command well under the limit', async () => {
    // The guard did not start refusing the work it has always allowed.
    await expect(
      runRemoteRead(ctx, 'review-list', ['/home/greg/work'])
    ).resolves.toEqual(expect.objectContaining({ payload: 'ok' }));
    expect(sent).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PHASE 118. The name of the work travels with it.
// ---------------------------------------------------------------------------

/**
 * The ledger that owns the ssh child decides what a log line says, what a cut
 * off copy is recorded as, and which sentence a person reads at the next launch.
 * It reads that from what the caller passed through this door, so a value that
 * silently stopped travelling would produce a copy recorded as an unnamed
 * command and a person who is never told about the folder it left behind.
 */
describe('what the door tells the ledger', () => {
  it('passes the caller own name for the work straight through', async () => {
    await runRemoteRead(ctx, 'store-head', ['/a/b', '512'], {
      execution: { kind: 'store-sync', subject: 's-42' }
    });
    expect(handed[0]?.execution).toEqual({
      kind: 'store-sync',
      subject: 's-42'
    });
  });

  it('sends no name at all when the caller gave none, so the ledger reads command', async () => {
    await runRemoteRead(ctx, 'store-head', ['/a/b', '512']);
    expect(handed[0]).not.toHaveProperty('execution');
  });

  it('keeps the caller own deadline beside it', async () => {
    await runRemoteWrite(ctx, 'image-put', ['a.png', 'AAAA'], {
      timeoutMs: 1234,
      execution: { kind: 'command', subject: '' }
    });
    expect(handed[0]?.timeoutMs).toBe(1234);
  });

  it('falls back to this door own deadline', async () => {
    await runRemoteRead(ctx, 'store-head', ['/a/b', '512']);
    expect(handed[0]?.timeoutMs).toBe(REMOTE_RUN_TIMEOUT_MS);
  });
});
