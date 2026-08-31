/**
 * The three work-area font presets (Phase 78).
 *
 * What these tests hold:
 * - The table offers exactly the three ids the shared settings type allows,
 *   in the order the select draws them, so the picker and the applier can
 *   never disagree about what a preset is.
 * - The System preset derives ZERO overrides. That is the byte-identity
 *   guarantee for an install that never opens the section, and it is the same
 *   promise Phase 62 made for the blue scheme at normal contrast.
 * - A bundled preset derives exactly two tokens, `--font-terminal` and
 *   `--font-editor`, with the same value in both. It never touches
 *   `--font-mono`, which is what keeps the sidebar out of this feature.
 * - Both bundled stacks end in `Menlo, monospace`, because a codepoint neither
 *   family has must land inside the cell rather than push the column grid.
 * - `loadWorkAreaFace` asks the FontFaceSet for the regular and the bold
 *   member by their exact family name, does nothing for System, and swallows
 *   a rejection instead of throwing into a render.
 *
 * The vitest environment is node, so there is no FontFaceSet and no document.
 * The face loader is exercised against a stubbed `document.fonts`, which is
 * the same technique the Phase 62 terminal refresh test uses.
 *
 * Phase 174.1's fix round added the availability rule at the bottom. Its two
 * halves are injected, so the rule is pinned in a lane with no canvas in it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORK_AREA_FONTS, type WorkAreaFont } from '@shared/settings';
import {
  fontOverrides,
  isWorkFontAvailable,
  loadWorkAreaFace,
  setCustomWorkFontFamily,
  setWorkAreaFont,
  useWorkAreaFont,
  workFont,
  WORK_FONTS,
  WORK_FONT_TOKENS,
  type WorkFontAvailabilityDeps
} from '../work-fonts';

const BUNDLED: WorkAreaFont[] = ['jetbrains-mono', 'source-code-pro'];

describe('the preset table', () => {
  it('offers exactly the ids the settings type allows, in select order', () => {
    expect(WORK_FONTS.map((f) => f.id)).toEqual([
      'system',
      'jetbrains-mono',
      'source-code-pro',
      'custom'
    ]);
    expect([...WORK_FONTS.map((f) => f.id)].sort()).toEqual(
      [...WORK_AREA_FONTS].sort()
    );
  });

  it('labels each preset with the family a person would recognise', () => {
    expect(WORK_FONTS.map((f) => f.label)).toEqual([
      'System',
      'JetBrains Mono',
      'Source Code Pro',
      'Custom…'
    ]);
  });

  it('gives the System preset no family and no stack', () => {
    const system = workFont('system');
    expect(system.familyName).toBeNull();
    expect(system.stack).toBeNull();
  });

  it('ends every bundled stack in Menlo, monospace', () => {
    for (const id of BUNDLED) {
      expect(workFont(id).stack).toMatch(/, Menlo, monospace$/);
    }
  });

  it('names the bundled family first in its own stack', () => {
    for (const id of BUNDLED) {
      const preset = workFont(id);
      expect(preset.familyName).not.toBeNull();
      expect(preset.stack).toBe(
        `'${preset.familyName as string}', Menlo, monospace`
      );
    }
  });

  it('reads an unknown id as System rather than throwing', () => {
    expect(workFont('not-a-preset' as WorkAreaFont).id).toBe('system');
  });
});

describe('the custom preset', () => {
  afterEach(() => {
    // Reset the live family store so one test's family cannot leak into the
    // next one's resolution.
    setCustomWorkFontFamily('');
  });

  it('resolves the typed family into a Menlo-terminated stack', () => {
    setCustomWorkFontFamily('Berkeley Mono');
    const preset = workFont('custom');
    expect(preset.familyName).toBe('Berkeley Mono');
    expect(preset.stack).toBe("'Berkeley Mono', Menlo, monospace");
  });

  it('strips quote marks a user pasted around the family name', () => {
    // A pasted `"Berkeley Mono"` must not nest quotes inside the stack — the
    // nested quotes made the first family unparseable and read as "spaced
    // fonts do not work". The resolver strips them to the bare family name.
    setCustomWorkFontFamily('"Berkeley Mono"');
    expect(workFont('custom').familyName).toBe('Berkeley Mono');
    expect(workFont('custom').stack).toBe("'Berkeley Mono', Menlo, monospace");
    setCustomWorkFontFamily("'Berkeley Mono'");
    expect(workFont('custom').familyName).toBe('Berkeley Mono');
  });

  it('writes both work-area tokens for the custom stack', () => {
    setCustomWorkFontFamily('Berkeley Mono');
    const out = fontOverrides('custom');
    expect(out['--font-terminal']).toBe("'Berkeley Mono', Menlo, monospace");
    expect(out['--font-editor']).toBe("'Berkeley Mono', Menlo, monospace");
  });

  it('reads an empty family as Menlo through the stack, never a broken stack', () => {
    setCustomWorkFontFamily('');
    // The family name is the empty string, so the stack's first entry is ''
    // and the browser falls straight through to Menlo — the System preset's
    // own fallback, not an unparseable rule.
    expect(workFont('custom').stack).toBe("'', Menlo, monospace");
    expect(fontOverrides('custom')['--font-terminal']).toBe("'', Menlo, monospace");
  });

  it('awaits the custom face before re-measuring, like a bundled preset', async () => {
    // No FontFaceSet in the node environment, so this proves the no-throw
    // contract rather than a real fetch. The DOM load happens in TerminalPane.
    setCustomWorkFontFamily('Berkeley Mono');
    await expect(loadWorkAreaFace('custom', 13)).resolves.toBeUndefined();
  });
});

describe('fontOverrides', () => {
  it('derives zero overrides for the System preset', () => {
    expect(fontOverrides('system')).toEqual({});
  });

  it('derives exactly the two work-area tokens for a bundled preset', () => {
    for (const id of BUNDLED) {
      const out = fontOverrides(id);
      expect(Object.keys(out).sort()).toEqual(
        [...WORK_FONT_TOKENS].sort()
      );
      expect(out['--font-terminal']).toBe(workFont(id).stack);
      expect(out['--font-editor']).toBe(workFont(id).stack);
    }
  });

  it('never touches the chrome token', () => {
    for (const id of [...BUNDLED, 'system' as WorkAreaFont]) {
      expect(fontOverrides(id)).not.toHaveProperty('--font-mono');
    }
  });
});

describe('loadWorkAreaFace', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A FontFaceSet with only the one method the loader calls. */
  function stubFonts(
    load: (spec: string) => Promise<unknown>
  ): { calls: string[] } {
    const calls: string[] = [];
    vi.stubGlobal('document', {
      fonts: {
        load: (spec: string) => {
          calls.push(spec);
          return load(spec);
        }
      }
    });
    return { calls };
  }

  it('asks for nothing under the System preset', async () => {
    const f = stubFonts(() => Promise.resolve([]));
    await loadWorkAreaFace('system', 13);
    expect(f.calls).toEqual([]);
  });

  it('asks for the regular and the bold member by family name', async () => {
    const f = stubFonts(() => Promise.resolve([]));
    await loadWorkAreaFace('jetbrains-mono', 13);
    expect(f.calls.sort()).toEqual([
      '13px "JetBrains Mono"',
      'bold 13px "JetBrains Mono"'
    ]);
  });

  it('falls back to 13 px when the caller has no size yet', async () => {
    const f = stubFonts(() => Promise.resolve([]));
    await loadWorkAreaFace('source-code-pro', Number.NaN);
    expect(f.calls).toContain('13px "Source Code Pro"');
  });

  it('resolves rather than throwing when a face cannot be loaded', async () => {
    stubFonts(() => Promise.reject(new Error('no such face')));
    await expect(
      loadWorkAreaFace('jetbrains-mono', 13)
    ).resolves.toBeUndefined();
  });

  it('resolves in an environment with no FontFaceSet', async () => {
    vi.stubGlobal('document', {});
    await expect(
      loadWorkAreaFace('jetbrains-mono', 13)
    ).resolves.toBeUndefined();
  });
});

describe('the work-area font store', () => {
  afterEach(() => {
    useWorkAreaFont.setState({ preset: 'system' });
  });

  it('starts on the System preset', () => {
    expect(useWorkAreaFont.getState().preset).toBe('system');
  });

  it('publishes a new preset to its subscribers', () => {
    const seen: WorkAreaFont[] = [];
    const off = useWorkAreaFont.subscribe((s) => seen.push(s.preset));
    try {
      setWorkAreaFont('jetbrains-mono');
      setWorkAreaFont('source-code-pro');
    } finally {
      off();
    }
    expect(seen).toEqual(['jetbrains-mono', 'source-code-pro']);
    expect(useWorkAreaFont.getState().preset).toBe('source-code-pro');
  });

  it('notifies nobody when the preset did not change', () => {
    setWorkAreaFont('jetbrains-mono');
    const seen: WorkAreaFont[] = [];
    const off = useWorkAreaFont.subscribe((s) => seen.push(s.preset));
    try {
      setWorkAreaFont('jetbrains-mono');
    } finally {
      off();
    }
    expect(seen).toEqual([]);
  });
});

describe('the custom preset is hostile-safe at the CSS boundary (Phase 174)', () => {
  afterEach(() => {
    setCustomWorkFontFamily('');
  });

  // workFont('custom') is the one boundary between the typed string and the CSS
  // custom property, xterm's fontFamily, Monaco's option and the capture SVG.
  // Whatever a person (or an agent that edited settings.json) typed, the stack
  // it emits must carry no character that could end the quoted family, start a
  // new declaration, open url(), or break out of the SVG's style attribute.
  const HOSTILE: string[] = [
    "a'; color:red; } body{display:none} foo",
    'url(https://evil.example/x.woff2)',
    'a{}<script>alert(1)</script>b',
    "back\\slash and \"double\" and 'single'",
    'semi;colon;everywhere',
    `newline${String.fromCharCode(10)}and${String.fromCharCode(9)}tab`,
    `esc${String.fromCharCode(27)}[31m`,
    `nul${String.fromCharCode(0)}byte`,
    'x'.repeat(4000)
  ];
  const BREAKOUT = /["'`\\;{}()[\]<>]|[\u0000-\u001F\u007F-\u009F]/;

  it('emits a stack and a family name free of any breakout character', () => {
    for (const attack of HOSTILE) {
      setCustomWorkFontFamily(attack);
      const preset = workFont('custom');
      const family = preset.familyName ?? '';
      const stack = preset.stack ?? '';
      // The family the loader hands document.fonts is clean.
      expect(BREAKOUT.test(family), `family of ${JSON.stringify(attack)}: ${family}`).toBe(false);
      // The stack is exactly one single-quoted family followed by the Menlo
      // floor. The only quotes in it are the two the resolver added.
      expect(stack, JSON.stringify(attack)).toBe(`'${family}', Menlo, monospace`);
      expect((stack.match(/'/g) ?? []).length, `quotes for ${JSON.stringify(attack)}`).toBe(2);
      // And the tokens the applier writes carry that same clean stack.
      const tokens = fontOverrides('custom');
      expect(tokens['--font-terminal']).toBe(stack);
      expect(tokens['--font-editor']).toBe(stack);
    }
  });

  it('caps a pathological family so no token is ever thousands of characters', () => {
    setCustomWorkFontFamily('x'.repeat(4000));
    expect((workFont('custom').familyName ?? '').length).toBeLessThanOrEqual(64);
  });
});

describe('the availability line (Phase 174.1 fix round)', () => {
  // The rule, in one line: the platform's own list of installed families is
  // asked first and its YES ends it; everything else falls through to the
  // canvas measurement. That is what stops the product offering a family in
  // its own dropdown and then saying it is not installed.
  const deps = (
    offered: boolean | null,
    measured: boolean
  ): WorkFontAvailabilityDeps => ({
    offered: () => Promise.resolve(offered),
    measured: () => Promise.resolve(measured)
  });

  it('an icon font the platform names is installed, whatever the canvas says', async () => {
    // 'Symbols Nerd Font' on the operator's own Mac: in ~/Library/Fonts,
    // enabled, offered by the field's own suggestion list, and measured as
    // absent because it carries no Latin glyph for the probe sample to draw.
    expect(await isWorkFontAvailable('Symbols Nerd Font', deps(true, false)))
      .toBe(true);
  });

  it('a list that could not answer sends the decision to the measurement', async () => {
    expect(await isWorkFontAvailable('Zznonexistent', deps(null, false))).toBe(
      false
    );
    expect(await isWorkFontAvailable('Menlo', deps(null, true))).toBe(true);
  });

  it('a family the list does not carry is measured, never called missing', async () => {
    // The list holds no face the app bundles, so a false from it is "unknown".
    expect(await isWorkFontAvailable('JetBrains Mono', deps(false, true))).toBe(
      true
    );
    expect(await isWorkFontAvailable('Zznonexistent', deps(false, false))).toBe(
      false
    );
  });

  it('an empty family says nothing and asks neither half', async () => {
    const offered = vi.fn(() => Promise.resolve(null));
    const measured = vi.fn(() => Promise.resolve(false));
    expect(await isWorkFontAvailable('   ', { offered, measured })).toBe(true);
    expect(offered).not.toHaveBeenCalled();
    expect(measured).not.toHaveBeenCalled();
  });

  it('both halves are asked with the CLEANED name, never the raw one', async () => {
    const offered = vi.fn(() => Promise.resolve(null));
    const measured = vi.fn(() => Promise.resolve(true));
    await isWorkFontAvailable("  'Menlo';  ", { offered, measured });
    expect(offered).toHaveBeenCalledWith('Menlo');
    expect(measured).toHaveBeenCalledWith('Menlo');
  });
});
