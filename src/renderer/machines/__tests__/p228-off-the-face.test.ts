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
  }
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
    // Nine came off: the two line machine band on every view, which the fix
    // round took off because the tab spine and the project header already
    // name the machine, the Source control band, the sections note, the
    // search filters note, the grep line, and the Context view's two
    // standing note lines and its remote empty body. The hooks and signing
    // line MOVED to a title and the read-at clock STAYS until Phase 230, so
    // neither is here; the Context cut line stays because it names a list
    // that was cut.
    expect(OFF.map((one) => one.name)).toEqual([
      'remoteBandTitle',
      'REMOTE_BAND_BODY',
      'remoteChangesBand',
      'REMOTE_SCM_SECTIONS_NOTE',
      'SEARCH_FILTERS_ON_THIS_MAC',
      'searchOnMachineLine',
      'contextOnMachineLine',
      'CONTEXT_NESTED_NOT_LISTED',
      'contextEmptyOnMachine'
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
