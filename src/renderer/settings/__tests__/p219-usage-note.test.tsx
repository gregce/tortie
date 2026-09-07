/**
 * Settings then Agents then Usage: the line that says why the Claude meter is
 * polling rather than moving when a turn ends (Phase 219, item 8).
 *
 * WHAT IS HELD HERE, and it is a silence rather than a wrong word. Phase 182
 * decided at every claude launch whether to install its managed status line,
 * and when it refused because the person already owns one it wrote a single
 * `usage.tap.not-installed` log line, once per process, and told nobody. Its
 * own verifier recorded that. Twenty seven phases later a person could still
 * turn Claude usage on, watch nothing become live, and find no word anywhere
 * about why. Grepped at bd16e36: no channel, no field and no event in the
 * whole shared contract carried the decision, and the face drew a bare switch
 * with a fixed caption.
 *
 * Two things are pinned. The MAPPING, because it is the part that can be
 * wrong: a refusal must produce a sentence and a non refusal must produce
 * nothing at all, since a note drawn under a meter that is working is worse
 * than no note. And the MARKUP, because a person has to be able to read it and
 * the round's app run has to be able to find it.
 *
 * This repository carries no jsdom, so the row renders through
 * `renderToStaticMarkup` and the effect that asks main never runs here. What
 * main answers is pinned by src/main/activity/__tests__/p219-status-line.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ClaudeStatusLineState } from '@shared/usage';
import { UsageRow, statusLineNote } from '../UsageGroup';
import {
  USAGE_CLAUDE_CAPTION,
  USAGE_CLAUDE_LABEL,
  USAGE_CLAUDE_OWNED_NOTE,
  USAGE_CLAUDE_UNWRITABLE_NOTE
} from '../usage-copy';

describe('the state a person is told about', () => {
  it('gives the person their own status line back in words', () => {
    expect(statusLineNote('person-owns-it')).toBe(USAGE_CLAUDE_OWNED_NOTE);
  });

  it('names the write that failed', () => {
    expect(statusLineNote('unwritable')).toBe(USAGE_CLAUDE_UNWRITABLE_NOTE);
  });

  it('says NOTHING when nothing is in the way', () => {
    // A note under a meter that is working is worse than no note at all.
    expect(statusLineNote('off')).toBeNull();
    expect(statusLineNote('installed')).toBeNull();
  });

  it('has a sentence for every refusal the contract can answer with', () => {
    const states: ClaudeStatusLineState[] = [
      'off',
      'installed',
      'person-owns-it',
      'unwritable'
    ];
    // Exactly the two refusals speak. If a fifth state is ever added, this
    // count moves and somebody has to decide what it says.
    expect(states.filter((s) => statusLineNote(s) !== null)).toHaveLength(2);
  });
});

describe('the line on the face', () => {
  function draw(note: string | null): string {
    return renderToStaticMarkup(
      <UsageRow
        provider="claude"
        label={USAGE_CLAUDE_LABEL}
        caption={USAGE_CLAUDE_CAPTION}
        note={note}
      />
    );
  }

  it('draws the sentence under the caption it is about', () => {
    const markup = draw(statusLineNote('person-owns-it'));
    expect(markup).toContain(USAGE_CLAUDE_OWNED_NOTE);
    expect(markup).toContain(USAGE_CLAUDE_CAPTION);
    // The caption comes first: what the switch does, then what is in the way.
    expect(markup.indexOf(USAGE_CLAUDE_CAPTION)).toBeLessThan(
      markup.indexOf(USAGE_CLAUDE_OWNED_NOTE)
    );
  });

  it('carries the reading hook the round app run finds it by', () => {
    expect(draw(statusLineNote('person-owns-it'))).toContain(
      'data-usage-note="claude"'
    );
  });

  it('draws no element at all when there is nothing to say', () => {
    const markup = draw(statusLineNote('installed'));
    expect(markup).not.toContain('data-usage-note');
    expect(markup).not.toContain(USAGE_CLAUDE_OWNED_NOTE);
    expect(markup).not.toContain(USAGE_CLAUDE_UNWRITABLE_NOTE);
  });

  it('keeps the sentences to one line each, per the just enough words rule', () => {
    for (const note of [USAGE_CLAUDE_OWNED_NOTE, USAGE_CLAUDE_UNWRITABLE_NOTE]) {
      expect(note.split('. ').filter(Boolean)).toHaveLength(1);
      expect(note.length).toBeLessThanOrEqual(110);
    }
  });
});
