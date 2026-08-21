/**
 * Phase 101 — saving one file on another machine.
 *
 * The pure halves are tested exhaustively, because they are what decides
 * whether a byte ever leaves this Mac: containment against the confirmed
 * folder, and the parse of what the far side reported.
 *
 * The live half spawns nothing here. The write door, the confirm gate, the
 * machine registry and the far side are all replaced, so what these tests hold
 * is the ORDER of the checks and what is sent when each one fails, which in
 * every case is nothing.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine wrote the bytes,
 * that the mode came back 755, that the far side's own containment lines hold
 * when main's copy is bypassed, or what an interrupted link does. That is
 * `node build/probe-p101-save.mjs`, which runs against a real sign in server on
 * 127.0.0.1 and compares sha256 on both sides.
 */

import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every script the door was asked to run, in order. */
let ran: Array<{ door: 'read' | 'write'; id: string; args: string[] }> = [];
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
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    ran.push({ door: 'write', id, args: [...args] });
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
  REMOTE_FILE_MAX_BYTES,
  REMOTE_FILE_PUT_TIMEOUT_MS,
  parseFilePutAnswer,
  putFileOnMachine,
  relativeUnderRoot
} = await import('../remote-file');

// The real catalogue, unmocked. The three tests at the end of this file read
// the shipped script text itself.
const { REMOTE_SCRIPTS } = await import('../remote-scripts');

const ROOT = '/Users/gdc/code';

function sha(text: string): string {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

beforeEach(() => {
  ran = [];
  answer = '';
  gated = [];
  gateThrows = null;
  row = { id: 'studio', host: 'studio.example', writeRoot: ROOT };
});

// ---------------------------------------------------------------------------
// Containment, which is main's own copy of it
// ---------------------------------------------------------------------------

describe('relativeUnderRoot', () => {
  it('answers the path relative to the folder', () => {
    expect(relativeUnderRoot(ROOT, `${ROOT}/src/main.ts`)).toBe('src/main.ts');
  });

  it('resolves both sides before it compares them', () => {
    expect(relativeUnderRoot(ROOT, `${ROOT}/./src/main.ts`)).toBe('src/main.ts');
    expect(relativeUnderRoot(`${ROOT}/`, `${ROOT}/a.ts`)).toBe('a.ts');
  });

  it('refuses a sibling folder whose name starts with the folder', () => {
    // Without the separator in the comparison this would pass, and a root of
    // /Users/gdc would contain /Users/gdcx.
    expect(relativeUnderRoot('/Users/gdc', '/Users/gdcx/a.ts')).toBeNull();
  });

  it('refuses a path that climbs out with ..', () => {
    expect(relativeUnderRoot(ROOT, `${ROOT}/../secrets.txt`)).toBeNull();
    expect(relativeUnderRoot(ROOT, '/etc/passwd')).toBeNull();
  });

  it('refuses the folder itself, because a folder is not a file', () => {
    expect(relativeUnderRoot(ROOT, ROOT)).toBeNull();
  });

  it('refuses a relative folder and a relative path', () => {
    expect(relativeUnderRoot('code', `${ROOT}/a.ts`)).toBeNull();
    expect(relativeUnderRoot(ROOT, 'a.ts')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The parse. Three fields and always three
// ---------------------------------------------------------------------------

describe('parseFilePutAnswer', () => {
  it('reads the six words', () => {
    expect(parseFilePutAnswer('wrote abc 12')).toEqual({
      word: 'wrote',
      sha256: 'abc',
      bytes: 12
    });
    expect(parseFilePutAnswer('stale def none')).toEqual({
      word: 'stale',
      sha256: 'def',
      bytes: null
    });
    for (const word of ['missing', 'exists', 'nomode', 'nosum']) {
      expect(parseFilePutAnswer(`${word} none none`)?.word).toBe(word);
    }
  });

  it('refuses anything that is not three fields', () => {
    expect(parseFilePutAnswer('wrote abc')).toBeNull();
    expect(parseFilePutAnswer('wrote abc 12 13')).toBeNull();
    expect(parseFilePutAnswer('')).toBeNull();
  });

  it('refuses a word the script does not print', () => {
    expect(parseFilePutAnswer('added abc 12')).toBeNull();
    expect(parseFilePutAnswer('present none none')).toBeNull();
  });

  it('refuses a size that is not a whole count of bytes', () => {
    expect(parseFilePutAnswer('wrote abc -1')).toBeNull();
    expect(parseFilePutAnswer('wrote abc twelve')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The order of the checks, and what is sent when each one fails
// ---------------------------------------------------------------------------

describe('putFileOnMachine', () => {
  const call = (over: Record<string, unknown> = {}) =>
    putFileOnMachine({
      machineId: 'studio',
      path: `${ROOT}/a.ts`,
      contents: 'hello',
      expect: sha('read earlier'),
      ...over
    } as Parameters<typeof putFileOnMachine>[0]);

  it('refuses a machine that is not in the file, and sends nothing', async () => {
    row = null;
    await expect(call()).rejects.toThrow(/no machine called studio/);
    expect(ran).toEqual([]);
  });

  it('asks the confirm gate before anything else', async () => {
    gateThrows = 'nobody has confirmed it';
    await expect(call()).rejects.toThrow(/nobody has confirmed it/);
    expect(gated).toEqual(['studio']);
    expect(ran).toEqual([]);
  });

  it('answers writesOff for a machine with no folder, and sends nothing', async () => {
    row = { id: 'studio', host: 'studio.example' };
    const out = await call();
    expect(out).toEqual({
      outcome: 'writesOff',
      sha256: null,
      bytes: null,
      writeRoot: null
    });
    expect(ran).toEqual([]);
  });

  it('answers tooLarge before anything is encoded, and sends nothing', async () => {
    const out = await call({ contents: 'x'.repeat(REMOTE_FILE_MAX_BYTES + 1) });
    expect(out.outcome).toBe('tooLarge');
    expect(out.bytes).toBe(REMOTE_FILE_MAX_BYTES + 1);
    expect(out.writeRoot).toBe(ROOT);
    expect(ran).toEqual([]);
  });

  it('counts the size in bytes rather than in characters', async () => {
    // One character that is four bytes of UTF-8, repeated to just over the cap.
    const text = '\u{1F600}'.repeat(REMOTE_FILE_MAX_BYTES / 4 + 1);
    const out = await call({ contents: text });
    expect(out.outcome).toBe('tooLarge');
    expect(ran).toEqual([]);
  });

  it('answers outsideRoot for a file under another folder, and sends nothing', async () => {
    const out = await call({ path: '/etc/passwd' });
    expect(out).toEqual({
      outcome: 'outsideRoot',
      sha256: null,
      bytes: null,
      writeRoot: ROOT
    });
    expect(ran).toEqual([]);
  });

  it('sends the CONFIRMED folder and the path relative to it', async () => {
    answer = `wrote ${sha('hello')} 5`;
    const out = await call({ path: `${ROOT}/src/a.ts` });
    expect(ran).toHaveLength(1);
    expect(ran[0]?.id).toBe('file-put');
    expect(ran[0]?.args[0]).toBe(ROOT);
    expect(ran[0]?.args[1]).toBe('src/a.ts');
    expect(ran[0]?.args[3]).toBe(Buffer.from('hello', 'utf8').toString('base64'));
    expect(out.outcome).toBe('wrote');
    expect(out.sha256).toBe(sha('hello'));
    expect(out.bytes).toBe(5);
  });

  it('sends the word new unchanged', async () => {
    answer = `wrote ${sha('')} 0`;
    await call({ contents: '', expect: 'new' });
    expect(ran[0]?.args[2]).toBe('new');
  });

  it('reports the five refusals the machine makes', async () => {
    for (const word of ['missing', 'exists', 'nomode', 'nosum']) {
      ran = [];
      answer = `${word} none none`;
      const out = await call();
      expect(out.outcome).toBe(word);
      expect(out.sha256).toBeNull();
      expect(out.writeRoot).toBe(ROOT);
    }
    ran = [];
    answer = `stale ${sha('somebody else wrote this')} none`;
    expect((await call()).outcome).toBe('stale');
  });

  it('reads a stale answer carrying the payload checksum as a success', async () => {
    // THE PROPERTY THAT MAKES A SAVE SAFE TO RUN TWICE. The first attempt wrote
    // and its answer was lost. The second attempt finds the file already
    // carrying the checksum of the payload, so the write landed.
    answer = `stale ${sha('hello')} none`;
    const out = await call({ contents: 'hello' });
    expect(out.outcome).toBe('wrote');
    expect(out.sha256).toBe(sha('hello'));
    expect(out.bytes).toBe(5);
  });

  it('refuses an answer it cannot read, rather than guessing at it', async () => {
    answer = 'the machine said something else entirely';
    await expect(call()).rejects.toThrow(/did not say what it did/);
  });

  it('never says nothing was written when the answer was lost', async () => {
    // MEASURED, build/probe-p101-save.mjs leg 14. A real ssh was killed over a
    // real link mid write and the far side replaced the file in full.
    answer = '__throw__';
    const said = await call().then(
      () => 'it did not refuse at all',
      (err: unknown) =>
        String(
          (err as { payload?: { message?: string } }).payload?.message ??
            (err as Error).message
        )
    );
    expect(said).toContain('may have been saved there');
    expect(said).not.toContain('Nothing was written');
    // Short enough for the renderer to show it rather than its own fallback.
    // `errorSentence` in ../../../renderer/editor/tab-io.ts drops a first line
    // over 160 characters, and this is the sentence a person has to read.
    expect(said.length).toBeLessThan(160);
  });

  it('holds the timeout at the number the image write uses', () => {
    expect(REMOTE_FILE_PUT_TIMEOUT_MS).toBe(60_000);
  });

  // FIX ROUND. A verifier proved the script could answer `nosum` after the
  // bytes had landed, which main reported as "Nothing was written." while the
  // file on the other computer held the payload. The script now runs the
  // checksum program before either arm and prints `unsure` for the one case it
  // cannot describe. These two tests pin what main does with that word.
  it('never turns unsure into an outcome, because nobody can say', async () => {
    answer = 'unsure none none';
    expect(parseFilePutAnswer(answer)).toBeNull();
  });

  it('says it cannot tell whether the file was saved, and never that nothing was', async () => {
    answer = 'unsure none none';
    const said = await call().then(
      () => 'it did not refuse at all',
      (err: unknown) => String((err as Error).message)
    );
    expect(said).toContain('cannot tell you whether it was saved');
    expect(said).not.toContain('Nothing was written');
  });
});

describe('the file-put script text', () => {
  const text =
    REMOTE_SCRIPTS.find((script) => script.id === 'file-put')?.text ?? '';

  it('prints no word that means nothing was written after the line that writes', () => {
    // The property, read out of the shipped text. `nosum`, `stale`, `missing`,
    // `exists` and `nomode` all reach a person as a sentence ending "Nothing
    // was written." so every one of them has to be decided above the write.
    const firstWrite = text.indexOf('> "$t"');
    expect(firstWrite).toBeGreaterThan(0);
    for (const word of ['nosum', 'stale', 'missing', 'exists', 'nomode']) {
      expect(text.indexOf(word, firstWrite)).toBe(-1);
    }
  });

  it('runs the checksum program before either arm rather than only finding it', () => {
    // Finding a program says nothing about whether it answers. The old text
    // only ran `command -v`, so a shasum that exits 0 and prints nothing got
    // past this point and the script wrote the file before it found out.
    const armStart = text.indexOf('if [ "$3" = new ]; then');
    expect(armStart).toBeGreaterThan(0);
    const probe = text.slice(0, armStart);
    expect(probe).toContain('command -v shasum');
    expect(probe).toContain('k=$("$p"');
    expect(probe).toContain('/dev/null');
    expect(probe).toContain('if [ -z "$k" ]; then');
    expect(probe).toContain('nosum');
  });

  it('uses one argument form everywhere, so no sha1 can be reported as a sha256', () => {
    // `shasum` without `-a 256` is sha1. The old text fell back to the bare
    // form per call, which could have reported a sha1 as the file's new
    // checksum. The form is now chosen once, by the probe.
    expect(text).toContain('if [ -n "$k" ]; then a="-a 256"; fi');
    expect(text).not.toContain('c=$("$p" -a 256 "$f"');
    expect(text.match(/c=\$\("\$p" \$a "\$f"/g)?.length).toBe(2);
  });
});
