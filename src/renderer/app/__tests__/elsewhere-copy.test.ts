/**
 * Phase 90.1. The sentences the sidebars say when the project they follow is on
 * another machine.
 *
 * PHASE 90.3 TOOK THE FILES PAIR OFF THIS TEST, and the reason is the phase.
 * Those two said "Tortie reads files on this Mac only, so nothing is listed
 * here", and the Explorer now lists that machine's own rows, so the sentence
 * had become false. What the Explorer says instead is pinned in
 * ./p903-c-remote-copy.test.ts.
 *
 * PHASE 98 TOOK THE SEARCH PAIR OFF IT, for the same reason. Those two said
 * "Search does not reach Studio" and "Tortie searches files on this Mac only",
 * and the Search view now searches that machine's own folder, so both had
 * become false. The eleven sentences that replaced them are pinned below.
 *
 * PHASE 108 TOOK THE CONTEXT BODY OFF IT, the same move again. It said
 * "Tortie reads skills, servers and hooks from this Mac only, so nothing is
 * listed here", and the Context view now reads a project on a machine, so the
 * sentence had become false. The title stays, because the files do live on
 * that machine in every state. The sentences that replaced the body are
 * pinned below.
 *
 * The strings are pinned here because two builders write against them and
 * because a person reads them. The vocabulary audit next door already covers
 * the forbidden words in this file. This test covers two things that audit
 * cannot judge. The first is the exact wording. The second is the house
 * writing rules, being no dash of either kind and no colon that is not
 * introducing a list.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONTEXT_NESTED_NOT_LISTED,
  CONTEXT_NO_BRIDGE,
  contextCutLine,
  contextElsewhereTitle,
  contextEmptyOnMachine,
  contextNoAnswer,
  contextNoHome,
  contextNotConnected,
  contextOnMachineLine,
  contextReadingOn,
  contextRefreshOnMachineTitle,
  SEARCH_ANSWER_TOO_LARGE,
  SEARCH_FILTERS_ON_THIS_MAC,
  SEARCH_NO_BRIDGE,
  SEARCH_NOT_A_REPOSITORY,
  SEARCH_STOP_WAITING,
  searchFirstMatches,
  searchFolderMissing,
  searchNoAnswer,
  searchNotConnected,
  searchOnMachineLine,
  searchPatternRefused
} from '../machine-copy';

const ROOT = resolve(import.meta.dirname, '../../../..');

/**
 * Every string and template literal left after comments and module paths are
 * removed. It is the same reading the vocabulary audit next door performs. The
 * two helpers are repeated rather than imported, because importing a test file
 * from a test file registers its cases twice.
 */
function copyLiteralsOf(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const withoutPaths = withoutComments
    .split('\n')
    .filter((line) => !/^\s*(import|export)\b.*['"`]/.test(line))
    .join('\n');
  return (
    withoutPaths.match(
      /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g
    ) ?? []
  );
}

describe('what Context says about a project on a machine (Phase 108)', () => {
  it('keeps the title, because it is true in every state', () => {
    expect(contextElsewhereTitle('Studio')).toBe(
      'These agent files live on Studio.'
    );
  });

  it('takes the body Phase 108 made false out of the file', async () => {
    const copy = (await import('../machine-copy')) as Record<string, unknown>;
    expect(copy.CONTEXT_ELSEWHERE_BODY).toBeUndefined();
  });

  it('says what an old build cannot do, and nothing more', () => {
    expect(CONTEXT_NO_BRIDGE).toBe(
      'This build cannot read agent files on another machine.'
    );
  });

  it('says whose files are being read while they are', () => {
    expect(contextReadingOn('Studio')).toBe(
      'Reading what agents will load on Studio…'
    );
  });

  it('answers each of the three words that mean no rows', () => {
    expect(contextNotConnected('Studio')).toBe(
      'Tortie is not connected to Studio, so it read nothing.'
    );
    expect(contextNoAnswer('Studio')).toBe(
      'Studio did not answer, so there is nothing to show.'
    );
    expect(contextNoHome('Studio')).toBe(
      'Studio did not say where its home folder is, so Tortie read nothing ' +
        'rather than guess at paths.'
    );
  });

  it('names the three limits under every list a machine sent', () => {
    expect(contextOnMachineLine('Studio')).toBe(
      'Tortie read these files on Studio. Installing, enabling and pinning ' +
        'work on this Mac only.'
    );
    expect(CONTEXT_NESTED_NOT_LISTED).toBe(
      'Skills kept in folders inside this project are not listed when the ' +
        'project is on another machine.'
    );
    expect(contextCutLine('Studio')).toBe(
      'Studio holds more configuration than Tortie read this time, so some ' +
        'entries can be missing from this list.'
    );
  });

  it('says where adding happens, in place of a button that could do nothing', () => {
    expect(contextEmptyOnMachine('Studio')).toBe(
      'Nothing is configured for these agents on Studio. Adding a skill ' +
        'happens on that machine, or from an agent running there.'
    );
  });

  it('tells the Refresh control the truth about what it cannot see', () => {
    expect(contextRefreshOnMachineTitle('Studio')).toBe(
      'Read the files on Studio again. Tortie cannot see a change made on ' +
        'that machine until you press this.'
    );
  });
});

describe('what Search says about a folder on a machine (Phase 98)', () => {
  it('names the program that ran, every time', () => {
    expect(searchOnMachineLine('Studio')).toBe(
      "Tortie searched this project on Studio with that machine's own grep. " +
        'A pattern that works here can behave differently there.'
    );
  });

  it('says what a folder that is not a repository cost', () => {
    expect(SEARCH_NOT_A_REPOSITORY).toBe(
      'This folder is not a git repository, so Tortie searched every file ' +
        'in it. Nothing was skipped, and the results can include build output.'
    );
  });

  it('answers each of the four words that mean no rows', () => {
    expect(searchFolderMissing('Studio')).toBe(
      'There is no folder at this path on Studio, so nothing was searched.'
    );
    expect(searchPatternRefused('Studio')).toBe(
      'The grep on Studio did not accept this pattern. A search on another ' +
        "machine uses that machine's own program, and it does not read every " +
        'pattern the search on this Mac reads.'
    );
    expect(searchNotConnected('Studio')).toBe(
      'Tortie is not connected to Studio, so it searched nothing.'
    );
    expect(searchNoAnswer('Studio')).toBe(
      'Studio did not answer, so there are no results to show.'
    );
  });

  it('says which of the two caps cut the list', () => {
    expect(searchFirstMatches(20000)).toBe(
      'Tortie is showing the first 20,000 matching lines. There are more.'
    );
    expect(SEARCH_ANSWER_TOO_LARGE).toBe(
      'That machine had more to send than Tortie reads in one answer, so ' +
        'this list stops early. Narrow the search to see the rest.'
    );
  });

  it('says which controls do not go there, and what an old build cannot do', () => {
    // BOTH ANSWERS, because this is the body a person reads BEFORE they type,
    // which is before the note that names a folder that is not a repository.
    expect(SEARCH_FILTERS_ON_THIS_MAC).toBe(
      'Include, exclude and the ignore files toggle work on this Mac only. ' +
        'On another machine Tortie searches the files git knows about, or ' +
        'every file in the folder when it is not a repository.'
    );
    expect(SEARCH_NO_BRIDGE).toBe(
      'This build cannot search a folder on another machine.'
    );
  });

  it('labels the Stop control by what it actually does', () => {
    // It is a control label and not a sentence, so it carries no full stop.
    // Nothing here can stop the scan on that machine, and "Stop this search"
    // would claim that it can.
    expect(SEARCH_STOP_WAITING).toBe('Stop waiting for this search');
  });

  it('takes the two sentences Phase 98 made false out of the file', async () => {
    const copy = (await import('../machine-copy')) as Record<string, unknown>;
    expect(copy.searchElsewhereTitle).toBeUndefined();
    expect(copy.SEARCH_ELSEWHERE_BODY).toBeUndefined();
  });
});

describe('the writing rules, over every sentence in machine-copy.ts', () => {
  const source = readFileSync(
    resolve(ROOT, 'src/renderer/app/machine-copy.ts'),
    'utf8'
  );
  const literals = copyLiteralsOf(source);

  it('reads a set of sentences rather than nothing', () => {
    expect(literals.length).toBeGreaterThan(20);
  });

  it('holds no em dash and no en dash', () => {
    const offenders = literals.filter(
      (one) => one.includes('—') || one.includes('–')
    );
    expect(offenders).toEqual([]);
  });

  it('uses no colon in any Phase 98 or Phase 108 sentence', () => {
    // The whole file is not swept for a colon, because one literal in it is a
    // clock time and a clock time is not punctuation. These introduce no list,
    // so none of them may hold one.
    const sentences = [
      contextElsewhereTitle('Studio'),
      CONTEXT_NO_BRIDGE,
      contextNotConnected('Studio'),
      contextNoAnswer('Studio'),
      contextNoHome('Studio'),
      contextOnMachineLine('Studio'),
      CONTEXT_NESTED_NOT_LISTED,
      contextCutLine('Studio'),
      contextEmptyOnMachine('Studio'),
      contextRefreshOnMachineTitle('Studio'),
      searchOnMachineLine('Studio'),
      SEARCH_NOT_A_REPOSITORY,
      searchFolderMissing('Studio'),
      searchPatternRefused('Studio'),
      searchNotConnected('Studio'),
      searchNoAnswer('Studio'),
      searchFirstMatches(20000),
      SEARCH_ANSWER_TOO_LARGE,
      SEARCH_FILTERS_ON_THIS_MAC,
      SEARCH_NO_BRIDGE
    ];
    expect(sentences.filter((one) => one.includes(':'))).toEqual([]);
    // Each one is a complete sentence and ends in a full stop. The Stop label
    // is not in this list, because a control label is not a sentence, and the
    // Phase 108 reading line is not either, because a line that describes
    // work in progress ends in an ellipsis the way REVIEW_READING does.
    expect(sentences.filter((one) => !one.endsWith('.'))).toEqual([]);
    expect(SEARCH_STOP_WAITING.includes(':')).toBe(false);
    expect(contextReadingOn('Studio').includes(':')).toBe(false);
    expect(contextReadingOn('Studio').endsWith('…')).toBe(true);
  });
});
