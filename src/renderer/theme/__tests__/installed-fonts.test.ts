/**
 * Phase 174.1 — the installed-family suggestions under the Custom font field.
 *
 * What is pinned here, and every one of these is a rule a later round could
 * undo in one line:
 * - a family name out of a font file is UNTRUSTED TEXT, and it crosses the same
 *   boundary Phase 174 built for the typed string, so the whole hostile corpus
 *   that phase carries reaches an <option value> with nothing dangerous left;
 * - a name that cleans away to nothing is dropped rather than offered blank;
 * - one family is offered once, however many faces of it are installed;
 * - MONOSPACE LEADS, and the rest are not hidden;
 * - a rejection is "no suggestions yet", not an error, and it is NOT cached, so
 *   a page that was hidden gets a real answer when it comes to the front;
 * - a success IS cached, so the field asks the platform once;
 * - one family is offered once however it is SPELLED, because CSS family
 *   matching ignores case (Phase 174.1 fix round);
 * - the availability line under the field reads this same cached list, so the
 *   product cannot offer a family and then say it is not installed, and a list
 *   that could not answer says so rather than saying no.
 *
 * The two effects — the platform call and the fixed-pitch measurement — are
 * injected, so this file exercises the real code in the node lane with no
 * window and no canvas anywhere in it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NO_FONT_SUGGESTIONS,
  isFamilyOfferedByPlatform,
  loadFontSuggestions,
  readFontSuggestions,
  resetFontSuggestions,
  type FontSuggestionDeps
} from '../installed-fonts';

/** Nothing a family name may still carry once it has been cleaned. */
const BREAKOUT = /["'`\\;{}()[\]<>]|[\u0000-\u001F\u007F-\u009F]/;

function deps(
  families: readonly unknown[],
  monospaced: readonly string[] = []
): FontSuggestionDeps {
  return {
    query: () => Promise.resolve(families.map((family) => ({ family }))),
    monospaced: (family) => monospaced.includes(family)
  };
}

afterEach(() => {
  resetFontSuggestions();
});

describe('what comes back is untrusted text', () => {
  const NL = String.fromCharCode(10);
  const TAB = String.fromCharCode(9);
  const CR = String.fromCharCode(13);
  const ESC = String.fromCharCode(27);
  const NUL = String.fromCharCode(0);
  // The Phase 174 corpus, as a font file could carry it rather than as a
  // person could type it. Both halves of that phase's own shapes are here.
  const HOSTILE: string[] = [
    "a'; color:red; } body{display:none} foo",
    'url(https://evil.example/x.woff2)',
    'a{}<script>alert(1)</script>b',
    'back\\slash and "double" and \'single\'',
    'semi;colon;everywhere',
    'brace{here}',
    `line${NL}break${TAB}tab${CR}cr`,
    `esc${ESC}[31mred`,
    `nul${NUL}byte`,
    'x'.repeat(4000)
  ];

  it('every hostile family is cleaned before it can be offered', async () => {
    const found = await readFontSuggestions(deps(HOSTILE));
    expect(found).not.toBeNull();
    const offered = [
      ...(found?.monospace ?? []),
      ...(found?.proportional ?? [])
    ];
    expect(offered.length).toBeGreaterThan(0);
    for (const name of offered) {
      expect(BREAKOUT.test(name), JSON.stringify(name)).toBe(false);
      expect(name.length).toBeLessThanOrEqual(64);
      expect(name).toBe(name.trim());
    }
  });

  it('a name that cleans away to nothing is dropped, never offered blank', async () => {
    const found = await readFontSuggestions(deps(['<>{}', '   ', '', 'Menlo']));
    expect(found?.proportional).toEqual(['Menlo']);
    expect(found?.monospace).toEqual([]);
  });

  it('a row that is not a string, or not a row at all, is dropped', async () => {
    const found = await readFontSuggestions(
      deps([42, null, undefined, {}, 'Menlo'])
    );
    expect(found?.proportional).toEqual(['Menlo']);
  });
});

describe('the list itself', () => {
  it('offers one family once, however many faces are installed', async () => {
    const found = await readFontSuggestions(
      deps(['Menlo', 'Menlo', 'Menlo', '"Menlo"'])
    );
    expect(found?.proportional).toEqual(['Menlo']);
  });

  it('two spellings of one family are offered once (Phase 174.1 fix round)', async () => {
    // CSS family matching ignores case, so 'Menlo' and 'menlo' name one face
    // and offering both would put two dropdown rows on the same font. The
    // first spelling the platform gave is the one that survives.
    const found = await readFontSuggestions(
      deps(['Menlo', 'menlo', 'MENLO', 'MenLo', 'Arial'])
    );
    expect(found?.proportional).toEqual(['Arial', 'Menlo']);
  });

  it('monospace leads and the rest are not hidden', async () => {
    const found = await readFontSuggestions(
      deps(
        ['Helvetica', 'Menlo', 'Arial', 'SF Mono', 'Georgia'],
        ['Menlo', 'SF Mono']
      )
    );
    expect(found?.monospace).toEqual(['Menlo', 'SF Mono']);
    expect(found?.proportional).toEqual(['Arial', 'Georgia', 'Helvetica']);
  });
});

describe('the page has to be visible, so a failure is never final', () => {
  it('no platform call at all reads as no suggestions', async () => {
    expect(
      await readFontSuggestions({ query: null, monospaced: () => false })
    ).toBeNull();
    expect(
      await loadFontSuggestions({ query: null, monospaced: () => false })
    ).toEqual(NO_FONT_SUGGESTIONS);
  });

  it('a hidden page rejects, answers empty, and is asked again', async () => {
    const hidden = vi.fn(() =>
      Promise.reject(new Error('SecurityError: Page needs to be visible.'))
    );
    const first = await loadFontSuggestions({
      query: hidden,
      monospaced: () => false
    });
    expect(first).toEqual(NO_FONT_SUGGESTIONS);
    expect(hidden).toHaveBeenCalledTimes(1);
    // The window came to the front. The rejection was not cached, so the second
    // ask reaches the platform and the person gets their families.
    const second = await loadFontSuggestions(deps(['Menlo'], ['Menlo']));
    expect(second.monospace).toEqual(['Menlo']);
  });

  it('a success is cached, so the platform is asked once', async () => {
    const query = vi.fn(() => Promise.resolve([{ family: 'Menlo' }]));
    const once = { query, monospaced: (): boolean => true };
    expect((await loadFontSuggestions(once)).monospace).toEqual(['Menlo']);
    expect((await loadFontSuggestions(once)).monospace).toEqual(['Menlo']);
    expect((await loadFontSuggestions(once)).monospace).toEqual(['Menlo']);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('the availability answer shares the one cached read', async () => {
    // The field's "not installed on this Mac" line asks this, once per
    // keystroke. It must never cost a second platform call.
    const query = vi.fn(() =>
      Promise.resolve([{ family: 'Symbols Nerd Font' }, { family: 'Menlo' }])
    );
    const once = { query, monospaced: (): boolean => false };
    expect(await isFamilyOfferedByPlatform('Symbols Nerd Font', once)).toBe(
      true
    );
    expect(await isFamilyOfferedByPlatform('symbols nerd font', once)).toBe(
      true
    );
    expect(await isFamilyOfferedByPlatform('Zznonexistent', once)).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('a list that could not answer says null, never false', async () => {
    // False would read as "not installed" and put the note on a family the
    // platform simply was not able to talk about.
    expect(
      await isFamilyOfferedByPlatform('Menlo', {
        query: null,
        monospaced: () => false
      })
    ).toBeNull();
    resetFontSuggestions();
    expect(
      await isFamilyOfferedByPlatform('Menlo', {
        query: () => Promise.reject(new Error('Page needs to be visible.')),
        monospaced: () => false
      })
    ).toBeNull();
    // An empty name is nothing typed, which is not a question.
    resetFontSuggestions();
    expect(
      await isFamilyOfferedByPlatform('  ', deps(['Menlo']))
    ).toBeNull();
  });

  it('two asks in flight at once share one platform call', async () => {
    const query = vi.fn(() => Promise.resolve([{ family: 'Menlo' }]));
    const once = { query, monospaced: (): boolean => false };
    const [a, b] = await Promise.all([
      loadFontSuggestions(once),
      loadFontSuggestions(once)
    ]);
    expect(a).toBe(b);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
