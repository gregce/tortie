'use strict';
// Research 63. Streaming JSONL scanner that DECIDES FROM RAW BYTES BEFORE PARSING.
//
// The point of the skip mode: a rejected line is never materialised. The largest single
// line in the operator's codex store is 18,568,273 bytes. A reader that buffers a line
// before deciding needs 18 MB of headroom for a record it is going to throw away.
// This one reads its first `headBytes`, decides, and then discards the rest as it streams.

const fs = require('node:fs');

function compileHead(prefilter) {
  if (!prefilter) return null;
  const headBytes = prefilter.headBytes || 512;
  const rules = (prefilter.rules || []).map((r) => ({
    head: Buffer.from(r.head, 'utf8'),
    rejectHead: (r.rejectHead || []).map((s) => Buffer.from(s, 'utf8')),
    requireAnywhere: (r.requireAnywhere || []).map((s) => Buffer.from(s, 'utf8')),
    rejectAnywhere: (r.rejectAnywhere || []).map((s) => Buffer.from(s, 'utf8')),
  }));
  return { headBytes, rules };
}

// Decide from the head alone. Returns the matching rule, or null to skip the line.
function decideHead(hf, head) {
  for (const r of hf.rules) {
    if (head.indexOf(r.head) === -1) continue;
    let ok = true;
    for (const b of r.rejectHead) if (head.indexOf(b) !== -1) { ok = false; break; }
    if (ok) return r;
  }
  return null;
}

// Second stage, over the whole line, still on raw bytes and still before JSON.parse.
function decideWhole(rule, line) {
  for (const b of rule.requireAnywhere) if (line.indexOf(b) === -1) return false;
  for (const b of rule.rejectAnywhere) if (line.indexOf(b) !== -1) return false;
  return true;
}

/**
 * scanFile(path, prefilter, onLine, opts)
 *   onLine(lineBuffer, byteOffsetOfLineStart) -> void
 * Returns byte accounting so the saving can be measured rather than asserted.
 */
function scanFile(path, prefilter, onLine, opts = {}) {
  const hf = compileHead(prefilter);
  const chunkSize = opts.chunkSize || (1 << 20);
  const start = opts.start || 0;
  const fd = fs.openSync(path, 'r');
  const stat = fs.fstatSync(fd);
  const chunk = Buffer.allocUnsafe(chunkSize);

  const acct = { bytesRead: 0, bytesParsed: 0, lines: 0, linesParsed: 0, linesSkippedOnHead: 0, linesSkippedOnWhole: 0, lastCompleteOffset: start, peakLineBuffer: 0 };

  let pos = start;
  let lineStart = start;
  let held = [];            // buffers for the current line, only while it may still be kept
  let heldLen = 0;
  let headLen = 0;
  const headBuf = hf ? Buffer.allocUnsafe(hf.headBytes) : null;
  let rule;                 // undefined = undecided, null = skipping
  rule = undefined;

  const finishLine = (tail) => {
    acct.lines++;
    if (rule === null) { acct.linesSkippedOnHead++; }
    else {
      if (rule === undefined) rule = hf ? decideHead(hf, headBuf.subarray(0, headLen)) : { requireAnywhere: [], rejectAnywhere: [] };
      if (rule === null) { acct.linesSkippedOnHead++; }
      else {
        if (tail && tail.length) { held.push(tail); heldLen += tail.length; }
        const line = held.length === 1 ? held[0] : Buffer.concat(held, heldLen);
        if (line.length > acct.peakLineBuffer) acct.peakLineBuffer = line.length;
        if (decideWhole(rule, line)) { acct.linesParsed++; acct.bytesParsed += line.length; onLine(line, lineStart); }
        else acct.linesSkippedOnWhole++;
      }
    }
    held = []; heldLen = 0; headLen = 0; rule = undefined;
  };

  try {
    for (;;) {
      const n = fs.readSync(fd, chunk, 0, chunkSize, pos);
      if (n <= 0) break;
      acct.bytesRead += n;
      if (opts.tick) opts.tick();
      let i = 0;
      while (i < n) {
        const nl = chunk.indexOf(10, i);
        const end = nl === -1 ? n : nl;
        const seg = chunk.subarray(i, end);
        if (rule !== null) {
          if (rule === undefined && hf && headLen < hf.headBytes) {
            const want = Math.min(hf.headBytes - headLen, seg.length);
            seg.copy(headBuf, headLen, 0, want);
            headLen += want;
            if (headLen >= hf.headBytes) {
              rule = decideHead(hf, headBuf);
              if (rule === null) { held = []; heldLen = 0; }
            }
          }
          if (rule !== null) { const c = Buffer.from(seg); held.push(c); heldLen += c.length; }
        }
        if (nl === -1) { i = n; break; }
        finishLine(null);
        lineStart = pos + nl + 1;
        acct.lastCompleteOffset = lineStart;
        i = nl + 1;
      }
      pos += n;
    }
    // A trailing line with no newline is NOT consumed. The watermark stops at the last
    // complete line, so a record the agent is still writing is never parsed.
  } finally { fs.closeSync(fd); }

  acct.size = stat.size;
  acct.mtimeNs = String(stat.mtimeNs);
  return acct;
}

module.exports = { scanFile, compileHead, decideHead, decideWhole };
