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
  'src/renderer/settings/machines-copy.ts',
  // Phase 93. The three files that say what happened when a person asked to be
  // taken to a session. `reach-copy.ts` holds every sentence, `session-focus.ts`
  // picks which one is said and composes the machine's name, and the ⌘J list is
  // the surface that draws the rows and, from this phase, names the machine a
  // session runs on. All three can name a machine, so all three are read here.
  'src/renderer/app/reach-copy.ts',
  'src/renderer/app/session-focus.ts',
  'src/renderer/app/AttentionOverlay.tsx',
  // Phase 98. The Search view searches a folder on another machine, and three
  // of its files now draw a sentence about one. `SearchView.tsx` draws the note
  // under the summary, `ResultsList.tsx` draws the states that mean no rows,
  // and `QueryBlock.tsx` draws the sentence on the three filters that do not go
  // there. Every one of those sentences is a named export in machine-copy.ts,
  // which is the first file on this list. The three files are read as well, so
  // a later round cannot type a sentence straight into the view.
  'src/renderer/search/SearchView.tsx',
  'src/renderer/search/ResultsList.tsx',
  'src/renderer/search/QueryBlock.tsx',
  // Phase 99. Quick Open ranks the file names in a folder on another machine,
  // and the palette draws a line above the rows saying which machine they came
  // from and when they were read. Every one of those sentences is a named
  // export in machine-copy.ts, which is the first file on this list. The panel
  // is read as well, so a later round cannot type a sentence straight into it.
  'src/renderer/quickopen/QuickOpenPalette.tsx',
  // Phase 100. The panel that reads the last lines of a session on another
  // machine. It draws a machine's label, an instant, a count and a size, and it
  // draws the sentence for each of the three answers that mean no lines. Every
  // one of those is a named export in machine-copy.ts, which is the first file
  // on this list. The panel is read as well, so a later round cannot type a
  // sentence straight into it.
  'src/renderer/app/RemoteLinesModal.tsx',
  // Phase 100. The session menu draws the item that opens that panel. Its label
  // is composed in machine-copy.ts and the file is read here so it stays that
  // way.
  'src/renderer/terminal/terminal-menu.ts',
  // Phase 105. The Runs group for a folder on another machine, being the store
  // that holds one answer per folder and the section that draws it. Between
  // them they name a machine, a branch, a commit and an instant. Every sentence
  // they draw is a named export in machine-copy.ts, which is the first file on
  // this list. Both are read as well, so a later round cannot type a sentence
  // straight into the section.
  'src/renderer/scm/remote-runs.ts',
  'src/renderer/scm/RemoteRunsSection.tsx',
  // Phase 106. The Branch group for a folder on another machine, being the
  // store that holds one answer per folder and the section that draws it.
  // Between them they name a machine, a branch, a second branch it follows, a
  // commit, two counts and an instant. Every sentence they draw is a named
  // export in machine-copy.ts, which is the first file on this list. Both are
  // read as well, so a later round cannot type a sentence straight into the
  // group.
  'src/renderer/scm/remote-branch.ts',
  'src/renderer/scm/RemoteBranchSection.tsx',
  // Phase 107. The History group for a folder on another machine, being the
  // store that holds one page per folder and the section that draws it.
  // Between them they name a machine, a commit, an author, a branch mark and an
  // instant. Every sentence they draw is a named export in machine-copy.ts,
  // which is the first file on this list. Both are read as well, so a later
  // round cannot type a sentence straight into the group.
  'src/renderer/scm/remote-history.ts',
  'src/renderer/scm/RemoteHistorySection.tsx',
  // Phase 108. The Context view reads what agents will load in a folder on
  // another machine, being the body that draws the states and the notes, and
  // the band whose Refresh tooltip names the machine. Every sentence they
  // draw is a named export in machine-copy.ts, which is the first file on
  // this list. Both are read as well, so a later round cannot type a sentence
  // straight into the view.
  'src/renderer/context/ContextView.tsx',
  'src/renderer/context/ContextHeader.tsx'
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

/**
 * One word on the list is an English fragment of an ordinary word, so it is
 * matched on a word boundary rather than anywhere inside a literal.
 *
 * PHASE 93 ADDED THIS. The ⌘J list joined the audit, and its own class name is
 * `attention-panel`, which contains `pane`. MEASURED on 2026-08-19: the audit
 * failed with `pane in \`attention-panel${under}\``. A panel is not a pane, and
 * `\bpanes?\b` still catches the word the rule exists for, which is the one a
 * person could read as the name of a thing inside a session.
 */
const BOUNDED: ReadonlySet<string> = new Set(['pane']);

/** Whether one literal carries one forbidden word. */
export function carriesWord(literal: string, word: string): boolean {
  if (BOUNDED.has(word)) {
    return new RegExp(`\\b${word}s?\\b`, 'i').test(literal);
  }
  return literal.toLowerCase().includes(word.toLowerCase());
}

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
        for (const word of FORBIDDEN) {
          if (carriesWord(literal, word)) {
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

  it('tells a pane from a panel', () => {
    // The word the rule exists for still fails.
    expect(carriesWord("'Tortie could not read that pane.'", 'pane')).toBe(true);
    expect(carriesWord("'two panes'", 'pane')).toBe(true);
    // The ⌘J list's own class name does not, and neither does the word people
    // use for a piece of the window.
    expect(carriesWord("'attention-panel'", 'pane')).toBe(false);
    expect(carriesWord("'the panel stays open'", 'pane')).toBe(false);
    // Every other word is still matched anywhere in the literal.
    expect(carriesWord("'gmux-tmuxish'", 'tmux')).toBe(true);
  });
});
