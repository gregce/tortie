#!/usr/bin/env node
/**
 * probe-redline-move-on.mjs — PR 28's author's asks of 2026-09-16, in the app.
 *
 * John Berryman (JnBrymn, PR 28's author) asked for three things over two
 * sittings, quoted verbatim:
 *
 *   1. "I want it to automatically forward to the next edit so I can do just
 *      keep doing option return if I want to keep approving... right now after
 *      I do option return I have to push option down to get the next edit."
 *   2. "when I press option delete, it should still go to the next available
 *      edit point, not just option return."
 *   3. "If I keep going past the end... I want it to flip over and go to the
 *      first edit point at the top of the document... And in reverse... to the
 *      last edit point so that it forms a loop instead of just hitting the
 *      end."
 *
 * So: a landed accept and a landed rewind both leave the person on the change
 * that was drawn AFTER the one they pressed, and both arrows loop — ⌥↓ past
 * the last change lands on the first, and ⌥↑ before the first lands on the
 * last.
 *
 * WHAT THIS RUN READS, all off the live DOM and the real disk, in ONE Electron:
 *
 *   H. THE HEAD SHAPE. One ⌥↓ marks the first change; ⌥↑ from there comes
 *      round to the LAST change and ⌥↓ from there comes back to the first. An
 *      accept then drops the picture by one, writes no byte of the file, and
 *      leaves the change that followed current with the keyboard on it and the
 *      chip drawn; a SECOND accept with no ⌥↓ between takes the next one; a
 *      rewind then WRITES the file, drops the picture by one, and leaves the
 *      change that followed current; the arrows still loop after a press; and
 *      accepting forward from there empties the document, after which every
 *      chord is a no-op and the keyboard is still in the view.
 *
 *   P. THE PARENT SHAPE, and it is why this probe takes a mode. PR 28's
 *      author reported the missing moves against the build before PR 28, so
 *      the defect is SHOWN rather than asserted:
 *      `ACCEPT_ADVANCE_PARENT=1 node build/probe-redline-move-on.mjs` grades
 *      the same fixture the other way round — ⌥↑ at the first change stays
 *      there and ⌥↓ at the last stays there, an accept leaves nothing current
 *      with the keyboard back on the scroller, a second ⌥↩ with no ⌥↓ accepts
 *      nothing, and the rewind that follows leaves nothing current either.
 *
 * PHASE 282's FIVE ARMS run after H in the same Electron, each over changes it
 * writes itself, so none depends on where the arm before it left the keyboard
 * (docs/BACKLOG.md `## Phase 282`, build/p282/SPEC.md §7). They are what the
 * review of 2026-09-17 found PR 28's battery could not see:
 *
 *   O. AN OUTSIDE WRITE ABOVE THE CURRENT CHANGE, on disk the moment before
 *      ⌥⌫ and before the watcher can redraw. The rewind re-reads the file, so
 *      the write adds a change in front of the pressed one; the move must land
 *      on the change that FOLLOWED the pressed one, found by its identity, and
 *      never on the one before it that the index rule answered (SPEC §2).
 *   L. ⌥⌫ ON THE ONLY REMAINING CHANGE, then ⌥⇧⌫ with no click between. The
 *      wrapper that held the keyboard is gone, so the keyboard must still be in
 *      the view and the undo the face names must bring the change back, file
 *      digest and all (SPEC §1.7).
 *   C. ⌥⌫ AND ⌥↩ BACK TO BACK, with no redraw awaited between. No change is
 *      ever drawn backwards, the file holds the rewind, and an accept that is
 *      refused says the one-press rule's sentence (SPEC §1.1 to §1.3).
 *   R. A HELD ⌥⌫: one keyDown and then six with `autoRepeat` at 40 ms, inside
 *      the 30 to 50 ms a held key repeats at. The picture drops by exactly one
 *      and the file moves in exactly one paragraph (SPEC §1.6).
 *   T. A TYPING BURST, a word and Enter at 30 ms per key into the Redline
 *      document, then ⌘S. The document draws the word as an insertion at the
 *      caret in order, and the file is exactly what was typed (SPEC §3.1).
 *
 * THE THIRD MODE. `ACCEPT_ADVANCE_PARENT=282` is PR 28's head with main merged
 * (`9217ae0d`), the build Phase 282 fixes. There the move-on is already in, so
 * H is graded as it is at HEAD, and O, L, C, R and T are graded the other way
 * round: the move lands on the change before, the keyboard drops, the change is
 * drawn backwards, the repeat rewinds more than one, and the typing is
 * scrambled. `ACCEPT_ADVANCE_PARENT=1` runs P alone and none of the five: T's
 * scramble and R's runaway repeat do not exist before PR 28, so grading them
 * there would assert a shape nobody measured.
 *
 * PHASE 282.2's ARM runs last, over changes it writes itself (docs/BACKLOG.md
 * `## Phase 282.2`, build/p282/SPEC.md §11.1):
 *
 *   U. UNDO IS A WAY OUT. ⌥⌫ with a keystroke typed INSIDE the rewind's write,
 *      so the write lands on a dirty tab, the adoption refuses and the hold
 *      lands on a picture that still draws the change. The arm then waits out
 *      the rewind's own watcher tick on the clock, which a dirty tab spends on
 *      nothing; ⌥↩ says the sentence that names the way out ("Save or undo
 *      your edits first, then accept."); ⌘Z until the tab is clean; and ⌥↩
 *      again. At HEAD the clean transition reads the file, the picture lets
 *      the rewound change go and the accept lands: no held sentence, the file
 *      is the rewound text and the tab's `savedContents` is the disk's. Every
 *      reading is printed whatever the outcome.
 *
 *      U's EXPECTATIONS NEVER FLIP, so its findings ARE the parent reading
 *      (build/p276/probe-p276.mjs has the same shape). Against the Phase 282.1
 *      bytes, where nothing reads on the clean transition, it FAILS with the
 *      accept after the undo answering "A change in notes.txt is still being
 *      rewound, so nothing was accepted." and the run says so in those words.
 *      It is not run under `ACCEPT_ADVANCE_PARENT=282`: PR 28's head has no
 *      hold to linger, so there is no shape there for it to show.
 *
 *      THE KEYSTROKE INSIDE THE WRITE IS REAL TIMING AND NOT A SEAM. There is
 *      no way in this product to hold a guarded write open, and adding one
 *      would mean the arm proved the seam. It does not need one, for the
 *      reason src/renderer/editor/p277-save-drive.ts gives for `saveThenType`:
 *      the press runs synchronously as far as its first await, which is the
 *      re-read, so a keystroke delivered in the SAME TASK as the chord lands
 *      strictly inside the two IPC round trips of the write. The chord is a
 *      real ⌥⌫ through CDP; the keystroke is one `beforeinput` dispatched at
 *      the document by a one-shot listener on `window`, which the keydown
 *      reaches after React's own handler has started the press. Two CDP keys
 *      sent back to back race that window instead (arm C allows for both
 *      orders for exactly that reason), and this arm has only one order to
 *      measure.
 *
 * PHASE 282.2's FIX ROUND added one more, which also runs over changes it
 * writes itself (build/p282/SPEC.md §12, "THE FIX ROUND"):
 *
 *   Z. A PRESS TOO MANY, TAKEN BACK. Arm U's first half, then a HELD ⌘Z: the
 *      keydown and its first repeat sent without waiting for the first to be
 *      answered, which is how the phase's attack verifier put the second undo
 *      INSIDE the read the first had pulled. That second undo un-applies the
 *      reload that brought the agent's write into the model (a reload is an
 *      edit, ./monaco-loader), so the tab is dirty again over the text from
 *      BEFORE the agent wrote and its picture draws no change at all; the read
 *      answers a dirty tab and is dropped. Then ⌘⇧Z until the tab is clean, and
 *      ⌥↩. Before the fix round the dirty buffer's empty picture had let the
 *      hold go, so that clean transition read nothing, the rewound change was
 *      drawn again over `savedContents` the disk had left behind, and ⌥↩
 *      ACCEPTED it with nothing said; an outside write then drew it backwards
 *      and the next ⌥⌫ wrote the agent's word back (the verifier's arm X, the
 *      same at HEAD and at the 282.1 bytes). With the hold kept, ⌘⇧Z back to
 *      clean reads the file, the picture lets the rewound change go, ⌥↩ takes
 *      the change that followed it, and an outside write afterwards draws
 *      nothing backwards. WHICH SIDE OF THE READ the repeat landed on is real
 *      timing and is printed, not assumed (`savedContents` still the agent's
 *      text after the two keys is a read that had not answered; against a
 *      build that pulls no read it reads the same, because there the hold is
 *      lost to the same empty picture): when it lands AFTER the read, ⌘Z
 *      un-applies the read itself, which is a stated limit and not this arm's
 *      (SPEC §12), and the arm's expectations hold there too because ⌘⇧Z puts
 *      the read back. Like U its expectations never flip, and it is not run
 *      under `ACCEPT_ADVANCE_PARENT=282`.
 *
 * PHASE 297's ARM, X, runs last and writes its own files (docs/BACKLOG.md
 * `## Phase 297`):
 *
 *   X. A KEYSTROKE STAYS IN THE TAB IT WAS TYPED IN. Two prose files, both
 *      opened in the Redline view. One character is typed in the first, the
 *      second's TAB IS CLICKED, and the arm reads at the second: the drawn
 *      text, `dirty`, the working model's value and the bytes on disk; then
 *      ⌘S there, and the disk, the toasts and whether a confirmation was drawn.
 *      Six sub-arms, being the verifiers' matrix and its control: A left dirty,
 *      A saved first (PV-2's H2), A's typing undone first (P3's B), B with a
 *      working model because the File view was open first (P4's L1), B with no
 *      model at all (L2), and B holding a model its OWN keystroke made, which
 *      ./live-text never saw. Every reading is printed whatever the outcome.
 *
 *      THE BUFFER'S WHOLE VALUE HISTORY IS THE READING, NOT ITS SETTLED VALUE.
 *      Where the arriving tab's seed is its own text the write lasts one task —
 *      the run after it puts the tab's own bytes back and `dirty` reads false
 *      again — while a ⌘S pressed inside that window still writes the other
 *      file. So a recorder goes into the page BEFORE the click and keeps every
 *      value each of the two buffers holds, sampled from a MessageChannel drain
 *      loop that shares React's own task queue, from requestAnimationFrame,
 *      from an 8 ms timer and from a MutationObserver; the claim is that the
 *      other file's text is never among them. The busy part of that loop is
 *      short on purpose, so the settled readings at 150, 600 and 1200 ms —
 *      PV-2's own clock — are not queued behind it, and the recorder stops
 *      itself on the clock as well as in this arm's own read.
 *
 *      X's EXPECTATIONS NEVER FLIP, like U's and Z's, so its findings ARE the
 *      parent reading. Every release from 0.102.0 through 0.108.0 carries this
 *      defect, so the parent drive is this arm against a parent BUILD
 *      (`REDLINEMOVEON_CHECKOUT`), and the readings it has to move are the
 *      verifiers' own: a buffer holding the other file's text, `arrived.after`
 *      naming the departing file, `diskOfB` naming it too, and about a thousand
 *      characters written over a file nobody typed in. It is not run under
 *      `ACCEPT_ADVANCE_PARENT=282`: PR 28's head carries the defect as well,
 *      but nobody measured it there, and grading a shape nobody measured is
 *      what this probe refuses everywhere else.
 *
 * ## ENVIRONMENT
 *
 *   ACCEPT_ADVANCE_PARENT   The grading mode above: unset, `1` or `282`.
 *   REDLINEMOVEON_CHECKOUT  A BUILT checkout to launch instead of this one:
 *                           its `out/` and its cwd, in the shape
 *                           build/p276/probe-p276.mjs takes its parent. The
 *                           probe, the helper and the scratch socket stay this
 *                           checkout's. This is how arm U is read against the
 *                           Phase 282.1 bytes. One Electron either way.
 *   REDLINEMOVEON_ARMS      A subset of `H,O,L,C,R,T,U,Z,X`, commas between.
 *                           Unset is every arm the mode has. R, T, U, Z and X
 *                           stand alone;
 *                           O and C need H, and L needs O, because they are
 *                           written against the picture the arm before them
 *                           left, and a subset that breaks that is refused by
 *                           name rather than run into a fixture finding.
 *                           `REDLINEMOVEON_ARMS=U` is arm U alone, which is
 *                           the run that fits under a short ceiling. It is
 *                           refused under `ACCEPT_ADVANCE_PARENT=1`, which is
 *                           one drive and has no arms.
 *
 * ## SAFETY
 *
 * One Electron, through build/electron-run.mjs, which ends the tree it started
 * in a `finally`. A scratch profile, a scratch HOME and this script's own tmux
 * socket, ended and unlinked by build/harness-socket.mjs; `gmux` and `default`
 * are refused by name, and the -L gmux sessions of the machine that runs this
 * probe are counted before and after, read only. No agent, no token, no
 * keychain, no request, no ssh, no machine. Every file written is under
 * GMUX_HARNESS_DIR. The edits the redline draws are a plain /bin/sh running
 * cat, exactly as an agent's write looks here, with ONE exception: arm O's
 * outside write is this node process's own synchronous `writeFileSync`,
 * because that arm measures the gap between the write and the key, and a
 * process start would sit inside it. Arms U and Z each put one keydown
 * listener on the page's `window` and take it off again whether it fired or
 * not, and read the tab through `window.__gmuxP277`, the Phase 277 drive every
 * harness launch already registers; they add nothing to the app. Arm Z writes
 * one more file, `elsewhere.txt`, beside the fixture in the scratch project.
 * Arm X writes two more files per sub-arm, twelve in all, and commits them to
 * the scratch repository under GMUX_HARNESS_DIR; it reads the tabs through the
 * same Phase 277 drive, clicks a tab and a dialog's Cancel on the shipped
 * elements, and its one addition to the page is a recorder it stops itself.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { cdpEval, wsConnect } from './cdp-client.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[move-on]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * THE MODE. Unset is HEAD. `1` is the build before PR 28, `282` is PR 28's
 * head before Phase 282 (see the header). Any other value is refused rather
 * than read as HEAD, so a mistyped parent run can never report a feature as
 * the defect it was asked to show.
 */
const PARENT_MODE = process.env['ACCEPT_ADVANCE_PARENT'] ?? '';
if (PARENT_MODE !== '' && PARENT_MODE !== '1' && PARENT_MODE !== '282') {
  console.error(`${TAG} ACCEPT_ADVANCE_PARENT is ${JSON.stringify(PARENT_MODE)}; it is unset, 1 or 282`);
  process.exit(2);
}
const PARENT = PARENT_MODE === '1';
const PR28_HEAD = PARENT_MODE === '282';

/**
 * PHASE 282.2. WHICH ARMS RUN, as a pure function of the knob and the mode so
 * `--self-test` can ask it. H is the head drive and the letters after it are
 * the arms in the order they run, which is the order answered whatever order
 * the knob named them in.
 *
 * `NEEDS` is what an arm is written against. O counts exactly four changes, so
 * it needs the picture H emptied; L accepts down to the last change O left;
 * and C compares the file with the word that stood there before its own write,
 * which is the baseline's only once H has accepted the draft. R and U accept
 * everything first, T asks only for a clean tab and X opens files of its own,
 * so those four stand alone.
 */
const ALL_ARMS = ['H', 'O', 'L', 'C', 'R', 'T', 'U', 'Z', 'X'];
/**
 * THE ARMS GRADED ONE WAY ROUND, at HEAD, and never run under
 * `ACCEPT_ADVANCE_PARENT=282`, each with the reason its refusal says. U and Z
 * are Phase 282.2's: PR 28's head has no hold to linger, so there is no shape
 * there for them to show. X is Phase 297's: the keystroke that lands in another
 * tab's buffer is in PR 28's head as well, but it was measured at `50bd2561`
 * and at Phase 290's HEAD and nowhere else, and grading a shape nobody measured
 * is what this probe refuses everywhere else. X's parent reading is the arm run
 * against a parent BUILD through `REDLINEMOVEON_CHECKOUT`.
 */
const HOLD_ARMS = ['U', 'Z', 'X'];
const HOLD_WHY = {
  U: 'which has no hold to linger',
  Z: 'which has no hold to linger',
  X: 'where nobody measured the keystroke that lands in another tab’s buffer'
};
const NEEDS = { O: ['H'], L: ['H', 'O'], C: ['H'] };
function armsFrom(raw, parentMode) {
  const named = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s !== '');
  if (named.length === 0) {
    return { arms: ALL_ARMS.filter((a) => !(HOLD_ARMS.includes(a) && parentMode === '282')), refusal: null };
  }
  if (parentMode === '1') {
    return { arms: [], refusal: 'ACCEPT_ADVANCE_PARENT=1 is the parent drive alone and has no arms to choose from' };
  }
  const unknown = named.filter((a) => !ALL_ARMS.includes(a));
  if (unknown.length > 0) {
    return { arms: [], refusal: `${unknown.join(', ')} is not an arm; the arms are ${ALL_ARMS.join(', ')}` };
  }
  const heldHere = named.filter((a) => HOLD_ARMS.includes(a));
  if (parentMode === '282' && heldHere.length > 0) {
    return {
      arms: [],
      refusal: `arm ${heldHere[0]} is not graded at PR 28’s head, ${HOLD_WHY[heldHere[0]] ?? 'which is not a build it was measured against'}`
    };
  }
  const arms = ALL_ARMS.filter((a) => named.includes(a));
  for (const arm of arms) {
    const missing = (NEEDS[arm] ?? []).filter((n) => !arms.includes(n));
    if (missing.length > 0) {
      return { arms: [], refusal: `arm ${arm} is written against the picture ${missing.join(' and ')} left, so it does not run without ${missing.length === 1 ? 'it' : 'them'}` };
    }
  }
  return { arms, refusal: null };
}
const ARMS_RAW = (process.env['REDLINEMOVEON_ARMS'] ?? '').trim();
const CHOSEN = armsFrom(ARMS_RAW, PARENT_MODE);
if (CHOSEN.refusal !== null) {
  console.error(`${TAG} REDLINEMOVEON_ARMS is ${JSON.stringify(ARMS_RAW)}: ${CHOSEN.refusal}`);
  process.exit(2);
}
const runs = (arm) => CHOSEN.arms.includes(arm);

/**
 * PHASE 282.2. THE BUILD UNDER TEST. Unset is this checkout. Set, it is a
 * BUILT checkout somewhere else — its `out/` and its cwd — which is how arm U
 * is read against the Phase 282.1 bytes (build/p276/probe-p276.mjs takes its
 * parent the same way). Everything else stays this checkout's: the probe, the
 * launch helper, the scratch socket and the scratch project.
 */
const CHECKOUT = (process.env['REDLINEMOVEON_CHECKOUT'] ?? '').trim();
const APP_ROOT = CHECKOUT === '' ? REPO : resolve(CHECKOUT);

const failures = [];
const rows = [];
function check(step, claim, pass, detail) {
  rows.push({ step, claim, pass, detail: detail ?? '' });
  if (!pass) failures.push(`${step}. ${claim} — ${detail ?? ''}`);
  say(`${pass ? 'pass' : 'FAIL'}  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}
function note(step, claim, detail) {
  rows.push({ step, claim, pass: null, detail: detail ?? '' });
  say(`note  ${step}. ${claim}${detail ? ' — ' + detail : ''}`);
}

/**
 * What the parent's app is expected to do, graded as findings so a run at the
 * parent is a PASS when the defect reproduces. The head grader is its mirror:
 * the same readings, the other way round.
 */
function grade(reading, mode) {
  const bad = [];
  const f = (name) => reading[name] ?? {};
  if (reading.startChanges !== 8) bad.push(`the fixture drew ${String(reading.startChanges)} changes and not 8`);
  if (f('a1').currentIndex !== 0 || f('a1').currentCount !== 1) {
    bad.push('the first ⌥↓ did not mark the first change');
  }
  const dels = reading.startDels ?? [];
  if (mode === 'head') {
    if (f('loopUp').currentIndex !== 7) {
      bad.push(`⌥↑ from the first change landed on ${String(f('loopUp').currentIndex)} rather than looping to the last`);
    }
    if (f('loopDown').currentIndex !== 0) {
      bad.push(`⌥↓ from the last change landed on ${String(f('loopDown').currentIndex)} rather than looping to the first`);
    }
    const b = f('accept1');
    if (b.changes !== 7) bad.push(`the first accept left ${String(b.changes)} changes where the picture held 8`);
    if (reading.acceptsMovedFile === true) bad.push('an accept moved a byte of the file');
    if (b.currentCount !== 1 || b.dels?.[b.currentIndex] !== dels[1]) {
      bad.push('the accept did not leave the change that followed it current');
    }
    if (b.activeIsChange !== true || b.activeIndex !== b.currentIndex) {
      bad.push('the keyboard is not on the change the accept moved to');
    }
    if (b.chipDrawn !== true) bad.push('the controls did not come with the accepted change’s neighbour');
    const c = f('accept2');
    if (c.changes !== 6) bad.push(`a second ⌥↩ with no ⌥↓ accepted nothing (${String(c.changes)} changes remain)`);
    if (c.dels?.[c.currentIndex] !== dels[2]) bad.push('the second ⌥↩ did not land on the change after the one it accepted');
    const r = f('rewind');
    if (r.changes !== 5) bad.push(`the rewind left ${String(r.changes)} changes where the picture held 6`);
    if (reading.rewindMovedFile !== true) bad.push('the rewind did not write the file, so it was not a rewind');
    if (r.currentCount !== 1 || r.dels?.[r.currentIndex] !== dels[3]) {
      bad.push('the rewind did not leave the change that followed it current');
    }
    if (
      typeof reading.rewindWaitMs !== 'number' ||
      typeof reading.acceptWaitMs !== 'number' ||
      reading.rewindWaitMs < 0 ||
      reading.rewindWaitMs > reading.acceptWaitMs + 500
    ) {
      bad.push(
        `THE TWO VERBS FEEL DIFFERENT: the accept redrew in ${String(reading.acceptWaitMs)} ms and the rewind in ${String(reading.rewindWaitMs)} ms, which is PR 28's author's complaint`
      );
    }
    if (r.activeIsChange !== true || r.activeIndex !== r.currentIndex) {
      bad.push('the keyboard is not on the change the rewind moved to');
    }
    if (f('loopUp2').currentIndex !== 4) {
      bad.push(`⌥↑ after the rewind landed on ${String(f('loopUp2').currentIndex)} rather than looping to the last remaining change`);
    }
    if (f('loopDown2').currentIndex !== 0) {
      bad.push(`⌥↓ from the last remaining change landed on ${String(f('loopDown2').currentIndex)} rather than looping to the first`);
    }
    if (f('end').changes !== 0) bad.push(`accepting forward left ${String(f('end').changes)} changes`);
    if (reading.acceptsAfterRewindMovedFile === true) bad.push('a later accept moved a byte of the file');
    if (f('emptyAccept').changes !== 0) bad.push('a ⌥↩ past the last change drew another change, so it was not a no-op');
    if (f('emptyStep').changes !== 0 || f('emptyStep').currentCount !== 0) {
      bad.push('the arrows marked something on an empty redline');
    }
    if (f('emptyAccept').activeInView !== true) bad.push('the keyboard left the view when the last change was accepted');
  } else {
    if (f('loopUp').currentIndex !== 0) {
      bad.push('THE LOOP DID NOT REPRODUCE: ⌥↑ at the first change moved instead of staying');
    }
    if (f('loopDown').currentIndex !== 7) {
      bad.push(`THE LOOP DID NOT REPRODUCE: nine ⌥↓ presses from the first change ended at ${String(f('loopDown').currentIndex)} rather than clamped on the last`);
    }
    const b = f('accept1');
    if (b.changes !== 7) bad.push(`the first accept left ${String(b.changes)} changes where the picture held 8`);
    if (b.currentCount !== 0) {
      bad.push('the parent marked a change after the accept, which is the feature this run measures');
    }
    if (f('accept2').changes !== 7) {
      bad.push('THE DEFECT DID NOT REPRODUCE: a second ⌥↩ with no ⌥↓ accepted something');
    }
    const r = f('rewind');
    if (reading.rewindMovedFile !== true) bad.push('the rewind did not write the file, so this arm measured nothing');
    if (r.changes !== 6) bad.push(`the rewind left ${String(r.changes)} changes where the picture held 7`);
    if (r.currentCount !== 0) {
      bad.push('the parent marked a change after the rewind, which is the feature this run measures');
    }
  }
  return bad;
}

/**
 * THE ONE-PRESS RULE'S ACCEPT SENTENCE, verbatim from build/p282/SPEC.md §1.3
 * with the fixture's name in it. It is spelled here rather than imported
 * because this script is plain node and `redlineHeldSentence` is TypeScript in
 * the renderer; a change to the words fails arm C at HEAD, which is the
 * reading that says the two disagree.
 */
const NOTES = 'notes.txt';
const HELD_ACCEPT = `A change in ${NOTES} is still being rewound, so nothing was accepted.`;
/**
 * PHASE 282.2. The way out `acceptDirty` names (./redline-sentences), held as
 * the clause arm U is about rather than as the whole sentence: the arm asks
 * whether the road those words name is real, and the words before them are
 * Phase 282.1's to change.
 */
const WAY_OUT = 'Save or undo your edits first';

const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
/**
 * PHASE 297. How many changes each of arm X's two fixtures draws, being seven
 * moved paragraphs and an eighth left as it was committed for the caret to sit
 * in. It is declared here rather than beside the arm because `gradeArms` names
 * it and the self-test grades before the declarations below it are initialised.
 */
const X_CHANGES = 7;
/** Eight paragraphs, each with one marker word that differs between versions. */
const version = (n) =>
  WORDS.map(
    (_, i) =>
      `Paragraph ${String(i + 1)} of the draft, whose marker word is ${WORDS[(i + n) % WORDS.length]} and whose body carries enough sentences to make the document worth scrolling through when somebody reads it.\n`
  ).join('\n');

/** `version` joins its paragraphs with a blank line, so this splits them back. */
const paragraphsOf = (text) => text.split('\n\n');
/** Paragraph `n`'s marker word, counting from 1, or null. */
const markerOf = (text, n) => /marker word is (\S+) and/.exec(paragraphsOf(text)[n - 1] ?? '')?.[1] ?? null;
/** The text with paragraph `n`'s marker word set, for each `[n, word]`. */
function withMarkers(text, pairs) {
  const ps = paragraphsOf(text);
  for (const [n, word] of pairs) ps[n - 1] = ps[n - 1].replace(/marker word is \S+ and/, `marker word is ${word} and`);
  return ps.join('\n\n');
}
/** How many paragraphs differ between two texts, or -1 when the count moved. */
function paragraphsMoved(a, b) {
  const pa = paragraphsOf(a);
  const pb = paragraphsOf(b);
  return pa.length !== pb.length ? -1 : pa.filter((p, i) => p !== pb[i]).length;
}

/**
 * PHASE 282's ARMS, graded per arm. `head` is the build that fixes them; `pr28`
 * is PR 28's head before the fix, where each arm's finding is the defect NOT
 * reproducing. The fixture findings are asked in both modes first, because an
 * arm whose own fixture did not draw measured nothing either way.
 */
function gradeArms(reading, mode) {
  const out = { o: [], l: [], c: [], r: [], t: [], u: [], z: [], x: [] };
  const head = mode === 'head';

  const o = reading.o;
  if (o === undefined) out.o.push('arm O did not run');
  else {
    if (o.drawn !== true) out.o.push('the O fixture did not draw its four changes');
    if (o.marked !== true) out.o.push('arm O could not mark the change it presses');
    if (o.agentDrawnAtPress !== false) {
      out.o.push(
        `the watcher had already drawn the outside write when ⌥⌫ was read (${String(o.writeToKeyMs)} ms after it), so the arm measured a picture that had caught up`
      );
    }
    if (o.fileAsExpected !== true) out.o.push('the file does not hold the outside write and the rewind together');
    if (head) {
      if (o.landedOn !== o.followerIns) {
        out.o.push(
          `the move landed on ${JSON.stringify(o.landedOn)} rather than ${JSON.stringify(o.followerIns)}, the change that followed${o.landedOn === o.beforeIns ? ', which is the change BEFORE the one it rewound' : ''}`
        );
      }
      if (o.activeOnCurrent !== true) out.o.push('the keyboard is not on the change the move landed on');
    } else if (o.landedOn !== o.beforeIns) {
      out.o.push(
        `THE WRONG LANDING DID NOT REPRODUCE: the move landed on ${JSON.stringify(o.landedOn)} and not on ${JSON.stringify(o.beforeIns)}, the change before`
      );
    }
  }

  const l = reading.l;
  if (l === undefined) out.l.push('arm L did not run');
  else {
    if (l.remaining !== 1) out.l.push(`arm L got down to ${String(l.remaining)} changes and not one`);
    if (l.keyboardOnChange !== true) {
      out.l.push('the keyboard was not on the change when ⌥⌫ was pressed, so there was no wrapper for the rewind to take it from');
    }
    if (l.rewound !== true) out.l.push('the rewind of the only change did not write the file and empty the picture');
    if (head) {
      if (l.activeInView !== true) {
        out.l.push(`the keyboard left the view when the only change was rewound (on ${JSON.stringify(l.activeClass)})`);
      }
      if (l.undoChanges !== 1 || l.undoIns !== l.pressedIns) out.l.push('⌥⇧⌫ did not bring the rewound change back');
      if (l.digestBack !== true) out.l.push('the file did not come back to what it held before the rewind');
    } else if (!(l.activeInView === false && l.undoChanges === 0)) {
      out.l.push(
        `THE DROPPED KEYBOARD DID NOT REPRODUCE: keyboard in the view ${String(l.activeInView)}, ${String(l.undoChanges)} changes after ⌥⇧⌫`
      );
    }
  }

  const c = reading.c;
  if (c === undefined) out.c.push('arm C did not run');
  else {
    if (c.drawn !== true) out.c.push('the C fixture did not draw its three changes');
    if (c.marked !== true) out.c.push('arm C could not mark the change it presses');
    if (typeof c.gapMs !== 'number' || c.gapMs > 150) {
      out.c.push(`the two chords went out ${String(c.gapMs)} ms apart, so they were not back to back`);
    }
    if (c.fileHoldsRewind !== true) out.c.push('the file does not hold the rewind');
    if (head) {
      if (c.backwards !== false) out.c.push('THE CHANGE WAS DRAWN BACKWARDS: ⌥↩ accepted the change ⌥⌫ was rewinding');
      if (c.heldSentence === true) {
        if (c.after !== c.before - 1) {
          out.c.push(`the accept was refused with the sentence, yet the picture went from ${String(c.before)} to ${String(c.after)} changes`);
        }
      } else if (c.after !== c.before - 2) {
        out.c.push(
          `the accept neither acted nor said why: ${String(c.before)} -> ${String(c.after)} changes and no "${HELD_ACCEPT}"`
        );
      }
    } else if (c.backwards !== true) {
      out.c.push('THE BACKWARDS CHANGE DID NOT REPRODUCE: no change was drawn with the rewound change’s words swapped');
    }
  }

  const r = reading.r;
  if (r === undefined) out.r.push('arm R did not run');
  else {
    if (r.drawn !== true) out.r.push('the R fixture did not draw its three changes');
    if (r.marked !== true) out.r.push('arm R could not mark the change it presses');
    if (r.firstNotRepeat !== true || r.repeatsSeen !== r.repeats) {
      out.r.push(
        `the page saw ${String(r.repeatsSeen)} repeated ⌥⌫ keydowns of ${String(r.repeats)} sent, first a press ${String(r.firstNotRepeat)}, so the arm did not hold the key`
      );
    }
    if (head) {
      if (r.after !== r.before - 1) {
        out.r.push(`a held ⌥⌫ took the picture from ${String(r.before)} to ${String(r.after)} changes, so a repeat rewound`);
      }
      if (r.oneRewind !== true) {
        out.r.push(`the file is not the one rewind it should be (${String(r.paragraphsMoved)} paragraphs moved)`);
      }
      if (r.unsaved !== false) out.r.push('a repeat reached the document as an edit');
    } else if (r.after === r.before - 1 && r.paragraphsMoved === 1) {
      out.r.push('THE RUNAWAY REPEAT DID NOT REPRODUCE: the held ⌥⌫ rewound exactly one change');
    }
  }

  const t = reading.t;
  if (t === undefined) out.t.push('arm T did not run');
  else {
    if (t.precondition !== true) out.t.push('the document did not draw the file before typing, so there was no known text to type into');
    if (head) {
      if (t.typedCurrent !== true) out.t.push('the word and Enter are not in the document in order at the caret');
      if (t.caret !== true) out.t.push('the caret is not after what was typed');
      if (t.insertion !== true) out.t.push('the typed word is not drawn as an insertion');
      if (t.savedExact !== true) out.t.push('⌘S did not put exactly what was typed on disk');
    } else if (t.typedCurrent === true && t.savedExact === true) {
      out.t.push('THE SCRAMBLE DID NOT REPRODUCE: the burst reached the file in order');
    }
  }

  // PHASE 282.2. U IS GRADED ONE WAY ROUND, at HEAD, and not at all at PR 28's
  // head, which has no hold to linger. Its findings against the Phase 282.1
  // bytes are the parent reading, so the first claim is worded as that reading
  // and carries the sentence the app said. The fixture findings come first for
  // the reason they do above: a keystroke that reached the page after the
  // write, or a first ⌥↩ pressed before the rewind's own watcher tick had been
  // spent, leaves nothing lingering to measure on either build.
  const u = reading.u;
  if (head) {
    if (u === undefined) out.u.push('arm U did not run');
    else {
      if (u.seam !== true) {
        out.u.push('window.__gmuxP277 is not on this page, so the tab’s dirty flag and its savedContents were not read');
      }
      if (u.drawn !== true) out.u.push('the U fixture did not draw its three changes');
      if (u.marked !== true) out.u.push('arm U could not mark the change it presses with the caret in the document');
      if (u.cleanAtPress !== true) out.u.push('the tab was not clean at the press, so the rewind was refused rather than raced');
      if (u.typedInside !== true) {
        out.u.push('the keystroke was not delivered in the chord’s own task, so nothing was typed inside the write');
      }
      if (u.landedDirty !== true) {
        out.u.push(
          `the write did not land on a dirty tab that still draws the change (dirty ${String(u.dirtyAtLanding)}, file holds the rewind ${String(u.fileAtLanding)}, still drawn ${String(u.drawnAtLanding)}), so no hold was left to linger`
        );
      }
      if (typeof u.waitedMs !== 'number' || typeof u.debounceMs !== 'number' || u.waitedMs < 3 * u.debounceMs) {
        out.u.push(
          `the first ⌥↩ came ${String(u.waitedMs)} ms after the write, inside three debounce windows of ${String(u.debounceMs)} ms, so the rewind’s own tick may not have been spent`
        );
      }
      if (u.dirtySentence !== true) {
        out.u.push(`⌥↩ on the dirty tab did not name the way out, "${WAY_OUT}" (toasts ${JSON.stringify(u.toastsWhileDirty ?? [])})`);
      }
      if (u.cleanAfterUndo !== true) out.u.push(`⌘Z did not bring the tab back to clean in ${String(u.undoPresses)} presses`);
      if (u.heldAfterUndo === true) {
        out.u.push(
          `UNDO IS NOT A WAY OUT: ${String(u.undoToAcceptMs)} ms after ⌘Z made the tab clean, ⌥↩ answered "${HELD_ACCEPT}"`
        );
      } else if (u.accepted !== true) {
        out.u.push(
          `the accept after the undo neither landed nor said why: ${String(u.before)} -> ${String(u.after)} changes, toasts ${JSON.stringify(u.toastsAfterUndo ?? [])}`
        );
      }
      if (u.rewoundStillDrawn !== false) out.u.push('the picture still draws the rewound change after the undo');
      if (u.diskIsRewind !== true) out.u.push('the file on disk is not the rewound text');
      if (u.savedIsDisk !== true) {
        out.u.push('the tab’s savedContents is not what the disk holds, so no read followed the undo');
      }
    }
  }

  // PHASE 282.2's FIX ROUND. Z IS GRADED LIKE U: one way round, at HEAD, and
  // its findings against a build without the fix ARE the parent reading. The
  // fixture findings come first, and one of them is the arm's own: two ⌘Z that
  // did not leave the tab dirty un-applied nothing, so there was no press too
  // many to take back.
  const z = reading.z;
  if (head) {
    if (z === undefined) out.z.push('arm Z did not run');
    else {
      if (z.seam !== true) {
        out.z.push('window.__gmuxP277 is not on this page, so the tab’s dirty flag and its savedContents were not read');
      }
      if (z.drawn !== true) out.z.push('the Z fixture did not draw its three changes');
      if (z.marked !== true) out.z.push('arm Z could not mark the change it presses with the caret in the document');
      if (z.cleanAtPress !== true) out.z.push('the tab was not clean at the press, so the rewind was refused rather than raced');
      if (z.typedInside !== true) {
        out.z.push('the keystroke was not delivered in the chord’s own task, so nothing was typed inside the write');
      }
      if (z.landedDirty !== true) {
        out.z.push(
          `the write did not land on a dirty tab that still draws the change (dirty ${String(z.dirtyAtLanding)}, file holds the rewind ${String(z.fileAtLanding)}, still drawn ${String(z.drawnAtLanding)}), so no hold was left to lose`
        );
      }
      if (typeof z.waitedMs !== 'number' || typeof z.debounceMs !== 'number' || z.waitedMs < 3 * z.debounceMs) {
        out.z.push(
          `the held ⌘Z came ${String(z.waitedMs)} ms after the write, inside three debounce windows of ${String(z.debounceMs)} ms, so the rewind’s own tick may not have been spent`
        );
      }
      if (z.dirtyAfterHeld !== true) {
        out.z.push('the held ⌘Z did not leave the tab dirty, so the second undo un-applied nothing and there was no press too many to take back');
      }
      if (z.cleanAfterRedo !== true) out.z.push(`⌘⇧Z did not bring the tab back to clean in ${String(z.redoPresses)} presses`);
      if (z.rewoundDrawnAfterRedo !== false) {
        out.z.push(
          `A PRESS TOO MANY LOSES THE WAY OUT: ${String(z.letGoCapMs)} ms after ⌘⇧Z made the tab clean the picture still draws the rewound change, and savedContents is the disk’s ${String(z.savedIsDiskAfterRedo)}`
        );
      }
      if (z.acceptedRewound === true) {
        out.z.push(
          `⌥↩ ACCEPTED THE CHANGE THE PERSON HAD REWOUND, with toasts ${JSON.stringify(z.toastsAtAccept ?? [])}: ${String(z.before)} -> ${String(z.after)} changes while the disk held the rewind`
        );
      } else if (z.accepted !== true) {
        out.z.push(
          `the accept after ⌘⇧Z neither landed nor said why: ${String(z.before)} -> ${String(z.after)} changes, toasts ${JSON.stringify(z.toastsAtAccept ?? [])}`
        );
      }
      if (z.backwardsAfterOutsideWrite !== false) {
        out.z.push('THE REWIND WAS DRAWN BACKWARDS once the repository was read again: the agent’s word struck through and the person’s own rewind as the insertion');
      }
      if (z.diskIsRewind !== true) out.z.push('the file on disk is not the rewound text');
      if (z.savedIsDisk !== true) out.z.push('the tab’s savedContents is not what the disk holds at the end');
    }
  }

  // PHASE 297. X IS GRADED LIKE U AND Z: one way round, at HEAD, and its
  // findings against a build with the defect ARE the parent reading. Every
  // sub-arm is graded on its own, because the matrix is the point — a fix that
  // closes the corner where the arriving tab has a buffer and leaves the corner
  // where it has none is the shape Phase 282's own guard already had.
  //
  // THE FIXTURE FINDINGS COME FIRST AND THEY STOP THE SUB-ARM, because every
  // claim after them is about a gesture that did not happen: two pictures that
  // never drew, a tab that was not on the strip, a click that did not arrive, or
  // a keystroke that never reached the departing buffer each mean this sub-arm
  // measured nothing rather than that it passed.
  //
  // ONE READING IS PRINTED AND NOT GRADED, and that is deliberate: the page
  // drawing the departing file's words for a frame is ./live-text's one-render
  // lag, which the entry defers with its own reasons ("No change to
  // live-text.ts"). What IS graded is the picture at the LAST settled reading,
  // because a lag a person cannot see is a frame and a lag that is still there
  // at 1200 ms is the defect.
  const x = reading.x;
  if (head) {
    if (x === undefined) out.x.push('arm X did not run');
    else {
      if (x.seam !== true) {
        out.x.push('window.__gmuxP277 is not on this page, so no tab’s buffer, dirty flag or savedContents was read');
      }
      const subs = x.subs ?? [];
      if (subs.length === 0) out.x.push('arm X drove no sub-arm');
      for (const s of subs) {
        const at = `X ${String(s.name)}`;
        if (s.drawnBoth !== true) {
          out.x.push(
            `${at}: the two fixtures did not both draw their ${String(X_CHANGES)} changes (${String(s.aChanges)} in ${String(s.a)}, ${String(s.bChanges)} in ${String(s.b)}), so this sub-arm measured nothing`
          );
          continue;
        }
        if (s.clicked !== true) {
          out.x.push(`${at}: ${String(s.b)} was not on the tab strip to click, so this sub-arm measured nothing`);
          continue;
        }
        if (s.arrived !== true) {
          out.x.push(
            `${at}: the click never made ${String(s.b)} the active tab (${JSON.stringify(s.settled)}), so this sub-arm measured nothing`
          );
          continue;
        }
        if (s.typedInA === false) {
          out.x.push(`${at}: the keystroke never reached ${String(s.a)}’s buffer, so there was no edit to leak`);
          continue;
        }
        // THE RECORDER KEPT NOTHING IS A FINDING AND NOT A CLEAN READING. The
        // strongest claim below is over the value history, so a recorder that
        // recorded none would leave the corner where the write lasts one task
        // graded on its settled value alone, which is the reading the attack
        // showed heals itself.
        if (s.sampled !== true) {
          out.x.push(
            `${at}: the recorder kept no values (${String(s.bEver?.length ?? 0)} of ${String(s.b)}, ${String(s.drawnEver?.length ?? 0)} of the page), so the buffer’s history was never read`
          );
          continue;
        }
        if (s.bHoldsOthersText === true) {
          out.x.push(
            `${at}: ${String(s.b)}’s buffer held ${String(s.a)}’s text — every value it held from before the click was ${JSON.stringify(s.bEver)}`
          );
        }
        if (s.drawnKeptOthers === true) {
          out.x.push(
            `${at}: the page was still drawing ${String(s.a)}’s text in ${String(s.b)} at the last settled reading (${JSON.stringify(s.settled)})`
          );
        }
        if (s.bDirtyUnasked === true) {
          out.x.push(
            `${at}: ${String(s.b)} read unsaved although nothing was typed in it (dirty before ${String(s.bBeforeSwitch?.dirty)}, after ${JSON.stringify(s.settled.map((r) => r.dirty))})`
          );
        }
        if (s.diskOfBIsOwn !== true) {
          out.x.push(
            `${at}: ⌘S on ${String(s.b)} left ${String(s.diskOfB)} on disk${s.charsOverB > 0 ? `, ${String(s.charsOverB)} characters over ${String(s.b)}` : ''}, with toasts ${JSON.stringify(s.toastsAtSave)} and confirm ${JSON.stringify(s.confirmAtSave)}`
          );
        }
        if (s.diskOfAIsExpected !== true) {
          out.x.push(`${at}: ${String(s.a)} on disk is ${String(s.diskOfA)} where it should be ${String(s.diskOfAExpected)}`);
        }
      }
    }
  }
  return out;
}
/** Every finding of the arms named, or of all eight when none is. */
const armFindings = (graded, arms = ['O', 'L', 'C', 'R', 'T', 'U', 'Z', 'X']) =>
  arms.flatMap((a) => graded[a.toLowerCase()] ?? []);

if (process.argv.includes('--self-test')) {
  const head = {
    mode: 'head',
    startChanges: 8,
    acceptWaitMs: 20,
    rewindWaitMs: 25,
    startDels: ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'],
    acceptsMovedFile: false,
    rewindMovedFile: true,
    acceptsAfterRewindMovedFile: false,
    a1: { currentIndex: 0, currentCount: 1 },
    loopUp: { currentIndex: 7 },
    loopDown: { currentIndex: 0 },
    accept1: { changes: 7, currentIndex: 0, currentCount: 1, activeIndex: 0, activeIsChange: true, chipDrawn: true, dels: ['bravo', 'charlie', 'delta'] },
    accept2: { changes: 6, currentIndex: 0, dels: ['charlie', 'delta'] },
    rewind: { changes: 5, currentIndex: 0, currentCount: 1, activeIndex: 0, activeIsChange: true, dels: ['delta', 'echo'] },
    loopUp2: { currentIndex: 4 },
    loopDown2: { currentIndex: 0 },
    end: { changes: 0 },
    emptyAccept: { changes: 0, activeInView: true },
    emptyStep: { changes: 0, currentCount: 0 }
  };
  const parent = {
    mode: 'parent',
    startChanges: 8,
    acceptsMovedFile: false,
    rewindMovedFile: true,
    acceptWaitMs: 20,
    rewindWaitMs: 20,
    a1: { currentIndex: 0, currentCount: 1 },
    loopUp: { currentIndex: 0 },
    loopDown: { currentIndex: 7 },
    accept1: { changes: 7, currentCount: 0, activeIsChange: false },
    accept2: { changes: 7 },
    rewind: { changes: 6, currentCount: 0, activeIsChange: false }
  };
  const cases = [
    ['the shipping shape at HEAD', grade(head, 'head'), 0],
    ['the loop did not happen, which is the parent', grade({ ...head, loopUp: { currentIndex: 0 } }, 'head'), 1],
    ['the second ⌥↩ accepted nothing, which is the parent', grade({ ...head, accept2: { changes: 7, dels: ['charlie'] } }, 'head'), 2],
    ['the accept landed on the wrong change', grade({ ...head, accept1: { ...head.accept1, dels: ['delta'] } }, 'head'), 1],
    ['the rewind did not move on', grade({ ...head, rewind: { ...head.rewind, currentCount: 0, currentIndex: -1 } }, 'head'), 2],
    ['the rewind did not write the file', grade({ ...head, rewindMovedFile: false }, 'head'), 1],
    ['the rewind is much slower than the accept, which is the complaint', grade({ ...head, rewindWaitMs: 700 }, 'head'), 1],
    ['an accept wrote the file', grade({ ...head, acceptsMovedFile: true }, 'head'), 1],
    ['the arrows stopped marking something on an empty redline', grade({ ...head, emptyStep: { changes: 0, currentCount: 1 } }, 'head'), 1],
    ['the parent shape, graded as the parent', grade(parent, 'parent'), 0],
    ['the parent shape graded as HEAD, which is the defect', grade(parent, 'head'), 15],
    ['the parent looped, which is the feature', grade({ ...parent, loopUp: { currentIndex: 7 }, loopDown: { currentIndex: 1 } }, 'parent'), 2]
  ];

  // PHASE 282's ARMS. `armsHead` is what the fixed build reads and `armsPr28`
  // is what PR 28's head read in the review of 2026-09-17: the move one change
  // early, the keyboard on the body, the accepted-then-rewound change drawn
  // backwards, a held ⌥⌫ taking all three changes, and a scrambled save.
  const armsHead = {
    o: {
      drawn: true,
      marked: true,
      writeToKeyMs: 2,
      agentDrawnAtPress: false,
      pressedIns: 'lima',
      followerIns: 'mike',
      beforeIns: 'kilo',
      landedOn: 'mike',
      activeOnCurrent: true,
      fileAsExpected: true
    },
    l: { remaining: 1, keyboardOnChange: true, pressedIns: 'kilo', rewound: true, activeInView: true, activeClass: 'ed-redline-scroll', undoChanges: 1, undoIns: 'kilo', digestBack: true },
    c: { drawn: true, marked: true, gapMs: 6, before: 4, after: 3, backwards: false, heldSentence: true, fileHoldsRewind: true },
    r: { drawn: true, marked: true, repeats: 6, firstNotRepeat: true, repeatsSeen: 6, before: 3, after: 2, paragraphsMoved: 1, oneRewind: true, unsaved: false },
    t: { precondition: true, typedCurrent: true, caret: true, insertion: true, savedExact: true },
    u: {
      seam: true,
      drawn: true,
      marked: true,
      cleanAtPress: true,
      typedInside: true,
      landedDirty: true,
      dirtyAtLanding: true,
      fileAtLanding: true,
      drawnAtLanding: true,
      debounceMs: 150,
      waitedMs: 2600,
      dirtySentence: true,
      toastsWhileDirty: [`A change in ${NOTES} was rewound, but your unsaved edits still show it, so nothing was accepted. ${WAY_OUT}, then accept.`],
      undoPresses: 1,
      cleanAfterUndo: true,
      undoToAcceptMs: 420,
      heldAfterUndo: false,
      toastsAfterUndo: [],
      before: 2,
      after: 1,
      accepted: true,
      rewoundStillDrawn: false,
      diskIsRewind: true,
      savedIsDisk: true
    },
    z: {
      seam: true,
      drawn: true,
      marked: true,
      cleanAtPress: true,
      typedInside: true,
      landedDirty: true,
      dirtyAtLanding: true,
      fileAtLanding: true,
      drawnAtLanding: true,
      debounceMs: 150,
      waitedMs: 2600,
      dirtyAfterHeld: true,
      secondUndoInsideTheRead: true,
      redoPresses: 1,
      cleanAfterRedo: true,
      letGoCapMs: 1500,
      letGoMs: 14,
      rewoundDrawnAfterRedo: false,
      savedIsDiskAfterRedo: true,
      toastsAtAccept: [],
      before: 2,
      after: 1,
      accepted: true,
      acceptedRewound: false,
      backwardsAfterOutsideWrite: false,
      diskIsRewind: true,
      savedIsDisk: true
    }
  };
  // PHASE 297. One sub-arm of X as the fixed build reads it, and the leak as
  // every release from 0.102.0 reads it: the arriving buffer holding the
  // departing file's text, the picture still drawing it at 1200 ms, an unsaved
  // flag nobody asked for, and ⌘S putting those bytes on the other file's disk.
  const xClean = {
    name: 'dirty',
    a: 'x1a.txt',
    b: 'x1b.txt',
    drawnBoth: true,
    aChanges: 8,
    bChanges: 8,
    clicked: true,
    arrived: true,
    typedInA: true,
    bBeforeSwitch: { dirty: false, buffer: 'x1b.txt', saved: 'x1b.txt', mode: 'redline' },
    settled: [
      { ms: 150, at: 162, drawn: 'x1b.txt', dirty: false, buffer: 'x1b.txt', changes: 8, active: true },
      { ms: 1200, at: 1213, drawn: 'x1b.txt', dirty: false, buffer: 'x1b.txt', changes: 8, active: true }
    ],
    bEver: [{ ms: 0, text: 'none' }, { ms: 41, text: 'x1b.txt' }],
    aEver: [{ ms: 0, text: 'x1a.txt+x' }],
    bHoldsOthersText: false,
    drawnKeptOthers: false,
    drawnBothMarks: false,
    drawnEver: [{ ms: 0, chars: 2014, 'x1a.txt': true, 'x1b.txt': false }, { ms: 27, chars: 2014, 'x1a.txt': false, 'x1b.txt': true }],
    sampled: true,
    bDirtyUnasked: false,
    diskOfB: 'x1b.txt',
    diskOfBIsOwn: true,
    charsOverB: 0,
    diskOfA: 'x1a.txt',
    diskOfAExpected: 'x1a.txt',
    diskOfAIsExpected: true,
    toastsAtSave: [],
    confirmAtSave: null
  };
  const xLeak = {
    ...xClean,
    settled: [
      { ms: 150, at: 158, drawn: 'x1a.txt+x', dirty: true, buffer: 'x1a.txt+x', changes: 8, active: true },
      { ms: 1200, at: 1209, drawn: 'x1a.txt+x', dirty: true, buffer: 'x1a.txt+x', changes: 8, active: true }
    ],
    bEver: [{ ms: 0, text: 'none' }, { ms: 3, text: 'x1a.txt+x' }],
    bHoldsOthersText: true,
    drawnKeptOthers: true,
    drawnBothMarks: true,
    bDirtyUnasked: true,
    diskOfB: 'x1a.txt+x',
    diskOfBIsOwn: false,
    charsOverB: 1008
  };
  armsHead.x = {
    seam: true,
    subs: [xClean, { ...xClean, name: 'control', typedInA: null }]
  };
  // PHASE 282.2's FIX ROUND. What the build before it read, from the attack
  // verifier's own arm X at HEAD and at the 282.1 bytes alike: after ⌘⇧Z the
  // tab is clean over the agent's bytes, nothing reads, the rewound change is
  // the current change, ⌥↩ takes it with no sentence (3 -> 2), and an outside
  // write draws it backwards.
  const zBeforeTheFix = {
    ...armsHead.z,
    letGoMs: -1,
    rewoundDrawnAfterRedo: true,
    savedIsDiskAfterRedo: false,
    before: 3,
    after: 2,
    accepted: true,
    acceptedRewound: true,
    backwardsAfterOutsideWrite: true
  };
  // What the Phase 282.1 bytes read, from the reverify's own drive of this
  // shape (docs/BACKLOG.md `## Phase 282.2`): clean after ⌘Z, the held sentence
  // on the next ⌥↩, the rewound change still drawn from the trailing buffer,
  // and `savedContents` still the agent's text while the disk holds the rewind.
  const u2821 = {
    ...armsHead.u,
    heldAfterUndo: true,
    toastsAfterUndo: [HELD_ACCEPT],
    before: 3,
    after: 3,
    accepted: false,
    rewoundStillDrawn: true,
    savedIsDisk: false
  };
  const armsPr28 = {
    o: { ...armsHead.o, landedOn: 'kilo' },
    l: { ...armsHead.l, activeInView: false, activeClass: 'BODY', undoChanges: 0, undoIns: null, digestBack: false },
    c: { ...armsHead.c, before: 3, after: 3, backwards: true, heldSentence: false },
    r: { ...armsHead.r, after: 0, paragraphsMoved: 3, oneRewind: false },
    t: { ...armsHead.t, typedCurrent: false, caret: false, savedExact: false }
  };
  const arm = (fixture, mode, arms) => armFindings(gradeArms(fixture, mode), arms);
  const FIVE = ['O', 'L', 'C', 'R', 'T'];
  const refusals = (raw, parentMode) => {
    const chosen = armsFrom(raw, parentMode);
    return chosen.refusal === null ? [] : [chosen.refusal];
  };
  cases.push(
    ['PHASE 282: the arms at HEAD, graded as HEAD', arm(armsHead, 'head'), 0],
    ['PHASE 282: the five arms at PR 28’s head, graded as PR 28’s head', arm(armsPr28, 'pr28'), 0],
    ['PHASE 282: HEAD graded as PR 28’s head, so no defect reproduced, and U, Z and X are not graded there', arm(armsHead, 'pr28'), 5],
    ['PHASE 282: PR 28’s head graded as HEAD, which is every defect', arm(armsPr28, 'head', FIVE), 11],
    ['PHASE 282: no arm ran', arm({}, 'head'), 8],
    ['U: the Phase 282.1 bytes, where the hold lingers: held, still drawn, and no read', arm({ ...armsHead, u: u2821 }, 'head', ['U']), 3],
    ['U: and the first of those findings is the sentence the app said', [arm({ ...armsHead, u: u2821 }, 'head', ['U'])[0]?.includes(`⌥↩ answered "${HELD_ACCEPT}"`) === true ? null : 'it is not'].filter((x) => x !== null), 0],
    ['U: the keystroke reached the page after the write, so nothing lingered', arm({ ...armsHead, u: { ...armsHead.u, landedDirty: false, drawnAtLanding: false } }, 'head', ['U']), 1],
    ['U: the keystroke was never delivered in the chord’s task', arm({ ...armsHead, u: { ...armsHead.u, typedInside: false } }, 'head', ['U']), 1],
    ['U: the first ⌥↩ came inside three debounce windows', arm({ ...armsHead, u: { ...armsHead.u, waitedMs: 300 } }, 'head', ['U']), 1],
    ['U: the dirty tab’s ⌥↩ did not name the way out', arm({ ...armsHead, u: { ...armsHead.u, dirtySentence: false, toastsWhileDirty: [HELD_ACCEPT] } }, 'head', ['U']), 1],
    ['U: ⌘Z never made the tab clean', arm({ ...armsHead, u: { ...armsHead.u, cleanAfterUndo: false, undoPresses: 5 } }, 'head', ['U']), 1],
    ['U: the accept after the undo took nothing and said nothing', arm({ ...armsHead, u: { ...armsHead.u, accepted: false, before: 2, after: 2 } }, 'head', ['U']), 1],
    ['U: the accept landed but the tab never read the disk', arm({ ...armsHead, u: { ...armsHead.u, savedIsDisk: false } }, 'head', ['U']), 1],
    ['U: the Phase 277 drive is not on the page', arm({ ...armsHead, u: { ...armsHead.u, seam: false } }, 'head', ['U']), 1],
    ['U alone: the five arms that did not run are not findings', arm({ u: armsHead.u }, 'head', ['U']), 0],
    ['Z: the build before the fix round: still drawn, accepted unsaid, and drawn backwards', arm({ ...armsHead, z: zBeforeTheFix }, 'head', ['Z']), 3],
    ['Z: and the first of those findings is the lost way out', [arm({ ...armsHead, z: zBeforeTheFix }, 'head', ['Z'])[0]?.includes('A PRESS TOO MANY LOSES THE WAY OUT') === true ? null : 'it is not'].filter((x) => x !== null), 0],
    ['Z: the held ⌘Z left the tab clean, so there was no press too many', arm({ ...armsHead, z: { ...armsHead.z, dirtyAfterHeld: false } }, 'head', ['Z']), 1],
    ['Z: ⌘⇧Z never made the tab clean', arm({ ...armsHead, z: { ...armsHead.z, cleanAfterRedo: false, redoPresses: 3 } }, 'head', ['Z']), 1],
    ['Z: the accept after ⌘⇧Z took nothing and said nothing', arm({ ...armsHead, z: { ...armsHead.z, accepted: false, before: 2, after: 2 } }, 'head', ['Z']), 1],
    ['Z: the repeat landed AFTER the read, which the arm prints and does not grade', arm({ ...armsHead, z: { ...armsHead.z, secondUndoInsideTheRead: false } }, 'head', ['Z']), 0],
    ['Z: the keystroke reached the page after the write, so no hold was left to lose', arm({ ...armsHead, z: { ...armsHead.z, landedDirty: false, drawnAtLanding: false } }, 'head', ['Z']), 1],
    ['Z is not graded at PR 28’s head', arm({ z: zBeforeTheFix }, 'pr28', ['Z']), 0],
    ['THE KNOB: unset is every arm', [armsFrom('', '').arms.join('') === 'HOLCRTUZX' ? null : 'it is not'].filter((x) => x !== null), 0],
    ['THE KNOB: unset at PR 28’s head leaves U, Z and X out', [armsFrom('', '282').arms.join('') === 'HOLCRT' ? null : 'it does not'].filter((x) => x !== null), 0],
    ['THE KNOB: Z alone stands, and Z at PR 28’s head is refused', [...refusals('z', ''), ...(refusals('Z', '282').length === 1 ? [] : ['it is not refused'])], 0],
    ['THE KNOB: U alone, in any case and with spaces', [armsFrom(' u ', '').arms.join('') === 'U' ? null : 'it is not'].filter((x) => x !== null), 0],
    ['THE KNOB: the arms run in their own order whatever order names them', [armsFrom('U,T,R', '').arms.join('') === 'RTU' ? null : 'they do not'].filter((x) => x !== null), 0],
    ['THE KNOB: O without H is refused', refusals('O,U', ''), 1],
    ['THE KNOB: L without O is refused', refusals('H,L', ''), 1],
    ['THE KNOB: C without H is refused', refusals('C', ''), 1],
    // PHASE 297 took X, so the letter that is no arm is Q. The case is here to
    // prove the refusal still fires, not to reserve a letter.
    ['THE KNOB: a letter that is no arm is refused', refusals('U,Q', ''), 1],
    ['THE KNOB: U at PR 28’s head is refused', refusals('U', '282'), 1],
    ['THE KNOB: X alone stands, and X at PR 28’s head is refused', [...refusals('x', ''), ...(refusals('X', '282').length === 1 ? [] : ['it is not refused'])], 0],
    ['THE KNOB: X alone is X', [armsFrom(' x ', '').arms.join('') === 'X' ? null : 'it is not'].filter((x) => x !== null), 0],
    ['THE KNOB: any subset under the parent drive is refused', refusals('H', '1'), 1],
    ['THE KNOB: H, O and L together are allowed', refusals('L,O,H', ''), 0],
    ['O: the move landed on the change before, which is the index rule', arm({ ...armsHead, o: armsPr28.o }, 'head'), 1],
    ['O: the watcher had drawn the write before the key, so the arm measured nothing', arm({ ...armsHead, o: { ...armsHead.o, agentDrawnAtPress: true } }, 'head'), 1],
    ['O: the keyboard did not follow the move', arm({ ...armsHead, o: { ...armsHead.o, activeOnCurrent: false } }, 'head'), 1],
    ['L: the keyboard dropped, and the undo it names did nothing', arm({ ...armsHead, l: armsPr28.l }, 'head'), 3],
    ['L: the keyboard stayed but the undo did not bring the change back', arm({ ...armsHead, l: { ...armsHead.l, undoChanges: 0, digestBack: false } }, 'head'), 2],
    ['C: the change was drawn backwards', arm({ ...armsHead, c: { ...armsHead.c, backwards: true } }, 'head'), 1],
    ['C: the accept was dropped with no sentence', arm({ ...armsHead, c: { ...armsHead.c, heldSentence: false } }, 'head'), 1],
    ['C: the write beat the accept, which then took the change that followed', arm({ ...armsHead, c: { ...armsHead.c, heldSentence: false, after: 2 } }, 'head'), 0],
    ['C: the chords were not back to back', arm({ ...armsHead, c: { ...armsHead.c, gapMs: 400 } }, 'head'), 1],
    ['C: at PR 28’s head the race did not reproduce', arm({ ...armsPr28, c: armsHead.c }, 'pr28'), 1],
    ['R: a repeat rewound a second change', arm({ ...armsHead, r: { ...armsHead.r, after: 1, paragraphsMoved: 2, oneRewind: false } }, 'head'), 2],
    ['R: a consumed repeat reached the document as an edit', arm({ ...armsHead, r: { ...armsHead.r, unsaved: true } }, 'head'), 1],
    ['R: the page never saw a repeated keydown, so the key was not held', arm({ ...armsHead, r: { ...armsHead.r, repeatsSeen: 0 } }, 'head'), 1],
    ['T: the save wrote something other than what was typed', arm({ ...armsHead, t: { ...armsHead.t, savedExact: false } }, 'head'), 1],
    ['T: the document never drew the file, so nothing was measured', arm({ ...armsHead, t: { ...armsHead.t, precondition: false } }, 'head'), 1],
    ['X: both sub-arms at HEAD', arm(armsHead, 'head', ['X']), 0],
    ['X: THE PARENT READING: the buffer, the picture, the unsaved flag and the disk', arm({ x: { seam: true, subs: [xLeak] } }, 'head', ['X']), 4],
    ['X: and the first of those findings names the buffer and every value it held', [arm({ x: { seam: true, subs: [xLeak] } }, 'head', ['X'])[0]?.includes('x1b.txt’s buffer held x1a.txt’s text') === true ? null : 'it does not'].filter((v) => v !== null), 0],
    ['X: the leak in the control, where nothing was typed at all', arm({ x: { seam: true, subs: [{ ...xLeak, name: 'control', typedInA: null }] } }, 'head', ['X']), 4],
    ['X: ⌘S wrote the other file’s bytes and nothing else moved', arm({ x: { seam: true, subs: [{ ...xClean, diskOfB: 'x1a.txt+x', diskOfBIsOwn: false, charsOverB: 1008 }] } }, 'head', ['X']), 1],
    ['X: the picture still drew the other file at the last settled reading', arm({ x: { seam: true, subs: [{ ...xClean, drawnKeptOthers: true }] } }, 'head', ['X']), 1],
    ['X: the arriving tab read unsaved with nothing typed in it', arm({ x: { seam: true, subs: [{ ...xClean, bDirtyUnasked: true }] } }, 'head', ['X']), 1],
    ['X: the departing file’s own bytes moved', arm({ x: { seam: true, subs: [{ ...xClean, diskOfA: 'x1a.txt+x', diskOfAIsExpected: false }] } }, 'head', ['X']), 1],
    ['X: THE FLASH is printed and not graded, being ./live-text’s one render', arm({ x: { seam: true, subs: [{ ...xClean, drawnBothMarks: true }] } }, 'head', ['X']), 0],
    ['X: a sub-arm whose fixtures never drew measured nothing, and its later clauses are not asked', arm({ x: { seam: true, subs: [{ ...xLeak, drawnBoth: false, aChanges: 0 }] } }, 'head', ['X']), 1],
    ['X: the tab was not on the strip', arm({ x: { seam: true, subs: [{ ...xLeak, clicked: false }] } }, 'head', ['X']), 1],
    ['X: the click never arrived at the other tab', arm({ x: { seam: true, subs: [{ ...xLeak, arrived: false }] } }, 'head', ['X']), 1],
    ['X: the keystroke never reached the departing buffer', arm({ x: { seam: true, subs: [{ ...xLeak, typedInA: false }] } }, 'head', ['X']), 1],
    ['X: the recorder kept nothing, so the history was never read and the corner is not called clean', arm({ x: { seam: true, subs: [{ ...xClean, sampled: false, bEver: [], drawnEver: [] }] } }, 'head', ['X']), 1],
    ['X: the Phase 277 drive is not on the page', arm({ x: { seam: false, subs: [xClean] } }, 'head', ['X']), 1],
    ['X: no sub-arm ran', arm({ x: { seam: true, subs: [] } }, 'head', ['X']), 1],
    ['X: six sub-arms and one of them leaks', arm({ x: { seam: true, subs: [xClean, xClean, xClean, xLeak, xClean, xClean] } }, 'head', ['X']), 4],
    ['X is not graded at PR 28’s head', arm({ x: { seam: true, subs: [xLeak] } }, 'pr28', ['X']), 0],
    ['X alone: the arms that did not run are not findings', arm({ x: armsHead.x }, 'head', ['X']), 0]
  );
  // THE FIXTURE TEXTS the arms write, proved here rather than in the app: the
  // paragraph walk that every arm's expected file is computed with round trips,
  // sets exactly the marker it was given, and counts exactly the paragraphs
  // that moved. An arm's whole claim about the file rests on these three.
  const base = version(1);
  const one = withMarkers(base, [[4, 'lima']]);
  const two = withMarkers(one, [[1, 'kilo'], [8, 'mike']]);
  cases.push(
    ['the paragraph walk round trips the fixture', [paragraphsOf(base).join('\n\n') === base ? null : 'it did not'].filter((x) => x !== null), 0],
    ['eight paragraphs, and the marker of each is read back', [paragraphsOf(base).length === 8 && markerOf(base, 1) === 'bravo' && markerOf(base, 8) === 'alpha' ? null : 'it did not'].filter((x) => x !== null), 0],
    ['one marker set moves exactly one paragraph', [paragraphsMoved(base, one) === 1 && markerOf(one, 4) === 'lima' ? null : `moved ${String(paragraphsMoved(base, one))}`].filter((x) => x !== null), 0],
    ['two more markers move exactly two', [paragraphsMoved(one, two) === 2 && paragraphsMoved(base, two) === 3 ? null : `moved ${String(paragraphsMoved(one, two))}`].filter((x) => x !== null), 0],
    ['a text with a paragraph added is not compared paragraph by paragraph', [paragraphsMoved(base, `${base}\n\nParagraph 9.\n`) === -1 ? null : 'it was'].filter((x) => x !== null), 0]
  );

  let bad = 0;
  for (const [name, found, want] of cases) {
    const ok = found.length === want;
    if (!ok) bad += 1;
    say(`${ok ? 'pass' : 'FAIL'}  self-test: ${name} -> ${String(found.length)} finding(s), wanted ${String(want)}`);
  }
  say(`${String(cases.length - bad)} of ${String(cases.length)} grader fixtures behaved`);
  process.exit(bad === 0 ? 0 : 1);
}

// PHASE 282.2 moved this above the socket wrapper, so a checkout with no build
// is refused before a scratch tmux server is started for it.
if (!existsSync(join(APP_ROOT, 'out', 'main', 'index.js'))) {
  console.error(
    CHECKOUT === ''
      ? `${TAG} out/main/index.js is missing. Run npm run build.`
      : `${TAG} REDLINEMOVEON_CHECKOUT ${APP_ROOT} holds no build under out/. Build it first.`
  );
  process.exit(2);
}
const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-redlinemoveon', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
say(
  `the build under test: ${APP_ROOT}${CHECKOUT === '' ? '' : ' (REDLINEMOVEON_CHECKOUT)'}, ${PARENT ? 'the parent drive' : `arms ${CHOSEN.arms.join(',')}`}`
);

/**
 * The -L gmux sessions of the machine that runs this probe, read only. It is
 * the operator's machine when the main session runs it and a contributor's when
 * PR 28's author did, so the count is named for the machine and not the person.
 */
const machineSessionCount = () =>
  (spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '').length;
const sessionsBefore = machineSessionCount();
say(`-L gmux sessions on this machine before: ${String(sessionsBefore)}`);

mkdirSync(join(harnessDir, 'moveon'), { recursive: true });
const root = realpathSync(join(harnessDir, 'moveon'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const project = join(root, 'project');
const readingsFile = join(root, 'move-on-readings.json');
for (const d of [home, profile, project]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

const git = (...a) => {
  const r = spawnSync('git', a, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout;
};
/** The write from outside, which is what an agent's write looks like here. */
const shellWrite = (rel, text) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', join(project, rel)], {
    input: text,
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('shell write failed');
};
const digest = (rel) =>
  createHash('sha256').update(readFileSync(join(project, rel))).digest('hex').slice(0, 16);

writeFileSync(join(project, NOTES), version(0));
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'moveon@example.invalid');
git('config', 'user.name', 'moveon');
git('add', '--', NOTES);
git('commit', '-q', '-m', 'the committed draft');

// ---------------------------------------------------------------------------
// The reads, all off the LIVE DOM. `dels` is the whole picture's deleted text
// in document order, which is how an arm of H says WHICH change a press landed
// on: nothing writes the file between H's presses, so a change that left the
// picture leaves the rest in order and the change that followed the pressed one
// is the next one in this list. Phase 282's arms do not lean on that — arm O
// exists because an outside write breaks it — and name every change by the
// word it INSERTS, which each arm chose itself and used nowhere else.
// ---------------------------------------------------------------------------
const FACE = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  const view = document.querySelector('.ed-redline-view');
  const wraps = doc === null ? [] : Array.from(doc.querySelectorAll('.ed-redline-change'));
  const currentIndex = wraps.findIndex((w) => w.hasAttribute('data-current'));
  const active = document.activeElement;
  const activeWrap = active !== null && typeof active.closest === 'function' ? active.closest('.ed-redline-change') : null;
  return {
    mounted: doc !== null,
    changes: wraps.length,
    dels: wraps.map((w) => w.dataset.changeDel ?? ''),
    inss: wraps.map((w) => w.dataset.changeIns ?? ''),
    currentIndex,
    currentCount: wraps.filter((w) => w.hasAttribute('data-current')).length,
    activeIndex: activeWrap === null ? -1 : wraps.indexOf(activeWrap),
    activeIsChange: activeWrap !== null,
    activeInView: active !== null && view !== null && view.contains(active),
    activeClass: active === null ? null : (active.className || active.tagName),
    chipDrawn: document.querySelector('.ed-redline-chip') !== null,
    unsaved: (document.querySelector('.ed-redline-since .banner-text')?.textContent ?? '').includes('unsaved'),
    toasts: Array.from(document.querySelectorAll('.toasts .toast-text')).map((t) => t.textContent ?? '')
  };
})()`;

const clickMode = (label) =>
  `(() => { const b = document.querySelector('.ed-mode[role="radiogroup"] [aria-label="${label}"]'); if (!b || b.disabled) return false; b.click(); return true; })()`;
const docSettled = `(() => document.querySelector('.ed-redline-doc') !== null && document.querySelector('.ed-redline-view .ed-skeleton') === null)()`;
const hasChanges = (n) =>
  `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.querySelectorAll('.ed-redline-change').length === ${String(n)}; })()`;

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: [] });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const until = async (cdp, expr, ms) => {
  const s = Date.now();
  for (;;) {
    let v = null;
    try {
      v = await cdpEval(cdp, expr, 10000);
    } catch {
      v = null;
    }
    if (v === true) return true;
    if (Date.now() - s > ms) return false;
    await sleep(120);
  }
};

/**
 * HOW LONG THE REDRAW TOOK, in milliseconds, polled at roughly one CDP round
 * trip. This is PR 28's author's own complaint of 2026-09-16: "when I option
 * delete instead of option return, the delete takes a little bit of time...
 * option return is instantaneous". The two verbs are timed the same way here
 * so the claim is a pair of numbers rather than an impression, and the head
 * grader holds them against each other.
 */
async function msUntil(cdp, n, capMs, from) {
  const t0 = from ?? Date.now();
  for (;;) {
    let ok = false;
    try {
      ok = (await cdpEval(cdp, hasChanges(n), 10000)) === true;
    } catch {
      ok = false;
    }
    if (ok) return Date.now() - t0;
    if (Date.now() - t0 > capMs) return -1;
    await sleep(20);
  }
}

/**
 * A chord dispatched WITHOUT the trailing sleep `press` takes, so a stopwatch
 * can be started at the keydown rather than 300 ms after it. Returns the
 * moment the keydown went out.
 */
async function pressTimed(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  const t0 = Date.now();
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  return t0;
}
const drive = (cdp, spec) =>
  cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, 90000);
const face = (cdp) => cdpEval(cdp, FACE, 20000);

// CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8.
const CHORD = {
  next: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  prev: { key: 'ArrowUp', code: 'ArrowUp', vk: 38, modifiers: 1 },
  accept: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 1 },
  rewind: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 },
  // PHASE 282's arms. ⌥⇧⌫ is the undo the face names; Enter carries its own
  // text, or Chromium makes no editing command of it and the page sees no
  // `beforeinput` (build/probe-p237-typing.mjs measured it).
  undo: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 1 | 8 },
  save: { key: 's', code: 'KeyS', vk: 83, modifiers: 4 },
  enter: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 0, text: '\r' },
  // PHASE 282.2's arm. ⌘Z is the buffer's own undo, which ./redline-edits takes
  // in the capture phase while the caret is in the document; it is NOT `undo`
  // above, which is the journal's undo of a rewind (build/probe-p237-typing.mjs
  // drives both and spells this one the same way).
  undoTyping: { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 }
};
async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(300);
}

/** Open the fixture file in Redline, for keeps. */
async function openRedline(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'file' });
  await sleep(700);
  await cdpEval(cdp, clickMode('Redline'));
  await until(cdp, docSettled, 20000);
  await sleep(500);
  return face(cdp);
}

const readings = {
  mode: PARENT ? 'parent' : PR28_HEAD ? 'pr28' : 'head',
  // PHASE 282.2. Which build answered and which arms were asked, so a readings
  // file from a parent run cannot be mistaken for one from HEAD.
  appRoot: APP_ROOT,
  arms: PARENT ? [] : CHOSEN.arms
};

/**
 * THE HEAD DRIVE: what this round ships, claim by claim. Every arm reads the
 * live DOM, and the two digests split the file's movement by verb so an accept
 * that wrote and a rewind that did not are both visible.
 */
async function driveHead(cdp) {
  const start = await face(cdp);
  readings.startChanges = start.changes;
  readings.startDels = start.dels;
  check('H0', 'the redline drew the eight edits against the committed draft', start.changes === 8, `${String(start.changes)} changes`);

  await press(cdp, CHORD.next);
  readings.a1 = await face(cdp);
  check(
    'H1',
    'one ⌥↓ marks the first change and puts the keyboard on it',
    readings.a1.currentIndex === 0 && readings.a1.currentCount === 1 && readings.a1.activeIndex === 0,
    `current ${String(readings.a1.currentIndex)}, keyboard ${JSON.stringify(readings.a1.activeClass)}`
  );

  // THE LOOP, both ways, from the ends.
  await press(cdp, CHORD.prev);
  readings.loopUp = await face(cdp);
  check(
    'H2',
    'THE LOOP: ⌥↑ from the first change comes round to the last',
    readings.loopUp.currentIndex === 7 && readings.loopUp.currentCount === 1,
    `current ${String(readings.loopUp.currentIndex)} of ${String(readings.loopUp.changes)}`
  );
  await press(cdp, CHORD.next);
  readings.loopDown = await face(cdp);
  check(
    'H3',
    'and ⌥↓ from the last comes round to the first',
    readings.loopDown.currentIndex === 0,
    `current ${String(readings.loopDown.currentIndex)}`
  );

  // THE ACCEPT, and the point of the round: a second one with no ⌥↓ between.
  const before = await face(cdp);
  const fileBefore = digest(NOTES);
  readings.acceptWaitMs = await msUntil(cdp, 7, 5000, await pressTimed(cdp, CHORD.accept));
  await until(cdp, hasChanges(7), 20000);
  readings.accept1 = await face(cdp);
  const afterAccept = digest(NOTES);
  readings.acceptsMovedFile = afterAccept !== fileBefore;
  check('H4', 'the accept dropped the change it was pressed on', readings.accept1.changes === 7, `${String(before.changes)} -> ${String(readings.accept1.changes)} changes`);
  check('H5', 'and moved not one byte of the file', readings.acceptsMovedFile === false, `digest ${fileBefore} -> ${afterAccept}`);
  check(
    'H6',
    'the change that followed the accepted one is now current, with the keyboard on it and the controls drawn',
    readings.accept1.currentCount === 1 &&
      readings.accept1.dels[readings.accept1.currentIndex] === before.dels[1] &&
      readings.accept1.activeIndex === readings.accept1.currentIndex &&
      readings.accept1.chipDrawn === true,
    `current "${String(readings.accept1.dels[readings.accept1.currentIndex]).slice(0, 30)}", keyboard on ${JSON.stringify(readings.accept1.activeClass)}, chip ${String(readings.accept1.chipDrawn)}`
  );

  await press(cdp, CHORD.accept);
  await until(cdp, hasChanges(6), 20000);
  readings.accept2 = await face(cdp);
  check(
    'H7',
    'THE POINT: ⌥↩ again, with no ⌥↓ in between, accepted the next change',
    readings.accept2.changes === 6 && readings.accept2.dels[readings.accept2.currentIndex] === before.dels[2],
    `${String(readings.accept1.changes)} -> ${String(readings.accept2.changes)} changes`
  );

  // THE REWIND, PR 28's author's second ask: it writes the file AND moves on.
  // The keyboard is already on the change that followed the accept, so this is
  // the chord path PR 28's author uses, with no pointer touched anywhere.
  const beforeRewind = await face(cdp);
  const digestBeforeRewind = digest(NOTES);
  readings.rewindWaitMs = await msUntil(cdp, 5, 20000, await pressTimed(cdp, CHORD.rewind));
  await until(cdp, hasChanges(5), 20000);
  await until(cdp, `document.querySelector('.ed-redline-change[data-current]') !== null`, 8000);
  readings.rewind = await face(cdp);
  const digestAfterRewind = digest(NOTES);
  readings.rewindMovedFile = digestAfterRewind !== digestBeforeRewind;
  check('H8', 'the rewind wrote the file', readings.rewindMovedFile === true, `digest ${digestBeforeRewind} -> ${digestAfterRewind}`);
  note(
    'H8b',
    'HOW LONG EACH VERB TOOK TO REDRAW, from the key to the picture',
    `accept ${String(readings.acceptWaitMs)} ms, rewind ${String(readings.rewindWaitMs)} ms`
  );
  check(
    'H9',
    'THE SECOND ASK: the rewind left the change that followed it current, with the keyboard on it',
    readings.rewind.changes === 5 &&
      readings.rewind.currentCount === 1 &&
      readings.rewind.dels[readings.rewind.currentIndex] === beforeRewind.dels[1] &&
      readings.rewind.activeIndex === readings.rewind.currentIndex,
    `current "${String(readings.rewind.dels[readings.rewind.currentIndex]).slice(0, 30)}", keyboard on ${JSON.stringify(readings.rewind.activeClass)}`
  );

  // And the arrows still loop after a press.
  await press(cdp, CHORD.prev);
  readings.loopUp2 = await face(cdp);
  check(
    'H10',
    'the loop survives a press: ⌥↑ comes round to the last remaining change',
    readings.loopUp2.currentIndex === 4,
    `current ${String(readings.loopUp2.currentIndex)} of ${String(readings.loopUp2.changes)}`
  );
  await press(cdp, CHORD.next);
  readings.loopDown2 = await face(cdp);
  check(
    'H11',
    'and ⌥↓ comes back round to the first',
    readings.loopDown2.currentIndex === 0,
    `current ${String(readings.loopDown2.currentIndex)}`
  );

  // The end: accepts forward until the picture is empty, then every chord is a
  // no-op and the keyboard is still in the view.
  let last = readings.loopDown2;
  for (let i = 0; i < 12 && last.changes > 0; i += 1) {
    await press(cdp, CHORD.accept);
    await until(cdp, hasChanges(last.changes - 1), 20000);
    last = await face(cdp);
  }
  readings.end = last;
  readings.acceptsAfterRewindMovedFile = digest(NOTES) !== digestAfterRewind;
  check('H12', 'accepting forward empties the redline', last.changes === 0, `${String(last.changes)} changes remain`);
  check('H13', 'and no later accept moved a byte of the file', readings.acceptsAfterRewindMovedFile === false, `digest ${digestAfterRewind} -> ${digest(NOTES)}`);
  await press(cdp, CHORD.accept);
  readings.emptyAccept = await face(cdp);
  check('H14', 'a ⌥↩ past the last change is a no-op rather than a wrap to the top', readings.emptyAccept.changes === 0, `${String(readings.emptyAccept.changes)} changes`);
  check('H15', 'and the keyboard is still in the view', readings.emptyAccept.activeInView === true, `keyboard on ${JSON.stringify(readings.emptyAccept.activeClass)}`);
  await press(cdp, CHORD.next);
  await press(cdp, CHORD.prev);
  readings.emptyStep = await face(cdp);
  check(
    'H16',
    'the arrows on an empty redline mark nothing and draw nothing',
    readings.emptyStep.changes === 0 && readings.emptyStep.currentCount === 0,
    `${String(readings.emptyStep.changes)} changes, ${String(readings.emptyStep.currentCount)} marked`
  );
}

/**
 * THE PARENT DRIVE: the build PR 28's author reported against, graded the other
 * way round. It is shorter on purpose — the point is the defect, and every
 * move this round ships is a reading that the parent cannot make.
 */
async function driveParent(cdp) {
  const start = await face(cdp);
  readings.startChanges = start.changes;
  readings.startDels = start.dels;
  check('P0', 'the redline drew the eight edits against the committed draft', start.changes === 8, `${String(start.changes)} changes`);

  await press(cdp, CHORD.next);
  readings.a1 = await face(cdp);
  check('P1', 'one ⌥↓ marks the first change', readings.a1.currentIndex === 0, `current ${String(readings.a1.currentIndex)}`);

  // THE ENDS, read from the two ends. The top is one ⌥↑ away; the bottom is
  // eight ⌥↓ presses (seven steps to the last change, one more that either
  // clamps or loops).
  await press(cdp, CHORD.prev);
  readings.loopUp = await face(cdp);
  for (let i = 0; i < 8; i += 1) await press(cdp, CHORD.next);
  readings.loopDown = await face(cdp);
  note(
    'P2',
    'THE ENDS AT THE PARENT: ⌥↑ at the first change and ⌥↓ at the last',
    `loopUp current ${String(readings.loopUp.currentIndex)} (HEAD loops to 7), loopDown current ${String(readings.loopDown.currentIndex)} (HEAD loops to 1)`
  );

  // THE ACCEPT, chord in and chord out, which is the shape PR 28's author
  // reported: the change at the bottom of the document is the one under the
  // keyboard when the press is made.
  await press(cdp, CHORD.accept);
  await until(cdp, hasChanges(7), 20000);
  readings.accept1 = await face(cdp);
  readings.acceptsMovedFile = false;
  note(
    'P3',
    'the first accept at the parent',
    `changes ${String(readings.accept1.changes)}, current ${String(readings.accept1.currentIndex)}, keyboard on ${JSON.stringify(readings.accept1.activeClass)}, chip ${String(readings.accept1.chipDrawn)}`
  );

  await press(cdp, CHORD.accept);
  await sleep(700);
  readings.accept2 = await face(cdp);
  check(
    'P4',
    'THE DEFECT: a second ⌥↩ with no ⌥↓ accepts nothing',
    readings.accept2.changes === 7,
    `${String(readings.accept1.changes)} -> ${String(readings.accept2.changes)} changes`
  );

  // THE REWIND, chord in as well: one ⌥↓ from nowhere marks the first change.
  await press(cdp, CHORD.next);
  const digestBeforeRewind = digest(NOTES);
  await press(cdp, CHORD.rewind);
  await until(cdp, hasChanges(6), 20000);
  readings.rewind = await face(cdp);
  readings.rewindMovedFile = digest(NOTES) !== digestBeforeRewind;
  note(
    'P5',
    'the rewind at the parent: it writes the file and leaves nothing current',
    `digest moved ${String(readings.rewindMovedFile)}, changes ${String(readings.rewind.changes)}, current ${String(readings.rewind.currentIndex)}, keyboard on ${JSON.stringify(readings.rewind.activeClass)}`
  );
}

// ---------------------------------------------------------------------------
// PHASE 282's ARMS. Each writes its own changes into the scratch file, marks
// the change it presses by the word that change INSERTS, and reads the live DOM
// and the real disk afterwards. Every wait is bounded, so a build that does not
// do what an arm expects still reaches its grade rather than the ceiling.
// ---------------------------------------------------------------------------

const readNotes = () => readFileSync(join(project, NOTES), 'utf8');

/** A person's click on the scroller: the keyboard back in the view, the current change kept. */
const focusHost = `(() => { const s = document.querySelector('.ed-redline-scroll'); if (s === null) return false; s.focus(); return s.contains(document.activeElement); })()`;

async function faceUntil(cdp, test, ms) {
  const started = Date.now();
  let f = await face(cdp);
  while (!test(f) && Date.now() - started < ms) {
    await sleep(60);
    f = await face(cdp);
  }
  return f;
}
/** ⌥↓ until the change inserting `word` is current, at most one lap and a step. */
async function markInserting(cdp, word) {
  let f = await face(cdp);
  for (let i = 0; i <= f.changes + 1 && f.inss[f.currentIndex] !== word; i += 1) {
    await press(cdp, CHORD.next);
    f = await face(cdp);
  }
  return f;
}
/** ⌥↩ forward until `keep` changes remain. Accepts write nothing to the file. */
async function acceptDownTo(cdp, keep) {
  let f = await face(cdp);
  for (let i = 0; i < 16 && f.changes > keep; i += 1) {
    if (f.currentCount === 0) await press(cdp, CHORD.next);
    const n = f.changes;
    await press(cdp, CHORD.accept);
    f = await faceUntil(cdp, (g) => g.changes === n - 1, 8000);
  }
  return f;
}
/** A key down and up with no trailing sleep, carrying its text when it has one. */
async function keyNow(cdp, { key, code, vk, modifiers, text }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  if (text !== undefined) {
    base.text = text;
    base.unmodifiedText = text;
  }
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
/** One printable character, as the char event a page's `beforeinput` sees (build/probe-p237-typing.mjs). */
async function typeChar(cdp, ch) {
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
}

/**
 * Arm T's reads, installed in the page. The CURRENT side is every text leaf of
 * the document outside a deletion, which is the file when the tab is clean;
 * the caret is counted on that side through a Range, so a caret parked on an
 * element boundary after Enter is still an offset rather than the end.
 */
const TYPING_READS = `(() => {
  const doc = () => document.querySelector('.ed-redline-doc');
  const leaves = () => {
    const out = [];
    const walk = document.createTreeWalker(doc(), NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
      if (n.parentElement === null || n.parentElement.closest('[data-redline-del]') === null) out.push(n);
    }
    return out;
  };
  const at = () => {
    const s = getSelection();
    if (s === null || s.rangeCount === 0 || s.focusNode === null || !doc().contains(s.focusNode)) return -1;
    const r = document.createRange();
    r.setStart(doc(), 0);
    r.setEnd(s.focusNode, s.focusOffset);
    let total = 0;
    for (const n of leaves()) {
      if (n === s.focusNode) return total + s.focusOffset;
      if (r.comparePoint(n, n.length) !== 0) break;
      total += n.length;
    }
    return total;
  };
  window.__moveOn = {
    current: () => leaves().map((n) => n.nodeValue).join(''),
    put: (offset) => {
      let total = 0;
      for (const n of leaves()) {
        if (offset <= total + n.length) {
          const r = document.createRange();
          r.setStart(n, offset - total);
          r.collapse(true);
          getSelection().removeAllRanges();
          getSelection().addRange(r);
          doc().focus();
          return true;
        }
        total += n.length;
      }
      return false;
    },
    read: () => ({
      current: leaves().map((n) => n.nodeValue).join(''),
      caret: at(),
      insTexts: Array.from(doc().querySelectorAll('[data-redline-ins]')).map((e) => e.textContent ?? '')
    })
  };
  return true;
})()`;

/** A held key repeats every 30 to 50 ms (build/p282/SPEC.md §1.6); six repeats at 40 ms. */
const REPEATS = 6;
const TYPED = 'swiftly ';
const ARM_MODE = PR28_HEAD ? 'pr28' : 'head';

/** One `check` row for one arm, graded on its own in this run's mode. */
function armCheck(step, key, claimHead, claimPr28, detail) {
  const found = gradeArms(readings, ARM_MODE)[key];
  check(step, PR28_HEAD ? claimPr28 : claimHead, found.length === 0, found.length === 0 ? detail : `${found.join('; ')} (${detail})`);
}

// PHASE 282.2 made each arm its own function, bodies untouched, so
// `REDLINEMOVEON_ARMS` can run a subset; `driveArms` below runs the ones chosen
// in the order they always ran.
async function armO(cdp) {
  // O. AN OUTSIDE WRITE ABOVE THE CURRENT CHANGE, the moment before ⌥⌫. The
  // four changes sit in paragraphs 2, 4, 6 and 8; ⌥⌫ is pressed on paragraph
  // 4's, and the outside write adds a change in paragraph 1, above both it and
  // the change before it, so the index rule and the identity rule land on
  // different changes. The write is this process's own synchronous
  // writeFileSync, on disk before the keyDown leaves, and `agentDrawnAtPress`
  // proves the watcher had not drawn it when the key was read.
  await cdpEval(cdp, focusHost);
  const baseO = readNotes();
  const fileO = withMarkers(baseO, [[2, 'kilo'], [4, 'lima'], [6, 'mike'], [8, 'november']]);
  shellWrite(NOTES, fileO);
  const drawnO = await faceUntil(cdp, (f) => ['kilo', 'lima', 'mike', 'november'].every((w) => f.inss.includes(w)), 20000);
  await cdpEval(cdp, focusHost);
  const markedO = await markInserting(cdp, 'lima');
  const atO = markedO.currentIndex;
  const agentText = paragraphsOf(fileO)
    .map((p, i) => (i === 0 ? p.replace('body carries', 'body holds') : p))
    .join('\n\n');
  writeFileSync(join(project, NOTES), agentText);
  const wroteAt = Date.now();
  const keyAt = await pressTimed(cdp, CHORD.rewind);
  const atPress = await face(cdp);
  const landedO = await faceUntil(
    cdp,
    (f) => f.inss.includes('holds') && !f.inss.includes('lima') && f.currentCount === 1,
    10000
  );
  readings.o = {
    drawn: drawnO.changes === 4 && ['kilo', 'lima', 'mike', 'november'].every((w) => drawnO.inss.includes(w)),
    marked: atO >= 0 && markedO.inss[atO] === 'lima',
    writeToKeyMs: keyAt - wroteAt,
    agentDrawnAtPress: atPress.inss.includes('holds'),
    pressedIns: 'lima',
    followerIns: markedO.inss[atO + 1] ?? null,
    beforeIns: atO > 0 ? (markedO.inss[atO - 1] ?? null) : null,
    landedOn: landedO.currentCount === 1 ? (landedO.inss[landedO.currentIndex] ?? null) : null,
    activeOnCurrent: landedO.currentIndex >= 0 && landedO.activeIndex === landedO.currentIndex,
    changesAfter: landedO.changes,
    fileAsExpected: readNotes() === withMarkers(agentText, [[4, markerOf(baseO, 4)]])
  };
  armCheck(
    'O',
    'o',
    'O. AN OUTSIDE WRITE ABOVE, then ⌥⌫: the move lands on the change that followed, found by its words',
    'O at PR 28’s head: after an outside write above, the move lands on the change BEFORE the one that followed',
    `pressed "lima", follower ${JSON.stringify(readings.o.followerIns)}, before ${JSON.stringify(readings.o.beforeIns)}, landed ${JSON.stringify(readings.o.landedOn)}, write to key ${String(readings.o.writeToKeyMs)} ms`
  );
}

async function armL(cdp) {
  // L. ⌥⌫ ON THE ONLY REMAINING CHANGE. The accepts write nothing, so the file
  // still holds every word O left. One ⌥↓ with a single change comes round to
  // it and puts the keyboard ON its wrapper, which is the element the rewind
  // removes; the undo is pressed with no click, wherever the keyboard was left.
  await cdpEval(cdp, focusHost);
  await acceptDownTo(cdp, 1);
  await press(cdp, CHORD.next);
  const lastOne = await face(cdp);
  const digestL = digest(NOTES);
  await pressTimed(cdp, CHORD.rewind);
  const goneL = await faceUntil(cdp, (f) => f.changes === 0, 10000);
  await sleep(400);
  const restL = await face(cdp);
  const rewoundDigestL = digest(NOTES);
  await press(cdp, CHORD.undo);
  const backL = await faceUntil(cdp, (f) => f.changes === 1, 6000);
  readings.l = {
    remaining: lastOne.changes,
    keyboardOnChange: lastOne.activeIsChange,
    pressedIns: lastOne.inss[lastOne.currentIndex] ?? null,
    rewound: goneL.changes === 0 && rewoundDigestL !== digestL,
    activeInView: restL.activeInView,
    activeClass: restL.activeClass,
    undoChanges: backL.changes,
    undoIns: backL.inss[0] ?? null,
    digestBack: digest(NOTES) === digestL
  };
  armCheck(
    'L',
    'l',
    'L. ⌥⌫ on the only change keeps the keyboard in the view, and ⌥⇧⌫ brings the change back',
    'L at PR 28’s head: the keyboard drops with the last change, and ⌥⇧⌫ does nothing',
    `keyboard on ${JSON.stringify(readings.l.activeClass)}, ${String(readings.l.undoChanges)} change(s) after ⌥⇧⌫, digest back ${String(readings.l.digestBack)}`
  );
}

async function armC(cdp) {
  // C. ⌥⌫ AND ⌥↩ BACK TO BACK on paragraph 5's change, with no redraw awaited.
  // Paragraphs 3, 5 and 7 are ones no arm before this touched, so the file's
  // words there are the baseline's. A change drawn with `papa` DELETED is the
  // accept having taken it and the rewind having landed on top: drawn
  // backwards. The toasts are collected for 2.5 s, because an info toast
  // leaves after five.
  await cdpEval(cdp, focusHost);
  const baseC = readNotes();
  const fileC = withMarkers(baseC, [[3, 'oscar'], [5, 'papa'], [7, 'quebec']]);
  shellWrite(NOTES, fileC);
  const drawnC = await faceUntil(cdp, (f) => ['oscar', 'papa', 'quebec'].every((w) => f.inss.includes(w)), 20000);
  await cdpEval(cdp, focusHost);
  const markedC = await markInserting(cdp, 'papa');
  const rewindAt = await pressTimed(cdp, CHORD.rewind);
  const acceptAt = await pressTimed(cdp, CHORD.accept);
  const seen = new Set();
  let afterC = await face(cdp);
  for (const stop = Date.now() + 2500; Date.now() < stop; ) {
    for (const t of afterC.toasts) seen.add(t);
    await sleep(50);
    afterC = await face(cdp);
  }
  for (const t of afterC.toasts) seen.add(t);
  readings.c = {
    drawn: ['oscar', 'papa', 'quebec'].every((w) => drawnC.inss.includes(w)),
    marked: markedC.inss[markedC.currentIndex] === 'papa',
    gapMs: acceptAt - rewindAt,
    before: markedC.changes,
    after: afterC.changes,
    backwards: afterC.dels.includes('papa'),
    heldSentence: seen.has(HELD_ACCEPT),
    toasts: [...seen],
    fileHoldsRewind: readNotes() === withMarkers(fileC, [[5, markerOf(baseC, 5)]])
  };
  armCheck(
    'C',
    'c',
    'C. ⌥⌫ ⌥↩ back to back: nothing is drawn backwards, the file holds the rewind, and a refused accept says the one-press sentence',
    'C at PR 28’s head: ⌥↩ accepts the change ⌥⌫ is rewinding, and it is drawn backwards',
    `${String(readings.c.before)} -> ${String(readings.c.after)} changes, chords ${String(readings.c.gapMs)} ms apart, held sentence ${String(readings.c.heldSentence)}, toasts ${JSON.stringify(readings.c.toasts)}`
  );
}

async function armR(cdp) {
  // R. A HELD ⌥⌫. Everything is accepted first so the three new changes are
  // the whole picture, and the file after is compared with the one rewind of
  // paragraph 2 that a single press makes, paragraph by paragraph.
  await cdpEval(cdp, focusHost);
  await acceptDownTo(cdp, 0);
  const baseR = readNotes();
  const fileR = withMarkers(baseR, [[2, 'romeo'], [4, 'sierra'], [6, 'tango']]);
  shellWrite(NOTES, fileR);
  const drawnR = await faceUntil(
    cdp,
    (f) => f.changes === 3 && ['romeo', 'sierra', 'tango'].every((w) => f.inss.includes(w)),
    20000
  );
  await cdpEval(cdp, focusHost);
  const markedR = await markInserting(cdp, 'romeo');
  // What the PAGE saw, read by a capture listener of this probe's own, so a
  // runtime that dropped CDP's `autoRepeat` shows up as the arm not holding
  // the key rather than as the view running every repeat.
  await cdpEval(
    cdp,
    `(() => { window.__moveOnRepeats = []; if (window.__moveOnListening !== true) { window.__moveOnListening = true; window.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && e.altKey && Array.isArray(window.__moveOnRepeats)) window.__moveOnRepeats.push(e.repeat); }, { capture: true }); } return true; })()`
  );
  const held = { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8, modifiers: 1 };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...held });
  for (let i = 0; i < REPEATS; i += 1) {
    await sleep(40);
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...held, autoRepeat: true });
  }
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...held });
  const repeatFlags = (await cdpEval(cdp, 'window.__moveOnRepeats')) ?? [];
  await faceUntil(cdp, (f) => !f.inss.includes('romeo'), 8000);
  await sleep(1500);
  const afterR = await face(cdp);
  const fileAfterR = readNotes();
  readings.r = {
    drawn: drawnR.changes === 3,
    marked: markedR.inss[markedR.currentIndex] === 'romeo',
    repeats: REPEATS,
    firstNotRepeat: repeatFlags[0] === false,
    repeatsSeen: repeatFlags.filter((f) => f === true).length,
    before: markedR.changes,
    after: afterR.changes,
    paragraphsMoved: paragraphsMoved(fileR, fileAfterR),
    oneRewind: fileAfterR === withMarkers(fileR, [[2, markerOf(baseR, 2)]]),
    unsaved: afterR.unsaved
  };
  armCheck(
    'R',
    'r',
    'R. a held ⌥⌫ rewinds one change and moves one paragraph of the file',
    'R at PR 28’s head: a held ⌥⌫ rewinds more than one change',
    `${String(readings.r.before)} -> ${String(readings.r.after)} changes, ${String(readings.r.paragraphsMoved)} paragraph(s) moved, ${String(REPEATS)} repeats`
  );
}

async function armT(cdp) {
  // T. A TYPING BURST in paragraph 7, which R left unchanged, at 30 ms a key,
  // Enter included, then ⌘S. The expected file is computed here from the bytes
  // on disk before the first key, never read back from the app.
  await cdpEval(cdp, TYPING_READS);
  const baseT = readNotes();
  const typeAt = baseT.indexOf('enough sentences', baseT.indexOf('Paragraph 7 of'));
  const drawnT = await cdpEval(cdp, 'window.__moveOn.current()');
  await cdpEval(cdp, `window.__moveOn.put(${String(typeAt)})`);
  await sleep(200);
  for (const ch of TYPED) {
    await typeChar(cdp, ch);
    await sleep(30);
  }
  await keyNow(cdp, CHORD.enter);
  await sleep(600);
  const typed = await cdpEval(cdp, 'window.__moveOn.read()');
  const expectedT = `${baseT.slice(0, typeAt)}${TYPED}\n${baseT.slice(typeAt)}`;
  await press(cdp, CHORD.save);
  let onDisk = readNotes();
  for (const stop = Date.now() + 15000; onDisk === baseT && Date.now() < stop; ) {
    await sleep(100);
    onDisk = readNotes();
  }
  await sleep(300);
  onDisk = readNotes();
  readings.t = {
    precondition: typeAt > 0 && drawnT === baseT,
    typedCurrent: typed.current === expectedT,
    caret: typed.caret === typeAt + TYPED.length + 1,
    insertion: typed.insTexts.some((s) => s.includes(TYPED.trim())),
    savedExact: onDisk === expectedT,
    savedNear: onDisk.slice(Math.max(0, typeAt - 12), typeAt + TYPED.length + 12)
  };
  armCheck(
    'T',
    't',
    'T. a word and Enter at 30 ms a key, then ⌘S: drawn as an insertion at the caret, and the file is exactly what was typed',
    'T at PR 28’s head: the burst is scrambled and ⌘S saves the scramble',
    `on disk near the caret ${JSON.stringify(readings.t.savedNear)}, caret ${String(typed.caret)} of ${String(typeAt + TYPED.length + 1)}`
  );
}

// ---------------------------------------------------------------------------
// PHASE 282.2's ARM, U. The header has the claim; what follows is the four
// things it needs that no arm before it did.
// ---------------------------------------------------------------------------

/**
 * THE TAB, read through the Phase 277 drive every harness launch registers
 * (src/renderer/editor/p277-save-drive.ts `read`): the store's own `dirty`,
 * its `savedContents`, the working model's text and the toasts. The banner's
 * "unsaved" that `FACE` reads is the same flag drawn, and U prints both, but
 * `savedContents` is drawn nowhere and is the reading that says whether a read
 * followed the undo. Nothing counts `fs:readFile` calls from the page
 * (`window.gmux` is a frozen bridge), so that move IS the read's trace.
 */
const TAB_STATE = `(() => {
  const p = window.__gmuxP277;
  if (p === null || typeof p !== 'object' || typeof p.read !== 'function') return { seam: false, toasts: [] };
  const r = p.read();
  const t = r.tabs.find((x) => x.name === ${JSON.stringify(NOTES)}) ?? null;
  return {
    seam: true,
    dirty: t === null ? null : t.dirty,
    savedContents: t === null ? null : t.savedContents,
    value: t === null ? null : t.value,
    toasts: r.toasts
  };
})()`;
const tabState = (cdp) => cdpEval(cdp, TAB_STATE, 10000);
/** Every toast off the screen, so the next press's sentences are its own. */
const CLEAR_TOASTS = `(() => { const p = window.__gmuxP277; if (p !== null && typeof p === 'object' && typeof p.clearToasts === 'function') p.clearToasts(); return true; })()`;

/**
 * THE KEYSTROKE INSIDE THE WRITE. One keydown listener on `window`, bubble
 * phase, which the ⌥⌫ keydown reaches AFTER React's handler at the root has
 * run the press as far as its first await. It answers that one keydown by
 * dispatching a cancelable `insertText` `beforeinput` at the document, which
 * is the event ./redline-edits listens for and the only thing a typed
 * character is to it; a synthetic one carries no target range, so the span is
 * the selection `__moveOn.put` left, exactly as `spanOfInput` falls back. The
 * update it schedules is a discrete one, so React renders it and runs the
 * effect that marks the tab dirty in the microtask after this listener
 * returns: before the re-read's reply can be a task at all.
 *
 * `taken` is the document's handler having cancelled the event, which is how
 * the arm knows the keystroke reached the typing path and not only the page.
 */
const typeInsideThePress = (ch) => `(() => {
  const state = { fired: false, taken: false };
  const once = (e) => {
    if (e.key !== 'Backspace' || !e.altKey || e.shiftKey || e.repeat) return;
    window.removeEventListener('keydown', once);
    const doc = document.querySelector('.ed-redline-doc');
    if (doc === null) return;
    const typed = new InputEvent('beforeinput', { inputType: 'insertText', data: ${JSON.stringify(ch)}, bubbles: true, cancelable: true });
    doc.dispatchEvent(typed);
    state.fired = true;
    state.taken = typed.defaultPrevented;
  };
  window.addEventListener('keydown', once);
  window.__moveOnInside = { state, dispose: () => window.removeEventListener('keydown', once) };
  return true;
})()`;
/** What the listener did, and the listener taken off whether it fired or not. */
const TYPED_INSIDE = `(() => { const held = window.__moveOnInside; if (held === undefined || held === null) return null; held.dispose(); return held.state; })()`;

/**
 * HOW LONG THE REWIND'S OWN TICK IS GIVEN TO ARRIVE AND BE SPENT. The
 * renderer's window is `REPO_CHANGED_DEBOUNCE_MS` in
 * src/renderer/state/repo-changed.ts, read out of the checkout under test so
 * the wait follows the number, and the arm waits at least three of them as
 * Phase 282.2's entry asks. It is not the whole road, though: main's watcher
 * debounces 300 ms before it (src/main/watcher/repo-watcher.ts
 * `DEFAULT_DEBOUNCE_MS`), and the round trip was measured in the app at 1,139
 * ms before the adoption existed (./redline-press `RewindHold`). A first ⌥↩
 * pressed at 450 ms would leave that tick still in the air, and at the Phase
 * 282.1 bytes a tick that arrived after ⌘Z would read the file and let the
 * hold go, which is the defect not reproducing for the wrong reason. So the
 * floor is over twice the measured round trip, and the clock is printed.
 */
const TICK_FLOOR_MS = 2500;
function repoChangedDebounceMs() {
  try {
    const source = readFileSync(join(APP_ROOT, 'src', 'renderer', 'state', 'repo-changed.ts'), 'utf8');
    const found = /REPO_CHANGED_DEBOUNCE_MS\s*=\s*(\d+)/.exec(source);
    if (found !== null) return Number(found[1]);
  } catch {
    /* a checkout with no source beside its build: the number it shipped with */
  }
  return 150;
}
/** ⌘Z is pressed until the tab is clean and never past this many times. */
const UNDO_CAP = 5;
/** How long the picture is given to let the rewound change go after the undo. */
const LET_GO_CAP_MS = 1500;
const KEYSTROKE = 'x';

/** Every toast seen for `ms`, off the screen and off the store, because an info toast leaves after five seconds. */
async function toastsFor(cdp, ms) {
  const seen = new Set();
  for (const stop = Date.now() + ms; Date.now() < stop; ) {
    for (const t of (await face(cdp)).toasts) seen.add(t);
    for (const t of (await tabState(cdp)).toasts ?? []) seen.add(t);
    await sleep(50);
  }
  return [...seen];
}

async function armU(cdp) {
  // U. UNDO IS A WAY OUT. Everything is accepted first, so the baseline is the
  // file and the three new changes are the whole picture whatever ran before;
  // ⌥⌫ is pressed on paragraph 4's, so paragraph 6's is the change that
  // follows it and the one the accept after the undo takes at HEAD. The caret
  // goes into paragraph 8, below every change, BEFORE the press: the mark
  // stays on paragraph 4's change because a caret outside every change moves
  // nobody (./redline-current `caretMoveOf`), the keydown still reaches the
  // scroller from the document, and the rewind takes the keyboard from nobody
  // because it was not on a change wrapper.
  await cdpEval(cdp, focusHost);
  await acceptDownTo(cdp, 0);
  const baseU = readNotes();
  const fileU = withMarkers(baseU, [[2, 'uniform'], [4, 'victor'], [6, 'whiskey']]);
  const rewoundU = withMarkers(fileU, [[4, markerOf(baseU, 4)]]);
  shellWrite(NOTES, fileU);
  const drawnU = await faceUntil(
    cdp,
    (f) => f.changes === 3 && ['uniform', 'victor', 'whiskey'].every((w) => f.inss.includes(w)),
    20000
  );
  await cdpEval(cdp, focusHost);
  await markInserting(cdp, 'victor');
  await cdpEval(cdp, TYPING_READS);
  const typeAt = fileU.indexOf('enough sentences', fileU.indexOf('Paragraph 8 of'));
  const currentU = await cdpEval(cdp, 'window.__moveOn.current()');
  await cdpEval(cdp, `window.__moveOn.put(${String(typeAt)})`);
  await sleep(200);
  const markedU = await face(cdp);
  const atPress = await tabState(cdp);

  // THE PRESS, with the keystroke in its task. The landing is read off the
  // DISK, which is the one place the write cannot be late to, and the tab and
  // the picture a moment after it, once the press's own continuation has run.
  await cdpEval(cdp, CLEAR_TOASTS);
  await cdpEval(cdp, typeInsideThePress(KEYSTROKE));
  const pressedAt = await pressTimed(cdp, CHORD.rewind);
  const inside = await cdpEval(cdp, TYPED_INSIDE);
  let landedAt = 0;
  for (const stop = Date.now() + 10000; landedAt === 0 && Date.now() < stop; ) {
    if (readNotes() === rewoundU) landedAt = Date.now();
    else await sleep(20);
  }
  await sleep(150);
  const atLanding = await tabState(cdp);
  const faceAtLanding = await face(cdp);
  const toastsAtLanding = [...new Set([...faceAtLanding.toasts, ...(atLanding.toasts ?? [])])];

  // The first keystroke of a session loads monaco, so the buffer is waited for
  // rather than assumed: ⌘Z has nothing to undo until the model holds the
  // keystroke. The wait below is on the clock from the landing either way.
  const bufferU = `${fileU.slice(0, typeAt)}${KEYSTROKE}${fileU.slice(typeAt)}`;
  let buffered = atLanding;
  for (const stop = Date.now() + 20000; buffered.value !== bufferU && Date.now() < stop; ) {
    await sleep(100);
    buffered = await tabState(cdp);
  }
  const debounceMs = repoChangedDebounceMs();
  const tickWaitMs = Math.max(3 * debounceMs, TICK_FLOOR_MS);
  const waitFrom = landedAt === 0 ? pressedAt : landedAt;
  while (Date.now() - waitFrom < tickWaitMs) await sleep(50);
  const waitedMs = Date.now() - waitFrom;
  const afterWait = await tabState(cdp);
  const faceAfterWait = await face(cdp);

  // ⌥↩ ON THE DIRTY TAB: held, and the sentence names the way out.
  await cdpEval(cdp, CLEAR_TOASTS);
  await pressTimed(cdp, CHORD.accept);
  const toastsWhileDirty = await toastsFor(cdp, 1200);
  const afterDirtyAccept = await face(cdp);

  // ⌘Z UNTIL THE TAB IS CLEAN, and not once more: the model's undo stack
  // reaches back past the agent's write (./monaco-loader `resetWorkingModel`
  // is an edit), so a press too many would make the tab dirty again with the
  // text from before it. The flag is the store's, or the banner's without the
  // drive.
  await cdpEval(cdp, CLEAR_TOASTS);
  const dirtyNow = async () => {
    const tab = await tabState(cdp);
    return tab.seam === true ? tab.dirty : (await face(cdp)).unsaved;
  };
  let undoPresses = 0;
  let undoAt = 0;
  let dirty = await dirtyNow();
  while (dirty !== false && undoPresses < UNDO_CAP) {
    undoAt = Date.now();
    await keyNow(cdp, CHORD.undoTyping);
    undoPresses += 1;
    for (const stop = Date.now() + 1500; Date.now() < stop; ) {
      dirty = await dirtyNow();
      if (dirty === false) break;
      await sleep(30);
    }
  }
  const cleanAt = Date.now();

  // THE WAY OUT, measured. The picture is given a bounded moment to let the
  // rewound change go, which at HEAD is the read the clean transition pulls
  // and at the Phase 282.1 bytes never comes; then ⌥↩, on whatever is current.
  // With nothing current one ⌥↓ is pressed first, as `acceptDownTo` does,
  // because the claim is that the accept is no longer HELD and not where the
  // mark was left.
  const letGo = await faceUntil(cdp, (f) => !f.inss.includes('victor'), LET_GO_CAP_MS);
  const letGoMs = letGo.inss.includes('victor') ? -1 : Date.now() - cleanAt;
  const afterUndo = await tabState(cdp);
  let before2 = letGo;
  let stepped = false;
  if (before2.currentCount === 0 && before2.changes > 0) {
    await press(cdp, CHORD.next);
    stepped = true;
    before2 = await face(cdp);
  }
  const acceptAt = await pressTimed(cdp, CHORD.accept);
  const toastsAfterUndo = await toastsFor(cdp, 1500);
  const after2 = await face(cdp);
  const atEnd = await tabState(cdp);
  const diskEnd = readNotes();

  readings.u = {
    seam: atPress.seam === true && atEnd.seam === true,
    drawn: drawnU.changes === 3 && ['uniform', 'victor', 'whiskey'].every((w) => drawnU.inss.includes(w)) && currentU === fileU,
    marked:
      markedU.currentCount === 1 &&
      markedU.inss[markedU.currentIndex] === 'victor' &&
      String(markedU.activeClass ?? '').includes('ed-redline-doc'),
    cleanAtPress: atPress.seam === true ? atPress.dirty === false : markedU.unsaved === false,
    typedInside: inside !== null && inside !== undefined && inside.fired === true && inside.taken === true,
    insideReading: inside ?? null,
    pressToLandingMs: landedAt === 0 ? -1 : landedAt - pressedAt,
    dirtyAtLanding: atLanding.seam === true ? atLanding.dirty : faceAtLanding.unsaved,
    fileAtLanding: landedAt !== 0,
    drawnAtLanding: faceAtLanding.inss.includes('victor'),
    toastsAtLanding,
    bufferHoldsKeystroke: buffered.value === bufferU,
    debounceMs,
    tickWaitMs,
    waitedMs,
    dirtyAfterWait: afterWait.seam === true ? afterWait.dirty : faceAfterWait.unsaved,
    savedIsDiskAfterWait: afterWait.seam === true ? afterWait.savedContents === readNotes() : null,
    toastsWhileDirty,
    dirtySentence: toastsWhileDirty.some((t) => t.includes(WAY_OUT)),
    changesWhileDirty: afterDirtyAccept.changes,
    undoPresses,
    cleanAfterUndo: dirty === false,
    bannerUnsavedAfterUndo: letGo.unsaved,
    letGoMs,
    savedIsDiskAfterUndo: afterUndo.seam === true ? afterUndo.savedContents === diskEnd : null,
    stepped,
    undoToAcceptMs: undoAt === 0 ? -1 : acceptAt - undoAt,
    toastsAfterUndo,
    heldAfterUndo: toastsAfterUndo.includes(HELD_ACCEPT),
    before: before2.changes,
    after: after2.changes,
    accepted: after2.changes === before2.changes - 1,
    drawnAfter: after2.inss,
    rewoundStillDrawn: after2.inss.includes('victor'),
    diskIsRewind: diskEnd === rewoundU,
    savedIsDisk: atEnd.seam === true && atEnd.savedContents === diskEnd
  };
  readings.u.landedDirty =
    readings.u.fileAtLanding === true && readings.u.dirtyAtLanding === true && readings.u.drawnAtLanding === true;

  // EVERY READING, as a line, whatever the grade: at the Phase 282.1 bytes
  // these lines are the measurement of the window the reverifiers reasoned
  // about, and the grade below them is the one sentence.
  const u = readings.u;
  note(
    'U1',
    'THE PRESS: ⌥⌫ with a keystroke in the chord’s own task',
    `listener ${JSON.stringify(u.insideReading)}, the write landed ${String(u.pressToLandingMs)} ms after the key, dirty at the landing ${String(u.dirtyAtLanding)}, "victor" still drawn ${String(u.drawnAtLanding)}, toasts ${JSON.stringify(u.toastsAtLanding)}`
  );
  note(
    'U2',
    'THE WAIT past the rewind’s own watcher tick, on the clock',
    `${String(u.waitedMs)} ms (three windows of ${String(u.debounceMs)} ms is ${String(3 * u.debounceMs)}, the floor ${String(TICK_FLOOR_MS)}); after it dirty ${String(u.dirtyAfterWait)}, the buffer holds the keystroke ${String(u.bufferHoldsKeystroke)}, savedContents is the disk’s ${String(u.savedIsDiskAfterWait)}`
  );
  note('U3', '⌥↩ ON THE DIRTY TAB', `toasts ${JSON.stringify(u.toastsWhileDirty)}, ${String(u.changesWhileDirty)} changes drawn`);
  note(
    'U4',
    '⌘Z UNTIL CLEAN',
    `${String(u.undoPresses)} press(es), dirty ${String(dirty)}, banner says unsaved ${String(u.bannerUnsavedAfterUndo)}, the picture let "victor" go ${u.letGoMs < 0 ? `never within ${String(LET_GO_CAP_MS)} ms` : `${String(u.letGoMs)} ms after the tab went clean`}, savedContents is the disk’s ${String(u.savedIsDiskAfterUndo)}`
  );
  note(
    'U5',
    '⌥↩ AFTER THE UNDO',
    `${String(u.undoToAcceptMs)} ms after the ⌘Z that made the tab clean${u.stepped ? ', one ⌥↓ first because nothing was current' : ''}; toasts ${JSON.stringify(u.toastsAfterUndo)}; ${String(u.before)} -> ${String(u.after)} changes; drawn ${JSON.stringify(u.drawnAfter)}`
  );
  note(
    'U6',
    'THE DISK AND THE TAB at the end',
    `the file is the rewound text ${String(u.diskIsRewind)}, savedContents is the disk’s ${String(u.savedIsDisk)}; reads are counted by no seam in this build, so savedContents moving onto the disk’s bytes is the read’s own trace`
  );
  armCheck(
    'U',
    'u',
    'U. UNDO IS A WAY OUT: after a rewind lands on a dirty tab, ⌘Z to clean and the next ⌥↩ accepts, with the picture and the tab on the disk’s bytes',
    'U is not graded at PR 28’s head',
    `${String(u.before)} -> ${String(u.after)} changes ${String(u.undoToAcceptMs)} ms after ⌘Z, toasts ${JSON.stringify(u.toastsAfterUndo)}`
  );
}

/** ⌘⇧Z, the buffer's own redo, taken by ./redline-edits beside ⌘Z. */
const REDO_TYPING = { key: 'z', code: 'KeyZ', vk: 90, modifiers: 4 | 8 };
/** ⌘⇧Z is pressed until the tab is clean and never past this many times. */
const REDO_CAP = 3;

async function armZ(cdp) {
  // Z. A PRESS TOO MANY, TAKEN BACK. The first half is arm U's, with this
  // arm's own three words: everything accepted, three changes written from
  // outside, paragraph 4's marked, the caret put into paragraph 8, ⌥⌫ with one
  // keystroke in the chord's own task, the landing read off the disk, the
  // buffer waited for and the rewind's own watcher tick waited out.
  const WORDS_Z = ['xray', 'yankee', 'zulu'];
  const REWOUND_WORD = WORDS_Z[1];
  await cdpEval(cdp, focusHost);
  await acceptDownTo(cdp, 0);
  const baseZ = readNotes();
  const fileZ = withMarkers(baseZ, [[2, WORDS_Z[0]], [4, WORDS_Z[1]], [6, WORDS_Z[2]]]);
  const rewoundZ = withMarkers(fileZ, [[4, markerOf(baseZ, 4)]]);
  shellWrite(NOTES, fileZ);
  const drawnZ = await faceUntil(cdp, (f) => f.changes === 3 && WORDS_Z.every((w) => f.inss.includes(w)), 20000);
  await cdpEval(cdp, focusHost);
  await markInserting(cdp, REWOUND_WORD);
  await cdpEval(cdp, TYPING_READS);
  const typeAt = fileZ.indexOf('enough sentences', fileZ.indexOf('Paragraph 8 of'));
  await cdpEval(cdp, `window.__moveOn.put(${String(typeAt)})`);
  await sleep(200);
  const markedZ = await face(cdp);
  const atPress = await tabState(cdp);
  await cdpEval(cdp, CLEAR_TOASTS);
  await cdpEval(cdp, typeInsideThePress(KEYSTROKE));
  const pressedAt = await pressTimed(cdp, CHORD.rewind);
  const inside = await cdpEval(cdp, TYPED_INSIDE);
  let landedAt = 0;
  for (const stop = Date.now() + 10000; landedAt === 0 && Date.now() < stop; ) {
    if (readNotes() === rewoundZ) landedAt = Date.now();
    else await sleep(20);
  }
  await sleep(150);
  const atLanding = await tabState(cdp);
  const faceAtLanding = await face(cdp);
  const bufferZ = `${fileZ.slice(0, typeAt)}${KEYSTROKE}${fileZ.slice(typeAt)}`;
  let buffered = atLanding;
  for (const stop = Date.now() + 20000; buffered.value !== bufferZ && Date.now() < stop; ) {
    await sleep(100);
    buffered = await tabState(cdp);
  }
  const debounceMs = repoChangedDebounceMs();
  const waitFrom = landedAt === 0 ? pressedAt : landedAt;
  while (Date.now() - waitFrom < Math.max(3 * debounceMs, TICK_FLOOR_MS)) await sleep(50);
  const waitedMs = Date.now() - waitFrom;

  // THE HELD ⌘Z: the keydown and its first repeat, the second sent WITHOUT
  // waiting for the first to be answered, so it can land inside the read the
  // first one pulls. Which side of the read it landed on is read afterwards
  // off `savedContents`: still the agent's text means the read came back to a
  // dirty tab and was dropped; the rewound text means the read had landed and
  // the repeat un-applied it.
  const zKey = { key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 4 };
  const sentAt = Date.now();
  const first = cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...zKey });
  const repeat = cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...zKey, autoRepeat: true });
  await Promise.all([first, repeat]);
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...zKey });
  const sentMs = Date.now() - sentAt;
  await sleep(700);
  const afterHeld = await tabState(cdp);
  const faceAfterHeld = await face(cdp);

  // THE PERSON SEES THEY WENT TOO FAR: ⌘⇧Z until the tab is clean, with the
  // caret back in the text as a click would put it.
  await cdpEval(cdp, CLEAR_TOASTS);
  let redoPresses = 0;
  let dirty = afterHeld.dirty;
  while (dirty !== false && redoPresses < REDO_CAP) {
    await cdpEval(cdp, `window.__moveOn.put(${String(typeAt)})`);
    await keyNow(cdp, REDO_TYPING);
    redoPresses += 1;
    for (const stop = Date.now() + 1500; Date.now() < stop; ) {
      dirty = (await tabState(cdp)).dirty;
      if (dirty === false) break;
      await sleep(30);
    }
  }
  const cleanAt = Date.now();
  const letGo = await faceUntil(cdp, (f) => !f.inss.includes(REWOUND_WORD), LET_GO_CAP_MS);
  const letGoMs = letGo.inss.includes(REWOUND_WORD) ? -1 : Date.now() - cleanAt;
  const afterRedo = await tabState(cdp);

  // ⌥↩ IN THE RHYTHM, on whatever is current (one ⌥↓ first when nothing is).
  await cdpEval(cdp, focusHost);
  let before2 = await face(cdp);
  if (before2.currentCount === 0 && before2.changes > 0) {
    await press(cdp, CHORD.next);
    before2 = await face(cdp);
  }
  const pressedOn = before2.currentIndex === -1 ? null : before2.inss[before2.currentIndex];
  await cdpEval(cdp, CLEAR_TOASTS);
  await pressTimed(cdp, CHORD.accept);
  const toastsAtAccept = await toastsFor(cdp, 900);
  const after2 = await face(cdp);

  // THE AGENT WRITES ANOTHER FILE OF THE REPOSITORY, which is the read that
  // drew the accepted rewind backwards before the fix round.
  shellWrite('elsewhere.txt', `written by arm Z at ${String(Date.now())}\n`);
  const back = await faceUntil(cdp, (f) => f.dels.includes(REWOUND_WORD), 2500);
  const atEnd = await tabState(cdp);
  const diskEnd = readNotes();

  readings.z = {
    seam: atPress.seam === true && atEnd.seam === true,
    drawn: drawnZ.changes === 3 && WORDS_Z.every((w) => drawnZ.inss.includes(w)),
    marked:
      markedZ.currentCount === 1 &&
      markedZ.inss[markedZ.currentIndex] === REWOUND_WORD &&
      String(markedZ.activeClass ?? '').includes('ed-redline-doc'),
    cleanAtPress: atPress.dirty === false,
    typedInside: inside !== null && inside !== undefined && inside.fired === true && inside.taken === true,
    pressToLandingMs: landedAt === 0 ? -1 : landedAt - pressedAt,
    dirtyAtLanding: atLanding.dirty,
    fileAtLanding: landedAt !== 0,
    drawnAtLanding: faceAtLanding.inss.includes(REWOUND_WORD),
    bufferHoldsKeystroke: buffered.value === bufferZ,
    debounceMs,
    waitedMs,
    sentMs,
    dirtyAfterHeld: afterHeld.dirty === true,
    bufferAfterHeld:
      afterHeld.value === baseZ ? 'the text from before the agent wrote' : afterHeld.value === fileZ ? 'the agent’s text' : afterHeld.value === rewoundZ ? 'the rewound text' : 'other',
    secondUndoInsideTheRead: afterHeld.savedContents === fileZ,
    changesAfterHeld: faceAfterHeld.changes,
    redoPresses,
    cleanAfterRedo: dirty === false,
    letGoCapMs: LET_GO_CAP_MS,
    letGoMs,
    rewoundDrawnAfterRedo: letGo.inss.includes(REWOUND_WORD),
    savedIsDiskAfterRedo: afterRedo.savedContents === readNotes(),
    pressedOn,
    toastsAtAccept,
    before: before2.changes,
    after: after2.changes,
    accepted: after2.changes === before2.changes - 1,
    acceptedRewound: pressedOn === REWOUND_WORD && after2.changes === before2.changes - 1,
    backwardsAfterOutsideWrite: back.dels.includes(REWOUND_WORD),
    diskIsRewind: diskEnd === rewoundZ,
    savedIsDisk: atEnd.savedContents === diskEnd
  };
  readings.z.landedDirty =
    readings.z.fileAtLanding === true && readings.z.dirtyAtLanding === true && readings.z.drawnAtLanding === true;

  const z = readings.z;
  note(
    'Z1',
    'THE PRESS, as arm U makes it',
    `the write landed ${String(z.pressToLandingMs)} ms after the key, dirty at the landing ${String(z.dirtyAtLanding)}, "${REWOUND_WORD}" still drawn ${String(z.drawnAtLanding)}, the buffer holds the keystroke ${String(z.bufferHoldsKeystroke)}, waited ${String(z.waitedMs)} ms past the landing`
  );
  note(
    'Z2',
    'THE HELD ⌘Z: a keydown and its first repeat',
    `both sent within ${String(z.sentMs)} ms; after them dirty ${String(z.dirtyAfterHeld)}, the buffer is ${z.bufferAfterHeld}, ${String(z.changesAfterHeld)} changes drawn; the repeat landed ${z.secondUndoInsideTheRead ? 'BEFORE any read had answered (savedContents is still the agent’s text: a read this build pulled came back to a dirty tab and was dropped, and a build that pulls none reads the same)' : 'AFTER the read (savedContents had moved, so it un-applied the read itself)'}`
  );
  note(
    'Z3',
    '⌘⇧Z UNTIL CLEAN',
    `${String(z.redoPresses)} press(es), clean ${String(z.cleanAfterRedo)}, the picture let "${REWOUND_WORD}" go ${z.letGoMs < 0 ? `never within ${String(LET_GO_CAP_MS)} ms` : `${String(z.letGoMs)} ms after the tab went clean`}, savedContents is the disk’s ${String(z.savedIsDiskAfterRedo)}`
  );
  note(
    'Z4',
    '⌥↩ IN THE RHYTHM, then a write elsewhere in the repository',
    `pressed on ${JSON.stringify(z.pressedOn)}; toasts ${JSON.stringify(z.toastsAtAccept)}; ${String(z.before)} -> ${String(z.after)} changes; "${REWOUND_WORD}" drawn backwards after the outside write ${String(z.backwardsAfterOutsideWrite)}; the file is the rewound text ${String(z.diskIsRewind)}, savedContents is the disk’s ${String(z.savedIsDisk)}`
  );
  armCheck(
    'Z',
    'z',
    'Z. A PRESS TOO MANY, TAKEN BACK: a second ⌘Z and the ⌘⇧Z that answers it still end with the picture on the disk’s bytes, and the rewound change is never accepted',
    'Z is not graded at PR 28’s head',
    `the repeat landed ${z.secondUndoInsideTheRead ? 'before any read answered' : 'after the read'}; let go ${String(z.letGoMs)} ms after ⌘⇧Z; ⌥↩ on ${JSON.stringify(z.pressedOn)} took ${String(z.before)} -> ${String(z.after)} changes, toasts ${JSON.stringify(z.toastsAtAccept)}`
  );
}

// ---------------------------------------------------------------------------
// PHASE 297's ARM, X. The header has the claim; what follows is the five things
// it needs that no arm before it did.
// ---------------------------------------------------------------------------

/**
 * X's FIXTURE TEXTS NAME THEIR OWN FILE AND THEIR OWN VERSION IN THEIR FIRST
 * THIRTY-TWO CHARACTERS, because every reading of this arm is "whose text is
 * this" and the fingerprint below reads windows of a value rather than the whole
 * of it. `version` above puts the marker word late in the paragraph, and written
 * that way a file's committed version and its written one print the SAME head
 * and the SAME tail and are told apart only by where the middle window happens
 * to land, which is luck rather than a design. So the marker goes first, beside
 * the name. It is otherwise `version`: eight paragraphs, one marker word each.
 */
const xText = (name, n) =>
  WORDS.map(
    (_, i) =>
      `${name} paragraph ${String(i + 1)}, marker ${WORDS[(i + n) % WORDS.length]}, whose body carries enough sentences to make the document worth scrolling through when somebody reads it.\n`
  ).join('\n');
/**
 * THE WRITTEN VERSION: seven paragraphs moved and the eighth left exactly as it
 * was committed, so the caret can go into a paragraph with no change in it. Arm
 * U puts its caret below every change for the same reason, and arm T types into
 * the one paragraph the arm before it left alone.
 */
const xWritten = (name, n) => {
  const moved = paragraphsOf(xText(name, n));
  moved[moved.length - 1] = paragraphsOf(xText(name, 0))[moved.length - 1];
  return moved.join('\n\n');
};
/** The offset of the untouched last paragraph's body, which is where the caret goes. */
const xCaretAt = (name, text) => text.indexOf('enough sentences', text.indexOf(`${name} paragraph 8,`));
/**
 * The string every paragraph of one file carries and no paragraph of the other,
 * which is the file's own name: neither name is a substring of the other, and
 * `.ed-redline-doc` holds the document alone, so a picture composing one file
 * against the other's baseline shows both names at once.
 */
const xMark = (name) => name;
const xRead = (rel) => readFileSync(join(project, rel), 'utf8');

/**
 * A VALUE'S FINGERPRINT RATHER THAN THE VALUE: its length and three windows of
 * it. Six texts exist inside a sub-arm, being each file's committed version,
 * each file's written version and each with the keystroke in it, and the head
 * window alone names the file because `xText` puts the file's name in every
 * paragraph; the length separates a text from the same text with the character
 * in it. It is cheap enough to take thousands of times, which is what catching
 * a write that lasts one task costs.
 *
 * SPELLED TWICE, once for the page and once here, for the reason `HELD_ACCEPT`
 * is spelled here rather than imported: this script is plain node and the page
 * is the app. A row that matches nothing prints its own head, so a drift
 * between the two spellings shows up in the line rather than passing quietly.
 */
const X_PRINT_JS = `(v) => ({ n: v.length, head: v.slice(0, 32), mid: v.slice(Math.max(0, (v.length >> 1) - 8), (v.length >> 1) + 8), tail: v.slice(-16) })`;
function xPrint(text) {
  const half = text.length >> 1;
  return {
    n: text.length,
    head: text.slice(0, 32),
    mid: text.slice(Math.max(0, half - 8), half + 8),
    tail: text.slice(-16)
  };
}

/** The CURRENT side of whatever redline document is mounted, which is the text a person reads. */
const X_DRAWN = `(() => {
  const doc = document.querySelector('.ed-redline-doc');
  if (doc === null) return null;
  const walk = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  const out = [];
  for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
    if (n.parentElement !== null && n.parentElement.closest('[data-redline-del]') === null) out.push(n.nodeValue);
  }
  return out.join('');
})()`;

/**
 * THE TWO TABS, through the same Phase 277 drive arms U and Z read the one tab
 * through: the store's own `dirty`, its `savedContents`, the working model's
 * text, the mode, which tab is active, the toasts and any dialog on screen.
 * `value` is `null` for a tab with no buffer, which is one of the two corners
 * this arm is about and never an absent reading.
 */
const X_STATE = (aName, bName) => `(() => {
  const p = window.__gmuxP277;
  if (p === null || typeof p !== 'object' || typeof p.read !== 'function') {
    return { seam: false, a: null, b: null, toasts: [], confirm: null, confirmLabels: null };
  }
  const r = p.read();
  const of = (name) => {
    const t = r.tabs.find((x) => x.name === name) ?? null;
    return t === null
      ? null
      : { id: t.id, mode: t.mode, dirty: t.dirty, saved: t.savedContents, value: t.value, active: r.activeId === t.id };
  };
  return {
    seam: true,
    a: of(${JSON.stringify(aName)}),
    b: of(${JSON.stringify(bName)}),
    toasts: r.toasts,
    confirm: r.confirm,
    confirmLabels: r.confirmLabels
  };
})()`;

/**
 * THE RECORDER AND THE CLICK IN ONE EXPRESSION, so nothing can land between the
 * recorder starting and the gesture.
 *
 * WHY A BUSY LOOP AND NOT A TIMER. The write this arm is about happens in the
 * microtask after the click's own commit, and the render that would put the
 * arriving tab's own text back is React's next TASK. A `setInterval` is a timer
 * task and Chromium serves a posted message before it, so a sampler on a timer
 * alone reads the picture after the correction and calls the corner clean. The
 * drain loop posts into the same queue React's scheduler posts into, so its
 * message was queued first and is served first: the sample lands between the
 * write and the render. It is bounded to `busyMs` and is why this arm's settled
 * readings are further out than that.
 *
 * `rows` is per tab and `drawn` is the document, which carries both files' marks
 * so a picture composing one file against the other's baseline is visible as
 * both marks at once. Each list keeps only a CHANGE and is capped, and the
 * recorder stops itself once past `capMs` whatever the probe does next.
 */
const X_WATCH_AND_CLICK = (aName, bName, busyMs, capMs) => `(() => {
  const p = window.__gmuxP277;
  const seam = p !== null && typeof p === 'object' && typeof p.read === 'function';
  const print = ${X_PRINT_JS};
  const aName = ${JSON.stringify(aName)};
  const bName = ${JSON.stringify(bName)};
  const aMark = ${JSON.stringify(xMark(aName))};
  const bMark = ${JSON.stringify(xMark(bName))};
  const rows = { [aName]: [], [bName]: [] };
  const drawn = [];
  const t0 = performance.now();
  const at = () => Math.round(performance.now() - t0);
  const none = { n: -1, head: '', mid: '', tail: '' };
  const push = (into, row) => {
    const last = into[into.length - 1];
    if (
      last !== undefined &&
      last.n === row.n &&
      last.head === row.head &&
      last.mid === row.mid &&
      last.tail === row.tail &&
      last.a === row.a &&
      last.b === row.b
    ) {
      return;
    }
    if (into.length < 80) into.push(row);
  };
  const record = () => {
    if (seam) {
      let r = null;
      try {
        r = p.read();
      } catch {
        r = null;
      }
      if (r !== null) {
        for (const name of [aName, bName]) {
          const tab = r.tabs.find((t) => t.name === name) ?? null;
          const value = tab === null ? null : tab.value;
          push(rows[name], value === null ? { ms: at(), ...none } : { ms: at(), ...print(value) });
        }
      }
    }
    const doc = document.querySelector('.ed-redline-doc');
    const text = doc === null ? null : (doc.textContent ?? '');
    push(
      drawn,
      text === null
        ? { ms: at(), ...none, a: false, b: false }
        : { ms: at(), ...print(text), a: text.includes(aMark), b: text.includes(bMark) }
    );
  };
  let live = true;
  const stopAt = performance.now() + ${String(capMs)};
  const busyUntil = performance.now() + ${String(busyMs)};
  const observer = new MutationObserver(() => {
    if (live) record();
  });
  function stop() {
    live = false;
    clearInterval(timer);
    try {
      observer.disconnect();
    } catch {
      /* already gone */
    }
  }
  const timer = setInterval(() => {
    if (!live || performance.now() > stopAt) {
      stop();
      return;
    }
    record();
  }, 8);
  const frame = () => {
    if (!live || performance.now() > stopAt) {
      stop();
      return;
    }
    record();
    requestAnimationFrame(frame);
  };
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    if (!live) return;
    record();
    if (performance.now() < busyUntil) channel.port2.postMessage(0);
  };
  observer.observe(document.querySelector('.ed-panel') ?? document.body, {
    subtree: true,
    childList: true,
    characterData: true
  });
  window.__moveOnX = { read: () => ({ rows, drawn }), stop };
  record();
  channel.port2.postMessage(0);
  requestAnimationFrame(frame);
  // THE GESTURE: a person's click on the other tab, on the shipped element,
  // which runs the store's own activate through React's discrete lane.
  const tabs = Array.from(document.querySelectorAll('.ed-tab'));
  const wanted = tabs.find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '') === bName) ?? null;
  if (wanted !== null) wanted.click();
  return { installed: true, clicked: wanted !== null, seam };
})()`;
/** What the recorder kept, and the recorder stopped and taken off the page. */
const X_HISTORY = `(() => {
  const held = window.__moveOnX;
  if (held === undefined || held === null) return null;
  const out = held.read();
  held.stop();
  delete window.__moveOnX;
  return out;
})()`;
/** The recorder stopped whatever happened, which is this arm's own `finally`. */
const X_STOP = `(() => {
  const held = window.__moveOnX;
  if (held === undefined || held === null) return false;
  held.stop();
  delete window.__moveOnX;
  return true;
})()`;
/**
 * A DIALOG ON SCREEN IS A READING AND NOT A BUTTON TO PRESS. Its alt on a stale
 * save is Overwrite, which is the write this arm exists to refuse, so it is
 * recorded and then CANCELLED — the answer Escape and the scrim already give —
 * because a dialog left open would block the next sub-arm's click.
 */
const X_CANCEL = `(() => {
  const btn = Array.from(document.querySelectorAll('.modal-actions .btn')).find((b) => (b.textContent ?? '').trim() === 'Cancel') ?? null;
  if (btn === null) return false;
  btn.click();
  return true;
})()`;
/** Close one of this arm's own tabs, answering Don't Save when it is dirty. */
const X_CLOSE = (id) => `(() => {
  const p = window.__gmuxP277;
  if (p === null || typeof p !== 'object' || typeof p.closeTab !== 'function') return false;
  p.closeTab(${JSON.stringify(id)});
  // A dirty tab asks first, and this arm's answer is Don't Save: at a build with
  // the defect the buffer holds another file's text, and saving it is the loss
  // the arm is about.
  if (p.read().confirm !== null) p.pressAlt();
  return true;
})()`;

/** An evaluation whose failure is a reading of `null` rather than the end of the arm. */
async function xQuiet(cdp, expr) {
  try {
    return await cdpEval(cdp, expr, 20000);
  } catch {
    return null;
  }
}

/** The one character typed into the departing tab; `UNDO_CAP` above caps the ⌘Z that takes it back. */
const X_KEYSTROKE = 'x';
/** How long the drain loop is busy, and how long the recorder keeps sampling after that. */
const X_BUSY_MS = 120;
const X_WATCH_MS = 1400;
/** PV-2's own clock: the readings it took at the arriving tab after the click. */
const X_SETTLE_MS = [150, 600, 1200];
/** How long the disk is watched after ⌘S before it is read and reported. */
const X_SAVE_WAIT_MS = 2000;

/**
 * X's SIX SUB-ARMS: the verifiers' matrix and its control. `aAfter` is what
 * happens to the departing tab's one keystroke before the click, and the two
 * doors are how each tab came to be what it is.
 *
 *   sub-arm  the departing tab   its keystroke     the arriving tab
 *   dirty    the File view       left unsaved      the File view, so a buffer (P4's L1)
 *   saved    the File view       ⌘S, so clean      the File view (PV-2's H2 is the A state)
 *   undone   the File view       ⌘Z, so clean      the File view (P3's B is the A state)
 *   nomodel  Redline only        left unsaved      Redline only, so NO buffer (P4's L2)
 *   typed    Redline only        left unsaved      a buffer its OWN keystroke made
 *   control  the File view       nothing typed     the File view, and nothing may move
 *
 * The `typed` corner is not in the entry's list and is the attack's: a buffer a
 * tab's own first keystroke made is one ./live-text never saw, so the matrix has
 * three corners for the arriving buffer rather than two.
 *
 * WHY THE DEPARTING TAB'S DOOR IS A KNOB TOO, and why a later round must not
 * simplify it away. ./live-text holds the model's text in STATE, so at the
 * switch render it is still the DEPARTING tab's text when that tab's model
 * existed the last time its own effect ran, and the ARRIVING tab's own
 * savedContents when it did not (src/renderer/editor/live-text.ts:26 to 37).
 * That value is what ./redline-edits seeds its state with and what it takes
 * `typedOn` from, and Phase 282's guard there — `!had && now.savedContents !==
 * typedOn`, named by its own text because this phase is editing the file around
 * it — compares `typedOn` with the arriving tab's savedContents: a tab arriving
 * with NO buffer is written into only when those two agree, which is exactly when
 * the departing tab's model was invisible to ./live-text. One WITH a buffer never
 * reaches that guard at all. So both mechanisms are in the matrix — the File
 * view door for the corners that leak past the guard, and the door that leaves
 * no buffer for the corner that leaks through it — and a matrix with one door
 * would have measured one of them and called the other clean.
 */
const X_SUBS = [
  { name: 'dirty', types: true, aAfter: 'none', aDoor: 'file', bDoor: 'file' },
  { name: 'saved', types: true, aAfter: 'save', aDoor: 'file', bDoor: 'file' },
  { name: 'undone', types: true, aAfter: 'undo', aDoor: 'file', bDoor: 'file' },
  { name: 'nomodel', types: true, aAfter: 'none', aDoor: 'redline', bDoor: 'redline' },
  { name: 'typed', types: true, aAfter: 'none', aDoor: 'redline', bDoor: 'typed' },
  { name: 'control', types: false, aAfter: 'none', aDoor: 'file', bDoor: 'file' }
];
const X_DOOR_WORDS = {
  file: 'through the File view, so it has a working model',
  redline: 'in Redline only, so it has no working model',
  typed: 'in Redline, with a model its own keystroke made and undone again'
};
const X_AFTER_WORDS = {
  none: 'left unsaved',
  save: 'saved with ⌘S, so the tab is clean',
  undo: 'undone with ⌘Z, so the tab is clean'
};

/**
 * Open a prose file straight into Redline with NO Monaco under it, so the tab
 * reaches the view having never had a buffer. `mode: 'diff'` mounts Pierre
 * rather than Monaco and `editorMode` then moves the same tab through the
 * store's own `setMode`, which is what the mode chip does — a person clicking
 * Redline from the Diff view. `openRedline` above is the other door, through
 * the File view, and it leaves a buffer behind.
 */
async function xOpenRedlineNoBuffer(cdp, rel) {
  await drive(cdp, { projectPath: project, openRel: rel, mode: 'diff', editorMode: 'redline' });
  return xRedlineDrew(cdp);
}

/**
 * Open a prose file in the File view and then put it in Redline, which leaves a
 * working model behind — `openRedline` above, which the head drive opens
 * notes.txt with.
 */
async function xOpenRedlineWithBuffer(cdp, rel) {
  await openRedline(cdp, rel);
  return xRedlineDrew(cdp);
}

/**
 * The picture, waited for and the chip pressed again if it has not drawn. The
 * chip only exists once the HEAD version has come back, and a sub-arm whose
 * picture never drew measures nothing, so this is worth three presses rather
 * than a finding.
 */
async function xRedlineDrew(cdp) {
  await until(cdp, docSettled, 20000);
  await sleep(400);
  let shown = await face(cdp);
  for (let i = 0; i < 3 && shown.changes === 0; i += 1) {
    await cdpEval(cdp, clickMode('Redline'));
    await until(cdp, docSettled, 10000);
    await sleep(500);
    shown = await face(cdp);
  }
  return shown;
}

/** ⌘Z with the caret put back in the document first, which is where ./redline-edits takes it. */
async function xUndoTyping(cdp, at) {
  await cdpEval(cdp, `window.__moveOn.put(${String(at)})`);
  await keyNow(cdp, CHORD.undoTyping);
  await sleep(300);
}

/** One sub-arm, over two files of its own, from the commit to the ⌘S. */
async function xDriveSub(cdp, sub, index) {
  const aRel = `x${String(index)}a.txt`;
  const bRel = `x${String(index)}b.txt`;
  // BOTH FILES COMMITTED AND THEN WRITTEN FROM OUTSIDE, so each has a HEAD
  // version of its own and each draws eight changes; the path limiter keeps the
  // commit to these two files, so the fixture the arms above left in notes.txt
  // is not committed under them.
  const aHead = xText(aRel, 0);
  const bHead = xText(bRel, 0);
  writeFileSync(join(project, aRel), aHead);
  writeFileSync(join(project, bRel), bHead);
  git('add', '--', aRel, bRel);
  git('commit', '-q', '-m', `the X ${sub.name} fixture`, '--', aRel, bRel);
  const aFile = xWritten(aRel, 3);
  const bFile = xWritten(bRel, 5);
  shellWrite(aRel, aFile);
  shellWrite(bRel, bFile);

  // THE ARRIVING TAB FIRST, through its own door, so the click arrives at a tab
  // that is already what this sub-arm says it is; then the departing tab,
  // through the door this sub-arm gives it, which is what decides whether
  // ./live-text ever saw its buffer (see X_SUBS).
  const bDrawn = sub.bDoor === 'file' ? await xOpenRedlineWithBuffer(cdp, bRel) : await xOpenRedlineNoBuffer(cdp, bRel);
  const bTypeAt = xCaretAt(bRel, bFile);
  if (sub.bDoor === 'typed') {
    await cdpEval(cdp, TYPING_READS);
    await cdpEval(cdp, `window.__moveOn.put(${String(bTypeAt)})`);
    await sleep(200);
    await typeChar(cdp, X_KEYSTROKE);
    await sleep(900);
    for (let i = 0; i < UNDO_CAP; i += 1) {
      const held = await cdpEval(cdp, X_STATE(aRel, bRel));
      if (held.b === null || held.b.dirty !== true) break;
      await xUndoTyping(cdp, bTypeAt);
    }
  }

  const aDrawn = sub.aDoor === 'file' ? await xOpenRedlineWithBuffer(cdp, aRel) : await xOpenRedlineNoBuffer(cdp, aRel);
  await cdpEval(cdp, TYPING_READS);
  const typeAt = xCaretAt(aRel, aFile);
  const aWithChar = `${aFile.slice(0, typeAt)}${X_KEYSTROKE}${aFile.slice(typeAt)}`;
  const bWithChar = `${bFile.slice(0, bTypeAt)}${X_KEYSTROKE}${bFile.slice(bTypeAt)}`;
  let typedInA = null;
  if (sub.types) {
    await cdpEval(cdp, `window.__moveOn.put(${String(typeAt)})`);
    await sleep(200);
    await typeChar(cdp, X_KEYSTROKE);
    // The first keystroke of a tab is a real chunk load, so the buffer is waited
    // for rather than assumed, exactly as arm U waits for it.
    let held = await cdpEval(cdp, X_STATE(aRel, bRel));
    for (const stop = Date.now() + 15000; held.a?.value !== aWithChar && Date.now() < stop; ) {
      await sleep(100);
      held = await cdpEval(cdp, X_STATE(aRel, bRel));
    }
    typedInA = held.a?.value === aWithChar;
    if (sub.aAfter === 'save') {
      await press(cdp, CHORD.save);
      for (const stop = Date.now() + 8000; xRead(aRel) !== aWithChar && Date.now() < stop; ) await sleep(100);
    }
    if (sub.aAfter === 'undo') {
      for (let i = 0; i < UNDO_CAP; i += 1) {
        const now = await cdpEval(cdp, X_STATE(aRel, bRel));
        if (now.a === null || now.a.dirty !== true) break;
        await xUndoTyping(cdp, typeAt);
      }
    }
  }

  // THE CLICK, with the recorder already running (see X_WATCH_AND_CLICK), then
  // the three settled readings on PV-2's clock.
  const before = await cdpEval(cdp, X_STATE(aRel, bRel));
  await cdpEval(cdp, CLEAR_TOASTS);
  const clickedAt = Date.now();
  const watch = await cdpEval(cdp, X_WATCH_AND_CLICK(aRel, bRel, X_BUSY_MS, X_WATCH_MS), 20000);
  const settled = [];
  for (const ms of X_SETTLE_MS) {
    while (Date.now() - clickedAt < ms) await sleep(20);
    const at = Date.now() - clickedAt;
    const drawnNow = await xQuiet(cdp, X_DRAWN);
    const held = await cdpEval(cdp, X_STATE(aRel, bRel));
    const shown = await face(cdp);
    settled.push({
      ms,
      at,
      drawn: drawnNow,
      dirty: held.b?.dirty ?? null,
      buffer: held.b?.value ?? null,
      changes: shown.changes,
      active: held.b?.active ?? null
    });
  }
  let history = null;
  try {
    history = await xQuiet(cdp, X_HISTORY);
  } finally {
    await xQuiet(cdp, X_STOP);
  }

  // ⌘S AT THE ARRIVING TAB, and the disk, the toasts and the dialog after it.
  // THE WAIT IS SHORT ON PURPOSE: at a build where the buffer is the arriving
  // tab's own the press writes nothing and the disk never moves, so waiting for
  // a change that must not happen would spend the ceiling on the good reading.
  // A write goes out in one IPC round trip, which this is many times over.
  const diskBBefore = xRead(bRel);
  await cdpEval(cdp, CLEAR_TOASTS);
  await pressTimed(cdp, CHORD.save);
  for (const stop = Date.now() + X_SAVE_WAIT_MS; xRead(bRel) === diskBBefore && Date.now() < stop; ) await sleep(100);
  const toastsAtSave = await toastsFor(cdp, 900);
  const afterSave = await cdpEval(cdp, X_STATE(aRel, bRel));
  const diskBAfter = xRead(bRel);
  const diskAAfter = xRead(aRel);
  const confirmAtSave = afterSave.confirm ?? null;
  if (confirmAtSave !== null) await xQuiet(cdp, X_CANCEL);

  // EVERY VALUE NAMED. The six texts a sub-arm can hold, so a buffer, a picture
  // or a file on disk is reported as the file it came from; anything else prints
  // its length and its first words rather than being called unknown.
  const named = [
    [aRel, aFile],
    [`${aRel}+x`, aWithChar],
    [`${aRel}@HEAD`, aHead],
    [bRel, bFile],
    [`${bRel}+x`, bWithChar],
    [`${bRel}@HEAD`, bHead]
  ];
  const prints = named.map(([name, text]) => [name, xPrint(text)]);
  const label = (value) => {
    if (typeof value !== 'string') return 'none';
    const found = named.find(([, text]) => text === value);
    return found === undefined ? `other(${String(value.length)} chars, "${value.slice(0, 24)}…")` : found[0];
  };
  const labelRow = (row) => {
    if (row.n < 0) return 'none';
    const found = prints.find(([, p]) => p.n === row.n && p.head === row.head && p.mid === row.mid && p.tail === row.tail);
    return found === undefined ? `other(${String(row.n)} chars, "${row.head}…")` : found[0];
  };
  /**
   * WHOSE TEXT IS THIS, ASKED OF THE TEXT AND NEVER OF THE LABEL. A value that
   * matches none of the six exactly is labelled `other(...)`, and the claim must
   * not rest on an exact match: the departing file's text with one more
   * character in it, or with a second keystroke in it, is still the departing
   * file's. Every paragraph carries its own file's name, so the head window of a
   * sample answers this as well as the whole value does.
   */
  const othersValue = (value) => typeof value === 'string' && value.includes(xMark(aRel));
  const othersRow = (row) => row.n >= 0 && row.head.includes(xMark(aRel));
  const bRows = (history?.rows ?? {})[bRel] ?? [];
  const bEver = bRows.map((r) => ({ ms: r.ms, text: labelRow(r) }));
  const aEver = ((history?.rows ?? {})[aRel] ?? []).map((r) => ({ ms: r.ms, text: labelRow(r) }));
  const drawnEver = (history?.drawn ?? []).map((r) => ({ ms: r.ms, chars: r.n, [aRel]: r.a === true, [bRel]: r.b === true }));
  const settledLabelled = settled.map((s) => ({
    ms: s.ms,
    at: s.at,
    drawn: label(s.drawn),
    dirty: s.dirty,
    buffer: label(s.buffer),
    changes: s.changes,
    active: s.active
  }));
  const diskOfAExpected = sub.aAfter === 'save' ? `${aRel}+x` : aRel;
  const reading = {
    name: sub.name,
    a: aRel,
    b: bRel,
    aAfter: X_AFTER_WORDS[sub.aAfter],
    aDoor: X_DOOR_WORDS[sub.aDoor],
    bDoor: X_DOOR_WORDS[sub.bDoor],
    seam: before.seam === true && afterSave.seam === true && watch?.seam === true,
    drawnBoth: aDrawn.changes === X_CHANGES && bDrawn.changes === X_CHANGES,
    aChanges: aDrawn.changes,
    bChanges: bDrawn.changes,
    typedInA,
    clicked: watch?.clicked === true,
    arrived: settled.some((s) => s.active === true),
    aBeforeSwitch: {
      dirty: before.a?.dirty ?? null,
      buffer: label(before.a?.value ?? null),
      saved: label(before.a?.saved ?? null)
    },
    bBeforeSwitch: {
      dirty: before.b?.dirty ?? null,
      buffer: label(before.b?.value ?? null),
      saved: label(before.b?.saved ?? null),
      mode: before.b?.mode ?? null
    },
    settled: settledLabelled,
    bEver,
    aEver,
    drawnEver,
    sampled: bEver.length >= 1 && drawnEver.length >= 1,
    // THE CLAIM, over the whole history rather than a settled value: the
    // arriving buffer never held the departing file's text, at any moment from
    // before the click to the end of the recorder's window.
    bHoldsOthersText: bRows.some(othersRow) || settled.some((s) => othersValue(s.buffer)),
    // The picture STILL drawing the other file at the last settled reading. The
    // flash a frame long is `drawnBothMarks` below, printed and not graded.
    drawnKeptOthers: othersValue(settled[settled.length - 1]?.drawn ?? null),
    drawnBothMarks: drawnEver.some((r) => r[aRel] === true && r[bRel] === true),
    bDirtyUnasked: before.b?.dirty === false && settledLabelled.some((s) => s.dirty === true),
    diskOfBBefore: label(diskBBefore),
    diskOfB: label(diskBAfter),
    diskOfBIsOwn: diskBAfter === bFile || diskBAfter === bWithChar,
    charsOverB: othersValue(diskBAfter) ? diskBAfter.length : 0,
    diskOfA: label(diskAAfter),
    diskOfAExpected,
    diskOfAIsExpected: label(diskAAfter) === diskOfAExpected,
    bDirtyAfterSave: afterSave.b?.dirty ?? null,
    toastsAtSave,
    confirmAtSave,
    confirmLabelsAtSave: afterSave.confirmLabels ?? null
  };

  // THIS SUB-ARM'S TABS CLOSED AGAIN, so the strip never reaches MAX_TABS and
  // the recorder of the next sub-arm reads two buffers rather than twelve.
  for (const id of [afterSave.b?.id ?? before.b?.id, afterSave.a?.id ?? before.a?.id]) {
    if (typeof id === 'string') await xQuiet(cdp, X_CLOSE(id));
  }
  await sleep(300);
  return reading;
}

async function armX(cdp) {
  readings.x = { seam: false, subs: [] };
  for (let i = 0; i < X_SUBS.length; i += 1) {
    const sub = X_SUBS[i];
    const s = await xDriveSub(cdp, sub, i + 1);
    readings.x.subs.push(s);
    note(
      `X${String(i + 1)}`,
      `${s.name}: ${s.a} opened ${s.aDoor} and its keystroke ${s.aAfter}, ${s.b} opened ${s.bDoor}`,
      `${String(s.aChanges)} and ${String(s.bChanges)} changes drawn; typed in ${s.a} ${String(s.typedInA)}; ${s.b} before the click: buffer ${s.bBeforeSwitch.buffer}, dirty ${String(s.bBeforeSwitch.dirty)}, mode ${JSON.stringify(s.bBeforeSwitch.mode)}; clicked ${String(s.clicked)}, arrived ${String(s.arrived)}; settled ${JSON.stringify(s.settled)}`
    );
    note(
      `X${String(i + 1)}b`,
      `${s.name}: every value ${s.b}’s buffer held, and the ⌘S`,
      `${s.b} ever held ${JSON.stringify(s.bEver)}; ${s.a} ever held ${JSON.stringify(s.aEver)}; the picture ever showed both files’ words ${String(s.drawnBothMarks)} (${JSON.stringify(s.drawnEver)}, a frame of it is ./live-text’s lag and is not graded); disk of ${s.b} ${s.diskOfBBefore} -> ${s.diskOfB}${s.charsOverB > 0 ? ` (${String(s.charsOverB)} characters over ${s.b})` : ''}; disk of ${s.a} ${s.diskOfA}, wanted ${s.diskOfAExpected}; toasts ${JSON.stringify(s.toastsAtSave)}; confirm ${JSON.stringify(s.confirmAtSave)} ${JSON.stringify(s.confirmLabelsAtSave)}; ${s.b} dirty after the save ${String(s.bDirtyAfterSave)}`
    );
  }
  readings.x.seam = readings.x.subs.length > 0 && readings.x.subs.every((s) => s.seam === true);
  armCheck(
    'X',
    'x',
    'X. A KEYSTROKE STAYS IN THE TAB IT WAS TYPED IN: over six shapes the arriving tab’s buffer never holds the departing file’s text, it does not read unsaved, and ⌘S there writes its own bytes',
    'X is not graded at PR 28’s head',
    readings.x.subs
      .map(
        (s) =>
          `${s.name}: buffer ${s.bHoldsOthersText ? `HELD ${s.a}` : 'its own'}, unsaved unasked ${String(s.bDirtyUnasked)}, disk ${s.diskOfB}`
      )
      .join(' | ')
  );
}

const ARM_DRIVES = { O: armO, L: armL, C: armC, R: armR, T: armT, U: armU, Z: armZ, X: armX };
async function driveArms(cdp) {
  for (const arm of CHOSEN.arms) {
    const armDrive = ARM_DRIVES[arm];
    if (armDrive !== undefined) await armDrive(cdp);
  }
}

await withElectron(
  {
    label: 'moveon',
    userDataDir: profile,
    tmuxSocket: null,
    // PHASE 282.2. The build under test, which is this checkout unless
    // REDLINEMOVEON_CHECKOUT names another; `.` is resolved against it.
    cwd: APP_ROOT,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
    ceilingMs: 15 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90000);
    say(`app window at ${url}, pid ${String(handle.appPid())}`);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });
      for (;;) {
        if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
        await sleep(50);
      }
      await drive(cdp, { projectPath: project, editorWidth: 1000, sidebarWidth: 300 });
      await sleep(1500);

      // The agent's write: the committed draft against eight moved words.
      shellWrite(NOTES, version(1));
      await openRedline(cdp, NOTES);
      await until(cdp, hasChanges(8), 30000);

      if (PARENT) await driveParent(cdp);
      else if (runs('H')) await driveHead(cdp);

      // PR 28's head has the move-on, so H is graded there exactly as at HEAD.
      // PHASE 282.2: a subset that leaves H out grades no whole round, and
      // says so rather than reporting the drive it skipped as a failure.
      if (PARENT || runs('H')) {
        const bad = grade(readings, PARENT ? 'parent' : 'head');
        check(
          'G1',
          PARENT
            ? 'THE PARENT: the arrows stop at the ends, an accept leaves nothing current, the second ⌥↩ accepts nothing, and the rewind leaves nothing current'
            : 'THE WHOLE ROUND: both verbs move on, the arrows loop, the file moves only when a rewind writes it, and the end of the document is quiet',
          bad.length === 0,
          bad.length === 0 ? 'every arm above agrees' : bad.join('; ')
        );
      } else {
        note('G1', 'H was not run, so the whole round is not graded', `REDLINEMOVEON_ARMS=${ARMS_RAW}`);
      }

      const ranArms = CHOSEN.arms.filter((a) => a !== 'H');
      if (PARENT) {
        note('G2', 'PHASE 282’s arms O, L, C, R and T and Phase 282.2’s U and Z were not run', 'the five are graded against PR 28’s head: ACCEPT_ADVANCE_PARENT=282');
      } else if (ranArms.length === 0) {
        note('G2', 'no arm after H was chosen', `REDLINEMOVEON_ARMS=${ARMS_RAW}`);
      } else {
        await driveArms(cdp);
        const graded = gradeArms(readings, PR28_HEAD ? 'pr28' : 'head');
        // Only the arms that ran: one left out by the knob is not a finding.
        const armBad = armFindings(graded, ranArms);
        check(
          'G2',
          ARMS_RAW !== ''
            ? `THE ARMS CHOSEN, ${ranArms.join(', ')}, graded ${PR28_HEAD ? 'as PR 28’s head' : 'as HEAD'}`
            : PR28_HEAD
              ? 'PR 28’S HEAD: the move lands one change early after an outside write, the keyboard drops with the last change, ⌥⌫ ⌥↩ draws a change backwards, a held ⌥⌫ rewinds more than one, and a typing burst is saved scrambled'
              : 'PHASE 282, 282.2 AND 297: the move follows the change that came next, the keyboard stays, one press is one press, a typing burst is saved whole, undoing your edits lets a rewound change be accepted, a ⌘Z too many taken back does not lose that, and a keystroke stays in the tab it was typed in',
          armBad.length === 0,
          armBad.length === 0 ? 'every arm that ran agrees' : armBad.join('; ')
        );
      }
    } finally {
      writeFileSync(readingsFile, JSON.stringify(readings, null, 2));
      cdp.close();
    }
  }
);

const sessionsAfter = machineSessionCount();
check(
  'X1',
  '-L gmux sessions on this machine unmoved',
  sessionsBefore === sessionsAfter,
  `${String(sessionsBefore)} -> ${String(sessionsAfter)}`
);
say('');
say(`${String(rows.filter((r) => r.pass === true).length)} passed, ${String(failures.length)} failed, ${String(rows.filter((r) => r.pass === null).length)} notes`);
say(`readings at ${readingsFile}`);
if (failures.length > 0) {
  for (const f of failures) say(`FAILURE: ${f}`);
  process.exit(1);
}
process.exit(0);
