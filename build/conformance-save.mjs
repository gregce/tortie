#!/usr/bin/env node
/**
 * `npm run conformance:save`, the gate on which door a ⌘S takes (Phase 240).
 *
 * About 0.3 s. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request, writes nothing outside a scratch
 * directory it removes in a `finally`, and reads nothing under the person's
 * home. It reads source text and answers structural questions about it.
 *
 * ## Why it exists
 *
 * Issue 16, Sean Johnson, 2026-09-08: "When I edit a file, then save, there's
 * no warning if someone else (presumably an agent) edited it concurrently and
 * I'm overwriting its edits (as VSC does)." Research 100 §1 reproduced it in
 * the running app and measured the loss at 173 bytes of an agent's paragraph,
 * with zero toasts, zero banners, no dialog and a tab that went clean
 * afterwards so nothing was left to see.
 *
 * The fix is one line moving from `fs:writeFile` to `fs:writeGuarded`, and one
 * line is exactly the kind of thing a later round moves back for convenience —
 * "the guarded channel refused a save once, let's fall back". So the gate asks
 * the question the charter names as the phase's second independent method:
 * scan every renderer-reachable whole-file write and prove `save` is no longer
 * among `fs:writeFile`'s callers for a file inside a project, read by matching
 * braces rather than by searching a file for a word.
 *
 * EVERY SCANNER IS PROVED ON PLANTED FIXTURES, several of which must make it
 * fail, because a scan that cannot fail is never mistaken for a scan that
 * passed. That is this tree's own standing rule for a source-reading gate.
 *
 * ## The rules
 *
 *   1. `save`'s OWN BODY names no write. It is the ladder of refusals it has
 *      always been; the write is one of three doors below it. Read through
 *      `namedFunctions` in build/scan-source.mjs, which matches braces, and
 *      which is the reader rather than `functionBodyOf` for one reason: `save`
 *      is `const save = async (id) => {…}` inside `createTabIo`, and
 *      `functionBodyOf` reads a `function` DECLARATION. Both live in the same
 *      module and both match braces the same way. `functionBodyOf` is asked
 *      for the two exported functions in rule 4, where it does apply.
 *   2. ONE FUNCTION IN THE EDITOR NAMES `writeFile`, and it is
 *      `saveOutsideProject`, which is the old door kept for a file outside
 *      every open project root and for a symbolic link. Everything else that
 *      writes a tab goes through `saveInProject`.
 *   3. THE ORDER INSIDE `saveInProject`: the digest of `savedContents` is
 *      asked BEFORE the guarded write, and the guarded write is the only write
 *      in it. `savedContents` is by definition what Tortie last read, so the
 *      digest of anything else is not a precondition at all.
 *   4. OVERWRITE IS GUARDED TOO, and against the RIGHT bytes. `overwrite`'s
 *      body hands the channel the digest the channel gave back with `stale`,
 *      never a digest of `savedContents`, which is the stale thing. This is
 *      charter item 3 and the arm a verifier attacks.
 *   5. THE CHOICE IS THREE-ANSWERED AND OVERWRITE IS NOT THE DEFAULT.
 *      `ConfirmDialog` focuses the confirm button on open and a bare Return
 *      runs it, so the confirm label IS the default. `offerStaleChoice` must
 *      set `confirmLabel` to the Compare label and `altLabel` to the Overwrite
 *      one, and must not mark the dialog destructive.
 *   6. THE RENDERER'S CALLERS OF `fs:writeFile` ARE THE DECLARED ONES, being
 *      the editor's old door and the Phase 199 harness probe, which is
 *      installed on a harness launch and on nothing else. A third is a
 *      finding, the way `conformance:redline-write` rule 5 treats a third
 *      caller of the guarded channel.
 *   7. EVERY RENDERER-REACHABLE WHOLE-FILE WRITE UNDER src/main/fs IS ONE OF
 *      THE TWO KNOWN CHANNELS. A third one would be a door this gate says
 *      nothing about.
 *   8. A word added to the channel gets a sentence or it does not compile, and
 *      no sentence is the generic one the phase replaced.
 *   9. A gate nothing names is how a gate decays.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { functionBodyOf, namedFunctions, stripComments } from './scan-source.mjs';

const TAG = '[conformance:save]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const TAB_IO = 'src/renderer/editor/tab-io.ts';
const SAVE_WRITE = 'src/renderer/editor/save-write.ts';
const SENTENCES = 'src/renderer/editor/save-sentences.ts';

const source = (rel) => stripComments(readFileSync(join(repoRoot, rel), 'utf8'));

/** Every named function in a file, bodies matched by braces. */
const functionsIn = (rel) => namedFunctions(source(rel));

/** The body of one named function, or a failure naming the rule. */
function bodyOf(rel, name, rule) {
  const body = functionsIn(rel).get(name);
  if (body === undefined) {
    fail(`${rule}. ${rel} declares no function called ${name}, so this rule read nothing`);
    return null;
  }
  return body;
}

function walk(dir, keep) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full, keep));
    } else if (keep(entry.name)) out.push(full);
  }
  return out;
}

function filesNaming(dir, needle) {
  return walk(dir, (n) => /\.[cm]?tsx?$/.test(n))
    .filter((f) => !/__tests__|\.test\./.test(f))
    .filter((f) => stripComments(readFileSync(f, 'utf8')).includes(needle))
    .map((f) => relative(repoRoot, f))
    .sort();
}

// ---------------------------------------------------------------------------
// The scanners, written once and proved on fixtures below.
// ---------------------------------------------------------------------------

/** Does the body of `name` in `code` mention `needle`? null when absent. */
function bodyMentions(code, name, needle) {
  const body = namedFunctions(stripComments(code)).get(name);
  return body === undefined ? null : body.includes(needle);
}

/**
 * Is `first` mentioned before `second` inside the body of `name`? null when
 * the function is absent or either mention is.
 */
function bodyOrder(code, name, first, second) {
  const body = namedFunctions(stripComments(code)).get(name);
  if (body === undefined) return null;
  const a = body.indexOf(first);
  const b = body.indexOf(second);
  if (a === -1 || b === -1) return null;
  return a < b;
}

/**
 * The names of the functions that mention `needle` and hold no other such
 * function inside them.
 *
 * WHY THE INNERMOST AND NOT EVERY ONE. Every function in `tab-io.ts` is
 * declared inside `createTabIo`, the factory the store calls, so a plain
 * "which functions name a write" reads the factory as one of them and the
 * answer is always at least two. The question this gate asks is which function
 * OWNS the write, and that is the smallest one holding it.
 */
function innermostNaming(code, needle) {
  const bodies = [...namedFunctions(stripComments(code)).entries()].filter(([, body]) =>
    body.includes(needle)
  );
  return bodies
    .filter(([, body]) => !bodies.some(([, other]) => other !== body && body.includes(other)))
    .map(([name]) => name)
    .sort();
}

// ---------------------------------------------------------------------------
// Rule 0. The scanners are proved before anything is asked of them.
// ---------------------------------------------------------------------------

const FIXTURES = [
  {
    name: 'the save that writes inline is caught',
    catches: true,
    code: 'const save = async (id) => { await gmux.fs.writeFile(p, v); };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === true
  },
  {
    name: 'the save that only calls the doors is clean',
    catches: false,
    code: 'const save = async (id) => { return inRepo ? saveInProject(id) : saveOutsideProject(id); };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === false
  },
  {
    name: 'a write in a NEIGHBOURING function does not clear the save',
    catches: true,
    code:
      'const other = async () => { await gmux.fs.writeFile(p, v); };\n' +
      'const save = async (id) => { await gmux.fs.writeFile(p, v); };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === true
  },
  {
    name: 'a write in a neighbouring function is not read as the save`s',
    catches: false,
    code:
      'const save = async (id) => { return saveInProject(id); };\n' +
      'const other = async () => { await gmux.fs.writeFile(p, v); };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === false
  },
  {
    name: 'a save that is not there reads as absent rather than as clean',
    catches: true,
    code: 'const load = async (id) => { return 1; };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === null
  },
  {
    name: 'the digest asked before the guarded write reads in order',
    catches: false,
    code:
      'const saveInProject = async (t) => { const e = await sha256Hex(t.savedContents); return guardedSave({ expect: e }); };',
    check: (c) => bodyOrder(c, 'saveInProject', 'savedContents', 'guardedSave') === true
  },
  {
    name: 'the digest asked AFTER the guarded write is caught',
    catches: true,
    code:
      'const saveInProject = async (t) => { const r = await guardedSave({}); const e = await sha256Hex(t.savedContents); return r; };',
    check: (c) => bodyOrder(c, 'saveInProject', 'savedContents', 'guardedSave') === false
  },
  {
    name: 'an overwrite computing a digest of its own is caught',
    catches: true,
    code: 'const overwrite = async (t, onDisk) => guardedSave({ expect: await sha256Hex(t.savedContents) });',
    check: (c) => bodyMentions(c, 'overwrite', 'sha256Hex') === true
  },
  {
    name: 'an overwrite handing back the digest it was given is clean',
    catches: false,
    code:
      'const overwrite = async (t, onDisk) => { const r = await guardedSave({ expect: onDisk }); ' +
      'patch({ savedContents: v }); return r; };',
    check: (c) => bodyMentions(c, 'overwrite', 'sha256Hex') === false
  },
  {
    name: 'a TypeScript return type does not hide a body',
    catches: true,
    code: 'const save = async (id: string): Promise<boolean> => { await gmux.fs.writeFile(p, v); return true; };',
    check: (c) => bodyMentions(c, 'save', 'writeFile') === true
  },
  {
    name: 'the plain door that reads before it writes is clean',
    catches: false,
    code:
      'const saveOutsideProject = async (id, tab, v) => { const d = await diskReading(tab); ' +
      'if (d.kind !== "changed") return writePlain(id, tab, v); return false; };',
    check: (c) =>
      bodyOrder(c, 'saveOutsideProject', 'diskReading', 'writePlain') === true
  },
  {
    name: 'the plain door that writes before it reads is caught',
    catches: true,
    code:
      'const saveOutsideProject = async (id, tab, v) => { const ok = await writePlain(id, tab, v); ' +
      'const d = await diskReading(tab); return ok; };',
    check: (c) =>
      bodyOrder(c, 'saveOutsideProject', 'diskReading', 'writePlain') === false
  },
  {
    name: 'a plain write reached from a SECOND function is caught',
    catches: true,
    code:
      'const saveOutsideProject = async (id, tab, v) => { const d = await diskReading(tab); return writePlain(id, tab, v); };\n' +
      'const shortcut = async (id, tab, v) => { return writePlain(id, tab, v); };',
    check: (c) => innermostNaming(c, 'writePlain').join(',') !== 'saveOutsideProject'
  },
  {
    name: 'a return type holding a function type in angle brackets does not swallow the arrow',
    catches: false,
    code:
      'const save = async (id: string): Promise<Record<string, () => void>> => { await gmux.fs.writeFile(p, v); };',
    // The body is the block's INSIDE, so it holds the write and no arrow. The
    // mis-read one begins `void> => {` and carries both.
    check: (c) => {
      const body = namedFunctions(c).get('save') ?? '';
      return body.includes('writeFile') && !body.includes('=>');
    }
  },
  {
    name: 'a needle inside a return type is not read as part of the body',
    catches: false,
    code:
      'const overwrite = async (t, onDisk): Promise<Map<string, () => typeof sha256Hex>> => ' +
      '{ return guardedSave({ expect: onDisk }); };',
    check: (c) => bodyMentions(c, 'overwrite', 'sha256Hex') === false
  },
  {
    name: 'an enclosing factory is not read as the function that writes',
    catches: false,
    code:
      'export function makeIo(deps) {\n' +
      '  const outer = async () => { await gmux.fs.writeFile(p, v); };\n' +
      '  return { outer };\n' +
      '}',
    check: (c) => innermostNaming(c, 'writeFile').join(',') === 'outer'
  }
];

{
  const wrong = FIXTURES.filter((f) => f.check(f.code) !== true).map((f) => f.name);
  if (wrong.length > 0) {
    fail(`0. the scanners misread ${String(wrong.length)} fixture(s): ${wrong.join('; ')}`);
  } else {
    const mustCatch = FIXTURES.filter((f) => f.catches).length;
    say(
      `0. ${String(FIXTURES.length)} planted fixtures behaved, ${String(mustCatch)} of them shapes that must make a rule fail`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 1. `save` names no write of its own.
// ---------------------------------------------------------------------------

{
  const body = bodyOf(TAB_IO, 'save', '1');
  if (body !== null) {
    const named = ['writeFile', 'writeGuarded', 'fs:writeFile', 'fs:writeGuarded'].filter(
      (n) => body.includes(n)
    );
    if (named.length > 0) {
      fail(
        `1. save in ${TAB_IO} names ${named.join(', ')} in its own body; the write belongs to one of the three doors below it`
      );
    } else {
      const doors = ['saveOnMachine', 'saveInProject', 'saveOutsideProject'].filter((d) =>
        body.includes(d)
      );
      if (doors.length !== 3) {
        fail(`1. save reaches ${String(doors.length)} of its 3 doors (${doors.join(', ') || 'none'})`);
      } else {
        say('1. save names no write of its own and reaches all three doors, read by matching braces');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 2. ONE function in the editor names `writeFile`, and nothing reaches it
// without reading the file first.
//
// PHASE 240'S FIX ROUND SPLIT THIS IN TWO, because the first half passed while
// the product lost somebody else's write. `saveOutsideProject` was the plain
// write itself, and three shapes reached it with no check of any kind: a
// symbolic link inside a project, a file outside every project, and a draft
// that had never been saved. Driven in the running app, a `/bin/sh` wrote 17
// bytes into a symlinked file's target, ⌘S, and the write was gone with no
// dialog, no toast and a clean tab — issue 16 on a file that happens to be a
// link. So the write is `writePlain` now, `saveOutsideProject` is the reading
// in front of it, and rule 2b is what keeps the reading there.
// ---------------------------------------------------------------------------

const PLAIN_WRITE = 'writePlain';
const PLAIN_DOOR = 'saveOutsideProject';
const READING = 'diskReading';
{
  const naming = innermostNaming(readFileSync(join(repoRoot, TAB_IO), 'utf8'), 'writeFile');
  if (naming.length !== 1 || naming[0] !== PLAIN_WRITE) {
    fail(
      `2. ${TAB_IO} names writeFile inside ${naming.join(', ') || 'no function'}, and it must be ${PLAIN_WRITE} alone`
    );
  } else {
    say(`2. writeFile is named inside ${PLAIN_WRITE} alone, the write a file outside a project, a symbolic link and a never-saved draft take`);
  }
}

// Rule 2b. The plain write is reached from the door alone, and the door reads
// the file before it writes.
{
  const code = readFileSync(join(repoRoot, TAB_IO), 'utf8');
  const callers = innermostNaming(code, PLAIN_WRITE);
  const order = bodyOrder(source(TAB_IO), PLAIN_DOOR, READING, PLAIN_WRITE);
  if (callers.length !== 1 || callers[0] !== PLAIN_DOOR) {
    fail(
      `2b. ${PLAIN_WRITE} is reached from ${callers.join(', ') || 'no function'}, and it must be ${PLAIN_DOOR} alone, so every plain write is answered for by the reading in front of it`
    );
  } else if (order !== true) {
    fail(
      `2b. ${PLAIN_DOOR} ${order === null ? `never names both ${READING} and ${PLAIN_WRITE}` : `writes before it reads`}; a plain write with no reading in front of it is the shape that lost 17 bytes of an outside write on a symlinked file`
    );
  } else {
    say(`2b. ${PLAIN_WRITE} is reached from ${PLAIN_DOOR} alone and ${PLAIN_DOOR} asks ${READING} before it writes`);
  }
}

// ---------------------------------------------------------------------------
// Rule 3. The digest of `savedContents` comes before the guarded write.
// ---------------------------------------------------------------------------

{
  const body = bodyOf(TAB_IO, 'saveInProject', '3');
  if (body !== null) {
    if (!body.includes('guardedSave')) {
      fail('3. saveInProject does not reach guardedSave, so a save inside a project is unguarded');
    } else if (body.includes('writeFile') && !body.includes(PLAIN_DOOR)) {
      fail('3. saveInProject writes through a channel of its own');
    } else if (body.indexOf('savedContents') === -1) {
      fail('3. saveInProject never names savedContents, so its precondition is not the bytes Tortie read');
    } else if (body.indexOf('savedContents') > body.indexOf('guardedSave')) {
      fail('3. saveInProject computes its precondition AFTER the guarded write');
    } else {
      say('3. saveInProject asks the digest of savedContents before the guarded write, and writes through nothing else');
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 4. Overwrite is guarded against what was JUST read.
// ---------------------------------------------------------------------------

{
  const body = bodyOf(TAB_IO, 'overwrite', '4');
  if (body !== null) {
    if (!body.includes('guardedSave')) {
      fail('4. overwrite does not reach guardedSave, so the second, deliberate write is unguarded');
    } else if (body.includes('sha256Hex')) {
      fail(
        '4. overwrite computes a digest of its own, and the only bytes it could compute one from are the stale ones; it must hand back the digest the channel gave with `stale`'
      );
    } else if (!/expect:\s*onDisk/.test(body)) {
      fail('4. overwrite does not pass the digest it was given as `expect`');
    } else if (!body.includes('offerStaleChoice')) {
      fail(
        '4. overwrite does not offer the choice again on a second `stale`, so a THIRD writer between the choice and the click is lost'
      );
    } else {
      say('4. overwrite is a guarded write against the digest the channel gave back, and a third writer is offered the same choice');
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 5. Three answers, and Overwrite is not the default.
// ---------------------------------------------------------------------------

{
  const body = bodyOf(TAB_IO, 'offerStaleChoice', '5');
  if (body !== null) {
    const problems = [];
    if (!/confirmLabel:\s*SAVE_COMPARE_LABEL/.test(body)) {
      problems.push('the confirm label is not the Compare one, and the confirm IS the default');
    }
    if (!/altLabel:\s*SAVE_OVERWRITE_LABEL/.test(body)) {
      problems.push('Overwrite is not the alt');
    }
    if (/destructive/.test(body)) {
      problems.push('the dialog is marked destructive, which paints the confirm, and the confirm is a look');
    }
    if (!body.includes('onAlt')) problems.push('there is no third answer at all');
    if (problems.length > 0) {
      fail(`5. the stale choice is wrong: ${problems.join('; ')}`);
    } else {
      say('5. the stale choice has three answers, Compare is the confirm and Overwrite is the alt, so the default is not overwrite');
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 6. The renderer's callers of the unguarded write.
// ---------------------------------------------------------------------------

const PLAIN_CALLERS = [
  TAB_IO,
  // Phase 199's harness probe, installed by `shot-hook` on a harness launch
  // and on nothing else. It writes fixtures into a scratch project.
  'src/renderer/editor/history-search-shot-probe.ts'
];
{
  const dir = join(repoRoot, 'src/renderer');
  const callers = [
    ...new Set([...filesNaming(dir, "'fs:writeFile'"), ...filesNaming(dir, '.writeFile(')])
  ].sort();
  const want = [...PLAIN_CALLERS].sort();
  if (callers.length !== want.length || callers.some((f, i) => f !== want[i])) {
    fail(
      `6. the renderer must reach fs:writeFile from ${want.join(' and ')} alone; it reaches it from ${callers.join(', ') || 'no file'}`
    );
  } else {
    say(`6. the renderer reaches fs:writeFile from ${want.join(' and ')} alone, the editor's old door and the harness probe`);
  }
}

// ---------------------------------------------------------------------------
// Rule 7. Every renderer-reachable whole-file write under src/main/fs.
// ---------------------------------------------------------------------------

const WRITE_CHANNELS = ['fs:writeFile', 'fs:writeGuarded'];
{
  const ipc = source('src/main/fs/ipc.ts');
  const declared = [...ipc.matchAll(/'(fs:[A-Za-z]+)'/g)].map((m) => m[1]);
  const writers = [...new Set(declared.filter((c) => /write/i.test(c)))].sort();
  if (writers.length !== WRITE_CHANNELS.length || writers.some((c, i) => c !== WRITE_CHANNELS[i])) {
    fail(
      `7. src/main/fs registers ${writers.join(', ') || 'no'} whole-file write channel(s), and this gate knows about ${WRITE_CHANNELS.join(' and ')} alone`
    );
  } else {
    say(`7. src/main/fs registers exactly ${WRITE_CHANNELS.join(' and ')}, the two doors this gate reasons about`);
  }
}

// ---------------------------------------------------------------------------
// Rule 8. A word without a sentence does not compile, and none is the generic
// one the phase replaced.
// ---------------------------------------------------------------------------

{
  const shared = source('src/shared/fs-ops.ts');
  const union = /export type FsGuardedWriteRefusal =([^;]+);/.exec(shared);
  const sentences = source(SENTENCES);
  const map = /const SENTENCES: Record<SaveRefusalWord, string> = \{([\s\S]*?)\n\};/.exec(sentences);
  if (union === null || map === null) {
    fail('8. could not read the refusal union or the sentence map');
  } else {
    const words = [...union[1].matchAll(/'([A-Za-z0-9]+)'/g)].map((m) => m[1]).sort();
    const said = [...map[1].matchAll(/^\s{2}([A-Za-z0-9]+):/gm)].map((m) => m[1]).sort();
    // `link` is deliberately excluded: a save through a link loses nothing, so
    // it falls back to the old door rather than refusing. ./save-sentences
    // carries the argument and ./save-write maps it to null.
    const want = words.filter((w) => w !== 'link');
    const missing = want.filter((w) => !said.includes(w));
    const extra = said.filter((w) => !want.includes(w));
    if (missing.length > 0 || extra.length > 0) {
      fail(
        `8. the sentence map and the refusal union disagree: missing ${missing.join(', ') || 'none'}, extra ${extra.join(', ') || 'none'}`
      );
    } else if (!/Exclude<FsGuardedWriteRefusal, 'link'>/.test(sentences)) {
      fail("8. SaveRefusalWord is not derived from the channel's own union, so a new word would not be a compile error");
    } else if (/Could not save this file/.test(sentences)) {
      fail('8. a sentence is the generic one this phase replaced');
    } else {
      const linkNull = functionBodyOf(source(SAVE_WRITE), 'saveRefusalWord');
      if (linkNull === null || !/'link'/.test(linkNull) || !/null/.test(linkNull)) {
        fail('8. save-write does not map `link` to null, so the one fallback is not where it says it is');
      } else {
        say(
          `8. ${String(want.length)} of the channel's ${String(words.length)} words have a sentence of their own, none of them the generic one, and \`link\` maps to null so it falls back rather than refusing`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 9. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

{
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  if (!pkg.includes('"conformance:save"')) fail('9. package.json does not name conformance:save');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!checks.includes("'conformance:save'")) {
    fail('9. build/verification-checks.mjs does not classify conformance:save');
  }
  say('9. the gate is named in package.json and classified in build/verification-checks.mjs');
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say('OK: every rule passed.');
process.exit(0);
