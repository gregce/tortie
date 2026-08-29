/**
 * Settings then Diagnostics gained one row (Phase 163): the door to the
 * report tab in the app window. Rendered through `renderToStaticMarkup`
 * because this repository carries no jsdom. Pinned: the row is there, it is
 * one line, and the section still draws the three Logging affordances that
 * were there before, so the door did not displace anything.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.stubGlobal('window', {
  gmux: {
    log: {
      level: async () => 'info',
      setLevel: async () => undefined,
      openFolder: async () => undefined,
      diagnostics: async () => ''
    },
    showDiagnostics: async () => undefined
  }
});

const { DiagnosticsSection } = await import('../DiagnosticsSection');

describe('the door row', () => {
  it('draws one row above Logging that opens the report', () => {
    const html = renderToStaticMarkup(createElement(DiagnosticsSection));
    expect(html).toContain('Open report');
    expect(html).toContain('What Tortie is running');
    expect(html.indexOf('Report')).toBeLessThan(html.indexOf('Logging'));
    expect(html).toContain('Debug logging');
    expect(html).toContain('Open logs folder');
    expect(html).toContain('Copy diagnostics');
  });
});
