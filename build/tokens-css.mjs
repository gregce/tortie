/**
 * The two base palettes of src/renderer/styles/tokens.css, read as TEXT
 * (Phase 213).
 *
 * tokens.css holds the dark base in its first `:root {` block and the light
 * base in a `:root[data-scheme='light'] {` block after it. A reader that
 * sweeps the whole file for `--name: value;` and keeps the last match reads
 * the LIGHT value for every colour token, which is how a dark identity pin
 * would silently start pinning paper. So every probe under build/ that wants
 * the shipped values of one base reads that base's block through here, and
 * the theme tests inline the same slice.
 */

/** The text inside one base's block, braces excluded. */
export function schemeBlock(css, scheme = 'dark') {
  const head = scheme === 'light' ? ":root[data-scheme='light'] {" : ':root {';
  const start = css.indexOf(head);
  if (start === -1) return '';
  const open = start + head.length;
  const close = css.indexOf('}', open);
  return close === -1 ? '' : css.slice(open, close);
}

/**
 * Every `--name: value;` declared by one base, comments stripped, one level
 * of `var()` left as written. The light base declares the colour tokens
 * only; a caller that wants the whole set merges it over the dark one.
 */
export function schemeDeclarations(css, scheme = 'dark') {
  const block = schemeBlock(css.replace(/\/\*[\s\S]*?\*\//g, ''), scheme);
  const out = {};
  for (const m of block.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return out;
}
