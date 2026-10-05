/**
 * Phase 336 — the folder a write on another machine is bound by, and the one
 * typed door it crosses.
 *
 * The REAL door (`../remote-run.ts`), the REAL folder decision
 * (`../write-folder.ts`) and the REAL five verbs run here. What is replaced is
 * the world around them: the machines file and its confirm gate, the manifest
 * (open project rows and pins), the exec plane that would start ssh, and the
 * review read. Every command the door composed is recorded, so "nothing was
 * sent" is measured rather than believed, and the order of build/p336/SPEC.md
 * D14 is read off what was sent when.
 *
 * It spawns nothing, contacts no machine and touches no file.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineReviewFile } from '@shared/ipc';
import { shellQuoteArg } from '../../restore/command';

// ---------------------------------------------------------------------------
// The world, replaced
// ---------------------------------------------------------------------------

/** The machine rows by id. */
let rows: Record<string, Record<string, unknown>> = {};
/** Every call the confirm gate was asked to make, and whether it refuses. */
let gated: string[] = [];
let gateRefuses: string | null = null;
/** The open project rows, of every machine. */
let projects: Array<{ id: string; path: string; name: string; machineId?: string }> = [];
/** The stored pins, keyed machine NUL path. */
let pins = new Map<string, string>();
/** Every pin the code stored, in order. */
let pinned: Array<[string, string, string]> = [];
/** Every command the exec plane was handed, in order. */
let sent: string[] = [];
/** What each script answers, by id. A function is asked each time. */
let answers: Record<string, string | (() => string)> = {};
/** What the review read answers. */
let listing: { repoPath: string; headSha: string; files: MachineReviewFile[]; untracked: MachineReviewFile[] } = {
  repoPath: '',
  headSha: '',
  files: [],
  untracked: []
};

vi.mock('../confirm', () => ({
  assertMachineMayConnect: (id: string): void => {
    gated.push(id);
    if (gateRefuses !== null) throw new Error(gateRefuses);
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => rows[id] ?? null,
  machineLabelOf: (one: Record<string, unknown>) =>
    typeof one['label'] === 'string' && one['label'].length > 0 ? one['label'] : one['host'],
  machineFieldsOf: (one: Record<string, unknown>) => ({
    host: one['host'] ?? '',
    user: null,
    port: null,
    remoteTmuxPath: null,
    acceptedTmuxVersion: null,
    writeRoot: one['writeRoot'] ?? null
  })
}));

vi.mock('../remote-record', () => ({
  remoteManifestInstalled: (): boolean => true,
  remoteManifest: () => ({
    listRemoteProjects: () => projects,
    remoteFolderPin: (machineId: string, path: string) => {
      const identity = pins.get(`${machineId}\0${path}`);
      return identity === undefined
        ? undefined
        : { machineId, path, identity, pinnedAt: 1 };
    },
    setRemoteFolderPin: (machineId: string, path: string, identity: string) => {
      pinned.push([machineId, path, identity]);
      pins.set(`${machineId}\0${path}`, identity);
    }
  })
}));

vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => ({
    kind: 'remote',
    machineId,
    label: 'Studio'
  })
}));

vi.mock('../exec-plane', () => ({
  execRemoteShell: async (_ctx: unknown, command: string): Promise<string> => {
    sent.push(command);
    const id = /' tortie-([a-z-]+)/.exec(command)?.[1] ?? '';
    const said = answers[id];
    const text = typeof said === 'function' ? said() : said;
    if (text === undefined) throw new Error(`nothing scripted for ${id}`);
    if (text === '__throw__') throw new Error('Command failed: /usr/bin/ssh');
    return `__TORTIE_RUN__${text}__TORTIE_RUN__\n`;
  }
}));

vi.mock('../control-plane', () => ({
  machineLinkFacts: (machineId: string) => ({
    machineId,
    link: 'connected',
    feed: 'listed',
    everAnswered: true,
    lastAnsweredAt: 1,
    reason: null
  }),
  noteMachineLinkFailed: () => undefined
}));

vi.mock('../context', () => ({
  machineGeneration: () => ({ generation: 3, remotePath: '/usr/bin' })
}));

vi.mock('../remote-review', () => ({
  reviewFilesOn: async (): Promise<unknown> => ({
    machineId: 'studio',
    machineLabel: 'Studio',
    repoPath: listing.repoPath,
    headSha: listing.headSha,
    files: listing.files,
    total: listing.files.length,
    untracked: listing.untracked,
    untrackedTotal: listing.untracked.length,
    note: null
  })
}));

const { putFileOnMachine } = await import('../remote-file');
const { makeRemoteDir, renameRemoteEntry } = await import('../remote-entry');
const { stageOnMachine } = await import('../remote-stage');
const { commitOnMachine } = await import('../remote-commit');
const { runFolderWrite, runRemoteWrite } = await import('../remote-run');
const {
  parseFolderPinAnswer,
  pinOpenedFolder,
  readyWriteFolder,
  writeFolderFor
} = await import('../write-folder');
const {
  FOLDER_SCRIPT_THROUGH_MACHINE_DOOR,
  MACHINE_SCRIPT_THROUGH_FOLDER_DOOR,
  remoteNameRefused
} = await import('../remote-copy');

const PIN = '16777231:756581619';
const APP = '/srv/app';

function scriptsSent(): string[] {
  return sent.map((one) => /' tortie-([a-z-]+)/.exec(one)?.[1] ?? '?');
}

function file(path: string, index: string, worktree: string): MachineReviewFile {
  return {
    path,
    origPath: null,
    status: 'M',
    indexState: index as MachineReviewFile['indexState'],
    worktreeState: worktree as MachineReviewFile['worktreeState']
  };
}

beforeEach(() => {
  rows = { studio: { id: 'studio', host: 'studio.example', label: 'Studio' } };
  gated = [];
  gateRefuses = null;
  projects = [{ id: 'p1', path: APP, name: 'app', machineId: 'studio' }];
  pins = new Map();
  pinned = [];
  sent = [];
  answers = {
    'folder-pin': PIN,
    'file-put': 'wrote abc 5',
    'dir-new': 'made 755',
    'entry-rename': 'moved none',
    'git-stage': '0 none',
    'git-unstage': '0 none',
    'git-commit': `committed none ${'a'.repeat(40)}`,
    'image-put': 'added 3 abc'
  };
  listing = {
    repoPath: APP,
    headSha: 'b'.repeat(40),
    files: [file('src/a.ts', 'M', '.')],
    untracked: []
  };
});

const put = (path: string, contents = 'hello') =>
  putFileOnMachine({ machineId: 'studio', path, contents, expect: 'new' });

// ---------------------------------------------------------------------------
// D14, the order, on a save
// ---------------------------------------------------------------------------

describe('the order of a write (SPEC D14)', () => {
  it('a changed machine throws the gate own sentence and composes nothing, for every verb', async () => {
    gateRefuses = 'Something changed about Studio since you confirmed it.';
    await expect(put(`${APP}/a.ts`)).rejects.toThrow(gateRefuses);
    await expect(makeRemoteDir({ machineId: 'studio', path: `${APP}/d` })).rejects.toThrow(
      gateRefuses
    );
    await expect(
      renameRemoteEntry({ machineId: 'studio', from: `${APP}/a`, to: `${APP}/b`, kind: 'file' })
    ).rejects.toThrow(gateRefuses);
    await expect(
      stageOnMachine({ machineId: 'studio', cwd: APP, paths: ['src/a.ts'] })
    ).rejects.toThrow(gateRefuses);
    await expect(
      commitOnMachine({
        machineId: 'studio',
        cwd: APP,
        headSha: 'b'.repeat(40),
        staged: ['src/a.ts'],
        message: 'm'
      })
    ).rejects.toThrow(gateRefuses);
    expect(gated).toEqual(['studio', 'studio', 'studio', 'studio', 'studio']);
    expect(sent).toEqual([]);
  });

  it('a machine not in the file throws, and sends nothing', async () => {
    await expect(
      putFileOnMachine({ machineId: 'nowhere', path: `${APP}/a`, contents: 'x', expect: 'new' })
    ).rejects.toThrow(/no machine called nowhere/);
    expect(sent).toEqual([]);
  });

  it('a file no open project holds is writesOff with no folder, and sends nothing', async () => {
    const out = await put('/srv/other/a.ts');
    expect(out).toMatchObject({ outcome: 'writesOff', writeRoot: null });
    expect(sent).toEqual([]);
  });

  it('a project on ANOTHER machine is no candidate here', async () => {
    projects = [{ id: 'p2', path: '/srv/other', name: 'other', machineId: 'elsewhere' }];
    const out = await put('/srv/other/a.ts');
    expect(out.outcome).toBe('writesOff');
    expect(sent).toEqual([]);
  });

  it('a never-listed project (a home, a home child) is writesOff naming it, and sends nothing', async () => {
    projects = [
      { id: 'h', path: '/home/u', name: 'u', machineId: 'studio' },
      { id: 'c', path: '/Users/u/proj', name: 'proj', machineId: 'studio' }
    ];
    expect(await put('/home/u/a.ts')).toMatchObject({ outcome: 'writesOff', writeRoot: '/home/u' });
    expect(await put('/Users/u/proj/a.ts')).toMatchObject({
      outcome: 'writesOff',
      writeRoot: '/Users/u/proj'
    });
    expect(sent).toEqual([]);
  });

  it('a .git or .ssh path in any case or volume fold is protected, and sends nothing', async () => {
    for (const rel of ['.GIT/config', '.Git/hooks/pre-commit', 'src/.sSH/x', '.ßh/x', '.ſsh/x', '.ẞh/x']) {
      const out = await put(`${APP}/${rel}`);
      expect(out.outcome).toBe('protected');
    }
    expect((await makeRemoteDir({ machineId: 'studio', path: `${APP}/.gIT/x` })).outcome).toBe(
      'protected'
    );
    expect(
      (
        await renameRemoteEntry({
          machineId: 'studio',
          from: `${APP}/a`,
          to: `${APP}/.SSH/a`,
          kind: 'file'
        })
      ).outcome
    ).toBe('protected');
    expect(sent).toEqual([]);
  });

  it('a name holding two dots in a row throws the sentence that says so, and sends nothing', async () => {
    await expect(put(`${APP}/notes..md`)).rejects.toThrow(remoteNameRefused('Studio'));
    await expect(makeRemoteDir({ machineId: 'studio', path: `${APP}/a..b` })).rejects.toThrow(
      remoteNameRefused('Studio')
    );
    expect(sent).toEqual([]);
  });

  it('a row with no pin is pinned by ONE folder-pin read, stored, and carried by the write', async () => {
    const out = await put(`${APP}/src/a.ts`);
    expect(out.outcome).toBe('wrote');
    expect(scriptsSent()).toEqual(['folder-pin', 'file-put']);
    expect(sent[0]).toContain(shellQuoteArg(APP));
    expect(sent[1]?.endsWith(` ${shellQuoteArg(PIN)}`)).toBe(true);
    expect(pinned).toEqual([['studio', APP, PIN]]);
  });

  it('a stored pin makes no read and is never replaced by a write', async () => {
    pins.set(`studio\0${APP}`, '1:2');
    await put(`${APP}/a.ts`);
    expect(scriptsSent()).toEqual(['file-put']);
    expect(sent[0]?.endsWith(` ${shellQuoteArg('1:2')}`)).toBe(true);
    expect(pinned).toEqual([]);
  });

  it('notsame is folderChanged and stores nothing', async () => {
    pins.set(`studio\0${APP}`, '1:2');
    answers['file-put'] = 'notsame none none';
    answers['dir-new'] = 'notsame none';
    answers['entry-rename'] = 'notsame none';
    expect(await put(`${APP}/a.ts`)).toMatchObject({ outcome: 'folderChanged', writeRoot: APP });
    expect((await makeRemoteDir({ machineId: 'studio', path: `${APP}/d` })).outcome).toBe(
      'folderChanged'
    );
    expect(
      (
        await renameRemoteEntry({ machineId: 'studio', from: `${APP}/a`, to: `${APP}/b`, kind: 'file' })
      ).outcome
    ).toBe('folderChanged');
    expect(pinned).toEqual([]);
    expect(pins.get(`studio\0${APP}`)).toBe('1:2');
  });

  it('a pin read that answers none is folderChanged, stores nothing and writes nothing', async () => {
    answers['folder-pin'] = 'none';
    const out = await put(`${APP}/a.ts`);
    expect(out).toMatchObject({ outcome: 'folderChanged', writeRoot: APP });
    expect(scriptsSent()).toEqual(['folder-pin']);
    expect(pinned).toEqual([]);
  });

  it('maps the far side home and reserved words, and throws for badname', async () => {
    pins.set(`studio\0${APP}`, PIN);
    for (const [said, outcome] of [
      ['offlimits none none', 'writesOff'],
      ['nohome none none', 'writesOff'],
      ['protected none none', 'protected'],
      ['outside none none', 'outsideRoot']
    ] as const) {
      answers['file-put'] = said;
      expect(await put(`${APP}/a.ts`)).toMatchObject({ outcome, writeRoot: APP });
    }
    answers['file-put'] = 'badname none none';
    await expect(put(`${APP}/a.ts`)).rejects.toThrow(remoteNameRefused('Studio'));
  });

  it('a legacy root holding a project takes the write first, with pin - and no read (§Attack G4)', async () => {
    rows['studio'] = { ...rows['studio'], writeRoot: '/srv' };
    const out = await put(`${APP}/a.ts`);
    expect(out).toMatchObject({ outcome: 'wrote', writeRoot: '/srv' });
    expect(scriptsSent()).toEqual(['file-put']);
    expect(sent[0]).toContain(` ${shellQuoteArg('/srv')} ${shellQuoteArg('app/a.ts')} `);
    expect(sent[0]?.endsWith(' -')).toBe(true);
  });

  it('nested projects bind the deepest', async () => {
    projects = [
      { id: 'o', path: '/srv', name: 'srv', machineId: 'studio' },
      { id: 'i', path: APP, name: 'app', machineId: 'studio' }
    ];
    expect((await put(`${APP}/a.ts`)).writeRoot).toBe(APP);
    expect((await put('/srv/b.ts')).writeRoot).toBe('/srv');
  });
});

// ---------------------------------------------------------------------------
// A rename, which is held by the folder holding both ends
// ---------------------------------------------------------------------------

describe('a rename', () => {
  const rename = (from: string, to: string) =>
    renameRemoteEntry({ machineId: 'studio', from, to, kind: 'file' });

  it('across two nested projects is held by the outer one', async () => {
    projects = [
      { id: 'o', path: '/srv', name: 'srv', machineId: 'studio' },
      { id: 'i', path: APP, name: 'app', machineId: 'studio' }
    ];
    const out = await rename(`${APP}/a.ts`, '/srv/a.ts');
    expect(out).toMatchObject({ outcome: 'moved', writeRoot: '/srv' });
    expect(sent.at(-1)).toContain(` ${shellQuoteArg('/srv')} ${shellQuoteArg('app/a.ts')} ${shellQuoteArg('a.ts')} `);
  });

  it('across two unrelated projects is outsideRoot naming the source folder, and sends nothing', async () => {
    projects.push({ id: 'b', path: '/srv/other', name: 'other', machineId: 'studio' });
    expect(await rename(`${APP}/a.ts`, '/srv/other/a.ts')).toMatchObject({
      outcome: 'outsideRoot',
      writeRoot: APP
    });
    expect(await rename('/elsewhere/a.ts', `${APP}/a.ts`)).toMatchObject({
      outcome: 'writesOff',
      writeRoot: null
    });
    expect(sent).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Stage and commit
// ---------------------------------------------------------------------------

describe('stage and commit', () => {
  it('stage carries the folder, the relative cwd and the pin, last', async () => {
    const out = await stageOnMachine({ machineId: 'studio', cwd: `${APP}/src`, paths: ['src/a.ts'] });
    expect(out.outcome).toBe('done');
    expect(scriptsSent()).toEqual(['folder-pin', 'git-stage']);
    expect(
      sent[1]?.endsWith(` ${shellQuoteArg(APP)} ${shellQuoteArg('src')} ${shellQuoteArg(PIN)}`)
    ).toBe(true);
  });

  it('stage refuses a reserved staged path or cwd with protected, and sends nothing', async () => {
    listing.files = [file('.Git/config', 'M', '.')];
    expect(
      (await stageOnMachine({ machineId: 'studio', cwd: APP, paths: ['.Git/config'] })).outcome
    ).toBe('protected');
    expect(
      (await stageOnMachine({ machineId: 'studio', cwd: `${APP}/.GIT`, paths: ['x'] })).outcome
    ).toBe('protected');
    expect(sent).toEqual([]);
  });

  it('stage maps notsame to folderChanged and stores nothing', async () => {
    pins.set(`studio\0${APP}`, PIN);
    answers['git-stage'] = 'notsame none';
    const out = await stageOnMachine({ machineId: 'studio', cwd: APP, paths: ['src/a.ts'] });
    expect(out.outcome).toBe('folderChanged');
    expect(pinned).toEqual([]);
  });

  it('commit answers folderChanged with its own sentence, never moved', async () => {
    pins.set(`studio\0${APP}`, PIN);
    answers['git-commit'] = 'notsame none none';
    const out = await commitOnMachine({
      machineId: 'studio',
      cwd: APP,
      headSha: 'b'.repeat(40),
      staged: ['src/a.ts'],
      message: 'm'
    });
    expect(out.outcome).toBe('folderChanged');
    expect(out.sentences[0]).toBe(
      `${APP} on Studio is not the folder you opened any more, so Tortie committed nothing. Open it again to commit there.`
    );
    expect(out.sentences.join(' ')).not.toContain('Refresh');
  });

  it('commit refuses outside every project with a sentence that names no Settings', async () => {
    const out = await commitOnMachine({
      machineId: 'studio',
      cwd: '/srv/elsewhere',
      headSha: '',
      staged: [],
      message: 'm'
    });
    expect(out.outcome).toBe('refused');
    expect(out.sentences).toEqual([
      'Tortie commits on Studio only in a project you opened there, so it committed nothing.'
    ]);
    expect(sent).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The two doors (SPEC D13)
// ---------------------------------------------------------------------------

describe('the two write doors', () => {
  const ctx = { kind: 'remote', machineId: 'studio', label: 'Studio' } as never;

  it('the machine door refuses all six folder-bound writes before composing anything', async () => {
    for (const id of ['file-put', 'dir-new', 'entry-rename', 'git-stage', 'git-unstage', 'git-commit']) {
      await expect(runRemoteWrite(ctx, id, ['a', 'b', 'c', 'd', 'e', 'f'])).rejects.toThrow(
        FOLDER_SCRIPT_THROUGH_MACHINE_DOOR
      );
    }
    expect(sent).toEqual([]);
  });

  it('the machine door still carries the picture and the clone', async () => {
    await runRemoteWrite(ctx, 'image-put', ['name.png', 'AAAA']);
    expect(scriptsSent()).toEqual(['image-put']);
  });

  it('the folder door appends the pin last and refuses what it was not handed', async () => {
    const choice = writeFolderFor('studio', `${APP}/a.ts`, 'file');
    if ('refused' in choice.pick) throw new Error('the pick refused');
    pins.set(`studio\0${APP}`, PIN);
    const folder = await readyWriteFolder(ctx, choice, choice.pick);
    if (folder === 'folderChanged') throw new Error('no folder');
    expect(folder.pin).toBe(PIN);
    // A machine-bound write through the folder door.
    await expect(runFolderWrite(ctx, folder, 'image-put', ['x.png'])).rejects.toThrow(
      MACHINE_SCRIPT_THROUGH_FOLDER_DOOR
    );
    // A folder argument that is not the folder it was handed.
    await expect(
      runFolderWrite(ctx, folder, 'file-put', ['/srv/other', 'a.ts', 'new', 'AAAA'])
    ).rejects.toThrow(MACHINE_SCRIPT_THROUGH_FOLDER_DOOR);
    // A folder for another machine.
    const elsewhere = { kind: 'remote', machineId: 'elsewhere', label: 'E' } as never;
    await expect(
      runFolderWrite(elsewhere, folder, 'file-put', [APP, 'a.ts', 'new', 'AAAA'])
    ).rejects.toThrow(MACHINE_SCRIPT_THROUGH_FOLDER_DOOR);
    // A read through the folder door.
    await expect(runFolderWrite(ctx, folder, 'folder-pin', [APP])).rejects.toThrow();
    expect(sent).toEqual([]);
    await runFolderWrite(ctx, folder, 'file-put', [APP, 'a.ts', 'new', 'AAAA']);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.endsWith(` ${shellQuoteArg(APP)} a.ts new AAAA ${shellQuoteArg(PIN)}`)).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// The pin taken at the open (SPEC D6)
// ---------------------------------------------------------------------------

describe('pinOpenedFolder', () => {
  it('pins a folder opened by hand, and pins it again when it is opened again', async () => {
    await pinOpenedFolder('studio', APP);
    answers['folder-pin'] = '9:9';
    await pinOpenedFolder('studio', APP);
    expect(pinned).toEqual([
      ['studio', APP, PIN],
      ['studio', APP, '9:9']
    ]);
  });

  it('never throws and keeps the old pin when the read throws or answers none', async () => {
    pins.set(`studio\0${APP}`, PIN);
    answers['folder-pin'] = '__throw__';
    await expect(pinOpenedFolder('studio', APP)).resolves.toBeUndefined();
    answers['folder-pin'] = 'none';
    await expect(pinOpenedFolder('studio', APP)).resolves.toBeUndefined();
    expect(pinned).toEqual([]);
    expect(pins.get(`studio\0${APP}`)).toBe(PIN);
  });

  it('reads one value and nothing else', () => {
    expect(parseFolderPinAnswer('16777231:756581619')).toBe('16777231:756581619');
    expect(parseFolderPinAnswer(' 1:2\n')).toBe('1:2');
    expect(parseFolderPinAnswer('none')).toBeNull();
    expect(parseFolderPinAnswer('1:2 3:4')).toBeNull();
    expect(parseFolderPinAnswer('-')).toBeNull();
    expect(parseFolderPinAnswer('1:x')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Where the pin is taken, read off the source (SPEC D6, condition 118)
// ---------------------------------------------------------------------------

describe('the hand open is where a folder is pinned', () => {
  const read = (rel: string): string => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

  it('addRemoteProjectAdmitted pins the stored folder after the row is written, and only there', () => {
    const core = read('sessions/core.ts');
    const start = core.indexOf('private async addRemoteProjectAdmitted(');
    expect(start).toBeGreaterThan(0);
    const end = core.indexOf('\n  listProjects(): Project[]', start);
    const body = core.slice(start, end);
    const upsert = body.indexOf('this.manifest.upsertRemoteProject(');
    const pin = body.indexOf('await pinOpenedFolder(input.machineId, stored);');
    expect(upsert).toBeGreaterThan(0);
    expect(pin).toBeGreaterThan(upsert);
    expect(pin).toBeLessThan(body.indexOf('return { ok: true, project, alreadyOpen };'));
    // Exactly one call in the whole file: no other door pins a folder.
    expect(core.split('pinOpenedFolder(').length - 1).toBe(1);
  });

  it('a rehome and a remote create name no pin function', () => {
    for (const rel of ['machines/remote-rehome.ts']) {
      const text = read(rel);
      expect(text).not.toContain('pinOpenedFolder');
      expect(text).not.toContain('setRemoteFolderPin');
    }
  });
});
