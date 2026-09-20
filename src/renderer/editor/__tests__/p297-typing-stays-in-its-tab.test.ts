/**
 * PHASE 297. A KEYSTROKE STAYS IN THE TAB IT WAS TYPED IN.
 *
 * Type one character in one file's Redline view, click another Redline tab, and
 * the second file's buffer became the FIRST file's whole text: the arriving tab
 * read unsaved, the page drew every word of its own file as deleted, and ⌘S
 * wrote the first file's contents over the second with nothing asked. Auto save
 * needs no key at all. Three of Phase 290's verifiers read it in the running app
 * and measured it identical at 0.108.0, so every release from 0.102.0 carries it.
 *
 * ## The order, and it is why no unit test caught this for eleven releases
 *
 * `EditorPanel.tsx` draws `<RedlineDocument tab={activeTab} />` with NO `key`,
 * so a tab click is a prop change through one mount. The render that carries
 * the new tab still carries the old tab's typing state, because that state is
 * the hook's own `useState` and nothing has reset it yet. ./redline-edits' tab
 * effect runs first and calls `setState`, but a `setState` from a passive effect
 * schedules a re-render as a TASK — while the edit effect below it runs in the
 * SAME commit, for the arriving tab, with the departing tab's text, and its
 * continuation resumes after ONE MICROTASK. A microtask cannot lose to a task,
 * so the write into the wrong buffer always wins.
 *
 * Under `act` that is not true: an update scheduled from a passive effect is
 * flushed inside the act loop before the continuation's microtask, so a case
 * that wraps the switch in `act` observes reset-then-continuation, an order the
 * app has never had, and passes at the parent. This file therefore drives the
 * switch through `rig.switchTo`, which is `flushSync` — the discrete lane a
 * click commits in — and reads its evidence before the next `act`. That is the
 * ONE driver this file trusts and the refusal is recorded here on purpose.
 *
 * ## The evidence is the buffer's WHOLE LIFE, never a settled reading
 *
 * In two of the four corners the departing text is written into the arriving
 * tab's buffer and then, one task later, the tab's own bytes are written back
 * over it, so a reading taken at 150 or 600 or 1200 ms sees the right text and
 * a clean tab while a ⌘S inside the window has already written the wrong file.
 * So every assertion here is over `everHeldBy`, which the rig records inside the
 * model from its BIRTH — a subscription a test installs is too late, because in
 * the corner that matters the arriving tab has no model until the write creates
 * one.
 *
 * ## The corners, and what decides them
 *
 * Two knobs, and between them they explain why one verifier called a model on
 * the arriving tab a precondition and another leaked without one:
 *
 *   - `modelFirst` — did the DEPARTING tab have a model when ./live-text last
 *     looked? If it did, `liveText` at the switch render is still that tab's
 *     text, so the hook's `typedOn` is the departing file and Phase 282's
 *     `savedContents !== typedOn` guard refuses a model-less arrival. If it did
 *     not, `liveText` is already the ARRIVING tab's saved bytes, the guard
 *     passes, and a model-less arrival leaks too.
 *   - `modelFirstSecond` — did the ARRIVING tab have a model? With one, the
 *     guard is skipped entirely (`!had` is false) and the write always lands.
 *
 * Nothing here is faked except what ./p282-typing-rig already fakes. ./live-text
 * is NOT mocked, because its one-render lag is half of the mechanism above.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { AGENT, OTHER, OTHER_ID, mountTypingRig } from './p282-typing-rig';

const caret = vi.hoisted(() => ({ at: 0 }));
vi.mock('../redline-caret', async (orig) => ({
  ...(await orig<typeof import('../redline-caret')>()),
  spanOfInput: () => ({ anchor: caret.at, focus: caret.at }),
  readCurrentSelection: () => ({ anchor: caret.at, focus: caret.at }),
  restoreCurrentSelection: (_root: unknown, want: { focus: number }) => {
    caret.at = want.focus;
  },
  changeAtCaret: () => null
}));

let unmount: (() => Promise<void>) | null = null;
afterEach(async () => {
  await unmount?.();
  unmount = null;
});

/** Where the character goes in the first file. */
const KEY_AT = AGENT.indexOf('Beta') + 4;
/**
 * A word ONLY the first file has, whatever was typed into it or taken back out.
 * The two fixtures deliberately share no word, so this one test catches the
 * typed text, the saved text and the head text alike.
 */
const A_WORD = 'Alpha';

describe('typing in one Redline tab and clicking another', () => {
  for (const modelFirst of [false, true]) {
    for (const modelFirstSecond of [false, true]) {
      const corner = `${modelFirst ? 'the departing tab had a model' : 'the departing tab made its own model'}, ${
        modelFirstSecond ? 'the arriving tab has one' : 'the arriving tab has none'
      }`;
      it(`never puts the first file's text in the second file's buffer (${corner})`, async () => {
        caret.at = KEY_AT;
        const rig = await mountTypingRig({
          caret,
          holdChunk: false,
          modelFirst,
          second: true,
          modelFirstSecond
        });
        unmount = rig.unmount;
        await rig.type('X');
        await rig.settle();
        expect(rig.model()).toBe(`${AGENT.slice(0, KEY_AT)}X${AGENT.slice(KEY_AT)}`);

        // The click, in the lane a click commits in. Nothing is wrapped in
        // `act` from here to the reading below.
        await rig.switchTo(OTHER_ID);
        const duringTheWindow = {
          everHeld: rig.everHeldBy(OTHER_ID),
          model: rig.modelOf(OTHER_ID)
        };

        // And the same readings once everything has settled, which is what a
        // person would see, plus the save they would press.
        await rig.settle();
        await rig.save();
        await rig.settle();
        const reading = {
          everHeld: rig.everHeldBy(OTHER_ID),
          model: rig.modelOf(OTHER_ID),
          dirty: rig.tabOf(OTHER_ID)?.dirty,
          drawn: rig.drawn(),
          diskOfB: rig.otherDisk.text,
          diskOfA: rig.disk.text,
          toasts: rig.toasts(),
          confirm: rig.confirmTitle()
        };

        // THE WRITE, caught whether or not it was healed afterwards.
        expect(duringTheWindow.everHeld.filter((v) => v.includes(A_WORD))).toEqual([]);
        expect(reading.everHeld.filter((v) => v.includes(A_WORD))).toEqual([]);
        // A tab switch is not a keystroke, so it makes no buffer.
        expect(duringTheWindow.model).toBe(modelFirstSecond ? OTHER : null);
        expect(reading.model).toBe(modelFirstSecond ? OTHER : null);
        // Nothing to save, nothing said, and both files as they were.
        expect(reading.dirty).toBe(false);
        expect(reading.drawn).toBe(OTHER);
        expect(reading.diskOfB).toBe(OTHER);
        expect(reading.diskOfA).toBe(AGENT);
        expect(reading.toasts).toEqual([]);
        expect(reading.confirm).toBeNull();
      });
    }
  }

  it('the same when the first tab was SAVED before the click', async () => {
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: false,
      modelFirst: true,
      second: true,
      modelFirstSecond: true
    });
    unmount = rig.unmount;
    const TYPED = `${AGENT.slice(0, KEY_AT)}X${AGENT.slice(KEY_AT)}`;
    await rig.type('X');
    await rig.save();
    await rig.settle();
    expect(rig.disk.text).toBe(TYPED);
    expect(rig.tab().dirty).toBe(false);

    await rig.switchTo(OTHER_ID);
    const during = rig.everHeldBy(OTHER_ID);
    await rig.settle();
    await rig.save();
    await rig.settle();
    expect(during.filter((v) => v.includes(A_WORD))).toEqual([]);
    expect(rig.everHeldBy(OTHER_ID).filter((v) => v.includes(A_WORD))).toEqual([]);
    expect(rig.otherDisk.text).toBe(OTHER);
    expect(rig.tabOf(OTHER_ID)?.dirty).toBe(false);
  });

  it('the same when the typing was TAKEN BACK before the click', async () => {
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: false,
      modelFirst: true,
      second: true,
      modelFirstSecond: true
    });
    unmount = rig.unmount;
    await rig.type('X');
    await rig.backspace();
    await rig.settle();
    // The buffer is the file again and the tab is clean, which is the state the
    // app verifier's arm was in — and it leaked anyway, because what the hook
    // compares is a COUNT of edits and not a text.
    expect(rig.model()).toBe(AGENT);
    expect(rig.tab().dirty).toBe(false);

    await rig.switchTo(OTHER_ID);
    const during = rig.everHeldBy(OTHER_ID);
    await rig.settle();
    await rig.save();
    await rig.settle();
    expect(during.filter((v) => v.includes(A_WORD))).toEqual([]);
    expect(rig.everHeldBy(OTHER_ID).filter((v) => v.includes(A_WORD))).toEqual([]);
    expect(rig.otherDisk.text).toBe(OTHER);
    expect(rig.tabOf(OTHER_ID)?.dirty).toBe(false);
  });

  it('the control: a click with no typing in the departing tab leaks nothing', async () => {
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: false,
      modelFirst: true,
      second: true,
      modelFirstSecond: true
    });
    unmount = rig.unmount;
    await rig.switchTo(OTHER_ID);
    await rig.settle();
    await rig.save();
    await rig.settle();
    expect(rig.everHeldBy(OTHER_ID)).toEqual([OTHER]);
    expect(rig.otherDisk.text).toBe(OTHER);
    expect(rig.tabOf(OTHER_ID)?.dirty).toBe(false);
  });

  /**
   * THE OTHER HALF OF THE FIX, and it is the one a careless version breaks.
   *
   * The first keystroke of a session waits on a real Monaco chunk load, which is
   * a task-length window and not a microtask one. Click away inside it and the
   * departing tab's own continuation lands afterwards — it MUST still reach the
   * departing tab's buffer. A fix that clears the wanted text at the tab change,
   * or that keeps one slot for every tab, drops that character and leaves the
   * tab reading unsaved with nothing unsaved.
   */
  it('a character typed before the click still reaches ITS OWN buffer', async () => {
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: true,
      modelFirst: false,
      second: true,
      modelFirstSecond: false
    });
    unmount = rig.unmount;
    const TYPED = `${AGENT.slice(0, KEY_AT)}X${AGENT.slice(KEY_AT)}`;
    // The first keystroke of the session: its continuation is now waiting on the
    // chunk, so nothing has been written anywhere yet.
    await rig.type('X');
    expect(rig.model()).toBeNull();

    await rig.switchTo(OTHER_ID);
    await rig.settle();
    // The chunk lands, and the character goes where it was typed.
    await rig.releaseChunk();
    await rig.settle();
    expect(rig.model()).toBe(TYPED);
    expect(rig.tab().dirty).toBe(true);
    expect(rig.everHeldBy(OTHER_ID).filter((v) => v.includes(A_WORD))).toEqual([]);
  });

  /**
   * COMING BACK TO A TAB STARTS A NEW UNDO STEP.
   *
   * A run of typing is one ⌘Z while the next keystroke continues the last one,
   * which is a caret a character away and a clock inside the run. Both of those
   * were remembered across a tab change, so the first keystroke after coming
   * back to a dirty tab could be folded into the undo step before it — decided
   * by a caret and a clock that belong to a DIFFERENT FILE. The arriving tab has
   * to be dirty for it to bite, because the run also requires that, which is why
   * this arm types in both tabs before it comes back.
   */
  it('a keystroke after coming back to a dirty tab starts its own undo step', async () => {
    const AT = 10;
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: false,
      modelFirst: true,
      second: true,
      modelFirstSecond: true
    });
    unmount = rig.unmount;
    await rig.type('X');
    await rig.settle();
    const groupsAfterFirst = rig.undoGroupsOf(rig.tab().id);
    expect(groupsAfterFirst).toBe(1);

    // A character in the other tab, one offset away from where this tab's caret
    // will be, and inside the same run of time.
    await rig.switchTo(OTHER_ID);
    await rig.settle();
    caret.at = AT;
    await rig.type('Y');
    await rig.settle();
    expect(rig.tabOf(OTHER_ID)?.dirty).toBe(true);

    // Back to the first tab, which is still dirty, and one character at that
    // same offset. It is a new thought and it is its own ⌘Z.
    await rig.switchTo(rig.tab().id);
    await rig.settle();
    expect(rig.tab().dirty).toBe(true);
    caret.at = AT;
    await rig.type('Z');
    await rig.settle();
    expect(rig.undoGroupsOf(rig.tab().id)).toBe(groupsAfterFirst + 1);
    // And it went into its own file.
    expect(rig.model()).toContain('Z');
    expect(rig.everHeldBy(OTHER_ID).filter((v) => v.includes(A_WORD))).toEqual([]);
  });

  /**
   * TWO TABS WITH A CONTINUATION IN THE AIR AT ONCE, which one slot cannot
   * serve. Both awaits are on the SAME chunk promise, so this is one release
   * rather than a rare interleaving.
   */
  it('two tabs waiting on the same chunk each keep their own character', async () => {
    caret.at = KEY_AT;
    const rig = await mountTypingRig({
      caret,
      holdChunk: true,
      modelFirst: false,
      second: true,
      modelFirstSecond: false
    });
    unmount = rig.unmount;
    const TYPED = `${AGENT.slice(0, KEY_AT)}X${AGENT.slice(KEY_AT)}`;
    await rig.type('X');
    await rig.switchTo(OTHER_ID);
    await rig.settle();
    // A character in the ARRIVING tab while the first one is still in the air.
    const AT2 = OTHER.indexOf('Only');
    const WANT_OTHER = `${OTHER.slice(0, AT2)}Y${OTHER.slice(AT2)}`;
    caret.at = AT2;
    await rig.type('Y');
    await rig.releaseChunk();
    await rig.settle();
    expect(rig.model()).toBe(TYPED);
    expect(rig.modelOf(OTHER_ID)).toBe(WANT_OTHER);
    expect(rig.everHeldBy(OTHER_ID).filter((v) => v.includes(A_WORD))).toEqual([]);
  });
});
