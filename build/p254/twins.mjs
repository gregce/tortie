/**
 * twins.mjs — the research 116 twin synthesizer, shared. PHASE 254 wrote it
 * inside probe-p254-open.mjs; PHASE 255 lifted it here verbatim so its own app
 * run and gate can build the same bytes without importing a probe that
 * launches an Electron at module scope. Seeds 11 (A) and 22 (B) give the
 * twins research 116 and 117 measured, exact to the byte.
 *
 * Pure: no process, no file, no Electron.
 */

// ---------------------------------------------------------------------------
// The twins — synthesized from research 116 §1's SHAPE table. Sizes exact to
// the byte; structural counts within a few percent. No operator content: the
// words are a seeded generator's.
// ---------------------------------------------------------------------------

export const SHAPES = {
  a: { bytes: 2559758, lines: 46105, headings: 1644, fenceLines: 2392, listItems: 2783, tableRows: 884, long1k: 142, long10k: [13001, 11000] },
  b: { bytes: 3262893, lines: 26750, headings: 1468, fenceLines: 40, listItems: 3367, tableRows: 1554, long1k: 300, long10k: [] }
};

/** Deterministic words, so two runs synthesize the same twin. */
function makeWords(seed) {
  let x = seed >>> 0;
  const next = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x;
  };
  const bank = ['alpha', 'bramble', 'copper', 'delta', 'ember', 'fjord', 'garnet', 'harbor', 'indigo', 'juniper', 'kestrel', 'lantern', 'meadow', 'nimbus', 'orchard', 'pebble', 'quarry', 'russet', 'saffron', 'thicket', 'umber', 'vesper', 'willow', 'yonder'];
  return (n) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(bank[next() % bank.length]);
    return out.join(' ');
  };
}

/**
 * One markdown twin: exact byte count, exact line count, and the shape's own
 * mix of headings, fences, list items, table rows and over-long lines. The
 * mean paragraph length is solved from what the special lines leave over, and
 * the final filler line absorbs the byte remainder exactly.
 */
export function synthTwin(shape, seed) {
  const words = makeWords(seed);
  // The specials, flattened: a fence block is its TWO delimiter lines,
  // adjacent, so the ``` line count is exact and every block is closed.
  const specials = [];
  for (let i = 0; i < shape.headings; i++) specials.push('heading');
  for (let i = 0; i < shape.listItems; i++) specials.push('list');
  for (let i = 0; i < shape.tableRows; i++) specials.push('table');
  for (let i = 0; i < shape.long1k; i++) specials.push('long1k');
  for (const len of shape.long10k) specials.push(`long10k:${len}`);
  for (let i = 0; i < Math.floor(shape.fenceLines / 2); i++) specials.push('fence-open', 'fence-close');
  const planLines = shape.lines; // joined with \n and closed by one: N lines
  const plan = new Array(planLines).fill('para');
  const every = Math.max(2, Math.floor(planLines / (specials.length + 1)));
  let k = 0;
  for (let i = every; i < planLines && k < specials.length; i += 1) {
    if (i % every === 0) {
      plan[i] = specials[k];
      if (specials[k] === 'fence-open' && i + 1 < planLines && k + 1 < specials.length) {
        plan[i + 1] = specials[k + 1];
        k += 1;
        i += 1;
      }
      k += 1;
    } else if (i % 5 === 4) {
      plan[i] = 'blank';
    }
  }
  for (let i = planLines - 1; i >= 0 && k < specials.length; i--) {
    if (plan[i] === 'para' || plan[i] === 'blank') {
      plan[i] = specials[k];
      k += 1;
    }
  }
  // Render everything but the paragraphs, counting their bytes.
  const lines = new Array(planLines);
  let bytesSpecial = 0;
  let ordinary = 0;
  for (let i = 0; i < planLines; i++) {
    const kind = plan[i];
    let line = null;
    if (kind === 'para') { ordinary += 1; continue; }
    if (kind === 'blank') line = '';
    else if (kind === 'heading') line = `## ${words(4)}`;
    else if (kind === 'list') line = `- ${words(7)}`;
    else if (kind === 'table') line = `| ${words(2)} | ${words(3)} | ${words(2)} |`;
    else if (kind === 'fence-open') line = '```ts';
    else if (kind === 'fence-close') line = '```';
    else if (kind === 'long1k') line = `${words(6)} ${'longline '.repeat(134)}${words(2)}`;
    else line = 'y'.repeat(Number(kind.slice(8)));
    lines[i] = line;
    bytesSpecial += line.length + 1;
  }
  // Solve the ordinary paragraph length from the bytes left over.
  const leftover = shape.bytes - bytesSpecial - ordinary; // each para pays its \n
  const paraLen = Math.max(8, Math.floor(leftover / Math.max(1, ordinary)));
  let lastPara = -1;
  for (let i = 0; i < planLines; i++) {
    if (plan[i] !== 'para') continue;
    let ptext = words(Math.ceil(paraLen / 7));
    ptext = ptext.length > paraLen ? ptext.slice(0, paraLen).trimEnd() : ptext.padEnd(paraLen, 'x');
    lines[i] = ptext;
    lastPara = i;
  }
  let text = `${lines.join('\n')}\n`;
  // The filler: absorb the byte remainder in the LAST paragraph, exactly.
  const drift = shape.bytes - Buffer.byteLength(text, 'utf8');
  if (lastPara >= 0 && drift !== 0) {
    const cur = lines[lastPara];
    lines[lastPara] = drift > 0 ? cur + 'x'.repeat(drift) : cur.slice(0, Math.max(1, cur.length + drift));
    text = `${lines.join('\n')}\n`;
  }
  return text;
}

/** The synthesizer proves itself: exact bytes, exact lines, the mix present. */
export function twinFindings(shape, text) {
  const bad = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes !== shape.bytes) bad.push(`bytes ${bytes} !== ${shape.bytes}`);
  const lineArr = text.split('\n');
  const lineCount = lineArr.length - 1;
  if (lineCount !== shape.lines) bad.push(`lines ${lineCount} !== ${shape.lines}`);
  const count = (re) => lineArr.filter((l) => re.test(l)).length;
  const near = (name, got, want, tol) => {
    if (Math.abs(got - want) > want * tol + 2) bad.push(`${name} ${got} not within ${tol * 100}% of ${want}`);
  };
  near('headings', count(/^#{1,6} /), shape.headings, 0.02);
  near('fence lines', count(/^```/), shape.fenceLines, 0.02);
  near('list items', count(/^- /), shape.listItems, 0.02);
  near('table rows', count(/^\| /), shape.tableRows, 0.02);
  near('lines over 1000', lineArr.filter((l) => l.length > 1000).length, shape.long1k + shape.long10k.length, 0.05);
  return bad;
}

