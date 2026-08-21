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
 *
 * PHASE 97 MOVED THREE THINGS HERE. `remoteChangesNone` answers for both groups
 * now, `reviewUntrackedTitle` is new, and the sentence saying a new file is not
 * listed is deleted, because the list holds it.
 *
 * PHASE 105 REWROTE THE SECTIONS ABSENT SENTENCE AND ADDED FIFTEEN. The old one
 * named three sections Tortie does not show for a folder on another machine and
 * Runs was one of them. A Runs group is drawn on such a tab now, so the sentence
 * names runs among the things it DOES show and the refusal is down to History
 * and Branches. The fifteen that came with it are pinned in their own describe
 * near the foot of this file.
 *
 * PHASE 101 REWROTE THREE AND ADDED ELEVEN. The editor band, the save refusal
 * and the honesty line on the open sheet all said Tortie never writes on
 * another machine, and it writes on one a person has let it save on. The eleven
 * that came with them are the seven refusals a save can meet past the first
 * one, the two refusals an open can meet, the Explorer note for a machine that
 * can be saved to, and the New folder button's own sentence.
 * `remoteTreeReadOnly` is UNCHANGED and is still what a machine with no
 * confirmed folder draws.
 *
 * PHASE 99 REPLACED THE QUICK OPEN PAIR WITH SEVEN SENTENCES. The pair said
 * "Quick Open does not reach Studio", and Quick Open reads that machine's own
 * file names now, so the refusal had become false. The seven that replaced it
 * are pinned below. The symbol palette's pair is unchanged, because there is no
 * parser on the other machine and that refusal is still true.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REMOTE_FILE_MAX_BYTES } from '@shared/ipc';
import {
  addRemoteRefusal,
  createInRemoteProject,
  openRemoteFolderLabel,
  openRemoteHonesty,
  OPEN_REMOTE_BUTTON,
  OPEN_REMOTE_FOLDER_MENU_ITEM,
  OPEN_REMOTE_TITLE,
  quickOpenFolderMissing,
  quickOpenNamesCapped,
  quickOpenNamesFrom,
  quickOpenNamesTruncated,
  quickOpenNoAnswer,
  quickOpenNotConnected,
  quickOpenNotRepo,
  quickOpenReadingNames,
  readClockTime,
  remoteCreateExists,
  remoteNewFolderNotYet,
  remoteOpenTooLarge,
  remoteOpenTooLargeOver,
  remoteSaveMissing,
  remoteSaveNoMode,
  remoteSaveNoSum,
  remoteSaveLostAnswer,
  remoteSaveOutsideRoot,
  remoteSaveRefusal,
  remoteSaveStale,
  remoteSaveTooLarge,
  remoteTreeCanSave,
  REMOTE_BAND_BODY,
  REMOTE_COPIED_WITH_MACHINE,
  REMOTE_SCM_SECTIONS_NOTE,
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
  reviewUntrackedTitle,
  RUNS_NOT_LIVE,
  RUNS_NO_BRIDGE,
  RUNS_STEPS_ELSEWHERE,
  runsBranchAt,
  runsFolderDenied,
  runsFolderMissing,
  runsNewest,
  runsNoAnswer,
  runsNoBranch,
  runsNotConnected,
  runsNotGitHub,
  runsNotRepo,
  runsOnMachineBand,
  runsReadAt,
  runsReadingBranch,
  SYMBOLS_ELSEWHERE_BODY,
  symbolsElsewhereTitle
} from '../machine-copy';

const ROOT = resolve(import.meta.dirname, '../../../..');
const L = 'Studio';
const P = '/home/greg/api';
/** PHASE 101. One machine's confirmed folder, and the save cap in bytes. */
const R = '/home/greg';
const MAX = 90_000;

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
    // PHASE 97 WIDENED THIS ONE. The list now holds both groups, so the
    // sentence for an empty folder has to answer for both.
    expect(remoteChangesNone(L)).toBe(
      'Nothing has changed in that folder on Studio, and it holds no ' +
        'untracked files.'
    );
    expect(remoteChangesUnreachable(L)).toBe(
      'Studio did not answer, so Tortie could not read what changed.'
    );
    expect(remoteChangesNotRepo(L)).toBe(
      'That folder on Studio is not a git repository.'
    );
  });

  it('says once what the view shows and what it does not', () => {
    // PHASE 105 REWROTE THIS ONE, PHASE 106 REWROTE IT AGAIN AND PHASE 107
    // RENAMED IT. It named three sections that are not drawn for a folder on
    // another machine, and each round that shipped one of them made another
    // clause false. All three are drawn now, so the constant stopped being a
    // refusal and its name lost the word ABSENT. What it refuses now is one
    // read rather than a section, being the files one commit changed. The word
    // branch is singular on purpose, because Tortie shows the one branch that
    // is checked out and does not list the others.
    expect(REMOTE_SCM_SECTIONS_NOTE).toBe(
      'Tortie shows the changed files, the history, the branch and the runs ' +
        'for a folder on another machine. It does not show the files one ' +
        'commit changed there, and it writes nothing in that folder.'
    );
    for (const shipped of ['runs', 'branch', 'history']) {
      expect(REMOTE_SCM_SECTIONS_NOTE).not.toMatch(
        new RegExp(`does not show[^.]*\\b${shipped}(es)?\\b`, 'i')
      );
    }
  });

  it('has no export left under the old name', () => {
    // PHASE 107 PINS THE RENAME, which is the shape this file already uses for
    // the two constants Phase 97 deleted. A constant that is renamed and left
    // behind under both names is how two surfaces come to say two things.
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/app/machine-copy.ts'),
      'utf8'
    );
    // The old name survives in ONE place on purpose, being the comment above
    // the constant that records the rename. The export itself is gone, and so
    // is the sentence it used to hold.
    expect(source).not.toContain('export const REMOTE_SCM_SECTIONS_ABSENT');
    expect(source).not.toContain('It does not show history there.');
    expect(source).toContain('export const REMOTE_SCM_SECTIONS_NOTE');
  });

  it('no longer says a new file is missing, because it is not missing', () => {
    // PHASE 97 DELETED THAT SENTENCE. Phase 90.3 wrote it because the read
    // behind the list threw every untracked entry away, so a file somebody
    // had just created over there was simply absent. This phase carries those
    // entries into their own group, so the sentence became untrue and the
    // constant is gone from the copy module and from the surface that drew it.
    // This is the shape the `Files pair` describe at the foot of this file
    // already uses, which is how this file pins a deletion.
    for (const rel of [
      'src/renderer/app/machine-copy.ts',
      'src/renderer/scm/ScmSection.tsx'
    ]) {
      const source = readFileSync(resolve(ROOT, rel), 'utf8');
      expect(source).not.toContain('REMOTE_SCM_UNTRACKED_ABSENT');
      expect(source).not.toContain(
        'A file that git is not yet tracking is not listed here.'
      );
    }
  });

  it('heads the new files in the session menu with the machine', () => {
    expect(reviewUntrackedTitle(L)).toBe('Untracked on Studio');
  });
});

describe('the symbol palette', () => {
  it('says what does not reach that machine, then what Tortie does read', () => {
    expect(symbolsElsewhereTitle(L)).toBe('Symbols do not reach Studio.');
    expect(SYMBOLS_ELSEWHERE_BODY).toBe(
      'Tortie reads symbols from files on this Mac only.'
    );
  });
});

describe('Quick Open on a folder that is on a machine (Phase 99)', () => {
  it('says a read is in flight rather than showing an empty list', () => {
    expect(quickOpenReadingNames(L)).toBe(
      'Tortie is reading the file names on Studio.'
    );
  });

  it('names the machine and the moment the names were read', () => {
    // The time is on screen because nothing polls that machine. A file an
    // agent creates over there is not in this list until the next read.
    expect(quickOpenNamesFrom(L, AT)).toBe(
      'These file names came from Studio. Tortie read them at 14:32.'
    );
  });

  it('says how many names it read when the cap cut the list', () => {
    expect(quickOpenNamesCapped(50000, L)).toBe(
      'Tortie read the first 50,000 file names on Studio. A name past that ' +
        'one is not in this list.'
    );
  });

  it('says the machine stopped listing when the byte ceiling cut it (Phase 99.1)', () => {
    expect(quickOpenNamesTruncated(31204, L)).toBe(
      'Studio stopped listing at 31,204 file names, because Tortie reads at ' +
        'most 4,194,304 bytes of names in one go. A file over there may be ' +
        'missing from this list.'
    );
  });

  it('says a folder that is not a repository was walked, and what was skipped', () => {
    expect(quickOpenNotRepo(L)).toBe(
      'That folder on Studio is not a git repository. Tortie listed the ' +
        'files under it, apart from the ones inside .git and node_modules.'
    );
  });

  it('answers each of the three words that mean no names', () => {
    expect(quickOpenFolderMissing(L)).toBe(
      'There is no folder at this path on Studio, so there are no file names ' +
        'to show.'
    );
    expect(quickOpenNotConnected(L)).toBe(
      'Tortie is not connected to Studio, so it has no file names for this ' +
        'project.'
    );
    expect(quickOpenNoAnswer(L)).toBe(
      'Studio did not answer, so Tortie has no file names for this project.'
    );
  });

  it('takes the pair Phase 99 made false out of the file', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/renderer/app/machine-copy.ts'),
      'utf8'
    );
    expect(source).not.toContain('QUICK_OPEN_ELSEWHERE_BODY');
    expect(source).not.toContain('quickOpenElsewhereTitle');
    expect(source).not.toContain('Quick Open does not reach');
  });
});

describe('the editor', () => {
  it('says the file is over there and what would let Tortie save it', () => {
    expect(remoteFileChip(L)).toBe(
      'This file is on Studio. Tortie is showing what it read and cannot ' +
        'save it until you let it save on that machine.'
    );
    expect(remoteSaveRefused(L)).toBe(
      'Tortie cannot save on Studio. Open Settings, then Machines, then ' +
        'Studio, and let Tortie save files there. Nothing was written.'
    );
  });
});

// ---------------------------------------------------------------------------
// PHASE 101. Saving a file on a machine
// ---------------------------------------------------------------------------

describe('every way a save can be refused', () => {
  it('says nothing was written, in every one of the eight', () => {
    expect(remoteSaveOutsideRoot(R, L)).toBe(
      'Tortie may only save under /home/greg on Studio, and this file is ' +
        'outside that folder. Nothing was written.'
    );
    expect(remoteSaveStale(L)).toBe(
      'Tortie did not save this file, because it changed on Studio after ' +
        'Tortie read it. Nothing was written. Open it again to read what it ' +
        'says now.'
    );
    expect(remoteSaveMissing(L)).toBe(
      'Tortie did not save this file, because it is no longer on Studio. ' +
        'Nothing was written.'
    );
    expect(remoteCreateExists(R, L)).toBe(
      'Tortie did not make that file, because a file of that name is ' +
        'already on Studio under /home/greg. Nothing was written.'
    );
    expect(remoteSaveNoMode(L)).toBe(
      'Tortie did not save this file, because it could not read the file\'s ' +
        'permissions on Studio and will not write it with permissions ' +
        'nobody chose. Nothing was written.'
    );
    expect(remoteSaveNoSum(L)).toBe(
      'Tortie did not save this file, because it could not get a checksum ' +
        'from Studio, and Tortie replaces a file only after it has checked ' +
        'the file\'s contents. Nothing was written.'
    );
    expect(remoteSaveTooLarge(96_231, L)).toBe(
      'That file is 96,231 bytes and Tortie can save files up to 90,000 ' +
        'bytes on Studio. Nothing was written.'
    );
  });

  it('holds the cap it names equal to the one main refuses on', () => {
    expect(remoteSaveTooLarge(96_231, L)).toContain(MAX.toLocaleString());
    expect(REMOTE_FILE_MAX_BYTES).toBe(MAX);
  });

  it('answers every outcome word main can send, and no other', () => {
    const words = [
      'writesOff',
      'outsideRoot',
      'stale',
      'missing',
      'exists',
      'nomode',
      'nosum',
      'tooLarge'
    ] as const;
    // Every one of the eight says that nothing was written, because in every
    // one of them nothing was. `stale` is the only one that says a second
    // thing after it, which is to open the file again.
    for (const word of words) {
      const said = remoteSaveRefusal(word, L, R, 96_231);
      expect([word, said.includes('Nothing was written.')]).toEqual([
        word,
        true
      ]);
    }
    expect(remoteSaveRefusal('outsideRoot', L, R, 0)).toBe(
      remoteSaveOutsideRoot(R, L)
    );
    expect(remoteSaveRefusal('exists', L, R, 0)).toBe(remoteCreateExists(R, L));
    expect(remoteSaveRefusal('tooLarge', L, R, 96_231)).toBe(
      remoteSaveTooLarge(96_231, L)
    );
  });

  it('never draws a folder nobody confirmed', () => {
    // Main sends the folder on both words that name one. A null there can
    // only mean saving is off, so the sentence that says exactly that is what
    // a person reads, rather than a folder composed out of nothing.
    expect(remoteSaveRefusal('outsideRoot', L, null, 0)).toBe(
      remoteSaveRefused(L)
    );
    expect(remoteSaveRefusal('exists', L, null, 0)).toBe(remoteSaveRefused(L));
  });
});

describe('opening a file that could never be saved', () => {
  it('names the size when the read was whole', () => {
    expect(remoteOpenTooLarge(1_238_904, L)).toBe(
      'That file is 1,238,904 bytes and Tortie can save files up to 90,000 ' +
        'bytes on Studio, so it did not open it. Nothing on that machine ' +
        'changed.'
    );
  });

  it('says over when the read was cut, because the size is a floor', () => {
    expect(remoteOpenTooLargeOver(2_097_152, L)).toBe(
      'That file is over 2,097,152 bytes and Tortie can save files up to ' +
        '90,000 bytes on Studio, so it did not open it. Nothing on that ' +
        'machine changed.'
    );
  });
});

describe('the Explorer, on a machine that can be saved to', () => {
  it('says both halves, and leaves the read only line alone', () => {
    expect(remoteTreeCanSave(R, L)).toBe(
      'Tortie reads files on Studio and can save under /home/greg.'
    );
    // Unchanged by this phase. It is still what a machine with no confirmed
    // folder draws, which is every machine before Phase 101.
    expect(remoteTreeReadOnly(L)).toBe('Tortie only reads files on Studio.');
  });

  it('gives the New folder button its own sentence', () => {
    expect(remoteNewFolderNotYet(L)).toBe(
      'Tortie cannot make a folder on Studio.'
    );
  });
});

describe('opening a folder on a machine', () => {
  it('draws the sheet', () => {
    expect(OPEN_REMOTE_FOLDER_MENU_ITEM).toBe('Open Folder on a Machine…');
    expect(OPEN_REMOTE_TITLE).toBe('Open a folder on a machine');
    expect(openRemoteFolderLabel(L)).toBe('Folder on Studio');
    // PHASE 98 DROPPED THE THIRD CLAUSE. It read "and it does not search it",
    // and the Search view of a tab on a machine searches that folder now.
    // PHASE 101 REWROTE THE SECOND. It read "It never writes there", and that
    // became false for a machine a person has let Tortie save on. After this
    // phase no part of this sentence is stale.
    expect(openRemoteHonesty(L)).toBe(
      'Tortie reads this folder on Studio. It writes there only where you ' +
        'have let it save.'
    );
    expect(openRemoteHonesty(L)).not.toContain('search');
    expect(openRemoteHonesty(L)).not.toContain('never writes');
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

describe('the runs for a folder that is on a machine (Phase 105)', () => {
  it('says where each half of the answer came from, and what never crossed', () => {
    // THE BAND IS THE WHOLE DESIGN IN ONE SENTENCE. Tortie asks the machine
    // which branch is checked out, and it asks GitHub from this Mac with the gh
    // this Mac already has. No token and no sign in details go to the machine.
    expect(runsOnMachineBand(L)).toBe(
      'Tortie asked Studio which branch is checked out. It asked GitHub from ' +
        'this Mac, and it sent no sign in details to Studio.'
    );
  });

  it('says a read is in flight rather than showing an empty list', () => {
    expect(runsReadingBranch(L)).toBe('Tortie is reading the branch on Studio.');
  });

  it('says when it read, and says the list will not refresh on its own', () => {
    // Nothing polls the machine and nothing polls GitHub, because main cannot
    // see a push made on another computer. Both facts are on screen.
    expect(runsReadAt(L, AT)).toBe('Tortie read this from Studio at 14:32.');
    expect(RUNS_NOT_LIVE).toBe(
      'This list does not refresh. Read it again to see anything that has run ' +
        'since.'
    );
  });

  it('names the branch and the commit checked out over there', () => {
    expect(runsBranchAt('main', L, '1f2e3d4')).toBe(
      'The branch checked out on Studio is main at 1f2e3d4.'
    );
  });

  it('says the rows are the newest ones when the limit was reached', () => {
    // PHASE 99 IS WHY THIS SENTENCE EXISTS. It carried a cut through main that
    // the panel never drew, so a list that had been cut was drawn as if it were
    // whole. A row count equal to the limit gets this sentence under it.
    // PHASE 120 WIDENED THE READ. The list now merges the branch query with a
    // query at the branch's newest commit, so the sentence names both.
    expect(runsNewest(10)).toBe(
      'These are the newest 10 runs for that branch and its newest commit. ' +
        'There are older ones.'
    );
  });

  it('names both causes when there is no branch to ask GitHub about', () => {
    expect(runsNoBranch(L)).toBe(
      'Tortie read no branch name for that folder on Studio. That happens ' +
        'when a commit is checked out directly, and when the repository has ' +
        'no commits yet. Either way there is no branch to ask GitHub about.'
    );
  });

  it('answers each of the five words that mean no rows', () => {
    expect(runsNotRepo(L)).toBe(
      'That folder on Studio is not a git repository, so it has no runs.'
    );
    expect(runsNotGitHub(L)).toBe(
      'The repository in that folder on Studio has no GitHub address for its ' +
        'origin, so there are no runs to show.'
    );
    expect(runsFolderMissing(L)).toBe(
      'There is no folder at this path on Studio, so there are no runs to show.'
    );
    expect(runsFolderDenied(L)).toBe(
      'Tortie cannot read that folder on Studio, so it has no runs to show.'
    );
    expect(runsNotConnected(L)).toBe(
      'Tortie is not connected to Studio, so it could not read the branch.'
    );
    expect(runsNoAnswer(L)).toBe(
      'Studio did not answer, so Tortie could not read the branch.'
    );
  });

  it('says once that a run opens on GitHub rather than expanding', () => {
    expect(RUNS_STEPS_ELSEWHERE).toBe(
      'The steps inside a run are not shown for a folder on another machine. ' +
        'Open a run on GitHub to read them.'
    );
  });

  it('says a build with no bridge cannot do this at all', () => {
    expect(RUNS_NO_BRIDGE).toBe(
      'This build cannot read the runs for a folder on another machine.'
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
  REMOTE_SCM_SECTIONS_NOTE,
  reviewUntrackedTitle(L),
  symbolsElsewhereTitle(L),
  SYMBOLS_ELSEWHERE_BODY,
  quickOpenReadingNames(L),
  quickOpenNamesFrom(L, AT),
  quickOpenNamesCapped(50000, L),
  quickOpenNamesTruncated(31204, L),
  quickOpenNotRepo(L),
  quickOpenFolderMissing(L),
  quickOpenNotConnected(L),
  quickOpenNoAnswer(L),
  remoteFileChip(L),
  remoteSaveRefused(L),
  openRemoteHonesty(L),
  // PHASE 101. Eleven more, every one of them read by the five rules below.
  remoteSaveOutsideRoot(R, L),
  remoteSaveStale(L),
  remoteSaveMissing(L),
  remoteCreateExists(R, L),
  remoteSaveNoMode(L),
  remoteSaveNoSum(L),
  remoteSaveLostAnswer(L),
  remoteSaveTooLarge(96_231, L),
  remoteOpenTooLarge(1_238_904, L),
  remoteOpenTooLargeOver(2_097_152, L),
  remoteTreeCanSave(R, L),
  remoteNewFolderNotYet(L),
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
  remoteTabOpened(P, L),
  // PHASE 105. Fifteen sentences about the runs for a folder on another
  // machine. Every one of them is read by the four rules below.
  runsOnMachineBand(L),
  runsReadingBranch(L),
  runsReadAt(L, AT),
  RUNS_NOT_LIVE,
  runsBranchAt('main', L, '1f2e3d4'),
  runsNewest(10),
  runsNoBranch(L),
  runsNotRepo(L),
  runsNotGitHub(L),
  runsFolderMissing(L),
  runsFolderDenied(L),
  runsNotConnected(L),
  runsNoAnswer(L),
  RUNS_STEPS_ELSEWHERE,
  RUNS_NO_BRIDGE
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
    // TWO sentences are exempt and both are named rather than filtered out by
    // a pattern. Each holds a clock time, and a clock time is not punctuation.
    // PHASE 99 ADDED THE SECOND ONE, which is Quick Open saying when it read
    // the file names. Every other sentence must hold no colon at all.
    // PHASE 105 ADDED THE THIRD, which is the runs group saying when it read.
    const exempt = [
      remoteReadAt(AT),
      quickOpenNamesFrom(L, AT),
      runsReadAt(L, AT)
    ];
    expect(
      EVERY.filter((one) => !exempt.includes(one) && one.includes(':'))
    ).toEqual([]);
    for (const one of exempt) {
      expect(one.replace('14:32', '')).not.toContain(':');
    }
  });

  it('is complete sentences, each ending in a full stop', () => {
    // PHASE 97. One entry is exempt and it is named here rather than filtered
    // out by a pattern. `reviewUntrackedTitle` is a heading over a group of
    // menu rows, and a heading is not a sentence. It is in the set anyway, so
    // the dash rule, the colon rule and the "never say remote" rule all read
    // it. Every other entry must be a complete sentence ending in a full stop.
    const exempt = reviewUntrackedTitle(L);
    expect(
      EVERY.filter((one) => one !== exempt && !one.endsWith('.'))
    ).toEqual([]);
    expect(exempt).toBe('Untracked on Studio');
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
      REMOTE_SCM_SECTIONS_NOTE,
      SYMBOLS_ELSEWHERE_BODY,
      addRemoteRefusal('notAbsolute', P, L),
      addRemoteRefusal('noSuchMachine', P, L),
      // PHASE 105. Four of the fifteen name no machine. Two are second lines
      // whose first line named one, one is about Tortie's own row limit, and
      // one is about this build rather than about a machine.
      RUNS_NOT_LIVE,
      runsNewest(10),
      RUNS_STEPS_ELSEWHERE,
      RUNS_NO_BRIDGE
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
