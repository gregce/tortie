'use strict';
// Research 63. Measures the reader on real logs. READ ONLY. Run with:
//   node --expose-gc measure.js [--top 12] [--providers claude,codex,...]
const fs = require('node:fs');
const { readSession } = require('./read');
const { SOURCES } = require('./lib/discover');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i === -1 ? d : argv[i + 1]; };
const TOP = Number(arg('top', 12));
const only = arg('providers', null);
const now = () => Number(process.hrtime.bigint()) / 1e6;
const gc = () => { if (global.gc) global.gc(); };

const ALL = ['claude', 'codex', 'grok', 'antigravity', 'muse', 'qwen', 'pi', 'gemini', 'deepseek', 'copilotide'];
const list = only ? only.split(',') : ALL;

const rows = [];
const detail = {};

for (const p of list) {
  const files = SOURCES[p]();
  if (!files.length) { rows.push({ p, files: 0 }); continue; }
  const corpus = files.slice(0, Math.min(TOP, files.length));

  // ---- the corpus read -----------------------------------------------------
  // one untimed pass first, so a small corpus is not measuring the JIT warming up
  for (const f of corpus) { try { readSession({ provider: p, file: f.file, sessionId: f.sessionId || null }); readSession({ provider: p, file: f.file, sessionId: f.sessionId || null, noPrefilter: true }); } catch {} }
  gc();
  let bytes = 0, kept = 0, turns = 0, answered = 0, parsed = 0, ok = 0, subagent = 0;
  const t0 = now();
  for (const f of corpus) {
    let r; try { r = readSession({ provider: p, file: f.file, sessionId: f.sessionId || null }); } catch { continue; }
    if (r.join && r.join.threadSource === 'subagent') { subagent++; continue; }
    ok++; bytes += r.acct.size; kept += r.keptBytes; parsed += r.acct.bytesParsed;
    turns += r.turns.length; answered += r.turns.filter((t) => t.answer).length;
  }
  const ms = now() - t0;

  // the same corpus with the raw byte skip switched OFF, so the saving is measured rather than claimed
  gc();
  let parsedNo = 0;
  const t1 = now();
  for (const f of corpus) {
    try { const r = readSession({ provider: p, file: f.file, sessionId: f.sessionId || null, noPrefilter: true }); parsedNo += r.acct.bytesParsed; } catch {}
  }
  const msNo = now() - t1;

  // ---- the largest file, in depth ------------------------------------------
  const big = corpus[0];
  gc();
  const base = process.memoryUsage();
  let peakRss = base.rss, peakHeap = base.heapUsed;
  const tick = () => { const m = process.memoryUsage(); if (m.rss > peakRss) peakRss = m.rss; if (m.heapUsed > peakHeap) peakHeap = m.heapUsed; };
  const b0 = now();
  const rb = readSession({ provider: p, file: big.file, sessionId: big.sessionId || null, tick });
  const bMs = now() - b0;
  const after = process.memoryUsage();

  // prefilter off, same file, same result
  const n0 = now();
  const rn = readSession({ provider: p, file: big.file, sessionId: big.sessionId || null, noPrefilter: true });
  const nMs = now() - n0;

  // ---- the watermark -------------------------------------------------------
  const w0 = now();
  const rw = readSession({ provider: p, file: big.file, sessionId: big.sessionId || null, watermark: rb.watermark });
  const wMs = now() - w0;

  // ---- one new turn since the watermark ------------------------------------
  // No file of his is written to. The watermark is instead rolled BACK to the byte
  // offset where the last turn opened, which is byte for byte the state the reader
  // would have been left in one turn ago.
  let oneMs = null, oneTurns = null, oneBytes = null;
  if (rb.turnOffsets && rb.turnOffsets.length > 1) {
    const wm = { ...rb.watermark, offset: rb.turnOffsets[rb.turnOffsets.length - 1], size: rb.turnOffsets[rb.turnOffsets.length - 1], open: true };
    const o0 = now();
    const ro = readSession({ provider: p, file: big.file, sessionId: big.sessionId || null, watermark: wm });
    oneMs = now() - o0; oneTurns = ro.turns.length; oneBytes = ro.acct.bytesRead;
  }

  rows.push({
    p, files: ok, subagent, bytes, ms, msNo, parsed, parsedNo, kept, turns, answered,
    ratio: kept / bytes, mbs: (bytes / 1048576) / (ms / 1000),
    bigFile: big.file, bigSize: big.size, bigMs: bMs, bigParsed: rb.acct.bytesParsed,
    bigLines: rb.acct.lines, bigLinesParsed: rb.acct.linesParsed, bigPeakLine: rb.acct.peakLineBuffer,
    noPreMs: nMs, noPreParsed: rn.acct.bytesParsed, sameResult: rn.turns.length === rb.turns.length,
    wmMs: wMs, wmWork: rw.work, oneMs, oneTurns, oneBytes,
    rssDelta: peakRss - base.rss, heapDelta: peakHeap - base.heapUsed, heapAfter: after.heapUsed - base.heapUsed,
    bigTurns: rb.turns.length,
  });
  detail[p] = rows[rows.length - 1];
  process.stderr.write(`. ${p}\n`);
}

const mb = (n) => (n / 1048576).toFixed(2);
const pad = (s, n, r = true) => r ? String(s).padStart(n) : String(s).padEnd(n);

console.log('\n== TABLE 1. Per provider, over the largest files on this machine ==\n');
console.log(pad('agent', 12, false) + pad('files', 6) + pad('store MB', 11) + pad('read ms', 10) + pad('turns', 7) + pad('kept B', 11) + pad('keep %', 9) + pad('reduction', 11) + pad('MB/s', 9));
console.log('-'.repeat(86));
for (const r of rows) {
  if (!r.files) { console.log(pad(r.p, 12, false) + pad(0, 6) + '   no store on this machine'); continue; }
  console.log(pad(r.p, 12, false) + pad(r.files, 6) + pad(mb(r.bytes), 11) + pad(r.ms.toFixed(1), 10) + pad(r.turns, 7) + pad(r.kept.toLocaleString('en-US'), 11) + pad((r.ratio * 100).toFixed(3), 9) + pad((1 / r.ratio).toFixed(0) + 'x', 11) + pad(((r.bytes / 1048576) / (r.ms / 1000)).toFixed(0), 9));
}

console.log('\n== TABLE 2a. Skip before parsing, over the whole corpus above ==\n');
console.log(pad('agent', 12, false) + pad('store MB', 11) + pad('bytes parsed', 15) + pad('of store', 10) + pad('with skip', 11) + pad('parse all', 11) + pad('speedup', 9));
console.log('-'.repeat(79));
for (const r of rows) {
  if (!r.files) continue;
  console.log(pad(r.p, 12, false) + pad(mb(r.bytes), 11) + pad(r.parsed.toLocaleString('en-US'), 15) + pad((r.parsed / r.bytes * 100).toFixed(2) + '%', 10) + pad(r.ms.toFixed(1) + ' ms', 11) + pad(r.msNo.toFixed(1) + ' ms', 11) + pad((r.msNo / r.ms).toFixed(2) + 'x', 9));
}

console.log('\n== TABLE 2b. Skip before parsing, on the largest file of each provider ==\n');
console.log(pad('agent', 12, false) + pad('file MB', 10) + pad('lines', 9) + pad('parsed', 9) + pad('bytes parsed', 14) + pad('of file', 9) + pad('with skip', 11) + pad('parse all', 11) + pad('speedup', 9));
console.log('-'.repeat(94));
for (const r of rows) {
  if (!r.files) continue;
  console.log(pad(r.p, 12, false) + pad(mb(r.bigSize), 10) + pad(r.bigLines, 9) + pad(r.bigLinesParsed, 9) + pad(r.bigParsed.toLocaleString('en-US'), 14) + pad((r.bigParsed / r.bigSize * 100).toFixed(2) + '%', 9) + pad(r.bigMs.toFixed(1) + ' ms', 11) + pad(r.noPreMs.toFixed(1) + ' ms', 11) + pad((r.noPreMs / r.bigMs).toFixed(2) + 'x', 9));
}

console.log('\n== TABLE 3. The watermark, on the same largest file ==\n');
console.log(pad('agent', 12, false) + pad('file MB', 10) + pad('full read', 11) + pad('unchanged', 11) + pad('one new turn', 14) + pad('bytes read', 12) + pad('turns back', 11));
console.log('-'.repeat(81));
for (const r of rows) {
  if (!r.files) continue;
  console.log(pad(r.p, 12, false) + pad(mb(r.bigSize), 10) + pad(r.bigMs.toFixed(1) + ' ms', 11) + pad(r.wmMs.toFixed(3) + ' ms', 11) + pad(r.oneMs === null ? '-' : r.oneMs.toFixed(3) + ' ms', 14) + pad(r.oneBytes === null ? '-' : r.oneBytes.toLocaleString('en-US'), 12) + pad(r.oneTurns === null ? '-' : r.oneTurns, 11));
}

console.log('\n== TABLE 4. Memory, on the largest file of each provider ==\n');
console.log(pad('agent', 12, false) + pad('file MB', 10) + pad('turns', 7) + pad('peak heap MB', 14) + pad('heap after MB', 15) + pad('peak rss MB', 13) + pad('largest line B', 15));
console.log('-'.repeat(86));
for (const r of rows) {
  if (!r.files) continue;
  console.log(pad(r.p, 12, false) + pad(mb(r.bigSize), 10) + pad(r.bigTurns, 7) + pad(mb(r.heapDelta), 14) + pad(mb(r.heapAfter), 15) + pad(mb(r.rssDelta), 13) + pad(r.bigPeakLine.toLocaleString('en-US'), 15));
}

fs.writeFileSync(process.env.R63_OUT || '/dev/null', JSON.stringify(rows, null, 1));
