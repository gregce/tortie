/**
 * THE CITATION CHIP (Phase 259): what each grade of backing looks like and
 * says, and how a rate is written down beside the share chance would give.
 *
 * One table, read by the journey steps, the gate reasons and the inspector's
 * four model rows, so four grades cannot wear five dresses. It is `rung.ts`'s
 * shape deliberately and it is NOT `rung.ts`: a rung is main's computed answer
 * about a part, and a grade is how rare it is to land within
 * {@link ARCH_CITE_SLACK} lines of a fact by chance. The two tables share the
 * two tokens and nothing else.
 *
 * ## THE ONE THING EVERY STRING HERE REFUSES TO SAY
 *
 * A chip is ATTRIBUTION AND NEVER VERIFICATION. Research 118 §6.4 ran seven
 * deliberately false readings past its own checker and it caught TWO. THIS
 * product's refusals are not that checker: driven over the same seven plants
 * by `conformance:semantic` rule 7 they catch 5 of 7, being wrong-part,
 * wrong-backing, wrong-order, accepted-live and invented-numbers. TWO OF THE
 * FIVE ARE CAUGHT BY THEIR CITATION AND NOT BY THEIR CLAIM: R4 drops a row
 * whose citation names a file the block never handed over, which is what a
 * composed location looks like, while the sentence's own error goes on being
 * invisible. The two still missed are what a confident wrong reading looks
 * like, and a part renamed "Billing and card capture" on true citations of
 * files it really was handed keeps every green chip it had. So the face and every hover say that a
 * fact was found at a line, and nothing stronger, ever. The words this file
 * may not use are the ones a reader would take as a verdict about the
 * sentence rather than about the line, and `conformance:semantic` rule 6c
 * scans for them over every string this table and its composers can draw.
 *
 * ## COLOUR IS NEVER THE ONLY SIGNAL
 *
 * Five entries, five glyphs, five words, two tokens. `--success` for the two
 * grades chance almost never reaches, `--status-idle` for the two it often
 * does and for a stale chip. Both are pinned at 3:1 on `--bg-active` at every
 * offered frame by `../theme/presets.ts` (Phase 218), so no token moves here
 * and `conformance:hue` is untouched. A call site and a declaration differ in
 * glyph, in word AND in tone, because research 118 §7.3 measured them at 9.6x
 * and 2.46x over chance and drawing them alike would hide the whole of that
 * difference.
 *
 * ## A RATE IS NEVER DRAWN WITHOUT ITS FLOOR
 *
 * {@link citeRate} takes an {@link ArchRateReading} whole, which carries both
 * halves or does not compile. `24 of 41 backed` alone is a number a reader
 * will take for a score; `24 of 41 backed · 10 of 41 would be by chance` is
 * the same number with the thing it has to beat printed beside it.
 */

import { ARCH_CITE_GRADES } from '@shared/arch';
import type {
  ArchCiteGrade,
  ArchCiteReading,
  ArchRateReading
} from '@shared/arch';

/** The two tokens a chip may draw in, and no third. `rung.ts`'s two. */
export type CiteTone = 'quiet' | 'reached';

/** One grade's dress: the codicon, the tone, the word and the hover sentence. */
export interface CiteFace {
  icon: string;
  tone: CiteTone;
  word: string;
  sentence: string;
}

/** The stale chip is a fifth face rather than a fifth grade: a claim keeps its grade. */
export type CiteFaceKey = ArchCiteGrade | 'stale';

/**
 * The table, rarest grade first, with the stale face last (SPEC §6.4).
 *
 * Every sentence is about the LINE and never about the claim. "A gate was
 * found at this line" is a reading; "this is right" is a verdict nothing in
 * this product can give.
 */
export const CITE_FACES: Readonly<Record<CiteFaceKey, CiteFace>> = {
  gate: {
    icon: 'shield',
    tone: 'reached',
    word: 'gate',
    sentence: 'A gate was found at this line.'
  },
  'call-site': {
    icon: 'symbol-event',
    tone: 'reached',
    word: 'call',
    sentence: 'A call was found at this line.'
  },
  declaration: {
    icon: 'symbol-method',
    tone: 'quiet',
    word: 'declaration',
    sentence: 'A declaration was found at this line.'
  },
  resolves: {
    icon: 'circle-outline',
    tone: 'quiet',
    word: 'line only',
    sentence: 'This line is here. Nothing was found at it.'
  },
  stale: {
    icon: 'history',
    tone: 'quiet',
    word: 'stale',
    sentence: 'The line this cites no longer carries that fact.'
  }
};

/** The token each tone draws in. Two, and the CSS class names the same two. */
export const CITE_TONE_TOKEN: Readonly<Record<CiteTone, string>> = {
  quiet: '--status-idle',
  reached: '--success'
};

/** Is this string one of the four grades main may answer? */
export function isCiteGrade(value: string): value is ArchCiteGrade {
  return (ARCH_CITE_GRADES as readonly string[]).includes(value);
}

/** The face for a grade, or null for a word this build does not know. */
export function citeFace(grade: string): CiteFace | null {
  return isCiteGrade(grade) ? CITE_FACES[grade] : null;
}

/** The face a citation actually wears: stale beats the grade, because it is news. */
export function citeFaceOf(cite: ArchCiteReading): CiteFace | null {
  return cite.dead ? CITE_FACES.stale : citeFace(cite.grade);
}

/** The class a chip wears: `arch-cite` and its tone. */
export function citeClass(tone: CiteTone): string {
  return `arch-cite arch-cite-${tone}`;
}

/**
 * The one prefix that says whose sentence the next line is. Phase 259's fix
 * round: `conformance:semantic` rule 6c holds every string in this folder to
 * saying nothing stronger than a fact was found, and the model's own `why`
 * rides the same hover under no such rule — a reading that wrote
 * "this sentence is right" would have been drawn inside Tortie's own tooltip
 * with nothing between the two halves. Attribution costs three words and it
 * is the same three the row already wears.
 */
export const CITE_WHY_PREFIX = 'the reading says:';

/**
 * The whole hover on one chip: the grade's sentence, the fact that was found
 * and where, and LAST the model's own `why` under its attribution.
 *
 * The `why` is bytes a model wrote and renders as a text node or a title
 * attribute, both of which the browser escapes. It is drawn last and prefixed
 * because everything above it is Tortie's own reading of the line and it is
 * not; a person who reads one line of a tooltip should read ours.
 */
export function citeTitle(cite: ArchCiteReading): string {
  const face = citeFaceOf(cite);
  const lines: string[] = [];
  if (face !== null) lines.push(face.sentence);
  lines.push(cite.at);
  if (cite.factKind !== null && cite.factSubject !== null) {
    lines.push(`${cite.factKind} ${cite.factSubject}`);
  }
  if (cite.why.length > 0) lines.push(`${CITE_WHY_PREFIX} ${cite.why}`);
  return lines.join('\n');
}

/** The share of lines in the cited files that sit within the slack of a fact. */
export function citeChance(rate: ArchRateReading): number {
  return rate.floorLines === 0 ? 0 : rate.floorWithin / rate.floorLines;
}

/** How many of `total` citations that share would back on its own, rounded. */
export function citeChanceCount(rate: ArchRateReading): number {
  return Math.round(rate.total * citeChance(rate));
}

/**
 * One share as a count out of `total`, with the honest word when it rounds to
 * none.
 *
 * Phase 259's fix round: a share of 12.6% over two citations rounds to zero
 * and the face then read `0 of 2 would be by chance` over files where an
 * eighth of every line is within the slack of a row. `under 1 of 2` says the
 * same arithmetic without saying chance gives nothing.
 */
export function chanceOf(total: number, share: number): string {
  const of = total.toLocaleString('en-US');
  const count = Math.round(total * share);
  if (count === 0 && share > 0 && total > 0) return `under 1 of ${of}`;
  return `${count.toLocaleString('en-US')} of ${of}`;
}

/**
 * Is this reading at or under the share chance gives on its own?
 *
 * Drawn because the pair alone does not say it. `5 of 40 backed · 5 of 40
 * would be by chance` and `39 of 40 backed · 5 of 40 would be by chance` are
 * the same two halves in the same order and one of them is a reading that beat
 * nothing. It is a reading of the two numbers already on the face and never a
 * word about the sentences.
 */
export function citeAtChance(rate: ArchRateReading): boolean {
  return rate.total > 0 && rate.backed <= citeChanceCount(rate);
}

/**
 * The pair, and there is no single-half form of this function on purpose:
 * `24 of 41 backed · 10 of 41 would be by chance`, and the third clause when
 * the first number did not beat the second.
 */
export function citeRate(rate: ArchRateReading): string {
  const total = rate.total.toLocaleString('en-US');
  const pair = `${rate.backed.toLocaleString('en-US')} of ${total} backed · ${chanceOf(rate.total, citeChance(rate))} would be by chance`;
  return citeAtChance(rate) ? `${pair} · no better than chance` : pair;
}

/**
 * Behind the hover: the per grade breakdown EACH BESIDE ITS OWN FLOOR, then
 * the gate shaped line.
 *
 * The per grade floor is the reason `floorByGrade` is computed, stored and
 * shipped, and until Phase 259's fix round it was drawn nowhere: the hover
 * read `gate 0 · call 1 · declaration 1` with no share beside any of them, so
 * the one surface that could say a declaration is common and a gate is rare
 * said neither. A grade's own share is what makes it readable — a declaration
 * at 21.9% and a gate at 0.1% are not the same chip — and §2.5 asks for it
 * again per grade for exactly that reason.
 *
 * `0 of 6 gates cite a gate` is the hand pass's own reading and it is the
 * weakest half of this whole surface (research 118 §7.3), which is exactly
 * why it is written down rather than folded into the rate above it.
 */
export function citeRateTitle(rate: ArchRateReading): string {
  const grades = ARCH_CITE_GRADES.map((g) => {
    const share =
      rate.floorLines === 0 ? 0 : (rate.floorByGrade?.[g] ?? 0) / rate.floorLines;
    return `${CITE_FACES[g].word} ${(rate.byGrade[g] ?? 0).toLocaleString('en-US')} · ${chanceOf(rate.total, share)} by chance`;
  }).join('\n');
  const gates = `${rate.gateShaped.toLocaleString('en-US')} of ${rate.gateClaims.toLocaleString('en-US')} ${rate.gateClaims === 1 ? 'gate cites' : 'gates cite'} a gate`;
  return `${grades}\n${gates}`;
}

/** The rate for one scope out of a reading's list, or null when there is none. */
export function rateOf(
  rates: readonly ArchRateReading[],
  scope: string
): ArchRateReading | null {
  return rates.find((r) => r.scope === scope) ?? null;
}

/** The scope string one part's rate is stored under. */
export function partScope(partId: string): string {
  return `part:${partId}`;
}
