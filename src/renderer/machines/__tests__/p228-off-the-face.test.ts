/**
 * Phase 228. The sentences taken off the remote face stay off it.
 *
 * THE OPERATOR'S RULE OF 2026-09-07, verbatim: "I DO not want a ton of
 * explanatory text written into any of the remote machine settings or in the
 * nav bar windows (just because its a remote machine). It should feel almost
 * identical to the local experience." Research 85 section 3.3 counted the
 * standing prose a remote tab drew that a local tab does not, being 35 words
 * on Explorer, 48 on Search and 138 on Source control, and the Phase 228
 * entry in docs/BACKLOG.md rules on each paragraph: it comes OFF the resting
 * face unless a local tab carries its equivalent, and a limit that is
 * genuinely different becomes a disabled control with at most one short label
 * or a hover title.
 *
 * WHAT THIS TEST PINS. Every sentence the phase took off is named below with
 * the module it lived in, and for each one this proves two things over the
 * real tree: no component under src/renderer names the identifier any more,
 * read with comments stripped so a record of the deletion cannot trip it, and
 * the machines directory no longer exports it. A later round that puts a
 * sentence back has to edit this list to do it, which is the point. The
 * scanner is proved on two planted texts first, because a scan that cannot
 * fail proves nothing.
 *
 * The sentences that MOVED rather than went, being the hooks and signing
 * line that is now the Commit button's hover title and the three short
 * labels on the disabled search filters, are pinned where they are drawn and
 * in ../../app/__tests__/p903-c-remote-copy.test.ts.
 *
 * PHASE 230 ADDED THE READ-AT CLOCK to the list, the one line Phase 228 left
 * on every remote view because nothing re-read a machine. It is pinned here
 * rather than in a file of its own because it is the same rule, being that a
 * sentence the local face does not carry stays off the remote one.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../../..');
const RENDERER = resolve(ROOT, 'src/renderer');
const MACHINES = resolve(RENDERER, 'machines');

/**
 * One sentence that came off the face.
 *
 * `name` is the export as the copy module spelled it. `home` is the file
 * under src/renderer/machines it lived in, named so a reader can find the
 * record of the deletion beside the sentences that stayed. `words` is a
 * fragment of the sentence itself, so the words cannot come back under a new
 * name either.
 */
interface OffTheFace {
  readonly name: string;
  readonly home: string;
  readonly words: string;
}

/** Every sentence Phase 228 took off, in the order the entry names them. */
const OFF: readonly OffTheFace[] = [
  {
    name: 'remoteBandTitle',
    home: 'project-tab.ts',
    words: 'Files live on'
  },
  {
    name: 'REMOTE_BAND_BODY',
    home: 'project-tab.ts',
    words: 'Tortie reads what is in this folder on that machine'
  },
  {
    name: 'remoteChangesBand',
    home: 'scm.ts',
    words: 'These changes are on'
  },
  {
    name: 'REMOTE_SCM_SECTIONS_NOTE',
    home: 'scm.ts',
    words: 'It does not show the files one commit'
  },
  {
    name: 'SEARCH_FILTERS_ON_THIS_MAC',
    home: 'search.ts',
    words: 'Include, exclude and the ignore files toggle'
  },
  {
    name: 'searchOnMachineLine',
    home: 'search.ts',
    words: "with that machine's own grep"
  },
  {
    name: 'contextOnMachineLine',
    home: 'context.ts',
    words: 'Installing, enabling and pinning work on this Mac only'
  },
  {
    name: 'CONTEXT_NESTED_NOT_LISTED',
    home: 'context.ts',
    words: 'Skills kept in folders inside this project are not listed'
  },
  {
    name: 'contextEmptyOnMachine',
    home: 'context.ts',
    words: 'Adding a skill happens on that machine'
  },
  // The three Source control groups, History, Branch and Runs. Each drew a
  // band above the group and standing lines under it, and the Branch group
  // drew its facts as sentences. The fix round took them off: twelve
  // paragraphs of 245 words when the three were expanded on his Mac Pro, and
  // the local groups carry none.
  { name: 'historyOnMachineBand', home: 'history.ts', words: 'for the commits in this folder' },
  { name: 'historyNotLive', home: 'history.ts', words: 'to see anything committed on' },
  { name: 'historyOlderExist', home: 'history.ts', words: 'commits in that folder. There are older ones' },
  { name: 'historyRefsAreThatMachines', home: 'history.ts', words: 'did not read when that machine last fetched' },
  { name: 'historyPagesAreFresh', home: 'history.ts', words: 'again for every page' },
  { name: 'historyNoWrite', home: 'history.ts', words: 'no checkout, no branch and no cherry pick' },
  { name: 'historyFilesElsewhere', home: 'history.ts', words: 'The files one commit changed are not read' },
  { name: 'branchOnMachineBand', home: 'branch.ts', words: 'which branch is checked out in this folder' },
  { name: 'branchNameOn', home: 'branch.ts', words: 'The branch checked out on' },
  { name: 'branchTip', home: 'branch.ts', words: 'Its newest commit is' },
  { name: 'branchNoUpstream', home: 'branch.ts', words: 'follows no other branch on' },
  { name: 'BRANCH_NOT_LIVE', home: 'branch.ts', words: 'whether the branch over there has moved' },
  { name: 'branchCountsAreThatMachines', home: 'branch.ts', words: 'Tortie counted against the copy of' },
  { name: 'branchNoSwitch', home: 'branch.ts', words: 'does not change what is checked out on' },
  { name: 'branchOnlyCurrent', home: 'branch.ts', words: 'does not list the other branches there' },
  { name: 'runsOnMachineBand', home: 'runs.ts', words: 'sent no sign in details to' },
  { name: 'RUNS_NOT_LIVE', home: 'runs.ts', words: 'This list does not refresh' },
  { name: 'runsBranchAt', home: 'runs.ts', words: 'The branch checked out on' },
  { name: 'runsNewest', home: 'runs.ts', words: 'runs for that branch and its newest commit' },
  { name: 'runsNotGitHub', home: 'runs.ts', words: 'has no GitHub address for its origin' },
  { name: 'RUNS_STEPS_ELSEWHERE', home: 'runs.ts', words: 'The steps inside a run are not shown' },
  // PHASE 230. The read-at clock, which Phase 228 left as the one short line
  // because nothing re-read a machine: "Read at 14:32. Press Refresh to read
  // it again." under the Explorer and the Changes group and in the branch
  // header, and "Tortie read this from X at 14:32." under the three Source
  // control groups. Every remote view reads again by itself now, at the
  // moments ../use-remote-reread.ts names, and a view that reads when looked
  // at needs no clock; a local view carries none. The words are the source
  // form of each sentence, because the two fragments a person read are also
  // fragments of sentences that stay, being "Press Refresh to read it again"
  // on the missing folder and "Tortie read this from" on a file's read line.
  { name: 'remoteReadAt', home: 'presentation.ts', words: 'Read at ${readClockTime' },
  { name: 'machineReadAt', home: 'presentation.ts', words: 'read this from ${label} at ${readClockTime' },
  { name: 'remoteTreeReadAt', home: 'explorer.ts', words: 'Read at ${readClockTime' },
  { name: 'runsReadAt', home: 'runs.ts', words: 'read this from ${label} at ${readClockTime' },
  // PHASE 230 FIX ROUND ADDED THE CONTEXT REFRESH HOVER. Phase 228 recorded
  // it for the next round: 21 words in two sentences on the remote Refresh
  // control, the second saying Tortie cannot see a change on that machine
  // until the control is pressed, which the re-read moments made false. The
  // verifier read it as the one sentence only the remote face carried.
  { name: 'contextRefreshOnMachineTitle', home: 'context.ts', words: 'cannot see a change made on that machine' }
];

/** Every .ts and .tsx file under a directory, recursively. */
function sourcesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourcesUnder(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * The component files this test reads: everything under src/renderer that is
 * not a test and not the copy directory itself.
 */
const COMPONENTS: readonly string[] = sourcesUnder(RENDERER).filter(
  (path) => !path.includes('__tests__') && !path.startsWith(MACHINES + '/')
);

/**
 * The text with every comment removed, so a comment recording that a sentence
 * was taken off cannot read as the sentence being drawn.
 *
 * It is a plain scan rather than a parser. A block comment runs to the next
 * star slash and a line comment to the end of its line. A block comment is
 * read only where one can start, being at the start of a line or after a
 * space, a brace, a bracket, an equals sign, a comma or a semicolon: the
 * search view's include field carries the placeholder "src/**, *.ts", and a
 * scan that read that as a comment opening would hide the field's own title
 * from this test, which is exactly the place a sentence would come back.
 */
export function withoutComments(text: string): string {
  return text
    .replace(/(^|[\s{(=,;])\/\*[\s\S]*?\*\//g, '$1')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** Whether a text names an identifier as a whole word. */
export function namesIdentifier(text: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(withoutComments(text));
}

/** Every copy module, read as one text. */
const MACHINES_SOURCE = readdirSync(MACHINES)
  .filter((entry) => entry.endsWith('.ts'))
  .sort()
  .map((entry) => readFileSync(join(MACHINES, entry), 'utf8'))
  .join('\n');

describe('the scanner can fail', () => {
  it('finds an identifier in code and not in a comment about it', () => {
    const drawn = "import { remoteChangesBand } from '../machines/scm';\n";
    const recorded =
      '/* PHASE 228 took remoteChangesBand off */\n// remoteChangesBand\n';
    expect(namesIdentifier(drawn, 'remoteChangesBand')).toBe(true);
    expect(namesIdentifier(recorded, 'remoteChangesBand')).toBe(false);
    // A longer name that contains the short one is not the short one.
    expect(namesIdentifier('remoteChangesBandWidth()', 'remoteChangesBand')).toBe(
      false
    );
  });

  it('does not read a glob placeholder as a comment that hides a title', () => {
    // The shape src/renderer/search/QueryBlock.tsx really holds: a
    // placeholder with a slash star in it, then a title on the same control.
    const field =
      'placeholder="src/**, *.ts"\n' +
      'title={onMachine ? SEARCH_FILTERS_ON_THIS_MAC : undefined}\n' +
      'placeholder="**/dist/**"\n';
    expect(namesIdentifier(field, 'SEARCH_FILTERS_ON_THIS_MAC')).toBe(true);
    // And a JSX comment, a leading comment and a trailing line comment are
    // still comments.
    const commented =
      '{/* SEARCH_FILTERS_ON_THIS_MAC */}\n' +
      '/* SEARCH_FILTERS_ON_THIS_MAC */\n' +
      'const x = 1; // SEARCH_FILTERS_ON_THIS_MAC\n';
    expect(namesIdentifier(commented, 'SEARCH_FILTERS_ON_THIS_MAC')).toBe(false);
  });

  it('holds every sentence the entry names, and no fewer', () => {
    // Thirty came off: the two line machine band on every view, which the
    // fix round took off because the tab spine and the project header
    // already name the machine, the Source control band, the sections note,
    // the search filters note, the grep line, the Context view's two standing
    // note lines and its remote empty body, and the twenty one sentences the
    // three Source control groups drew as bands, standing lines and facts.
    // The hooks and signing line MOVED to a title and the history ceiling
    // became a disabled control's label, so neither is here; the Context cut
    // line and the history marks cut line stay because each names a list on
    // screen that was cut. The read-at clock STAYED until Phase 230 took it
    // off, and its four names follow; the last one is the Context Refresh
    // hover Phase 230's fix round took off.
    expect(OFF.map((one) => one.name)).toEqual([
      'remoteBandTitle',
      'REMOTE_BAND_BODY',
      'remoteChangesBand',
      'REMOTE_SCM_SECTIONS_NOTE',
      'SEARCH_FILTERS_ON_THIS_MAC',
      'searchOnMachineLine',
      'contextOnMachineLine',
      'CONTEXT_NESTED_NOT_LISTED',
      'contextEmptyOnMachine',
      'historyOnMachineBand',
      'historyNotLive',
      'historyOlderExist',
      'historyRefsAreThatMachines',
      'historyPagesAreFresh',
      'historyNoWrite',
      'historyFilesElsewhere',
      'branchOnMachineBand',
      'branchNameOn',
      'branchTip',
      'branchNoUpstream',
      'BRANCH_NOT_LIVE',
      'branchCountsAreThatMachines',
      'branchNoSwitch',
      'branchOnlyCurrent',
      'runsOnMachineBand',
      'RUNS_NOT_LIVE',
      'runsBranchAt',
      'runsNewest',
      'runsNotGitHub',
      'RUNS_STEPS_ELSEWHERE',
      'remoteReadAt',
      'machineReadAt',
      'remoteTreeReadAt',
      'runsReadAt',
      'contextRefreshOnMachineTitle'
    ]);
  });

  it('reads a set of components rather than nothing', () => {
    expect(COMPONENTS.length).toBeGreaterThan(100);
    expect(COMPONENTS.some((path) => path.endsWith('scm/ScmSection.tsx'))).toBe(
      true
    );
    expect(COMPONENTS.some((path) => path.endsWith('app/Sidebar.tsx'))).toBe(
      true
    );
  });
});

describe('no component under src/renderer names a sentence that came off', () => {
  for (const one of OFF) {
    it(`${one.name} from ${one.home}`, () => {
      const importers = COMPONENTS.filter((path) =>
        namesIdentifier(readFileSync(path, 'utf8'), one.name)
      ).map((path) => relative(ROOT, path));
      expect(importers).toEqual([]);
    });
  }
});

describe('the copy directory no longer exports a sentence that came off', () => {
  for (const one of OFF) {
    it(`${one.name} from ${one.home}`, () => {
      expect(readdirSync(MACHINES)).toContain(one.home);
      expect(MACHINES_SOURCE).not.toMatch(
        new RegExp(`export (function|const) ${one.name}\\b`)
      );
      // The words are gone too, not only the name, so the sentence cannot
      // come back under another export.
      expect(withoutComments(MACHINES_SOURCE)).not.toContain(one.words);
    });
  }
});

/**
 * A sentence that came off from OUTSIDE the copy directory. The Architecture
 * view keeps its own sentences in src/renderer/arch/copy.ts, and the fix
 * round took its one remote sentence off the face: "A contract is read on the
 * computer its repository is on, and this build cannot ask that computer
 * anything." The view draws nothing on a machine and the disabled Open the
 * map control carries a label of a few words as its hover title.
 */
const OFF_ELSEWHERE: readonly { name: string; file: string; words: string }[] = [
  {
    name: 'ARCH_ELSEWHERE',
    file: 'arch/copy.ts',
    words: 'cannot ask that computer anything'
  }
];

describe('a sentence that came off from outside the copy directory', () => {
  for (const one of OFF_ELSEWHERE) {
    it(`${one.name} from ${one.file} is neither exported nor drawn`, () => {
      const home = resolve(RENDERER, one.file);
      const source = readFileSync(home, 'utf8');
      expect(source).not.toMatch(new RegExp(`export (function|const) ${one.name}\\b`));
      expect(withoutComments(source)).not.toContain(one.words);
      const importers = COMPONENTS.filter(
        (path) =>
          path !== home && namesIdentifier(readFileSync(path, 'utf8'), one.name)
      ).map((path) => relative(ROOT, path));
      expect(importers).toEqual([]);
    });
  }
});
