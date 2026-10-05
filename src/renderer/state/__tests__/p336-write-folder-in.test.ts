/**
 * PHASE 336. The renderer's one question about writing on another machine:
 * which folder holds this path, or why none does.
 *
 * His ruling of 4 October 2026 (research 138 section 9): "Zero presses ... I
 * don't want any grants. I want it to act like i'm operating it locally." So a
 * project open on a CONFIRMED machine is a folder Tortie may write under, the
 * way a project open on this Mac is, and `remoteWriteFolderIn` answers which
 * one, by the same shared `pickWriteFolder` main asks before every write.
 *
 * Every clause of `remoteWriteFolderIn` has a case below that reads red when
 * the clause is removed:
 *
 *  - no row for the machine          -> unconfirmed
 *  - `savesInProjects: false`        -> unconfirmed, even with a typed folder
 *  - neither field                   -> unconfirmed
 *  - a typed folder and no field     -> a legacy folder (an older main)
 *  - candidates from THIS machine's open rows only, never a local row and
 *    never another machine's row at the same path
 *  - the deepest project, the typed folder first, `never` naming the folder,
 *    `outside`, and the two modes, all from the shared pick, with the
 *    renderer's answer equal to the shared function's over one corpus
 *  - the folder answered is the STORED path, byte for byte
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MachineStateView } from '@shared/ipc';
import type { Project } from '@shared/types';
import { pickWriteFolder } from '@shared/remote-write-folder';
import {
  remoteWriteFolderIn,
  writeFolderOf,
  writeRefusalOf,
  type RemoteWriteFolder
} from '../machines-slice';

function view(over: Partial<MachineStateView> = {}): MachineStateView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'blue',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: 0,
    detail: null,
    savesInProjects: true,
    writeRoot: null,
    ...over
  };
}

function project(path: string, machineId?: string, id = path): Project {
  return {
    id,
    path,
    name: path.split('/').pop() ?? path,
    ...(machineId === undefined ? {} : { machineId })
  };
}

const API = '/srv/greg/api';
const FILE = `${API}/src/auth.ts`;

describe('which machines Tortie writes on at all', () => {
  it('answers unconfirmed for a machine with no row here', () => {
    expect(
      remoteWriteFolderIn([], [project(API, 'studio')], 'studio', FILE, 'file')
    ).toEqual({ refused: 'unconfirmed' });
  });

  it('answers unconfirmed for a row main says is not confirmed', () => {
    // A changed machine writes nothing until it is confirmed again, however
    // many projects are open on it.
    const changed = view({
      link: 'refused',
      confirmNeeded: 'changed',
      savesInProjects: false
    });
    expect(
      remoteWriteFolderIn([changed], [project(API, 'studio')], 'studio', FILE, 'file')
    ).toEqual({ refused: 'unconfirmed' });
    // A typed folder on such a row does not stand in for the confirmation.
    expect(
      remoteWriteFolderIn(
        [view({ savesInProjects: false, writeRoot: '/srv' })],
        [],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ refused: 'unconfirmed' });
  });

  it('answers unconfirmed for a row carrying neither field', () => {
    const bare = view();
    delete (bare as { savesInProjects?: boolean }).savesInProjects;
    delete (bare as { writeRoot?: string | null }).writeRoot;
    expect(
      remoteWriteFolderIn([bare], [project(API, 'studio')], 'studio', FILE, 'file')
    ).toEqual({ refused: 'unconfirmed' });
  });

  it('reads a typed folder from an older main as a confirmed row', () => {
    const older = view({ writeRoot: '/srv/greg' });
    delete (older as { savesInProjects?: boolean }).savesInProjects;
    expect(
      remoteWriteFolderIn([older], [], 'studio', FILE, 'file')
    ).toEqual({ folder: '/srv/greg', kind: 'legacy' });
  });
});

describe('which projects are candidates', () => {
  it('writes in a project open on that machine, with nothing asked', () => {
    expect(
      remoteWriteFolderIn([view()], [project(API, 'studio')], 'studio', FILE, 'file')
    ).toEqual({ folder: API, kind: 'project' });
  });

  it('never lets a project on this Mac stand in', () => {
    expect(
      remoteWriteFolderIn([view()], [project(API)], 'studio', FILE, 'file')
    ).toEqual({ refused: 'outside' });
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(API, 'local')],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ refused: 'outside' });
  });

  it("never lets another machine's project at the same path stand in", () => {
    const states = [view(), view({ id: 'mac-pro', label: 'Mac Pro' })];
    expect(
      remoteWriteFolderIn(states, [project(API, 'mac-pro')], 'studio', FILE, 'file')
    ).toEqual({ refused: 'outside' });
    expect(
      remoteWriteFolderIn(states, [project(API, 'mac-pro')], 'mac-pro', FILE, 'file')
    ).toEqual({ folder: API, kind: 'project' });
  });

  it('answers outside for a path no open project holds', () => {
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(API, 'studio')],
        'studio',
        '/srv/greg/apix/a.ts',
        'file'
      )
    ).toEqual({ refused: 'outside' });
  });
});

describe('the shared pick decides the folder', () => {
  it('takes the deepest of two nested projects', () => {
    const inner = `${API}/packages/web`;
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(API, 'studio'), project(inner, 'studio')],
        'studio',
        `${inner}/index.ts`,
        'file'
      )
    ).toEqual({ folder: inner, kind: 'project' });
  });

  it('takes a typed folder first when it holds the path (research 138, G4)', () => {
    expect(
      remoteWriteFolderIn(
        [view({ writeRoot: '/srv/greg' })],
        [project(API, 'studio')],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ folder: '/srv/greg', kind: 'legacy' });
  });

  it('answers never, naming the folder, for a home itself and a folder holding one', () => {
    for (const folder of ['/Users/gdc', '/Users']) {
      expect(
        remoteWriteFolderIn(
          [view()],
          [project(folder, 'studio')],
          'studio',
          '/Users/gdc/a.ts',
          'file'
        )
      ).toEqual({ refused: 'never', folder });
    }
  });

  // Phase 336.1: his ~/dev on his Mac Pro was drawn read only because Phase
  // 336 never-listed a home's direct child. It is an edit surface now.
  it('answers the project for a folder directly inside a home', () => {
    const dev = '/Users/gdc/dev';
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(dev, 'studio')],
        'studio',
        `${dev}/a.ts`,
        'file'
      )
    ).toEqual({ folder: dev, kind: 'project' });
    expect(
      remoteWriteFolderIn([view()], [project(dev, 'studio')], 'studio', dev, 'folder')
    ).toEqual({ folder: dev, kind: 'project' });
  });

  it('answers never for a project that is a .ssh folder in any fold', () => {
    const folded = '/srv/greg/.ßh';
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(folded, 'studio')],
        'studio',
        `${folded}/authorized_keys`,
        'file'
      )
    ).toEqual({ refused: 'never', folder: folded });
  });

  it('refuses the folder itself in file mode and accepts it in folder mode', () => {
    expect(
      remoteWriteFolderIn([view()], [project(API, 'studio')], 'studio', API, 'file')
    ).toEqual({ refused: 'outside' });
    expect(
      remoteWriteFolderIn([view()], [project(API, 'studio')], 'studio', API, 'folder')
    ).toEqual({ folder: API, kind: 'project' });
  });

  it('answers the stored path byte for byte', () => {
    const stored = '/srv//greg/./api';
    expect(
      remoteWriteFolderIn(
        [view()],
        [project(stored, 'studio')],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ folder: stored, kind: 'project' });
  });

  it('agrees with the shared function over one corpus', () => {
    const projects = [
      project('/srv/greg/api', 'studio'),
      project('/srv/greg/api/packages/web', 'studio'),
      project('/Users/gdc/gmux', 'studio'),
      project('/srv/other', 'mac-pro'),
      project('/srv/local')
    ];
    const legacyRoot = '/opt/legacy';
    const targets = [
      '/srv/greg/api/a.ts',
      '/srv/greg/api/packages/web/b.ts',
      '/srv/greg/api',
      '/Users/gdc/gmux/c.ts',
      '/srv/other/d.ts',
      '/srv/local/e.ts',
      '/opt/legacy/f.ts',
      '/opt/legacy',
      '/elsewhere/g.ts'
    ];
    const studio = projects
      .filter((one) => one.machineId === 'studio')
      .map((one) => one.path);
    for (const target of targets) {
      for (const mode of ['file', 'folder'] as const) {
        const shared = pickWriteFolder(
          target,
          { projects: studio, legacyRoot },
          mode
        );
        const ours = remoteWriteFolderIn(
          [view({ writeRoot: legacyRoot })],
          projects,
          'studio',
          target,
          mode
        );
        const expected: RemoteWriteFolder =
          'kind' in shared
            ? { folder: shared.path, kind: shared.kind }
            : shared.refused === 'never'
              ? { refused: 'never', folder: shared.path }
              : { refused: 'outside' };
        expect([target, mode, ours]).toEqual([target, mode, expected]);
      }
    }
  });
});

describe('the two readers of an answer', () => {
  it('reads the folder, or null', () => {
    expect(writeFolderOf({ folder: API, kind: 'project' })).toBe(API);
    expect(writeFolderOf({ refused: 'outside' })).toBe(null);
    expect(writeFolderOf({ refused: 'never', folder: API })).toBe(null);
  });

  it('reads the refusal, or null', () => {
    expect(writeRefusalOf({ folder: API, kind: 'legacy' })).toBe(null);
    expect(writeRefusalOf({ refused: 'unconfirmed' })).toBe('unconfirmed');
    expect(writeRefusalOf({ refused: 'never', folder: API })).toBe('never');
  });
});

/**
 * Every surface asks THIS question, for the path it is about and in the mode
 * that path needs (build/p336/SPEC.md D18). The components are not rendered
 * here, so the call is read off each source: a surface that went back to a
 * per-machine answer, or asked about the wrong path, reads red.
 */
describe('every surface asks the same question', () => {
  const read = (rel: string): string =>
    readFileSync(resolve(__dirname, '..', '..', rel), 'utf8');
  /** The arguments of every `remoteWriteFolderIn(` call in one source. */
  const callsIn = (source: string): string[] => {
    const out: string[] = [];
    let at = source.indexOf('remoteWriteFolderIn(');
    while (at !== -1) {
      const open = at + 'remoteWriteFolderIn('.length;
      let depth = 1;
      let end = open;
      while (end < source.length && depth > 0) {
        const ch = source[end];
        if (ch === '(') depth += 1;
        if (ch === ')') depth -= 1;
        end += 1;
      }
      out.push(source.slice(open, end - 1).replace(/\s+/g, ' ').trim());
      at = source.indexOf('remoteWriteFolderIn(', end);
    }
    return out;
  };

  it('asks about a tab by its own path, in file mode', () => {
    expect(callsIn(read('editor/tab-readonly.ts'))).toEqual([
      "states, projects, tab.remote.machineId, tab.path, 'file'"
    ]);
    expect(callsIn(read('editor/tab-io.ts'))).toEqual([
      "app.machineStates, app.projects, remote.machineId, tab.path, 'file'"
    ]);
    expect(callsIn(read('editor/EditorPanel.tsx'))).toEqual([
      "machineStates, projects, activeTab.remote.machineId, activeTab.path, 'file'"
    ]);
  });

  it('asks about a folder by the project root, in folder mode', () => {
    const folder = "machineStates, projects, target.machineId, target.path, 'folder'";
    expect(callsIn(read('tree/FilesSection.tsx'))).toEqual([folder]);
    expect(callsIn(read('app/Sidebar.tsx'))).toEqual([folder]);
    expect(callsIn(read('scm/ScmSection.tsx'))).toEqual([folder, folder]);
  });

  it('enables the Explorer header buttons by that answer alone', () => {
    const sidebar = read('app/Sidebar.tsx');
    expect(sidebar).toContain(
      "refused: 'refused' in folder ? folder.refused : null"
    );
    expect(sidebar).toContain(
      'const canCreateFolder =\n    treeHandle !== null && canMutate() && machineRefused === null;'
    );
    expect(sidebar).toContain(
      'const canCreateFile =\n    treeHandle !== null && canMutate() && machineRefused === null;'
    );
  });

  it('hands the commit box the refusal, never a per-machine answer', () => {
    expect(read('scm/ScmSection.tsx')).toContain(
      "writeRefused: 'refused' in writeFolder ? writeFolder.refused : null,"
    );
  });
});
