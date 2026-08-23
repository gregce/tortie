/**
 * The rail's refusals, made mechanical (Phase 137.2).
 *
 * The rail shows your words verbatim and clipped, never rendered and never
 * summarised, and it never takes the keyboard on hover. The living proofs
 * run in build/probe-p137-overview.mjs. These source reads hold the shape a
 * later round would be tempted to loosen.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOOTER_SESSION } from '../copy';

const railSource = readFileSync(join(__dirname, '..', 'AskRail.tsx'), 'utf8');
const conversationSource = readFileSync(
  join(__dirname, '..', 'SessionConversation.tsx'),
  'utf8'
);

describe('the ask rail source', () => {
  it('never imports AnswerBody, because asks are never rendered', () => {
    expect(railSource).not.toContain('AnswerBody');
  });

  it('never calls focus(), which is the ProjectRail hover rule', () => {
    expect(railSource).not.toContain('.focus(');
  });

  it('draws the ask under data-quoted and the clock under data-clock', () => {
    expect(railSource).toContain('data-quoted');
    expect(railSource).toContain('data-clock');
  });

  it('lands every press through jumpToAsk, the one landing function', () => {
    expect(railSource).toContain('jumpToAsk(i)');
  });
});

describe('the conversation, tracking (Phase 137.2)', () => {
  it('scrolls the selection through the same landing function the rail uses', () => {
    expect(conversationSource).toContain('scrollTurnIntoView(el, selected)');
  });

  it('holds no scroll or wheel listener, so plain scrolling moves no selection', () => {
    expect(conversationSource).not.toContain('onScroll');
    expect(conversationSource).not.toContain('onWheel');
    expect(railSource).not.toContain('onScroll');
    expect(railSource).not.toContain('onWheel');
  });

  it('guards the header mark so a shell session draws no icon', () => {
    expect(conversationSource).toContain("session.agent !== 'shell'");
  });
});

describe('the session footer', () => {
  it('names the rail key beside the ones it already named', () => {
    expect(FOOTER_SESSION).toContain('⇥');
    expect(FOOTER_SESSION).toContain('esc back');
    expect(FOOTER_SESSION).toContain('⏎ go to this session');
  });
});
