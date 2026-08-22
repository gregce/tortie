/**
 * Phase 73 — putting image bytes on another machine.
 *
 * The pure halves are tested exhaustively, because they are what decides
 * whether a byte ever leaves this Mac: the name a file gets on the far side,
 * the parse of what the far side reported, and the path composed from that
 * machine's own home.
 *
 * The live half spawns nothing here. The write door, the machine registry and
 * the far side are all replaced, so what these tests hold is the ORDER of the
 * four checks and what is sent when each one fails, which in every case is
 * nothing.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine wrote the bytes,
 * that the checksum on the far side matches, or that the second upload of the
 * same image leaves the file untouched. That is
 * `node build/probe-remote-image.mjs`, which runs against a real sign in server
 * on 127.0.0.1 and compares sha256 on both sides.
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every script the door was asked to run, in order. */
let ran: Array<{ door: 'read' | 'write'; id: string; args: string[] }> = [];
/** What the far side answers for one script id. */
let answers: Record<string, string> = {};

vi.mock('../remote-run', () => ({
  runRemoteRead: async (
    _ctx: unknown,
    id: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    ran.push({ door: 'read', id, args: [...args] });
    const payload = answers[id] ?? '';
    return { payload, generation: 3, bytes: payload.length };
  },
  runRemoteWrite: async (
    _ctx: unknown,
    id: string,
    args: readonly string[]
  ): Promise<{ payload: string; generation: number; bytes: number }> => {
    ran.push({ door: 'write', id, args: [...args] });
    const payload = answers[id] ?? '';
    return { payload, generation: 3, bytes: payload.length };
  }
}));

// Phase 123 moved `readyRemoteContext` into `../ready-context.ts`, and
// `../remote-image.ts` now names that leaf. The stub is unchanged and it stands
// in for the same function.
vi.mock('../ready-context', () => ({
  readyRemoteContext: (machineId: string) => ({ kind: 'remote', machineId })
}));

const {
  REMOTE_IMAGE_DIR_DISPLAY,
  REMOTE_IMAGE_MAX_BYTES,
  REMOTE_IMAGE_MAX_KILOBYTES,
  parseImagePutAnswer,
  parseMachineFacts,
  putImagesOnMachine,
  remoteImageName,
  remoteImagePath
} = await import('../remote-image');
const { IMAGE_NOT_AN_IMAGE, IMAGE_NOT_WRITTEN, imageTooLargeRefusal } =
  await import('../remote-copy');

/** Eight bytes that every image sniffer in this product calls a PNG. */
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function png(bytes: number): Buffer {
  return Buffer.concat([PNG_HEAD, Buffer.alloc(Math.max(0, bytes - 8), 7)]);
}

function facts(home = '/home/greg'): string {
  return `home=${home}\ncodex_home=\nxdg_data_home=\nuname=Linux\n`;
}

let dir = '';

beforeEach(async () => {
  ran = [];
  answers = {};
  dir = await mkdtemp(join(tmpdir(), 'p73-image-'));
});

describe('the name one image gets on the far side', () => {
  it('is the session, a checksum of the bytes, and the sniffed extension', () => {
    const sum = 'a'.repeat(64);
    expect(remoteImageName('s-1', sum, '.png')).toBe(`s-1-${'a'.repeat(16)}.png`);
  });

  it('is the same name for the same bytes, which is what makes a repeat safe', () => {
    const sum = createHash('sha256').update(png(64)).digest('hex');
    expect(remoteImageName('s-1', sum, '.png')).toBe(
      remoteImageName('s-1', sum, '.png')
    );
  });

  it('lets nothing a person typed reach the other machine as a name', () => {
    // A session id is Tortie's own, but the rule is stated in code rather than
    // trusted: anything that is not a letter, a digit, a dash or an underscore
    // is dropped before the name is composed.
    expect(remoteImageName('../../etc/pas swd', 'b'.repeat(64), '.png')).toBe(
      `etcpasswd-${'b'.repeat(16)}.png`
    );
    expect(remoteImageName("s';rm -rf ~;'", 'c'.repeat(64), '.jpg')).toBe(
      `srm-rf-${'c'.repeat(16)}.jpg`
    );
  });
});

describe('the path on the far side', () => {
  it('is composed against that machine’s OWN home', () => {
    expect(remoteImagePath('/home/greg', 'a.png')).toBe(
      '/home/greg/.tortie/images/a.png'
    );
    expect(remoteImagePath('/Users/greg/', 'a.png')).toBe(
      '/Users/greg/.tortie/images/a.png'
    );
  });

  it('falls back to the display path when the machine would not say', () => {
    // Tortie composes no home directory for a computer that did not state its
    // own. A path a person can still read beats a path Tortie guessed.
    expect(remoteImagePath('', 'a.png')).toBe(`${REMOTE_IMAGE_DIR_DISPLAY}/a.png`);
    expect(remoteImagePath('none', 'a.png')).toBe(
      `${REMOTE_IMAGE_DIR_DISPLAY}/a.png`
    );
  });
});

describe('the two answers a machine can give', () => {
  it('reads added, present, the size and the checksum', () => {
    expect(parseImagePutAnswer('added 1024 abc')).toEqual({
      outcome: 'added',
      bytes: 1024,
      sha256: 'abc'
    });
    expect(parseImagePutAnswer('present 1024 abc')?.outcome).toBe('present');
  });

  it('reads a machine with no checksum program as no checksum', () => {
    expect(parseImagePutAnswer('added 12 nosum')?.sha256).toBeNull();
  });

  it('reads anything else as no answer at all', () => {
    for (const junk of ['', 'ok 1 a', 'added', 'added x a', '-1 a b']) {
      expect(parseImagePutAnswer(junk), junk).toBeNull();
    }
  });
});

describe('what a machine says about itself', () => {
  it('reads the home, the two names and the system', () => {
    const out = parseMachineFacts(
      'home=/home/greg\ncodex_home=/home/greg/.codex\nxdg_data_home=/x\nuname=Linux'
    );
    expect(out.home).toBe('/home/greg');
    expect(out.env).toEqual({
      CODEX_HOME: '/home/greg/.codex',
      XDG_DATA_HOME: '/x'
    });
    expect(out.uname).toBe('Linux');
  });

  it('leaves a name the far side has not set out of the environment', () => {
    expect(parseMachineFacts(facts()).env).toEqual({});
  });

  it('ignores a line the script did not write', () => {
    expect(parseMachineFacts('welcome\nhome=/h\n=x\n').home).toBe('/h');
  });
});

describe('the four checks, and what is sent when each one fails', () => {
  it('sends nothing for a file bigger than the limit', async () => {
    const path = join(dir, 'big.png');
    await writeFile(path, png(REMOTE_IMAGE_MAX_BYTES + 1));
    answers['machine-facts'] = facts();
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.remotePath).toBeNull();
    expect(placement?.refusal).toBe(imageTooLargeRefusal(REMOTE_IMAGE_MAX_KILOBYTES));
    expect(ran.filter((one) => one.door === 'write')).toEqual([]);
  });

  it('states the limit truthfully, in a unit a person can say', () => {
    // The sentence names kilobytes and the cap is a number of bytes. This is
    // the arithmetic that keeps them the same limit.
    expect(REMOTE_IMAGE_MAX_KILOBYTES * 1_000).toBe(REMOTE_IMAGE_MAX_BYTES);
    expect(imageTooLargeRefusal(REMOTE_IMAGE_MAX_KILOBYTES)).toContain('90 KB');
    expect(imageTooLargeRefusal(REMOTE_IMAGE_MAX_KILOBYTES)).not.toContain('MB');
  });

  it('sends nothing for a file whose bytes are not an image', async () => {
    // The claimed name decides nothing. This one is called .png and holds text.
    const path = join(dir, 'notes.png');
    await writeFile(path, 'this is not a picture, it is a sentence\n');
    answers['machine-facts'] = facts();
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.refusal).toBe(IMAGE_NOT_AN_IMAGE);
    expect(ran.filter((one) => one.door === 'write')).toEqual([]);
  });

  it('sends nothing for a path that is not there', async () => {
    answers['machine-facts'] = facts();
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [join(dir, 'gone.png')]
    });
    expect(placement?.refusal).toBe(IMAGE_NOT_AN_IMAGE);
    expect(ran.filter((one) => one.door === 'write')).toEqual([]);
  });

  it('goes through the WRITE door, once, with the name and the payload', async () => {
    const bytes = png(64);
    const path = join(dir, 'shot.png');
    await writeFile(path, bytes);
    const sum = createHash('sha256').update(bytes).digest('hex');
    answers['machine-facts'] = facts();
    answers['image-put'] = `added ${String(bytes.byteLength)} ${sum}`;

    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });

    const write = ran.filter((one) => one.door === 'write');
    expect(write).toHaveLength(1);
    expect(write[0]?.id).toBe('image-put');
    expect(write[0]?.args[0]).toBe(remoteImageName('s-1', sum, '.png'));
    expect(write[0]?.args[1]).toBe(bytes.toString('base64'));
    expect(placement?.outcome).toBe('added');
    expect(placement?.remotePath).toBe(
      `/home/greg/.tortie/images/${remoteImageName('s-1', sum, '.png')}`
    );
    expect(placement?.refusal).toBeNull();
  });

  it('answers present without writing, for the same image twice', async () => {
    const bytes = png(64);
    const path = join(dir, 'shot.png');
    await writeFile(path, bytes);
    const sum = createHash('sha256').update(bytes).digest('hex');
    answers['machine-facts'] = facts();
    answers['image-put'] = `present ${String(bytes.byteLength)} ${sum}`;
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.outcome).toBe('present');
    expect(placement?.remotePath).not.toBeNull();
  });
});

describe('what arrived has to be what was sent', () => {
  it('hands back no path when the size does not match', async () => {
    const bytes = png(64);
    const path = join(dir, 'shot.png');
    await writeFile(path, bytes);
    const sum = createHash('sha256').update(bytes).digest('hex');
    answers['machine-facts'] = facts();
    answers['image-put'] = `added 12 ${sum}`;
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.remotePath).toBeNull();
    expect(placement?.refusal).toBe(IMAGE_NOT_WRITTEN);
  });

  it('hands back no path when the checksum does not match', async () => {
    const bytes = png(64);
    const path = join(dir, 'shot.png');
    await writeFile(path, bytes);
    answers['machine-facts'] = facts();
    answers['image-put'] = `added ${String(bytes.byteLength)} ${'f'.repeat(64)}`;
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.remotePath).toBeNull();
    expect(placement?.refusal).toBe(IMAGE_NOT_WRITTEN);
  });

  it('hands back a path on a machine with no checksum program', async () => {
    // The size is then the only comparison, and the module logs that it was.
    const bytes = png(64);
    const path = join(dir, 'shot.png');
    await writeFile(path, bytes);
    answers['machine-facts'] = facts();
    answers['image-put'] = `added ${String(bytes.byteLength)} nosum`;
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.remotePath).not.toBeNull();
  });

  it('hands back no path when the machine reported nothing usable', async () => {
    const path = join(dir, 'shot.png');
    await writeFile(path, png(64));
    answers['machine-facts'] = facts();
    answers['image-put'] = 'sh: base64: command not found';
    const [placement] = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path]
    });
    expect(placement?.refusal).toBe(IMAGE_NOT_WRITTEN);
  });
});

describe('a drop of several files', () => {
  it('answers one placement per path, in the order asked', async () => {
    const good = join(dir, 'a.png');
    const bad = join(dir, 'b.txt');
    await writeFile(good, png(64));
    await writeFile(bad, 'words\n');
    const sum = createHash('sha256').update(png(64)).digest('hex');
    answers['machine-facts'] = facts();
    answers['image-put'] = `added 64 ${sum}`;
    const out = await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [bad, good]
    });
    expect(out.map((one) => one.localPath)).toEqual([bad, good]);
    expect(out[0]?.remotePath).toBeNull();
    expect(out[1]?.remotePath).not.toBeNull();
  });

  it('reads the machine’s facts once for the whole drop', async () => {
    const path = join(dir, 'a.png');
    await writeFile(path, png(64));
    const sum = createHash('sha256').update(png(64)).digest('hex');
    answers['machine-facts'] = facts();
    answers['image-put'] = `added 64 ${sum}`;
    await putImagesOnMachine({
      machineId: 'pop',
      sessionId: 's-1',
      paths: [path, path, path]
    });
    expect(ran.filter((one) => one.id === 'machine-facts')).toHaveLength(1);
  });
});
