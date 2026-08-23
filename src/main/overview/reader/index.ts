/**
 * The per provider session log reader, Phase 137. One entry point. The map
 * is data, the engine is provider blind, and the reader returns only what
 * the overview page needs, being each turn's ask and closing answer, the
 * turn facts, the path index, the join, and a watermark so the next read of
 * an unchanged file is one stat call.
 *
 * No Electron import and no React. The conformance probe runs this module
 * under plain node.
 */

import { providerMap } from './map';
import {
  readCursor,
  readCursoride,
  readJsonDoc,
  readJsonl
} from './containers';
import type { ContainerResult, ReadAccounting } from './containers';
import { extractPathsFromText, mergePathMentions } from './paths';
import type { PathMention } from './paths';
import type { Watermark } from './watermark';
import type { OverviewProvider } from './resolve';

export type { OverviewProvider, LogLocation, ResolveEnv, ResolveInput } from './resolve';
export { resolveSessionLog, dashEncodeClaudeCwd } from './resolve';
export type { PathMention } from './paths';
export { extractPathsFromText, mergePathMentions } from './paths';
export type { Watermark } from './watermark';
export type { ReadAccounting } from './containers';
export { KEEP_MAP, providerMap, providerVersion, keepMapHash } from './map';
export type { KeepMap, ProviderMap } from './map-types';

export interface ReadTurn {
  index: number;
  ask: { text: string; at: string | null; queued: number };
  answer: { text: string; at: string | null } | null;
  closed: boolean;
  interrupted: boolean;
  notice: string | null;
  stopReason: string | null;
  durationMs: number | null;
  paths: PathMention[];
  pathSource: 'tool-calls' | 'text-only';
}

export interface ReadResult {
  provider: OverviewProvider;
  work: 'full' | 'tail' | 'suffix' | 'none';
  turns: ReadTurn[];
  watermark: Watermark | null;
  join: { sessionId: string | null; cwd: string | null; threadSource: string | null };
  meta: { model: string | null; branch: string | null };
  lastTouchedAt: string | null;
  honest: string | null;
  acct: ReadAccounting;
}

export interface ReadInput {
  provider: OverviewProvider;
  file: string;
  /** The filter key for muse, the composer id for cursoride. */
  sessionId: string | null;
  cwd: string;
  projectPath: string;
  watermark: Watermark | null;
}

const EMPTY_ACCT: ReadAccounting = {
  bytesRead: 0,
  bytesParsed: 0,
  lines: 0,
  linesParsed: 0,
  size: 0,
  peakLineBuffer: 0,
  prefilter: 'off',
  turnMode: 'per-ask'
};

/** Synchronous. Throws only on an unreadable file. Never writes. */
export function readSessionLog(input: ReadInput): ReadResult {
  const cfg = providerMap(input.provider);
  if (!cfg) throw new Error('keep-map: no provider ' + input.provider);

  if (cfg.container === 'none') {
    return {
      provider: input.provider,
      work: 'none',
      turns: [],
      watermark: null,
      join: { sessionId: null, cwd: null, threadSource: null },
      meta: { model: null, branch: null },
      lastTouchedAt: null,
      honest: cfg.honest ?? null,
      acct: { ...EMPTY_ACCT }
    };
  }

  const cin = { file: input.file, sessionId: input.sessionId, watermark: input.watermark };
  let r: ContainerResult;
  switch (cfg.container) {
    case 'jsonl':
      r = readJsonl(cfg, cin);
      break;
    case 'json-doc':
      r = readJsonDoc(cfg, cin);
      break;
    case 'sqlite-cursor':
      r = readCursor(cfg, cin);
      break;
    case 'sqlite-cursoride':
      r = readCursoride(cfg, cin);
      break;
    default:
      throw new Error('keep-map: no container ' + String(cfg.container));
  }

  const pathSource: ReadTurn['pathSource'] = cfg.paths ? 'tool-calls' : 'text-only';
  const turns: ReadTurn[] = r.turns.map((t) => {
    const lists: PathMention[][] = [
      extractPathsFromText(t.ask.text, input.cwd, input.projectPath, 'text')
    ];
    if (t.answer) {
      lists.push(extractPathsFromText(t.answer.text, input.cwd, input.projectPath, 'text'));
    }
    for (const pt of t.pathTexts) {
      lists.push(extractPathsFromText(pt.text, input.cwd, input.projectPath, pt.source));
    }
    return {
      index: t.index,
      ask: t.ask,
      answer: t.answer,
      closed: t.closed,
      interrupted: t.interrupted,
      notice: t.notice,
      stopReason: t.stopReason,
      durationMs: t.durationMs,
      paths: mergePathMentions(lists),
      pathSource
    };
  });

  const last = turns.length ? (turns[turns.length - 1] as ReadTurn) : null;
  const lastClock = last ? (last.answer?.at ?? last.ask.at) : null;

  return {
    provider: input.provider,
    work: r.work,
    turns,
    watermark: r.watermark,
    join: r.join,
    meta: r.meta,
    lastTouchedAt: r.lastTouchedAt ?? lastClock,
    honest: cfg.honest ?? null,
    acct: r.acct
  };
}
