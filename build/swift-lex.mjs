/**
 * swift-lex.mjs. THE ONE SWIFT LEXER in this repository (Phase 333.11,
 * build/p33311/SPEC.md D17).
 *
 * It was born inside build/conformance-ios.mjs (Phase 316.2), which reads the
 * iPhone app's refusals as TEXT. Phase 333.11's reader of the phone's decoders
 * (build/p33311/swift-wire.mjs) needs comments and strings blanked EXACTLY as
 * conformance:ios blanks them, so the function moved here byte for byte and
 * conformance-ios.mjs imports and re-exports it, its export surface unchanged.
 * Importing conformance-ios.mjs itself would RUN it (it has no import guard),
 * which is why the lexer lives in a module of its own rather than being read
 * out of that file.
 *
 * Plain node, no dependency: it is imported by plain-node gates and by the
 * pinned tsx alike.
 */

/**
 * Lex Swift source into:
 *   code     the source with every comment blanked to spaces (newlines kept),
 *            so every offset still points at the same line;
 *   bare     `code` with every string literal's CONTENTS blanked too, so a
 *            token rule never matches inside a string;
 *   strings  every string literal: `{ start, end, value, interpolated, holes }`,
 *            where `value` is its static text with each interpolation replaced
 *            by U+FFFC and the common escapes decoded, and `holes` is where each
 *            interpolation's CODE sits (`{ start, end }`, rule k reads it).
 *
 * It knows `//`, nested `/* *\/`, `"…"`, `"""…"""`, raw `#"…"#` of any depth,
 * escapes, and `\(…)` interpolation holding its own strings and parentheses.
 */
export function lexSwift(source) {
  const n = source.length;
  const code = source.split('');
  const bare = source.split('');
  const strings = [];
  const blank = (arr, from, to) => {
    for (let k = from; k < to; k += 1) if (arr[k] !== '\n') arr[k] = ' ';
  };
  let i = 0;

  /** Read one string literal starting at `i` (at its first `#` or `"`). Returns its end. */
  const readString = (start) => {
    let j = start;
    let hashes = 0;
    while (source[j] === '#') {
      hashes += 1;
      j += 1;
    }
    const multi = source.startsWith('"""', j);
    j += multi ? 3 : 1;
    const contentStart = j;
    const close = `${multi ? '"""' : '"'}${'#'.repeat(hashes)}`;
    const escape = `\\${'#'.repeat(hashes)}`;
    let value = '';
    let interpolated = 0;
    const holes = [];
    while (j < n) {
      if (source.startsWith(close, j)) {
        const end = j + close.length;
        strings.push({ start, end, contentStart, contentEnd: j, value, interpolated, holes });
        blank(bare, contentStart, j);
        return end;
      }
      if (source.startsWith(escape, j)) {
        const after = source[j + escape.length];
        if (after === '(') {
          // Interpolation: skip a balanced expression, strings inside it read too.
          let k = j + escape.length + 1;
          let depth = 1;
          while (k < n && depth > 0) {
            const c = source[k];
            if (c === '"' || (c === '#' && /^#+"/.test(source.slice(k, k + 8)))) {
              k = readString(k);
              continue;
            }
            if (c === '(') depth += 1;
            else if (c === ')') depth -= 1;
            k += 1;
          }
          value += '\uFFFC';
          interpolated += 1;
          holes.push({ start: j + escape.length + 1, end: k - 1 });
          j = k;
          continue;
        }
        const map = { n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', "'": "'", '\\': '\\' };
        if (after === 'u' && source[j + escape.length + 1] === '{') {
          const endBrace = source.indexOf('}', j);
          value += String.fromCodePoint(Number.parseInt(source.slice(j + escape.length + 2, endBrace), 16) || 0xfffd);
          j = endBrace + 1;
          continue;
        }
        value += map[after] ?? after ?? '';
        j += escape.length + 1;
        continue;
      }
      value += source[j];
      j += 1;
    }
    strings.push({ start, end: n, contentStart, contentEnd: n, value, interpolated, holes });
    blank(bare, contentStart, n);
    return n;
  };

  while (i < n) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j += 1;
      blank(code, i, j);
      blank(bare, i, j);
      i = j;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      let depth = 0;
      let j = i;
      while (j < n) {
        if (source[j] === '/' && source[j + 1] === '*') {
          depth += 1;
          j += 2;
          continue;
        }
        if (source[j] === '*' && source[j + 1] === '/') {
          depth -= 1;
          j += 2;
          if (depth === 0) break;
          continue;
        }
        j += 1;
      }
      blank(code, i, j);
      blank(bare, i, j);
      i = j;
      continue;
    }
    if (c === '"' || (c === '#' && /^#+"/.test(source.slice(i, i + 8)))) {
      i = readString(i);
      continue;
    }
    i += 1;
  }
  return { code: code.join(''), bare: bare.join(''), strings };
}
