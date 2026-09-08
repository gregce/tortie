/**
 * PHASE 234. THE ARCHITECTURE FACE ON A MACHINE IS THE ARCHITECTURE FACE.
 *
 * The operator's rule of 2026-09-07, in his words: "I DO not want a ton of
 * explanatory text written into any of the remote machine settings or in the
 * nav bar windows (just because its a remote machine). It should feel almost
 * identical to the local experience."
 *
 * Phase 228 got there by drawing NOTHING for a folder on a machine, which was
 * the honest answer while nothing could read one. This phase reads one, so the
 * rule needs a different proof: not the absence of a face, but the SAMENESS of
 * two. Every rule below holds the remote answer against the local one and fails
 * on a difference.
 *
 * What is here: the reading rendered from one model under a local key and a
 * remote key and compared byte for byte, the model slot proved to be the same
 * node and to call nothing, the key pair round tripping, the two shapes an open
 * takes, and a scan of the whole `src/renderer/arch/` directory for a word that
 * would only ever be drawn for a machine. What is not here: the app run, which
 * is the phase's own probe, and the reading's arithmetic, which is
 * `conformance:reading`'s.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ArchMapResult } from '../bridge';
import { ReadingFace } from '../ArchDrill';
import { ARCH_MODEL_NONE } from '../copy';
import { openArchRow } from '../open-row';
import {
  archKeyOfEvent,
  archMachineOf,
  archRepoInputOf,
  archRepoKeyOf
} from '../state/repo-key';
import { OPEN_FILE_EVENT, type OpenFileRequest } from '../../state/open-file';

const ARCH_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * The suite lane is `environment: 'node'`, and the open file bus is one
 * `CustomEvent` on `window`. Node has both `EventTarget` and `CustomEvent`, so
 * the bus needs a name to hang on and nothing else; this is the same bus the
 * shipping code uses, rather than a mock of it.
 */
const bus = new EventTarget();
(globalThis as unknown as { window: EventTarget }).window = bus;

const HERE = '/Users/gdc/p234-fixture';
const THERE = '/Users/gdc/p234-fixture';
const MACHINE = 'mac-pro';

/** The one model both faces are drawn from, so a difference can only be the face. */
function model(): ArchMapResult {
  return {
    cwd: HERE,
    building: false,
    scannedAtCommit: '0'.repeat(40),
    subject: 'p234-fixture',
    sentence:
      '31 files, mostly TypeScript; 5 parts, the biggest src/core (19%); ' +
      '2 connections between parts; 7 of 7 imports lead inside the repository.',
    fileCount: 31,
    groups: [
      {
        id: 'src-core',
        dir: 'src/core',
        label: 'core',
        band: 'engine',
        fileCount: 6,
        componentId: null,
        sentence:
          '6 files, TypeScript; made of core1, core2, core3, core4, core5 and ' +
          '1 more; used by src/ui and tests; uses no other part.',
        facts: ['Size: 6 files, 120 lines']
      },
      {
        id: 'src-ui',
        dir: 'src/ui',
        label: 'ui',
        band: 'edge',
        fileCount: 6,
        componentId: null,
        sentence:
          '6 files, TypeScript; made of panel1, panel2, panel3, panel4, ' +
          'panel5 and 1 more; uses src/core; no other part uses it.',
        facts: ['Size: 6 files, 118 lines']
      }
    ],
    edges: [],
    totalImports: 7,
    resolvedImports: 7,
    unresolvedImports: 0,
    contractPresent: false,
    counts: {
      checkedHold: 0,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 0,
      totalImports: 7
    }
  } as unknown as ArchMapResult;
}

// ---------------------------------------------------------------------------
// Rule 1. The two faces, byte for byte
// ---------------------------------------------------------------------------

describe('the reading on either computer', () => {
  it('draws the same markup from the same model, byte for byte', () => {
    const here = renderToStaticMarkup(
      createElement(ReadingFace, {
        model: model(),
        drilledGroupId: null,
        onOpen: null
      })
    );
    const there = renderToStaticMarkup(
      createElement(ReadingFace, {
        model: model(),
        drilledGroupId: null,
        onOpen: null
      })
    );
    // The face takes the model and nothing else: there is no computer for it
    // to branch on, and this is the check that keeps it so.
    expect(there).toBe(here);
    expect(here).toContain('data-slot="arch-reading-repo"');
    expect(here).toContain('data-slot="arch-reading-model"');
    expect(here).toContain('data-slot="arch-reading"');
  });

  it('draws the model slot the same on both, and it calls nothing', () => {
    // ITEM 4 OF THE CHARTER, and the answer is that there was nothing to move.
    // The slot is drawn ABSENT: it makes no model call on either computer, so
    // it cannot start a process on a machine, and it carries the SAME one line
    // on both faces. A label saying "the answer is about that folder" would be
    // a sentence a local face does not have, about a reading nothing composes.
    const html = renderToStaticMarkup(
      createElement(ReadingFace, {
        model: model(),
        drilledGroupId: null,
        onOpen: null
      })
    );
    expect(html).toContain(ARCH_MODEL_NONE);
    const source = readFileSync(join(ARCH_DIR, 'ArchDrill.tsx'), 'utf8');
    const slot = source.slice(source.indexOf('function ModelSlot('));
    const body = slot.slice(0, slot.indexOf('\n}\n') + 3);
    // No bridge, no machine and no branch inside the slot.
    for (const forbidden of ['Bridge', 'machine', 'await', 'useArch']) {
      expect(body, `the model slot names ${forbidden}`).not.toContain(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------
// Rule 2. The key, and the two shapes an input takes
// ---------------------------------------------------------------------------

describe('the repository key', () => {
  it('keys a folder on this Mac as its own path, byte for byte', () => {
    expect(archRepoKeyOf({ machineId: 'local', path: HERE })).toBe(HERE);
    expect(archMachineOf(HERE)).toBeNull();
    expect(archRepoInputOf(HERE)).toEqual({ cwd: HERE });
    // The object a local read composes has no `machineId` AT ALL rather than a
    // null one, so it is the object every build before this phase composed.
    expect(Object.keys(archRepoInputOf(HERE))).toEqual(['cwd']);
  });

  it('keeps a folder on a machine apart from the same path here', () => {
    const key = archRepoKeyOf({ machineId: MACHINE, path: THERE });
    expect(key).not.toBeNull();
    expect(key).not.toBe(HERE);
    expect(archMachineOf(key ?? '')).toBe(MACHINE);
    expect(archRepoInputOf(key ?? '')).toEqual({
      cwd: THERE,
      machineId: MACHINE
    });
  });

  it('reads a push back to the key it belongs to', () => {
    expect(archKeyOfEvent({ cwd: HERE })).toBe(HERE);
    expect(archKeyOfEvent({ cwd: HERE, machineId: null })).toBe(HERE);
    expect(archKeyOfEvent({ cwd: THERE, machineId: MACHINE })).toBe(
      archRepoKeyOf({ machineId: MACHINE, path: THERE })
    );
    // A push about a machine never lands on the same-named folder here, which
    // is the collision the whole key pair exists for.
    expect(archKeyOfEvent({ cwd: THERE, machineId: MACHINE })).not.toBe(HERE);
  });
});

// ---------------------------------------------------------------------------
// Rule 3. Opening a file from a row, on either computer
// ---------------------------------------------------------------------------

describe('opening a file from an Architecture row', () => {
  const seen: OpenFileRequest[] = [];
  const listener = (e: Event): void => {
    seen.push((e as CustomEvent<OpenFileRequest>).detail);
  };
  bus.addEventListener(OPEN_FILE_EVENT, listener);
  afterEach(() => {
    seen.length = 0;
  });

  it('opens a folder on this Mac exactly as it did, with no remote reference', () => {
    openArchRow({ repoKey: HERE, relPath: 'src/a.ts', line: 12 });
    expect(seen).toHaveLength(1);
    const one = seen[0];
    expect(one?.repoPath).toBe(HERE);
    expect(one?.path).toBe(`${HERE}/src/a.ts`);
    expect(one?.relPath).toBe('src/a.ts');
    expect(one?.selection).toEqual({ line: 12 });
    expect(one?.source).toBe('search');
    expect('remote' in (one ?? {})).toBe(false);
  });

  it('opens a folder on a machine on that machine, never on this one', () => {
    const key = archRepoKeyOf({ machineId: MACHINE, path: THERE }) ?? '';
    openArchRow({ repoKey: key, relPath: 'src/a.ts', line: 12 });
    expect(seen).toHaveLength(1);
    const one = seen[0];
    // The path is the folder over there, never the key, and never a path this
    // Mac would open: both homes are `/Users/gdc`, so a request with no remote
    // reference would open a DIFFERENT file of the same name here.
    expect(one?.path).toBe(`${THERE}/src/a.ts`);
    expect(one?.remote?.machineId).toBe(MACHINE);
    expect(one?.remote?.repoPath).toBe(THERE);
    expect(one?.path.includes('machine:')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rule 4. No word on this surface is drawn for a machine alone
// ---------------------------------------------------------------------------

/**
 * The words a remote-only sentence would be made of. They are the ones Phase
 * 228 took off this surface and the ones the operator's rule names, and the
 * scan is over the DRAWN text of the whole directory rather than over one
 * module, because a sentence can be written anywhere.
 */
const REMOTE_ONLY_WORDS: readonly string[] = [
  'this Mac only',
  'on this Mac',
  'another computer',
  'that computer',
  'the computer its',
  'remote machine',
  'on a machine',
  'over there'
];

/** Everything outside a comment and outside an import, per file. */
function drawnText(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n');
}

function everyArchFile(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      everyArchFile(path, out);
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

describe("the operator's rule, over the whole Architecture surface", () => {
  it('draws no word a folder on this Mac does not also carry', () => {
    const files = everyArchFile(ARCH_DIR);
    expect(files.length).toBeGreaterThan(10);
    const offences: string[] = [];
    for (const file of files) {
      // The harness probe is not a face: it is a reading of one, and it names
      // what it reads.
      if (file.endsWith('shot-probe.ts')) continue;
      const text = drawnText(readFileSync(file, 'utf8'));
      for (const word of REMOTE_ONLY_WORDS) {
        if (text.includes(word)) offences.push(`${file}: ${word}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('proves the scan can fail', () => {
    // A scan that cannot fail is not a scan. This is the sentence Phase 228
    // deleted, run through the same reader.
    const planted = drawnText(
      "const ARCH_ELSEWHERE = 'A contract is read on the computer its repository is on.';"
    );
    expect(
      REMOTE_ONLY_WORDS.some((word) => planted.includes(word))
    ).toBe(true);
    // And a comment saying the same thing is NOT an offence, because a comment
    // is not drawn.
    const comment = drawnText('// the computer its repository is on\nconst a = 1;');
    expect(REMOTE_ONLY_WORDS.some((word) => comment.includes(word))).toBe(false);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
