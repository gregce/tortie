/**
 * The Explorer's context menu on a row that is on another machine
 * (Phase 90.3, and Phase 101).
 *
 * FOUR CROSS WHILE SAVING IS OFF AND FIVE WHEN IT IS ON. The test asserts the
 * absences by name in BOTH states, because an absence is the whole safety
 * property here. New Folder, Rename and Duplicate have no script on the far
 * side, and Move to Trash has no far side that could ever be built, since
 * `shell.trashItem` has no equal over there and a remote `rm` would turn a
 * recoverable delete into an unrecoverable one.
 *
 * PHASE 101 SPLIT ONE BLOCK IN TWO. New File and New Folder were pushed under
 * one condition, so a machine that may take a new file would have taken a new
 * folder with it. The two are separate conditions now and only New File
 * crosses. The three cases below hold that: the four with saving off, the five
 * with saving on, and the four names that stay absent in both.
 */

import { describe, expect, it } from 'vitest';
import {
  buildTreeMenu,
  pathsForClipboard,
  type TreeMenuActions
} from '../tree-menu';

const NOTE = 'Tortie only reads files on mac-pro.';
/** PHASE 101. What the same row's note says when saving is on. */
const CAN_SAVE = 'Tortie reads files on mac-pro and can save under /Users/gdc.';
/** The four verbs that stay absent on another machine in BOTH states. */
const NEVER = ['New Folder…', 'Rename…', 'Duplicate', 'Move to Trash'];

const actions: TreeMenuActions = {
  open: () => undefined,
  newEntry: () => undefined,
  rename: () => undefined,
  duplicate: () => undefined,
  reveal: () => undefined,
  copyPaths: () => undefined,
  trash: () => undefined
};

const labels = (items: ReturnType<typeof buildTreeMenu>): string[] =>
  items.filter((one) => one !== 'sep').map((one) => one.label);

const local = () =>
  buildTreeMenu(
    { canonical: 'src/a.ts', selection: ['src/a.ts'], destDir: 'src/', openable: true },
    { mutate: true, duplicate: true, reveal: true },
    actions
  );

const remote = () =>
  buildTreeMenu(
    { canonical: 'src/a.ts', selection: ['src/a.ts'], destDir: 'src/', openable: true },
    { mutate: false, duplicate: true, reveal: false, readOnlyNote: NOTE },
    actions
  );

/** PHASE 101. The same row on a machine a person has let Tortie save on. */
const saving = () =>
  buildTreeMenu(
    { canonical: 'src/a.ts', selection: ['src/a.ts'], destDir: 'src/', openable: true },
    {
      mutate: false,
      duplicate: true,
      reveal: false,
      readOnlyNote: CAN_SAVE,
      remoteCreateFile: true
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

  // PHASE 101. The fifth verb, and it appears only when that machine carries a
  // folder a person confirmed.
  it('offers New File as well when saving is on, and nothing else more', () => {
    expect(labels(saving())).toEqual([
      'Open',
      'Open in New Tab',
      'New File…',
      'Copy Path',
      'Copy Relative Path',
      CAN_SAVE
    ]);
  });

  it('offers no New File while saving is off', () => {
    expect(labels(remote())).not.toContain('New File…');
  });

  it('never offers the four that stay absent, in either state', () => {
    for (const drawn of [labels(remote()).join('|'), labels(saving()).join('|')]) {
      for (const absent of NEVER) {
        expect(drawn).not.toContain(absent);
      }
    }
  });

  // The flag is its own rather than `mutate` flipped, and this is why. A build
  // that set the flag without meaning to may still not rename, duplicate,
  // trash or make a folder over there.
  it('never lets the create flag reach a second verb', () => {
    const items = buildTreeMenu(
      { canonical: 'src/a.ts', selection: ['src/a.ts'], destDir: 'src/', openable: true },
      {
        mutate: true,
        duplicate: true,
        reveal: true,
        readOnlyNote: CAN_SAVE,
        remoteCreateFile: true
      },
      actions
    );
    for (const absent of NEVER) {
      expect(labels(items).join('|')).not.toContain(absent);
    }
    expect(labels(items)).toContain('New File…');
  });

  it('never offers a verb that starts a program on this Mac', () => {
    for (const drawn of [labels(remote()).join('|'), labels(saving()).join('|')]) {
      expect(drawn).not.toContain('Reveal in Finder');
      expect(drawn).not.toContain('Open With');
    }
  });

  it('draws the note last and disabled, so it reads as a footnote', () => {
    const items = remote();
    const last = items[items.length - 1];
    expect(last).toBeDefined();
    if (last === undefined || last === 'sep') throw new Error('no note row');
    expect(last.label).toBe(NOTE);
    expect(last.disabled).toBe(true);
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
      { canonical: 'src/a.ts', selection: ['src/a.ts'], destDir: 'src/', openable: true },
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
