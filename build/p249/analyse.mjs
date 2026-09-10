import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(new URL('./out-room.json', import.meta.url), 'utf8'));
const lb = (rects) => { const s = new Set(); for (const x of rects) s.add(Math.round(x.top * 2) / 2); return s.size; };
const f2 = (n) => Number(n).toFixed(2);
const isTable = (t) => t.includes('|') || /^\s*-{3,}\s*$/.test(t.trim());
for (const w of ['1350', '700', '320']) {
  const W = r.widths[w];
  for (const [state, d] of [['rest', W.rest], ['current', W.current], ['widest', W.widest ? W.widest.reading : null]]) {
    if (d === null) { console.log(`pane ${w} ${state}: no reading`); continue; }
    if (state !== 'rest') continue;
    const pane = d.scrollClientWidth;
    const col = d.doc.width;
    const text = col - 48;
    console.log(`\n########## PANE ${w} (panel clientWidth ${d.panelClientWidth}, scroller ${pane}) ##########`);
    console.log(`F1 MEASURE   doc box ${f2(col)}px, text column ${f2(text)}px = ${f2(text / d.chWidth)}ch measured (ch=${d.chWidth}px), max-width computes ${d.docMaxWidth}`);
    console.log(`F1 MEASURE   free left ${f2(d.doc.left - d.scroll.left)}px, free right ${f2(d.scroll.right - d.doc.right)}px, DEAD ${f2(pane - col)}px = ${f2(((pane - col) / pane) * 100)}% of the scroller`);
    console.log(`F1 MEASURE   document height ${f2(d.doc.height)}px, scrollHeight ${d.scrollHeight}, drawn line boxes ${d.lines.length}`);

    let chWrap = 0, chFrag = 0, maxCh = 0;
    for (const c of d.changes) { const b = lb(c.rects); chFrag += c.rects.length; if (b > 1) chWrap += 1; if (b > maxCh) maxCh = b; }
    let dW = 0, dF = 0, dMax = 0, iW = 0, iF = 0, iMax = 0;
    for (const m of d.dels) { const b = lb(m.rects); dF += m.rects.length; if (b > 1) dW += 1; if (b > dMax) dMax = b; }
    for (const m of d.inss) { const b = lb(m.rects); iF += m.rects.length; if (b > 1) iW += 1; if (b > iMax) iMax = b; }
    console.log(`F2 WRAP      ${d.changes.length} changes, ${chWrap} wrap, ${chFrag} client rects in all, widest ${maxCh} line boxes`);
    console.log(`F2 WRAP      ${d.dels.length} del: ${dW} wrap over ${dF} fragments, widest ${dMax} line boxes | ${d.inss.length} ins: ${iW} wrap over ${iF} fragments, widest ${iMax}`);
    console.log(`F2 WRAP      box-decoration-break on a mark: ${JSON.stringify(d.dels[0]?.decoBreak)}, radius ${d.dels[0]?.radius}`);
    const top5 = d.dels.concat(d.inss).map((m) => ({ kind: m.kind, boxes: lb(m.rects), frag: m.rects.length, text: m.text.slice(0, 46) })).sort((a, b) => b.boxes - a.boxes).slice(0, 4);
    console.log(`F2 WRAP      widest marks: ${JSON.stringify(top5)}`);

    const tc = d.changes.filter((c) => isTable(c.del) || isTable(c.ins) || c.del === '\n' || c.ins === '\n');
    const tableLines = d.lines.filter((l) => l.text.includes('|'));
    const tTop = Math.min(...tableLines.map((l) => l.top)), tBot = Math.max(...tableLines.map((l) => l.bottom));
    const tableEls = tc.reduce((n, c) => n + c.elements + 1, 0);
    console.log(`F3 TABLE     ${tc.length} of ${d.changes.length} changes are the table (${f2((tc.length / d.changes.length) * 100)}%), over ${tableLines.length} of ${d.lines.length} drawn line boxes`);
    console.log(`F3 TABLE     table height ${f2(tBot - tTop)}px of ${f2(d.doc.height)}px (${f2(((tBot - tTop) / d.doc.height) * 100)}%), mounted elements in it ${tableEls} of ${d.docElements}`);
    const dashy = d.dels.concat(d.inss).filter((m) => /^[\s|:-]+$/.test(m.text) && m.text.trim() !== '');
    console.log(`F3 TABLE     marks whose whole text is punctuation/dashes/pipes: ${dashy.length} -> ${JSON.stringify(dashy.slice(0, 6).map((m) => m.kind + ':' + JSON.stringify(m.text)))}`);
    const nl = d.dels.concat(d.inss).filter((m) => m.text.includes('\n'));
    console.log(`F3 TABLE     marks carrying a newline: ${nl.length}`);

    const cur = W.current;
    const chip = cur?.chip ?? null;
    const bar = d.bar, btn = d.barButtons?.[0]?.box ?? null;
    if (chip !== null && cur !== null) {
      const over = cur.lines.filter((l) => chip.left < l.right && l.left < chip.right && chip.top < l.bottom && l.top < chip.bottom);
      const currentCh = cur.changes.find((c) => c.current);
      console.log(`F4 CONTROLS  chip ${f2(chip.width)}x${f2(chip.height)} at (${f2(chip.left)}, ${f2(chip.top)}); doc top ${f2(cur.doc.top)}, first line top ${f2(cur.lines[0].top)}`);
      console.log(`F4 CONTROLS  chip covers ${over.length} drawn line box(es): ${JSON.stringify(over.slice(0, 3).map((l) => l.text.slice(0, 40)))}`);
      console.log(`F4 CONTROLS  chip is ${f2((chip.width / cur.scrollClientWidth) * 100)}% of the scroller's width; chip right ${f2(chip.right)} vs view right ${f2(cur.view.right)}`);
      if (currentCh) console.log(`F4 CONTROLS  current change ${currentCh.i} first rect top ${f2(currentCh.rects[0].top)}, chip bottom ${f2(chip.bottom)}, gap ${f2(currentCh.rects[0].top - chip.bottom)}`);
    }
    console.log(`F4 CONTROLS  bar spans the PANEL: ${f2(bar.left)}..${f2(bar.right)} (${f2(bar.width)}px). Accept all at ${f2(btn.left)}..${f2(btn.right)}`);
    console.log(`F4 CONTROLS  Accept all's left edge is ${f2(btn.left - d.contentRight)}px right of the column's own content edge (${f2(d.contentRight)})`);

    const frags = [];
    for (const m of d.dels.concat(d.inss)) for (const rc of m.rects) frags.push({ kind: m.kind, right: rc.right, top: rc.top, text: m.text.slice(0, 30) });
    const edge = d.contentRight;
    const over = frags.filter((f) => f.right - edge > 0.5);
    const near = frags.filter((f) => Math.abs(f.right - edge) <= 0.5);
    console.log(`F5 EDGE      column content edge ${f2(edge)}; ${over.length} of ${frags.length} mark fragments cross it, ${near.length} land on it`);
    if (over.length) console.log(`F5 EDGE      worst overhang ${f2(Math.max(...over.map((f) => f.right - edge)))}px -> ${JSON.stringify(over.slice(0, 4).map((f) => f.kind + ':' + JSON.stringify(f.text) + '@+' + f2(f.right - edge)))}`);
    const lineOver = d.lines.filter((l) => l.right - edge > 0.5);
    console.log(`F5 EDGE      drawn TEXT rows past the content edge: ${lineOver.length} of ${d.lines.length}; widest row right ${f2(Math.max(...d.lines.map((l) => l.right)))}`);
    console.log(`F5 EDGE      vertical hairlines drawn in the view: ${JSON.stringify(d.hairlines.map((h) => h.cls))}`);
    console.log(`NOTES        ${JSON.stringify(d.notes)}`);
  }
}
