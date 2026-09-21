/**
 * The seven defects research 63 section 19 named, each proved against a
 * fixture derived at run time. Defect 6 is proved in reader-cursor.test.ts
 * and defect 7 in reader-watermark.test.ts. Nothing here reads outside the
 * repository and nothing here is committed to the fixture corpus.
 *
 * Phase 299 adds the hostile fixture set for C1 and C3 at the foot of the
 * file. Those cases are derived here in the same way, from the committed codex
 * fixture and from claude-bare-command.jsonl.
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLAUDE_BARE_CASE,
  fixtureLines,
  JSONL_CASES,
  keptText,
  readFixture,
  scratchDir,
  sortKeysDeep
} from './reader-helpers';

const CODEX_FILE =
  'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl';

describe('defect 1, claude cli 2.1.178 sorts its keys', () => {
  it('a sorted key fixture yields the same turns and answers, and the prefilter reports wide', () => {
    const dir = scratchDir('d1');
    try {
      const pad = 'p'.repeat(700);
      const sorted = fixtureLines('claude-session.jsonl')
        .map((l) => {
          const rec = JSON.parse(l) as Record<string, unknown>;
          // Long content in front of the sorted role key pushes the marker
          // past the 512 byte head, the shape of the real 21.48 MB file.
          const msg = rec['message'] as { content?: unknown } | undefined;
          if (rec['type'] === 'assistant' && msg && Array.isArray(msg.content)) {
            msg.content = (msg.content as Array<Record<string, unknown>>).map((c) =>
              c['type'] === 'text' ? { aaa_padding: pad, ...c } : c
            );
          }
          return JSON.stringify(sortKeysDeep(rec));
        })
        .join('\n') + '\n';
      const file = join(dir, 'sorted.jsonl');
      fs.writeFileSync(file, sorted);
      const base = readFixture(JSONL_CASES['claude']!);
      const r = readFixture(JSONL_CASES['claude']!, { file });
      expect(r.acct.prefilter).toBe('wide');
      expect(r.turns.length).toBe(base.turns.length);
      expect(r.turns.filter((t) => t.answer).length).toBe(
        base.turns.filter((t) => t.answer).length
      );
      expect(r.turns[2]!.answer!.text).toBe(base.turns[2]!.answer!.text);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 2, the three false claude asks', () => {
  const record = (content: string, extra: Record<string, unknown> = {}): string =>
    JSON.stringify({
      isSidechain: false,
      type: 'user',
      message: { role: 'user', content },
      timestamp: '2026-08-20T10:30:00.000Z',
      sessionId: '11111111-2222-4333-8444-555555555555',
      cwd: '/Users/dev/demo-app',
      ...extra
    });

  it('the interrupt prefix, the teammate tag and the bash notification never become asks', () => {
    const dir = scratchDir('d2');
    try {
      const lines = fixtureLines('claude-session.jsonl');
      lines.push(
        record('[Request interrupted by user for tool use]'),
        record('<teammate-message teammate_id="packager">{"type":"status"}</teammate-message>'),
        record('<bash-notification>gate finished</bash-notification>')
      );
      const file = join(dir, 'false-asks.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const base = readFixture(JSONL_CASES['claude']!);
      const r = readFixture(JSONL_CASES['claude']!, { file });
      expect(r.turns.length).toBe(base.turns.length);
      const all = keptText(r);
      expect(all).not.toContain('for tool use');
      expect(all).not.toContain('teammate-message');
      expect(all).not.toContain('bash-notification');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never keys on teamName, a genuine ask carrying it survives', () => {
    const dir = scratchDir('d2b');
    try {
      const lines = fixtureLines('claude-session.jsonl');
      lines.push(record('are we on the cocraft branch?', { teamName: 'cocraft' }));
      const file = join(dir, 'teamname.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const r = readFixture(JSONL_CASES['claude']!, { file });
      const base = readFixture(JSONL_CASES['claude']!);
      expect(r.turns.length).toBe(base.turns.length + 1);
      expect(r.turns[r.turns.length - 1]!.ask.text).toBe('are we on the cocraft branch?');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 3, codex cli 0.139.0 writes payload first', () => {
  it('a reordered key fixture yields the same turns, and the prefilter reports wide', () => {
    const dir = scratchDir('d3');
    try {
      const reordered = fixtureLines(CODEX_FILE)
        .map((l) => {
          const rec = JSON.parse(l) as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          if (rec['payload'] !== undefined) out['payload'] = rec['payload'];
          out['zz_padding'] = 'z'.repeat(300);
          for (const k of Object.keys(rec)) {
            if (k !== 'payload' && k !== 'type') out[k] = rec[k];
          }
          if (rec['type'] !== undefined) out['type'] = rec['type'];
          return JSON.stringify(out);
        })
        .join('\n') + '\n';
      const file = join(dir, 'reordered.jsonl');
      fs.writeFileSync(file, reordered);
      const base = readFixture(JSONL_CASES['codex']!);
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.prefilter).toBe('wide');
      expect(r.turns.length).toBe(base.turns.length);
      expect(r.turns.filter((t) => t.answer).length).toBe(
        base.turns.filter((t) => t.answer).length
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 4, codex 0.87 writes no task markers', () => {
  const strip = (rewriteVersion: (l: string) => string): string[] =>
    fixtureLines(CODEX_FILE)
      .filter((l) => !l.includes('"task_started"') && !l.includes('"task_complete"'))
      .map(rewriteVersion);

  it('a 0.87 file folds ask to ask with agent_message answers', () => {
    const dir = scratchDir('d4');
    try {
      const file = join(dir, 'old.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace('"cli_version":"0.147.0"', '"cli_version":"0.87.0"')).join('\n') +
          '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.length).toBeGreaterThanOrEqual(3);
      expect(r.turns[0]!.ask.text).toContain('nest counter');
      expect(r.turns[0]!.answer!.text).toContain('empty ledger');
      const last = r.turns[r.turns.length - 1]!;
      expect(last.answer!.text).toContain('v0.4.1');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a file with no version field and no closed turn re-runs ask to ask', () => {
    const dir = scratchDir('d4b');
    try {
      const file = join(dir, 'nover.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace(',"cli_version":"0.147.0"', '')).join('\n') + '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.filter((t) => t.answer).length).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a marker free file falls back whatever the version says, the real 103.90 MB file is 0.139.0', () => {
    // Measured on 2026-08-23. The file research 63 defect 4 names carries
    // cli_version 0.139.0 with zero task_started and zero task_complete, so
    // the selector is whether a task_complete was ever seen.
    const dir = scratchDir('d4c');
    try {
      const file = join(dir, 'modern-no-markers.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace('"cli_version":"0.147.0"', '"cli_version":"0.139.0"')).join('\n') +
          '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.length).toBeGreaterThanOrEqual(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 5, the codex unwrap is gated on the presence of the marker', () => {
  it('the in app browser wrapper unwraps to the request alone', () => {
    const dir = scratchDir('d5');
    try {
      const lines = fixtureLines(CODEX_FILE);
      lines.push(
        JSON.stringify({
          timestamp: '2026-08-19T14:30:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message:
              '# In app browser:\n- The user has the in-app browser open.\n- Current URL: file:///Users/example/rookery/index.html\n\n## My request for Codex:\nlets write a commit\n'
          }
        })
      );
      const file = join(dir, 'browser.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const r = readFixture(JSONL_CASES['codex']!, { file });
      const last = r.turns[r.turns.length - 1]!;
      expect(last.ask.text).toContain('lets write a commit');
      expect(keptText(r)).not.toContain('In app browser');
      expect(keptText(r)).not.toContain('in-app browser');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an attachment manifest with no request marker is dropped whole', () => {
    const dir = scratchDir('d5b');
    try {
      const lines = fixtureLines(CODEX_FILE);
      lines.push(
        JSON.stringify({
          timestamp: '2026-08-19T14:31:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message:
              '# Files mentioned by the user:\n\n## notes.txt: /Users/example/.codex/attachments/bbbb2222/notes.txt\n'
          }
        })
      );
      const file = join(dir, 'manifest.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const base = readFixture(JSONL_CASES['codex']!);
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(keptText(r)).not.toContain('attachments/');
      // The manifest joined the still open last turn as no ask at all.
      expect(r.turns[r.turns.length - 1]!.ask.queued).toBe(
        base.turns[base.turns.length - 1]!.ask.queued
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 299. The hostile fixture set for C1 and C3.
//
// Every expected value below is DERIVED and the reason is given beside it. The
// point of the set is that a rule which cannot fail has asserted nothing: C1
// existed for 162 phases with a green gate because the committed codex fixture
// spelled the part lowercase AND every one of its `task_complete` records
// carried text, so the pinned answer count could not move however broken the
// branch was.
//
// The parent reading of each committed fixture, measured at c1de8e0f with the
// map's own rules restored in memory:
//
//   codex base fixture       parent 4 turns 3 answers   HEAD 4 turns 4 answers
//   claude-bare-command      parent 3 turns 3 answers   HEAD 5 turns 5 answers
//   the bare command alone   parent 0 turns             HEAD 1 turn  1 answer
// ---------------------------------------------------------------------------

/** One codex turn: opener, ask, an AgentMessage part, a close. */
function codexTurn(opts: {
  turnId: string;
  ts: string;
  ask: string;
  partType: string | null;
  partText: string;
  lastAgentMessage: string;
}): string[] {
  const out = [
    JSON.stringify({
      timestamp: opts.ts,
      type: 'event_msg',
      payload: { type: 'task_started', turn_id: opts.turnId, started_at: 1787150000 }
    }),
    JSON.stringify({
      timestamp: opts.ts,
      type: 'event_msg',
      payload: { type: 'user_message', message: opts.ask }
    })
  ];
  if (opts.partType !== null) {
    out.push(
      JSON.stringify({
        timestamp: opts.ts,
        type: 'event_msg',
        payload: {
          type: 'item_completed',
          turn_id: opts.turnId,
          item: {
            type: 'AgentMessage',
            id: 'hostile_' + opts.turnId,
            content: [{ type: opts.partType, text: opts.partText }]
          }
        }
      })
    );
  }
  out.push(
    JSON.stringify({
      timestamp: opts.ts,
      type: 'event_msg',
      payload: {
        type: 'task_complete',
        turn_id: opts.turnId,
        last_agent_message: opts.lastAgentMessage
      }
    })
  );
  return out;
}

/** The base codex fixture with one hostile turn appended, read by the product. */
function codexWithTurn(dir: string, name: string, lines: string[]) {
  const file = join(dir, name + '.jsonl');
  fs.writeFileSync(file, fixtureLines(CODEX_FILE).concat(lines).join('\n') + '\n');
  const r = readFixture(JSONL_CASES['codex']!, { file });
  return { r, last: r.turns[r.turns.length - 1]! };
}

describe('Phase 299 C1, the codex answer part is accepted by SPELLING and nothing else', () => {
  const cases: Array<{ type: string; counted: boolean; why: string }> = [
    // Row 2. The committed fixture's own spelling, which the `or`'s second arm
    // keeps. Breaking that arm must redden this.
    { type: 'text', counted: true, why: 'the spelling the committed fixture uses' },
    // Row 1's spelling on a turn of its own. 94,841 of 94,841 real parts.
    { type: 'Text', counted: true, why: 'the spelling every real record uses' },
    // Rows 3 and 4. `eq` is `===` and two spellings were MEASURED. A third is a
    // guess, and a prefix or case-insensitive match would accept both of these.
    { type: 'TEXT', counted: false, why: 'never measured, and a case fold would accept it' },
    { type: 'Texts', counted: false, why: 'never measured, and a prefix match would accept it' }
  ];

  it.each(cases)('a part spelled $type is counted: $counted ($why)', ({ type, counted }) => {
    const dir = scratchDir('p299-c1-' + type);
    try {
      const { r, last } = codexWithTurn(
        dir,
        'part-' + type,
        codexTurn({
          turnId: '0000f001-0000-7000-8000-000000000001',
          ts: '2026-08-19T15:00:00.000Z',
          ask: 'Is the hostile part counted?',
          partType: type,
          partText: 'HOSTILE PART TEXT',
          lastAgentMessage: ''
        })
      );
      // The turn exists either way: it holds a human ask.
      expect(r.turns.length).toBe(5);
      expect(last.ask.text).toContain('Is the hostile part counted?');
      if (counted) {
        expect(last.answer).not.toBeNull();
        expect(last.answer!.text).toBe('HOSTILE PART TEXT');
      } else {
        expect(last.answer).toBeNull();
        expect(keptText(r)).not.toContain('HOSTILE PART TEXT');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Row 5. `pick` is `close-answer-else-last-answer`, so the closing record
  // still wins where it has text. A turn carries ONE answer, never two, which
  // is why the count cannot double when both are present.
  it('the closing record still wins over a Text part, and the reply is counted ONCE', () => {
    const dir = scratchDir('p299-c1-both');
    try {
      const { r, last } = codexWithTurn(
        dir,
        'both',
        codexTurn({
          turnId: '0000f002-0000-7000-8000-000000000002',
          ts: '2026-08-19T15:01:00.000Z',
          ask: 'Which of the two answers is drawn?',
          partType: 'Text',
          partText: 'THE PART TEXT',
          lastAgentMessage: 'THE CLOSING TEXT'
        })
      );
      expect(r.turns.length).toBe(5);
      expect(last.answer!.text).toBe('THE CLOSING TEXT');
      expect(r.turns.filter((t) => t.answer).length).toBe(5);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Row 6. MEASURED, and the entry does not give this reading: fold.ts requires
  // the closing text to be non-blank AFTER a trim before it becomes the turn's
  // closing answer, so a whitespace-only `last_agent_message` is absent and the
  // part wins. A whitespace answer must never beat a real one.
  it('a whitespace-only last_agent_message is absent, so the Text part wins', () => {
    const dir = scratchDir('p299-c1-ws');
    try {
      const { last } = codexWithTurn(
        dir,
        'whitespace',
        codexTurn({
          turnId: '0000f003-0000-7000-8000-000000000003',
          ts: '2026-08-19T15:02:00.000Z',
          ask: 'Does whitespace count as an answer?',
          partType: 'Text',
          partText: 'THE PART TEXT',
          lastAgentMessage: '   \n\t '
        })
      );
      expect(last.answer!.text).toBe('THE PART TEXT');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // Row 7. Real: the entry's two corpus counts disagree by exactly one line
  // because a reply quoted a `task_complete` record, which is why 2,890 and
  // 31,916 sum to 34,806 over 34,805 records. A record is classified by its
  // `payload.type` and never by its text.
  it('a reply whose own text quotes a task_complete line is counted once, as a reply', () => {
    const dir = scratchDir('p299-c1-quote');
    try {
      const quoted = '{"type":"event_msg","payload":{"type":"task_complete","last_agent_message":"done"}}';
      const { r, last } = codexWithTurn(
        dir,
        'quote',
        codexTurn({
          turnId: '0000f004-0000-7000-8000-000000000004',
          ts: '2026-08-19T15:03:00.000Z',
          ask: 'What does the closing record look like?',
          partType: 'Text',
          partText: 'It looks like this:\n' + quoted,
          lastAgentMessage: ''
        })
      );
      expect(r.turns.length).toBe(5);
      expect(last.answer!.text).toContain('task_complete');
      expect(r.turns.filter((t) => t.answer).length).toBe(5);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Phase 299 C3, a slash command typed with no arguments is the person’s message', () => {
  // Rows 14 to 17, over the committed fixture. At c1de8e0f this reads 3 turns
  // and 3 answers, and turn 0 draws the reply to a message nobody can see.
  const r = readFixture(CLAUDE_BARE_CASE);

  it('reads 5 turns and 5 answers', () => {
    expect(r.turns.length).toBe(5);
    expect(r.turns.filter((t) => t.answer).length).toBe(5);
  });

  it('row 14: a bare command between two real turns opens its OWN turn', () => {
    expect(r.turns[1]!.ask.text).toBe('/as-built-architecture');
    expect(r.turns[1]!.answer!.text).toContain('Drawing the as-built map');
  });

  it('row 14: the previous turn keeps its own reply, not the bare command’s', () => {
    // This is the whole of C3's second shape. At the parent turn 0's drawn
    // answer is 'Drawing the as-built map now', the reply to an invisible ask.
    expect(r.turns[0]!.ask.text).toContain('why the packaging gate takes so long');
    expect(r.turns[0]!.answer!.text).toContain('builds the bundle twice');
    expect(r.turns[0]!.answer!.text).not.toContain('as-built map');
  });

  it('row 15: a bare command that IS on dropCommands is still dropped', () => {
    // 444 of the 650 real empty-argument records name one of the nine, and the
    // `||` checks the list FIRST. This is the behaviour that must not move.
    expect(keptText(r)).not.toContain('/model');
    expect(r.turns.map((t) => t.ask.text)).not.toContain('/model');
  });

  it('row 16: the rule is about the TAG, so a name that is not a command is kept', () => {
    expect(r.turns[3]!.ask.text).toBe('hello');
    expect(r.turns[3]!.answer!.text).toContain('a command called hello');
  });

  it('row 17: the two controls with arguments are unchanged', () => {
    // `/effort ultracode` is on dropCommands and stays dropped; `/loop …` is
    // not and stays kept, with its arguments.
    expect(keptText(r)).not.toContain('ultracode');
    expect(r.turns[4]!.ask.text).toBe('/loop keep the packaging gate green');
  });

  // Row 13. At c1de8e0f the ask is emptied, `this.cur` is still null when the
  // reply arrives, and the reply is discarded outright: the record reads ZERO
  // turns, which is the verifier's `— / No messages yet`.
  it('row 13: a bare command as the session’s ONLY message reads 1 ask and 1 reply', () => {
    const dir = scratchDir('p299-c3-only');
    try {
      const lines = fixtureLines('claude-bare-command.jsonl');
      const file = join(dir, 'only.jsonl');
      fs.writeFileSync(file, [lines[2], lines[3]].join('\n') + '\n');
      const only = readFixture(CLAUDE_BARE_CASE, { file });
      expect(only.turns.length).toBe(1);
      expect(only.turns[0]!.ask.text).toBe('/as-built-architecture');
      expect(only.turns[0]!.answer!.text).toContain('Drawing the as-built map');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
