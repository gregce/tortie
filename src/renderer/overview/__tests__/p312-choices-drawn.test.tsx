/**
 * Phase 312, the face: the choices the agent drew, rendered rather than read.
 *
 * Four things are held here and each one is a refusal from the entry.
 *
 *  - DRAWN, NEVER PRESSABLE. The block contains no button, no anchor, no input,
 *    no role and no handler attribute. Pressing a choice needs a delivery door
 *    that does not exist in the tree, and the entry makes it a later phase with
 *    its own ruling. A list that looks like a menu and answers no press is the
 *    thing the note line exists to prevent.
 *  - THE MARKER IS THE AGENT'S. The list is a <ul> and never an <ol>, because an
 *    <ol> generates numerals from position, and an agent that draws 1, 2, 4
 *    would then be told to press 3.
 *  - NOTHING IS DRAWN FOR A SESSION THAT IS NOT AT A CHOICE, and the proof is a
 *    byte comparison against the markup the same row produced before this phase
 *    rather than an absence test. His no-regression rule is what asks for that.
 *  - EVERY WORD AND EVERY DIGIT IS THE AGENT'S, so the block sits under
 *    data-quoted, which is what the overview probe's integer rule requires of
 *    text nobody in this repository wrote.
 *  - THE BLOCK BELONGS TO ONE ROW, and a marker the agent drew twice still
 *    draws two rows — the key carries the position as well as the marker,
 *    because nothing makes an agent's own numeral unique.
 *
 * THE FIX ROUND ADDED TWO MORE, and both are things the first build shipped
 * without. THE QUESTION IS DRAWN: main composed it, redacted it, capped it and
 * put it on the channel, and no surface read it. AND ALL THREE LEVELS DRAW THE
 * BLOCK: Catch Me Up's level is decided by where the keyboard is (`level.ts`),
 * so pressing the chord while sitting in the session that is asking opens the
 * session level and a split opens the columns level — and the first build drew
 * the options on the project rows alone, which is the one level that gesture
 * never lands on. No unit test could have caught that, because each face renders
 * one level; the arms below render all three.
 *
 * This repository carries no jsdom, so the component renders through
 * `renderToStaticMarkup`, the shape p138-written-line.test.tsx uses.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  OverviewProject,
  OverviewSessionView
} from '@shared/overview';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import type { SessionStatus } from '@shared/types';
import { ProjectLines } from '../ProjectLines';
import { SessionColumns } from '../SessionColumns';
import { SessionConversation } from '../SessionConversation';
import { CHOICE_NOT_PRESSABLE } from '../../choice';

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);

function session(
  over: Partial<OverviewSessionView> = {}
): OverviewSessionView {
  return {
    sessionId: 'one',
    name: 'grok-docs',
    agent: 'grok',
    agentLabel: 'Grok',
    model: null,
    branch: null,
    line: 'no-turns',
    lineDetail: null,
    askOnly: false,
    noTurnClock: false,
    startedAt: NOW - 7_200_000,
    lastTouchedAt: NOW - 600_000,
    turns: [],
    summary: null,
    summaryWrittenAt: null,
    ...over
  };
}

function project(sessions: OverviewSessionView[]): OverviewProject {
  return {
    projectPath: '/x/gmux',
    projectName: 'gmux',
    readAt: NOW,
    isGitRepo: true,
    sessions,
    reads: {}
  };
}

/** The three rows the phone mock draws, as main would deliver them. */
const CHOICE: SessionChoiceInfo = {
  atChoice: true,
  options: [
    { marker: '1', text: 'Yes' },
    { marker: '2', text: 'Yes, and don’t ask again this session' },
    { marker: '3', text: 'No, and tell Grok what to do differently' }
  ]
};

function renderRows(
  sessions: OverviewSessionView[],
  statuses: Record<string, SessionStatus>,
  choices?: Record<string, SessionChoiceInfo>
): string {
  return renderToStaticMarkup(
    <ProjectLines
      project={project(sessions)}
      statuses={statuses}
      choices={choices}
      selected={0}
      onSelect={() => undefined}
      onActivate={() => undefined}
      now={NOW}
    />
  );
}

function render(choices?: Record<string, SessionChoiceInfo>): string {
  return renderRows([session()], { one: 'needs_input' }, choices);
}

const WITH = render({ one: CHOICE });
const WITHOUT = render(undefined);
const NOT_AT_CHOICE = render({ one: { atChoice: false } });

/** Just the Phase 312 block, so a rule about it cannot pass on the row above. */
function choiceBlock(markup: string): string {
  const open = markup.indexOf('<div class="overview-line-choices"');
  if (open === -1) return '';
  const close = markup.indexOf('</ul></div>', open);
  return markup.slice(open, close === -1 ? markup.length : close + 11);
}

describe('the options the agent drew', () => {
  it('draws every option, in the order the agent drew them', () => {
    const at = CHOICE.options.map((o) => WITH.indexOf(o.text));
    for (const i of at) expect(i).toBeGreaterThan(-1);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('draws each marker the agent drew', () => {
    const block = choiceBlock(WITH);
    for (const o of CHOICE.options) {
      expect(block).toContain(
        `<span class="overview-line-option-mark">${o.marker}</span>`
      );
    }
  });

  it('draws one row per option and no more', () => {
    const rows = choiceBlock(WITH).match(/class="overview-line-option"/g);
    expect(rows?.length).toBe(CHOICE.options.length);
  });

  it('says the options are answered in the session, above the list', () => {
    const block = choiceBlock(WITH);
    expect(block).toContain(CHOICE_NOT_PRESSABLE);
    // Said BEFORE the rows are drawn, so a person reads that the list answers
    // no press before they reach the first thing that looks like a button.
    expect(block.indexOf(CHOICE_NOT_PRESSABLE)).toBeLessThan(
      block.indexOf('<ul')
    );
  });

  it('keeps a gap in the numbering rather than renumbering it', () => {
    // The shape an <ol> would get wrong. 4 is drawn as 4, and the markup holds
    // no mark cell saying 2.
    const gapped = render({
      one: {
        atChoice: true,
        options: [
          { marker: '1', text: 'Yes' },
          { marker: '4', text: 'No' }
        ]
      }
    });
    const block = choiceBlock(gapped);
    expect(block).toContain('<span class="overview-line-option-mark">4</span>');
    expect(block).not.toContain(
      '<span class="overview-line-option-mark">2</span>'
    );
  });
});

describe('drawn, never pressable', () => {
  const block = choiceBlock(WITH);

  it('drew a block at all, so the rules below are asking about something', () => {
    expect(block).not.toBe('');
  });

  it('is an unordered list, because the marker is not its position', () => {
    expect(block).toContain('<ul class="overview-line-options">');
    expect(block).not.toContain('<ol');
  });

  for (const shape of [
    '<button',
    '<a ',
    '<a>',
    '<input',
    '<select',
    '<textarea',
    'role=',
    'tabindex',
    'onclick',
    'aria-expanded',
    'href',
    'disabled',
    'contenteditable'
  ]) {
    it(`holds no ${shape.trim()}`, () => {
      expect(block).not.toContain(shape);
    });
  }
});

describe('every word and every digit in the block is the agent’s', () => {
  it('draws the block under data-quoted', () => {
    // React serialises a bare boolean data attribute as `data-quoted="true"`,
    // which is what the page carries and what the probe's integer rule reads.
    expect(WITH).toContain(
      '<div class="overview-line-choices" data-quoted="true">'
    );
  });

  it('puts every marker inside that container', () => {
    // The overview probe allows a digit only inside data-clock, data-date,
    // data-age or data-quoted. Every digit this phase adds is a marker, and
    // every marker is inside the one container above — which the slice proves,
    // because choiceBlock starts AT the data-quoted div.
    const block = choiceBlock(WITH);
    for (const o of CHOICE.options) expect(block).toContain(o.marker);
  });
});

describe('a session that is not at a choice draws what it always drew', () => {
  it('is byte-identical with no choices prop at all', () => {
    expect(NOT_AT_CHOICE).toBe(WITHOUT);
  });

  it('is byte-identical for a caller that hands an empty record', () => {
    // A caller with nothing to say and a caller on a build where main sends
    // nothing are the same row, and neither is the row this phase changed.
    expect(render({})).toBe(WITHOUT);
  });

  it('is byte-identical for a session whose id is not in the record', () => {
    expect(render({ other: CHOICE })).toBe(WITHOUT);
  });

  it('draws no block and none of its words', () => {
    expect(WITHOUT).not.toContain('overview-line-choices');
    expect(WITHOUT).not.toContain(CHOICE_NOT_PRESSABLE);
  });

  it('adds the block and changes NOTHING else about the row', () => {
    // The strongest form of his no-regression rule available offline: the
    // markup with the choices, minus the block, is the markup without them.
    const open = WITH.indexOf('<div class="overview-line-choices"');
    const close = WITH.indexOf('</ul></div>', open) + '</ul></div>'.length;
    expect(WITH.slice(0, open) + WITH.slice(close)).toBe(WITHOUT);
  });
});

describe('the block survives what an agent can draw into it', () => {
  it('escapes markup in an option’s text rather than drawing it', () => {
    const hostile = render({
      one: {
        atChoice: true,
        options: [
          { marker: '1', text: '<button>press me</button>' },
          { marker: '2', text: 'No' }
        ]
      }
    });
    const block = choiceBlock(hostile);
    expect(block).not.toContain('<button');
    expect(block).toContain('&lt;button&gt;');
  });

  it('draws a blank option row without collapsing the list', () => {
    const blank = render({
      one: {
        atChoice: true,
        options: [
          { marker: '1', text: '' },
          { marker: '2', text: 'No' }
        ]
      }
    });
    const rows = choiceBlock(blank).match(/class="overview-line-option"/g);
    expect(rows?.length).toBe(2);
  });

  it('draws two rows when a screen drew the same marker twice', () => {
    // The marker is the agent's own and nothing makes it unique — a screen
    // caught half-repainted can draw `1.` twice. Keyed on the marker alone
    // React collapses them into one row, and a person choosing between two
    // options must be shown two.
    const twice = render({
      one: {
        atChoice: true,
        options: [
          { marker: '1', text: 'Yes' },
          { marker: '1', text: 'Yes' }
        ]
      }
    });
    const rows = choiceBlock(twice).match(/class="overview-line-option"/g);
    expect(rows?.length).toBe(2);
  });
});

describe('the question the options answer', () => {
  const QUESTION = 'Do you want to make this edit to note.txt?';
  const withQuestion = renderToStaticMarkup(
    <ProjectLines
      project={project([session()])}
      statuses={{ one: 'needs_input' }}
      choices={{ one: CHOICE }}
      questions={{ one: QUESTION }}
      selected={0}
      onSelect={() => undefined}
      onActivate={() => undefined}
      now={NOW}
    />
  );

  it('draws it, which nothing in the first build of this phase did', () => {
    // Main composed, redacted and capped this string and put it on the channel,
    // and no surface read it. A field nothing consumes rots before anyone reads
    // it, and research 127 §4's first screen draws this cell.
    expect(choiceBlock(withQuestion)).toContain(QUESTION);
  });

  it('draws it ABOVE the note and the rows it belongs to', () => {
    const block = choiceBlock(withQuestion);
    expect(block.indexOf(QUESTION)).toBeLessThan(
      block.indexOf(CHOICE_NOT_PRESSABLE)
    );
  });

  it('draws it inside the data-quoted container, because it is the agent’s', () => {
    // Every word and every digit of it is the agent's, and choiceBlock starts AT
    // the data-quoted div, so containment is what the slice proves.
    expect(withQuestion).toContain(
      '<div class="overview-line-choices" data-quoted="true">'
    );
    expect(choiceBlock(withQuestion)).toContain(QUESTION);
  });

  it('invents nothing when main sent no question', () => {
    expect(choiceBlock(WITH)).not.toContain('overview-line-choices-question');
  });

  it('draws no BLOCK for a session that is not at a choice, and says it once', () => {
    // REWRITTEN WHEN PHASES 311 AND 312 LANDED TOGETHER, and the old assertion
    // was the pre-311 world: it required the whole row to be byte-identical to a
    // row with no question at all, because while the screen's `QUEST` row was the
    // only source a question could not exist without options under it. A hook
    // fires for tool calls that draw no numbered choice at all, so main now has
    // questions for rows with no rows — which is the whole of why Phase 311's own
    // cell exists — and the honest claim is about WHICH cell draws it.
    const only = renderToStaticMarkup(
      <ProjectLines
        project={project([session()])}
        statuses={{ one: 'needs_input' }}
        questions={{ one: QUESTION }}
        selected={0}
        onSelect={() => undefined}
        onActivate={() => undefined}
        now={NOW}
      />
    );
    // No block, because there is nothing to choose between: no options, no note
    // saying they are not pressable, and no question row belonging to them.
    expect(only).not.toContain('overview-line-choices');
    expect(only).not.toContain(CHOICE_NOT_PRESSABLE);
    // Phase 311's own cell says it instead, exactly once.
    expect(only).toContain('class="overview-line-question"');
    expect(only.split(QUESTION).length - 1).toBe(2); // the title and the text
    // And the rest of the row is what it was without any question at all, so the
    // cell is an addition and not a rewrite of the line.
    expect(only.replace(/<div class="overview-line-question".*?<\/div>/, '')).toBe(
      WITHOUT
    );
  });

  it('says the question ONCE on a row that is at a choice', () => {
    // THE ONE VISIBLE COLLISION THE TWO PHASES HAD. Phase 311 draws the question
    // under the outcome line for any blocked row; Phase 312 draws it above the
    // options as their subject. A row carrying both drew one sentence twice.
    expect(withQuestion).toContain('overview-line-choices-question');
    expect(withQuestion).not.toContain('class="overview-line-question"');
    // Twice in the markup and no more: the block's text and its own title.
    expect(withQuestion.split(QUESTION).length - 1).toBe(2);
  });
});

describe('all three Catch Me Up levels draw the block', () => {
  // THE LEVEL IS DECIDED BY WHERE THE KEYBOARD IS (`level.ts`), so pressing the
  // chord while sitting in the session that is asking opens the SESSION level,
  // and a split opens the COLUMNS level. The first build of this phase drew the
  // options on the project rows alone — the one level that gesture never lands
  // on — and no unit test could see it, because each face renders one level.
  const QUESTION = 'Do you want to run the command?';

  it('draws it at the session level', () => {
    const markup = renderToStaticMarkup(
      <SessionConversation
        session={session()}
        status="needs_input"
        choice={CHOICE}
        question={QUESTION}
        selected={0}
        onSelect={() => undefined}
        onActivate={() => undefined}
        now={NOW}
      />
    );
    const block = choiceBlock(markup);
    expect(block).toContain(QUESTION);
    expect(block).toContain(CHOICE_NOT_PRESSABLE);
    for (const o of CHOICE.options) expect(block).toContain(o.text);
    expect(block).not.toContain('<button');
    expect(block).not.toContain('<ol');
  });

  it('draws it at the columns level, under the column that is asking', () => {
    const a = session({ sessionId: 'one', name: 'grok-docs' });
    const b = session({ sessionId: 'two', name: 'claude-7' });
    const markup = renderToStaticMarkup(
      <SessionColumns
        sessions={[a, b]}
        statuses={{ one: 'needs_input', two: 'running' }}
        choices={{ one: CHOICE }}
        questions={{ one: QUESTION }}
        now={NOW}
      />
    );
    expect((markup.match(/overview-line-choices"/g) ?? []).length).toBe(1);
    expect(markup.indexOf('overview-line-choices')).toBeLessThan(
      markup.indexOf('claude-7')
    );
    expect(choiceBlock(markup)).toContain(QUESTION);
  });

  it('draws nothing at either level for a session that is not at a choice', () => {
    const plain = renderToStaticMarkup(
      <SessionConversation
        session={session()}
        status="needs_input"
        selected={0}
        onSelect={() => undefined}
        onActivate={() => undefined}
        now={NOW}
      />
    );
    expect(plain).not.toContain('overview-line-choices');
    const columns = renderToStaticMarkup(
      <SessionColumns
        sessions={[session()]}
        statuses={{ one: 'needs_input' }}
        now={NOW}
      />
    );
    expect(columns).not.toContain('overview-line-choices');
  });
});

describe('the block belongs to one row', () => {
  it('is drawn under the session at a choice and under no other', () => {
    const a = session({ sessionId: 'one', name: 'grok-docs' });
    const b = session({ sessionId: 'two', name: 'claude-7' });
    const markup = renderRows(
      [a, b],
      { one: 'needs_input', two: 'running' },
      { one: CHOICE }
    );
    // The closing quote matters: a bare `overview-line-choices` also matches
    // `overview-line-choices-note` inside the block and counts one as two.
    expect((markup.match(/overview-line-choices"/g) ?? []).length).toBe(1);
    expect(markup.indexOf('overview-line-choices')).toBeLessThan(
      markup.indexOf('claude-7')
    );
  });
});
