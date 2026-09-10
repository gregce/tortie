/**
 * PHASE 251, fault 5. The leaf attribute contract, read off the SHIPPING
 * markup.
 *
 * `npm run conformance:redline` rules 31 and 32 drive `redlineLeaves` under
 * node, which is arithmetic and reaches no React. Nothing else in the battery
 * can see whether the answers ever become ATTRIBUTES, and the whole contract
 * is that ../redline.css keys on names this file emits: a name that drifts
 * breaks a picture in silence and turns two builders' work into one builder's.
 * So this renders `RedlineRuns` and reads the markup.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RedlineRuns } from '../RedlineRow';
import { composeRedlineDocument } from '../redline-document';
import type { RedlineRun } from '../redline';

const draw = (runs: readonly RedlineRun[]): string =>
  renderToStaticMarkup(createElement(RedlineRuns, { runs }));

describe('the leaf attribute contract', () => {
  it('names exactly the five attributes ../redline.css keys on', () => {
    // Every one of them at once, so a rename shows up here and not in a
    // stylesheet nobody ran.
    const markup = draw([
      { kind: 'same', text: 'Spacing' },
      { kind: 'del', text: '   ' },
      { kind: 'ins', text: ' ' },
      { kind: 'same', text: 'here.\n' },
      { kind: 'del', text: '\n' },
      { kind: 'same', text: '| a |\n' },
      { kind: 'del', text: '| --- | --- |' },
      { kind: 'ins', text: '| --- | --- | --- |' },
      { kind: 'same', text: '\n' }
    ]);
    expect(markup).toContain('data-redline-spacing=""');
    expect(markup).toContain('data-redline-blank=""');
    expect(markup).toContain('data-redline-lone=""');
    expect(markup).toContain('data-redline-drop=""');
    expect(markup).toContain('data-redline-wordless=""');
  });

  it('puts them on the marks and never on a plain run', () => {
    const markup = draw([
      { kind: 'same', text: '   \n| | |\n' },
      { kind: 'del', text: '\n' }
    ]);
    expect(markup).toBe(
      '<span>   \n| | |\n</span><del data-redline-del="" contentEditable="false" ' +
        'data-redline-blank="" data-redline-lone="">\n</del>'
    );
  });

  it('says nothing about a mark that has nothing to say', () => {
    expect(draw([{ kind: 'del', text: 'Sessions' }, { kind: 'ins', text: 'Ledger' }])).toBe(
      '<del data-redline-del="" contentEditable="false">Sessions</del>' +
        '<ins data-redline-ins="">Ledger</ins>'
    );
  });

  it('keeps Phase 237’s atomic island on every deletion', () => {
    const markup = draw([{ kind: 'del', text: '\n' }]);
    expect(markup).toContain('contentEditable="false"');
  });

  it('draws the dropped separator’s bytes into the markup, only unseen', () => {
    const before = '| surface | holds |\n| ------- | ----- |\n| manifest | argv |\n';
    const after =
      '| surface | holds | reader |\n| ------- | ----- | ------ |\n| manifest | argv | restore |\n';
    const markup = draw(composeRedlineDocument(before, after).runs);
    expect(markup).toContain('data-redline-drop=""');
    // NOT DRAWN IS NOT ABSENT: the text node is there for the copy handler's
    // clone and for every leaf walk, and only the stylesheet hides it.
    expect(markup).toContain('| ------- | ----- |');
  });

  it('carries no attribute of the family the copy handler removes', () => {
    const markup = draw([{ kind: 'ins', text: '\n' }]);
    expect(markup).not.toContain('data-redline-tag');
    expect(markup).toContain('data-redline-ins=""');
  });
});
