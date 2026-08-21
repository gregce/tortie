/**
 * Phase 129 item 1. Settings → Agents is a row of pages.
 *
 * What these tests hold:
 * - One page draws no tab list at all. A row of one tab is a label pretending
 *   to be a control, and a person with no machine must keep the tab they had.
 * - Two or more pages draw a tab list in the order they were handed in, with
 *   this Mac first.
 * - Only the selected tab is in the tab order, so one Tab press leaves the row
 *   rather than walking up to 33 buttons.
 * - Every tab points at the panel it controls and the panel points back.
 * - A machine tab carries that machine's colour dot, and this Mac carries none.
 * - The control is a button list and never a `select`, because a person must
 *   be able to see how many machines they have.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. The keyboard is exercised in the real Settings window by
 * `node build/probe-p129-agents.mjs`, because a key press needs a document.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AgentPages,
  agentPagePanelId,
  agentPageTabId,
  type AgentPage
} from '../AgentPages';
import { AGENTS_PAGES_LABEL, AGENTS_PAGE_THIS_MAC } from '../machines-copy';

const THIS_MAC: AgentPage = { id: 'local', label: AGENTS_PAGE_THIS_MAC };
const ALPHA: AgentPage = { id: 'alpha', label: 'Alpha', color: 'blue' };
const BETA: AgentPage = { id: 'beta', label: 'Beta', color: 'red' };

function draw(pages: readonly AgentPage[], activeId = 'local'): string {
  return renderToStaticMarkup(
    <AgentPages pages={pages} activeId={activeId} onSelect={() => undefined} />
  );
}

describe('one page draws no control', () => {
  it('draws nothing for a person with no machine', () => {
    expect(draw([THIS_MAC])).toBe('');
  });

  it('draws nothing for an empty list', () => {
    expect(draw([])).toBe('');
  });
});

describe('two or more pages draw a tab list', () => {
  it('draws one tab per page, in the order they were handed in', () => {
    const html = draw([THIS_MAC, ALPHA, BETA]);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.indexOf('Alpha')).toBeGreaterThan(html.indexOf('This Mac'));
    expect(html.indexOf('Beta')).toBeGreaterThan(html.indexOf('Alpha'));
  });

  it('says what the row is, for a person reading rather than looking', () => {
    expect(draw([THIS_MAC, ALPHA])).toContain(AGENTS_PAGES_LABEL);
    expect(draw([THIS_MAC, ALPHA])).toContain('role="tablist"');
  });

  it('is a list of buttons and never a dropdown', () => {
    const html = draw([THIS_MAC, ALPHA]);
    expect(html).not.toContain('<select');
    expect(html.match(/<button/g)).toHaveLength(2);
  });
});

describe('the keyboard and the reading order', () => {
  it('puts only the selected tab in the tab order', () => {
    const html = draw([THIS_MAC, ALPHA, BETA], 'alpha');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  });

  it('marks exactly one tab selected', () => {
    const html = draw([THIS_MAC, ALPHA, BETA], 'beta');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
  });

  it('points each tab at the panel it controls', () => {
    const html = draw([THIS_MAC, ALPHA], 'alpha');
    expect(html).toContain(`id="${agentPageTabId('alpha')}"`);
    expect(html).toContain(`aria-controls="${agentPagePanelId('alpha')}"`);
  });
});

describe('the machine dot', () => {
  it('draws one per machine, in that machine’s own colour', () => {
    const html = draw([THIS_MAC, ALPHA, BETA]);
    expect(html).toContain('data-machine-color="blue"');
    expect(html).toContain('data-machine-color="red"');
    expect(html.match(/class="mach-dot"/g)).toHaveLength(2);
  });

  it('draws none for this Mac, because this Mac has no colour', () => {
    const html = draw([THIS_MAC, ALPHA]);
    const thisMacTab = html.slice(0, html.indexOf('data-agent-page="alpha"'));
    expect(thisMacTab).not.toContain('mach-dot');
  });
});
