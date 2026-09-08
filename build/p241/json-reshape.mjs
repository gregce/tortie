#!/usr/bin/env node
/**
 * The Phase 241 MEASURE STEP's price for the JSON reshape, and the guard it
 * recommends.
 *
 * `JSON.parse` then `JSON.stringify` is not a whitespace change. It reorders
 * integer-like keys, collapses duplicates, rounds integers past 2^53, rounds
 * decimals to a double, turns -0 into 0 and turns an out-of-range exponent
 * into null. Six losses, all measured below.
 *
 * The guard costs nothing extra, because it is the OTHER row: strip the
 * insignificant whitespace from the source and from the pretty-printed output
 * with one string-aware lexer, and require the two to be identical. That lexer
 * IS the Minify JSON row. So the second row pays for the first row's honesty.
 *
 * It writes nothing, spawns nothing and launches no Electron.
 */

/**
 * The Minify JSON row: every byte outside a string that is not significant.
 * `normaliseStrings` is the GUARD's variant, which additionally re-encodes each
 * string token to its canonical form, so `\\u00e9` and `é` compare equal — that
 * is a re-encoding of the same string value and refusing it would refuse the
 * commonest shape an agent writes. Number literals are still compared as TEXT,
 * which is the whole point: 12345678901234567890 and 12345678901234567000 are
 * different bytes and must not pass.
 */
export function minifyJson(src, normaliseStrings = false) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '"') break;
        j += 1;
      }
      const tok = src.slice(i, j + 1);
      if (normaliseStrings) {
        try { out += JSON.stringify(JSON.parse(tok)); } catch { out += tok; }
      } else out += tok;
      i = j;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue;
    out += c;
  }
  return out;
}

/** The Pretty-print JSON row, with the guard in front of the answer. */
export function prettyJson(src, indent = 2) {
  let value;
  try { value = JSON.parse(src); } catch (e) { return { ok: false, why: `not JSON: ${e.message}` }; }
  const out = JSON.stringify(value, null, indent);
  if (out === undefined) return { ok: false, why: 'the value has no JSON form' };
  const a = minifyJson(src, true);
  const b = minifyJson(out, true);
  if (a !== b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    return { ok: false, why: `re-serialising would change more than whitespace at offset ${i}: ${JSON.stringify(a.slice(i, i + 32))} would become ${JSON.stringify(b.slice(i, i + 32))}` };
  }
  return { ok: true, text: out };
}

const cases = [
  ['an ordinary agent wall', '{"name":"tortie","deps":{"react":"19","zustand":"5"},"flags":[true,false,null],"n":42}'],
  ['nested arrays', '[[1,2],[3,4],{"a":[{"b":1}]}]'],
  ['unicode and escapes', '{"s":"a\\u00e9\\n\\"q\\"","emoji":"👩‍💻"}'],
  ['already pretty', '{\n  "a": 1\n}'],
  ['integer-like keys', '{"10":"a","2":"b","k":"c"}'],
  ['duplicate keys', '{"a":1,"a":2}'],
  ['integer past 2^53', '{"id":12345678901234567890}'],
  ['decimal past a double', '{"x":0.1234567890123456789}'],
  ['negative zero', '{"x":-0}'],
  ['exponent out of range', '{"x":1e400}'],
  ['trailing comma (JSON5 only)', '{"a":1,}'],
  ['a comment (JSON5 only)', '{ /* hi */ "a":1}'],
  ['not JSON at all', 'the quick brown fox']
];
console.log('THE JSON RESHAPE, WITH THE MINIFY-COMPARISON GUARD IN FRONT');
for (const [label, src] of cases) {
  const r = prettyJson(src);
  const bare = (() => { try { return JSON.stringify(JSON.parse(src), null, 2).replace(/\n\s*/g, ' '); } catch (e) { return 'THROWS'; } })();
  console.log(`${(r.ok ? 'FORMATS' : 'refuses').padEnd(8)} ${label.padEnd(30)} ${r.ok ? '' : r.why}`);
  if (!r.ok && bare !== 'THROWS') console.log(`         (without the guard it would have written: ${bare.slice(0, 90)})`);
}
console.log('\nTHE MINIFY ROW, round-tripped');
for (const [label, src] of cases.slice(0, 4)) {
  const p = prettyJson(src);
  const raw = p.ok ? minifyJson(p.text) === minifyJson(src) : null;
  const norm = p.ok ? minifyJson(p.text, true) === minifyJson(src, true) : null;
  console.log(`  ${label.padEnd(30)} bytes equal: ${String(raw).padEnd(5)}  values equal: ${String(norm)}`);
}
