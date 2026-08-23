/**
 * Folds an ordered record stream into turns, per the map's `turn` block.
 * Ported from docs/research/assets/63-keep-map/lib/fold.js with the Phase
 * 137 additions. A drop rule can mark the open turn interrupted or leave a
 * notice on it. A `marksRecords` block marks from records the provider
 * filter would otherwise exclude. The map's `paths` block collects tool call
 * strings per turn for the path index. The map's `meta` block collects the
 * session's model and branch from kept records. Turn indexes start at a
 * caller supplied base so a resumed read re-emits the open turn with the
 * index it had.
 */

import { at, extract, newStats, slot, test, withBind } from './expr';
import type { Bind, SlotStats } from './expr';
import type { DropRule, ProviderMap, TurnCfg } from './map-types';

/** One tool call string waiting for the path scanner. */
export interface RawPathText {
  text: string;
  source: 'command' | 'tool';
}

export interface FoldSlotValue {
  text: string;
  at: string | null;
}

export interface FoldTurn {
  index: number;
  ask: { text: string; at: string | null; queued: number };
  answer: FoldSlotValue | null;
  closed: boolean;
  interrupted: boolean;
  notice: string | null;
  stopReason: string | null;
  durationMs: number | null;
  pathTexts: RawPathText[];
}

export interface FoldMeta {
  model: string | null;
  branch: string | null;
}

interface OpenTurn {
  asks: FoldSlotValue[];
  answers: FoldSlotValue[];
  closeAnswer: FoldSlotValue | null;
  extra: Record<string, unknown>;
  interrupted: boolean;
  interruptedIfNoAnswer: boolean;
  notice: string | null;
  pathTexts: RawPathText[];
}

type FlushCause = 'marker' | 'next-ask' | 'also-close' | 'end';

function clockMs(iso: string | null): number | null {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
}

export class Fold {
  private readonly cfg: ProviderMap;
  private readonly turn: TurnCfg;
  private readonly bind: Bind;
  private readonly baseIndex: number;
  readonly turns: FoldTurn[] = [];
  cur: OpenTurn | null = null;
  readonly stats: SlotStats = newStats();
  readonly meta: FoldMeta = { model: null, branch: null };

  constructor(cfg: ProviderMap, bind: Bind, opts?: { baseIndex?: number; turnOverride?: TurnCfg }) {
    this.cfg = cfg;
    this.turn =
      opts?.turnOverride ??
      cfg.turn ?? { open: 'ask', close: 'nextAskOr', pick: 'last-answer-before-close' };
    this.bind = bind ?? null;
    this.baseIndex = opts?.baseIndex ?? 0;
  }

  private newTurn(): OpenTurn {
    return {
      asks: [],
      answers: [],
      closeAnswer: null,
      extra: {},
      interrupted: false,
      interruptedIfNoAnswer: false,
      notice: null,
      pathTexts: []
    };
  }

  private flush(cause: FlushCause): void {
    if (!this.cur) return;
    const t = this.cur;
    this.cur = null;
    if (t.asks.length === 0) {
      if (this.turn.dropTurnsWithNoAsk) {
        const reason = 'machine started turn, no human ask';
        this.stats.dropped[reason] = (this.stats.dropped[reason] ?? 0) + 1;
      }
      return;
    }
    let answer: FoldSlotValue | null;
    if (this.turn.pick === 'close-answer-else-last-answer') {
      answer = t.closeAnswer ?? (t.answers.length ? (t.answers[t.answers.length - 1] as FoldSlotValue) : null);
    } else {
      answer = t.answers.length
        ? (t.answers[t.answers.length - 1] as FoldSlotValue)
        : (t.closeAnswer ?? null);
    }
    const firstAsk = t.asks[0] as FoldSlotValue;
    const ask =
      t.asks.length === 1
        ? { text: firstAsk.text, at: firstAsk.at, queued: 1 }
        : { text: t.asks.map((a) => a.text).join('\n\n'), at: firstAsk.at, queued: t.asks.length };
    // A marker close, a next ask and an alsoCloseWhen all end the turn. Only
    // a turn that runs off the end of the file is still open, and for a
    // provider with no close marker an end turn that holds an answer reads
    // as finished.
    const markerProvider = typeof this.turn.close === 'object' && this.turn.close !== null;
    const closed =
      cause !== 'end' ? true : markerProvider ? false : answer !== null;
    const interrupted = t.interrupted || (answer === null && t.interruptedIfNoAnswer);
    const carriedDuration = t.extra['durationMs'];
    let durationMs: number | null =
      typeof carriedDuration === 'number' && Number.isFinite(carriedDuration)
        ? carriedDuration
        : null;
    if (durationMs === null) {
      const a = clockMs(ask.at);
      const b = clockMs(answer?.at ?? null);
      durationMs = a !== null && b !== null && b >= a ? b - a : null;
    }
    const stopReasonRaw = t.extra['stopReason'];
    this.turns.push({
      index: this.baseIndex + this.turns.length,
      ask,
      answer,
      closed,
      interrupted,
      notice: t.notice,
      stopReason: stopReasonRaw == null ? null : String(stopReasonRaw),
      durationMs,
      pathTexts: t.pathTexts
    });
  }

  private applyDrop(rule: DropRule, text: string): void {
    if (rule.marks === 'interrupted' && this.cur) this.cur.interrupted = true;
    if (rule.marksIfNoAnswer === 'interrupted' && this.cur) this.cur.interruptedIfNoAnswer = true;
    if (rule.noticeFrom === '_text' && this.cur && text.trim() !== '') this.cur.notice = text.trim();
  }

  private collectPaths(rec: unknown): void {
    const paths = this.cfg.paths;
    if (!paths || !this.cur || !test(paths.when, rec)) return;
    for (const from of paths.from) {
      if (from.field) {
        const v = at(rec, from.field);
        if (typeof v === 'string' && v.trim() !== '') {
          this.cur.pathTexts.push({ text: v, source: from.source });
        }
        continue;
      }
      if (!from.parts) continue;
      const arr = at(rec, from.parts);
      if (!Array.isArray(arr)) continue;
      for (const part of arr) {
        if (part == null || typeof part !== 'object') continue;
        if (from.partWhen && !test(from.partWhen, part)) continue;
        const v = at(part, from.take ?? 'text');
        if (typeof v === 'string' && v.trim() !== '') {
          this.cur.pathTexts.push({ text: v, source: from.source });
        }
      }
    }
  }

  private collectMeta(rec: unknown): void {
    const meta = this.cfg.meta;
    if (!meta) return;
    if (meta.model) {
      const v = at(rec, meta.model);
      if (typeof v === 'string' && v.trim() !== '') this.meta.model = v;
    }
    if (meta.branch) {
      const v = at(rec, meta.branch);
      if (typeof v === 'string' && v.trim() !== '') this.meta.branch = v;
    }
  }

  push(rec: unknown): void {
    this.stats.records++;
    const cfg = this.cfg;

    // Marks from records the provider filter excludes, e.g. codex's
    // <turn_aborted> response_item. Evaluated before the filter on purpose.
    for (const mr of cfg.marksRecords ?? []) {
      if (!test(mr.when, rec)) continue;
      const text = mr.text ? extract(mr.text, rec) : '';
      if (mr.startsWith !== undefined && !text.startsWith(mr.startsWith)) continue;
      if (mr.marks === 'interrupted' && this.cur) this.cur.interrupted = true;
    }

    if (cfg.filter && !test(cfg.filter, withBind(rec, this.bind))) return;

    // An explicit turn opener, e.g. codex task_started.
    if (typeof this.turn.open === 'object' && test(this.turn.open, rec)) {
      this.flush('marker');
      this.cur = this.newTurn();
    }

    this.collectPaths(rec);

    const ask = slot(cfg.ask, rec, this.bind, this.stats);
    if (ask?.kind === 'kept') {
      if (this.turn.open === 'ask') {
        this.flush('next-ask');
        this.cur = this.newTurn();
      } else if (!this.cur) {
        this.cur = this.newTurn();
      }
      this.cur.asks.push({ text: ask.text, at: ask.at });
      this.stats.asksKept++;
      this.collectMeta(rec);
      return;
    }
    if (ask?.kind === 'dropped') this.applyDrop(ask.rule, ask.text);

    const answer = slot(cfg.answer, rec, this.bind, this.stats);
    if (answer?.kind === 'kept' && this.cur) {
      this.cur.answers.push({ text: answer.text, at: answer.at });
      this.collectMeta(rec);
    }
    if (answer?.kind === 'dropped') this.applyDrop(answer.rule, answer.text);

    if (this.turn.close && typeof this.turn.close === 'object' && test(this.turn.close, rec)) {
      this.stats.closesSeen++;
      if (this.cur) {
        if (this.turn.answerFrom) {
          const t = extract(this.turn.answerFrom, rec);
          if (t && t.trim()) {
            const ts = at(rec, 'timestamp');
            this.cur.closeAnswer = { text: t, at: typeof ts === 'string' ? ts : null };
          }
        }
        for (const [k, p] of Object.entries(this.turn.carry ?? {})) {
          const v = at(rec, p);
          if (v != null) this.cur.extra[k] = v;
        }
        // muse. A terminal record with a reason means the run did not finish
        // on its own, and the reason is the turn's notice.
        if (this.turn.reasonMeansInterrupted) {
          const reason = this.cur.extra['stopReason'];
          if (reason != null && String(reason).trim() !== '') {
            this.cur.interrupted = true;
            this.cur.notice = String(reason);
          }
        }
      }
      this.flush('marker');
      return;
    }
    if (this.turn.alsoCloseWhen && test(this.turn.alsoCloseWhen, rec)) this.flush('also-close');
  }

  end(): FoldTurn[] {
    this.flush('end');
    return this.turns;
  }
}
