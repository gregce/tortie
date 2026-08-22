'use strict';
// Research 63. Folds an ordered record stream into turns, per the map's `turn` block.
// Emits ONLY the five things the page needs.

const { test, slot, extract, at } = require('./expr');

class Fold {
  constructor(cfg, bind) {
    this.cfg = cfg;
    this.turn = cfg.turn || { open: 'ask', close: 'nextAskOr', pick: 'last-answer-before-close' };
    this.bind = bind || null;
    this.turns = [];
    this.cur = null;
    this.stats = { dropped: Object.create(null), records: 0 };
  }

  _new() { return { asks: [], answers: [], closeAnswer: null, extra: {}, open: true }; }

  _flush() {
    if (!this.cur) return;
    const t = this.cur;
    this.cur = null;
    if (this.turn.dropTurnsWithNoAsk && t.asks.length === 0) { this.stats.dropped['machine started turn, no human ask'] = (this.stats.dropped['machine started turn, no human ask'] || 0) + 1; return; }
    if (t.asks.length === 0) return;
    let answer = null;
    if (this.turn.pick === 'close-answer-else-last-answer') answer = t.closeAnswer || (t.answers.length ? t.answers[t.answers.length - 1] : null);
    else answer = t.answers.length ? t.answers[t.answers.length - 1] : (t.closeAnswer || null);
    this.turns.push({
      index: this.turns.length,
      ask: t.asks.length === 1 ? t.asks[0] : { text: t.asks.map((a) => a.text).join('\n\n'), at: t.asks[0].at, queued: t.asks.length },
      answer,
      closed: !t.open,
      extra: t.extra,
    });
  }

  push(rec) {
    this.stats.records++;
    const cfg = this.cfg;
    if (cfg.filter && !test(cfg.filter, { ...rec, $bind: this.bind })) return;

    // an explicit turn opener, e.g. codex task_started
    if (typeof this.turn.open === 'object' && test(this.turn.open, rec)) { this._flush(); this.cur = this._new(); }

    const ask = slot(cfg.ask, rec, this.bind, this.stats);
    if (ask) {
      if (this.turn.open === 'ask') { this._flush(); this.cur = this._new(); }
      else if (!this.cur) this.cur = this._new();
      this.cur.asks.push(ask);
      return;
    }

    const answer = slot(cfg.answer, rec, this.bind, this.stats);
    if (answer && this.cur) this.cur.answers.push(answer);

    if (this.turn.close && typeof this.turn.close === 'object' && test(this.turn.close, rec)) {
      if (this.cur) {
        this.cur.open = false;
        if (this.turn.answerFrom) {
          const t = extract(this.turn.answerFrom, rec);
          if (t && t.trim()) this.cur.closeAnswer = { text: t, at: rec.timestamp || null };
        }
        for (const [k, p] of Object.entries(this.turn.carry || {})) { const v = at(rec, p); if (v != null) this.cur.extra[k] = v; }
      }
      this._flush();
      return;
    }
    if (this.turn.alsoCloseWhen && test(this.turn.alsoCloseWhen, rec)) this._flush();
  }

  end() { this._flush(); return this.turns; }
}

module.exports = { Fold };
