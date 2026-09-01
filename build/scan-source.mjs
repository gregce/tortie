/**
 * scan-source.mjs. Reading a JavaScript file well enough to say where a program
 * is handed to a spawn (Phase 193).
 *
 * ## Why this file exists
 *
 * `build/assert-electron-teardown.mjs` grew a small lexer to answer one
 * question: which call in this file passes an Electron to a spawn. Phase 193
 * needed the same answer about ssh, and the choice was to copy two hundred
 * lines or to move them. CLAUDE.md's growth guardrail settles it: grep for an
 * existing helper before writing one, and extract a duplicated block rather
 * than keep two.
 *
 * So the four functions both gates need live here, and neither gate owns them.
 * Nothing in this file knows what an Electron is or what ssh is. It reads
 * source text and answers structural questions about it, which is what makes it
 * shareable at all.
 *
 * ## What is in it
 *
 *   - {@link stripComments} blanks comments and regular expression bodies
 *     character for character, leaving strings alone, so every offset in the
 *     result still points at the same line of the original.
 *   - {@link lineAt} turns an offset into a 1-indexed line number.
 *   - {@link callArguments} splits the arguments of one call into source text.
 *   - {@link blockAt} returns the text between matching braces.
 *
 * It spawns nothing, opens no socket and reads no file. Callers hand it text.
 */

/**
 * Whether the slash at `at` opens a regular expression rather than dividing.
 * The rule is the ordinary one: look back past spaces, and a slash that follows
 * an operator, an opening bracket, a comma, or one of a few keywords opens a
 * regex.
 */
function opensRegex(source, at) {
  let i = at - 1;
  while (i >= 0 && /\s/.test(source[i])) i -= 1;
  if (i < 0) return true;
  const c = source[i];
  if ('(,=:[!&|?{};+-*%~^<>'.includes(c)) return true;
  const word = /([A-Za-z_$][\w$]*)$/.exec(source.slice(Math.max(0, i - 12), i + 1));
  return word !== null && ['return', 'typeof', 'case', 'in', 'of', 'new'].includes(word[1]);
}

export function stripComments(source) {
  const out = source.split('');
  let i = 0;
  const n = source.length;
  let state = 'code';
  let quote = '';
  while (i < n) {
    const c = source[i];
    const d = source[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        state = 'block';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        state = 'string';
        quote = c;
        i += 1;
        continue;
      }
      if (c === '/' && opensRegex(source, i)) {
        let j = i + 1;
        let inClass = false;
        while (j < source.length) {
          const r = source[j];
          if (r === '\\') {
            j += 2;
            continue;
          }
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          else if (r === '\n') break;
          j += 1;
        }
        for (let k = i + 1; k < j && k < source.length; k += 1) out[k] = ' ';
        i = j + 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && d === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'code';
        continue;
      }
      if (c !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    // state === 'string'
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) {
      state = 'code';
      quote = '';
    }
    i += 1;
  }
  return out.join('');
}

/** The 1-indexed line number of an offset. */
export function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

/**
 * The arguments of the call that opens at `open`, as source text, split at the
 * commas that sit at depth zero. Quotes and brackets are tracked so a comma
 * inside an array or a string never splits an argument.
 */
export function callArguments(source, open) {
  const args = [];
  let depth = 0;
  let current = '';
  let quote = '';
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    if (quote !== '') {
      current += c;
      if (c === '\\') {
        current += source[i + 1] ?? '';
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      current += c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      depth += 1;
      if (depth === 1 && i === open) continue;
      current += c;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) {
        args.push(current.trim());
        return args;
      }
      current += c;
      continue;
    }
    if (c === ',' && depth === 1) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  args.push(current.trim());
  return args;
}



/** The text between the braces that open at `open`, braces matched. */
export function blockAt(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return null;
}

