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
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORK_AREA_FONTS, type WorkAreaFont } from '@shared/settings';
import {
  fontOverrides,
  loadWorkAreaFace,
  setWorkAreaFont,
  useWorkAreaFont,
  workFont,
  WORK_FONTS,
  WORK_FONT_TOKENS
} from '../work-fonts';

const BUNDLED: WorkAreaFont[] = ['jetbrains-mono', 'source-code-pro'];

describe('the preset table', () => {
  it('offers exactly the ids the settings type allows, in select order', () => {
    expect(WORK_FONTS.map((f) => f.id)).toEqual([
      'system',
      'jetbrains-mono',
      'source-code-pro'
    ]);
    expect([...WORK_FONTS.map((f) => f.id)].sort()).toEqual(
      [...WORK_AREA_FONTS].sort()
    );
  });

  it('labels each preset with the family a person would recognise', () => {
    expect(WORK_FONTS.map((f) => f.label)).toEqual([
      'System',
      'JetBrains Mono',
      'Source Code Pro'
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
