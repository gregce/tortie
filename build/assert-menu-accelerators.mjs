#!/usr/bin/env node
/**
 * assert-menu-accelerators.mjs. Every chord a native menu prints comes from the
 * one keymap (Phase 156).
 *
 * ## Why this gate exists
 *
 * `src/main/menu.ts:33` has said since Phase 12.12: "Do not type a chord string
 * into this file — add it to src/shared/keymap.ts and read it back, or the menu
 * and the ⌘/ overlay start drifting again." Nothing enforced it. A future round
 * that types `accelerator: 'Cmd+Shift+K'` on a row would print a keycap the
 * overlay never shows, and the recorder's conflict table would never learn that
 * the chord is spent. Both are silent. Nothing goes red, and the operator is
 * the one who finds out.
 *
 * It is a sibling of build/assert-menu-glyphs.mjs rather than a check bolted on
 * to it, because that file is about pictures and this one is about keys. One
 * module, one responsibility.
 *
 * ## What it asserts, in two passes, and the second is the one that matters
 *
 * The first pass reads every `accelerator:` property and requires an
 * `accel(...)` call, a bare identifier (the per agent hotkey rows, whose chord
 * is the person's own recorded setting and cannot come from a fixed table), or
 * the ONE named exception below.
 *
 * THAT PASS ALONE WOULD SEE ONLY SIX OF THE THIRTY TWO CHORDS IN THIS MENU, and
 * writing it that way and counting is how the hole was found. Most rows are
 * built by the local `item(label, action, accelerator, mark)` helper, so their
 * chord is a positional argument and never the word `accelerator`. A round that
 * typed `item('Thing', 'thing', 'Cmd+K')` would sail past a property check.
 *
 * So the second pass reads every STRING LITERAL in these files, with comments
 * removed first, and fails on any that is shaped like an Electron accelerator:
 * one or more of Cmd, Command, Ctrl, Control, Shift, Alt or Option joined by
 * `+`, or a bare function key. That catches the chord wherever it is typed,
 * including in a helper this gate has never heard of.
 *
 * A STRING LITERAL HERE INCLUDES BACKTICKS, and the first version of this gate
 * did not. It blanked every template literal, so `item('Thing', 'thing',
 * `Cmd+S`)` sailed past while the same chord in single quotes was caught.
 * TypeScript reads both as a string and Electron would register either. Only a
 * template that substitutes, meaning one that contains `${`, is blanked now,
 * because those hold the display strings the overlay builds rather than a
 * chord anyone typed.
 *
 * ## The one exception, and it is named rather than pattern matched
 *
 * `'Control+Command+F'` on the hidden full screen item in `src/main/menu.ts`.
 * It is the macOS platform chord Electron's `togglefullscreen` role used to
 * supply, it has never been a Tortie keymap entry, and the item is
 * `visible: false` so no row ever displays it. Putting it in KEYMAP would add
 * it to RESERVED_APP_CHORDS, because `hasCommandModifier` answers true for
 * Ctrl, and the per agent hotkey recorder would start refusing a chord macOS
 * owns rather than Tortie. The reason in full is at the item itself.
 *
 * It spawns nothing, launches no Electron, opens no profile, makes no request,
 * and reads two source trees plus its own fixtures in about a tenth of a
 * second.
 *
 * Exit 0 when every chord is read from the keymap, 1 when one is typed.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[menu-accelerators]';

/** The literal chord that is allowed, and the only one. */
export const ALLOWED_LITERAL = 'Control+Command+F';

/**
 * Every complaint about one source file.
 *
 * A value is fine when it is an `accel(...)` call or a bare identifier. It is
 * fine when it is the one allowed literal. Anything else is a typed chord.
 */
/**
 * The source with comments and substituting template literals blanked out.
 *
 * Chords are named in prose all over these files, and the whole reason the
 * literal pass can be strict is that it never reads a comment. A template
 * literal that SUBSTITUTES goes too, because `${...}` inside one is not a
 * chord and the display strings the overlay builds live in them. A template
 * literal with no substitution is kept, because it is a plain string in every
 * way that matters here and a chord can be typed in one.
 *
 * A quoted string is copied through whole rather than read character by
 * character, so a backtick inside one cannot be mistaken for the start of a
 * template and blank the code that follows it.
 */
export function stripProse(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    const ch = source[i];
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && source[j] !== '\n') {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      if (j < source.length && source[j] === ch) {
        out += source.slice(i, j + 1);
        i = j + 1;
      } else {
        out += source.slice(i, j);
        i = j;
      }
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== '`') {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      const closed = j < source.length;
      const body = source.slice(i + 1, j);
      if (!closed || body.includes('${')) {
        out += ' ';
      } else {
        out += source.slice(i, j + 1);
      }
      i = j + 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Anything shaped like an Electron accelerator. */
const CHORD =
  /^(?:(?:Cmd|Command|Ctrl|Control|Shift|Alt|Option|CmdOrCtrl|Super|Meta)\+)+[A-Za-z0-9]+$|^F\d{1,2}$/;

/**
 * Every complaint about one source file's string literals.
 *
 * This is the pass that sees a chord wherever it is typed, and it is why the
 * property pass above is not the whole gate.
 */
export function checkLiterals(source, label) {
  const findings = [];
  const code = stripProse(source);
  for (const m of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)) {
    const value = m[1] ?? m[2] ?? m[3];
    if (value === undefined || !CHORD.test(value)) continue;
    if (value === ALLOWED_LITERAL) continue;
    findings.push(
      `${label}: the string '${value}' is shaped like a keyboard chord and is ` +
        'typed into the file. Add it to src/shared/keymap.ts and read it back ' +
        'with accel(), or the menu and the ⌘/ overlay drift and the hotkey ' +
        'recorder never learns the chord is spent.'
    );
  }
  return findings;
}

export function check(source, label) {
  const findings = [];
  for (const m of source.matchAll(/accelerator:\s*([^,\n]+)/g)) {
    const value = m[1].trim().replace(/\s*$/, '');
    if (/^accel\(/.test(value)) continue;
    if (/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(value)) continue;
    const literal = /^'([^']*)'$|^"([^"]*)"$/.exec(value);
    if (literal !== null) {
      const chord = literal[1] ?? literal[2];
      if (chord === ALLOWED_LITERAL) continue;
      findings.push(
        `${label}: accelerator '${chord}' is typed into the file. Add it to ` +
          'src/shared/keymap.ts and read it back with accel(), or the menu ' +
          'and the ⌘/ overlay drift and the hotkey recorder never learns the ' +
          'chord is spent.'
      );
      continue;
    }
    findings.push(
      `${label}: accelerator ${value} is neither an accel() call nor a bare ` +
        'identifier, so this gate cannot tell where its chord came from.'
    );
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Prove the checker on fixtures it writes itself, before trusting its verdict
// ---------------------------------------------------------------------------

const fixtures = [
  { why: 'a chord read from the keymap', src: "accelerator: accel('app.quit'),", want: 0 },
  { why: 'the person’s own recorded hotkey', src: 'accelerator,', want: 0 },
  { why: 'the one allowed literal', src: `accelerator: '${ALLOWED_LITERAL}',`, want: 0 },
  { why: 'a typed chord', src: "accelerator: 'Cmd+Shift+K',", want: 1 },
  { why: 'a typed chord in double quotes', src: 'accelerator: "Cmd+K",', want: 1 },
  { why: 'a chord this gate cannot trace', src: 'accelerator: chordFor(row.id),', want: 1 },
  { why: 'a typed chord in backticks', src: 'accelerator: `Cmd+K`,', want: 1 },
  {
    why: 'two typed chords in one file',
    src: "accelerator: 'Cmd+1',\naccelerator: 'Cmd+2',",
    want: 2
  }
];

const literalFixtures = [
  { why: 'no chord anywhere', src: "item('Save', 'save-file', accel('editor.save')),", want: 0 },
  { why: 'a chord in prose', src: "// press 'Cmd+K' to clear\nconst a = 1;", want: 0 },
  { why: 'a chord in a block comment', src: "/* Cmd+Shift+F is the search chord */", want: 0 },
  { why: 'a chord inside a template literal that substitutes', src: 'const s = `${x}Cmd+K`;', want: 0 },
  {
    why: 'a chord typed in a template literal that substitutes nothing',
    src: "item('Thing', 'thing', `Cmd+S`),",
    want: 1
  },
  { why: 'a template literal that is not a chord', src: 'const s = `Close Editor Tab`;', want: 0 },
  {
    why: 'a backtick inside a quoted string does not blank the chord after it',
    src: "label: 'press ` to focus',\nitem('Thing', 'thing', 'Cmd+K'),",
    want: 1
  },
  { why: 'the one allowed literal', src: `accelerator: '${ALLOWED_LITERAL}',`, want: 0 },
  { why: 'a chord typed as item()’s third argument', src: "item('Thing', 'thing', 'Cmd+K'),", want: 1 },
  { why: 'a bare function key typed in', src: "item('Rename', 'rename', 'F2'),", want: 1 },
  { why: 'a chord in double quotes', src: 'item("Thing", "thing", "Shift+Cmd+O"),', want: 1 },
  { why: 'an ordinary string that is not a chord', src: "label: 'Close Editor Tab',", want: 0 },
  {
    why: 'two typed chords past the property pass',
    src: "item('A', 'a', 'Cmd+1'), item('B', 'b', 'Cmd+2'),",
    want: 2
  }
];

let fixturesOk = true;
for (const one of literalFixtures) {
  const got = checkLiterals(one.src, 'fixture').length;
  if (got !== one.want) {
    console.error(
      `${TAG} the literal checker itself is wrong: ${one.why} produced ` +
        `${String(got)} findings, expected ${String(one.want)}.`
    );
    fixturesOk = false;
  }
}
for (const one of fixtures) {
  const got = check(one.src, 'fixture').length;
  if (got !== one.want) {
    console.error(
      `${TAG} the checker itself is wrong: ${one.why} produced ` +
        `${String(got)} findings, expected ${String(one.want)}.`
    );
    fixturesOk = false;
  }
}
if (!fixturesOk) process.exit(1);

// ---------------------------------------------------------------------------
// The real files
// ---------------------------------------------------------------------------

/** Every .ts file at or below one path, skipping __tests__. */
function sources(path) {
  const stat = statSync(path);
  if (!stat.isDirectory()) return path.endsWith('.ts') ? [path] : [];
  const out = [];
  for (const entry of readdirSync(path)) {
    if (entry === '__tests__') continue;
    out.push(...sources(join(path, entry)));
  }
  return out;
}

const files = [
  ...sources(join(repoRoot, 'src', 'main', 'menu.ts')),
  ...sources(join(repoRoot, 'src', 'main', 'tray')),
  ...sources(join(repoRoot, 'src', 'main', 'recents'))
];

const findings = [];
let chords = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const label = relative(repoRoot, file);
  chords += [...source.matchAll(/accel\(/g)].length;
  chords += [...source.matchAll(/accelerator:/g)].length;
  findings.push(...check(source, label));
  findings.push(...checkLiterals(source, label));
}

if (findings.length > 0) {
  for (const one of findings) console.error(`${TAG} ${one}`);
  console.error(
    `${TAG} FAILED. ${String(findings.length)} typed chord(s) in a native menu.`
  );
  process.exit(1);
}

console.log(
  `${TAG} OK: ${String(files.length)} files, ${String(chords)} accelerator ` +
    `sites, every one read from src/shared/keymap.ts or the person's own ` +
    `recorded hotkey, and no chord shaped string literal outside comments ` +
    `except the one named exception '${ALLOWED_LITERAL}'. ` +
    `${String(fixtures.length + literalFixtures.length)} fixtures behaved.`
);
