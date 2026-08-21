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
 *
 * WHAT PHASE 79 ADDED, and the defect that asked for it. This file checked
 * punctuation and forbidden words and never checked whether a sentence was
 * still true. `HONESTY_NO_SESSIONS_YET` said "You cannot open a session on a
 * machine yet" for the whole of Phase 70, 70.5 and 71, while Phase 70 was
 * shipping sessions on another machine. The operator found it in a
 * photograph. Three checks now read main from a renderer test, which is
 * allowed for a test file and has precedent:
 *
 *  1. RETIRED_CLAIMS, a table of phrases a rung has disproved, each with a
 *     thing in main whose presence proves that rung shipped.
 *  2. MEASURED_VERSIONS against main's own measured list.
 *  3. The REMEDY key set against main's class list.
 *
 * `build/assert-import-boundaries.mjs` exempts every file under `__tests__`
 * from the layer rules, and its header names the renderer agents test, which
 * imports the main-process registry for exactly this purpose.
 *
 * WHAT PHASE 79.1 ADDED. One block of strings for setting up a key on one
 * machine, and one check that none of them names a file, a path or any part of
 * a key. Those all arrive from main beside the hash the agreement binds to, so
 * a path written in this file could differ from the path main writes to, and a
 * person would have agreed to the wrong one.
 */

import { describe, expect, it } from 'vitest';
import * as copy from '../machines-copy';
import { remoteCreateArgs } from '../../../main/machines/remote-sessions';
import {
  MACHINE_OUTCOME_CLASSES,
  machineOutcomeCopy
} from '../../../main/machines/errors';
// The witness for the Phase 79.1 rows below. `key-install.ts` starts nothing
// and pulls in no native module, which is why it is the witness rather than
// the runner that spawns the client.
import { composeAuthorizedKeysCommand } from '../../../main/machines/key-install';
import { TESTED_REMOTE_TMUX_VERSIONS } from '../../../main/tmux/version';

/** Words a person should never meet in Tortie's own copy. */
const FORBIDDEN_WORDS = /\b(pane|panes|window|windows|prefix|tmux|ssh|socket)\b/i;

/** An em dash or an en dash, anywhere. */
const DASHES = /[—–]/;

/**
 * A clock time, e.g. `14:32`.
 *
 * PHASE 72. The tombstone sentences carry the moment a list reached this Mac,
 * and a clock time is written with a colon in it in every language Tortie is
 * written in. The house rule about colons is about prose, so the colon check
 * below removes clock times first and then asserts that nothing else was
 * removed, which keeps the rule exact rather than loosening it.
 */
const CLOCK_TIME = /\b\d{1,2}:\d{2}\b/g;

/** The same shape without the global flag, because `test` on a global one keeps state. */
const HAS_CLOCK_TIME = /\b\d{1,2}:\d{2}\b/;

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
  out.push({ name: 'tailnetCountLine(0)', text: copy.tailnetCountLine(0) });
  out.push({ name: 'tailnetCountLine(1)', text: copy.tailnetCountLine(1) });
  out.push({ name: 'tailnetCountLine(4)', text: copy.tailnetCountLine(4) });
  out.push({ name: "lastLookedLine('now')", text: copy.lastLookedLine('now') });
  out.push({ name: "lastLookedLine('2m')", text: copy.lastLookedLine('2m') });
  // PHASE 72. Every shape of the two counting sentences and of the three
  // tombstone sentences, so a function's output is audited exactly the way a
  // constant is. A shape left out here is a sentence nothing checks.
  out.push({ name: 'removeQuestion(0)', text: copy.removeQuestion('Studio', 0) });
  out.push({ name: 'removeQuestion(1)', text: copy.removeQuestion('Studio', 1) });
  out.push({ name: 'removeQuestion(4)', text: copy.removeQuestion('Studio', 4) });
  const SEEN = Date.UTC(2026, 7, 17, 12, 32);
  const GONE = Date.UTC(2026, 7, 17, 15, 0);
  out.push({
    name: 'tombstoneLine(running)',
    text: copy.tombstoneLine('Studio', GONE, SEEN, 'running')
  });
  out.push({
    name: 'tombstoneLine(idle)',
    text: copy.tombstoneLine('Studio', GONE, SEEN, 'idle')
  });
  out.push({
    name: 'tombstoneLine(restorable)',
    text: copy.tombstoneLine('Studio', GONE, SEEN, 'restorable')
  });
  out.push({
    name: 'tombstoneLine(never seen)',
    text: copy.tombstoneLine('Studio', GONE, 0, 'unknown')
  });
  out.push({
    name: 'tombstoneRestoreRefused',
    text: copy.tombstoneRestoreRefused('Studio')
  });
  // PHASE 84. The sentence that says which key Tortie signs in with. It takes
  // the file name from main, so the shape is audited with a sample name of
  // exactly the form main composes.
  out.push({
    name: 'keyNamedOnEveryCommand',
    text: copy.keyNamedOnEveryCommand('machine-a1b2c3d4e5f6')
  });
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
      // A clock time is not prose. It is removed first and the check below
      // then holds the rule exactly, so a colon that appears anywhere else in
      // this sentence still fails.
      const prose = text.replace(CLOCK_TIME, 'a clock time');
      if (!prose.includes(':')) continue;
      expect({
        name,
        named: allowed.has(prose),
        onlyColonIsTheLastCharacter: prose.indexOf(':') === prose.length - 1
      }).toEqual({ name, named: true, onlyColonIsTheLastCharacter: true });
    }
  });

  it('removes a clock time from nothing but the four sentences that carry one', () => {
    // The carve out above could hide a colon anywhere if it matched loosely,
    // so the set of strings it touches is named and held.
    const touched = STRINGS.filter((s) => HAS_CLOCK_TIME.test(s.text)).map(
      (s) => s.name
    );
    expect(touched.sort()).toEqual([
      'tombstoneLine(idle)',
      'tombstoneLine(restorable)',
      'tombstoneLine(running)'
    ]);
  });

  it('names every label that carries a colon, and no others', () => {
    expect([...copy.LABELS_ENDING_IN_A_COLON]).toEqual([
      'You confirmed:',
      'It now says:',
      'Reading from:',
      'Tortie is running:',
      // Phase 69. Each of the three stands immediately before a value drawn
      // after it and carries nothing of its own past the colon.
      'Version on that machine:',
      'Versions Tortie has measured:',
      'Settings Tortie asserted:',
      // Phase 83. It stands immediately before the version a person accepted
      // and carries nothing of its own past the colon.
      'Version you accepted:'
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
  it('carries the standing honesty line, word for word', () => {
    // Phase 79 moved this onto the machine row, above the Prepare button. The
    // words did not change. The second standing line, which claimed a session
    // could not be opened on a machine, is deleted and is held dead by the
    // retired claims block below.
    expect(copy.HONESTY_NO_ADOPTION).toBe(
      'Tortie never adopts work that is already running on your machines, ' +
        'and it never touches it. Anything Tortie runs there, it creates itself.'
    );
  });

  it('says what Prepare will do, before a person presses it', () => {
    expect(copy.PREPARE_EXPLAIN).toBe(
      'Tortie starts the program on that machine that keeps your work alive, ' +
        'and sets it up the way Tortie needs. This is the first thing Tortie ' +
        'runs there. Anything already running on that machine is left alone.'
    );
    expect(copy.BTN_PREPARE).toBe('Prepare this machine');
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

/**
 * A claim the copy used to make, the rung that disproves it, and a witness in
 * main for that rung. When the witness is present the claim is dead, and no
 * string in machines-copy.ts may still make it.
 *
 * WHY THIS EXISTS. machines-copy.ts said "You cannot open a session on a
 * machine yet" for the whole of Phase 70, 70.5 and 71, while Phase 70 was
 * shipping sessions on another machine. Nobody re-read the block. Add a row
 * here when a rung retires a sentence, and the next person is told by a
 * failing test rather than by the operator's photograph.
 *
 * WHAT THE FIX ROUND OF PHASE 79.1 CHANGED. This walk only ever read renderer
 * copy, so it could not see main's own outcome table. Phase 79.1 reworded the
 * renderer's advice for a refused sign in and left main's detail beside it
 * saying "Tortie does not handle keys or passwords", one line above a button
 * that makes a key. Half a claim was retired and the other half shipped. The
 * walk below now reads both sets, and the third row is that sentence.
 */
const RETIRED_CLAIMS = [
  {
    phrase: 'cannot open a session on a machine yet',
    rung: 'Phase 70, 0.34.0, 2026-08-17',
    witness: 'remoteCreateArgs composes the create command for another machine',
    shipped: () => typeof remoteCreateArgs === 'function'
  },
  {
    phrase: 'Opening sessions comes later',
    rung: 'Phase 70, 0.34.0, 2026-08-17',
    witness: 'remoteCreateArgs composes the create command for another machine',
    shipped: () => typeof remoteCreateArgs === 'function'
  },
  {
    phrase: 'does not handle keys or passwords',
    rung: 'Phase 79.1, 2026-08-18',
    witness:
      'composeAuthorizedKeysCommand composes the command that adds Tortie\'s ' +
      'key to another machine',
    shipped: () => typeof composeAuthorizedKeysCommand === 'function'
  },
  {
    phrase: 'handles no keys and no passwords',
    rung: 'Phase 79.1, 2026-08-18',
    witness:
      'composeAuthorizedKeysCommand composes the command that adds Tortie\'s ' +
      'key to another machine',
    shipped: () => typeof composeAuthorizedKeysCommand === 'function'
  }
];

/**
 * Main's own outcome copy, added to the walk.
 *
 * It is kept apart from `STRINGS` on purpose. The checks above this point are
 * about renderer copy and they forbid words such as ssh, which main's copy is
 * allowed to use and does: one class names /usr/bin/ssh, because a person
 * whose Mac is missing that file has to be told which file. Only the retired
 * claims walk reads this list.
 */
const MAIN_STRINGS: { name: string; text: string }[] =
  MACHINE_OUTCOME_CLASSES.flatMap((cls) => {
    const copy = machineOutcomeCopy(cls);
    return [
      { name: `main ${cls}.headline`, text: copy.headline },
      { name: `main ${cls}.detail`, text: copy.detail }
    ];
  });

describe('claims a shipped rung has retired', () => {
  it('has at least one row, so the walk below checks something', () => {
    expect(RETIRED_CLAIMS.length).toBeGreaterThan(0);
  });

  it('reads main\'s outcome copy as well as this file\'s', () => {
    expect(MAIN_STRINGS.length).toBe(MACHINE_OUTCOME_CLASSES.length * 2);
  });

  for (const claim of RETIRED_CLAIMS) {
    it(`no string still says "${claim.phrase}"`, () => {
      if (!claim.shipped()) return;
      const offenders = [...STRINGS, ...MAIN_STRINGS].filter((s) =>
        s.text.toLowerCase().includes(claim.phrase.toLowerCase())
      ).map(
        (s) =>
          `${s.name} still says "${claim.phrase}", which ${claim.rung} ` +
          `disproved. The witness is ${claim.witness}.`
      );
      expect(offenders).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// PHASE 83. Accepting a version Tortie has not measured
// ---------------------------------------------------------------------------

describe('the words the accept block writes for itself', () => {
  it('says what a button will do before it does it', () => {
    expect(copy.BTN_ACCEPT_VERSION).toBe('Accept this version and prepare it');
    expect(copy.ACCEPTING_VERSION).toBe('Accepting this version');
  });

  it('writes no sentence about what accepting means, because main does', () => {
    // Every claim about what Tortie will and will not do with an unmeasured
    // version arrives on the Prepare result. A copy of it here would be a
    // second place to reword a refusal into a success.
    for (const name of ['BTN_ACCEPT_VERSION', 'ACCEPTED_VERSION_NONE'] as const) {
      expect(copy[name]).not.toContain('measured');
    }
  });

  it('says that withdrawing a version withdraws the confirmation too', () => {
    expect(copy.WITHDRAW_VERSION_EXPLAIN).toContain(
      'also withdraws your confirmation'
    );
    expect(copy.WITHDRAW_VERSION_EXPLAIN).toContain(
      'Confirm the machine again to use it.'
    );
  });
});

describe('the three copies of main, checked by machine', () => {
  it('lists the versions main has measured for the exec plane, in order', () => {
    // The renderer may not import main in production code, so
    // MEASURED_VERSIONS is a hand-written copy of main's list. A copy going
    // stale is the whole defect this phase fixes, so this test is the thing
    // that keeps it honest. Add a row in main and this fails until the
    // renderer's copy agrees.
    const measured = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.exec
    ).map((row) => row.version);
    expect([...copy.MEASURED_VERSIONS]).toEqual(measured);
  });

  it('gives every outcome class a remedy entry, and invents none', () => {
    const classes = [...MACHINE_OUTCOME_CLASSES].sort();
    const keys = Object.keys(copy.REMEDY).sort();
    expect(keys).toEqual(classes);
  });

  it('leaves a remedy null only where there is nothing to do', () => {
    const nothingToDo = Object.entries(copy.REMEDY)
      .filter(([, text]) => text === null)
      .map(([cls]) => cls)
      .sort();
    // Phase 79.1 added `key-installed`. The key is on the machine, the
    // surface has already started the connection test, and the answer a
    // person is waiting for is the machine's own.
    expect(nothingToDo).toEqual(['cancelled', 'key-installed', 'ok', 'prepared']);
  });
});

// ---------------------------------------------------------------------------
// PHASE 79.1. The block that offers to set up a key
// ---------------------------------------------------------------------------

describe('the words the key block writes for itself', () => {
  it('names no file, no path and no part of a key', () => {
    // Every one of those arrives from main on the sheet and on the result,
    // beside the hash the agreement binds to. A path written here could
    // differ from the path main will actually write to, and a person would
    // have agreed to the wrong one.
    const ours = [
      copy.KEY_BLOCK_LABEL,
      copy.KEY_LINES_LABEL,
      copy.KEY_PASSWORD_LABEL,
      copy.KEY_PASSWORD_HINT,
      copy.BTN_INSTALL_KEY,
      copy.INSTALLING_KEY,
      copy.KEY_DISABLED_REASON,
      copy.KEY_TRANSCRIPT_LABEL,
      copy.KEY_RESULT_LABEL,
      copy.KEY_MADE_NEW,
      copy.KEY_MADE_REUSED,
      copy.KEY_WROTE_ADDED,
      copy.KEY_WROTE_PRESENT,
      copy.KEY_FINGERPRINT_LABEL
    ];
    const offenders = ours.filter((text) => /\/|~|authorized_keys|ed25519/.test(text));
    expect(offenders).toEqual([]);
  });

  it('says what the button will do, in the words on the button', () => {
    expect(copy.BTN_INSTALL_KEY).toBe('Make a key and put it on this machine');
    expect(copy.KEY_BLOCK_LABEL).toBe('Set up a key for this machine');
  });

  it('promises that the password is not kept, beside the field that takes it', () => {
    expect(copy.KEY_PASSWORD_HINT).toBe(
      'This goes straight to the sign in program for one call. Tortie keeps ' +
        'no copy of it.'
    );
  });

  it('says why the button is off, while it is off', () => {
    expect(copy.KEY_DISABLED_REASON).toBe(
      "Type that machine's password first. Tortie needs it once to put the " +
        'key on the machine.'
    );
  });

  it('says which of the two things happened to the key and to the file', () => {
    expect(copy.KEY_MADE_NEW).toBe('Tortie made a new key for this machine.');
    expect(copy.KEY_MADE_REUSED).toBe(
      'Tortie used the key it had already made for this machine.'
    );
    expect(copy.KEY_WROTE_ADDED).toBe('That machine gained one line.');
    expect(copy.KEY_WROTE_PRESENT).toBe(
      'That machine already had this key, so nothing was added.'
    );
  });

  it('names no path of its own in the sentence that names a file', () => {
    // PHASE 84. The file name arrives from main as an argument, so this file
    // still writes no path. The check is that the sentence carries nothing but
    // what it was handed.
    const text = copy.keyNamedOnEveryCommand('machine-a1b2c3d4e5f6');
    expect(text).not.toMatch(/\/|~|authorized_keys|ed25519/);
    expect(text).toContain('machine-a1b2c3d4e5f6');
  });

  it('says Tortie names its own key AND leaves yours offered', () => {
    // The second half is the half that matters. Tortie deliberately does not
    // tell the sign in program to offer its key and nothing else, because the
    // operator's own Mac Pro answers today through a key he loaded himself and
    // narrowing the offer would have broken it on the first run of this build.
    expect(copy.keyNamedOnEveryCommand('machine-a1b2c3d4e5f6')).toBe(
      'Tortie names its own key for this machine, the file called ' +
        'machine-a1b2c3d4e5f6, on every command it sends there. It also lets ' +
        'the sign in program offer any key you have loaded yourself.'
    );
  });

  it('says what happens when Tortie has no key, and names a real control', () => {
    expect(copy.KEY_NOT_MADE_YET).toBe(
      'Tortie has no key of its own for this machine, so every sign in uses ' +
        'whatever key you have loaded yourself. Run the connection test. When ' +
        'that machine asks for a password, or turns the sign in down, Tortie ' +
        'offers to make one.'
    );
    // There is no button called Install on this surface. The draft said there
    // was, and a sentence that names a control a person cannot find is the
    // same defect as a sentence that is out of date.
    expect(copy.KEY_NOT_MADE_YET).not.toContain('Install button');
  });

  it('points a refused sign in at the block that fixes it', () => {
    // Phase 79 told a person to put their public key on the machine
    // themselves. Tortie does it now, so the advice names the block rather
    // than the errand.
    expect(copy.REMEDY['auth-refused']).toBe(
      'That machine did not accept your sign in. Your key may not be on it ' +
        'yet. The block under this one makes a key and puts it on that ' +
        'machine for you.'
    );
  });
});

describe('the four sentences Phase 79 writes', () => {
  it('says what the section is for in one sentence', () => {
    expect(copy.SECTION_CAPTION).toBe(
      'Tortie can keep your work running on another machine you own.'
    );
  });

  it('says why Tortie wants Tailscale, and that it is not required', () => {
    // Phase 87 cut three of the four sentences. What is left is the two facts
    // a person acts on, being what Tortie asks Tailscale for and that typing
    // an address is still a path.
    expect(copy.TAILSCALE_WHY).toBe(
      'Tortie asks Tailscale which machines you own, and you can type an ' +
        'address below instead.'
    );
  });

  it('shows the install command a person can copy', () => {
    expect(copy.TAILSCALE_INSTALL_COMMAND).toBe('brew install --cask tailscale');
  });

  it('tells a person how to turn on Remote Login after a refusal', () => {
    // The operator could not use this feature at all. macOS ships with Remote
    // Login turned off, his connection was refused, and the screen told him
    // what had happened and nothing he could do. This is the sentence that
    // answers him, and it is pinned so a later edit cannot soften it back
    // into a diagnosis.
    expect(copy.REMEDY.refused).toBe(
      'On that Mac, open System Settings, then General, then Sharing, and ' +
        'turn on Remote Login. macOS ships with Remote Login turned off, so ' +
        'that is the usual reason. On a machine that is not a Mac, start its ' +
        'sign in service and check that it is listening on this port.'
    );
  });
});

describe('the counting sentences the Tailscale panel writes', () => {
  it('counts other machines in none, one and many', () => {
    expect(copy.tailnetCountLine(0)).toBe('No other machines found.');
    expect(copy.tailnetCountLine(1)).toBe('1 other machine found.');
    expect(copy.tailnetCountLine(4)).toBe('4 other machines found.');
  });

  it('says when Tortie last looked, and reads plainly at zero minutes', () => {
    expect(copy.lastLookedLine('now')).toBe('Tortie looked just now.');
    expect(copy.lastLookedLine('2m')).toBe('Tortie last looked 2m ago.');
    expect(copy.lastLookedLine('3h')).toBe('Tortie last looked 3h ago.');
  });

  it('says a device cannot run a session rather than hiding it', () => {
    expect(copy.PEER_CANNOT_HOST).toBe('Cannot run a session');
  });
});
// ---------------------------------------------------------------------------
// PHASE 72. The removal question, and the record a removal leaves behind
// ---------------------------------------------------------------------------

describe('the removal question', () => {
  it('counts the sessions rather than describing them', () => {
    expect(copy.removeQuestion('Studio', 0)).toBe(
      'Remove Studio? Tortie holds no sessions for it.'
    );
    expect(copy.removeQuestion('Studio', 1)).toBe(
      'Remove Studio? Tortie keeps a record of the 1 session it knows about ' +
        'there, with what it last knew and when. The conversations on that ' +
        'machine stay on that machine, and Tortie can no longer reach them.'
    );
    expect(copy.removeQuestion('Studio', 4)).toBe(
      'Remove Studio? Tortie keeps a record of the 4 sessions it knows about ' +
        'there, with what it last knew and when. The conversations on that ' +
        'machine stay on that machine, and Tortie can no longer reach them.'
    );
  });

  it('reads a count below zero as none, rather than printing it', () => {
    expect(copy.removeQuestion('Studio', -1)).toBe(
      'Remove Studio? Tortie holds no sessions for it.'
    );
  });

  it('never says the sessions on that machine were ended', () => {
    // Removing a machine sends nothing to it. A sentence that implied
    // otherwise would be the one lie this whole rung exists to prevent.
    for (const count of [0, 1, 2]) {
      const text = copy.removeQuestion('Studio', count).toLowerCase();
      expect(text).not.toContain('end');
      expect(text).not.toContain('stop');
      expect(text).not.toContain('close');
    }
  });
});

describe('the tombstone sentences', () => {
  /** 17 August 2026, 12:32 and 15:00 local, so the format is pinned exactly. */
  const SEEN = new Date(2026, 7, 17, 12, 32).getTime();
  const GONE = new Date(2026, 7, 17, 15, 0).getTime();

  it('writes a day as a day and a moment as a day and a time', () => {
    expect(copy.tombstoneDay(GONE)).toBe('17 August');
    expect(copy.tombstoneMoment(SEEN)).toBe('17 August at 12:32');
  });

  it('says Tortie did not end a session it last saw running', () => {
    expect(copy.tombstoneLine('Studio', GONE, SEEN, 'running')).toBe(
      'You removed Studio on 17 August. Tortie last saw this session running ' +
        'there on 17 August at 12:32. Tortie did not end it.'
    );
    expect(copy.tombstoneLine('Studio', GONE, SEEN, 'idle')).toBe(
      copy.tombstoneLine('Studio', GONE, SEEN, 'running')
    );
  });

  it('says only what a list that did not hold the session proved', () => {
    expect(copy.tombstoneLine('Studio', GONE, SEEN, 'restorable')).toBe(
      'You removed Studio on 17 August. The last list from that machine did ' +
        'not hold this session, on 17 August at 12:32.'
    );
  });

  it('says it does not know when no list ever held the session', () => {
    expect(copy.tombstoneLine('Studio', GONE, 0, 'unknown')).toBe(
      'You removed Studio on 17 August. Tortie never got a list from that ' +
        'machine while this session existed, so it does not know what ' +
        'happened to it.'
    );
  });

  it('never claims a session on the machine ended', () => {
    for (const status of ['running', 'idle', 'restorable', 'unknown', 'exited']) {
      for (const seen of [0, SEEN]) {
        const text = copy.tombstoneLine('Studio', GONE, seen, status);
        expect(text).not.toContain('ended');
        expect(text).not.toContain('stopped');
      }
    }
  });

  it('says why Restore is off, and what to do about it', () => {
    expect(copy.tombstoneRestoreRefused('Studio')).toBe(
      'Tortie can no longer reach Studio, so it cannot bring this session ' +
        'back. Add the machine again to work with it.'
    );
  });
});
