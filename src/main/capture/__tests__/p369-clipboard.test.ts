/**
 * Phase 369: Capture Screen, Copy and Copy as HTML on Electron 45's clipboard.
 *
 * Electron 44 rebuilt `clipboard` in the W3C shape (electron#52508): the
 * object form of `write` and `writeImage` are gone, and `write` takes an array
 * of `ClipboardItem` and returns a promise. These rows hold what the move keeps
 * (build/p369/SPEC.md §4.2 and D4):
 *
 *   - a Copy is ONE item of exactly `text/plain`, with `text/html` beside it
 *     only when it is not empty;
 *   - a capture is ONE item of exactly `image/png` holding the PNG's bytes;
 *   - a capture and a Copy answer only once the write has landed;
 *   - a write that fails is answered: `capture:image` and `capture:viewport`
 *     refuse with "Couldn't capture this session." and the failure's own
 *     words, and `clipboard:writeRich` rejects.
 *
 * THE RIG. `electron` is Electron 45's main-process shape, as
 * lib/browser/api/clipboard.ts and clipboard-item.ts read at v45.3.2 and
 * v45.3.4: `clipboard` has exactly clear, has, read, readText, write and
 * writeText; `ClipboardItem` takes an object of at least one MIME type; and
 * `write` is async, refuses anything but an array of `ClipboardItem`, resolves
 * every payload (a string as it is, a Blob to its bytes) and then commits every
 * item at once. That commit is the moment a paste would see the write, so it
 * is recorded, and a row can hold it open or make the write fail before it.
 * `nativeImage.createFromBuffer` reads a PNG's size from its IHDR chunk, and
 * the PNG is a real one, built here byte for byte.
 *
 * Every row but the last fails against the parent's service.ts and ipc.ts,
 * which call Electron 43's `writeImage` and object `write`. The last is the
 * refusal that did not change: it passes at both, and fails only when
 * `capture:image` stops awaiting inside its try.
 */

import { crc32, deflateSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => {
  /** Electron 45's `ClipboardItem` facade: MIME types to payloads, at least one. */
  class ClipboardItem {
    readonly record: Record<string, unknown>;

    constructor(items: Record<string, unknown>) {
      if (typeof items !== 'object' || items === null || Array.isArray(items)) {
        throw new TypeError("Failed to construct 'ClipboardItem': 1 argument required.");
      }
      if (Object.keys(items).length === 0) {
        throw new TypeError("Failed to construct 'ClipboardItem': at least one MIME type is required.");
      }
      this.record = { ...items };
    }

    get types(): string[] {
      return Object.keys(this.record);
    }
  }

  /** The text types native Electron stores as text; every other type is bytes. */
  const TEXT_TYPES = new Set(['text/plain', 'text/html', 'text/rtf']);

  const state = {
    /** Every committed write, in order: its items, each a MIME type to what a paste reads. */
    commits: [] as Array<Array<Record<string, string | Buffer>>>,
    /** Writes that reached the commit step, landed or not. */
    handed: 0,
    /** While set, a write waits on it before it commits. */
    hold: null as Promise<void> | null,
    /** When set, a write fails with it instead of committing. */
    refuse: null as Error | null,
    /** The PNG `capturePage` hands back for a viewport capture. */
    page: Buffer.alloc(0) as Buffer
  };

  const unused = (name: string) => (): never => {
    throw new Error(`the capture service does not call clipboard.${name}`);
  };

  const clipboard = {
    clear: unused('clear'),
    has: unused('has'),
    read: unused('read'),
    readText: unused('readText'),
    writeText: unused('writeText'),
    async write(items: unknown): Promise<void> {
      if (!Array.isArray(items)) {
        throw new TypeError('clipboard.write expects an array of ClipboardItem');
      }
      const resolved: Array<Record<string, string | Buffer>> = [];
      for (const item of items) {
        if (!(item instanceof ClipboardItem)) {
          throw new TypeError('clipboard.write expects an array of ClipboardItem');
        }
        const one: Record<string, string | Buffer> = {};
        for (const [mime, payload] of Object.entries(item.record)) {
          const value: unknown = await payload;
          let bytes: Buffer;
          if (typeof value === 'string') bytes = Buffer.from(value, 'utf8');
          else if (value instanceof Blob) bytes = Buffer.from(await value.arrayBuffer());
          else if (ArrayBuffer.isView(value)) bytes = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
          else throw new TypeError('ClipboardItem payload values must be a string or a Blob');
          one[mime] = TEXT_TYPES.has(mime) ? bytes.toString('utf8') : bytes;
        }
        resolved.push(one);
      }
      state.handed += 1;
      if (state.hold !== null) await state.hold;
      if (state.refuse !== null) throw state.refuse;
      state.commits.push(resolved);
    }
  };

  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const nativeImage = {
    createFromBuffer(buffer: Buffer): { getSize(): { width: number; height: number } } {
      const png =
        buffer.length >= 24 &&
        buffer.subarray(0, 8).equals(PNG_SIGNATURE) &&
        buffer.toString('latin1', 12, 16) === 'IHDR';
      const size = png
        ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
        : { width: 0, height: 0 };
      return { getSize: () => size };
    }
  };

  const sender = { id: 1 };
  const page = {
    isEmpty: (): boolean => state.page.length === 0,
    toPNG: (): Buffer => state.page
  };
  const win = {
    isDestroyed: (): boolean => false,
    webContents: { capturePage: async (_rect: unknown) => page }
  };

  /** The registrar's handlers, by channel. */
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();

  return { ClipboardItem, clipboard, handlers, nativeImage, sender, state, win };
});

vi.mock('electron', () => ({
  app: { getPath: () => '/nonexistent' },
  BrowserWindow: {
    fromWebContents: (contents: unknown) => (contents === rig.sender ? rig.win : null)
  },
  clipboard: rig.clipboard,
  ClipboardItem: rig.ClipboardItem,
  dialog: {},
  nativeImage: rig.nativeImage
}));
vi.mock('../../typed-ipc', () => ({
  handle: (_ipc: unknown, channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
    rig.handlers.set(channel, fn);
  }
}));
// The history half of the service and the registrar, which no row here reaches.
vi.mock('../../tmux', () => ({}));
vi.mock('../../tmux/history-lines', () => ({}));
vi.mock('../../tmux/scroll', () => ({}));
vi.mock('../../machines/remote-pane-history', () => ({}));

const { captureImage, writeRichClipboard } = await import('../service');
const { registerCaptureIpc } = await import('../ipc');
const { gmuxErrorPayloadOf } = await import('../../errors');
registerCaptureIpc({} as never);

/** An invoke as `ipcMain.handle` answers one: a throw and a rejection both reject. */
async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const fn = rig.handlers.get(channel);
  if (fn === undefined) throw new Error(`nothing handles ${channel}`);
  return await fn({ sender: rig.sender }, ...args);
}

/** What an invoke rejected with, or null when it resolved. */
async function refusal(answer: Promise<unknown>): Promise<unknown> {
  return answer.then(
    () => null,
    (err: unknown) => err
  );
}

/** A gate a write waits on until the row opens it. */
function gate(): { opened: Promise<void>; open: () => void } {
  let open = (): void => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

/** Whether a promise has settled once 20 ms of every other task has run. */
async function settledSoon(answer: Promise<unknown>): Promise<boolean> {
  let settled = false;
  answer.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 20);
  });
  return settled;
}

/** A real PNG: `width` by `height`, 8-bit RGBA, every pixel the same grey. */
function makePng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per sample
  header[9] = 6; // RGBA
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 4, 0x7f)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

beforeEach(() => {
  rig.state.commits = [];
  rig.state.handed = 0;
  rig.state.hold = null;
  rig.state.refuse = null;
  rig.state.page = Buffer.alloc(0);
});

describe('Copy and Copy as HTML: one item, awaited', () => {
  it('puts a plain Copy on as ONE item of exactly text/plain, never an empty text/html', async () => {
    await writeRichClipboard({ text: 'first line\nsecond line', html: '' });
    expect(rig.state.commits).toStrictEqual([[{ 'text/plain': 'first line\nsecond line' }]]);
  });

  it('puts Copy as HTML on as ONE item of exactly text/plain and text/html', async () => {
    const html = '<pre style="color:#cd3131">red</pre>';
    await writeRichClipboard({ text: 'red', html });
    expect(rig.state.commits).toStrictEqual([[{ 'text/plain': 'red', 'text/html': html }]]);
  });

  it('answers a Copy only once its write has landed', async () => {
    const held = gate();
    rig.state.hold = held.opened;
    const answer = invoke('clipboard:writeRich', { text: 'held', html: '' });
    expect(await settledSoon(answer)).toBe(false);
    expect(rig.state.commits).toHaveLength(0);
    held.open();
    await expect(answer).resolves.toBeUndefined();
    expect(rig.state.commits).toStrictEqual([[{ 'text/plain': 'held' }]]);
  });

  it('rejects a Copy whose write fails, with the failure, and nothing lands', async () => {
    rig.state.refuse = new Error('the pasteboard refused the text');
    const err = await refusal(invoke('clipboard:writeRich', { text: 'x', html: '<b>x</b>' }));
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('the pasteboard refused the text');
    expect(rig.state.handed).toBe(1);
    expect(rig.state.commits).toHaveLength(0);
  });
});

describe('Capture Screen: one image/png item, awaited', () => {
  it("puts a capture on as ONE item of exactly image/png holding the PNG's bytes, and answers its size", async () => {
    const png = makePng(3, 2);
    // The renderer's bytes arrive as a view into a larger buffer: only the
    // view is the image.
    const backing = new Uint8Array(png.length + 16).fill(0xee);
    backing.set(png, 8);
    const result = await captureImage({
      png: backing.subarray(8, 8 + png.length),
      suggestedName: 'session'
    });
    expect(result).toStrictEqual({ width: 3, height: 2, bytes: png.length });
    expect(rig.state.commits).toStrictEqual([[{ 'image/png': png }]]);
  });

  it('answers a capture only once the image has landed', async () => {
    const png = makePng(4, 4);
    const held = gate();
    rig.state.hold = held.opened;
    const answer = invoke('capture:image', { png, suggestedName: 'held' });
    expect(await settledSoon(answer)).toBe(false);
    expect(rig.state.commits).toHaveLength(0);
    held.open();
    await expect(answer).resolves.toStrictEqual({ width: 4, height: 4, bytes: png.length });
    expect(rig.state.commits).toStrictEqual([[{ 'image/png': png }]]);
  });

  it("answers a viewport capture only once the page's image has landed", async () => {
    rig.state.page = makePng(5, 3);
    const held = gate();
    rig.state.hold = held.opened;
    const answer = invoke('capture:viewport', {
      rect: { x: 0, y: 0, width: 100, height: 50 },
      suggestedName: 'viewport'
    });
    expect(await settledSoon(answer)).toBe(false);
    held.open();
    await expect(answer).resolves.toStrictEqual({
      width: 5,
      height: 3,
      bytes: rig.state.page.length
    });
    expect(rig.state.commits).toStrictEqual([[{ 'image/png': rig.state.page }]]);
  });

  for (const channel of ['capture:image', 'capture:viewport'] as const) {
    it(`refuses a ${channel} whose write fails with "Couldn't capture this session." and the failure's words`, async () => {
      rig.state.refuse = new Error('the pasteboard refused the image');
      rig.state.page = makePng(2, 2);
      const input =
        channel === 'capture:image'
          ? { png: makePng(2, 2), suggestedName: 'refused' }
          : { rect: { x: 0, y: 0, width: 10, height: 10 }, suggestedName: 'refused' };
      const err = await refusal(invoke(channel, input));
      expect(gmuxErrorPayloadOf(err)).toStrictEqual({
        code: 'UNKNOWN',
        message: "Couldn't capture this session.",
        detail: 'the pasteboard refused the image'
      });
      expect(rig.state.handed).toBe(1);
      expect(rig.state.commits).toHaveLength(0);
    });
  }

  it('still refuses an empty image before it writes anything (a control: the same at the parent)', async () => {
    const err = await refusal(invoke('capture:image', { png: new Uint8Array(0), suggestedName: 'empty' }));
    expect(gmuxErrorPayloadOf(err)).toStrictEqual({
      code: 'UNKNOWN',
      message: "Couldn't capture this session.",
      detail: 'the capture produced no image'
    });
    expect(rig.state.handed).toBe(0);
  });
});
