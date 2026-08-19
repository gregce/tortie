/**
 * The Explorer's context menu on a row that is on another machine
 * (Phase 90.3).
 *
 * FIVE CROSS AND THE REST ARE ABSENT, which is the split research 55 section
 * 14.3 counted. The test asserts the absences by name, because an absence is
 * the whole safety property here: a verb that writes has no far side, and
 * Move to Trash has no far side that could ever be built, since
 * `shell.trashItem` has no equal over there and a remote `rm` would turn a
 * recoverable delete into an unrecoverable one.
 */

import { describe, expect, it } from 'vitest';
import {
  buildTreeMenu,
  pathsForClipboard,
  type TreeMenuActions
} from '../tree-menu';

const NOTE = 'Tortie only reads files on mac-pro.';

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

  it('never offers a verb that writes', () => {
    const drawn = labels(remote()).join('|');
    for (const absent of [
      'New File…',
      'New Folder…',
      'Rename…',
      'Duplicate',
      'Move to Trash'
    ]) {
      expect(drawn).not.toContain(absent);
    }
  });

  it('never offers a verb that starts a program on this Mac', () => {
    const drawn = labels(remote()).join('|');
    expect(drawn).not.toContain('Reveal in Finder');
    expect(drawn).not.toContain('Open With');
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
