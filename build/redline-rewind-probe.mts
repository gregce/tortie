/**
 * redline-rewind-probe.mts. The runtime half of Phase 227's six new arms on
 * `npm run conformance:redline` (item 8).
 *
 * It runs the SHIPPING pure press, src/renderer/editor/rewind.ts, under node
 * over two strings per arm, and prints ONE JSON line last. It launches no
 * Electron, opens no window, spawns nothing, makes no request and reads
 * nothing under the person's home: every fixture is a string written here.
 *
 * The module directory is `REWIND_DIR` (default `src/renderer/editor`) so the
 * gate can point the same probe at a copy of the pure chain with one clause
 * ablated. The knob is not `GMUX_` prefixed, because the contract inventory
 * sweeps that prefix. Only the four value modules of the chain are copied by
 * the gate — rewind, redline-document, redline and paths — and their type
 * imports (@shared/fs-ops, @pierre/diffs) are erased by tsx.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env['REWIND_DIR'] ?? 'src/renderer/editor';
const rewind = (await import(
  pathToFileURL(resolve(DIR, 'rewind.ts')).href
)) as typeof import('../src/renderer/editor/rewind');
const document = (await import(
  pathToFileURL(resolve(DIR, 'redline-document.ts')).href
)) as typeof import('../src/renderer/editor/redline-document');

const { planRewind, changesOf, rewindRefusalKey } = rewind;
const { composeRedlineDocument } = document;

// Research 83 B.1, the real paragraph.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

/** The eight drawn changes, and E4 (disposable client -> throwaway viewer). */
const changes = changesOf(composeRedlineDocument(BASELINE, CURRENT).runs);
const e4 = changes[4]!;
const pressedE4 = { off: e4.off, del: e4.del, ins: e4.ins };
const GEN = 5;

const input = (over: Partial<import('../src/renderer/editor/rewind').RewindInput>) => ({
  baseline: BASELINE,
  baselineGeneration: GEN,
  drawnGeneration: GEN,
  fresh: CURRENT,
  truncated: false,
  pressed: pressedE4,
  kind: 'rewind' as const,
  ...over
});

const say = (plan: import('../src/renderer/editor/rewind').RewindPlan): string =>
  plan.outcome === 'write' ? 'write' : `refused/${plan.why}`;

// ARM 1: the stale draw (B.4d). An agent appended a paragraph between the draw
// and the press. Re-deriving at press time must land the rewind AND keep the
// arrival, which the naive projection of the drawn list would destroy.
const ARRIVAL = '\nEvery session carries its own name, so a crash is an interruption to the interface.\n';
const staleFresh = CURRENT + ARRIVAL;
const stalePlan = planRewind(input({ fresh: staleFresh, pressed: pressedE4 }));
const staleDraw = {
  outcome: say(stalePlan),
  rewound: stalePlan.outcome === 'write' && stalePlan.contents.includes('disposable client'),
  keptArrival: stalePlan.outcome === 'write' && stalePlan.contents.includes('Every session carries its own name')
};

// ARM 2: the truncated read, BOTH shapes (E.7a). A small tail and a large
// tail fail differently WITHOUT the guard (write vs whole-revert); WITH it
// both refuse fileTooLarge before the compose.
const exactTail = CURRENT; // a small file whose tail was cut
const approxLines = Array.from({ length: 1400 }, (_, i) => `old line ${i}`).join('\n') + '\n';
const approxFresh = approxLines.replace('old line 3', 'new line 3');
const truncated = {
  exact: say(planRewind(input({ fresh: exactTail, truncated: true, pressed: pressedE4 }))),
  approx: say(
    planRewind({
      baseline: approxLines,
      baselineGeneration: GEN,
      drawnGeneration: GEN,
      fresh: approxFresh,
      truncated: true,
      pressed: { off: 0, del: approxLines, ins: approxFresh },
      kind: 'rewind'
    })
  )
};

// ARM 3: the moved baseline generation (B.8a). It must refuse BEFORE reading:
// even a truncated, U+FFFD-bearing fresh cannot change the answer.
const movedBaseline = {
  plain: say(planRewind(input({ drawnGeneration: GEN - 1, pressed: pressedE4 }))),
  // If it read first, this fresh would decide decodeLoss or fileTooLarge; it
  // must still be baselineMoved, proving the guard is first.
  first: say(
    planRewind(input({ drawnGeneration: GEN - 1, truncated: true, fresh: 'x�y', pressed: pressedE4 }))
  )
};

// ARM 4: the path outside every root (E.5). The channel answers refused/outside
// and the view surfaces it through rewindRefusalKey.
const outsideRoot = {
  key: rewindRefusalKey({ outcome: 'refused', why: 'outside', reason: 'x' }),
  // and a wrote answer maps to null, so the mapping is not a constant.
  wroteKey: rewindRefusalKey({ outcome: 'wrote', sha256: 'a', bytes: 1 })
};

// ARM 5: the person's own insertion (A8a). A fresh baseline, the person wrote
// a paragraph, an agent tidied a sentence. Pressing the paragraph must rewind
// it AND be undoable from the journal byte for byte.
const OWN_BASE = '# Notes\n\nThe release is on Friday.\n';
const OWN = 'We should say plainly that the shadow baseline is not a backup.';
const OWN_AFTER = '# Notes\n\nThe release ships on Friday.\n\n' + OWN + '\n';
const ownChanges = changesOf(composeRedlineDocument(OWN_BASE, OWN_AFTER).runs);
const ownIdx = ownChanges.findIndex((c) => c.ins.includes('not a backup'));
const ownPressed = ownIdx >= 0
  ? { off: ownChanges[ownIdx]!.off, del: ownChanges[ownIdx]!.del, ins: ownChanges[ownIdx]!.ins }
  : { off: 0, del: '', ins: '' };
const ownInput = (over: Partial<import('../src/renderer/editor/rewind').RewindInput>) => ({
  baseline: OWN_BASE,
  baselineGeneration: 1,
  drawnGeneration: 1,
  fresh: OWN_AFTER,
  truncated: false,
  pressed: ownPressed,
  kind: 'rewind' as const,
  ...over
});
const ownRewind = planRewind(ownInput({}));
const ownRewound = ownRewind.outcome === 'write' ? ownRewind.contents : null;
const ownUndo = ownRewound === null ? null : planRewind(ownInput({ fresh: ownRewound, kind: 'undo' }));
const ownInsertion = {
  rewindOutcome: say(ownRewind),
  // The paragraph is gone after the rewind.
  gone: ownRewound !== null && !ownRewound.includes('not a backup'),
  undoOutcome: ownUndo === null ? 'none' : say(ownUndo),
  // The undo brought the file back byte for byte.
  restored: ownUndo !== null && ownUndo.outcome === 'write' && ownUndo.contents === OWN_AFTER
};

// ARM 6: the encoding round trip (E.7b). A fresh whose UTF-8 decode produced a
// replacement character is refused as a decode loss before the compose.
const latin = CURRENT.replace('throwaway viewer', 'throwaway �viewer');
const encoding = {
  outcome: say(planRewind(input({ fresh: latin, pressed: pressedE4 }))),
  // A file that legitimately holds no U+FFFD writes, so the arm is not inert.
  clean: say(planRewind(input({ pressed: pressedE4 })))
};

console.log(
  JSON.stringify({ staleDraw, truncated, movedBaseline, outsideRoot, ownInsertion, encoding })
);
