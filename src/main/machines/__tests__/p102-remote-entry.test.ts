/**
 * Phase 102 — making a folder and renaming an entry on another machine.
 *
 * The pure halves are tested exhaustively, because they are what decides
 * whether either command ever leaves this Mac: containment against the
 * confirmed folder for every path either verb names, and the parse of what the
 * far side reported.
 *
 * The live half spawns nothing here. The write door, the confirm gate, the
 * machine registry and the far side are all replaced, so what these tests hold
 * is the ORDER of the checks and what is sent when each one fails, which in
 * every case is nothing. The send counter is read either side of every refusal
 * so that "nothing was sent" is measured rather than assumed.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine made the folder,
 * that the mode came back 755, that the far side's own containment lines hold
 * when main's copy is bypassed, what a case only rename does on a case
 * insensitive volume, or what an interrupted link does. That is
 * `node build/probe-p102-entry.mjs`, which runs against a real sign in server
 * on 127.0.0.1 and reads the far side with `ls`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every script the door was asked to run, in order. */
let ran: Array<{ id: string; args: string[]; timeoutMs: number | undefined }> =
  [];
/** What the far side answers. */
let answer = '';
/** Every call the confirm gate was asked to make, in order. */
let gated: string[] = [];
/** What the gate does. */
let gateThrows: string | null = null;
/** The row the store holds, or null for a machine that is not in the file. */
let row: Record<string, unknown> | null = null;

vi.mock('../remote-run', () => ({
  runRemoteRead: async (): Promise<never> => {
    throw new Error('this module never reads');
  },
  runRemoteWrite: async (
    _ctx: unknown,
    id: string,
    args: readonly string[],
    options: { timeoutMs?: number } = {}
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    ran.push({ id, args: [...args], timeoutMs: options.timeoutMs });
    // The one word that makes the door itself fail, which is what a dropped
    // link does.
    if (answer === '__throw__') throw new Error('Command failed: /usr/bin/ssh');
    return { payload: answer, generation: 3, bytes: answer.length };
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => ({ kind: 'remote', machineId })
}));

vi.mock('../confirm', () => ({
  assertMachineMayConnect: (id: string): void => {
    gated.push(id);
    if (gateThrows !== null) throw new Error(gateThrows);
  }
}));

vi.mock('../store', () => ({
  machineRow: () => row,
  machineFieldsOf: (one: Record<string, unknown>) => ({
    host: one['host'] ?? '',
    user: null,
    port: null,
    remoteTmuxPath: null,
    acceptedTmuxVersion: null,
    writeRoot: one['writeRoot'] ?? null
  })
}));

const {
  REMOTE_ENTRY_TIMEOUT_MS,
  makeRemoteDir,
  parseMakeDirAnswer,
  parseRenameAnswer,
  remoteEntrySendCount,
  renameRemoteEntry,
  resetRemoteEntrySendCountForTests
} = await import('../remote-entry');

/** The real catalogue, unmocked. The last describe reads the shipped text. */
const { REMOTE_SCRIPTS } = await import('../remote-scripts');

const ROOT = '/Users/gdc/code';

beforeEach(() => {
  ran = [];
  answer = '';
  gated = [];
  gateThrows = null;
  row = { id: 'studio', host: 'studio.example', writeRoot: ROOT };
  resetRemoteEntrySendCountForTests();
});

// ---------------------------------------------------------------------------
// The two parsers, which are pure
// ---------------------------------------------------------------------------

describe('parseMakeDirAnswer', () => {
  it('reads the four words the script prints', () => {
    expect(parseMakeDirAnswer('made 755')).toEqual({ word: 'made', mode: '755' });
    expect(parseMakeDirAnswer('exists none')).toEqual({
      word: 'exists',
      mode: null
    });
    expect(parseMakeDirAnswer('denied none')).toEqual({
      word: 'denied',
      mode: null
    });
    expect(parseMakeDirAnswer('noparent none')).toEqual({
      word: 'noparent',
      mode: null
    });
  });

  it('accepts a MISSING second field, and only for made', () => {
    // A machine that answers with neither `stat` spelling leaves `$m` empty, so
    // the payload trims to one word. That is a folder that WAS made, and
    // refusing it would report a write that landed as an answer nobody could
    // read.
    expect(parseMakeDirAnswer('made')).toEqual({ word: 'made', mode: null });
    expect(parseMakeDirAnswer('exists')).toBeNull();
    expect(parseMakeDirAnswer('denied')).toBeNull();
  });

  it('refuses a word it does not know and a field count it does not expect', () => {
    expect(parseMakeDirAnswer('wrote 755')).toBeNull();
    expect(parseMakeDirAnswer('made 755 extra')).toBeNull();
    expect(parseMakeDirAnswer('')).toBeNull();
    expect(parseMakeDirAnswer('MADE 755')).toBeNull();
  });
});

describe('parseRenameAnswer', () => {
  it('reads the four words the script prints', () => {
    for (const word of ['moved', 'done', 'exists', 'gone']) {
      expect(parseRenameAnswer(`${word} none`)).toEqual({ word });
    }
  });

  it('refuses a short answer, because the field count is fixed at two', () => {
    expect(parseRenameAnswer('moved')).toBeNull();
    expect(parseRenameAnswer('moved none extra')).toBeNull();
    expect(parseRenameAnswer('made none')).toBeNull();
    expect(parseRenameAnswer('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Making a folder
// ---------------------------------------------------------------------------

describe('makeRemoteDir', () => {
  it('sends the CONFIRMED folder and the path relative to it', async () => {
    answer = 'made 755';
    const out = await makeRemoteDir({
      machineId: 'studio',
      path: `${ROOT}/src/new`
    });
    expect(out).toMatchObject({
      outcome: 'made',
      mode: '755',
      writeRoot: ROOT
    });
    expect(ran).toEqual([
      { id: 'dir-new', args: [ROOT, 'src/new'], timeoutMs: REMOTE_ENTRY_TIMEOUT_MS }
    ]);
    expect(remoteEntrySendCount()).toBe(1);
  });

  it('asks the confirm gate BEFORE it composes anything', async () => {
    answer = 'made 700';
    await makeRemoteDir({ machineId: 'studio', path: `${ROOT}/a` });
    expect(gated).toEqual(['studio']);
  });

  it('refuses a machine with no confirmed folder, and sends nothing', async () => {
    row = { id: 'studio', host: 'studio.example' };
    const out = await makeRemoteDir({ machineId: 'studio', path: '/anywhere/a' });
    expect(out.outcome).toBe('writesOff');
    expect(out.writeRoot).toBeNull();
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('refuses a path outside the confirmed folder, and sends nothing', async () => {
    const out = await makeRemoteDir({
      machineId: 'studio',
      path: '/Users/gdc/.ssh/x'
    });
    expect(out.outcome).toBe('outsideRoot');
    expect(out.writeRoot).toBe(ROOT);
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('refuses the confirmed folder itself, because that folder is already there', async () => {
    const out = await makeRemoteDir({ machineId: 'studio', path: ROOT });
    expect(out.outcome).toBe('outsideRoot');
    expect(ran).toEqual([]);
  });

  it('throws for a machine that is not in the file, and sends nothing', async () => {
    row = null;
    await expect(
      makeRemoteDir({ machineId: 'nowhere', path: `${ROOT}/a` })
    ).rejects.toThrow(/There is no machine called nowhere/);
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('reports every word the machine printed as an outcome', async () => {
    for (const word of ['made', 'exists', 'denied', 'noparent']) {
      answer = `${word} none`;
      const out = await makeRemoteDir({
        machineId: 'studio',
        path: `${ROOT}/a`
      });
      expect(out.outcome).toBe(word);
    }
  });

  it('never says nothing happened when the machine did not answer', async () => {
    // Phase 101 measured a killed ssh completing the far side write, so a
    // failure here is not proof that nothing happened.
    answer = '__throw__';
    await expect(
      makeRemoteDir({ machineId: 'studio', path: `${ROOT}/a` })
    ).rejects.toThrow(/may have been made there/);
    expect(remoteEntrySendCount()).toBe(1);
  });

  it('throws for a word it does not know rather than guessing', async () => {
    answer = 'whatever none';
    await expect(
      makeRemoteDir({ machineId: 'studio', path: `${ROOT}/a` })
    ).rejects.toThrow(/did not say what it did/);
  });
});

// ---------------------------------------------------------------------------
// Renaming an entry
// ---------------------------------------------------------------------------

describe('renameRemoteEntry', () => {
  it('sends the confirmed folder and BOTH paths relative to it', async () => {
    answer = 'moved none';
    const out = await renameRemoteEntry({
      machineId: 'studio',
      from: `${ROOT}/src/a.ts`,
      to: `${ROOT}/src/b.ts`,
      kind: 'file'
    });
    expect(out).toMatchObject({
      outcome: 'moved',
      from: `${ROOT}/src/a.ts`,
      to: `${ROOT}/src/b.ts`,
      kind: 'file',
      writeRoot: ROOT
    });
    expect(ran).toEqual([
      {
        id: 'entry-rename',
        args: [ROOT, 'src/a.ts', 'src/b.ts'],
        timeoutMs: REMOTE_ENTRY_TIMEOUT_MS
      }
    ]);
  });

  it('echoes the kind back, because the tab follower reads it', async () => {
    // A folder rename reported as a file leaves every open tab beneath it
    // pointing at a path that is no longer on that machine.
    answer = 'moved none';
    const out = await renameRemoteEntry({
      machineId: 'studio',
      from: `${ROOT}/src`,
      to: `${ROOT}/lib`,
      kind: 'dir'
    });
    expect(out.kind).toBe('dir');
  });

  it('refuses when the DESTINATION is outside the folder, and sends nothing', async () => {
    const out = await renameRemoteEntry({
      machineId: 'studio',
      from: `${ROOT}/a.ts`,
      to: '/Users/gdc/.ssh/authorized_keys',
      kind: 'file'
    });
    expect(out.outcome).toBe('outsideRoot');
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('refuses when the SOURCE is outside the folder, and sends nothing', async () => {
    const out = await renameRemoteEntry({
      machineId: 'studio',
      from: '/etc/hosts',
      to: `${ROOT}/hosts`,
      kind: 'file'
    });
    expect(out.outcome).toBe('outsideRoot');
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('refuses a machine with no confirmed folder, and sends nothing', async () => {
    row = { id: 'studio', host: 'studio.example' };
    const out = await renameRemoteEntry({
      machineId: 'studio',
      from: `${ROOT}/a.ts`,
      to: `${ROOT}/b.ts`,
      kind: 'file'
    });
    expect(out.outcome).toBe('writesOff');
    expect(ran).toEqual([]);
    expect(remoteEntrySendCount()).toBe(0);
  });

  it('reports every word the machine printed as an outcome', async () => {
    for (const word of ['moved', 'done', 'exists', 'gone']) {
      answer = `${word} none`;
      const out = await renameRemoteEntry({
        machineId: 'studio',
        from: `${ROOT}/a.ts`,
        to: `${ROOT}/b.ts`,
        kind: 'file'
      });
      expect(out.outcome).toBe(word);
    }
  });

  it('never says nothing happened when the machine did not answer', async () => {
    answer = '__throw__';
    await expect(
      renameRemoteEntry({
        machineId: 'studio',
        from: `${ROOT}/a.ts`,
        to: `${ROOT}/b.ts`,
        kind: 'file'
      })
    ).rejects.toThrow(/may have been renamed there/);
  });

  it('throws for a word it does not know rather than guessing', async () => {
    answer = 'made none';
    await expect(
      renameRemoteEntry({
        machineId: 'studio',
        from: `${ROOT}/a.ts`,
        to: `${ROOT}/b.ts`,
        kind: 'file'
      })
    ).rejects.toThrow(/did not say what it did/);
  });
});

// ---------------------------------------------------------------------------
// What the shipped catalogue holds for these two ids
// ---------------------------------------------------------------------------

describe('the two script rows this module is the only caller of', () => {
  it('are both writes, and they are the fourth and the fifth', () => {
    const writers = REMOTE_SCRIPTS.filter((one) => one.mode === 'write');
    expect(writers.map((one) => one.id)).toEqual([
      'image-put',
      'git-clone',
      'file-put',
      'dir-new',
      'entry-rename'
    ]);
  });

  it('declare the parameter counts this module sends', () => {
    expect(REMOTE_SCRIPTS.find((one) => one.id === 'dir-new')?.params).toBe(2);
    expect(REMOTE_SCRIPTS.find((one) => one.id === 'entry-rename')?.params).toBe(
      3
    );
  });

  it('say in their own reason what a repeat does, and what done cannot tell', () => {
    const rename = REMOTE_SCRIPTS.find((one) => one.id === 'entry-rename');
    expect(rename?.reason).toContain('done');
    expect(rename?.reason).toContain('somebody');
    expect(REMOTE_SCRIPTS.find((one) => one.id === 'dir-new')?.reason).toContain(
      'exists'
    );
  });
});
