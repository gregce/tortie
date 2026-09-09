/**
 * Phase 242.2 — a picture lands in Tortie's own folder or nowhere.
 *
 * ## What this file holds that no other one does
 *
 * It RUNS the shipped `image-put` text. `build/conformance-machines.mjs`
 * condition 88g reads that text and asks whether the two unlinks and the
 * exclusive create are there and stand where they have to stand, which is the
 * right question for a gate and is still a question about text. This file
 * writes real directories, real files, real symbolic links and real hard links
 * on this Mac, hands the shipped script string to `/bin/sh` with the same two
 * positional values `putOneImage` composes, and reads what it printed and what
 * is on disk afterwards.
 *
 * ## The shape it was written for
 *
 * `IMAGE_PUT` stages at `t="$f.part"`, where `f="$HOME/.tortie/images/$1"`, and
 * until this phase there was no unlink in front of the redirection, no `set -C`
 * and no `[ -L ]` test. Driven under `/bin/sh` over a scratch `HOME`, first by
 * the Phase 242 verifier and re-derived by its committer, and a third time
 * through Tortie's own `machines.putImage` against the operator's Mac Pro
 * (research 105 section 5.2): with a SYMLINK at `$d/$1.part`, and again with a
 * HARD LINK at it, the redirection put the payload into the file OUTSIDE
 * `~/.tortie/images` that the planted name pointed at, and the script still
 * answered `added` with the payload's OWN byte count and its OWN sha256, so the
 * answer read as a clean write in both escaping arms.
 *
 * It is smaller than the same shape in `file-put`, and it is still real.
 * `putImagesOnMachine` never asks `confirmedWriteRoot`, so image-put makes no
 * containment promise for a link to break, and the staged name is content
 * addressed, so anything planted at it had to be predicted first. What is left
 * is a write Tortie composes that follows somebody else's name OUT of the one
 * directory Tortie told the person it uses, while answering `added`.
 *
 * ## THE TWO NAMES, AND WHY THEY GET DIFFERENT ANSWERS
 *
 * There are two names here and they are guarded differently, which the first
 * round of this phase got half right.
 *
 * The STAGED name, `$d/$1.part`, is UNLINKED. Both link kinds are removed and
 * the save goes through: the answer stays `added`, the picture lands in
 * `~/.tortie/images`, and the file outside is untouched. Nothing that used to
 * succeed refuses.
 *
 * The FINAL name, `$d/$1`, is REFUSED when it is a symbolic link, with
 * `file-put`'s own word `outside`. The first round left it unguarded and this
 * round's verifier measured what that cost, at HEAD, through
 * `machines.putImage` against the operator's Mac Pro: a link there pointing at
 * a DIRECTORY made `mv "$t" "$f"` move the picture INTO that directory under
 * the staged name's own basename, replacing a file already there, and one
 * pointing at a REGULAR FILE made `[ -f "$f" ]` read that file THROUGH the
 * link, so the script answered `present` with a byte count and a digest taken
 * from outside `$d`. It cannot be unlinked the way the staged name is, because
 * `$f` is the person's own picture when it is a picture, so the answer is a
 * refusal. `parseImagePutAnswer` accepts `added` and `present` and nothing
 * else, so `outside` becomes the sentence a put that did not arrive already
 * had and no new word crosses the channel. A HARD LINK at `$f` is invisible to
 * `[ -L ]` and is the stated limit; it writes nothing, because that arm
 * answers `present` and the digest will not match.
 *
 * ## Which clause holds which half, measured rather than assumed
 *
 * Research 105 section 6 ablated each clause on its own and drove seven arms
 * per variant:
 *
 *  - the two escapes and the ordinary arms are held by the FIRST `rm -f "$t"`,
 *    and that clause is also the only thing standing between a machine whose
 *    `base64` takes `-d` and not `-D` and a save that dies with no answer at
 *    all when there is debris at the staged name. That is the GNU arm below,
 *    and it is the one arm that makes the first unlink behaviourally red;
 *  - the SECOND `rm -f "$t"`, in the `else`, is held by the old-macOS dialect,
 *    because the first arm's redirection creates the staged file even when
 *    `-d` is the flag that machine does not have;
 *  - `set -C` CANNOT be made red by any behavioural arm, because with the first
 *    unlink in place the only thing it adds is refusing a name re-planted in
 *    the microseconds between the unlink and the create. It is held as TEXT by
 *    `stagedUnlinkFacts(...).exclusive` in condition 88f, with a text ablation
 *    of its own in 88g, and this file says so rather than pretending to cover
 *    it;
 *  - the DANGLING link arm is held by the PAIR of unlinks rather than by
 *    either alone, and that is said rather than tidied away. Take the first
 *    out and `set -C` refuses the first redirection, the `else` unlinks and
 *    `-D` writes; take the second out and the first has already done it; take
 *    both out and the arm goes red. It is here because at the parent it
 *    answered `added` while CREATING the file it named outside
 *    `~/.tortie/images` and leaving a link under the picture's name, and
 *    neither this file nor condition 88g drove that shape when the fix first
 *    landed;
 *  - the `[ -L "$f" ]` refusal holds both arms of the last describe below, and
 *    each of them is red on its own when it is taken out.
 *
 * ## What it cannot show
 *
 * That the machine on the other side of a real link behaves the way this Mac
 * does. Research 105 section 5 drove the same arms on the operator's own Mac
 * Pro, over the real link and through `machines.putImage`.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REMOTE_SCRIPTS } from '../remote-scripts';
import { parseImagePutAnswer } from '../remote-image';

const IMAGE_PUT_TEXT = ((): string => {
  const row = REMOTE_SCRIPTS.find((one) => one.id === 'image-put');
  if (row === undefined) throw new Error('no script called image-put');
  return row.text;
})();

/**
 * The 70 byte PNG every arm sends, and the name the far side composes for it.
 *
 * It is the same payload research 105 used, so a reading here and a reading
 * there are the same picture.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const PAYLOAD = PNG.toString('base64');
const NAME = 'p2422test-c414cd0e204de974.png';

let dir = '';
let home = '';
let images = '';
let outside = '';
let victim = '';
let staged = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p2422-image-'));
  home = join(dir, 'home');
  images = join(home, '.tortie', 'images');
  outside = join(dir, 'outside');
  victim = join(outside, 'victim.txt');
  staged = join(images, `${NAME}.part`);
  mkdirSync(images, { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(victim, 'victim, untouched\n', 'utf8');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Run the shipped `image-put` text the way the far side runs it.
 *
 * `HOME` is the scratch one, so `$d` resolves inside this test's own directory
 * and nothing under the person's own home is ever named.
 */
function run(path?: string): { out: string; word: string; answer: ReturnType<typeof parseImagePutAnswer> } {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home };
  if (path !== undefined) env.PATH = path;
  const done = spawnSync('/bin/sh', ['-c', IMAGE_PUT_TEXT, 'sh', NAME, PAYLOAD], {
    encoding: 'utf8',
    env
  });
  const out = `${done.stdout ?? ''}${done.stderr ?? ''}`;
  const at = out.match(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/);
  const inner = at === null ? '' : (at[1] ?? '');
  return {
    out,
    word: inner.trim().split(/\s+/)[0] ?? '',
    answer: parseImagePutAnswer(inner)
  };
}

/** A stand-in `base64` on PATH, so a dialect can be driven on this Mac. */
function dialect(body: string): string {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'base64'), body, 'utf8');
  chmodSync(join(bin, 'base64'), 0o755);
  return `${bin}:${process.env.PATH ?? ''}`;
}

/** `base64` the way an old macOS carries it: `-D` and no `-d`. */
const OLD_MACOS =
  '#!/bin/sh\nif [ "$1" = -d ]; then echo "base64: illegal option -- d" >&2; exit 1; fi\nexec /usr/bin/base64 "$@"\n';

/** `base64` the way GNU coreutils carries it: `-d` and no `-D`. */
const GNU =
  '#!/bin/sh\nif [ "$1" = -D ]; then echo "base64: invalid option -- \'D\'" >&2; exit 1; fi\nexec /usr/bin/base64 "$@"\n';

describe('a name planted at the picture\'s staged path is a name and never the file', () => {
  it('the control arm lands the picture and leaves the file outside alone', () => {
    const said = run();
    expect(said.word).toBe('added');
    expect(said.answer?.bytes).toBe(PNG.length);
    expect(readFileSync(victim, 'utf8')).toBe('victim, untouched\n');
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
    expect(existsSync(staged)).toBe(false);
  });

  it('a SYMBOLIC LINK at the staged name does not carry the payload outside', () => {
    // At the parent this answered `added` with the payload's own byte count
    // while the file OUTSIDE `~/.tortie/images` took the bytes, and the
    // person's own `~/.tortie/images/<name>` was left as a symbolic link
    // rather than a picture. Research 105 sections 4 and 5.2.
    symlinkSync(victim, staged);
    const said = run();
    expect(said.word).toBe('added');
    expect(readFileSync(victim, 'utf8')).toBe('victim, untouched\n');
    // And what landed is the picture itself, not a link to somewhere else.
    expect(lstatSync(join(images, NAME)).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
  });

  it('a HARD LINK at the staged name does not carry the payload outside', () => {
    // The kind `[ -L ]` cannot see: it is not a link to the shell, it IS the
    // file under a second name. At the parent the victim took the payload and
    // ended sharing one inode with the landed picture, so a later write to
    // either was a write to both.
    linkSync(victim, staged);
    const before = statSync(victim);
    expect(before.nlink).toBe(2);
    const said = run();
    expect(said.word).toBe('added');
    expect(readFileSync(victim, 'utf8')).toBe('victim, untouched\n');
    const after = statSync(victim);
    expect(after.ino).toBe(before.ino);
    expect(after.nlink).toBe(1);
    expect(statSync(join(images, NAME)).ino).not.toBe(after.ino);
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
  });

  it('a DANGLING symbolic link at the staged name creates nothing outside', () => {
    // The shape neither this file nor condition 88g drove when the fix first
    // landed. At the parent the redirection followed it, CREATED the file it
    // named outside `~/.tortie/images`, and the `mv` then put the link itself
    // under the picture's name, so the answer was `added` and what landed was
    // a link to somewhere else. The same `rm -f "$t"` closes it, and this arm
    // is what stops a later narrowing of that unlink passing.
    const ghost = join(outside, 'not-there-yet.txt');
    symlinkSync(ghost, staged);
    const said = run();
    expect(said.word).toBe('added');
    expect(existsSync(ghost)).toBe(false);
    expect(lstatSync(join(images, NAME)).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
  });
});

describe("a symbolic link at the picture's own name is refused rather than followed", () => {
  it('a link to a DIRECTORY does not put the picture in that directory', () => {
    // At HEAD of the first round this answered `added` and the picture landed
    // in `outdir` under the staged name's basename, replacing what was there.
    const outdir = join(outside, 'outdir');
    mkdirSync(outdir, { recursive: true });
    const mine = join(outdir, `${NAME}.part`);
    writeFileSync(mine, 'his own file\n', 'utf8');
    symlinkSync(outdir, join(images, NAME));
    const said = run();
    expect(said.word).toBe('outside');
    // No new word crosses the channel: the door refuses this answer whole and
    // hands the caller the sentence it already had for a picture that did not
    // arrive.
    expect(said.answer).toBeNull();
    expect(readFileSync(mine, 'utf8')).toBe('his own file\n');
    expect(readdirSync(outdir)).toEqual([`${NAME}.part`]);
    expect(existsSync(staged)).toBe(false);
  });

  it('a link to a REGULAR FILE is not read through for the byte count and digest', () => {
    // At HEAD of the first round `[ -f "$f" ]` followed this and answered
    // `present` with the OUTSIDE file's size and sha256. Main refused on the
    // digest, so nothing landed, but the script had read a file outside `$d`
    // and reported it.
    symlinkSync(victim, join(images, NAME));
    const said = run();
    expect(said.word).toBe('outside');
    expect(said.answer).toBeNull();
    expect(readFileSync(victim, 'utf8')).toBe('victim, untouched\n');
    expect(lstatSync(join(images, NAME)).isSymbolicLink()).toBe(true);
  });
});

describe('the unlink did not get wider than the hole', () => {
  it('the debris of an interrupted upload is still written over', () => {
    // Property 3 of the script's own header, which the unlink must not have
    // taken away: the staged name is deterministic so that the next attempt at
    // that image reuses it.
    writeFileSync(staged, 'half an upload\n', 'utf8');
    const said = run();
    expect(said.word).toBe('added');
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
    expect(existsSync(staged)).toBe(false);
  });

  it('a picture already there is still reported present and not rewritten', () => {
    writeFileSync(join(images, NAME), PNG);
    const said = run();
    expect(said.word).toBe('present');
    expect(said.answer?.bytes).toBe(PNG.length);
  });

  it('the old macOS dialect still writes, which the SECOND unlink is what allows', () => {
    // The first arm's redirection creates the staged file even when `base64
    // -d` is the flag this machine does not have, so the fallback has to
    // unlink again before it writes. Without that second unlink, `set -C`
    // refuses the save on every machine whose base64 is the older one.
    const said = run(dialect(OLD_MACOS));
    expect(said.word).toBe('added');
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
  });

  it('the GNU dialect with debris still writes, which the FIRST unlink is what allows', () => {
    // The one arm that makes the first unlink behaviourally load bearing.
    // Without it, `set -C` refuses the first redirection because the debris is
    // there, the `else` unlinks and reaches for `-D`, GNU base64 has no such
    // flag, and the save dies under `set -e` with no marker printed at all —
    // which main reads as the picture not having been written.
    writeFileSync(staged, 'half an upload\n', 'utf8');
    const said = run(dialect(GNU));
    expect(said.word).toBe('added');
    expect(said.answer).not.toBeNull();
    expect(readFileSync(join(images, NAME))).toEqual(PNG);
  });
});
