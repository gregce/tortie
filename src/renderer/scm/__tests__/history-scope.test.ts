import { describe, expect, it } from 'vitest';
import type { GitLogScope } from '@shared/types';
import {
  DEFAULT_HISTORY_SCOPE,
  HISTORY_SCOPES,
  scopeHint,
  scopeLabel,
  scopeTag
} from '../history-scope';

describe('history scope vocabulary', () => {
  it('offers exactly the three scopes, default first', () => {
    expect(HISTORY_SCOPES).toEqual(['branch', 'local', 'everything']);
    expect(DEFAULT_HISTORY_SCOPE).toBe('branch');
    expect(HISTORY_SCOPES[0]).toBe(DEFAULT_HISTORY_SCOPE);
  });

  it('names them in the product’s words, not git’s', () => {
    expect(scopeLabel('branch')).toBe('This branch + upstream');
    expect(scopeLabel('local')).toBe('All local branches');
    expect(scopeLabel('everything')).toBe('Everything');
    // No refspec vocabulary leaks into the UI.
    for (const s of HISTORY_SCOPES) {
      expect(scopeLabel(s)).not.toMatch(/refs\/|--all|HEAD|@\{u\}/);
      expect(scopeHint(s)).not.toMatch(/refs\/|--all|@\{u\}/);
    }
  });

  it('tags only the non-default scopes in the header', () => {
    // The default needs no label — it is what the section has always shown.
    // A WIDENED scope changes what the list contains, so it must say so.
    expect(scopeTag('branch')).toBe('');
    expect(scopeTag('local')).not.toBe('');
    expect(scopeTag('everything')).not.toBe('');
  });

  it('has a hint for every scope', () => {
    for (const s of HISTORY_SCOPES satisfies readonly GitLogScope[]) {
      expect(scopeHint(s).length).toBeGreaterThan(0);
    }
  });
});
