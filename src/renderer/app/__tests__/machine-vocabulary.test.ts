/**
 * Phase 70 — the vocabulary audit.
 *
 * THE STANDING RULE. No transport vocabulary in user facing copy. Machines
 * have labels and sessions have names, and a person never reads the name of a
 * program Tortie runs, the name of one of its verbs, or the name of a file it
 * signs in with. The rule already covered the session server's words; this
 * phase adds a second computer and a second set of words that must not leak.
 *
 * WHAT IT READS. The list below is in the test rather than derived from a
 * glob, so a reviewer can see exactly what was covered and can see when a new
 * surface was added without being covered. Every file on it must exist. A
 * missing one fails rather than being skipped, because a silently skipped file
 * is an audit that passes by covering nothing.
 *
 * HOW IT READS. Comments are stripped first, then import and export lines,
 * then every string and template literal is taken from what is left. A module
 * path is not copy and a comment is not copy, so neither is audited. What is
 * left is close to the set of strings a person can end up looking at, plus
 * class names and element ids, which are harmless to audit and occasionally
 * catch a class named after the mechanism.
 *
 * WHAT IT CANNOT DO. It cannot catch a word the list does not hold, and it
 * cannot judge a sentence. `window` in particular is NOT on the list, because
 * the app's own window is a legitimate word on these surfaces, so a person
 * reads every changed string by eye as well. That reading is recorded in the
 * phase report and this file is not a substitute for it.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Repository root, from this file's own location. */
const ROOT = resolve(import.meta.dirname, '../../../..');

/**
 * Every file that composes a sentence about a machine, plus the surfaces that
 * draw those sentences.
 */
const FILES: readonly string[] = [
  'src/renderer/app/machine-copy.ts',
  'src/renderer/app/MachineBadge.tsx',
  'src/renderer/app/CreateSessionModal.tsx',
  'src/renderer/app/session-actions.tsx',
  'src/renderer/app/SessionDock.tsx',
  'src/renderer/app/SessionRail.tsx',
  'src/renderer/app/SessionStrip.tsx',
  'src/renderer/app/TerminalRegion.tsx',
  // Phase 72. The saved output panel and its own copy. The panel draws a
  // machine's label and a time, and it must not draw a word from the
  // transport layer while doing it.
  'src/renderer/app/SavedOutputModal.tsx',
  // Phase 84. The folder picker for another machine. It is a new surface that
  // says things about a machine, so it is audited like the rest.
  //
  // TWO FILES ARE DELIBERATELY NOT ADDED, being
  // src/renderer/state/sessions-slice.ts and
  // src/renderer/app/split/split-menu.ts, where Phase 84 writes the two end
  // session confirm sentences. Each holds hundreds of unrelated existing
  // strings and a sweep of them belongs to its own round. Those two sentences
  // are checked by review instead, and the phase report records that reading.
  'src/renderer/app/RemoteDirPicker.tsx',
  // Phase 90.2. The counterpart block in the create sheet. It draws main's own
  // sentences and writes a few of its own, and both halves say things about a
  // machine, so it is audited like the rest.
  'src/renderer/app/CounterpartBlock.tsx',
  // Phase 90.3. The sheet that opens a folder on a machine as a project tab. It
  // is a new surface that says things about a machine, so it is audited like
  // the rest. Every sentence it draws is a named export in that file, which is
  // where they live until they move to machine-copy.ts.
  'src/renderer/app/RemoteProjectModal.tsx',
  // Phase 92. The home screen. It now names a machine in two places, being the
  // action row that opens a folder on another machine and the quiet run of text
  // after a recent project's path. Both come from machine-copy.ts, and the file
  // is on this list so a later round cannot type a sentence straight into the
  // screen without the audit reading it.
  'src/renderer/app/HomeScreen.tsx',
  // Phase 90.3. The Explorer's own sentences reach a person through this file,
  // and from this phase they include six states about a folder on a machine.
  'src/renderer/tree/FilesSection.tsx',
  // Phase 90.3. The Source Control view's read only store for a folder on a
  // machine. It says what it read and when, so it is audited like the rest.
  'src/renderer/scm/remote-changes.ts',
  'src/main/machines/remote-copy.ts',
  // Phase 71. The link statement's own sentences, composed in main because
  // only main holds the confirm gate's answer and the link's own reason.
  'src/main/machines/machine-state.ts',
  // Phase 72. The arming refusals a person can read in a pane.
  'src/main/machines/resume-arming.ts',
  // Phase 72 fix round. This list used to name ./tombstone.ts, which holds no
  // copy at all: the tombstone sentences are composed by the surface that draws
  // them, in src/renderer/settings/machines-copy.ts, under that file's own
  // audit. The two sentences the restore prints, being what it did not put back
  // and what it has no record of, moved into ./remote-copy.ts above, which is
  // where every sentence main prints about a session on another machine lives.
  // A module that holds log lines as well as copy cannot be audited by reading
  // its strings, and ./remote-restore.ts is one of those.
  'src/renderer/settings/machines-copy.ts'
];

/**
 * The words a person must never read, matched without regard to case.
 *
 * The first six are the mechanism. The rest are the verbs Tortie sends and the
 * one command line fragment that names the private server. None of them means
 * anything to a person, and every one of them would teach a person to think
 * about a program they did not install and cannot see.
 */
const FORBIDDEN: readonly string[] = [
  'tmux',
  'pane',
  'prefix',
  'socket',
  'ssh',
  'sshd',
  'known_hosts',
  'ControlMaster',
  'BatchMode',
  'attach-session',
  'new-session',
  'kill-session',
  'rename-session',
  'list-sessions',
  '-L gmux'
];

/** Block and line comments out. The `[^:]` guard spares a `https://` inside a string. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Import and export declarations out: a module path is not copy. */
function stripModulePaths(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(import|export)\b.*['"`]/.test(line))
    .filter((line) => !/^\s*['"`][^'"`]*['"`];?\s*$/.test(line))
    .join('\n');
}

const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/** Every string and template literal left after the two strips above. */
export function copyLiteralsOf(source: string): string[] {
  return stripModulePaths(stripComments(source)).match(LITERAL) ?? [];
}

describe('the machine vocabulary audit', () => {
  it('reads every file it claims to read', () => {
    for (const file of FILES) {
      expect(
        () => readFileSync(resolve(ROOT, file), 'utf8'),
        `${file} is on the audit list and could not be read. Add the file, or ` +
          'take it off the list and say why in the phase report.'
      ).not.toThrow();
    }
  });

  it('finds no transport vocabulary in any of them', () => {
    const found: string[] = [];
    for (const file of FILES) {
      let source: string;
      try {
        source = readFileSync(resolve(ROOT, file), 'utf8');
      } catch {
        // The existence check above owns this failure. Skipping here keeps one
        // missing file from producing two identical failures.
        continue;
      }
      for (const literal of copyLiteralsOf(source)) {
        const lower = literal.toLowerCase();
        for (const word of FORBIDDEN) {
          if (lower.includes(word.toLowerCase())) {
            found.push(`${file}: ${word} in ${literal}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('catches a word it is meant to catch', () => {
    // The audit is only worth running if it can fail. This is the smallest
    // proof that the stripping did not eat everything.
    const sample = "const s = 'Tortie could not reach the tmux server.';";
    expect(copyLiteralsOf(sample)).toEqual([
      "'Tortie could not reach the tmux server.'"
    ]);
    expect(copyLiteralsOf('// a tmux comment')).toEqual([]);
    expect(copyLiteralsOf("import x from './tmux';")).toEqual([]);
  });
});
