/**
 * redline-write-probe.mts. The runtime half of `npm run conformance:redline-write`
 * (Phase 226).
 *
 * Runs the SHIPPING guarded write under node over a scratch directory it makes
 * and removes in a `finally`, one arm per refusal and per protection, and
 * prints ONE JSON line last. It reads nothing under the person's home: every
 * fixture is written here, the project root list is a function answering the
 * scratch root, and the only process it starts is one node child of itself
 * for the kill arm, waited for synchronously and ended by its own SIGKILL.
 *
 * The module is loaded from `P226_MODULES` (default `src/main/fs`) so the gate
 * can point the same probe at an ablated copy of the channel. The knob is not
 * `GMUX_` prefixed on purpose: the contract inventory sweeps that prefix.
 *
 * `--kill-child <root> <path> <expect> <contentsFile>` is the child mode for
 * the kill arm: it runs one write whose `afterStage` seam kills the process
 * with SIGKILL, which is a real kill between the temp write and the rename
 * rather than a thrown error dressed as one.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
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
  const bytesOf = (abs: string): string => readFileSync(abs).toString('latin1');
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
    readings['overCap'] = `${word(r)} ${statSync(abs).size === CAP + 1 ? 'untouched' : 'WRITTEN'}`;
    unlinkSync(abs);
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
    unlinkSync(abs);
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
      `${word(r)} ${readFileSync(abs).equals(latin1) ? 'untouched' : 'WRITTEN'} ` +
      `${latin1.length}B->${statSync(abs).size}B`;
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
    readings['bomCrlf'] = `${word(r)} ${readFileSync(abs).equals(Buffer.from('﻿hello\r\nthere\r\n')) ? 'new-bytes-exact' : 'bytes-differ'}`;
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
      `entry=${lstatSync(abs).isSymbolicLink() ? 'still-a-link' : 'REPLACED'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
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
      `entry=${lstatSync(abs).isSymbolicLink() ? 'still-a-link' : 'REPLACED'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
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
      `entry=${lstatSync(abs).isSymbolicLink() ? 'BECAME-A-LINK' : 'a-file'} ` +
      `victim=${bytesOf(victim) === 'VICTIM' ? 'untouched' : 'WRITTEN'} ` +
      `${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
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
      `mode=${(statSync(abs).mode & 0o777).toString(8)} ${tempLeft(abs) ? 'TEMP' : 'no-temp'}`;
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
