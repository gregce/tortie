/**
 * The four container readers, ported from
 * docs/research/assets/63-keep-map/read.js. Everything provider specific is
 * a value in keep-map.json. The containers know only how bytes are laid out,
 * being a JSONL stream, one JSON document, the cursor CLI's content
 * addressed blob store, and the cursor IDE's key value store.
 *
 * node:sqlite is replaced by better-sqlite3, opened
 * `{ readonly: true, fileMustExist: true }`. The cursor CLI store is never
 * opened with immutable=1, because 18 of 44 stores keep their schema in the
 * write ahead log. Opening read only still touches the store's -shm file.
 */

import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { Fold } from './fold';
import type { FoldMeta, FoldTurn } from './fold';
import { at, slot, test } from './expr';
import type { Rec } from './expr';
import {
  compileHead,
  detectWideHead,
  scanFile,
  WIDE_HEAD_BYTES
} from './lines';
import type { CompiledPrefilter } from './lines';
import type { ProviderMap, TurnCfg } from './map-types';
import {
  buildByteOffsetWatermark,
  checkByteOffset,
  statUnchanged
} from './watermark';
import type { Watermark } from './watermark';

export interface ReadAccounting {
  bytesRead: number;
  bytesParsed: number;
  lines: number;
  linesParsed: number;
  size: number;
  peakLineBuffer: number;
  prefilter: 'head' | 'wide' | 'off';
  turnMode: 'markers' | 'ask-to-ask' | 'per-ask' | 'per-element';
}

export interface ContainerJoin {
  sessionId: string | null;
  cwd: string | null;
  threadSource: string | null;
}

export interface ContainerResult {
  work: 'full' | 'tail' | 'suffix' | 'none';
  turns: FoldTurn[];
  watermark: Watermark | null;
  join: ContainerJoin;
  meta: FoldMeta;
  /** The container's own answer for the session clock, deepseek only. */
  lastTouchedAt: string | null;
  acct: ReadAccounting;
  droppedByReason: Record<string, number>;
}

export interface ContainerInput {
  file: string;
  sessionId: string | null;
  watermark: Watermark | null;
}

const ASK_TO_ASK_TURN: TurnCfg = {
  open: 'ask',
  close: 'nextAskOr',
  pick: 'last-answer-before-close',
  dropTurnsWithNoAsk: true
};

function emptyAcct(
  size: number,
  prefilter: ReadAccounting['prefilter'],
  turnMode: ReadAccounting['turnMode']
): ReadAccounting {
  return {
    bytesRead: 0,
    bytesParsed: 0,
    lines: 0,
    linesParsed: 0,
    size,
    peakLineBuffer: 0,
    prefilter,
    turnMode
  };
}

function turnModeOf(turn: TurnCfg | undefined): 'markers' | 'per-ask' {
  const t = turn ?? { open: 'ask' as const };
  return typeof t.open === 'object' || (t.close != null && typeof t.close === 'object')
    ? 'markers'
    : 'per-ask';
}

/** True when a.b.c is below x.y.z. */
export function semverBelow(version: string, threshold: string): boolean {
  const parse = (s: string): number[] =>
    s
      .trim()
      .split('.')
      .map((p) => Number.parseInt(p, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  const a = parse(version);
  const b = parse(threshold);
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/** Read the first line of the file, bounded, and parse it. */
function readFirstRecord(file: string): Rec | null {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(64 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    const nl = buf.subarray(0, Math.max(0, n)).indexOf(10);
    if (nl === -1) return null;
    try {
      return JSON.parse(buf.subarray(0, nl).toString('utf8')) as Rec;
    } catch {
      return null;
    }
  } finally {
    fs.closeSync(fd);
  }
}

// ---------------------------------------------------------------- jsonl ----

interface JsonlPass {
  turns: FoldTurn[];
  meta: FoldMeta;
  droppedByReason: Record<string, number>;
  asksKept: number;
  closedCount: number;
  closesSeen: number;
  openOffset: number | null;
  emittedOpen: boolean;
  metaRec: Rec | null;
  joinCwd: string | null;
  joinSessionId: string | null;
  acctBytesRead: number;
  acctBytesParsed: number;
  acctLines: number;
  acctLinesParsed: number;
  acctPeak: number;
  acctSize: number;
  acctMtimeNs: string;
  lastCompleteOffset: number;
}

function jsonlPass(
  cfg: ProviderMap,
  file: string,
  compiled: CompiledPrefilter | null,
  start: number,
  baseIndex: number,
  sessionId: string | null,
  turnOverride?: TurnCfg
): JsonlPass {
  const bind = sessionId != null ? { sessionId } : null;
  const fold = new Fold(cfg, bind, { baseIndex, turnOverride });
  const buffered: Array<{ rec: Rec }> | null = (cfg.quirks ?? []).length > 0 ? [] : null;
  let openOffset: number | null = null;
  let metaRec: Rec | null = null;
  let joinCwd: string | null = null;
  let joinSessionId: string | null = null;

  const acct = scanFile(
    file,
    compiled,
    (line, off) => {
      let rec: Rec;
      try {
        rec = JSON.parse(line.toString('utf8')) as Rec;
      } catch {
        return;
      }
      if (cfg.join?.metaRecord && test(cfg.join.metaRecord, rec)) {
        metaRec = rec;
        return;
      }
      if (joinCwd === null && cfg.join?.cwdField) {
        const v = at(rec, cfg.join.cwdField);
        if (typeof v === 'string' && v !== '') joinCwd = v;
      }
      if (joinSessionId === null && cfg.join?.sessionIdField) {
        const v = at(rec, cfg.join.sessionIdField);
        if (typeof v === 'string' && v !== '') joinSessionId = v;
      }
      if (buffered) {
        buffered.push({ rec });
        return;
      }
      const prev = fold.cur;
      fold.push(rec);
      if (fold.cur && fold.cur !== prev) openOffset = off;
      if (!fold.cur) openOffset = null;
    },
    { start }
  );

  if (buffered) applyQuirks(cfg, buffered, fold);

  const openPending = fold.cur !== null;
  const before = fold.turns.length;
  const turns = fold.end();
  const emittedOpen = openPending && turns.length > before;

  return {
    turns,
    meta: fold.meta,
    droppedByReason: fold.stats.dropped,
    asksKept: fold.stats.asksKept,
    closedCount: turns.filter((t) => t.closed).length,
    closesSeen: fold.stats.closesSeen,
    openOffset: buffered ? null : openOffset,
    emittedOpen: buffered ? false : emittedOpen,
    metaRec,
    joinCwd,
    joinSessionId,
    acctBytesRead: acct.bytesRead,
    acctBytesParsed: acct.bytesParsed,
    acctLines: acct.lines,
    acctLinesParsed: acct.linesParsed,
    acctPeak: acct.peakLineBuffer,
    acctSize: acct.size,
    acctMtimeNs: acct.mtimeNs,
    lastCompleteOffset: acct.lastCompleteOffset
  };
}

export function readJsonl(cfg: ProviderMap, input: ContainerInput): ContainerResult {
  const { file } = input;
  const st = fs.statSync(file, { bigint: true });
  const wm = input.watermark;
  const skipOff = cfg.skipWorthIt === false || !cfg.prefilter;
  const quirked = (cfg.quirks ?? []).length > 0;

  // Vintage detection, defects 1 and 3. When line 1 names a CLI below the
  // fallback threshold the fold runs in ask-to-ask mode, defect 4.
  let askToAsk = false;
  let cliVersion: string | null = null;
  if (cfg.turnFallback) {
    const first = readFirstRecord(file);
    const v = first ? at(first, cfg.turnFallback.cliVersionField) : null;
    cliVersion = typeof v === 'string' ? v : null;
    if (cliVersion !== null && semverBelow(cliVersion, cfg.turnFallback.whenBelow)) askToAsk = true;
  }

  const markersMode = turnModeOf(cfg.turn);
  const modeOf = (a2a: boolean): ReadAccounting['turnMode'] => (a2a ? 'ask-to-ask' : markersMode);

  let prefilterMode: ReadAccounting['prefilter'] = skipOff ? 'off' : 'head';
  let compiled: CompiledPrefilter | null = null;
  if (!skipOff && cfg.prefilter) {
    const extra = cfg.paths?.prefilter ? [cfg.paths.prefilter] : [];
    if (detectWideHead(file, cfg.prefilter, extra)) {
      prefilterMode = 'wide';
      compiled = compileHead(cfg.prefilter, extra, WIDE_HEAD_BYTES);
    } else {
      compiled = compileHead(cfg.prefilter, extra);
    }
  }

  if (wm?.kind === 'byte-offset' && statUnchanged(wm, st)) {
    return {
      work: 'none',
      turns: [],
      watermark: wm,
      join: { sessionId: null, cwd: null, threadSource: null },
      meta: { model: null, branch: null },
      lastTouchedAt: null,
      acct: emptyAcct(Number(st.size), prefilterMode, modeOf(askToAsk)),
      droppedByReason: {}
    };
  }

  let start = 0;
  let baseIndex = 0;
  let work: ContainerResult['work'] = 'full';
  if (!quirked && wm?.kind === 'byte-offset') {
    const verdict = checkByteOffset(file, wm, st);
    if (verdict === 'resume') {
      start = wm.offset;
      baseIndex = wm.turnIndex;
      work = 'tail';
    }
  }

  let pass = jsonlPass(
    cfg,
    file,
    compiled,
    start,
    baseIndex,
    input.sessionId,
    askToAsk ? ASK_TO_ASK_TURN : undefined
  );
  let bytesReadTotal = pass.acctBytesRead;
  let bytesParsedTotal = pass.acctBytesParsed;
  let linesTotal = pass.acctLines;
  let linesParsedTotal = pass.acctLinesParsed;

  // Defect 4, the no marker vintage. When a full markers pass saw NO close
  // marker at all while at least two asks arrived, the file has no task
  // boundary, so run again ask to ask. The selector is whether a
  // task_complete was ever seen, not the version alone. Measured on
  // 2026-08-23: the real 103,900,342 byte file the defect names carries
  // cli_version 0.139.0 with zero task_started and zero task_complete, so a
  // version gated fallback returns 1 turn on the exact file it exists for.
  // A tail resume keeps the version rule alone, so one open turn in a
  // healthy modern file never flips the mode mid stream.
  if (
    cfg.turnFallback &&
    !askToAsk &&
    work === 'full' &&
    pass.closesSeen === 0 &&
    pass.closedCount === 0 &&
    pass.asksKept >= 2
  ) {
    askToAsk = true;
    start = 0;
    baseIndex = 0;
    work = 'full';
    pass = jsonlPass(cfg, file, compiled, 0, 0, input.sessionId, ASK_TO_ASK_TURN);
    bytesReadTotal += pass.acctBytesRead;
    bytesParsedTotal += pass.acctBytesParsed;
    linesTotal += pass.acctLines;
    linesParsedTotal += pass.acctLinesParsed;
  }

  const nextIndex = baseIndex + pass.turns.length;
  const lastTurn = pass.turns.length ? (pass.turns[pass.turns.length - 1] as FoldTurn) : null;
  const open = pass.openOffset !== null;
  const offset = pass.openOffset ?? pass.lastCompleteOffset;
  const turnIndex = open && pass.emittedOpen && lastTurn ? lastTurn.index : nextIndex;
  const watermark = buildByteOffsetWatermark(
    file,
    pass.acctSize,
    pass.acctMtimeNs,
    quirked ? pass.lastCompleteOffset : offset,
    quirked ? false : open,
    quirked ? 0 : turnIndex
  );

  const metaRec: Rec | null = pass.metaRec;
  const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
  const join: ContainerJoin = {
    sessionId: metaRec
      ? (str(at(metaRec, 'payload.id')) ?? str(at(metaRec, 'payload.session_id')))
      : pass.joinSessionId,
    cwd: metaRec ? str(at(metaRec, cfg.join?.cwdField ?? '')) : pass.joinCwd,
    threadSource: metaRec ? str(at(metaRec, 'payload.thread_source')) : null
  };

  return {
    work,
    turns: pass.turns,
    watermark,
    join,
    meta: pass.meta,
    lastTouchedAt: null,
    acct: {
      bytesRead: bytesReadTotal,
      bytesParsed: bytesParsedTotal,
      lines: linesTotal,
      linesParsed: linesParsedTotal,
      size: pass.acctSize,
      peakLineBuffer: pass.acctPeak,
      prefilter: prefilterMode,
      turnMode: modeOf(askToAsk)
    },
    droppedByReason: pass.droppedByReason
  };
}

/**
 * gemini is the only provider needing a second pass. Its file is 20 KB at
 * the largest. $set.messages is an UPSERT and never a clear, because
 * applying the clear literally loses 44 of 45 turns. $rewindTo is honoured.
 * Records dedupe by id, last write wins, which is what the vendor's own Map
 * does.
 */
function applyQuirks(cfg: ProviderMap, buffered: Array<{ rec: Rec }>, fold: Fold): void {
  const quirks = cfg.quirks ?? [];
  const order: Array<string | symbol> = [];
  const byId = new Map<string | symbol, Rec>();
  const push = (m: Rec | null | undefined): void => {
    if (!m) return;
    const id = m['id'];
    if (typeof id !== 'string' || id === '') {
      const key = Symbol();
      order.push(key);
      byId.set(key, m);
      return;
    }
    if (!byId.has(id)) order.push(id);
    byId.set(id, m);
  };
  for (const { rec } of buffered) {
    const rewindTo = rec['$rewindTo'];
    if (quirks.includes('rewind-to') && typeof rewindTo === 'string') {
      const i = order.indexOf(rewindTo);
      if (i === -1) {
        order.length = 0;
        byId.clear();
      } else {
        for (const id of order.splice(i)) byId.delete(id);
      }
      continue;
    }
    const set = rec['$set'] as Rec | undefined;
    if (quirks.includes('expand-set-messages') && set && Array.isArray(set['messages'])) {
      for (const m of set['messages'] as Rec[]) push(m);
      continue;
    }
    if (set) continue;
    push(rec);
  }
  for (const id of order) {
    const m = byId.get(id);
    if (m) fold.push(m);
  }
}

// ------------------------------------------------------------- json-doc ----

export function readJsonDoc(cfg: ProviderMap, input: ContainerInput): ContainerResult {
  const { file } = input;
  const st = fs.statSync(file, { bigint: true });
  const wm = input.watermark;
  const turnMode: ReadAccounting['turnMode'] = cfg.turnPerElement ? 'per-element' : 'per-ask';

  const none = (watermark: Watermark): ContainerResult => ({
    work: 'none',
    turns: [],
    watermark,
    join: { sessionId: null, cwd: null, threadSource: null },
    meta: { model: null, branch: null },
    lastTouchedAt: null,
    acct: emptyAcct(Number(st.size), 'off', turnMode),
    droppedByReason: {}
  });

  if (wm?.kind === 'whole-doc') {
    if (statUnchanged(wm, st)) return none(wm);
    // Stage two of the deepseek watermark. The mtime moves without the
    // conversation moving in 5 of 33 files, so an equal size with an equal
    // message count is still no change.
    if (wm.size === String(st.size) && wm.messageCount !== null) {
      const head = readHeadText(file, 1024);
      const m = /"message_count"\s*:\s*(\d+)/.exec(head);
      if (m && Number(m[1]) === wm.messageCount) {
        return none({ ...wm, mtimeNs: String(st.mtimeNs) });
      }
    }
  }

  // The docStopAt byte skip exists for deepseek, whose system_prompt is 66%
  // of the store and is written last. Research 63 section 17 measured the
  // skip at 0.72x there, a loss, so the map sets skipWorthIt false and the
  // whole document is read plainly. The code path stays for a vendor whose
  // document grows enough to flip the measurement.
  let text: string;
  let bytesRead: number;
  let prefilter: ReadAccounting['prefilter'] = 'off';
  if (cfg.docStopAt && cfg.skipWorthIt !== false) {
    prefilter = 'head';
    const marker = Buffer.from(cfg.docStopAt, 'utf8');
    const fd = fs.openSync(file, 'r');
    const chunks: Buffer[] = [];
    let total = 0;
    let cut = -1;
    try {
      const buf = Buffer.allocUnsafe(1 << 16);
      for (;;) {
        const n = fs.readSync(fd, buf, 0, buf.length, total);
        if (n <= 0) break;
        const c = Buffer.from(buf.subarray(0, n));
        chunks.push(c);
        total += n;
        const joined = Buffer.concat(chunks.slice(-2));
        const i = joined.indexOf(marker);
        if (i !== -1) {
          cut = total - joined.length + i;
          break;
        }
      }
    } finally {
      fs.closeSync(fd);
    }
    bytesRead = total;
    const all = Buffer.concat(chunks);
    let s = cut === -1 ? all.toString('utf8') : all.subarray(0, cut).toString('utf8');
    if (cut !== -1) s = s.replace(/,\s*$/, '') + '}';
    text = s;
  } else {
    text = fs.readFileSync(file, 'utf8');
    bytesRead = Number(st.size);
  }
  const bytesParsed = Buffer.byteLength(text);

  let doc = JSON.parse(text.trim().startsWith('{"kind"') ? (text.split('\n')[0] as string) : text) as Rec;
  if (cfg.unwrap && doc[cfg.unwrap] != null) doc = doc[cfg.unwrap] as Rec;

  const fold = new Fold(cfg, null);
  const items = (at(doc, cfg.messagesPath ?? '') as Rec[] | undefined) ?? [];
  let turns: FoldTurn[];
  if (cfg.turnPerElement) {
    // One element of requests[] is exactly one turn, so the fold is only a
    // stats holder here.
    const out: FoldTurn[] = [];
    for (const el of items) {
      const ask = slot(cfg.ask, el, null, fold.stats);
      if (ask?.kind !== 'kept') continue;
      const answer = slot(cfg.answer, el, null, fold.stats);
      out.push({
        index: out.length,
        ask: { text: ask.text, at: ask.at, queued: 1 },
        answer: answer?.kind === 'kept' ? { text: answer.text, at: answer.at } : null,
        closed: true,
        interrupted: false,
        notice: null,
        stopReason: null,
        durationMs: null,
        pathTexts: []
      });
    }
    turns = out;
  } else {
    for (const m of items) fold.push(m);
    turns = fold.end();
  }

  const messageCountRaw = at(doc, 'metadata.message_count');
  const watermark: Watermark = {
    kind: 'whole-doc',
    file,
    size: String(st.size),
    mtimeNs: String(st.mtimeNs),
    messageCount: typeof messageCountRaw === 'number' ? messageCountRaw : items.length,
    lastMessageDate: typeof doc['lastMessageDate'] === 'number' || typeof doc['lastMessageDate'] === 'string' ? String(doc['lastMessageDate']) : null,
    turnIndex: 0
  };

  const updatedAt = at(doc, 'metadata.updated_at');
  return {
    work: 'full',
    turns,
    watermark,
    join: {
      sessionId: ((at(doc, 'metadata.id') ?? doc['sessionId']) as string | undefined) ?? null,
      cwd: (at(doc, 'metadata.workspace') as string | undefined) ?? null,
      threadSource: null
    },
    meta: fold.meta,
    lastTouchedAt: typeof updatedAt === 'string' ? updatedAt : null,
    acct: {
      bytesRead,
      bytesParsed,
      lines: 1,
      linesParsed: 1,
      size: Number(st.size),
      peakLineBuffer: bytesParsed,
      prefilter,
      turnMode
    },
    droppedByReason: fold.stats.dropped
  };
}

function readHeadText(file: string, n: number): string {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(n);
    const r = fs.readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, Math.max(0, r)).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

// -------------------------------------------------------------- sqlite -----

function asBuf(v: unknown): Buffer {
  if (v == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  return Buffer.from(String(v), 'utf8');
}

function openRo(file: string): Database.Database {
  return new Database(file, { readonly: true, fileMustExist: true });
}

/**
 * cursor, the CLI. Blobs are content addressed and the root blob is a flat
 * list of sha256 digests as protobuf field 1. NEVER immutable=1. A newer
 * root is an exact prefix extension of an older one, verified on 11
 * superseded roots in one real session, so the incremental read is a suffix
 * read. Defect 6: the blob probe is 32 bytes, because the role marker closes
 * at byte 29 and the old 24 byte probe truncated `assistant` to `assist`,
 * losing every answer in 10 of 40 stores.
 */
export function readCursor(cfg: ProviderMap, input: ContainerInput): ContainerResult {
  const { file } = input;
  const st = fs.statSync(file, { bigint: true });
  const db = openRo(file);
  try {
    const metaRow = db.prepare("select value from meta where key='0'").get() as
      | { value: unknown }
      | undefined;
    if (!metaRow) throw new Error('cursor store has no meta row');
    const meta = JSON.parse(
      Buffer.from(asBuf(metaRow.value).toString('utf8'), 'hex').toString('utf8')
    ) as Rec;
    const latestRoot = String(meta['latestRootBlobId'] ?? '');
    const wm = input.watermark;
    if (wm?.kind === 'content-hash' && wm.rootBlobId === latestRoot) {
      return {
        work: 'none',
        turns: [],
        watermark: wm,
        join: { sessionId: (meta['agentId'] as string | undefined) ?? null, cwd: null, threadSource: null },
        meta: { model: null, branch: null },
        lastTouchedAt: null,
        acct: emptyAcct(Number(st.size), 'head', 'per-ask'),
        droppedByReason: {}
      };
    }
    const rootBlob = db.prepare('select data from blobs where id=?').get(latestRoot) as
      | { data: unknown }
      | undefined;
    const rootSpec = cfg.rootBlob ?? { encoding: '', entryPrefixHex: '0a20', digestBytes: 32 };
    const allIds = decodeRoot(rootBlob ? asBuf(rootBlob.data) : Buffer.alloc(0), rootSpec.entryPrefixHex, rootSpec.digestBytes);

    let ids = allIds;
    let chainStart = 0;
    let baseIndex = 0;
    let work: ContainerResult['work'] = 'full';
    if (
      wm?.kind === 'content-hash' &&
      wm.chainLength > 0 &&
      wm.tailId != null &&
      allIds.length >= wm.chainLength &&
      allIds[wm.chainLength - 1] === wm.tailId
    ) {
      ids = allIds.slice(wm.chainLength);
      chainStart = wm.chainLength;
      baseIndex = wm.turnIndex;
      work = 'suffix';
    }

    const probeBytes = cfg.blobProbeBytes ?? 32;
    const probe = db.prepare(
      `select substr(data,1,${probeBytes}) as head, length(data) as len from blobs where id=?`
    );
    const full = db.prepare('select data from blobs where id=?');
    const fold = new Fold(cfg, null, { baseIndex });
    let bytesRead = 0;
    let bytesParsed = 0;
    let skipped = 0;
    let parsed = 0;
    let peak = 0;
    let openChainIdx: number | null = null;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i] as string;
      const p = probe.get(id) as { head: unknown; len: number } | undefined;
      if (!p) continue;
      bytesRead += probeBytes;
      const head = asBuf(p.head).toString('utf8');
      if (!head.includes('"user"') && !head.includes('"assistant"')) {
        skipped++;
        continue;
      }
      const row = full.get(id) as { data: unknown } | undefined;
      if (!row) continue;
      const buf = asBuf(row.data);
      bytesRead += buf.length;
      bytesParsed += buf.length;
      parsed++;
      if (buf.length > peak) peak = buf.length;
      let rec: Rec;
      try {
        rec = JSON.parse(buf.toString('utf8')) as Rec;
      } catch {
        continue;
      }
      const prev = fold.cur;
      fold.push(rec);
      if (fold.cur && fold.cur !== prev) openChainIdx = chainStart + i;
      if (!fold.cur) openChainIdx = null;
    }
    const openPending = fold.cur !== null;
    const before = fold.turns.length;
    const turns = fold.end();
    const emittedOpen = openPending && turns.length > before;
    const nextIndex = baseIndex + turns.length;
    const lastTurn = turns.length ? (turns[turns.length - 1] as FoldTurn) : null;

    // The stored chain stops where the still open turn began, so the next
    // suffix read re-emits that turn whole, the same shape the byte offset
    // watermark has.
    let chainLength = allIds.length;
    let tailId = allIds.length ? (allIds[allIds.length - 1] as string) : null;
    let turnIndex = nextIndex;
    if (openChainIdx !== null) {
      chainLength = openChainIdx;
      tailId = openChainIdx > 0 ? (allIds[openChainIdx - 1] as string) : null;
      turnIndex = emittedOpen && lastTurn ? lastTurn.index : nextIndex;
    }

    return {
      work,
      turns,
      watermark: {
        kind: 'content-hash',
        file,
        rootBlobId: latestRoot,
        chainLength,
        tailId,
        turnIndex
      },
      join: { sessionId: (meta['agentId'] as string | undefined) ?? null, cwd: null, threadSource: null },
      meta: fold.meta,
      lastTouchedAt: null,
      acct: {
        bytesRead,
        bytesParsed,
        lines: ids.length,
        linesParsed: parsed,
        size: Number(st.size),
        peakLineBuffer: peak,
        prefilter: 'head',
        turnMode: 'per-ask'
      },
      droppedByReason: fold.stats.dropped
    };
  } finally {
    db.close();
  }
}

function decodeRoot(data: Buffer, entryPrefixHex: string, digestBytes: number): string[] {
  const out: string[] = [];
  const tag = Buffer.from(entryPrefixHex, 'hex');
  let i = 0;
  while (i + tag.length + digestBytes <= data.length) {
    if (data[i] === tag[0] && data[i + 1] === tag[1]) {
      out.push(data.subarray(i + 2, i + 2 + digestBytes).toString('hex'));
      i += 2 + digestBytes;
    } else {
      i++;
    }
  }
  return out;
}

/**
 * cursoride. One conversation is one key range in cursorDiskKV. It can never
 * be a Tortie session, so this container serves the conformance fixtures and
 * nothing on the page. The change token folds the header clock and the row
 * length into the content-hash watermark shape.
 */
export function readCursoride(cfg: ProviderMap, input: ContainerInput): ContainerResult {
  const { file } = input;
  const st = fs.statSync(file, { bigint: true });
  const id = input.sessionId;
  if (id == null) throw new Error('cursoride needs a composer id');
  const db = openRo(file);
  try {
    const hdr = db
      .prepare('select lastUpdatedAt from composerHeaders where composerId=?')
      .get(id) as { lastUpdatedAt: unknown } | undefined;
    const rowLen = db
      .prepare('select length(cast(value as blob)) len from cursorDiskKV where key=?')
      .get('composerData:' + id) as { len: unknown } | undefined;
    const token = `${String(hdr?.lastUpdatedAt ?? '')}:${String(rowLen?.len ?? '')}`;
    const wm = input.watermark;
    if (wm?.kind === 'content-hash' && wm.rootBlobId === token) {
      return {
        work: 'none',
        turns: [],
        watermark: wm,
        join: { sessionId: id, cwd: null, threadSource: null },
        meta: { model: null, branch: null },
        lastTouchedAt: null,
        acct: emptyAcct(Number(st.size), 'head', 'per-ask'),
        droppedByReason: {}
      };
    }

    const cd = db.prepare('select value from cursorDiskKV where key=?').get('composerData:' + id) as
      | { value: unknown }
      | undefined;
    const fold = new Fold(cfg, null);
    let bytesRead = 0;
    let bytesParsed = 0;
    let parsed = 0;
    let skipped = 0;
    let peak = 0;
    let tailBubbleId: string | null = null;
    let bubbleCount = 0;
    if (cd && cd.value != null) {
      const docText = asBuf(cd.value).toString('utf8');
      bytesRead += docText.length;
      bytesParsed += docText.length;
      peak = docText.length;
      const doc = JSON.parse(docText) as Rec;
      const headers = doc['fullConversationHeadersOnly'];
      if (Array.isArray(headers)) {
        bubbleCount = headers.length;
        const lastHeader = headers.length ? (headers[headers.length - 1] as Rec) : null;
        tailBubbleId = lastHeader ? ((lastHeader['bubbleId'] as string | undefined) ?? null) : null;
        const get = db.prepare('select value from cursorDiskKV where key=?');
        for (const h of headers as Rec[]) {
          const type = h['type'];
          if (type !== 1 && type !== 2) {
            skipped++;
            continue;
          }
          const r = get.get(`bubbleId:${id}:${String(h['bubbleId'])}`) as
            | { value: unknown }
            | undefined;
          if (!r || r.value == null) {
            skipped++;
            continue;
          }
          const s = asBuf(r.value).toString('utf8');
          bytesRead += s.length;
          if (type === 2 && !s.includes('"text":"')) {
            skipped++;
            continue;
          }
          bytesParsed += s.length;
          parsed++;
          if (s.length > peak) peak = s.length;
          const b = JSON.parse(s) as Rec;
          if (h['createdAt'] != null && b['createdAt'] == null) b['createdAt'] = h['createdAt'];
          fold.push(b);
        }
      } else if (Array.isArray(doc['conversation'])) {
        for (const b of doc['conversation'] as Rec[]) {
          parsed++;
          fold.push(b);
        }
      }
      const turns = fold.end();
      return {
        work: 'full',
        turns,
        watermark: {
          kind: 'content-hash',
          file,
          rootBlobId: token,
          chainLength: bubbleCount,
          tailId: tailBubbleId,
          turnIndex: 0
        },
        join: {
          sessionId: id,
          cwd: (at(doc, 'workspaceIdentifier.uri.path') as string | undefined) ?? null,
          threadSource: null
        },
        meta: fold.meta,
        lastTouchedAt: null,
        acct: {
          bytesRead,
          bytesParsed,
          lines: parsed + skipped,
          linesParsed: parsed,
          size: Number(st.size),
          peakLineBuffer: peak,
          prefilter: 'head',
          turnMode: 'per-ask'
        },
        droppedByReason: fold.stats.dropped
      };
    }
    return {
      work: 'full',
      turns: [],
      watermark: null,
      join: { sessionId: id, cwd: null, threadSource: null },
      meta: { model: null, branch: null },
      lastTouchedAt: null,
      acct: emptyAcct(Number(st.size), 'head', 'per-ask'),
      droppedByReason: {}
    };
  } finally {
    db.close();
  }
}
