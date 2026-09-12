/**
 * THE RUNG CHIP (Phase 258): what each of the five computed evidence rungs
 * of research 118 §7.2 looks like and says on the renderer's surfaces.
 *
 * One table, read by the map's node chip, the sidebar's component rows, the
 * contract outline and the inspector, so the five rungs cannot wear six
 * dresses. Every entry is a glyph, a word, ONE hover sentence of at most
 * eleven words, and one of two EXISTING tokens: `--status-idle` for the
 * three rungs that say nothing reaches the part, `--success` for the two
 * that say something does. Colour is never the only signal, which is why
 * the glyph and the word are here beside it (DESIGN.md 1.3, and the Phase
 * 218 floor of 3:1 on `--bg-active` that both tokens are pinned to in
 * `../theme/presets.ts`).
 *
 * NO NUMBER ON THE FACE. The counts line rides the hover beside the
 * sentence, and the word is drawn only in the inspector; the chip on a node
 * is the glyph alone, which is how the "no count badge on any node" refusal
 * survives this phase.
 *
 * The rung itself is COMPUTED IN MAIN (`src/main/arch/evidence.ts`) from the
 * import graph, the entrypoint facts and the test facts, never from anything
 * a person or a model wrote. Nothing here decides a rung; this file only
 * dresses the one it is handed, and it refuses a word it does not know by
 * drawing nothing rather than guessing.
 */

import { ARCH_EVIDENCE_RUNGS } from '@shared/arch';
import type { ArchEvidenceRung, ArchRungReading } from '@shared/arch';

/** The two tokens a rung may draw in, and no third. */
export type RungTone = 'quiet' | 'reached';

/** One rung's dress: the codicon, the tone, the word and the hover sentence. */
export interface RungFace {
  icon: string;
  tone: RungTone;
  word: string;
  sentence: string;
}

/**
 * The table, in ladder order. The sentences are SPEC §1.4's, each at most
 * eleven words, and the unit suite counts them.
 */
export const RUNG_FACES: Readonly<Record<ArchEvidenceRung, RungFace>> = {
  'off-repo': {
    icon: 'circle-slash',
    tone: 'quiet',
    word: 'off repository',
    sentence: 'No file this part names is tracked here.'
  },
  declared: {
    icon: 'circle-outline',
    tone: 'quiet',
    word: 'declared',
    sentence: 'Here, and nothing imports it or names it.'
  },
  composed: {
    icon: 'circle-filled',
    tone: 'quiet',
    word: 'composed',
    sentence: 'Imported or named; nothing that starts reaches it.'
  },
  reached: {
    icon: 'arrow-right',
    tone: 'reached',
    word: 'reached',
    sentence: 'On a path from something this unit starts.'
  },
  tested: {
    icon: 'check',
    tone: 'reached',
    word: 'tested',
    sentence: 'Reached, and a test imports it.'
  }
};

/** The token each tone draws in. Two, and the CSS class names the same two. */
export const RUNG_TONE_TOKEN: Readonly<Record<RungTone, string>> = {
  quiet: '--status-idle',
  reached: '--success'
};

/** Is this string one of the five words main may answer? */
export function isRung(value: string): value is ArchEvidenceRung {
  return (ARCH_EVIDENCE_RUNGS as readonly string[]).includes(value);
}

/** The face for a rung, or null for a word this build does not know. */
export function rungFace(rung: string): RungFace | null {
  return isRung(rung) ? RUNG_FACES[rung] : null;
}

/** The class a chip wears: `arch-rung` and its tone. */
export function rungClass(rung: ArchEvidenceRung): string {
  return `arch-rung arch-rung-${RUNG_FACES[rung].tone}`;
}

/** The sentence a chip says when the walk had nothing to start from. */
export const RUNG_NO_SEEDS = 'nothing this reader recognises starts this unit';

/** Thousands grouped the way the rest of the pane prints a count. */
export function countWord(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * The counts line behind the hover: `reached 583 of 1,068 parsed · 395
 * imported by a test · 3 seeds`, or the no-seeds sentence in place of the
 * seed count when nothing recognised starts the unit.
 */
export function rungCountsLine(r: ArchRungReading): string {
  const seeds =
    r.seeds === 0
      ? RUNG_NO_SEEDS
      : `${countWord(r.seeds)} ${r.seeds === 1 ? 'seed' : 'seeds'}`;
  return `reached ${countWord(r.reached)} of ${countWord(r.parsed)} parsed · ${countWord(r.tested)} imported by a test · ${seeds}`;
}

/** The whole hover: the sentence, then the counts line. */
export function rungTitle(r: ArchRungReading): string {
  return `${RUNG_FACES[r.rung].sentence}\n${rungCountsLine(r)}`;
}

/** The inspector's own line under the sentence: `reached 583 of 1,068 · 3 seeds`. */
export function rungShortLine(r: ArchRungReading): string {
  const seeds =
    r.seeds === 0
      ? RUNG_NO_SEEDS
      : `${countWord(r.seeds)} ${r.seeds === 1 ? 'seed' : 'seeds'}`;
  return `reached ${countWord(r.reached)} of ${countWord(r.parsed)} · ${seeds}`;
}
