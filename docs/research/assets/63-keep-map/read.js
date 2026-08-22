'use strict';
// Research 63. The reference reader. Node only, no dependencies, no Electron.
//
//   node read.js --provider claude --file <path> [--session-id <id>] [--watermark <json>] [--json]
//
// It returns, per turn, only the five things the session overview page needs:
//   1 the human's ask, verbatim, with its timestamp
//   2 the agent's closing answer, verbatim, with its timestamp
//   3 the turn boundary, being one object per turn
//   4 the join, being the session id and the cwd the log itself carries
//   5 a watermark, so the next read after one new turn does almost no work

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scanFile } = require('./lib/lines');
const { Fold } = require('./lib/fold');
const { at, test } = require('./lib/expr');

const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'keep-map.json'), 'utf8'));

function headHash(file, n = 4096) {
  const fd = fs.openSync(file, 'r');
  try {
    const b = Buffer.allocUnsafe(n);
    const r = fs.readSync(fd, b, 0, n, 0);
    return crypto.createHash('sha256').update(b.subarray(0, r)).digest('hex').slice(0, 16);
  } finally { fs.closeSync(fd); }
}

// ---------------------------------------------------------------- jsonl ------
function readJsonl(cfg, file, opts) {
  const st = fs.statSync(file);
  const wm = opts.watermark;
  const out = { turns: [], join: {}, acct: null, stats: null, resumed: false, work: 'full' };

  if (wm && wm.size === st.size && wm.mtimeNs === String(st.mtimeNs)) {
    out.work = 'none'; out.acct = { bytesRead: 0, bytesParsed: 0, lines: 0, linesParsed: 0, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, size: st.size, mtimeNs: String(st.mtimeNs), peakLineBuffer: 0 };
    out.watermark = wm; return out;
  }
  let start = 0;
  if (wm && wm.headHash && st.size >= wm.offset && headHash(file) === wm.headHash) { start = wm.offset; out.resumed = true; out.work = 'tail'; }

  const bind = { sessionId: opts.sessionId || null };
  const fold = new Fold(cfg, bind);
  const buffered = (cfg.quirks || []).length > 0 ? [] : null;
  let openOffset = null;
  let meta = null;

  const turnOffsets = [];
  const acct = scanFile(file, opts.noPrefilter ? null : cfg.prefilter, (line, off) => {
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    if (cfg.join && cfg.join.metaRecord && test(cfg.join.metaRecord, rec)) { meta = rec; return; }
    if (buffered) { buffered.push({ rec, off }); return; }
    const prev = fold.cur;
    fold.push(rec);
    if (fold.cur && fold.cur !== prev) { openOffset = off; turnOffsets.push(off); }
    if (!fold.cur) openOffset = null;
  }, { start, tick: opts.tick });

  if (buffered) applyQuirks(cfg, buffered, fold);
  out.turns = fold.end();
  out.stats = fold.stats;
  out.acct = acct;

  // slot 4, the join, taken from the log's own bytes rather than assumed from the path
  if (meta) { out.join.sessionId = at(meta, 'payload.id') || at(meta, 'payload.session_id'); out.join.cwd = at(meta, cfg.join.cwdField); out.join.threadSource = at(meta, 'payload.thread_source'); }
  out.join.file = file;

  out.turnOffsets = turnOffsets;
  out.watermark = { kind: 'byte-offset', path: file, size: acct.size, mtimeNs: acct.mtimeNs, headHash: headHash(file), offset: openOffset !== null ? openOffset : acct.lastCompleteOffset, open: openOffset !== null };
  return out;
}

// gemini is the only provider needing a second pass. Its file is 20 KB at the largest.
function applyQuirks(cfg, buffered, fold) {
  const quirks = cfg.quirks || [];
  const order = [];
  const byId = new Map();
  for (const { rec } of buffered) {
    if (quirks.includes('rewind-to') && rec.$rewindTo) {
      const i = order.indexOf(rec.$rewindTo);
      if (i === -1) { order.length = 0; byId.clear(); } else { for (const id of order.splice(i)) byId.delete(id); }
      continue;
    }
    if (quirks.includes('expand-set-messages') && rec.$set && Array.isArray(rec.$set.messages)) {
      // UPSERT. Never clear. Applying the clear literally loses 44 of 45 turns.
      for (const m of rec.$set.messages) push(m);
      continue;
    }
    if (rec.$set) continue;
    push(rec);
  }
  function push(m) {
    if (!m || !m.id) { order.push(Symbol()); byId.set(order[order.length - 1], m); return; }
    if (!byId.has(m.id)) order.push(m.id);
    byId.set(m.id, m); // last write wins, which is what the vendor's own Map does
  }
  for (const id of order) { const m = byId.get(id); if (m) fold.push(m); }
}

// ------------------------------------------------------------- json-doc -----
function readJsonDoc(cfg, file, opts) {
  const st = fs.statSync(file);
  const wm = opts.watermark;
  const out = { turns: [], join: {}, resumed: false, work: 'full' };
  if (wm && wm.size === st.size && wm.mtimeNs === String(st.mtimeNs)) {
    out.work = 'none'; out.acct = { bytesRead: 0, bytesParsed: 0, size: st.size, mtimeNs: String(st.mtimeNs), lines: 0, linesParsed: 0, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, peakLineBuffer: 0 };
    out.watermark = wm; return out;
  }

  // SKIP BEFORE PARSING. deepseek writes system_prompt last and it is 66% of the store.
  // Stop the read at that byte and close the object, so those bytes never reach JSON.parse.
  let text, bytesRead, bytesParsed;
  if (cfg.docStopAt && !opts.noPrefilter) {
    const marker = Buffer.from(cfg.docStopAt, 'utf8');
    const fd = fs.openSync(file, 'r');
    const chunks = []; let total = 0; let cut = -1;
    try {
      const buf = Buffer.allocUnsafe(1 << 16);
      for (;;) {
        const n = fs.readSync(fd, buf, 0, buf.length, total);
        if (n <= 0) break;
        const c = Buffer.from(buf.subarray(0, n));
        chunks.push(c); total += n;
        const joined = Buffer.concat(chunks.slice(-2));
        const i = joined.indexOf(marker);
        if (i !== -1) { cut = total - joined.length + i; break; }
      }
    } finally { fs.closeSync(fd); }
    bytesRead = total;
    const all = Buffer.concat(chunks);
    let s = cut === -1 ? all.toString('utf8') : all.subarray(0, cut).toString('utf8');
    if (cut !== -1) s = s.replace(/,\s*$/, '') + '}';
    text = s; bytesParsed = Buffer.byteLength(text);
  } else {
    text = fs.readFileSync(file, 'utf8'); bytesRead = st.size; bytesParsed = st.size;
  }

  let doc = JSON.parse(text.trim().startsWith('{"kind"') ? text.split('\n')[0] : text);
  if (cfg.unwrap && doc[cfg.unwrap]) doc = doc[cfg.unwrap];

  const fold = new Fold(cfg, null);
  const items = at(doc, cfg.messagesPath) || [];
  if (cfg.turnPerElement) {
    // one element of requests[] is exactly one turn, so the fold is not needed
    const { slot } = require('./lib/expr');
    for (const el of items) {
      const ask = slot(cfg.ask, el, null, fold.stats);
      if (!ask) continue;
      const answer = slot(cfg.answer, el, null, fold.stats);
      fold.turns.push({ index: fold.turns.length, ask, answer, closed: true, extra: {} });
    }
    out.turns = fold.turns;
  } else {
    for (const m of items) fold.push(m);
    out.turns = fold.end();
  }
  out.stats = fold.stats;
  out.acct = { bytesRead, bytesParsed, size: st.size, mtimeNs: String(st.mtimeNs), lines: 1, linesParsed: 1, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, peakLineBuffer: bytesParsed };
  out.join = { sessionId: at(doc, 'metadata.id') || doc.sessionId || null, cwd: at(doc, 'metadata.workspace') || null, file };
  out.watermark = { kind: 'whole-doc', path: file, size: st.size, mtimeNs: String(st.mtimeNs), messageCount: at(doc, 'metadata.message_count') ?? items.length, lastMessageDate: doc.lastMessageDate ?? null };
  return out;
}

// -------------------------------------------------------------- sqlite ------
// node:sqlite hands back a Uint8Array for a BLOB and a string for TEXT.
function asBuf(v) {
  if (v == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  return Buffer.from(String(v), 'utf8');
}

function openDb(file, mode) {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(`file:${encodeURI(file)}?mode=ro${mode.immutable ? '&immutable=1' : ''}`, { readOnly: true, allowExtension: false });
}

// cursor, the CLI. blobs are content addressed, the root blob is a flat list of sha256
// digests as protobuf field 1. NEVER immutable=1: 18 of 44 stores keep their schema in the log.
function readCursor(cfg, file, opts) {
  const st = fs.statSync(file);
  const db = openDb(file, cfg.open);
  const out = { turns: [], join: {}, work: 'full' };
  try {
    const metaRow = db.prepare("select value from meta where key='0'").get();
    const meta = JSON.parse(Buffer.from(asBuf(metaRow.value).toString('utf8'), 'hex').toString('utf8'));
    if (opts.watermark && opts.watermark.rootBlobId === meta.latestRootBlobId) {
      out.work = 'none'; out.watermark = opts.watermark;
      out.acct = { bytesRead: 0, bytesParsed: 0, size: st.size, mtimeNs: String(st.mtimeNs), lines: 0, linesParsed: 0, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, peakLineBuffer: 0 };
      return out;
    }
    const root = db.prepare('select data from blobs where id=?').get(meta.latestRootBlobId);
    const allIds = decodeRoot(root ? asBuf(root.data) : Buffer.alloc(0), cfg.rootBlob);
    // The blobs are content addressed, so a newer root is an exact prefix extension of an
    // older one. Verified on 11 superseded roots in one real session. So the incremental
    // read is a SUFFIX read: keep the turns you had and fetch only the appended digests.
    let ids = allIds, suffix = false;
    const wmIn = opts.watermark;
    if (wmIn && wmIn.chainLength > 0 && wmIn.tailId && allIds.length >= wmIn.chainLength && allIds[wmIn.chainLength - 1] === wmIn.tailId) {
      ids = allIds.slice(wmIn.chainLength); suffix = true; out.work = 'suffix';
    }
    const probe = db.prepare(`select substr(data,1,${cfg.blobProbeBytes}) as head, length(data) as len from blobs where id=?`);
    const full = db.prepare('select data from blobs where id=?');
    const fold = new Fold(cfg, null);
    let bytesRead = 0, bytesParsed = 0, skipped = 0, parsed = 0, peak = 0;
    for (const id of ids) {
      const p = probe.get(id);
      if (!p) continue;
      bytesRead += cfg.blobProbeBytes;
      const head = asBuf(p.head).toString('utf8');
      if (!head.includes('"user"') && !head.includes('"assistant"')) { skipped++; continue; }  // skip before parsing
      const row = full.get(id);
      const buf = asBuf(row.data);
      bytesRead += buf.length; bytesParsed += buf.length; parsed++;
      if (buf.length > peak) peak = buf.length;
      let rec; try { rec = JSON.parse(buf.toString('utf8')); } catch { continue; }
      fold.push(rec);
    }
    out.turns = fold.end(); out.stats = fold.stats;
    out.join = { sessionId: meta.agentId, cwd: null, file };
    out.acct = { bytesRead, bytesParsed, size: st.size, mtimeNs: String(st.mtimeNs), lines: ids.length, linesParsed: parsed, linesSkippedOnHead: skipped, linesSkippedOnWhole: 0, peakLineBuffer: peak };
    out.watermark = { kind: 'content-hash', path: file, rootBlobId: meta.latestRootBlobId, size: st.size, chainLength: allIds.length, tailId: allIds[allIds.length - 1] || null };
    out.suffixRead = suffix;
  } finally { db.close(); }
  return out;
}

function decodeRoot(data, spec) {
  const buf = asBuf(data);
  const out = []; let i = 0;
  const tag = Buffer.from(spec.entryPrefixHex, 'hex');
  while (i + tag.length + spec.digestBytes <= buf.length) {
    if (buf[i] === tag[0] && buf[i + 1] === tag[1]) { out.push(buf.subarray(i + 2, i + 2 + spec.digestBytes).toString('hex')); i += 2 + spec.digestBytes; }
    else i++;
  }
  return out;
}

// cursoride. One conversation is one key range in cursorDiskKV.
function readCursoride(cfg, file, opts) {
  const st = fs.statSync(file);
  const db = openDb(file, cfg.open);
  const out = { turns: [], join: {}, work: 'full' };
  try {
    const id = opts.sessionId;
    // Two cheap change tests, in order. Only 249 of the 2,002 composerData keys have a
    // header row, so the length probe is the one that carries most of the store.
    if (opts.watermark) {
      if (opts.watermark.lastUpdatedAt != null) {
        const h0 = db.prepare('select lastUpdatedAt from composerHeaders where composerId=?').get(id);
        if (h0 && h0.lastUpdatedAt === opts.watermark.lastUpdatedAt) {
          out.work = 'none'; out.watermark = opts.watermark; out.acct = emptyAcct(st); return out;
        }
      }
      if (opts.watermark.rowLength != null) {
        const l0 = db.prepare('select length(cast(value as blob)) len from cursorDiskKV where key=?').get('composerData:' + id);
        if (l0 && l0.len === opts.watermark.rowLength) {
          out.work = 'none'; out.watermark = opts.watermark; out.acct = emptyAcct(st); return out;
        }
      }
    }
    const cd = db.prepare('select value from cursorDiskKV where key=?').get('composerData:' + id);
    if (!cd || cd.value == null) { out.honest = 'no conversation at that id'; out.acct = emptyAcct(st); out.watermark = null; return out; }
    const doc = JSON.parse(asBuf(cd.value).toString('utf8'));
    let bytesRead = Buffer.byteLength(JSON.stringify(doc)), bytesParsed = bytesRead, peak = bytesRead, parsed = 1, skipped = 0;
    const fold = new Fold(cfg, null);
    let headers = doc.fullConversationHeadersOnly;
    if (Array.isArray(headers)) {
      const wmIn = opts.watermark;
      if (wmIn && wmIn.bubbleCount > 0 && wmIn.tailBubbleId && headers.length >= wmIn.bubbleCount && headers[wmIn.bubbleCount - 1].bubbleId === wmIn.tailBubbleId) {
        out.bubbleCount = headers.length; headers = headers.slice(wmIn.bubbleCount); out.work = 'suffix';
      } else if (wmIn) { out.bubbleCount = headers.length; } else { out.bubbleCount = headers.length; }
      const get = db.prepare('select value from cursorDiskKV where key=?');
      for (const h of headers) {
        if (h.type !== 1 && h.type !== 2) { skipped++; continue; }
        const r = get.get(`bubbleId:${id}:${h.bubbleId}`);
        if (!r || r.value == null) { skipped++; continue; }
        const s = asBuf(r.value).toString('utf8');
        bytesRead += s.length;
        if (h.type === 2 && !s.includes('"text":"')) { skipped++; continue; }
        bytesParsed += s.length; parsed++; if (s.length > peak) peak = s.length;
        const b = JSON.parse(s);
        if (h.createdAt && !b.createdAt) b.createdAt = h.createdAt;
        fold.push(b);
      }
    } else if (Array.isArray(doc.conversation)) {
      for (const b of doc.conversation) { parsed++; fold.push(b); }
    }
    out.turns = fold.end(); out.stats = fold.stats;
    out.join = { sessionId: id, cwd: at(doc, 'workspaceIdentifier.uri.path'), file };
    out.acct = { bytesRead, bytesParsed, size: st.size, mtimeNs: String(st.mtimeNs), lines: parsed + skipped, linesParsed: parsed, linesSkippedOnHead: skipped, linesSkippedOnWhole: 0, peakLineBuffer: peak };
    const hdr = db.prepare('select lastUpdatedAt from composerHeaders where composerId=?').get(id);
    const allH = Array.isArray(doc.fullConversationHeadersOnly) ? doc.fullConversationHeadersOnly : [];
    const rowLen = db.prepare('select length(cast(value as blob)) len from cursorDiskKV where key=?').get('composerData:' + id);
    out.watermark = { kind: 'row-value', path: file, id, lastUpdatedAt: hdr ? hdr.lastUpdatedAt : null, rowLength: rowLen ? rowLen.len : null, bubbleCount: allH.length, tailBubbleId: allH.length ? allH[allH.length - 1].bubbleId : null };
  } finally { db.close(); }
  return out;
}

function emptyAcct(st) { return { bytesRead: 0, bytesParsed: 0, size: st.size, mtimeNs: String(st.mtimeNs), lines: 0, linesParsed: 0, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, peakLineBuffer: 0 }; }

// ---------------------------------------------------------------- entry -----
function readSession({ provider, file, sessionId = null, watermark = null, noPrefilter = false, tick = null }) {
  const cfg = MAP.providers[provider];
  if (!cfg) throw new Error('keep-map: no provider ' + provider);
  if (cfg.container === 'none') return { provider, turns: [], honest: cfg.honest, acct: null, watermark: null, work: 'none' };
  const opts = { sessionId, watermark, noPrefilter, tick };
  let r;
  switch (cfg.container) {
    case 'jsonl': r = readJsonl(cfg, file, opts); break;
    case 'json-doc': r = readJsonDoc(cfg, file, opts); break;
    case 'sqlite-cursor': r = readCursor(cfg, file, opts); break;
    case 'sqlite-cursoride': r = readCursoride(cfg, file, opts); break;
    default: throw new Error('keep-map: no container ' + cfg.container);
  }
  r.provider = provider;
  r.keptBytes = r.turns.reduce((n, t) => n + Buffer.byteLength(t.ask.text) + (t.answer ? Buffer.byteLength(t.answer.text) : 0), 0);
  return r;
}

module.exports = { readSession, MAP };

if (require.main === module) {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf('--' + k); return i === -1 ? null : a[i + 1]; };
  const r = readSession({ provider: get('provider'), file: get('file'), sessionId: get('session-id'), watermark: get('watermark') ? JSON.parse(fs.readFileSync(get('watermark'), 'utf8')) : null });
  if (a.includes('--json')) { console.log(JSON.stringify(r, null, 2)); }
  else {
    console.log(`${r.provider}  ${r.turns.length} turns  work=${r.work}  kept=${r.keptBytes} B of ${r.acct ? r.acct.size : 0} B`);
    if (r.join) console.log('join:', JSON.stringify(r.join));
    for (const t of r.turns) {
      console.log(`\n  ${t.ask.at || '(no clock)'}  YOU: ${t.ask.text.slice(0, 160).replace(/\n/g, ' ')}`);
      console.log(`  ${(t.answer && t.answer.at) || '(no clock)'}  IT : ${t.answer ? t.answer.text.slice(0, 160).replace(/\n/g, ' ') : '(no closing answer)'}`);
    }
    if (r.honest) console.log('\nhonest line:', r.honest);
  }
}
