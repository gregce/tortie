/**
 * redline-accept-probe.mts. The runtime half of Phase 238's five new arms on
 * `npm run conformance:redline` (rule 18).
 *
 * It runs the SHIPPING accept, being src/renderer/editor/rewind.ts's
 * `acceptChange`, `acceptAll` and `planAccept` and
 * src/renderer/editor/redline-accept.ts's `pressAccept`, under node, and
 * prints ONE JSON line last. It launches no Electron, opens no window, spawns
 * nothing, makes no request and reads nothing under the person's home.
 *
 * IT WRITES EXACTLY ONE FILE and it is the point of arm 4. Research 83 B.5's
 * headline measurement is that a per-phrase accept leaves the file's md5
 * unchanged, and the only way to say that as a number is to have a file. So
 * this probe makes a scratch directory of its own with `mkdtemp` under the
 * OS temporary directory, puts one file in it, and removes the whole thing in
 * a `finally` whatever happened. Nothing under the person's home, nothing in
 * the checkout, and nothing tracked.
 *
 * The module directory is `ACCEPT_DIR` (default `src/renderer/editor`) so the
 * gate can point the same probe at a copy of the chain with one clause
 * ablated. The knob is not `GMUX_` prefixed, because the contract inventory
 * sweeps that prefix, and it is the same shape ./redline-rewind-probe.mts
 * uses. Only the value modules of the chain are copied, and their type
 * imports are erased by tsx.
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env['ACCEPT_DIR'] ?? 'src/renderer/editor';
const rewind = (await import(
  pathToFileURL(resolve(DIR, 'rewind.ts')).href
)) as typeof import('../src/renderer/editor/rewind');
const documentModule = (await import(
  pathToFileURL(resolve(DIR, 'redline-document.ts')).href
)) as typeof import('../src/renderer/editor/redline-document');
const acceptModule = (await import(
  pathToFileURL(resolve(DIR, 'redline-accept.ts')).href
)) as typeof import('../src/renderer/editor/redline-accept');
const pressModule = (await import(
  pathToFileURL(resolve(DIR, 'redline-press.ts')).href
)) as typeof import('../src/renderer/editor/redline-press');
const journal = (await import(
  pathToFileURL(resolve(DIR, 'redline-journal.ts')).href
)) as typeof import('../src/renderer/editor/redline-journal');

const { acceptAll, acceptChange, changesOf, mix, planAccept, planRewind } = rewind;
const { composeRedlineDocument } = documentModule;
const { pressAccept } = acceptModule;

const sha = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

// Research 83 B.1, the real paragraph — the same two strings Phase 227 drives.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

const doc = composeRedlineDocument(BASELINE, CURRENT);
const changes = changesOf(doc.runs);
const GEN = 7;

// ---------------------------------------------------------------------------
// ARM 1: accept over all 256 subsets.
//
// Accepting a subset one change at a time, re-deriving the picture between
// each — which is what the view really does, because every accept moves the
// baseline and redraws — must land on the single `mix` over the whole subset,
// and at every one of the 256 the CURRENT text must project back byte for
// byte, which is research 83 B.5's "not one byte of the file changed" said in
// the only terms a pure module can say it.
// ---------------------------------------------------------------------------
let agreed = 0;
let countsHeld = 0;
let currentMoved = 0;
const distinct = new Set<string>();
for (let bits = 0; bits < 256; bits += 1) {
  const take = new Set<number>();
  for (let i = 0; i < 8; i += 1) if (bits & (1 << i)) take.add(i);
  let baseline = BASELINE;
  for (const i of [...take].sort((a, b) => a - b)) {
    const d = composeRedlineDocument(baseline, CURRENT);
    const cs = changesOf(d.runs);
    const at = cs.findIndex(
      (q) => q.del === changes[i]?.del && q.ins === changes[i]?.ins
    );
    if (at < 0) break;
    baseline = acceptChange(d.runs, cs, at);
  }
  if (baseline === mix(doc.runs, changes, take)) agreed += 1;
  distinct.add(baseline);
  const after = composeRedlineDocument(baseline, CURRENT);
  if (changesOf(after.runs).length === 8 - take.size) countsHeld += 1;
  const projected = after.runs
    .filter((r) => r.kind !== 'del')
    .map((r) => r.text)
    .join('');
  if (projected !== CURRENT) currentMoved += 1;
}
const subsets = {
  subsets: 256,
  agreed,
  countsHeld,
  distinct: distinct.size,
  currentMoved
};

// ---------------------------------------------------------------------------
// ARMS 2 AND 3: research 83 B.8a's own document, driven through the SHIPPING
// press with a REAL accept moving the generation between the draw and the
// press. Two identical phrases, and a heading clause whose length is exactly
// the gap between their two baseline offsets, so the stale identity resolves
// to exactly one change and it is the WRONG one.
// ---------------------------------------------------------------------------
const B8A_LEFT =
  'The consignment note, filed on the Tuesday of that week, is here.\nThe first lorry was red on Monday.\nThe second lorry was red on Friday.\n';
const B8A_RIGHT =
  'The consignment note is here.\nThe first lorry was blue on Monday.\nThe second lorry was blue on Friday.\n';
const b8aDrawn = changesOf(composeRedlineDocument(B8A_LEFT, B8A_RIGHT).runs);
const heading = b8aDrawn[0]!;
const firstLorry = b8aDrawn[1]!;

// The person accepts the heading clause. The baseline moves and its generation
// with it, which is what nothing before this phase made happen often.
const acceptedHeading = planAccept({
  baseline: B8A_LEFT,
  baselineGeneration: 1,
  drawnGeneration: 1,
  current: B8A_RIGHT,
  truncated: false,
  pressed: { off: heading.off, del: heading.del, ins: heading.ins }
});
const movedBaseline =
  acceptedHeading.outcome === 'accept' ? acceptedHeading.baseline : B8A_LEFT;

// What the stale identity WOULD resolve to with no guard: exactly one change,
// and it is index 1, the SECOND lorry. This is the reading that makes the
// refusal below worth something rather than a tautology.
const freshAfterAccept = changesOf(
  composeRedlineDocument(movedBaseline, B8A_RIGHT).runs
);
const wouldResolveTo = freshAfterAccept.findIndex(
  (q) =>
    q.off === firstLorry.off && q.del === firstLorry.del && q.ins === firstLorry.ins
);

// ARM 2: the REWIND the person drew before the accept, pressed after it,
// through the SHIPPING press with the SHIPPING decision behind it.
const b8aDisk = { text: B8A_RIGHT };
const b8aApply = async (
  ctx: import('../src/renderer/editor/redline-write').RewindContext
) => {
  await Promise.resolve();
  const plan = planRewind({
    baseline: ctx.baseline,
    baselineGeneration: ctx.generation,
    drawnGeneration: ctx.drawnGeneration,
    fresh: b8aDisk.text,
    truncated: false,
    pressed: ctx.pressed,
    kind: ctx.kind
  });
  if (plan.outcome === 'refused') return { refused: plan.why } as const;
  b8aDisk.text = plan.contents;
  return { wrote: sha(plan.contents) } as const;
};
let refusedWord: string | null = null;
const rewindAfterAccept = await pressModule.pressRedline(
  'rewind',
  {
    id: 'p238-b8a',
    root: '/repo',
    path: '/repo/note.txt',
    // The baseline and the generation are the LIVE ones, read at the press:
    // the accept above moved both.
    baseline: movedBaseline,
    generation: 2,
    dirty: false
  },
  {
    focused: () => ({
      off: firstLorry.off,
      del: firstLorry.del,
      ins: firstLorry.ins,
      // The generation the picture the person is looking at was drawn at.
      generation: 1
    }),
    apply: b8aApply,
    refuse: (why) => {
      refusedWord = why;
    }
  }
);
journal.forgetRewindJournal('p238-b8a');
const pressAfterAccept = {
  outcome: rewindAfterAccept.outcome,
  why: 'why' in rewindAfterAccept ? rewindAfterAccept.why : null,
  said: refusedWord,
  // Nothing was written: the file is still what it was.
  fileUnmoved: b8aDisk.text === B8A_RIGHT,
  // And the trap really was set: without the guard the identity resolves to
  // exactly one change, and it is the second lorry rather than the first.
  wouldResolveTo,
  wouldBeWrong: wouldResolveTo === 1
};

// ARM 3: the ACCEPT the person drew before the first accept, pressed after it.
// The same guard, asked by the same integer, on the gesture that moves it.
let acceptRefused: string | null = null;
let advanced = 0;
const staleAccept = pressAccept(
  'one',
  {
    id: 'p238-b8a',
    baseline: movedBaseline,
    generation: 2,
    current: B8A_RIGHT,
    truncated: false
  },
  {
    focused: () => ({
      off: firstLorry.off,
      del: firstLorry.del,
      ins: firstLorry.ins,
      generation: 1
    }),
    advance: () => {
      advanced += 1;
    },
    refuse: (why) => {
      acceptRefused = why;
    },
    now: () => 0
  }
);
const acceptAfterAccept = {
  outcome: staleAccept.outcome,
  why: 'why' in staleAccept ? staleAccept.why : null,
  said: acceptRefused,
  advanced
};

// ---------------------------------------------------------------------------
// ARM 4: AN ACCEPT WRITES NO FILE, over a REAL file on a real disk.
//
// A digest of the file before and after driving the shipping accept press.
// The half that could not fail on its own is the "unmoved" reading, so the
// SAME arm drives a REWIND through the same harness over the same file and
// reads its digest moving: the reader is shown able to see a write in the
// same breath it says it saw none. The rewind's byte movement is the
// harness's `apply`, standing in for Phase 226's guarded channel, which needs
// an Electron; what it proves here is only that the digest reader works.
// ---------------------------------------------------------------------------
const scratch = mkdtempSync(join(tmpdir(), 'p238-accept-'));
let noFileWritten: Record<string, unknown>;
try {
  const file = join(scratch, 'notes.txt');
  writeFileSync(file, CURRENT, 'utf8');
  const before = sha(readFileSync(file, 'utf8'));
  const e4 = changes[4]!;
  let acceptedBaseline: string | null = null;
  pressAccept(
    'one',
    { id: 'p238-file', baseline: BASELINE, generation: GEN, current: CURRENT, truncated: false },
    {
      focused: () => ({ off: e4.off, del: e4.del, ins: e4.ins, generation: GEN }),
      advance: (contents) => {
        acceptedBaseline = contents;
      },
      refuse: () => undefined,
      now: () => 0
    }
  );
  const afterAccept = sha(readFileSync(file, 'utf8'));
  // The control, through the SHIPPING press: a rewind of the same change.
  const disk = { text: CURRENT };
  await pressModule.pressRedline(
    'rewind',
    { id: 'p238-file', root: scratch, path: file, baseline: BASELINE, generation: GEN, dirty: false },
    {
      focused: () => ({ off: e4.off, del: e4.del, ins: e4.ins, generation: GEN }),
      apply: async (ctx) => {
        await Promise.resolve();
        const plan = planRewind({
          baseline: ctx.baseline,
          baselineGeneration: ctx.generation,
          drawnGeneration: ctx.drawnGeneration,
          fresh: disk.text,
          truncated: false,
          pressed: ctx.pressed,
          kind: ctx.kind
        });
        if (plan.outcome === 'refused') return { refused: plan.why };
        disk.text = plan.contents;
        writeFileSync(file, plan.contents, 'utf8');
        return { wrote: sha(plan.contents) };
      },
      refuse: () => undefined
    }
  );
  journal.forgetRewindJournal('p238-file');
  const afterRewind = sha(readFileSync(file, 'utf8'));
  noFileWritten = {
    acceptFileDigestMoved: afterAccept !== before,
    rewindFileDigestMoved: afterRewind !== afterAccept,
    // What the accept DID produce, so an ablation of the advance moves this.
    acceptedBaselineSha: acceptedBaseline === null ? null : sha(acceptedBaseline),
    acceptedIsMixOfOne: acceptedBaseline === mix(doc.runs, changes, new Set([4]))
  };
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// ARM 5: accept-all leaves a redline with zero changes, and the file is still
// the file. Research 83 B.5's `ACCEPT ALL : baseline := the file bytes` and
// `recomposed redline is empty : true (1 run, 0 blocks)`.
// ---------------------------------------------------------------------------
let allAdvancedTo: string | null = null;
const allResult = pressAccept(
  'all',
  { id: 'p238-all', baseline: BASELINE, generation: GEN, current: CURRENT, truncated: false },
  {
    // Accept-all names no change, so this must never be asked. If it is, the
    // reading below says so.
    focused: () => {
      allAdvancedTo = 'focus was asked';
      return null;
    },
    advance: (contents) => {
      allAdvancedTo = contents;
    },
    refuse: () => undefined,
    now: () => 0
  }
);
const afterAll = composeRedlineDocument(
  allAdvancedTo ?? BASELINE,
  CURRENT
);
const acceptAllEmpty = {
  outcome: allResult.outcome,
  // It never asked for a focused change, because it is a document verb.
  askedFocus: allAdvancedTo === 'focus was asked',
  baselineIsCurrent: allAdvancedTo === CURRENT,
  sameAsAcceptAll: allAdvancedTo === acceptAll(CURRENT),
  changesLeft: changesOf(afterAll.runs).length,
  runs: afterAll.runs.length,
  nonSameRuns: afterAll.runs.filter((r) => r.kind !== 'same').length
};

console.log(
  JSON.stringify({
    subsets,
    pressAfterAccept,
    acceptAfterAccept,
    noFileWritten,
    acceptAllEmpty
  })
);
