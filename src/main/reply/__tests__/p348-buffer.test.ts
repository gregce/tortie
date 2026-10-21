/**
 * THE ONE BUFFER HELPER (Phase 348, build/p348/SPEC.md D52): `loadWords` and
 * `dropWords` in src/main/reply/buffer.ts, which the message (`say`) and the
 * paste both call, so there is one spelling of the words' one sink, standard
 * input.
 *
 *  - the load is `load-buffer -b <prefix><32 hex> -` with the words as its
 *    stdin, byte for byte, and no argv element derived from them;
 *  - the name is one of the two prefixes and 16 random bytes, fresh each time;
 *  - a load that fails drops its own name before the throw reaches the caller;
 *  - a drop that fails is swallowed, synchronously or not;
 *  - say still loads before it reads, pastes in its one list, and drops the
 *    buffer in its finally on every path the paste did not take it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dropWords, loadWords, PASTE_BUFFER_PREFIX, SAY_BUFFER_PREFIX, type WordsRun } from '../buffer';

interface Call {
  readonly args: readonly string[];
  readonly stdin: Buffer | undefined;
}

function recorder(fail: (args: readonly string[]) => boolean = () => false): { run: WordsRun; calls: Call[] } {
  const calls: Call[] = [];
  const run: WordsRun = async (args, options) => {
    calls.push({ args, stdin: options?.stdin });
    if (fail(args)) throw new Error('tmux refused');
    return '';
  };
  return { run, calls };
}

describe('loadWords', () => {
  it('loads the words from standard input into a buffer it names, and answers the name', async () => {
    const { run, calls } = recorder();
    const words = 'line one\nline two\t# 中 é';
    const name = await loadWords(run, PASTE_BUFFER_PREFIX, words);
    expect(name).toMatch(/^tortie-paste-[0-9a-f]{32}$/);
    expect(calls).toEqual([{ args: ['load-buffer', '-b', name, '-'], stdin: Buffer.from(words, 'utf8') }]);
    // No argv element is the words, or any part of them.
    for (const arg of calls[0]?.args ?? []) expect(words.includes(arg) && arg.length > 1).toBe(false);
  });

  it('names say’s buffers tortie-say- and the paste’s tortie-paste-, each fresh', async () => {
    const { run } = recorder();
    expect(SAY_BUFFER_PREFIX).toBe('tortie-say-');
    expect(PASTE_BUFFER_PREFIX).toBe('tortie-paste-');
    const a = await loadWords(run, SAY_BUFFER_PREFIX, 'x');
    const b = await loadWords(run, SAY_BUFFER_PREFIX, 'x');
    expect(a).toMatch(/^tortie-say-[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it('a load that fails drops that very name before the throw reaches the caller', async () => {
    const { run, calls } = recorder((args) => args[0] === 'load-buffer');
    await expect(loadWords(run, PASTE_BUFFER_PREFIX, 'secret words')).rejects.toThrow();
    expect(calls.map((c) => c.args[0])).toEqual(['load-buffer', 'delete-buffer']);
    expect(calls[1]?.args).toEqual(['delete-buffer', '-b', calls[0]?.args[2]]);
    expect(calls[1]?.stdin).toBeUndefined();
  });

  it('a load whose runner throws synchronously is dropped too', async () => {
    const calls: string[] = [];
    const run: WordsRun = (args) => {
      calls.push(args[0] ?? '');
      if (args[0] === 'load-buffer') throw new Error('sync');
      return Promise.resolve('');
    };
    await expect(loadWords(run, SAY_BUFFER_PREFIX, 'x')).rejects.toThrow('sync');
    expect(calls).toEqual(['load-buffer', 'delete-buffer']);
  });
});

describe('dropWords', () => {
  it('deletes the buffer by its name and swallows a refusal, synchronous or not', async () => {
    const { run, calls } = recorder(() => true);
    await expect(dropWords(run, 'tortie-paste-00')).resolves.toBeUndefined();
    expect(calls).toEqual([{ args: ['delete-buffer', '-b', 'tortie-paste-00'], stdin: undefined }]);
    const sync: WordsRun = () => {
      throw new Error('sync');
    };
    await expect(dropWords(sync, 'tortie-say-00')).resolves.toBeUndefined();
  });
});

describe('the one sink, read as text (Y3, Y4 widened)', () => {
  it('buffer.ts alone spells load-buffer and delete-buffer in the reply domain; writer.ts reaches them through the helper', () => {
    const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const helper = strip(readFileSync(join(__dirname, '..', 'buffer.ts'), 'utf8'));
    const writer = strip(readFileSync(join(__dirname, '..', 'writer.ts'), 'utf8'));
    expect(helper.match(/'load-buffer'/g)).toHaveLength(1);
    expect(helper.match(/'delete-buffer'/g)).toHaveLength(1);
    expect(helper).toMatch(/randomBytes\(16\)/);
    expect(writer).not.toMatch(/'load-buffer'|'delete-buffer'|randomBytes/);
    expect(writer).toMatch(/loadWords\(run, SAY_BUFFER_PREFIX, input\.text\)/);
    expect(writer).toMatch(/finally \{[\s\S]*?dropWords\(run, name\)/);
  });
});
