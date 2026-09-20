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
 *   1. `save`'s OWN BODY names no write, and neither does `saveOnce`, which is
 *      the ladder of refusals now; the write is one of three doors below it.
 *      PHASE 277 moved the ladder. `save` became one line that runs `saveOnce`
 *      inside `withSaveSlot`, so two saves of one tab can never be in the air
 *      at once, and rule 1 read `save` alone and found none of the doors — while
 *      every door was still reached, from the function below it. The rule reads
 *      the function that CHOOSES the door, not the one that used to. Read through
 *      `namedFunctions` in build/scan-source.mjs, which matches braces, and
 *      which is the reader rather than `functionBodyOf` for one reason: `save`
 *      is `const save = async (id) => {…}` inside `createTabIo`, and
 *      `functionBodyOf` reads a `function` DECLARATION. Both live in the same
 *      module and both match braces the same way. `functionBodyOf` is asked
 *      for the two exported functions in rule 4, where it does apply.
 *  1c. `save` IS EXACTLY ONE DELEGATION TO `saveOnce` INSIDE `withSaveSlot`,
 *      compared with the whitespace removed. It began as a substring test and
 *      the Phase 277 fix round walked three shapes past it. This is the
 *      half of the Phase 277 move that a retargeted rule 1 would otherwise let
 *      slip: a later `save` that picked a door directly would skip both the
 *      slot and every refusal in `saveOnce`, and rules 1 and 11 would still
 *      pass because they read `saveOnce`. `ablation:p268` arm 6 is the proof.
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
 *  10. THE AUTO SAVE MODULE NAMES NO WRITE AND NO PLAIN DOOR (Phase 268). Its
 *      one route to disk is `deps.save`, which the store hands in as
 *      `io.save(id, 'auto')`. A timer that writes the buffer is issue 16 on a
 *      loop, so `src/renderer/editor/auto-save.ts` may not name `writeFile`,
 *      `writeGuarded`, `writePlain`, `saveOutsideProject` or `setInterval` at
 *      all.
 *  11. `saveOnce` REFUSES THE PLAIN DOOR FOR THE AUTO REASON, and the refusal
 *      is read BEFORE the door name appears in its body. The plain door is
 *      unguarded and a timer does not get an unguarded write. It read `save`
 *      until Phase 277 moved the door choice into `saveOnce`; rule 1c is what
 *      keeps `save` from growing a second route round it. The statement that
 *      tests the reason must RETURN (Phase 282.1) and may not name the door it
 *      refuses (Phase 282.2: `return saveOutsideProject(…)` there returned,
 *      and was green).
 *  11b. `saveInProject`'s `unguarded` ARM REFUSES IT TOO. That arm is the
 *      symbolic link, and the shape at this phase's parent — a bare
 *      `return saveOutsideProject(…)` — is the hole a later round reopens,
 *      because it reads like a fallback rather than like a door.
 *  12. THE STOP IS RECORDED BEFORE THE SENTENCE, AND ONLY ONCE. A 1000 ms
 *      timer against a file an agent is rewriting would otherwise be a toast a
 *      second, so `recordStop` asks `stopped.has` first and toasts last.
 *  13. AUTO SAVE INVENTS NO REFUSAL SENTENCE. Its composer reaches
 *      `saveRefusalSentence` and `staleSaveTitle`, so a person meets one idea
 *      rather than two.
 *  14. THE TIMER IS ARMED AFTER THE TAB IS PATCHED, never before. The
 *      controller asks the skip list about the tab as the store HOLDS it, and
 *      on the clean-to-dirty edge the tab is only dirty after `patchTab`
 *      lands. `npm run probe:p268` measured the wrong order at this phase's
 *      first build: a burst of characters saved, because the second keystroke
 *      takes the other branch and sees a dirty tab, and a SINGLE character
 *      never saved at all. It is one line, in one direction, and it is exactly
 *      the kind of thing a later round moves back.
 *  15. THE SENTENCE THAT WAS RIGHT KEEPS ITS BYTES, UNDER THE WORD THAT IS
 *      TRUE OF IT (Phase 273). "because its project is not open" was written
 *      for a project that was closed and was said to six different causes,
 *      which is issue 25. It moves to `projectClosed` byte for byte, is said
 *      under no other word, and `outside` stops claiming a project is closed.
 *  16. THE WORD COMES FROM THE GUARD THAT THREW. The containment catch in
 *      src/main/fs/guarded-write.ts reads the stamp src/main/fs/paths.ts
 *      writes, and anything unstamped is `projectsUnknown`, which blames
 *      Tortie rather than the person's project. The fallback is a DEFAULT and
 *      not a list, because a list rots the first time a cause grows a sixth
 *      failure.
 *  17. THE REFUSAL LOG LINE IS FOUR FIELDS AND NAMES NO BYTE OF THE FILE. The
 *      `reason` the channel has computed since Phase 226 crossed IPC unread,
 *      which is why issue 25 took six messages. It reaches a local log now
 *      with `why`, `reason`, `root` and `path` and nothing else — never the
 *      contents, and never `expect`, because a sha256 of a short document is a
 *      fingerprint of it.
 *
 * THIS GATE READS TWO MAIN-SIDE FILES SINCE PHASE 273, and that is deliberate:
 * the word a person meets is decided in src/main/fs/guarded-write.ts and
 * logged in src/main/fs/ipc.ts, and a sentence map that is honest above a
 * catch that is not has separated nothing.
 *
 * AND IT READS THE REDLINE'S TYPING MODULE SINCE PHASE 282, for the same
 * reason one file further out. `savedContents` is ⌘S's precondition, and
 * Phase 282 is the first round in which something OTHER than a save moves it:
 * the rewind adopts its own bytes, and the keystroke that was still React
 * state when it did decided whether that adoption was refused. Rules 18 to 24
 * are Phase 277's and 25 to 27c are Phase 282's; each is written at the block
 * that asks it rather than here, and each has an arm in build/p268/ablation.mjs.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  namedFunctions,
  stripComments
} from './scan-source.mjs';

const TAG = '[conformance:save]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const TAB_IO = 'src/renderer/editor/tab-io.ts';
const SAVE_WRITE = 'src/renderer/editor/save-write.ts';
const SENTENCES = 'src/renderer/editor/save-sentences.ts';
const AUTO_SAVE = 'src/renderer/editor/auto-save.ts';
const EDITOR_STORE = 'src/renderer/editor/store.ts';
// PHASE 282. The Redline view's typing hook, which rules 27 to 27c read. It
// is the only other module that decides whether a tab is dirty while a write
// of its own is in the air.
const REDLINE_EDITS = 'src/renderer/editor/redline-edits.ts';
// PHASE 273. The two MAIN-side files rules 16 and 17 read. This gate has only
// ever read the renderer, and it reads them now because the word a person
// meets is decided in one and logged in the other, and a sentence map that is
// honest above a catch that is not has separated nothing.
const GUARDED_WRITE = 'src/main/fs/guarded-write.ts';
const FS_IPC = 'src/main/fs/ipc.ts';

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

/**
 * What the body of `name` says from its first mention of `marker` onward, or
 * null when either is absent.
 *
 * PHASE 240 COMMITTER'S ROUND. Rules 2c and 2d ask what the OVERWRITE a door
 * offers does, and an overwrite is a callback passed to `offerStaleChoice`
 * rather than a function with a name of its own, so `namedFunctions` cannot
 * reach it. The tail of the door's own body is where it lives, and asking the
 * whole body instead would read the door's FIRST write as its overwrite and
 * pass on every shape.
 */
function tailAfter(code, name, marker) {
  const body = namedFunctions(stripComments(code)).get(name);
  if (body === undefined) return null;
  const at = body.indexOf(marker);
  return at === -1 ? null : body.slice(at);
}

/**
 * The body of an object-literal METHOD, braces matched. Null when absent.
 *
 * PHASE 268. `namedFunctions` reads `function f(` and `const f = (`, and a
 * store action is neither: `markDirty(id, dirty) { … }` is a shorthand method
 * on the object the store factory returns. Rule 14 asks about one of those, so
 * it needs a reader that can find one. It takes the FIRST declaration of the
 * name followed by `(`…`) {` on one line, which is what a store action is.
 */
function methodBody(code, name) {
  // A `function f(` or `const f = (` declaration first, so this reader is
  // total over both shapes and a later refactor from one to the other cannot
  // make the rule read nothing and pass.
  const declared = namedFunctions(code).get(name);
  if (declared !== undefined) return declared;
  const at = code.search(new RegExp(`(^|[\\s,;{])${name}\\s*\\([^)\\n]*\\)\\s*\\{`, 'm'));
  if (at === -1) return null;
  const open = code.indexOf('{', code.indexOf('(', at));
  return open === -1 ? null : blockAt(code, open);
}

/**
 * Is `first` mentioned before `second` in the part of `name`'s body that
 * follows `marker`? null when the function, the marker or either mention is
 * absent.
 *
 * PHASE 268. Rule 11b asks about ONE ARM of `saveInProject` rather than about
 * its whole body, and the first draft of it asked the whole body — which
 * `build/p268/ablation.mjs` caught on its third ablation. The parent's symlink
 * hole passed, because another arm of the same function tests the reason
 * EARLIER, so `'auto'` really does appear before `saveOutsideProject` while
 * the unguarded arm falls straight through to the plain door. The question is
 * about the arm, so the reader starts at the arm.
 */
function tailOrder(code, name, marker, first, second) {
  const tail = tailAfter(code, name, marker);
  return orderInTail(tail, marker, first, second);
}

/** The same question over a body the caller already has. */
function orderIn(body, marker, first, second) {
  if (body === null) return null;
  const at = body.indexOf(marker);
  return orderInTail(at === -1 ? null : body.slice(at), marker, first, second);
}

function orderInTail(tail, _marker, first, second) {
  if (tail === null) return null;
  const a = tail.indexOf(first);
  const b = tail.indexOf(second);
  if (a === -1 || b === -1) return null;
  return a < b;
}

/**
 * The STATEMENT that holds `needle` inside the body of `name`: from the first
 * mention of `needle` to the `;` that ends it. Null when either is absent.
 *
 * PHASE 282.1. Rules 11 and 18 said "refuses" and read mention ORDER: the
 * reverify replaced `if (reason === 'auto' && !guarded) return false;` with
 * `if (reason === 'auto' && !guarded) void 0;` and both the gate and all 99
 * tests of the five save suites stayed green, so nothing in the tree pinned
 * the refusal the rules' own sentences claimed. A test that is mentioned
 * before a door is not a test that answers; the statement holding it has to
 * RETURN. This reader hands back that statement so a rule can ask.
 */
function statementHolding(code, name, needle) {
  const body = namedFunctions(stripComments(code)).get(name);
  if (body === undefined) return null;
  const at = body.indexOf(needle);
  if (at === -1) return null;
  const end = body.indexOf(';', at);
  return end === -1 ? body.slice(at) : body.slice(at, end);
}

/**
 * The body of the anonymous effect callback that holds `anchor`, braces
 * matched. Null when the anchor is absent or sits outside every effect.
 *
 * PHASE 282. Rules 27 to 27c ask about ONE effect in ./redline-edits, and an
 * effect has no name at all — it is an argument to `useEffect`, so
 * `namedFunctions` cannot reach it and `methodBody`'s shape is not this one.
 * Asking the whole FILE instead would read the wrong effect: the module
 * declares four, and the two below this one name `markDirty` and
 * `savedContents` as well, so a dirty mark deleted from the typing path would
 * still be found in the model listener. The reader starts at the line the
 * effect opens with and matches braces back from the `useEffect(` above it.
 * `closeOf` is the matcher rather than `blockAt` because it tracks quotes, and
 * this body carries a sentence a person reads.
 */
function effectBodyHolding(code, anchor) {
  const at = code.indexOf(anchor);
  if (at === -1) return null;
  const opened = code.lastIndexOf('useEffect(', at);
  if (opened === -1) return null;
  const arrow = code.indexOf('=>', opened);
  const open = arrow === -1 ? -1 : code.indexOf('{', arrow);
  if (open === -1 || open > at) return null;
  const close = closeOf(code, open);
  return close === -1 ? null : code.slice(open + 1, close);
}

/**
 * The arguments of the first call to `name` inside `body`, as source text, or
 * null when it is not called there.
 *
 * PHASE 282. Rule 27b asks what KIND of thing the second argument is, and the
 * two answers — a string captured before the await, and a function read after
 * it — differ by nothing a substring test can see. `callArguments` splits at
 * the commas at depth zero, so the arrow function's own comma-separated body
 * does not split it.
 */
function argumentsOfCall(body, name) {
  if (body === null) return null;
  const at = body.indexOf(`${name}(`);
  if (at === -1) return null;
  return callArguments(body, body.indexOf('(', at));
}

// PHASE 282. The line that tells this gate WHICH of that module's four effects
// to read; the mark that makes a keystroke visible; and the step that makes the
// rest of the effect asynchronous. The reader takes the whole effect the line
// sits IN, so the line never had to be the effect's first one — which is what
// let Phase 297 move it without moving the rules.
//
// PHASE 297 MOVED THE ANCHOR, and moved nothing else. The typing state now
// carries the tab it was typed on, so the old line,
// `if (!editable || state.edits === written.current) return;`, matched nothing
// and rules 27, 27b and 27c read an empty effect: three rules unasked rather
// than red, on the very file that phase changed. The line below appears exactly
// once in redline-edits.ts and is inside the edit effect, so it names the same
// effect the old one did. Two anchors that look better are refused and here is
// why, so a later round does not try them again: `if (!editable) return;`
// stands in five other effects in that module, and `await ensureWorkingModel(`,
// which is the effect's own identity, makes rule 0 misread two of this gate's
// fixtures, because every fixture is written to OPEN with this line.
const TYPING_ANCHOR = 'if (state.typing.edits === written.current) return;';
const DIRTY_MARK = 'markDirty(tabId, true)';
const ASYNC_STEP = 'void (async';

/**
 * Where the typing effect marks a clean tab dirty, relative to the
 * continuation: 'before', 'inside' or 'absent'. Null when there is no
 * continuation to be on either side of.
 *
 * The three answers are three different defects and they get three different
 * sentences: 'absent' is the shape at this phase's parent, where a keystroke
 * was invisible until the chunk was in, and 'inside' is the same hole written
 * so it looks fixed.
 */
function dirtyMarkPlace(body) {
  if (body === null) return null;
  const step = body.indexOf(ASYNC_STEP);
  if (step === -1) return null;
  const mark = body.indexOf(DIRTY_MARK);
  if (mark === -1) return 'absent';
  return mark < step ? 'before' : 'inside';
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
    name: "the plain door whose Overwrite is the door again is clean",
    catches: false,
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { const d = await diskReading(tab, shown); ' +
      'if (d.kind === "same") return writePlain(id, tab, v); ' +
      'offerStaleChoice(tab, v, () => { void saveOutsideProject(id, tab, v, d.text); }); return false; };',
    check: (c) => {
      const tail = tailAfter(c, 'saveOutsideProject', 'offerStaleChoice');
      return tail !== null && tail.includes('saveOutsideProject') && !tail.includes('writePlain');
    }
  },
  {
    name: 'the plain door whose Overwrite writes unconditionally is caught',
    catches: true,
    // The shape that really shipped, and that destroyed 38 characters of a
    // third writer in the running app while the guarded door re-asked.
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { const d = await diskReading(tab, shown); ' +
      'if (d.kind === "same") return writePlain(id, tab, v); ' +
      'offerStaleChoice(tab, v, () => { void writePlain(id, tab, v); }); return false; };',
    check: (c) => {
      const tail = tailAfter(c, 'saveOutsideProject', 'offerStaleChoice');
      return tail !== null && tail.includes('writePlain');
    }
  },
  {
    name: 'a door that offers no choice at all reads as absent rather than as clean',
    catches: true,
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { return writePlain(id, tab, v); };',
    check: (c) => tailAfter(c, 'saveOutsideProject', 'offerStaleChoice') === null
  },
  {
    name: 'the plain door that asks the encoding question before it writes is clean',
    catches: false,
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { const d = await diskReading(tab, shown); ' +
      'if (decodeLost(shown)) return false; return writePlain(id, tab, v); };',
    check: (c) => bodyOrder(c, 'saveOutsideProject', 'decodeLost', 'writePlain') === true
  },
  {
    name: 'the plain door that asks it after the write is caught',
    catches: true,
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { const ok = await writePlain(id, tab, v); ' +
      'if (decodeLost(shown)) return false; return ok; };',
    check: (c) => bodyOrder(c, 'saveOutsideProject', 'decodeLost', 'writePlain') === false
  },
  {
    name: 'a door that never asks it at all reads as absent',
    catches: true,
    code:
      'const saveOutsideProject = async (id, tab, v, shown) => { return writePlain(id, tab, v); };',
    check: (c) => bodyOrder(c, 'saveOutsideProject', 'decodeLost', 'writePlain') === null
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
  },
  // -- Phase 268, rules 10 to 13 ------------------------------------------
  {
    name: 'an auto save module that writes through the bridge is caught',
    catches: true,
    code: 'export function createAutoSave(deps) { const run = async (id) => { await gmuxBridge().fs.writeFile(p, v); }; return { run }; }',
    check: (c) => AUTO_SAVE_FORBIDDEN.some((n) => c.includes(n))
  },
  {
    name: 'an auto save module that only calls deps.save is clean',
    catches: false,
    code: 'export function createAutoSave(deps) { const run = async (id) => { await deps.save(id); }; return { run }; }',
    check: (c) => !AUTO_SAVE_FORBIDDEN.some((n) => c.includes(n))
  },
  {
    name: 'an auto save module polling on an interval is caught',
    catches: true,
    code: 'export function createAutoSave(deps) { setInterval(() => deps.save(id), 1000); }',
    check: (c) => AUTO_SAVE_FORBIDDEN.some((n) => c.includes(n))
  },
  {
    name: 'a save whose auto guard precedes the plain door is clean',
    catches: false,
    code:
      "const save = async (id, reason = 'explicit') => { const guarded = inRepo(); " +
      "if (reason === 'auto' && !guarded) return false; " +
      'return guarded ? saveInProject(id, reason) : saveOutsideProject(id); };',
    check: (c) => bodyOrder(c, 'save', "reason === 'auto'", 'saveOutsideProject') === true
  },
  {
    name: 'a save with the ternary and NO auto guard is caught',
    catches: true,
    code:
      "const save = async (id, reason = 'explicit') => { const guarded = inRepo(); " +
      'return guarded ? saveInProject(id, reason) : saveOutsideProject(id); };',
    check: (c) => bodyOrder(c, 'save', "reason === 'auto'", 'saveOutsideProject') === null
  },
  {
    name: 'a save whose auto guard sits AFTER the plain door is caught',
    catches: true,
    code:
      "const save = async (id, reason = 'explicit') => { " +
      'if (!inRepo()) return saveOutsideProject(id); ' +
      "if (reason === 'auto') return false; return saveInProject(id, reason); };",
    check: (c) => bodyOrder(c, 'save', "reason === 'auto'", 'saveOutsideProject') === false
  },
  {
    name: "saveInProject's unguarded arm that tests the reason first is clean",
    catches: false,
    code:
      "const saveInProject = async (id, tab, v, reason) => { const r = await guardedSave({}); " +
      "if (r.outcome === 'unguarded') { if (reason === 'auto') return deps.autoStop(id, { kind: 'link' }); " +
      'return saveOutsideProject(id, tab, v); } return false; };',
    check: (c) =>
      tailOrder(c, 'saveInProject', "'unguarded'", "'auto'", 'saveOutsideProject') === true
  },
  {
    name: "THE SYMLINK HOLE: saveInProject's unguarded arm falling straight through is caught",
    catches: true,
    // The shape at this phase's parent, and the one a later round reopens.
    code:
      "const saveInProject = async (id, tab, v, reason) => { const r = await guardedSave({}); " +
      "if (r.outcome === 'unguarded') return saveOutsideProject(id, tab, v); return false; };",
    check: (c) =>
      tailOrder(c, 'saveInProject', "'unguarded'", "'auto'", 'saveOutsideProject') === null
  },
  {
    name:
      'THE HOLE THE ABLATION FOUND: an EARLIER arm testing the reason does not clear the unguarded one',
    catches: true,
    // This shape passed the first draft of rule 11b, which asked the whole
    // body. `'auto'` really is before `saveOutsideProject` here, and the
    // unguarded arm is still the parent's fall-through.
    code:
      "const saveInProject = async (id, tab, v, reason) => { const e = await sha256Hex(tab.savedContents); " +
      "if (e === null) { if (reason === 'auto') return false; return saveOutsideProject(id, tab, v); } " +
      "const r = await guardedSave({}); " +
      "if (r.outcome === 'unguarded') return saveOutsideProject(id, tab, v); " +
      "if (r.outcome === 'stale') { if (reason === 'auto') return deps.autoStop(id, { kind: 'stale' }); " +
      'offerStaleChoice(tab, v, () => undefined); return false; } return false; };',
    check: (c) =>
      bodyOrder(c, 'saveInProject', "'auto'", 'saveOutsideProject') === true &&
      tailOrder(c, 'saveInProject', "'unguarded'", "'auto'", 'saveOutsideProject') === false
  },
  {
    name: 'a recordStop that checks membership before it toasts is clean',
    catches: false,
    code:
      'const recordStop = (id, why) => { if (stopped.has(id)) return; stopped.set(id, why); ' +
      'cancelTimer(id); deps.toast(autoSaveStopSentence(why, name)); };',
    check: (c) =>
      bodyOrder(c, 'recordStop', 'stopped.has', 'toast') === true &&
      bodyMentions(c, 'recordStop', 'stopped.set') === true
  },
  {
    name: 'a recordStop that toasts FIRST is caught',
    catches: true,
    code:
      'const recordStop = (id, why) => { deps.toast(autoSaveStopSentence(why, name)); ' +
      'if (stopped.has(id)) return; stopped.set(id, why); };',
    check: (c) => bodyOrder(c, 'recordStop', 'stopped.has', 'toast') === false
  },
  {
    name: 'a recordStop with no membership check at all is caught',
    catches: true,
    code: 'const recordStop = (id, why) => { stopped.set(id, why); deps.toast(say(why)); };',
    check: (c) => bodyOrder(c, 'recordStop', 'stopped.has', 'toast') === null
  },
  {
    name: 'a markDirty that patches before it arms is clean',
    catches: false,
    code:
      'const markDirty = (id, dirty) => { const tab = byId(id); if (tab === undefined) return; ' +
      'if (tab.dirty === dirty) { autoSave.noteChanged(id); return; } ' +
      'patchTab(id, { dirty }); autoSave.noteChanged(id); };',
    check: (c) =>
      orderIn(methodBody(c, 'markDirty'), 'patchTab(', 'patchTab(', 'noteChanged') === true
  },
  {
    name: 'THE ORDER THE PROBE CAUGHT: arming before the patch is caught',
    catches: true,
    code:
      'const markDirty = (id, dirty) => { const tab = byId(id); if (tab === undefined) return; ' +
      'autoSave.noteChanged(id); if (tab.dirty === dirty) return; patchTab(id, { dirty }); };',
    check: (c) =>
      orderIn(methodBody(c, 'markDirty'), 'patchTab(', 'patchTab(', 'noteChanged') === null
  },
  {
    name: 'a markDirty that never arms at all is caught',
    catches: true,
    code:
      'const markDirty = (id, dirty) => { const tab = byId(id); if (tab.dirty === dirty) return; ' +
      'patchTab(id, { dirty }); };',
    check: (c) =>
      orderIn(methodBody(c, 'markDirty'), 'patchTab(', 'patchTab(', 'noteChanged') === null
  },
  {
    name: 'a markDirty written as a STORE METHOD is found, not only as a const',
    catches: false,
    code:
      'export const useEditor = create((set, get) => ({\n' +
      '  markDirty(id, dirty) {\n' +
      '    if (byId(id).dirty === dirty) { autoSave.noteChanged(id); return; }\n' +
      '    patchTab(id, { dirty });\n' +
      '    autoSave.noteChanged(id);\n' +
      '  }\n' +
      '}));',
    check: (c) =>
      orderIn(methodBody(c, 'markDirty'), 'patchTab(', 'patchTab(', 'noteChanged') === true
  },
  {
    name: 'a stop composer that reuses the shipped sentences is clean',
    catches: false,
    code:
      "export function autoSaveStopSentence(why, name) { if (why.kind === 'stale') " +
      'return `${staleSaveTitle(name)}, so nothing was written. ${STOPPED}`; ' +
      'return `${saveRefusalSentence(why.why, name)} ${STOPPED}`; }',
    check: (c) => {
      const body = functionBodyOf(c, 'autoSaveStopSentence') ?? '';
      return body.includes('saveRefusalSentence') && body.includes('staleSaveTitle');
    }
  },
  {
    name: 'a stop composer with a refusal string of its own is caught',
    catches: true,
    code:
      'export function autoSaveStopSentence(why, name) { ' +
      "return `Tortie did not save ${name}. Auto save is off for it now.`; }",
    check: (c) => {
      const body = functionBodyOf(c, 'autoSaveStopSentence') ?? '';
      return !(body.includes('saveRefusalSentence') && body.includes('staleSaveTitle'));
    }
  },
  // -- Phase 282, rules 25 to 27c -----------------------------------------
  {
    name: 'an adoption that refuses a dirty tab before it patches is clean',
    catches: false,
    code:
      'const adoptWritten = (id, contents, was) => { const tab = deps.byId(id); ' +
      'if (tab === undefined) return; if (tab.dirty || tab.savedContents !== was) return; ' +
      'deps.patch(id, { savedContents: contents }); resetWorkingModel(id, contents); };',
    check: (c) =>
      bodyOrder(c, 'adoptWritten', 'tab.dirty', 'deps.patch(') === true &&
      bodyOrder(c, 'adoptWritten', '!== was', 'resetWorkingModel(') === true &&
      tailOrder(c, 'adoptWritten', 'tab.dirty', 'return', 'deps.patch(') === true
  },
  {
    name: 'an adoption that patches BEFORE it refuses is caught',
    catches: true,
    code:
      'const adoptWritten = (id, contents, was) => { const tab = deps.byId(id); ' +
      'deps.patch(id, { savedContents: contents }); ' +
      'if (tab.dirty || tab.savedContents !== was) return; resetWorkingModel(id, contents); };',
    check: (c) => bodyOrder(c, 'adoptWritten', 'tab.dirty', 'deps.patch(') === false
  },
  {
    name: 'an adoption with no `was` comparison at all reads as absent rather than as clean',
    catches: true,
    code:
      'const adoptWritten = (id, contents, was) => { const tab = deps.byId(id); ' +
      'if (tab.dirty) return; deps.patch(id, { savedContents: contents }); ' +
      'resetWorkingModel(id, contents); };',
    check: (c) => bodyOrder(c, 'adoptWritten', '!== was', 'deps.patch(') === null
  },
  {
    name: 'an adoption that TESTS the refusal without returning on it is caught',
    catches: true,
    // The shape that reads like a guard and is not one: the dirty tab is
    // mentioned before the patch, and the patch happens anyway.
    code:
      'const adoptWritten = (id, contents, was) => { const tab = deps.byId(id); ' +
      'const skip = tab.dirty || tab.savedContents !== was; ' +
      'deps.patch(id, { savedContents: contents, skip }); resetWorkingModel(id, contents); };',
    check: (c) =>
      bodyOrder(c, 'adoptWritten', 'tab.dirty', 'deps.patch(') === true &&
      tailOrder(c, 'adoptWritten', 'tab.dirty', 'return', 'deps.patch(') !== true
  },
  {
    name: 'a refresh that records the baseline before its read and compares it is clean',
    catches: false,
    code:
      'const refreshRepo = async (repoPath) => { const before = deps.byId(tab.id); ' +
      'const savedBefore = before.savedContents; const result = await gmux.fs.readFile(tab.path); ' +
      'const live = deps.byId(tab.id); if (live.savedContents === savedBefore) ' +
      '{ deps.patch(tab.id, { savedContents: result.contents }); resetWorkingModel(tab.id, result.contents); } };',
    check: (c) =>
      bodyOrder(c, 'refreshRepo', 'savedBefore =', 'fs.readFile(') === true &&
      tailOrder(
        c,
        'refreshRepo',
        'fs.readFile(',
        'live.savedContents === savedBefore',
        'resetWorkingModel('
      ) === true
  },
  {
    name: 'a refresh that records the baseline AFTER its read is caught',
    catches: true,
    // It compares the value with itself, so the clause is there and answers
    // yes to every interleaving it was written to refuse.
    code:
      'const refreshRepo = async (repoPath) => { const result = await gmux.fs.readFile(tab.path); ' +
      'const live = deps.byId(tab.id); const savedBefore = live.savedContents; ' +
      'if (live.savedContents === savedBefore) ' +
      '{ deps.patch(tab.id, { savedContents: result.contents }); resetWorkingModel(tab.id, result.contents); } };',
    check: (c) => bodyOrder(c, 'refreshRepo', 'savedBefore =', 'fs.readFile(') === false
  },
  {
    name: 'a refresh that replaces the buffer without comparing the baseline is caught',
    catches: true,
    code:
      'const refreshRepo = async (repoPath) => { const before = deps.byId(tab.id); ' +
      'const savedBefore = before.savedContents; const result = await gmux.fs.readFile(tab.path); ' +
      'const live = deps.byId(tab.id); if (!live.dirty) ' +
      '{ deps.patch(tab.id, { savedContents: result.contents }); resetWorkingModel(tab.id, result.contents); } };',
    check: (c) =>
      tailOrder(
        c,
        'refreshRepo',
        'fs.readFile(',
        'live.savedContents === savedBefore',
        'resetWorkingModel('
      ) === null
  },
  {
    name: 'the typing effect that marks dirty before its continuation is clean',
    catches: false,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  if (live !== undefined && !live.dirty) useEditor.getState().markDirty(tabId, true);\n' +
      '  void (async () => { const model = await ensureWorkingModel(tabId, () => now().savedContents, path); })();\n' +
      '}, [state.edits]);',
    check: (c) => dirtyMarkPlace(effectBodyHolding(stripComments(c), TYPING_ANCHOR)) === 'before'
  },
  {
    name: 'the typing effect that marks dirty INSIDE its continuation is caught',
    catches: true,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => { const model = await ensureWorkingModel(tabId, () => now().savedContents, path);\n' +
      '    if (live !== undefined && !live.dirty) useEditor.getState().markDirty(tabId, true); })();\n' +
      '}, [state.edits]);',
    check: (c) => dirtyMarkPlace(effectBodyHolding(stripComments(c), TYPING_ANCHOR)) === 'inside'
  },
  {
    name: "THE PARENT'S SHAPE: the typing effect that never marks dirty at all is caught",
    catches: true,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => { const model = await ensureWorkingModel(tabId, live?.savedContents, path);\n' +
      '    markDirty(tabId, want !== now.savedContents); })();\n' +
      '}, [state.edits]);',
    check: (c) => dirtyMarkPlace(effectBodyHolding(stripComments(c), TYPING_ANCHOR)) === 'absent'
  },
  {
    name: 'a mark in a NEIGHBOURING effect is not read as the typing effect`s',
    catches: true,
    // The module declares four effects and the ones below this name
    // `markDirty` too, so a whole-file question would answer yes to a typing
    // path that lost its own mark.
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => { const model = await ensureWorkingModel(tabId, live?.savedContents, path); })();\n' +
      '}, [state.edits]);\n' +
      'useEffect(() => {\n' +
      '  useEditor.getState().markDirty(tabId, true);\n' +
      '}, [liveText]);',
    check: (c) => dirtyMarkPlace(effectBodyHolding(stripComments(c), TYPING_ANCHOR)) === 'absent'
  },
  {
    name: 'a model built from a function is read as a function',
    catches: false,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => { const model = await ensureWorkingModel(\n' +
      '    tabId,\n' +
      '    () => useEditor.getState().tabs.find((t) => t.id === tabId)?.savedContents ?? typedOn,\n' +
      '    path); })();\n' +
      '}, [state.edits]);',
    check: (c) => {
      const args = argumentsOfCall(effectBodyHolding(stripComments(c), TYPING_ANCHOR), 'ensureWorkingModel');
      return args !== null && args.length === 3 && /^\(\s*\)\s*=>/.test(args[1].trim());
    }
  },
  {
    name: 'a model built from a string captured before the await is caught',
    catches: true,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => { const model = await ensureWorkingModel(tabId, live?.savedContents ?? typedOn, path); })();\n' +
      '}, [state.edits]);',
    check: (c) => {
      const args = argumentsOfCall(effectBodyHolding(stripComments(c), TYPING_ANCHOR), 'ensureWorkingModel');
      return args !== null && args.length === 3 && !/^\(\s*\)\s*=>/.test(args[1].trim());
    }
  },
  {
    name: 'a continuation that returns on a moved baseline before it applies is clean',
    catches: false,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => {\n' +
      '    if (!had && now.savedContents !== typedOn) { markDirty(tabId, model.getValue() !== now.savedContents); return; }\n' +
      '    applyModelText(model, want, !continues); })();\n' +
      '}, [state.edits]);',
    check: (c) =>
      orderIn(
        effectBodyHolding(stripComments(c), TYPING_ANCHOR),
        'now.savedContents !== typedOn',
        'return',
        'applyModelText('
      ) === true
  },
  {
    name: 'a continuation that applies a text typed on a replaced picture is caught',
    catches: true,
    code:
      'useEffect(() => {\n' +
      `  ${TYPING_ANCHOR}\n` +
      '  void (async () => {\n' +
      '    applyModelText(model, want, !continues);\n' +
      '    markDirty(tabId, want !== now.savedContents); })();\n' +
      '}, [state.edits]);',
    check: (c) =>
      orderIn(
        effectBodyHolding(stripComments(c), TYPING_ANCHOR),
        'now.savedContents !== typedOn',
        'return',
        'applyModelText('
      ) === null
  }
];

/**
 * What `src/renderer/editor/auto-save.ts` may not name (rule 10).
 *
 * `deps.save` is its one route to disk, and everything here is a way round it:
 * the two channels, the plain door and the function that reaches it, and
 * `setInterval`, which is a timer nothing cancels on a close or an eviction.
 */
const AUTO_SAVE_FORBIDDEN = [
  'writeFile',
  'writeGuarded',
  'writePlain',
  'saveOutsideProject',
  'fs:writeFile',
  'setInterval'
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
  const WRITES = ['writeFile', 'writeGuarded', 'fs:writeFile', 'fs:writeGuarded'];
  const DOORS = ['saveOnMachine', 'saveInProject', 'saveOutsideProject'];
  const save = bodyOf(TAB_IO, 'save', '1');
  const once = bodyOf(TAB_IO, 'saveOnce', '1');
  if (save !== null && once !== null) {
    const namedInSave = WRITES.filter((n) => save.includes(n));
    const namedInOnce = WRITES.filter((n) => once.includes(n));
    if (namedInSave.length > 0 || namedInOnce.length > 0) {
      fail(
        `1. ${TAB_IO} names ${[...namedInSave, ...namedInOnce].join(', ')} inside save or saveOnce; the write belongs to one of the three doors below them`
      );
    } else {
      const doors = DOORS.filter((d) => once.includes(d));
      if (doors.length !== 3) {
        fail(`1. saveOnce reaches ${String(doors.length)} of its 3 doors (${doors.join(', ') || 'none'})`);
      } else {
        say('1. neither save nor saveOnce names a write of its own, and saveOnce reaches all three doors, read by matching braces');
      }
    }
    // Rule 1c. save's WHOLE body is the one delegation, compared with every
    // space removed. A substring test was not enough: the Phase 277 fix round
    // planted three shapes that each passed it — a `'withSaveSlot'` string
    // literal beside a bare `return saveOnce(id, reason)`, an 'auto' handed to a
    // helper that names the plain door, and an early `if (reason === 'auto')
    // return saveOnce(...)` in front of the slot. None of them is the body below.
    const WANT_SAVE = 'returnwithSaveSlot(id,reason,()=>saveOnce(id,reason));';
    if (save.replace(/\s+/g, '') !== WANT_SAVE) {
      fail(
        '1c. save is not exactly `return withSaveSlot(id, reason, () => saveOnce(id, reason));`, so a save can reach a door outside the slot or around saveOnce'
      );
    } else {
      say('1c. save is exactly one delegation to saveOnce inside withSaveSlot, and nothing else');
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

// Rule 2c. The plain door's OVERWRITE is the door again, not a bare write.
//
// PHASE 240 COMMITTER'S ROUND, and it is this phase's own subject line unmet.
// The fix round gave the plain door a reading and left its Overwrite
// unconditional, so a third writer arriving while the question was on screen
// was written over: 38 characters destroyed in the running app, 500 of 500 at
// node level, against the guarded door re-asking in the same run. The reason
// written down was that re-reading "would find the same difference for ever",
// and the guarded door refutes it — it re-reads against what was SHOWN rather
// than against `savedContents`, and it terminates.
{
  const code = readFileSync(join(repoRoot, TAB_IO), 'utf8');
  const tail = tailAfter(code, PLAIN_DOOR, 'offerStaleChoice');
  if (tail === null) {
    fail(
      `2c. ${PLAIN_DOOR} never reaches offerStaleChoice, so the plain door offers no choice and this rule read nothing`
    );
  } else if (tail.includes(PLAIN_WRITE)) {
    fail(
      `2c. the Overwrite ${PLAIN_DOOR} offers names ${PLAIN_WRITE} directly, so it writes without reading again; that is the shape that destroyed 38 characters of a third writer while the question was on screen`
    );
  } else if (!tail.includes(PLAIN_DOOR)) {
    fail(
      `2c. the Overwrite ${PLAIN_DOOR} offers does not call ${PLAIN_DOOR} again, so nothing re-reads the file at the press`
    );
  } else {
    say(
      `2c. the Overwrite ${PLAIN_DOOR} offers is ${PLAIN_DOOR} called again with the text it showed, so a third writer between the question and the click is asked about rather than written over`
    );
  }
}

// Rule 2d. The plain door asks the encoding question before it writes.
//
// `fs:readFile` decodes with `Buffer.toString('utf8')`, so a file that is not
// UTF-8 comes back carrying U+FFFD and writing the buffer whole puts EF BF BD
// where the file had something else. Measured on this door at 5077ed65: a 49 B
// latin-1 `.txt` behind a symbolic link went to 58 B with four U+FFFD in it,
// no dialog and no toast. The guarded channel refuses that by comparing raw
// bytes; the plain door has no bytes, and this is the question it can ask.
const DECODE_TEST = 'decodeLost';
{
  const code = readFileSync(join(repoRoot, TAB_IO), 'utf8');
  const order = bodyOrder(code, PLAIN_DOOR, DECODE_TEST, PLAIN_WRITE);
  const test = bodyMentions(code, DECODE_TEST, '\\uFFFD');
  if (order === null) {
    fail(
      `2d. ${PLAIN_DOOR} never names both ${DECODE_TEST} and ${PLAIN_WRITE}, so a lossy decode is written back whole`
    );
  } else if (order === false) {
    fail(`2d. ${PLAIN_DOOR} writes before it asks ${DECODE_TEST}`);
  } else if (test !== true) {
    fail(
      `2d. ${DECODE_TEST} does not name U+FFFD, and that is the only mark a decoded string carries of the bytes it lost`
    );
  } else {
    say(
      `2d. ${PLAIN_DOOR} asks ${DECODE_TEST} before it writes, and ${DECODE_TEST} reads U+FFFD, which is the same word the guarded channel answers for the same file`
    );
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
// Rule 10. The auto save module names no write and no plain door (Phase 268).
//
// Issue 24 asks for a timer. Issue 16 is what a write that does not ask costs,
// and research 100 section 1 measured it at 173 bytes of an agent's paragraph
// with nothing said. So auto save reaches disk through `deps.save` — which the
// store hands in as `io.save(id, 'auto')`, the same function ⌘S calls — and
// through nothing else. There is no unguarded fallback to add later.
// ---------------------------------------------------------------------------

{
  const code = source(AUTO_SAVE);
  const named = AUTO_SAVE_FORBIDDEN.filter((n) => code.includes(n));
  if (named.length > 0) {
    fail(
      `10. ${AUTO_SAVE} names ${named.join(', ')}; its one route to disk is deps.save, which the store hands in as io.save(id, 'auto')`
    );
  } else if (!code.includes('deps.save(')) {
    fail(`10. ${AUTO_SAVE} never calls deps.save, so this rule read nothing`);
  } else {
    say(
      `10. the auto save module names none of ${String(AUTO_SAVE_FORBIDDEN.length)} ways round the guarded door, and reaches disk through deps.save alone`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 11. `save` refuses the plain door for the auto reason, and refuses it
// BEFORE the door is named.
// ---------------------------------------------------------------------------

{
  const code = source(TAB_IO);
  const ordered = bodyOrder(code, 'saveOnce', "reason === 'auto'", 'saveOutsideProject');
  // PHASE 282.1. The statement that tests the reason must RETURN, or the
  // "refusal" is a mention: `void 0` in its place walked past this rule and
  // every save suite (the product was saved by ./auto-save's own skip list,
  // which is a different guard). p277-save-completion.test.ts drives the
  // same question at runtime, "a timer's request never reaches the plain door".
  const refusal = statementHolding(code, 'saveOnce', "reason === 'auto'");
  if (ordered === null) {
    fail(
      "11. saveOnce in " + TAB_IO + " does not test `reason === 'auto'` before it names saveOutsideProject, so a timer can reach the unguarded door"
    );
  } else if (ordered === false) {
    fail('11. saveOnce tests the auto reason AFTER it names the plain door, which is too late');
  } else if (refusal === null || !/\breturn\b/.test(refusal)) {
    fail("11. saveOnce tests `reason === 'auto'` but the statement holding the test does not return, so a timer is mentioned before the plain door rather than refused it");
  } else if (refusal.includes('saveOutsideProject')) {
    // PHASE 282.2. A return is not a refusal when what it returns IS the door.
    // The 282.1 reverifier planted `if (reason === 'auto' && !guarded) return
    // saveOutsideProject(…)` and this gate stayed green on it: the test is
    // mentioned before the door, the statement returns, and a timer walks
    // straight through. Only the vitest "a timer's request never reaches the
    // plain door" went red. So the statement that tests the reason may not
    // name the door at all. build/p268/ablation.mjs arm 32 plants that shape.
    fail('11. the statement that tests the auto reason returns through the plain door');
  } else {
    say("11. saveOnce refuses the plain, unguarded door for reason 'auto' — the test returns, and not through the door — before the door is named");
  }
}

// ---------------------------------------------------------------------------
// Rule 11b. `saveInProject`'s `unguarded` arm refuses it too — the symlink.
//
// The parent's shape was `if (result.outcome === 'unguarded') return
// saveOutsideProject(…)`, with no reason test, and it reads like a fallback
// rather than like a door. The plain door's own stale answer opens a DIALOG,
// which a timer may not do, and its read-then-write window is one IPC round
// trip wide. This is the arm a later round reopens for convenience.
// ---------------------------------------------------------------------------

{
  const code = source(TAB_IO);
  // Read from the ARM rather than from the whole body. An earlier arm of the
  // same function tests the reason too, so a body-wide question answers yes
  // while this arm falls straight through — build/p268/ablation.mjs found
  // exactly that on its third ablation.
  const ordered = tailOrder(
    code,
    'saveInProject',
    "'unguarded'",
    "'auto'",
    'saveOutsideProject'
  );
  if (ordered === null) {
    fail(
      "11b. saveInProject's unguarded arm falls through to saveOutsideProject with no test of the reason — this is the symlink hole"
    );
  } else if (ordered === false) {
    fail('11b. saveInProject names the plain door before it tests the reason in that arm');
  } else {
    say("11b. saveInProject's unguarded arm tests the reason before it names the plain door");
  }
}

// ---------------------------------------------------------------------------
// Rule 12. The stop is recorded before the sentence, and only once.
// ---------------------------------------------------------------------------

{
  const code = source(AUTO_SAVE);
  const ordered = bodyOrder(code, 'recordStop', 'stopped.has', 'toast');
  const sets = bodyMentions(code, 'recordStop', 'stopped.set');
  if (ordered === null || sets !== true) {
    fail(
      '12. recordStop in ' +
        AUTO_SAVE +
        ' does not ask `stopped.has` before it toasts and set `stopped.set`, so the sentence is not shown once'
    );
  } else if (ordered === false) {
    fail('12. recordStop toasts BEFORE it checks whether this tab is already stopped');
  } else {
    say('12. recordStop refuses a second stop before it says anything, so the sentence is said once per tab');
  }
}

// ---------------------------------------------------------------------------
// Rule 13. Auto save invents no refusal sentence.
// ---------------------------------------------------------------------------

{
  const body = functionBodyOf(source(SENTENCES), 'autoSaveStopSentence');
  if (body === null) {
    fail(`13. ${SENTENCES} declares no autoSaveStopSentence, so this rule read nothing`);
  } else {
    const missing = ['saveRefusalSentence', 'staleSaveTitle'].filter(
      (n) => !body.includes(n)
    );
    if (missing.length > 0) {
      fail(
        `13. autoSaveStopSentence does not reach ${missing.join(' or ')}, so it is inventing a refusal of its own`
      );
    } else if (/Tortie did not save \$\{/.test(body)) {
      fail('13. autoSaveStopSentence writes a refusal sentence of its own');
    } else {
      say('13. the auto save stop composes from the sentences a ⌘S already says, and writes none of its own');
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 14. The timer is armed AFTER the tab is patched.
//
// Read from the FIRST `patchTab(` in `markDirty` forward, because the branch
// above it arms for a tab that is already dirty and arming there is right.
// What this asks is about the EDGE: on the clean-to-dirty transition the arm
// has to come after the patch, or the controller asks the skip list about a
// tab the store still calls clean and arms nothing.
// ---------------------------------------------------------------------------

{
  const code = source(EDITOR_STORE);
  const ordered = orderIn(
    methodBody(code, 'markDirty'),
    'patchTab(',
    'patchTab(',
    'noteChanged'
  );
  if (ordered === null) {
    fail(
      '14. markDirty in ' +
        EDITOR_STORE +
        ' does not arm the auto save after it patches the tab — a single keystroke would arm nothing at all'
    );
  } else if (ordered === false) {
    fail('14. markDirty arms the auto save before it patches the tab, so the skip list is asked about a tab that is still clean');
  } else {
    say('14. markDirty patches the tab before it arms the timer, so the skip list is asked about the tab the store holds');
  }
}

// ---------------------------------------------------------------------------
// Rule 15. The sentence that was right keeps its bytes, under the word that is
// true of it.
//
// PHASE 273. `outside` carried six causes and its sentence asserted one of
// them: "because its project is not open". For a project that IS open and a
// path the gate refused, which is issue 25, that sentence was false twice — the
// project was open and the refusal was about the path. The repair is not new
// prose. The sentence was written for a closed project and is right for one, so
// it MOVES to `projectClosed` byte for byte, and `outside` gets a sentence that
// names no cause it did not measure. This rule holds both halves: the bytes did
// not drift in the move, and the old string is not left sitting under any other
// key.
// ---------------------------------------------------------------------------

const PROJECT_CLOSED_SENTENCE =
  'Tortie did not save {name}, because its project is not open — open it again and save. Nothing was written.';

{
  const sentences = source(SENTENCES);
  const map = /const SENTENCES: Record<SaveRefusalWord, string> = \{([\s\S]*?)\n\};/.exec(sentences);
  if (map === null) {
    fail('15. could not read the sentence map');
  } else {
    // Each `word: 'sentence'` pair, however the formatter broke the line.
    const pairs = new Map(
      [...map[1].matchAll(/^\s{2}([A-Za-z0-9]+):\s*\n?\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [
        m[1],
        m[2]
      ])
    );
    const got = pairs.get('projectClosed');
    if (got === undefined) {
      fail('15. the sentence map has no projectClosed entry, so the cause the old sentence described has no word');
    } else if (got !== PROJECT_CLOSED_SENTENCE) {
      fail(
        '15. projectClosed does not say what shipped as outside, byte for byte — the phase rewrote the one sentence it already got right'
      );
    } else {
      const elsewhere = [...pairs.entries()]
        .filter(([word, text]) => word !== 'projectClosed' && text === PROJECT_CLOSED_SENTENCE)
        .map(([word]) => word);
      if (elsewhere.length > 0) {
        fail(
          `15. the closed-project sentence is also said under ${elsewhere.join(', ')}, so a cause that is not a closed project still claims to be one`
        );
      } else if (pairs.get('outside') === undefined || /project is not open/.test(pairs.get('outside'))) {
        fail('15. outside still tells a person their project is not open, which is the claim this phase stopped making');
      } else {
        say(
          '15. the closed-project sentence moved to projectClosed byte for byte, is said under no other word, and outside no longer claims a project is closed'
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 16. The word comes from the guard that threw, and the fallback is the
// one that blames Tortie rather than the person.
//
// PHASE 273. The catch reads the stamp `src/main/fs/paths.ts` writes, through
// `fsPathRefusalOf`, and anything UNSTAMPED is `projectsUnknown` — the only
// thing in that try which is not a path guard is `deps.listProjectRoots()`, and
// a failure to read Tortie's own project list is not a fact about the person's
// file. The fallback is a DEFAULT and not an enumerated list on purpose, and
// this rule asks for that too: a literal list of causes in the catch is a list
// that rots the first time one of them grows a sixth failure.
// ---------------------------------------------------------------------------

{
  const code = source(GUARDED_WRITE);
  const body = functionBodyOf(code, 'writeGuarded');
  if (body === null) {
    fail(`16. ${GUARDED_WRITE} declares no writeGuarded, so this rule read nothing`);
  } else {
    const at = body.indexOf('resolveInsideRoot');
    const catchAt = at === -1 ? -1 : body.indexOf('catch (err) {', at);
    const open = catchAt === -1 ? -1 : body.indexOf('{', catchAt);
    const arm = open === -1 ? null : blockAt(body, open);
    if (arm === null) {
      fail('16. could not find the containment catch in writeGuarded');
    } else if (!/fsPathRefusalOf\(/.test(arm)) {
      fail(
        "16. the containment catch does not ask fsPathRefusalOf, so it is answering one word for every cause again — that is issue 25"
      );
    } else if (!/'projectsUnknown'/.test(arm)) {
      fail("16. the containment catch's fallback word is not projectsUnknown");
    } else if (/\?\?\s*'outside'/.test(arm) || /\?\?\s*'projectClosed'/.test(arm)) {
      fail(
        '16. the containment catch falls back to a word about the PERSON\'s project for a throw it cannot attribute'
      );
    } else if (/'projectClosed'|'protected'|'unreadable'/.test(arm)) {
      fail(
        '16. the containment catch enumerates the causes instead of reading the stamp, so a cause added later would be answered by the fallback'
      );
    } else {
      say(
        '16. the containment catch reads the guard\'s stamp and defaults to projectsUnknown, with no literal list of causes in it'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 17. The log line is four fields and names no byte of the file.
//
// PHASE 273. The `reason` the channel computes has crossed IPC unread since
// Phase 226, which is why issue 25 took six messages. It reaches a local log
// now, and the thing that makes that safe is what it does NOT carry: not the
// contents, and not `expect`, because a sha256 of a short document is a
// fingerprint of it and a digest tells a reader nothing they can act on.
// ---------------------------------------------------------------------------

{
  const code = source(FS_IPC);
  const at = code.indexOf("'fs:writeGuarded'");
  const arrow = at === -1 ? -1 : code.indexOf('=>', at);
  const open = arrow === -1 ? -1 : code.indexOf('{', arrow);
  const handler = open === -1 ? null : blockAt(code, open);
  if (handler === null) {
    fail(`17. ${FS_IPC} registers no fs:writeGuarded handler this rule can read`);
  } else if (!/logEvent\(/.test(handler)) {
    fail('17. the fs:writeGuarded handler logs nothing, so a refusal is still unanswerable from the machine it happened on');
  } else {
    // The fields are the last argument, so the first `{` after the call's own
    // opening paren is the object this rule reads. The four arguments before
    // it are string literals, which stripComments leaves alone and which
    // therefore cannot carry a brace into this search.
    const callAt = handler.indexOf('logEvent(');
    const fieldsOpen = handler.indexOf('{', callAt + 'logEvent('.length);
    const fields = fieldsOpen === -1 ? null : blockAt(handler, fieldsOpen);
    if (fields === null) {
      fail('17. could not read the log line\'s fields');
    } else {
      const names = [...fields.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1]).sort();
      const want = ['path', 'reason', 'root', 'why'];
      if (names.join(',') !== want.join(',')) {
        fail(
          `17. the log line carries ${names.join(', ') || 'nothing'} rather than exactly ${want.join(', ')}`
        );
      } else if (/\bcontents\b/.test(handler) || /\bexpect\b/.test(handler)) {
        fail(
          '17. the fs:writeGuarded handler names contents or expect, so a log line can carry the bytes or a fingerprint of them'
        );
      } else if (!/'refused'/.test(handler)) {
        fail('17. the handler does not restrict the line to a refusal, so a wrote or a stale would write one too');
      } else {
        say('17. the refusal log line carries exactly why, reason, root and path, and the handler names neither contents nor expect');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 277's rules. Every one of them pins a defect a verifier drove red on
// the real store, and every one has an arm in build/p268/ablation.mjs that
// takes it out and must turn exactly that rule red.
// ---------------------------------------------------------------------------

// Rule 18. A timer is never queued. `withSaveSlot` answers an 'auto' request
// false BEFORE it creates a follow-up, so nothing waiting in the slot can
// outlive the policy that armed it (attack T1), write under a confirm (T2, T7)
// or land in a reopened tab (T3). The deferred timer re-arms in ./auto-save,
// where the policy, the delay and blocked() are asked again (rule 21).
{
  const code = source(TAB_IO);
  const ordered = bodyOrder(code, 'withSaveSlot', "reason === 'auto'", 'held.next =');
  // PHASE 282.1. The test must ANSWER `false`, not merely precede the queue:
  // `void 0` in its place kept this rule green while a timer queued.
  const refusal = statementHolding(code, 'withSaveSlot', "reason === 'auto'");
  if (ordered === null) {
    fail("18. withSaveSlot does not test `reason === 'auto'` and then create a follow-up, so this rule read nothing");
  } else if (ordered === false) {
    fail('18. withSaveSlot creates a follow-up before it refuses a timer, so a timer can wait in the slot and write later');
  } else if (refusal === null || !/\breturn false\b/.test(refusal)) {
    fail("18. withSaveSlot tests `reason === 'auto'` but the statement holding the test does not answer `return false`, so a timer is mentioned before the queue rather than refused it");
  } else {
    say("18. withSaveSlot answers a timer's request false before it can create a follow-up, so no timer waits in the slot");
  }
}

// Rule 19. The drained follow-up checks the LIFETIME before it takes the slot,
// and runs as a person's save. `getWorkingModel` before `holdSlot`, the model
// COMPARED with the slot's own (`!== slot.model`), and the reason passed is
// the literal 'explicit'.
{
  const body = namedFunctions(stripComments(source(TAB_IO))).get('drainQueue');
  if (body === undefined) {
    fail('19. drainQueue is not in tab-io.ts, so this rule read nothing');
  } else {
    const model = body.indexOf('getWorkingModel(');
    const hold = body.indexOf('holdSlot(');
    // PHASE 282.1. Asking `getWorkingModel` is not comparing it: a
    // `getWorkingModel(id) === undefined` in the same place kept this rule
    // green while a follow-up from a closed tab wrote the reopened one.
    const compared = body.indexOf('!== slot.model');
    if (model === -1 || hold === -1 || model > hold) {
      fail('19. drainQueue does not ask getWorkingModel before holdSlot, so a follow-up from a closed tab can write the reopened one');
    } else if (compared === -1 || compared > hold) {
      fail("19. drainQueue asks getWorkingModel but never compares it with the slot's own model (`!== slot.model`) before holdSlot, so the lifetime is read and not checked");
    } else if (!body.includes("saveOnce(id, 'explicit')")) {
      fail("19. drainQueue does not run saveOnce(id, 'explicit'), so a stored reason can reach a door as a timer");
    } else {
      say("19. drainQueue compares the tab's model with the slot's before it takes the slot, and runs the follow-up as saveOnce(id, 'explicit')");
    }
  }
}

// Rule 20. The close prompt's Save re-reads `dirty` before it closes, and a
// dirty answer ASKS AGAIN. True means a write landed, not that the tab is
// clean.
{
  const code = source(EDITOR_STORE);
  const ordered = bodyOrder(code, 'promptDirtyClose', 'live.dirty', 'forceCloseTab(');
  // PHASE 282.1. Reading `live.dirty` is not asking again: `if (live.dirty) {
  // void 0 }` before the close kept this rule green while the typing was
  // discarded. The re-ask is the prompt calling itself, between the read and
  // the close.
  const reasks = tailOrder(code, 'promptDirtyClose', 'live.dirty', 'promptDirtyClose(', 'forceCloseTab(');
  if (ordered === null) {
    fail('20. promptDirtyClose does not read live.dirty and close the tab, so this rule read nothing');
  } else if (ordered === false) {
    fail("20. promptDirtyClose closes the tab before it reads live.dirty, so typing made during the Save is discarded without a question");
  } else if (reasks !== true) {
    fail('20. promptDirtyClose reads live.dirty but does not ask itself again before forceCloseTab, so a tab still dirty after its save is closed without a second question');
  } else {
    say('20. the close prompt re-reads dirty after its save answers and asks itself again, between that read and the close, rather than closing unsaved typing');
  }
}

// Rule 21. A timer deferred by a held slot is re-armed after the save it
// waited on, never dropped: `run` names `arm(id)` AFTER `await deps.save(`.
//
// PHASE 282.1. THIS RULE READS A MENTION, and its sentence now says so: an
// `arm(id)` after the await that is guarded into unreachability keeps it
// green. The re-arm's EFFECT is pinned by p277-timer-policy.test.ts, whose
// two rows go red on exactly that shape; this rule is the second guard.
{
  const body = namedFunctions(stripComments(source(AUTO_SAVE))).get('run');
  const at = body === undefined ? -1 : body.indexOf('await deps.save(');
  if (at === -1) {
    fail('21. run in auto-save.ts does not await deps.save, so this rule read nothing');
  } else if (body.indexOf('arm(id)', at) === -1) {
    fail('21. run does not re-arm after deps.save answers, so a timer refused by a held slot is dropped and the newer typing is never written');
  } else {
    say('21. run names arm(id) after deps.save answers (a mention; p277-timer-policy.test.ts pins that the re-arm runs), so a timer the slot refused is deferred rather than dropped');
  }
}

// Rule 22. refreshRepo reads the LIVE tab after the disk read and before it
// replaces the buffer. A snapshot taken before the await is attack T6: typing
// that lands during the read was wiped and the tab left reading clean.
{
  const body = namedFunctions(stripComments(source(TAB_IO))).get('refreshRepo');
  if (body === undefined) {
    fail('22. refreshRepo is not in tab-io.ts, so this rule read nothing');
  } else {
    const read = body.indexOf('fs.readFile(');
    const reset = body.indexOf('resetWorkingModel(', read);
    const live = read === -1 ? -1 : body.indexOf('deps.byId(', read);
    if (read === -1 || reset === -1) {
      fail('22. refreshRepo does not read a file and reset a buffer, so this rule read nothing');
    } else if (live === -1 || live > reset) {
      fail('22. refreshRepo replaces the buffer without reading the live tab after its disk read, so typing made during the read is wiped');
    } else {
      say('22. refreshRepo reads the live tab after the disk read and before it replaces the buffer');
    }
  }
}

// Rule 23. No door writes a literal clean state, and every door ends in the
// one completion. tab-io.ts names no `dirty: false`; `completeSave` is declared
// once and named by each of the four doors.
{
  const code = stripComments(source(TAB_IO));
  const fns = namedFunctions(code);
  const doors = ['saveOnMachine', 'writePlain', 'overwrite', 'saveInProject'];
  const missing = doors.filter((d) => !(fns.get(d) ?? '').includes('completeSave('));
  const decls = (code.match(/const completeSave\s*=/g) ?? []).length;
  if (/dirty:\s*false/.test(code)) {
    fail('23. tab-io.ts writes a literal `dirty: false`, so a door can mark a tab clean without asking what its buffer holds');
  } else if (decls !== 1) {
    fail(`23. tab-io.ts declares completeSave ${String(decls)} times rather than once`);
  } else if (missing.length > 0) {
    fail(`23. ${missing.join(', ')} ${missing.length === 1 ? 'does' : 'do'} not end in completeSave, so that door decides clean on its own`);
  } else {
    say('23. no door writes dirty: false, and all four doors end in the one completeSave');
  }
}

// Rule 24. The auditor's fixture ships UNEDITED. It is evidence, and a build
// that bends it to pass has proved nothing.
{
  const shipped = 'src/renderer/editor/__tests__/audit-0914-auto-save.test.ts';
  const fixture = 'docs/audits/fixtures/2026-09-14/auto-save-interleavings.test.ts.fixture';
  let a = null;
  let b = null;
  try {
    a = readFileSync(join(repoRoot, shipped), 'utf8');
    b = readFileSync(join(repoRoot, fixture), 'utf8');
  } catch {
    // reported below
  }
  if (a === null || b === null) {
    fail(`24. ${a === null ? shipped : fixture} is missing, so the auditor's closure test cannot be compared`);
  } else if (a !== b) {
    fail(`24. ${shipped} differs from the auditor's fixture, so the closure test was edited rather than satisfied`);
  } else {
    say("24. the auditor's closure test ships byte for byte as the fixture it was given");
  }
}

// ---------------------------------------------------------------------------
// PHASE 282's rules. `savedContents` is ⌘S's precondition, and until this
// phase a save was the only thing that moved it. PR 28's rewind adopts the
// bytes it just wrote so the picture does not wait for the watcher, and the
// four-lens review of 2026-09-17 measured what that opened: a read that
// crossed the adoption rolled the buffer back to the pre-rewind text in 37 of
// 500 interleavings over the real main handlers, and a keystroke that was
// still React state when the adoption ran was invisible to every refusal in
// this file. Each rule below has an arm in build/p268/ablation.mjs.
// ---------------------------------------------------------------------------

// Rule 25. `adoptWritten` REFUSES BEFORE IT MOVES ANYTHING. It is the one door
// that patches `savedContents` and replaces the working model with no write of
// its own, so its two refusals — a dirty tab, and a baseline that is no longer
// the `was` the write expected — are the whole guard. Both have to be read
// before `deps.patch` and before `resetWorkingModel`, because after either of
// those the person's buffer already holds the adopted text. The review's own
// finding was that taking either clause out left this gate and
// conformance:redline green and reddened only PR 28's own vitest.
{
  const code = source(TAB_IO);
  const body = bodyOf(TAB_IO, 'adoptWritten', '25');
  if (body !== null) {
    const problems = [];
    if (!body.includes('deps.byId(')) {
      problems.push('it never reads the live tab, so both refusals are about a snapshot');
    }
    for (const [clause, what] of [
      ['tab.dirty', 'a dirty tab'],
      ['!== was', 'a baseline that moved since the write was planned']
    ]) {
      for (const [mutation, effect] of [
        ['deps.patch(', 'moves savedContents'],
        ['resetWorkingModel(', 'replaces the buffer']
      ]) {
        const ordered = bodyOrder(code, 'adoptWritten', clause, mutation);
        if (ordered === null) {
          problems.push(`it does not refuse ${what} before it ${effect}`);
        } else if (ordered === false) {
          problems.push(`it ${effect} before it refuses ${what}`);
        }
      }
    }
    // Asked only of the shape it was written for: a dirty test that IS above
    // the patch and lets it happen anyway. The two questions above already
    // answer for a test that is missing or below the patch, and asking this
    // one there as well put a third sentence on the screen that was not true
    // of either shape.
    if (
      bodyOrder(code, 'adoptWritten', 'tab.dirty', 'deps.patch(') === true &&
      tailOrder(code, 'adoptWritten', 'tab.dirty', 'return', 'deps.patch(') !== true
    ) {
      problems.push('the dirty test is not a refusal: nothing returns between it and the patch');
    }
    if (problems.length > 0) {
      fail(`25. adoptWritten in ${TAB_IO}: ${[...new Set(problems)].join('; ')}`);
    } else {
      say(
        '25. adoptWritten reads the live tab and refuses a dirty one and a moved baseline before it patches savedContents or replaces the buffer'
      );
    }
  }
}

// Rule 26. THE WATCHER'S CLEAN RELOAD ASKS WHETHER THE BASELINE MOVED UNDER
// ITS READ. Rule 22 is the other half of the same question: the tab is still
// clean and the model is still the same instance. `adoptWritten` passes both,
// because it leaves the tab clean and the instance the same — so a read whose
// descriptor was opened before the guarded write's `renameSync` answered the
// OLD inode's bytes and put the pre-rewind text back while the disk held the
// rewind. A read that raced a newer baseline is dropped, and the rename's own
// file event reads again. The clause names the FACT rather than the writer, so
// it closes the same race for a ⌘S's completion.
{
  const code = source(TAB_IO);
  const body = bodyOf(TAB_IO, 'refreshRepo', '26');
  if (body !== null) {
    const captured = bodyOrder(code, 'refreshRepo', 'savedBefore =', 'fs.readFile(');
    const compared = tailOrder(
      code,
      'refreshRepo',
      'fs.readFile(',
      'live.savedContents === savedBefore',
      'resetWorkingModel('
    );
    if (captured === null) {
      fail(
        '26. refreshRepo never records the baseline its read started from, so an adoption or a save that lands inside the read is rolled back'
      );
    } else if (captured === false) {
      fail(
        '26. refreshRepo records the baseline AFTER its read, which compares a value with itself and answers yes to every interleaving the clause was written to refuse'
      );
    } else if (compared !== true) {
      fail(
        `26. refreshRepo ${compared === null ? "does not compare the live tab's savedContents with that baseline" : 'replaces the buffer before it compares them'}, so a read of the old inode wins over the bytes the write just landed`
      );
    } else {
      say(
        "26. refreshRepo records the baseline before its read and drops a reload whose baseline moved under it, beside rule 22's clean tab and model identity"
      );
    }
  }
}

// Rules 27 to 27c. THE REDLINE'S TYPING PATH. Rule 14 pins the order in
// `markDirty` because the auto save timer is armed off a tab the store already
// holds; these pin the order one caller out, for the same kind of reason. A
// keystroke in the Redline view is React state until an effect writes it to
// the model, and the first keystroke of a session makes that effect wait on a
// real chunk load. At this phase's parent the tab was marked dirty only after
// that await, so a rewind landing inside it met a tab that read clean:
// `adoptWritten` adopted, the continuation applied the pre-rewind text plus the
// keystroke, and the next ⌘S wrote the agent's text back over the rewind with
// `savedContents` as its precondition and nothing to refuse it.
{
  const body = effectBodyHolding(source(REDLINE_EDITS), TYPING_ANCHOR);
  if (body === null) {
    fail(
      `27. ${REDLINE_EDITS} holds no effect containing \`${TYPING_ANCHOR}\`, so rules 27 to 27c read nothing`
    );
  } else {
    // 27. The mark is synchronous: it is made before the step that makes the
    // rest of the effect asynchronous, which is the same instant every refusal
    // in this file reads the tab at.
    const place = dirtyMarkPlace(body);
    if (place === null) {
      fail('27. the typing effect hands nothing to a continuation, so this rule read nothing');
    } else if (place === 'absent') {
      fail(
        "27. the typing effect never marks the tab dirty before its await, so a keystroke is invisible to adoptWritten, to refreshRepo's clean arm and to pressRedline's dirty refusal for as long as the chunk takes to load"
      );
    } else if (place === 'inside') {
      fail(
        '27. the typing effect marks the tab dirty inside its continuation, after the chunk load — which is the same window written so that it looks closed'
      );
    } else {
      say(
        '27. the redline typing effect marks a clean tab dirty synchronously, before the await that loads the chunk'
      );
    }

    // 27b. The model is built from the bytes the tab holds when it is BUILT.
    // A string captured before the await is the bytes of a file that a chunk
    // load outlasting a whole rewind has already replaced, so the argument is
    // a function the loader calls once the chunk is in.
    const args = argumentsOfCall(body, 'ensureWorkingModel');
    if (args === null || args.length !== 3) {
      fail(
        `27b. the typing effect calls ensureWorkingModel with ${args === null ? 'nothing this rule could read' : `${String(args.length)} arguments`}, so this rule read nothing`
      );
    } else if (!/^\(\s*\)\s*=>/.test(args[1].trim())) {
      fail(
        '27b. the typing effect hands ensureWorkingModel a captured string rather than a function, so a chunk load that outlasts a write builds the model from a file that is no longer on disk'
      );
    } else if (!args[1].includes('savedContents')) {
      fail('27b. the function the typing effect hands ensureWorkingModel does not read savedContents');
    } else {
      say(
        '27b. the typing effect builds its model from a function the loader calls after the chunk is in, reading the savedContents the tab holds then'
      );
    }

    // 27c. A text computed on a picture the view has since replaced is never
    // applied. `want` is the whole current side, so applying it over bytes that
    // moved during the chunk load writes the old file back with the keystroke
    // in it, and the model would make that the buffer ⌘S saves.
    const returns = orderIn(body, 'now.savedContents !== typedOn', 'return', 'applyModelText(');
    if (!body.includes('applyModelText(')) {
      fail('27c. the typing effect never applies a text to the model at all, so this rule read nothing');
    } else if (returns === null) {
      fail(
        '27c. the typing effect applies its text without asking whether savedContents moved since the edit was typed, so a keystroke drawn beside an adoption writes the pre-rewind file back'
      );
    } else if (returns === false) {
      fail('27c. the typing effect applies its text before it returns on a moved baseline');
    } else {
      say(
        '27c. the typing effect returns without applying when savedContents moved since the edit was typed, and re-derives dirty from the model'
      );
    }
  }
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say('OK: every rule passed.');
process.exit(0);
