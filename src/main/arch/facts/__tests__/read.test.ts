/**
 * The per file reader (Phase 257): identity, ordering, the family precedence,
 * the wrapper arm's "minus base", and the setting's one reader.
 */

import { describe, expect, it } from 'vitest';
import { noArchChosen } from '@shared/settings';
import type { ExtractedWrapper } from '../../../symbols/extract';
import { readFacts, readWrapFacts, type FactReadInput } from '../read';
import { closeWrappers } from '../wrappers';
import { wrapperPassOn } from '../wrapper-setting';
import { site } from './site';

const TEXT = ["import { handle } from './typed-ipc';", "ipcMain.handle('a:b', fn);", "handle(ipc, 'c:d', fn);", "throw new Error('no key here');", "fetch('https://api.example');"].join('\n');

function input(relPath: string, over: Partial<FactReadInput> = {}): FactReadInput {
  return {
    relPath,
    lang: 'typescript',
    text: TEXT,
    calls: [
      site('ipcMain.handle', ['a:b', null], { line: 2 }),
      site('handle', [null, 'c:d', null], { line: 3 }),
      site('Error', ['no key here'], { form: 'new', line: 4 }),
      site('fetch', ['https://api.example'], { line: 5 })
    ],
    ...over
  };
}

describe('readFacts', () => {
  it('reads one file into a sorted, deduped list with evidence from the cited line', () => {
    const facts = readFacts(input('src/main/ipc.ts'));
    expect(facts.map((f) => `${f.line} ${f.rule} ${f.subject}`)).toEqual([
      '2 surface.ipc.electron IPC serves a:b',
      '4 gate.refusal refuses: no key here',
      '5 network.client talks to https://api.example'
    ]);
    expect(facts[0]?.evidence).toBe("ipcMain.handle('a:b', fn);");
  });

  it('identity: the same bytes at the same path give the same bytes with the calls reversed', () => {
    const a = JSON.stringify(readFacts(input('src/main/ipc.ts')));
    const reversed = input('src/main/ipc.ts');
    const b = JSON.stringify(readFacts({ ...reversed, calls: [...reversed.calls].reverse() }));
    expect(b).toBe(a);
  });

  it('the same bytes at a test path differ by exactly the test path refusals', () => {
    const src = readFacts(input('src/x.ts')).map((f) => f.rule);
    const test = readFacts(input('test/x.test.ts')).map((f) => f.rule);
    expect(src).toEqual(['surface.ipc.electron', 'gate.refusal', 'network.client']);
    expect(test).toEqual([]);
  });

  it('a manifest path takes the manifest rules and ignores its call sites', () => {
    const facts = readFacts({ relPath: 'setup.py', lang: 'python', text: "entry_points={'console_scripts': [\n  'a = b:c',\n]}\nsubprocess.run(['ls'])", calls: [site('subprocess.run', [null], { line: 4 })] });
    expect(facts.map((f) => f.rule)).toEqual(['entrypoint.py.scripts', 'entrypoint.py.script']);
  });

  it('a file with no text still has its path facts; a non grammar file has only them', () => {
    expect(readFacts({ relPath: 'src/index.ts', lang: 'typescript', text: null, calls: [] }).map((f) => f.rule)).toEqual([
      'boundary.path.module-root',
      'entrypoint.path.by-name'
    ]);
    expect(readFacts({ relPath: 'docs/x.md', lang: null, text: '# hi', calls: [] })).toEqual([]);
  });

  it('caps a subject at 160 and evidence at 200', () => {
    const long = 'a'.repeat(300);
    const facts = readFacts({ relPath: 'src/x.ts', lang: 'typescript', text: `db.exec('INSERT INTO ${long} VALUES (1)')`, calls: [site('db.exec', [`INSERT INTO ${long} VALUES (1)`])] });
    expect(facts[0]?.subject).toHaveLength(160);
    expect(facts[0]?.evidence).toHaveLength(200);
  });

  it('carries hostile bytes into a subject verbatim and does nothing else', () => {
    const facts = readFacts({ relPath: 'src/x.ts', lang: 'typescript', text: 'x', calls: [site('ipcMain.handle', ['$(touch /tmp/p)', null])] });
    expect(facts[0]?.subject).toBe('IPC serves $(touch /tmp/p)');
  });
});

describe('readWrapFacts', () => {
  const typed: ExtractedWrapper = { name: 'handle', innerCallee: 'ipc.handle', innerLast: 'handle', paramIndex: 1, innerIndex: 0, hops: 1, line: 1 };
  const map = closeWrappers([typed]);

  it('yields only what the wrapper reaches, suffixed +wrap, minus the base', () => {
    const inp = input('src/main/ipc.ts');
    const base = readFacts(inp);
    const wrap = readWrapFacts(inp, map, [], base);
    expect(wrap.map((f) => `${f.line} ${f.rule} ${f.subject}`)).toEqual(['3 surface.ipc.electron+wrap IPC serves c:d']);
    // A wrapped site the base already answered is dropped.
    const already = readWrapFacts(inp, map, [], [...base, { category: 'surface', kind: 'ipc-channel', subject: 'IPC serves c:d', line: 3, rule: 'x', evidence: '' }]);
    expect(already).toEqual([]);
  });

  it('buys nothing where there is nothing: an empty map, a manifest, a file with no calls', () => {
    const inp = input('src/main/ipc.ts');
    expect(readWrapFacts(inp, new Map(), [], readFacts(inp))).toEqual([]);
    expect(readWrapFacts({ ...inp, relPath: 'package.json' }, map, [], [])).toEqual([]);
    expect(readWrapFacts({ ...inp, calls: [] }, map, [], [])).toEqual([]);
    expect(readWrapFacts({ ...inp, text: null }, map, [], [])).toEqual([]);
  });

  it('a caller\'s own declaration shadows the map, through either call shape', () => {
    const own: ExtractedWrapper = { name: 'handle', innerCallee: 'handleTyped', innerLast: 'handle', paramIndex: 0, innerIndex: 1, hops: 0, line: 1 };
    const inp = input('src/main/ipc.ts', { calls: [site('handle', ['e:f', null], { line: 3 })] });
    const viaOwn = readWrapFacts(inp, map, [own], []);
    const viaClosed = readWrapFacts(inp, closeWrappers([typed], 3, [own]), [own], []);
    expect(viaOwn.map((f) => f.subject)).toEqual(['IPC serves e:f']);
    expect(JSON.stringify(viaClosed)).toBe(JSON.stringify(viaOwn));
    // Without the shadow, the project wide signature reads the wrong argument.
    expect(readWrapFacts(inp, map, [], [])).toEqual([]);
  });
});

describe('wrapperPassOn', () => {
  it('reads a literal true and nothing else', () => {
    expect(wrapperPassOn(noArchChosen())).toBe(false);
    expect(wrapperPassOn({ ...noArchChosen(), wrapperPass: true })).toBe(true);
    expect(wrapperPassOn({ ...noArchChosen(), wrapperPass: 'yes' as unknown as boolean })).toBe(false);
  });
});
