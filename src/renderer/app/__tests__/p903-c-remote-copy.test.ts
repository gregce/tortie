/**
 * Phase 90.3. Every sentence a person reads about a folder on another machine.
 *
 * WHY THE EXACT WORDS ARE PINNED. Three builders write against this copy and a
 * person reads it. The vocabulary audit next door proves no transport word is
 * in it. This proves the wording itself, and it proves the house writing rules
 * over the whole Phase 90.3 block, being no dash of either kind, no colon that
 * is not introducing a list, and a complete sentence that ends in a full stop.
 *
 * ONE RULE IS CHECKED THAT NO AUDIT CAN CHECK. The word "remote" never reaches
 * a person. Every sentence names the label the person gave the machine.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addRemoteRefusal,
  createInRemoteProject,
  openRemoteFolderLabel,
  openRemoteHonesty,
  OPEN_REMOTE_BUTTON,
  OPEN_REMOTE_FOLDER_MENU_ITEM,
  OPEN_REMOTE_TITLE,
  QUICK_OPEN_ELSEWHERE_BODY,
  quickOpenElsewhereTitle,
  readClockTime,
  REMOTE_BAND_BODY,
  REMOTE_COPIED_WITH_MACHINE,
  REMOTE_SCM_SECTIONS_ABSENT,
  REMOTE_SCM_UNTRACKED_ABSENT,
  remoteBandTitle,
  remoteChangesBand,
  remoteChangesNone,
  remoteChangesNotRepo,
  remoteChangesUnreachable,
  remoteFileChip,
  remoteProjectAlreadyOpen,
  remoteReadAt,
  remoteSaveRefused,
  remoteTabCloseBody,
  remoteTabCloseTitle,
  remoteTabOpened,
  remoteTabTooltip,
  remoteTreeDenied,
  remoteTreeEmpty,
  remoteTreeMissingBody,
  remoteTreeMissingTitle,
  remoteTreeNotAFolder,
  remoteTreeNotConnected,
  remoteTreeReadAt,
  remoteTreeReadOnly,
  remoteTreeTruncated,
  remoteTreeUnreachable,
  SYMBOLS_ELSEWHERE_BODY,
  symbolsElsewhereTitle
} from '../machine-copy';

const ROOT = resolve(import.meta.dirname, '../../../..');
const L = 'Studio';
const P = '/home/greg/api';

/** One fixed instant, so the clock sentences are pinned rather than sampled. */
const AT = new Date(2026, 7, 18, 14, 32, 0).getTime();

describe('the band, which is on every view and never goes away', () => {
  it('says whose files these are and what Tortie will not do', () => {
    expect(remoteBandTitle(L)).toBe('Files live on Studio.');
    expect(REMOTE_BAND_BODY).toBe(
      'Tortie reads what is in this folder on that machine. It never writes ' +
        'there.'
    );
  });
});

describe('the Explorer', () => {
  it('says which moment the rows are from', () => {
    expect(readClockTime(AT)).toBe('14:32');
    expect(remoteReadAt(AT)).toBe(
      'Read at 14:32. Press Refresh to read it again.'
    );
    // One definition, two names. The Explorer and Source Control say the same
    // thing after a good read, so they can never drift apart.
    expect(remoteTreeReadAt).toBe(remoteReadAt);
  });

  it('says each of the five ways a read does not land', () => {
    expect(remoteTreeMissingTitle(L)).toBe('That folder is not on Studio.');
    expect(remoteTreeMissingBody(P)).toBe(
      'Tortie asked for /home/greg/api and that machine says there is ' +
        'nothing there.'
    );
    expect(remoteTreeNotAFolder(P, L)).toBe(
      '/home/greg/api on Studio is a file, not a folder.'
    );
    expect(remoteTreeDenied(P, L)).toBe(
      'Tortie cannot read /home/greg/api on Studio.'
    );
    expect(remoteTreeUnreachable(L)).toBe(
      'Studio did not answer, so Tortie could not read that folder.'
    );
    expect(remoteTreeNotConnected(L)).toBe(
      'Tortie is not connected to Studio, so it cannot read that folder.'
    );
  });

  it('says an empty folder is empty rather than saying nothing', () => {
    expect(remoteTreeEmpty(L)).toBe('That folder is empty on Studio.');
  });

  it('says all three numbers when the answer was capped', () => {
    expect(remoteTreeTruncated(4000, 12500, 4000)).toBe(
      'Showing 4,000 of 12,500 files and folders. Tortie reads at most ' +
        '4,000 of them in one go.'
    );
  });

  it('says once why the menu is short, and what Copy Path did', () => {
    expect(remoteTreeReadOnly(L)).toBe('Tortie only reads files on Studio.');
    expect(REMOTE_COPIED_WITH_MACHINE).toBe(
      'Copied the path with the machine in front of it.'
    );
  });
});

describe('Source Control', () => {
  it('says what it can show and what it cannot change', () => {
    expect(remoteChangesBand(L)).toBe(
      'These changes are on Studio. Tortie can show them and cannot change ' +
        'them.'
    );
    expect(remoteChangesNone(L)).toBe(
      'Nothing has changed in that folder on Studio.'
    );
    expect(remoteChangesUnreachable(L)).toBe(
      'Studio did not answer, so Tortie could not read what changed.'
    );
    expect(remoteChangesNotRepo(L)).toBe(
      'That folder on Studio is not a git repository.'
    );
  });

  it('says once why history, branches and runs are not on screen', () => {
    expect(REMOTE_SCM_SECTIONS_ABSENT).toBe(
      'Tortie shows the changed files for a folder on another machine. It ' +
        'does not show history, branches or runs there.'
    );
  });

  it('says why a file somebody just made over there is not in the list', () => {
    // PHASE 90.3 FIX ROUND. The read behind the list drops an untracked and an
    // ignored entry, and the Source Control view for a folder on this Mac has
    // an Untracked group where this one has no equivalent. Without this line a
    // new file over there is simply absent and nothing says why.
    expect(REMOTE_SCM_UNTRACKED_ABSENT).toBe(
      'A file that git is not yet tracking is not listed here.'
    );
  });
});

describe('Quick Open and the symbol palette', () => {
  it('says what does not reach that machine, then what Tortie does read', () => {
    expect(quickOpenElsewhereTitle(L)).toBe('Quick Open does not reach Studio.');
    expect(QUICK_OPEN_ELSEWHERE_BODY).toBe(
      "Tortie lists files on this Mac only. This project's files are on that " +
        'machine.'
    );
    expect(symbolsElsewhereTitle(L)).toBe('Symbols do not reach Studio.');
    expect(SYMBOLS_ELSEWHERE_BODY).toBe(
      'Tortie reads symbols from files on this Mac only.'
    );
  });
});

describe('the editor', () => {
  it('says the file is over there and that Save cannot work', () => {
    expect(remoteFileChip(L)).toBe(
      'This file is on Studio. Tortie is showing what it read and cannot ' +
        'save changes.'
    );
    expect(remoteSaveRefused(L)).toBe(
      'That file is on Studio, so Tortie cannot save it.'
    );
  });
});

describe('opening a folder on a machine', () => {
  it('draws the sheet', () => {
    expect(OPEN_REMOTE_FOLDER_MENU_ITEM).toBe('Open Folder on a Machine…');
    expect(OPEN_REMOTE_TITLE).toBe('Open a folder on a machine');
    expect(openRemoteFolderLabel(L)).toBe('Folder on Studio');
    expect(openRemoteHonesty(L)).toBe(
      'Tortie reads this folder on Studio. It never writes there, and it ' +
        'does not search it.'
    );
    expect(OPEN_REMOTE_BUTTON).toBe('Open it');
  });

  it('answers every refusal word main can send', () => {
    expect(addRemoteRefusal('missing', P, L)).toBe(
      'There is no folder at /home/greg/api on Studio.'
    );
    expect(addRemoteRefusal('notdir', P, L)).toBe(
      '/home/greg/api on Studio is a file, not a folder.'
    );
    expect(addRemoteRefusal('denied', P, L)).toBe(
      'Tortie cannot read /home/greg/api on Studio.'
    );
    expect(addRemoteRefusal('unreachable', P, L)).toBe(
      'Studio did not answer, so Tortie could not check that folder.'
    );
    expect(addRemoteRefusal('notConnected', P, L)).toBe(
      'Tortie is not connected to Studio.'
    );
    expect(addRemoteRefusal('notAbsolute', P, L)).toBe(
      'Type the whole path, starting with a slash.'
    );
    expect(addRemoteRefusal('noSuchMachine', P, L)).toBe(
      'Tortie has no machine with that name any more.'
    );
  });

  it('says the folder is already a tab rather than making a second one', () => {
    expect(remoteProjectAlreadyOpen(L)).toBe(
      'That folder on Studio is already open. Tortie moved to its tab.'
    );
  });
});

describe('the tab, and sessions in it', () => {
  it('names the folder and the machine', () => {
    expect(remoteTabTooltip('api', P, L)).toBe(
      'api, /home/greg/api on Studio'
    );
  });

  it('says closing the tab ends nothing', () => {
    expect(remoteTabCloseTitle('api')).toBe("Close 'api'?");
    expect(remoteTabCloseBody(L)).toBe(
      'Its sessions keep running on Studio and reappear when you open that ' +
        'folder again.'
    );
  });

  it('says where a session made in that tab will run', () => {
    expect(createInRemoteProject(L)).toBe(
      'This project is on Studio, so the session runs there.'
    );
    expect(remoteTabOpened(P, L)).toBe(
      'Tortie opened a tab for /home/greg/api on Studio and put the session ' +
        'in it.'
    );
  });
});

// ---------------------------------------------------------------------------
// The rules that hold over the whole set
// ---------------------------------------------------------------------------

/** Every sentence above, composed once with the same two values. */
const EVERY: readonly string[] = [
  remoteBandTitle(L),
  REMOTE_BAND_BODY,
  remoteReadAt(AT),
  remoteTreeMissingTitle(L),
  remoteTreeMissingBody(P),
  remoteTreeNotAFolder(P, L),
  remoteTreeDenied(P, L),
  remoteTreeUnreachable(L),
  remoteTreeNotConnected(L),
  remoteTreeEmpty(L),
  remoteTreeTruncated(4000, 12500, 4000),
  remoteTreeReadOnly(L),
  REMOTE_COPIED_WITH_MACHINE,
  remoteChangesBand(L),
  remoteChangesNone(L),
  remoteChangesUnreachable(L),
  remoteChangesNotRepo(L),
  REMOTE_SCM_SECTIONS_ABSENT,
  REMOTE_SCM_UNTRACKED_ABSENT,
  quickOpenElsewhereTitle(L),
  QUICK_OPEN_ELSEWHERE_BODY,
  symbolsElsewhereTitle(L),
  SYMBOLS_ELSEWHERE_BODY,
  remoteFileChip(L),
  remoteSaveRefused(L),
  openRemoteHonesty(L),
  addRemoteRefusal('missing', P, L),
  addRemoteRefusal('notdir', P, L),
  addRemoteRefusal('denied', P, L),
  addRemoteRefusal('unreachable', P, L),
  addRemoteRefusal('notConnected', P, L),
  addRemoteRefusal('notAbsolute', P, L),
  addRemoteRefusal('noSuchMachine', P, L),
  remoteProjectAlreadyOpen(L),
  remoteTabCloseBody(L),
  createInRemoteProject(L),
  remoteTabOpened(P, L)
];

describe('the house writing rules, over every Phase 90.3 sentence', () => {
  it('reads a set of sentences rather than nothing', () => {
    expect(EVERY.length).toBeGreaterThan(30);
  });

  it('holds no em dash and no en dash', () => {
    expect(EVERY.filter((one) => one.includes('—') || one.includes('–'))).toEqual(
      []
    );
  });

  it('holds no colon, because not one of them introduces a list', () => {
    // One sentence is exempt and it is named rather than filtered out by a
    // pattern. "Read at 14:32" holds a clock time, and a clock time is not
    // punctuation. Every other sentence must hold no colon at all.
    const exempt = remoteReadAt(AT);
    expect(
      EVERY.filter((one) => one !== exempt && one.includes(':'))
    ).toEqual([]);
    expect(exempt.replace('14:32', '')).not.toContain(':');
  });

  it('is complete sentences, each ending in a full stop', () => {
    expect(EVERY.filter((one) => !one.endsWith('.'))).toEqual([]);
  });

  it('never says the word remote to a person', () => {
    const labels = [
      ...EVERY,
      OPEN_REMOTE_FOLDER_MENU_ITEM,
      OPEN_REMOTE_TITLE,
      OPEN_REMOTE_BUTTON,
      openRemoteFolderLabel(L),
      remoteTabTooltip('api', P, L),
      remoteTabCloseTitle('api')
    ];
    expect(labels.filter((one) => /\bremote\b/i.test(one))).toEqual([]);
  });

  it('names the machine by its label in every sentence that has one', () => {
    // The ones that do not name a machine are named here rather than counted.
    // Two refusals are about what the person typed rather than about a
    // machine. The capped count is about Tortie's own cap. The rest are second
    // lines whose first line named the machine one line above.
    const withoutLabel = EVERY.filter((one) => !one.includes(L));
    expect(withoutLabel).toEqual([
      REMOTE_BAND_BODY,
      remoteReadAt(AT),
      remoteTreeMissingBody(P),
      remoteTreeTruncated(4000, 12500, 4000),
      REMOTE_COPIED_WITH_MACHINE,
      REMOTE_SCM_SECTIONS_ABSENT,
      REMOTE_SCM_UNTRACKED_ABSENT,
      QUICK_OPEN_ELSEWHERE_BODY,
      SYMBOLS_ELSEWHERE_BODY,
      addRemoteRefusal('notAbsolute', P, L),
      addRemoteRefusal('noSuchMachine', P, L)
    ]);
  });
});

describe('the Files pair Phase 90.1 shipped is gone', () => {
  it('is not exported any more, because the Explorer now lists rows', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/app/machine-copy.ts'),
      'utf8'
    );
    expect(source).not.toContain('FILES_ELSEWHERE_BODY');
    expect(source).not.toContain('filesElsewhereTitle');
    expect(source).not.toContain(
      'Tortie reads files on this Mac only, so nothing is listed here.'
    );
  });
});
