/**
 * The Explorer's context menu on a row that is on another machine
 * (Phase 90.3, Phase 101 and Phase 102).
 *
 * FOUR CROSS WHILE SAVING IS OFF AND SEVEN WHEN IT IS ON. The test asserts the
 * absences by name in BOTH states, because an absence is the whole safety
 * property here. Duplicate has no script on the far side, and Move to Trash has
 * no far side that could ever be built, since `shell.trashItem` has no equal
 * over there and a remote `rm` would turn a recoverable delete into an
 * unrecoverable one.
 *
 * PHASE 101 SPLIT THE CREATE BLOCK IN TWO. New File and New Folder were pushed
 * under one condition, so a machine that may take a new file would have taken a
 * new folder with it, and no script on the far side made a folder.
 *
 * PHASE 102 SPLIT THE EDIT BLOCK AND TURNED TWO VERBS ON. New Folder and Rename
 * cross on a machine a person has let Tortie save on, under their own flag.
 * Duplicate keeps the local condition and stays absent on every machine. The
 * cases below hold that: the four with saving off, the seven with saving on,
 * the two names that stay absent in both, and the rule that neither flag may
 * turn a verb on that belongs to the other.
 */

import { describe, expect, it } from 'vitest';
import {
  buildTreeMenu,
  pathsForClipboard,
  type TreeMenuActions
} from '../tree-menu';

const NOTE = 'Tortie only reads files on mac-pro.';
/** PHASE 102. What the same row's note says when writing is on. */
const CAN_WRITE =
  'Tortie reads files on mac-pro and can change what is under /Users/gdc. ' +
  'It cannot move anything there to the Trash.';
/** The two verbs that stay absent on another machine in EVERY state. */
const NEVER = ['Duplicate', 'Move to Trash'];
/** The two that are absent only while nobody has confirmed a folder. */
const OFF_ONLY = ['New Folder…', 'Rename…'];

const actions: TreeMenuActions = {
  open: () => undefined,
  history: () => undefined,
  newEntry: () => undefined,
  rename: () => undefined,
  duplicate: () => undefined,
  reveal: () => undefined,
  copyPaths: () => undefined,
  trash: () => undefined
};

const labels = (items: ReturnType<typeof buildTreeMenu>): string[] =>
  items.filter((one) => one !== 'sep').map((one) => one.label);

const target = {
  canonical: 'src/a.ts',
  selection: ['src/a.ts'],
  destDir: 'src/',
  openable: true
};

const local = () =>
  buildTreeMenu(target, { mutate: true, duplicate: true, reveal: true }, actions);

const remote = () =>
  buildTreeMenu(
    target,
    { mutate: false, duplicate: true, reveal: false, readOnlyNote: NOTE },
    actions
  );

/** The same row on a machine a person has let Tortie save on. */
const writing = () =>
  buildTreeMenu(
    target,
    {
      mutate: false,
      duplicate: true,
      reveal: false,
      readOnlyNote: CAN_WRITE,
      remoteCreateFile: true,
      remoteWriteEntries: true
    },
    actions
  );

describe('what a remote row offers', () => {
  it('offers exactly the four verbs that cross, plus the one note', () => {
    expect(labels(remote())).toEqual([
      'Open',
      'Open in New Tab',
      'Copy Path',
      'Copy Relative Path',
      NOTE
    ]);
  });

  it('offers seven when writing is on, and nothing else more', () => {
    expect(labels(writing())).toEqual([
      'Open',
      'Open in New Tab',
      'New File…',
      'New Folder…',
      'Rename…',
      'Copy Path',
      'Copy Relative Path',
      CAN_WRITE
    ]);
  });

  it('offers none of the three writes while nobody confirmed a folder', () => {
    const drawn = labels(remote()).join('|');
    expect(drawn).not.toContain('New File…');
    for (const absent of OFF_ONLY) expect(drawn).not.toContain(absent);
  });

  it('never offers the two that stay absent, in either state', () => {
    for (const drawn of [labels(remote()).join('|'), labels(writing()).join('|')]) {
      for (const absent of NEVER) {
        expect(drawn).not.toContain(absent);
      }
    }
  });

  // Each flag is its own, and this is why. A build that set one without meaning
  // to may still not reach the verbs the other one gates, and neither flag may
  // reach Duplicate or Move to Trash at all.
  it('never lets the create flag reach a second verb', () => {
    const items = buildTreeMenu(
      target,
      {
        mutate: true,
        duplicate: true,
        reveal: true,
        readOnlyNote: CAN_WRITE,
        remoteCreateFile: true
      },
      actions
    );
    const drawn = labels(items).join('|');
    for (const absent of [...NEVER, ...OFF_ONLY]) {
      expect(drawn).not.toContain(absent);
    }
    expect(labels(items)).toContain('New File…');
  });

  it('never lets the entry flag reach New File or a local only verb', () => {
    const items = buildTreeMenu(
      target,
      {
        mutate: true,
        duplicate: true,
        reveal: true,
        readOnlyNote: CAN_WRITE,
        remoteWriteEntries: true
      },
      actions
    );
    const drawn = labels(items).join('|');
    expect(drawn).not.toContain('New File…');
    for (const absent of NEVER) expect(drawn).not.toContain(absent);
    expect(labels(items)).toContain('New Folder…');
    expect(labels(items)).toContain('Rename…');
  });

  it('never offers a verb that starts a program on this Mac', () => {
    for (const drawn of [labels(remote()).join('|'), labels(writing()).join('|')]) {
      expect(drawn).not.toContain('Reveal in Finder');
      expect(drawn).not.toContain('Open With');
    }
  });

  it('draws the note last and disabled, so it reads as a footnote', () => {
    for (const items of [remote(), writing()]) {
      const last = items[items.length - 1];
      expect(last).toBeDefined();
      if (last === undefined || last === 'sep') throw new Error('no note row');
      expect(last.disabled).toBe(true);
    }
  });

  it('keeps Rename off a multi row selection on a machine', () => {
    const items = buildTreeMenu(
      {
        canonical: 'src/a.ts',
        selection: ['src/a.ts', 'src/b.ts'],
        destDir: 'src/',
        openable: true
      },
      {
        mutate: false,
        duplicate: true,
        reveal: false,
        readOnlyNote: CAN_WRITE,
        remoteCreateFile: true,
        remoteWriteEntries: true
      },
      actions
    );
    expect(labels(items)).not.toContain('Rename…');
    expect(labels(items)).toContain('New Folder…');
  });

  it('leaves a local row exactly as it was', () => {
    expect(labels(local())).toEqual([
      'Open',
      'Open in New Tab',
      'New File…',
      'New Folder…',
      'Rename…',
      'Duplicate',
      'Move to Trash',
      'Reveal in Finder',
      'Copy Path',
      'Copy Relative Path'
    ]);
  });

  it('refuses Open With on a remote row even when it is offered', () => {
    const items = buildTreeMenu(
      target,
      { mutate: false, duplicate: false, reveal: false, readOnlyNote: NOTE },
      actions,
      [{ label: 'Open in Default App', run: () => undefined }]
    );
    expect(labels(items)).not.toContain('Open With…');
  });
});

describe('the clipboard names the machine', () => {
  it('puts the machine in front of an absolute path', () => {
    expect(
      pathsForClipboard('/Users/gdc/gmux', ['src/a.ts'], false, 'mac-pro')
    ).toBe('mac-pro:/Users/gdc/gmux/src/a.ts');
  });

  it('leaves a relative path alone, because it is true on both computers', () => {
    expect(
      pathsForClipboard('/Users/gdc/gmux', ['src/a.ts'], true, 'mac-pro')
    ).toBe('src/a.ts');
  });

  it('is unchanged for a folder on this Mac', () => {
    expect(pathsForClipboard('/Users/gdc/gmux', ['src/a.ts'], false)).toBe(
      '/Users/gdc/gmux/src/a.ts'
    );
  });

  it('names the machine on every line of a multi row copy', () => {
    expect(
      pathsForClipboard('/r', ['a.ts', 'b/'], false, 'mac-pro').split('\n')
    ).toEqual(['mac-pro:/r/a.ts', 'mac-pro:/r/b']);
  });
});
