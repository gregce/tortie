/**
 * The nine provenance categories, drawn as nine codicons and nine words.
 *
 * ## Why a glyph and never a hue
 *
 * Research 49 section 9.5 chose this encoding and rejected the alternative in
 * the same table. DESIGN.md spends the product's whole colour budget on state,
 * being accent for selection, amber for "an agent needs you" and the git ramp
 * for git. Nine hues for nine categories would be a fourth chromatic
 * vocabulary and the first decoration in the product. A glyph costs no hue,
 * satisfies WCAG 1.4.1 by construction because the word travels with it, and
 * uses the one icon set the design authority already names.
 *
 * ## The nine are the operator's own, not invented
 *
 * They are the categories his thirty architecture documents actually use,
 * counted in research 49 section 9.4. Four are fully computable, four are
 * detectable with the explanation left to prose, and one is computable for
 * existence only. The view never claims more than that: the glyph says which
 * category, and the prose panel says what the author wrote about it.
 *
 * ## The single most important line in this file
 *
 * `first-party` is drawn with `repo` and every other category is drawn with
 * something that is not `repo`, so "show me only what we did not write" is one
 * glance rather than one question. That is the operator's named ask.
 */

/** Every provenance value, with the glyph and the word that travel together. */
const PROVENANCE: Readonly<
  Record<string, { icon: string; word: string; title: string }>
> = {
  'first-party': {
    icon: 'repo',
    word: 'Ours',
    title: 'Written in this repository.'
  },
  vendored: {
    icon: 'file-submodule',
    word: 'Vendored',
    title: 'A copy of somebody else’s code, kept in this repository.'
  },
  package: {
    icon: 'package',
    word: 'Package',
    title: 'A dependency, pinned in a manifest.'
  },
  native: {
    icon: 'circuit-board',
    word: 'Native',
    title: 'Native code linked into the build.'
  },
  'spawned-tool': {
    icon: 'terminal',
    word: 'Tool',
    title: 'A command line tool this project runs.'
  },
  'external-api': {
    icon: 'globe',
    word: 'External',
    title: 'A service reached over the network.'
  },
  'data-store': {
    icon: 'database',
    word: 'Store',
    title: 'A database or another durable place data lives.'
  },
  generated: {
    icon: 'gear',
    word: 'Generated',
    title: 'Produced by the build rather than written by hand.'
  },
  platform: {
    icon: 'cloud',
    word: 'Platform',
    title: 'A platform service this project is deployed on.'
  }
};

/** The glyph for one provenance value, and a question mark for an unknown one. */
export function provenanceIcon(value: string): string {
  return PROVENANCE[value]?.icon ?? 'question';
}

/** The word for one provenance value. Never shown without it. */
export function provenanceWord(value: string): string {
  return PROVENANCE[value]?.word ?? value;
}

/** The sentence a hover reads. */
export function provenanceTitle(value: string): string {
  return (
    PROVENANCE[value]?.title ??
    'Tortie does not recognise this provenance value.'
  );
}

/** True for the one category that means we wrote it. */
export function isOurs(value: string): boolean {
  return value === 'first-party';
}
