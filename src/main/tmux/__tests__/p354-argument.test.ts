/**
 * Phase 353, entry Phase 354 (build/p353/SPEC.md D354-1 to D354-3, §2.6): what tmux reads in each argument a create
 * hands it, held back by ONE rule (src/main/tmux/argument.ts) at both points a create hands tmux a folder, this
 * Mac's `createSession` and the far create's `remoteCreateArgs`.
 *
 * EVERY EXPECTED ARGUMENT BELOW IS WRITTEN BY HAND from D354-1 and from the tmux source it cites (the vendored
 * 3.7b's format.c expander and cmd-parse.y argument reader), never computed by the code under test:
 *
 *  - in the folder, every `#` is doubled except the `#`s of a run immediately followed by `[` (format.c copies such a
 *    run and its `[` verbatim, as a style), and then a final `;` is sent as a backslash then `;`;
 *  - in each `-e` pair and each argv element, a final `;` is sent as a backslash then `;`, and nothing else moves (a
 *    `#` there is not expanded, measured);
 *  - nothing is normalised, case-folded or resolved, and neither rule is idempotent: each is applied once, where an
 *    argument is handed to tmux.
 *
 * The corpus is §2.6's M354a, 44 folder names and a link whose own name ends in `\;`, in the order the measurement
 * ran them. Nothing here starts tmux: `createSession`'s transport is a recorder. `p354-create.integration.test.ts`
 * drives the same composition through real tmux, opt-in (`GMUX_ARG_IT=1`).
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/** Every argv `createSession` handed tmux, in order. */
const handed: string[][] = [];

vi.mock('../supervisor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../supervisor')>();
  return {
    ...actual,
    execTmux: (args: string[]) => {
      handed.push([...args]);
      // `list-sessions` answers no session; `new-session -P -F` answers one parseable create line.
      return Promise.resolve(args[0] === 'new-session' ? '$9 1700000000 0 1  4242 p354\n' : '');
    }
  };
});

const { tmuxArgument, tmuxFolderArgument } = await import('../argument');
const { tmuxArgument: stampsTmuxArgument, remoteStampArgs } = await import('../../machines/remote-stamps');
const { createSession } = await import('../sessions');
const { remoteCreateArgs } = await import('../../machines/remote-sessions');
const { REMOTE_ENV_SLOT } = await import('../../machines/remote-env-carriage');

const BS = String.fromCharCode(92);

/**
 * §2.6's corpus, each name with the folder argument D354-1 composes for it, WRITTEN BY HAND. The comment on each
 * says what tmux read in it at the parent (§2.6: "today" put 30 of these 45 elsewhere on 3.7b, 29 on 3.6a).
 */
const CORPUS: ReadonlyArray<readonly [name: string, held: string]> = [
  ['plain', 'plain'],
  ['C#/app', 'C##/app'], // kept at the parent (`#/` is no alias), held anyway: the rule reads no alias table
  ['C#Tools', 'C##Tools'], // `#T`, the pane title
  ['#Sales', '##Sales'], // `#S`, the session name
  ['notes#Home', 'notes##Home'], // `#H`, the host
  ['a#{b}', 'a##{b}'], // a format
  ['a#{b', 'a##{b'], // an unclosed format, which ends the expansion
  ['x##y', 'x####y'], // `##` is one `#`
  ['C##Tools', 'C####Tools'],
  ['F#', 'F##'], // a final `#`, dropped by 3.7b
  ['F##', 'F####'],
  ['x#[y', 'x#[y'], // a run before `[`: copied verbatim, so held as it is
  ['x#[y]z', 'x#[y]z'],
  ['x##[y', 'x##[y'],
  ['x###[y', 'x###[y'],
  ['a#[b#Sc]d', 'a#[b##Sc]d'], // the run before `[` kept, the `#` before `S` doubled
  ['#T', '##T'],
  ['#S', '##S'],
  ['#H', '##H'],
  ['#D', '##D'],
  ['#F', '##F'],
  ['#I', '##I'],
  ['#P', '##P'],
  ['#W', '##W'],
  ['#h', '##h'],
  ['#,x', '##,x'], // `#,` is `,`
  ['#}x', '##}x'], // `#}` is `}`
  ['a#xb', 'a##xb'], // kept at the parent (no alias), held anyway
  ['a#Ab', 'a##Ab'],
  ['100%', '100%'], // `-c` is not time-expanded: nothing to hold
  ['%Y', '%Y'],
  ['~x', '~x'],
  ['a;b', 'a;b'], // a `;` that is not last is never read
  ['semi;', `semi${BS};`], // a final `;` ended the command: the create failed
  [`semi${BS};`, `semi${BS}${BS};`], // read as `semi;`
  [`semi${BS}${BS};`, `semi${BS}${BS}${BS};`],
  [';', `${BS};`],
  [`${BS};`, `${BS}${BS};`],
  [`a${BS}b`, `a${BS}b`], // a backslash is never read
  [`a${BS}`, `a${BS}`],
  ['j#(unclosed', 'j##(unclosed'],
  ['j#(echo p353job >> p353-jobs.log)', 'j##(echo p353job >> p353-jobs.log)'], // a job, at the parent
  ['#{?pane_dead,dead,live}', '##{?pane_dead,dead,live}'],
  ['a#{E:HOME}b', 'a##{E:HOME}b'],
  [`link${BS};`, `link${BS}${BS};`] // the link whose own name ends in `\;`: tmux is handed the link's spelling
];

describe('the folder rule, over §2.6 corpus, each answer written by hand (D354-1)', () => {
  it('holds the corpus at 45 names, as §2.6 measured it', () => {
    expect(CORPUS).toHaveLength(45);
  });

  for (const [name, held] of CORPUS) {
    it(`${JSON.stringify(name)} is handed as ${JSON.stringify(held)}`, () => {
      expect(tmuxFolderArgument(`/w/${name}`)).toBe(`/w/${held}`);
    });
  }

  it('reads a # in a parent folder as in the last one, and holds every run on its own', () => {
    expect(tmuxFolderArgument('/p/C#/app')).toBe('/p/C##/app');
    expect(tmuxFolderArgument('/a#S/b#{x}/c##[d')).toBe('/a##S/b##{x}/c##[d');
    expect(tmuxFolderArgument('/#[x')).toBe('/#[x');
    expect(tmuxFolderArgument('/x#[')).toBe('/x#[');
    expect(tmuxFolderArgument('/a#{b#[c}')).toBe('/a##{b#[c}');
    expect(tmuxFolderArgument(`/a${BS}#b`)).toBe(`/a${BS}##b`);
    expect(tmuxFolderArgument('/#')).toBe('/##');
    expect(tmuxFolderArgument('/##')).toBe('/####');
    expect(tmuxFolderArgument('/a#;')).toBe(`/a##${BS};`);
    expect(tmuxFolderArgument('/a#[;')).toBe(`/a#[${BS};`);
  });

  it('normalises nothing, folds no case and resolves nothing', () => {
    const nfd = `/w/cafe${String.fromCodePoint(0x301)}`;
    expect(tmuxFolderArgument(nfd)).toBe(nfd);
    expect(tmuxFolderArgument('/W/MixedCase/ABC')).toBe('/W/MixedCase/ABC');
    expect(tmuxFolderArgument('/w/../x//y/./z/')).toBe('/w/../x//y/./z/');
    expect(tmuxFolderArgument('/w/$HOME/`id`/"q"/\'s\'')).toBe('/w/$HOME/`id`/"q"/\'s\'');
    expect(tmuxFolderArgument('')).toBe('');
  });

  it('is NOT idempotent, so it is applied exactly once, where the folder is handed to tmux', () => {
    const once = tmuxFolderArgument('/w/C#Tools');
    expect(once).toBe('/w/C##Tools');
    expect(tmuxFolderArgument(once)).toBe('/w/C####Tools');
    expect(tmuxArgument(tmuxArgument('x;'))).toBe(`x${BS}${BS};`);
  });
});

describe('the argument rule: a final ; held back, and nothing else (D354-1)', () => {
  it('sends a final ; as a backslash then ;, whatever comes before it', () => {
    expect(tmuxArgument('flag;')).toBe(`flag${BS};`);
    expect(tmuxArgument(`flag${BS};`)).toBe(`flag${BS}${BS};`);
    expect(tmuxArgument(`flag${BS}${BS};`)).toBe(`flag${BS}${BS}${BS};`);
    expect(tmuxArgument(';')).toBe(`${BS};`);
    expect(tmuxArgument(';;')).toBe(`;${BS};`);
    expect(tmuxArgument('P353_V=val;')).toBe(`P353_V=val${BS};`);
  });

  it('leaves a # alone outside -c, and every value that does not end in ;', () => {
    for (const value of ['', 'x#Sy', 'a#Sb#{session_name}', '#(echo x)', 'a;b', ';a', 'x; ', `a${BS}`, '-x', '--', '%Y']) {
      expect(tmuxArgument(value), JSON.stringify(value)).toBe(value);
    }
  });

  it('is ONE rule: the leaf re-exports the far stamp\'s own function, and every stamp still sends what it sent', () => {
    expect(tmuxArgument).toBe(stampsTmuxArgument);
    for (const [name] of CORPUS) {
      for (const value of [name, `/w/${name}`]) {
        expect(remoteStampArgs('$1', '@gmux-project', value)).toEqual(['set-option', '-t', '$1', '@gmux-project', tmuxArgument(value)]);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The two points a create hands tmux a folder
// ---------------------------------------------------------------------------

const root = mkdtempSync(join(tmpdir(), 'gmux-p354-args-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const folder = (name: string): string => {
  const at = join(root, name);
  mkdirSync(at, { recursive: true });
  return at;
};

beforeEach(() => {
  handed.length = 0;
});

/** The `new-session` argv a create handed tmux, with the format and the name left out. */
async function created(input: Parameters<typeof createSession>[0]): Promise<string[]> {
  handed.length = 0;
  await createSession(input);
  const create = handed.filter((args) => args[0] === 'new-session');
  expect(create).toHaveLength(1);
  const args = create[0] ?? [];
  return args.slice(args.indexOf('-c'));
}

describe("this Mac's createSession hands tmux every argument held back (D354-3)", () => {
  const env = { GMUX_MANAGED: '1', P_V: 'val;', P_H: 'a#Sb#{session_name}', P_B: `x${BS};` };
  const argv = ['/bin/sh', '-c', 'printf "%s\\n" "$@"', 'sh', 'flag;', 'display-message', 'x#Sy', ';'];
  const heldTail = [
    '-e', 'GMUX_MANAGED=1',
    '-e', `P_V=val${BS};`,
    '-e', 'P_H=a#Sb#{session_name}',
    '-e', `P_B=x${BS}${BS};`,
    '--', '/bin/sh', '-c', 'printf "%s\\n" "$@"', 'sh', `flag${BS};`, 'display-message', 'x#Sy', `${BS};`
  ];

  it('holds the folder, each -e pair and each argv element back, and asks the folder itself whether it exists', async () => {
    const at = folder('C#Tools');
    expect(await created({ displayName: 'p354', cwd: at, env, argv })).toEqual(['-c', `${root}/C##Tools`, ...heldTail]);
  });

  it('holds a folder ending in ; back, which tmux refused to create at the parent', async () => {
    const at = folder('semi;');
    expect(await created({ displayName: 'p354', cwd: at, argv: ['/bin/sh'] })).toEqual(['-c', `${root}/semi${BS};`, '--', '/bin/sh']);
  });

  it('a folder tmux reads nothing in is handed byte for byte, as at the parent', async () => {
    const at = folder('plain dir; x');
    expect(await created({ displayName: 'p354', cwd: at, env: { GMUX_MANAGED: '1' }, argv: ['/bin/zsh', '-l'] })).toEqual([
      '-c', at, '-e', 'GMUX_MANAGED=1', '--', '/bin/zsh', '-l'
    ]);
  });

  it('folderAsRecorded hands the folder EXACTLY as recorded, today\'s -c byte for byte, and still holds the pairs and argv back', async () => {
    const at = folder('C#Tools');
    expect(await created({ displayName: 'p354', cwd: at, env, argv, folderAsRecorded: true })).toEqual(['-c', at, ...heldTail]);
    const semi = folder(`semi${BS};`);
    expect(await created({ displayName: 'p354', cwd: semi, argv: [], folderAsRecorded: true })).toEqual(['-c', semi]);
  });

  it('names -c once, with the rule applied once', async () => {
    const at = folder('x##y');
    const args = await created({ displayName: 'p354', cwd: at });
    expect(args.filter((a) => a === '-c')).toHaveLength(1);
    expect(args[1]).toBe(`${root}/x####y`);
  });
});

describe("the far create's remoteCreateArgs hands that machine's tmux the same (D354-3)", () => {
  const head = (args: string[]): string[] => args.slice(args.indexOf('-c'));

  it('holds the folder, the pairs and the argv back', () => {
    // The two identity pairs are the only ones a far create may carry (Phase 73); an id ending in `;` stands in for a
    // value that ends so, because the pair's rule is the argument rule.
    const args = remoteCreateArgs({
      tmuxName: 'work',
      cwd: '/srv/C#Tools/semi;',
      sessionId: 'id;',
      argv: ['/usr/local/bin/claude', 'flag;', 'x#Sy']
    });
    expect(head(args)).toEqual([
      '-c', `/srv/C##Tools/semi${BS};`,
      '-e', 'GMUX_MANAGED=1',
      '-e', `GMUX_SESSION_ID=id${BS};`,
      '--', '/usr/local/bin/claude', `flag${BS};`, 'x#Sy'
    ]);
  });

  it('folderAsRecorded sends the folder as recorded and nothing else differs', () => {
    const base = { tmuxName: 'work', cwd: '/srv/a#{b}', sessionId: 'u', argv: ['claude', 'f;'] };
    const held = remoteCreateArgs(base);
    const recorded = remoteCreateArgs({ ...base, folderAsRecorded: true });
    expect(held[held.indexOf('-c') + 1]).toBe('/srv/a##{b}');
    expect(recorded[recorded.indexOf('-c') + 1]).toBe('/srv/a#{b}');
    expect(recorded.filter((_, i) => recorded[i - 1] !== '-c')).toEqual(held.filter((_, i) => held[i - 1] !== '-c'));
  });

  it('sends no folder when none was named, and keeps the env slot ONE element it does not touch', () => {
    const args = remoteCreateArgs({ tmuxName: 'work', sessionId: 'u', argv: [], envNames: ['A_KEY'] });
    expect(args).not.toContain('-c');
    expect(args.filter((a) => a === REMOTE_ENV_SLOT)).toHaveLength(1);
    expect(remoteCreateArgs({ tmuxName: 'work', cwd: '', sessionId: 'u', argv: [] })).not.toContain('-c');
  });

  it('every corpus folder reaches the far create exactly as the local rule holds it', () => {
    for (const [name, held] of CORPUS) {
      const args = remoteCreateArgs({ tmuxName: 'w', cwd: `/srv/${name}`, sessionId: 'u', argv: [] });
      expect(args[args.indexOf('-c') + 1], JSON.stringify(name)).toBe(`/srv/${held}`);
    }
  });
});
