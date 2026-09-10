/**
 * PHASE 247 fix round — the probe `conformance:pathdoors` rule 11 drives.
 *
 * A ROW'S STRING INDICES ARE NOT ITS CELL COLUMNS, and xterm underlines and
 * hit-tests in COLUMNS. This runs the SHIPPING `cellColumns` and `spanColumns`
 * against a REAL `@xterm/xterm` buffer — the exact bytes in node_modules the
 * renderer loads — driven headless under node behind research 107's own DOM
 * shim, and grades them against TWO independent answers:
 *
 *   - xterm's OWN map. The core `BufferLine.translateToString` takes a fourth
 *     `outColumns` argument that the public `IBufferLine` drops; the core line
 *     is reached through `_core.buffer.lines` and asked for it directly, so
 *     the oracle is the library's arithmetic rather than a model of it.
 *   - THE CELLS THEMSELVES. For every span, the characters in the columns
 *     `spanColumns` names are read back out of the buffer and must be the
 *     span's own text — which is the property a person sees as an underline
 *     sitting on the path rather than one cell to the left of it.
 *
 * It launches no Electron, opens no window, touches no filesystem, and prints
 * ONE line of JSON. The gate judges what it printed; this file decides
 * nothing.
 *
 * `P247_MODULES` names a directory holding an ABLATED copy of path-spans.ts.
 */

import { installDomShim } from '../p245/dom-shim.mjs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

installDomShim();

const modules = process.env['P247_MODULES'];
const spansHref =
  modules === undefined
    ? new URL('../../src/shared/path-spans.ts', import.meta.url).href
    : pathToFileURL(join(modules, 'path-spans.ts')).href;

interface RowCell {
  getChars(): string;
  getWidth(): number;
}
const spans = (await import(spansHref)) as {
  cellColumns(line: { readonly length: number; getCell(x: number): RowCell | undefined }): number[];
  spanColumns(
    span: { start: number; end: number },
    columns: number[]
  ): { start: number; end: number } | null;
  pathSpansInRow(
    row: string,
    edges: {
      width: number;
      columns: number[];
      above: string | null;
      aboveEnd: number;
    }
  ): { text: string; start: number; end: number; target: string }[];
};

const xterm = (await import('@xterm/xterm')) as unknown as {
  Terminal: new (o: Record<string, unknown>) => {
    write(d: string, cb: () => void): void;
    buffer: { active: { getLine(y: number): unknown } };
    dispose(): void;
    _core: { buffer: { lines: { get(y: number): unknown } } };
  };
};

/** The glyphs a real transcript carries, in front of a path an agent named. */
const GLYPHS: [string, string][] = [
  ['plain', ''],
  ['warning', '⚠️ '],
  ['check-vs16', '✔️ '],
  ['wrench', '\u{1f527} '],
  ['party', '\u{1f389} '],
  ['memo', '\u{1f4dd} '],
  ['rocket', '\u{1f680} '],
  ['cjk', '你好 '],
  ['combining', 'é '],
  ['zwj-family', '\u{1f469}‍\u{1f4bb} '],
  ['bullet-circle', '⏺ '],
  ['tree-elbow', '⎿ '],
  ['tick', '✅ '],
  ['arrow', '→ ']
];

const PATH = '/private/tmp/p247/notes.md';

const write = (t: { write(d: string, cb: () => void): void }, d: string) =>
  new Promise<void>((r) => {
    t.write(d, r);
  });

const readings: Record<string, string | number> = {};
let agreed = 0;
let moved = 0;
let underlined = 0;
const disagreements: string[] = [];

for (const [name, glyph] of GLYPHS) {
  const term = new xterm.Terminal({ cols: 200, rows: 4, allowProposedApi: true });
  try {
    await write(term, `${glyph}wrote ${PATH} for you`);
    const api = term.buffer.active.getLine(0) as {
      readonly length: number;
      getCell(x: number): RowCell | undefined;
      translateToString(trim: boolean): string;
    };
    const core = term._core.buffer.lines.get(0) as {
      translateToString(t: boolean, a: undefined, b: undefined, out: number[]): string;
    };
    const oracle: number[] = [];
    const row = core.translateToString(true, undefined, undefined, oracle);
    const mine = spans.cellColumns(api);

    // 11a. Our map is xterm's own map, index for index over the drawn string.
    const same = oracle.every((c, i) => mine[i] === c);
    if (same) agreed += 1;
    else disagreements.push(name);

    // How many of these glyphs really move the column. A rule whose fixtures
    // all read zero would pass with the identity map and prove nothing.
    if (oracle.some((c, i) => c !== i)) moved += 1;

    // 11b. The columns the span names hold the span's own text, read back out
    // of the buffer cell by cell. This is the property a person SEES.
    // PHASE 250. Refusal 8 is asked about the pane's own width now, and this
    // probe's terminal is 200 columns wide against rows of a few dozen, so
    // nothing here is refused for an edge — which is what leaves the column
    // arithmetic as the only thing under test.
    const found = spans.pathSpansInRow(row, {
      width: 200,
      columns: mine,
      above: null,
      aboveEnd: 0
    });
    const span = found.find((s) => s.text === PATH);
    if (span !== undefined) {
      const range = spans.spanColumns(span, mine);
      if (range !== null) {
        let drawn = '';
        for (let x = range.start - 1; x <= range.end - 1; x += 1) {
          const cell = api.getCell(x);
          if (cell === undefined) break;
          if (cell.getWidth() === 0) continue;
          drawn += cell.getChars() === '' ? ' ' : cell.getChars();
        }
        if (drawn === PATH) underlined += 1;
        else disagreements.push(`${name}:drawn`);
      } else disagreements.push(`${name}:no-range`);
    } else disagreements.push(`${name}:no-span`);
  } finally {
    term.dispose();
  }
}

readings['columns-agree-with-xterm'] = `${String(agreed)}/${String(GLYPHS.length)}`;
readings['underline-sits-on-the-path'] = `${String(underlined)}/${String(GLYPHS.length)}`;
readings['glyphs-that-move-the-column'] = moved;
readings['disagreements'] = disagreements.join(' ');

process.stdout.write(`${JSON.stringify(readings)}\n`);
