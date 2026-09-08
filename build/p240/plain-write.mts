/**
 * plain-write.mts. What the SAVE channel does TODAY, for each condition the
 * guarded channel has a word for (Phase 240 measure step).
 *
 * `fs:writeFile` is `await writeFile(abs, contents, 'utf8')` after
 * `resolvePath` and two shape checks (src/main/fs/ipc.ts:229-247). This drives
 * exactly that call over a scratch directory it removes in a `finally`, one
 * arm per refusal word the guarded channel carries, and records what the file
 * held afterwards and what the call threw. Nothing under the person's home is
 * read or written and no process is started.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'p240-plain-'));
const rows: unknown[] = [];
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

/** The handler's whole body, minus the two shape checks and the error wrap. */
async function todaysSave(abs: string, contents: string): Promise<string | null> {
  try {
    await writeFile(abs, contents, 'utf8');
    return null;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code ?? String(err);
  }
}

try {
  const project = join(root, 'project');
  mkdirSync(project, { recursive: true });
  const BUFFER = 'THE BUFFER, which is what the person was typing.\n';

  // stale — the case in the issue.
  {
    const p = join(project, 'stale.txt');
    writeFileSync(p, 'the agent wrote this whole paragraph while you typed.\n');
    const before = readFileSync(p, 'utf8');
    const threw = await todaysSave(p, BUFFER);
    rows.push({ word: 'stale', threw, fileAfterIsTheBuffer: readFileSync(p, 'utf8') === BUFFER, agentsBytesLost: before.length });
  }
  // outside — a path outside every open project root.
  {
    const outside = join(root, 'outside.txt');
    writeFileSync(outside, 'not in any project.\n');
    const threw = await todaysSave(outside, BUFFER);
    rows.push({ word: 'outside', threw, fileAfterIsTheBuffer: readFileSync(outside, 'utf8') === BUFFER });
  }
  // link — the target is a symbolic link.
  {
    const victim = join(root, 'victim.txt');
    writeFileSync(victim, 'the link points here.\n');
    const link = join(project, 'link.txt');
    symlinkSync(victim, link);
    const threw = await todaysSave(link, BUFFER);
    rows.push({
      word: 'link',
      threw,
      linkIsStillALink: lstatSync(link).isSymbolicLink(),
      whatTheLinkPointsAtWasReplaced: readFileSync(victim, 'utf8') === BUFFER
    });
  }
  // readOnly — the owner write bit is clear.
  {
    const p = join(project, 'ro.txt');
    writeFileSync(p, 'read only.\n');
    chmodSync(p, 0o444);
    const threw = await todaysSave(p, BUFFER);
    rows.push({ word: 'readOnly', threw, fileAfterIsTheBuffer: readFileSync(p, 'utf8') === BUFFER });
    chmodSync(p, 0o644);
  }
  // missing — no file at that path.
  {
    const p = join(project, 'missing.txt');
    const threw = await todaysSave(p, BUFFER);
    rows.push({ word: 'missing', threw, createdIt: readFileSync(p, 'utf8') === BUFFER });
  }
  // notUtf8 — a latin-1 file read as utf8, then written back whole.
  {
    const p = join(project, 'latin1.txt');
    const bytes = Buffer.from('Notes de r\xe9union, la r\xe9ponse f\xfbt br\xe8ve.\n', 'latin1');
    writeFileSync(p, bytes);
    const asUtf8 = readFileSync(p, 'utf8'); // what the editor read
    const edited = asUtf8.replace('Notes', 'NOTES');
    const threw = await todaysSave(p, edited);
    const after = readFileSync(p);
    rows.push({
      word: 'notUtf8',
      threw,
      bytesBefore: bytes.length,
      bytesAfter: after.length,
      replacementCharsWritten: (readFileSync(p, 'utf8').match(/�/g) ?? []).length,
      accentsSurvived: after.includes(0xe9)
    });
  }
  // tooLarge — a file over READ_CAP_BYTES; `save` refuses a truncated tab
  // silently, so this arm records only what the raw channel would do.
  {
    const p = join(project, 'big.txt');
    const big = 'x'.repeat(6 * 1024 * 1024);
    writeFileSync(p, big);
    const cap = 5 * 1024 * 1024;
    const truncatedRead = readFileSync(p, 'utf8').slice(0, cap);
    const threw = await todaysSave(p, truncatedRead);
    rows.push({ word: 'tooLarge', threw, sizeBefore: big.length, sizeAfter: readFileSync(p, 'utf8').length, tailLost: big.length - readFileSync(p, 'utf8').length });
  }
  // io — a directory at the path.
  {
    const p = join(project, 'adir');
    mkdirSync(p);
    const threw = await todaysSave(p, BUFFER);
    rows.push({ word: 'io', threw });
  }
  console.log(JSON.stringify({ arms: rows }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
