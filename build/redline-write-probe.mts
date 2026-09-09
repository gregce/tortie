/**
 * redline-write-probe.mts. The runtime half of `npm run conformance:redline-write`
 * (Phase 226).
 *
 * Runs the SHIPPING guarded write under node over a scratch directory it makes
 * and removes in a `finally`, one arm per refusal and per protection, and
 * prints ONE JSON line last. It reads nothing under the person's home: every
 * fixture is written here, the project root list is a function answering the
 * scratch root, and the only processes it starts are `mkfifo` for one
 * fixture and two node children of itself: one for the kill arm, waited for
 * synchronously and ended by its own SIGKILL, and one for the FIFO arm, in
 * its own process group, which the parent ends whole in a `finally` whatever
 * it answered.
 *
 * The module is loaded from `P226_MODULES` (default `src/main/fs`) so the gate
 * can point the same probe at an ablated copy of the channel. The knob is not
 * `GMUX_` prefixed on purpose: the contract inventory sweeps that prefix.
 *
 * `--kill-child <root> <path> <expect> <contentsFile>` is the child mode for
 * the kill arm: it runs one write whose `afterStage` seam kills the process
 * with SIGKILL, which is a real kill between the temp write and the rename
 * rather than a thrown error dressed as one. `--fifo-child <root> <path>` is
 * the child mode for the FIFO arm: one write aimed at a named pipe, printing
 * the word it answered, so a channel that blocks in the open blocks a child
 * and not the probe.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const MODULES = process.env['P226_MODULES'] ?? 'src/main/fs';
/**
 * How long the FIFO arm waits for its child before reading it as hung. The
 * shipping channel answers in the time tsx takes to start, well under a
 * second; only a channel that blocks in the open reaches this.
 */
const FIFO_DEADLINE_MS = 8_000;

const channel = (await import(
  pathToFileURL(resolve(MODULES, 'guarded-write.ts')).href
)) as typeof import('../src/main/fs/guarded-write');
const shared = (await import(
  pathToFileURL(resolve('src/shared/fs-ops.ts')).href
)) as typeof import('../src/shared/fs-ops');

const { writeGuarded, swapNameFor } = channel;
const CAP = shared.READ_CAP_BYTES;

const sha = (b: Buffer | string): string =>
  createHash('sha256').update(b).digest('hex');

type Result = Awaited<ReturnType<typeof writeGuarded>>;

/** The outcome as one word the gate compares: `wrote`, `stale`, `refused/why`. */
function word(r: Result): string {
  return r.outcome === 'refused' ? `refused/${r.why}` : r.outcome;
}

// ---------------------------------------------------------------------------
// Child mode: one write, killed after staging.
// ---------------------------------------------------------------------------

if (process.argv[2] === '--kill-child') {
  const [root, path, expect, contentsFile] = process.argv.slice(3);
  if (!root || !path || !expect || !contentsFile) {
    process.stderr.write('kill-child: four arguments are required\n');
    process.exit(2);
  }
  const contents = readFileSync(contentsFile, 'utf8');
  await writeGuarded(
    {
      listProjectRoots: async () => [root],
      afterStage: () => {
        process.kill(process.pid, 'SIGKILL');
      }
    },
    { root, path, expect, contents }
  );
  // Reached only if the seam did not run, which is itself a reading.
  process.stdout.write('survived\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Child mode: one write aimed at a named pipe. In its own process because a
// channel that blocks on the open blocks the thread it runs on, and the arm
// exists to prove it does not; the parent ends the whole process group if the
// child does not answer.
// ---------------------------------------------------------------------------

if (process.argv[2] === '--fifo-child') {
  const [root, path] = process.argv.slice(3);
  if (!root || !path) {
    process.stderr.write('fifo-child: two arguments are required\n');
    process.exit(2);
  }
  const r = await writeGuarded(
    { listProjectRoots: async () => [root] },
    { root, path, expect: sha(''), contents: 'x' }
  );
  process.stdout.write(`${word(r)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The arms.
// ---------------------------------------------------------------------------

// Real path, because macOS spells the temp directory through a link and every
// fs:* mutation compares an absolute path lexically against the REAL root.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p226-')));
const readings: Record<string, string> = {};

try {
  const root = join(scratch, 'root');
  const elsewhere = join(scratch, 'elsewhere');
  mkdirSync(root);
  mkdirSync(elsewhere);
  mkdirSync(join(root, '.git'));
  const deps = { listProjectRoots: async () => [root] };

  const OLD = 'Notes\n\nThe meeting is on Monday.\n';
  const NEW = 'Notes\n\nThe meeting is on Friday.\n';
  const oldSha = sha(OLD);
  const newSha = sha(NEW);

  /** Write a fresh target holding OLD and answer its absolute path. */
  function fresh(name: string, contents: Buffer | string = OLD): string {
    const abs = join(root, name);
    writeFileSync(abs, contents);
    return abs;
  }
  /** What is at `abs` right now; a reading, never a throw, so an ablation
   * that removes the entry moves this rather than crashing the probe. */
  const entryOf = (abs: string): string => {
    try {
      return lstatSync(abs).isSymbolicLink() ? 'still-a-link' : 'a-file';
    } catch {
      return 'GONE';
    }
  };
  const bytesOf = (abs: string): string => {
    try {
      return readFileSync(abs).toString('latin1');
    } catch {
      return '<GONE>';
    }
  };
  /** The entry's mode as octal, or GONE; a reading and never a throw. */
  const modeOf = (abs: string): string => {
    try {
      return (statSync(abs).mode & 0o777).toString(8);
    } catch {
      return 'GONE';
    }
  };
  /** The entry's size, or -1 when it is gone. */
  const sizeOf = (abs: string): number => {
    try {
      return statSync(abs).size;
    } catch {
      return -1;
    }
  };
  /** The bytes at `abs`, or none when it is gone; a reading, never a throw. */
  const rawOf = (abs: string): Buffer => {
    try {
      return readFileSync(abs);
    } catch {
      return Buffer.alloc(0);
    }
  };
  const tempLeft = (abs: string): boolean => existsSync(swapNameFor(abs));
  const strays = (): string[] =>
    readdirSync(root).filter((n) => n.endsWith(channel.GUARDED_SWAP_SUFFIX));

  // -- refusal 1: outside every open root ----------------------------------
  {
    const victim = join(elsewhere, 'victim.md');
    writeFileSync(victim, OLD);
    const r = await writeGuarded(deps, {
      root: elsewhere,
      path: 'victim.md',
      expect: oldSha,
      contents: NEW
    });
    readings['outsideRoot'] = `${word(r)} ${bytesOf(victim) === OLD ? 'untouched' : 'WRITTEN'}`;
  }
  {
    const victim = join(elsewhere, 'escape.md');
    writeFileSync(victim, OLD);
    const r = await writeGuarded(deps, {
      root,
      path: '../elsewhere/escape.md',
      expect: oldSha,
      contents: NEW
    });
    readings['outsidePath'] = `${word(r)} ${bytesOf(victim) === OLD ? 'untouched' : 'WRITTEN'}`;
  }
  {
    const victim = join(root, '.git', 'config');
    writeFileSync(victim, OLD);
    const r = await writeGuarded(deps, {
      root,
      path: '.git/config',
      expect: oldSha,
      contents: NEW
    });
    readings['dotGit'] = `${word(r)} ${bytesOf(victim) === OLD ? 'untouched' : 'WRITTEN'}`;
  }

  // -- refusal 2: over the cap, read by main itself -------------------------
  {
    const over = Buffer.alloc(CAP + 1, 0x61);
    const abs = fresh('over.txt', over);
    const r = await writeGuarded(deps, {
      root,
      path: 'over.txt',
      expect: sha(over),
      contents: 'short'
    });
    readings['overCap'] = `${word(r)} ${sizeOf(abs) === CAP + 1 ? 'untouched' : 'WRITTEN'}`;
    rmSync(abs, { force: true });
  }
  {
    const at = Buffer.alloc(CAP, 0x62);
    const abs = fresh('atcap.txt', at);
    const r = await writeGuarded(deps, {
      root,
      path: 'atcap.txt',
      expect: sha(at),
      contents: 'short'
    });
    readings['atCap'] = `${word(r)} ${bytesOf(abs) === 'short' ? 'new' : 'old'}`;
    rmSync(abs, { force: true });
  }
  {
    const abs = fresh('payload.txt');
    const r = await writeGuarded(deps, {
      root,
      path: 'payload.txt',
      expect: oldSha,
      contents: 'c'.repeat(CAP + 1)
    });
    readings['payloadOverCap'] = `${word(r)} ${bytesOf(abs) === OLD ? 'untouched' : 'WRITTEN'}`;
  }
  {
    // PHASE 244, audit finding F4. THE FILE GROWS BETWEEN THE FSTAT AND THE
    // FIRST READ, which is the boundary the finding is about and which nothing
    // in this gate could reach before. The file starts at one byte and gains
    // 16 MiB, exactly the audit's own fixture, and what is COUNTED is what the
    // reader consumed: at the parent that was 16,777,217 bytes against a
    // 5,242,880 cap, and the loop is held to one byte past its budget now.
    //
    // The count is taken from the file's own descriptor position rather than
    // from inside the module, by asking how much bigger the file got and what
    // the answer says: the refusal must be the one AFTER the read, naming the
    // file rather than the new contents, and the target must be untouched.
    const abs = fresh('growing.txt', Buffer.from('a'));
    let grew = 0;
    let consumed = -1;
    const r = await writeGuarded(
      {
        ...deps,
        afterFstat: (target) => {
          const growth = Buffer.alloc(16 * 1024 * 1024, 0x61);
          appendFileSync(target, growth);
          grew = growth.byteLength;
        },
        afterRead: (bytes) => {
          consumed = bytes;
        }
      },
      { root, path: 'growing.txt', expect: sha('a'), contents: 'short' }
    );
    readings['grewAfterFstat'] =
      `${word(r)} ` +
      `sentence=${
        r.outcome === 'refused' && r.reason === 'growing.txt is too large for Tortie to rewrite whole.'
          ? 'after-the-read'
          : 'OTHER'
      } ` +
      `grew=${String(grew)} ` +
      // The one reading that tells a bounded read from an unbounded one. Every
      // other observable on this line is identical at the parent commit.
      `read=${String(consumed)} ` +
      `size=${String(sizeOf(abs))} ` +
      `${sizeOf(abs) === grew + 1 ? 'untouched' : 'WRITTEN'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
    rmSync(abs, { force: true });
  }
  {
    // PHASE 244's FIX ROUND. THE SAME GROWTH AT A SECOND STARTING SIZE, because
    // the arm above cannot see the clamp on the loop's chunk size.
    //
    // `READ_CAP_BYTES` is an exact multiple of 64 KiB, so a file that starts at
    // ONE byte reads 1 + 80 x 65536 = 5,242,881 bytes with the clamp and
    // without it: the arithmetic lands on the ceiling either way and the clamp
    // is invisible. Driven at 65,535 bytes it is not: the shipping loop reads
    // 5,242,881 and a loop whose last chunk is a whole 64 KiB reads 5,308,415,
    // which is 65,535 bytes past the cap rather than one.
    //
    // The growth is 6 MiB rather than 16 because all this arm needs is a file
    // past the ceiling, and this probe is run once live and once per ablation.
    const start = 65_535;
    const abs = fresh('growing2.txt', Buffer.alloc(start, 0x61));
    let grew = 0;
    let consumed = -1;
    const r = await writeGuarded(
      {
        ...deps,
        afterFstat: (target) => {
          const growth = Buffer.alloc(6 * 1024 * 1024, 0x61);
          appendFileSync(target, growth);
          grew = growth.byteLength;
        },
        afterRead: (bytes) => {
          consumed = bytes;
        }
      },
      { root, path: 'growing2.txt', expect: sha('a'.repeat(start)), contents: 'short' }
    );
    readings['grewAfterFstatOdd'] =
      `${word(r)} ` +
      `sentence=${
        r.outcome === 'refused' &&
        r.reason === 'growing2.txt is too large for Tortie to rewrite whole.'
          ? 'after-the-read'
          : 'OTHER'
      } ` +
      `grew=${String(grew)} ` +
      `read=${String(consumed)} ` +
      `size=${String(sizeOf(abs))} ` +
      `${sizeOf(abs) === grew + start ? 'untouched' : 'WRITTEN'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
    rmSync(abs, { force: true });
  }

  // -- refusal 3: a digest one byte stale ----------------------------------
  {
    const abs = fresh('stale.md');
    const r = await writeGuarded(deps, {
      root,
      path: 'stale.md',
      expect: sha(`${OLD}x`),
      contents: NEW
    });
    const said = r.outcome === 'stale' ? r.sha256 : '';
    readings['stale'] =
      `${word(r)} ${bytesOf(abs) === OLD ? 'untouched' : 'WRITTEN'} ` +
      `${said === oldSha ? 'names-disk-digest' : 'digest-wrong'} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }

  // -- refusal 4: a decode that lost bytes --------------------------------
  {
    // Research 83 E.7b's fixture: latin-1, accents outside the rewound span.
    const latin1 = Buffer.from(
      'Notes de r\xe9union\n\nIl y a huit points.\nLa reponse f\xfbt br\xe8ve et polie.\n',
      'latin1'
    );
    const abs = fresh('reunion.txt', latin1);
    const r = await writeGuarded(deps, {
      root,
      path: 'reunion.txt',
      expect: sha(latin1),
      contents: latin1.toString('utf8').replace('huit', 'neuf')
    });
    readings['latin1'] =
      `${word(r)} ${rawOf(abs).equals(latin1) ? 'untouched' : 'WRITTEN'} ` +
      `${latin1.length}B->${sizeOf(abs)}B`;
  }
  {
    // A file that legitimately holds U+FFFD round trips, which is what makes
    // this a byte comparison rather than a detector.
    const fffd = Buffer.from('a � b\n', 'utf8');
    const abs = fresh('fffd.txt', fffd);
    const r = await writeGuarded(deps, {
      root,
      path: 'fffd.txt',
      expect: sha(fffd),
      contents: 'a � c\n'
    });
    readings['utf8WithFffd'] = `${word(r)} ${bytesOf(abs) === Buffer.from('a � c\n').toString('latin1') ? 'new' : 'old'}`;
  }
  {
    const bom = Buffer.from('﻿hello\r\nworld\r\n', 'utf8');
    const abs = fresh('bom.txt', bom);
    const r = await writeGuarded(deps, {
      root,
      path: 'bom.txt',
      expect: sha(bom),
      contents: '﻿hello\r\nthere\r\n'
    });
    readings['bomCrlf'] = `${word(r)} ${rawOf(abs).equals(Buffer.from('﻿hello\r\nthere\r\n')) ? 'new-bytes-exact' : 'bytes-differ'}`;
  }

  // -- protection: no-follow at the staged name ----------------------------
  {
    const victim = join(elsewhere, 'temp-victim.md');
    writeFileSync(victim, 'VICTIM');
    const abs = fresh('linktemp.md');
    symlinkSync(victim, swapNameFor(abs));
    const r = await writeGuarded(deps, {
      root,
      path: 'linktemp.md',
      expect: oldSha,
      contents: NEW
    });
    readings['linkAtTemp'] =
      `${word(r)} target=${bytesOf(abs) === NEW ? 'new' : 'old'} ` +
      `victim=${bytesOf(victim) === 'VICTIM' ? 'untouched' : 'WRITTEN'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }

  // -- protection: a link at the target -----------------------------------
  {
    const victim = join(elsewhere, 'target-victim.md');
    writeFileSync(victim, OLD);
    const abs = join(root, 'linktarget.md');
    symlinkSync(victim, abs);
    const r = await writeGuarded(deps, {
      root,
      path: 'linktarget.md',
      expect: oldSha,
      contents: NEW
    });
    readings['linkAtTarget'] =
      `${word(r)} victim=${bytesOf(victim) === OLD ? 'untouched' : 'WRITTEN'} ` +
      `entry=${entryOf(abs)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // The race: the file becomes a link AFTER the read and the staging.
    const victim = join(elsewhere, 'raced-victim.md');
    writeFileSync(victim, 'VICTIM');
    const abs = fresh('racedtarget.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (_staged, target) => {
          unlinkSync(target);
          symlinkSync(victim, target);
        }
      },
      { root, path: 'racedtarget.md', expect: oldSha, contents: NEW }
    );
    readings['linkRacedAtTarget'] =
      `${word(r)} victim=${bytesOf(victim) === 'VICTIM' ? 'untouched' : 'WRITTEN'} ` +
      `entry=${entryOf(abs)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // The other race: the staged copy is swapped for a link after the write.
    const victim = join(elsewhere, 'swap-victim.md');
    writeFileSync(victim, 'VICTIM');
    const abs = fresh('racedtemp.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (staged) => {
          unlinkSync(staged);
          symlinkSync(victim, staged);
        }
      },
      { root, path: 'racedtemp.md', expect: oldSha, contents: NEW }
    );
    readings['linkRacedAtTemp'] =
      `${word(r)} target=${bytesOf(abs) === OLD ? 'old' : 'CHANGED'} ` +
      `entry=${entryOf(abs)} ` +
      `victim=${bytesOf(victim) === 'VICTIM' ? 'untouched' : 'WRITTEN'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }

  // -- the verifier's shapes (fix round): the window after the hash --------
  {
    // Research 83 E.7's loss, driven through the seam: an agent appends to
    // the file after the digest matched and before the rename. The identity
    // comparison in front of the rename is what refuses it.
    const abs = fresh('appended.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (_staged, target) => {
          appendFileSync(target, 'An agent wrote this line.\n');
        }
      },
      { root, path: 'appended.md', expect: oldSha, contents: NEW }
    );
    readings['appendRaced'] =
      `${word(r)} target=${bytesOf(abs) === `${OLD}An agent wrote this line.\n` ? 'appended-kept' : 'APPEND-LOST'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // The file is replaced whole, different bytes, new inode, after the hash.
    const abs = fresh('swapped.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (_staged, target) => {
          unlinkSync(target);
          writeFileSync(target, 'AGENT');
        }
      },
      { root, path: 'swapped.md', expect: oldSha, contents: NEW }
    );
    readings['swapRaced'] =
      `${word(r)} target=${bytesOf(abs) === 'AGENT' ? 'agent-kept' : 'AGENT-LOST'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // The same inode, the same size, different bytes: OLD and NEW are both 33
    // bytes, so only the timestamps can see this one.
    const abs = fresh('rewritten.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (_staged, target) => {
          writeFileSync(target, 'Notes\n\nThe meeting is on Sunday.\n');
        }
      },
      { root, path: 'rewritten.md', expect: oldSha, contents: NEW }
    );
    readings['rewriteRaced'] =
      `${word(r)} target=${bytesOf(abs) === 'Notes\n\nThe meeting is on Sunday.\n' ? 'agent-kept' : 'AGENT-LOST'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // Only the mode moves. The staged copy carries the mode the read saw and
    // a rename would put it back, so ctime is in the comparison.
    const abs = fresh('chmodded.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (_staged, target) => {
          chmodSync(target, 0o600);
        }
      },
      { root, path: 'chmodded.md', expect: oldSha, contents: NEW }
    );
    readings['chmodRaced'] =
      `${word(r)} target=${bytesOf(abs) === OLD ? 'old' : 'CHANGED'} ` +
      `mode=${modeOf(abs)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // The staged copy is swapped for a REGULAR file after the write, which no
    // link check can see; the descriptor's own fstat is what refuses it.
    const abs = fresh('swappedtemp.md');
    const r = await writeGuarded(
      {
        ...deps,
        afterStage: (staged) => {
          unlinkSync(staged);
          writeFileSync(staged, 'VICTIM');
        }
      },
      { root, path: 'swappedtemp.md', expect: oldSha, contents: NEW }
    );
    readings['swapRacedAtTemp'] =
      `${word(r)} target=${bytesOf(abs) === OLD ? 'old' : 'CHANGED'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }

  // -- the verifier's shapes (fix round): what the file is -----------------
  {
    // `rename` asks the directory's permission and not the file's, so a file
    // a person marked read-only was replaced with `wrote` where a plain save
    // answers EACCES. The owner write bit is asked before the digest is.
    const abs = fresh('readonly.md');
    chmodSync(abs, 0o444);
    const r = await writeGuarded(deps, {
      root,
      path: 'readonly.md',
      expect: oldSha,
      contents: NEW
    });
    readings['readOnly'] =
      `${word(r)} ${bytesOf(abs) === OLD ? 'untouched' : 'WRITTEN'} ` +
      `mode=${modeOf(abs)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // A named pipe at the path. `open(2)` of a FIFO with no writer blocks
    // until one arrives, on whatever thread called it, which in the product
    // is main's. So the write is driven in a child of its own process group,
    // and a child that has not answered by the deadline is read as hung and
    // the whole group is ended, tsx's node and the node it started, because a
    // signal to the outer one alone leaves the inner one blocked in the open
    // and reparented to launchd, which is how the verifier found it.
    const pipe = join(root, 'pipe.md');
    const made = spawnSync('mkfifo', [pipe], { encoding: 'utf8' });
    if (made.status !== 0) {
      readings['fifo'] = `no-mkfifo(${String(made.status)})`;
    } else {
      const fifoChild = spawn(
        process.execPath,
        [
          tsxCli(),
          '--tsconfig',
          'tsconfig.node.json',
          'build/redline-write-probe.mts',
          '--fifo-child',
          root,
          'pipe.md'
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );
      let out = '';
      fifoChild.stdout.on('data', (chunk: Buffer | string) => {
        out += String(chunk);
      });
      try {
        const answered = await new Promise<boolean>((resolveTo) => {
          const deadline = setTimeout(() => resolveTo(false), FIFO_DEADLINE_MS);
          fifoChild.on('close', () => {
            clearTimeout(deadline);
            resolveTo(true);
          });
        });
        readings['fifo'] = answered
          ? `answered ${out.trim()} pipe=${lstatSync(pipe).isFIFO() ? 'still-a-pipe' : 'REPLACED'}`
          : 'HUNG-past-deadline';
      } finally {
        // Whatever was read, end the group. A group that already ended
        // answers ESRCH, which is the answer wanted.
        // NEVER kill(0): a pid the spawn did not give is not a group to end.
        if (typeof fifoChild.pid === 'number' && fifoChild.pid > 0) {
          try {
            process.kill(-fifoChild.pid, 'SIGKILL');
          } catch {
            // Already gone.
          }
        }
      }
    }
  }

  // -- protection: a kill between the temp write and the rename -----------
  {
    const abs = fresh('killed.md');
    const contentsFile = join(scratch, 'new-contents.txt');
    writeFileSync(contentsFile, NEW);
    const child = spawnSync(
      process.execPath,
      [
        tsxCli(),
        '--tsconfig',
        'tsconfig.node.json',
        'build/redline-write-probe.mts',
        '--kill-child',
        root,
        'killed.md',
        oldSha,
        contentsFile
      ],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        env: process.env,
        // A child that never reaches the seam is ended here rather than left.
        timeout: 60_000,
        killSignal: 'SIGKILL'
      }
    );
    // tsx runs the script in a node it starts, and reports that node's SIGKILL
    // as exit 137 rather than as a signal of its own; both spellings are a kill.
    const ended =
      (child.signal === 'SIGKILL' || child.status === 137) &&
      child.stdout.trim() !== 'survived';
    const afterKill =
      `${ended ? 'killed' : `survived(${String(child.status)}/${String(child.signal)})`} ` +
      `target=${bytesOf(abs) === OLD ? 'old-intact' : 'CHANGED'} ` +
      `temp=${tempLeft(abs) ? (bytesOf(swapNameFor(abs)) === NEW ? 'left-with-new' : 'left') : 'none'}`;
    // The next write to the same file must clean the leftover and land.
    const r = await writeGuarded(deps, {
      root,
      path: 'killed.md',
      expect: oldSha,
      contents: NEW
    });
    readings['killed'] =
      `${afterKill} then ${word(r)} target=${bytesOf(abs) === NEW ? 'new' : 'old'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }

  // -- the ordinary case ---------------------------------------------------
  {
    const abs = fresh('ordinary.md');
    chmodSync(abs, 0o755);
    const r = await writeGuarded(deps, {
      root,
      path: 'ordinary.md',
      expect: oldSha,
      contents: NEW
    });
    const said = r.outcome === 'wrote' ? `${r.sha256 === newSha ? 'sha-of-new' : 'sha-wrong'} ${String(r.bytes)}B` : '';
    readings['ordinary'] =
      `${word(r)} ${bytesOf(abs) === NEW ? 'new' : 'old'} ${said} ` +
      `mode=${modeOf(abs)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
  }
  {
    // A second write handing back the digest the first answered.
    const abs = fresh('twice.md');
    const first = await writeGuarded(deps, { root, path: 'twice.md', expect: oldSha, contents: NEW });
    const second = await writeGuarded(deps, {
      root,
      path: 'twice.md',
      expect: first.outcome === 'wrote' ? first.sha256 : '0'.repeat(64),
      contents: OLD
    });
    readings['twice'] = `${word(first)} ${word(second)} ${bytesOf(abs) === OLD ? 'back' : 'not-back'}`;
  }
  {
    const r = await writeGuarded(deps, {
      root,
      path: 'absent.md',
      expect: oldSha,
      contents: NEW
    });
    readings['missing'] = word(r);
  }
  {
    const abs = fresh('badexpect.md');
    const r = await writeGuarded(deps, {
      root,
      path: 'badexpect.md',
      expect: 'not a digest',
      contents: NEW
    });
    readings['badExpect'] = `${word(r)} ${bytesOf(abs) === OLD ? 'untouched' : 'WRITTEN'}`;
  }
  {
    mkdirSync(join(root, 'sub', 'dir'), { recursive: true });
    const deep = join(root, 'sub', 'dir', 'deep.md');
    writeFileSync(deep, OLD);
    const r = await writeGuarded(deps, {
      root,
      path: deep,
      expect: oldSha,
      contents: NEW
    });
    readings['absoluteInside'] = `${word(r)} ${bytesOf(deep) === NEW ? 'new' : 'old'}`;
  }

  readings['straysLeft'] = String(strays().length);
  readings['cap'] = String(CAP);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(readings)}\n`);
