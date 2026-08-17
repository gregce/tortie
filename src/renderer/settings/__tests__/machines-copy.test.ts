/**
 * Phase 68. The writing rules, checked by machine rather than by eye.
 *
 * WHY THIS TEST EXISTS. Settings → Machines writes more prose than any other
 * settings section, and the prose is the safeguard: a person can only agree
 * to something they were told plainly. Every string the surface writes itself
 * lives in machines-copy.ts for exactly this reason, so one test has one
 * target. A string written inline in a component would escape this check, so
 * no component in this surface writes one.
 *
 * WHAT IS DELIBERATELY NOT CHECKED HERE. Three kinds of text on this surface
 * come from main and are drawn exactly as they arrive: the confirm warning
 * and the honesty line, the lines an agreement is bound to, and the headline
 * and detail of a connection test outcome. They are main's copy, checked on
 * main's side, and they must never be copied into this file.
 *
 * The transcript's own content is another program's bytes and is exempt for
 * the same reason it cannot be checked: Tortie did not write it. The two
 * lines Tortie DOES write in there are named in `TRANSCRIPT_TORTIE_LINES`,
 * and this test holds that set at exactly two, so a later edit cannot slip a
 * third Tortie sentence in among another program's output where a person
 * would read it as the program's own.
 */

import { describe, expect, it } from 'vitest';
import * as copy from '../machines-copy';

/** Words a person should never meet in Tortie's own copy. */
const FORBIDDEN_WORDS = /\b(pane|panes|window|windows|prefix|tmux|ssh|socket)\b/i;

/** An em dash or an en dash, anywhere. */
const DASHES = /[—–]/;

/**
 * Every string this module puts on a screen, gathered by walking the exports
 * rather than by listing them, so a string added later is checked without
 * anybody remembering to add it here.
 *
 * The two counting sentences are produced by a function, so the function is
 * called with both shapes it has.
 */
function everyString(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  for (const [name, value] of Object.entries(copy)) {
    if (typeof value === 'string') {
      out.push({ name, text: value });
    } else if (Array.isArray(value)) {
      value.forEach((entry, i) => {
        if (typeof entry === 'string') {
          out.push({ name: `${name}[${i}]`, text: entry });
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'string') {
          out.push({ name: `${name}.${key}`, text: entry });
        }
      }
    }
  }
  out.push({ name: 'droppedRowsLine(1)', text: copy.droppedRowsLine(1) });
  out.push({ name: 'droppedRowsLine(2)', text: copy.droppedRowsLine(2) });
  return out;
}

const STRINGS = everyString();

describe('the exports this test walks', () => {
  it('finds every string, so the checks below have something to check', () => {
    // A refactor that turned the module into one default export would leave
    // every check below passing over an empty list, which is the one way this
    // file could stop working without saying so.
    expect(STRINGS.length).toBeGreaterThan(40);
  });
});

describe('words and punctuation', () => {
  it('uses no em dash and no en dash anywhere', () => {
    const offenders = STRINGS.filter((s) => DASHES.test(s.text)).map((s) => s.name);
    expect(offenders).toEqual([]);
  });

  it('uses none of the words a person should never meet', () => {
    const offenders = STRINGS.filter((s) => FORBIDDEN_WORDS.test(s.text)).map(
      (s) => `${s.name}: ${FORBIDDEN_WORDS.exec(s.text)?.[0] ?? ''}`
    );
    expect(offenders).toEqual([]);
  });

  it('carries a colon only on a named label, and only as its last character', () => {
    const allowed = new Set<string>(copy.LABELS_ENDING_IN_A_COLON);
    for (const { name, text } of STRINGS) {
      if (!text.includes(':')) continue;
      expect({
        name,
        named: allowed.has(text),
        onlyColonIsTheLastCharacter: text.indexOf(':') === text.length - 1
      }).toEqual({ name, named: true, onlyColonIsTheLastCharacter: true });
    }
  });

  it('names every label that carries a colon, and no others', () => {
    expect([...copy.LABELS_ENDING_IN_A_COLON]).toEqual([
      'You confirmed:',
      'It now says:',
      'Reading from:',
      'Tortie is running:'
    ]);
  });

  it('writes no line of the confirm sheet, because main composes them', () => {
    // The four sheet labels lived here once and the Add flow composed its own
    // lines from them. It could not work: the hash a person's agreement binds
    // to covers the program path, which the machine only reports at the end of
    // the connection test, so main composes the lines and the hash together
    // and the surface sends both back untouched. A label that reappears here
    // is the start of a second composer, and a second composer is how an
    // agreement comes to cover lines nobody read.
    const sheetish = STRINGS.filter((s) =>
      /^(Machine|Signs in as|Port|Runs this program on that machine):$/.test(s.text)
    ).map((s) => s.name);
    expect(sheetish).toEqual([]);
  });
});

describe('the transcript exemption', () => {
  it('is exactly the two lines Tortie writes in there', () => {
    expect([...copy.TRANSCRIPT_TORTIE_LINES]).toEqual([
      copy.TRANSCRIPT_RUNNING_LABEL,
      copy.TRANSCRIPT_SOURCE_LINE
    ]);
    expect(copy.TRANSCRIPT_TORTIE_LINES).toHaveLength(2);
  });

  it('says which line is Tortie and what everything under it is', () => {
    expect(copy.TRANSCRIPT_RUNNING_LABEL).toBe('Tortie is running:');
    expect(copy.TRANSCRIPT_SOURCE_LINE).toBe(
      'Everything below this line comes from that program and from the ' +
        'machine. Tortie does not change it, does not store it, and does not ' +
        'answer it for you.'
    );
  });

  it('promises that nothing typed into the answer field is kept', () => {
    expect(copy.ANSWER_HINT).toBe(
      'What you type here goes straight to the program above and nowhere else.'
    );
  });
});

describe('the sentences the charter fixes', () => {
  it('carries both standing honesty lines, word for word', () => {
    expect(copy.HONESTY_NO_ADOPTION).toBe(
      'Tortie never adopts work that is already running on your machines, ' +
        'and it never touches it. Anything Tortie runs there, it creates itself.'
    );
    expect(copy.HONESTY_NO_SESSIONS_YET).toBe(
      'You cannot open a session on a machine yet. This release records the ' +
        'machine and proves Tortie can reach it. Opening sessions comes later.'
    );
  });

  it('says where a machine’s identity is written down, and where it is not', () => {
    // The first build of this phase added three lines to the operator's own
    // record file, measured at 932 bytes before a probe run and 1229 after.
    // The build now names a file of its own and this line says so.
    expect(copy.HONESTY_OWN_RECORD).toBe(
      'Tortie keeps its own record of which machines have answered, in a file ' +
        'it owns. It reads the record you already keep in your home folder, ' +
        'so a machine you have used for years still raises the alarm if it ' +
        'changes. It never adds a line to that one.'
    );
  });

  it('counts dropped rows in the singular and in the plural', () => {
    expect(copy.droppedRowsLine(1)).toBe(
      'Tortie dropped 1 row whole. Nothing from it was used.'
    );
    expect(copy.droppedRowsLine(2)).toBe(
      'Tortie dropped 2 rows whole. Nothing from them was used.'
    );
  });

  it('says why the add button is off, while it is off', () => {
    expect(copy.ADD_DISABLED_REASON).toBe(
      'Run the connection test first. Tortie needs to see the machine ' +
        'answer, and it needs the program path the machine reports.'
    );
  });

  it('reads the same for all three states that cannot be used', () => {
    expect(copy.STATE_CHIP.confirmed).toBe('Confirmed');
    expect(copy.STATE_CHIP.never).toBe('Not usable');
    expect(copy.STATE_CHIP.changed).toBe('Not usable');
    expect(copy.STATE_CHIP.unknown).toBe('Not usable');
  });
});
