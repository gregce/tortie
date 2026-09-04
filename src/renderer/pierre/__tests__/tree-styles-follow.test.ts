/**
 * Phase 207. The tree host follows the tokens rather than a copy of them.
 *
 * The Pierre tree renders in shadow DOM and takes its colours as host level
 * custom properties. Before this phase they were the theme bridge's static
 * hex, so the tree stayed graphite while the sidebar around it took the
 * hue. Now every neutral and text value the mapper wrote is a `var()` to the
 * token it mirrors, so the tree follows the override path with no second
 * mechanism. This pins the rewrite and the things it must leave alone.
 */

import { describe, expect, it } from 'vitest';
import { treeStyles, treeStylesFollowingTokens } from '../theme-bridge';

describe('treeStyles', () => {
  it('paints the host from the tokens, not from hex', () => {
    expect(treeStyles['backgroundColor']).toBe('var(--bg-sidebar)');
    expect(treeStyles['color']).toBe('var(--text-primary)');
    expect(treeStyles['--trees-theme-sidebar-bg']).toBe('var(--bg-sidebar)');
    expect(treeStyles['--trees-theme-sidebar-fg']).toBe('var(--text-primary)');
    expect(treeStyles['--trees-theme-sidebar-header-fg']).toBe('var(--text-secondary)');
    expect(treeStyles['--trees-theme-list-hover-bg']).toBe('var(--bg-raised)');
    expect(treeStyles['--trees-theme-list-active-selection-bg']).toBe('var(--bg-active)');
    expect(treeStyles['--trees-theme-input-bg']).toBe('var(--bg-surface)');
    expect(treeStyles['--trees-theme-sidebar-border']).toBe('var(--border)');
    expect(treeStyles['--trees-theme-input-border']).toBe('var(--border-strong)');
  });

  it('leaves the git lane, the accent and the layout values alone', () => {
    expect(treeStyles['--trees-theme-git-added-fg']).toBe('#6bc46d');
    expect(treeStyles['--trees-theme-git-renamed-fg']).toBe('#6cb6ff');
    expect(treeStyles['--trees-theme-git-ignored-fg']).toBe('#565b66');
    // Phase 213: no colorScheme of its own, so the host inherits the root's
    // and the tree's light-dark() fallbacks follow the scheme in effect.
    expect(treeStyles['colorScheme']).toBeUndefined();
    for (const value of Object.values(treeStyles)) {
      expect(value).not.toMatch(/^#(131417|0e0f13|191b20|202329|252931|25282e|353943|c9cacd|9ca1ab|838996)$/i);
    }
  });

  it('matches a neutral whatever its case and passes everything else through', () => {
    expect(treeStylesFollowingTokens({ a: '#0E0F13', b: '#0e0f13', c: 'red', d: '' })).toEqual({
      a: 'var(--bg-sidebar)',
      b: 'var(--bg-sidebar)',
      c: 'red',
      d: ''
    });
  });
});
