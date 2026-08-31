/**
 * Phase 174.1's own repair, pinned in the commit battery.
 *
 * WHY THIS FILE EXISTS. The operator reported, with a screenshot, that the
 * Custom font field JUMPED upward the moment the "not installed on this Mac"
 * note appeared while he was typing in it. The whole repair is that the note
 * now holds its line always and is hidden by `visibility` rather than by
 * `display`. That is one CSS rule and one always-rendered element, and a later
 * round tidying either of them back would bring his defect back with every gate
 * green. The only other guard on it is an Electron probe that is not in the
 * commit battery, so this file is what the battery actually runs.
 *
 * It reads settings.css as bytes rather than importing it, because there is no
 * CSSOM in the node lane, and it renders the two elements directly rather than
 * the whole section, because zustand serves a server render its INITIAL state:
 * a store set by a test is invisible to `renderToStaticMarkup`, which is why
 * the section-wide file next door can only prove the field's absence.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { FontMissingNote, FontSuggestionList } from '../AppearanceSection';

const css = readFileSync(join(__dirname, '..', 'settings.css'), 'utf8');
const section = readFileSync(
  join(__dirname, '..', 'AppearanceSection.tsx'),
  'utf8'
);

/** The declaration blocks of every rule whose selector names this class. */
function blocksFor(cls: string): { selector: string; body: string }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(bare)) !== null) {
    const selector = (match[1] ?? '').trim();
    if (selector.includes(cls)) {
      out.push({ selector, body: (match[2] ?? '').trim() });
    }
  }
  return out;
}

describe('the note holds its line', () => {
  it('is hidden by visibility, which is what keeps it in layout', () => {
    const blank = blocksFor('.set-font-missing.blank');
    expect(blank).toHaveLength(1);
    expect(blank[0]?.body.replace(/\s+/g, ' ')).toContain('visibility: hidden');
  });

  it('no rule on it hides it by display, which would take its line away', () => {
    // This is the exact one-line tidy that brings the operator's jump back.
    for (const rule of blocksFor('.set-font-missing')) {
      expect(
        /display\s*:\s*none/.test(rule.body),
        `${rule.selector} { ${rule.body} }`
      ).toBe(false);
    }
  });

  it('the column that holds it is not anchored to its bottom', () => {
    // The other half of the reported defect. `.set-font-custom` is a column, so
    // its MAIN axis is vertical: a `justify-content: flex-end` there anchors the
    // stack to its bottom and any growth pushes the field up. `align-items` is
    // the cross axis and only puts the field against the right edge, which is
    // where the row's other controls sit.
    const stack = blocksFor('.set-font-custom').filter((r) =>
      r.selector
        .split(',')
        .some((one) => one.trim() === '.set-font-custom')
    );
    expect(stack).toHaveLength(1);
    const body = stack[0]?.body ?? '';
    expect(body).toContain('flex-direction: column');
    expect(/justify-content/.test(body)).toBe(false);
  });

  it('is rendered whether or not it has anything to say', () => {
    const quiet = renderToStaticMarkup(<FontMissingNote missing={false} />);
    const speaking = renderToStaticMarkup(<FontMissingNote missing={true} />);
    expect(quiet).toContain('not installed on this Mac');
    expect(speaking).toContain('not installed on this Mac');
    expect(quiet).toContain('class="set-font-missing blank"');
    expect(speaking).toContain('class="set-font-missing"');
    expect(speaking).not.toContain('blank');
  });

  it('says nothing to a screen reader while it is holding its line', () => {
    expect(
      renderToStaticMarkup(<FontMissingNote missing={false} />)
    ).toContain('aria-hidden="true"');
    expect(
      renderToStaticMarkup(<FontMissingNote missing={true} />)
    ).not.toContain('aria-hidden');
  });

  it('the field renders it unconditionally, never behind the note state', () => {
    // `{missing ? <note/> : null}` is the shape that caused the jump.
    expect(section).toContain('<FontMissingNote missing={missing} />');
    expect(section).not.toMatch(/missing\s*\?\s*</);
  });
});

describe('the suggestions', () => {
  const list = {
    monospace: ['Menlo', 'PT Mono'],
    proportional: ['Arial', 'Zapfino']
  };

  it('offers every family, with the monospaced ones leading', () => {
    const html = renderToStaticMarkup(
      <FontSuggestionList suggestions={list} />
    );
    expect(html).toContain('id="set-font-installed"');
    const at = (v: string): number => html.indexOf(`value="${v}"`);
    expect(at('Menlo')).toBeGreaterThan(-1);
    expect(at('PT Mono')).toBeGreaterThan(at('Menlo'));
    expect(at('Arial')).toBeGreaterThan(at('PT Mono'));
    expect(at('Zapfino')).toBeGreaterThan(at('Arial'));
    expect(html.split('<option').length - 1).toBe(4);
  });

  it('is a datalist, so the field stays a text box and never a cage', () => {
    const html = renderToStaticMarkup(
      <FontSuggestionList suggestions={list} />
    );
    expect(html.startsWith('<datalist')).toBe(true);
    expect(section).toContain('list={FONT_SUGGESTION_LIST_ID}');
    expect(section).toContain('type="text"');
  });

  it('an empty list renders an empty datalist, never an error line', () => {
    expect(
      renderToStaticMarkup(
        <FontSuggestionList suggestions={{ monospace: [], proportional: [] }} />
      )
    ).toBe('<datalist id="set-font-installed"></datalist>');
  });

  it('carries no count badge and no paragraph about where the names came from', () => {
    // "Just enough words." Chromium's own indicator inside the field is the
    // whole of the affordance, so the list draws options and no text at all.
    const html = renderToStaticMarkup(
      <FontSuggestionList suggestions={list} />
    );
    expect(html.replace(/<[^>]*>/g, '')).toBe('');
    // And the one line under the field is the ONLY sentence the stack carries.
    const stack = section.slice(
      section.indexOf('<div className="set-font-custom">'),
      section.indexOf('<FontMissingNote')
    );
    expect(stack).not.toMatch(/\{[^}]*\.length[^}]*\}/);
  });
});
