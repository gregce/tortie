/**
 * The doors between remote source control and local source control (Phase 126).
 *
 * The audit's third P2 of its phase 6 was that `src/main/machines/` reached
 * into files that `src/main/actions/index.ts` says are private, and that four
 * more files took a pure parser from the broad `../git` barrel and received
 * `GitService` and `registerGitIpc` with it. Phase 126 gave each side one door.
 * This test reads the source text of every production file under
 * `src/main/machines/` and fails when one of them uses a different door.
 *
 * IT READS TEXT RATHER THAN A MODULE GRAPH, on purpose. A rule a person can
 * read in the failure message is what teaches the next round, and the failure
 * message below names the file, the line and the door that should have been
 * used.
 *
 * Tests are exempt, which is the same exemption every rule in
 * `build/assert-import-boundaries.mjs` carries, and which
 * `src/main/actions/index.ts` states as the house convention.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MACHINES_DIR = join(process.cwd(), 'src/main/machines');
const ACTIONS_DIR = join(process.cwd(), 'src/main/actions');
const GIT_DIR = join(process.cwd(), 'src/main/git');

/** The only two specifiers a file under src/main/machines may use. */
const ACTIONS_DOOR = '../actions/runs-read';
const GIT_DOORS: readonly string[] = ['../git/parsers', '../git/exec'];

interface Reference {
  readonly file: string;
  readonly line: number;
  readonly specifier: string;
}

/** Every production `.ts` file in one directory, tests and fixtures excluded. */
function productionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Every `from '<specifier>'` in one file that names `../actions` or `../git`,
 * with the line it sits on.
 */
function crossDirRefs(dir: string, name: string): Reference[] {
  const text = readFileSync(join(dir, name), 'utf8');
  const found: Reference[] = [];
  text.split('\n').forEach((line, index) => {
    const match = /\bfrom '(\.\.\/(?:actions|git)(?:\/[^']*)?)'/.exec(line);
    if (match !== null) {
      found.push({ file: name, line: index + 1, specifier: match[1] ?? '' });
    }
  });
  return found;
}

describe('the doors between remote and local source control', () => {
  const machineFiles = productionFiles(MACHINES_DIR);

  it('reads a directory that actually has files in it', () => {
    expect(machineFiles.length).toBeGreaterThan(20);
  });

  it('takes the local runs read through one door and no other', () => {
    const wrong: string[] = [];
    for (const name of machineFiles) {
      for (const ref of crossDirRefs(MACHINES_DIR, name)) {
        if (!ref.specifier.startsWith('../actions')) continue;
        if (ref.specifier === ACTIONS_DOOR) continue;
        wrong.push(
          `src/main/machines/${ref.file}:${ref.line} imports '${ref.specifier}'. ` +
            `The only door onto src/main/actions is '${ACTIONS_DOOR}'. ` +
            `Everything else in that directory is private to it, which its ` +
            `own index.ts says. If you need something new from there, promote ` +
            `it into runs-read.ts rather than widening the private surface.`
        );
      }
    }
    expect(wrong).toEqual([]);
  });

  it('never imports the actions barrel, which would drag the service in', () => {
    const wrong: string[] = [];
    for (const name of machineFiles) {
      for (const ref of crossDirRefs(MACHINES_DIR, name)) {
        if (ref.specifier !== '../actions') continue;
        wrong.push(
          `src/main/machines/${ref.file}:${ref.line} imports '../actions'. ` +
            `That barrel pulls ./ipc and ./service into the runtime graph, and ` +
            `./service pulls ../watcher and ../typed-events after it. Import ` +
            `'${ACTIONS_DOOR}' directly instead.`
        );
      }
    }
    expect(wrong).toEqual([]);
  });

  it('takes a git parser from the parsers leaf and git itself from exec', () => {
    const wrong: string[] = [];
    for (const name of machineFiles) {
      for (const ref of crossDirRefs(MACHINES_DIR, name)) {
        if (!ref.specifier.startsWith('../git')) continue;
        if (GIT_DOORS.includes(ref.specifier)) continue;
        wrong.push(
          `src/main/machines/${ref.file}:${ref.line} imports '${ref.specifier}'. ` +
            `Use '../git/parsers' for a parser and '../git/exec' for runGit. ` +
            `The '../git' barrel exports GitService, registerGitIpc, ` +
            `getGitService, unwatchGitRepo and registerGitDepthIpc, so a ` +
            `remote read module that wants one parser receives all of them.`
        );
      }
    }
    expect(wrong).toEqual([]);
  });

  it('names the merged runs read in the actions barrel', () => {
    const barrel = readFileSync(join(ACTIONS_DIR, 'index.ts'), 'utf8');
    expect(barrel).toContain('readMergedRuns');
    expect(barrel).toContain("from './runs-read'");
  });

  it('keeps src/main/git/parsers.ts a pure door', () => {
    const text = readFileSync(join(GIT_DIR, 'parsers.ts'), 'utf8');
    const body = text.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(body).not.toContain('function');
    const specifiers = [...body.matchAll(/\bfrom '([^']+)'/g)].map(
      (match) => match[1]
    );
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.every((one) => one === './parse' || one === './graph-parse')).toBe(
      true
    );
  });

  it('keeps runs-read.ts off the machines directory and off sessions', () => {
    const text = readFileSync(join(ACTIONS_DIR, 'runs-read.ts'), 'utf8');
    const body = text.replace(/\/\*[\s\S]*?\*\//g, '');
    const specifiers = [...body.matchAll(/\bfrom '([^']+)'/g)].map(
      (match) => match[1] ?? ''
    );
    expect(specifiers.filter((one) => one.includes('machines'))).toEqual([]);
    expect(specifiers.filter((one) => one.includes('sessions'))).toEqual([]);
    // It never reaches its own barrel either, which would be a cycle.
    expect(specifiers.filter((one) => one === './index')).toEqual([]);
  });
});
