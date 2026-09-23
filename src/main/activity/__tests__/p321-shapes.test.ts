/**
 * PHASE 321 — the questions real agents draw, read as the named shapes
 * (build/p321/SPEC.md §3 and §5.1, and §12.9 for the fix round).
 *
 * THE SHAPES ARE HELD TO THE COMMITTED CORPUS, NOT TO HAND-WRITTEN SCREENS.
 * `build/fixtures/questions/` holds every distinct 24-row detector window of
 * research 129's recordings, redacted and labelled by hand from the byte
 * timeline and the key events (never by a detector), one `{ id, label, rows }`
 * per line. A window is exactly what `dialogWindow` reads, so a verdict on a
 * committed window equals the verdict on the capture it came from.
 *
 * TWO SHAPES, qwen's confirmation and Claude Code 2.1.280's trust gate. The
 * build read six; its fix round REMOVED cursor's two, opencode's and
 * antigravity's whole, because each turned amber on a screen that is not a
 * question (his paste into cursor's last-row input, a shell or pager in the
 * session showing the rows, antigravity's own pickers). Those agents read
 * exactly what the parent read, and a section below holds them to it.
 *
 * Seven things are pinned here, each for a reason the phase was built around:
 *
 *   1. Every committed QUESTION window of a shape agent reads true, and every
 *      NOT-QUESTION window of that agent reads false.
 *   2. cursor's ANSWERED trust box reads false under every shape: an answered
 *      question can stay drawn with its option rows intact, which is the trap
 *      that parked Phase 319's lesson into this phase.
 *   3. The ONE-CLAUSE-OFF TWINS. Over the corpus no single clause is needed,
 *      because every question carries all four live properties and every other
 *      screen fails more than one. So each clause is owned by a real question
 *      screen with exactly that one property taken away, which the full shape
 *      refuses and which `npm run ablation:p321` proves exactly one ablation
 *      turns true.
 *   4. The screens that removed four shapes, rebuilt from the two that stay:
 *      their rows printed by a shell, a pager or an editor in the session.
 *   5. Every shape over every OTHER agent's windows, with the count PINNED, so
 *      a widening is a red row rather than a silent one; and every agent whose
 *      shape was removed reads the parent's verdict over its own windows.
 *   6. The floor: `detectDialog` equals a LITERAL copy of the parent's detector
 *      over every committed window and fixture.
 *   7. No shape reaches an agent its compiled row does not name, and an empty
 *      list reads nothing at all.
 *
 * Plus the cost, 20,000 calls, reported in microseconds beside Phase 312's.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activityProfileFor,
  AGENT_REGISTRY,
  DEFAULT_ACTIVITY,
  SHELL_ACTIVITY
} from '../../agents/registry';
import {
  DIALOG_SHAPES,
  detectDialog,
  detectShapes,
  normalizeCapture,
  type DialogShapeId
} from '../screen';

// ---------------------------------------------------------------------------
// The committed corpus
// ---------------------------------------------------------------------------

const REPO = join(__dirname, '..', '..', '..', '..');
const QUESTIONS = join(REPO, 'build', 'fixtures', 'questions');
const FIXTURES = join(__dirname, 'fixtures');

type Label = 'question' | 'answering' | 'not-question';

interface Window {
  file: string;
  source: string;
  agent: string;
  id: string;
  label: Label;
  text: string;
}

/**
 * `<source>-<agent>.jsonl`, source being a, adv1 or b (research 129 §8). The
 * agent half is the recording's own name, and cursor's was recorded as
 * `cursor-agent` in one folder.
 */
function agentOf(file: string): { source: string; agent: string } {
  const stem = file.replace(/\.jsonl$/, '');
  const dash = stem.indexOf('-');
  const source = stem.slice(0, dash);
  const rest = stem.slice(dash + 1);
  return { source, agent: rest === 'cursor-agent' ? 'cursor' : rest };
}

function loadCorpus(): Window[] {
  const out: Window[] = [];
  for (const file of readdirSync(QUESTIONS).filter((f) => f.endsWith('.jsonl')).sort()) {
    const { source, agent } = agentOf(file);
    const lines = readFileSync(join(QUESTIONS, file), 'utf8').split('\n');
    for (const line of lines) {
      if (line.trim() === '') continue;
      const w = JSON.parse(line) as { id: string; label: Label; rows: string[] };
      out.push({ file, source, agent, id: w.id, label: w.label, text: w.rows.join('\n') });
    }
  }
  return out;
}

const CORPUS = loadCorpus();
const AGENTS = [...new Set(CORPUS.map((w) => w.agent))].sort();

const fixture = (name: string): string =>
  normalizeCapture(readFileSync(join(FIXTURES, name), 'utf8'));

/** The shapes an agent's COMPILED row names, which is the only way a shape reaches it. */
const shapesOf = (agent: string): readonly DialogShapeId[] =>
  activityProfileFor(agent).dialogs ?? [];

const SHAPE_IDS = Object.keys(DIALOG_SHAPES) as DialogShapeId[];

/** Which agent each shape was measured on. */
const OWNER: Record<DialogShapeId, string> = {
  'qwen-confirmation': 'qwen',
  'claude-trust-gate': 'claude'
};

/** The agents whose shapes the fix round removed, whose questions are missed exactly as before. */
const REMOVED = ['antigravity', 'cursor', 'opencode'];

// ---------------------------------------------------------------------------
// The corpus is there, and it is labelled
// ---------------------------------------------------------------------------

describe('the committed corpus', () => {
  it('holds every recorded agent, and every window carries one of the three labels', () => {
    for (const agent of ['antigravity', 'claude', 'codex', 'cursor', 'gemini', 'grok', 'omp', 'opencode', 'pi', 'qwen']) {
      expect(AGENTS, agent).toContain(agent);
    }
    for (const w of CORPUS) {
      expect(['question', 'answering', 'not-question'], `${w.file} ${w.id}`).toContain(w.label);
    }
  });

  it('holds question windows for every agent a shape was measured on', () => {
    for (const agent of new Set(Object.values(OWNER))) {
      const q = CORPUS.filter((w) => w.agent === agent && w.label === 'question');
      expect(q.length, agent).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 1 and 2 — per shape agent: every question window, no other window
// ---------------------------------------------------------------------------

describe('each shape agent, over its own committed windows', () => {
  for (const agent of [...new Set(Object.values(OWNER))].sort()) {
    const shapes = shapesOf(agent);
    const mine = CORPUS.filter((w) => w.agent === agent);

    it(`${agent}: every question window reads true with the row's shapes`, () => {
      const missed = mine
        .filter((w) => w.label === 'question')
        .filter((w) => !detectShapes(w.text, shapes))
        .map((w) => `${w.file}:${w.id}`);
      expect(missed).toEqual([]);
    });

    it(`${agent}: no not-question window reads true with the row's shapes`, () => {
      const wrong = mine
        .filter((w) => w.label === 'not-question')
        .filter((w) => detectShapes(w.text, shapes))
        .map((w) => `${w.file}:${w.id}`);
      expect(wrong).toEqual([]);
    });
  }

  it("cursor's ANSWERED trust box reads false under every shape, and the answered windows too", () => {
    const answered = fixture('cursor-trust-answered.txt');
    expect(answered).toContain('[a] Trust this workspace');
    expect(answered).not.toContain('▶ [a]');
    for (const id of SHAPE_IDS) expect(detectShapes(answered, [id]), id).toBe(false);
    // Every cursor window that still draws the answered box inside the window.
    const drawn = CORPUS.filter(
      (w) => w.agent === 'cursor' && w.label === 'not-question' && w.text.includes('Trust this workspace')
    );
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((w) => detectShapes(w.text, SHAPE_IDS)).map((w) => w.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The named positives
// ---------------------------------------------------------------------------

const POSITIVES: Array<[DialogShapeId, string]> = [
  ['qwen-confirmation', 'qwen-run-permission.txt'],
  ['qwen-confirmation', 'qwen-run-permission-scrollbar.txt'],
  ['claude-trust-gate', 'claude-trust-2-1-280.txt']
];

describe('the named positives', () => {
  for (const [id, file] of POSITIVES) {
    it(`${file} reads true under ${id} and under no other shape`, () => {
      const text = fixture(file);
      expect(detectShapes(text, [id])).toBe(true);
      for (const other of SHAPE_IDS.filter((s) => s !== id)) {
        expect(detectShapes(text, [other]), other).toBe(false);
      }
    });
  }

  it("qwen's scrollbar fixture really draws the scrollbar column beside its rows", () => {
    const text = fixture('qwen-run-permission-scrollbar.txt');
    expect(text.split('\n').filter((r) => r.endsWith('█')).length).toBeGreaterThan(4);
  });
});

// ---------------------------------------------------------------------------
// 3 — the one-clause-off twins
// ---------------------------------------------------------------------------

/**
 * Each twin is a REAL question screen with ONE live property taken away. The
 * rows put in its place are the agent's own: its idle input box and footer are
 * cut from a committed screen of that agent that draws them, never typed here.
 */
interface InputBox {
  /** Where the agent's own input box and footer are cut from. */
  source: () => string[];
  /** The row that begins the input box in that source; the cut takes it and everything below. */
  start: RegExp;
  /** Rows above `start` that belong to the box (its top border). */
  above: number;
  /** The row of the cut that his typed words replace. */
  inputAt: number;
  /** What a line of his typed words is drawn behind, and what a continuation line is. */
  prefix: string;
  indent: string;
}

const INPUT_BOX: Record<string, InputBox> = {
  qwen: {
    source: () => fixture('qwen-idle.txt').split('\n'),
    start: /^> /,
    above: 1,
    inputAt: 1,
    prefix: '> ',
    indent: '  '
  },
  claude: {
    source: () => fixture('claude-idle.txt').split('\n'),
    start: /^❯/,
    above: 1,
    inputAt: 1,
    prefix: '❯ ',
    indent: '  '
  }
};

function inputBoxOf(agent: string): string[] {
  const box = INPUT_BOX[agent];
  if (box === undefined) throw new Error(`no input box for ${agent}`);
  const rows = box.source();
  let at = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (box.start.test(rows[i] ?? '')) {
      at = i;
      break;
    }
  }
  if (at < 0) throw new Error(`${agent}: the input box was not found in its source`);
  return rows.slice(Math.max(0, at - box.above));
}

/** The index of the LAST row matching, over the raw lines, border-stripped. */
const STRIP = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
function lastRow(lines: readonly string[], re: RegExp): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (re.test((lines[i] ?? '').replace(STRIP, ''))) return i;
  }
  return -1;
}

const blank = (lines: string[], i: number): string[] =>
  lines.map((l, j) => (j === i ? '' : l));

/**
 * WHERE EACH PROPERTY IS DRAWN, READ BY THIS FILE'S OWN SPELLINGS, never by the
 * shipping table. A twin built from the clause it tests changes shape when that
 * clause is removed, and then the ablation that should turn it true builds a
 * different twin instead: the first run of `ablation:p321` found exactly that.
 */
interface TwinCase {
  id: DialogShapeId;
  file: string;
  agent: string;
  /** The row carrying the live hint. */
  hint: RegExp;
  /** The focused option row, and the glyph that marks it. */
  focus: RegExp;
  glyph: string;
  /** The OTHER option rows, which the options twin takes away. */
  others: RegExp;
  /** The agent's own post-answer row, where it draws one in the hint's place. */
  afterAnswer?: string;
}

const TWINS: TwinCase[] = [
  ...['qwen-run-permission.txt', 'qwen-run-permission-scrollbar.txt'].map(
    (file): TwinCase => ({
      id: 'qwen-confirmation',
      file,
      agent: 'qwen',
      hint: /Waiting for user confirmation/,
      focus: /^› \d/,
      glyph: '›',
      others: /^\d{1,2}\. /
    })
  ),
  {
    id: 'claude-trust-gate',
    file: 'claude-trust-2-1-280.txt',
    agent: 'claude',
    hint: /^Enter to confirm/,
    focus: /^❯ /,
    glyph: '❯',
    others: /^(?:Yes, I trust this folder|No, exit)$/
  }
];

/** Rows above the hint this file looks through for the focus and the options. */
const REACH = 8;

/** The twins of one positive, each named by the ONE property it takes away. */
function twinsOf(c: TwinCase): Record<string, string> {
  const lines = fixture(c.file).split('\n');
  const hint = lastRow(lines, c.hint);
  if (hint < 0) throw new Error(`${c.file}: no hint row`);
  const stripped = (j: number): string => (lines[j] ?? '').replace(STRIP, '');
  let focus = -1;
  for (let i = hint; i >= Math.max(0, hint - REACH); i--) {
    if (c.focus.test(stripped(i))) {
      focus = i;
      break;
    }
  }
  if (focus < 0) throw new Error(`${c.file}: no focus row`);
  const out: Record<string, string> = {};

  // TAIL: the question with the agent's own idle input box and footer below it.
  out.tail = [...lines, ...inputBoxOf(c.agent)].join('\n');

  // TAIL, the attack's shape: the question's rows as HIS typed words, drawn
  // inside the agent's own input box with the rest of the box below them. The
  // block starts one row above the question's own top (its focus), so the
  // prefix lands on that row and every row of the question keeps its own
  // start, which is the one property this twin must not touch.
  const box = inputBoxOf(c.agent);
  const spec = INPUT_BOX[c.agent] as InputBox;
  const qFrom = Math.max(0, Math.min(focus, hint) - 1);
  const typed = lines
    .slice(qFrom, hint + 1)
    .map((l) => l.replace(STRIP, ''))
    .map((r, i) => `${i === 0 ? spec.prefix : spec.indent}${r}`);
  out.typed = [
    ...lines.slice(0, qFrom),
    ...box.slice(0, spec.inputAt),
    ...typed,
    ...box.slice(spec.inputAt + 1)
  ].join('\n');

  // FOCUS: the focus glyph blanked where it is drawn.
  out.focus = lines.map((l, j) => (j === focus ? l.replace(c.glyph, ' ') : l)).join('\n');

  // HINT: the letters of the hint's own words shaped away, every other
  // character, the row's length and its place kept, so the row is still there
  // and no longer carries the hint. Then the row blanked, and where the agent
  // draws one, its own post-answer row in the hint's place.
  const said = c.hint.exec(stripped(hint))?.[0] ?? '';
  const shapedWords = said.replace(/[a-z]/g, 'x').replace(/[A-Z]/g, 'X');
  out.hint = lines.map((l, j) => (j === hint ? l.replace(said, shapedWords) : l)).join('\n');
  out.hintBlank = blank(lines, hint).join('\n');
  if (c.afterAnswer !== undefined) {
    const indent = /^\s*[│┃║]?\s*/.exec(lines[hint] ?? '')?.[0] ?? '';
    out.hintAnswered = lines
      .map((l, j) => (j === hint ? `${indent}${c.afterAnswer as string}` : l))
      .join('\n');
  }

  // OPTIONS: every other option row blanked, the focus row kept.
  const from = Math.max(0, focus - REACH);
  out.options = lines
    .map((l, j) => (j >= from && j < hint && j !== focus && c.others.test(stripped(j)) ? '' : l))
    .join('\n');
  return out;
}

describe('the one-clause-off twins, each refused by the full shape', () => {
  for (const c of TWINS) {
    it(`${c.file}: the live question reads true`, () => {
      expect(detectShapes(fixture(c.file), [c.id])).toBe(true);
    });
    const names = ['tail', 'typed', 'focus', 'hint', 'hintBlank', 'hintAnswered', 'options'];
    for (const name of names) {
      it(`${c.file}: the ${name} twin reads false`, () => {
        const twin = twinsOf(c)[name];
        if (twin === undefined) {
          // Only the properties the agent DRAWS get a twin: a post-answer row
          // is drawn by neither shape agent. Decided by this file's own table.
          expect(name === 'hintAnswered' && c.afterAnswer !== undefined, `${name} twin missing`).toBe(false);
          return;
        }
        expect(twin).not.toBe(fixture(c.file));
        expect(detectShapes(twin, [c.id])).toBe(false);
        // A twin is a real screen with one property off, never a screen any
        // OTHER shape reads either.
        expect(detectShapes(twin, SHAPE_IDS)).toBe(false);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// 4 — the screens that removed four shapes, rebuilt from the two that stay
// ---------------------------------------------------------------------------

/**
 * The fix round's reason, asked of the shapes that stayed. A session whose
 * agent has exited keeps its shell (Phase 141), and a restored session is his
 * login shell with the resume command armed, so the agent's profile is read
 * over whatever that shell shows. The verifier printed a shape's rows through
 * `cat`, `grep`, `less`, `man`, `git diff` and `vim`, with the hint on the last
 * content row and one prompt or status row below, and the three shapes that
 * allowed one inked row below the hint read all of them as live questions.
 * Both shapes that stayed allow none.
 */
const PRINTED_BELOW: Array<[string, string]> = [
  ['a shell prompt after cat', '~/work % '],
  ['less at the end of the file', '(END)'],
  ['less mid-file', ':'],
  ['vim status line', '"notes.txt" 14L, 612B                                     12,1          All'],
  ['man page footer', ' Manual page confirm(1) line 1 (press h for help or q to quit)']
];

describe('the rows printed by a shell, a pager or an editor read false', () => {
  for (const [id, file] of POSITIVES) {
    const lines = fixture(file).split('\n');
    const question = lines.slice(Math.max(0, lines.length - 24));
    for (const [where, row] of PRINTED_BELOW) {
      it(`${file} under ${where}`, () => {
        expect(detectShapes([...question, row].join('\n'), [id])).toBe(false);
        // Printed with a blank line and the prompt below, as `cat` of a file
        // that ends in a newline draws it.
        expect(detectShapes([...question, '', row].join('\n'), [id])).toBe(false);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// 5 — every shape over every other agent's windows, pinned; the removed agents
// ---------------------------------------------------------------------------

/**
 * PINNED at this phase, 0 everywhere. A later round that widens a shape until
 * it reads another agent's screen moves a number here, which is a red row and
 * a decision rather than a drift.
 */
const CROSS_AGENT_PINNED = 0;

/** `detectDialog` at the parent, copied below; HEAD is it OR the row's shapes. */
const headVerdict = (agent: string, text: string): boolean =>
  detectDialog(text) || detectShapes(text, shapesOf(agent));

describe('every shape over every other agent', () => {
  for (const id of SHAPE_IDS) {
    it(`${id} reads ${String(CROSS_AGENT_PINNED)} windows of any agent it was not measured on`, () => {
      const hits = CORPUS.filter((w) => w.agent !== OWNER[id]).filter((w) => detectShapes(w.text, [id]));
      expect(hits.map((w) => `${w.file}:${w.id}:${w.label}`)).toEqual([]);
      expect(hits.length).toBe(CROSS_AGENT_PINNED);
    });
  }

  it('no shape reads a committed fixture of an agent it was not measured on', () => {
    const hits: string[] = [];
    for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.txt')).sort()) {
      for (const id of SHAPE_IDS) {
        if (detectShapes(fixture(file), [id])) hits.push(`${file}:${id}`);
      }
    }
    expect(hits.sort()).toEqual(POSITIVES.map(([id, file]) => `${file}:${id}`).sort());
  });

  it('the agents whose shapes were removed name none, and read the parent verdict over every window of theirs', () => {
    for (const agent of REMOVED) {
      expect(activityProfileFor(agent).dialogs, agent).toBeUndefined();
      const moved = CORPUS.filter((w) => w.agent === agent)
        .filter((w) => headVerdict(agent, w.text) !== parentVerdict(w.text))
        .map((w) => `${w.file}:${w.id}`);
      expect(moved, agent).toEqual([]);
    }
  });

  it('their question fixtures are read by no shape, as at the parent', () => {
    for (const file of [
      'cursor-trust-gate.txt',
      'cursor-run-permission.txt',
      'opencode-permission.txt',
      'antigravity-trust-gate.txt',
      'antigravity-run-permission.txt',
      'antigravity-signin-choice.txt'
    ]) {
      expect(detectShapes(fixture(file), SHAPE_IDS), file).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6 — the floor: the numbered verdict is the parent's, over the corpus
// ---------------------------------------------------------------------------

/**
 * `detectDialog` at the parent (`ecb6997a`, unchanged since `a31999fc`),
 * copied byte for byte except for the names. Nothing here is shared with the
 * shipping module: an oracle that imports the thing it judges proves nothing.
 */
function parentVerdict(capture: string): boolean {
  const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
  const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
  const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
  const HINT =
    /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
  const QUEST = /(do you (want|trust)|would you like|how would you like)/i;
  const DIALOG_ROWS = 24;
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
    lines.pop();
  }
  const rows = lines.slice(-DIALOG_ROWS).map((l) => l.replace(BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

describe('the floor', () => {
  it('detectDialog equals the parent over every committed window', () => {
    const moved = CORPUS.filter((w) => detectDialog(w.text) !== parentVerdict(w.text)).map(
      (w) => `${w.file}:${w.id}`
    );
    expect(moved).toEqual([]);
  });

  it('detectDialog equals the parent over every committed fixture and every twin', () => {
    const moved: string[] = [];
    for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.txt'))) {
      const text = fixture(file);
      if (detectDialog(text) !== parentVerdict(text)) moved.push(file);
    }
    for (const c of TWINS) {
      for (const [name, twin] of Object.entries(twinsOf(c))) {
        if (detectDialog(twin) !== parentVerdict(twin)) moved.push(`${c.file}:${name}`);
      }
    }
    expect(moved).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7 — no shape reaches an agent its compiled row does not name
// ---------------------------------------------------------------------------

describe('which rows name which shapes', () => {
  it('an empty list answers false before it reads the capture at all', () => {
    const poisoned = {
      split: (): never => {
        throw new Error('the capture was read');
      }
    } as unknown as string;
    expect(detectShapes(poisoned, [])).toBe(false);
    expect(() => detectShapes(poisoned, ['qwen-confirmation'])).toThrow('the capture was read');
  });

  it('the two rows name exactly what the fix round kept, and every other row names none', () => {
    const named: Record<string, readonly string[]> = {};
    for (const row of AGENT_REGISTRY) {
      const d = row.activity?.dialogs;
      if (d !== undefined) named[row.id] = d;
    }
    expect(named).toEqual({
      claude: ['claude-trust-gate'],
      qwen: ['qwen-confirmation']
    });
    // antigravity's repaint is work on every tick, as it was at the parent.
    expect(activityProfileFor('antigravity').animatesWhenIdle).toBe(false);
  });

  it("grok's row is exactly the parent's, and no row carries a field but the parent's and `dialogs`", () => {
    // THE OPERATOR'S RULING OF 2026-09-23: grok's resident-helper rule is
    // removed whole, so grok reads exactly what it read before this phase.
    expect(activityProfileFor('grok')).toEqual({ tier: 'screen', animatesWhenIdle: false, verified: 'unverified' });
    const allowed = new Set(['tier', 'native', 'animatesWhenIdle', 'hooks', 'verified', 'dialogs']);
    for (const row of AGENT_REGISTRY) {
      for (const key of Object.keys(row.activity ?? {})) expect(allowed.has(key), `${row.id}.activity.${key}`).toBe(true);
    }
  });

  it('the shell, the floor and an agent this build has never heard of name none', () => {
    for (const p of [SHELL_ACTIVITY, DEFAULT_ACTIVITY, activityProfileFor('shell'), activityProfileFor('not-an-agent')]) {
      expect(p.dialogs).toBeUndefined();
    }
    for (const id of ['gemini', 'codex', 'pi', 'omp', 'droid', 'deepseek', 'muse', 'grok', ...REMOVED]) {
      expect(activityProfileFor(id).dialogs, id).toBeUndefined();
    }
  });

  it('every shape is read by the agent it was measured on, and by no other row', () => {
    for (const id of SHAPE_IDS) {
      const rows = AGENT_REGISTRY.filter((r) => r.activity?.dialogs?.includes(id) === true).map((r) => r.id);
      expect(rows, id).toEqual([OWNER[id]]);
    }
  });
});

// ---------------------------------------------------------------------------
// The cost, in Phase 312's shape
// ---------------------------------------------------------------------------

const lastNotQuestion = (source: string, agent: string): string => {
  const w = CORPUS.filter((x) => x.source === source && x.agent === agent && x.label === 'not-question');
  return w.at(-1)?.text ?? '';
};

describe('the cost of reading the shapes', () => {
  it('20,000 calls on a question screen and an idle screen, parent against HEAD, in microseconds', () => {
    const N = 20_000;
    const time = (fn: () => void): number => {
      for (let i = 0; i < 500; i++) fn();
      const start = performance.now();
      for (let i = 0; i < N; i++) fn();
      return ((performance.now() - start) * 1000) / N;
    };
    const cases: Array<[string, string, readonly DialogShapeId[]]> = [
      ['qwen permission', fixture('qwen-run-permission.txt'), shapesOf('qwen')],
      ['Claude Code 2.1.280 gate', fixture('claude-trust-2-1-280.txt'), shapesOf('claude')],
      ['qwen at rest', fixture('qwen-idle.txt'), shapesOf('qwen')],
      ['claude at rest', fixture('claude-idle.txt'), shapesOf('claude')],
      ['cursor at rest, no shapes', lastNotQuestion('a', 'cursor'), shapesOf('cursor')],
      ['gemini gate, no shapes', fixture('gemini-trust-gate.txt'), shapesOf('gemini')]
    ];
    const lines: string[] = [];
    for (const [name, text, shapes] of cases) {
      const parent = time(() => {
        detectDialog(text);
      });
      const head = time(() => {
        detectDialog(text);
        detectShapes(text, shapes);
      });
      lines.push(`${name}: parent ${parent.toFixed(2)} µs, HEAD ${head.toFixed(2)} µs`);
      // A sanity bound only, generous on purpose so a loaded runner cannot
      // turn it red: six captures a tick at 1 Hz is the budget it rides.
      expect(head).toBeLessThan(500);
    }
    process.stdout.write(`[p321 cost] ${lines.join(' | ')}\n`);
  });
});
