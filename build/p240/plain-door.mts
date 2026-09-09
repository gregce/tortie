/**
 * plain-door.mts. What the PLAIN door's Overwrite does to a third writer, the
 * two policies measured side by side (Phase 240 committer's round).
 *
 * ## Why it exists
 *
 * The fix round gave the plain door — a symbolic link inside a project, a file
 * outside every open project, a never-saved draft — a READING before its write,
 * and left its Overwrite unconditional, with the reason written down that
 * re-reading "would find the same difference for ever". The guarded door ten
 * lines away refutes that: it re-reads against the digest of what was SHOWN
 * rather than against `savedContents`, and it terminates. The verifier measured
 * the consequence in the running app — a third writer landing while the
 * question was on screen lost 38 characters here, while the guarded door
 * re-asked in the same run — and at node level 500 of 500 destroyed.
 *
 * This is that node-level measurement kept, so the number is re-derivable
 * rather than quoted. It drives REAL files with a REAL racing writer, one
 * `/bin/sh` per round, and the two arms differ in ONE line: what the Overwrite
 * does when it is pressed.
 *
 * ## What it is not
 *
 * It is a port of the door's SEQUENCE (read, compare, ask, act) and not the
 * shipping function, which lives inside `createTabIo` in the renderer and needs
 * Monaco and the store to load. The SHIPPING door is pinned three other ways
 * and this measures the arithmetic that made those pins worth having:
 * `npm run conformance:save` rules 2c and 2d read the real source by matching
 * braces, `p240-guarded-save.test.ts` drives the real `save`, and
 * `npm run probe:p240` arm F presses the real buttons in the running app.
 *
 * ## Safety
 *
 * It launches no Electron, starts no tmux server, spawns no agent, makes no
 * request and reads nothing under the person's home. Every byte it writes lands
 * inside one scratch directory it makes and removes in a `finally`, and every
 * `/bin/sh` it starts is synchronous and has exited before the call returns.
 *
 * Run: `npx tsx build/p240/plain-door.mts` (about two seconds).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The person's typing, on top of what Tortie read. */
const typed = (read: string) => `PERSON ${read}`;

type Policy = 'unconditional' | 'reads-again';

interface Arm {
  policy: Policy;
  rounds: number;
  asked: number;
  thirdWriterAskedAbout: number;
  thirdWriterDestroyedUnasked: number;
  askedAgain: number;
  charsDestroyed: number;
  wroteInTheEnd: number;
}

const root = mkdtempSync(join(tmpdir(), 'p240-plain-door-'));
/** A plain shell writes the file from outside — the charter's word for an agent. */
const outside = (file: string, text: string) => {
  const r = spawnSync('/bin/sh', ['-c', 'cat > "$1"', 'sh', file], {
    input: text,
    encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('shell write failed');
};

/**
 * One round of the door, with the Overwrite policy handed in.
 *
 * The reading is `fs:readFile`'s: a whole-file read whose answer is compared
 * with the text the buffer was built from, or, at the press, with the text the
 * person was SHOWN.
 */
function round(file: string, i: number, policy: Policy): Partial<Arm> {
  const savedContents = `V1 round ${String(i)}\n`;
  writeFileSync(file, savedContents);
  const buffer = typed(savedContents);
  // The agent writes while the person types.
  outside(file, `AGENT round ${String(i)}, a whole paragraph of its own.\n`);
  // ⌘S. The door reads first.
  const shown = readFileSync(file, 'utf8');
  if (shown === savedContents) return {};
  // The question is on screen. A third writer arrives.
  const third = `THIRD round ${String(i)}, which nobody has read yet.\n`;
  outside(file, third);
  // Overwrite is pressed.
  if (policy === 'unconditional') {
    writeFileSync(file, buffer);
  } else {
    const now = readFileSync(file, 'utf8');
    if (now !== shown) {
      // The same choice again, over the newer bytes. Nobody writes now, so the
      // second press goes through — which is what proves it terminates.
      const shown2 = now;
      const now2 = readFileSync(file, 'utf8');
      if (now2 === shown2) writeFileSync(file, buffer);
      // The third writer's bytes are gone by the second press, and that is
      // the point: the person was ASKED about them and said yes. Nothing here
      // is counted as destroyed, because destroyed means gone unasked.
      return {
        asked: 1,
        askedAgain: 1,
        thirdWriterAskedAbout: 1,
        wroteInTheEnd: readFileSync(file, 'utf8') === buffer ? 1 : 0,
        charsDestroyed: 0
      };
    }
    writeFileSync(file, buffer);
  }
  const after = readFileSync(file, 'utf8');
  const survived = after === third;
  return {
    asked: 1,
    askedAgain: 0,
    thirdWriterAskedAbout: 0,
    thirdWriterDestroyedUnasked: survived ? 0 : 1,
    charsDestroyed: survived ? 0 : third.length,
    wroteInTheEnd: after === buffer ? 1 : 0
  };
}

function drive(policy: Policy, rounds: number): Arm {
  const file = join(root, `${policy}.txt`);
  const arm: Arm = {
    policy,
    rounds,
    asked: 0,
    thirdWriterAskedAbout: 0,
    thirdWriterDestroyedUnasked: 0,
    askedAgain: 0,
    charsDestroyed: 0,
    wroteInTheEnd: 0
  };
  for (let i = 0; i < rounds; i += 1) {
    const r = round(file, i, policy);
    arm.asked += r.asked ?? 0;
    arm.askedAgain += r.askedAgain ?? 0;
    arm.thirdWriterAskedAbout += r.thirdWriterAskedAbout ?? 0;
    arm.thirdWriterDestroyedUnasked += r.thirdWriterDestroyedUnasked ?? 0;
    arm.charsDestroyed += r.charsDestroyed ?? 0;
    arm.wroteInTheEnd += r.wroteInTheEnd ?? 0;
  }
  return arm;
}

const ROUNDS = Number(process.env.P240_ROUNDS ?? '500');
let problems: string[] = [];
let parentChars = 0;
try {
  const parent = drive('unconditional', ROUNDS);
  const head = drive('reads-again', ROUNDS);
  parentChars = parent.charsDestroyed;
  console.log(JSON.stringify({ rounds: ROUNDS, parent, head }, null, 2));
  problems = [
    parent.thirdWriterDestroyedUnasked === ROUNDS
      ? null
      : `the parent policy destroyed ${String(parent.thirdWriterDestroyedUnasked)} of ${String(ROUNDS)} unasked, and it should destroy every one`,
    head.thirdWriterDestroyedUnasked === 0
      ? null
      : `the shipping policy destroyed ${String(head.thirdWriterDestroyedUnasked)} third writers unasked`,
    head.askedAgain === ROUNDS
      ? null
      : `the shipping policy asked again ${String(head.askedAgain)} of ${String(ROUNDS)} times`,
    head.wroteInTheEnd === ROUNDS
      ? null
      : `the shipping policy wrote in the end ${String(head.wroteInTheEnd)} of ${String(ROUNDS)} times, so it does not terminate`
  ].filter((x): x is string => x !== null);
} finally {
  rmSync(root, { recursive: true, force: true });
}
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`[p240-plain-door] ${p}\n`);
  process.exitCode = 1;
} else {
  console.log(
    `[p240-plain-door] OK: ${String(ROUNDS)} rounds, ${String(parentChars)} characters destroyed unasked by the unconditional Overwrite and 0 by the shipping one, which asked again ${String(ROUNDS)} times and still wrote ${String(ROUNDS)} times, so it terminates.`
  );
}
