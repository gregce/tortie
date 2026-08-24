/**
 * The commit graph of one folder on another machine (Phase 107).
 *
 * Two halves, tested two ways.
 *
 * The PURE half is `parseRepoHistoryAnswer` and `clampHistoryCount`, and both
 * are tested for real. A wrong answer in the parser is a commit subject drawn
 * on screen that nobody wrote, or plausible nonsense where a commit name should
 * be. A wrong answer in the clamp is a person asking one machine for 20,000
 * commits, which is 5,400,000 base64 bytes in one answer that main buffers
 * whole.
 *
 * The READ crosses to another computer, so the door and the store are replaced
 * here. What these tests hold is the SHAPE: which script is asked for, what the
 * count sent is, which refusals send nothing at all, that the three honesty
 * fields are set and cleared for the right reasons, and that no state of a
 * machine ever throws. The live read is driven by
 * `node build/probe-p107-history.mjs` against a loopback scratch machine, where
 * the commit names are compared against what git itself prints in that folder.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers, how
 * many bytes an answer carries, or how long one takes. The probe measures all
 * three.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GRAPH_LOG_FORMAT } from '../../git';
import { REMOTE_HISTORY_MAX_COMMITS, REMOTE_HISTORY_PAGE } from '@shared/ipc';
import { remoteScript } from '../remote-scripts';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every remote read this file caused. It stays empty for every refusal. */
let reads: Array<{ script: string; args: string[] }> = [];
/** What the far side answers, or a throw standing in for a link that dropped. */
let readAnswer: () => string = () => 'repo none none none none none';
let answerBytes = 0;
let connected = new Set<string>();
let contextReady = new Set<string>();

vi.mock('../remote-run', () => ({
  machineIsConnected: (machineId: string) => connected.has(machineId),
  runRemoteRead: (
    _ctx: unknown,
    script: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    reads.push({ script, args: [...args] });
    return Promise.resolve({
      payload: readAnswer(),
      generation: 1,
      bytes: answerBytes
    });
  }
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => {
    if (!contextReady.has(machineId)) throw new Error('no connection');
    return { kind: 'remote', machineId };
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => (id === 'far' ? { id, label: 'Studio' } : null),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id
}));

const {
  REMOTE_HISTORY_TIMEOUT_MS,
  clampHistoryCount,
  parseRepoHistoryAnswer,
  readHistoryOnMachine
} = await import('../remote-history');

const US = '\x1f';
const SHA = (seed: string): string => seed.repeat(40).slice(0, 40);

/** One record in the format the far side prints, being GRAPH_LOG_FORMAT. */
function record(
  over: Partial<{
    hash: string;
    short: string;
    parents: string;
    author: string;
    email: string;
    at: string;
    decoration: string;
    subject: string;
  }> = {}
): string {
  const f = {
    hash: SHA('a'),
    short: 'aaaaaaa',
    parents: '',
    author: 'Ada',
    email: 'ada@example.invalid',
    at: '1700000000',
    decoration: '',
    subject: 'one commit',
    ...over
  };
  return [
    f.hash,
    f.short,
    f.parents,
    f.author,
    f.email,
    f.at,
    f.decoration,
    f.subject
  ].join(US);
}

/** A whole walk, as the far side encodes it. */
function walk(records: readonly string[]): string {
  return Buffer.from(records.join('\0'), 'utf8').toString('base64');
}

/** One `repo` answer, in the six words the far side prints. */
function answer(
  over: Partial<{
    head: string;
    upstream: string;
    base: string;
    log: string;
    sides: string;
  }> = {}
): string {
  const f = {
    head: 'none',
    upstream: 'none',
    base: 'none',
    log: 'none',
    sides: 'none',
    ...over
  };
  return `repo ${f.head} ${f.upstream} ${f.base} ${f.log} ${f.sides}`;
}

beforeEach(() => {
  reads = [];
  answerBytes = 0;
  readAnswer = () => answer();
  connected = new Set(['far']);
  contextReady = new Set(['far']);
});

// ---------------------------------------------------------------------------
// The parser. PURE, and tested for real
// ---------------------------------------------------------------------------

describe('parseRepoHistoryAnswer', () => {
  it('reads the four words the far side may print first', () => {
    for (const word of ['notrepo', 'missing', 'denied']) {
      const out = parseRepoHistoryAnswer(`${word} none none none none none`);
      expect(out?.mode, word).toBe(word);
      expect(out?.log).toBeNull();
      expect(out?.headSha).toBeNull();
    }
    expect(parseRepoHistoryAnswer(answer())?.mode).toBe('repo');
  });

  it('refuses a word nobody wrote down', () => {
    expect(
      parseRepoHistoryAnswer('nobranch none none none none none')
    ).toBeNull();
    expect(parseRepoHistoryAnswer('none none none none none none')).toBeNull();
    expect(parseRepoHistoryAnswer('')).toBeNull();
  });

  it('refuses an answer that is not six words', () => {
    expect(parseRepoHistoryAnswer('repo none none none none')).toBeNull();
    expect(
      parseRepoHistoryAnswer('repo none none none none none none')
    ).toBeNull();
  });

  it('refuses a field beside repo that is not none', () => {
    // The far side prints five `none` words on every branch that is not `repo`,
    // so anything else there is a shape this module does not recognise.
    expect(
      parseRepoHistoryAnswer('missing none none none something none')
    ).toBeNull();
  });

  it('reads the three commit names and refuses anything that is not one', () => {
    const out = parseRepoHistoryAnswer(
      answer({ head: SHA('a'), upstream: SHA('b'), base: SHA('c') })
    );
    expect(out?.headSha).toBe(SHA('a'));
    expect(out?.upstreamSha).toBe(SHA('b'));
    expect(out?.mergeBase).toBe(SHA('c'));
    // A commit name that is the wrong length, or holds a character git never
    // prints, makes the WHOLE answer unreadable rather than one field null.
    expect(parseRepoHistoryAnswer(answer({ head: 'aaaa' }))).toBeNull();
    expect(parseRepoHistoryAnswer(answer({ head: 'g'.repeat(40) }))).toBeNull();
    expect(
      parseRepoHistoryAnswer(answer({ upstream: '../../etc/passwd' }))
    ).toBeNull();
  });

  it('accepts a commit name of 64 characters, which is what SHA-256 prints', () => {
    const long = 'f'.repeat(64);
    expect(parseRepoHistoryAnswer(answer({ head: long }))?.headSha).toBe(long);
  });

  it('decodes the walk and the marks', () => {
    const out = parseRepoHistoryAnswer(
      answer({ log: walk([record()]), sides: walk(['<' + SHA('a')]) })
    );
    expect(out?.log).toContain('one commit');
    expect(out?.sides).toBe('<' + SHA('a'));
  });

  it('refuses a base64 field holding a character base64 never uses', () => {
    // `Buffer.from` DROPS a character it does not know and hands back plausible
    // nonsense. A person reading a commit subject cannot tell nonsense from a
    // subject, so the whole answer is refused instead.
    expect(parseRepoHistoryAnswer(answer({ log: 'not!base64' }))).toBeNull();
    expect(parseRepoHistoryAnswer(answer({ sides: 'a b' }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The clamp. PURE, and it is what keeps this phase at tier 2
// ---------------------------------------------------------------------------

describe('clampHistoryCount', () => {
  it('holds every value between 1 and the ceiling', () => {
    expect(clampHistoryCount(0)).toBe(1);
    expect(clampHistoryCount(-40)).toBe(1);
    expect(clampHistoryCount(1)).toBe(1);
    expect(clampHistoryCount(50)).toBe(50);
    expect(clampHistoryCount(500)).toBe(500);
    expect(clampHistoryCount(501)).toBe(500);
    expect(clampHistoryCount(20_000)).toBe(500);
  });

  it('answers the page for a value that is not a number', () => {
    // Infinity is not a count anybody meant, so it lands with the other two
    // rather than being read as a request for the ceiling.
    expect(clampHistoryCount(undefined)).toBe(REMOTE_HISTORY_PAGE);
    expect(clampHistoryCount(Number.NaN)).toBe(REMOTE_HISTORY_PAGE);
    expect(clampHistoryCount(Number.POSITIVE_INFINITY)).toBe(
      REMOTE_HISTORY_PAGE
    );
  });

  it('floors a value that is not whole', () => {
    expect(clampHistoryCount(50.9)).toBe(50);
  });

  it('is the same two numbers the shared contract publishes', () => {
    expect(REMOTE_HISTORY_PAGE).toBe(50);
    expect(REMOTE_HISTORY_MAX_COMMITS).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// The far side script, read from the catalogue rather than copied here
// ---------------------------------------------------------------------------

describe('the script this module sends', () => {
  it('asks with the format the shared parser reads', () => {
    const text = remoteScript('repo-history')?.text ?? '';
    const format = /--format='([^']*)'/.exec(text)?.[1] ?? '';
    expect(format).toBe(GRAPH_LOG_FORMAT);
  });

  it('walks branches, tags and remote branches, and never stdin', () => {
    const text = remoteScript('repo-history')?.text ?? '';
    expect(text).toContain('--branches --tags --remotes');
    // `git log --stdin` WALKS HEAD WHEN ITS INPUT IS EMPTY, and it does so
    // silently, so a repository with no refs would answer a HEAD only walk
    // while this end believed it asked for everything.
    expect(text).not.toContain('--stdin');
    expect(text).not.toContain('--all');
  });
});

// ---------------------------------------------------------------------------
// The read. The door is replaced, so what is held here is the SHAPE
// ---------------------------------------------------------------------------

describe('readHistoryOnMachine', () => {
  it('asks for repo-history, the folder and one more than the page', () => {
    return readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' }).then(() => {
      expect(reads).toHaveLength(1);
      expect(reads[0]?.script).toBe('repo-history');
      expect(reads[0]?.args).toEqual(['/w/p', '51']);
    });
  });

  it('sends the clamped count plus one, never what the caller asked', async () => {
    await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p', maxCount: 20_000 });
    expect(reads[0]?.args[1]).toBe('501');
    reads = [];
    await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p', maxCount: 0 });
    expect(reads[0]?.args[1]).toBe('2');
  });

  it('sends nothing at all while Tortie is not signed in', async () => {
    connected = new Set();
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('notConnected');
    expect(reads).toHaveLength(0);
  });

  it('sends nothing at all when the connection is not ready', async () => {
    contextReady = new Set();
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('notConnected');
    expect(reads).toHaveLength(0);
  });

  it('sends nothing for a path that is not absolute', async () => {
    // A relative path names nothing on that machine, because the far side's
    // shell would resolve it against whatever folder it started in.
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: 'work/p' });
    expect(out.mode).toBe('missing');
    expect(reads).toHaveLength(0);
  });

  it('answers unreachable rather than throwing when the link drops', async () => {
    readAnswer = () => {
      throw new Error('the link went away');
    };
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('unreachable');
    expect(out.entries).toEqual([]);
  });

  it('answers unreachable for a payload nothing could read', async () => {
    readAnswer = () => 'this is not an answer';
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('unreachable');
  });

  it('carries every word the far side prints into its own mode', async () => {
    for (const [word, mode] of [
      ['notrepo', 'notRepo'],
      ['missing', 'missing'],
      ['denied', 'denied']
    ] as const) {
      readAnswer = () => `${word} none none none none none`;
      const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
      expect(out.mode, word).toBe(mode);
      expect(out.entries, word).toEqual([]);
    }
  });

  it('answers noCommits for a repository the walk found nothing in', async () => {
    // ONE WORD FOR TWO CAUSES. A repository with no commits yet, and one with
    // no branches, tags or remote branches to walk from.
    readAnswer = () => answer();
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('noCommits');
    expect(out.entries).toEqual([]);
    expect(out.hasMore).toBe(false);
  });

  it('reads the commits and carries the machine label', async () => {
    readAnswer = () =>
      answer({
        log: walk([
          record({ hash: SHA('a'), subject: 'newest' }),
          record({ hash: SHA('b'), subject: 'older' })
        ])
      });
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.mode).toBe('ok');
    expect(out.machineLabel).toBe('Studio');
    expect(out.entries.map((one) => one.subject)).toEqual(['newest', 'older']);
    expect(out.ceiling).toBe(REMOTE_HISTORY_MAX_COMMITS);
    expect(out.maxCount).toBe(REMOTE_HISTORY_PAGE);
  });

  it('uses the machine id when there is no row to read a label from', async () => {
    connected = new Set(['other']);
    contextReady = new Set(['other']);
    const out = await readHistoryOnMachine({ machineId: 'other', cwd: '/w/p' });
    expect(out.machineLabel).toBe('other');
  });

  // -------------------------------------------------------------------------
  // THE THREE HONESTY FIELDS. Phase 99 carried a flag the panel never read
  // -------------------------------------------------------------------------

  it('sets hasMore and drops the extra commit when one more arrived', async () => {
    const records = Array.from({ length: 4 }, (_, at) =>
      record({ hash: SHA(String(at)), subject: `commit ${String(at)}` })
    );
    readAnswer = () => answer({ log: walk(records) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: 3
    });
    expect(reads[0]?.args[1]).toBe('4');
    expect(out.entries).toHaveLength(3);
    expect(out.hasMore).toBe(true);
    expect(out.entries.map((one) => one.subject)).toEqual([
      'commit 0',
      'commit 1',
      'commit 2'
    ]);
  });

  it('clears hasMore when the walk ended inside the page', async () => {
    readAnswer = () => answer({ log: walk([record(), record({ hash: SHA('b') })]) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: 3
    });
    expect(out.entries).toHaveLength(2);
    expect(out.hasMore).toBe(false);
    expect(out.atCeiling).toBe(false);
  });

  it('sets atCeiling only at the ceiling and only with older commits behind it', async () => {
    // Each record needs its own commit name, because `parseGraphLog` keys on it.
    const unique = Array.from(
      { length: REMOTE_HISTORY_MAX_COMMITS + 1 },
      (_, at) =>
        record({
          hash: String(at).padStart(40, '0'),
          subject: `c${String(at)}`
        })
    );
    readAnswer = () => answer({ log: walk(unique) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: REMOTE_HISTORY_MAX_COMMITS
    });
    expect(out.entries).toHaveLength(REMOTE_HISTORY_MAX_COMMITS);
    expect(out.hasMore).toBe(true);
    expect(out.atCeiling).toBe(true);
    expect(out.maxCount).toBe(REMOTE_HISTORY_MAX_COMMITS);
  });

  it('clears atCeiling below the ceiling even when there are older commits', async () => {
    const unique = Array.from({ length: 60 }, (_, at) =>
      record({ hash: String(at).padStart(40, '0'), subject: `c${String(at)}` })
    );
    readAnswer = () => answer({ log: walk(unique) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: 50
    });
    expect(out.hasMore).toBe(true);
    expect(out.atCeiling).toBe(false);
  });

  it('sets divergenceTruncated when the marks came back at their own cap', async () => {
    const unique = Array.from({ length: 3 }, (_, at) =>
      record({ hash: String(at).padStart(40, '0') })
    );
    // The marks are asked for with the same count as the walk, being 4 here, so
    // four lines means the far side stopped printing rather than finished.
    const sides = Array.from({ length: 4 }, (_, at) =>
      '<' + String(at).padStart(40, '0')
    ).join('\n');
    readAnswer = () => answer({ log: walk(unique), sides: walk([sides]) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: 3
    });
    expect(out.divergenceTruncated).toBe(true);
  });

  it('clears divergenceTruncated when fewer marks arrived than were asked for', async () => {
    const unique = Array.from({ length: 3 }, (_, at) =>
      record({ hash: String(at).padStart(40, '0') })
    );
    const sides = ['<' + String(0).padStart(40, '0')].join('\n');
    readAnswer = () => answer({ log: walk(unique), sides: walk([sides]) });
    const out = await readHistoryOnMachine({
      machineId: 'far',
      cwd: '/w/p',
      maxCount: 3
    });
    expect(out.divergenceTruncated).toBe(false);
  });

  it('clears all three honesty fields when nothing was cut', async () => {
    readAnswer = () => answer({ log: walk([record()]) });
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.hasMore).toBe(false);
    expect(out.atCeiling).toBe(false);
    expect(out.divergenceTruncated).toBe(false);
  });

  // -------------------------------------------------------------------------
  // The marks, the anchors and the bytes
  // -------------------------------------------------------------------------

  it('marks the commits the far side put on each side of the divergence', async () => {
    const ours = String(1).padStart(40, '0');
    const theirs = String(2).padStart(40, '0');
    readAnswer = () =>
      answer({
        head: SHA('a'),
        upstream: SHA('b'),
        base: SHA('c'),
        log: walk([record({ hash: ours }), record({ hash: theirs })]),
        sides: walk([`<${ours}\n>${theirs}`])
      });
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.entries[0]?.unpushed).toBe(true);
    expect(out.entries[1]?.unpulled).toBe(true);
    expect(out.markedCount).toBe(2);
    expect(out.headSha).toBe(SHA('a'));
    expect(out.upstreamSha).toBe(SHA('b'));
    expect(out.mergeBase).toBe(SHA('c'));
  });

  it('counts no marks when the far side sent none', async () => {
    readAnswer = () => answer({ log: walk([record()]) });
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.markedCount).toBe(0);
    expect(out.headSha).toBeNull();
    expect(out.upstreamSha).toBeNull();
    expect(out.mergeBase).toBeNull();
  });

  it('reports the bytes the answer carried and a wall time', async () => {
    answerBytes = 4_211;
    readAnswer = () => answer({ log: walk([record()]) });
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.answerBytes).toBe(4_211);
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(out.readAt).toBeGreaterThan(0);
  });

  it('reports zero bytes for every answer that sent nothing', async () => {
    connected = new Set();
    const out = await readHistoryOnMachine({ machineId: 'far', cwd: '/w/p' });
    expect(out.answerBytes).toBe(0);
  });

  it('names its own deadline rather than inheriting the door’s', () => {
    expect(REMOTE_HISTORY_TIMEOUT_MS).toBe(20_000);
  });
});
