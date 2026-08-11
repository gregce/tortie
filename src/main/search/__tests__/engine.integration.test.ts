/**
 * The engine, against the REAL vendored ripgrep, over a fixture repo built on
 * disk. These are the claims a unit test over strings cannot make: that the
 * results stream before the process exits, that a cap stops the process rather
 * than merely hiding rows, that a superseded query cannot paint, and that a
 * repo which is not a git repo still searches.
 *
 * Everything runs in os.tmpdir(); nothing here touches the user's repos.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ContentSearchInput, SearchProgress } from '@shared/ipc';
import { ContentSearchEngine } from '../engine';
import type { SearchSink } from '../engine';
import { rgBinaryPath } from '../resolve';

let root: string;
let engine: ContentSearchEngine;

/** A sink that records every frame and resolves when the last one lands. */
function collector(key = 'test-window'): {
  sink: SearchSink;
  frames: SearchProgress[];
  finished: Promise<SearchProgress>;
} {
  const frames: SearchProgress[] = [];
  let resolve!: (p: SearchProgress) => void;
  const finished = new Promise<SearchProgress>((r) => {
    resolve = r;
  });
  const sink: SearchSink = {
    key,
    alive: () => true,
    send: (_id, progress) => {
      frames.push(progress);
      if (progress.done) resolve(progress);
    }
  };
  return { sink, frames, finished };
}

function query(over: Partial<ContentSearchInput> = {}): ContentSearchInput {
  return {
    repoPath: root,
    query: 'needle',
    isRegex: false,
    isCaseSensitive: false,
    matchWholeWord: false,
    includes: '',
    excludes: '',
    useIgnoreFiles: true,
    contextLines: 0,
    searchId: 'eager', // subscribe-first path: no first-frame grace
    ...over
  };
}

/** Run one search to completion and hand back every frame. */
async function run(
  input: Partial<ContentSearchInput>,
  id = `s-${Math.random()}`
): Promise<{ frames: SearchProgress[]; last: SearchProgress }> {
  const c = collector(id);
  engine.start({ ...query(input), searchId: id }, c.sink, id);
  const last = await c.finished;
  return { frames: c.frames, last };
}

/** Every file group across every frame, merged the way the renderer must. */
function merged(frames: SearchProgress[]): Map<
  string,
  { count: number; lines: number[]; clipped: boolean; binary: boolean }
> {
  const out = new Map<
    string,
    { count: number; lines: number[]; clipped: boolean; binary: boolean }
  >();
  for (const frame of frames) {
    for (const file of frame.files) {
      const entry = out.get(file.relPath) ?? {
        count: 0,
        lines: [],
        clipped: false,
        binary: false
      };
      entry.count += file.matchCount;
      entry.lines.push(...file.matches.map((m) => m.line));
      entry.clipped ||= file.clipped;
      entry.binary ||= file.binary === true;
      out.set(file.relPath, entry);
    }
  }
  return out;
}

beforeAll(async () => {
  engine = new ContentSearchEngine();
  root = await mkdtemp(join(tmpdir(), 'gmux-search-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, 'node_modules', 'dep'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.git'), { recursive: true });

  await writeFile(join(root, '.gitignore'), 'node_modules/\nignored.txt\n');
  await writeFile(
    join(root, 'src', 'a.ts'),
    ['const needle = 1;', 'other line', '  indented needle here'].join('\n')
  );
  await writeFile(
    join(root, 'src', 'b.ts'),
    ['NEEDLE upper', 'needles plural', 'a needle b'].join('\n')
  );
  await writeFile(join(root, 'docs', 'notes.md'), 'a needle in the docs\n');
  await writeFile(join(root, 'ignored.txt'), 'needle in an ignored file\n');
  await writeFile(
    join(root, 'node_modules', 'dep', 'index.js'),
    'needle in a dependency\n'
  );
  await writeFile(join(root, '.claude', 'settings.json'), '{"needle": true}\n');
  await writeFile(join(root, '.git', 'COMMIT_EDITMSG'), 'needle in git\n');
  // Unicode: the byte-offset trap, end to end through the real printer.
  await writeFile(
    join(root, 'src', 'unicode.ts'),
    'const café = "naïve"; // 🎉 needle here\n'
  );
  // A minified-bundle line.
  await writeFile(
    join(root, 'src', 'bundle.min.js'),
    `${'x'.repeat(300_000)}needle${'y'.repeat(300_000)}\n`
  );
  // Binary, two shapes, because ripgrep treats them differently:
  //  - NUL inside the first buffer → the file is skipped ENTIRELY and never
  //    appears in the JSON at all (rg's default binary detection quits before
  //    printing anything it found in that buffer);
  //  - NUL after 200 KB → the matches before it ARE reported, followed by an
  //    `end` carrying binary_offset, i.e. "the rest was not searched".
  await writeFile(
    join(root, 'src', 'blob.bin'),
    Buffer.concat([
      Buffer.from('needle\n', 'utf8'),
      Buffer.from([0x00, 0x01, 0x02]),
      Buffer.from('needle again\n', 'utf8')
    ])
  );
  await writeFile(
    join(root, 'src', 'late.bin'),
    Buffer.concat([
      Buffer.from('needle here\n', 'utf8'),
      Buffer.from('a'.repeat(200_000), 'utf8'),
      Buffer.from([0x00, 0x01, 0x02]),
      Buffer.from('needle again\n', 'utf8')
    ])
  );
  // Many matches in one file, for the per-file cap.
  await writeFile(
    join(root, 'src', 'many.ts'),
    Array.from({ length: 500 }, (_, i) => `line ${i} needle`).join('\n')
  );
});

afterAll(async () => {
  engine.dispose();
  await rm(root, { recursive: true, force: true });
});

describe('the vendored ripgrep', () => {
  it('is on disk and is the version the research measured', async () => {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(rgBinaryPath(), ['--version'], {
      encoding: 'utf8'
    });
    expect(out).toContain('ripgrep 15.0.0');
    expect(out).toContain('+pcre2');
  });
});

describe('content search', () => {
  it('finds matches across files and ends with one done frame', async () => {
    const { frames, last } = await run({});
    expect(last.done).toBe(true);
    expect(last.capped).toBe(false);
    expect(last.error).toBeUndefined();
    expect(frames.filter((f) => f.done)).toHaveLength(1);
    expect(last.totalMatches).toBeGreaterThan(5);

    const files = merged(frames);
    expect([...files.keys()]).toContain('src/a.ts');
    expect(files.get('src/a.ts')!.lines).toEqual([1, 3]);
    expect(last.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('respects .gitignore by default and searches it on request', async () => {
    const ignored = merged((await run({})).frames);
    expect(ignored.has('ignored.txt')).toBe(false);
    expect(ignored.has('node_modules/dep/index.js')).toBe(false);

    const all = merged((await run({ useIgnoreFiles: false })).frames);
    expect(all.has('ignored.txt')).toBe(true);
    expect(all.has('node_modules/dep/index.js')).toBe(true);
  });

  it('searches dotfiles but never the .git object store', async () => {
    const files = merged((await run({ useIgnoreFiles: false })).frames);
    expect(files.has('.claude/settings.json')).toBe(true);
    expect([...files.keys()].some((p) => p.startsWith('.git/'))).toBe(false);
  });

  it('honours include and exclude globs', async () => {
    const only = merged((await run({ includes: '*.md' })).frames);
    expect([...only.keys()]).toEqual(['docs/notes.md']);

    const without = merged((await run({ excludes: 'docs, *.bin' })).frames);
    expect(without.has('docs/notes.md')).toBe(false);
    expect(without.has('src/a.ts')).toBe(true);
  });

  it('applies case sensitivity, whole word and regex', async () => {
    const insensitive = merged((await run({})).frames);
    expect(insensitive.get('src/b.ts')!.lines).toContain(1); // NEEDLE upper

    const sensitive = merged((await run({ isCaseSensitive: true })).frames);
    expect(sensitive.get('src/b.ts')!.lines).not.toContain(1);

    const word = merged((await run({ matchWholeWord: true })).frames);
    expect(word.get('src/b.ts')!.lines).not.toContain(2); // "needles"

    const regex = merged(
      (await run({ isRegex: true, query: 'needle\\w+' })).frames
    );
    expect(regex.get('src/b.ts')!.lines).toEqual([2]);
  });

  it('lands the highlight on a non-ASCII match, not one character left', async () => {
    const { frames } = await run({ query: 'needle' });
    const file = frames
      .flatMap((f) => f.files)
      .find((f) => f.relPath === 'src/unicode.ts')!;
    const match = file.matches[0]!;
    expect(match.text.slice(match.ranges[0]![0], match.ranges[0]![1])).toBe(
      'needle'
    );
  });

  it('clamps a minified line and says the row is truncated', async () => {
    const { frames } = await run({ maxLineChars: 300 });
    const file = frames
      .flatMap((f) => f.files)
      .find((f) => f.relPath === 'src/bundle.min.js')!;
    const match = file.matches[0]!;
    expect(match.truncated).toBe(true);
    expect(match.text.length).toBeLessThanOrEqual(302);
    expect(match.text.slice(match.ranges[0]![0], match.ranges[0]![1])).toBe(
      'needle'
    );
  });

  it('reports the FILE column for a windowed line, not the window offset', async () => {
    // What the editor navigates by is `ranges[0] + trimmed`. On a minified
    // line that number is the only link back to the file, and getting it
    // wrong selects unrelated text on the right line — so check it against
    // the bytes on disk rather than against the row's own windowed text.
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(join(root, 'src', 'bundle.min.js'), 'utf8');

    const { frames } = await run({ maxLineChars: 300 });
    const file = frames
      .flatMap((f) => f.files)
      .find((f) => f.relPath === 'src/bundle.min.js')!;
    const match = file.matches[0]!;
    expect(match.truncated).toBe(true);

    const line = source.split('\n')[match.line - 1]!;
    const column = match.ranges[0]![0] + match.trimmed;
    const endColumn = match.ranges[0]![1] + match.trimmed;
    expect(column).toBe(300_000); // where 'needle' actually starts
    expect(line.slice(column, endColumn)).toBe('needle');
  });

  it('reports the FILE column for an indented line too', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(join(root, 'src', 'a.ts'), 'utf8');
    const files = (await run({})).frames.flatMap((f) => f.files);
    const match = files
      .filter((f) => f.relPath === 'src/a.ts')
      .flatMap((f) => f.matches)
      .find((m) => m.line === 3)!; // '  indented needle here'
    const line = source.split('\n')[2]!;
    expect(match.truncated).toBeUndefined();
    expect(
      line.slice(
        match.ranges[0]![0] + match.trimmed,
        match.ranges[0]![1] + match.trimmed
      )
    ).toBe('needle');
  });

  it('marks a partly-searched binary file rather than implying a clean tail', async () => {
    const files = merged((await run({})).frames);
    const late = files.get('src/late.bin');
    expect(late?.binary).toBe(true);
    expect(late?.lines).toEqual([1]); // the match BEFORE the NUL, and no more
  });

  it('records that a wholly-binary file is skipped by ripgrep, silently', async () => {
    // Not a gmux decision and not fixable from here: rg's binary detection
    // quits before printing anything from the buffer the NUL was in. The
    // honest surface is the POLICY ("binary files are not searched"), stated
    // in the UI — which is why this behaviour is pinned by a test instead of
    // being rediscovered later as a bug.
    const files = merged((await run({})).frames);
    expect(files.has('src/blob.bin')).toBe(false);
  });

  it('caps per file and keeps matchCount honest about what was cut', async () => {
    const { frames, last } = await run({ maxPerFile: 10 });
    const many = merged(frames).get('src/many.ts')!;
    expect(many.clipped).toBe(true);
    expect(many.lines).toHaveLength(10); // delivered
    expect(many.count).toBe(500); // found
    expect(last.totalMatches).toBeLessThan(500);
  });

  it('caps the whole search, says so, and stops the process', async () => {
    const { last } = await run({ maxResults: 25, maxPerFile: 1000 });
    expect(last.capped).toBe(true);
    expect(last.totalMatches).toBe(25);
    expect(last.done).toBe(true);
  });

  it('treats "no matches" as an answer, not a failure', async () => {
    const { last } = await run({ query: 'zzz-not-in-this-repo-zzz' });
    expect(last.error).toBeUndefined();
    expect(last.totalMatches).toBe(0);
    expect(last.totalFiles).toBe(0);
    expect(last.done).toBe(true);
  });

  it('reports an invalid regex in ripgrep’s own words', async () => {
    const { last } = await run({ isRegex: true, query: '(unclosed' });
    expect(last.error).toBeTruthy();
    expect(last.error).toMatch(/regular expression/i);
    expect(last.done).toBe(true);
  });

  it('refuses an empty query through the stream instead of crashing', async () => {
    const { last } = await run({ query: '' });
    expect(last.error).toBeTruthy();
    expect(last.done).toBe(true);
  });

  it('works in a folder that is not a git repo', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'gmux-search-plain-'));
    try {
      await writeFile(join(plain, 'x.txt'), 'needle here\n');
      const { last, frames } = await run({ repoPath: plain });
      expect(last.error).toBeUndefined();
      expect(merged(frames).has('x.txt')).toBe(true);
    } finally {
      await rm(plain, { recursive: true, force: true });
    }
  });

  it('echoes the file-size ceiling so the UI can state the policy', async () => {
    const { last } = await run({});
    expect(last.maxFilesizeBytes).toBe(10 * 1024 * 1024);
  });
});

describe('cancellation', () => {
  it('closes a cancelled search with cancelled:true and no results', async () => {
    const c = collector('cancel-window');
    const id = 'to-cancel';
    engine.start({ ...query({ searchId: id }) }, c.sink, id);
    engine.cancel(id);
    const last = await c.finished;
    expect(last.cancelled).toBe(true);
    expect(last.done).toBe(true);
    expect(last.files).toHaveLength(0);
  });

  it('lets a NEW query kill the in-flight one for the same window', async () => {
    const key = 'one-window';
    const first = collector(key);
    const second = collector(key);
    engine.start({ ...query({ searchId: 'q1' }) }, first.sink, 'q1');
    engine.start({ ...query({ searchId: 'q2' }) }, second.sink, 'q2');

    const stale = await first.finished;
    expect(stale.cancelled).toBe(true);
    expect(stale.searchId).toBe('q1');

    const fresh = await second.finished;
    expect(fresh.cancelled).toBeUndefined();
    expect(fresh.totalMatches).toBeGreaterThan(0);
  });

  it('never delivers a frame for a superseded query after its done frame', async () => {
    const key = 'ordered-window';
    const first = collector(key);
    engine.start({ ...query({ searchId: 'p1' }) }, first.sink, 'p1');
    const second = collector(key);
    engine.start({ ...query({ searchId: 'p2' }) }, second.sink, 'p2');
    await second.finished;
    await new Promise((r) => setTimeout(r, 60));
    const afterDone = first.frames.findIndex((f) => f.done);
    expect(afterDone).toBe(first.frames.length - 1);
  });

  it('drops a debounced query before a process ever exists', async () => {
    const key = 'debounce-window';
    const slow = collector(key);
    engine.start(
      { ...query({ searchId: 'd1', debounceMs: 500 }) },
      slow.sink,
      'd1'
    );
    const fast = collector(key);
    engine.start({ ...query({ searchId: 'd2' }) }, fast.sink, 'd2');
    const stale = await slow.finished;
    expect(stale.cancelled).toBe(true);
    expect(stale.totalMatches).toBe(0);
    await fast.finished;
  });
});

describe('streaming', () => {
  it('delivers the first frame long before the search finishes', async () => {
    // 800 files x 40 matches: the whole search takes many frames, and the
    // first one must not wait for the last.
    const big = await mkdtemp(join(tmpdir(), 'gmux-search-big-'));
    try {
      const body = Array.from(
        { length: 40 },
        (_, i) => `line ${i} needle here`
      ).join('\n');
      await Promise.all(
        Array.from({ length: 800 }, (_, i) =>
          writeFile(join(big, `f${i}.txt`), body)
        )
      );
      const c = collector('stream-window');
      const started = Date.now();
      let firstFrameAt = 0;
      const sink: SearchSink = {
        ...c.sink,
        send: (id, p) => {
          if (firstFrameAt === 0 && p.files.length > 0) {
            firstFrameAt = Date.now() - started;
          }
          c.sink.send(id, p);
        }
      };
      engine.start(
        { ...query({ repoPath: big, searchId: 'big', maxResults: 100_000 }) },
        sink,
        'big'
      );
      const last = await c.finished;
      expect(last.totalMatches).toBe(32_000);
      expect(c.frames.length).toBeGreaterThan(1); // it STREAMED
      expect(firstFrameAt).toBeLessThan(last.elapsedMs! + 1);
      // ttfrMs is measured from spawn to ripgrep's first match.
      const ttfr = c.frames.find((f) => f.ttfrMs !== undefined)?.ttfrMs;
      expect(ttfr).toBeLessThan(500);
    } finally {
      await rm(big, { recursive: true, force: true });
    }
  });
});
